const express                         = require('express')
const pool                            = require('../db')
const redis                           = require('../redis')
const { authMiddleware, requireRole } = require('../middleware/auth')
const bcrypt                          = require('bcrypt')
const ExcelJS                         = require('exceljs')
const { jsPDF }                       = require('jspdf')
require('jspdf-autotable')
const router                          = express.Router()

const CACHE_TTL = 120

const cached = async (key, ttl, fn) => {
  const hit = await redis.get(key)
  if (hit) return JSON.parse(hit)
  const data = await fn()
  await redis.setex(key, ttl, JSON.stringify(data))
  return data
}

const invalidateAll = async () => {
  await Promise.all([
    redis.del('dashboard:superadmin'),
    redis.del('dashboard:admin'),
    redis.del('list:admins'),
    redis.del('list:employees'),
    redis.del('list:branches'),
  ])
}


router.get('/branches', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    const data = await cached('list:branches', CACHE_TTL, async () => {
      const r = await pool.query('SELECT id, name, city FROM branches WHERE is_active=TRUE ORDER BY name ASC')
      return r.rows
    })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET branches with real-time stats ────────────────────────
router.get('/branches/stats', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    const today      = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'
    const data = await cached('dashboard:branches:stats', 60, async () => {
      const [branchesR, txnTodayR, txnMonthR, valTodayR, valMonthR, profTodayR, profMonthR, custR, empR, attendR] = await Promise.all([
        pool.query('SELECT * FROM branches ORDER BY name ASC'),
        pool.query(`SELECT u.branch, COUNT(t.id) AS cnt FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$1 AND u.branch IS NOT NULL GROUP BY u.branch`, [today]),
        pool.query(`SELECT u.branch, COUNT(t.id) AS cnt FROM transactions t JOIN users u ON t.employee_id=u.id WHERE t.created_at>=$1 AND u.branch IS NOT NULL GROUP BY u.branch`, [monthStart]),
        pool.query(`SELECT u.branch, COALESCE(SUM(t.amount),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$1 AND u.branch IS NOT NULL GROUP BY u.branch`, [today]),
        pool.query(`SELECT u.branch, COALESCE(SUM(t.amount),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE t.created_at>=$1 AND u.branch IS NOT NULL GROUP BY u.branch`, [monthStart]),
        pool.query(`SELECT u.branch, COALESCE(SUM(t.profit),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$1 AND u.branch IS NOT NULL GROUP BY u.branch`, [today]),
        pool.query(`SELECT u.branch, COALESCE(SUM(t.profit),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE t.created_at>=$1 AND u.branch IS NOT NULL GROUP BY u.branch`, [monthStart]),
        pool.query(`SELECT u.branch, COUNT(c.id) AS cnt FROM customers c JOIN users u ON c.added_by=u.id WHERE u.branch IS NOT NULL GROUP BY u.branch`),
        pool.query(`SELECT branch, COUNT(*) AS cnt FROM users WHERE is_employee=TRUE AND is_active=TRUE AND branch IS NOT NULL GROUP BY branch`),
        pool.query(`SELECT u.branch, COUNT(a.id) AS cnt FROM attendance a JOIN users u ON a.user_id=u.id WHERE a.date=$1 AND u.branch IS NOT NULL GROUP BY u.branch`, [today]),
      ])
      const byBranch = (rows, key = 'cnt') => {
        const m = {}; rows.forEach(r => { m[r.branch] = parseFloat(r[key]) || 0 }); return m
      }
      const txnToday  = byBranch(txnTodayR.rows)
      const txnMonth  = byBranch(txnMonthR.rows)
      const valToday  = byBranch(valTodayR.rows, 'val')
      const valMonth  = byBranch(valMonthR.rows, 'val')
      const profToday = byBranch(profTodayR.rows, 'val')
      const profMonth = byBranch(profMonthR.rows, 'val')
      const custs     = byBranch(custR.rows)
      const emps      = byBranch(empR.rows)
      const attToday  = byBranch(attendR.rows)
      const branches  = branchesR.rows.map(b => ({
        id: b.id, name: b.name, city: b.city, manager: b.manager || '—', is_active: b.is_active,
        txnToday: txnToday[b.name] || 0, txnMonth: txnMonth[b.name] || 0,
        valToday: valToday[b.name] || 0, valMonth: valMonth[b.name] || 0,
        profToday: profToday[b.name] || 0, profMonth: profMonth[b.name] || 0,
        customers: custs[b.name] || 0, employees: emps[b.name] || 0, attendance: attToday[b.name] || 0,
      })).sort((a, b) => b.txnToday - a.txnToday)
      return { branches, today }
    })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Add branch ────────────────────────────────────────────────
router.post('/branches', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  const { name, city, manager, address } = req.body
  if (!name?.trim() || !city?.trim()) return res.status(400).json({ error: 'Name and city are required' })
  try {
    const r = await pool.query(
      `INSERT INTO branches (name, city, manager, address) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name.trim(), city.trim(), manager?.trim() || null, address?.trim() || null]
    )
    await redis.del('list:branches')
    res.status(201).json(r.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Branch name already exists' })
    res.status(500).json({ error: err.message })
  }
})

// ── Toggle branch active ──────────────────────────────────────
router.patch('/branches/:id/toggle', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    const r = await pool.query(
      'UPDATE branches SET is_active = NOT is_active WHERE id=$1 RETURNING *',
      [req.params.id]
    )
    await redis.del('list:branches')
    res.json(r.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// helper: calc minutes between HH:MM strings
const calcMinutes = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0
  const [ih, im] = checkIn.split(':').map(Number)
  const [oh, om] = checkOut.split(':').map(Number)
  return Math.max(0, (oh * 60 + om) - (ih * 60 + im))
}

// ── SUPERADMIN dashboard ──────────────────────────────────────
router.get('/superadmin', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    const data = await cached('dashboard:superadmin', CACHE_TTL, async () => {
      const [users, employees, admins, active] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM users'),
        pool.query('SELECT COUNT(*) FROM users WHERE is_employee=TRUE'),
        pool.query('SELECT COUNT(*) FROM users WHERE is_admin=TRUE AND is_superadmin=FALSE'),
        pool.query('SELECT COUNT(*) FROM users WHERE is_active=TRUE'),
      ])
      const staff = await pool.query(
        `SELECT id, name, email, mobile, pan, aadhar, is_employee, is_admin, is_superadmin, is_active, coins, created_at
         FROM users ORDER BY created_at DESC`
      )
      return {
        stats: {
          totalUsers:     parseInt(users.rows[0].count),
          totalEmployees: parseInt(employees.rows[0].count),
          totalAdmins:    parseInt(admins.rows[0].count),
          activeUsers:    parseInt(active.rows[0].count),
        },
        staff: staff.rows,
      }
    })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── SUPERADMIN full dashboard stats ──────────────────────────
router.get('/superadmin/stats', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'

    const [
      usersR, employeesR, adminsR, activeR,
      txnTodayR, txnMonthR,
      valueTodayR, valueMonthR,
      profitTodayR, profitMonthR,
      platformR, employeePerfR,
      branchPerfR, attendanceTodayR,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM users WHERE is_employee=TRUE'),
      pool.query('SELECT COUNT(*) FROM users WHERE is_admin=TRUE AND is_superadmin=FALSE'),
      pool.query('SELECT COUNT(*) FROM users WHERE is_active=TRUE'),

      pool.query(`SELECT COUNT(*) FROM transactions WHERE DATE(created_at + INTERVAL '5 hours 30 minutes')=$1`, [today]),
      pool.query(`SELECT COUNT(*) FROM transactions WHERE created_at >= $1`, [monthStart]),

      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM transactions WHERE DATE(created_at + INTERVAL '5 hours 30 minutes')=$1`, [today]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM transactions WHERE created_at >= $1`, [monthStart]),

      pool.query(`SELECT COALESCE(SUM(profit),0) AS val FROM transactions WHERE DATE(created_at + INTERVAL '5 hours 30 minutes')=$1`, [today]),
      pool.query(`SELECT COALESCE(SUM(profit),0) AS val FROM transactions WHERE created_at >= $1`, [monthStart]),

      pool.query(`
        SELECT platform, COUNT(*) AS txn, COALESCE(SUM(amount),0) AS value
        FROM transactions WHERE platform IS NOT NULL AND DATE(created_at + INTERVAL '5 hours 30 minutes')=$1
        GROUP BY platform ORDER BY txn DESC LIMIT 6`, [today]),

      pool.query(`
        SELECT u.id, u.name, u.branch, COUNT(t.id) AS txn, COALESCE(SUM(t.amount),0) AS value
        FROM users u LEFT JOIN transactions t ON t.employee_id=u.id AND DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$1
        WHERE u.is_employee=TRUE
        GROUP BY u.id, u.name, u.branch ORDER BY txn DESC LIMIT 5`, [today]),

      pool.query(`
        SELECT u.branch, COUNT(t.id) AS txn, COALESCE(SUM(t.amount),0) AS value
        FROM users u LEFT JOIN transactions t ON t.employee_id=u.id AND DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$1
        WHERE u.is_employee=TRUE AND u.branch IS NOT NULL
        GROUP BY u.branch ORDER BY txn DESC`, [today]),

      pool.query(`
        SELECT a.id, u.name AS employee_name, u.branch, a.check_in, a.check_out, a.status, a.minutes
        FROM attendance a JOIN users u ON a.user_id=u.id
        WHERE a.date=$1 ORDER BY a.check_in ASC`, [today]),
    ])

    const maxTxn = Math.max(1, ...platformR.rows.map(p => parseInt(p.txn)))

    res.json({
      stats: {
        totalUsers:     parseInt(usersR.rows[0].count),
        totalEmployees: parseInt(employeesR.rows[0].count),
        totalAdmins:    parseInt(adminsR.rows[0].count),
        activeUsers:    parseInt(activeR.rows[0].count),
        txnToday:       parseInt(txnTodayR.rows[0].count),
        txnMonth:       parseInt(txnMonthR.rows[0].count),
        valueToday:     parseFloat(valueTodayR.rows[0].val),
        valueMonth:     parseFloat(valueMonthR.rows[0].val),
        profitToday:    parseFloat(profitTodayR.rows[0].val),
        profitMonth:    parseFloat(profitMonthR.rows[0].val),
      },
      platforms: platformR.rows.map(p => ({
        name: p.platform,
        txn:  parseInt(p.txn),
        value: parseFloat(p.value),
        pct:  Math.round(parseInt(p.txn) / maxTxn * 100),
      })),
      employees: employeePerfR.rows.map((e, i) => ({
        id: e.id, name: e.name, branch: e.branch || '—',
        txn: parseInt(e.txn), value: parseFloat(e.value),
        badge: i === 0 ? '🏆' : i === 1 ? '⭐' : '',
      })),
      branches: branchPerfR.rows.map((b, i) => ({
        name: b.branch, txn: parseInt(b.txn), value: parseFloat(b.value),
        status: i === 0 ? 'top' : 'good',
      })),
      attendance: attendanceTodayR.rows,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN dashboard ───────────────────────────────────────────
router.get('/admin', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const data = await cached('dashboard:admin', CACHE_TTL, async () => {
      const [employees, active] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM users WHERE is_employee=TRUE'),
        pool.query('SELECT COUNT(*) FROM users WHERE is_employee=TRUE AND is_active=TRUE'),
      ])
      const list = await pool.query(
        `SELECT id, name, email, is_active, is_admin, coins, created_at
         FROM users WHERE is_employee=TRUE ORDER BY created_at DESC`
      )
      return {
        stats: { totalEmployees: parseInt(employees.rows[0].count), activeEmployees: parseInt(active.rows[0].count) },
        employees: list.rows,
      }
    })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── EMPLOYEE dashboard ────────────────────────────────────────
router.get('/employee', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const key  = `dashboard:employee:${req.user.id}`
    const data = await cached(key, CACHE_TTL, async () => {
      const profile = await pool.query(
        'SELECT id, name, email, is_admin, coins, created_at FROM users WHERE id=$1',
        [req.user.id]
      )
      return { profile: profile.rows[0] }
    })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET admins ────────────────────────────────────────────────
router.get('/admins', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    const data = await cached('list:admins', CACHE_TTL, async () => {
      const r = await pool.query(
        `SELECT id, name, email, mobile, pan, aadhar, branch, is_active, is_superadmin, coins, created_at
         FROM users WHERE is_admin=TRUE ORDER BY created_at DESC`
      )
      return r.rows
    })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET employees ─────────────────────────────────────────────
router.get('/employees', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    let branch = null
    if (!req.user.is_superadmin) {
      const br = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
      branch = br.rows[0]?.branch || null
    }
    const cacheKey = `list:employees:${branch || 'all'}`
    const data = await cached(cacheKey, CACHE_TTL, async () => {
      const r = branch
        ? await pool.query(
            `SELECT id, name, email, mobile, pan, aadhar, branch, role, is_active, is_admin, coins,
                    pan_img_url, aadhar_img_url, docx_url, resume_url, photo_url, created_at
             FROM users WHERE is_employee=TRUE AND branch=$1 ORDER BY created_at DESC`, [branch])
        : await pool.query(
            `SELECT id, name, email, mobile, pan, aadhar, branch, role, is_active, is_admin, coins,
                    pan_img_url, aadhar_img_url, docx_url, resume_url, photo_url, created_at
             FROM users WHERE is_employee=TRUE ORDER BY created_at DESC`)
      return r.rows
    })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET single employee detail (admin panel) ──────────────────
router.get('/employees/:id', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const today      = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'

    // Branch guard — non-superadmin can only view employees in their branch
    let branchFilter = ''
    const params = [id]
    if (!req.user.is_superadmin) {
      const br = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
      const branch = br.rows[0]?.branch
      if (branch) { params.push(branch); branchFilter = ` AND branch=$${params.length}` }
    }

    const empR = await pool.query(
      `SELECT id, name, email, mobile, pan, aadhar, branch, role, is_active, is_admin, is_superadmin,
              coins, pan_img_url, aadhar_img_url, docx_url, resume_url, photo_url, created_at
       FROM users WHERE id=$1 AND is_employee=TRUE${branchFilter}`, params
    )
    if (!empR.rows.length) return res.status(404).json({ error: 'Employee not found' })
    const emp = empR.rows[0]

    const [
      txnTodayR, txnMonthR, txnTotalR,
      valTodayR, valMonthR,
      profTodayR, profMonthR,
      attendMonthR, coinHistoryR,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM transactions WHERE employee_id=$1 AND DATE(created_at + INTERVAL '5 hours 30 minutes')=$2`, [id, today]),
      pool.query('SELECT COUNT(*) FROM transactions WHERE employee_id=$1 AND created_at>=$2', [id, monthStart]),
      pool.query('SELECT COUNT(*) FROM transactions WHERE employee_id=$1', [id]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM transactions WHERE employee_id=$1 AND DATE(created_at + INTERVAL '5 hours 30 minutes')=$2`, [id, today]),
      pool.query('SELECT COALESCE(SUM(amount),0) AS val FROM transactions WHERE employee_id=$1 AND created_at>=$2', [id, monthStart]),
      pool.query(`SELECT COALESCE(SUM(profit),0) AS val FROM transactions WHERE employee_id=$1 AND DATE(created_at + INTERVAL '5 hours 30 minutes')=$2`, [id, today]),
      pool.query('SELECT COALESCE(SUM(profit),0) AS val FROM transactions WHERE employee_id=$1 AND created_at>=$2', [id, monthStart]),
      pool.query(
        `SELECT date, check_in, check_out, status, minutes, coins_earned
         FROM attendance WHERE user_id=$1 AND date>=$2 ORDER BY date DESC`, [id, monthStart]
      ),
      pool.query(
        `SELECT coins, type, remarks, created_at FROM coin_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,
        [id]
      ).catch(() => ({ rows: [] })),
    ])

    res.json({
      employee: emp,
      stats: {
        txnToday:    parseInt(txnTodayR.rows[0].count),
        txnMonth:    parseInt(txnMonthR.rows[0].count),
        txnTotal:    parseInt(txnTotalR.rows[0].count),
        valueToday:  parseFloat(valTodayR.rows[0].val),
        valueMonth:  parseFloat(valMonthR.rows[0].val),
        profitToday: parseFloat(profTodayR.rows[0].val),
        profitMonth: parseFloat(profMonthR.rows[0].val),
      },
      attendance: attendMonthR.rows,
      coinHistory: coinHistoryR.rows,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Add admin ─────────────────────────────────────────────────
router.post('/admins/add', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  const { name, email, mobile, pan, aadhar, branch, password, confirm_password, mpin } = req.body
  console.log('admins/add body:', { name, email, mobile, pan, aadhar, branch, mpin })
  if (!name?.trim() || !email?.trim() || !mobile?.trim() || !pan?.trim() || !aadhar?.trim() || !branch?.trim() || !password || !mpin)
    return res.status(400).json({ error: 'All fields are required' })
  if (password !== confirm_password)
    return res.status(400).json({ error: 'Passwords do not match' })
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.trim().toUpperCase()))
    return res.status(400).json({ error: 'Invalid PAN format (e.g. ABCDE1234F)' })
  if (!/^\d{12}$/.test(aadhar.trim()))
    return res.status(400).json({ error: 'Aadhar must be 12 digits' })
  if (!/^\d{10}$/.test(mobile.trim()))
    return res.status(400).json({ error: 'Mobile must be 10 digits' })
  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const mpinHash     = await bcrypt.hash(mpin, 12)
    const r = await pool.query(
      `INSERT INTO users (name, email, mobile, pan, aadhar, branch, password_hash, mpin_hash, is_employee, is_admin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,TRUE)
       RETURNING id, name, email, mobile, pan, branch, is_admin, created_at`,
      [name.trim(), email.trim(), mobile.trim(), pan.trim().toUpperCase(), aadhar.trim(), branch.trim(), passwordHash, mpinHash]
    )
    await invalidateAll()
    res.status(201).json({ message: 'Admin added successfully', user: r.rows[0] })
  } catch (err) {
    console.error('admins/add error:', err.message)
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' })
    res.status(500).json({ error: err.message })
  }
})

