import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getTokenByRole } from '../../utils/tokenUtils';
import EmployeeNavbar from '../../components/employee/EmployeeNavbar';
import './EmployeeDashboard.css';

export default function EmployeeDueDates() {
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
      const res = await api('/dashboard/bill-due-dates/employee', { 
        headers: { Authorization: `Bearer ${getTokenByRole('employee')}` }
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
    const branchName = 'Kadapa Main';
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
    <div className="emp-page">
      <EmployeeNavbar />
      <div className="emp-page-content" style={{ padding: '24px' }}>
        <h1 style={{ marginBottom: 20 }}>Bill Due Dates</h1>
        
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}>
            <option value="all">All Upcoming</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow (1 Day Before)</option>
            <option value="custom">Custom Date</option>
          </select>
          {filter === 'custom' && (
            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
          )}
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Bill Amount</th>
                <th>Due Date</th>
                <th>Added By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(d => (
                <tr key={d.id}>
                  <td>{d.cust_name}</td>
                  <td>{d.cust_mobile}</td>
                  <td>₹{d.bill_amount}</td>
                  <td style={{ color: '#d97706', fontWeight: 'bold' }}>{new Date(d.bill_due_date).toLocaleDateString()}</td>
                  <td>{d.added_by}</td>
                  <td>
                    <button onClick={() => notifyWhatsapp(d)} style={{ background: '#25D366', color: 'white', padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                      Notify via WhatsApp
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No due dates found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
