import React from 'react';
import { getCustomerTier } from '../../utils/tierUtils';
import { getActivityStatus, getBehaviorTags } from '../../utils/customerBehaviorUtils';

const fmtVal = n => { 
  const v = parseFloat(n) || 0; 
  if (v >= 10000000) return `₹${(v/10000000).toFixed(2)} Cr`; 
  if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`; 
  if (v >= 1000) return `₹${(v/1000).toFixed(1)}K`; 
  return `₹${Number(v).toLocaleString('en-IN')}`;
}

export default function CustomerHeader({ customer, txns = [], dark = false, style = {} }) {
  if (!customer) return null;

  let totalAmount = customer.total_amount || 0;
  if (txns && txns.length > 0) {
    totalAmount = txns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }

  const tier = getCustomerTier(totalAmount);
  const activity = getActivityStatus(customer, txns);
  // Max 3 behaviour tags to avoid clutter
  const tags = getBehaviorTags(customer, txns).slice(0, 3);
  
  let lastTxnDate = customer.last_txn_date || customer.last_visited;
  if (txns && txns.length > 0) {
    const sorted = [...txns].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    lastTxnDate = sorted[0].created_at;
  }
  
  let daysAgo = '—';
  if (lastTxnDate) {
    const diff = Math.floor((new Date() - new Date(lastTxnDate)) / (1000 * 60 * 60 * 24));
    daysAgo = `${diff} Days Ago`;
  }

  const txnCount = customer.txn_count !== undefined ? customer.txn_count : (txns ? txns.length : 0);



  const textColor = dark ? '#fff' : '#1e293b';
  const subTextColor = dark ? 'rgba(255,255,255,0.7)' : '#475569';
  const dividerColor = dark ? 'rgba(255,255,255,0.2)' : '#cbd5e1';

  let profilePic = customer.profile_image_url;
  if (profilePic && !profilePic.startsWith('http') && !profilePic.startsWith('data:image')) {
    profilePic = `data:image/jpeg;base64,${profilePic}`;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', ...style }}>
      {profilePic ? (
        <img src={profilePic} alt={customer.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${dividerColor}` }} />
      ) : (
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: dark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: `2px solid ${dividerColor}`, color: subTextColor }}>
          👤
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
      {/* Row 1: Name */}
      <div style={{ fontSize: '20px', fontWeight: 900, color: textColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {customer.name}
      </div>

      {/* Row 2: Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
        <span style={{ background: tier.bg, color: tier.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
          {tier.label}
        </span>
        <span style={{ color: dividerColor }}>|</span>
        <span style={{ background: activity.bg, color: activity.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {activity.icon} {activity.label}
        </span>
        {tags.map(tag => (
          <React.Fragment key={tag.label}>
            <span style={{ color: dividerColor }}>|</span>
            <span style={{ color: dark ? 'rgba(255,255,255,0.85)' : '#64748b', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {tag.icon} {tag.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Row 3: Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 600, color: subTextColor, marginTop: '2px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          💰 {fmtVal(totalAmount)} Lifetime
        </span>
        <span style={{ color: dividerColor }}>|</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          🔁 {txnCount} Txns
        </span>
        <span style={{ color: dividerColor }}>|</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          📅 Last Txn: {daysAgo}
        </span>
        {customer.cibil_score && (
          <>
            <span style={{ color: dividerColor }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: customer.cibil_score >= 750 ? '#10b981' : customer.cibil_score >= 650 ? '#f59e0b' : '#ef4444' }}>
              💳 CIBIL: {customer.cibil_score}
            </span>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
