export const getCustomerTier = (amount) => {
  const amt = parseFloat(amount) || 0;
  if (amt >= 10000000) return { label: '🏆 Elite Plus', color: '#b8860b', bg: '#fef9c3', class: 'tier-elite-plus' };
  if (amt >= 5000000) return { label: '👑 Elite', color: '#ea580c', bg: '#ffedd5', class: 'tier-elite' };
  if (amt >= 2500000) return { label: '💜 Platinum', color: '#7e22ce', bg: '#f3e8ff', class: 'tier-platinum' };
  if (amt >= 1000000) return { label: '💎 Premium', color: '#0369a1', bg: '#e0f2fe', class: 'tier-premium' };
  if (amt >= 500000) return { label: '🥇 Gold', color: '#d97706', bg: '#fef3c7', class: 'tier-gold' };
  if (amt >= 200000) return { label: '⭐ Silver', color: '#4b5563', bg: '#f3f4f6', class: 'tier-silver' };
  if (amt >= 50000) return { label: '🔵 Regular', color: '#2563eb', bg: '#dbeafe', class: 'tier-regular' };
  return { label: '🌱 Starter', color: '#059669', bg: '#d1fae5', class: 'tier-starter' };
};

export const TierBadge = ({ amount, style = {} }) => {
  const tier = getCustomerTier(amount);
  return (
    <span style={{
      background: tier.bg,
      color: tier.color,
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      ...style
    }}>
      {tier.label}
    </span>
  );
};
