import React, { useState } from 'react'
import { useCustomerProfile, useCustomerTransactions } from '../../hooks/useCustomerAuth'
import CustomerSidebar from '../../components/customer/CustomerSidebar'
import CustomerHeader from '../../components/shared/CustomerHeader'
import { SkeletonCard, SkeletonLine } from '../../components/customer/Skeleton'
import '../../components/customer/CustomerSidebar.css'

export default function CustomerKYC() {
  const { profile, loading } = useCustomerProfile()
  const { txns } = useCustomerTransactions()
  const [lightbox, setLightbox] = useState(null)

  const docs = [
    { key: 'aadhar_img_url', label: 'Aadhaar Card Front / Back', icon: '🆔' },
    { key: 'pan_img_url', label: 'PAN Card Document', icon: '💳' },
    { key: 'card_front_img_url', label: 'Credit / Debit Card Front', icon: '🪪' }
  ]

  return (
    <div className="cust-page">
      <CustomerSidebar />
      <div className="cust-content">

        {/* ── Top Header ── */}
        <div className="cust-topbar" style={{ marginBottom: 24 }}>
          {profile ? (
            <CustomerHeader customer={profile} txns={txns} dark={false} />
          ) : (
            <>
              <h1>🪪 KYC Verification & Profile</h1>
              <p>Your verified government identities, bank account details & addresses</p>
            </>
          )}
        </div>

        {loading ? (
          <>
            <SkeletonCard rows={8} />
            <div className="cust-card" style={{ marginTop: 20 }}>
              <div className="cust-card-body" style={{ display: 'flex', gap: 16 }}>
                <SkeletonLine width={280} height={160} radius={8} />
                <SkeletonLine width={280} height={160} radius={8} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ── KYC Status Banner ── */}
            <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1.5px solid #86efac', borderRadius: 16, padding: '18px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800 }}>
                  ✓
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#14532d' }}>KYC Fully Verified & Approved</div>
                  <div style={{ fontSize: 13, color: '#166534', marginTop: 2 }}>
                    Your documents have been verified and approved by the branch admin.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ background: '#bbf7d0', color: '#166534', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  PAN Verified ✓
                </span>
                <span style={{ background: '#bbf7d0', color: '#166534', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  Aadhaar Verified ✓
                </span>
                <span style={{ background: '#bbf7d0', color: '#166534', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  Bank Verified ✓
                </span>
              </div>
            </div>

            {/* ── Personal & Banking Details Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 24 }}>

              {/* Personal Information */}
              <div className="cust-card" style={{ margin: 0 }}>
                <div className="cust-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: 16 }}>👤 Personal Information</h2>
                  {profile?.profile_image_url ? (
                    <img 
                      src={profile.profile_image_url.startsWith('http') || profile.profile_image_url.startsWith('data:image') ? profile.profile_image_url : `data:image/jpeg;base64,${profile.profile_image_url}`} 
                      alt="Profile" 
                      style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} 
                    />
                  ) : (
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
                  )}
                </div>
                <div className="cust-card-body">
                  {[
                    { label: 'Customer Name', value: profile?.name, highlight: true },
                    { label: "Father's Name", value: profile?.father_name || '—' },
                    { label: 'Date of Birth', value: profile?.dob ? new Date(profile.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                    { label: 'Mobile Number', value: profile?.phone },
                    { label: 'Aadhaar Mobile', value: profile?.aadhar_linked_mobile || profile?.phone },
                    { label: 'Email Address', value: profile?.email || '—' },
                  ].map((row, i) => (
                    <div key={i} className="cust-info-row">
                      <span className="cust-info-label">{row.label}</span>
                      <span className="cust-info-value" style={row.highlight ? { fontWeight: 700, color: '#1a0a2e' } : {}}>
                        {row.value || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Identity & Banking */}
              <div className="cust-card" style={{ margin: 0 }}>
                <div className="cust-card-header">
                  <h2 style={{ margin: 0, fontSize: 16 }}>🏦 Identity & Payout Bank Details</h2>
                </div>
                <div className="cust-card-body">
                  {[
                    { label: 'PAN Card No.', value: profile?.pan, verified: true },
                    { label: 'Aadhaar Number', value: profile?.aadhar ? `•••• •••• ${profile.aadhar.slice(-4)}` : '—', verified: true },
                    { label: 'Bank Account No.', value: profile?.acc_number || profile?.account_number || '—', verified: true },
                    { label: 'Bank IFSC Code', value: profile?.ifsc_code || '—' },
                    { label: 'Assigned Branch', value: profile?.branch || '—' },
                    { label: 'Approved Date', value: profile?.reviewed_at ? new Date(profile.reviewed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }
                  ].map((row, i) => (
                    <div key={i} className="cust-info-row">
                      <span className="cust-info-label">{row.label}</span>
                      <span className="cust-info-value" style={{ fontWeight: 600 }}>
                        {row.value}
                        {row.verified && <span style={{ color: '#059669', fontSize: 11, marginLeft: 6 }}>✓</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ── Verified Aadhaar Address Card ── */}
            <div className="cust-card" style={{ marginBottom: 24 }}>
              <div className="cust-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>📍</span>
                <h2 style={{ margin: 0, fontSize: 16 }}>Verified Aadhaar Address</h2>
              </div>
              <div className="cust-card-body">
                {profile?.address ? (
                  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', lineHeight: 1.6, color: '#1e293b', fontSize: 14 }}>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 0.5, marginBottom: 6 }}>
                      Residential Address from Aadhaar Records
                    </div>
                    <strong>{profile.address}</strong>
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>
                    Address was not provided or is captured from physical document on file.
                  </div>
                )}
              </div>
            </div>

            {/* ── Uploaded KYC Document Vault ── */}
            <div className="cust-card">
              <div className="cust-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📁</span>
                  <h2 style={{ margin: 0, fontSize: 16 }}>Secure Document Vault</h2>
                </div>
                <span style={{ fontSize: 12, color: '#64748b' }}>Click on image to enlarge</span>
              </div>
              <div className="cust-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
                  {docs.map(d => {
                    const url = profile?.[d.key]
                    return (
                      <div key={d.key} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                          <span>{d.icon}</span>
                          <span>{d.label}</span>
                        </div>
                        {url ? (
                          <div
                            onClick={() => setLightbox(url)}
                            style={{ flex: 1, minHeight: 140, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '1px solid #cbd5e1', position: 'relative', background: '#000' }}
                          >
                            <img
                              src={url}
                              alt={d.label}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.95, transition: 'transform 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            />
                            <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                              🔍 Click to Zoom
                            </div>
                          </div>
                        ) : (
                          <div style={{ height: 140, background: '#f1f5f9', borderRadius: 10, border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>
                            <span style={{ fontSize: 24, marginBottom: 4 }}>📄</span>
                            <span>Document on file</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          </>
        )}

        {/* Lightbox Preview */}
        {lightbox && (
          <div
            onClick={() => setLightbox(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          >
            <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setLightbox(null)}
                style={{ position: 'absolute', top: -40, right: 0, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
              <img src={lightbox} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
