import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getTokenByRole } from '../../utils/tokenUtils';
import SuperAdminSidebar from '../../components/superadmin/Sidebar';
import '../../pages/dashboard.css';

export default function SuperadminDueDates() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, tomorrow
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await api('/dashboard/bill-due-dates/superadmin', { 
        headers: { Authorization: `Bearer ${getTokenByRole('superadmin')}` }
      });
      setData(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getFilteredData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return data.filter(item => {
      if (!item.bill_due_date) return false;
      const dDate = new Date(item.bill_due_date);
      dDate.setHours(0, 0, 0, 0);

      if (filter === 'today') return dDate.getTime() === today.getTime();
      if (filter === 'tomorrow') return dDate.getTime() === tomorrow.getTime();
      if (filter === 'custom' && customDate) {
        const cDate = new Date(customDate);
        cDate.setHours(0, 0, 0, 0);
        return dDate.getTime() === cDate.getTime();
      }
      return true;
    });
  };

  const notifyWhatsapp = (item) => {
    const branchName = item.branch || 'MoneySpot';
    const text = `Hello *${item.cust_name}*!

This is a gentle reminder from *MoneySpot*. 
Your bill payment of *₹${item.bill_amount}* is due on *${new Date(item.bill_due_date).toLocaleDateString()}*. 

To avoid any late fees or interruptions, please clear the due amount on or before the due date. 

*Branch:* ${branchName}
*Address:* 1/317, Near RTC Bus Stand, Kadapa, AP
*Support:* +91 98664 40477
*Website:* https://moneyspotfintech.com/

Please visit our branch or reply to this message if you need any assistance. We are always happy to help!

Warm Regards,
*MoneySpot Team*`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/91${item.cust_mobile}?text=${encoded}`, '_blank');
  };

  const filtered = getFilteredData();

  return (
    <div className="dash-page">
      <SuperAdminSidebar />
      <div className="dash-content">
        <div className="dash-topbar" style={{ padding: '20px 30px' }}>
          <h1 className="dash-topbar-title">All Bill Due Dates</h1>
          <p className="dash-topbar-sub">View and notify upcoming bill due dates across all branches</p>
        </div>
        
        <div style={{ padding: '0 30px 30px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid rgba(64,32,112,0.2)' }}>
              <option value="all">All Upcoming</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow (1 Day Before)</option>
              <option value="custom">Custom Date</option>
            </select>
            {filter === 'custom' && (
              <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid rgba(64,32,112,0.2)' }} />
            )}
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="dash-card">
              <table className="dash-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: 12 }}>Customer</th>
                    <th style={{ padding: 12 }}>Mobile</th>
                    <th style={{ padding: 12 }}>Bill Amount</th>
                    <th style={{ padding: 12 }}>Due Date</th>
                    <th style={{ padding: 12 }}>Branch</th>
                    <th style={{ padding: 12 }}>Added By</th>
                    <th style={{ padding: 12 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? filtered.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: 12 }}>{d.cust_name}</td>
                      <td style={{ padding: 12 }}>{d.cust_mobile}</td>
                      <td style={{ padding: 12 }}>₹{d.bill_amount}</td>
                      <td style={{ padding: 12, color: '#d97706', fontWeight: 'bold' }}>{new Date(d.bill_due_date).toLocaleDateString()}</td>
                      <td style={{ padding: 12 }}>{d.branch}</td>
                      <td style={{ padding: 12 }}>{d.added_by}</td>
                      <td style={{ padding: 12 }}>
                        <button onClick={() => notifyWhatsapp(d)} style={{ background: '#25D366', color: 'white', padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                          Notify via WhatsApp
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: 20 }}>No due dates found.</td></tr>
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
