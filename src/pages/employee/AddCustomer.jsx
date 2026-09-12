import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import EmployeeSidebar from '../../components/employee/EmployeeSidebar'
import { useAddCustomer, useMyCustomers } from '../../hooks/useCustomers'
import { getUserByRole, getTokenByRole } from '../../utils/tokenUtils'
import { api } from '../../utils/api'
import config from '../../config'
import { MdVerifiedUser, MdCheckCircle, MdError, MdCloudUpload } from 'react-icons/md'
import '../../pages/dashboard.css'
import './AddCustomer.css'

const empty = {
  pan: '', pan_name: '', aadhar: '', phone: '', email: '', branch: '',
  acc_number: '', ifsc_code: '', bank_verified_name: '', cibil_score: '',
  aadhar_img_url: '', pan_img_url: '', card_front_img_url: '',
  referral_name: '', referral_phone: '', source: '',
  profile_image_url: '', dob: '', father_name: '', aadhar_linked_mobile: ''
}

const ImgField = ({ label, icon, field, value, onChange }) => {
  const [uploading, setUploading] = useState(false)
  const token = getTokenByRole('employee') || getTokenByRole('admin')

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      const key = field.replace('_url', '').replace('aadhar_img', 'aadhar_img').replace('pan_img', 'pan_img').replace('card_front_img', 'card_front_img')
      fd.append(key, file)
      const res = await fetch(`${config.API_URL}/customers/upload-kyc`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onChange(field, data[field])
    } catch (err) { alert(err.message) }
    finally { setUploading(false) }
  }

  return (
    <div className="wizard-input-group" style={{ marginBottom: 16 }}>
      <label className="wizard-label">{icon} {label}</label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input type="file" accept="image/*,application/pdf" onChange={handleFile}
            disabled={uploading}
            style={{ 
              width: '100%', padding: '12px 16px', fontSize: 14, 
              background: '#f8fafc', border: '2px dashed #cbd5e1', 
              borderRadius: 12, cursor: 'pointer', outline: 'none',
              opacity: uploading ? 0.6 : 1, transition: 'all 0.2s'
            }} />
        </div>
        {uploading && (
          <span style={{ fontSize: 13, color: '#7e22ce', fontWeight: 800, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdCloudUpload size={18} /> Uploading...
          </span>
        )}
      </div>
      {value && (
        <div style={{ marginTop: 12, animation: 'scale-in 0.4s ease' }}>
          <img src={value} alt={label} onError={e => e.target.style.display='none'}
            style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
        </div>
      )}
    </div>
  )
}

export default function AddCustomer() {
  const navigate = useNavigate()
  const { submitCustomer, loading: submitting, error: submitError, success } = useAddCustomer()
  const { customers, loading: listLoading, refetch } = useMyCustomers()
  
  const currentUser = getUserByRole('employee') || getUserByRole('admin')
  const branch = currentUser?.branch || ''
  
  const [form, setForm] = useState({ ...empty, branch })
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  const [step, setStep] = useState(1)
  const [initTransactionId, setInitTransactionId] = useState('')
  const [aadharOtp, setAadharOtp] = useState('')
  
  const [mobileOtpSent, setMobileOtpSent] = useState(false)
  const [mobileOtp, setMobileOtp] = useState('')
  
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [emailOtp, setEmailOtp] = useState('')
  const [resending, setResending] = useState(false)
  
  const [fraudAlert, setFraudAlert] = useState(null)
  const [checkingFraud, setCheckingFraud] = useState(false)
  const [branches, setBranches] = useState([])
  const [loadingBranches, setLoadingBranches] = useState(false)

  useEffect(() => {
    const pendingName = localStorage.getItem('pendingCustomerName')
    if (pendingName) {
      localStorage.removeItem('pendingCustomerName')
      setForm(f => ({ ...f, pan_name: pendingName }))
      setShowForm(true)
    }
  }, [])

  useEffect(() => {
    if (step === 6 && branches.length === 0) {
      const fetchBranches = async () => {
        setLoadingBranches(true)
        try {
          const res = await fetch(`${config.API_URL}/customers/public-branches`)
          if (res.ok) {
            const data = await res.json()
            setBranches(data)
          }
        } catch (err) { console.error('Failed to load branches:', err) }
        finally { setLoadingBranches(false) }
      }
      fetchBranches()
    }
  }, [step])

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const checkFraud = useCallback(async (phone) => {
    if (!/^\d{10}$/.test(phone)) { setFraudAlert(null); return }
    setCheckingFraud(true)
    try {
      const r = await api(`/fraud/check/${phone}`, {
        headers: { Authorization: `Bearer ${getTokenByRole('employee') || getTokenByRole('admin')}` }
      })
      setFraudAlert(r.fraud ? r.entry : null)
    } catch { setFraudAlert(null) }
    setCheckingFraud(false)
  }, [])

  const handleNextStep = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      if (step === 1) {
        if (form.pan.length !== 10) throw new Error('Invalid PAN format')
        
        const check = await fetch(`${config.API_URL}/customers/check-exists?type=pan&value=${form.pan}`)
        const checkData = await check.json()
        if (checkData.exists) throw new Error('This PAN number is already registered with an existing customer.')

        const res = await fetch(`${config.API_URL}/api/kyc/pan/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pan: form.pan })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'PAN verification failed')
        if (!data.success || data.data?.status !== 'success' || data.data?.error_code) throw new Error(data.data?.message || 'PAN verification failed. Please check PAN number.')
        
        const detectedName = data.data?.data?.full_name || 'Detected Name'
        setField('pan_name', detectedName)
        setStep(2)

      } else if (step === 2) {
        if (form.aadhar.length !== 12) throw new Error('Invalid Aadhar — must be 12 digits')

        if (!initTransactionId) {
          const check = await fetch(`${config.API_URL}/customers/check-exists?type=aadhar&value=${form.aadhar}`)
          const checkData = await check.json()
          if (checkData.exists) throw new Error('This Aadhar number is already registered.')

          const res = await fetch(`${config.API_URL}/api/kyc/aadhaar/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aadhaar_number: form.aadhar })
          })
          const data = await res.json()
          if (!res.ok) {
            const errMsg = (data.error && data.error.message) ? data.error.message : (data.error || 'Aadhar OTP initiation failed')
            throw new Error(errMsg)
          }
          if (!data.success || data.data?.status !== 'success' || data.data?.error_code) throw new Error(data.data?.message || 'Aadhar verification failed')
          
          const txnId = data.data?.data?.session_id || `TXN-${Date.now()}`
          setInitTransactionId(txnId)
          setSuccessMsg('✅ Aadhar session created. Please ask the customer for the 6-digit OTP sent to their mobile.')
        } else {
          if (!aadharOtp || aadharOtp.length < 4) throw new Error('Please enter the OTP')
          const res = await fetch(`${config.API_URL}/api/kyc/aadhaar/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: initTransactionId, otp: aadharOtp })
          })
          const data = await res.json()
          if (!res.ok || !data.success || data.data?.status !== 'success' || data.data?.error_code) throw new Error(data.error || data.data?.message || 'Aadhar OTP verification failed')
          
          const aadharDetails = data.data?.data || {};
          setForm(f => ({
            ...f,
            profile_image_url: aadharDetails.photo || aadharDetails.profile_image || null,
            dob: aadharDetails.dob || null,
            father_name: aadharDetails.care_of || null,
            aadhar_linked_mobile: aadharDetails.linked_mobile || null
          }))
          setStep(3)
        }

      } else if (step === 3) {
        if (form.phone.length !== 10) throw new Error('Mobile number must be 10 digits')
        if (fraudAlert) throw new Error('This mobile number is in the fraud list.')

        if (!mobileOtpSent) {
          const check = await fetch(`${config.API_URL}/customers/check-exists?type=phone&value=${form.phone}`)
          const checkData = await check.json()
          if (checkData.exists) throw new Error('This mobile number is already registered.')

          const res = await fetch(`${config.API_URL}/api/otp/mobile/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: form.phone })
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed to send Mobile OTP')
          setMobileOtpSent(true)
          setSuccessMsg('✅ OTP sent to customer mobile. Enter it below.')
        } else {
          if (!mobileOtp || mobileOtp.length < 4) throw new Error('Please enter the OTP')
          const res = await fetch(`${config.API_URL}/api/otp/mobile/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: form.phone, otp: mobileOtp })
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Mobile OTP verification failed')
          
          try {
            const cibilRes = await fetch(`${config.API_URL}/api/kyc/cibil/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: form.pan_name, mobile: form.phone, pan: form.pan })
            });
            const cibilData = await cibilRes.json();
            if (cibilData.success && cibilData.data?.data?.credit_score) {
              setField('cibil_score', cibilData.data.data.credit_score);
            }
          } catch(err) {}
          
          setStep(4)
        }

      } else if (step === 4) {
        if (!form.email.includes('@')) throw new Error('Please enter a valid email address')

        if (!emailOtpSent) {
          const check = await fetch(`${config.API_URL}/customers/check-exists?type=email&value=${form.email}`)
          const checkData = await check.json()
          if (checkData.exists) throw new Error('This email address is already registered.')

          const res = await fetch(`${config.API_URL}/api/otp/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: form.email })
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed to send Email OTP')
          setEmailOtpSent(true)
          setSuccessMsg('✅ OTP sent to customer email. Enter it below.')
        } else {
          if (!emailOtp || emailOtp.length < 4) throw new Error('Please enter the OTP')
          const res = await fetch(`${config.API_URL}/api/otp/email/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: form.email, otp: emailOtp })
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Email OTP verification failed')
          setStep(5)
        }
      } else if (step === 5) {
        if (!form.acc_number || !form.ifsc_code) throw new Error('Account Number and IFSC are required')
        
        const res = await fetch(`${config.API_URL}/api/kyc/bank/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_number: form.acc_number, ifsc_code: form.ifsc_code })
        })
        const data = await res.json()
        if (!res.ok || !data.success || data.data?.status !== 'success' || data.data?.error_code) throw new Error(data.error || data.data?.message || 'Bank verification failed')
        
        const detectedName = data.data?.data?.account_holder_name || 'Verified Account Holder'
        setField('bank_verified_name', detectedName)
        setSuccessMsg('✅ Bank account verified successfully.')
        setStep(6)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.branch) return setError('Please select a branch')
    if (!form.source) return setError('Please select a source')
    if (!form.card_front_img_url || !form.pan_img_url || !form.aadhar_img_url) return setError('All document images are mandatory')
    
    setError('')
    
    const payload = {
      ...form,
      name: form.pan_name || form.manual_name,
      pan_verified: !!form.pan_name,
      aadhar_verified: true, // As requested, if bypassed, it's effectively accepted
      bank_verified: !!form.bank_verified_name,
      account_number: form.acc_number
    }

    const ok = await submitCustomer(payload)
    if (ok) {
      setStep(7)
      refetch()
    }
  }

  const resetForm = () => {
    setForm({ ...empty, branch })
    setStep(1)
    setInitTransactionId('')
    setAadharOtp('')
    setMobileOtpSent(false)
    setMobileOtp('')
    setEmailOtpSent(false)
    setEmailOtp('')
    setFraudAlert(null)
    setSuccessMsg('')
    setError('')
    setShowForm(false)
  }

  const statusStyle = s => ({
    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'inline-block',
    background: s === 'approved' ? '#dcfce7' : s === 'rejected' ? '#fee2e2' : '#fef3c7',
    color:      s === 'approved' ? '#166534' : s === 'rejected' ? '#991b1b' : '#92400e',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
  })

  return (
    <div className="dashboard">
      <EmployeeSidebar />
      <main className="dash-main">
        <div className="emp-page-header">
          <h1>Add New Customer</h1>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="dash-btn" onClick={() => navigate(-1)} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              ← Back
            </button>
            <button className="dash-btn dash-btn-primary" onClick={() => {
              if (showForm) resetForm()
              else setShowForm(true)
            }} style={{ background: showForm ? '#475569' : 'linear-gradient(135deg, #402070, #7e22ce)', boxShadow: '0 4px 12px rgba(64,32,112,0.2)' }}>
              {showForm ? '✕ Cancel' : '+ Add Customer Wizard'}
            </button>
          </div>
        </div>

        {success && !showForm && (
          <div className="wizard-alert wizard-alert-success">
            <MdCheckCircle size={20} /> {success}
          </div>
        )}
        
        {submitError && !showForm && (
          <div className="wizard-alert wizard-alert-error">
            <MdError size={20} /> {submitError}
          </div>
        )}

        {showForm && (
          <div className="wizard-container">
            <div className="wizard-card">
              <div className="wizard-header">
                <h2 className="wizard-title">Customer Verification</h2>
                {step <= 6 && <p className="wizard-subtitle">Step {step} of 6</p>}
                
                {form.cibil_score && (
                  <div className="wizard-cibil-badge" style={{ 
                    background: form.cibil_score >= 750 ? '#dcfce7' : '#fef9c3', 
                    color: form.cibil_score >= 750 ? '#166534' : '#854d0e',
                    border: `1px solid ${form.cibil_score >= 750 ? '#86efac' : '#fef08a'}`
                  }}>
                    💳 CIBIL: {form.cibil_score}
                  </div>
                )}
              </div>

              {step <= 6 && (
                <div className="wizard-stepper">
                  {[1,2,3,4,5,6].map(s => (
                    <div key={s} className={`wizard-step-bar ${s < step ? 'completed' : s === step ? 'active' : ''}`} />
                  ))}
                </div>
              )}

              <div className="wizard-body">
                {error && <div className="wizard-alert wizard-alert-error"><MdError size={20} /> {error}</div>}
                {submitError && step === 6 && <div className="wizard-alert wizard-alert-error"><MdError size={20} /> {submitError}</div>}
                {successMsg && <div className="wizard-alert wizard-alert-success"><MdCheckCircle size={20} /> {successMsg}</div>}

                <form onSubmit={step === 6 ? handleSubmit : handleNextStep}>
                  {step === 1 && (
                    <div className="wizard-input-group">
                      <label className="wizard-label">PAN Number *</label>
                      <input required className="wizard-input" placeholder="ABCDE1234F" maxLength={10}
                        value={form.pan} onChange={e => { setError(''); setField('pan', e.target.value.toUpperCase()) }} />
                    </div>
                  )}

                  {step === 2 && (
                    <>
                      {form.pan_name ? (
                        <div className="wizard-data-box">
                          <div className="wizard-data-icon"><MdVerifiedUser /></div>
                          <div className="wizard-data-content">
                            <h4>Verified Name (PAN)</h4>
                            <p>{form.pan_name}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="wizard-input-group">
                          <label className="wizard-label">Customer Full Name (Required since PAN was bypassed) *</label>
                          <input required className="wizard-input" placeholder="Full Name as per PAN"
                            value={form.manual_name || ''} onChange={e => { setError(''); setField('manual_name', e.target.value) }} />
                        </div>
                      )}
                      
                      <div className="wizard-input-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <label className="wizard-label" style={{ margin: 0 }}>Aadhar Number *</label>
                          {initTransactionId && (
                            <button type="button" className="wizard-btn-ghost" onClick={() => { setInitTransactionId(''); setAadharOtp(''); setError(''); setSuccessMsg('') }}>
                              ✎ Edit
                            </button>
                          )}
                        </div>
                        <input required className="wizard-input" type="tel" placeholder="12-digit Aadhar" maxLength={12} disabled={!!initTransactionId}
                          value={form.aadhar} onChange={e => { setError(''); setField('aadhar', e.target.value.replace(/\D/g, '').slice(0, 12)) }} />
                      </div>
                      
                      {initTransactionId && (
                        <div className="wizard-input-group">
                          <label className="wizard-label">Enter Aadhar OTP *</label>
                          <input required className="wizard-input" type="text" placeholder="6-digit OTP" maxLength={6}
                            value={aadharOtp} onChange={e => { setError(''); setAadharOtp(e.target.value.replace(/\D/g, '')) }} />
                        </div>
                      )}
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <div className="wizard-input-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <label className="wizard-label" style={{ margin: 0 }}>Mobile Number *</label>
                          {mobileOtpSent && (
                            <button type="button" className="wizard-btn-ghost" onClick={() => { setMobileOtpSent(false); setMobileOtp(''); setError(''); setSuccessMsg('') }}>
                              ✎ Edit
                            </button>
                          )}
                        </div>
                        <input required className="wizard-input" type="tel" placeholder="10-digit mobile" maxLength={10} disabled={mobileOtpSent}
                          value={form.phone} onChange={e => { setError(''); const v = e.target.value.replace(/\D/g, '').slice(0, 10); setField('phone', v); checkFraud(v); }} />
                        
                        {checkingFraud && <span style={{ fontSize: 12, color: '#8b5cf6', marginTop: 6, display: 'block' }}>⏳ Checking fraud list...</span>}
                        {fraudAlert && (
                          <div style={{ marginTop: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px' }}>
                            <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <MdError size={18} /> FRAUD ALERT — Blocked
                            </div>
                            <div style={{ fontSize: 13, color: '#991b1b', marginTop: 8 }}>
                              <strong>Name:</strong> {fraudAlert.name} <br/>
                              <strong>Reason:</strong> {fraudAlert.reason || 'Not specified'}
                            </div>
                          </div>
                        )}
                      </div>

                      {mobileOtpSent && (
                        <div className="wizard-input-group">
                          <label className="wizard-label">Enter Mobile OTP *</label>
                          <input required className="wizard-input" type="text" placeholder="6-digit OTP" maxLength={6}
                            value={mobileOtp} onChange={e => { setError(''); setMobileOtp(e.target.value.replace(/\D/g, '')) }} />
                          <button type="button" onClick={async () => {
                            setResending(true); setError(''); setMobileOtp('');
                            try {
                              const res = await fetch(`${config.API_URL}/api/otp/mobile/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: form.phone }) })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error)
                              setSuccessMsg('✅ New OTP sent!')
                            } catch(e) { setError(e.message) } finally { setResending(false) }
                          }} className="wizard-btn-ghost" style={{ marginTop: 8, padding: '6px 0' }}>
                            {resending ? 'Sending...' : '🔄 Resend OTP'}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {step === 4 && (
                    <>
                      <div className="wizard-input-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <label className="wizard-label" style={{ margin: 0 }}>Email Address *</label>
                          {emailOtpSent && (
                            <button type="button" className="wizard-btn-ghost" onClick={() => { setEmailOtpSent(false); setEmailOtp(''); setError(''); setSuccessMsg('') }}>
                              ✎ Edit
                            </button>
                          )}
                        </div>
                        <input required className="wizard-input" type="email" placeholder="example@email.com" disabled={emailOtpSent}
                          value={form.email} onChange={e => { setError(''); setField('email', e.target.value) }} />
                      </div>
                      
                      {emailOtpSent && (
                        <div className="wizard-input-group">
                          <label className="wizard-label">Enter Email OTP *</label>
                          <input required className="wizard-input" type="text" placeholder="6-digit OTP" maxLength={6}
                            value={emailOtp} onChange={e => { setError(''); setEmailOtp(e.target.value.replace(/\D/g, '')) }} />
                          <button type="button" onClick={async () => {
                            setResending(true); setError(''); setEmailOtp('');
                            try {
                              const res = await fetch(`${config.API_URL}/api/otp/email/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email }) })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error)
                              setSuccessMsg('✅ New OTP sent!')
                            } catch(e) { setError(e.message) } finally { setResending(false) }
                          }} className="wizard-btn-ghost" style={{ marginTop: 8, padding: '6px 0' }}>
                            {resending ? 'Sending...' : '🔄 Resend OTP'}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {step === 5 && (
                    <>
                      {form.bank_verified_name && (
                        <div className="wizard-data-box">
                          <div className="wizard-data-icon"><MdVerifiedUser /></div>
                          <div className="wizard-data-content">
                            <h4>Verified Name (Bank)</h4>
                            <p>{form.bank_verified_name}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="wizard-input-group">
                        <label className="wizard-label">Account Number *</label>
                        <input required className="wizard-input" type="text" placeholder="Enter Account Number" disabled={!!form.bank_verified_name}
                          value={form.acc_number} onChange={e => { setError(''); setField('acc_number', e.target.value.replace(/\D/g, '')) }} />
                      </div>

                      <div className="wizard-input-group">
                        <label className="wizard-label">IFSC Code *</label>
                        <input required className="wizard-input" type="text" placeholder="Enter IFSC Code" disabled={!!form.bank_verified_name}
                          value={form.ifsc_code} onChange={e => { setError(''); setField('ifsc_code', e.target.value.toUpperCase()) }} />
                      </div>
                    </>
                  )}

                  {step === 6 && (
                    <>
                      <div className="wizard-input-group">
                        <label className="wizard-label">Select Branch *</label>
                        <select required className="wizard-input wizard-select" value={form.branch} onChange={e => setField('branch', e.target.value)}>
                          <option value="" disabled>{loadingBranches ? 'Loading...' : 'Select your nearest branch'}</option>
                          {branches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>

                      <div className="wizard-input-group">
                        <label className="wizard-label">Source *</label>
                        <select required className="wizard-input wizard-select" value={form.source} onChange={e => setField('source', e.target.value)}>
                          <option value="" disabled>Select Source</option>
                          <option value="Insta Ad">Insta Ad</option>
                          <option value="Google search">Google search</option>
                          <option value="Referal">Referal</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Website">Website</option>
                          <option value="Walk-in">Walk-in</option>
                          <option value="Local advertisement">Local advertisement</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: 16 }}>
                        <div className="wizard-input-group" style={{ flex: 1 }}>
                          <label className="wizard-label">Referral Name (Optional)</label>
                          <input className="wizard-input" placeholder="Name" value={form.referral_name} onChange={e => setField('referral_name', e.target.value)} />
                        </div>
                        <div className="wizard-input-group" style={{ flex: 1 }}>
                          <label className="wizard-label">Referral Phone (Optional)</label>
                          <input className="wizard-input" placeholder="Phone" maxLength={10} value={form.referral_phone} onChange={e => setField('referral_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                        </div>
                      </div>

                      <div style={{ marginTop: 12, background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                        <label className="wizard-label" style={{ marginBottom: 16 }}>Upload Documents *</label>
                        <ImgField label="Aadhar Card Image"    icon="🪪" field="aadhar_img_url"      value={form.aadhar_img_url}      onChange={setField} />
                        <ImgField label="PAN Card Image"       icon="💳" field="pan_img_url"         value={form.pan_img_url}         onChange={setField} />
                        <ImgField label="Card Front Image"     icon="🏧" field="card_front_img_url"  value={form.card_front_img_url}  onChange={setField} />
                      </div>
                    </>
                  )}

                  {step === 7 && (
                    <div className="wizard-success-screen">
                      <div className="wizard-success-icon"><MdCheckCircle /></div>
                      <h3 className="wizard-success-title">Success!</h3>
                      <p className="wizard-success-text">
                        The customer profile has been fully verified and submitted for admin review in the <strong>{form.branch}</strong> branch.
                      </p>
                      <button type="button" onClick={resetForm} className="wizard-btn-primary" style={{ marginTop: 32, maxWidth: 300, margin: '32px auto 0' }}>
                        + Add Another Customer
                      </button>
                    </div>
                  )}

                  {step < 7 && (
                    <div className="wizard-actions">
                      {step > 1 && (
                        <button type="button" onClick={() => { setError(''); setStep(s => s - 1) }} className="wizard-btn-secondary" style={{ flex: 1 }}>
                          Back
                        </button>
                      )}
                      
                      {/* Bypass Button for All Verification Steps (1 to 5) */}
                      {step < 6 && (
                        <button type="button" onClick={() => { setError(''); setStep(s => s + 1) }} className="wizard-btn-secondary" style={{ flex: 1, background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 'bold' }}>
                          Bypass
                        </button>
                      )}

                      <button type="submit" className="wizard-btn-primary" style={{ flex: 2 }} disabled={loading || submitting || !!fraudAlert}>
                        {loading || submitting ? 'Processing...' 
                          : step === 6 ? 'Submit Customer'
                          : (step === 2 && !initTransactionId) ? 'Send Aadhar OTP'
                          : (step === 2 && initTransactionId) ? 'Verify Aadhar OTP'
                          : (step === 3 && !mobileOtpSent) ? 'Send Mobile OTP'
                          : (step === 3 && mobileOtpSent) ? 'Verify Mobile OTP'
                          : (step === 4 && !emailOtpSent) ? 'Send Email OTP'
                          : (step === 4 && emailOtpSent) ? 'Verify Email OTP'
                          : (step === 5 && !form.bank_verified_name) ? 'Verify Bank'
                          : 'Verify & Next ➔'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}

        {!showForm && (
          <div className="dash-card">
            <div className="dash-card-header">
              <h2>My Submitted Customers ({customers.length})</h2>
            </div>
            <div className="dash-table-wrap">
              {listLoading ? <div className="dash-loading">Loading...</div> : customers.length === 0 ? (
                <div className="dash-empty" style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  No customers submitted yet. Click "+ Add Customer Wizard" to begin.
                </div>
              ) : (
                <table className="dash-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Phone</th><th>PAN</th><th>Branch</th><th>Source</th><th>Status</th><th>Submitted</th></tr>
                  </thead>
                  <tbody>
                    {customers.map(c => (
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong></td>
                        <td>{c.email}</td>
                        <td>{c.phone}</td>
                        <td>{c.pan}</td>
                        <td>{c.branch || '—'}</td>
                        <td>{c.source || '—'}</td>
                        <td><span style={statusStyle(c.status)}>{c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span></td>
                        <td>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
