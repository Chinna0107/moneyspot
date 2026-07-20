import { useState, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import Sidebar from '../../components/superadmin/Sidebar'
import { api } from '../../utils/api'
import { getTokenByRole } from '../../utils/tokenUtils'
import '../dashboard.css'
import './superadmin.css'
import './Dashboard.css'

const auth = () => ({ Authorization: `Bearer ${getTokenByRole('superadmin')}` })
const fmt  = n => Number(parseFloat(n) || 0).toLocaleString('en-IN')

const STATUS_STYLE = {
  pending:  { bg: '#fef3c7', color: '#d97706', label: '⏳ Pending'  },
  approved: { bg: '#d1fae5', color: '#059669', label: '✅ Approved' },
  rejected: { bg: '#fee2e2', color: '#dc2626', label: '❌ Rejected' },
}

export default function RedemptionList() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [msg, setMsg]           = useState('')
  const [busy, setBusy]         = useState(null) // id of row being actioned

  const load = useCallback(() => {
    setLoading(true)
    api('/superadmin/redeem-requests', { headers: auth() })
      .then(d => { setRequests(Array.isArray(d) ? d : (d.requests ?? [])); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const action = async (id, act) => {
    setBusy(id); setMsg('')
    try {
      const r = await api(`/superadmin/redeem-requests/${id}/${act}`, { method: 'PATCH', headers: auth() })
      setMsg(r.message || `Request ${act}d successfully`)
      load()
    } catch (e) { setMsg('Error: ' + e.message) }
    setBusy(null)
  }

  const exportExcel = () => {
    if (!filtered.length) return alert('No data to export')
    const rows = filtered.map(r => ({
      'ID':               r.id,
      'Customer':         r.customer_name || '',
      'PAN':              r.customer_pan  || '',
      'Phone':            r.customer_phone || '',
      'Branch':           r.branch || '',
      'Coins Requested':  r.coins,
      'Current Balance':  r.current_balance ?? r.coins_balance ?? 0,
      'Status':           r.status,
      'Requested On':     new Date(r.created_at).toLocaleString('en-IN'),
      'Actioned By':      r.actioned_by_name || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Redemptions')
    XLSX.writeFile(wb, `redemptions_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportPDF = () => {
    if (!filtered.length) return alert('No data to export')
    const rows = filtered.map((r, i) => {
      const ss = STATUS_STYLE[r.status] || STATUS_STYLE.pending
      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${r.customer_name || '—'}</strong><br/><span style="color:#64748b;font-size:11px">${r.customer_pan || ''}</span></td>
        <td>${r.customer_phone || '—'}</td>
        <td>${r.branch || '—'}</td>
        <td style="color:#b8860b;font-weight:700">🪙 ${fmt(r.coins)}</td>
        <td>🪙 ${fmt(r.current_balance ?? r.coins_balance ?? 0)}</td>
        <td>${new Date(r.created_at).toLocaleDateString('en-IN')}</td>
        <td><span style="background:${ss.bg};color:${ss.color};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${ss.label}</span></td>
        <td>${r.actioned_by_name || '—'}</td>
      </tr>`
    }).join('')
    const html = `<html><head><title>Redemption Requests</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a0a2e; }
        h2 { color: #402070; margin-bottom: 4px; }
        p  { color: #64748b; font-size: 12px; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #402070; color: #fff; padding: 9px 12px; text-align: left; font-size: 11px; }
        td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
        tr:nth-child(even) td { background: #f8fafc; }
      </style></head><body>
      <h2>🪙 MoneySpot — Redemption Requests</h2>
      <p>Exported on ${new Date().toLocaleDateString('en-IN')} · ${filtered.length} records · Filter: ${filter}</p>
      <table>
        <thead><tr><th>#</th><th>Customer</th><th>Phone</th><th>Branch</th><th>Coins</th><th>Balance</th><th>Date</th><th>Status</th><th>Actioned By</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 400)
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  const stats = {
    total:    requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  return (
    <div className="sa-page">
      <Sidebar />
      <div className="sa-content">
        <div className="dash-topbar">
          <div>
            <h1 className="dash-topbar-title">🪙 Redemption Requests</h1>
            <p className="dash-topbar-sub">Review and approve customer coin redemption requests</p>
          </div>
          <button className="sa-btn sa-btn-primary sa-btn-sm" onClick={load}>🔄 Refresh</button>
          <button onClick={exportExcel} disabled={loading}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            📊 Excel
          </button>
          <button onClick={exportPDF} disabled={loading}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            📄 PDF
          </button>
        </div>

        <div className="dash-main">

          {/* Stats */}
          <div className="dash-stats" style={{ marginBottom: 20 }}>
            {[
              { label: 'Total Requests', value: stats.total,    color: '#402070' },
              { label: 'Pending',        value: stats.pending,  color: '#d97706' },
              { label: 'Approved',       value: stats.approved, color: '#059669' },
              { label: 'Rejected',       value: stats.rejected, color: '#dc2626' },
            ].map(s => (
              <div key={s.label} className="dash-stat">
                <div className="dash-stat-label">{s.label}</div>
                <div className="dash-stat-value" style={{ color: s.color }}>{loading ? '—' : s.value}</div>
              </div>
            ))}
          </div>

          {msg && (
            <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
              background: msg.startsWith('Error') ? '#fee2e2' : '#d1fae5',
              color: msg.startsWith('Error') ? '#dc2626' : '#059669' }}>
              {msg}
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '7px 18px', borderRadius: 20, border: '1.5px solid', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  borderColor: filter === f ? '#402070' : '#e2e8f0',
                  background:  filter === f ? '#402070' : '#fff',
                  color:       filter === f ? '#fff'    : '#64748b' }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '1px 7px', fontSize: 11 }}>
                  {stats[f] ?? 0}
                </span>}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="sa-card">
            <div className="sa-card-header">
              <h2>Requests ({filtered.length})</h2>
            </div>
            <div className="sa-table-wrap">
              {loading ? <div className="dash-loading">Loading...</div> : filtered.length === 0 ? (
                <div className="sa-empty">No redemption requests found</div>
              ) : (
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Branch</th>
                      <th>Coins Requested</th>
                      <th>Current Balance</th>
                      <th>Requested On</th>
                      <th>Status</th>
                      <th>Actioned By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const ss = STATUS_STYLE[r.status] || STATUS_STYLE.pending
                      return (
                        <tr key={r.id}>
                          <td style={{ fontFamily: 'monospace', color: '#402070', fontWeight: 700, fontSize: 11 }}>#{r.id}</td>
                          <td><strong>{r.customer_name || '—'}</strong><div style={{ fontSize: 11, color: '#9ca3af' }}>{r.customer_pan || ''}</div></td>
                          <td style={{ fontSize: 12 }}>{r.customer_phone || '—'}</td>
                          <td><span style={{ background: '#ede9fe', color: '#402070', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{r.branch || '—'}</span></td>
                          <td style={{ color: '#d4af37', fontWeight: 800, fontSize: 14 }}>🪙 {fmt(r.coins)}</td>
                          <td style={{ color: '#64748b', fontSize: 13 }}>🪙 {fmt(r.current_balance ?? r.coins_balance ?? 0)}</td>
                          <td style={{ fontSize: 12, color: '#64748b' }}>{new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                          <td>
                            <span style={{ background: ss.bg, color: ss.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              {ss.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#64748b' }}>{r.actioned_by_name || '—'}</td>
                          <td>
                            {r.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  disabled={busy === r.id}
                                  onClick={() => action(r.id, 'approve')}
                                  style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  ✅ Approve
                                </button>
                                <button
                                  disabled={busy === r.id}
                                  onClick={() => action(r.id, 'reject')}
                                  style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  ❌ Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
