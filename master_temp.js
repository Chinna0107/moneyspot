const express                         = require('express')
const pool                            = require('../db')
const redis                           = require('../redis')
const { authMiddleware, requireRole } = require('../middleware/auth')
const { validateBranch, clearBranchCache } = require('../utils/branchValidator')
const router                          = express.Router()

const CACHE_TTL = 300

// Auto-create required tables if not exists (retry on timeout)
const initCoinTable = (attempt = 1) => {
  pool.query(`
    CREATE TABLE IF NOT EXISTS coin_transactions (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      coins      INTEGER NOT NULL,
      type       VARCHAR(10) NOT NULL CHECK (type IN ('earn','redeem')),
      remarks    TEXT,
      ref_id     INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS charges_card_withdrawal (
      id            SERIAL PRIMARY KEY,
      branch        VARCHAR(255) NOT NULL,
      platform      VARCHAR(255) NOT NULL,
      card_type     VARCHAR(255) NOT NULL DEFAULT '',
      customer_rate NUMERIC(5,2) DEFAULT 0,
      platform_rate NUMERIC(5,2) DEFAULT 0,
      is_active     BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMP DEFAULT NOW(),
      UNIQUE(branch, platform, card_type)
    );
    CREATE TABLE IF NOT EXISTS charges_bill_withdrawal (
      id            SERIAL PRIMARY KEY,
      branch        VARCHAR(255) NOT NULL,
      platform      VARCHAR(255) NOT NULL,
      card_type     VARCHAR(255) NOT NULL DEFAULT '',
      customer_rate NUMERIC(5,2) DEFAULT 0,
      platform_rate NUMERIC(5,2) DEFAULT 0,
      is_active     BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMP DEFAULT NOW(),
      UNIQUE(branch, platform, card_type)
    );
    CREATE TABLE IF NOT EXISTS charges_dmt (
      id            SERIAL PRIMARY KEY,
      branch        VARCHAR(255) NOT NULL,
      platform      VARCHAR(255) NOT NULL,
      customer_rate NUMERIC(5,2) DEFAULT 0,
      platform_rate NUMERIC(5,2) DEFAULT 0,
      is_active     BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMP DEFAULT NOW(),
      UNIQUE(branch, platform)
    );
    CREATE TABLE IF NOT EXISTS charges_aeps (
      id            SERIAL PRIMARY KEY,
      branch        VARCHAR(255) NOT NULL,
      platform      VARCHAR(255) NOT NULL,
      customer_rate NUMERIC(5,2) DEFAULT 0,
      platform_rate NUMERIC(5,2) DEFAULT 0,
      is_active     BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMP DEFAULT NOW(),
      UNIQUE(branch, platform)
    );
    CREATE TABLE IF NOT EXISTS charges_only_bill (
      id            SERIAL PRIMARY KEY,
      branch        VARCHAR(255) NOT NULL,
      platform      VARCHAR(255) NOT NULL,
      customer_rate NUMERIC(5,2) DEFAULT 0,
      platform_rate NUMERIC(5,2) DEFAULT 0,
      is_active     BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMP DEFAULT NOW(),
      UNIQUE(branch, platform)
    );
  `).catch(err => {
    if (attempt < 4) setTimeout(() => initCoinTable(attempt + 1), attempt * 2000)
    else console.error('coin_transactions table init error:', err.message)
  })
}
setTimeout(initCoinTable, 3000)

const initRedeemRequestsTable = (attempt = 1) => {
  pool.query(`
    CREATE TABLE IF NOT EXISTS coin_redeem_requests (
      id              SERIAL PRIMARY KEY,
      customer_id     INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      coins           INTEGER NOT NULL,
      current_balance INTEGER NOT NULL DEFAULT 0,
      branch          VARCHAR(255),
      status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      actioned_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMP DEFAULT NOW(),
      actioned_at     TIMESTAMP
    );
  `).catch(err => {
    if (attempt < 4) setTimeout(() => initRedeemRequestsTable(attempt + 1), attempt * 2000)
    else console.error('coin_redeem_requests table init error:', err.message)
  })
}
setTimeout(initRedeemRequestsTable, 4000)

const cached = async (key, ttl, fn) => {
  const hit = await redis.get(key)
  if (hit) return JSON.parse(hit)
  const data = await fn()
  await redis.setex(key, ttl, JSON.stringify(data))
  return data
}

const bust = (...keys) => Promise.all(keys.map(k => redis.del(k)))

