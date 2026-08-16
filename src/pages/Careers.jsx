import React, { useState, useEffect } from 'react'
import { MdLocationOn, MdWork, MdAccessTime, MdBusiness, MdClose, MdSend } from 'react-icons/md'
import './superadmin/Careers.css'
import './Careers.css'

export default function Careers() {
  const [jobs, setJobs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterDept, setFilterDept] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [applyJob, setApplyJob]   = useState(null)
  const [appForm, setAppForm]     = useState({ name: '', email: '', phone: '', resume: '', message: '' })
  const [appSent, setAppSent]     = useState(false)
  const [appErr, setAppErr]       = useState('')

  useEffect(() => {
    fetch('/careers')
      .then(r => r.json())
      .then(d => { setJobs(d.jobs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { setApplyJob(null); setAppSent(false) } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const depts = ['all', ...new Set(jobs.map(j => j.department))]
  const types = ['all', ...new Set(jobs.map(j => j.type))]

  const filtered = jobs.filter(j => {
    if (filterDept !== 'all' && j.department !== filterDept) return false
    if (filterType !== 'all' && j.type !== filterType) return false
    return true
  })

  const openApply = (job) => {
    setApplyJob(job)
    setAppForm({ name: '', email: '', phone: '', resume: '', message: '' })
    setAppSent(false)
    setAppErr('')
  }

  const handleApply = (e) => {
    e.preventDefault()
    if (!appForm.name || !appForm.email) { setAppErr('Name and email are required'); return }
    
    // Format the message for WhatsApp
    const message = `*New Job Application*\n\n` +
      `*Role:* ${applyJob.title} (${applyJob.department})\n` +
      `*Name:* ${appForm.name}\n` +
      `*Email:* ${appForm.email}\n` +
      (appForm.phone ? `*Phone:* ${appForm.phone}\n` : '') +
      (appForm.resume ? `*Resume:* ${appForm.resume}\n` : '') +
      (appForm.message ? `*Message:* ${appForm.message}\n` : '')
    
    const whatsappUrl = `https://wa.me/919866440477?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    
    setAppSent(true)
    setAppErr('')
  }

  const typeClass = (t) => t.toLowerCase().replace(/[^a-z]/g, '')

  return (
    <>
      {/* Hero */}
      <section className="pub-careers-hero">
        <div className="pub-careers-hero-inner">
          <h1>Join the <span>MoneySpot</span> Family</h1>
          <p>Be part of a fast-growing fintech team that's transforming financial access for millions across India.</p>
          <div className="pub-careers-hero-stats">
            <div className="pub-careers-hero-stat">
              <strong>{jobs.length}</strong>
              <span>Open Roles</span>
            </div>
            <div className="pub-careers-hero-stat">
              <strong>{new Set(jobs.map(j => j.department)).size}</strong>
              <span>Departments</span>
            </div>
            <div className="pub-careers-hero-stat">
              <strong>{new Set(jobs.map(j => j.location)).size}</strong>
              <span>Locations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="pub-careers-body">
        {/* Filters */}
        {!loading && jobs.length > 0 && (
          <div className="pub-careers-filters">
            <div className="pub-careers-filter-group">
              <label>Department</label>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                {depts.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
              </select>
            </div>
            <div className="pub-careers-filter-group">
              <label>Job Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                {types.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>)}
              </select>
            </div>
            <div className="pub-careers-count">
              Showing <strong>{filtered.length}</strong> of {jobs.length} opening{jobs.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="pub-careers-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{
                height: 280, borderRadius: 18, background: 'linear-gradient(90deg,#f0f2f8 25%,#e4e6f0 50%,#f0f2f8 75%)',
                backgroundSize: '600px 100%', animation: 'sa-shimmer 1.4s infinite linear'
              }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="pub-careers-empty">
            <MdWork size={56} />
            <h3>No openings found</h3>
            <p>Try changing the filters, or check back later.</p>
          </div>
        ) : (
          <div className="pub-careers-grid">
            {filtered.map((job, i) => (
              <div key={job.id} className="pub-careers-card" style={{ animationDelay: `${i * 0.06}s` }}>
                {job.image_url && (
                  <div style={{ margin: '-28px -28px 20px -28px', height: 160, overflow: 'hidden' }}>
                    <img src={job.image_url} alt={job.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div className="pub-careers-card-header">
                  <h3 className="pub-careers-card-title">{job.title}</h3>
                  <span className="pub-careers-card-dept">{job.department}</span>
                </div>
                <div className="pub-careers-card-meta">
                  <div className="pub-careers-meta-item">
                    <MdLocationOn size={14} />
                    {job.location}
                  </div>
                  <div className="pub-careers-meta-item">
                    <MdAccessTime size={14} />
                    {job.type}
                  </div>
                </div>
                <p className="pub-careers-card-desc">{job.description}</p>
                {job.requirements && (
                  <p className="pub-careers-card-reqs">
                    <strong>Requirements:</strong> {job.requirements}
                  </p>
                )}
                <button className="pub-careers-apply-btn" onClick={() => openApply(job)}>
                  Apply Now →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* CTA Banner */}
        {!loading && (
          <div className="pub-careers-cta">
            <h2>Don't see the right fit?</h2>
            <p>Send us your resume and we'll reach out when the perfect opportunity opens up.</p>
            <a href="mailto:careers@moneyspotfintech.com">📧 careers@moneyspotfintech.com</a>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {applyJob && (
        <div className="sa-modal-backdrop" onClick={() => { setApplyJob(null); setAppSent(false) }}>
          <div className="sa-modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>📝 Apply Now</h2>
              <button className="sa-modal-close" onClick={() => { setApplyJob(null); setAppSent(false) }}><MdClose /></button>
            </div>

            <div className="apply-modal-job-title">
              <MdWork style={{ verticalAlign: 'middle', marginRight: 8, color: '#402070' }} />
              {applyJob.title} — {applyJob.department}
            </div>

            {appSent ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
                <h3 style={{ color: '#059669', margin: '0 0 8px' }}>Application Submitted!</h3>
                <p style={{ color: '#64748b', margin: 0 }}>
                  Thank you for your interest, <strong>{appForm.name}</strong>!<br />
                  We'll review your application and get in touch at <strong>{appForm.email}</strong>.
                </p>
                <button
                  className="pub-careers-apply-btn"
                  style={{ marginTop: 24, display: 'inline-block' }}
                  onClick={() => { setApplyJob(null); setAppSent(false) }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleApply}>
                {appErr && <div className="sa-alert sa-alert-error">{appErr}</div>}

                <div className="sa-form-grid" style={{ marginBottom: 14 }}>
                  <div className="sa-form-group">
                    <label>Full Name *</label>
                    <input
                      required placeholder="Your name"
                      value={appForm.name}
                      onChange={e => setAppForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="sa-form-group">
                    <label>Email *</label>
                    <input
                      required type="email" placeholder="you@example.com"
                      value={appForm.email}
                      onChange={e => setAppForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="sa-form-grid" style={{ marginBottom: 14 }}>
                  <div className="sa-form-group">
                    <label>Phone</label>
                    <input
                      type="tel" placeholder="+91 XXXXX XXXXX"
                      value={appForm.phone}
                      onChange={e => setAppForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="sa-form-group">
                    <label>Resume Link (optional)</label>
                    <input
                      type="url" placeholder="Google Drive / LinkedIn"
                      value={appForm.resume}
                      onChange={e => setAppForm(f => ({ ...f, resume: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="sa-form-group" style={{ marginBottom: 20 }}>
                  <label>Cover Message (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us why you'd be a great fit..."
                    value={appForm.message}
                    onChange={e => setAppForm(f => ({ ...f, message: e.target.value }))}
                    style={{ resize: 'vertical', padding: '10px 14px', border: '1.5px solid rgba(64,32,112,0.2)', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div className="sa-modal-footer">
                  <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setApplyJob(null)}>Cancel</button>
                  <button type="submit" className="sa-btn sa-btn-primary">
                    <MdSend size={14} /> Submit Application
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
