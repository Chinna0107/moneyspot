import React, { useState } from 'react'
import CustomerSidebar from '../../components/customer/CustomerSidebar'
import { useCustomerProfile, getCustomerUser } from '../../hooks/useCustomerAuth'
import '../../components/customer/CustomerSidebar.css'
import './CustomerServices.css'

const WHATSAPP_NUMBER = '919866440477'

const allServices = [
  {
    id: 'card-withdrawal',
    category: 'cards',
    icon: '💳',
    iconBg: '#eff6ff',
    name: 'Credit Card Cash Withdrawal',
    tag: 'Popular',
    tagType: 'popular',
    desc: 'Instantly withdraw liquid cash against your credit card limit at lowest service charges.',
    features: [
      'Instant spot payout (Cash / IMPS / UPI)',
      'All major cards accepted (Visa, RuPay, MC)',
      'Lowest processing charges in the market'
    ]
  },
  {
    id: 'bill-withdrawal',
    category: 'cards',
    icon: '🔄',
    iconBg: '#fef3c7',
    name: 'Bill Pay + Withdrawal Combo',
    tag: 'Best Value',
    tagType: 'hot',
    desc: 'Clear your pending card bill and immediately withdraw fresh limit in one seamless transaction.',
    features: [
      'Zero penalty risk on card due dates',
      'Cycle rollover support with high limits',
      'Immediate cash back to hand'
    ]
  },
  {
    id: 'bill-payment',
    category: 'cards',
    icon: '📄',
    iconBg: '#f0fdf4',
    name: 'Credit Card Bill Payment',
    tag: 'Instant',
    tagType: 'instant',
    desc: 'Pay your credit card monthly bills without delays. Get instant settlement and confirmation.',
    features: [
      'Instant settlement on verified platforms',
      'Avoid late fees & high APR interests',
      'Protects your CIBIL score & credit health'
    ]
  },
  {
    id: 'dmt',
    category: 'banking',
    icon: '💸',
    iconBg: '#faf5ff',
    name: 'Domestic Money Transfer (DMT)',
    tag: 'Instant Payout',
    tagType: 'instant',
    desc: 'Send cash directly to any bank account across India 24x7 within seconds.',
    features: [
      'IMPS / NEFT instant credit',
      'All nationalized & private banks supported',
      'Bank transaction reference SMS immediately'
    ]
  },
  {
    id: 'cibil-repair',
    category: 'credit',
    icon: '📈',
    iconBg: '#ecfdf5',
    name: 'CIBIL Score Check & Repair',
    tag: 'Advisory',
    tagType: 'popular',
    desc: 'Get full credit bureau report analysis and structured guidance to clear defaults and boost your score.',
    features: [
      'Comprehensive report breakdown',
      'Dispute resolution guidance for closed loans',
      'Score enhancement roadmap for loan approvals'
    ]
  },
  {
    id: 'loans',
    category: 'loans',
    icon: '🏦',
    iconBg: '#fff1f2',
    name: 'Loan Assistance & Advisory',
    tag: 'High Limit',
    tagType: 'standard',
    desc: 'Fast-track personal loans, business working capital, and home loan documentation support.',
    features: [
      'Tie-ups with leading NBFCs & Banks',
      'Minimal paperwork & quick branch assistance',
      'Flexible tenure & competitive interest rates'
    ]
  },
  {
    id: 'insurance',
    category: 'banking',
    icon: '🛡️',
    iconBg: '#f0f9ff',
    name: 'Insurance & Protection',
    tag: 'Protection',
    tagType: 'standard',
    desc: 'Protect yourself and your family with health, vehicle, and life cover policies.',
    features: [
      'Instant digital policy issuance',
      'Affordable premiums with maximum coverage',
      'End-to-end claim assistance from branch'
    ]
  }
]

