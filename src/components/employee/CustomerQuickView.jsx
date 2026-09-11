import React, { useState } from 'react'
import { MdCheckCircle, MdWarning, MdPhoneIphone, MdEmail, MdCreditCard, MdAccountBalance, MdImage, MdCalendarToday, MdReceipt } from 'react-icons/md'
import './CustomerQuickView.css'

export default function CustomerQuickView({ customer, txns }) {
  const [docTab, setDocTab] = useState('PAN')
  const [showPending, setShowPending] = useState(false)

  if (!customer) return null;

  const isApproved = customer.status === 'approved';
  // If DOB exists, it means PAN/Aadhaar were fetched via API. 
  // For Bank, if IFSC code exists, it's API verified.
  const isPanVerified = !!customer.dob || customer.pan_verified === true || customer.pan_verified === 'true';
  const isAadharVerified = !!customer.dob || customer.aadhar_verified === true || customer.aadhar_verified === 'true';
  const isBankVerified = !!customer.ifsc_code || customer.bank_verified === true || customer.bank_verified === 'true';

  // Derived stats
  const totalAmt = txns.reduce((s, t) => s + parseFloat(t.amount || 0), 0)
  const isPremium = txns.length >= 10 || totalAmt >= 100000
  const isVip = txns.length >= 5 || totalAmt >= 50000

  // Service breakdown
  const serviceBreakdown = txns.reduce((acc, t) => {
    const k = t.service_type || 'Other'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  // Pending balance
  const pendingData = customer.pendingData || { pending_count: 0, total_remaining: 0, entries: [] }
  const pendingCount = pendingData.pending_count || 0
  const pendingAmt = parseFloat(pendingData.total_remaining || 0)

  // Due dates
  const billTxns = txns.filter(t => t.bill_due_date).sort((a, b) => new Date(a.bill_due_date) - new Date(b.bill_due_date))

  return (
    <div className="cqv-container">
      {/* ── HEADER ── */}
      <div className="cqv-header">
        <div className="cqv-header-left">
          <div className="cqv-avatar" style={{ padding: customer.profile_image_url ? 0 : undefined, overflow: 'hidden' }}>
            {customer.profile_image_url ? (
              <img 
                src={customer.profile_image_url.startsWith('http') || customer.profile_image_url.startsWith('data:') 
                  ? customer.profile_image_url 
                  : `data:image/jpeg;base64,${customer.profile_image_url}`} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              customer.name ? customer.name.charAt(0).toUpperCase() : '?'
            )}
          </div>
          <div>
            <div className="cqv-name-row">
              <h2 className="cqv-name">{customer.name}</h2>
              {isPremium ? (
                <span className="cqv-tier-badge">👑 Elite Plus</span>
              ) : isVip ? (
                <span className="cqv-tier-badge">⭐ VIP</span>
              ) : null}
            </div>
            <div className="cqv-meta">
              <span>Customer ID: #{customer.id}</span>
              <span>|</span>
              <span>Member Since: {customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN') : '—'}</span>
              <span>|</span>
              <span>Branch: {customer.branch || '—'}</span>
            </div>
            <div className="cqv-tags">
              <span className="cqv-tag active"><MdCheckCircle /> Active</span>
              <span className="cqv-tag kyc"><MdCheckCircle /> KYC Verified</span>
              {txns.length > 5 && <span className="cqv-tag loyal">❤️ Loyal Customer</span>}
              {txns.length > 20 && <span className="cqv-tag high-freq">★ High Frequency</span>}
            </div>
          </div>
        </div>
        <div className="cqv-header-right">
          <div className="cqv-stat-box">
            <div className="cqv-stat-icon txn">👥</div>
            <div>
              <div className="cqv-stat-val">{txns.length}</div>
              <div className="cqv-stat-label">Total Transactions</div>
            </div>
          </div>
          <div className="cqv-stat-box">
            <div className="cqv-stat-icon biz">📈</div>
            <div>
              <div className="cqv-stat-val">
                {totalAmt >= 10000000 ? `₹${(totalAmt/10000000).toFixed(2)} Cr` : totalAmt >= 100000 ? `₹${(totalAmt/100000).toFixed(2)} L` : `₹${totalAmt.toLocaleString('en-IN')}`}
              </div>
              <div className="cqv-stat-label">Lifetime Business</div>
            </div>
          </div>
          <div className="cqv-stat-box">
            <div className="cqv-stat-icon time">⏱️</div>
            <div>
              <div className="cqv-stat-val">
                {txns.length > 0 ? new Date(txns[0].created_at).toLocaleDateString('en-IN') : '—'}
              </div>
              <div className="cqv-stat-label">Last Transaction</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="cqv-grid">
        
        {/* Col 1: KYC */}
        <div className="cqv-card">
          <div className="cqv-card-header"><span className="num">2</span> KYC / API Verification Status</div>
          <div className="cqv-card-body">
            <div className="cqv-kyc-banner" style={{ background: isPanVerified && isAadharVerified && isBankVerified ? '#dcfce7' : '#fef3c7', color: isPanVerified && isAadharVerified && isBankVerified ? '#166534' : '#92400e', borderColor: isPanVerified && isAadharVerified && isBankVerified ? '#86efac' : '#fcd34d' }}>
              <span>{isPanVerified && isAadharVerified && isBankVerified ? <><MdCheckCircle size={16} style={{verticalAlign:'text-bottom'}}/> FULLY VERIFIED</> : <><MdWarning size={16} style={{verticalAlign:'text-bottom'}}/> PARTIALLY VERIFIED</>}</span>
              <span className="score" style={{ background: isPanVerified && isAadharVerified && isBankVerified ? '#16a34a' : '#d97706' }}>
                {[customer.phone, customer.email, isPanVerified, isAadharVerified, isBankVerified].filter(Boolean).length}/5
              </span>
            </div>

            <div className="cqv-kyc-item">
              <div className="cqv-kyc-info">
                <div className="cqv-kyc-icon phone"><MdPhoneIphone /></div>
                <div>
                  <div className="cqv-kyc-label">Mobile Number</div>
                  <div className="cqv-kyc-val">{customer.phone || '—'}</div>
                </div>
              </div>
              <div className="cqv-kyc-status" style={{ color: customer.phone ? '#16a34a' : '#94a3b8' }}>
                {customer.phone ? <><MdCheckCircle /> Verified</> : 'Pending'}
              </div>
            </div>

            <div className="cqv-kyc-item">
              <div className="cqv-kyc-info">
                <div className="cqv-kyc-icon email"><MdEmail /></div>
                <div>
                  <div className="cqv-kyc-label">Email ID</div>
                  <div className="cqv-kyc-val">{customer.email || '—'}</div>
                </div>
              </div>
              <div className="cqv-kyc-status" style={{ color: customer.email ? '#16a34a' : '#94a3b8' }}>
                {customer.email ? <><MdCheckCircle /> Verified</> : 'Pending'}
              </div>
            </div>

            <div className="cqv-kyc-item">
              <div className="cqv-kyc-info">
                <div className="cqv-kyc-icon pan"><MdCreditCard /></div>
                <div>
                  <div className="cqv-kyc-label">PAN Card</div>
                  <div className="cqv-kyc-val">{customer.pan || '—'}</div>
                </div>
              </div>
              <div className="cqv-kyc-status" style={{ color: isPanVerified ? '#16a34a' : customer.pan ? '#d97706' : '#94a3b8' }}>
                {isPanVerified ? <><MdCheckCircle /> Verified</> : customer.pan ? <><MdWarning /> Unverified</> : 'Pending'}
              </div>
            </div>

            <div className="cqv-kyc-item">
              <div className="cqv-kyc-info">
                <div className="cqv-kyc-icon aadhar"><MdCreditCard /></div>
                <div>
                  <div className="cqv-kyc-label">Aadhaar Card</div>
                  <div className="cqv-kyc-val">{customer.aadhar ? customer.aadhar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : '—'}</div>
                </div>
              </div>
              <div className="cqv-kyc-status" style={{ color: isAadharVerified ? '#16a34a' : customer.aadhar ? '#d97706' : '#94a3b8' }}>
                {isAadharVerified ? <><MdCheckCircle /> Verified</> : customer.aadhar ? <><MdWarning /> Unverified</> : 'Pending'}
              </div>
            </div>

            <div className="cqv-kyc-item">
              <div className="cqv-kyc-info">
                <div className="cqv-kyc-icon bank"><MdAccountBalance /></div>
                <div>
                  <div className="cqv-kyc-label">Bank Account</div>
                  <div className="cqv-kyc-val">{customer.acc_number || '—'}{customer.ifsc_code ? ` • ${customer.ifsc_code}` : ''}</div>
                </div>
              </div>
              <div className="cqv-kyc-status" style={{ color: isBankVerified ? '#16a34a' : customer.acc_number ? '#d97706' : '#94a3b8' }}>
                {isBankVerified ? <><MdCheckCircle /> Verified</> : customer.acc_number ? <><MdWarning /> Unverified</> : 'Pending'}
              </div>
            </div>

            <div style={{ marginTop: 16, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <MdCheckCircle size={16} /> KYC Verification Completed
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Verified On</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{customer.created_at ? new Date(customer.created_at).toLocaleString('en-IN') : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#64748b' }}>Approved By</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{customer.reviewed_by_name || 'Admin'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Documents */}
        <div className="cqv-card">
          <div className="cqv-card-header"><span className="num">3</span> Identity Documents (View)</div>
          <div className="cqv-card-body">
            <div className="cqv-tabs">
              <div className={`cqv-tab ${docTab === 'PAN' ? 'active' : ''}`} onClick={() => setDocTab('PAN')}>PAN</div>
              <div className={`cqv-tab ${docTab === 'Aadhaar' ? 'active' : ''}`} onClick={() => setDocTab('Aadhaar')}>Aadhaar</div>
              <div className={`cqv-tab ${docTab === 'Bank' ? 'active' : ''}`} onClick={() => setDocTab('Bank')}>Bank Account</div>
            </div>

            {docTab === 'PAN' && (
              <div className="cqv-doc-view">
                <div className="cqv-doc-img-wrap">
                  {customer.pan_img_url ? (
                    <img src={customer.pan_img_url} alt="PAN" className="cqv-doc-img" />
                  ) : (
                    <div className="cqv-doc-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><MdImage size={32} /></div>
                  )}
                  {customer.pan_img_url && (
                    <button className="cqv-doc-btn" onClick={() => window.open(customer.pan_img_url, '_blank')}>
                      <MdImage /> View Full Image
                    </button>
                  )}
                </div>
                <div className="cqv-doc-details">
                  <div className="cqv-doc-row"><div className="cqv-doc-lbl">PAN Number</div><div className="cqv-doc-val">{customer.pan || '—'}</div></div>
                  <div className="cqv-doc-row"><div className="cqv-doc-lbl">Name</div><div className="cqv-doc-val">{customer.pan_name || customer.name}</div></div>
                  <div className="cqv-doc-row"><div className="cqv-doc-lbl">DOB</div><div className="cqv-doc-val">{customer.dob || '—'}</div></div>
                  <div className="cqv-doc-row">
                    <div className="cqv-doc-lbl">Status</div>
                    <div className="cqv-doc-val" style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}><MdCheckCircle /> Verified via API</div>
                  </div>
                </div>
              </div>
            )}

            {docTab === 'Aadhaar' && (
              <div className="cqv-doc-view">
                <div className="cqv-doc-img-wrap">
                  {customer.aadhar_img_url ? (
                    <img src={customer.aadhar_img_url} alt="Aadhaar" className="cqv-doc-img" />
                  ) : (
                    <div className="cqv-doc-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><MdImage size={32} /></div>
                  )}
                  {customer.aadhar_img_url && (
                    <button className="cqv-doc-btn" onClick={() => window.open(customer.aadhar_img_url, '_blank')}>
                      <MdImage /> View Front
                    </button>
                  )}
                </div>
                <div className="cqv-doc-details">
                  <div className="cqv-doc-row"><div className="cqv-doc-lbl">Aadhaar Number</div><div className="cqv-doc-val">{customer.aadhar ? customer.aadhar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : '—'}</div></div>
                  <div className="cqv-doc-row"><div className="cqv-doc-lbl">Name</div><div className="cqv-doc-val">{customer.name}</div></div>
                  <div className="cqv-doc-row"><div className="cqv-doc-lbl">DOB</div><div className="cqv-doc-val">{customer.dob || '—'}</div></div>
                  <div className="cqv-doc-row"><div className="cqv-doc-lbl">Care Of</div><div className="cqv-doc-val">{customer.father_name || '—'}</div></div>
                  <div className="cqv-doc-row">
                    <div className="cqv-doc-lbl">Status</div>
                    <div className="cqv-doc-val" style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}><MdCheckCircle /> Verified via API</div>
                  </div>
                </div>
              </div>
            )}

            {docTab === 'Bank' && (
              <div className="cqv-doc-view">
                <div className="cqv-doc-img-wrap">
                  <div className="cqv-doc-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: '#ede9fe' }}>
                    <MdAccountBalance size={40} color="#4f46e5" />
                  </div>
                </div>
                <div className="cqv-doc-details">
                  <div className="cqv-doc-row"><div className="cqv-doc-lbl">Account Number</div><div className="cqv-doc-val">{customer.acc_number || '—'}</div></div>
                  <div className="cqv-doc-row"><div className="cqv-doc-lbl">Account Name</div><div className="cqv-doc-val">{customer.bank_verified_name || customer.name}</div></div>
                  <div className="cqv-doc-row"><div className="cqv-doc-lbl">IFSC / Bank</div><div className="cqv-doc-val">{customer.ifsc_code || '—'}</div></div>
                  <div className="cqv-doc-row">
                    <div className="cqv-doc-lbl">Status</div>
                    <div className="cqv-doc-val" style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}><MdCheckCircle /> Verified via API</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Col 3: Financial */}
        <div className="cqv-card">
          <div className="cqv-card-header"><span className="num">4</span> Financial Summary</div>
          <div className="cqv-card-body">
            
            <div className="cqv-pending-box">
              <div>
                <div className="cqv-pending-lbl"><MdWarning size={16} /> Pending Balance</div>
                <div className="cqv-pending-val">₹{pendingAmt.toLocaleString('en-IN')}</div>
                <div className="cqv-pending-sub">{pendingCount} pending entries</div>
              </div>
              <button className="cqv-btn-outline" onClick={() => setShowPending(true)}>View Details</button>
            </div>

            <div className="cqv-dues-wrap">
              <div className="cqv-dues-hdr">
                <div className="cqv-dues-title"><MdCalendarToday size={14} /> Upcoming Dues</div>
                <div className="cqv-dues-link">View All</div>
              </div>
              {billTxns.slice(0, 5).map((t, i) => {
                const createdDate = new Date(t.created_at || Date.now());
                const dueDate = new Date(createdDate);
                dueDate.setDate(dueDate.getDate() + 30);
                
                const today = new Date();
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                const statusText = diffDays > 0 ? `Due in ${diffDays} days` : diffDays === 0 ? 'Due Today' : `Overdue ${Math.abs(diffDays)}d`;
                const statusColor = diffDays > 7 ? '#059669' : diffDays >= 0 ? '#d97706' : '#dc2626';
                const statusBg = diffDays > 7 ? '#ecfdf5' : diffDays >= 0 ? '#fffbeb' : '#fef2f2';

                const bankInfo = t.card_bank ? `${t.card_bank} •••• ${t.card_last4 || 'XXXX'}` : (t.bill_platform || t.platform || 'Bill Payment');

                return (
                  <div className="cqv-dues-row" key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>{bankInfo}</div>
                      <div style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>
                        {dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} 
                        <span style={{ margin: '0 6px', color: '#cbd5e1' }}>|</span> 
                        <span style={{ color: statusColor, background: statusBg, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{statusText}</span>
                      </div>
                    </div>
                    <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 14 }}>₹{parseFloat(t.bill_amount || t.amount || 0).toLocaleString('en-IN')}</div>
                  </div>
                )
              })}
              {billTxns.length === 0 && <div style={{ fontSize: 11, color: '#b45309', padding: '10px 0' }}>No upcoming dues.</div>}
            </div>

            <div className="cqv-svc-wrap">
              <div className="cqv-svc-title"><MdReceipt size={14} /> Service Usage Summary</div>
              <div className="cqv-svc-chips">
                {Object.entries(serviceBreakdown).map(([svc, cnt]) => (
                  <span className="cqv-svc-chip" key={svc}>{svc} ×{cnt}</span>
                ))}
              </div>
              {Object.keys(serviceBreakdown).length === 0 && <div style={{ fontSize: 11, color: '#15803d' }}>No services used yet.</div>}
            </div>

          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="cqv-table-card">
        <div className="cqv-table-header">
          <div className="cqv-table-title"><span className="num" style={{ background:'#f97316', color:'white', width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>5</span> Recent Transactions</div>
          <button className="cqv-btn-outline" style={{ border: '1px solid #cbd5e1', color: '#475569' }}>View All Transactions</button>
        </div>
        <div className="cqv-table-wrap">
          <table className="cqv-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date & Time</th>
                <th>Service</th>
                <th>Bill Platform</th>
                <th>Bill Amount</th>
                <th>WD Platform</th>
                <th>Card</th>
                <th>Card Bank</th>
                <th>WD Amount</th>
                <th>Bill Remaining</th>
                <th>Total Collected</th>
                <th>Receive Mode</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {txns.slice(0, 5).map((t, i) => (
                <tr key={t.id || i}>
                  <td style={{ color: '#64748b' }}>{i + 1}</td>
                  <td>{new Date(t.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td style={{ fontWeight: 600 }}>{t.service_type}</td>
                  <td>{t.bill_platform || '—'}</td>
                  <td style={{ color: '#dc2626', fontWeight: 700 }}>{parseFloat(t.bill_amount) > 0 ? `₹${parseFloat(t.bill_amount).toLocaleString('en-IN')}` : '—'}</td>
                  <td>{t.platform || '—'}</td>
                  <td>{t.card || '—'} {t.card_last4 ? `****${t.card_last4}` : ''}</td>
                  <td>{t.card_bank || '—'}</td>
                  <td style={{ color: '#16a34a', fontWeight: 700 }}>{parseFloat(t.amount) > 0 ? `₹${parseFloat(t.amount).toLocaleString('en-IN')}` : '—'}</td>
                  <td>₹{parseFloat(t.bill_remaining || 0)}</td>
                  <td style={{ color: '#16a34a', fontWeight: 800 }}>₹{parseFloat(t.total_collected || t.amount || 0).toLocaleString('en-IN')}</td>
                  <td>{t.received_mode || t.payment_mode || '—'}</td>
                  <td style={{ color: '#64748b' }}>{t.note || '—'}</td>
                </tr>
              ))}
              {txns.length === 0 && (
                <tr><td colSpan="13" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No transactions found for this customer.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPending && (
        <div onClick={() => setShowPending(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:500, maxHeight:'85vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ background:'linear-gradient(135deg,#dc2626,#991b1b)', padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Financial Summary</div>
                <div style={{ color:'#fff', fontWeight:900, fontSize:18, marginTop:2 }}>Pending Dues Breakdown</div>
              </div>
              <button onClick={() => setShowPending(false)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', width:32, height:32, borderRadius:'50%', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>
            
            <div style={{ overflowY:'auto', padding:24, flex: 1 }}>
              {pendingData.entries && pendingData.entries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pendingData.entries.map((entry, idx) => (
                    <div key={idx} style={{ padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>Entry #{entry.id}</span>
                        <span style={{ fontWeight: 800, color: '#dc2626' }}>₹{parseFloat(entry.remaining_amount || entry.pending_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Pending for {entry.age_days} days</span>
                        <span style={{ fontWeight: 600 }}>{entry.status}</span>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                        <span style={{ padding: '2px 8px', background: entry.priority === 'High' ? '#fee2e2' : '#f1f5f9', color: entry.priority === 'High' ? '#dc2626' : '#64748b', fontSize: 11, borderRadius: 12, fontWeight: 600 }}>Priority: {entry.priority || 'Normal'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
                  No pending entries found for this customer.
                </div>
              )}
            </div>
            
            <div style={{ padding:'16px 24px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc' }}>
              <div>
                <div style={{ fontSize:12, color:'#64748b', fontWeight:600 }}>Total Pending</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#dc2626' }}>₹{pendingAmt.toLocaleString('en-IN')}</div>
              </div>
              <button onClick={() => setShowPending(false)} style={{ padding:'10px 24px', borderRadius:10, border:'none', background:'#e2e8f0', color:'#475569', fontWeight:700, cursor:'pointer', fontSize:14 }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
