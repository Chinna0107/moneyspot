import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getTokenByRole } from '../../utils/tokenUtils';
import EmployeeSidebar from '../../components/employee/EmployeeSidebar';
import { MdAdd, MdReceipt } from 'react-icons/md';
import './EmployeeDashboard.css';

export default function EmployeeExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ category: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchExpenses = () => {
    setLoading(true);
    api('/dashboard/employee-features/expenses', { 
      headers: { Authorization: `Bearer ${getTokenByRole('employee')}` } 
    })
      .then(data => { setExpenses(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api('/dashboard/employee-features/expenses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getTokenByRole('employee')}` 
        },
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      setFormData({ category: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
      fetchExpenses();
    } catch (err) {
      setError(err.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ed-page">
      <EmployeeSidebar />
      
      <div className="ed-content">
        <div className="ed-hero" style={{ padding: '24px 28px', marginBottom: 24 }}>
          <div className="ed-hero-bg" />
          <div className="ed-hero-orb ed-orb1" />
          <div className="ed-hero-orb ed-orb2" />
          
          <div className="ed-hero-inner">
            <div>
              <div className="ed-greeting">Finance Management</div>
              <h1 className="ed-hero-name" style={{ fontSize: 24, margin: '4px 0 0' }}>Branch Expenses</h1>
            </div>
            <div className="ed-hero-actions">
              <button 
                onClick={() => setShowModal(true)} 
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                <MdAdd size={20} /> Add Expense
              </button>
            </div>
          </div>
        </div>

        <div className="ed-card">
          <div className="ed-card-header">
            <span className="ed-card-icon"><MdReceipt /></span>
            <h2>Expense History</h2>
          </div>
          
          <div className="ed-card-body" style={{ padding: 0 }}>
            <div className="ed-table-wrap">
              <table className="ed-table">
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
                  {loading ? (
                    <tr>
                      <td colSpan="5"><div className="ed-row-skel" /></td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan="5">
                        <div className="ed-empty">
                          <div className="ed-empty-icon">📝</div>
                          <div>No expenses found for this branch.</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    expenses.map(e => (
                      <tr key={e.id} className="ed-tr">
                        <td><strong style={{ color: '#1e293b' }}>{new Date(e.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric'})}</strong></td>
                        <td>
                          <span className="ed-platform-tag">{e.category}</span>
                        </td>
                        <td className="ed-charges">₹{Number(e.amount).toLocaleString('en-IN')}</td>
                        <td style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{e.created_by_name || 'System'}</td>
                        <td style={{ color: '#64748b', fontSize: 13 }}>{e.note || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Custom Enhanced Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fade-up 0.3s ease' }}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, padding: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', position: 'relative' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ background: '#f1f5f9', padding: 8, borderRadius: 10, color: '#3b82f6', display: 'flex' }}><MdAdd size={20} /></div>
                New Expense
              </h2>
              
              {error && (
                <div className="ed-alert ed-alert-error" style={{ marginBottom: 20 }}>{error}</div>
              )}
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Date</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} 
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 14, color: '#1e293b', outline: 'none' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Category</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 14, color: '#1e293b', outline: 'none', appearance: 'none' }}>
                    <option value="">Select Category...</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Travel">Travel</option>
                    <option value="Meals">Meals</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Amount (₹)</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 15, fontWeight: 700, color: '#059669', outline: 'none' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Note (Optional)</label>
                  <input type="text" placeholder="Brief description..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 14, color: '#1e293b', outline: 'none' }} />
                </div>
                
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowModal(false)}
                    style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)', opacity: submitting ? 0.7 : 1, transition: 'all 0.2s' }}>
                    {submitting ? 'Adding...' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
