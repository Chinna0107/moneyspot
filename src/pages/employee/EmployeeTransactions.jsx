import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getTokenByRole } from '../../utils/tokenUtils';
import EmployeeNavbar from '../../components/employee/EmployeeNavbar';
import '../../pages/dashboard.css';

export default function EmployeeTransactions() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/dashboard/employee-features/transactions', { 
      headers: { Authorization: `Bearer ${getTokenByRole('employee')}` } 
    })
      .then(data => { setTxns(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="dash-page">
      <EmployeeNavbar />
      <div className="dash-content">
        <div className="dash-topbar">
          <h1>Branch Transactions</h1>
        </div>
        <div className="dash-main">
          <div className="dash-card">
            <div className="dash-card-header"><h2>All Branch Transactions</h2></div>
            <div className="table-responsive">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Platform</th>
                    <th>Employee</th>
                    <th>Amount</th>
                    <th>Profit</th>
                    <th>Settled</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map(t => (
                    <tr key={t.id}>
                      <td>{new Date(t.created_at).toLocaleString('en-IN')}</td>
                      <td>{t.cust_name}<br/><small style={{color:'#666'}}>{t.cust_mobile}</small></td>
                      <td><span className="dash-badge dash-badge-info">{t.service_type}</span></td>
                      <td>{t.platform || '-'}</td>
                      <td>{t.employee_name}</td>
                      <td style={{ fontWeight: 700 }}>₹{Number(t.amount).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#16a34a' }}>₹{Number(t.profit).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#0284c7' }}>₹{Number(t.settled_amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {txns.length === 0 && !loading && (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>No transactions found for this branch.</td></tr>
                  )}
                  {loading && (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>Loading...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
