import React, { useState, useCallback, useRef } from 'react'
import Sidebar from '../../components/superadmin/Sidebar'
import { api } from '../../utils/api'
import { getTokenByRole } from '../../utils/tokenUtils'
import { CustomerBehaviorTags, getActivityStatus } from '../../utils/customerBehaviorUtils'
import { getCustomerTier, TierBadge } from '../../utils/tierUtils'
import CustomerHeader from '../../components/shared/CustomerHeader'
import '../dashboard.css'
import './superadmin.css'

const auth = () => ({ Authorization: `Bearer ${getTokenByRole('superadmin')}` })
const fmt  = n => Number(parseFloat(n) || 0).toLocaleString('en-IN')
const fmtV = n => { const v = parseFloat(n)||0; if (v>=100000) return `₹${(v/100000).toFixed(1)}L`; if (v>=1000) return `₹${(v/1000).toFixed(1)}K`; return `₹${fmt(v)}` }

const STATUS = {
  approved: { bg: '#d1fae5', color: '#059669', label: '✅ Approved' },
  pending:  { bg: '#fef3c7', color: '#d97706', label: '⏳ Pending'  },
  rejected: { bg: '#fee2e2', color: '#dc2626', label: '❌ Rejected' },
}

const Badge = ({ status }) => {
  const s = STATUS[status] || STATUS.pending
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s.label}</span>
}

