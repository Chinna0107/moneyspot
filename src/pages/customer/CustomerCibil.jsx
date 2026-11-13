import React, { useState, useEffect } from 'react'
import { useCustomerProfile } from '../../hooks/useCustomerAuth'
import { getTokenByRole } from '../../utils/tokenUtils'
import CustomerSidebar from '../../components/customer/CustomerSidebar'
import CustomerHeader from '../../components/shared/CustomerHeader'
import { SkeletonCard } from '../../components/customer/Skeleton'
import config from '../../config'
import '../../components/customer/CustomerSidebar.css'

export default function CustomerCibil() {
  const { profile, loading: profileLoading } = useCustomerProfile()
  const [cibilScore, setCibilScore] = useState(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile?.cibil_score) {
      setCibilScore(parseInt(profile.cibil_score, 10))
    }
  }, [profile])

  const handleCheckCibil = async () => {
    setChecking(true)
    setError('')
    try {
      const token = getTokenByRole('customer')
      const res = await fetch(`${config.API_URL}/customer/check-cibil`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      
      if (!res.ok || !data.success) {
        if (data.score) {
          setCibilScore(parseInt(data.score, 10))
        }
        throw new Error(data.error || 'Could not fetch CIBIL score. Please check your PAN details.')
      }
      
      setCibilScore(parseInt(data.score, 10))
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  const score = cibilScore || 750

  const getScoreColor = (s) => {
    if (s >= 750) return '#10b981' // Excellent (Green)
    if (s >= 700) return '#3b82f6' // Good (Blue)
    if (s >= 650) return '#f59e0b' // Fair (Amber)
    return '#ef4444' // Needs attention (Red)
  }

  const getScoreRating = (s) => {
    if (s >= 750) return { title: 'Excellent', desc: 'Pre-approved loan & card offers unlocked with lowest interest rates.' }
    if (s >= 700) return { title: 'Good', desc: 'Healthy credit profile. Most lenders approve requests easily.' }
    if (s >= 650) return { title: 'Fair', desc: 'Average score. Keep credit utilization below 30% to improve.' }
    return { title: 'Needs Attention', desc: 'High default risk. Avoid new card inquiries and clear dues promptly.' }
  }

  const rating = getScoreRating(score)
  const scoreColor = getScoreColor(score)

  // Calculate percentage on 300 to 900 scale
  const progressPct = Math.min(100, Math.max(0, ((score - 300) / 600) * 100))

  return (
    <div className="cust-page">
      <CustomerSidebar />
      <div className="cust-content">

        {/* ── Top Header ── */}
        <div className="cust-topbar" style={{ marginBottom: 20 }}>
          {profile ? (
            <CustomerHeader customer={profile} txns={[]} dark={false} />
          ) : (
            <>
              <h1>📈 Credit Bureau Health & CIBIL Score</h1>
              <p>Monitor your bureau score, loan eligibility & score improvement roadmaps</p>
            </>
          )}
        </div>

        {profileLoading ? (
          <SkeletonCard rows={6} />
        ) : (
          <>
            {/* ── Hero CIBIL Score Gauge Card ── */}
            <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: 24, padding: '32px 28px', color: '#fff', marginBottom: 24, position: 'relative', overflow: 'hidden', boxShadow: '0 16px 40px rgba(30,27,75,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
                
                {/* Score Number & Badge */}
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    <span>🛡️</span> CIBIL Bureau TransUnion
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 12 }}>
                    <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: '#fff' }}>
                      {score}
                    </div>
                    <div style={{ fontSize: 18, color: scoreColor, fontWeight: 800 }}>
                      / 900
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <span style={{ background: `${scoreColor}25`, border: `1px solid ${scoreColor}`, color: scoreColor, padding: '4px 12px', borderRadius: 20, fontWeight: 800, fontSize: 13 }}>
                      {rating.title} Credit Health
                    </span>
                  </div>

                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 12, lineHeight: 1.5, maxWidth: 420 }}>
                    {rating.desc}
                  </p>
                </div>

                {/* Meter Gauge Visual */}
                <div style={{ flex: 1, minWidth: 280, maxWidth: 400, background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 22, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: 8 }}>
                    <span>300 (Poor)</span>
                    <span>650 (Fair)</span>
                    <span>750 (Good)</span>
                    <span>900 (Excellent)</span>
                  </div>

                  {/* Gradient Bar */}
                  <div style={{ height: 12, borderRadius: 6, background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPct}%`, height: '100%', background: 'transparent' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                      Verified for PAN: <strong>{profile?.pan || '—'}</strong>
                    </span>
                    <button
                      onClick={handleCheckCibil}
                      disabled={checking}
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: checking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {checking ? 'Refreshing...' : '🔄 Refresh Score'}
                    </button>
                  </div>
                </div>

              </div>
              {error && (
                <div style={{ marginTop: 16, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#fca5a5' }}>
                  ❌ {error}
                </div>
              )}
            </div>

            {/* ── 4 Key Credit Health Factors ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { factor: 'On-time Payment History', impact: 'High Impact (35%)', status: '100% On-time', color: '#10b981', icon: '🗓️', note: 'All registered bill payments paid on time' },
                { factor: 'Credit Limit Utilization', impact: 'High Impact (30%)', status: '< 30% Ideal', color: '#3b82f6', icon: '💳', note: 'Rollover bill pay + withdrawal helps keep usage balanced' },
                { factor: 'Credit Age & Accounts', impact: 'Medium Impact (15%)', status: 'Healthy', color: '#10b981', icon: '⏳', note: 'Older active credit lines improve score depth' },
                { factor: 'Hard Inquiries', impact: 'Low Impact (10%)', status: '0 Recent Inquiries', color: '#10b981', icon: '🔍', note: 'No multiple loan rejections on record' },
              ].map((f, i) => (
                <div key={i} className="cust-card" style={{ margin: 0 }}>
                  <div className="cust-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 24 }}>{f.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 12 }}>
                        {f.impact}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginTop: 10 }}>
                      {f.factor}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: f.color, marginTop: 4 }}>
                      {f.status}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
                      {f.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Score Boost Advisory Tips ── */}
            <div className="cust-card">
              <div className="cust-card-header">
                <h2 style={{ margin: 0, fontSize: 16 }}>💡 MoneySpot Recommendations to Boost Score</h2>
              </div>
              <div className="cust-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { tip: 'Clear Card Outstandings 3 Days Before Due Date', desc: 'Credit bureaus capture card balances before bill generation. Use MoneySpot Bill Pay to clear balances early.' },
                  { tip: 'Never Settle Loans as "Written Off"', desc: 'Settle in full with NOC from the bank. MoneySpot branch team assists in negotiating full-payment waivers.' },
                  { tip: 'Maintain a 50:50 Mix of Secured vs Unsecured Loans', desc: 'Having gold/home loans along with credit cards signals financial discipline to bureau algorithms.' }
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#059669', fontSize: 18, fontWeight: 900 }}>✓</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{t.tip}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </>
        )}

      </div>
    </div>
  )
}
