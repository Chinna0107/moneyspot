import React, { useState } from 'react'
import Sidebar from '../../components/superadmin/Sidebar'
import CloudinaryUpload from '../../components/shared/CloudinaryUpload'
import { useEmployees, useBranches } from '../../hooks/useSuperAdmin'
import './superadmin.css'

import { api } from '../../utils/api'
import { getTokenByRole } from '../../utils/tokenUtils'

const auth = () => ({ Authorization: `Bearer ${getTokenByRole('superadmin')}` })
const allServices = ["Domestic Money Transfer", "Bill Pay + Withdrawal", "Card Withdrawal", "AEPS", "Cibil Enquiry Fees"];
const allFeatures = ["Customer Requests", "Attendance", "All Transactions", "Expenses Management", "Pending Payments", "Customer Reminders"];
const empty = { name: '', email: '', mobile: '', pan: '', aadhar: '', branch: '', password: '', confirm_password: '', mpin: '', is_admin: false, role: '', pan_img_url: '', aadhar_img_url: '', docx_url: '', resume_url: '', photo_url: '' }

function EditPermissionsModal({ emp, onClose }) {
  const [perms, setPerms] = useState({ 
    services: emp.permissions?.services || [], 
    features: emp.permissions?.features || [] 
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await api(`/dashboard/employees/${emp.id}/permissions`, {
        method: 'PATCH',
        headers: auth(),
        body: JSON.stringify({ permissions: perms })
      })
      setMsg('✅ Permissions updated successfully')
      emp.permissions = perms
    } catch (err) {
      setMsg('❌ ' + err.message)
    }
    setSaving(false)
  }

  const toggleService = s => setPerms(p => ({ ...p, services: p.services.includes(s) ? p.services.filter(x => x !== s) : [...p.services, s] }))
  const toggleFeature = f => setPerms(p => ({ ...p, features: p.features.includes(f) ? p.features.filter(x => x !== f) : [...p.features, f] }))

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:660, maxHeight:'90vh', overflowY:'auto', padding:24, boxShadow:'0 32px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h2 style={{ margin:0, color:'#1a0a2e' }}>Edit Permissions: {emp.name}</h2>
          <button onClick={onClose} style={{ background:'transparent', border:'none', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        
        {msg && <div className={msg.includes('✅') ? "sa-alert sa-alert-success" : "sa-alert sa-alert-error"} style={{ marginBottom: 16 }}>{msg}</div>}
        
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1.5px solid #e2e8f0', marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#1e293b' }}>Authorized Services</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {allServices.map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, background: '#fff', padding: '6px 12px', borderRadius: 20, border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                <input type="checkbox" checked={perms.services.includes(s)} onChange={() => toggleService(s)} />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1.5px solid #e2e8f0', marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#1e293b' }}>Authorized Features</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {allFeatures.map(f => (
              <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, background: '#fff', padding: '6px 12px', borderRadius: 20, border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                <input type="checkbox" checked={perms.features.includes(f)} onChange={() => toggleFeature(f)} />
                {f}
              </label>
            ))}
          </div>
        </div>

        <button className="sa-btn sa-btn-primary" onClick={handleSave} disabled={saving} style={{ width:'100%' }}>
          {saving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>
    </div>
  )
}

