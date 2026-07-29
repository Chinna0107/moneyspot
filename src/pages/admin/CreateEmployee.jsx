import React, { useState } from 'react'
import AdminSidebar from '../../components/admin/AdminSidebar'
import CloudinaryUpload from '../../components/shared/CloudinaryUpload'
import { getTokenByRole, getUserByRole } from '../../utils/tokenUtils'
import { api } from '../../utils/api'
import '../../pages/dashboard.css'

const empty = { name: '', email: '', mobile: '', pan: '', aadhar: '', password: '', confirm_password: '', mpin: '', is_admin: false, role: '', pan_img_url: '', aadhar_img_url: '', docx_url: '', resume_url: '', photo_url: '' }

export default function CreateEmployee() {
  const [form, setForm]     = useState(empty)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')
  const [error, setError]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const user = getUserByRole('admin')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true); setMsg(''); setError('')
    try {
      const r = await api('/dashboard/employees/add', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getTokenByRole('admin')}` },
        body: JSON.stringify(form),
      })
      setMsg(r.message); setForm(empty)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  return (
    <div className="dash-page">
      <AdminSidebar />
      <div className="dash-content">
        <div className="dash-topbar">
          <h1>Create Employee</h1>
          {user?.branch && (
            <div style={{ fontSize: 14, color: '#666' }}>Branch: <strong>{user.branch}</strong></div>
          )}
        </div>
        <div className="dash-main">
          {msg   && <div className="dash-alert dash-alert-success">✅ {msg}</div>}
          {error && <div className="dash-alert dash-alert-error">❌ {error}</div>}

          <div className="dash-card">
            <div className="dash-card-header"><h2>New Employee Details</h2></div>
            <div className="dash-card-body">
              <form onSubmit={handleSubmit}>
                <div className="dash-form-grid">
                  <div className="dash-form-group">
                    <label>Full Name *</label>
                    <input required placeholder="Full Name" value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                  <div className="dash-form-group">
                    <label>Email *</label>
                    <input required type="email" placeholder="employee@moneyspot.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className="dash-form-group">
                    <label>Mobile *</label>
                    <input required placeholder="10-digit mobile" maxLength={10} value={form.mobile}
                      onChange={e => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                  </div>
                  <div className="dash-form-group">
                    <label>PAN Number *</label>
                    <input required placeholder="ABCDE1234F" maxLength={10} value={form.pan}
                      onChange={e => set('pan', e.target.value.toUpperCase())} />
                    {form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan) && (
                      <span className="dash-field-hint">Format: 5 letters + 4 digits + 1 letter</span>
                    )}
                  </div>
                  <div className="dash-form-group">
                    <label>Aadhar Number *</label>
                    <input required placeholder="12-digit Aadhar" maxLength={12} value={form.aadhar}
                      onChange={e => set('aadhar', e.target.value.replace(/\D/g, '').slice(0, 12))} />
                  </div>
                  <div className="dash-form-group">
                    <label>Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input required type={showPass ? 'text' : 'password'} placeholder="Create password"
                        value={form.password} onChange={e => set('password', e.target.value)}
                        style={{ width: '100%', paddingRight: 40 }} />
                      <span onClick={() => setShowPass(v => !v)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}>
                        {showPass ? '🙈' : '👁️'}
                      </span>
                    </div>
                  </div>
                  <div className="dash-form-group">
                    <label>Confirm Password *</label>
                    <input required type={showPass ? 'text' : 'password'} placeholder="Confirm password"
                      value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
                    {form.confirm_password && form.password !== form.confirm_password && (
                      <span className="dash-field-hint">Passwords do not match</span>
                    )}
                  </div>
                  <div className="dash-form-group">
                    <label>6-Digit MPIN *</label>
                    <input required type="password" inputMode="numeric" maxLength={6}
                      placeholder="••••••" value={form.mpin}
                      onChange={e => set('mpin', e.target.value.replace(/\D/g, '').slice(0, 6))} />
                  </div>
                  <div className="dash-form-group">
                    <label>Role / Designation</label>
                    <input placeholder="e.g. Cashier, Field Agent, Teller" value={form.role}
                      onChange={e => set('role', e.target.value)} />
                  </div>
                  <div className="dash-form-group" style={{ justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', fontSize: 14, fontWeight: 600 }}>
                      <input type="checkbox" checked={form.is_admin} onChange={e => set('is_admin', e.target.checked)} />
                      Grant Admin Access
                    </label>
                  </div>
                  <div className="dash-form-group">
                    <label>PAN Card Image</label>
                    <CloudinaryUpload label="PAN Card" icon="🆔" value={form.pan_img_url}
                      folder="moneyspot/employees" onUpload={(url) => set('pan_img_url', url)} />
                  </div>
                  <div className="dash-form-group">
                    <label>Aadhar Card Image</label>
                    <CloudinaryUpload label="Aadhar Card" icon="🪪" value={form.aadhar_img_url}
                      folder="moneyspot/employees" onUpload={(url) => set('aadhar_img_url', url)} />
                  </div>
                  <div className="dash-form-group">
                    <label>Document / ID Proof</label>
                    <CloudinaryUpload label="Document" icon="📋" value={form.docx_url}
                      folder="moneyspot/employees" onUpload={(url) => set('docx_url', url)} />
                  </div>
                  <div className="dash-form-group">
                    <label>Resume</label>
                    <CloudinaryUpload label="Resume" icon="📄" value={form.resume_url}
                      folder="moneyspot/employees" onUpload={(url) => set('resume_url', url)}
                      accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                  </div>
                  <div className="dash-form-group">
                    <label>Employee Photo</label>
                    <CloudinaryUpload label="Photo" icon="📸" value={form.photo_url}
                      folder="moneyspot/employees" onUpload={(url) => set('photo_url', url)}
                      accept="image/jpeg,image/png,image/webp" />
                  </div>
                </div>
                <button type="submit" className="dash-btn dash-btn-primary"
                  disabled={saving || form.password !== form.confirm_password || (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan))}>
                  {saving ? 'Creating...' : '✅ Create Employee'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
