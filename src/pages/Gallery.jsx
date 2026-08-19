import React, { useState, useEffect } from 'react'
import { MdPhotoLibrary, MdClose } from 'react-icons/md'
import { api } from '../utils/api'
import './superadmin/Gallery.css'
import './Gallery.css'

export default function Gallery() {
  const [photos, setPhotos]       = useState([])
  const [tags, setTags]           = useState([])
  const [filterTag, setFilterTag] = useState('all')
  const [loading, setLoading]     = useState(true)
  const [lightbox, setLightbox]   = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          api('/gallery'),
          api('/gallery/tags'),
        ])
        setPhotos(pRes.photos || [])
        setTags(tRes.tags || [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filterTag === 'all' ? photos : photos.filter(p => p.tag === filterTag)

  // Close lightbox on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      {/* Hero */}
      <section className="pub-gallery-hero">
        <div className="pub-gallery-hero-inner">
          <h1>Our <span>Gallery</span></h1>
          <p>A glimpse into the MoneySpot family — events, milestones, and everyday moments that make us who we are.</p>
        </div>
      </section>

      {/* Body */}
      <div className="pub-gallery-body">
        {/* Tag Filter */}
        {tags.length > 0 && (
          <div className="pub-gallery-filter">
            <span className="pub-gallery-filter-label">Filter by Subject:</span>
            {['all', ...tags].map(t => (
              <button
                key={t}
                className={`gallery-tag-pill${filterTag === t ? ' active' : ''}`}
                onClick={() => setFilterTag(t)}
              >
                {t === 'all' ? '🖼️ All Photos' : t}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="pub-gallery-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="gallery-skeleton" style={{ height: `${180 + (i % 3) * 60}px`, marginBottom: 16, display: 'block' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="pub-gallery-empty">
            <MdPhotoLibrary size={60} />
            <h3>No photos yet</h3>
            <p>Check back soon — we're adding more!</p>
          </div>
        ) : (
          <div className="pub-gallery-grid">
            {filtered.map((photo, i) => (
              <div key={photo.id} className="pub-gallery-card" style={{ animationDelay: `${i * 0.04}s` }} onClick={() => setLightbox(photo)}>
                <img src={photo.image_url} alt={photo.title || photo.tag} loading="lazy" />
                <div className="pub-gallery-card-overlay">
                  <div className="pub-gallery-card-tag">{photo.tag}</div>
                  {photo.title && <div className="pub-gallery-card-title">{photo.title}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Count */}
        {!loading && filtered.length > 0 && (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 32 }}>
            Showing {filtered.length} photo{filtered.length !== 1 ? 's' : ''}
            {filterTag !== 'all' ? ` tagged "${filterTag}"` : ''}
          </p>
        )}
      </div>

      {/* Lightbox */}
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
    </>
  )
}
