import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getTokenByRole } from '../../utils/tokenUtils';
import EmployeeNavbar from '../../components/employee/EmployeeNavbar';
import AdminSidebar from '../../components/admin/AdminSidebar';
import SuperAdminSidebar from '../../components/superadmin/Sidebar';
import '../../pages/dashboard.css';

export default function PendingPayments({ role = 'employee' }) {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ customer_id: '', cust_name: '', cust_mobile: '', pending_amount: '', reason: '', card_number: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const token = getTokenByRole(role);

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
  }, []);

  const fetchPayments = async () => {
    try {
      const data = await api('/dashboard/pending-payments', { headers: { Authorization: `Bearer ${token}` } });
      setPayments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await api('/customers', { headers: { Authorization: `Bearer ${token}` } });
      setCustomers(Array.isArray(data) ? data : data.customers || []);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredCusts = search.length >= 2 
    ? customers.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.pan?.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
    : [];

  const selectCustomer = (c) => {
    setForm(f => ({ ...f, customer_id: c.id, cust_name: c.name, cust_mobile: c.phone }));
    setSearch(c.name);
  };

  const clearCustomer = () => {
    setForm({ customer_id: '', cust_name: '', cust_mobile: '', pending_amount: '', reason: '', card_number: '' });
    setSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await api('/dashboard/pending-payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      setMsg('Pending payment recorded successfully!');
      clearCustomer();
      fetchPayments();
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await api(`/dashboard/pending-payments/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchPayments();
    } catch (e) {
      alert(e.message);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="dash-page">
      {role === 'employee' && <EmployeeNavbar />}
      {role === 'admin' && <AdminSidebar />}
      {role === 'superadmin' && <SuperAdminSidebar />}

      <div className="dash-content">
        <div className="dash-topbar">
          <h1>Pending Payments</h1>
        </div>
        <div className="dash-main">
          {msg && <div className="dash-alert dash-alert-success">✅ {msg}</div>}
          {error && <div className="dash-alert dash-alert-error">❌ {error}</div>}

          <div className="dash-card" style={{ marginBottom: 20 }}>
            <div className="dash-card-header"><h2>New Pending Payment</h2></div>
            <div className="dash-card-body">
              <div style={{ position: 'relative', marginBottom: 16, zIndex: 200 }}>
                <input placeholder="Search customer by name, phone or PAN..." value={search}
                  onChange={e => { setSearch(e.target.value); if (form.customer_id) clearCustomer(); }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid rgba(64,32,112,0.2)', fontFamily: 'inherit', fontSize: 14 }} />

                {filteredCusts.length > 0 && !form.customer_id && (
                  <div className="customer-search-dropdown" style={{ zIndex: 1000 }}>
                    {filteredCusts.map(c => (
                      <div key={c.id} onClick={() => selectCustomer(c)} className="customer-search-item">
                        <div style={{ fontWeight: 700, color: '#402070', fontSize: 14 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>{c.phone} · PAN: {c.pan}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(form.customer_id || search.length >= 2) && (
                <form onSubmit={handleSubmit}>
                  <div className="dash-form-grid">
                    <div className="dash-form-group">
                      <label>Customer Name *</label>
                      <input required value={form.cust_name} onChange={e => set('cust_name', e.target.value)} />
                    </div>
                    <div className="dash-form-group">
                      <label>Mobile Number *</label>
                      <input required value={form.cust_mobile} maxLength={10} onChange={e => set('cust_mobile', e.target.value.replace(/\D/g, '').slice(0,10))} />
                    </div>
                    <div className="dash-form-group">
                      <label>Pending Balance (₹) *</label>
                      <input required type="number" value={form.pending_amount} onChange={e => set('pending_amount', e.target.value)} />
                    </div>
                    <div className="dash-form-group">
                      <label>Credit Card (Last 4 Digits)</label>
                      <input maxLength={4} placeholder="e.g. 1234" value={form.card_number} onChange={e => set('card_number', e.target.value.replace(/\D/g, '').slice(0,4))} />
                    </div>
                    <div className="dash-form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Reason / Note *</label>
                      <textarea required value={form.reason} onChange={e => set('reason', e.target.value)} rows={2} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid #e2e8f0', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                  <button type="submit" className="dash-btn dash-btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : '✅ Save Pending Payment'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header"><h2>Pending Payments List</h2></div>
            <div className="table-responsive">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th>Branch</th>
                    <th>Amount</th>
                    <th>Card Last 4</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                      <td>{p.cust_name}</td>
                      <td>{p.cust_mobile}</td>
                      <td>{p.branch}</td>
                      <td style={{ fontWeight: 700, color: '#c02040' }}>₹{p.pending_amount}</td>
                      <td>{p.card_number || '—'}</td>
                      <td>{p.reason}</td>
                      <td>
                        <select 
                          value={p.status} 
                          onChange={(e) => updateStatus(p.id, e.target.value)}
                          style={{ 
                            padding: '4px 8px', 
                            borderRadius: 20, 
                            border: '1px solid #cbd5e1', 
                            fontSize: 12, 
                            fontWeight: 700,
                            background: p.status === 'Cleared' ? '#dcfce7' : '#fee2e2',
                            color: p.status === 'Cleared' ? '#166534' : '#991b1b'
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Cleared">Cleared</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>No pending payments found</td></tr>
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
