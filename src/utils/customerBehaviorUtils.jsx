import React from 'react';

// Status Logic
export const getActivityStatus = (customer, txns = []) => {
  let lastTxnDateStr, secondLastTxnDateStr;
  
  if (txns && txns.length > 0) {
    const sorted = [...txns].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    lastTxnDateStr = sorted[0].created_at;
    if (sorted.length > 1) secondLastTxnDateStr = sorted[1].created_at;
  } else if (customer && customer.last_txn_date) {
    lastTxnDateStr = customer.last_txn_date;
    secondLastTxnDateStr = customer.second_last_txn_date;
  } else {
    return { label: 'New', bg: '#e0e7ff', color: '#3730a3', icon: '🆕', name: 'New' };
  }

  const lastTxnDate = new Date(lastTxnDateStr);
  const now = new Date();
  const diffDays = Math.floor((now - lastTxnDate) / (1000 * 60 * 60 * 24));
  
  // Reactivated check: if current gap is small (< 15) but previous gap was large (> 30)
  if (secondLastTxnDateStr) {
    const secondLastTxnDate = new Date(secondLastTxnDateStr);
    const previousGap = Math.floor((lastTxnDate - secondLastTxnDate) / (1000 * 60 * 60 * 24));
    if (diffDays <= 15 && previousGap >= 30) {
      return { label: 'Reactivated', bg: '#eff6ff', color: '#1d4ed8', icon: '🔵', name: 'Reactivated' };
    }
  }

  // Based on user feedback: Inactive means 30 days
  // Active: <= 10 days
  // Irregular: 11 - 20 days
  // At Risk: 21 - 30 days
  // Inactive: 31 - 60 days
  // Dormant: > 60 days
  
  if (diffDays <= 10) return { label: 'Active', bg: '#dcfce7', color: '#15803d', icon: '🟢', name: 'Active' };
  if (diffDays <= 20) return { label: 'Irregular', bg: '#fef08a', color: '#a16207', icon: '🟡', name: 'Irregular' };
  if (diffDays <= 30) return { label: 'At Risk', bg: '#ffedd5', color: '#c2410c', icon: '🟠', name: 'At Risk' };
  if (diffDays <= 60) return { label: 'Inactive', bg: '#fee2e2', color: '#b91c1c', icon: '🔴', name: 'Inactive' };
  
  return { label: 'Dormant', bg: '#f1f5f9', color: '#334155', icon: '⚫', name: 'Dormant' };
};

export const getBehaviorTags = (customer, txns = []) => {
  const tags = [];
  const now = new Date();
  
  // 🆕 New Customer: Registered in last 30 days
  const memberDays = Math.floor((now - new Date(customer.created_at || now)) / (1000 * 60 * 60 * 24));
  if (memberDays <= 30) {
    tags.push({ label: 'New Customer', icon: '🆕', color: '#3730a3', bg: '#e0e7ff', border: '#c7d2fe' });
  }

  // ✅ KYC Verified
  if (customer.status === 'approved' || customer.aadhar || customer.pan) {
    tags.push({ label: 'KYC Verified', icon: '✅', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' });
  }

  if (!txns || txns.length === 0) return tags;

  // ❤️ Loyal Customer: > 10 txns OR member for > 365 days
  if (txns.length > 10 || memberDays > 365) {
    tags.push({ label: 'Loyal Customer', icon: '❤️', color: '#be123c', bg: '#ffe4e6', border: '#fecdd3' });
  }

  // 🔥 High Frequency: > 4 txns in last 30 days
  const recentTxns = txns.filter(t => Math.floor((now - new Date(t.created_at)) / (1000 * 60 * 60 * 24)) <= 30);
  if (recentTxns.length > 4) {
    tags.push({ label: 'High Frequency', icon: '🔥', color: '#c2410c', bg: '#ffedd5', border: '#fed7aa' });
  }

  // 💰 High Volume: Total amount > 2,00,000
  const totalVol = txns.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  if (totalVol >= 200000) {
    tags.push({ label: 'High Volume', icon: '💰', color: '#854d0e', bg: '#fef08a', border: '#fde047' });
  }

  // Service Usage Tags
  let billPayCount = 0;
  let withdrawalCount = 0;
  const servicesUsed = new Set();

  txns.forEach(t => {
    const s = t.service_type || '';
    servicesUsed.add(s);
    if (s.toLowerCase().includes('bill')) billPayCount++;
    if (s.toLowerCase().includes('withdrawal')) withdrawalCount++;
  });

  if (billPayCount > 0 && billPayCount >= txns.length * 0.5) {
    tags.push({ label: 'Bill Pay User', icon: '💳', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' });
  }
  
  if (withdrawalCount > 0 && withdrawalCount >= txns.length * 0.5) {
    tags.push({ label: 'Withdrawal User', icon: '💸', color: '#047857', bg: '#d1fae5', border: '#a7f3d0' });
  }

  if (servicesUsed.size >= 2) {
    tags.push({ label: 'Multi-Service', icon: '🧩', color: '#6d28d9', bg: '#ede9fe', border: '#ddd6fe' });
  }

  return tags;
};

export const CustomerBehaviorTags = ({ customer, txns = [], style = {} }) => {
  const status = getActivityStatus(customer, txns);
  const allTags = getBehaviorTags(customer, txns);
  const displayTags = allTags.slice(0, 4);
  const extraTags = allTags.slice(4);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '6px', ...style }}>
      <span style={{ 
        background: status.bg, color: status.color, 
        padding: '3px 10px', borderRadius: '20px', 
        fontSize: '11px', fontWeight: 800, 
        display: 'inline-flex', alignItems: 'center', gap: '4px' 
      }}>
        {status.icon} {status.label}
      </span>
      
      {allTags.length > 0 && (
        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
      )}

      {displayTags.map(tag => (
        <span key={tag.label} style={{
          background: tag.bg, color: tag.color, border: `1px solid ${tag.border}`,
          padding: '2px 8px', borderRadius: '6px',
          fontSize: '10px', fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', gap: '3px'
        }}>
          {tag.icon} {tag.label}
        </span>
      ))}
      
      {extraTags.length > 0 && (
        <span title={extraTags.map(t => t.label).join(', ')} style={{
          background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px dashed rgba(255,255,255,0.3)',
          padding: '2px 8px', borderRadius: '6px',
          fontSize: '10px', fontWeight: 700, cursor: 'help'
        }}>
          +{extraTags.length} More
        </span>
      )}
    </div>
  );
};
