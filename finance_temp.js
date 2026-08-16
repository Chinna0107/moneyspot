const express                         = require('express')
const pool                            = require('../db')
const { authMiddleware, requireRole } = require('../middleware/auth')
const router                          = express.Router()

const today      = () => new Date().toISOString().split('T')[0]
const monthStart = () => today().slice(0, 7) + '-01'

// helper: get branch scope
const getBranch = async (req) => {
  if (req.user.is_superadmin) return req.query.branch || null
  const r = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
  return r.rows[0]?.branch || null
}

// helper: add ledger entry + update wallet balance
const addLedgerEntry = async (client, { branch, wallet_id, wallet_name, type, amount, remarks, ref_type, ref_id }) => {
  const walletR = await client.query('SELECT balance FROM wallets WHERE id=$1', [wallet_id])
  const prev    = parseFloat(walletR.rows[0]?.balance || 0)
  const newBal  = type === 'credit' ? prev + parseFloat(amount) : prev - parseFloat(amount)
  await client.query('UPDATE wallets SET balance=$1 WHERE id=$2', [newBal, wallet_id])
  await client.query(
    `INSERT INTO ledger (branch, wallet_id, wallet_name, type, amount, balance, remarks, ref_type, ref_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [branch, wallet_id, wallet_name, type, amount, newBal, remarks || null, ref_type || null, ref_id || null]
  )
  return newBal
}

// ── Dashboard summary ─────────────────────────────────────────
router.get('/summary', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const branch = await getBranch(req)
    const t = today()
    const bf = branch ? 'AND w.branch=$1' : ''
    const p  = branch ? [branch] : []
    const tp = branch ? [branch, t] : [t]
    const tIdx = branch ? '$2' : '$1'
    const bIdx = branch ? 'AND u.branch=$1' : ''

    const [walletsR, cashWalletR, bankWalletR, inflowR, outflowR, profitR, pendingR] = await Promise.all([
      // total wallet balance
      pool.query(`SELECT COALESCE(SUM(balance),0) AS total FROM wallets w WHERE is_active=TRUE ${bf}`, p),
      // cash in hand = balance of 'Cash in Hand' wallet
      pool.query(`SELECT COALESCE(SUM(balance),0) AS val FROM wallets w WHERE name='Cash in Hand' AND is_active=TRUE ${bf}`, p),
      // bank balance = balance of 'Bank Account' wallet
      pool.query(`SELECT COALESCE(SUM(balance),0) AS val FROM wallets w WHERE name='Bank Account' AND is_active=TRUE ${bf}`, p),
      // today inflow
      pool.query(`SELECT COALESCE(SUM(t.amount),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes')=${tIdx} ${bIdx}`, tp),
      // today outflow (expenses)
      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM expenses WHERE date=${tIdx} ${branch ? 'AND branch=$1' : ''}`, tp),
      // today profit
      pool.query(`SELECT COALESCE(SUM(t.profit),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes')=${tIdx} ${bIdx}`, tp),
      // pending settlements
      pool.query(`SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS val FROM settlements WHERE status='pending' ${branch ? 'AND branch=$1' : ''}`, p),
    ])

    res.json({
      walletBalance:      parseFloat(walletsR.rows[0].total),
      cashInHand:         parseFloat(cashWalletR.rows[0].val),
      bankBalance:        parseFloat(bankWalletR.rows[0].val),
      todayInflow:        parseFloat(inflowR.rows[0].val),
      todayOutflow:       parseFloat(outflowR.rows[0].val),
      todayProfit:        parseFloat(profitR.rows[0].val),
      pendingSettlements: parseInt(pendingR.rows[0].cnt),
      pendingAmount:      parseFloat(pendingR.rows[0].val),
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Wallets ───────────────────────────────────────────────────
router.get('/wallets', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const branch    = await getBranch(req)
    const todayDate = today()
    const ms        = monthStart()

    const r = branch
      ? await pool.query(`
          SELECT w.*,
            COALESCE(SUM(CASE WHEN l.type='credit' AND DATE(l.created_at + INTERVAL '5 hours 30 minutes')=$2 THEN l.amount ELSE 0 END),0) AS today_inflow,
            COALESCE(SUM(CASE WHEN l.type='debit'  AND DATE(l.created_at + INTERVAL '5 hours 30 minutes')=$2 THEN l.amount ELSE 0 END),0) AS today_outflow,
            COALESCE(SUM(CASE WHEN l.type='credit' AND l.created_at>=$3 THEN l.amount ELSE 0 END),0) AS month_inflow,
            COALESCE(SUM(CASE WHEN l.type='debit'  AND l.created_at>=$3 THEN l.amount ELSE 0 END),0) AS month_outflow,
            COUNT(CASE WHEN l.ref_type='txn' AND DATE(l.created_at + INTERVAL '5 hours 30 minutes')=$2 THEN 1 END) / 2 AS today_txns
          FROM wallets w
          LEFT JOIN ledger l ON l.wallet_id = w.id
          WHERE w.branch=$1 AND w.is_active=TRUE
          GROUP BY w.id ORDER BY w.wallet_type, w.name`, [branch, todayDate, ms])
      : await pool.query(`
          SELECT w.*,
            COALESCE(SUM(CASE WHEN l.type='credit' AND DATE(l.created_at + INTERVAL '5 hours 30 minutes')=$1 THEN l.amount ELSE 0 END),0) AS today_inflow,
            COALESCE(SUM(CASE WHEN l.type='debit'  AND DATE(l.created_at + INTERVAL '5 hours 30 minutes')=$1 THEN l.amount ELSE 0 END),0) AS today_outflow,
            COALESCE(SUM(CASE WHEN l.type='credit' AND l.created_at>=$2 THEN l.amount ELSE 0 END),0) AS month_inflow,
            COALESCE(SUM(CASE WHEN l.type='debit'  AND l.created_at>=$2 THEN l.amount ELSE 0 END),0) AS month_outflow,
            COUNT(CASE WHEN l.ref_type='txn' AND DATE(l.created_at + INTERVAL '5 hours 30 minutes')=$1 THEN 1 END) / 2 AS today_txns
          FROM wallets w
          LEFT JOIN ledger l ON l.wallet_id = w.id
          WHERE w.is_active=TRUE
          GROUP BY w.id ORDER BY w.branch, w.wallet_type, w.name`, [todayDate, ms])
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/wallets', authMiddleware, requireRole('is_admin'), async (req, res) => {
  const { name, balance = 0 } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Wallet name required' })
  try {
    let branch = await getBranch(req)
    if (!branch) return res.status(400).json({ error: 'No branch assigned' })
    // Validate branch exists in branches table
    const branchCheck = await pool.query('SELECT name FROM branches WHERE name=$1 AND is_active=TRUE', [branch])
    if (!branchCheck.rows.length) return res.status(400).json({ error: `Branch '${branch}' not found. Please use exact branch name from master list.` })
    branch = branchCheck.rows[0].name  // Use exact name from DB
    const r = await pool.query(
      `INSERT INTO wallets (branch, name, balance) VALUES ($1,$2,$3) RETURNING *`,
      [branch, name.trim(), parseFloat(balance) || 0]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Wallet already exists' })
    res.status(500).json({ error: err.message })
  }
})

router.post('/wallets/:id/add', authMiddleware, requireRole('is_admin'), async (req, res) => {
  const { amount, remarks } = req.body
  if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Valid amount required' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const wR = await client.query('SELECT * FROM wallets WHERE id=$1', [req.params.id])
    if (!wR.rows.length) return res.status(404).json({ error: 'Wallet not found' })
    const w = wR.rows[0]
    const newBal = await addLedgerEntry(client, { branch: w.branch, wallet_id: w.id, wallet_name: w.name, type: 'credit', amount, remarks: remarks || 'Add Money', ref_type: 'wallet' })
    await client.query('COMMIT')
    res.json({ message: 'Money added', balance: newBal })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }) }
  finally { client.release() }
})

router.post('/wallets/:id/deduct', authMiddleware, requireRole('is_admin'), async (req, res) => {
  const { amount, remarks } = req.body
  if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Valid amount required' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const wR = await client.query('SELECT * FROM wallets WHERE id=$1', [req.params.id])
    if (!wR.rows.length) return res.status(404).json({ error: 'Wallet not found' })
    const w = wR.rows[0]
    if (parseFloat(w.balance) < parseFloat(amount)) return res.status(400).json({ error: 'Insufficient balance' })
    const newBal = await addLedgerEntry(client, { branch: w.branch, wallet_id: w.id, wallet_name: w.name, type: 'debit', amount, remarks: remarks || 'Deduct Money', ref_type: 'wallet' })
    await client.query('COMMIT')
    res.json({ message: 'Money deducted', balance: newBal })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }) }
  finally { client.release() }
})

