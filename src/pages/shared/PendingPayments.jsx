import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getTokenByRole } from '../../utils/tokenUtils';
import EmployeeSidebar from '../../components/employee/EmployeeSidebar';
import AdminSidebar from '../../components/admin/AdminSidebar';
import SuperAdminSidebar from '../../components/superadmin/Sidebar';
import '../../pages/dashboard.css';

export default function PendingPayments({ role = 'employee' }) {
  const [collections, setCollections] = useState([]);
  const [summary, setSummary] = useState(null);
  const [ageing, setAgeing] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [activeDrawerId, setActiveDrawerId] = useState(null);
  const [activeDrawerData, setActiveDrawerData] = useState(null);
  
  // Modal states
  const [paymentModal, setPaymentModal] = useState(false);
  const [followUpModal, setFollowUpModal] = useState(false);
  const [ptpModal, setPtpModal] = useState(false);
  const [newEntryModal, setNewEntryModal] = useState(false);
  
  // Forms
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_mode: 'Cash', reference_note: '' });
  const [followUpForm, setFollowUpForm] = useState({ contact_mode: 'Call', customer_response: '', next_follow_up_date: '' });
  const [ptpForm, setPtpForm] = useState({ ptp_date: '', ptp_amount: '', note: '' });
  const [newEntryForm, setNewEntryForm] = useState({ cust_name: '', cust_mobile: '', pending_amount: '', reason: '', priority: 'P4', is_vip: false });

  const token = getTokenByRole(role);

  const loadData = async () => {
    try {
      setLoading(true);
      const [colData, sumData] = await Promise.all([
        api('/collections', { headers: { Authorization: `Bearer ${token}` } }),
        api('/collections/summary', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setCollections(colData);
      setSummary(sumData.summary);
      setAgeing(sumData.ageing);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDrawer = async (id) => {
    setActiveDrawerId(id);
    try {
      const data = await api(`/collections/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setActiveDrawerData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await api(`/collections/${activeDrawerId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(paymentForm)
      });
      setPaymentModal(false);
      setPaymentForm({ amount: '', payment_mode: 'Cash', reference_note: '' });
      openDrawer(activeDrawerId);
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleFollowUp = async (e) => {
    e.preventDefault();
    try {
      await api(`/collections/${activeDrawerId}/follow-up`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(followUpForm)
      });
      setFollowUpModal(false);
      setFollowUpForm({ contact_mode: 'Call', customer_response: '', next_follow_up_date: '' });
      openDrawer(activeDrawerId);
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handlePtp = async (e) => {
    e.preventDefault();
    try {
      await api(`/collections/${activeDrawerId}/ptp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(ptpForm)
      });
      setPtpModal(false);
      setPtpForm({ ptp_date: '', ptp_amount: '', note: '' });
      openDrawer(activeDrawerId);
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleNewEntry = async (e) => {
    e.preventDefault();
    try {
      await api(`/collections`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(newEntryForm)
      });
      setNewEntryModal(false);
      setNewEntryForm({ cust_name: '', cust_mobile: '', pending_amount: '', reason: '', priority: 'P4', is_vip: false });
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return '#fee2e2';
      case 'Partially Paid': return '#fef08a';
      case 'Follow-up Required': return '#fed7aa';
      case 'Promise to Pay': return '#bfdbfe';
      case 'Cleared': return '#bbf7d0';
      default: return '#e5e7eb';
    }
  };
  
  const getStatusTextColor = (status) => {
    switch(status) {
      case 'Pending': return '#991b1b';
      case 'Partially Paid': return '#854d0e';
      case 'Follow-up Required': return '#c2410c';
      case 'Promise to Pay': return '#1d4ed8';
      case 'Cleared': return '#166534';
      default: return '#374151';
    }
  };

  return (
    <div className="dash-page">
      {role === 'employee' && <EmployeeSidebar />}
      {role === 'admin' && <AdminSidebar />}
      {role === 'superadmin' && <SuperAdminSidebar />}

      <main className="dash-main" style={{ position: 'relative' }}>
        <div className="dash-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Collections & Recovery</h1>
          <button className="dash-btn dash-btn-primary" onClick={() => setNewEntryModal(true)}>+ New Pending Entry</button>
        </div>

        <div className="dash-main-content">
          {/* Summary Cards */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div className="dash-card" style={{ padding: 16, textAlign: 'center', borderTop: '4px solid #ef4444' }}>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Outstanding</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginTop: 8 }}>₹{Number(summary.total_outstanding).toLocaleString()}</div>
              </div>
              <div className="dash-card" style={{ padding: 16, textAlign: 'center', borderTop: '4px solid #3b82f6' }}>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Pending Customers</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginTop: 8 }}>{summary.total_customers}</div>
              </div>
              <div className="dash-card" style={{ padding: 16, textAlign: 'center', borderTop: '4px solid #f59e0b' }}>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Follow-ups Today</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 8 }}>{summary.followups_today}</div>
              </div>
              <div className="dash-card" style={{ padding: 16, textAlign: 'center', borderTop: '4px solid #10b981' }}>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Recovered This Month</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981', marginTop: 8 }}>₹{Number(summary.recovered_month).toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Ageing Banner */}
          {ageing.length > 0 && (
            <div className="dash-card" style={{ marginBottom: 24, padding: 16, display: 'flex', gap: 24, background: '#f8fafc' }}>
              <strong style={{ alignSelf: 'center', color: '#475569' }}>Ageing Summary:</strong>
              {ageing.map(a => (
                <div key={a.bucket} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{a.bucket}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: a.bucket === '30+ Days' ? '#ef4444' : '#0f172a' }}>
                    {a.count} cases (₹{Number(a.amount).toLocaleString()})
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Main Table */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h2>Pending Entries</h2>
            </div>
            <div className="table-responsive">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Ageing</th>
                    <th>Original</th>
                    <th>Recovered</th>
                    <th>Remaining</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map(c => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openDrawer(c.id)}>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          {c.is_vip && <span title="VIP" style={{ marginRight: 4 }}>👑</span>}
                          {c.cust_name}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{c.cust_mobile} • {c.branch}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: c.age_days >= 30 ? '#ef4444' : '#334155' }}>
                          {c.age_days || 0} Days
                        </div>
                      </td>
                      <td style={{ color: '#64748b' }}>₹{Number(c.pending_amount).toLocaleString()}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>₹{Number(c.total_paid).toLocaleString()}</td>
                      <td style={{ color: '#ef4444', fontWeight: 700, fontSize: 15 }}>₹{Number(c.remaining_amount).toLocaleString()}</td>
                      <td>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: c.priority === 'P1' ? '#fee2e2' : '#f1f5f9', color: c.priority === 'P1' ? '#ef4444' : '#475569' }}>
                          {c.priority}
                        </span>
                      </td>
                      <td>
                        <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: getStatusColor(c.status), color: getStatusTextColor(c.status) }}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <button className="dash-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); openDrawer(c.id); }}>Open 360</button>
                      </td>
                    </tr>
                  ))}
                  {collections.length === 0 && !loading && (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>No pending collections found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Customer 360 Drawer */}
        {activeDrawerId && activeDrawerData && (
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, background: '#fff', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 20, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>
                  {activeDrawerData.is_vip && '👑 '}
                  {activeDrawerData.cust_name}
                </h2>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  {activeDrawerData.cust_mobile} • {activeDrawerData.branch}
                </div>
              </div>
              <button onClick={() => setActiveDrawerId(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
            </div>
            
            <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
              {/* Financial Snapshot */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24, textAlign: 'center' }}>
                <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Original</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>₹{Number(activeDrawerData.pending_amount).toLocaleString()}</div>
                </div>
                <div style={{ padding: 12, background: '#dcfce7', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#166534', textTransform: 'uppercase', fontWeight: 700 }}>Recovered</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>₹{Number(activeDrawerData.total_paid).toLocaleString()}</div>
                </div>
                <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#991b1b', textTransform: 'uppercase', fontWeight: 700 }}>Remaining</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#991b1b' }}>₹{Number(activeDrawerData.remaining_amount).toLocaleString()}</div>
                </div>
              </div>

              {/* Status & Alerts */}
              <div style={{ marginBottom: 24, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Status:</span>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: getStatusColor(activeDrawerData.status), color: getStatusTextColor(activeDrawerData.status) }}>
                    {activeDrawerData.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Ageing:</span>
                  <span style={{ color: activeDrawerData.age_days >= 30 ? '#ef4444' : '#334155', fontWeight: 600 }}>{activeDrawerData.age_days || 0} Days</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>Next Follow-up:</span>
                  <span style={{ fontWeight: 600, color: '#2563eb' }}>
                    {activeDrawerData.next_follow_up_date ? new Date(activeDrawerData.next_follow_up_date).toLocaleString('en-IN', {dateStyle: 'medium', timeStyle: 'short'}) : 'None Scheduled'}
                  </span>
                </div>
                {activeDrawerData.ptp_date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 600 }}>Promise to Pay:</span>
                    <span style={{ fontWeight: 600, color: '#1d4ed8' }}>
                      ₹{activeDrawerData.ptp_amount} by {new Date(activeDrawerData.ptp_date).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              {activeDrawerData.status !== 'Cleared' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                  <button className="dash-btn dash-btn-primary" onClick={() => setPaymentModal(true)}>💵 Add Payment</button>
                  <button className="dash-btn" style={{ background: '#f59e0b', color: '#fff' }} onClick={() => setFollowUpModal(true)}>📞 Log Follow-up</button>
                  <button className="dash-btn" style={{ background: '#3b82f6', color: '#fff', gridColumn: '1 / -1' }} onClick={() => setPtpModal(true)}>🤝 Set Promise to Pay</button>
                </div>
              )}

              {/* Timeline (Merged Recoveries & Follow-ups) */}
              <h3 style={{ fontSize: 14, color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>Activity Timeline</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...activeDrawerData.recoveries.map(r => ({ ...r, type: 'payment', date: r.payment_date })), ...activeDrawerData.followups.map(f => ({ ...f, type: 'followup', date: f.created_at }))]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((item, idx) => (
                    <div key={idx} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, borderLeft: item.type === 'payment' ? '4px solid #10b981' : '4px solid #f59e0b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        <strong style={{ color: item.type === 'payment' ? '#10b981' : '#f59e0b' }}>
                          {item.type === 'payment' ? 'Payment Received' : 'Follow-up Logged'}
                        </strong>
                        {new Date(item.date).toLocaleString('en-IN', {dateStyle: 'medium', timeStyle: 'short'})}
                      </div>
                      {item.type === 'payment' && (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>₹{item.amount} via {item.payment_mode}</div>
                          {item.reference_note && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Note: {item.reference_note}</div>}
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Recorded By: {item.added_by_name}</div>
                        </div>
                      )}
                      {item.type === 'followup' && (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{item.contact_mode}</div>
                          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>"{item.customer_response}"</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Handled By: {item.handled_by_name}</div>
                        </div>
                      )}
                    </div>
                ))}
                {activeDrawerData.recoveries.length === 0 && activeDrawerData.followups.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>No activity logged yet</div>
                )}
              </div>

              {/* Audit Logs (Admin/Superadmin only) */}
              {(role === 'admin' || role === 'superadmin') && activeDrawerData.audit && activeDrawerData.audit.length > 0 && (
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: 14, color: '#475569', marginBottom: 12 }}>🔒 Audit Trail</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activeDrawerData.audit.map(log => (
                      <div key={log.id} style={{ fontSize: 12, padding: 8, background: '#f1f5f9', borderRadius: 6, color: '#475569' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <strong style={{ color: '#1e293b' }}>{log.action}</strong>
                          <span>{new Date(log.created_at).toLocaleString('en-IN', {dateStyle: 'short', timeStyle: 'short'})}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {log.old_value && <span>Old: <span style={{textDecoration: 'line-through'}}>{log.old_value}</span></span>}
                          {log.new_value && <span>New: <strong>{log.new_value}</strong></span>}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>By: {log.user_name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: New Pending Entry */}
        {newEntryModal && (
          <div className="dash-modal-overlay">
            <div className="dash-modal" style={{ width: 500 }}>
              <h2>New Pending Entry</h2>
              <form onSubmit={handleNewEntry}>
                <div className="dash-form-group">
                  <label>Customer Name</label>
                  <input required value={newEntryForm.cust_name} onChange={e => setNewEntryForm({...newEntryForm, cust_name: e.target.value})} />
                </div>
                <div className="dash-form-group">
                  <label>Mobile Number</label>
                  <input required maxLength={10} value={newEntryForm.cust_mobile} onChange={e => setNewEntryForm({...newEntryForm, cust_mobile: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div className="dash-form-group" style={{ flex: 1 }}>
                    <label>Amount (₹)</label>
                    <input required type="number" value={newEntryForm.pending_amount} onChange={e => setNewEntryForm({...newEntryForm, pending_amount: e.target.value})} />
                  </div>
                  <div className="dash-form-group" style={{ flex: 1 }}>
                    <label>Priority</label>
                    <select value={newEntryForm.priority} onChange={e => setNewEntryForm({...newEntryForm, priority: e.target.value})}>
                      <option value="P1">P1 (Critical)</option>
                      <option value="P2">P2 (High)</option>
                      <option value="P3">P3 (Medium)</option>
                      <option value="P4">P4 (Normal)</option>
                    </select>
                  </div>
                </div>
                <div className="dash-form-group">
                  <label>
                    <input type="checkbox" checked={newEntryForm.is_vip} onChange={e => setNewEntryForm({...newEntryForm, is_vip: e.target.checked})} style={{ marginRight: 8 }} />
                    Mark as VIP Collection
                  </label>
                </div>
                <div className="dash-form-group">
                  <label>Reason / Note</label>
                  <textarea required rows={2} value={newEntryForm.reason} onChange={e => setNewEntryForm({...newEntryForm, reason: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div className="dash-modal-actions">
                  <button type="button" className="dash-btn" onClick={() => setNewEntryModal(false)}>Cancel</button>
                  <button type="submit" className="dash-btn dash-btn-primary">Save Entry</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Payment */}
        {paymentModal && (
          <div className="dash-modal-overlay">
            <div className="dash-modal" style={{ width: 400 }}>
              <h2>Record Payment</h2>
              <div style={{ marginBottom: 16, padding: 10, background: '#f1f5f9', borderRadius: 8, fontSize: 13 }}>
                <strong>Remaining Balance: </strong> ₹{activeDrawerData?.remaining_amount}
              </div>
              <form onSubmit={handlePayment}>
                <div className="dash-form-group">
                  <label>Amount (₹) *</label>
                  <input required type="number" max={activeDrawerData?.remaining_amount} value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
                </div>
                <div className="dash-form-group">
                  <label>Payment Mode</label>
                  <select value={paymentForm.payment_mode} onChange={e => setPaymentForm({...paymentForm, payment_mode: e.target.value})}>
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
                <div className="dash-form-group">
                  <label>Reference Note</label>
                  <input value={paymentForm.reference_note} onChange={e => setPaymentForm({...paymentForm, reference_note: e.target.value})} placeholder="e.g. UPI Txn ID" />
                </div>
                <div className="dash-modal-actions">
                  <button type="button" className="dash-btn" onClick={() => setPaymentModal(false)}>Cancel</button>
                  <button type="submit" className="dash-btn dash-btn-primary">Save Payment</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Follow-up */}
        {followUpModal && (
          <div className="dash-modal-overlay">
            <div className="dash-modal" style={{ width: 400 }}>
              <h2>Log Follow-up</h2>
              <form onSubmit={handleFollowUp}>
                <div className="dash-form-group">
                  <label>Contact Mode</label>
                  <select value={followUpForm.contact_mode} onChange={e => setFollowUpForm({...followUpForm, contact_mode: e.target.value})}>
                    <option>Call</option>
                    <option>WhatsApp</option>
                    <option>In-person</option>
                  </select>
                </div>
                <div className="dash-form-group">
                  <label>Customer Response *</label>
                  <textarea required rows={3} value={followUpForm.customer_response} onChange={e => setFollowUpForm({...followUpForm, customer_response: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div className="dash-form-group">
                  <label>Next Follow-up Date & Time</label>
                  <input type="datetime-local" value={followUpForm.next_follow_up_date} onChange={e => setFollowUpForm({...followUpForm, next_follow_up_date: e.target.value})} />
                </div>
                <div className="dash-modal-actions">
                  <button type="button" className="dash-btn" onClick={() => setFollowUpModal(false)}>Cancel</button>
                  <button type="submit" className="dash-btn dash-btn-primary">Save Log</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: PTP */}
        {ptpModal && (
          <div className="dash-modal-overlay">
            <div className="dash-modal" style={{ width: 400 }}>
              <h2>Promise to Pay (PTP)</h2>
              <form onSubmit={handlePtp}>
                <div className="dash-form-group">
                  <label>Promised Date *</label>
                  <input type="date" required value={ptpForm.ptp_date} onChange={e => setPtpForm({...ptpForm, ptp_date: e.target.value})} />
                </div>
                <div className="dash-form-group">
                  <label>Promised Amount (₹) *</label>
                  <input type="number" required value={ptpForm.ptp_amount} onChange={e => setPtpForm({...ptpForm, ptp_amount: e.target.value})} />
                </div>
                <div className="dash-form-group">
                  <label>Notes</label>
                  <input value={ptpForm.note} onChange={e => setPtpForm({...ptpForm, note: e.target.value})} />
                </div>
                <div className="dash-modal-actions">
                  <button type="button" className="dash-btn" onClick={() => setPtpModal(false)}>Cancel</button>
                  <button type="submit" className="dash-btn dash-btn-primary">Set PTP</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
