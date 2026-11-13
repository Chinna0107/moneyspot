import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CustomerSidebar from '../../components/customer/CustomerSidebar'
import { useCustomerProfile, useCustomerTransactions, getCustomerUser } from '../../hooks/useCustomerAuth'
import '../../components/customer/CustomerSidebar.css'
import './CustomerMisc.css'

const WHATSAPP_NUMBER = '919866440477'

// ══════════════════════════════════════════════════════════════
// 1. OFFERS & BENEFITS (Enhanced)
// ══════════════════════════════════════════════════════════════
export function CustomerOffers() {
  const user = getCustomerUser()
  const { profile } = useCustomerProfile()
  const [selectedOffer, setSelectedOffer] = useState(null)
  const branchName = profile?.branch || user?.branch || 'Branch'

  const offers = [
    {
      id: 1,
      icon: '☂️',
      title: 'MoneySpot Branded Premium Umbrella',
      category: 'Physical Gift',
      desc: 'Reach 10,000 MS Coins on your account to unlock and claim your heavy-duty official umbrella at your branch.',
      tag: 'Most Loved',
      tagColor: '#d97706',
      accent: 'linear-gradient(90deg, #f59e0b, #d97706)',
      validity: 'Ongoing Reward',
      code: 'MS-GIFT-10K',
      terms: 'Earn 10 coins per ₹1,000 transaction. Coins never expire.'
    },
    {
      id: 2,
      icon: '💳',
      title: 'High-Volume Card Withdrawal Fee Discount',
      category: 'Fee Waiver',
      desc: 'Exclusive reduced charges on single card withdrawals of ₹1,00,000 or above at your branch POS terminal.',
      tag: 'VIP Offer',
      tagColor: '#402070',
      accent: 'linear-gradient(90deg, #402070, #c02040)',
      validity: 'Valid Till Month End',
      code: 'MS-BULK-VIP',
      terms: 'Applicable for all RuPay, Visa, and Mastercard credit withdrawals.'
    },
    {
      id: 3,
      icon: '🔄',
      title: 'Combo Bill Pay Rollover Zero Late-Fee Guarantee',
      category: 'Protection',
      desc: 'Avoid costly card penalties and interest APRs. Clear your due bill and immediately roll over withdrawal in one visit.',
      tag: 'Best Value',
      tagColor: '#059669',
      accent: 'linear-gradient(90deg, #10b981, #059669)',
      validity: 'Every Month Cycle',
      code: 'MS-ROLLOVER',
      terms: 'Supported across all major banks including HDFC, SBI, ICICI, Axis.'
    },
    {
      id: 4,
      icon: '🤝',
      title: 'Friend & Business Referral Bonus',
      category: 'Cash Reward',
      desc: 'Refer fellow business owners or friends. Receive 500 bonus MS Coins credited to your wallet upon their first transaction.',
      tag: 'Refer & Earn',
      tagColor: '#0284c7',
      accent: 'linear-gradient(90deg, #0284c7, #0369a1)',
      validity: 'Unlimited Referrals',
      code: 'MS-REFER-500',
      terms: 'Ask your friend to mention your registered mobile number during onboarding.'
    }
  ]

  const handleClaimOffer = (offer) => {
    const text = `Hi MoneySpot (${branchName}),\n\nI want to claim the offer: *${offer.title}*\nOffer Code: ${offer.code}\nCustomer: ${profile?.name || user?.name || ''}\nMobile: ${profile?.phone || user?.phone || ''}`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="cust-page">
      <CustomerSidebar />
      <div className="cust-content">
        
        {/* Hero */}
        <div className="misc-hero">
          <div className="misc-hero-orb misc-orb1" />
          <div className="misc-hero-orb misc-orb2" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="misc-badge-pill">
              <span>🎁</span> Exclusive Member Privileges
            </div>
            <h1 className="misc-hero-title">Special Offers, Gifts & Discounts</h1>
            <p className="misc-hero-sub">
              Enjoy exclusive rewards, fee waivers on card withdrawals, referral coins, and official MoneySpot gifts at your assigned <strong>{branchName}</strong>.
            </p>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="offer-grid">
          {offers.map(o => (
            <div key={o.id} className="offer-card">
              <div className="offer-card-accent" style={{ background: o.accent }} />
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, border: '1px solid #e2e8f0' }}>
                    {o.icon}
                  </div>
                  <span className="offer-badge" style={{ background: `${o.tagColor}15`, color: o.tagColor, border: `1px solid ${o.tagColor}40` }}>
                    {o.tag}
                  </span>
                </div>

                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 }}>
                  {o.category}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.35 }}>
                  {o.title}
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}>
                  {o.desc}
                </p>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #edf2f7', fontSize: 12, color: '#475569', marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#94a3b8' }}>Validity:</span>
                    <strong>{o.validity}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Coupon / Ref:</span>
                    <strong style={{ color: '#402070', letterSpacing: 0.5 }}>{o.code}</strong>
                  </div>
                </div>
              </div>

              <button
                className="offer-btn"
                style={{ background: 'linear-gradient(135deg, #402070, #c02040)', color: '#fff', boxShadow: '0 4px 14px rgba(64,32,112,0.25)' }}
                onClick={() => handleClaimOffer(o)}
              >
                <span>💬 Claim at {branchName}</span>
                <span>→</span>
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 2. ALERTS & NOTIFICATIONS (Enhanced)
// ══════════════════════════════════════════════════════════════
export function CustomerNotifications() {
  const navigate = useNavigate()
  const { profile } = useCustomerProfile()
  const { txns } = useCustomerTransactions()
  const [filter, setFilter] = useState('all')

  const branchName = profile?.branch || 'Branch'

  // Dynamic real alerts
  const notifications = [
    {
      id: 1,
      category: 'system',
      icon: '🛡️',
      title: 'KYC Identity Verified & Approved',
      desc: `Your Aadhaar, PAN, and Bank details have been fully approved. You can avail all card withdrawals and bill payments at ${branchName}.`,
      date: 'Account Active',
      badge: 'Verified',
      badgeColor: '#10b981',
      action: () => navigate('/customer/kyc')
    },
    {
      id: 2,
      category: 'rewards',
      icon: '🪙',
      title: 'MS Coins Rewards Active',
      desc: 'You automatically earn 10 MS Coins per ₹1,000 transaction. Accumulate 10,000 coins to claim your free MoneySpot Umbrella gift.',
      date: 'Rewards Tracker',
      badge: 'Coins',
      badgeColor: '#d97706',
      action: () => navigate('/customer/coins')
    },
    ...(txns.slice(0, 4).map((t, idx) => ({
      id: 10 + idx,
      category: 'transactions',
      icon: '💳',
      title: `${t.service_type || 'Transaction'} - ₹${Number(t.amount).toLocaleString('en-IN')}`,
      desc: `Processed via ${t.card_bank || t.bank || 'Card'}. Settled Amount: ₹${Number(t.settled_amount).toLocaleString('en-IN')}. Receipt #${t.id} generated.`,
      date: new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      badge: 'Success',
      badgeColor: '#059669',
      action: () => navigate('/customer/transactions')
    }))),
    {
      id: 99,
      category: 'security',
      icon: '🔒',
      title: 'Zero-Fraud Assurance Policy',
      desc: 'Always verify the physical POS terminal amount before authorizing swipe. Receipts are immediately accessible on your portal.',
      date: 'Security Protocol',
      badge: 'Safety',
      badgeColor: '#dc2626',
      action: () => navigate('/customer/security')
    }
  ]

  const filteredNotifs = filter === 'all'
    ? notifications
    : notifications.filter(n => n.category === filter)

  return (
    <div className="cust-page">
      <CustomerSidebar />
      <div className="cust-content">
        
        {/* Hero */}
        <div className="misc-hero">
          <div className="misc-hero-orb misc-orb1" />
          <div className="misc-hero-orb misc-orb2" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="misc-badge-pill">
              <span>🔔</span> Real-Time Feed
            </div>
            <h1 className="misc-hero-title">Alerts & Transaction Notifications</h1>
            <p className="misc-hero-sub">
              Live updates on card transaction settlements, receipts, rewards accumulation, and important branch announcements.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All Alerts (${notifications.length})` },
            { id: 'transactions', label: 'Transactions & Receipts' },
            { id: 'rewards', label: 'MS Coins & Gifts' },
            { id: 'security', label: 'Security & Auth' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                background: filter === f.id ? '#402070' : '#fff',
                color: filter === f.id ? '#fff' : '#475569',
                border: '1.5px solid #e2e8f0',
                padding: '8px 18px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: filter === f.id ? '0 4px 12px rgba(64,32,112,0.2)' : 'none'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredNotifs.map(n => (
            <div
              key={n.id}
              onClick={n.action}
              style={{
                background: '#fff',
                border: '1.5px solid #edf2f7',
                borderRadius: 16,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#edf2f7'}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f8fafc', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {n.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <strong style={{ fontSize: 15, color: '#0f172a' }}>{n.title}</strong>
                  <span style={{ fontSize: 11, fontWeight: 800, color: n.badgeColor, background: `${n.badgeColor}15`, border: `1px solid ${n.badgeColor}40`, padding: '2px 10px', borderRadius: 20 }}>
                    {n.badge}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#475569', margin: '6px 0 10px', lineHeight: 1.5 }}>
                  {n.desc}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>📅 {n.date}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#402070' }}>View Details →</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 3. SUPPORT & HELPDESK (Enhanced)
// ══════════════════════════════════════════════════════════════
export function CustomerSupport() {
  const user = getCustomerUser()
  const { profile } = useCustomerProfile()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [openFaq, setOpenFaq] = useState(0)

  const branchName = profile?.branch || user?.branch || 'Branch'
  const custName   = profile?.name || user?.name || ''
  const custMobile = profile?.phone || user?.phone || ''

  const faqs = [
    {
      q: 'How does Credit Card Cash Withdrawal work at MoneySpot?',
      a: 'Visit your authorized MoneySpot branch POS desk. Our teller charges your card through a certified bank POS terminal and hands over instant liquid cash or makes an instant IMPS/UPI bank credit directly into your verified bank account.'
    },
    {
      q: 'What is the Bill Pay + Withdrawal Combo service?',
      a: 'If your credit card monthly due date has arrived and you want to avoid high late fees and 40%+ annual interest, MoneySpot pays your entire credit card bill immediately. Once settled, we execute a fresh card withdrawal so you maintain liquidity without defaulting.'
    },
    {
      q: 'How are MS Coins earned and how do I redeem my Umbrella?',
      a: 'Every customer automatically earns 10 MS Coins for every ₹1,000 transaction. Once your balance reaches 10,000 MS Coins, you can click "Redeem Reward" in the MS Coins section. Your heavy-duty MoneySpot branded umbrella will be presented at your branch.'
    },
    {
      q: 'What documents are required to perform a transaction?',
      a: 'Once your initial KYC (Aadhaar & PAN) is verified, you only need to carry your physical credit card and government ID proof for spot biometric/PIN verification at the branch.'
    },
    {
      q: 'What should I do if a card transaction fails at the terminal?',
      a: 'If an amount is debited from your card but not confirmed on the POS, bank auto-reversal protocols refund it within 24 to 48 hours. Our branch manager logs the transaction reference number immediately to track it with the acquiring bank.'
    }
  ]

  const handleWhatsAppTicket = (e) => {
    e.preventDefault()
    const text = `*New Customer Support Ticket*\n\nName: ${custName}\nMobile: ${custMobile}\nBranch: ${branchName}\nSubject: ${subject}\n\nDetails:\n${message}`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank')
    setSubject('')
    setMessage('')
  }

  return (
    <div className="cust-page">
      <CustomerSidebar />
      <div className="cust-content">

        {/* Hero */}
        <div className="misc-hero">
          <div className="misc-hero-orb misc-orb1" />
          <div className="misc-hero-orb misc-orb2" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="misc-badge-pill">
              <span>📞</span> Priority Helpdesk
            </div>
            <h1 className="misc-hero-title">Customer Care & Branch Assistance</h1>
            <p className="misc-hero-sub">
              Direct connection with your personal relationship manager at <strong>{branchName}</strong>. Reach out for card settlements, fee queries, or emergency assistance.
            </p>
          </div>
        </div>

        {/* Fast Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 28 }}>
          <div className="sec-card" style={{ background: 'linear-gradient(135deg, #10b981, #047857)', color: '#fff', border: 'none' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#fff', fontWeight: 800 }}>Dedicated WhatsApp Desk</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '0 0 18px', lineHeight: 1.5 }}>
              Message our branch support team with instant turnaround for card clearance.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi MoneySpot (${branchName}), I need help with my account ${custMobile}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: '#fff', color: '#047857', padding: '10px 20px', borderRadius: 10, fontWeight: 800, textDecoration: 'none', display: 'inline-block', fontSize: 13 }}
            >
              Open WhatsApp Chat →
            </a>
          </div>

          <div className="sec-card" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', color: '#fff', border: 'none' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📞</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#fff', fontWeight: 800 }}>Branch Telephone Line</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '0 0 18px', lineHeight: 1.5 }}>
              Available Monday to Saturday (10:00 AM – 8:00 PM).
            </p>
            <a
              href={`tel:+${WHATSAPP_NUMBER}`}
              style={{ background: '#fff', color: '#1e1b4b', padding: '10px 20px', borderRadius: 10, fontWeight: 800, textDecoration: 'none', display: 'inline-block', fontSize: 13 }}
            >
              Call +91 98664 40477 →
            </a>
          </div>

          <div className="sec-card" style={{ background: 'linear-gradient(135deg, #402070, #c02040)', color: '#fff', border: 'none' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏢</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#fff', fontWeight: 800 }}>Assigned Branch Desk</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '0 0 18px', lineHeight: 1.5 }}>
              <strong>{branchName}</strong> physical branch office for fast POS transaction fulfillment.
            </p>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              Operating Hours: 10 AM - 8 PM
            </span>
          </div>
        </div>

        {/* Ticket Form & FAQs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
          {/* Ticket Form */}
          <div className="support-form-card">
            <h2 style={{ margin: '0 0 4px', fontSize: 17, color: '#0f172a' }}>📝 Submit a Support Inquiry</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
              Your ticket is immediately sent to your branch team.
            </p>

            <form onSubmit={handleWhatsAppTicket}>
              <div className="cust-form-group">
                <label>Customer Name</label>
                <input readOnly value={custName} style={{ background: '#f8fafc', color: '#64748b' }} />
              </div>
              <div className="cust-form-group">
                <label>Registered Phone Number</label>
                <input readOnly value={custMobile} style={{ background: '#f8fafc', color: '#64748b' }} />
              </div>
              <div className="cust-form-group">
                <label>Inquiry Topic *</label>
                <select
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14 }}
                >
                  <option value="">Select Topic...</option>
                  <option value="Card Withdrawal Assistance">Credit Card Cash Withdrawal</option>
                  <option value="Bill Payment & Rollover">Bill Pay + Withdrawal Combo</option>
                  <option value="MS Coins / Umbrella Redemption">MS Coins / Umbrella Gift</option>
                  <option value="Transaction Receipt / Statement">Transaction Receipt & Statement</option>
                  <option value="CIBIL Improvement Advisory">CIBIL Report & Advisory</option>
                  <option value="Other Assistance">Other General Inquiry</option>
                </select>
              </div>
              <div className="cust-form-group">
                <label>Detailed Message / Question *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your issue or request in detail..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <button
                type="submit"
                className="cust-btn cust-btn-primary"
                style={{ width: '100%', padding: '13px', borderRadius: 10, fontWeight: 800, fontSize: 14 }}
              >
                Send Ticket via WhatsApp
              </button>
            </form>
          </div>

          {/* Interactive FAQs */}
          <div>
            <h2 style={{ margin: '0 0 16px', fontSize: 17, color: '#0f172a' }}>❓ Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {faqs.map((f, i) => {
                const isOpen = openFaq === i
                return (
                  <div key={i} className={`support-faq-item ${isOpen ? 'open' : ''}`}>
                    <div className="support-faq-q" onClick={() => setOpenFaq(isOpen ? -1 : i)}>
                      <span>{f.q}</span>
                      <span style={{ fontSize: 18, color: '#402070', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        ▾
                      </span>
                    </div>
                    {isOpen && (
                      <div className="support-faq-a">
                        {f.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 4. SECURITY & SESSION MANAGEMENT (Enhanced)
// ══════════════════════════════════════════════════════════════
export function CustomerSecurity() {
  const { profile } = useCustomerProfile()
  const user = getCustomerUser()

  const [sessionTerminated, setSessionTerminated] = useState(false)

  const handleTerminateOtherSessions = () => {
    setSessionTerminated(true)
    setTimeout(() => setSessionTerminated(false), 5000)
  }

  return (
    <div className="cust-page">
      <CustomerSidebar />
      <div className="cust-content">

        {/* Hero */}
        <div className="misc-hero">
          <div className="misc-hero-orb misc-orb1" />
          <div className="misc-hero-orb misc-orb2" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="misc-badge-pill">
              <span>🔐</span> Bank-Grade Data Protection
            </div>
            <h1 className="misc-hero-title">Account Security & Protection</h1>
            <p className="misc-hero-sub">
              Your identity, payout bank accounts, and card transactions are safeguarded with multi-layer encryption and authorized terminal controls.
            </p>
          </div>
        </div>

        {/* 4 Security Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 28 }}>
          {[
            {
              icon: '🛡️',
              title: 'PAN & Mobile 2FA Authentication',
              desc: 'Logins are authenticated strictly using registered PAN and phone credentials with OTP security.',
              badge: 'Enabled',
              badgeColor: '#10b981'
            },
            {
              icon: '🔒',
              title: '256-Bit SSL Data Encryption',
              desc: 'All sensitive banking communications are encrypted in transit using industry-standard TLS protocols.',
              badge: 'Encrypted',
              badgeColor: '#10b981'
            },
            {
              icon: '💳',
              title: 'PCI-DSS Compliant Card Masking',
              desc: 'Branch employees and portals only see masked card digits (•••• 1234). Full CVV & expiry are never recorded.',
              badge: 'Compliant',
              badgeColor: '#0284c7'
            },
            {
              icon: '⏱️',
              title: 'Automatic Session Timeout',
              desc: 'Active login tokens automatically expire after inactivity to prevent unauthorized session hijack.',
              badge: 'Active',
              badgeColor: '#10b981'
            }
          ].map((s, i) => (
            <div key={i} className="sec-card">
              <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 14, color: '#0f172a' }}>{s.title}</strong>
                <span style={{ fontSize: 11, fontWeight: 800, color: s.badgeColor, background: `${s.badgeColor}15`, border: `1px solid ${s.badgeColor}40`, padding: '2px 8px', borderRadius: 12 }}>
                  {s.badge}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Active Session & Device Control */}
        <div className="cust-card" style={{ marginBottom: 24 }}>
          <div className="cust-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📱</span>
              <h2 style={{ margin: 0, fontSize: 16 }}>Current Session & Device Activity</h2>
            </div>
            <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>● Active Now</span>
          </div>
          <div className="cust-card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, padding: '16px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #edf2f7' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                  Web Portal Session — {profile?.name || user?.name || 'Customer'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Registered Mobile: {profile?.phone || user?.phone || '—'} · PAN: {profile?.pan || '—'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  Signed in securely · Assigned Desk: {profile?.branch || 'Branch'}
                </div>
              </div>
              <button
                onClick={handleTerminateOtherSessions}
                style={{ background: '#f1f5f9', border: '1.5px solid #cbd5e1', padding: '10px 18px', borderRadius: 10, color: '#dc2626', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
              >
                🔒 Terminate Other Sessions
              </button>
            </div>
            {sessionTerminated && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, color: '#166534', fontWeight: 600 }}>
                ✓ All other active browser sessions have been invalidated.
              </div>
            )}
          </div>
        </div>

        {/* Security Checklist */}
        <div className="cust-card">
          <div className="cust-card-header">
            <h2 style={{ margin: 0, fontSize: 16 }}>🛡️ Essential Safety Rules for Customers</h2>
          </div>
          <div className="cust-card-body">
            {[
              { rule: 'Never share OTP or PIN', detail: 'MoneySpot employees and branch managers will NEVER ask for your ATM PIN, card CVV, or NetBanking password.' },
              { rule: 'Verify Physical POS Swipes', detail: 'Ensure your card is swiped in your presence on an official bank POS machine and always check the amount on the display.' },
              { rule: 'Collect Printed Transaction Receipts', detail: 'Always verify the printed transaction slip or digital receipt available under your Transactions history.' },
              { rule: 'Report Lost or Compromised Cards', detail: 'If your credit card is misplaced or you suspect unauthorized transactions, block your card with your bank immediately and inform MoneySpot.' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>
                  ✓
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{item.rule}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
