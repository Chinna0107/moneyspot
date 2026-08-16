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
            <div className="sa-card-header">
              <h2>Branch Comparison</h2>
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
                        </tr>
                      )
                    }) : <tr><td colSpan={8} className="sa-empty">No employee data available</td></tr>}
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
