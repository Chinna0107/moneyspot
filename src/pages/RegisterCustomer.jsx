import { useState, useEffect } from 'react'
import config from '../config';
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import logoImg from '../assets/icons png/MS Logo.png'
import fullLogoImg from '../assets/icons png/Full Logo.png'
import bannerImg from '../assets/icons png/MS Logo.png'
import './Login.css'

const particles = [
  { left: '10%', top: '15%', w: 6, h: 6, delay: 0 },
  { left: '85%', top: '20%', w: 4, h: 4, delay: 0.5 },
  { left: '75%', top: '75%', w: 7, h: 7, delay: 1 },
  { left: '15%', top: '80%', w: 5, h: 5, delay: 1.5 },
  { left: '50%', top: '10%', w: 3, h: 3, delay: 0.8 },
  { left: '90%', top: '55%', w: 4, h: 4, delay: 1.2 },
]

export default function RegisterCustomer() {
  const navigate = useNavigate()
  const [step, setStep] = useState(() => Number(sessionStorage.getItem('reg_step')) || 1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [initTransactionId, setInitTransactionId] = useState(() => sessionStorage.getItem('reg_initTxn') || '')
  const [aadharOtp, setAadharOtp] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [mobileOtpSent, setMobileOtpSent] = useState(() => sessionStorage.getItem('reg_mobileOtpSent') === 'true')
  const [mobileOtp, setMobileOtp] = useState('')
  const [emailOtpSent, setEmailOtpSent] = useState(() => sessionStorage.getItem('reg_emailOtpSent') === 'true')
  const [emailOtp, setEmailOtp] = useState('')
  const [resending, setResending] = useState(false)
  
  const [branches, setBranches] = useState([])
  const [loadingBranches, setLoadingBranches] = useState(false)

  const [form, setForm] = useState(() => {
    const saved = sessionStorage.getItem('reg_form')
    const parsed = saved ? JSON.parse(saved) : {}
    return {
      pan: parsed.pan || '',
      pan_name: parsed.pan_name || '',
      aadhar: parsed.aadhar || '',
      phone: parsed.phone || '',
      email: parsed.email || '',
      branch: parsed.branch || '',
      account_number: parsed.account_number || '',
      ifsc_code: parsed.ifsc_code || '',
      bank_verified_name: parsed.bank_verified_name || '',
      address: parsed.address || '',
      pan_img: null,
      aadhar_img: null,
      card_front_img: null
    }
  })

  // Persist state to session storage
  useEffect(() => {
    sessionStorage.setItem('reg_step', step)
    sessionStorage.setItem('reg_initTxn', initTransactionId)
    sessionStorage.setItem('reg_mobileOtpSent', mobileOtpSent)
    sessionStorage.setItem('reg_emailOtpSent', emailOtpSent)
    const { pan_img, aadhar_img, card_front_img, ...formPrimitives } = form
    sessionStorage.setItem('reg_form', JSON.stringify(formPrimitives))
    
    // Clear storage on success
    if (step === 7) {
      sessionStorage.removeItem('reg_step')
      sessionStorage.removeItem('reg_initTxn')
      sessionStorage.removeItem('reg_mobileOtpSent')
      sessionStorage.removeItem('reg_emailOtpSent')
      sessionStorage.removeItem('reg_form')
    }
  }, [step, initTransactionId, mobileOtpSent, emailOtpSent, form])

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

  useEffect(() => {
    gsap.fromTo('.login-card',
      { opacity: 0, y: 50, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.4)' })
    gsap.to('.login-particle', {
      y: 'random(-25,25)', x: 'random(-15,15)',
      duration: 'random(2,4)', repeat: -1, yoyo: true,
      ease: 'sine.inOut', stagger: { each: 0.4, from: 'random' },
    })
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
        if (!data.success || data.data?.status !== 'success' || data.data?.error_code) throw new Error(data.data?.message || 'PAN verification failed. Please check your PAN number.')
        const detectedName = data.data?.data?.full_name || 'Detected Name'
        setForm(f => ({ ...f, pan_name: detectedName }))
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
            const errMsg = (data.error && data.error.message) ? data.error.message : (data.error || 'Aadhar OTP initiation failed');
            throw new Error(errMsg);
          }
          if (!data.success || data.data?.status !== 'success' || data.data?.error_code) throw new Error(data.data?.message || 'Aadhar verification failed')
          
          const txnId = data.data?.data?.session_id || `TXN-${Date.now()}`
          setInitTransactionId(txnId)
          setSuccessMsg('✅ Aadhar session created. Please enter the 6-digit OTP sent to your mobile number.')
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
          const detectedAddress = typeof aadharDetails.address === 'string'
            ? aadharDetails.address
            : (aadharDetails.address?.full || aadharDetails.address?.combined_address || aadharDetails.address?.complete_address || (aadharDetails.address ? JSON.stringify(aadharDetails.address) : ''));

          setForm(f => ({
            ...f,
            profile_image_url: aadharDetails.photo || aadharDetails.profile_image || null,
            dob: aadharDetails.dob || null,
            father_name: aadharDetails.care_of || null,
            aadhar_linked_mobile: aadharDetails.linked_mobile || null,
            address: detectedAddress || null
          }))
          setStep(3)
        }

      } else if (step === 3) {
        if (form.phone.length !== 10) throw new Error('Mobile number must be 10 digits')

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
          setSuccessMsg('✅ OTP sent to your mobile number. Please enter it below.')
        } else {
          if (!mobileOtp || mobileOtp.length < 4) throw new Error('Please enter the OTP received on your mobile')
          const res = await fetch(`${config.API_URL}/api/otp/mobile/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: form.phone, otp: mobileOtp })
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Mobile OTP verification failed')
          
          // Silently fetch CIBIL score
          try {
            const cibilRes = await fetch(`${config.API_URL}/api/kyc/cibil/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: form.pan_name || form.name || 'Customer', mobile: form.phone, pan: form.pan })
            });
            const cibilData = await cibilRes.json();
            if (cibilData.success && cibilData.data?.data?.credit_score) {
              setForm(f => ({ ...f, cibil_score: cibilData.data.data.credit_score }));
            }
          } catch(err) {
            console.error('Failed to fetch CIBIL silently:', err);
          }
          
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
          setSuccessMsg('✅ OTP sent to your email address. Please check your inbox.')
        } else {
          if (!emailOtp || emailOtp.length < 4) throw new Error('Please enter the OTP received on your email')
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
        if (!form.account_number || !form.ifsc_code) throw new Error('Account Number and IFSC are required')
        
        const res = await fetch(`${config.API_URL}/api/kyc/bank/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_number: form.account_number, ifsc_code: form.ifsc_code })
        })
        const data = await res.json()
        if (!res.ok || !data.success || data.data?.status !== 'success' || data.data?.error_code) throw new Error(data.error || data.data?.message || 'Bank verification failed')
        
        const detectedName = data.data?.data?.account_holder_name || 'Verified Account Holder'
        setForm(f => ({ ...f, bank_verified_name: detectedName }))
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
    if (!form.card_front_img || !form.pan_img || !form.aadhar_img) return setError('All document images are mandatory')
    
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('name', form.pan_name)
      fd.append('email', form.email)
      fd.append('phone', form.phone)
      fd.append('pan', form.pan)
      fd.append('aadhar', form.aadhar)
      
      if (form.profile_image_url) fd.append('profile_image_url', form.profile_image_url)
      if (form.aadhar_linked_mobile) fd.append('aadhar_linked_mobile', form.aadhar_linked_mobile)
      if (form.dob) fd.append('dob', form.dob)
      if (form.father_name) fd.append('father_name', form.father_name)
      if (form.cibil_score) fd.append('cibil_score', form.cibil_score)
      if (form.address) fd.append('address', form.address)
      fd.append('branch', form.branch)
      fd.append('referral_name', form.referral_name)
      fd.append('referral_phone', form.referral_phone)
      fd.append('account_number', form.account_number)
      fd.append('ifsc_code', form.ifsc_code)
      fd.append('aadhar_img', form.aadhar_img)
      fd.append('pan_img', form.pan_img)
      fd.append('card_front_img', form.card_front_img)
      fd.append('pan_verified', !!form.pan_name)
      fd.append('aadhar_verified', 'true') // Customer must verify Aadhar OTP to proceed
      fd.append('bank_verified', !!form.bank_verified_name)

      const res = await fetch(`${config.API_URL}/customers/self-register`, {
        method: 'POST',
        body: fd
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to register')
      
      setSuccessMsg('🎉 Registration complete! Your documents have been submitted to the branch admin for approval.')
      setStep(7)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-particles">
        {particles.map((p, i) => (
          <div key={i} className="login-particle" style={{ left: p.left, top: p.top, width: p.w, height: p.h, animationDelay: `${p.delay}s` }} />
        ))}
      </div>

      <div className="login-layout">
        <div className="login-image-panel">
          <img src={bannerImg} alt="MoneySpot" className="login-banner-img" />
          <div className="login-image-overlay">
            <img src={fullLogoImg} alt="MoneySpot" className="login-image-logo" />
            <p className="login-image-tagline">Join our trusted financial family</p>
          </div>
        </div>

        <div className="login-card" style={{ maxWidth: 500 }}>
          <div className="login-logo" style={{ marginBottom: 10 }}>
            <img src={logoImg} alt="MoneySpot" className="login-logo-img" style={{ width: 50, height: 50 }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Customer Registration</h2>
            {form.cibil_score && (
              <div style={{ background: form.cibil_score >= 750 ? '#d1fae5' : '#fef3c7', color: form.cibil_score >= 750 ? '#059669' : '#d97706', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                💳 CIBIL: {form.cibil_score}
              </div>
            )}
          </div>
          {step <= 6 && <p className="login-sub">Step {step} of 6</p>}

          {step <= 6 && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
              {[1,2,3,4,5,6].map(s => (
                <div key={s} style={{ flex: 1, height: 4, background: s <= step ? '#402070' : '#e2e8f0', borderRadius: 2 }} />
              ))}
            </div>
          )}

          {error && <div className="login-alert login-alert-error">{error}</div>}
          {successMsg && <div className="login-alert" style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{successMsg}</div>}

          <form onSubmit={step === 6 ? handleSubmit : handleNextStep}>
            {step === 1 && (
              <div className="form-group">
                <label>PAN Number *</label>
                <input required placeholder="ABCDE1234F" maxLength={10}
                  value={form.pan} onChange={e => { setError(''); setForm(f => ({ ...f, pan: e.target.value.toUpperCase() })) }} />
                <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>We will verify this with Idto.</p>
              </div>
            )}

            {step === 2 && (
              <div className="form-group">
                {form.pan_name && (
                  <div style={{ marginBottom: 15, background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Verified Name (from PAN)</div>
                    <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>{form.pan_name}</div>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>Aadhar Number *</label>
                  {initTransactionId && (
                    <button type="button" onClick={() => { setInitTransactionId(''); setAadharOtp(''); setError(''); setSuccessMsg('') }} style={{ background: 'none', border: 'none', color: '#402070', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>✎ Edit</button>
                  )}
                </div>
                <input required type="tel" placeholder="12-digit Aadhar" maxLength={12} disabled={!!initTransactionId}
                  value={form.aadhar} onChange={e => { setError(''); setForm(f => ({ ...f, aadhar: e.target.value.replace(/\D/g, '').slice(0, 12) })) }} />
                
                {initTransactionId && (
                  <div style={{ marginTop: 15 }}>
                    <label>Enter OTP sent to Aadhar linked mobile *</label>
                    <input required type="text" placeholder="Enter OTP" maxLength={6}
                      value={aadharOtp} onChange={e => { setError(''); setAadharOtp(e.target.value.replace(/\D/g, '')) }} />
                  </div>
                )}
                {!initTransactionId && <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>OTP will be sent to registered mobile.</p>}
              </div>
            )}

            {step === 3 && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>Mobile Number *</label>
                  {mobileOtpSent && (
                    <button type="button" onClick={() => { setMobileOtpSent(false); setMobileOtp(''); setError(''); setSuccessMsg('') }} style={{ background: 'none', border: 'none', color: '#402070', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>✎ Edit</button>
                  )}
                </div>
                <input required type="tel" placeholder="10-digit mobile" maxLength={10} disabled={mobileOtpSent}
                  value={form.phone} onChange={e => { setError(''); setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })) }} />
                {mobileOtpSent && (
                  <div style={{ marginTop: 15 }}>
                    <label>Enter OTP sent to your mobile *</label>
                    <input required type="text" placeholder="Enter 6-digit OTP" maxLength={6}
                      value={mobileOtp} onChange={e => { setError(''); setMobileOtp(e.target.value.replace(/\D/g, '')) }} />
                    <button type="button" onClick={async () => {
                      setResending(true); setError(''); setMobileOtp('');
                      try {
                        const res = await fetch(`${config.API_URL}/api/otp/mobile/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: form.phone }) })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error)
                        setSuccessMsg('✅ New OTP sent! Please check your phone.')
                      } catch(e) { setError(e.message) } finally { setResending(false) }
                    }} style={{ marginTop: 8, background: 'none', border: 'none', color: '#402070', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                      {resending ? 'Sending...' : '🔄 Resend OTP'}
                    </button>
                  </div>
                )}
                {!mobileOtpSent && <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>OTP will be sent to verify your mobile number.</p>}
              </div>
            )}

            {step === 4 && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>Email Address *</label>
                  {emailOtpSent && (
                    <button type="button" onClick={() => { setEmailOtpSent(false); setEmailOtp(''); setError(''); setSuccessMsg('') }} style={{ background: 'none', border: 'none', color: '#402070', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>✎ Edit</button>
                  )}
                </div>
                <input required type="email" placeholder="example@email.com" disabled={emailOtpSent}
                  value={form.email} onChange={e => { setError(''); setForm(f => ({ ...f, email: e.target.value })) }} />
                {emailOtpSent && (
                  <div style={{ marginTop: 15 }}>
                    <label>Enter OTP sent to your email *</label>
                    <input required type="text" placeholder="Enter 6-digit OTP" maxLength={6}
                      value={emailOtp} onChange={e => { setError(''); setEmailOtp(e.target.value.replace(/\D/g, '')) }} />
                    <button type="button" onClick={async () => {
                      setResending(true); setError(''); setEmailOtp('');
                      try {
                        const res = await fetch(`${config.API_URL}/api/otp/email/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email }) })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error)
                        setSuccessMsg('✅ New OTP sent to your email!')
                      } catch(e) { setError(e.message) } finally { setResending(false) }
                    }} style={{ marginTop: 8, background: 'none', border: 'none', color: '#402070', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                      {resending ? 'Sending...' : '🔄 Resend OTP'}
                    </button>
                  </div>
                )}
                {!emailOtpSent && <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>OTP will be sent to verify your email address.</p>}
              </div>
            )}

            {step === 5 && (
              <div className="form-group">
                {form.bank_verified_name && (
                  <div style={{ marginBottom: 15, background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Verified Name (from Bank)</div>
                    <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>{form.bank_verified_name}</div>
                  </div>
                )}
                
                <label>Account Number *</label>
                <input required type="text" placeholder="Enter Account Number" disabled={!!form.bank_verified_name}
                  value={form.account_number} onChange={e => { setError(''); setForm(f => ({ ...f, account_number: e.target.value.replace(/\\D/g, '') })) }} style={{ marginBottom: 15 }} />

                <label>IFSC Code *</label>
                <input required type="text" placeholder="Enter IFSC Code" disabled={!!form.bank_verified_name}
                  value={form.ifsc_code} onChange={e => { setError(''); setForm(f => ({ ...f, ifsc_code: e.target.value.toUpperCase() })) }} />
              </div>
            )}

            {step === 6 && (
              <div className="form-group">
                <label>Select Branch *</label>
                <select required value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 15 }}>
                  <option value="" disabled>{loadingBranches ? 'Loading branches...' : 'Select your nearest branch'}</option>
                  {branches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                <label>Documents Upload *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  <div>
                    <label style={{ fontSize: 12 }}>PAN Card Image *</label>
                    <input type="file" required onChange={e => setForm(f => ({ ...f, pan_img: e.target.files[0]}))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12 }}>Aadhar Card Image *</label>
                    <input type="file" required onChange={e => setForm(f => ({ ...f, aadhar_img: e.target.files[0]}))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12 }}>Credit Card Front Image *</label>
                    <input type="file" required onChange={e => setForm(f => ({ ...f, card_front_img: e.target.files[0]}))} />
                  </div>
                </div>
              </div>
            )}

            {step === 7 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
                <h3 style={{ color: '#402070', marginBottom: 10 }}>Application Submitted</h3>
                <p style={{ color: '#6b7280', fontSize: 14 }}>
                  Your application has been sent to the <strong>{form.branch}</strong> branch for admin review.
                  We will notify you via email once approved.
                </p>
              </div>
            )}

            {step < 7 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                {step > 1 && (
                  <button type="button" onClick={() => { setError(''); setStep(s => s - 1) }} 
                    style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                    Back
                  </button>
                )}
                <button type="submit" className="btn-login-submit" style={{ flex: 2 }} disabled={loading}>
                  {loading ? 'Processing...' 
                    : step === 6 ? 'Submit Registration'
                    : (step === 2 && !initTransactionId) ? '📤 Send Aadhar OTP'
                    : (step === 2 && initTransactionId) ? '✅ Verify Aadhar OTP'
                    : (step === 3 && !mobileOtpSent) ? '📤 Send Mobile OTP'
                    : (step === 3 && mobileOtpSent) ? '✅ Verify Mobile OTP'
                    : (step === 4 && !emailOtpSent) ? '📤 Send Email OTP'
                    : (step === 4 && emailOtpSent) ? '✅ Verify Email OTP'
                    : (step === 5 && !form.bank_verified_name) ? 'Verify Bank ➔'
                    : 'Verify & Next ➔'}
                </button>
              </div>
            )}
          </form>

          {step === 7 && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button type="button" onClick={() => navigate('/login/customer')} className="btn-primary" style={{ width: '100%' }}>
                Return to Login
              </button>
            </div>
          )}

          {step < 7 && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button type="button" onClick={() => navigate('/login/customer')} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                Cancel & Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