// ── Add employee ──────────────────────────────────────────────
router.post('/employees/add', authMiddleware, requireRole('is_admin'), async (req, res) => {
  const { name, email, mobile, pan, aadhar, branch, password, confirm_password, mpin, is_admin, role, pan_img_url, aadhar_img_url, docx_url, resume_url, photo_url, permissions } = req.body
  console.log('employees/add body:', { name, email, mobile, pan, aadhar, branch, mpin, is_admin, role, permissions })
  if (!name?.trim() || !email?.trim() || !mobile?.trim() || !pan?.trim() || !aadhar?.trim() || !password || !mpin)
    return res.status(400).json({ error: 'All fields are required' })
  if (password !== confirm_password)
    return res.status(400).json({ error: 'Passwords do not match' })
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.trim().toUpperCase()))
    return res.status(400).json({ error: 'Invalid PAN format (e.g. ABCDE1234F)' })
  if (!/^\d{12}$/.test(aadhar.trim()))
    return res.status(400).json({ error: 'Aadhar must be 12 digits' })
  if (!/^\d{10}$/.test(mobile.trim()))
    return res.status(400).json({ error: 'Mobile must be 10 digits' })
  
  try {
    // Determine branch: superadmin can specify, admin uses their own branch
    let employeeBranch
    if (req.user.is_superadmin) {
      if (!branch?.trim()) return res.status(400).json({ error: 'Branch is required' })
      employeeBranch = branch.trim()
    } else {
      // Admin can only add employees to their own branch
      const adminBranch = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
      employeeBranch = adminBranch.rows[0]?.branch
      if (!employeeBranch) return res.status(400).json({ error: 'No branch assigned to your account' })
    }
    
    const passwordHash = await bcrypt.hash(password, 12)
    const mpinHash     = await bcrypt.hash(mpin, 12)
    const perms = permissions || { services: [], features: [] }
    const r = await pool.query(
      `INSERT INTO users (name, email, mobile, pan, aadhar, branch, password_hash, mpin_hash, is_employee, is_admin, role, pan_img_url, aadhar_img_url, docx_url, resume_url, photo_url, permissions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id, name, email, mobile, pan, branch, is_admin, role, permissions, created_at`,
      [name.trim(), email.trim(), mobile.trim(), pan.trim().toUpperCase(), aadhar.trim(), employeeBranch, passwordHash, mpinHash, is_admin || false, role?.trim() || null, pan_img_url||null, aadhar_img_url||null, docx_url||null, resume_url||null, photo_url||null, perms]
    )
    await invalidateAll()
    res.status(201).json({ message: 'Employee added successfully', user: r.rows[0] })
  } catch (err) {
    console.error('employees/add error:', err.message)
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' })
    res.status(500).json({ error: err.message })
  }
})