function masterRouter(table, cacheKey, cols = []) {
  router.get(`/${table}`, authMiddleware, async (req, res) => {
    try {
      const data = await cached(cacheKey, CACHE_TTL, async () => {
        const r = await pool.query(`SELECT * FROM ${table} ORDER BY name ASC`)
        return r.rows
      })
      res.json(data)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post(`/${table}`, authMiddleware, requireRole('is_superadmin'), async (req, res) => {
    const { name, ...rest } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
    try {
      const colNames     = ['name', ...cols]
      const colVals      = [name.trim(), ...cols.map(c => rest[c] ?? 0)]
      const placeholders = colNames.map((_, i) => `$${i + 1}`).join(',')
      const r = await pool.query(
        `INSERT INTO ${table} (${colNames.join(',')}) VALUES (${placeholders}) RETURNING *`,
        colVals
      )
      await bust(cacheKey, 'master:all')
      if (table === 'branches') clearBranchCache()
      res.status(201).json(r.rows[0])
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Already exists' })
      res.status(500).json({ error: err.message })
    }
  })

  router.patch(`/${table}/:id/toggle`, authMiddleware, requireRole('is_superadmin'), async (req, res) => {
    try {
      const r = await pool.query(
        `UPDATE ${table} SET is_active = NOT is_active WHERE id=$1 RETURNING *`,
        [req.params.id]
      )
      await bust(cacheKey, 'master:all')
      if (table === 'branches') clearBranchCache()
      res.json(r.rows[0])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete(`/${table}/:id`, authMiddleware, requireRole('is_superadmin'), async (req, res) => {
    try {
      await pool.query(`DELETE FROM ${table} WHERE id=$1`, [req.params.id])
      await bust(cacheKey, 'master:all')
      res.json({ message: 'Deleted' })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })
}

masterRouter('platforms',      'master:platforms',      [])
masterRouter('banks',          'master:banks',          [])
masterRouter('cards',          'master:cards',          [])
masterRouter('categories',     'master:categories',     [])
masterRouter('service_types',  'master:service_types',  [])
masterRouter('payment_modes',  'master:payment_modes',  [])
masterRouter('receive_modes',  'master:receive_modes',  [])
masterRouter('branches',       'master:branches',       [])

// ── Per-service charge table map ─────────────────────────────
const SERVICE_TABLE = {
  'Card Withdrawal':       { table: 'charges_card_withdrawal', hasCard: true  },
  'Bill Pay + Withdrawal': { table: 'charges_bill_withdrawal', hasCard: true  },
  'Money Transfer (DMT)':  { table: 'charges_dmt',             hasCard: false },
  'AEPS':                  { table: 'charges_aeps',            hasCard: false },
  'Only Bill Payment':     { table: 'charges_only_bill',       hasCard: false },
}

// ── GET all charges grouped by service (admin panel) ────────────
router.get('/charges-all', authMiddleware, requireRole('is_admin'), async (req, res) => {
  try {
    let branch = null
    if (!req.user.is_superadmin) {
      const br = await pool.query('SELECT branch FROM users WHERE id=$1', [req.user.id])
      branch = br.rows[0]?.branch || null
    }
    const f = branch ? 'WHERE branch=$1' : ''
    const p = branch ? [branch] : []
    const [cw, bw, dmt, aeps, ob] = await Promise.all([
      pool.query(`SELECT id,branch,platform,card_type,customer_rate,platform_rate,is_active FROM charges_card_withdrawal ${f} ORDER BY platform,card_type`, p),
      pool.query(`SELECT id,branch,platform,card_type,customer_rate,platform_rate,is_active FROM charges_bill_withdrawal ${f} ORDER BY platform,card_type`, p),
      pool.query(`SELECT id,branch,platform,customer_rate,platform_rate,is_active FROM charges_dmt ${f} ORDER BY platform`, p),
      pool.query(`SELECT id,branch,platform,customer_rate,platform_rate,is_active FROM charges_aeps ${f} ORDER BY platform`, p),
      pool.query(`SELECT id,branch,platform,customer_rate,platform_rate,is_active FROM charges_only_bill ${f} ORDER BY platform`, p),
    ])
    res.json({
      'Card Withdrawal':       cw.rows,
      'Bill Pay + Withdrawal': bw.rows,
      'Money Transfer (DMT)':  dmt.rows,
      'AEPS':                  aeps.rows,
      'Only Bill Payment':     ob.rows,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})


router.get('/charges', authMiddleware, async (req, res) => {
  try {
    const { service_type } = req.query
    const svc = SERVICE_TABLE[service_type]
    if (!svc) return res.json([])
    const r = await pool.query(`SELECT * FROM ${svc.table} ORDER BY branch, platform`)
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── UPSERT charge row ─────────────────────────────────────────
router.post('/charges', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  const { service_type, branch, platform, card_type, customer_rate, platform_rate } = req.body
  const svc = SERVICE_TABLE[service_type]
  if (!svc) return res.status(400).json({ error: 'Invalid service_type' })
  try {
    let r
    if (svc.hasCard) {
      r = await pool.query(
        `INSERT INTO ${svc.table} (branch, platform, card_type, customer_rate, platform_rate)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (branch, platform, card_type) DO UPDATE
         SET customer_rate=EXCLUDED.customer_rate, platform_rate=EXCLUDED.platform_rate RETURNING *`,
        [branch, platform, card_type || '', parseFloat(customer_rate) || 0, parseFloat(platform_rate) || 0]
      )
    } else {
      r = await pool.query(
        `INSERT INTO ${svc.table} (branch, platform, customer_rate, platform_rate)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (branch, platform) DO UPDATE
         SET customer_rate=EXCLUDED.customer_rate, platform_rate=EXCLUDED.platform_rate RETURNING *`,
        [branch, platform, parseFloat(customer_rate) || 0, parseFloat(platform_rate) || 0]
      )
    }
    res.status(201).json(r.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── UPDATE platform_rate across all branches (shared) ─────────
router.patch('/charges/platform-rate', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  const { service_type, platform, card_type, platform_rate } = req.body
  const svc = SERVICE_TABLE[service_type]
  if (!svc) return res.status(400).json({ error: 'Invalid service_type' })
  try {
    let r
    if (svc.hasCard) {
      r = await pool.query(
        `UPDATE ${svc.table} SET platform_rate=$1 WHERE platform=$2 AND card_type=$3`,
        [parseFloat(platform_rate) || 0, platform, card_type]
      )
    } else {
      r = await pool.query(
        `UPDATE ${svc.table} SET platform_rate=$1 WHERE platform=$2`,
        [parseFloat(platform_rate) || 0, platform]
      )
    }
    res.json({ updated: r.rowCount })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── UPDATE single row customer_rate ───────────────────────────
router.patch('/charges/:id', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  const { service_type, customer_rate, platform_rate } = req.body
  const svc = SERVICE_TABLE[service_type]
  if (!svc) return res.status(400).json({ error: 'Invalid service_type' })
  try {
    const r = await pool.query(
      `UPDATE ${svc.table} SET customer_rate=$1, platform_rate=$2 WHERE id=$3 RETURNING *`,
      [parseFloat(customer_rate) || 0, parseFloat(platform_rate) || 0, req.params.id]
    )
    res.json(r.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET charges lookup for employee ──────────────────────────
router.get('/charges/lookup', authMiddleware, async (req, res) => {
  const { service_type, platform, card_type } = req.query
  const userBranch = req.user.branch
  if (!userBranch) return res.json({ customer_rate: 0, platform_rate: 0 })
  const svc = SERVICE_TABLE[service_type]
  if (!svc || !platform) return res.json({ customer_rate: 0, platform_rate: 0 })
  try {
    let r
    if (svc.hasCard) {
      r = await pool.query(
        `SELECT customer_rate, platform_rate FROM ${svc.table}
         WHERE branch=$1 AND platform=$2 AND card_type=$3 AND is_active=TRUE`,
        [userBranch, platform, card_type || '']
      )
    } else {
      r = await pool.query(
        `SELECT customer_rate, platform_rate FROM ${svc.table}
         WHERE branch=$1 AND platform=$2 AND is_active=TRUE`,
        [userBranch, platform]
      )
    }
    if (!r.rows.length) return res.json({ customer_rate: 0, platform_rate: 0 })
    res.json(r.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET all master config in one call ────────────────────────
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const [platforms, banks, cards, categories, service_types, payment_modes, receive_modes] = await Promise.all([
      pool.query('SELECT * FROM platforms     WHERE is_active=TRUE ORDER BY name').then(r => r.rows),
      pool.query('SELECT * FROM banks         WHERE is_active=TRUE ORDER BY name').then(r => r.rows),
      pool.query('SELECT * FROM cards         WHERE is_active=TRUE ORDER BY name').then(r => r.rows),
      pool.query('SELECT * FROM categories    WHERE is_active=TRUE ORDER BY name').then(r => r.rows),
      pool.query('SELECT * FROM service_types WHERE is_active=TRUE ORDER BY name').then(r => r.rows),
      pool.query('SELECT * FROM payment_modes WHERE is_active=TRUE ORDER BY name').then(r => r.rows),
      pool.query('SELECT * FROM receive_modes WHERE is_active=TRUE ORDER BY name').then(r => r.rows),
    ])
    res.json({ platforms, banks, cards, categories, service_types, payment_modes, receive_modes })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST transaction ──────────────────────────────────────────
router.post('/transactions', authMiddleware, requireRole('is_employee'), async (req, res) => {
  const {
    customer_id, platform, bank, card, category, service_type, amount, note,
    cust_name, cust_pan, cust_aadhar, cust_mobile,
    card_bank, card_last4, payment_mode, charges_pct, charges_amount, settled_amount,
    bill_platform, bill_amount, bill_remaining, total_collected, received_mode, acc_no, bill_due_date
  } = req.body

  if (!service_type || !amount || isNaN(amount) || Number(amount) <= 0)
    return res.status(400).json({ error: 'Service type and valid amount are required' })
  if (!cust_name?.trim()) return res.status(400).json({ error: 'Customer name is required' })
  if (!cust_pan?.trim())  return res.status(400).json({ error: 'Customer PAN is required' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const branch = req.user.branch || 'Kadapa Main'
    let commission_pct = 0, charge_pct = 0

    const svc = SERVICE_TABLE[service_type]
    if (svc) {
      const cq = svc.hasCard
        ? await client.query(
            `SELECT customer_rate, platform_rate FROM ${svc.table}
             WHERE branch=$1 AND platform=$2 AND card_type=$3 AND is_active=TRUE`,
            [branch, platform || '', card || ''])
        : await client.query(
            `SELECT customer_rate, platform_rate FROM ${svc.table}
             WHERE branch=$1 AND platform=$2 AND is_active=TRUE`,
            [branch, platform || ''])
      if (cq.rows.length > 0) {
        commission_pct = parseFloat(cq.rows[0].customer_rate || 0)
        charge_pct     = parseFloat(cq.rows[0].platform_rate || 0)
      }
    }

    const amt = parseFloat(amount)

    // ── Money flow calculation ──────────────────────────────
    // customer_rate = what we charge the customer (commission)
    // platform_rate = what the platform charges us
    //
    // Example: amt=10000, customer_rate=2%, platform_rate=1.4%
    //   customer_charges = 10000 * 2%   = 200  (we collect from customer)
    //   platform_charge  = 10000 * 1.4% = 140  (we pay to platform)
    //   profit           = 200 - 140    = 60
    //
    // Wallet inflow  = amt + customer_charges  (cash received from customer)
    //                = 10000 + 200 = 10200
    // Wallet outflow = amt + platform_charge   (cash paid to platform)
    //                = 10000 + 140 = 10140
    // Net in wallet  = inflow - outflow = 60 (= profit)
    // ────────────────────────────────────────────────────────

    const customer_charges = parseFloat((amt * commission_pct / 100).toFixed(2))
    const platform_charge  = parseFloat((amt * charge_pct     / 100).toFixed(2))
    const profit           = parseFloat((customer_charges - platform_charge).toFixed(2))
    const wallet_inflow    = parseFloat((amt + customer_charges).toFixed(2))  // cash in from customer
    const wallet_outflow   = parseFloat((amt + platform_charge).toFixed(2))   // cash out to platform

    // ── Insert transaction ──────────────────────────────────
    const r = await client.query(
      `INSERT INTO transactions
         (employee_id, customer_id, platform, bank, card, category, service_type, amount,
          commission_pct, charge_pct, profit, note, cust_name, cust_pan, cust_aadhar, cust_mobile,
          card_bank, card_last4, payment_mode, charges_pct, charges_amount, settled_amount,
          bill_platform, bill_amount, bill_remaining, total_collected, received_mode, acc_no,
          wallet_inflow, wallet_outflow, platform_charge, bill_due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
       RETURNING *`,
      [req.user.id, customer_id || null, platform || null, bank || null, card || null,
       category || null, service_type, amt, commission_pct, charge_pct, profit, note || null,
       cust_name.trim(), cust_pan.trim().toUpperCase(), cust_aadhar || null, cust_mobile || null,
       card_bank || null, card_last4 || null, payment_mode || null,
       commission_pct, customer_charges,
       service_type === 'Bill Pay + Withdrawal'
         ? (parseFloat(total_collected) || 0)
         : parseFloat((amt - customer_charges).toFixed(2)),
       bill_platform || null, parseFloat(bill_amount) || 0, parseFloat(bill_remaining) || 0,
       parseFloat(total_collected) || 0, received_mode || null, acc_no || null,
       wallet_inflow, wallet_outflow, platform_charge, bill_due_date || null]
    )
    const txn = r.rows[0]

    // ── Wallet helper: get or create wallet by name ─────────
    // Cache wallets within this transaction so same wallet reuses updated in-memory balance
    const walletCache = {}
    const getOrCreateWallet = async (name) => {
      if (!name) return null
      const key = name.toLowerCase().replace(/\s+/g, '')
      if (walletCache[key]) return walletCache[key]
      let wR = await client.query(
        `SELECT id, name, balance FROM wallets WHERE branch=$1 AND LOWER(REPLACE(name,' ',''))=LOWER(REPLACE($2,' ','')) AND is_active=TRUE LIMIT 1`,
        [branch, name]
      )
      if (!wR.rows.length) {
        wR = await client.query(
          `INSERT INTO wallets (branch, name, balance) VALUES ($1,$2,0) RETURNING id, name, balance`,
          [branch, name]
        )
      }
      walletCache[key] = wR.rows[0]
      return walletCache[key]
    }

    const ledgerEntry = async (wallet, type, amount, remarks) => {
      if (!wallet || amount <= 0) return
      const prev   = parseFloat(wallet.balance)
      const newBal = parseFloat((type === 'credit' ? prev + amount : prev - amount).toFixed(2))
      await client.query('UPDATE wallets SET balance=$1 WHERE id=$2', [newBal, wallet.id])
      wallet.balance = newBal
      await client.query(
        `INSERT INTO ledger (branch, wallet_id, wallet_name, type, amount, balance, remarks, ref_type, ref_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'txn',$8)`,
        [branch, wallet.id, wallet.name, type, amount, newBal, remarks, txn.id]
      )
    }

    // ── Wallet resolution helpers ────────────────────────────
    const BANK_MODES     = ['bank', 'upi', 'neft', 'imps', 'rtgs', 'cheque', 'netbanking', 'bankaccount']
    const isBankMode     = (m) => m && BANK_MODES.some(b => m.toLowerCase().replace(/\s+/g,'') === b)
    const isCashMode     = (m) => m && m.toLowerCase().trim() === 'cash'
    const isSamePlatform = (m, p) => m && p && m.toLowerCase().replace(/\s+/g,'') === p.toLowerCase().replace(/\s+/g,'')
    // Platforms that are actually bank-backed (map to Bank Account wallet)
    // Must be exact normalized matches to avoid false positives (e.g. 'Bankit' != 'bank')
    const BANK_PLATFORMS = ['phonepay', 'phonepe', 'gpay', 'googlepay', 'sbinetbanking']
    const isBankPlatform = (name) => name && BANK_PLATFORMS.includes(name.toLowerCase().replace(/\s+/g,''))

    // Resolve a platform/mode name to the correct wallet:
    //   - 'Cash' / 'cash'           → Cash in Hand
    //   - bank-type modes            → Bank Account
    //   - bank-backed platform names → Bank Account
    //   - anything else              → platform wallet by name
    const resolveWallet = async (name) => {
      if (!name) return null
      if (isCashMode(name))                    return getOrCreateWallet('Cash in Hand')
      if (isBankMode(name) || isBankPlatform(name)) return getOrCreateWallet('Bank Account')
      return getOrCreateWallet(name)
    }

    const svcType    = service_type
    const isBillWd   = svcType === 'Bill Pay + Withdrawal'
    const isCardWd   = svcType === 'Card Withdrawal'
    const isDMT      = svcType === 'Money Transfer (DMT)'
    const isAEPS     = svcType === 'AEPS'
    const isOnlyBill = svcType === 'Only Bill Payment'

    const amt_f        = parseFloat(amount)
    const settled_f    = parseFloat(settled_amount) || parseFloat((amt_f - customer_charges).toFixed(2))
    const bill_amt_f   = parseFloat(bill_amount) || 0
    const total_coll_f = parseFloat(total_collected) || 0

    // ── CARD WITHDRAWAL / AEPS ──────────────────────────────
    // platform wallet = where the txn amount lives (Finkeda, NTAR, etc.)
    // payment_mode   = how the customer received their money
    //
    // Same Platform : customer got money via same platform a/c trf
    //   → platform already holds the money, just credit our commission
    // Cash          : we paid cash out of Cash in Hand
    //   → Cash debit settled_f, Platform credit (settled_f + profit)
    // Another platform (N1PAY) : we paid from N1PAY wallet
    //   → N1PAY debit settled_f, Platform credit (settled_f + profit)
    // Bank/UPI/NEFT : we paid via bank transfer
    //   → Bank debit settled_f, Platform credit (settled_f + profit)
    if (isCardWd || isAEPS) {
      const platWallet = await getOrCreateWallet(platform)
      const mode       = payment_mode || ''

      if (isSamePlatform(mode, platform)) {
        // Customer received via same platform — platform already has the money
        // Only book our commission profit
        if (platWallet) await ledgerEntry(platWallet, 'credit', profit,
          `Txn #${txn.id} — ${svcType} — Commission ₹${profit} (Same Platform A/c Trf)`)

      } else {
        // We paid out from somewhere — debit source, credit platform
        const sourceWallet = await resolveWallet(mode)
        if (sourceWallet) await ledgerEntry(sourceWallet, 'debit', settled_f,
          `Txn #${txn.id} — ${svcType} — Paid ₹${settled_f} via ${mode}`)
        if (platWallet) await ledgerEntry(platWallet, 'credit', parseFloat((settled_f + profit).toFixed(2)),
          `Txn #${txn.id} — ${svcType} — Settled ₹${settled_f} + Commission ₹${profit}`)
      }
    }

    // ── BILL PAY + WITHDRAWAL ───────────────────────────────
    // bill_platform   = platform used to pay the bill
    // bill_amount     = amount paid for the bill
    // platform        = withdrawal platform (Finkeda, N1PAY, etc.)
    // received_mode   = how customer received withdrawal money
    // total_collected = charges collected from customer (no deductions)
    // Flow:
    // 1. bill_platform  DEBIT  bill_amount
    // 2. withdrawal_platform CREDIT (wd_amount - platform_charge)  ← fee absorbed at swipe
    // 3. receive_mode   CREDIT total_collected  (as-is, no deductions)
    if (isBillWd) {
      const platWallet = await getOrCreateWallet(platform)
      const mode       = received_mode || ''
      const wd_amt     = parseFloat(amount) || 0
      const total_coll = parseFloat(total_collected) || 0

      // Step 1: bill_platform DEBIT bill_amount
      if (bill_platform && bill_amt_f > 0) {
        const billWallet = await resolveWallet(bill_platform)
        if (billWallet) await ledgerEntry(billWallet, 'debit', bill_amt_f,
          `Txn #${txn.id} — Bill Payment via ${bill_platform} ₹${bill_amt_f}`)
      }

      // Step 2: withdrawal_platform CREDIT (wd_amt - platform_charge)
      // Platform fee is absorbed by the withdrawal platform at the time of swipe
      const net_wd = parseFloat((wd_amt - platform_charge).toFixed(2))
      if (platWallet) await ledgerEntry(platWallet, 'credit', net_wd,
        `Txn #${txn.id} — Bill+Withdrawal — Card swipe ₹${wd_amt} - platform fee ₹${platform_charge} = ₹${net_wd} into ${platform}`)

      // Step 3: receive_mode CREDIT total_collected (charges collected from customer, no deductions)
      const collectWallet = await resolveWallet(mode)
      const sameAsPlat    = collectWallet && platWallet && collectWallet.id === platWallet.id
      if (collectWallet && total_coll > 0 && !sameAsPlat)
        await ledgerEntry(collectWallet, 'credit', total_coll,
          `Txn #${txn.id} — Bill+Withdrawal — Collected ₹${total_coll} via ${mode}`)
    }

    // ── DMT / ONLY BILL ─────────────────────────────────────
    // platform     = platform used to send money (N1PAY, Phonepay/Bank, etc.)
    // payment_mode = how customer paid us (Cash, Bank, UPI)
    //
    // Platform wallet debited: settled_f + platform_charge (we send money out)
    // Customer payment credited: settled_f to received wallet
    if (isDMT || isOnlyBill) {
      const platWallet = await resolveWallet(platform)  // may resolve to Bank Account
      const mode       = payment_mode || ''
      const platDebit  = parseFloat((settled_f + platform_charge).toFixed(2))

      if (platWallet) await ledgerEntry(platWallet, 'debit', platDebit,
        `Txn #${txn.id} — ${svcType} — Sent ₹${settled_f} + Platform fees ₹${platform_charge}`)

      // Credit where customer paid us from
      const sourceWallet = await resolveWallet(mode)
      if (sourceWallet) await ledgerEntry(sourceWallet, 'credit', settled_f,
        `Txn #${txn.id} — ${svcType} — Received ₹${settled_f} from customer via ${mode}`)
    }

    // ── Award coins for this transaction ───────────────────
    const coinsEarned = service_type === 'Bill Pay + Withdrawal' ? 40 : 20
    await client.query('UPDATE users SET coins = coins + $1 WHERE id=$2', [coinsEarned, req.user.id])
    await client.query(
      `INSERT INTO coin_transactions (user_id, coins, type, remarks, ref_id)
       VALUES ($1,$2,'earn',$3,$4)`,
      [req.user.id, coinsEarned, `${service_type} — txn #${txn.id}`, txn.id]
    ).catch(() => {})

    // ── Award coins to customer (50,000 = 500 coins, i.e. 1% of amount) ──
    if (customer_id) {
      const customerCoins = Math.floor((parseFloat(amount) || 0) / 100)  // ₹50,000 → 500 coins
      if (customerCoins > 0) {
        await client.query(
          'UPDATE customers SET coins = coins + $1 WHERE id=$2',
          [customerCoins, customer_id]
        ).catch(() => {})
      }
    }

    await client.query('COMMIT')
    await redis.del(`txns:mine:${req.user.id}`)
    res.status(201).json({ message: 'Transaction recorded', transaction: txn, coinsEarned })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally { client.release() }
})

// ── GET transactions ──────────────────────────────────────────
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const { date, employee_id, customer_id } = req.query
    let query = `
      SELECT t.*, u.name AS employee_name, u.branch
      FROM transactions t LEFT JOIN users u ON t.employee_id = u.id
      WHERE 1=1`
    const params = []

    if (customer_id) {
      // match by customer_id OR cust_pan to include manual-entry transactions
      const cust = await pool.query('SELECT pan FROM customers WHERE id=$1', [customer_id])
      const pan  = cust.rows[0]?.pan
      if (pan) {
        params.push(customer_id, pan)
        query += ` AND (t.customer_id=$${params.length - 1} OR t.cust_pan=$${params.length})`
      } else {
        params.push(customer_id)
        query += ` AND t.customer_id=$${params.length}`
      }
    } else if (req.user.is_employee && !req.user.is_admin && !req.user.is_superadmin) {
      params.push(req.user.id)
      query += ` AND t.employee_id=$${params.length}`
    } else {
      if (date)        { params.push(date);        query += ` AND DATE(t.created_at + INTERVAL '5 hours 30 minutes')=$${params.length}` }
      if (employee_id) { params.push(employee_id); query += ` AND t.employee_id=$${params.length}` }
    }

    query += ' ORDER BY t.created_at DESC LIMIT 500'
    const r = await pool.query(query, params)
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET my transactions (employee) ───────────────────────────
router.get('/transactions/mine', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const key    = `txns:mine:${req.user.id}`
    const cached = await redis.get(key)
    if (cached) return res.json(JSON.parse(cached))
    const r = await pool.query(
      `SELECT * FROM transactions WHERE employee_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    )
    await redis.setex(key, 60, JSON.stringify(r.rows))
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── PATCH transaction (employee) — form data only, no identity fields ────
router.patch('/transactions/:id', authMiddleware, requireRole('is_employee'), async (req, res) => {
  const {
    note, platform, bank, card, card_bank, card_last4,
    payment_mode, received_mode, amount, charges_pct,
    charges_amount, settled_amount, bill_platform,
    bill_amount, bill_remaining, total_collected, acc_no
  } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let txnR;
    if (req.user.is_superadmin || req.user.is_admin) {
      txnR = await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE', [req.params.id])
    } else {
      txnR = await client.query('SELECT * FROM transactions WHERE id=$1 AND employee_id=$2 FOR UPDATE', [req.params.id, req.user.id])
    }
    if (!txnR.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Transaction not found or not yours' })
    }
    const oldTxn = txnR.rows[0]
    const branch = req.user.branch || 'Kadapa Main'

    // 1. Reverse existing ledger entries
    const oldLedgers = await client.query(`SELECT * FROM ledger WHERE ref_type='txn' AND ref_id=$1`, [oldTxn.id])
    for (let l of oldLedgers.rows) {
      const revType = l.type === 'credit' ? 'debit' : 'credit'
      const wR = await client.query(`SELECT balance FROM wallets WHERE id=$1 FOR UPDATE`, [l.wallet_id])
      if (wR.rows.length) {
        const prev = parseFloat(wR.rows[0].balance)
        const amt_l = parseFloat(l.amount)
        const newBal = parseFloat((revType === 'credit' ? prev + amt_l : prev - amt_l).toFixed(2))
        await client.query(`UPDATE wallets SET balance=$1 WHERE id=$2`, [newBal, l.wallet_id])
        await client.query(`
          INSERT INTO ledger (branch, wallet_id, wallet_name, type, amount, balance, remarks, ref_type, ref_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,'txn',$8)
        `, [branch, l.wallet_id, l.wallet_name, revType, amt_l, newBal, `Reversal of Txn #${oldTxn.id} due to edit`, oldTxn.id])
      }
    }

    // 2. Recalculate money flow
    const amt = parseFloat(amount) || 0
    const charge_pct = parseFloat(oldTxn.charge_pct) || 0
    const customer_charges = parseFloat(charges_amount) || 0
    const platform_charge = parseFloat((amt * charge_pct / 100).toFixed(2))
    const profit = parseFloat((customer_charges - platform_charge).toFixed(2))
    const wallet_inflow = parseFloat((amt + customer_charges).toFixed(2))
    const wallet_outflow = parseFloat((amt + platform_charge).toFixed(2))

    // 3. Update transaction
    const r = await client.query(
      `UPDATE transactions SET
        note=$1, platform=$2, bank=$3, card=$4, card_bank=$5, card_last4=$6,
        payment_mode=$7, received_mode=$8, amount=$9, charges_pct=$10,
        charges_amount=$11, settled_amount=$12, bill_platform=$13,
        bill_amount=$14, bill_remaining=$15, total_collected=$16, acc_no=$17,
        profit=$18, wallet_inflow=$19, wallet_outflow=$20, platform_charge=$21,
        is_edited=TRUE, edited_at=NOW(), edited_by=$23
       WHERE id=$22 RETURNING *`,
      [
        note || null, platform || null, bank || null, card || null, card_bank || null, card_last4 || null,
        payment_mode || null, received_mode || null, amt, parseFloat(charges_pct) || 0,
        customer_charges, parseFloat(settled_amount) || 0, bill_platform || null,
        parseFloat(bill_amount) || 0, parseFloat(bill_remaining) || 0, parseFloat(total_collected) || 0, acc_no || null,
        profit, wallet_inflow, wallet_outflow, platform_charge,
        oldTxn.id, req.user.id
      ]
    )
    const txn = r.rows[0]

    // 4. Re-apply wallet logic
    const walletCache = {}
    const getOrCreateWallet = async (name) => {
      if (!name) return null
      const key = name.toLowerCase().replace(/\s+/g, '')
      if (walletCache[key]) return walletCache[key]
      let wR = await client.query(
        `SELECT id, name, balance FROM wallets WHERE branch=$1 AND LOWER(REPLACE(name,' ',''))=LOWER(REPLACE($2,' ','')) AND is_active=TRUE LIMIT 1`,
        [branch, name]
      )
      if (!wR.rows.length) {
        wR = await client.query(
          `INSERT INTO wallets (branch, name, balance) VALUES ($1,$2,0) RETURNING id, name, balance`,
          [branch, name]
        )
      }
      walletCache[key] = wR.rows[0]
      return walletCache[key]
    }

    const ledgerEntry = async (wallet, type, amt_l, remarks) => {
      if (!wallet || amt_l <= 0) return
      const prev   = parseFloat(wallet.balance)
      const newBal = parseFloat((type === 'credit' ? prev + amt_l : prev - amt_l).toFixed(2))
      await client.query('UPDATE wallets SET balance=$1 WHERE id=$2', [newBal, wallet.id])
      wallet.balance = newBal
      await client.query(
        `INSERT INTO ledger (branch, wallet_id, wallet_name, type, amount, balance, remarks, ref_type, ref_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'txn',$8)`,
        [branch, wallet.id, wallet.name, type, amt_l, newBal, remarks, txn.id]
      )
    }

    const BANK_MODES     = ['bank', 'upi', 'neft', 'imps', 'rtgs', 'cheque', 'netbanking', 'bankaccount']
    const isBankMode     = (m) => m && BANK_MODES.some(b => m.toLowerCase().replace(/\s+/g,'') === b)
    const isCashMode     = (m) => m && m.toLowerCase().trim() === 'cash'
    const isSamePlatform = (m, p) => m && p && m.toLowerCase().replace(/\s+/g,'') === p.toLowerCase().replace(/\s+/g,'')
    const BANK_PLATFORMS = ['phonepay', 'phonepe', 'gpay', 'googlepay', 'sbinetbanking']
    const isBankPlatform = (name) => name && BANK_PLATFORMS.includes(name.toLowerCase().replace(/\s+/g,''))

    const resolveWallet = async (name) => {
      if (!name) return null
      if (isCashMode(name))                    return getOrCreateWallet('Cash in Hand')
      if (isBankMode(name) || isBankPlatform(name)) return getOrCreateWallet('Bank Account')
      return getOrCreateWallet(name)
    }

    const svcType    = txn.service_type
    const isBillWd   = svcType === 'Bill Pay + Withdrawal'
    const isCardWd   = svcType === 'Card Withdrawal'
    const isDMT      = svcType === 'Money Transfer (DMT)'
    const isAEPS     = svcType === 'AEPS'
    const isOnlyBill = svcType === 'Only Bill Payment'

    const settled_f    = parseFloat(txn.settled_amount) || parseFloat((amt - customer_charges).toFixed(2))
    const bill_amt_f   = parseFloat(txn.bill_amount) || 0
    const total_coll_f = parseFloat(txn.total_collected) || 0

    if (isCardWd || isAEPS) {
      const platWallet = await getOrCreateWallet(txn.platform)
      const mode       = txn.payment_mode || ''
      if (isSamePlatform(mode, txn.platform)) {
        if (platWallet) await ledgerEntry(platWallet, 'credit', profit, `Txn #${txn.id} (Edited) — ${svcType} — Commission ₹${profit} (Same Platform)`)
      } else {
        const sourceWallet = await resolveWallet(mode)
        if (sourceWallet) await ledgerEntry(sourceWallet, 'debit', settled_f, `Txn #${txn.id} (Edited) — ${svcType} — Paid ₹${settled_f} via ${mode}`)
        if (platWallet) await ledgerEntry(platWallet, 'credit', parseFloat((settled_f + profit).toFixed(2)), `Txn #${txn.id} (Edited) — ${svcType} — Settled ₹${settled_f} + Comm ₹${profit}`)
      }
    }

    if (isBillWd) {
      const platWallet = await getOrCreateWallet(txn.platform)
      const mode       = txn.received_mode || ''
      if (txn.bill_platform && bill_amt_f > 0) {
        const billWallet = await resolveWallet(txn.bill_platform)
        if (billWallet) await ledgerEntry(billWallet, 'debit', bill_amt_f, `Txn #${txn.id} (Edited) — Bill via ${txn.bill_platform} ₹${bill_amt_f}`)
      }
      const net_wd = parseFloat((amt - platform_charge).toFixed(2))
      if (platWallet) await ledgerEntry(platWallet, 'credit', net_wd, `Txn #${txn.id} (Edited) — Swipe ₹${amt} - fee ₹${platform_charge} = ₹${net_wd} to ${txn.platform}`)
      const collectWallet = await resolveWallet(mode)
      const sameAsPlat    = collectWallet && platWallet && collectWallet.id === platWallet.id
      if (collectWallet && total_coll_f > 0 && !sameAsPlat)
        await ledgerEntry(collectWallet, 'credit', total_coll_f, `Txn #${txn.id} (Edited) — Collected ₹${total_coll_f} via ${mode}`)
    }

    if (isDMT || isOnlyBill) {
      const platWallet = await resolveWallet(txn.platform)
      const mode       = txn.payment_mode || ''
      const platDebit  = parseFloat((settled_f + platform_charge).toFixed(2))
      if (platWallet) await ledgerEntry(platWallet, 'debit', platDebit, `Txn #${txn.id} (Edited) — ${svcType} — Sent ₹${settled_f} + Fee ₹${platform_charge}`)
      const sourceWallet = await resolveWallet(mode)
      if (sourceWallet) await ledgerEntry(sourceWallet, 'credit', settled_f, `Txn #${txn.id} (Edited) — ${svcType} — Received ₹${settled_f} via ${mode}`)
    }

    await client.query('COMMIT')
    await redis.del(`txns:mine:${oldTxn.employee_id}`)
    res.json(txn)
  } catch (err) { 
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ── GET my coins history ─────────────────────────────────────
router.get('/coins/history', authMiddleware, requireRole('is_employee'), async (req, res) => {
  try {
    const balR = await pool.query('SELECT coins FROM users WHERE id=$1', [req.user.id])
    const balance = parseInt(balR.rows[0]?.coins || 0)
    let history = []
    try {
      const r = await pool.query(
        `SELECT * FROM coin_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
        [req.user.id]
      )
      history = r.rows
    } catch (_) { /* table may not exist yet */ }
    res.json({ balance, history })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Redeem coins ──────────────────────────────────────────────
// 10 coins = ₹1  (1 coin = ₹0.10 / 10 paise)
const COINS_PER_RUPEE = 10

router.post('/coins/redeem', authMiddleware, requireRole('is_employee'), async (req, res) => {
  const { coins } = req.body
  const amount = parseInt(coins)
  if (!amount || amount <= 0)   return res.status(400).json({ error: 'Enter valid coins to redeem' })
  if (amount % COINS_PER_RUPEE !== 0)
    return res.status(400).json({ error: `Coins must be in multiples of ${COINS_PER_RUPEE} (1 coin = ₹0.10)` })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userR = await client.query('SELECT coins FROM users WHERE id=$1 FOR UPDATE', [req.user.id])
    const balance = parseInt(userR.rows[0]?.coins || 0)
    if (balance < amount)
      return res.status(400).json({ error: `Insufficient coins. You have ${balance} coins.` })

    const rupees = amount / COINS_PER_RUPEE
    await client.query('UPDATE users SET coins = coins - $1 WHERE id=$2', [amount, req.user.id])
    await client.query(
      `INSERT INTO coin_transactions (user_id, coins, type, remarks)
       VALUES ($1,$2,'redeem',$3)`,
      [req.user.id, amount, `Redeemed ${amount} coins = ₹${rupees}`]
    )
    await client.query('COMMIT')
    res.json({ message: `Redeemed ${amount} coins for ₹${rupees}`, rupees, remaining: balance - amount })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }) }
  finally { client.release() }
})

// ── Superadmin: list redeem requests ────────────────────────
router.get('/redeem-requests', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rr.*, c.name AS customer_name, c.pan AS customer_pan, c.phone AS customer_phone,
             u.name AS actioned_by_name
      FROM coin_redeem_requests rr
      LEFT JOIN customers c ON rr.customer_id = c.id
      LEFT JOIN users u ON rr.actioned_by = u.id
      ORDER BY rr.created_at DESC
    `)
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Superadmin: approve / reject redeem request ──────────────
router.patch('/redeem-requests/:id/:action', authMiddleware, requireRole('is_superadmin'), async (req, res) => {
  const { id, action } = req.params
  if (!['approve', 'reject'].includes(action))
    return res.status(400).json({ error: 'Invalid action' })
  const status = action === 'approve' ? 'approved' : 'rejected'
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const rr = await client.query(
      `UPDATE coin_redeem_requests SET status=$1, actioned_by=$2, actioned_at=NOW()
       WHERE id=$3 AND status='pending' RETURNING *`,
      [status, req.user.id, id]
    )
    if (!rr.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Request not found or already actioned' }) }
    if (status === 'approved') {
      const { customer_id, coins } = rr.rows[0]
      await client.query(
        'UPDATE customers SET coins = coins - $1, coins_redeemed = coins_redeemed + $1 WHERE id=$2',
        [coins, customer_id]
      )
    }
    await client.query('COMMIT')
    res.json({ message: `Request ${status} successfully` })
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }) }
  finally { client.release() }
})

module.exports = router
