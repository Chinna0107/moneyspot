import React, { useRef, useState } from 'react'
import { getTokenByRole } from '../utils/tokenUtils'

const getToken = () =>
  getTokenByRole('admin') || getTokenByRole('superadmin') || getTokenByRole('employee')

export default function CloudinaryUpload({ label, icon = '📎', value, onChange, folder = 'misc', accept = 'image/*,.pdf' }) {
  const inputRef             = useRef()
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/upload?folder=${folder}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onChange(data.url)
    } catch (err) {
      setError(err.message)
    }
    setUploading(false)
    e.target.value = ''
  }

  return (
    <div className="dash-form-group">
      <label>{icon} {label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="url"
          placeholder="Upload a file or paste URL"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={() => inputRef.current.click()}
          disabled={uploading}
          style={{ padding: '0 14px', height: 38, background: uploading ? '#94a3b8' : 'linear-gradient(135deg,#402070,#c02040)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: uploading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          {uploading ? '⏳...' : '☁️ Upload'}
        </button>
        <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleFile} />
      </div>
      {error && <span style={{ fontSize: 11, color: '#dc2626' }}>{error}</span>}
      {value && !uploading && (
        <a href={value} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: '#402070', fontWeight: 700, marginTop: 2, display: 'inline-block' }}>
          🔗 View uploaded file
        </a>
      )}
    </div>
  )
}
