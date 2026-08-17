import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getTokenByRole } from '../../utils/tokenUtils';
import EmployeeSidebar from '../../components/employee/EmployeeSidebar';
import '../../pages/dashboard.css';

export default function EmployeeExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/dashboard/employee-features/expenses', { 
      headers: { Authorization: `Bearer ${getTokenByRole('employee')}` } 
    })
      .then(data => { setExpenses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="dash-page">
      <EmployeeSidebar />
      <main className="dash-main">
        <div className="dash-topbar">
          <h1>Branch Expenses</h1>
        </div>
        <div className="dash-main">
          <div className="dash-card">
            <div className="dash-card-header"><h2>Expense History</h2></div>
            <div className="table-responsive">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Added By</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                      <td>{e.category}</td>
                      <td style={{ fontWeight: 700, color: '#c02040' }}>₹{Number(e.amount).toLocaleString('en-IN')}</td>
                      <td>{e.created_by_name}</td>
                      <td>{e.note}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && !loading && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>No expenses found for this branch.</td></tr>
                  )}
                  {loading && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>Loading...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