export default function CustomerServices() {
  const user = getCustomerUser()
  const { profile } = useCustomerProfile()
  const [activeTab, setActiveTab] = useState('all')
  const [selectedService, setSelectedService] = useState(null)
  const [inquiryAmount, setInquiryAmount] = useState('')
  const [inquiryNote, setInquiryNote] = useState('')

  const branchName = profile?.branch || user?.branch || 'MoneySpot Branch'

  const filteredServices = activeTab === 'all'
    ? allServices
    : allServices.filter(s => s.category === activeTab)

  const handleOpenInquiry = (service) => {
    setSelectedService(service)
    setInquiryAmount('')
    setInquiryNote('')
  }

  const handleSendWhatsApp = (service, customMsg = '') => {
    let text = `Hi MoneySpot (${branchName}),\n\nI am interested in *${service.name}*.\nName: ${profile?.name || user?.name || 'Customer'}\nMobile: ${profile?.phone || user?.phone || ''}`
    if (inquiryAmount) {
      text += `\nRequired Amount: ₹${Number(inquiryAmount).toLocaleString('en-IN')}`
    }
    if (inquiryNote || customMsg) {
      text += `\nNote: ${customMsg || inquiryNote}`
    }
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank')
    setSelectedService(null)
  }

  return (
    <div className="cust-page">
      <CustomerSidebar />
      <div className="cust-content">

        {/* ── Hero Banner ── */}
        <div className="cs-hero">
          <div className="cs-hero-orb cs-orb1" />
          <div className="cs-hero-orb cs-orb2" />
          <div className="cs-hero-inner">
            <div>
              <div className="cs-badge-pill">
                <span>⚡</span> Instant Branch & Digital Fulfillment
              </div>
              <h1 className="cs-hero-title">Financial Services Hub</h1>
              <p className="cs-hero-sub">
                Avail instant credit card withdrawals, bill payments, money transfers, and loan services at your nearest <strong>{branchName}</strong>.
              </p>
            </div>
            <div className="cs-hero-actions">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi MoneySpot (${branchName}), I need help with services.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cust-btn cust-btn-primary"
                style={{ padding: '12px 20px', borderRadius: 12, fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
              >
                <span>💬</span> Chat with Branch
              </a>
              <a
                href={`tel:+${WHATSAPP_NUMBER}`}
                className="cust-btn"
                style={{ padding: '12px 18px', borderRadius: 12, fontWeight: 700, textDecoration: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>📞</span> Call Helpdesk
              </a>
            </div>
          </div>
        </div>

        {/* ── Category Filter Tabs ── */}
        <div className="cs-tabs">
          {[
            { id: 'all', label: 'All Services', icon: '✨' },
            { id: 'cards', label: 'Credit Card Solutions', icon: '💳' },
            { id: 'banking', label: 'Banking & DMT', icon: '🏦' },
            { id: 'credit', label: 'CIBIL & Advisory', icon: '📈' },
            { id: 'loans', label: 'Loans & Capital', icon: '💰' },
          ].map(t => (
            <button
              key={t.id}
              className={`cs-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Services Cards Grid ── */}
        <div className="cs-grid">
          {filteredServices.map((s) => (
            <div key={s.id} className="cs-card">
              <div>
                <div className="cs-card-top">
                  <div className="cs-icon-box" style={{ background: s.iconBg }}>
                    {s.icon}
                  </div>
                  <span className={`cs-tag cs-tag-${s.tagType}`}>
                    {s.tag}
                  </span>
                </div>

                <h3 className="cs-title">{s.name}</h3>
                <p className="cs-desc">{s.desc}</p>

                <div className="cs-features">
                  {s.features.map((f, i) => (
                    <div key={i} className="cs-feature-item">
                      <span className="bullet">✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cs-card-footer">
                <button
                  className="cs-btn-request"
                  onClick={() => handleOpenInquiry(s)}
                >
                  <span>Request Service</span>
                  <span>→</span>
                </button>
                <button
                  className="cs-btn-wa"
                  title="Direct WhatsApp Inquiry"
                  onClick={() => handleSendWhatsApp(s, 'Quick inquiry from app')}
                >
                  💬
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Trust & Security Highlights ── */}
        <div className="cs-trust-banner">
          <div className="cs-trust-item">
            <div className="cs-trust-icon">⚡</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Spot Payouts</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Cash in hand or instant bank credit</div>
            </div>
          </div>
          <div className="cs-trust-item">
            <div className="cs-trust-icon">🔒</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>100% Encrypted & Safe</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Licensed POS machines & secure gateways</div>
            </div>
          </div>
          <div className="cs-trust-item">
            <div className="cs-trust-icon">🏦</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Dedicated Branch Desk</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{branchName} personal relationship manager</div>
            </div>
          </div>
        </div>

        {/* ── Quick Service Request Modal ── */}
        {selectedService && (
          <div className="cs-modal-overlay" onClick={() => setSelectedService(null)}>
            <div className="cs-modal" onClick={e => e.stopPropagation()}>
              <div className="cs-modal-header">
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Service Inquiry</div>
                  <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{selectedService.name}</div>
                </div>
                <button className="cs-modal-close" onClick={() => setSelectedService(null)}>✕</button>
              </div>

              <div className="cs-modal-body">
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, color: '#475569' }}>
                  Connecting you with <strong>{branchName}</strong> desk for fast turnaround.
                </div>

                <div className="cust-form-group">
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Estimated Amount Needed (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50,000"
                    value={inquiryAmount}
                    onChange={e => setInquiryAmount(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 15, fontWeight: 600, boxSizing: 'border-box' }}
                  />
                </div>

                <div className="cust-form-group">
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Specific Note / Card Details (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. HDFC Visa card, need urgent bill clearance today"
                    value={inquiryNote}
                    onChange={e => setInquiryNote(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    className="cust-btn"
                    onClick={() => setSelectedService(null)}
                    style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="cust-btn cust-btn-primary"
                    onClick={() => handleSendWhatsApp(selectedService)}
                    style={{ flex: 2, padding: '12px', borderRadius: 10, fontWeight: 800, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <span>💬</span> Connect via WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
