const fs = require('fs');
const file = '/Users/hemanthkancharla/Documents/zewotech/money/moneyspot/src/pages/admin/EmployeeDetails.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add states
const statesSearch = `  const [lightbox, setLightbox] = useState(null)`;
const statesReplace = `  const [lightbox, setLightbox] = useState(null)
  
  // Master Profile states
  const [masterData, setMasterData] = useState(null)
  const [masterLoad, setMasterLoad] = useState(false)
  const [editSalary, setEditSalary] = useState(false)
  const [editRole, setEditRole] = useState(false)
  const [newSalary, setNewSalary] = useState('')
  const [newRole, setNewRole] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(today)`;

if (content.includes(statesSearch) && !content.includes('masterData')) {
  content = content.replace(statesSearch, statesReplace);
}

// 2. Update handleTab and add methods
const handleTabSearch = `  const handleTab = t => {
    setTab(t)
    if (t === 'transactions') loadTxns()
    if (t === 'attendance')   loadAtt()
  }`;
const handleTabReplace = `  const loadMaster = useCallback(async () => {
    if (masterData) return
    setMasterLoad(true)
    try {
      const data = await api(\`/dashboard/employees/\${emp.id}/master-profile\`, { headers: auth() })
      setMasterData(data)
    } catch (e) { console.error(e) }
    setMasterLoad(false)
  }, [emp.id, masterData])

  const handleSaveSalary = async () => {
    if (!newSalary) return;
    try {
      await api(\`/dashboard/employees/\${emp.id}/salary\`, {
        method: 'PUT',
        headers: auth(),
        body: JSON.stringify({ new_salary: newSalary, effective_date: effectiveDate })
      })
      setEditSalary(false)
      setMasterData(null)
      loadMaster()
    } catch(e) { alert(e.message) }
  }

  const handleSaveRole = async () => {
    if (!newRole) return;
    try {
      await api(\`/dashboard/employees/\${emp.id}/role\`, {
        method: 'PUT',
        headers: auth(),
        body: JSON.stringify({ new_role: newRole, effective_date: effectiveDate })
      })
      setEditRole(false)
      setMasterData(null)
      loadMaster()
    } catch(e) { alert(e.message) }
  }

  const handleTab = t => {
    setTab(t)
    if (t === 'transactions') loadTxns()
    if (t === 'attendance')   loadAtt()
    if (t === 'master') {
      setMasterData(null);
      loadMaster();
    }
  }`;

if (content.includes(handleTabSearch)) {
  content = content.replace(handleTabSearch, handleTabReplace);
}

// 3. Update tabs array
const tabsSearch = `[['details','👤 Details'],['permissions','⚙️ Permissions'],['documents','🖼️ Documents'],['transactions','📋 Transactions'],['attendance','✅ Attendance']]`;
const tabsReplace = `[['details','👤 Details'],['master','👑 Master Profile'],['permissions','⚙️ Permissions'],['documents','🖼️ Documents'],['transactions','📋 Transactions'],['attendance','✅ Attendance']]`;

if (content.includes(tabsSearch)) {
  content = content.replace(tabsSearch, tabsReplace);
}

