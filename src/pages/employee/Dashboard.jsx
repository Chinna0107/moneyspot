import React, { useEffect, useState, useRef, useMemo } from 'react'
import EmployeeSidebar from '../../components/employee/EmployeeSidebar'
import { getTokenByRole } from '../../utils/tokenUtils'
import { api } from '../../utils/api'
import { useEmployeeDashboard } from '../../hooks/useEmployeeDashboardStore'
import { MdLogin, MdLogout, MdRefresh, MdTrendingUp, MdTrendingDown, MdAccountBalanceWallet, MdMonetizationOn, MdStar, MdPeople, MdPersonAdd, MdPerson } from 'react-icons/md'
import './EmployeeDashboard.css'

const auth   = () => ({ Authorization: `Bearer ${getTokenByRole('employee') || getTokenByRole('admin')}` })
const fmt    = n => Number(n).toLocaleString('en-IN')
const fmtVal = n => { const v = parseFloat(n); if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`; if (v >= 1000) return `₹${(v/1000).toFixed(1)}K`; return `₹${fmt(v)}` }
// TARGET constant removed

function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const target = parseFloat(value) || 0
    const duration = 1000
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(target * ease))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(ref.current)
  }, [value])
  return <>{prefix}{display.toLocaleString('en-IN')}{suffix}</>
}

function GrowthBadge({ pct }) {
  if (pct === null || pct === undefined) return null
  const up = pct >= 0
  return (
    <span className={`ed-growth ${up ? 'ed-growth-up' : 'ed-growth-down'}`}>
      {up ? <MdTrendingUp size={12} /> : <MdTrendingDown size={12} />}
      {Math.abs(pct)}%
    </span>
  )
}

function StatCard({ icon, label, value, sub, color, delay = 0, growth }) {
  return (
    <div className="ed-stat" style={{ '--color': color, animationDelay: `${delay}ms` }}>
      <div className="ed-stat-glow" />
      <div className="ed-stat-icon">{icon}</div>
      <div className="ed-stat-label">{label}</div>
      <div className="ed-stat-value-row">
        <div className="ed-stat-value">{value}</div>
        {growth !== undefined && <GrowthBadge pct={growth} />}
      </div>
      {sub && <div className="ed-stat-sub">{sub}</div>}
    </div>
  )
}

const DonutChart = ({ pct, title, subtitle, color, isZero }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((isZero ? 0 : pct) / 100) * circumference;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
      <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={radius} stroke="#f1f5f9" strokeWidth="10" fill="none" />
          <circle cx="50" cy="50" r={radius} stroke={isZero ? '#e2e8f0' : color} strokeWidth="10" fill="none"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <strong style={{ fontSize: 20, color: '#1a0a2e', lineHeight: 1 }}>{pct}%</strong>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1a0a2e' }}>{subtitle}</div>
      </div>
    </div>
  )
}

export default function EmployeeDashboard() {
  const { data, loading, forceRefresh } = useEmployeeDashboard()
  const [attMsg, setAttMsg]       = useState('')
  const [attErr, setAttErr]       = useState('')
  const [attLoading, setAttLoading] = useState(false)
  const [greeting, setGreeting]   = useState('')

  const [targetData, setTargetData] = useState(null)

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening')
  }, [])

  // sync targetData when store data arrives
  useEffect(() => { if (data?.targets) setTargetData(data.targets) }, [data?.targets])

  const refetch = forceRefresh

  const markAttendance = async type => {
    setAttLoading(true); setAttMsg(''); setAttErr('')
    try {
      const r = await api('/dashboard/attendance/mark', { method: 'POST', headers: auth(), body: JSON.stringify({ type }) })
      setAttMsg(r.coinsEarned > 0 ? `${r.message} 🪙 +${r.coinsEarned} coins!` : r.message)
      forceRefresh()
    } catch (e) { setAttErr(e.message) }
    setAttLoading(false)
  }

  const profile = data?.profile     ?? {}
  const s       = data?.stats       ?? {}
  const txns    = data?.transactions ?? []
  const att     = data?.attendance  ?? null

  // --- Calculations for Modules (memoized to avoid re-running on every render) ---
  const pendingStats = useMemo(() => {
    const pending = Array.isArray(data?.pendingPayments) ? data.pendingPayments : []
    let outTotal = 0, outCusts = new Set(), out0_30 = 0, out31_60 = 0, out61_90 = 0, out90Plus = 0
    pending.forEach(p => {
      const amt = parseFloat(p.pending_amount) || 0
      outTotal += amt
      outCusts.add(p.customer_id || p.cust_mobile)
      const days = (new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24)
      if (days <= 30) out0_30 += amt
      else if (days <= 60) out31_60 += amt
      else if (days <= 90) out61_90 += amt
      else out90Plus += amt
    })
    return { outTotal, outCusts, out0_30, out31_60, out61_90, out90Plus }
  }, [data?.pendingPayments])

  const retentionStats = useMemo(() => {
    const customers = Array.isArray(data?.customers) ? data.customers : []
    let ret35Count = 0, ret60Count = 0, ret90Count = 0, atRiskRev = 0
    customers.forEach(c => {
      const lastTxnDate = new Date(c.last_txn_date || c.created_at)
      const days = (new Date() - lastTxnDate) / (1000 * 60 * 60 * 24)
      if (days >= 35 && days < 60) { ret35Count++; atRiskRev += parseFloat(c.total_amount) || 0 }
      else if (days >= 60 && days < 90) { ret60Count++; atRiskRev += parseFloat(c.total_amount) || 0 }
      else if (days >= 90) { ret90Count++; atRiskRev += parseFloat(c.total_amount) || 0 }
    })
    return { ret35Count, ret60Count, ret90Count, atRiskRev }
  }, [data?.customers])

  const dueStats = useMemo(() => {
    const dueDates = Array.isArray(data?.dueDates) ? data.dueDates : []
    let dueToday = 0, due3Days = 0, due7Days = 0
    let amtToday = 0, amt3Days = 0, amt7Days = 0, potentialTotal = 0
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    dueDates.forEach(d => {
      const dueD = new Date(d.bill_due_date)
      const diffDays = Math.ceil((dueD - todayStart) / (1000 * 60 * 60 * 24))
      const amt = parseFloat(d.bill_amount) || 0
      potentialTotal += amt
      if (diffDays === 0) { dueToday++; amtToday += amt }
      else if (diffDays > 0 && diffDays <= 3) { due3Days++; amt3Days += amt }
      else if (diffDays > 3 && diffDays <= 7) { due7Days++; amt7Days += amt }
    })
    return { dueToday, due3Days, due7Days, amtToday, amt3Days, amt7Days, potentialTotal }
  }, [data?.dueDates])

  const { outTotal, outCusts, out0_30, out31_60, out61_90, out90Plus } = pendingStats
  const { ret35Count, ret60Count, ret90Count, atRiskRev } = retentionStats
  const { dueToday, due3Days, due7Days, amtToday, amt3Days, amt7Days, potentialTotal } = dueStats

  const dailyTarget = targetData?.daily?.target || 0
  const dailyAchieved = targetData?.daily?.achieved || 0
  const dailyPct = dailyTarget > 0 ? Math.min(100, Math.round((dailyAchieved / dailyTarget) * 100)) : 0

  const weeklyTarget = targetData?.weekly?.target || 0
  const weeklyAchieved = targetData?.weekly?.achieved || 0
  const weeklyPct = weeklyTarget > 0 ? Math.min(100, Math.round((weeklyAchieved / weeklyTarget) * 100)) : 0

  const monthTarget = targetData?.monthly?.target || 0
  const monthAchieved = targetData?.monthly?.achieved || 0
  const monthPct = monthTarget > 0 ? Math.min(100, Math.round((monthAchieved / monthTarget) * 100)) : 0

  const now     = new Date()

  // Calculate elapsed shift time
  let shiftPct = 0;
  if (att?.check_in && !att?.check_out) {
    const [hh, mm] = att.check_in.split(':').map(Number);
    const elapsedMins = (now.getHours() * 60 + now.getMinutes()) - (hh * 60 + mm);
    if (elapsedMins > 0) {
      shiftPct = Math.min(100, Math.round((elapsedMins / (9 * 60)) * 100)); // Assuming 9h shift
    }
  }

  return (
    <div className="ed-page">
      <EmployeeSidebar />
      <div className="ed-content">

        {/* ── Hero Header ── */}
        <div className="ed-hero">
          <div className="ed-hero-bg" />
          <div className="ed-hero-orb ed-orb1" />
          <div className="ed-hero-orb ed-orb2" />
          <div className="ed-hero-inner">
            <div>
              <div className="ed-greeting">{greeting} 👋</div>
              <h1 className="ed-hero-name">{loading ? '...' : profile.name || 'Employee'}</h1>
              <div className="ed-hero-meta">
                {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {profile.branch && <span className="ed-branch-pill">🏦 {profile.branch}</span>}
              </div>
            </div>
            <div className="ed-hero-actions">
              <button className="ed-refresh-btn" onClick={refetch}><MdRefresh size={18} /></button>
              <div className="ed-coins-pill">🪙 {loading ? '...' : fmt(profile.coins ?? 0)} coins</div>
            </div>
          </div>
        </div>

        {/* ── Stats Row 1 ── */}
        <div className="ed-stats">
          {loading ? [1,2,3,4].map(i => <div key={i} className="ed-stat-skel" />) : (
            <>
              <StatCard icon={<MdTrendingUp />}           color="#402070" delay={0}
                label="Transactions Today" value={<AnimatedNumber value={s.txnToday ?? 0} />}
                sub={`Month: ${fmt(s.txnMonth ?? 0)}`}
                growth={s.txnGrowth} />
              <StatCard icon={<MdAccountBalanceWallet />} color="#c02040" delay={100}
                label="Value Handled Today" value={fmtVal(s.valueToday ?? 0)}
                sub={`Month: ${fmtVal(s.valueMonth ?? 0)}`}
                growth={s.valueGrowth} />
              <StatCard icon={<MdMonetizationOn />}       color="#d4af37" delay={200}
                label="Transactions This Month" value={<AnimatedNumber value={s.txnMonth ?? 0} />}
                sub={`Today: ${fmt(s.txnToday ?? 0)}`} />
              <StatCard icon={<MdStar />}                 color="#059669" delay={300}
                label="MoneySpot Coins" value={<AnimatedNumber value={profile.coins ?? 0} prefix="🪙 " />}
                sub="Earn more by working longer" />
            </>
          )}
        </div>

        {/* ── Stats Row 2 ── */}
        <div className="ed-stats" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
          {loading ? [1,2,3].map(i => <div key={i} className="ed-stat-skel" />) : (
            <>
              <StatCard icon={<MdPeople />}    color="#0ea5e9" delay={0}
                label="Customers Attended Today" value={<AnimatedNumber value={s.custAttendedToday ?? 0} />}
                sub="Unique customers served" />
              <StatCard icon={<MdPersonAdd />} color="#8b5cf6" delay={100}
                label="New Customers Today" value={<AnimatedNumber value={s.custNewToday ?? 0} />}
                sub="Added by you today" />
              <StatCard icon={<MdPerson />}    color="#f59e0b" delay={200}
                label="Total My Customers" value={<AnimatedNumber value={s.custTotal ?? 0} />}
                sub="All time" />
            </>
          )}
        </div>

        <div className="ed-grid">

          {/* ── Targets ── */}
          <div className="ed-card ed-card-target">
            <div className="ed-card-header">
              <span className="ed-card-icon">🎯</span>
              <h2>Targets Tracker</h2>
            </div>
            <div className="ed-card-body">
              <DonutChart 
                pct={dailyPct} 
                title="Daily Target (Volume)"
                subtitle={dailyTarget > 0 ? `${fmtVal(dailyAchieved)} / ${fmtVal(dailyTarget)}` : "No daily target set."}
                color={dailyPct >= 100 ? '#10b981' : dailyPct >= 60 ? '#f59e0b' : '#3b82f6'}
                isZero={dailyTarget === 0}
              />

              <div className="ed-target-divider" style={{ margin: '0 0 24px 0' }} />

              <DonutChart 
                pct={weeklyPct} 
                title="Weekly Target (Volume)"
                subtitle={weeklyTarget > 0 ? `${fmtVal(weeklyAchieved)} / ${fmtVal(weeklyTarget)}` : "No weekly target set."}
                color={weeklyPct >= 100 ? '#10b981' : weeklyPct >= 60 ? '#f59e0b' : '#3b82f6'}
                isZero={weeklyTarget === 0}
              />

              <div className="ed-target-divider" style={{ margin: '0 0 24px 0' }} />

              <DonutChart 
                pct={monthPct} 
                title="Monthly Target (Volume)"
                subtitle={monthTarget > 0 ? `${fmtVal(monthAchieved)} / ${fmtVal(monthTarget)}` : "No monthly target set."}
                color={monthPct >= 100 ? '#10b981' : monthPct >= 60 ? '#f59e0b' : '#3b82f6'}
                isZero={monthTarget === 0}
              />
            </div>
          </div>

          {/* ── Attendance ── */}
          <div className="ed-card">
            <div className="ed-card-header">
              <span className="ed-card-icon">🕒</span>
              <h2>Today's Attendance</h2>
              {att?.status && (
                <span className="ed-card-badge" style={{
                  background: att.status === 'Present' ? '#d1fae5' : '#fee2e2',
                  color:      att.status === 'Present' ? '#059669' : '#dc2626'
                }}>{att.status}</span>
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
                  <div className="ed-att-time" style={{ color: att?.check_in ? '#059669' : '#94a3b8' }}>
                    {att?.check_in || '—'}
                  </div>
                  {att?.late && <div className="ed-att-late">⏰ Late arrival</div>}
                  {att?.check_in && !att?.late && <div style={{ fontSize:11, color:'#059669', marginTop:4, fontWeight:600 }}>✅ On time</div>}
                </div>
                <div className="ed-att-divider" />
                <div className="ed-att-box">
                  <div className="ed-att-label">Check Out</div>
                  <div className="ed-att-time" style={{ color: att?.check_out ? '#c02040' : '#94a3b8' }}>
                    {att?.check_out || (att?.check_in ? 'Pending' : '—')}
                  </div>
                  {att?.minutes > 0 && (
                    <div className="ed-att-mins">
                      ⏱ {Math.floor(att.minutes / 60)}h {att.minutes % 60}m worked
                    </div>
                  )}
                </div>
              </div>

              {/* Active Shift Tracker */}
              {att?.check_in && !att?.check_out && (
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

              {att?.check_in && att?.check_out && att?.minutes > 0 && (
                <div style={{ background:'#f0fdf4', border:'1px solid #a7f3d0', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:13 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ color:'#059669', fontWeight:700 }}>⏱ Total Duration</span>
                    <strong style={{ color:'#059669', fontSize:15 }}>{Math.floor(att.minutes / 60)}h {att.minutes % 60}m</strong>
                  </div>
                  {att.coins_earned > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
                      <span style={{ color:'#d97706', fontWeight:700 }}>🪙 Coins Earned</span>
                      <strong style={{ color:'#d97706' }}>+{fmt(att.coins_earned)}</strong>
                    </div>
                  )}
                </div>
              )}
              <div className="ed-att-btns">
                <button className="ed-att-btn ed-att-in" onClick={() => markAttendance('check_in')}
                  disabled={attLoading || !!att?.check_in}>
                  <MdLogin /> {att?.check_in ? `In at ${att.check_in}` : 'Check In'}
                </button>
                <button className="ed-att-btn ed-att-out" onClick={() => markAttendance('check_out')}
                  disabled={attLoading || !att?.check_in || !!att?.check_out}>
                  <MdLogout /> {att?.check_out ? `Out at ${att.check_out}` : 'Check Out'}
                </button>
              </div>
              {att?.check_in && att?.check_out && (
                <div style={{ marginTop: 10, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', fontWeight: 600, textAlign: 'center' }}>
                  🔒 Attendance completed for today. Check-in is not allowed again.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── New Bottom Modules ── */}
        <div className="ed-modules-row">
          
          {/* Upcoming Dues */}
          <div className="ed-module-card">
            <div className="ed-module-header">
              <div className="ed-module-title">
                <span style={{color: '#3b82f6'}}>💳</span> Upcoming Dues
              </div>
              <span className="ed-module-link">View All</span>
            </div>
            <div className="ed-module-grid">
              <div className="ed-module-box">
                <div className="ed-module-box-title">Today</div>
                <div className="ed-module-box-count">{dueToday}</div>
                <div className="ed-module-box-amt">₹{fmt(amtToday)}</div>
              </div>
              <div className="ed-module-box">
                <div className="ed-module-box-title">Next 3 Days</div>
                <div className="ed-module-box-count">{due3Days}</div>
                <div className="ed-module-box-amt" style={{color: '#d97706'}}>₹{fmt(amt3Days)}</div>
              </div>
              <div className="ed-module-box">
                <div className="ed-module-box-title">Next 7 Days</div>
                <div className="ed-module-box-count">{due7Days}</div>
                <div className="ed-module-box-amt" style={{color: '#3b82f6'}}>₹{fmt(amt7Days)}</div>
              </div>
            </div>
            <div className="ed-module-total">
              <span>Total Potential Collection</span>
              <strong>₹{fmt(potentialTotal)} ➔</strong>
            </div>
          </div>

          {/* Pending Collections */}
          <div className="ed-module-card">
            <div className="ed-module-header">
              <div className="ed-module-title">
                <span style={{color: '#eab308'}}>💰</span> Pending Collections
              </div>
              <span className="ed-module-link">View All</span>
            </div>
            <div className="ed-module-col-top">
              <div className="ed-module-col-item">
                <div style={{color: '#ef4444'}}>Total Outstanding</div>
                <strong style={{color: '#ef4444'}}>₹{fmt(outTotal)}</strong>
              </div>
              <div className="ed-module-col-item" style={{textAlign: 'right'}}>
                <div>Total Customers</div>
                <strong style={{color: '#1a0a2e'}}>{outCusts.size}</strong>
              </div>
            </div>
            <div className="ed-module-col-buckets">
              <div className="ed-module-col-bucket">
                <div>0 - 30 Days</div>
                <strong style={{color: '#10b981'}}>₹{fmt(out0_30)}</strong>
              </div>
              <div className="ed-module-col-bucket">
                <div>31 - 60 Days</div>
                <strong style={{color: '#d97706'}}>₹{fmt(out31_60)}</strong>
              </div>
              <div className="ed-module-col-bucket">
                <div>61 - 90 Days</div>
                <strong style={{color: '#ea580c'}}>₹{fmt(out61_90)}</strong>
              </div>
              <div className="ed-module-col-bucket">
                <div>90+ Days</div>
                <strong style={{color: '#ef4444'}}>₹{fmt(out90Plus)}</strong>
              </div>
            </div>
          </div>

          {/* Customer Retention */}
          <div className="ed-module-card">
            <div className="ed-module-header">
              <div className="ed-module-title">
                <span style={{color: '#ef4444'}}>⏰</span> Customer Retention
              </div>
              <span className="ed-module-link">View All</span>
            </div>
            <div className="ed-module-grid">
              <div className="ed-module-box">
                <div className="ed-module-box-title">35 Days Not Visited</div>
                <div className="ed-module-box-count">{ret35Count}</div>
                <div className="ed-module-box-amt">High Priority</div>
              </div>
              <div className="ed-module-box">
                <div className="ed-module-box-title">60 Days Not Visited</div>
                <div className="ed-module-box-count">{ret60Count}</div>
                <div className="ed-module-box-amt">High Priority</div>
              </div>
              <div className="ed-module-box">
                <div className="ed-module-box-title">90+ Days Not Visited</div>
                <div className="ed-module-box-count">{ret90Count}</div>
                <div className="ed-module-box-amt">Critical</div>
              </div>
            </div>
            <div className="ed-module-total" style={{background: '#fff1f2', borderColor: '#ffe4e6'}}>
              <span style={{color: '#1a0a2e'}}>At Risk Revenue</span>
              <strong style={{color: '#ef4444'}}>₹{fmt(atRiskRev)}</strong>
            </div>
          </div>

        </div>

        {/* ── Recent Transactions ── */}
        <div className="ed-card">
          <div className="ed-card-header">
            <span className="ed-card-icon">💳</span>
            <h2>Recent Transactions</h2>
            <span className="ed-card-badge">{txns.length} records</span>
          </div>
          <div className="ed-table-wrap">
            {loading ? (
              <div className="ed-table-skel">
                {[1,2,3,4].map(i => <div key={i} className="ed-row-skel" style={{ animationDelay: `${i*80}ms` }} />)}
              </div>
            ) : txns.length === 0 ? (
              <div className="ed-empty">
                <div className="ed-empty-icon">💳</div>
                <div>No transactions yet — go to Services to add one</div>
              </div>
            ) : (
              <table className="ed-table">
                <thead><tr><th>Date & Time</th><th>Customer</th><th>Service</th><th>Platform</th><th>Amount</th><th>Charges</th><th>Settled</th><th>🪙 Coins</th></tr></thead>
                <tbody>
                  {txns.map((t, i) => (
                    <tr key={t.id} style={{ animationDelay: `${i * 40}ms` }} className="ed-tr">
                      <td>
                        <div style={{ fontSize:12 }}>{new Date(t.created_at).toLocaleDateString('en-IN')}</div>
                        <div style={{ fontSize:11, color:'#9ca3af' }}>{new Date(t.created_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}</div>
                      </td>
                      <td><strong style={{ fontSize:12 }}>{t.cust_name || '—'}</strong><div style={{ fontSize:11, color:'#9ca3af' }}>{t.cust_pan || ''}</div></td>
                      <td><strong>{t.service_type}</strong></td>
                      <td><span className="ed-platform-tag">{t.platform || t.bill_platform || '—'}</span></td>
                      <td><span className="ed-amount">₹{fmt(t.amount)}</span></td>
                      <td><span className="ed-charges">₹{fmt(t.charges_amount || 0)}</span></td>
                      <td><span className="ed-profit">₹{fmt(t.settled_amount || t.profit || 0)}</span></td>
                      <td>
                        <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                          +{t.service_type === 'Bill Pay + Withdrawal' ? 40 : 20}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Coins Card ── */}
        <div className="ed-coins-card">
          <div className="ed-coins-bg" />
          <div className="ed-coins-orb" />
          <div className="ed-coins-inner">
            <div className="ed-coins-icon">🪙</div>
            <div style={{ flex: 1 }}>
              <div className="ed-coins-label">MoneySpot Coins Balance</div>
              <div className="ed-coins-value">{loading ? '...' : fmt(profile.coins ?? 0)}</div>
              <div className="ed-coins-hint">📈 Txn coins: 40 for Bill Pay+Withdrawal · 20 for others</div>
              <div className="ed-coins-hint" style={{ marginTop: 4 }}>⏱ Attendance coins: 5 per min beyond 500 min/day</div>
            </div>
            <a href="/employee/profile"
              style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', backdropFilter: 'blur(4px)' }}>
              🎁 Redeem Coins
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
