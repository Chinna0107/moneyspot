const express                         = require('express')
const pool                            = require('../db')
const { authMiddleware, requireRole } = require('../middleware/auth')
const router                          = express.Router()

// helper: get branch filter for current user
const getBranchFilter = async (user) => {
  if (user.is_superadmin) return null  // sees all
  if (user.is_admin) {
    const r = await pool.query('SELECT branch FROM users WHERE id=$1', [user.id])
    return r.rows[0]?.branch || null
  }
  return null  // employees filtered by employee_id separately
}

// ── GET lead stats ─────────────────────────────────────────────
// MUST be before /:id
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const today  = new Date().toISOString().split('T')[0]
    const params = []
    let   where  = 'WHERE 1=1'

    if (req.user.is_employee && !req.user.is_admin && !req.user.is_superadmin) {
      params.push(req.user.id)
      where += ` AND employee_id=$${params.length}`
    } else if (req.user.is_admin && !req.user.is_superadmin) {
      const branch = await getBranchFilter(req.user)
      if (branch) { params.push(branch); where += ` AND branch=$${params.length}` }
    }

    const baseParams = [...params]
    const todayParams = [...params, today]

    const [todayR, approvedR, rejectedR, inprocessR, valueR, totalR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM leads ${where} AND DATE(created_at)=$${todayParams.length}`, todayParams),
      pool.query(`SELECT COUNT(*) FROM leads ${where} AND status='approved'`,   baseParams),
      pool.query(`SELECT COUNT(*) FROM leads ${where} AND status='rejected'`,   baseParams),
      pool.query(`SELECT COUNT(*) FROM leads ${where} AND status='in_process'`, baseParams),
      pool.query(`SELECT COALESCE(SUM(converted_value),0) AS val FROM leads ${where} AND status='approved'`, baseParams),
      pool.query(`SELECT COUNT(*) FROM leads ${where}`, baseParams),
    ])

    res.json({
      today:      parseInt(todayR.rows[0].count),
      approved:   parseInt(approvedR.rows[0].count),
      rejected:   parseInt(rejectedR.rows[0].count),
      in_process: parseInt(inprocessR.rows[0].count),
      value:      parseFloat(valueR.rows[0].val),
      total:      parseInt(totalR.rows[0].count),
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET leaderboard ────────────────────────────────────────────
// MUST be before /:id
router.get('/leaderboard', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    let branchFilter = ''
    const params = []
    if (!req.user.is_superadmin) {
      const branch = await getBranchFilter(req.user)
      if (branch) { params.push(branch); branchFilter = ` AND u.branch=$${params.length}` }
    }
    const r = await pool.query(`
      SELECT u.id, u.name, u.branch,
        COUNT(l.id) AS total,
        COUNT(l.id) FILTER (WHERE l.status='approved') AS approved,
        COALESCE(SUM(l.converted_value),0) AS value
      FROM users u
      LEFT JOIN leads l ON l.employee_id = u.id
      WHERE u.is_employee = TRUE${branchFilter}
      GROUP BY u.id, u.name, u.branch
      ORDER BY total DESC LIMIT 10`, params)
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET leads ─────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, lead_type, date } = req.query
    const params = []
    let   where  = 'WHERE 1=1'

    if (req.user.is_employee && !req.user.is_admin && !req.user.is_superadmin) {
      params.push(req.user.id)
      where += ` AND l.employee_id=$${params.length}`
    } else if (req.user.is_admin && !req.user.is_superadmin) {
      const branch = await getBranchFilter(req.user)
      if (branch) { params.push(branch); where += ` AND l.branch=$${params.length}` }
    }

    if (status)    { params.push(status);    where += ` AND l.status=$${params.length}` }
    if (lead_type) { params.push(lead_type); where += ` AND l.lead_type=$${params.length}` }
    if (date)      { params.push(date);      where += ` AND DATE(l.created_at)=$${params.length}` }

    const r = await pool.query(`
      SELECT l.*, u.name AS employee_name, a.name AS assigned_name
      FROM leads l
      LEFT JOIN users u ON l.employee_id = u.id
      LEFT JOIN users a ON l.assigned_to  = a.id
      ${where} ORDER BY l.created_at DESC LIMIT 200`, params)
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST create lead ───────────────────────────────────────────
router.post('/', authMiddleware, requireRole('is_employee'), async (req, res) => {
  const {
    cust_name, mobile, email, lead_type, required_amount,
    company_name, job_type, cibil_score, location, remarks,
    aadhar_url, pan_url, bank_stmt_url, payslip_url, followup_date
  } = req.body
  if (!cust_name?.trim()) return res.status(400).json({ error: 'Customer name is required' })
  if (!mobile?.trim())    return res.status(400).json({ error: 'Mobile is required' })
  if (!lead_type?.trim()) return res.status(400).json({ error: 'Lead type is required' })
  try {
    const r = await pool.query(`
      INSERT INTO leads
        (employee_id, branch, cust_name, mobile, email, lead_type, required_amount,
         company_name, job_type, cibil_score, location, remarks,
         aadhar_url, pan_url, bank_stmt_url, payslip_url, followup_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [req.user.id, req.user.branch || null,
       cust_name.trim(), mobile.trim(), email?.trim() || null,
       lead_type, parseFloat(required_amount) || 0,
       company_name?.trim() || null, job_type || null,
       cibil_score ? parseInt(cibil_score) : null,
       location?.trim() || null, remarks?.trim() || null,
       aadhar_url || null, pan_url || null, bank_stmt_url || null, payslip_url || null,
       followup_date || null]
    )
    res.status(201).json(r.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── PATCH update lead ──────────────────────────────────────────
router.patch('/:id', authMiddleware, async (req, res) => {
  const { status, assigned_to, followup_date, remarks, converted_value } = req.body
  try {
    const fields = []
    const vals   = []
    if (status !== undefined)          { vals.push(status);                      fields.push(`status=$${vals.length}`) }
    if (assigned_to !== undefined)     { vals.push(assigned_to);                 fields.push(`assigned_to=$${vals.length}`) }
    if (followup_date !== undefined)   { vals.push(followup_date);               fields.push(`followup_date=$${vals.length}`) }
    if (remarks !== undefined)         { vals.push(remarks);                     fields.push(`remarks=$${vals.length}`) }
    if (converted_value !== undefined) { vals.push(parseFloat(converted_value)); fields.push(`converted_value=$${vals.length}`) }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
    fields.push(`updated_at=NOW()`)
    vals.push(req.params.id)
    const r = await pool.query(
      `UPDATE leads SET ${fields.join(',')} WHERE id=$${vals.length} RETURNING *`, vals)
    if (!r.rows.length) return res.status(404).json({ error: 'Lead not found' })
    res.json(r.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── DELETE lead ────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM leads WHERE id=$1 AND employee_id=$2', [req.params.id, req.user.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