export default function EmployeesData() {
  const { employees, loading, error, msg, addEmployee, toggleStatus, deleteUser } = useEmployees()
  const { branches } = useBranches()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(empty)
  const [saving, setSaving]     = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [editPerms, setEditPerms] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId]       = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleEditClick = (emp) => {
    setForm({
      ...empty,
      ...emp,
      password: '',
      confirm_password: ''
    })
    setEditId(emp.id)
    setIsEditing(true)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setForm(empty)
    setIsEditing(false)
    setEditId(null)
    setShowForm(false)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    if (isEditing) {
      try {
        await api(`/dashboard/employees/${editId}`, {
          method: 'PUT',
          headers: auth(),
          body: JSON.stringify(form)
        })
        setForm(empty)
        setIsEditing(false)
        setEditId(null)
        setShowForm(false)
        window.location.reload()
      } catch (err) {
        alert(err.message)
      }
    } else {
      const ok = await addEmployee(form)
      if (ok) { setForm(empty); setShowForm(false) }
    }
    setSaving(false)
  }

  return (
    <div className="sa-page">
      <Sidebar />
      <div className="sa-content">
        <div className="sa-topbar">
          <h1>Manage Employees</h1>
          <div className="sa-topbar-right">
            <button className="sa-btn sa-btn-primary" onClick={() => showForm ? handleCancelForm() : setShowForm(true)}>
              {showForm ? '✕ Cancel' : '+ Add Employee'}
            </button>
          </div>
        </div>

        <div className="sa-main">
          {msg   && <div className="sa-alert sa-alert-success">✅ {msg}</div>}
          {error && <div className="sa-alert sa-alert-error">❌ {error}</div>}

          {showForm && (
            <div className="sa-card" style={{ marginBottom: 24 }}>
              <div className="sa-card-header"><h2>{isEditing ? 'Edit Employee Details' : 'New Employee Details'}</h2></div>
              <div className="sa-card-body">
                <form onSubmit={handleSubmit}>
                  <div className="sa-form-grid">
                    <div className="sa-form-group">
                      <label>Full Name *</label>
                      <input required placeholder="Full Name" value={form.name} onChange={e => set('name', e.target.value)} />
                    </div>
                    <div className="sa-form-group">
                      <label>Email *</label>
                      <input required type="email" placeholder="employee@moneyspot.com" value={form.email} onChange={e => set('email', e.target.value)} />
                    </div>
                    <div className="sa-form-group">
                      <label>Mobile Number *</label>
                      <input required placeholder="10-digit mobile" maxLength={10} value={form.mobile}
                        onChange={e => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                    </div>
                    <div className="sa-form-group">
                      <label>PAN Number *</label>
                      <input required placeholder="ABCDE1234F" maxLength={10} value={form.pan}
                        onChange={e => set('pan', e.target.value.toUpperCase())} />
                      {form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan) && (
                        <span style={{ color: '#dc2626', fontSize: 12 }}>Format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)</span>
                      )}
                    </div>
                    <div className="sa-form-group">
                      <label>Aadhar Number *</label>
                      <input required placeholder="12-digit Aadhar" maxLength={12} value={form.aadhar}
                        onChange={e => set('aadhar', e.target.value.replace(/\D/g, '').slice(0, 12))} />
                    </div>
                    <div className="sa-form-group">
                      <label>Branch / Location *</label>
                      <select required value={form.branch} onChange={e => set('branch', e.target.value)}>
                        <option value="">Select branch</option>
                        {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="sa-form-group">
                      <label>{isEditing ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                      <div style={{ position: 'relative' }}>
                        <input required={!isEditing} type={showPass ? 'text' : 'password'} placeholder={isEditing ? 'Leave blank to keep' : 'Create password'}
                          value={form.password} onChange={e => set('password', e.target.value)}
                          style={{ width: '100%', paddingRight: 40 }} />
                        <span onClick={() => setShowPass(v => !v)}
                          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 16 }}>
                          {showPass ? '🙈' : '👁️'}
                        </span>
                      </div>
                    </div>
                    <div className="sa-form-group">
                      <label>{isEditing ? 'Confirm New Password' : 'Confirm Password *'}</label>
                      <input required={!isEditing && !!form.password} type={showPass ? 'text' : 'password'} placeholder="Confirm password"
                        value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
                      {form.confirm_password && form.password !== form.confirm_password && (
                        <span style={{ color: '#dc2626', fontSize: 12 }}>Passwords do not match</span>
                      )}
                    </div>
                    <div className="sa-form-group">
                      <label>6-Digit MPIN *</label>
                      <input required type="password" inputMode="numeric" maxLength={6}
                        placeholder="••••••" value={form.mpin}
                        onChange={e => set('mpin', e.target.value.replace(/\D/g, '').slice(0, 6))} />
                    </div>
                    <div className="sa-form-group">
                      <label>Role / Designation</label>
                      <input placeholder="e.g. Cashier, Field Agent, Teller" value={form.role}
                        onChange={e => set('role', e.target.value)} />
                    </div>
                    <div className="sa-form-group" style={{ justifyContent: 'flex-end' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', fontSize: 14, fontWeight: 600 }}>
                        <input type="checkbox" checked={form.is_admin} onChange={e => set('is_admin', e.target.checked)} />
                        Grant Admin Access
                      </label>
                    </div>
                    <div className="sa-form-group">
                      <label>PAN Card Image</label>
                      <CloudinaryUpload label="PAN Card" icon="🆔" value={form.pan_img_url}
                        folder="moneyspot/employees" onUpload={(url) => set('pan_img_url', url)} />
                    </div>
                    <div className="sa-form-group">
                      <label>Aadhar Card Image</label>
                      <CloudinaryUpload label="Aadhar Card" icon="🪪" value={form.aadhar_img_url}
                        folder="moneyspot/employees" onUpload={(url) => set('aadhar_img_url', url)} />
                    </div>
                    <div className="sa-form-group">
                      <label>Document / ID Proof</label>
                      <CloudinaryUpload label="Document" icon="📋" value={form.docx_url}
                        folder="moneyspot/employees" onUpload={(url) => set('docx_url', url)} />
                    </div>
                    <div className="sa-form-group">
                      <label>Resume</label>
                      <CloudinaryUpload label="Resume" icon="📄" value={form.resume_url}
                        folder="moneyspot/employees" onUpload={(url) => set('resume_url', url)}
                        accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                    </div>
                    <div className="sa-form-group">
                      <label>Employee Photo</label>
                      <CloudinaryUpload label="Photo" icon="📸" value={form.photo_url}
                        folder="moneyspot/employees" onUpload={(url) => set('photo_url', url)}
                        accept="image/jpeg,image/png,image/webp" />
                    </div>
                  </div>
                  <button type="submit" className="sa-btn sa-btn-primary" style={{ width: '100%', padding: '14px', fontSize: 16 }}
                    disabled={saving || form.password !== form.confirm_password || !form.branch || (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan))}>
                    {saving ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? '✅ Update Employee' : '✅ Create Employee')}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="sa-card">
            <div className="sa-card-header"><h2>All Employees ({employees.length})</h2></div>
            <div className="sa-table-wrap">
              {loading ? <div className="sa-loading">Loading...</div> : (
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Email</th><th>Mobile</th><th>PAN</th>
                      <th>Branch</th><th>Role</th><th>Coins</th><th>Status</th><th>Joined</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length ? employees.map(emp => (
                      <tr key={emp.id}>
                        <td><strong>{emp.name}</strong></td>
                        <td>{emp.email}</td>
                        <td>{emp.mobile || '—'}</td>
                        <td>{emp.pan || '—'}</td>
                        <td>
                          {emp.branch
                            ? <span className="sa-status admin">{emp.branch}</span>
                            : <span style={{ color: '#9ca3af' }}>—</span>}
                        </td>
                        <td><span className="sa-status admin">{emp.is_admin ? 'Admin' : 'Employee'}</span></td>
                        <td>🪙 {emp.coins ?? 0}</td>
                        <td><span className={`sa-status ${emp.is_active ? 'active' : 'inactive'}`}>{emp.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>{new Date(emp.created_at).toLocaleDateString()}</td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          <button className="sa-btn sa-btn-primary sa-btn-sm" onClick={() => handleEditClick(emp)}>Edit</button>
                          <button className="sa-btn sa-btn-warning sa-btn-sm" onClick={() => toggleStatus(emp.id)}>
                            {emp.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          {!emp.is_admin && (
                            <button className="sa-btn sa-btn-primary sa-btn-sm" onClick={() => setEditPerms(emp)}>
                              Permissions
                            </button>
                          )}
                          <button className="sa-btn sa-btn-danger sa-btn-sm" onClick={() => deleteUser(emp.id)}>Delete</button>
                        </td>
                      </tr>
                    )) : <tr><td colSpan={10} className="sa-empty">No employees found</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          {editPerms && <EditPermissionsModal emp={editPerms} onClose={() => setEditPerms(null)} />}
        </div>
      </div>
    </div>
  )
}
