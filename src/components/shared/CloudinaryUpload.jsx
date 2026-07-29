import React, { useState, useRef } from 'react'
import { apiUpload } from '../../utils/api'
import { getCurrentToken } from '../../utils/tokenUtils'

/**
 * CloudinaryUpload — reusable file upload component
 *
 * Props:
 *   label    — display label (e.g. "Aadhaar", "PAN Card Image")
 *   icon     — emoji icon
 *   value    — current URL (from parent form state)
 *   folder   — Cloudinary folder (e.g. "moneyspot/leads")
 *   onUpload — (url) => void — called with the uploaded URL
 *   accept   — accepted file types (default: images + PDF)
 */
export default function CloudinaryUpload({
  label,
  icon = '📎',
  value = '',
  folder = 'moneyspot/uploads',
  onUpload,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const fileRef                   = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const data = await apiUpload(`/upload?folder=${encodeURIComponent(folder)}`, file, getCurrentToken())
      onUpload(data.url)
    } catch (err) {
      setError(err.message || 'Upload failed')
    }
    setUploading(false)
    // Reset input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleRemove = () => {
    onUpload('')
    setError('')
  }

  // Determine if the value is an image or PDF
  const isImage = value && /\.(jpg|jpeg|png|webp)$/i.test(value)
  const isPdf   = value && /\.pdf$/i.test(value)

  return (
    <div style={{ marginBottom: 0 }}>
      {/* If a file is already uploaded, show preview */}
      {value ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
          background: '#f0fdf4', borderRadius: 10, border: '1.5px solid #bbf7d0',
        }}>
          {isImage && (
            <a href={value} target="_blank" rel="noopener noreferrer"
              style={{ flexShrink: 0 }}>
              <img src={value} alt={label}
                style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', border: '1px solid #d1d5db' }} />
            </a>
          )}
          {isPdf && (
            <span style={{ fontSize: 28, flexShrink: 0 }}>📄</span>
          )}
          {!isImage && !isPdf && (
            <span style={{ fontSize: 28, flexShrink: 0 }}>✅</span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
              {icon} {label} uploaded
            </div>
            <a href={value} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#6b7280', textDecoration: 'underline', wordBreak: 'break-all' }}>
              View file ↗
            </a>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button type="button" onClick={() => fileRef.current?.click()}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db',
                background: '#fff', color: '#374151', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              🔄 Replace
            </button>
            <button type="button" onClick={handleRemove}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca',
                background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600,
                cursor: 'pointer',
              }}>
              ✕
            </button>
          </div>
          <input ref={fileRef} type="file" accept={accept} onChange={handleFile}
            style={{ display: 'none' }} />
        </div>
      ) : (
        /* No file yet — show upload button */
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              border: '1.5px dashed rgba(64,32,112,0.3)', background: uploading ? '#f3f4f6' : '#faf8ff',
              color: uploading ? '#9ca3af' : '#402070', fontWeight: 600, fontSize: 13,
              cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.2s',
            }}>
            {uploading ? (
              <>
                <span style={{
                  display: 'inline-block', width: 14, height: 14, border: '2px solid #9ca3af',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'cloudinary-spin 0.8s linear infinite',
                }} />
                Uploading...
              </>
            ) : (
              <>☁️ {icon} Upload {label}</>
            )}
          </button>
          <input ref={fileRef} type="file" accept={accept} onChange={handleFile}
            style={{ display: 'none' }} />
        </div>
      )}

      {error && (
        <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4, fontWeight: 600 }}>
          ❌ {error}
        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`
        @keyframes cloudinary-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