router.post('/wallets/transfer', authMiddleware, requireRole('is_admin'), async (req, res) => {
  const { from_id, to_id, amount, remarks } = req.body
  if (!from_id || !to_id || !amount) return res.status(400).json({ error: 'from_id, to_id, amount required' })
  if (from_id === to_id) return res.status(400).json({ error: 'Cannot transfer to same wallet' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const fromR = await client.query('SELECT * FROM wallets WHERE id=$1', [from_id])
    const toR   = await client.query('SELECT * FROM wallets WHERE id=$1', [to_id])
    if (!fromR.rows.length || !toR.rows.length) return res.status(404).json({ error: 'Wallet not found' })
    const from = fromR.rows[0], to = toR.rows[0]
    if (parseFloat(from.balance) < parseFloat(amount)) return res.status(400).json({ error: 'Insufficient balance' })
    await addLedgerEntry(client, { branch: from.branch, wallet_id: from.id, wallet_name: from.name, type: 'debit',  amount, remarks: remarks || `Transfer to ${to.name}`,   ref_type: 'transfer' })
    await addLedgerEntry(client, { branch: to.branch,   wallet_id: to.id,   wallet_name: to.name,   type: 'credit', amount, remarks: remarks || `Transfer from ${from.name}`, ref_type: 'transfer' })
    await client.query('COMMIT')
    res.json({ message: `Transferred ₹${amount} from ${from.name} to ${to.name}` })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }) }
  finally { client.release() }
})

