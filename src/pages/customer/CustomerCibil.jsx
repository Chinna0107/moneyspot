import { useState, useEffect } from 'react'
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
      setCibilScore(profile.cibil_score)
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
        throw new Error(data.error || 'Failed to check CIBIL score. Please ensure your PAN details are correct.')
      }
      
      setCibilScore(data.score)
      // Force a profile reload to update the cached profile if necessary, 
      // though we locally set the score immediately for the UI.
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  const getScoreColor = (score) => {
    if (!score) return '#94a3b8'
    if (score >= 750) return '#10b981' // Excellent (Green)
    if (score >= 650) return '#f59e0b' // Fair (Orange)
    return '#ef4444' // Poor (Red)
  }
  
  const getScoreLabel = (score) => {
    if (!score) return 'Unknown'
    if (score >= 750) return 'Excellent'
    if (score >= 650) return 'Fair'
    return 'Poor'
  }

  return (
    <div className="cust-page">
      <CustomerSidebar />
      <div className="cust-content">
        <div className="cust-topbar" style={{ marginBottom: 20 }}>
          {profile ? (
            <CustomerHeader customer={profile} txns={[]} dark={false} />
          ) : (
            <>
              <h1>💳 CIBIL Score</h1>
              <p>Check and monitor your credit health</p>
            </>
          )}
        </div>

        {profileLoading ? (
          <SkeletonCard rows={6} />
        ) : (
          <div className="cust-card" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, color: '#1e293b', marginBottom: 8 }}>Your Credit Health</h2>
              <p style={{ color: '#64748b', fontSize: 14 }}>
                Maintaining a good CIBIL score gives you access to better loan offers and lower interest rates.
              </p>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 13, border: '1px solid #fca5a5' }}>
                ❌ {error}
              </div>
            )}

            {cibilScore ? (
              <div style={{ padding: '30px 20px', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ 
                  width: 160, height: 160, borderRadius: '50%', 
                  border: `8px solid ${getScoreColor(cibilScore)}`, 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: '#fff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  marginBottom: 16
                }}>
                  <span style={{ fontSize: 42, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{cibilScore}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: getScoreColor(cibilScore), marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {getScoreLabel(cibilScore)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#047857', background: '#d1fae5', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  <span>✓</span> Verified by Experian / CIBIL
                </div>
                <p style={{ marginTop: 24, fontSize: 13, color: '#64748b', maxWidth: 400 }}>
                  This is your lifetime credit score tied to your PAN ({profile?.pan}). We use this to evaluate your loan eligibility.
                </p>
              </div>
            ) : (
              <div style={{ padding: '40px 20px', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
                <h3 style={{ fontSize: 18, color: '#334155', marginBottom: 12 }}>You haven't checked your score yet</h3>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                  Check your CIBIL score for free. This is a soft inquiry and will not affect your credit score.
                </p>
                <button 
                  onClick={handleCheckCibil} 
                  disabled={checking}
                  style={{ 
                    background: 'linear-gradient(135deg, #402070, #c02040)', 
                    color: '#fff', border: 'none', padding: '14px 28px', 
                    borderRadius: 12, fontSize: 15, fontWeight: 700, 
                    cursor: checking ? 'not-allowed' : 'pointer',
                    opacity: checking ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '0 auto',
                    boxShadow: '0 4px 12px rgba(192, 32, 64, 0.2)'
                  }}
                >
                  {checking ? 'Checking Score...' : 'Check My Free CIBIL Score'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