// ── Update employee permissions ──────────────────────────────
router.patch('/employees/:id/permissions', authMiddleware, requireRole('is_admin'), async (req, res) => {
  const { id } = req.params
  const { permissions } = req.body
  try {
    if (req.user.is_admin && !req.user.is_superadmin) {
       const adminR = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
       const empR = await pool.query('SELECT branch FROM users WHERE id=$1', [id])
       if (!adminR.rows[0]?.branch || adminR.rows[0].branch !== empR.rows[0]?.branch) {
         return res.status(403).json({ error: 'Not authorized to edit this employee' })
       }
    }
    await pool.query('UPDATE users SET permissions=$1 WHERE id=$2', [permissions, id])
    await invalidateAll()
    res.json({ message: 'Permissions updated successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Toggle active ─────────────────────────────────────────────
router.patch('/users/:id/toggle', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const r = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id, name, is_active',
      [req.params.id]
    )
    await invalidateAll()
    res.json(r.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Delete user ───────────────────────────────────────────────
router.delete('/users/:id', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id])
    await invalidateAll()
    res.json({ message: 'User deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET attendance with filters (day/month/year) ──────────────
router.get('/attendance', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const { date, month, year, view = 'day' } = req.query
    let cacheKey, query, params
    const branchFilter = (!req.user.is_superadmin && req.user.branch) ? req.user.branch : null;

    if (view === 'month' && month && year) {
      cacheKey = `attendance:month:${year}:${month}`
      query = `
        SELECT a.id, u.name AS employee_name, u.email, a.check_in, a.check_out,
               a.status, a.date, a.minutes, a.coins_earned
        FROM attendance a JOIN users u ON a.user_id = u.id
        WHERE EXTRACT(MONTH FROM a.date)=$1 AND EXTRACT(YEAR FROM a.date)=$2`
      params = [month, year]
    } else if (view === 'year' && year) {
      cacheKey = `attendance:year:${year}`
      query = `
        SELECT a.id, u.name AS employee_name, u.email, a.check_in, a.check_out,
               a.status, a.date, a.minutes, a.coins_earned
        FROM attendance a JOIN users u ON a.user_id = u.id
        WHERE EXTRACT(YEAR FROM a.date)=$1`
      params = [year]
    } else {
      const filterDate = date || new Date().toISOString().split('T')[0]
      cacheKey = `attendance:day:${filterDate}`
      query = `
        SELECT a.id, u.name AS employee_name, u.email, a.check_in, a.check_out,
               a.status, a.date, a.minutes, a.coins_earned
        FROM attendance a JOIN users u ON a.user_id = u.id
        WHERE a.date=$1`
      params = [filterDate]
    }

    if (branchFilter) {
      query += ` AND u.branch = $${params.length + 1}`;
      params.push(branchFilter);
      cacheKey += `:branch:${branchFilter}`;
    } else {
      cacheKey += `:all`;
    }
    
    if (view === 'month' || view === 'year') {
      query += ' ORDER BY a.date DESC, u.name ASC';
    } else {
      query += ' ORDER BY a.check_in ASC';
    }

    const data = await cached(cacheKey, CACHE_TTL, async () => {
      const r = await pool.query(query, params)
      return r.rows
    })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Mark attendance (check-in / check-out + coins logic) ──────
router.post('/attendance/mark', authMiddleware, requireRole('is_employee'), async (req, res) => {
  const { type } = req.body
  const istNow   = new Date(Date.now() + 5.5 * 3600000)
  const today    = istNow.toISOString().split('T')[0]
  const now      = istNow.toISOString().slice(11, 16)  // HH:MM in IST
  try {
    if (type === 'check_in') {
      const existing = await pool.query(
        'SELECT id, check_out FROM attendance WHERE user_id=$1 AND date=$2', [req.user.id, today]
      )
      if (existing.rows.length && existing.rows[0].check_out)
        return res.status(409).json({ error: 'You have already completed attendance for today. Check-in is not allowed again.' })
      if (existing.rows.length)
        return res.status(409).json({ error: 'Already checked in today' })
      await pool.query(
        `INSERT INTO attendance (user_id, date, check_in, status) VALUES ($1,$2,$3,'Present')`,
        [req.user.id, today, now]
      )
      res.json({ message: `Checked in at ${now}` })
    } else {
      // calc minutes and coins
      const rec = await pool.query(
        'SELECT check_in FROM attendance WHERE user_id=$1 AND date=$2', [req.user.id, today]
      )
      if (!rec.rows.length) return res.status(404).json({ error: 'No check-in found for today' })

      const minutes    = calcMinutes(rec.rows[0].check_in, now)
      const coinsEarned = minutes > 500 ? (minutes - 500) * 5 : 0

      await pool.query(
        `UPDATE attendance SET check_out=$1, minutes=$2, coins_earned=$3 WHERE user_id=$4 AND date=$5`,
        [now, minutes, coinsEarned, req.user.id, today]
      )

      if (coinsEarned > 0) {
        await pool.query(
          'UPDATE users SET coins = coins + $1 WHERE id=$2', [coinsEarned, req.user.id]
        )
        await redis.del(`dashboard:employee:${req.user.id}`)
      }

      // invalidate attendance caches
      const istNow2 = new Date(Date.now() + 5.5 * 3600000)
      const [m, y] = [istNow2.getUTCMonth() + 1, istNow2.getUTCFullYear()]
      await Promise.all([
        redis.del(`attendance:day:${today}`),
        redis.del(`attendance:month:${y}:${m}`),
        redis.del(`attendance:year:${y}`),
      ])

      res.json({ message: `Checked out at ${now}`, minutes, coinsEarned })
    }
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Insights: branch/platform/employee perf ──────────────────
router.get('/insights', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    const { period = 'today' } = req.query
    const today = new Date().toISOString().split('T')[0]
    const weekAgo  = new Date(Date.now() - 7  * 86400000).toISOString().split('T')[0]
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const from = period === 'week' ? weekAgo : period === 'month' ? monthAgo : today
    const dateFilter = period === 'today'
      ? `DATE(t.created_at + INTERVAL '5 hours 30 minutes') = '${today}'`
      : `DATE(t.created_at + INTERVAL '5 hours 30 minutes') >= '${from}'`

    const [branchR, platformR, employeeR] = await Promise.all([
      pool.query(`
        SELECT u.branch AS name,
          COUNT(t.id) AS txn,
          COALESCE(SUM(t.amount),0) AS value
        FROM users u LEFT JOIN transactions t ON t.employee_id=u.id AND ${dateFilter}
        WHERE u.is_employee=TRUE AND u.branch IS NOT NULL
        GROUP BY u.branch ORDER BY txn DESC`),
      pool.query(`
        SELECT platform AS name, COUNT(*) AS txn, COALESCE(SUM(amount),0) AS value
        FROM transactions WHERE platform IS NOT NULL AND ${dateFilter.replace('t.','')}
        GROUP BY platform ORDER BY txn DESC`),
      pool.query(`
        SELECT u.id, u.name, u.branch,
          COUNT(t.id) AS txn, COALESCE(SUM(t.amount),0) AS value
        FROM users u LEFT JOIN transactions t ON t.employee_id=u.id AND ${dateFilter}
        WHERE u.is_employee=TRUE
        GROUP BY u.id, u.name, u.branch ORDER BY txn DESC LIMIT 10`),
    ])

    const maxTxnP = Math.max(1, ...platformR.rows.map(p => parseInt(p.txn)))
    const maxTxnE = Math.max(1, ...employeeR.rows.map(e => parseInt(e.txn)))

    res.json({
      branches:  branchR.rows.map((b, i) => ({ ...b, txn: parseInt(b.txn), value: parseFloat(b.value), medal: i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉' })),
      platforms: platformR.rows.map(p => ({ ...p, txn: parseInt(p.txn), value: parseFloat(p.value), pct: Math.round(parseInt(p.txn) / maxTxnP * 100) })),
      employees: employeeR.rows.map((e, i) => ({ ...e, txn: parseInt(e.txn), value: parseFloat(e.value), pct: Math.round(parseInt(e.txn) / maxTxnE * 100), badge: i === 0 ? '🏆' : i === 1 ? '⭐' : '' })),
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Tracking: branch+employee vs target, alerts ───────────────
router.get('/tracking', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const [branchR, employeeR, lateR] = await Promise.all([
      pool.query(`
        SELECT u.branch AS name, COUNT(t.id) AS txn, COALESCE(SUM(t.amount),0) AS value
        FROM users u LEFT JOIN transactions t ON t.employee_id=u.id AND DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$1
        WHERE u.is_employee=TRUE AND u.branch IS NOT NULL
        GROUP BY u.branch ORDER BY txn DESC`, [today]),
      pool.query(`
        SELECT u.id, u.name, u.branch, COUNT(t.id) AS txn, COALESCE(SUM(t.amount),0) AS value
        FROM users u LEFT JOIN transactions t ON t.employee_id=u.id AND DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$1
        WHERE u.is_employee=TRUE
        GROUP BY u.id, u.name, u.branch ORDER BY txn DESC`, [today]),
      pool.query(`
        SELECT u.name, u.branch, a.check_in
        FROM attendance a JOIN users u ON a.user_id=u.id
        WHERE a.date=$1 AND a.check_in > '09:15'`, [today]),
    ])

    const TARGET_BRANCH = 50
    const TARGET_EMP    = 25

    const branches  = branchR.rows.map((b, i) => ({ name: b.name, txn: parseInt(b.txn), value: parseFloat(b.value), target: TARGET_BRANCH, pct: Math.min(100, Math.round(parseInt(b.txn) / TARGET_BRANCH * 100)), status: i === 0 ? 'top' : 'good' }))
    const employees = employeeR.rows.map(e => ({ id: e.id, name: e.name, branch: e.branch || '—', txn: parseInt(e.txn), value: parseFloat(e.value), target: TARGET_EMP, pct: Math.min(100, Math.round(parseInt(e.txn) / TARGET_EMP * 100)) }))

    const alerts = [
      ...employees.filter(e => e.txn === 0).map(e => ({ type: 'error', msg: `${e.name} — No transactions today`, branch: e.branch })),
      ...employees.filter(e => e.txn > 0 && e.pct < 50).map(e => ({ type: 'warn', msg: `${e.name} — Only ${e.txn} txn (${e.pct}% of target)`, branch: e.branch })),
      ...lateR.rows.map(l => ({ type: 'warn', msg: `${l.name} — Late check-in at ${l.check_in}`, branch: l.branch || '—' })),
      ...branches.filter(b => b.txn === 0).map(b => ({ type: 'error', msg: `${b.name} branch — No transactions today`, branch: b.name })),
    ]

    res.json({ branches, employees, alerts, topBranch: branches[0] || null, topEmployee: employees[0] || null })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Finance: ledger + expenses ────────────────────────────────
router.get('/finance', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const { from, to, branch } = req.query
    const today      = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'
    const dateFrom   = from || monthStart
    const dateTo     = to   || today

    // branch filter — admin sees only their branch, superadmin sees all or filtered
    let branchFilter = ''
    const ledgerParams  = [dateFrom, dateTo]
    const expenseParams = [dateFrom, dateTo]

    if (req.user.is_admin && !req.user.is_superadmin) {
      const br = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
      const b  = br.rows[0]?.branch
      if (b) {
        ledgerParams.push(b)
        branchFilter = ` AND u.branch=$${ledgerParams.length}`
        expenseParams.push(b)
      }
    } else if (branch) {
      ledgerParams.push(branch)
      branchFilter = ` AND u.branch=$${ledgerParams.length}`
      expenseParams.push(branch)
    }

    const expBranchFilter = expenseParams.length > 2 ? ` AND branch=$${expenseParams.length}` : ''

    const [ledgerR, expensesR, expSummaryR, serviceR, monthlyR] = await Promise.all([
      pool.query(`
        SELECT u.branch,
          COUNT(t.id) AS txn,
          COALESCE(SUM(t.amount),0) AS cash_in,
          COALESCE(SUM(t.profit),0) AS profit,
          COALESCE(SUM(t.charges_amount),0) AS charges
        FROM users u LEFT JOIN transactions t
          ON t.employee_id=u.id AND DATE(t.created_at + INTERVAL '5 hours 30 minutes') BETWEEN $1 AND $2
        WHERE u.is_employee=TRUE AND u.branch IS NOT NULL${branchFilter}
        GROUP BY u.branch ORDER BY cash_in DESC`, ledgerParams),

      pool.query(`SELECT * FROM expenses WHERE date BETWEEN $1 AND $2${expBranchFilter} ORDER BY date DESC LIMIT 200`, expenseParams),

      pool.query(`
        SELECT category, COALESCE(SUM(amount),0) AS total
        FROM expenses WHERE date BETWEEN $1 AND $2${expBranchFilter}
        GROUP BY category ORDER BY total DESC`, expenseParams),

      pool.query(`
        SELECT t.service_type,
          COUNT(*) AS txn,
          COALESCE(SUM(t.amount),0) AS amount,
          COALESCE(SUM(t.profit),0) AS profit
        FROM transactions t
        JOIN users u ON t.employee_id=u.id
        WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes') BETWEEN $1 AND $2${branchFilter.replace('u.branch', 'u.branch')}
        GROUP BY t.service_type ORDER BY amount DESC`, ledgerParams),

      pool.query(`
        SELECT DATE(t.created_at + INTERVAL '5 hours 30 minutes') AS day,
          COUNT(*) AS txn,
          COALESCE(SUM(t.amount),0) AS amount,
          COALESCE(SUM(t.profit),0) AS profit
        FROM transactions t
        JOIN users u ON t.employee_id=u.id
        WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes') BETWEEN $1 AND $2${branchFilter}
        GROUP BY day ORDER BY day ASC`, ledgerParams),
    ])

    const totalCashIn   = ledgerR.rows.reduce((s, r) => s + parseFloat(r.cash_in),  0)
    const totalProfit   = ledgerR.rows.reduce((s, r) => s + parseFloat(r.profit),   0)
    const totalCharges  = ledgerR.rows.reduce((s, r) => s + parseFloat(r.charges),  0)
    const totalExpenses = expSummaryR.rows.reduce((s, r) => s + parseFloat(r.total), 0)
    const netProfit     = totalProfit - totalExpenses

    res.json({
      ledger:      ledgerR.rows.map(r => ({ branch: r.branch, txn: parseInt(r.txn), cash_in: parseFloat(r.cash_in), profit: parseFloat(r.profit), charges: parseFloat(r.charges) })),
      expenses:    expensesR.rows,
      expSummary:  expSummaryR.rows.map(r => ({ category: r.category, total: parseFloat(r.total) })),
      serviceSummary: serviceR.rows.map(r => ({ service_type: r.service_type, txn: parseInt(r.txn), amount: parseFloat(r.amount), profit: parseFloat(r.profit) })),
      daily:       monthlyR.rows.map(r => ({ day: r.day, txn: parseInt(r.txn), amount: parseFloat(r.amount), profit: parseFloat(r.profit) })),
      totals:      { totalCashIn, totalProfit, totalCharges, totalExpenses, netProfit },
      period:      { from: dateFrom, to: dateTo },
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Add expense ───────────────────────────────────────────────
router.post('/expenses', authMiddleware, requireRole('is_admin'), async (req, res) => {
  const { category, amount, date, note } = req.body
  if (!category || !amount || !date) return res.status(400).json({ error: 'All fields required' })
  try {
    // always use the logged-in admin's branch — never trust client-sent branch
    let branch
    if (req.user.is_superadmin) {
      branch = req.body.branch  // superadmin can specify branch
      if (!branch) return res.status(400).json({ error: 'Branch is required' })
    } else {
      const r = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
      branch = r.rows[0]?.branch
      if (!branch) return res.status(400).json({ error: 'No branch assigned to your account' })
    }
    const r = await pool.query(
      `INSERT INTO expenses (branch, category, amount, date, note) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [branch, category, parseFloat(amount), date, note || null]
    )
    res.status(201).json(r.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Reports: export transactions to Excel or PDF ──────────────
router.get('/reports/export', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const { from, to, format = 'excel', branch, employee_id } = req.query
    let where = 'WHERE 1=1'
    const params = []
    if (from)        { params.push(from);        where += ` AND DATE(t.created_at + INTERVAL '5 hours 30 minutes') >= $${params.length}` }
    if (to)          { params.push(to);          where += ` AND DATE(t.created_at + INTERVAL '5 hours 30 minutes') <= $${params.length}` }
    if (employee_id) { params.push(employee_id); where += ` AND t.employee_id = $${params.length}` }
    if (req.user.is_superadmin) {
      if (branch) { params.push(branch); where += ` AND u.branch = $${params.length}` }
    } else if (req.user.is_admin) {
      const userR = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
      const b = userR.rows[0]?.branch
      if (b) { params.push(b); where += ` AND u.branch = $${params.length}` }
    }
    const r = await pool.query(`
      SELECT t.*, u.name AS employee_name, u.branch, c.coins AS customer_coins
      FROM transactions t
      LEFT JOIN users u ON t.employee_id = u.id
      LEFT JOIN customers c ON t.customer_id = c.id
      ${where} ORDER BY t.created_at DESC`, params)
    const rows = r.rows
    if (format === 'excel') {
      const workbook  = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Transactions')
      worksheet.columns = [
        { header: 'ID',             key: 'id',              width: 10 },
        { header: 'Date',           key: 'date',            width: 20 },
        { header: 'Employee',       key: 'employee_name',   width: 20 },
        { header: 'Branch',         key: 'branch',          width: 15 },
        { header: 'Customer',       key: 'cust_name',       width: 20 },
        { header: 'PAN',            key: 'cust_pan',        width: 14 },
        { header: 'Mobile',         key: 'cust_mobile',     width: 13 },
        { header: 'Aadhar',         key: 'cust_aadhar',     width: 14 },
        { header: 'Customer Coins', key: 'customer_coins',  width: 14 },
        { header: 'Service',        key: 'service_type',    width: 22 },
        { header: 'Platform',       key: 'platform',        width: 15 },
        { header: 'Bill Platform',  key: 'bill_platform',   width: 15 },
        { header: 'Bank',           key: 'bank',            width: 20 },
        { header: 'Card Type',      key: 'card',            width: 14 },
        { header: 'Card Bank',      key: 'card_bank',       width: 16 },
        { header: 'Card Last4',     key: 'card_last4',      width: 12 },
        { header: 'Account No',     key: 'acc_no',          width: 18 },
        { header: 'Amount',         key: 'amount',          width: 14 },
        { header: 'Charges %',      key: 'charges_pct',     width: 12 },
        { header: 'Charges ₹',      key: 'charges_amount',  width: 14 },
        { header: 'Settled',        key: 'settled_amount',  width: 14 },
        { header: 'Bill Amount',    key: 'bill_amount',     width: 13 },
        { header: 'Bill Remaining', key: 'bill_remaining',  width: 14 },
        { header: 'Total Collected',key: 'total_collected', width: 15 },
        { header: 'Profit',         key: 'profit',          width: 14 },
        { header: 'Payment Mode',   key: 'payment_mode',    width: 14 },
        { header: 'Received Mode',  key: 'received_mode',   width: 14 },
        { header: 'Note',           key: 'note',            width: 30 },
      ]
      rows.forEach(t => worksheet.addRow({
        ...t,
        date:            new Date(t.created_at).toLocaleString('en-IN'),
        bank:            t.bank || t.card_bank || '',
        amount:          parseFloat(t.amount || 0),
        charges_amount:  parseFloat(t.charges_amount || 0),
        settled_amount:  parseFloat(t.settled_amount || 0),
        bill_amount:     parseFloat(t.bill_amount || 0),
        bill_remaining:  parseFloat(t.bill_remaining || 0),
        total_collected: parseFloat(t.total_collected || 0),
        profit:          parseFloat(t.profit || 0),
        customer_coins:  parseInt(t.customer_coins || 0),
      }))
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename=transactions_${from}_to_${to}.xlsx`)
      await workbook.xlsx.write(res)
      return res.end()
    }
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(14)
    doc.text('Transaction Report', 14, 14)
    doc.setFontSize(9)
    doc.text(`Period: ${from} to ${to}  |  Total: ${rows.length} transactions`, 14, 22)
    doc.autoTable({
      head: [['#', 'Date', 'Employee', 'Branch', 'Customer', 'PAN', 'Mobile', 'Service', 'Platform', 'Bank', 'Card', 'Acc No', 'Amount', 'Charges', 'Settled', 'Total Collected', 'Profit', 'Pay Mode', 'Recv Mode', 'Note']],
      body: rows.map(t => [
        t.id,
        new Date(t.created_at).toLocaleDateString('en-IN'),
        t.employee_name || '',
        t.branch || '',
        t.cust_name || '',
        t.cust_pan || '',
        t.cust_mobile || '',
        t.service_type || '',
        t.platform || t.bill_platform || '',
        t.bank || t.card_bank || '',
        t.card ? `${t.card}${t.card_last4 ? ` ****${t.card_last4}` : ''}` : '',
        t.acc_no || '',
        `${parseFloat(t.amount||0).toLocaleString('en-IN')}`,
        `${parseFloat(t.charges_amount||0).toLocaleString('en-IN')}`,
        `${parseFloat(t.settled_amount||0).toLocaleString('en-IN')}`,
        `${parseFloat(t.total_collected||0).toLocaleString('en-IN')}`,
        `${parseFloat(t.profit||0).toLocaleString('en-IN')}`,
        t.payment_mode || '',
        t.received_mode || '',
        t.note || '',
      ]),
      startY: 28,
      styles: { fontSize: 6 },
      headStyles: { fillColor: [64, 32, 112] },
    })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${from}_to_${to}.pdf`)
    res.send(Buffer.from(doc.output('arraybuffer')))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET single transaction detail ───────────────────────────
router.get('/reports/:id', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT t.*, u.name AS employee_name, u.branch,
              c.name AS customer_name, c.coins AS customer_coins,
              c.phone AS customer_phone, c.email AS customer_email,
              c.aadhar AS customer_aadhar_db, c.acc_number AS customer_acc_number
       FROM transactions t
       LEFT JOIN users u ON t.employee_id=u.id
       LEFT JOIN customers c ON t.customer_id=c.id
       WHERE t.id=$1`,
      [req.params.id]
    )
    if (!r.rows.length) return res.status(404).json({ error: 'Transaction not found' })
    const txn = r.rows[0]
    const netProfit = parseFloat(txn.profit || 0)
    const gst = netProfit * 0.18
    const profitWithGst = netProfit - gst
    res.json({ ...txn, netProfit, gst, profitWithGst })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Reports: transactions with filters ───────────────────────
router.get('/reports', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const { from, to, branch, platform, employee_id, page = 1 } = req.query
    const PAGE_SIZE = 500
    const offset    = (parseInt(page) - 1) * PAGE_SIZE

    let where = 'WHERE 1=1'
    const params = []
    if (from)        { params.push(from);        where += ` AND DATE(t.created_at + INTERVAL '5 hours 30 minutes') >= $${params.length}` }
    if (to)          { params.push(to);          where += ` AND DATE(t.created_at + INTERVAL '5 hours 30 minutes') <= $${params.length}` }
    if (platform)    { params.push(platform);    where += ` AND t.platform = $${params.length}` }

    if (!req.user.is_admin && !req.user.is_superadmin) {
      params.push(req.user.id)
      where += ` AND t.employee_id = $${params.length}`
    } else if (employee_id) {
      params.push(employee_id)
      where += ` AND t.employee_id = $${params.length}`
    }

    if (req.user.is_superadmin) {
      if (branch) { params.push(branch); where += ` AND u.branch = $${params.length}` }
    } else if (req.user.is_admin) {
      const userR = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
      const b = userR.rows[0]?.branch
      if (b) { params.push(b); where += ` AND u.branch = $${params.length}` }
    }

    // Run full query (for summaries) and paginated query in parallel
    const [allR, pageR, countR] = await Promise.all([
      pool.query(`
        SELECT t.amount, t.profit, t.charges_amount, t.charge_pct, t.settled_amount,
               t.platform, t.bill_platform, t.service_type
        FROM transactions t
        LEFT JOIN users u ON t.employee_id=u.id
        LEFT JOIN customers c ON t.customer_id=c.id
        ${where} ORDER BY t.created_at DESC`, params),
      pool.query(`
        SELECT t.*, u.name AS employee_name, u.branch,
               c.name AS customer_name, c.coins AS customer_coins,
               c.phone AS customer_phone, c.email AS customer_email,
               c.aadhar AS customer_aadhar_db, c.acc_number AS customer_acc_number
        FROM transactions t
        LEFT JOIN users u ON t.employee_id=u.id
        LEFT JOIN customers c ON t.customer_id=c.id
        ${where} ORDER BY t.created_at DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}`, params),
      pool.query(`
        SELECT COUNT(*) FROM transactions t
        LEFT JOIN users u ON t.employee_id=u.id
        LEFT JOIN customers c ON t.customer_id=c.id
        ${where}`, params),
    ])

    const allTxns = allR.rows
    const txns    = pageR.rows
    const total   = parseInt(countR.rows[0].count)

    // Totals from ALL records
    const totals = allTxns.reduce((acc, t) => ({
      amount:         acc.amount         + parseFloat(t.amount || 0),
      profit:         acc.profit         + parseFloat(t.profit || 0),
      charges_amount: acc.charges_amount + parseFloat(t.charges_amount || 0),
      count:          acc.count + 1,
    }), { amount: 0, profit: 0, charges_amount: 0, count: 0 })

    const netProfit    = totals.profit
    const gst          = netProfit * 0.18
    const profitWithGst = netProfit - gst

    // Platform & service summaries from ALL records
    const platformMap = {}
    for (const t of allTxns) {
      const k = t.platform || t.bill_platform || 'Unknown'
      if (!platformMap[k]) platformMap[k] = { name: k, amount: 0, count: 0 }
      platformMap[k].amount += parseFloat(t.amount || 0)
      platformMap[k].count++
    }
    const platformSummary = Object.values(platformMap).sort((a, b) => b.amount - a.amount)

    const SERVICE_TYPES = ['Card Withdrawal', 'Bill Pay + Withdrawal', 'Money Transfer (DMT)', 'AEPS', 'Only Bill Payment']
    const serviceMap = {}
    for (const s of SERVICE_TYPES) serviceMap[s] = { name: s, count: 0, amount: 0, settled: 0, customer_charges: 0, platform_charges: 0, commission: 0 }
    for (const t of allTxns) {
      const s = t.service_type
      if (!serviceMap[s]) serviceMap[s] = { name: s, count: 0, amount: 0, settled: 0, customer_charges: 0, platform_charges: 0, commission: 0 }
      const amt        = parseFloat(t.amount || 0)
      const custCharge = parseFloat(t.charges_amount || 0)
      const platCharge = parseFloat(t.charge_pct || 0) / 100 * amt
      serviceMap[s].count++
      serviceMap[s].amount           += amt
      serviceMap[s].settled          += parseFloat(t.settled_amount || 0)
      serviceMap[s].customer_charges += custCharge
      serviceMap[s].platform_charges += platCharge
      serviceMap[s].commission       += custCharge - platCharge
    }
    const serviceSummary = Object.values(serviceMap)

    res.json({
      transactions: txns,
      totals: { ...totals, netProfit, gst, profitWithGst },
      platformSummary,
      serviceSummary,
      pagination: {
        page:       parseInt(page),
        pageSize:   PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
        hasNext:    offset + PAGE_SIZE < total,
        hasPrev:    parseInt(page) > 1,
      },
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Security: users list + toggle freeze ─────────────────────
router.get('/security/users', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id, name, email, mobile, branch, is_active, is_admin, is_superadmin, is_employee, created_at
      FROM users ORDER BY created_at DESC`)
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN full dashboard stats ─────────────────────────────────
router.get("/admin/stats", authMiddleware, requireRole("is_admin"), async (req, res) => {
  try {
    const uid        = req.user.id
    const today      = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'
    const fromDate = req.query.from || today
    const toDate   = req.query.to   || today

    const userR = await pool.query('SELECT branch FROM users WHERE id=$1', [uid])
    const b     = userR.rows[0]?.branch || null

    const [
      empR, activeEmpR,
      txnTodayR, txnMonthR,
      valTodayR, valMonthR,
      profTodayR, profMonthR,
      custTodayR, custTotalR,
      empPerfR, attendR,
    ] = b ? await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users WHERE is_employee=TRUE AND branch=$1`, [b]),
      pool.query(`SELECT COUNT(*) FROM users WHERE is_employee=TRUE AND is_active=TRUE AND branch=$1`, [b]),
      pool.query(`SELECT COUNT(*) FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$1 AND u.branch=$2`, [today, b]),
      pool.query(`SELECT COUNT(*) FROM transactions t JOIN users u ON t.employee_id=u.id WHERE t.created_at>=$1 AND u.branch=$2`, [monthStart, b]),
      pool.query(`SELECT COALESCE(SUM(t.amount),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$1 AND u.branch=$2`, [today, b]),
      pool.query(`SELECT COALESCE(SUM(t.amount),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE t.created_at>=$1 AND u.branch=$2`, [monthStart, b]),
      pool.query(`SELECT COALESCE(SUM(t.profit),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$1 AND u.branch=$2`, [today, b]),
      pool.query(`SELECT COALESCE(SUM(t.profit),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE t.created_at>=$1 AND u.branch=$2`, [monthStart, b]),
      pool.query(`SELECT COUNT(*) FROM customers c JOIN users u ON c.added_by=u.id WHERE c.created_at::date=$1 AND u.branch=$2`, [today, b]),
      pool.query(`SELECT COUNT(*) FROM customers c JOIN users u ON c.added_by=u.id WHERE u.branch=$1`, [b]),
      pool.query(`SELECT u.id, u.name, u.coins, COUNT(t.id) AS txn, COALESCE(SUM(t.amount),0) AS value, COALESCE(SUM(t.profit),0) AS profit FROM users u LEFT JOIN transactions t ON t.employee_id=u.id AND DATE(t.created_at + INTERVAL '5 hours 30 minutes') BETWEEN $1 AND $2 WHERE u.is_employee=TRUE AND u.branch=$3 GROUP BY u.id, u.name, u.coins ORDER BY txn DESC LIMIT 10`, [fromDate, toDate, b]),
      pool.query(`SELECT a.id, u.name AS employee_name, a.check_in, a.check_out, a.status, a.minutes FROM attendance a JOIN users u ON a.user_id=u.id WHERE a.date=$1 AND u.branch=$2 ORDER BY a.check_in ASC`, [today, b]),
    ]) : await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users WHERE is_employee=TRUE`),
      pool.query(`SELECT COUNT(*) FROM users WHERE is_employee=TRUE AND is_active=TRUE`),
      pool.query(`SELECT COUNT(*) FROM transactions WHERE DATE(created_at + INTERVAL '5 hours 30 minutes')=$1`, [today]),
      pool.query(`SELECT COUNT(*) FROM transactions WHERE created_at>=$1`, [monthStart]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM transactions WHERE DATE(created_at + INTERVAL '5 hours 30 minutes')=$1`, [today]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM transactions WHERE created_at>=$1`, [monthStart]),
      pool.query(`SELECT COALESCE(SUM(profit),0) AS val FROM transactions WHERE DATE(created_at + INTERVAL '5 hours 30 minutes')=$1`, [today]),
      pool.query(`SELECT COALESCE(SUM(profit),0) AS val FROM transactions WHERE created_at>=$1`, [monthStart]),
      pool.query(`SELECT COUNT(*) FROM customers WHERE created_at::date=$1`, [today]),
      pool.query(`SELECT COUNT(*) FROM customers`),
      pool.query(`SELECT u.id, u.name, u.coins, COUNT(t.id) AS txn, COALESCE(SUM(t.amount),0) AS value, COALESCE(SUM(t.profit),0) AS profit FROM users u LEFT JOIN transactions t ON t.employee_id=u.id AND DATE(t.created_at + INTERVAL '5 hours 30 minutes') BETWEEN $1 AND $2 WHERE u.is_employee=TRUE GROUP BY u.id, u.name, u.coins ORDER BY txn DESC LIMIT 10`, [fromDate, toDate]),
      pool.query(`SELECT a.id, u.name AS employee_name, a.check_in, a.check_out, a.status, a.minutes FROM attendance a JOIN users u ON a.user_id=u.id WHERE a.date=$1 ORDER BY a.check_in ASC`, [today]),
    ])

    const LATE   = 9 * 60 + 15
    const isLate = t => { if (!t) return false; const [h,m] = t.split(':').map(Number); return h*60+m > LATE }
    const maxTxn = Math.max(1, ...empPerfR.rows.map(e => parseInt(e.txn)))

    res.json({
      stats: {
        totalEmployees:  parseInt(empR.rows[0].count),
        activeEmployees: parseInt(activeEmpR.rows[0].count),
        txnToday:        parseInt(txnTodayR.rows[0].count),
        txnMonth:        parseInt(txnMonthR.rows[0].count),
        valueToday:      parseFloat(valTodayR.rows[0].val),
        valueMonth:      parseFloat(valMonthR.rows[0].val),
        profitToday:     parseFloat(profTodayR.rows[0].val),
        profitMonth:     parseFloat(profMonthR.rows[0].val),
        custToday:       parseInt(custTodayR.rows[0].count),
        custTotal:       parseInt(custTotalR.rows[0].count),
      },
      employees: empPerfR.rows.map((e, i) => ({
        id: e.id, name: e.name,
        txn: parseInt(e.txn), value: parseFloat(e.value), profit: parseFloat(e.profit),
        coins: parseInt(e.coins || 0),
        pct: Math.round(parseInt(e.txn) / maxTxn * 100),
        badge: i === 0 ? '🏆' : i === 1 ? '⭐' : '',
      })),
      attendance: attendR.rows.map(a => ({ ...a, late: isLate(a.check_in) })),
    })
  } catch (err) { console.error('admin/stats ERROR:', err.message, err.stack); res.status(500).json({ error: err.message }) }
})
// ── EMPLOYEE full dashboard stats ────────────────────────────
router.get('/employee/stats', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const uid        = req.user.id
    const today      = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'
    const yesterday  = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const [
      profileR, txnTodayR, txnMonthR,
      valTodayR, valMonthR,
      profTodayR, profMonthR,
      txnListR, attendR,
      custAttendedTodayR, custNewTodayR, custTotalR,
      txnYesterdayR, valYesterdayR,
    ] = await Promise.all([
      pool.query('SELECT id,name,email,branch,is_admin,coins,created_at FROM users WHERE id=$1', [uid]),
      pool.query(`SELECT COUNT(*) FROM transactions WHERE employee_id=$1 AND DATE(created_at + INTERVAL '5 hours 30 minutes')=$2`, [uid, today]),
      pool.query('SELECT COUNT(*) FROM transactions WHERE employee_id=$1 AND created_at>=$2', [uid, monthStart]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM transactions WHERE employee_id=$1 AND DATE(created_at + INTERVAL '5 hours 30 minutes')=$2`, [uid, today]),
      pool.query('SELECT COALESCE(SUM(amount),0) AS val FROM transactions WHERE employee_id=$1 AND created_at>=$2', [uid, monthStart]),
      pool.query(`SELECT COALESCE(SUM(profit),0) AS val FROM transactions WHERE employee_id=$1 AND DATE(created_at + INTERVAL '5 hours 30 minutes')=$2`, [uid, today]),
      pool.query('SELECT COALESCE(SUM(profit),0) AS val FROM transactions WHERE employee_id=$1 AND created_at>=$2', [uid, monthStart]),
      pool.query('SELECT * FROM transactions WHERE employee_id=$1 ORDER BY created_at DESC LIMIT 20', [uid]),
      pool.query('SELECT * FROM attendance WHERE user_id=$1 AND date=$2', [uid, today]),
      pool.query(`SELECT COUNT(*) FROM (SELECT DISTINCT COALESCE(customer_id::text, cust_name) FROM transactions WHERE employee_id=$1 AND DATE(created_at + INTERVAL '5 hours 30 minutes')=$2) t`, [uid, today]),
      pool.query(`SELECT COUNT(*) FROM customers WHERE added_by=$1 AND DATE(created_at + INTERVAL '5 hours 30 minutes')=$2`, [uid, today]),
      pool.query('SELECT COUNT(*) FROM customers WHERE added_by=$1', [uid]),
      pool.query(`SELECT COUNT(*) FROM transactions WHERE employee_id=$1 AND DATE(created_at + INTERVAL '5 hours 30 minutes')=$2`, [uid, yesterday]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM transactions WHERE employee_id=$1 AND DATE(created_at + INTERVAL '5 hours 30 minutes')=$2`, [uid, yesterday]),
    ])

    const att = attendR.rows[0] || null
    const LATE = 9 * 60 + 15
    const isLate = t => { if (!t) return false; const [h,m] = t.split(':').map(Number); return h*60+m > LATE }

    const txnTodayVal  = parseInt(txnTodayR.rows[0].count)
    const txnYestVal   = parseInt(txnYesterdayR.rows[0].count)
    const valTodayVal  = parseFloat(valTodayR.rows[0].val)
    const valYestVal   = parseFloat(valYesterdayR.rows[0].val)

    res.json({
      profile: profileR.rows[0],
      stats: {
        txnToday:          txnTodayVal,
        txnMonth:          parseInt(txnMonthR.rows[0].count),
        valueToday:        valTodayVal,
        valueMonth:        parseFloat(valMonthR.rows[0].val),
        profitToday:       parseFloat(profTodayR.rows[0].val),
        profitMonth:       parseFloat(profMonthR.rows[0].val),
        custAttendedToday: parseInt(custAttendedTodayR.rows[0].count),
        custNewToday:      parseInt(custNewTodayR.rows[0].count),
        custTotal:         parseInt(custTotalR.rows[0].count),
        txnGrowth:         txnYestVal > 0 ? Math.round((txnTodayVal - txnYestVal) / txnYestVal * 100) : null,
        valueGrowth:       valYestVal > 0 ? Math.round((valTodayVal - valYestVal) / valYestVal * 100) : null,
      },
      transactions: txnListR.rows,
      attendance: att ? { ...att, late: isLate(att.check_in) } : null,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})


// ── Growth / Degrowth (SuperAdmin) ────────────────────────────
router.get('/growth/superadmin', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    const { baseMonth, baseYear, compareMonth, compareYear } = req.query;
    
    // Default base to current month if not provided
    const istNow = new Date(Date.now() + 5.5 * 3600000);
    const bMonth = parseInt(baseMonth || (istNow.getMonth() + 1));
    const bYear  = parseInt(baseYear || istNow.getFullYear());
    
    // Default compare to previous month if not provided
    let cMonth = parseInt(compareMonth);
    let cYear = parseInt(compareYear);
    if (!compareMonth || !compareYear) {
      cMonth = bMonth - 1;
      cYear = bYear;
      if (cMonth === 0) { cMonth = 12; cYear -= 1; }
    }

    const branchQuery = `
      SELECT 
        b.id as branch_id, b.name as branch_name,
        (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t JOIN users u ON u.id = t.employee_id WHERE u.branch = b.name AND EXTRACT(MONTH FROM t.created_at) = $1 AND EXTRACT(YEAR FROM t.created_at) = $2) as base_vol,
        (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t JOIN users u ON u.id = t.employee_id WHERE u.branch = b.name AND EXTRACT(MONTH FROM t.created_at) = $3 AND EXTRACT(YEAR FROM t.created_at) = $4) as compare_vol,
        (SELECT COUNT(id) FROM customers c WHERE c.branch = b.name AND EXTRACT(MONTH FROM created_at) = $1 AND EXTRACT(YEAR FROM created_at) = $2) as base_cust,
        (SELECT COUNT(id) FROM customers c WHERE c.branch = b.name AND EXTRACT(MONTH FROM created_at) = $3 AND EXTRACT(YEAR FROM created_at) = $4) as compare_cust
      FROM branches b
      ORDER BY b.name
    `;
    const empQuery = `
      SELECT 
        u.id as user_id, u.name as employee_name, u.branch,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE employee_id = u.id AND EXTRACT(MONTH FROM created_at) = $1 AND EXTRACT(YEAR FROM created_at) = $2) as base_vol,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE employee_id = u.id AND EXTRACT(MONTH FROM created_at) = $3 AND EXTRACT(YEAR FROM created_at) = $4) as compare_vol,
        (SELECT COUNT(id) FROM customers WHERE added_by = u.id AND EXTRACT(MONTH FROM created_at) = $1 AND EXTRACT(YEAR FROM created_at) = $2) as base_cust,
        (SELECT COUNT(id) FROM customers WHERE added_by = u.id AND EXTRACT(MONTH FROM created_at) = $3 AND EXTRACT(YEAR FROM created_at) = $4) as compare_cust
      FROM users u
      WHERE u.is_employee = true
      ORDER BY u.name
    `;
    const [branches, employees] = await Promise.all([
      pool.query(branchQuery, [bMonth, bYear, cMonth, cYear]),
      pool.query(empQuery, [bMonth, bYear, cMonth, cYear])
    ]);
    res.json({ branches: branches.rows, employees: employees.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Growth / Degrowth (Admin) ─────────────────────────────────
router.get('/growth/admin', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const { baseMonth, baseYear, compareMonth, compareYear } = req.query;
    if (!req.user.branch) return res.status(400).json({ error: 'Admin has no branch assigned' });
    
    // Default base to current month if not provided
    const istNow = new Date(Date.now() + 5.5 * 3600000);
    const bMonth = parseInt(baseMonth || (istNow.getMonth() + 1));
    const bYear  = parseInt(baseYear || istNow.getFullYear());
    
    // Default compare to previous month if not provided
    let cMonth = parseInt(compareMonth);
    let cYear = parseInt(compareYear);
    if (!compareMonth || !compareYear) {
      cMonth = bMonth - 1;
      cYear = bYear;
      if (cMonth === 0) { cMonth = 12; cYear -= 1; }
    }

    const branchId = req.user.branch;

    const q = `
      SELECT 
        u.id as user_id, u.name as employee_name,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE employee_id = u.id AND EXTRACT(MONTH FROM created_at) = $1 AND EXTRACT(YEAR FROM created_at) = $2) as base_vol,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE employee_id = u.id AND EXTRACT(MONTH FROM created_at) = $3 AND EXTRACT(YEAR FROM created_at) = $4) as compare_vol,
        (SELECT COUNT(id) FROM customers WHERE added_by = u.id AND EXTRACT(MONTH FROM created_at) = $1 AND EXTRACT(YEAR FROM created_at) = $2) as base_cust,
        (SELECT COUNT(id) FROM customers WHERE added_by = u.id AND EXTRACT(MONTH FROM created_at) = $3 AND EXTRACT(YEAR FROM created_at) = $4) as compare_cust
      FROM users u
      WHERE u.branch = $5 AND u.is_employee = true
      ORDER BY u.name
    `;
    const r = await pool.query(q, [bMonth, bYear, cMonth, cYear, branchId]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Targets (Admin) ───────────────────────────────────────────
router.get('/targets', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: 'Month and year are required' });
    if (!req.user.branch) return res.status(400).json({ error: 'Admin has no branch assigned' });
    
    const r = await pool.query(`
      SELECT et.*, u.name as employee_name
      FROM employee_targets et
      JOIN users u ON u.id = et.user_id
      WHERE et.branch = $1 AND et.month::integer = $2::integer AND et.year::integer = $3::integer
    `, [req.user.branch, month, year]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/targets', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const { user_id, target_amount } = req.body;
    const month = parseInt(req.body.month);
    const year = parseInt(req.body.year);
    if (!user_id || !month || !year || target_amount === undefined) 
      return res.status(400).json({ error: 'Missing required fields' });
    if (!req.user.branch) return res.status(400).json({ error: 'Admin has no branch assigned' });

    // Ensure the target user actually belongs to this admin's branch
    const uCheck = await pool.query('SELECT branch FROM users WHERE id=$1 AND is_employee=true', [user_id]);
    if (!uCheck.rows.length || uCheck.rows[0].branch !== req.user.branch) {
      return res.status(403).json({ error: 'User does not exist or belongs to another branch' });
    }

    const q = `
      INSERT INTO employee_targets (user_id, branch, month, year, target_amount, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, month, year) 
      DO UPDATE SET target_amount = $5, updated_at = NOW()
      RETURNING *
    `;
    const r = await pool.query(q, [user_id, req.user.branch, month, year, target_amount]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Target Tracker (Employee) ─────────────────────────────────
router.get('/employee/target', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const istNow   = new Date(Date.now() + 5.5 * 3600000);
    const month = istNow.getMonth() + 1;
    const year = istNow.getFullYear();
    const userId = req.user.id;

    const q = `
      SELECT 
        et.target_amount,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE employee_id = $1 AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3) as achieved_amount
      FROM employee_targets et
      WHERE et.user_id = $1 AND et.month::integer = $2::integer AND et.year::integer = $3::integer
    `;
    const r = await pool.query(q, [userId, month, year]);
    
    if (!r.rows.length) {
      // Return 0s if no target is set
      const achievedR = await pool.query(`SELECT COALESCE(SUM(amount), 0) as achieved_amount FROM transactions WHERE employee_id = $1 AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3`, [userId, month, year]);
      return res.json({ target_amount: 0, achieved_amount: achievedR.rows[0].achieved_amount });
    }
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/employee/target-history', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const userId = req.user.id;
    const q = `
      WITH months AS (
        SELECT DISTINCT EXTRACT(MONTH FROM created_at) as month, EXTRACT(YEAR FROM created_at) as year FROM transactions WHERE employee_id = $1
        UNION
        SELECT month, year FROM employee_targets WHERE user_id = $1
      )
      SELECT 
        m.month, m.year,
        COALESCE((SELECT target_amount FROM employee_targets WHERE user_id = $1 AND month::integer = m.month::integer AND year::integer = m.year::integer), 0) as target_amount,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE employee_id = $1 AND EXTRACT(MONTH FROM created_at) = m.month AND EXTRACT(YEAR FROM created_at) = m.year), 0) as achieved_amount,
        COALESCE((SELECT COUNT(id) FROM customers WHERE added_by = $1 AND EXTRACT(MONTH FROM created_at) = m.month AND EXTRACT(YEAR FROM created_at) = m.year), 0) as customers_added
      FROM months m
      ORDER BY m.year DESC, m.month DESC
    `;
    const r = await pool.query(q, [userId]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ── Bill Due Dates ──────────────────────────────────────────────
router.get('/bill-due-dates/employee', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const q = `
      SELECT t.id, t.cust_name, t.cust_mobile, t.bill_amount, t.bill_due_date, t.created_at, u.name as added_by
      FROM transactions t
      JOIN users u ON u.id = t.employee_id
      WHERE u.branch = $1 AND t.bill_due_date IS NOT NULL
      ORDER BY t.bill_due_date ASC
    `;
    const r = await pool.query(q, [req.user.branch]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/bill-due-dates/admin', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const q = `
      SELECT t.id, t.cust_name, t.cust_mobile, t.bill_amount, t.bill_due_date, t.created_at, u.name as added_by
      FROM transactions t
      JOIN users u ON u.id = t.employee_id
      WHERE u.branch = $1 AND t.bill_due_date IS NOT NULL
      ORDER BY t.bill_due_date ASC
    `;
    const r = await pool.query(q, [req.user.branch]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/bill-due-dates/superadmin', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    const q = `
      SELECT t.id, t.cust_name, t.cust_mobile, t.bill_amount, t.bill_due_date, t.created_at, u.name as added_by, u.branch
      FROM transactions t
      JOIN users u ON u.id = t.employee_id
      WHERE t.bill_due_date IS NOT NULL
      ORDER BY t.bill_due_date ASC
    `;
    const r = await pool.query(q);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Employee Role-Based Access Features ─────────────────────────

router.get('/employee-features/transactions', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const branchRes = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
    const branch = branchRes.rows[0]?.branch
    if (!branch) return res.json([])
    
    const r = await pool.query(
      `SELECT t.*, u.name as employee_name, u.branch 
       FROM transactions t
       JOIN users u ON t.employee_id = u.id
       WHERE u.branch = $1 
       ORDER BY t.created_at DESC LIMIT 300`,
      [branch]
    )
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/employee-features/requests', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const branchRes = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
    const branch = branchRes.rows[0]?.branch
    if (!branch) return res.json([])
    
    const r = await pool.query(
      `SELECT l.*, u.name as employee_name, a.name as assigned_name 
       FROM leads l
       LEFT JOIN users u ON l.employee_id = u.id
       LEFT JOIN users a ON l.assigned_to = a.id
       WHERE l.branch = $1 
       ORDER BY l.created_at DESC LIMIT 200`,
      [branch]
    )
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/employee-features/expenses', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const branchRes = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
    const branch = branchRes.rows[0]?.branch
    if (!branch) return res.json([])
    
    const r = await pool.query(
      `SELECT e.*, u.name as created_by_name 
       FROM expenses e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.branch = $1 
       ORDER BY e.date DESC, e.created_at DESC LIMIT 200`,
      [branch]
    )
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/employee-features/attendance', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const branchRes = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
    const branch = branchRes.rows[0]?.branch
    if (!branch) return res.json([])
    
    const r = await pool.query(
      `SELECT a.*, u.name, u.role
       FROM attendance a
       JOIN users u ON a.employee_id = u.id
       WHERE u.branch = $1 
       ORDER BY a.date DESC LIMIT 200`,
      [branch]
    )
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Pending Payments ──────────────────────────────────────────

router.get('/pending-payments', authMiddleware, async (req, res) => {
  try {
    let query = 'SELECT * FROM pending_payments'
    let params = []
    
    if (!req.user.is_superadmin) {
      if (req.user.is_employee || req.user.is_admin) {
        // Employee or Admin can only see their branch
        const u = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
        if (u.rows.length === 0 || !u.rows[0].branch) {
          return res.json([])
        }
        query += ' WHERE branch = $1'
        params.push(u.rows[0].branch)
      }
    }
    query += ' ORDER BY created_at DESC'
    
    const r = await pool.query(query, params)
    res.json(r.rows)
  } catch (err) {
    console.error('GET /pending-payments error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/pending-payments', authMiddleware, async (req, res) => {
  const { customer_id, cust_name, cust_mobile, pending_amount, reason, card_number } = req.body
  try {
    const u = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
    const branch = u.rows[0]?.branch || ''
    
    const r = await pool.query(
      `INSERT INTO pending_payments (branch, employee_id, customer_id, cust_name, cust_mobile, pending_amount, reason, card_number) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [branch, req.user.id, customer_id || null, cust_name, cust_mobile, pending_amount, reason, card_number]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    console.error('POST /pending-payments error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/pending-payments/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body
  try {
    const r = await pool.query(
      'UPDATE pending_payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]
    )
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json(r.rows[0])
  } catch (err) {
    console.error('PATCH /pending-payments status error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router