// ── Ledger ────────────────────────────────────────────────────
router.get('/ledger', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const branch = await getBranch(req)
    const { from, to, wallet_id, type } = req.query
    let q = `
      SELECT l.*,
        COALESCE(NULLIF(l.wallet_name,''), w.name) AS wallet_name
      FROM ledger l
      LEFT JOIN wallets w ON w.id = l.wallet_id
      WHERE 1=1`
    const p = []
    if (branch) { p.push(branch); q += ` AND l.branch=$${p.length}` }
    if (from)   { p.push(from);   q += ` AND DATE(l.created_at + INTERVAL '5 hours 30 minutes')>=$${p.length}` }
    if (to)     { p.push(to);     q += ` AND DATE(l.created_at + INTERVAL '5 hours 30 minutes')<=$${p.length}` }
    if (wallet_id) { p.push(wallet_id); q += ` AND l.wallet_id=$${p.length}` }
    if (type)   { p.push(type);   q += ` AND l.type=$${p.length}` }
    q += ' ORDER BY l.created_at DESC LIMIT 200'
    const r = await pool.query(q, p)
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Cash Flow ─────────────────────────────────────────────────
router.get('/cashflow', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const branch = await getBranch(req)
    const { from = monthStart(), to = today(), employee_id } = req.query
    const p = branch ? [branch, from, to] : [from, to]
    const bf = branch ? 'AND u.branch=$1' : ''
    const ef = branch ? 'AND branch=$1'   : ''
    const o  = branch ? 1 : 0
    
    // Add employee filter if provided
    let empFilter = ''
    if (employee_id) {
      p.push(employee_id)
      empFilter = ` AND t.employee_id=$${p.length}`
    }

    const [txnR, expR, profitR, walletInflowR, walletOutflowR, platformChargeR] = await Promise.all([
      // Total amount collected from customers
      pool.query(`SELECT COALESCE(SUM(t.amount),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes') BETWEEN $${o+1} AND $${o+2} ${bf}${empFilter}`, p),
      // Expenses paid out
      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM expenses WHERE date BETWEEN $${o+1} AND $${o+2} ${ef}`, p.slice(0, branch ? 3 : 2)),
      // Net profit (customer charges - platform charges)
      pool.query(`SELECT COALESCE(SUM(t.profit),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes') BETWEEN $${o+1} AND $${o+2} ${bf}${empFilter}`, p),
      // Wallet inflow = amount + customer charges (what customer paid us)
      pool.query(`SELECT COALESCE(SUM(t.wallet_inflow),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes') BETWEEN $${o+1} AND $${o+2} ${bf}${empFilter}`, p),
      // Wallet outflow = amount + platform charges (what we paid platform)
      pool.query(`SELECT COALESCE(SUM(t.wallet_outflow),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes') BETWEEN $${o+1} AND $${o+2} ${bf}${empFilter}`, p),
      // Platform charges paid
      pool.query(`SELECT COALESCE(SUM(t.platform_charge),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes') BETWEEN $${o+1} AND $${o+2} ${bf}${empFilter}`, p),
    ])

    const txnAmount      = parseFloat(txnR.rows[0].val)
    const expenses       = parseFloat(expR.rows[0].val)
    const profit         = parseFloat(profitR.rows[0].val)
    const walletInflow   = parseFloat(walletInflowR.rows[0].val)
    const walletOutflow  = parseFloat(walletOutflowR.rows[0].val)
    const platformCharge = parseFloat(platformChargeR.rows[0].val)
    const custCharges    = profit + platformCharge  // customer_charges = profit + platform_charge
    const net            = profit - expenses

    res.json({
      inflow: {
        customerPayments: txnAmount,       // base amount from customers
        customerCharges:  custCharges,     // charges collected from customers
        walletInflow:     walletInflow,    // total cash received (amount + charges)
        total:            walletInflow,
      },
      outflow: {
        platformSettlement: txnAmount,     // base amount paid to platform
        platformCharges:    platformCharge,// platform fee paid
        walletOutflow:      walletOutflow, // total cash paid to platform
        expenses:           expenses,      // branch expenses
        total:              walletOutflow + expenses,
      },
      profit:  profit,
      net:     net,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Settlements ───────────────────────────────────────────────
router.get('/settlements', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const branch = await getBranch(req)
    const { status } = req.query
    let q = `SELECT * FROM settlements WHERE 1=1`
    const p = []
    if (branch) { p.push(branch); q += ` AND branch=$${p.length}` }
    if (status) { p.push(status); q += ` AND status=$${p.length}` }
    q += ' ORDER BY created_at DESC'
    const r = await pool.query(q, p)
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/expenses', authMiddleware, requireRole('is_admin'), async (req, res) => {
  const { category, amount, date, note } = req.body
  if (!category || !amount || !date) return res.status(400).json({ error: 'All fields required' })
  const client = await pool.connect()
  try {
    const branch = req.user.is_superadmin ? req.body.branch : await getBranch(req)
    if (!branch) return res.status(400).json({ error: 'No branch assigned' })
    const wR = await client.query(
      `SELECT id, balance FROM wallets WHERE branch=$1 AND name='Bank Account' AND is_active=TRUE LIMIT 1`, [branch])
    if (!wR.rows.length) return res.status(404).json({ error: 'Bank Account wallet not found for this branch' })
    const w = wR.rows[0]
    const amt = parseFloat(amount)
    if (parseFloat(w.balance) < amt) return res.status(400).json({ error: 'Insufficient bank balance' })
    await client.query('BEGIN')
    const newBal = parseFloat(w.balance) - amt
    await client.query('UPDATE wallets SET balance=$1 WHERE id=$2', [newBal, w.id])
    await client.query(
      `INSERT INTO ledger (branch, wallet_id, wallet_name, type, amount, balance, remarks, ref_type)
       VALUES ($1,$2,'Bank Account','debit',$3,$4,$5,'expense')`,
      [branch, w.id, amt, newBal, `Expense: ${category}${note ? ' - ' + note : ''}`]
    )
    const expR = await client.query(
      `INSERT INTO expenses (branch, category, amount, date, note) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [branch, category, amt, date, note || null]
    )
    await client.query('COMMIT')
    res.status(201).json({ expense: expR.rows[0], bank_balance: newBal })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }) }
  finally { client.release() }
})

// ── Add balance to bank / cash (ledger entry without wallet) ──
router.post('/balance/add', authMiddleware, requireRole('is_admin'), async (req, res) => {
  const { type, amount, remarks } = req.body  // type: 'bank' | 'cash'
  if (!['bank', 'cash'].includes(type)) return res.status(400).json({ error: 'type must be bank or cash' })
  if (!amount || parseFloat(amount) <= 0)  return res.status(400).json({ error: 'Valid amount required' })
  const client = await pool.connect()
  try {
    const branch = await getBranch(req)
    if (!branch) return res.status(400).json({ error: 'No branch assigned' })
    await client.query('BEGIN')
    // find or create a system wallet for this type
    let walletR = await client.query(
      `SELECT id, balance FROM wallets WHERE branch=$1 AND name=$2 LIMIT 1`,
      [branch, type === 'bank' ? 'Bank Account' : 'Cash in Hand']
    )
    if (!walletR.rows.length) {
      walletR = await client.query(
        `INSERT INTO wallets (branch, name, balance) VALUES ($1,$2,0) RETURNING id, balance`,
        [branch, type === 'bank' ? 'Bank Account' : 'Cash in Hand']
      )
    }
    const w      = walletR.rows[0]
    const newBal = parseFloat(w.balance) + parseFloat(amount)
    await client.query('UPDATE wallets SET balance=$1 WHERE id=$2', [newBal, w.id])
    await client.query(
      `INSERT INTO ledger (branch, wallet_id, wallet_name, type, amount, balance, remarks, ref_type)
       VALUES ($1,$2,$3,'credit',$4,$5,$6,$7)`,
      [branch, w.id, type === 'bank' ? 'Bank Account' : 'Cash in Hand',
       parseFloat(amount), newBal, remarks || `${type} top-up`, 'balance']
    )
    await client.query('COMMIT')
    res.json({ message: `${type} balance updated`, balance: newBal })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }) }
  finally { client.release() }
})

// ── Sync txn profit → wallet (called after transaction posted) ─
router.post('/sync-txn', authMiddleware, requireRole('is_admin'), async (req, res) => {
  const { txn_id } = req.body
  if (!txn_id) return res.status(400).json({ error: 'txn_id required' })
  const client = await pool.connect()
  try {
    const txnR = await client.query(
      `SELECT t.*, u.branch FROM transactions t JOIN users u ON t.employee_id=u.id WHERE t.id=$1`,
      [txn_id]
    )
    if (!txnR.rows.length) return res.status(404).json({ error: 'Transaction not found' })
    const txn = txnR.rows[0]
    if (!txn.branch) return res.status(400).json({ error: 'Transaction has no branch' })
    await client.query('BEGIN')
    // find or create Cash in Hand wallet for branch
    let wR = await client.query(
      `SELECT id, balance FROM wallets WHERE branch=$1 AND name='Cash in Hand' LIMIT 1`, [txn.branch])
    if (!wR.rows.length) {
      wR = await client.query(
        `INSERT INTO wallets (branch, name, balance) VALUES ($1,'Cash in Hand',0) RETURNING id, balance`,
        [txn.branch]
      )
    }
    const w      = wR.rows[0]
    const profit = parseFloat(txn.profit || 0)
    const newBal = parseFloat(w.balance) + profit
    await client.query('UPDATE wallets SET balance=$1 WHERE id=$2', [newBal, w.id])
    await client.query(
      `INSERT INTO ledger (branch, wallet_id, wallet_name, type, amount, balance, remarks, ref_type, ref_id)
       VALUES ($1,$2,'Cash in Hand','credit',$3,$4,$5,'txn',$6)`,
      [txn.branch, w.id, profit, newBal, `Profit from txn #${txn_id}`, txn_id]
    )
    await client.query('COMMIT')
    res.json({ message: 'Synced', profit, balance: newBal })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }) }
  finally { client.release() }
})

router.post('/settlements', authMiddleware, requireRole('is_admin'), async (req, res) => {
  const { platform, amount, note } = req.body
  if (!platform?.trim() || !amount) return res.status(400).json({ error: 'Platform and amount required' })
  try {
    const branch = await getBranch(req)
    if (!branch) return res.status(400).json({ error: 'No branch assigned' })
    const r = await pool.query(
      `INSERT INTO settlements (branch, platform, amount, note) VALUES ($1,$2,$3,$4) RETURNING *`,
      [branch, platform.trim(), parseFloat(amount), note || null]
    )
    res.status(201).json(r.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/settlements/:id/receive', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE settlements SET status='received', settled_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    )
    res.json(r.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Daily Closing ─────────────────────────────────────────────
router.get('/closing', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const branch = await getBranch(req)
    const r = branch
      ? await pool.query('SELECT * FROM daily_closing WHERE branch=$1 ORDER BY date DESC LIMIT 30', [branch])
      : await pool.query('SELECT * FROM daily_closing ORDER BY date DESC, branch LIMIT 60')
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/closing', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const branch = await getBranch(req)
    if (!branch) return res.status(400).json({ error: 'No branch assigned' })
    const t = today()

    const existing = await pool.query('SELECT id FROM daily_closing WHERE branch=$1 AND date=$2', [branch, t])
    if (existing.rows.length) return res.status(409).json({ error: 'Day already closed for today' })

    const prevR = await pool.query(
      'SELECT closing_balance FROM daily_closing WHERE branch=$1 ORDER BY date DESC LIMIT 1', [branch])
    const opening = parseFloat(prevR.rows[0]?.closing_balance || 0)

    const [inflowR, expR, walletR] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(t.amount),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$1 AND u.branch=$2`, [t, branch]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM expenses WHERE date=$1 AND branch=$2`, [t, branch]),
      // actual wallet total = clean closing balance
      pool.query(`SELECT COALESCE(SUM(balance),0) AS val FROM wallets WHERE branch=$1 AND is_active=TRUE`, [branch]),
    ])

    const inflow  = parseFloat(inflowR.rows[0].val)
    const outflow = parseFloat(expR.rows[0].val)
    const closing = parseFloat(walletR.rows[0].val)  // use real wallet total as closing

    const r = await pool.query(
      `INSERT INTO daily_closing (branch, date, opening_balance, total_inflow, total_outflow, closing_balance, closed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [branch, t, opening, inflow, outflow, closing, req.user.id]
    )
    res.status(201).json({ message: 'Day closed successfully', closing: r.rows[0] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Profit ────────────────────────────────────────────────────
router.get('/profit', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const branch = await getBranch(req)
    const { from, to, employee_id } = req.query
    const t = to || today()
    const ms = from || monthStart()
    const bf = branch ? 'AND u.branch=$2' : ''
    const ef = branch ? 'AND branch=$2'   : ''
    
    // Build parameters array
    const tp = branch ? [t, branch] : [t]
    const mp = branch ? [ms, branch] : [ms]
    
    // Add employee filter if provided
    let empFilter = ''
    if (employee_id) {
      tp.push(employee_id)
      mp.push(employee_id)
      empFilter = ` AND t.employee_id=$${tp.length}`
    }

    const [todayProfitR, monthProfitR, todayExpR, monthExpR] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(t.profit),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$1 ${bf}${empFilter}`, tp),
      pool.query(`SELECT COALESCE(SUM(t.profit),0) AS val FROM transactions t JOIN users u ON t.employee_id=u.id WHERE DATE(t.created_at + INTERVAL '5 hours 30 minutes')>=$1 ${bf}${empFilter}`, mp),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM expenses WHERE date=$1 ${ef}`, tp.slice(0, branch ? 2 : 1)),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM expenses WHERE date>=$1 ${ef}`, mp.slice(0, branch ? 2 : 1)),
    ])

    res.json({
      todayProfit:  parseFloat(todayProfitR.rows[0].val)  - parseFloat(todayExpR.rows[0].val),
      monthProfit:  parseFloat(monthProfitR.rows[0].val)  - parseFloat(monthExpR.rows[0].val),
      todayInflow:  parseFloat(todayProfitR.rows[0].val),
      monthInflow:  parseFloat(monthProfitR.rows[0].val),
      todayExpenses: parseFloat(todayExpR.rows[0].val),
      monthExpenses: parseFloat(monthExpR.rows[0].val),
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Alerts ────────────────────────────────────────────────────
router.get('/alerts', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const branch = await getBranch(req)
    const bf = branch ? 'WHERE branch=$1' : ''
    const p  = branch ? [branch] : []
    const alerts = []

    const [lowWallets, pendingS, highExp] = await Promise.all([
      pool.query(`SELECT name, balance, branch FROM wallets WHERE balance < 1000 AND is_active=TRUE ${bf}`, p),
      pool.query(`SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS val FROM settlements WHERE status='pending' ${bf}`, p),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS val FROM expenses WHERE date>=$1 ${branch ? 'AND branch=$2' : ''}`,
        branch ? [new Date(Date.now() - 7*86400000).toISOString().split('T')[0], branch]
               : [new Date(Date.now() - 7*86400000).toISOString().split('T')[0]]),
    ])

    lowWallets.rows.forEach(w => alerts.push({ type: 'warning', msg: `Low balance in ${w.name} (${w.branch}): ₹${parseFloat(w.balance).toLocaleString('en-IN')}` }))
    if (parseInt(pendingS.rows[0].cnt) > 0) alerts.push({ type: 'warning', msg: `${pendingS.rows[0].cnt} pending settlements worth ₹${parseFloat(pendingS.rows[0].val).toLocaleString('en-IN')}` })
    if (parseFloat(highExp.rows[0].val) > 50000) alerts.push({ type: 'danger', msg: `High expenses this week: ₹${parseFloat(highExp.rows[0].val).toLocaleString('en-IN')}` })

    res.json(alerts)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Superadmin: all wallets grouped by branch ─────────────────
router.get('/wallets/all', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    const todayDate = today()
    const ms        = monthStart()
    const r = await pool.query(`
      SELECT w.*,
        COALESCE(SUM(CASE WHEN l.type='credit' AND DATE(l.created_at + INTERVAL '5 hours 30 minutes')=$1 THEN l.amount ELSE 0 END),0) AS today_inflow,
        COALESCE(SUM(CASE WHEN l.type='debit'  AND DATE(l.created_at + INTERVAL '5 hours 30 minutes')=$1 THEN l.amount ELSE 0 END),0) AS today_outflow,
        COALESCE(SUM(CASE WHEN l.type='credit' AND l.created_at>=$2 THEN l.amount ELSE 0 END),0) AS month_inflow,
        COALESCE(SUM(CASE WHEN l.type='debit'  AND l.created_at>=$2 THEN l.amount ELSE 0 END),0) AS month_outflow
      FROM wallets w
      LEFT JOIN ledger l ON l.wallet_id = w.id
      WHERE w.is_active=TRUE
      GROUP BY w.id ORDER BY w.branch, w.wallet_type, w.name`, [todayDate, ms])
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Performance Analytics ─────────────────────────────────────
router.get('/performance', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const branch = await getBranch(req)
    const { from = monthStart(), to = today(), employee_id, service_type } = req.query
    
    let baseQuery = `
      SELECT 
        u.id as employee_id,
        u.name as employee_name,
        u.branch,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COALESCE(SUM(t.profit), 0) as total_profit,
        COALESCE(AVG(t.amount), 0) as avg_transaction_amount,
        COALESCE(AVG(t.profit), 0) as avg_profit_per_transaction
      FROM users u
      LEFT JOIN transactions t ON u.id = t.employee_id 
        AND DATE(t.created_at + INTERVAL '5 hours 30 minutes') BETWEEN $1 AND $2`
    
    const params = [from, to]
    let whereClause = ' WHERE u.is_employee = TRUE'
    
    if (branch) {
      params.push(branch)
      whereClause += ` AND u.branch = $${params.length}`
    }
    
    if (employee_id) {
      params.push(employee_id)
      whereClause += ` AND u.id = $${params.length}`
    }
    
    if (service_type) {
      params.push(service_type)
      baseQuery += ` AND t.service_type = $${params.length}`
    }
    
    baseQuery += whereClause + `
      GROUP BY u.id, u.name, u.branch
      ORDER BY total_profit DESC, transaction_count DESC`
    
    const performanceR = await pool.query(baseQuery, params)
    
    // Get branch-wise summary if superadmin
    let branchSummary = []
    if (req.user.is_superadmin) {
      const branchSummaryR = await pool.query(`
        SELECT 
          u.branch,
          COUNT(DISTINCT u.id) as employee_count,
          COUNT(t.id) as total_transactions,
          COALESCE(SUM(t.amount), 0) as total_amount,
          COALESCE(SUM(t.profit), 0) as total_profit
        FROM users u
        LEFT JOIN transactions t ON u.id = t.employee_id 
          AND DATE(t.created_at + INTERVAL '5 hours 30 minutes') BETWEEN $1 AND $2
        WHERE u.is_employee = TRUE
        GROUP BY u.branch
        ORDER BY total_profit DESC`, [from, to])
      branchSummary = branchSummaryR.rows
    }
    
    res.json({
      performance: performanceR.rows,
      branchSummary: branchSummary,
      dateRange: { from, to }
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Financial Control Dashboard ───────────────────────────────
router.get('/control', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    const branch = await getBranch(req)
    const { from = monthStart(), to = today(), category, min_amount, max_amount } = req.query
    
    // Build expense query with filters
    let expenseQuery = `
      SELECT e.*, u.name as created_by_name
      FROM expenses e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.date BETWEEN $1 AND $2`
    
    const params = [from, to]
    
    if (branch) {
      params.push(branch)
      expenseQuery += ` AND e.branch = $${params.length}`
    }
    
    if (category) {
      params.push(category)
      expenseQuery += ` AND e.category = $${params.length}`
    }
    
    if (min_amount) {
      params.push(parseFloat(min_amount))
      expenseQuery += ` AND e.amount >= $${params.length}`
    }
    
    if (max_amount) {
      params.push(parseFloat(max_amount))
      expenseQuery += ` AND e.amount <= $${params.length}`
    }
    
    expenseQuery += ' ORDER BY e.date DESC, e.amount DESC LIMIT 100'
    
    // Get expense categories summary
    let categoryQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_amount
      FROM expenses
      WHERE date BETWEEN $1 AND $2`
    
    const categoryParams = [from, to]
    if (branch) {
      categoryParams.push(branch)
      categoryQuery += ` AND branch = $${categoryParams.length}`
    }
    
    categoryQuery += ' GROUP BY category ORDER BY total_amount DESC'
    
    const [expensesR, categoriesR] = await Promise.all([
      pool.query(expenseQuery, params),
      pool.query(categoryQuery, categoryParams)
    ])
    
    res.json({
      expenses: expensesR.rows,
      categories: categoriesR.rows,
      filters: { from, to, category, min_amount, max_amount, branch }
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