// 4. Add master tab JSX
const jsxSearch = `          {/* Permissions */}`;
const jsxReplace = `
          {/* Master Profile */}
          {tab === 'master' && (
            <div>
              {masterLoad ? <div className="dash-loading">Loading Master Profile...</div> : !masterData ? <div className="dash-empty">Failed to load</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  
                  {/* Master Details */}
                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, border: '1.5px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#1e293b' }}>Employee Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Joining Date</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{masterData.employee.joining_date ? new Date(masterData.employee.joining_date).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Employment Status</div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: masterData.employee.employment_status === 'Active' ? '#059669' : '#dc2626' }}>{masterData.employee.employment_status || 'Active'}</div>
                      </div>
                      
                      <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Current Role</div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#402070' }}>{masterData.employee.role || '—'}</div>
                        </div>
                        <button onClick={() => { setEditRole(true); setNewRole(masterData.employee.role || ''); setEffectiveDate(today) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Edit Role">✏️</button>
                      </div>

                      <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Current Salary</div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: '#059669' }}>{fmtV(masterData.employee.salary)}</div>
                        </div>
                        <button onClick={() => { setEditSalary(true); setNewSalary(masterData.employee.salary || ''); setEffectiveDate(today) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Edit Salary">✏️</button>
                      </div>
                    </div>
                  </div>

                  {/* Salary Update Modal inline */}
                  {editSalary && (
                    <div style={{ background: '#fef3c7', padding: 16, borderRadius: 12, border: '1px solid #fde68a' }}>
                      <h4 style={{ margin: '0 0 12px 0', color: '#b45309' }}>Update Salary</h4>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: '#92400e' }}>New Salary (₹)</label>
                          <input type="number" value={newSalary} onChange={e => setNewSalary(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #fcd34d', marginTop: 4, outline: 'none' }} placeholder="Enter new salary amount" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: '#92400e' }}>Effective Date</label>
                          <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #fcd34d', marginTop: 4, outline: 'none' }} />
                        </div>
                        <button onClick={handleSaveSalary} className="dash-btn" style={{ background: '#b45309', color: '#fff', padding: '8px 16px', height: 36 }}>Save</button>
                        <button onClick={() => setEditSalary(false)} className="dash-btn" style={{ background: '#fff', color: '#b45309', padding: '8px 16px', height: 36, border: '1px solid #fcd34d' }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Role Update Modal inline */}
                  {editRole && (
                    <div style={{ background: '#dbeafe', padding: 16, borderRadius: 12, border: '1px solid #bfdbfe' }}>
                      <h4 style={{ margin: '0 0 12px 0', color: '#1d4ed8' }}>Update Role</h4>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: '#1e3a8a' }}>New Role</label>
                          <input type="text" value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #93c5fd', marginTop: 4, outline: 'none' }} placeholder="e.g. Senior Manager" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: '#1e3a8a' }}>Effective Date</label>
                          <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #93c5fd', marginTop: 4, outline: 'none' }} />
                        </div>
                        <button onClick={handleSaveRole} className="dash-btn" style={{ background: '#1d4ed8', color: '#fff', padding: '8px 16px', height: 36 }}>Save</button>
                        <button onClick={() => setEditRole(false)} className="dash-btn" style={{ background: '#fff', color: '#1d4ed8', padding: '8px 16px', height: 36, border: '1px solid #93c5fd' }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Histories */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Salary History */}
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#475569' }}>Salary Change History</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {masterData.salary_history.length > 0 ? masterData.salary_history.map(h => (
                          <div key={h.id} style={{ background: '#fff', padding: 12, borderRadius: 8, borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtV(h.old_salary)} → <span style={{ color: '#059669' }}>{fmtV(h.new_salary)}</span></span>
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(h.effective_date).toLocaleDateString()}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Updated by <span style={{ fontWeight: 600 }}>{h.updated_by_name}</span> on {new Date(h.created_at).toLocaleDateString()}</div>
                          </div>
                        )) : <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No salary history</div>}
                      </div>
                    </div>
                    
                    {/* Role History */}
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#475569' }}>Role Change History</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {masterData.role_history.length > 0 ? masterData.role_history.map(h => (
                          <div key={h.id} style={{ background: '#fff', padding: 12, borderRadius: 8, borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 14, fontWeight: 700 }}>{h.old_role || 'None'} → <span style={{ color: '#2563eb' }}>{h.new_role}</span></span>
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(h.effective_date).toLocaleDateString()}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Updated by <span style={{ fontWeight: 600 }}>{h.updated_by_name}</span> on {new Date(h.created_at).toLocaleDateString()}</div>
                          </div>
                        )) : <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No role history</div>}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Permissions */}`;

if (content.includes(jsxSearch) && !content.includes('Master Profile')) {
  content = content.replace(jsxSearch, jsxReplace);
}

fs.writeFileSync(file, content);
console.log("Successfully patched EmployeeDetails.jsx with Master Profile tab");
