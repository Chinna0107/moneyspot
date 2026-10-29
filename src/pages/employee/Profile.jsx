import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdLogin, MdLogout } from 'react-icons/md'
import { api } from '../../utils/api'
import { getTokenByRole } from '../../utils/tokenUtils'
import { useEmployeeDashboard } from '../../hooks/useEmployeeDashboardStore'
import '../dashboard.css'
import './Profile.css'
import './EmployeeDashboard.css'

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

  // Attendance state
  const dashboardContext = useEmployeeDashboard()
  const dashboardData = dashboardContext?.data
  const forceRefreshDashboard = dashboardContext?.forceRefresh

  const [attData, setAttData]       = useState(dashboardData?.attendance ?? null)
  const [attMsg, setAttMsg]         = useState('')
  const [attErr, setAttErr]         = useState('')
  const [attLoading, setAttLoading] = useState(false)

  const role = isAdmin ? 'admin' : 'employee'

  const fetchProfile = () => {
    api('/auth/me', { headers: authHeader(role) })
      .then(d => { setUser(d); setCoins(d.coins ?? 0); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const fetchAttendance = () => {
    if (role === 'employee') {
      api('/dashboard/employee/full', { headers: authHeader(role) })
        .then(res => {
          if (res?.attendance !== undefined) setAttData(res.attendance)
        })
        .catch(() => {})
    }
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

  useEffect(() => { 
    fetchProfile(); 
    fetchAssignments(); 
    fetchAttendance();
  }, [])

  useEffect(() => {
    if (dashboardData?.attendance !== undefined) {
      setAttData(dashboardData.attendance)
    }
  }, [dashboardData?.attendance])

  const markAttendance = async type => {
    setAttLoading(true); setAttMsg(''); setAttErr('')
    try {
      const r = await api('/dashboard/attendance/mark', { 
        method: 'POST', 
        headers: authHeader(role), 
        body: JSON.stringify({ type }) 
      })
      setAttMsg(r.coinsEarned > 0 ? `${r.message} 🪙 +${r.coinsEarned} coins!` : r.message)
      if (typeof forceRefreshDashboard === 'function') {
        forceRefreshDashboard()
      }
      fetchAttendance()
      fetchProfile()
    } catch (e) { setAttErr(e.message) }
    setAttLoading(false)
  }

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

  // Calculate elapsed shift time for active shift tracker
  const now = new Date()
  let shiftPct = 0
  if (attData?.check_in && !attData?.check_out) {
    const [hh, mm] = attData.check_in.split(':').map(Number)
    const elapsedMins = (now.getHours() * 60 + now.getMinutes()) - (hh * 60 + mm)
    if (elapsedMins > 0) {
      shiftPct = Math.min(100, Math.round((elapsedMins / (9 * 60)) * 100))
    }
  }

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

            {/* ── ATTENDANCE (CHECK IN / CHECK OUT) ── */}
            {!isAdmin && (
              <div className="profile-attendance-wrap">
                <div className="profile-attendance-card ed-card" style={{ marginBottom: 0 }}>
                  <div className="ed-card-header">
                    <span className="ed-card-icon">🕒</span>
                    <h2>Today's Attendance</h2>
                    {attData?.status && (
                      <span className="ed-card-badge" style={{
                        background: attData.status === 'Present' ? '#d1fae5' : '#fee2e2',
                        color:      attData.status === 'Present' ? '#059669' : '#dc2626'
                      }}>{attData.status}</span>
                    )}
                  </div>
                  <div className="ed-card-body">
                    {(attMsg || attErr) && (
                      <div className={`ed-alert ${attErr ? 'ed-alert-error' : 'ed-alert-success'}`}>
                        {attErr || attMsg}
                      </div>
                    )}
                    <div className="ed-att-grid">
                      <div className="ed-att-box">
                        <div className="ed-att-label">Check In</div>
                        <div className="ed-att-time" style={{ color: attData?.check_in ? '#059669' : '#94a3b8' }}>
                          {attData?.check_in || '—'}
                        </div>
                        {attData?.late && <div className="ed-att-late">⏰ Late arrival</div>}
                        {attData?.check_in && !attData?.late && <div style={{ fontSize: 11, color: '#059669', marginTop: 4, fontWeight: 600 }}>✅ On time</div>}
                      </div>
                      <div className="ed-att-divider" />
                      <div className="ed-att-box">
                        <div className="ed-att-label">Check Out</div>
                        <div className="ed-att-time" style={{ color: attData?.check_out ? '#c02040' : '#94a3b8' }}>
                          {attData?.check_out || (attData?.check_in ? 'Pending' : '—')}
                        </div>
                        {attData?.minutes > 0 && (
                          <div className="ed-att-mins">
                            ⏱ {Math.floor(attData.minutes / 60)}h {attData.minutes % 60}m worked
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active Shift Tracker */}
                    {attData?.check_in && !attData?.check_out && (
                      <div className="ed-shift-tracker">
                        <div className="ed-shift-header">
                          <span>Shift Progress</span>
                          <span>{shiftPct}% of 5h</span>
                        </div>
                        <div className="ed-progress-track">
                          <div className="ed-progress-fill" style={{ width: `${shiftPct}%`, background: 'linear-gradient(90deg, #3b82f6, #0ea5e9)' }}>
                            <div className="ed-progress-glow" style={{ background: '#0ea5e9', left: '100%' }} />
                          </div>
                        </div>
                        <p className="ed-shift-tip">💡 Tip: Stay hydrated and take short breaks!</p>
                      </div>
                    )}

                    {attData?.check_in && attData?.check_out && attData?.minutes > 0 && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#059669', fontWeight: 700 }}>⏱ Total Duration</span>
                          <strong style={{ color: '#059669', fontSize: 15 }}>{Math.floor(attData.minutes / 60)}h {attData.minutes % 60}m</strong>
                        </div>
                        {attData.coins_earned > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                            <span style={{ color: '#d97706', fontWeight: 700 }}>🪙 Coins Earned</span>
                            <strong style={{ color: '#d97706' }}>+{fmt(attData.coins_earned)}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="ed-att-btns">
                      <button className="ed-att-btn ed-att-in" onClick={() => markAttendance('check_in')}
                        disabled={attLoading || !!attData?.check_in}>
                        <MdLogin /> {attData?.check_in ? `In at ${attData.check_in}` : 'Check In'}
                      </button>
                      <button className="ed-att-btn ed-att-out" onClick={() => markAttendance('check_out')}
                        disabled={attLoading || !attData?.check_in || !!attData?.check_out}>
                        <MdLogout /> {attData?.check_out ? `Out at ${attData.check_out}` : 'Check Out'}
                      </button>
                    </div>

                    {attData?.check_in && attData?.check_out && (
                      <div style={{ marginTop: 10, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', fontWeight: 600, textAlign: 'center' }}>
                        🔒 Attendance completed for today. Check-in is not allowed again.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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
