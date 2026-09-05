import React, { useState, useEffect, useCallback } from 'react'
import AdminSidebar from '../../components/admin/AdminSidebar'
import { api } from '../../utils/api'
import { getTokenByRole } from '../../utils/tokenUtils'
import '../../pages/dashboard.css'
import toast from 'react-hot-toast'

const fmtCurrency = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0)

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Progress bar helper
function ProgressBar({ pct, success }) {
  return (
    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', minWidth: 80 }}>
      <div style={{
        height: '100%',
        width: `${Math.min(pct, 100)}%`,
        background: success ? '#10b981' : pct >= 75 ? '#f59e0b' : '#402070',
        borderRadius: 4,
        transition: 'width 0.6s ease'
      }} />
    </div>
  )
}

export default function AdminAssignTargets() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  // Target Form State
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [dailyTarget, setDailyTarget] = useState('')
  const [weeklyTarget, setWeeklyTarget] = useState('')
  const [monthlyTarget, setMonthlyTarget] = useState('')

  // Evaluation State
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split('T')[0])
  const [evalResult, setEvalResult] = useState(null)
  const [evalLoading, setEvalLoading] = useState(false)

  // All assigned targets for the selected month/year
  const [allTargets, setAllTargets] = useState([])
  const [targetsLoading, setTargetsLoading] = useState(false)

  useEffect(() => { fetchEmployees() }, [])

  const fetchEmployees = async () => {
    try {
      const data = await api('/dashboard/employees', {
        headers: { Authorization: `Bearer ${getTokenByRole('admin')}` }
      })
      setEmployees(data)
      if (data.length > 0) setSelectedEmpId(data[0].id)
    } catch {
      toast.error('Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }

  // Fetch per-employee targets when selection changes
  useEffect(() => {
    if (!selectedEmpId) return
    const fetchTargets = async () => {
      try {
        const data = await api(`/targets?user_id=${selectedEmpId}&month=${month}&year=${year}`, {
          headers: { Authorization: `Bearer ${getTokenByRole('admin')}` }
        })
        setDailyTarget(data.daily_target || '')
        setWeeklyTarget(data.weekly_target || '')
        setMonthlyTarget(data.monthly_target || '')
      } catch (err) { console.error(err) }
    }
    fetchTargets()
  }, [selectedEmpId, month, year])

  // Fetch ALL assigned targets for current month/year
  const fetchAllTargets = useCallback(async () => {
    setTargetsLoading(true)
    try {
      const data = await api(`/dashboard/targets?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${getTokenByRole('admin')}` }
      })
      setAllTargets(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch all targets:', err)
      setAllTargets([])
    } finally {
      setTargetsLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetchAllTargets() }, [fetchAllTargets])

  const handleSaveTargets = async (e) => {
    e.preventDefault()
    if (!selectedEmpId) return toast.error('Select an employee first')
    try {
      await api('/targets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getTokenByRole('admin')}` },
        body: JSON.stringify({
          user_id: selectedEmpId, month, year,
          daily_target: dailyTarget, weekly_target: weeklyTarget, monthly_target: monthlyTarget
        })
      })
      toast.success('Targets saved successfully')
      fetchAllTargets() // refresh the table
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleEvaluate = async () => {
    if (!selectedEmpId || !evalDate) return toast.error('Select employee and date')
    setEvalLoading(true)
    try {
      const data = await api('/targets/evaluate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getTokenByRole('admin')}` },
        body: JSON.stringify({ user_id: selectedEmpId, date: evalDate })
      })
      setEvalResult(data)
      if (data.rewards_just_awarded?.length > 0) {
        data.rewards_just_awarded.forEach(r =>
          toast.success(`🎉 Awarded ${r.coins} coins for achieving ${r.type} target!`, { duration: 5000 })
        )
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEvalLoading(false)
    }
  }

  const renderProgressBar = (label, achieved, target) => {
    const pct = target > 0 ? (achieved / target) * 100 : 0
    const isSuccess = achieved >= target && target > 0
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>{label}</span>
          <span style={{ fontWeight: 700, color: isSuccess ? '#10b981' : '#402070' }}>
            {fmtCurrency(achieved)} / {fmtCurrency(target)}{isSuccess && ' ✅'}
          </span>
        </div>
        <div style={{ height: 12, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: isSuccess ? '#10b981' : '#402070', width: `${Math.min(pct, 100)}%`, transition: 'width 0.5s' }} />
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'right' }}>
          {pct.toFixed(1)}% Achieved
        </div>
      </div>
    )
  }

  // badge styling for target status
  const getTargetStatus = (row) => {
    const hasAny = row.daily_target > 0 || row.weekly_target > 0 || (row.target_amount || row.monthly_target) > 0
    if (!hasAny) return { label: 'Not Set', color: '#dc2626', bg: '#fef2f2' }
    const monthly = parseFloat(row.target_amount || row.monthly_target || 0)
    if (monthly > 0) return { label: 'Full Set', color: '#059669', bg: '#f0fdf4' }
    return { label: 'Partial', color: '#d97706', bg: '#fffbeb' }
  }

  return (
    <div className="dash-page">
      <AdminSidebar />
      <div className="dash-content">
        <div className="dash-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="dash-topbar-title">🎯 Assign Targets</h1>
            <p className="dash-topbar-sub">Set daily, weekly, and monthly targets for employees</p>
          </div>
        </div>

        <div className="dash-main">
          {loading ? <div style={{ padding: 40, color: '#94a3b8', textAlign: 'center' }}>Loading...</div> : (
            <>
              {/* ── Row 1: Set + Evaluate ── */}
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>

                {/* LEFT: Set Targets */}
                <div className="dash-card" style={{ flex: 1, minWidth: 300, padding: 24 }}>
                  <h3 style={{ marginTop: 0, color: '#402070', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 20 }}>
                    1. Set Targets
                  </h3>
                  <form onSubmit={handleSaveTargets}>
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Select Employee</label>
                      <select value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} style={inputStyle}>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.branch})</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Month</label>
                        <select value={month} onChange={e => setMonth(e.target.value)} style={inputStyle}>
                          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Year</label>
                        <select value={year} onChange={e => setYear(e.target.value)} style={inputStyle}>
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y =>
                            <option key={y} value={y}>{y}</option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Daily Target (INR)</label>
                      <input type="number" value={dailyTarget} onChange={e => setDailyTarget(e.target.value)} style={inputStyle} placeholder="e.g. 50000" />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Weekly Target (INR)</label>
                      <input type="number" value={weeklyTarget} onChange={e => setWeeklyTarget(e.target.value)} style={inputStyle} placeholder="e.g. 300000" />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <label style={labelStyle}>Monthly Target (INR)</label>
                      <input type="number" value={monthlyTarget} onChange={e => setMonthlyTarget(e.target.value)} style={inputStyle} placeholder="e.g. 1500000" />
                    </div>

                    <button type="submit" style={{ width: '100%', background: '#402070', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                      💾 Save Targets
                    </button>
                  </form>
                </div>

                {/* RIGHT: View Progress */}
                <div className="dash-card" style={{ flex: 2, minWidth: 400, padding: 24 }}>
                  <h3 style={{ marginTop: 0, color: '#059669', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 20 }}>
                    2. View Target Progress
                  </h3>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 24 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Select Date to Evaluate</label>
                      <input type="date" value={evalDate} onChange={e => setEvalDate(e.target.value)} style={inputStyle} />
                    </div>
                    <button onClick={handleEvaluate} disabled={evalLoading} style={{ background: '#059669', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, cursor: evalLoading ? 'not-allowed' : 'pointer', fontSize: 14, opacity: evalLoading ? 0.7 : 1 }}>
                      {evalLoading ? 'Checking…' : '📊 Check Progress'}
                    </button>
                  </div>

                  {evalResult && (
                    <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 16px', color: '#1e293b' }}>Target Progress for {evalDate}</h4>
                      {renderProgressBar('Daily Target', evalResult.daily.achieved, evalResult.daily.target)}
                      {renderProgressBar('Weekly Target', evalResult.weekly.achieved, evalResult.weekly.target)}
                      {renderProgressBar('Monthly Target', evalResult.monthly.achieved, evalResult.monthly.target)}

                      <h4 style={{ margin: '24px 0 12px', color: '#1e293b' }}>Transactions on {evalDate}</h4>
                      {evalResult.transactions.length > 0 ? (
                        <table className="dash-table" style={{ fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th>Customer</th>
                              <th>Platform</th>
                              <th>Amount</th>
                              <th>Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {evalResult.transactions.map(t => (
                              <tr key={t.id}>
                                <td>{t.cust_name}</td>
                                <td>{t.platform}</td>
                                <td style={{ fontWeight: 600 }}>{fmtCurrency(t.amount)}</td>
                                <td>{new Date(t.created_at).toLocaleTimeString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ color: '#64748b', fontSize: 13 }}>No transactions found for this date.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Row 2: All Assigned Targets Table ── */}
              <div className="dash-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14, marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: 17 }}>
                      📋 Assigned Targets — {MONTHS[month - 1]} {year}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                      All targets set for your branch employees this period
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {/* month/year quick pickers */}
                    <select value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}>
                      {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y =>
                        <option key={y} value={y}>{y}</option>
                      )}
                    </select>
                    <button onClick={fetchAllTargets} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>
                      🔄 Refresh
                    </button>
                  </div>
                </div>

                {targetsLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 14 }}>Loading targets…</div>
                ) : allTargets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>No targets assigned for {MONTHS[month - 1]} {year}</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Use the form above to set targets for employees.</div>
                  </div>
                ) : (
                  <table className="dash-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={thStyle}>Employee</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Daily Target</th>
                        <th style={thStyle}>Weekly Target</th>
                        <th style={thStyle}>Monthly Target</th>
                        <th style={thStyle}>Last Updated</th>
                        <th style={thStyle}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTargets.map((row) => {
                        const status = getTargetStatus(row)
                        const monthly = parseFloat(row.target_amount || row.monthly_target || 0)
                        const daily   = parseFloat(row.daily_target || 0)
                        const weekly  = parseFloat(row.weekly_target || 0)

                        return (
                          <tr key={row.user_id || row.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                          >
                            {/* Employee */}
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 34, height: 34, borderRadius: 10,
                                  background: 'linear-gradient(135deg, #402070, #6b21a8)',
                                  color: '#fff', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0
                                }}>
                                  {(row.employee_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{row.employee_name || '—'}</div>
                                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{row.branch || ''}</div>
                                </div>
                              </div>
                            </td>

                            {/* Status badge */}
                            <td style={tdStyle}>
                              <span style={{
                                display: 'inline-block', padding: '3px 10px',
                                borderRadius: 20, fontSize: 11, fontWeight: 700,
                                background: status.bg, color: status.color
                              }}>
                                {status.label}
                              </span>
                            </td>

                            {/* Daily */}
                            <td style={tdStyle}>
                              {daily > 0 ? (
                                <div style={{ fontWeight: 700, color: '#402070' }}>{fmtCurrency(daily)}</div>
                              ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>Not set</span>}
                            </td>

                            {/* Weekly */}
                            <td style={tdStyle}>
                              {weekly > 0 ? (
                                <div style={{ fontWeight: 700, color: '#402070' }}>{fmtCurrency(weekly)}</div>
                              ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>Not set</span>}
                            </td>

                            {/* Monthly */}
                            <td style={tdStyle}>
                              {monthly > 0 ? (
                                <div>
                                  <div style={{ fontWeight: 700, color: '#059669' }}>{fmtCurrency(monthly)}</div>
                                  <ProgressBar pct={0} success={false} />
                                </div>
                              ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>Not set</span>}
                            </td>

                            {/* Updated */}
                            <td style={{ ...tdStyle, fontSize: 12, color: '#64748b' }}>
                              {row.updated_at
                                ? new Date(row.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '—'}
                            </td>

                            {/* Edit shortcut */}
                            <td style={tdStyle}>
                              <button
                                onClick={() => {
                                  setSelectedEmpId(row.user_id)
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                style={{
                                  padding: '6px 14px', borderRadius: 6,
                                  border: '1.5px solid #402070', background: 'transparent',
                                  color: '#402070', fontWeight: 700, cursor: 'pointer', fontSize: 12
                                }}
                              >
                                ✏️ Edit
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}

                {/* Summary footer */}
                {allTargets.length > 0 && (
                  <div style={{ display: 'flex', gap: 20, marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                    <SummaryPill
                      label="Total Employees"
                      value={allTargets.length}
                      color="#402070"
                    />
                    <SummaryPill
                      label="Fully Configured"
                      value={allTargets.filter(r => parseFloat(r.target_amount || r.monthly_target || 0) > 0).length}
                      color="#059669"
                    />
                    <SummaryPill
                      label="Not Yet Set"
                      value={allTargets.filter(r => parseFloat(r.target_amount || r.monthly_target || 0) === 0 && parseFloat(r.daily_target || 0) === 0).length}
                      color="#dc2626"
                    />
                    <SummaryPill
                      label="Avg Monthly Target"
                      value={fmtCurrency(
                        allTargets.reduce((s, r) => s + parseFloat(r.target_amount || r.monthly_target || 0), 0) / (allTargets.length || 1)
                      )}
                      color="#d97706"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}:</span>
      <span style={{ fontSize: 13, fontWeight: 800, color }}>{value}</span>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: 13 }
const thStyle = { padding: '10px 14px', fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }
const tdStyle = { padding: '12px 14px', verticalAlign: 'middle' }
