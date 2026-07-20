import { useState, useEffect } from 'react'
import CustomerSidebar from '../../components/customer/CustomerSidebar'
import { useCustomerCoins, useCustomerTransactions, useRedeemRequest } from '../../hooks/useCustomerAuth'
import '../../components/customer/CustomerSidebar.css'
import './Coins.css'

const fmt = n => Number(n).toLocaleString('en-IN')

const UMBRELLA_IMGS = [
  'https://res.cloudinary.com/dgyykbmt6/image/upload/v1784531676/WhatsApp_Image_2026-07-20_at_12.20.04_rzentv.jpg',
  'https://res.cloudinary.com/dgyykbmt6/image/upload/v1784531675/WhatsApp_Image_2026-07-20_at_12.20.05_2_gvg7kb.jpg',
  'https://res.cloudinary.com/dgyykbmt6/image/upload/v1784531676/WhatsApp_Image_2026-07-20_at_12.20.05_1_zjvfkd.jpg',
  'https://res.cloudinary.com/dgyykbmt6/image/upload/v1784531675/WhatsApp_Image_2026-07-20_at_12.20.04_2_sa08cc.jpg',
  'https://res.cloudinary.com/dgyykbmt6/image/upload/v1784531675/WhatsApp_Image_2026-07-20_at_12.20.05_tpvtkf.jpg'
]

function UmbrellaGift({ balance }) {
  const [active, setActive]   = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const COINS    = 10000
  const unlocked = balance >= COINS
  const progress = Math.min(100, Math.floor((balance / COINS) * 100))
  const remaining = Math.max(0, COINS - balance)

  const prev = () => setActive(i => (i - 1 + UMBRELLA_IMGS.length) % UMBRELLA_IMGS.length)
  const next = () => setActive(i => (i + 1) % UMBRELLA_IMGS.length)

  return (
    <>
      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="umbrella-lightbox" onClick={() => setLightbox(false)}>
          <button className="umbrella-lightbox-close" onClick={() => setLightbox(false)}>✕</button>
          <button className="umbrella-lightbox-nav left" onClick={e => { e.stopPropagation(); prev() }}>&#8249;</button>
          <img
            src={UMBRELLA_IMGS[active]}
            alt={`Umbrella ${active + 1}`}
            className="umbrella-lightbox-img"
            onClick={e => e.stopPropagation()}
          />
          <button className="umbrella-lightbox-nav right" onClick={e => { e.stopPropagation(); next() }}>&#8250;</button>
          <div className="umbrella-lightbox-dots">
            {UMBRELLA_IMGS.map((_, i) => (
              <button key={i} className={`umbrella-lightbox-dot ${i === active ? 'active' : ''}`}
                onClick={e => { e.stopPropagation(); setActive(i) }} />
            ))}
          </div>
        </div>
      )}

      <div className="coins-gifts-section">
        <div className="coins-gifts-header">
          <div>
            <div className="coins-gifts-eyebrow">🎁 Rewards Catalogue</div>
            <h2 className="coins-gifts-title">Gift You Can Win</h2>
            <p className="coins-gifts-sub">Earn coins on every transaction and unlock this amazing gift!</p>
          </div>
          <div className="coins-gifts-balance-chip">
            <span className="coins-gifts-chip-icon">🪙</span>
            <div>
              <div className="coins-gifts-chip-val">{fmt(balance)}</div>
              <div className="coins-gifts-chip-lbl">Your Coins</div>
            </div>
          </div>
        </div>

        <div className="umbrella-card">
          {/* Image Carousel */}
          <div className="umbrella-carousel">
            <img
              src={UMBRELLA_IMGS[active]}
              alt={`Umbrella ${active + 1}`}
              className="umbrella-main-img"
              onClick={() => setLightbox(true)}
            />
            <div className="umbrella-img-overlay" />
            {unlocked
              ? <div className="gift-status gift-status-unlocked">🎉 Unlocked!</div>
              : <div className="gift-status gift-status-locked">🔒 {remaining.toLocaleString('en-IN')} more coins</div>
            }
            <div className="gift-coins-badge">🪙 {COINS.toLocaleString('en-IN')}</div>
            <button className="umbrella-arrow umbrella-arrow-left" onClick={prev}>&#8249;</button>
            <button className="umbrella-arrow umbrella-arrow-right" onClick={next}>&#8250;</button>
          </div>

          {/* Thumbnails */}
          <div className="umbrella-thumbs">
            {UMBRELLA_IMGS.map((img, i) => (
              <img key={i} src={img} alt={`thumb ${i + 1}`}
                className={`umbrella-thumb ${i === active ? 'umbrella-thumb-active' : ''}`}
                onClick={() => setActive(i)} />
            ))}
          </div>

          {/* Info */}
          <div className="umbrella-info">
            <div className="gift-name" style={{ fontSize: 20 }}>☂️ Premium MoneySpot Umbrella</div>
            <div className="gift-desc" style={{ fontSize: 13, marginBottom: 16 }}>
              High-quality windproof umbrella with UV protection — branded exclusively for MoneySpot customers. Compact, sturdy, and stylish for all seasons.
            </div>
            <div className="gift-progress-wrap">
              <div className="gift-progress-top">
                <span className="gift-progress-label">Progress</span>
                <span className="gift-progress-pct" style={{ color: '#402070' }}>{progress}%</span>
              </div>
              <div className="gift-bar-track">
                <div className="gift-bar-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#402070,#c02040)' }} />
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                {unlocked ? 'You have enough coins to claim!' : `${remaining.toLocaleString('en-IN')} more coins needed`}
              </div>
            </div>
            {unlocked
              ? <button className="gift-claim-btn" style={{ '--gc': '#402070', marginTop: 16 }}>🎁 Claim Gift</button>
              : <div className="gift-need" style={{ marginTop: 12 }}>{remaining.toLocaleString('en-IN')} coins to go</div>
            }
          </div>
        </div>
      </div>
    </>
  )
}

