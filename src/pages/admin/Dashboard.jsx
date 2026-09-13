import React, { useEffect, useState, useCallback } from 'react'
import AdminSidebar from '../../components/admin/AdminSidebar'
import { getTokenByRole, getUserByRole } from '../../utils/tokenUtils'
import { api } from '../../utils/api'
import { cacheGet, cacheSet } from '../../utils/cache'
import { MdTrendingUp, MdAccountBalanceWallet, MdMonetizationOn, MdPeople, MdRefresh } from 'react-icons/md'
import '../../pages/dashboard.css'
import '../admin/AdminDashboard.css'
import { useAdminStats } from '../../hooks/useFinance'

const auth = () => ({ Authorization: `Bearer ${getTokenByRole('admin')}` })
const fmt    = n => Number(n).toLocaleString('en-IN')
const fmtVal = n => { const v = parseFloat(n); if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`; if (v >= 1000) return `₹${(v/1000).toFixed(1)}K`; return `₹${fmt(v)}` }

function Skel({ w = '100%', h = 16 }) {
  return <div style={{ width: w, height: h, borderRadius: 6, background: 'linear-gradient(90deg,#f0f2f8 25%,#e4e6f0 50%,#f0f2f8 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.4s infinite linear' }} />
}

export default function AdminDashboard() {
  const CACHE_KEY = 'admin_stats'
  const [data, setData]       = useState(() => cacheGet(CACHE_KEY))
  const [loading, setLoading] = useState(!cacheGet(CACHE_KEY))
  const user = getUserByRole('admin')

  // Performance Section States
  const [perfData, setPerfData] = useState(null)
  const [perfLoading, setPerfLoading] = useState(false)
  const [perfFilter, setPerfFilter] = useState('month') // today | month | custom
  const [perfCustomFrom, setPerfCustomFrom] = useState('')
  const [perfCustomTo, setPerfCustomTo] = useState('')

  const loadPerf = useCallback(() => {
    setPerfLoading(true)
    let qs = `from=${perfFilter}`
    if (perfFilter === 'custom') {
      qs = `from=${perfCustomFrom}&to=${perfCustomTo}`
    }
    api(`/dashboard/admin/performance?${qs}`, { headers: auth() })
      .then(d => { setPerfData(d); setPerfLoading(false) })
      .catch(() => setPerfLoading(false))
  }, [perfFilter, perfCustomFrom, perfCustomTo])

  useEffect(() => { loadPerf() }, [loadPerf])

  const refetch = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet(CACHE_KEY)
      if (cached) { setData(cached); setLoading(false); return }
    }
    setLoading(true)
    api('/dashboard/admin/stats', { headers: auth() })
      .then(d => { cacheSet(CACHE_KEY, d); setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const s   = data?.stats      ?? {}
  const emp = data?.employees  ?? []
  const att = data?.attendance ?? []
  const top = emp[0] ?? null
  const low = emp.filter(e => e.txn === 0)
  const late = att.filter(a => a.late)

  return (
    <div className="dash-page">
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
      <AdminSidebar />
      <div className="dash-content">
        <div className="dash-topbar">
          <div>
            <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Branch: {user?.branch || 'All Branches'}</p>
          </div>
          <div className="dash-topbar-right">
            <button className="dash-btn dash-btn-primary" onClick={() => refetch(true)} style={{ padding: '7px 14px' }}>
              <MdRefresh /> Refresh
            </button>
            <span className="dash-badge">Admin Portal</span>
          </div>
        </div>

        <div className="dash-main">

          {/* Stats */}
          <div className="dash-stats">
            {loading ? [1,2,3,4].map(i => (
              <div key={i} className="dash-stat"><Skel h={12} w="60%" /><div style={{marginTop:8}}><Skel h={28} w="45%" /></div></div>
            )) : (
              <>
                <div className="dash-stat">
                  <div className="dash-stat-icon"><MdTrendingUp size={22}/></div>
                  <div className="dash-stat-label">Transactions Today</div>
                  <div className="dash-stat-value">{fmt(s.txnToday ?? 0)}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Month: {fmt(s.txnMonth ?? 0)}</div>
                </div>
                <div className="dash-stat">
                  <div className="dash-stat-icon"><MdAccountBalanceWallet size={22}/></div>
                  <div className="dash-stat-label">Transaction Value</div>
                  <div className="dash-stat-value">{fmtVal(s.valueToday ?? 0)}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Month: {fmtVal(s.valueMonth ?? 0)}</div>
                </div>
                <div className="dash-stat">
                  <div className="dash-stat-icon"><MdMonetizationOn size={22}/></div>
                  <div className="dash-stat-label">Branch Profit</div>
                  <div className="dash-stat-value">{fmtVal(s.profitToday ?? 0)}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Month: {fmtVal(s.profitMonth ?? 0)}</div>
                </div>
                <div className="dash-stat">
                  <div className="dash-stat-icon"><MdPeople size={22}/></div>
                  <div className="dash-stat-label">Employees</div>
                  <div className="dash-stat-value">{fmt(s.activeEmployees ?? 0)}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Total: {fmt(s.totalEmployees ?? 0)}</div>
                </div>
              </>
            )}
          </div>

          {/* Highlights row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="dash-card" style={{ marginBottom: 0 }}>
              <div className="dash-card-header"><h2>🥇 Top Employee</h2></div>
              <div className="dash-card-body">
                {loading ? <Skel /> : top ? (
                  <>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#402070' }}>🏆 {top.name}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#c02040', margin: '6px 0' }}>{fmtVal(top.value)}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{top.txn} transactions today</div>
                  </>
                ) : <div style={{ color: '#9ca3af', fontSize: 13 }}>No transactions today</div>}
              </div>
            </div>
            <div className="dash-card" style={{ marginBottom: 0 }}>
              <div className="dash-card-header"><h2>👥 Customers</h2></div>
              <div className="dash-card-body">
                {loading ? <Skel /> : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#402070' }}>{fmt(s.custToday ?? 0)}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>New today</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#059669', textAlign: 'right' }}>
                        <div>Total</div>
                        <div>{fmt(s.custTotal ?? 0)}</div>
                      </div>
                    </div>
                    
                    {data?.custTodayByEmp?.length > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Added By</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 60, overflowY: 'auto' }}>
                          {data.custTodayByEmp.map((emp, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                              <span style={{ color: '#475569' }}>{emp.employee_name}</span>
                              <span style={{ fontWeight: 700, color: '#402070' }}>{emp.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="dash-card" style={{ marginBottom: 0 }}>
              <div className="dash-card-header"><h2>⚠️ Alerts</h2></div>
              <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {loading ? <Skel /> : (
                  <>
                    {low.length > 0 && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>🚨 {low.length} employee(s) with 0 transactions</div>}
                    {late.length > 0 && <div style={{ background: '#fef3c7', color: '#d97706', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>⏰ {late.length} late check-in(s) today</div>}
                    {low.length === 0 && late.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>✅ All clear</div>}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Performance Section */}
          <div className="dash-card">
            <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>💳 Platform-wise Performance</h2>
              <div style={{ display: 'flex', gap: 10 }}>
                <select 
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  value={perfFilter}
                  onChange={e => setPerfFilter(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Date</option>
                </select>
                {perfFilter === 'custom' && (
                  <>
                    <input type="date" value={perfCustomFrom} onChange={e => setPerfCustomFrom(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
                    <input type="date" value={perfCustomTo} onChange={e => setPerfCustomTo(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
                  </>
                )}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, padding: 20 }}>
              
              <div className="dash-table-wrap" style={{ margin: 0 }}>
                {perfLoading ? <div className="dash-loading">Loading Performance Data...</div> : (
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Platform Name</th>
                        <th>Transactions</th>
                        <th>Amount</th>
                        <th>Branch</th>
                        <th>Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfData?.platforms?.map((p, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{p.platform}</div>
                          </td>
                          <td>{p.txns}</td>
                          <td style={{ fontWeight: 700, color: '#059669' }}>{fmtVal(p.volume)}</td>
                          <td style={{ color: '#64748b' }}>{p.branch}</td>
                          <td>
                            <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                              {perfFilter === 'today' ? 'Today' : perfFilter === 'month' ? 'This Month' : 'Custom'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!perfData?.platforms?.length && (
                        <tr><td colSpan="5" className="dash-empty">No platform activity found for the selected period</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Branch Top Employee */}
              <div style={{ background: 'linear-gradient(135deg, #402070 0%, #201040 100%)', borderRadius: 16, padding: 20, color: 'white', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 120, opacity: 0.1 }}>🏆</div>
                <h3 style={{ margin: '0 0 20px 0', fontSize: 16, color: '#fcd34d', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🏆</span> Branch Top Employee
                </h3>
                
                {perfLoading ? <Skel h={100} /> : perfData?.topEmployee ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 50, height: 50, borderRadius: '50%', 
                        background: 'linear-gradient(45deg, #fcd34d, #f59e0b)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, fontWeight: 900, color: '#402070',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                      }}>
                        {perfData.topEmployee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{perfData.topEmployee.name}</div>
                        <div style={{ fontSize: 12, color: '#cbd5e1' }}>{perfFilter === 'today' ? 'Today' : perfFilter === 'month' ? 'This Month' : 'Custom'}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 10 }}>
                        <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 4 }}>Total Volume</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{fmtVal(perfData.topEmployee.volume)}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 10 }}>
                        <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 4 }}>Transactions</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>{perfData.topEmployee.txns}</div>
                      </div>
                    </div>
                    
                    {perfData.topEmployee.target_amount > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                          <span style={{ color: '#cbd5e1' }}>Target Achievement</span>
                          <span style={{ fontWeight: 800, color: '#fcd34d' }}>{Math.round(perfData.topEmployee.target_achievement)}%</span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${Math.min(perfData.topEmployee.target_achievement, 100)}%`, 
                            height: '100%', 
                            background: perfData.topEmployee.target_achievement >= 100 ? '#10b981' : perfData.topEmployee.target_achievement >= 50 ? '#fcd34d' : '#ef4444',
                            borderRadius: 10 
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                    No employee activity found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Employee Performance */}
          <div className="dash-card">
            <div className="dash-card-header"><h2>📊 Employee Performance — Today</h2></div>
            <div className="dash-table-wrap">
              {loading ? <div className="dash-loading">Loading...</div> : (
                <table className="dash-table">
                  <thead><tr><th>Rank</th><th>Employee</th><th>Transactions</th><th>Value</th><th>Profit</th><th>Performance</th></tr></thead>
                  <tbody>
                    {emp.map((e, i) => (
                      <tr key={e.id}>
                        <td><span style={{ background: i === 0 ? '#fef3c7' : '#f0f2f8', color: i === 0 ? '#b8860b' : '#6b7280', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>#{i+1}</span></td>
                        <td><strong>{e.badge} {e.name}</strong></td>
                        <td>{e.txn}</td>
                        <td style={{ color: '#059669', fontWeight: 700 }}>{fmtVal(e.value)}</td>
                        <td style={{ color: '#d4af37', fontWeight: 700 }}>{fmtVal(e.profit)}</td>
                        <td style={{ minWidth: 120 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: '#f0f2f8', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ width: `${e.pct}%`, height: '100%', background: e.pct >= 80 ? '#10b981' : e.pct >= 50 ? '#d97706' : '#ef4444', borderRadius: 999 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#402070' }}>{e.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!emp.length && <tr><td colSpan={6} className="dash-empty">No employee data today</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Attendance Today */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h2>✅ Attendance — Today</h2>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                {loading ? '...' : `${att.filter(a => a.status === 'Present').length} Present · ${late.length} Late`}
              </span>
            </div>
            <div className="dash-table-wrap">
              {loading ? <div className="dash-loading">Loading...</div> : (
                <table className="dash-table">
                  <thead><tr><th>Employee</th><th>Check In</th><th>Check Out</th><th>Minutes</th><th>Status</th></tr></thead>
                  <tbody>
                    {att.map(a => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.employee_name}</strong>
                          {a.late && <span style={{ marginLeft: 8, background: '#fef3c7', color: '#d97706', padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>⏰ Late</span>}
                        </td>
                        <td style={{ color: a.late ? '#d97706' : '#374151', fontWeight: a.late ? 700 : 400 }}>{a.check_in || '—'}</td>
                        <td>{a.check_out || '—'}</td>
                        <td style={{ fontWeight: 700, color: (a.minutes || 0) > 500 ? '#059669' : '#374151' }}>{a.minutes || 0} min</td>
                        <td><span className={`dash-status ${a.status?.toLowerCase()}`}>{a.status}</span></td>
                      </tr>
                    ))}
                    {!att.length && <tr><td colSpan={5} className="dash-empty">No attendance records today</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
