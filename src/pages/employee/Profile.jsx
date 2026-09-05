import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../utils/api'
import { getTokenByRole } from '../../utils/tokenUtils'
import '../dashboard.css'
import './Profile.css'

const authHeader = (role = 'employee') => {
  const token = getTokenByRole(role) || getTokenByRole('admin') || getTokenByRole('superadmin') || getTokenByRole('employee')
  return { Authorization: `Bearer ${token}` }
}

const fmt = n => Number(parseInt(n) || 0).toLocaleString('en-IN')
const COINS_PER_RUPEE = 10 // 10 coins = ₹1

function ChangePasswordModal({ onClose, role = 'employee' }) {
  const [step, setStep]     = useState(1)
  const [form, setForm]     = useState({ current_password: '', new_password: '', confirm_password: '', otp: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')
  const [error, setError]   = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (step === 1 && form.new_password !== form.confirm_password) { setError('Passwords do not match'); return }
    setSaving(true); setMsg(''); setError('')
    try {
      const payload = step === 1 
        ? { current_password: form.current_password, new_password: form.new_password }
        : { current_password: form.current_password, new_password: form.new_password, otp: form.otp }

      const r = await api('/auth/change-password', {
        method: 'PATCH', headers: authHeader(role),
        body: JSON.stringify(payload),
      })
      
      if (r.step === 2) {
        setStep(2)
        setMsg(r.message)
      } else {
        setMsg(r.message)
        setTimeout(() => onClose(), 2000) // auto close after success
      }
    } catch (err) { setError(err.message) }
    setSaving(false)
  }

  return (
    <div className="profile-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="profile-modal-content">
        <div className="profile-modal-header">
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>🔒 Change Password</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>Keep your account secure</div>
          </div>
          <button className="profile-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="profile-modal-body">
          {msg && <div className="profile-alert success">✅ {msg}</div>}
          {error && <div className="profile-alert error">❌ {error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {step === 1 ? (
              <>
                {[
                  { key: 'current_password', label: 'Current Password',     icon: '🔑' },
                  { key: 'new_password',      label: 'New Password',         icon: '🔒' },
                  { key: 'confirm_password',  label: 'Confirm New Password', icon: '✅' },
                ].map(({ key, label, icon }) => (
                  <div className="profile-input-group" key={key} style={{ marginBottom: 0 }}>
                    <label className="profile-input-label">{icon} {label}</label>
                    <input required type="password" placeholder="••••••••"
                      className="profile-input"
                      value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                  </div>
                ))}
              </>
            ) : (
              <div className="profile-input-group" style={{ marginBottom: 0 }}>
                <label className="profile-input-label">📱 6-Digit OTP</label>
                <input required type="password" inputMode="numeric" maxLength={6} placeholder="••••••" autoFocus
                  className="profile-input"
                  value={form.otp} onChange={e => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="button" className="profile-quick-btn" style={{ flex: 1, padding: '12px', fontSize: 14 }} onClick={() => step === 2 ? setStep(1) : onClose()}>
                {step === 2 ? 'Back' : 'Cancel'}
              </button>
              <button type="submit" className="profile-redeem-btn" style={{ flex: 2, padding: '12px' }} disabled={saving || (step === 2 && form.otp.length !== 6)}>
                {saving ? (step === 1 ? 'Sending...' : 'Verifying...') : (step === 1 ? 'Send OTP' : '🔒 Update Password')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function Profile({ Sidebar, isAdmin = false }) {
  const [user, setUser]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [showPwModal, setShowPwModal] = useState(false)
  const [coins, setCoins]             = useState(0)
  const [coinHistory, setCoinHistory] = useState([])
  const [redeemAmt, setRedeemAmt]     = useState('')
  const [redeemMsg, setRedeemMsg]     = useState('')
  const [redeemErr, setRedeemErr]     = useState('')
  const [redeeming, setRedeeming]     = useState(false)
  const [showCoins, setShowCoins]     = useState(false)
  
  const [pendingAssignments, setPendingAssignments] = useState([])
  const [completedAssignments, setCompletedAssignments] = useState([])
  const navigate = useNavigate()

  const role = isAdmin ? 'admin' : 'employee'

  const fetchProfile = () => {
    api('/auth/me', { headers: authHeader(role) })
      .then(d => { setUser(d); setCoins(d.coins ?? 0); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const fetchCoins = () => {
    api('/master/coins/history', { headers: authHeader(role) })
      .then(d => { setCoins(d.balance); setCoinHistory(d.history) })
      .catch(() => {})
  }

  const fetchAssignments = () => {
    api('/assignments/pending', { headers: authHeader(role) })
      .then(d => setPendingAssignments(Array.isArray(d) ? d : []))
      .catch(() => {})
      
    api('/assignments/completed', { headers: authHeader(role) })
      .then(d => setCompletedAssignments(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  useEffect(() => { fetchProfile(); fetchAssignments(); }, [])
  useEffect(() => { if (showCoins) fetchCoins() }, [showCoins])

  const handleRedeem = async e => {
    e.preventDefault()
    setRedeeming(true); setRedeemMsg(''); setRedeemErr('')
    try {
      const r = await api('/master/coins/redeem', {
        method: 'POST', headers: authHeader(role),
        body: JSON.stringify({ coins: parseInt(redeemAmt) }),
      })
      setRedeemMsg(r.message)
      setRedeemAmt('')
      fetchCoins()
      fetchProfile()
    } catch (err) { setRedeemErr(err.message) }
    setRedeeming(false)
  }

  const roleLabel = user?.is_superadmin ? 'Super Admin' : user?.is_admin ? 'Admin' : 'Employee'
  const roleClass = user?.is_superadmin ? 'profile-role-superadmin' : user?.is_admin ? 'profile-role-admin' : 'profile-role-employee'
  const initials  = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const empId     = user?.id ? `MS-${String(user.id).padStart(5, '0')}` : '—'
  const joinDate  = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  const content = (
    <div className="profile-page">
      <div className="profile-orb profile-orb1" />
      <div className="profile-orb profile-orb2" />
      <div className="profile-orb profile-orb3" />

      <div className="profile-content">
        {loading ? (
          <div className="profile-loading">
            <div className="profile-spinner" />
            <div>Loading Profile Identity...</div>
          </div>
        ) : (
          <>
            {/* Page title */}
            <div className="profile-header-wrap">
              <div>
                <div className="profile-title-sub">Employee Identity</div>
                <h1 className="profile-title-main">My Profile</h1>
              </div>
              <button className="profile-change-pw-btn" onClick={() => setShowPwModal(true)}>🔒 Change Password</button>
            </div>

            {/* ── ID CARD ── */}
            <div className="id-card-wrap">
              <div className="id-card">
                {/* Card Header */}
                <div className="id-card-header">
                  <div className="id-card-logo">💰 MoneySpot</div>
                  <div className="id-card-type">Identity Card</div>
                </div>

                {/* Card Body */}
                <div className="id-card-body">
                  {/* Photo */}
                  <div className="id-card-photo">
                    {user?.photo_url
                      ? <img src={user.photo_url} alt={user.name} />
                      : <div className="id-card-initials">{initials}</div>}
                    <div className={`id-card-role-dot ${roleClass}`} />
                  </div>

                  {/* Info */}
                  <div className="id-card-info">
                    <div className="id-card-name">{user?.name || '—'}</div>
                    <div className={`id-card-role-badge ${roleClass}`}>
                      {roleLabel === 'Super Admin' ? '👑' : roleLabel === 'Admin' ? '⭐' : '👤'} {user?.role || roleLabel}
                    </div>
                    <div className="id-card-branch">🏢 {user?.branch || 'No Branch Assigned'}</div>

                    <div className="id-card-fields">
                      <div className="id-card-field">
                        <span className="id-card-field-label">Employee ID</span>
                        <span className="id-card-field-val id-card-empid">{empId}</span>
                      </div>
                      <div className="id-card-field">
                        <span className="id-card-field-label">Mobile</span>
                        <span className="id-card-field-val">{user?.mobile || '—'}</span>
                      </div>
                      <div className="id-card-field">
                        <span className="id-card-field-label">PAN</span>
                        <span className="id-card-field-val">{user?.pan || '—'}</span>
                      </div>
                      <div className="id-card-field">
                        <span className="id-card-field-label">Joined</span>
                        <span className="id-card-field-val">{joinDate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="id-card-footer">
                  <div className="id-card-coins">🪙 {user?.coins ?? 0} Coins</div>
                  <div className="id-card-footer-id">{empId}</div>
                  <div className={`id-card-status ${user?.is_active !== false ? 'active' : 'inactive'}`}>
                    {user?.is_active !== false ? '● Active' : '● Inactive'}
                  </div>
                </div>
              </div>
            </div>

            {/* ── ASSIGNMENTS SECTION ── */}
            {pendingAssignments.length > 0 && (
              <div className="profile-assignments-wrap">
                <div className="profile-section-title">📋 Pending Assignments</div>
                <div className="profile-assignments-grid">
                  {pendingAssignments.map(a => (
                    <div key={a.id} className="profile-assignment-card" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                      <div>
                        <h4 className="profile-assignment-title" style={{ fontSize: '18px', color: '#1e293b', fontWeight: 800, marginBottom: '8px' }}>{a.title}</h4>
                        {a.description && <p className="profile-assignment-desc" style={{ color: '#475569', fontSize: '14px', marginBottom: '12px' }}>{a.description}</p>}
                        <div className="profile-assignment-meta" style={{ display: 'flex', gap: '12px', color: '#64748b', fontSize: '13px' }}>
                          <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px' }}>⏱️ {a.time_limit_minutes} Mins</span>
                          <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px' }}>📝 {a.total_questions} Qs</span>
                        </div>
                      </div>
                      <button onClick={() => navigate(`/employee/take-assignment/${a.id}`)} className="profile-assignment-btn" style={{ background: '#10b981', color: 'white', fontWeight: 700, marginTop: '16px' }}>
                        🚀 Start Assignment
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedAssignments.length > 0 && (
              <div className="profile-assignments-wrap" style={{ marginTop: 24 }}>
                <div className="profile-section-title">✅ Completed Assignments</div>
                <div className="profile-assignments-grid">
                  {completedAssignments.map(a => (
                    <div key={a.assignment_id} className="profile-assignment-card" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                      <div>
                        <h4 className="profile-assignment-title" style={{ fontSize: '18px', color: '#1e293b', fontWeight: 800, marginBottom: '8px' }}>{a.title}</h4>
                        <div className="profile-assignment-meta" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '14px', color: '#64748b' }}>📅 {new Date(a.submitted_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span style={{ 
                            background: a.score >= ((a.total_marks || a.total_questions) * 0.8) ? '#dcfce7' : '#fef3c7', 
                            color: a.score >= ((a.total_marks || a.total_questions) * 0.8) ? '#166534' : '#92400e', 
                            fontWeight: 'bold', 
                            padding: '6px 12px',
                            borderRadius: '20px',
                            display: 'inline-block',
                            width: 'fit-content',
                            fontSize: '13px'
                          }}>
                            🏆 Score: {a.score}/{a.total_marks || a.total_questions}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => navigate(`/employee/assignment-result/${a.assignment_id}`)} className="profile-assignment-btn" style={{ background: '#402070', color: 'white', fontWeight: 600, marginTop: '16px' }}>
                        👀 View Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── COINS SECTION ── */}
            <div className="profile-coins-wrap">
              <button className="profile-coins-toggle-btn" onClick={() => setShowCoins(v => !v)}>
                <span>🪙 MoneySpot Coins Balance — {fmt(coins)}</span>
                <span style={{ fontSize: 13, opacity: 0.8 }}>{showCoins ? '▲ Collapse' : '▼ Show & Redeem'}</span>
              </button>

              {showCoins && (
                <div className="profile-coins-grid">

                  {/* Redeem Panel */}
                  <div className="profile-coins-card">
                    <div className="profile-coins-card-title">🎁 Redeem Coins</div>
                    <div className="profile-coins-card-sub">{COINS_PER_RUPEE} coins = ₹1 &nbsp;·&nbsp; Min: {COINS_PER_RUPEE} coins</div>

                    {/* Balance display */}
                    <div className="profile-balance-box">
                      <span className="profile-balance-label">Available Balance</span>
                      <span className="profile-balance-val">🪙 {fmt(coins)}</span>
                    </div>

                    {redeemMsg && <div className="profile-alert success">✅ {redeemMsg}</div>}
                    {redeemErr && <div className="profile-alert error">❌ {redeemErr}</div>}

                    <form onSubmit={handleRedeem}>
                      <div className="profile-input-group">
                        <label className="profile-input-label">Coins to Redeem</label>
                        <input
                          type="number" required min={COINS_PER_RUPEE} step={COINS_PER_RUPEE}
                          placeholder={`Min ${COINS_PER_RUPEE} coins`}
                          value={redeemAmt} onChange={e => setRedeemAmt(e.target.value)}
                          className="profile-input"
                        />
                        {redeemAmt && parseInt(redeemAmt) >= COINS_PER_RUPEE && (
                          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 800, marginTop: 8 }}>
                            ✨ Equals ₹{parseInt(redeemAmt) / COINS_PER_RUPEE} cash value!
                          </div>
                        )}
                      </div>

                      {/* Quick select buttons */}
                      <div className="profile-quick-btns">
                        {[100, 500, 1000, 2000].filter(v => v <= coins).map(v => (
                          <button key={v} type="button"
                            onClick={() => setRedeemAmt(String(v))}
                            className={`profile-quick-btn ${redeemAmt === String(v) ? 'active' : ''}`}>
                            {fmt(v)}
                          </button>
                        ))}
                      </div>

                      <button type="submit" disabled={redeeming || !redeemAmt || parseInt(redeemAmt) < COINS_PER_RUPEE || parseInt(redeemAmt) > coins}
                        className="profile-redeem-btn">
                        {redeeming ? 'Processing...' : `🎁 Redeem ${redeemAmt ? fmt(redeemAmt) : ''} Coins`}
                      </button>
                    </form>
                  </div>

                  {/* History Panel */}
                  <div className="profile-coins-card">
                    <div className="profile-coins-card-title">📜 Coins History</div>
                    <div className="profile-coins-history">
                      {coinHistory.length === 0
                        ? <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', padding: '40px 20px' }}>No coin activity yet</div>
                        : coinHistory.map(h => (
                          <div key={h.id} className="profile-history-item">
                            <div>
                              <div className="profile-history-info-title">{h.remarks || (h.type === 'earn' ? 'Earned' : 'Redeemed')}</div>
                              <div className="profile-history-info-date">{new Date(h.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            </div>
                            <span className={`profile-history-amt ${h.type}`}>
                              {h.type === 'earn' ? '+' : '−'}{fmt(h.coins)} 🪙
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )

  if (isAdmin) {
    return (
      <div className="dash-page">
        <Sidebar />
        <div className="dash-content" style={{ padding: 0, overflowX: 'hidden' }}>
          {content}
        </div>
        {showPwModal && <ChangePasswordModal role={role} onClose={() => setShowPwModal(false)} />}
      </div>
    )
  }

  return (
    <div className="dash-page">
      <Sidebar />
      <main className="dash-main" style={{ padding: 0 }}>
        {content}
      </main>
      {showPwModal && <ChangePasswordModal role={role} onClose={() => setShowPwModal(false)} />}
    </div>
  )
}