export default function CustomerCoins() {
  const { coins, loading } = useCustomerCoins()
  const { submitRequest, hasPending, history, loading: requesting, msg: reqMsg, error: reqErr, setMsg: setReqMsg, setError: setReqErr } = useRedeemRequest()
  const [redeemAmt, setRedeemAmt] = useState(10000)
  const [requested, setRequested] = useState(false)

  useEffect(() => { if (hasPending) setRequested(true) }, [hasPending])

  const balance       = coins?.coins          ?? 0
  const totalRedeemed = coins?.coins_redeemed ?? 0
  const totalEarned   = balance + totalRedeemed

  const handleRequest = async () => {
    if (redeemAmt < 10000) return setReqErr('Minimum 10,000 coins required to redeem')
    if (redeemAmt > balance) return setReqErr('Not enough coins')
    const ok = await submitRequest(redeemAmt)
    if (ok) setRequested(true)
  }

  return (
    <div className="cust-page">
      <CustomerSidebar />
      <div className="cust-content">

        {/* ── Hero ── */}
        <div className="coins-hero">
          <div className="coins-hero-orb coins-orb1" />
          <div className="coins-hero-orb coins-orb2" />
          <div className="coins-hero-inner">
            <div>
              <div className="coins-hero-label">MoneySpot Rewards</div>
              <h1 className="coins-hero-title">🪙 Your Coins</h1>
              <div className="coins-hero-sub">Earn coins on every transaction · Redeem 10 coins = ₹1 discount</div>
            </div>
            <div className="coins-balance-pill">
              <div className="coins-balance-icon">🪙</div>
              <div>
                <div className="coins-balance-val">{loading ? '...' : fmt(balance)}</div>
                <div className="coins-balance-lbl">Available Coins</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="coins-summary">
          {[
            // { icon: '🪙', label: 'Available Coins',  value: fmt(balance),        color: '#d4af37', sub: `≈ ₹${fmt(Math.floor(balance / 10))} redeemable` },
            { icon: '📈', label: 'Total Earned',      value: fmt(totalEarned),    color: '#059669', sub: 'Coins earned on transactions' },
            { icon: '🎁', label: 'Total Redeemed',    value: fmt(totalRedeemed),  color: '#c02040', sub: `₹${fmt(Math.floor(totalRedeemed / 10))} saved` },
            // { icon: '💡', label: 'Redeem Rate',       value: 'upda',           color: '#402070', sub: '1 coin = ₹0.10 (10 paise)' },
          ].map((c, i) => (
            <div key={i} className="coins-sum-card" style={{ '--cc': c.color, animationDelay: `${i * 80}ms` }}>
              <div className="coins-sum-glow" />
              <div className="coins-sum-icon">{c.icon}</div>
              <div className="coins-sum-val">{loading ? '—' : c.value}</div>
              <div className="coins-sum-label">{c.label}</div>
              <div className="coins-sum-sub">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Gifts & Rewards ── */}
        <UmbrellaGift balance={balance} />

        <div className="coins-grid">

          {/* ── Redeem Card ── */}
          <div className="coins-card">
            <div className="coins-card-header">
              <span>🎁</span>
              <h2>Redeem Coins</h2>
              <span className="coins-card-badge">🪙 Min 10,000</span>
            </div>
            <div className="coins-card-body">
              {reqMsg  && <div className="coins-alert coins-alert-success">✅ {reqMsg}</div>}
              {reqErr  && <div className="coins-alert coins-alert-error">❌ {reqErr}</div>}

              <div className="coins-redeem-balance">
                <span className="coins-redeem-bal-label">Your Balance</span>
                <span className="coins-redeem-bal-val">🪙 {fmt(balance)}</span>
              </div>

              {requested ? (
                <div className="coins-coming-soon">
                  <div className="coins-coming-icon">⏳</div>
                  <div className="coins-coming-title">Request Submitted!</div>
                  <div className="coins-coming-desc">Your redemption request is pending superadmin approval. You'll be notified once approved.</div>
                  {!hasPending && (
                    <button className="coins-redeem-btn" style={{ marginTop: 16, maxWidth: 220 }} onClick={() => { setRequested(false); setReqMsg('') }}>Submit Another</button>
                  )}
                </div>
              ) : (
                <>
                  <div className="coins-slider-wrap">
                    <label className="coins-slider-label">
                      Coins to Redeem: <strong>{fmt(redeemAmt)}</strong>
                    </label>
                    <input
                      type="range"
                      min={10000}
                      max={Math.max(10000, Math.floor(balance / 10000) * 10000)}
                      step={1000}
                      value={Math.min(redeemAmt, Math.max(10000, balance))}
                      onChange={e => setRedeemAmt(Number(e.target.value))}
                      className="coins-slider"
                      disabled={balance < 10000}
                    />
                    <div className="coins-slider-range">
                      <span>10,000</span>
                      <span>{fmt(Math.max(10000, Math.floor(balance / 10000) * 10000))}</span>
                    </div>
                  </div>

                  <div className="coins-redeem-preview">
                    <div className="coins-preview-row">
                      <span>Coins to redeem</span>
                      <span className="coins-preview-coins">🪙 {fmt(redeemAmt)}</span>
                    </div>
                    <div className="coins-preview-row">
                      <span>Remaining after</span>
                      <span>{fmt(Math.max(0, balance - redeemAmt))}</span>
                    </div>
                    <div className="coins-preview-row">
                      <span>Status after approval</span>
                      <span style={{ color: '#059669', fontWeight: 700 }}>Gift Dispatched 🎁</span>
                    </div>
                  </div>

                  <button
                    className="coins-redeem-btn"
                    onClick={handleRequest}
                    disabled={requesting || balance < 10000}
                  >
                    {requesting ? 'Submitting...' : `🎁 Request Redemption — ${fmt(redeemAmt)} Coins`}
                  </button>

                  {balance < 10000 && (
                    <div className="coins-need-more">
                      You need {fmt(10000 - balance)} more coins to redeem.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── How to Earn ── */}
          <div className="coins-card">
            <div className="coins-card-header">
              <span>💡</span>
              <h2>How It Works</h2>
            </div>
            <div className="coins-card-body">
              {[
                { icon: '💳', step: '1', title: 'Send a Redemption Request', desc: 'According to the gift amount, send a request to superadmin.' },
                { icon: '🪙', step: '2', title: 'Superadmin Approval', desc: 'Superadmin will review and approve your request.' },
                { icon: '🎁', step: '3', title: 'Collect Your Reward', desc: 'After superadmin approval, you can collect your reward by visiting your nearest branch.' },
                { icon: '♾️', step: '4', title: 'No Expiry', desc: 'Your MoneySpot Coins never expire. Accumulate as many as you want!' },
              ].map((s, i) => (
                <div key={i} className="coins-step" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="coins-step-num">{s.step}</div>
                  <div className="coins-step-icon">{s.icon}</div>
                  <div>
                    <div className="coins-step-title">{s.title}</div>
                    <div className="coins-step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Recent Earning History ── */}
        {/* <div className="coins-card">
          <div className="coins-card-header">
            <span>📋</span>
            <h2>Earning History</h2>
            <span className="coins-card-badge">{txns.length} transactions</span>
          </div>
          <div className="coins-table-wrap">
            {txns.length === 0 ? (
              <div className="coins-empty">
                <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                <div>No transactions yet — start transacting to earn coins!</div>
              </div>
            ) : (
              <table className="coins-table">
                <thead>
                  <tr><th>Date</th><th>Service</th><th>Amount</th><th>Coins Earned</th></tr>
                </thead>
                <tbody>
                  {txns.map((t, i) => (
                    <tr key={t.id} className="coins-tr" style={{ animationDelay: `${i * 40}ms` }}>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                      <td><strong>{t.service_type || '—'}</strong></td>
                      <td><span style={{ color: '#059669', fontWeight: 700 }}>₹{fmt(t.amount)}</span></td>
                      <td><span className="coins-earned-tag">🪙 +{fmt(Math.floor(parseFloat(t.amount || 0) / 10))}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div> */}

        {/* ── Redemption History ── */}
        {history.length > 0 && (
          <div className="coins-card" style={{ marginTop: 24 }}>
            <div className="coins-card-header">
              <span>📋</span>
              <h2>Redemption History</h2>
              <span className="coins-card-badge">{history.length} requests</span>
            </div>
            <div className="coins-table-wrap">
              <table className="coins-table">
                <thead>
                  <tr><th>#</th><th>Coins</th><th>Balance at Request</th><th>Status</th><th>Requested On</th><th>Actioned On</th></tr>
                </thead>
                <tbody>
                  {history.map((h, i) => {
                    const ss = { pending: { background: '#fef3c7', color: '#d97706' }, approved: { background: '#d1fae5', color: '#059669' }, rejected: { background: '#fee2e2', color: '#dc2626' } }[h.status] || {}
                    return (
                      <tr key={h.id} className="coins-tr" style={{ animationDelay: `${i * 40}ms` }}>
                        <td style={{ fontFamily: 'monospace', color: '#402070', fontWeight: 700, fontSize: 11 }}>#{h.id}</td>
                        <td style={{ color: '#d4af37', fontWeight: 800 }}>🪙 {fmt(h.coins)}</td>
                        <td style={{ color: '#64748b' }}>🪙 {fmt(h.current_balance)}</td>
                        <td><span style={{ ...ss, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          {h.status === 'pending' ? '⏳ Pending' : h.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                        </span></td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{new Date(h.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{h.actioned_at ? new Date(h.actioned_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
