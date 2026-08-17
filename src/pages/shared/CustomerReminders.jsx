import React, { useState, useEffect } from 'react'
import { api } from '../../utils/api'
import { getTokenByRole } from '../../utils/tokenUtils'
import AdminSidebar from '../../components/admin/AdminSidebar'
import Sidebar from '../../components/superadmin/Sidebar'
import EmployeeSidebar from '../../components/employee/EmployeeSidebar'
import { MdChat, MdAccessTime, MdPhone, MdPerson, MdDomain } from 'react-icons/md'
import './CustomerReminders.css'

export default function CustomerReminders({ role }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [daysFilter, setDaysFilter] = useState(35)
  const [exactMatch, setExactMatch] = useState(true)

  useEffect(() => {
    const fetchReminders = async () => {
      setLoading(true)
      try {
        const token = getTokenByRole(role)
        const data = await api(`/customers/reminders?days=${daysFilter}&exact=${exactMatch}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setCustomers(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message || 'Failed to fetch customer reminders')
      } finally {
        setLoading(false)
      }
    }
    fetchReminders()
  }, [role, daysFilter, exactMatch])

  const handleWhatsApp = (customer) => {
    const phone = customer.phone?.replace(/\D/g, '')
    if (!phone) {
      alert('No valid phone number for this customer.')
      return
    }

    const message = `Hi ${customer.name}, we noticed it's been a while since your last visit to MoneySpot. We value your relationship and wanted to check in! Let us know if you need any assistance with our financial services today. Have a great day! ✨\n\nWebsite: www.moneyspotfintech.com\nContact: +91 9866440477 \nBest, Team MoneySpot`

    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const renderSidebar = () => {
    if (role === 'superadmin') return <Sidebar />
    if (role === 'admin') return <AdminSidebar />
    return <EmployeeSidebar />
  }

  let containerClass = 'dash-page'
  let contentClass = 'dash-content'
  
  if (role === 'superadmin') {
    containerClass = 'sa-page'
    contentClass = 'sa-content'
  } else if (role === 'employee') {
    containerClass = 'dash-page'
    contentClass = 'dash-content'
  }

  const formatDays = (dateStr) => {
    const diffTime = Math.abs(new Date() - new Date(dateStr))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className={containerClass}>
      {renderSidebar()}
      <div className={contentClass} style={{ padding: 0, minHeight: 0 }}>
        <div className="reminders-page-wrapper">
          <div className="reminders-orb reminders-orb1" />
          <div className="reminders-orb reminders-orb2" />

          <div className="reminders-content">
            {/* Header */}
            <div className="reminders-header">
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h1>
                  <MdAccessTime size={36} color="#d4af37" />
                  Customer Reminders
                </h1>
                <p>
                  Reach out to customers who haven't visited us in 35 days or more. Send them a warm, professional WhatsApp reminder to check in and offer our assistance.
                </p>
              </div>
              <MdChat className="reminders-header-icon" />
            </div>

            {/* Filters */}
            <div className="reminders-filters">
              <div className="reminders-filter-group">
                <label className="reminders-filter-label">Number of Days</label>
                <div className="reminders-filter-options">
                  {[15, 30, 35, 60, 90].map(d => (
                    <button key={d} onClick={() => setDaysFilter(d)}
                      className={`reminders-filter-btn ${daysFilter === d ? 'active' : ''}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="reminders-filter-divider"></div>

              <div className="reminders-filter-group">
                <label className="reminders-filter-label">Match Condition</label>
                <div className="reminders-filter-options">
                  <button onClick={() => setExactMatch(true)}
                    className={`reminders-filter-btn ${exactMatch ? 'active' : ''}`}>
                    Exactly {daysFilter} Days
                  </button>
                  <button onClick={() => setExactMatch(false)}
                    className={`reminders-filter-btn ${!exactMatch ? 'active' : ''}`}>
                    {daysFilter} or More Days
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="reminders-error">
                ❌ {error}
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.6)', fontSize: '18px', fontWeight: 600 }}>
                Loading reminders...
              </div>
            ) : customers.length === 0 ? (
              <div className="reminders-empty">
                <MdPerson size={64} color="rgba(255,255,255,0.2)" />
                <h3>All caught up!</h3>
                <p>There are no customers who haven't visited for {exactMatch ? 'exactly' : 'at least'} {daysFilter} days.</p>
              </div>
            ) : (
              <div className={`reminders-grid ${role}`}>
                {customers.map(c => (
                  <div key={c.id} className="reminder-card">
                    <div>
                      <div className="reminder-card-header">
                        <div className="reminder-avatar">
                          {c.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <h3 className="reminder-name">{c.name}</h3>
                          <div className="reminder-phone">
                            <MdPhone size={14} /> {c.phone}
                          </div>
                        </div>
                      </div>

                      <div className="reminder-stats">
                        <div className="reminder-stat-row">
                          <span className="reminder-stat-label">Last Visited</span>
                          <span className="reminder-stat-val">
                            {new Date(c.last_visited).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="reminder-stat-row">
                          <span className="reminder-stat-label">Days Absent</span>
                          <span className="reminder-stat-val highlight">
                            <MdAccessTime size={16}/> {formatDays(c.last_visited)} days
                          </span>
                        </div>
                        {c.branch && (
                          <div className="reminder-stat-row">
                            <span className="reminder-stat-label">Branch</span>
                            <span className="reminder-stat-val branch">
                              <MdDomain size={16}/> {c.branch}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleWhatsApp(c)}
                      className="reminder-wa-btn"
                    >
                      <MdChat size={18} />
                      Send WhatsApp Reminder
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
