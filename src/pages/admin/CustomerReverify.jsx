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
  
  // New states for Unverified tracking based on missing fields
  const [counts, setCounts] = useState({ total_unverified: 0, missing_dob: 0, missing_ifsc: 0, missing_father_name: 0 })
  const [activeFilter, setActiveFilter] = useState('') // '', 'dob', 'ifsc', 'father_name'

  // Verification states
  const [form, setForm] = useState({})
  
  // OTP states
  const [otpSent, setOtpSent] = useState({ mobile: false, email: false, aadhar: false })
  const [otpVal, setOtpVal] = useState({ mobile: '', email: '', aadhar: '' })
  const [refId, setRefId] = useState({ aadhar: '' })

  const [saving, setSaving] = useState(false)

  // Fetch unverified customers on load and when filter changes
  const fetchUnverified = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${config.API_URL}/customers/unverified?filter=${activeFilter}`, { headers: auth() })
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers || [])
        setCounts(data.counts || { total_unverified: 0, missing_dob: 0, missing_ifsc: 0, missing_father_name: 0 })
      }
    } catch (e) {
      toast.error('Failed to load customers')
    }
    setLoading(false)
  }

  React.useEffect(() => {
    fetchUnverified()
  }, [activeFilter])

  const selectCustomer = (c) => {
    setSelectedCustomer(c)
    setForm({
      ...c,
      pan_verified: c.pan_verified || false,
      aadhar_verified: c.aadhar_verified || false,
      bank_verified: c.bank_verified || false,
      dob: c.dob || '',
      ifsc_code: c.ifsc_code || '',
      father_name: c.father_name || '',
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
        // Extract dob and father_name if returned by API
        const dob = data.data?.data?.dob || data.data?.dob || form.dob;
        const father_name = data.data?.data?.father_name || data.data?.father_name || form.father_name;
        setForm({ ...form, pan_verified: true, pan_name: data.full_name, dob, father_name })
        toast.success(`PAN verified: ${data.full_name || 'Success'}`)
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
        toast.success(`Bank verified: ${data.verified_name || 'Success'}`)
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
      const res = await fetch(`${config.API_URL}/api/kyc/aadhaar/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, otp: otpVal.aadhar })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const dob = data.data?.data?.dob || data.data?.dob || form.dob;
        const father_name = data.data?.data?.father_name || data.data?.father_name || form.father_name;
        const rawAddr = data.data?.data?.address || data.data?.address;
        const address = typeof rawAddr === 'string' ? rawAddr : (rawAddr?.full || rawAddr?.combined_address || rawAddr?.complete_address || form.address);
        setForm({ ...form, aadhar_verified: true, aadhar_linked_mobile: data.full_name, dob, father_name, address })
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
      fd.append('phone', form.phone || '')
      fd.append('email', form.email || '')
      fd.append('pan', form.pan || '')
      fd.append('aadhar', form.aadhar || '')
      fd.append('acc_number', form.acc_number || '')
      if (form.ifsc_code) fd.append('ifsc_code', form.ifsc_code)
      if (form.dob) fd.append('dob', form.dob)
      if (form.father_name) fd.append('father_name', form.father_name)
      if (form.address) fd.append('address', form.address)

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
        fetchUnverified() // Refresh the list
      } else {
        throw new Error(data.error || 'Update failed')
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredCustomers = customers.filter(c => 
    !searchTerm || 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.pan?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  )

  return (
    <div className="dash-page">
      <AdminSidebar />
      <div className="dash-content">
        <div className="dash-topbar">
          <div>
            <h1 style={{ margin: 0 }}>Customer Reverification</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Verify via API to fetch and update missing DOB, IFSC, and Father Name</p>
          </div>
        </div>

        <div className="dash-main">
          {!selectedCustomer ? (
            <>
              {/* Summary Dashboard */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div 
                  className={`summary-card ${activeFilter === '' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('')}>
                  <div className="summary-value">{counts.total_unverified || 0}</div>
                  <div className="summary-label">Total Missing Details</div>
                </div>
                
                <div 
                  className={`summary-card ${activeFilter === 'dob' ? 'active-pan' : ''}`}
                  onClick={() => setActiveFilter('dob')}>
                  <div className="summary-value danger">{counts.missing_dob || 0}</div>
                  <div className="summary-label danger">Missing DOB</div>
                </div>

                <div 
                  className={`summary-card ${activeFilter === 'ifsc' ? 'active-aadhar' : ''}`}
                  onClick={() => setActiveFilter('ifsc')}>
                  <div className="summary-value danger">{counts.missing_ifsc || 0}</div>
                  <div className="summary-label danger">Missing IFSC</div>
                </div>

                <div 
                  className={`summary-card ${activeFilter === 'father_name' ? 'active-bank' : ''}`}
                  onClick={() => setActiveFilter('father_name')}>
                  <div className="summary-value danger">{counts.missing_father_name || 0}</div>
                  <div className="summary-label danger">Missing Father Name</div>
                </div>
              </div>

              {/* Search & List */}
              <div className="dash-card">
                <div className="dash-card-header" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Customer List</h3>
                  <input 
                    type="text" 
                    placeholder="Search name, phone, PAN..." 
                    className="dash-input" 
                    style={{ maxWidth: 300 }}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="dash-table-container">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Missing</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                      ) : filteredCustomers.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No customers missing details.</td></tr>
                      ) : (
                        filteredCustomers.map(c => {
                          const missing = [];
                          if (!c.dob) missing.push('DOB');
                          if (!c.ifsc_code) missing.push('IFSC');
                          if (!c.father_name) missing.push('Father Name');

                          return (
                            <tr key={c.id}>
                              <td>{new Date(c.created_at).toLocaleDateString()}</td>
                              <td>
                                <strong>{c.name}</strong><br/>
                                <span style={{ fontSize: 11, color: '#64748b' }}>{c.pan}</span>
                              </td>
                              <td>{c.phone}</td>
                              <td><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                              <td>
                                <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 12 }}>
                                  {missing.length > 0 ? missing.join(', ') : 'None'}
                                </span>
                              </td>
                              <td>
                                <button className="dash-btn" onClick={() => selectCustomer(c)}>Select</button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="reverify-container">
              <div className="reverify-header">
                <h3>Verifying: {selectedCustomer.name} (#{selectedCustomer.id})</h3>
                <button className="dash-btn dash-btn-outline" onClick={() => setSelectedCustomer(null)}>Cancel</button>
              </div>

              <div className="reverify-grid">

                {/* PAN Verification */}
                <div className="reverify-box">
                  <h4 className="reverify-box-title">PAN Verification (Fetches DOB & Father Name)</h4>
                  <div className="reverify-input-group">
                    <input className="reverify-input" value={form.pan || ''} onChange={e => setForm({...form, pan: e.target.value, pan_verified: false})} placeholder="PAN Number" disabled={form.pan_verified} />
                    <button className="reverify-btn-outline" onClick={verifyPan} disabled={form.pan_verified}>Verify API</button>
                  </div>
                  <div>
                    Status: {form.pan_verified ? <span className="reverify-status status-verified">✅ Verified API</span> : <span className="reverify-status status-pending">⏳ Pending</span>}
                  </div>
                </div>

                {/* Aadhaar Verification */}
                <div className="reverify-box">
                  <h4 className="reverify-box-title">Aadhaar Verification</h4>
                  <div className="reverify-input-group">
                    <input className="reverify-input" value={form.aadhar || ''} onChange={e => setForm({...form, aadhar: e.target.value, aadhar_verified: false})} placeholder="Aadhaar Number" disabled={form.aadhar_verified} />
                    <button className="reverify-btn-outline" onClick={sendAadharOtp} disabled={otpSent.aadhar || form.aadhar_verified}>Send OTP</button>
                  </div>
                  {otpSent.aadhar && !form.aadhar_verified && (
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
                    <input className="reverify-input" value={form.acc_number || ''} onChange={e => setForm({...form, acc_number: e.target.value, bank_verified: false})} placeholder="Account Number" disabled={form.bank_verified} />
                  </div>
                  <div className="reverify-input-group">
                    <input className="reverify-input" value={form.ifsc_code || ''} onChange={e => setForm({...form, ifsc_code: e.target.value, bank_verified: false})} placeholder="IFSC Code" disabled={form.bank_verified} />
                    <button className="reverify-btn-outline" onClick={verifyBank} disabled={form.bank_verified}>Verify API</button>
                  </div>
                  <div>
                    Status: {form.bank_verified ? <span className="reverify-status status-verified">✅ Verified API</span> : <span className="reverify-status status-pending">⏳ Pending</span>}
                  </div>
                </div>

                {/* Extracted Details */}
                <div className="reverify-box" style={{ gridColumn: '1 / -1' }}>
                  <h4 className="reverify-box-title">Extracted Details (Review before save)</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    <div className="reverify-input-group" style={{ flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Date of Birth (DOB)</label>
                      <input 
                        className="reverify-input" 
                        type="date"
                        value={form.dob || ''} 
                        onChange={e => setForm({ ...form, dob: e.target.value })} 
                      />
                    </div>
                    
                    <div className="reverify-input-group" style={{ flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>IFSC Code</label>
                      <input 
                        className="reverify-input" 
                        placeholder="Enter IFSC Code"
                        value={form.ifsc_code || ''} 
                        onChange={e => setForm({ ...form, ifsc_code: e.target.value })} 
                      />
                    </div>

                    <div className="reverify-input-group" style={{ flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Father Name</label>
                      <input 
                        className="reverify-input" 
                        placeholder="Enter Father Name"
                        value={form.father_name || ''} 
                        onChange={e => setForm({ ...form, father_name: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="reverify-save-action">
                <button className="reverify-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving Details...' : 'Save Verified Details'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
