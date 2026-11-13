import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCustomerProfile,
  useCustomerTransactions,
  useCustomerCoins,
  useCustomerOverview,
  getCustomerUser
} from '../../hooks/useCustomerAuth'
import CustomerSidebar from '../../components/customer/CustomerSidebar'
import { SkeletonStat, SkeletonCard, SkeletonTable } from '../../components/customer/Skeleton'
import CustomerHeader from '../../components/shared/CustomerHeader'
import '../../components/customer/CustomerSidebar.css'
import './CustomerDashboard.css'

const fmt = n => Number(parseFloat(n) || 0).toLocaleString('en-IN')
const WHATSAPP_NUMBER = '919866440477'

export default function CustomerDashboard() {
  const navigate = useNavigate()
  const user = getCustomerUser()
  const { profile, loading: pLoading } = useCustomerProfile()
  const { txns, loading: tLoading }    = useCustomerTransactions()
  const { coins: coinsData }           = useCustomerCoins()
  const { overview }                   = useCustomerOverview()

  const [activeTab, setActiveTab] = useState('all')

  const total     = txns.length
  const amount    = txns.reduce((s, t) => s + parseFloat(t.amount || 0), 0)
  const success   = txns.filter(t => t.status === 'success' || !t.status).length
  const now       = new Date()
  const hour      = now.getHours()
  const coinsBal  = coinsData?.coins ?? 0
  const greeting  = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const branchName= profile?.branch || user?.branch || 'MoneySpot Branch'

  const pendingBal = overview?.pending?.total_remaining || 0
  const pendingCount = overview?.pending?.count || 0
  const upcomingDues = overview?.upcoming_dues || []
  const savedCards   = overview?.cards || []

  return (
    <div className="cust-page">
      <CustomerSidebar />
      <div className="cust-content">

        {/* ── Hero Banner ── */}
        <div className="cd-hero">
          <div className="cd-hero-orb cd-orb1" />
          <div className="cd-hero-orb cd-orb2" />
          <div className="cd-hero-inner">
            <div style={{ flex: 1 }}>
              <div className="cd-greeting" style={{ marginBottom: 10 }}>{greeting} 👋</div>
              {profile ? (
                <CustomerHeader customer={profile} txns={txns} dark={true} style={{ marginBottom: 12 }} />
              ) : (
                <h1 className="cd-hero-name">{user?.name || 'Customer'}</h1>
              )}
              <div className="cd-hero-meta">
                <span>📅 {now.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                {profile?.branch && <span className="cd-branch-pill">🏦 {profile.branch}</span>}
                <span style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                  ✓ Active Account
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Critical Alerts: Pending Balance & Upcoming Dues ── */}
        {(pendingBal > 0 || upcomingDues.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: pendingBal > 0 && upcomingDues.length > 0 ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
            {pendingBal > 0 && (
              <div style={{ background: 'linear-gradient(135deg, #fff1f2, #fee2e2)', border: '1.5px solid #fca5a5', borderRadius: 16, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(239,68,68,0.08)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <span>⚠️</span> Pending Collection Balance
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#991b1b', marginTop: 4 }}>
                    ₹{fmt(pendingBal)}
                  </div>
                  <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>
                    {pendingCount} open case(s) pending for settlement
                  </div>
                </div>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi MoneySpot (${branchName}), I want to clear my pending balance of ₹${fmt(pendingBal)}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: '#dc2626', color: '#fff', textDecoration: 'none', padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 12px rgba(220,38,38,0.25)' }}
                >
                  Clear via WhatsApp →
                </a>
              </div>
            )}

            {upcomingDues.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1.5px solid #93c5fd', borderRadius: 16, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(59,130,246,0.08)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2563eb', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <span>🗓️</span> Upcoming Bill Dues
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#1e40af', marginTop: 4 }}>
                    ₹{fmt(upcomingDues[0].bill_amount || upcomingDues[0].amount)}
                  </div>
                  <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>
                    Due date: <strong>{new Date(upcomingDues[0].bill_due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</strong> ({upcomingDues[0].card_bank || 'Card'} •••• {upcomingDues[0].card_last4 || ''})
                  </div>
                </div>
                <button
                  onClick={() => navigate('/customer/services')}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
                >
                  Pay Bill →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Key Performance Stats ── */}
        <div className="cd-stats">
          {tLoading ? [1,2,3,4,5].map(i => <SkeletonStat key={i} />) : (
            <>
              {[
                { icon: '💳', label: 'Total Volume', value: `₹${fmt(amount)}`, color: '#402070', sub: `${total} transactions` },
                { icon: '🪙', label: 'MS Coins',     value: fmt(coinsBal), color: '#d97706', sub: 'Redeemable rewards', onClick: () => navigate('/customer/coins') },
                { icon: '📈', label: 'CIBIL Score',  value: profile?.cibil_score || '750+', color: '#059669', sub: 'Good Credit Health', onClick: () => navigate('/customer/cibil') },
                { icon: '💳', label: 'Saved Cards',  value: savedCards.length, color: '#0284c7', sub: 'Active for Withdrawal' },
                { icon: '🏦', label: 'Assigned Desk',value: branchName, color: '#7c3aed', small: true, sub: 'Personal Manager' },
              ].map((s, i) => (
                <div
                  key={i}
                  className="cd-stat"
                  style={{ '--c': s.color, animationDelay: `${i * 80}ms`, cursor: s.onClick ? 'pointer' : 'default' }}
                  onClick={s.onClick}
                >
                  <div className="cd-stat-glow" />
                  <div className="cd-stat-icon">{s.icon}</div>
                  <div className="cd-stat-label">{s.label}</div>
                  <div className="cd-stat-value" style={s.small ? { fontSize: 18 } : {}}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{s.sub}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Quick Services Access Grid ── */}
        <div className="cd-card cd-card-anim" style={{ marginBottom: 24 }}>
          <div className="cd-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="cd-card-icon">⚡</span>
              <h2 style={{ margin: 0 }}>Instant Financial Services</h2>
            </div>
            <button
              onClick={() => navigate('/customer/services')}
              style={{ background: 'none', border: 'none', color: '#402070', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              View All Services →
            </button>
          </div>
          <div className="cd-card-body">
            <div className="cd-quick-grid">
              {[
                { icon: '💳', label: 'Card Cash Withdrawal', desc: 'Instant cash payout', color: '#c02040', to: '/customer/services' },
                { icon: '🔄', label: 'Bill Pay + Withdrawal', desc: 'Limit rollover', color: '#402070', to: '/customer/services' },
                { icon: '📄', label: 'Pay Card Bill',        desc: 'Instant settlement', color: '#059669', to: '/customer/services' },
                { icon: '💸', label: 'Money Transfer (DMT)',  desc: 'IMPS 24x7 India', color: '#0284c7', to: '/customer/services' },
                { icon: '📈', label: 'CIBIL Report Check',   desc: 'Bureau health', color: '#d97706', to: '/customer/cibil' },
                { icon: '🎁', label: 'Redeem MS Coins',      desc: 'Umbrella & vouchers', color: '#b8860b', to: '/customer/coins' },
              ].map((a, i) => (
                <div
                  key={i}
                  className="cd-quick-btn"
                  style={{ '--qc': a.color, animationDelay: `${i * 60}ms`, cursor: 'pointer' }}
                  onClick={() => navigate(a.to)}
                >
                  <span className="cd-quick-icon">{a.icon}</span>
                  <span className="cd-quick-label">{a.label}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{a.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Two-Column Layout: Account Overview & Saved Cards ── */}
        <div className="cd-grid">
          {/* Account Details */}
          {pLoading ? <SkeletonCard rows={6} /> : (
            <div className="cd-card cd-card-anim">
              <div className="cd-card-header">
                <span className="cd-card-icon">👤</span>
                <h2>Verified Profile Details</h2>
                <span className="cd-verified">✓ KYC Approved</span>
              </div>
              <div className="cd-card-body">
                {[
                  { label: 'Full Name',    value: profile?.name },
                  { label: 'PAN Number',   value: profile?.pan },
                  { label: 'Mobile',       value: profile?.phone },
                  { label: 'Aadhaar No.',  value: profile?.aadhar ? `•••• •••• ${profile.aadhar.slice(-4)}` : '—' },
                  { label: 'Bank Account', value: profile?.acc_number || profile?.account_number || '—' },
                  { label: 'IFSC Code',    value: profile?.ifsc_code || '—' },
                  { label: 'Branch City',  value: profile?.branch || '—' },
                  { label: 'Member Since', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—' },
                ].map((row, i) => (
                  <div key={i} className="cd-info-row" style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="cd-info-label">{row.label}</span>
                    <span className="cd-info-value" style={{ fontWeight: 600 }}>{row.value || '—'}</span>
                  </div>
                ))}
                <div style={{ marginTop: 16 }}>
                  <button
                    onClick={() => navigate('/customer/kyc')}
                    style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, color: '#402070', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                  >
                    View Complete KYC Documents →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Saved Cards for Quick Service */}
          <div className="cd-card cd-card-anim" style={{ animationDelay: '100ms' }}>
            <div className="cd-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="cd-card-icon">💳</span>
                <h2 style={{ margin: 0 }}>Registered Cards</h2>
              </div>
              <span className="cd-card-badge">{savedCards.length} Cards</span>
            </div>
            <div className="cd-card-body">
              {savedCards.length === 0 ? (
                <div className="cd-empty" style={{ padding: '30px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>No Saved Cards Yet</div>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    When your branch employee performs a card service, your card details will securely appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {savedCards.map(c => (
                    <div
                      key={c.id}
                      style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: 14, padding: '16px 20px', color: '#fff', boxShadow: '0 6px 18px rgba(30,27,75,0.25)', position: 'relative', overflow: 'hidden' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{c.bank_name}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, marginTop: 6 }}>
                            •••• •••• •••• {c.last_4_digits}
                          </div>
                        </div>
                        <span style={{ fontSize: 24 }}>💳</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: 12 }}>
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Due Day: <strong>{c.due_date_day ? `${c.due_date_day}th of every month` : 'Not set'}</strong>
                        </span>
                        <a
                          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi MoneySpot (${branchName}), I want to request a withdrawal for my ${c.bank_name} card ending in ${c.last_4_digits}.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', textDecoration: 'none', padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}
                        >
                          Request Service →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Recent Transactions ── */}
        <div className="cd-card cd-card-anim" style={{ marginTop: 24, animationDelay: '200ms' }}>
          <div className="cd-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="cd-card-icon">📊</span>
              <h2 style={{ margin: 0 }}>Recent Transactions</h2>
            </div>
            <button
              onClick={() => navigate('/customer/transactions')}
              style={{ background: 'none', border: 'none', color: '#402070', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              View All ({total}) →
            </button>
          </div>
          {tLoading ? <SkeletonTable rows={4} cols={5} /> : (
            <div className="cust-table-wrap">
              {txns.length === 0 ? (
                <div className="cd-empty">
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
                  <div>No transactions yet</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Visit your branch to avail financial services</div>
                </div>
              ) : (
                <table className="cust-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Service Type</th>
                      <th>Bank & Card</th>
                      <th>Amount</th>
                      <th>Settled</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.slice(0, 5).map((t, i) => (
                      <tr key={t.id} className="cd-tr" style={{ animationDelay: `${i * 50}ms` }}>
                        <td style={{ color: '#94a3b8', fontSize: 12 }}>#{t.id}</td>
                        <td style={{ fontSize: 12 }}>{new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td><strong>{t.service_type || '—'}</strong></td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{t.card_bank || t.bank || '—'}</div>
                          {(t.card || t.card_last4) && (
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {t.card} {t.card_last4 ? `•••• ${t.card_last4}` : ''}
                            </div>
                          )}
                        </td>
                        <td><strong style={{ color: '#0f172a' }}>₹{fmt(t.amount)}</strong></td>
                        <td><span style={{ color: '#059669', fontWeight: 800 }}>₹{fmt(t.settled_amount)}</span></td>
                        <td>
                          <button
                            onClick={() => navigate('/customer/transactions')}
                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#402070' }}
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* ── 24/7 Branch Support Hotline Banner ── */}
        <div className="cd-support-banner" style={{ marginTop: 24 }}>
          <div className="cd-support-orb" />
          <div className="cd-support-inner">
            <div>
              <div className="cd-support-title">Need Immediate Branch Assistance?</div>
              <div className="cd-support-sub">Your dedicated branch team at {branchName} is ready to serve you</div>
            </div>
            <div className="cd-support-btns">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi MoneySpot (${branchName}), I need assistance.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cd-wa-btn"
              >
                💬 WhatsApp Desk
              </a>
              <a href={`tel:+${WHATSAPP_NUMBER}`} className="cd-call-btn">
                📞 Call Branch
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
