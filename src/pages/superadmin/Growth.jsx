import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/superadmin/Sidebar'
import { api } from '../../utils/api'
import { getTokenByRole } from '../../utils/tokenUtils'
import './Dashboard.css'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const YEARS  = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i))

export default function SuperadminGrowth() {
  const [branches, setBranches] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  
  const istNow = new Date(Date.now() + 5.5 * 3600000)
  const [bMonth, setBMonth] = useState(String(istNow.getMonth() + 1).padStart(2, '0'))
  const [bYear, setBYear]   = useState(String(istNow.getFullYear()))
  
  const defaultPrevMonth = istNow.getMonth() === 0 ? 12 : istNow.getMonth()
  const defaultPrevYear = istNow.getMonth() === 0 ? istNow.getFullYear() - 1 : istNow.getFullYear()
  const [cMonth, setCMonth] = useState(String(defaultPrevMonth).padStart(2, '0'))
  const [cYear, setCYear]   = useState(String(defaultPrevYear))

  // View customers state
  const [viewCustomersEmp, setViewCustomersEmp] = useState(null)
  const [viewCustomersMonth, setViewCustomersMonth] = useState(null)
  const [viewCustomersYear, setViewCustomersYear] = useState(null)
  const [viewCustomersList, setViewCustomersList] = useState([])
  const [viewCustomersLoading, setViewCustomersLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api(`/dashboard/growth/superadmin?baseMonth=${bMonth}&baseYear=${bYear}&compareMonth=${cMonth}&compareYear=${cYear}`, {
      headers: { Authorization: `Bearer ${getTokenByRole('superadmin')}` }
    })
      .then(res => {
        setBranches(res?.branches || [])
        setEmployees(res?.employees || [])
        setError('')
      })
      .catch(e => setError(e.message || 'Failed to load growth data'))
      .finally(() => setLoading(false))
  }, [bMonth, bYear, cMonth, cYear])

  const handleViewCustomers = async (emp, month, year) => {
    setViewCustomersEmp(emp)
    setViewCustomersMonth(month)
    setViewCustomersYear(year)
    setViewCustomersLoading(true)
    try {
      const data = await api(`/dashboard/growth/superadmin/customers?employee_id=${emp.user_id}&month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${getTokenByRole('superadmin')}` }
      })
      setViewCustomersList(data)
    } catch (e) {
      alert(e.message)
    } finally {
      setViewCustomersLoading(false)
    }
  }

  const calculateGrowth = (current, prev) => {
    const curVal = Number(current)
    const prevVal = Number(prev)
    if (prevVal === 0 && curVal === 0) return { pct: 0, type: 'neutral' }
    if (prevVal === 0) return { pct: 100, type: 'positive' }
    
    const pct = ((curVal - prevVal) / prevVal) * 100
    if (pct > 0) return { pct: pct.toFixed(1), type: 'positive' }
    if (pct < 0) return { pct: Math.abs(pct).toFixed(1), type: 'negative' }
    return { pct: 0, type: 'neutral' }
  }

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0)

  return (
    <div className="sa-page">
      <Sidebar />
      <div className="sa-content">
        <div className="dash-topbar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16, padding: '20px 30px' }}>
          <div>
            <h1 className="dash-topbar-title">Growth & Degrowth</h1>
            <p className="dash-topbar-sub">Compare performance across branches and employees</p>
          </div>
          <div style={{ display: 'flex', gap: 24, width: '100%', flexWrap: 'wrap', background: 'rgba(64,32,112,0.03)', padding: 16, borderRadius: 12, border: '1px solid rgba(64,32,112,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#402070', width: 60 }}>Base:</span>
              <select value={bMonth} onChange={e => setBMonth(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid rgba(64,32,112,0.2)' }}>
                {MONTHS.map((m, i) => <option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}
              </select>
              <select value={bYear} onChange={e => setBYear(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid rgba(64,32,112,0.2)' }}>
                {YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#402070', width: 60 }}>Compare:</span>
              <select value={cMonth} onChange={e => setCMonth(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid rgba(64,32,112,0.2)' }}>
                {MONTHS.map((m, i) => <option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}
              </select>
              <select value={cYear} onChange={e => setCYear(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid rgba(64,32,112,0.2)' }}>
                {YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="sa-main">
          {error && <div className="sa-alert sa-alert-error">❌ {error}</div>}

          {/* Branches Table */}
          <div className="sa-card" style={{ marginBottom: 24 }}>
            <div className="sa-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Branch Comparison</h2>
              <button 
                onClick={() => handleViewCustomers({ user_id: 'all', employee_name: 'All Branches' }, bMonth, bYear)}
                style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                View All System Customers
              </button>
            </div>
            
            <div className="sa-table-wrap">
              {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading metrics...</div> : (
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Vol (Compare)</th>
                      <th>Vol (Base)</th>
                      <th>Vol Growth</th>
                      <th>Cust (Compare)</th>
                      <th>Cust (Base)</th>
                      <th>Cust Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.length ? branches.map(b => {
                      const vGrowth = calculateGrowth(b.base_vol, b.compare_vol)
                      const cGrowth = calculateGrowth(b.base_cust, b.compare_cust)
                      return (
                        <tr key={b.branch_id}>
                          <td><strong>{b.branch_name}</strong></td>
                          <td style={{ color: '#64748b' }}>{formatCurrency(b.compare_vol)}</td>
                          <td style={{ fontWeight: 'bold' }}>{formatCurrency(b.base_vol)}</td>
                          <td>
                            {vGrowth.type === 'positive' && <span style={{ color: '#059669', fontWeight: 600, background: '#d1fae5', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>📈 +{vGrowth.pct}%</span>}
                            {vGrowth.type === 'negative' && <span style={{ color: '#dc2626', fontWeight: 600, background: '#fee2e2', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>📉 -{vGrowth.pct}%</span>}
                            {vGrowth.type === 'neutral'  && <span style={{ color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>➖ 0%</span>}
                          </td>
                          <td style={{ color: '#64748b' }}>{b.compare_cust}</td>
                          <td style={{ fontWeight: 'bold' }}>{b.base_cust}</td>
                          <td>
                            {cGrowth.type === 'positive' && <span style={{ color: '#059669', fontWeight: 600, background: '#d1fae5', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>📈 +{cGrowth.pct}%</span>}
                            {cGrowth.type === 'negative' && <span style={{ color: '#dc2626', fontWeight: 600, background: '#fee2e2', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>📉 -{cGrowth.pct}%</span>}
                            {cGrowth.type === 'neutral'  && <span style={{ color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>➖ 0%</span>}
                          </td>
                        </tr>
                      )
                    }) : <tr><td colSpan={7} className="sa-empty">No branch data available</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Employees Table */}
          <div className="sa-card">
            <div className="sa-card-header">
              <h2>Employee Comparison</h2>
            </div>
            
            <div className="sa-table-wrap">
              {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading metrics...</div> : (
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Branch</th>
                      <th>Vol (Compare)</th>
                      <th>Vol (Base)</th>
                      <th>Vol Growth</th>
                      <th>Cust (Compare)</th>
                      <th>Cust (Base)</th>
                      <th>Cust Growth</th>
                      <th style={{ width: 100 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length ? employees.map(e => {
                      const vGrowth = calculateGrowth(e.base_vol, e.compare_vol)
                      const cGrowth = calculateGrowth(e.base_cust, e.compare_cust)
                      return (
                        <tr key={e.user_id}>
                          <td><strong>{e.employee_name}</strong></td>
                          <td><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{e.branch || 'Unknown'}</span></td>
                          <td style={{ color: '#64748b' }}>{formatCurrency(e.compare_vol)}</td>
                          <td style={{ fontWeight: 'bold' }}>{formatCurrency(e.base_vol)}</td>
                          <td>
                            {vGrowth.type === 'positive' && <span style={{ color: '#059669', fontWeight: 600, background: '#d1fae5', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>📈 +{vGrowth.pct}%</span>}
                            {vGrowth.type === 'negative' && <span style={{ color: '#dc2626', fontWeight: 600, background: '#fee2e2', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>📉 -{vGrowth.pct}%</span>}
                            {vGrowth.type === 'neutral'  && <span style={{ color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>➖ 0%</span>}
                          </td>
                          <td style={{ color: '#64748b' }}>{e.compare_cust}</td>
                          <td style={{ fontWeight: 'bold' }}>{e.base_cust}</td>
                          <td>
                            {cGrowth.type === 'positive' && <span style={{ color: '#059669', fontWeight: 600, background: '#d1fae5', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>📈 +{cGrowth.pct}%</span>}
                            {cGrowth.type === 'negative' && <span style={{ color: '#dc2626', fontWeight: 600, background: '#fee2e2', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>📉 -{cGrowth.pct}%</span>}
                            {cGrowth.type === 'neutral'  && <span style={{ color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>➖ 0%</span>}
                          </td>
                          <td>
                            <button 
                              onClick={() => handleViewCustomers(e, bMonth, bYear)}
                              style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                              View Customers
                            </button>
                          </td>
                        </tr>
                      )
                    }) : <tr><td colSpan={9} className="sa-empty">No employee data available</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewCustomersEmp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 600, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#402070' }}>
                Customers for {viewCustomersEmp.employee_name} ({MONTHS[viewCustomersMonth - 1]} {viewCustomersYear})
              </h3>
              <button onClick={() => setViewCustomersEmp(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {viewCustomersLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading customers...</div>
              ) : (
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewCustomersList.length > 0 ? viewCustomersList.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td>{c.phone}</td>
                        <td>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, 
                            background: c.status === 'approved' ? '#dcfce7' : c.status === 'pending' ? '#fef9c3' : '#fee2e2',
                            color: c.status === 'approved' ? '#166534' : c.status === 'pending' ? '#854d0e' : '#991b1b'
                          }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>No customers found for this period.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