export default function SACustomerInfo() {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState(null)
  const [txns, setTxns]         = useState([])
  const [txnLoading, setTxnLoading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [tab, setTab]           = useState('details')
  const debounceRef             = useRef(null)

  const search = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return }
    setSearching(true)
    try {
      const data = await api(`/customers/superadmin/all?search=${encodeURIComponent(q.trim())}`, { headers: auth() })
      setResults(data.customers || [])
      setSearched(true)
    } catch { setResults([]) }
    setSearching(false)
  }, [])

  const handleInput = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 350)
  }

  const openCustomer = async (c) => {
    setSelected(c)
    setTab('details')
    setTxns([])
    setTxnLoading(true)
    try {
      const data = await api(`/master/transactions?customer_id=${c.id}`, { headers: auth() })
      setTxns(Array.isArray(data) ? data : [])
    } catch { setTxns([]) }
    setTxnLoading(false)
  }

  const totalAmt    = txns.reduce((s, t) => s + parseFloat(t.amount  || 0), 0)
  const totalProfit = txns.reduce((s, t) => s + parseFloat(t.profit  || 0), 0)
  const totalCharge = txns.reduce((s, t) => s + parseFloat(t.charges_amount || 0), 0)
  const serviceBreakdown = txns.reduce((acc, t) => { const k = t.service_type || 'Other'; acc[k] = (acc[k]||0)+1; return acc }, {})

  return (
    <div className="dash-page">
      <Sidebar />
      <div className="dash-content">

        {/* ── Topbar ── */}
        <div className="dash-topbar">
          <div>
            <h1>Customer Info</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Search any customer across all branches</p>
          </div>
        </div>

        <div className="dash-main">

          {/* ── Search Bar ── */}
          <div style={{ background: 'linear-gradient(135deg,#1a0a2e,#402070,#c02040)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'absolute', bottom: -30, left: '40%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>🔍 Search Customer</div>
            <div style={{ position: 'relative', maxWidth: 560 }}>
              <input
                value={query}
                onChange={handleInput}
                placeholder="Search by name, mobile number or PAN..."
                style={{
                  width: '100%', padding: '14px 48px 14px 18px', borderRadius: 12,
                  border: 'none', fontSize: 15, fontFamily: 'inherit',
                  background: 'rgba(255,255,255,0.95)', color: '#1a0a2e',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.2)', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, pointerEvents: 'none' }}>
                {searching ? '⏳' : '🔍'}
              </div>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 8 }}>
              Type at least 2 characters · searches name, phone & PAN across all branches
            </div>
          </div>

          {/* ── Results ── */}
          {searched && !searching && (
            <div className="dash-card">
              <div className="dash-card-header">
                <h2>Results ({results.length})</h2>
                {results.length > 0 && <span style={{ fontSize: 13, color: '#9ca3af' }}>Click a row to view full details</span>}
              </div>
              <div className="dash-table-wrap">
                {results.length === 0 ? (
                  <div className="dash-empty" style={{ padding: '48px 20px' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#374151' }}>No customers found</div>
                    <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Try a different name, phone or PAN</div>
                  </div>
                ) : (
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>PAN</th>
                        <th>Branch</th>
                        <th>Source</th>
                        <th>Transactions</th>
                        <th>Total Value</th>
                        <th>Tier</th>
                        <th>Coins</th>
                        <th>Status</th>
                        <th>Member Since</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(c => (
                        <tr key={c.id} onClick={() => openCustomer(c)}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <td>
                            <div style={{ fontWeight: 800, color: '#1a0a2e' }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.email || '—'}</div>
                          </td>
                          <td style={{ fontSize: 13 }}>{c.phone}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#402070', fontWeight: 700 }}>{c.pan}</td>
                          <td><span style={{ background: '#ede9fe', color: '#402070', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{c.branch || '—'}</span></td>
                          <td style={{ fontSize: 12 }}>{c.source || '—'}</td>
                          <td style={{ fontWeight: 700, color: '#374151' }}>{fmt(c.txn_count || 0)}</td>
                          <td style={{ color: '#059669', fontWeight: 700 }}>{fmtV(c.total_amount || 0)}</td>
                          <td><TierBadge amount={c.total_amount || 0} /></td>
                          <td style={{ color: '#d4af37', fontWeight: 700 }}>🪙 {fmt(c.coins || 0)}</td>
                          <td><Badge status={c.status} /></td>
                          <td style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {!searched && !searching && query.length < 2 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>👤</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>Search for a customer</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Enter a name, mobile number or PAN to get started</div>
            </div>
          )}

        </div>
      </div>

      {/* ── Customer Detail Panel ── */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }} />

          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(600px,100vw)',
            background: '#fff', zIndex: 401, display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 48px rgba(0,0,0,0.2)',
            animation: 'slideInRight 0.25s ease',
          }}>

            {/* Panel Header */}
            <div style={{ background: 'linear-gradient(135deg,#1a0a2e,#402070,#c02040)', padding: '22px 24px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  {!txnLoading && <CustomerHeader customer={selected} txns={txns} dark={true} />}
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 12 }}>
                    {selected.phone} · <span style={{ fontFamily: 'monospace' }}>{selected.pan}</span> · {selected.source || '—'} · 📍 {selected.branch || '—'}
                  </div>
                </div>
                <button onClick={() => setSelected(null)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {[
                  { label: 'Total Profit', val: txnLoading ? '—' : fmtV(totalProfit),   color: '#fde68a' },
                  { label: 'Coins',        val: `🪙 ${fmt(selected.coins || 0)}`,        color: '#fcd34d' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: s.color, marginTop: 2 }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
                {['details', 'documents', 'transactions'].map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                      background: tab === t ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                      color: tab === t ? '#fff' : 'rgba(255,255,255,0.55)' }}>
                    {t === 'details' ? '📋 Details' : t === 'documents' ? '🪪 Documents' : `💳 Transactions${!txnLoading ? ` (${txns.length})` : ''}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {/* ── Details Tab ── */}
              {tab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Full Name',       value: selected.name },
                    { label: 'Email',           value: selected.email || '—' },
                    { label: 'Phone',           value: selected.phone },
                    { label: 'PAN Number',      value: selected.pan },
                    { label: 'Aadhar Number',   value: selected.aadhar || '—' },
                    { label: 'Account Number',  value: selected.acc_number || '—' },
                    { label: 'Branch',          value: selected.branch || '—' },
                    { label: 'Added By',        value: selected.added_by_name || '—' },
                    { label: 'Reviewed By',     value: selected.reviewed_by_name || '—' },
                    { label: 'Referral Name',   value: selected.referral_name || '—' },
                    { label: 'Referral Phone',  value: selected.referral_phone || '—' },
                    { label: 'Coins Balance',   value: `🪙 ${fmt(selected.coins || 0)}`, highlight: true },
                    { label: 'Coins Redeemed',  value: `🪙 ${fmt(selected.coins_redeemed || 0)}` },
                    { label: 'Member Since',    value: new Date(selected.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: f.highlight ? '#fef9e7' : '#f8fafc', borderRadius: 10, border: `1px solid ${f.highlight ? '#fde68a' : '#f0f2f8'}` }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>{f.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1a0a2e', fontFamily: f.label.includes('PAN') || f.label.includes('Aadhar') || f.label.includes('Account') ? 'monospace' : 'inherit' }}>{f.value}</span>
                    </div>
                  ))}

                  {/* Service Breakdown */}
                  {!txnLoading && Object.keys(serviceBreakdown).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Service Breakdown</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(serviceBreakdown).map(([svc, cnt]) => (
                          <span key={svc} style={{ background: '#ede9fe', color: '#402070', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            {svc} ×{cnt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Documents Tab ── */}
              {tab === 'documents' && (
                <div>
                  {[
                    { url: selected.aadhar_img_url,     label: '🪪 Aadhaar Card' },
                    { url: selected.pan_img_url,        label: '🆔 PAN Card' },
                    { url: selected.card_front_img_url, label: '🏧 Card Front' },
                  ].map(d => (
                    <div key={d.label} style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#402070', marginBottom: 8 }}>{d.label}</div>
                      {d.url ? (
                        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid rgba(64,32,112,0.15)', cursor: 'pointer', position: 'relative' }}
                          onClick={() => setLightbox({ url: d.url, label: `${selected.name} — ${d.label}` })}>
                          <img src={d.url} alt={d.label}
                            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
                            onError={e => { e.currentTarget.parentElement.innerHTML = '<div style="padding:24px;text-align:center;color:#9ca3af;font-size:13px">⚠️ Image failed to load</div>' }} />
                          <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                            🔍 Click to enlarge
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '32px 20px', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                          Not uploaded
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Transactions Tab ── */}
              {tab === 'transactions' && (
                <div>
                  {/* Summary */}
                  {!txnLoading && txns.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                      {[
                        { label: 'Total Value',   val: fmtV(totalAmt),    color: '#059669' },
                        { label: 'Total Charges', val: fmtV(totalCharge), color: '#d97706' },
                        { label: 'Total Profit',  val: fmtV(totalProfit), color: '#7c3aed' },
                      ].map(s => (
                        <div key={s.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', textAlign: 'center', border: '1px solid #f0f2f8' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 900, color: s.color, marginTop: 4 }}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {txnLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{ height: 72, borderRadius: 12, background: 'linear-gradient(90deg,#f0f2f8 25%,#e4e6f0 50%,#f0f2f8 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.4s infinite linear' }} />
                      ))}
                    </div>
                  ) : txns.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>No transactions yet</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {txns.map(t => (
                        <div key={t.id} style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #f0f2f8' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#1a0a2e' }}>{t.service_type}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                #{t.id} · {t.employee_name || '—'} · {t.branch || '—'}
                              </div>
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                {new Date(t.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#059669', fontWeight: 900, fontSize: 15 }}>₹{fmt(t.amount)}</div>
                              <div style={{ color: '#7c3aed', fontSize: 11, fontWeight: 700 }}>Profit: ₹{fmt(t.profit || 0)}</div>
                              {parseFloat(t.charges_amount) > 0 && (
                                <div style={{ color: '#d97706', fontSize: 11 }}>Charges: ₹{fmt(t.charges_amount)}</div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {(t.platform || t.bill_platform) && <span style={{ background: '#ede9fe', color: '#402070', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{t.platform || t.bill_platform}</span>}
                            {t.card && <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{t.card}{t.card_last4 ? ` ****${t.card_last4}` : ''}</span>}
                            {t.bank && <span style={{ background: '#f0fdf4', color: '#059669', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{t.bank}</span>}
                            {t.payment_mode && <span style={{ background: '#fef3c7', color: '#d97706', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{t.payment_mode}</span>}
                            {t.is_edited && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>✏️ Edited</span>}
                          </div>
                          {t.note && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, fontStyle: 'italic' }}>📝 {t.note}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to   { transform: translateX(0);    opacity: 1; }
            }
            @keyframes shimmer {
              0%   { background-position: -400px 0; }
              100% { background-position:  400px 0; }
            }
          `}</style>
        </>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', maxWidth: 700, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f2f8' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1a0a2e' }}>{lightbox.label}</span>
              <button onClick={() => setLightbox(null)} style={{ background: '#fee2e2', border: 'none', color: '#dc2626', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontWeight: 700 }}>✕</button>
            </div>
            <img src={lightbox.url} alt={lightbox.label} style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block' }} />
          </div>
        </div>
      )}
    </div>
  )
}
