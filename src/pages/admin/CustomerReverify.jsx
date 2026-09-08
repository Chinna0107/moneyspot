import React, { useState } from 'react'
import AdminSidebar from '../../components/admin/AdminSidebar'
import { getTokenByRole } from '../../utils/tokenUtils'
import config from '../../config'
import toast from 'react-hot-toast'
import '../../pages/dashboard.css'
import './CustomerReverify.css'

const auth = () => ({ Authorization: `Bearer ${getTokenByRole('admin')}` })

export default function CustomerReverify() {
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  
  // Verification states
  const [form, setForm] = useState({})
  
  // OTP states
  const [otpSent, setOtpSent] = useState({ mobile: false, email: false, aadhar: false })
  const [otpVal, setOtpVal] = useState({ mobile: '', email: '', aadhar: '' })
  const [refId, setRefId] = useState({ aadhar: '' })

  const [saving, setSaving] = useState(false)

  const handleSearch = async () => {
    if (searchTerm.length < 2) return toast.error('Enter at least 2 characters')
    setLoading(true)
    try {
      const res = await fetch(`${config.API_URL}/customers/approved?search=${encodeURIComponent(searchTerm)}`, { headers: auth() })
      if (res.ok) {
        const data = await res.json()
        setCustomers(data)
      }
    } catch (e) {
      toast.error('Search failed')
    }
    setLoading(false)
  }

  const selectCustomer = (c) => {
    setSelectedCustomer(c)
    setForm({
      ...c,
      pan_verified: c.pan_verified || false,
      aadhar_verified: c.aadhar_verified || false,
      bank_verified: c.bank_verified || false,
      aadhar_img: null,
      pan_img: null,
      card_front_img: null,
      profile_image: null,
    })
    setOtpSent({ mobile: false, email: false, aadhar: false })
    setOtpVal({ mobile: '', email: '', aadhar: '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Verification calls
  const verifyPan = async () => {
    if (!form.pan) return toast.error('PAN is required')
    try {
      const res = await fetch(`${config.API_URL}/api/kyc/pan/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pan: form.pan })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setForm({ ...form, pan_verified: true, pan_name: data.full_name })
        toast.success(`PAN verified: ${data.full_name}`)
      } else throw new Error(data.error || 'PAN verification failed')
    } catch (e) { toast.error(e.message) }
  }

  const verifyBank = async () => {
    if (!form.acc_number || !form.ifsc_code) return toast.error('Account Number and IFSC required')
    try {
      const res = await fetch(`${config.API_URL}/api/kyc/bank/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number: form.acc_number, ifsc: form.ifsc_code })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setForm({ ...form, bank_verified: true, bank_verified_name: data.verified_name })
        toast.success(`Bank verified: ${data.verified_name}`)
      } else throw new Error(data.error || 'Bank verification failed')
    } catch (e) { toast.error(e.message) }
  }

  const sendAadharOtp = async () => {
    if (!form.aadhar) return toast.error('Aadhaar number required')
    try {
      const res = await fetch(`${config.API_URL}/api/kyc/aadhaar/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_number: form.aadhar })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const idToUse = data.data?.tranx_id || data.data?.data?.session_id || form.aadhar;
        console.log("Setting Aadhaar Ref ID:", idToUse);
        setRefId({ ...refId, aadhar: idToUse })
        setOtpSent({ ...otpSent, aadhar: true })
        toast.success('Aadhaar OTP sent')
      } else throw new Error(data.error || 'Failed to send Aadhaar OTP')
    } catch (e) { toast.error(e.message) }
  }

  const verifyAadharOtp = async () => {
    if (!otpVal.aadhar) return toast.error('Enter Aadhaar OTP')
    try {
      const clientId = refId.aadhar || form.aadhar;
      console.log("Verifying Aadhaar OTP with client_id:", clientId);
      const res = await fetch(`${config.API_URL}/api/kyc/aadhaar/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, otp: otpVal.aadhar })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setForm({ ...form, aadhar_verified: true, aadhar_linked_mobile: data.full_name })
        toast.success('Aadhaar verified successfully')
      } else throw new Error(data.error || 'Aadhaar OTP verification failed')
    } catch (e) { toast.error(e.message) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('pan_verified', form.pan_verified)
      fd.append('aadhar_verified', form.aadhar_verified)
      fd.append('bank_verified', form.bank_verified)
      fd.append('phone', form.phone)
      fd.append('email', form.email)
      fd.append('pan', form.pan)
      fd.append('aadhar', form.aadhar)
      fd.append('acc_number', form.acc_number)
      if (form.ifsc_code) fd.append('ifsc_code', form.ifsc_code)

      if (form.aadhar_img) fd.append('aadhar_img', form.aadhar_img)
      if (form.pan_img) fd.append('pan_img', form.pan_img)
      if (form.card_front_img) fd.append('card_front_img', form.card_front_img)
      if (form.profile_image) fd.append('profile_image', form.profile_image)

      const res = await fetch(`${config.API_URL}/customers/${selectedCustomer.id}/reverify`, {
        method: 'PUT',
        headers: auth(),
        body: fd
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Customer reverified and updated successfully')
        setSelectedCustomer(null)
      } else {
        throw new Error(data.error || 'Update failed')
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dash-page">
      <AdminSidebar />
      <div className="dash-content">
        <div className="dash-topbar">
          <div>
            <h1 style={{ margin: 0 }}>Customer Reverification</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Search and re-verify customer KYC details via APIs</p>
          </div>
        </div>

        <div className="dash-main">
          {!selectedCustomer ? (
            <div className="dash-card">
              <div className="dash-card-header"><h3>Search Customer</h3></div>
              <div className="dash-card-body">
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  <input 
                    type="text" 
                    className="dash-input" 
                    placeholder="Search by Name, PAN, or Phone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    style={{ flex: 1, maxWidth: 400 }}
                  />
                  <button className="dash-btn dash-btn-primary" onClick={handleSearch} disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {customers.length > 0 && (
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>PAN</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontFamily: 'monospace' }}>#{c.id}</td>
                          <td>{c.name}</td>
                          <td>{c.phone}</td>
                          <td style={{ fontFamily: 'monospace' }}>{c.pan}</td>
                          <td><span style={{ fontSize: 11, background: '#f8fafc', padding: '2px 8px', borderRadius: 10 }}>{c.status}</span></td>
                          <td>
                            <button className="dash-btn dash-btn-primary dash-btn-sm" onClick={() => selectCustomer(c)}>
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="dash-card reverify-container">
              <div className="dash-card-header reverify-header">
                <h3>Reverifying: {selectedCustomer.name} (#{selectedCustomer.id})</h3>
                <button className="dash-btn dash-btn-outline dash-btn-sm" onClick={() => setSelectedCustomer(null)}>Cancel</button>
              </div>
              <div className="dash-card-body">
                <div className="reverify-grid">
                  
                  {/* PAN Verification */}
                  <div className="reverify-box">
                    <h4 className="reverify-box-title">PAN Verification</h4>
                    <div className="reverify-input-group">
                      <input className="reverify-input" value={form.pan || ''} onChange={e => setForm({...form, pan: e.target.value, pan_verified: false})} placeholder="PAN Number" />
                      <button className="reverify-btn-outline" onClick={verifyPan}>Verify API</button>
                    </div>
                    <div>
                      Status: {form.pan_verified ? <span className="reverify-status status-verified">✅ Verified API</span> : <span className="reverify-status status-pending">⏳ Pending</span>}
                    </div>
                  </div>

                  {/* Aadhaar Verification */}
                  <div className="reverify-box">
                    <h4 className="reverify-box-title">Aadhaar Verification</h4>
                    <div className="reverify-input-group">
                      <input className="reverify-input" value={form.aadhar || ''} onChange={e => setForm({...form, aadhar: e.target.value, aadhar_verified: false})} placeholder="Aadhaar Number" />
                      <button className="reverify-btn-outline" onClick={sendAadharOtp} disabled={otpSent.aadhar}>Send OTP</button>
                    </div>
                    {otpSent.aadhar && (
                      <div className="reverify-input-group">
                        <input className="reverify-input" value={otpVal.aadhar} onChange={e => setOtpVal({...otpVal, aadhar: e.target.value})} placeholder="Enter OTP" />
                        <button className="reverify-btn-outline" onClick={verifyAadharOtp}>Verify OTP</button>
                      </div>
                    )}
                    <div>
                      Status: {form.aadhar_verified ? <span className="reverify-status status-verified">✅ Verified API</span> : <span className="reverify-status status-pending">⏳ Pending</span>}
                    </div>
                  </div>

                  {/* Bank Verification */}
                  <div className="reverify-box">
                    <h4 className="reverify-box-title">Bank Verification</h4>
                    <div className="reverify-input-group">
                      <input className="reverify-input" value={form.acc_number || ''} onChange={e => setForm({...form, acc_number: e.target.value, bank_verified: false})} placeholder="Account Number" />
                    </div>
                    <div className="reverify-input-group">
                      <input className="reverify-input" value={form.ifsc_code || ''} onChange={e => setForm({...form, ifsc_code: e.target.value, bank_verified: false})} placeholder="IFSC Code (Required for API)" />
                      <button className="reverify-btn-outline" onClick={verifyBank}>Verify API</button>
                    </div>
                    <div>
                      Status: {form.bank_verified ? <span className="reverify-status status-verified">✅ Verified API</span> : <span className="reverify-status status-pending">⏳ Pending</span>}
                    </div>
                  </div>

                  {/* Basic Info Update */}
                  <div className="reverify-box">
                    <h4 className="reverify-box-title">Contact Details</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input className="reverify-input" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Mobile Number" />
                      <input className="reverify-input" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email Address" />
                    </div>
                  </div>
                </div>

                {/* Document Uploads */}
                <div className="reverify-docs-section">
                  <h4 className="reverify-box-title" style={{ marginBottom: '20px' }}>Update Documents (Optional)</h4>
                  <div className="reverify-docs-grid">
                    <div className="reverify-file-upload">
                      <label className="reverify-file-label">New Aadhaar Image</label>
                      <input type="file" className="reverify-file-input" onChange={e => setForm({...form, aadhar_img: e.target.files[0]})} />
                    </div>
                    <div className="reverify-file-upload">
                      <label className="reverify-file-label">New PAN Image</label>
                      <input type="file" className="reverify-file-input" onChange={e => setForm({...form, pan_img: e.target.files[0]})} />
                    </div>
                    <div className="reverify-file-upload">
                      <label className="reverify-file-label">New Profile Image</label>
                      <input type="file" className="reverify-file-input" onChange={e => setForm({...form, profile_image: e.target.files[0]})} />
                    </div>
                  </div>
                </div>

                <div className="reverify-save-action">
                  <button className="reverify-save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving Updates...' : 'Save Re-verification Data'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
