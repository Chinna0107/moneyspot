import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/superadmin/Sidebar'
import { api } from '../../utils/api'
import { getTokenByRole } from '../../utils/tokenUtils'
import { MdWork, MdAdd, MdEdit, MdDelete, MdClose, MdToggleOn, MdToggleOff, MdLocationOn, MdBusiness } from 'react-icons/md'
import './superadmin.css'
import './Careers.css'

const TOKEN = () => getTokenByRole('superadmin')

const DEPARTMENTS = ['General', 'Operations', 'Finance', 'Technology', 'Sales', 'Customer Support', 'HR', 'Marketing', 'Compliance']
const JOB_TYPES   = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote']

const EMPTY_FORM = {
  title: '', department: 'Operations', location: 'Hyderabad, India',
  type: 'Full-time', description: '', requirements: '', is_active: true,
  image_url: ''
}

export default function CareersAdmin() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [filterDept, setFilterDept] = useState('all')

  // Create/Edit modal
  const [modal, setModal]     = useState(null) // 'create' | 'edit'
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formErr, setFormErr] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/careers?all=1').then(r => r.json())
      setJobs(r.jobs || [])
    } catch { setError('Failed to load jobs') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const flash = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3500)
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setFormErr('')
    setModal('create')
  }
  const openEdit = (job) => {
    setForm({
      title: job.title, department: job.department, location: job.location,
      type: job.type, description: job.description, requirements: job.requirements || '',
      is_active: job.is_active, image_url: job.image_url || ''
    })
    setFormErr('')
    setModal({ type: 'edit', id: job.id })
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/upload', { 
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN()}` },
        body: fd 
      }).then(r => r.json())
      if (res.url) setForm(f => ({ ...f, image_url: res.url }))
      else setFormErr('Failed to upload image')
    } catch (err) { setFormErr('Upload error: ' + err.message) }
    setUploading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setFormErr('Job title is required'); return }
    if (!form.description.trim()) { setFormErr('Description is required'); return }
    setSaving(true); setFormErr('')
    try {
      if (modal === 'create') {
        await api('/careers', {
          method: 'POST',
          headers: { Authorization: `Bearer ${TOKEN()}` },
          body: JSON.stringify(form),
        })
        flash('Job posting created!')
      } else {
        await api(`/careers/${modal.id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${TOKEN()}` },
          body: JSON.stringify(form),
        })
        flash('Job posting updated!')
      }
      setModal(null)
      load()
    } catch (err) {
      setFormErr(err.message)
    }
    setSaving(false)
  }

  const handleToggle = async (job) => {
    try {
      await api(`/careers/${job.id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${TOKEN()}` },
      })
      load()
    } catch (err) { flash(err.message, true) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this job posting permanently?')) return
    try {
      await api(`/careers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${TOKEN()}` },
      })
      flash('Job deleted')
      load()
    } catch (err) { flash(err.message, true) }
  }

  const depts    = ['all', ...new Set(jobs.map(j => j.department))]
  const filtered = filterDept === 'all' ? jobs : jobs.filter(j => j.department === filterDept)
  const active   = jobs.filter(j => j.is_active).length
  const inactive = jobs.length - active

  return (
    <div className="sa-page">
      <Sidebar />
      <div className="sa-content">
        <div className="sa-topbar">
          <div>
            <h1><MdWork style={{ verticalAlign: 'middle', marginRight: 8 }} />Careers Management</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Create and manage job postings shown on the public careers page</p>
          </div>
          <button className="sa-btn sa-btn-primary" onClick={openCreate}>
            <MdAdd size={16} /> Add Job Posting
          </button>
        </div>

        <div className="sa-main">
          {error   && <div className="sa-alert sa-alert-error">{error}</div>}
          {success && <div className="sa-alert sa-alert-success">{success}</div>}

          {/* Stats */}
          <div className="careers-stats">
            <div className="careers-stat green"><span>{active}</span><p>Active Openings</p></div>
            <div className="careers-stat red"><span>{inactive}</span><p>Inactive</p></div>
            <div className="careers-stat purple"><span>{jobs.length}</span><p>Total Postings</p></div>
          </div>

          {/* Filter */}
          <div className="gallery-filter-row">
            <MdBusiness size={18} style={{ color: '#64748b' }} />
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Department:</span>
            <div className="gallery-tag-pills">
              {depts.map(d => (
                <button
                  key={d}
                  className={`gallery-tag-pill${filterDept === d ? ' active' : ''}`}
                  onClick={() => setFilterDept(d)}
                >
                  {d === 'all' ? '💼 All' : d}
                </button>
              ))}
            </div>
          </div>

          {/* Jobs table */}
          {loading ? (
            <div className="sa-loading">Loading job postings...</div>
          ) : filtered.length === 0 ? (
            <div className="sa-empty">
              <MdWork size={48} style={{ opacity: 0.3 }} />
              <p>No job postings yet. Click "Add Job Posting" to create one!</p>
            </div>
          ) : (
            <div className="sa-card">
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Job Title</th>
                      <th>Department</th>
                      <th>Location</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(job => (
                      <tr key={job.id}>
                        <td>
                          <strong style={{ color: '#1a1a2e' }}>{job.title}</strong>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                            {job.description?.slice(0, 80)}...
                          </div>
                        </td>
                        <td>
                          <span className="careers-dept-badge">{job.department}</span>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          <MdLocationOn size={13} style={{ verticalAlign: 'middle', color: '#c02040' }} />
                          {job.location}
                        </td>
                        <td>
                          <span className={`careers-type-badge ${job.type.toLowerCase().replace('-', '')}`}>
                            {job.type}
                          </span>
                        </td>
                        <td>
                          <span className={`sa-status ${job.is_active ? 'active' : 'inactive'}`}>
                            {job.is_active ? '✅ Active' : '⏸ Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className={`sa-btn sa-btn-sm ${job.is_active ? 'sa-btn-warning' : 'sa-btn-success'}`}
                              onClick={() => handleToggle(job)}
                              title={job.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {job.is_active ? <MdToggleOff size={14} /> : <MdToggleOn size={14} />}
                              {job.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button className="sa-btn sa-btn-info sa-btn-sm" onClick={() => openEdit(job)}>
                              <MdEdit size={13} /> Edit
                            </button>
                            <button className="sa-btn sa-btn-danger sa-btn-sm" onClick={() => handleDelete(job.id)}>
                              <MdDelete size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div className="sa-modal-backdrop" onClick={() => setModal(null)}>
          <div className="sa-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>{modal === 'create' ? '➕ Create Job Posting' : '✏️ Edit Job Posting'}</h2>
              <button className="sa-modal-close" onClick={() => setModal(null)}><MdClose /></button>
            </div>
            <form onSubmit={handleSave}>
              {formErr && <div className="sa-alert sa-alert-error">{formErr}</div>}

              <div className="sa-form-group" style={{ marginBottom: 14 }}>
                <label>Job Title *</label>
                <input
                  required placeholder="e.g. Financial Services Executive"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="sa-form-grid" style={{ marginBottom: 14 }}>
                <div className="sa-form-group">
                  <label>Department</label>
                  <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="sa-form-group">
                  <label>Job Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="sa-form-grid" style={{ marginBottom: 14 }}>
                <div className="sa-form-group">
                  <label>Location</label>
                  <input
                    placeholder="e.g. Hyderabad, India"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>
                <div className="sa-form-group">
                  <label>Status</label>
                  <select value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'active' }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="sa-form-group" style={{ marginBottom: 14 }}>
                <label>Job Description *</label>
                <textarea
                  required rows={4}
                  placeholder="Describe the role, responsibilities, and what we're looking for..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'vertical', padding: '10px 14px', border: '1.5px solid rgba(64,32,112,0.2)', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="sa-form-group" style={{ marginBottom: 14 }}>
                <label>Job Image</label>
                {form.image_url ? (
                  <div style={{ position: 'relative', width: '100%', height: 160, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={form.image_url} alt="Job" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}
                    >
                      <MdClose />
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    />
                    <div style={{ padding: '16px', border: '2px dashed rgba(64,32,112,0.2)', borderRadius: 8, textAlign: 'center', color: '#64748b', fontSize: 13, background: '#f8fafc' }}>
                      {uploading ? 'Uploading...' : '📁 Click or drag an image here'}
                    </div>
                  </div>
                )}
              </div>

              <div className="sa-form-group" style={{ marginBottom: 20 }}>
                <label>Requirements (optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. 2+ years experience, Degree in Finance, Good communication skills..."
                  value={form.requirements}
                  onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                  style={{ resize: 'vertical', padding: '10px 14px', border: '1.5px solid rgba(64,32,112,0.2)', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="sa-modal-footer">
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="sa-btn sa-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : modal === 'create' ? '✅ Create Posting' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
