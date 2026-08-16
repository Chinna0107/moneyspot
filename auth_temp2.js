const express            = require('express')
const bcrypt             = require('bcrypt')
const pool               = require('../db')
const redis              = require('../redis')
const { signToken }      = require('../middleware/auth')
const router             = express.Router()

// ── EMPLOYEE login (single step: password + mpin together) ───
router.post('/employee/login', async (req, res) => {
  const { email, password, mpin } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE email=$1 AND is_employee=TRUE AND is_active=TRUE`, [email]
    )
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' })
    const user = result.rows[0]

    const validPass = await bcrypt.compare(password, user.password_hash)
    if (!validPass) return res.status(401).json({ error: 'Invalid credentials' })

    // If mpin sent, verify and return token in one shot
    if (mpin) {
      const validMpin = await bcrypt.compare(mpin, user.mpin_hash)
      if (!validMpin) return res.status(401).json({ error: 'Invalid MPIN' })

      // ── Block login if attendance already completed today ──
      const today = new Date().toISOString().split('T')[0]
      const attR  = await pool.query(
        'SELECT check_in, check_out FROM attendance WHERE user_id=$1 AND date=$2',
        [user.id, today]
      )
      if (attR.rows.length && attR.rows[0].check_in && attR.rows[0].check_out) {
        return res.status(403).json({
          error: `Attendance completed for today (In: ${attR.rows[0].check_in}, Out: ${attR.rows[0].check_out}). Login not allowed again today.`
        })
      }

      const { id, name, email: userEmail, is_admin, is_superadmin, branch, permissions } = user
      const token = signToken({ id, name, email: userEmail, is_employee: true, is_admin, is_superadmin, branch, permissions })
      try { await redis.setex(`session:${id}`, 28800, JSON.stringify({ id, name, email: userEmail, is_admin, is_superadmin, branch, permissions })) } catch (_) {}
      return res.json({ message: 'Login successful', token, user: { id, name, email: userEmail, is_admin, is_superadmin, branch, permissions } })
    }

    // Step-1 only fallback (legacy)
    try { await redis.setex(`step1:${email}`, 300, 'verified') } catch (_) {}
    res.json({ message: 'Credentials verified' })
  } catch (err) { console.error('employee/login error:', err.message, err.stack); res.status(500).json({ error: err.message }) }
})

// ── EMPLOYEE verify-mpin (legacy step 2 kept for compatibility) ──
router.post('/employee/verify-mpin', async (req, res) => {
  const { email, mpin } = req.body
  if (!email || !mpin) return res.status(400).json({ error: 'Email and MPIN required' })
  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE email=$1 AND is_employee=TRUE AND is_active=TRUE`, [email]
    )
    if (!result.rows.length) return res.status(401).json({ error: 'Employee not found' })
    const user = result.rows[0]
    const valid = await bcrypt.compare(mpin, user.mpin_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid MPIN' })

    const today = new Date().toISOString().split('T')[0]
    const attR  = await pool.query(
      'SELECT check_in, check_out FROM attendance WHERE user_id=$1 AND date=$2',
      [user.id, today]
    )
    if (attR.rows.length && attR.rows[0].check_in && attR.rows[0].check_out) {
      return res.status(403).json({
        error: `Attendance completed for today (In: ${attR.rows[0].check_in}, Out: ${attR.rows[0].check_out}). Login not allowed again today.`
      })
    }

    const { id, name, email: userEmail, is_admin, is_superadmin, branch, permissions } = user
    const token = signToken({ id, name, email: userEmail, is_employee: true, is_admin, is_superadmin, branch, permissions })
    try { await redis.setex(`session:${id}`, 28800, JSON.stringify({ id, name, email: userEmail, is_admin, is_superadmin, branch, permissions })) } catch (_) {}
    res.json({ message: 'Login successful', token, user: { id, name, email: userEmail, is_admin, is_superadmin, branch, permissions } })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── SUPERADMIN login (single step) ───────────────────────────
router.post('/superadmin/login', async (req, res) => {
  const { email, password, mpin } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE email=$1 AND is_superadmin=TRUE AND is_active=TRUE`, [email]
    )
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' })
    const user = result.rows[0]

    const validPass = await bcrypt.compare(password, user.password_hash)
    if (!validPass) return res.status(401).json({ error: 'Invalid credentials' })

    if (mpin) {
      const validMpin = await bcrypt.compare(mpin, user.mpin_hash)
      if (!validMpin) return res.status(401).json({ error: 'Invalid MPIN' })
      const { id, name, email: userEmail } = user
      const token = signToken({ id, name, email: userEmail, is_superadmin: true })
      try { await redis.setex(`session:${id}`, 28800, JSON.stringify({ id, name, email: userEmail, is_superadmin: true })) } catch (_) {}
      return res.json({ message: 'Login successful', token, user: { id, name, email: userEmail, is_superadmin: true } })
    }

    res.json({ message: 'Credentials verified' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── SUPERADMIN verify-mpin (step 2) ──────────────────────────
router.post('/superadmin/verify-mpin', async (req, res) => {
  const { email, mpin } = req.body
  if (!email || !mpin) return res.status(400).json({ error: 'Email and MPIN required' })
  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE email=$1 AND is_superadmin=TRUE AND is_active=TRUE`, [email]
    )
    if (!result.rows.length) return res.status(401).json({ error: 'Admin not found' })
    const user = result.rows[0]
    const valid = await bcrypt.compare(mpin, user.mpin_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid MPIN' })
    const { id, name, email: userEmail } = user
    const token = signToken({ id, name, email: userEmail, is_employee: true, is_admin: true, is_superadmin: true })
    try { await redis.setex(`session:${id}`, 28800, JSON.stringify({ id, name, email: userEmail, is_superadmin: true })) } catch (_) {}
    res.json({ message: 'Login successful', token, user: { id, name, email: userEmail, is_superadmin: true } })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── SUPERADMIN register ───────────────────────────────────────
router.post('/superadmin/register', async (req, res) => {
  const { name, email, password, mpin, secretKey } = req.body
  if (!name || !email || !password || !mpin || !secretKey)
    return res.status(400).json({ error: 'All fields are required' })
  if (secretKey !== process.env.SUPERADMIN_SECRET_KEY)
    return res.status(403).json({ error: 'Invalid secret key' })
  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const mpinHash     = await bcrypt.hash(mpin, 12)
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, mpin_hash, is_superadmin, is_admin, is_employee, is_active)
       VALUES ($1,$2,$3,$4,TRUE,FALSE,FALSE,TRUE) RETURNING id, name, email`,
      [name, email, passwordHash, mpinHash]
    )
    res.status(201).json({ message: 'Super Admin registered successfully', user: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' })
    res.status(500).json({ error: err.message })
  }
})

// ── GET me ───────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const jwt    = require('jsonwebtoken')
    const SECRET = process.env.JWT_SECRET || 'moneyspot_secret'
    const decoded = jwt.verify(token, SECRET)
    const r = await pool.query('SELECT id, name, email, mobile, pan, aadhar, branch, photo_url, role, is_employee, is_admin, is_superadmin, coins, permissions, created_at FROM users WHERE id=$1', [decoded.id])
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' })
    res.json(r.rows[0])
  } catch { res.status(401).json({ error: 'Invalid token' }) }
})

// ── CHANGE PASSWORD ───────────────────────────────────────────
router.patch('/change-password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  const { current_password, new_password } = req.body
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Current and new password required' })
  if (new_password.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  try {
    const jwt    = require('jsonwebtoken')
    const SECRET = process.env.JWT_SECRET || 'moneyspot_secret'
    const decoded = jwt.verify(token, SECRET)
    const r = await pool.query('SELECT password_hash FROM users WHERE id=$1', [decoded.id])
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' })
    const valid = await bcrypt.compare(current_password, r.rows[0].password_hash)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })
    const newHash = await bcrypt.hash(new_password, 12)
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, decoded.id])
    res.json({ message: 'Password changed successfully' })
  } catch { res.status(401).json({ error: 'Invalid token' }) }
})

// ── LOGOUT ────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(400).json({ error: 'No token provided' })
  try { await redis.setex(`blacklist:${token}`, 28800, '1') } catch (_) {}
  res.json({ message: 'Logged out successfully' })
})

module.exports = router
