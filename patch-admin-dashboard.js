const fs = require('fs');
const path = '/Users/hemanthkancharla/Documents/zewotech/money/moneyspot/src/pages/admin/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add states for performance
const stateString = `  const [perfData, setPerfData] = useState(null)
  const [perfLoading, setPerfLoading] = useState(false)
  const [perfFilter, setPerfFilter] = useState('month') // today | month | custom
  const [perfCustomFrom, setPerfCustomFrom] = useState('')
  const [perfCustomTo, setPerfCustomTo] = useState('')

  const loadPerf = useCallback(() => {
    setPerfLoading(true)
    let qs = \`from=\${perfFilter}\`
    if (perfFilter === 'custom') {
      qs = \`from=\${perfCustomFrom}&to=\${perfCustomTo}\`
    }
    api(\`/dashboard/admin/performance?\${qs}\`, { headers: auth() })
      .then(d => { setPerfData(d); setPerfLoading(false) })
      .catch(() => setPerfLoading(false))
  }, [perfFilter, perfCustomFrom, perfCustomTo])

  useEffect(() => { loadPerf() }, [loadPerf])
`;

if (!content.includes('perfData')) {
  content = content.replace('const user = getUserByRole(\'admin\')', 'const user = getUserByRole(\'admin\')\n' + stateString);
}

const perfUI = `
          {/* Performance Section */}
          <div className="dash-card">
            <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>💳 Platform-wise Performance</h2>
              <div style={{ display: 'flex', gap: 10 }}>
                <select 
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                  value={perfFilter}
                  onChange={e => setPerfFilter(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Date</option>
                </select>
                {perfFilter === 'custom' && (
                  <>
                    <input type="date" value={perfCustomFrom} onChange={e => setPerfCustomFrom(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                    <input type="date" value={perfCustomTo} onChange={e => setPerfCustomTo(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                            width: \`\${Math.min(perfData.topEmployee.target_achievement, 100)}%\`, 
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
`;

if (!content.includes('Performance Section')) {
  content = content.replace('{/* Employee Performance */}', perfUI + '\n          {/* Employee Performance */}');
  fs.writeFileSync(path, content);
  console.log("Updated Admin Dashboard");
} else {
  console.log("Already updated");
}
