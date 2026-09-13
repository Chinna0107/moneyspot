import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getTokenByRole } from '../../utils/tokenUtils';
import { getCustomerTier } from '../../utils/tierUtils';
import AdminSidebar from '../../components/admin/AdminSidebar';
import '../../pages/dashboard.css';

function getShowAfterDate(createdAt) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 30);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntilDue(billDueDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(billDueDate); due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function getDueBadge(days) {
  if (days < 0)  return { label: `${Math.abs(days)}d Overdue`, color: '#dc2626', bg: '#fef2f2' };
  if (days === 0) return { label: 'Due Today!',   color: '#7c3aed', bg: '#ede9fe' };
  if (days === 1) return { label: 'Due Tomorrow',  color: '#d97706', bg: '#fffbeb' };
  if (days <= 7)  return { label: `${days}d left`, color: '#f59e0b', bg: '#fff7ed' };
  return { label: `${days}d left`, color: '#059669', bg: '#f0fdf4' };
}

export default function AdminDueDates() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [show30DayRule, setShow30DayRule] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await api('/dashboard/bill-due-dates/admin', {
        headers: { Authorization: `Bearer ${getTokenByRole('admin')}` }
      });
      setData(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const getFilteredData = () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    return data.filter(item => {
      if (!item.bill_due_date) return false;

      if (show30DayRule && item.created_at && !item.is_card) {
        if (today < getShowAfterDate(item.created_at)) return false;
      }

      const dDate = new Date(item.bill_due_date); dDate.setHours(0, 0, 0, 0);
      if (filter === 'today')    return dDate.getTime() === today.getTime();
      if (filter === 'tomorrow') return dDate.getTime() === tomorrow.getTime();
      if (filter === 'custom' && customDate) {
        const cDate = new Date(customDate); cDate.setHours(0, 0, 0, 0);
        return dDate.getTime() === cDate.getTime();
      }
      return true;
    });
  };

  const hiddenCount = show30DayRule
    ? data.filter(item => {
        if (!item.bill_due_date || !item.created_at || item.is_card) return false;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return today < getShowAfterDate(item.created_at);
      }).length
    : 0;

  const notifyWhatsapp = (item) => {
    const text = `Hello *${item.cust_name}*!\n\nThis is a gentle reminder from *MoneySpot*. \nYour bill payment of *₹${item.bill_amount}* is due on *${new Date(item.bill_due_date).toLocaleDateString()}*. \n\nTo avoid any late fees or interruptions, please clear the due amount on or before the due date. \n\n*Branch:* Kadapa Main\n*Address:* 1/317, Near RTC Bus Stand, Kadapa, AP\n*Support:* +91 98664 40477\n*Website:* https://moneyspotfintech.com\n\nPlease visit our branch or reply to this message if you need any assistance. We are always happy to help!\n\nWarm Regards,\n*MoneySpot Team*`;
    window.open(`https://wa.me/91${item.cust_mobile}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filtered = getFilteredData();

  const controlStyle = {
    padding: '8px 12px', borderRadius: 8, border: '1.5px solid rgba(64,32,112,0.2)', fontSize: 13
  };

  return (
    <div className="dash-page">
      <AdminSidebar />
      <div className="dash-content">
        <div className="dash-topbar" style={{ padding: '20px 30px' }}>
          <h1 className="dash-topbar-title">Bill Due Dates</h1>
          <p className="dash-topbar-sub">View and notify upcoming bill due dates for your branch</p>
        </div>

        <div style={{ padding: '0 30px 30px' }}>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={controlStyle} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Upcoming</option>
              <option value="today">Due Today</option>
              <option value="tomorrow">Due Tomorrow</option>
              <option value="custom">Custom Date</option>
            </select>
            {filter === 'custom' && (
              <input type="date" style={controlStyle} value={customDate} onChange={e => setCustomDate(e.target.value)} />
            )}

            <label style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              color: show30DayRule ? '#0f172a' : '#64748b', cursor: 'pointer',
              background: show30DayRule ? '#e2e8f0' : '#f1f5f9', padding: '6px 12px', borderRadius: 8
            }}>
              <input
                type="checkbox"
                checked={show30DayRule}
                onChange={e => setShow30DayRule(e.target.checked)}
                style={{ display: 'none' }}
              />
              <span style={{ fontSize: 16 }}>{show30DayRule ? '✅' : '⬜'}</span>
              30-Day Rule (show after 30 days of entry)
            </label>

            {hiddenCount > 0 && (
              <span style={{
                background: '#fef9c3', border: '1px solid #fde047',
                borderRadius: 8, padding: '7px 12px', fontSize: 12,
                fontWeight: 700, color: '#854d0e'
              }}>
                ⏳ {hiddenCount} bill{hiddenCount !== 1 ? 's' : ''} waiting (not 30d yet)
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
          ) : (
            <div className="dash-card">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Category</th>
                    <th>Bill Amount</th>
                    <th>Due Date</th>
                    <th>Added By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? filtered.map(d => {
                    const dueDays = daysUntilDue(d.bill_due_date);
                    const badge = getDueBadge(dueDays);
                    const tier = getCustomerTier(d.customer_total_amount || 0);
                    
                    return (
                      <tr key={d.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{d.cust_name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{d.cust_mobile}</div>
                          {d.is_card && <div style={{ fontSize: 11, color: '#6366f1', marginTop: 2 }}>Card: {d.bank_name} - {d.last_4_digits}</div>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                            <span style={{ background: tier.bg, color: tier.color, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800 }}>
                              {tier.label.toUpperCase()}
                            </span>
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                              {d.category || (d.is_card ? 'Credit Card' : 'General')}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {d.is_card && !d.bill_amount ? <span style={{color: '#64748b'}}>Amount Unknown</span> : `₹${d.bill_amount} ${d.is_card ? '(Est.)' : ''}`}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#374151' }}>
                            {new Date(d.bill_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          <span style={{
                            display: 'inline-block', marginTop: 4,
                            fontSize: 11, fontWeight: 700, padding: '2px 8px',
                            borderRadius: 6, background: badge.bg, color: badge.color
                          }}>
                            {badge.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{d.added_by}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>
                            {d.is_card ? 'Recurring' : (d.created_at ? getShowAfterDate(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')}
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => notifyWhatsapp(d)}
                            style={{ background: '#25D366', color: 'white', padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            📲 Notify
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                        {show30DayRule
                          ? 'No bills are eligible yet (30-day rule). Uncheck the rule to see all.'
                          : 'No due dates found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
