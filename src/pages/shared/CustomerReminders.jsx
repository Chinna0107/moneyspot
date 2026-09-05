import React, { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../utils/api'
import { getTokenByRole } from '../../utils/tokenUtils'
import AdminSidebar from '../../components/admin/AdminSidebar'
import Sidebar from '../../components/superadmin/Sidebar'
import EmployeeSidebar from '../../components/employee/EmployeeSidebar'
import { MdChat, MdAccessTime, MdPhone, MdDomain, MdPerson, MdRefresh, MdContentCopy, MdCheckCircle, MdWarning, MdError, MdNotifications, MdFilterList, MdTrendingUp, MdGroups } from 'react-icons/md'
import { FaWhatsapp } from 'react-icons/fa'
import CustomerHeader from '../../components/shared/CustomerHeader'
import CustomerFilterPanel from '../../components/shared/CustomerFilterPanel'
import './CustomerReminders.css'

// Urgency level based on days absent
function getUrgency(days) {
  if (days >= 90) return { level: 'critical', label: 'CRITICAL', color: '#ff1744', bg: 'rgba(255,23,68,0.15)', border: 'rgba(255,23,68,0.4)', icon: <MdError size={14} /> }
  if (days >= 60) return { level: 'high', label: 'HIGH RISK', color: '#ff6d00', bg: 'rgba(255,109,0,0.15)', border: 'rgba(255,109,0,0.4)', icon: <MdWarning size={14} /> }
  if (days >= 35) return { level: 'medium', label: 'FOLLOW-UP', color: '#ffd600', bg: 'rgba(255,214,0,0.12)', border: 'rgba(255,214,0,0.3)', icon: <MdNotifications size={14} /> }
  return { level: 'low', label: 'REMIND', color: '#69f0ae', bg: 'rgba(105,240,174,0.12)', border: 'rgba(105,240,174,0.3)', icon: <MdNotifications size={14} /> }
}

// Animated counter hook
function AnimatedCount({ target, duration = 900 }) {
  const [count, setCount] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return <span>{count}</span>
}

export default function CustomerReminders({ role }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [daysFilter, setDaysFilter] = useState(35)
  const [exactMatch, setExactMatch] = useState(false)
  const [panelFilteredCustomers, setPanelFilteredCustomers] = useState([])
  const [copiedId, setCopiedId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchReminders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const token = getTokenByRole(role)
      const data = await api(`/customers/reminders?days=${daysFilter}&exact=${exactMatch}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const results = Array.isArray(data) ? data : []
      setCustomers(results)
      setPanelFilteredCustomers(results)
    } catch (err) {
      setError(err.message || 'Failed to fetch customer reminders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [role, daysFilter, exactMatch])

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  const handleWhatsApp = (customer) => {
    const phone = customer.phone?.replace(/\D/g, '')
    if (!phone) { alert('No valid phone number for this customer.'); return }
    const days = formatDays(customer.last_visited)
    const message = `Hi ${customer.name} 👋,\n\nWe noticed it's been *${days} days* since your last visit to *MoneySpot*. We truly value your relationship with us and wanted to personally reach out!\n\nWhether you need help with financial services, have any questions, or simply want to catch up — we're here for you. 😊\n\n🌐 www.moneyspotfintech.com\n📞 +91 9866440477\n\nWarm regards,\n*Team MoneySpot* ✨`
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleCopyPhone = (customer) => {
    navigator.clipboard.writeText(customer.phone || '').then(() => {
      setCopiedId(customer.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const renderSidebar = () => {
    if (role === 'superadmin') return <Sidebar />
    if (role === 'admin') return <AdminSidebar />
    return <EmployeeSidebar />
  }

  let containerClass = 'dash-page'
  let contentClass = 'dash-content'
  if (role === 'superadmin') { containerClass = 'sa-page'; contentClass = 'sa-content' }

  const formatDays = (dateStr) => {
    if (!dateStr) return 0
    return Math.floor(Math.abs(new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const criticalCount = customers.filter(c => formatDays(c.last_visited) >= 90).length
  const highRiskCount = customers.filter(c => { const d = formatDays(c.last_visited); return d >= 60 && d < 90 }).length
  const followUpCount = customers.filter(c => { const d = formatDays(c.last_visited); return d >= 35 && d < 60 }).length
  const avgDays = customers.length > 0 ? Math.round(customers.reduce((sum, c) => sum + formatDays(c.last_visited), 0) / customers.length) : 0

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className={containerClass}>
      {renderSidebar()}
      <div className={contentClass} style={{ padding: 0, minHeight: 0 }}>
        <div className="reminders-page-wrapper">
          <div className="reminders-orb reminders-orb1" />
          <div className="reminders-orb reminders-orb2" />
          <div className="reminders-orb reminders-orb3" />

          <div className="reminders-content">

            {/* ── Header ── */}
            <div className="reminders-header">
              <div className="reminders-header-eyebrow">
                <MdNotifications size={12} /> CUSTOMER REMINDERS
              </div>
              <div className="reminders-header-row">
                <div>
                  <h1 className="reminders-title">
                    <span className="reminders-title-icon"><MdAccessTime /></span>
                    Re-engage Customers
                  </h1>
                  <p className="reminders-subtitle">
                    Reach out to customers who haven't visited recently. Send personalised WhatsApp reminders to bring them back.
                  </p>
                </div>
                <button
                  className={`reminders-refresh-btn${refreshing ? ' spinning' : ''}`}
                  onClick={() => fetchReminders(true)}
                  title="Refresh data"
                >
                  <MdRefresh size={22} />
                </button>
              </div>

              {!loading && customers.length > 0 && (
                <div className="reminders-stats-row">
                  <div className="rstat-pill total">
                    <div className="rstat-icon"><MdGroups size={20} /></div>
                    <div>
                      <div className="rstat-num"><AnimatedCount target={customers.length} /></div>
                      <div className="rstat-label">Total</div>
                    </div>
                  </div>
                  <div className="rstat-pill critical">
                    <div className="rstat-icon"><MdError size={20} /></div>
                    <div>
                      <div className="rstat-num"><AnimatedCount target={criticalCount} /></div>
                      <div className="rstat-label">Critical (90d+)</div>
                    </div>
                  </div>
                  <div className="rstat-pill high">
                    <div className="rstat-icon"><MdWarning size={20} /></div>
                    <div>
                      <div className="rstat-num"><AnimatedCount target={highRiskCount} /></div>
                      <div className="rstat-label">High Risk</div>
                    </div>
                  </div>
                  <div className="rstat-pill followup">
                    <div className="rstat-icon"><MdTrendingUp size={20} /></div>
                    <div>
                      <div className="rstat-num"><AnimatedCount target={followUpCount} /></div>
                      <div className="rstat-label">Follow-Up</div>
                    </div>
                  </div>
                  <div className="rstat-pill avg">
                    <div className="rstat-icon"><MdAccessTime size={20} /></div>
                    <div>
                      <div className="rstat-num"><AnimatedCount target={avgDays} /><span className="rstat-unit">d</span></div>
                      <div className="rstat-label">Avg. Absent</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Filters Bar ── */}
            <div className="reminders-filters-card">
              <div className="reminders-filter-section">
                <div className="reminders-filter-label">
                  <MdAccessTime size={13} /> Days Since Last Visit
                </div>
                <div className="reminders-filter-options">
                  {[15, 30, 35, 60, 90].map(d => (
                    <button key={d} onClick={() => setDaysFilter(d)}
                      className={`reminders-filter-btn${daysFilter === d ? ' active' : ''}`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="reminders-filter-divider" />

              <div className="reminders-filter-section">
                <div className="reminders-filter-label">
                  <MdFilterList size={13} /> Match Mode
                </div>
                <div className="reminders-filter-options">
                  <button onClick={() => setExactMatch(true)}
                    className={`reminders-filter-btn${exactMatch ? ' active' : ''}`}>
                    Exactly {daysFilter}d
                  </button>
                  <button onClick={() => setExactMatch(false)}
                    className={`reminders-filter-btn${!exactMatch ? ' active' : ''}`}>
                    {daysFilter}d or more
                  </button>
                </div>
              </div>

              {!loading && (
                <div className="reminders-result-count">
                  <span className="result-dot" />
                  {panelFilteredCustomers.length} customer{panelFilteredCustomers.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Advanced Filters */}
            <div className="reminders-adv-filter">
              <CustomerFilterPanel
                customers={customers}
                onFilterChange={setPanelFilteredCustomers}
                isEmployee={role === 'employee'}
              />
            </div>

            {error && (
              <div className="reminders-error">
                <MdError size={20} /> {error}
              </div>
            )}

            {loading ? (
              <div className="reminders-loading">
                <div className="reminders-spinner" />
                <p>Fetching customer reminders…</p>
              </div>
            ) : panelFilteredCustomers.length === 0 ? (
              <div className="reminders-empty">
                <div className="reminders-empty-emoji">🎉</div>
                <h3>All Caught Up!</h3>
                <p>No customers match the selected filters right now.<br />Try adjusting the day range or match mode.</p>
              </div>
            ) : (
              <div className={`reminders-grid role-${role}`}>
                {panelFilteredCustomers.map((c, idx) => {
                  const days = formatDays(c.last_visited)
                  const urgency = getUrgency(days)
                  const isCopied = copiedId === c.id
                  const services = Array.isArray(c.services_used) ? c.services_used.filter(Boolean) : []

                  return (
                    <div
                      key={c.id}
                      className={`reminder-card urgency-${urgency.level}`}
                      style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
                    >
                      {/* Top urgency color strip */}
                      <div className="reminder-urgency-bar" style={{ background: `linear-gradient(90deg, ${urgency.color}, ${urgency.color}88)` }} />

                      <div className="reminder-card-inner">
                        {/* Avatar + Header */}
                        <div className="reminder-card-top">
                          <div className="reminder-avatar" style={{
                            background: `linear-gradient(135deg, ${urgency.color}28, ${urgency.color}0a)`,
                            borderColor: `${urgency.color}55`,
                            color: urgency.color
                          }}>
                            {getInitials(c.name)}
                          </div>
                          <div className="reminder-header-info">
                            <CustomerHeader customer={c} dark={true} />
                          </div>
                        </div>

                        {/* Contact */}
                        <div className="reminder-contact-row">
                          <span className="reminder-contact-chip">
                            <MdPhone size={12} /> {c.phone || '—'}
                          </span>
                          {c.branch && (
                            <span className="reminder-contact-chip accent">
                              <MdDomain size={12} /> {c.branch}
                            </span>
                          )}
                        </div>

                        {/* Service tags */}
                        {services.length > 0 && (
                          <div className="reminder-services-row">
                            {services.slice(0, 3).map(s => (
                              <span key={s} className="reminder-svc-tag">{s}</span>
                            ))}
                            {services.length > 3 && (
                              <span className="reminder-svc-tag more">+{services.length - 3} more</span>
                            )}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="reminder-stats-strip">
                          <div className="rss-item">
                            <span className="rss-label">Last Visited</span>
                            <span className="rss-val">{formatDate(c.last_visited)}</span>
                          </div>
                          <div className="rss-divider" />
                          <div className="rss-item center">
                            <span className="rss-label">Days Absent</span>
                            <span className="rss-val days" style={{ color: urgency.color }}>
                              {days}<small>d</small>
                            </span>
                          </div>
                          <div className="rss-divider" />
                          <div className="rss-item">
                            <span className="rss-label">Urgency</span>
                            <span className="rss-badge" style={{ color: urgency.color, background: urgency.bg, border: `1px solid ${urgency.border}` }}>
                              {urgency.icon}{urgency.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="reminder-action-row">
                        <button
                          className={`reminder-copy-btn${isCopied ? ' copied' : ''}`}
                          onClick={() => handleCopyPhone(c)}
                          title="Copy phone"
                        >
                          {isCopied ? <MdCheckCircle size={15} /> : <MdContentCopy size={15} />}
                          {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <button className="reminder-wa-btn" onClick={() => handleWhatsApp(c)}>
                          <FaWhatsapp size={17} />
                          WhatsApp Reminder
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
