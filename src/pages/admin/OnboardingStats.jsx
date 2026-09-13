import React, { useState, useEffect, useCallback } from 'react'
import AdminSidebar from '../../components/admin/AdminSidebar'
import { getTokenByRole } from '../../utils/tokenUtils'
import { api } from '../../utils/api'
import '../../pages/dashboard.css'
import { MdPeople, MdVisibility, MdClose } from 'react-icons/md'

const auth = () => ({ Authorization: `Bearer ${getTokenByRole('admin')}` })
const fmt = n => Number(n || 0).toLocaleString('en-IN')

const today = new Date().toISOString().split('T')[0]
const monthStart = today.slice(0, 7) + '-01'

export default function OnboardingStats() {
  const [period, setPeriod] = useState('this_month')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all') // 'all', 'new_onboard', 'profile_update'
  
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal state
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [empCustomers, setEmpCustomers] = useState([])
  const [modalLoading, setModalLoading] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    let qFrom = from, qTo = to
    if (period === 'this_month') {
      qFrom = monthStart
      qTo = today
    }
    
    api(`/dashboard/admin/onboarding-stats?from=${qFrom}&to=${qTo}`, { headers: auth() })
      .then(res => {
        setSummary(res.summary || [])
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [period, from, to])

  useEffect(() => { loadData() }, [loadData])

  const openDetailedModal = (empId, empName) => {
    setSelectedEmp({ id: empId, name: empName })
    setModalLoading(true)
    
    let qFrom = from, qTo = to
    if (period === 'this_month') {
      qFrom = monthStart
      qTo = today
    }
    
    api(`/dashboard/admin/onboarding-stats?from=${qFrom}&to=${qTo}&employee_id=${empId}`, { headers: auth() })
      .then(res => {
        setEmpCustomers(res.customers || [])
        setModalLoading(false)
      })
      .catch(err => {
        console.error(err)
        setModalLoading(false)
      })
  }

  // Filter the summary before displaying
  const displayedSummary = summary.filter(emp => {
    if (employeeFilter !== 'all' && emp.employee_id.toString() !== employeeFilter) return false
    return true
  })

  // Calculate totals
  const totalNewCustomers = displayedSummary.reduce((sum, emp) => sum + (emp.new_customers || 0), 0)
  const totalProfileUpdates = displayedSummary.reduce((sum, emp) => sum + (emp.profile_updates || 0), 0)

  const controlStyle = {
    padding: '8px 12px', borderRadius: 8, border: '1.5px solid rgba(64,32,112,0.2)', fontSize: 13, background: '#fff'
  }

  return (
    <div className="dash-page">
      <AdminSidebar />
      <div className="dash-content" style={{ background: '#f4f7fc' }}>
        
        {/* Topbar */}
        <div className="dash-topbar" style={{ padding: '20px 30px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 32, color: '#402070' }}><MdPeople /></div>
          <div>
            <h1 className="dash-topbar-title" style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Employee Onboarding Stats</h1>
            <p className="dash-topbar-sub" style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Track new customer onboardings and profile updates by employee</p>
          </div>
        </div>

        <div style={{ padding: '0 30px 30px' }}>
          
          {/* Summary Cards Row */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, background: '#fff1f2', borderRadius: 12, padding: '16px 20px', border: '1px solid #ffe4e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#be123c', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Total New Customers</div>
                <div style={{ color: '#881337', fontSize: 28, fontWeight: 800 }}>{fmt(totalNewCustomers)}</div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.2, color: '#be123c' }}>🆕</div>
            </div>
            <div style={{ flex: 1, background: '#f0fdfa', borderRadius: 12, padding: '16px 20px', border: '1px solid #ccfbf1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#0f766e', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Total Profile Updates</div>
                <div style={{ color: '#134e4a', fontSize: 28, fontWeight: 800 }}>{fmt(totalProfileUpdates)}</div>
              </div>
              <div style={{ fontSize: 32, opacity: 0.2, color: '#0f766e' }}>🔄</div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={controlStyle} value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
            
            {period === 'custom' && (
              <>
                <input type="date" style={controlStyle} value={from} onChange={e => setFrom(e.target.value)} />
                <span style={{ color: '#64748b' }}>to</span>
                <input type="date" style={controlStyle} value={to} onChange={e => setTo(e.target.value)} />
              </>
            )}

            <select style={controlStyle} value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
              <option value="all">All Employees</option>
              {summary.map(e => (
                <option key={e.employee_id} value={e.employee_id}>{e.employee_name}</option>
              ))}
            </select>

            <select style={controlStyle} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="new_onboard">New Onboards Only</option>
              <option value="profile_update">Profile Updates Only</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <table className="dash-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#61165e', color: '#fff' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, borderTopLeftRadius: 12 }}>EMPLOYEE NAME</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>NEW CUSTOMERS</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>PROFILE UPDATES</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 12, fontWeight: 700, borderTopRightRadius: 12 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</td></tr>
                ) : displayedSummary.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No records found.</td></tr>
                ) : (
                  displayedSummary.map((emp, i) => (
                    <tr key={emp.employee_id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#1e293b' }}>👤 {emp.employee_name}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <span style={{ background: '#fef2f2', color: '#991b1b', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{emp.new_customers || 0}</span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <span style={{ background: '#f0fdf4', color: '#166534', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{emp.profile_updates || 0}</span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <button 
                          onClick={() => openDetailedModal(emp.employee_id, emp.employee_name)}
                          style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <MdVisibility /> View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* ── Detailed Modal ── */}
      {selectedEmp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 900, borderRadius: 16, display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 800 }}>Customers Onboarded by {selectedEmp.name}</h2>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: 500 }}>
                  {period === 'this_month' ? 'This Month' : `${from} to ${to}`}
                </div>
              </div>
              <button onClick={() => setSelectedEmp(null)} style={{ background: '#e2e8f0', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#475569' }}><MdClose /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              {modalLoading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading detailed list...</div>
              ) : (
                empCustomers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>No customers found for this period.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '14px 24px', textAlign: 'left', color: '#475569', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Date</th>
                        <th style={{ padding: '14px 24px', textAlign: 'left', color: '#475569', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Customer Name</th>
                        <th style={{ padding: '14px 24px', textAlign: 'left', color: '#475569', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Phone / PAN</th>
                        <th style={{ padding: '14px 24px', textAlign: 'left', color: '#475569', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Branch</th>
                        <th style={{ padding: '14px 24px', textAlign: 'left', color: '#475569', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empCustomers.map((c, idx) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '14px 24px', fontSize: 13, color: '#64748b', fontWeight: 500 }}>{new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td style={{ padding: '14px 24px', fontWeight: 700, color: '#1e293b' }}>{c.name}</td>
                          <td style={{ padding: '14px 24px', fontSize: 13, color: '#475569' }}>
                            <div style={{ fontWeight: 600 }}>{c.phone}</div>
                            <div style={{ color: '#94a3b8', fontSize: 12 }}>{c.pan}</div>
                          </td>
                          <td style={{ padding: '14px 24px', fontSize: 13, color: '#475569', fontWeight: 500 }}>{c.branch}</td>
                          <td style={{ padding: '14px 24px' }}>
                            <span style={{ 
                              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-block',
                              background: c.status === 'approved' ? '#dcfce7' : c.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                              color: c.status === 'approved' ? '#166534' : c.status === 'rejected' ? '#991b1b' : '#92400e'
                            }}>
                              {c.status ? c.status.charAt(0).toUpperCase() + c.status.slice(1) : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
