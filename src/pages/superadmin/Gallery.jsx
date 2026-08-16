import React, { useState, useEffect, useRef } from 'react'
import Sidebar from '../../components/superadmin/Sidebar'
import { api, apiUpload } from '../../utils/api'
import { getTokenByRole } from '../../utils/tokenUtils'
import { MdPhotoLibrary, MdUpload, MdEdit, MdDelete, MdClose, MdFilterList, MdAdd } from 'react-icons/md'
import './superadmin.css'
import './Gallery.css'

const TOKEN = () => getTokenByRole('superadmin')

const PRESET_TAGS = ['General', 'Branch Opening', 'Team Meeting', 'Customer Event', 'Achievement', 'Training', 'Office', 'Celebration']

export default function GalleryAdmin() {
  const [photos, setPhotos]       = useState([])
  const [tags, setTags]           = useState([])
  const [filterTag, setFilterTag] = useState('all')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  // Upload modal state
  const [showUpload, setShowUpload]   = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [uploadErr, setUploadErr]     = useState('')
  const [form, setForm]               = useState({ image_url: '', title: '', tag: 'General', description: '' })
  const [uploadProgress, setUploadProgress] = useState(false)
  const fileRef = useRef()

  // Edit modal state
  const [editPhoto, setEditPhoto]   = useState(null)
  const [editForm, setEditForm]     = useState({})
  const [editSaving, setEditSaving] = useState(false)

  // Lightbox
  const [lightbox, setLightbox] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [photoRes, tagRes] = await Promise.all([
        fetch('/gallery').then(r => r.json()),
        fetch('/gallery/tags').then(r => r.json()),
      ])
      setPhotos(photoRes.photos || [])
      setTags(tagRes.tags || [])
    } catch (e) {
      setError('Failed to load gallery')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const flash = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3500)
  }

  // Upload image file via Cloudinary
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadProgress(true); setUploadErr('')
    try {
      const data = await apiUpload('/upload?folder=moneyspot/gallery', file, TOKEN())
      setForm(f => ({ ...f, image_url: data.url }))
    } catch (err) {
      setUploadErr(err.message)
    }
    setUploadProgress(false)
    e.target.value = ''
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!form.image_url) { setUploadErr('Please upload or paste an image URL'); return }
    setUploading(true); setUploadErr('')
    try {
      await api('/gallery', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify(form),
      })
      setShowUpload(false)
      setForm({ image_url: '', title: '', tag: 'General', description: '' })
      flash('Photo added to gallery!')
      load()
    } catch (err) {
      setUploadErr(err.message)
    }
    setUploading(false)
  }

  const openEdit = (photo) => {
    setEditPhoto(photo)
    setEditForm({ title: photo.title, tag: photo.tag, description: photo.description })
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    setEditSaving(true)
    try {
      await api(`/gallery/${editPhoto.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify(editForm),
      })
      setEditPhoto(null)
      flash('Photo updated!')
      load()
    } catch (err) {
      flash(err.message, true)
    }
    setEditSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this photo from the gallery?')) return
    try {
      await api(`/gallery/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${TOKEN()}` },
      })
      flash('Photo deleted')
      load()
    } catch (err) {
      flash(err.message, true)
    }
  }

  const filtered = filterTag === 'all' ? photos : photos.filter(p => p.tag === filterTag)
  const allTags  = ['all', ...new Set([...PRESET_TAGS, ...tags])]

  return (
    <div className="sa-page">
      <Sidebar />
      <div className="sa-content">
        {/* Topbar */}
        <div className="sa-topbar">
          <div>
            <h1><MdPhotoLibrary style={{ verticalAlign: 'middle', marginRight: 8 }} />Gallery Management</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Upload, tag and manage photos shown on the public gallery page</p>
          </div>
          <button className="sa-btn sa-btn-primary" onClick={() => setShowUpload(true)}>
            <MdAdd size={16} /> Add Photo
          </button>
        </div>

        <div className="sa-main">
          {/* Alerts */}
          {error   && <div className="sa-alert sa-alert-error">{error}</div>}
          {success && <div className="sa-alert sa-alert-success">{success}</div>}

          {/* Stats */}
          <div className="gallery-stats">
            <div className="gallery-stat"><span>{photos.length}</span><p>Total Photos</p></div>
            <div className="gallery-stat"><span>{[...new Set(photos.map(p => p.tag))].length}</span><p>Tags</p></div>
            <div className="gallery-stat"><span>{filtered.length}</span><p>Showing</p></div>
          </div>

          {/* Tag Filter */}
          <div className="gallery-filter-row">
            <MdFilterList size={18} style={{ color: '#64748b' }} />
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Filter by Tag:</span>
            <div className="gallery-tag-pills">
              {allTags.map(t => (
                <button
                  key={t}
                  className={`gallery-tag-pill${filterTag === t ? ' active' : ''}`}
                  onClick={() => setFilterTag(t)}
                >
                  {t === 'all' ? '🖼️ All' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="gallery-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="gallery-skeleton" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="sa-empty">
              <MdPhotoLibrary size={48} style={{ opacity: 0.3 }} />
              <p>No photos yet. Click "Add Photo" to upload the first one!</p>
            </div>
          ) : (
            <div className="gallery-grid">
              {filtered.map(photo => (
                <div key={photo.id} className="gallery-item">
                  <div className="gallery-img-wrap" onClick={() => setLightbox(photo)}>
                    <img src={photo.image_url} alt={photo.title || photo.tag} loading="lazy" />
                    <div className="gallery-overlay">
                      <span className="gallery-view-icon">🔍</span>
                    </div>
                  </div>
                  <div className="gallery-item-body">
                    <div className="gallery-item-tag">{photo.tag}</div>
                    <div className="gallery-item-title">{photo.title || '(No title)'}</div>
                    {photo.description && <div className="gallery-item-desc">{photo.description}</div>}
                    <div className="gallery-item-actions">
                      <button className="sa-btn sa-btn-info sa-btn-sm" onClick={() => openEdit(photo)}>
                        <MdEdit size={13} /> Edit
                      </button>
                      <button className="sa-btn sa-btn-danger sa-btn-sm" onClick={() => handleDelete(photo.id)}>
                        <MdDelete size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Upload Modal ── */}
      {showUpload && (
        <div className="sa-modal-backdrop" onClick={() => setShowUpload(false)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>📤 Add New Photo</h2>
              <button className="sa-modal-close" onClick={() => setShowUpload(false)}><MdClose /></button>
            </div>
            <form onSubmit={handleUploadSubmit}>
              {uploadErr && <div className="sa-alert sa-alert-error">{uploadErr}</div>}

              {/* Image Upload */}
              <div className="gallery-upload-zone" onClick={() => fileRef.current.click()}>
                {form.image_url ? (
                  <img src={form.image_url} alt="preview" className="gallery-upload-preview" />
                ) : uploadProgress ? (
                  <div className="gallery-upload-placeholder">
                    <div className="gallery-upload-spinner" />
                    <span>Uploading to Cloudinary...</span>
                  </div>
                ) : (
                  <div className="gallery-upload-placeholder">
                    <MdUpload size={36} />
                    <span>Click to upload image</span>
                    <small>JPG, PNG, WEBP — max 5 MB</small>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
              </div>
              {form.image_url && (
                <div style={{ marginBottom: 8 }}>
                  <input
                    type="url" placeholder="Or paste image URL"
                    value={form.image_url}
                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    className="sa-modal-input"
                  />
                </div>
              )}

              <div className="sa-form-grid">
                <div className="sa-form-group">
                  <label>Title (optional)</label>
                  <input
                    placeholder="e.g. Grand Opening Ceremony"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="sa-form-group">
                  <label>Tag / Subject *</label>
                  <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}>
                    {PRESET_TAGS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="sa-form-group" style={{ marginBottom: 20 }}>
                <label>Description (optional)</label>
                <textarea
                  rows={3} placeholder="A short description..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'vertical', padding: '10px 14px', border: '1.5px solid rgba(64,32,112,0.2)', borderRadius: 8, fontFamily: 'inherit', fontSize: 14 }}
                />
              </div>

              <div className="sa-modal-footer">
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
                <button type="submit" className="sa-btn sa-btn-primary" disabled={uploading || uploadProgress}>
                  {uploading ? 'Saving...' : '📤 Add to Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editPhoto && (
        <div className="sa-modal-backdrop" onClick={() => setEditPhoto(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>✏️ Edit Photo</h2>
              <button className="sa-modal-close" onClick={() => setEditPhoto(null)}><MdClose /></button>
            </div>
            <img src={editPhoto.image_url} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} />
            <form onSubmit={handleEditSave}>
              <div className="sa-form-grid">
                <div className="sa-form-group">
                  <label>Title</label>
                  <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="sa-form-group">
                  <label>Tag / Subject</label>
                  <select value={editForm.tag} onChange={e => setEditForm(f => ({ ...f, tag: e.target.value }))}>
                    {PRESET_TAGS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="sa-form-group" style={{ marginBottom: 20 }}>
                <label>Description</label>
                <textarea
                  rows={3} value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'vertical', padding: '10px 14px', border: '1.5px solid rgba(64,32,112,0.2)', borderRadius: 8, fontFamily: 'inherit', fontSize: 14 }}
                />
              </div>
              <div className="sa-modal-footer">
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setEditPhoto(null)}>Cancel</button>
                <button type="submit" className="sa-btn sa-btn-primary" disabled={editSaving}>
                  {editSaving ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="gallery-lightbox" onClick={() => setLightbox(null)}>
          <button className="gallery-lightbox-close" onClick={() => setLightbox(null)}><MdClose /></button>
          <img src={lightbox.image_url} alt={lightbox.title} onClick={e => e.stopPropagation()} />
          <div className="gallery-lightbox-info">
            <span className="gallery-lightbox-tag">{lightbox.tag}</span>
            {lightbox.title && <h3>{lightbox.title}</h3>}
            {lightbox.description && <p>{lightbox.description}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
