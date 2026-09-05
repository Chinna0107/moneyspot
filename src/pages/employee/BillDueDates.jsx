import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getTokenByRole } from '../../utils/tokenUtils';
import EmployeeSidebar from '../../components/employee/EmployeeSidebar';
import './EmployeeDashboard.css';

// Returns the date that is `created_at + 30 days`
function getShowAfterDate(createdAt) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 30);
  d.setHours(0, 0, 0, 0);
  return d;
}

// How many days until the bill is due (negative = already past)
function daysUntilDue(billDueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(billDueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

// How many days since employee added vs 30-day threshold
function daysUntilVisible(createdAt) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const showAfter = getShowAfterDate(createdAt);
  return Math.ceil((showAfter - today) / (1000 * 60 * 60 * 24));
}

function getDueBadge(days) {
  if (days < 0)  return { label: `${Math.abs(days)}d Overdue`, color: '#dc2626', bg: '#fef2f2' };
  if (days === 0) return { label: 'Due Today!',  color: '#7c3aed', bg: '#ede9fe' };
  if (days === 1) return { label: 'Due Tomorrow', color: '#d97706', bg: '#fffbeb' };
  if (days <= 7)  return { label: `${days}d left`,  color: '#f59e0b', bg: '#fff7ed' };
  return { label: `${days}d left`, color: '#059669', bg: '#f0fdf4' };
}

export default function EmployeeDueDates() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [show30DayRule, setShow30DayRule] = useState(true); // NEW: 30-day rule toggle

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await api('/dashboard/bill-due-dates/employee', {
        headers: { Authorization: `Bearer ${getTokenByRole('employee')}` }
      });
      setData(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const getFilteredData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return data.filter(item => {
      if (!item.bill_due_date) return false;

      // ── 30-day rule: only show if today >= created_at + 30 days ──
      if (show30DayRule && item.created_at) {
        const showAfter = getShowAfterDate(item.created_at);
        if (today < showAfter) return false; // not yet eligible
      }

      const dDate = new Date(item.bill_due_date);
      dDate.setHours(0, 0, 0, 0);

      if (filter === 'today')    return dDate.getTime() === today.getTime();
      if (filter === 'tomorrow') return dDate.getTime() === tomorrow.getTime();
      if (filter === 'custom' && customDate) {
        const cDate = new Date(customDate);
        cDate.setHours(0, 0, 0, 0);
        return dDate.getTime() === cDate.getTime();
      }
      return true;
    });
  };

  // Upcoming items that are hidden because 30-day rule hasn't elapsed yet
  const hiddenCount = show30DayRule
    ? data.filter(item => {
        if (!item.bill_due_date || !item.created_at) return false;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return today < getShowAfterDate(item.created_at);
      }).length
    : 0;

  const notifyWhatsapp = (item) => {
    const text = `Hello *${item.cust_name}*!\n\nThis is a gentle reminder from *MoneySpot*. \nYour bill payment of *₹${item.bill_amount}* is due on *${new Date(item.bill_due_date).toLocaleDateString()}*. \n\nTo avoid any late fees or interruptions, please clear the due amount on or before the due date. \n\n*Branch:* Kadapa Main\n*Address:* 1/317, Near RTC Bus Stand, Kadapa, AP\n*Support:* +91 98664 40477\n*Website:* https://moneyspotfintech.com/\n\nPlease visit our branch or reply to this message if you need any assistance. We are always happy to help!\n\nWarm Regards,\n*MoneySpot Team*`;
    window.open(`https://wa.me/91${item.cust_mobile}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filtered = getFilteredData();

  return (
    <div className="dashboard">
      <EmployeeSidebar />
      <main className="dash-main" style={{ padding: '24px' }}>
        <h1 style={{ marginBottom: 6 }}>Bill Due Dates</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
          Showing bills that are ready to notify (added 30+ days ago)
        </p>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
          >
            <option value="all">All Eligible</option>
            <option value="today">Due Today</option>
            <option value="tomorrow">Due Tomorrow</option>
            <option value="custom">Custom Date</option>
          </select>

          {filter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
            />
          )}

          {/* 30-day rule toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            background: show30DayRule ? '#ede9fe' : '#f1f5f9',
            border: `1px solid ${show30DayRule ? '#7c3aed' : '#cbd5e1'}`,
            borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600,
            color: show30DayRule ? '#7c3aed' : '#64748b', userSelect: 'none',
            transition: 'all 0.2s'
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
          <table className="dash-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Bill Amount</th>
                <th>Due Date</th>
                <th>Eligible From</th>
                <th>Added By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(d => {
                const dueDays = daysUntilDue(d.bill_due_date);
                const badge = getDueBadge(dueDays);
                return (
                  <tr key={d.id}>
                    <td>{d.cust_name}</td>
                    <td>{d.cust_mobile}</td>
                    <td style={{ fontWeight: 700 }}>₹{d.bill_amount}</td>
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
                    <td style={{ fontSize: 12, color: '#6b7280' }}>
                      {d.created_at
                        ? getShowAfterDate(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td>{d.added_by}</td>
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
                  <td colSpan="7" style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                    {show30DayRule
                      ? 'No bills are eligible yet (30-day rule). Uncheck the rule to see all.'
                      : 'No due dates found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
