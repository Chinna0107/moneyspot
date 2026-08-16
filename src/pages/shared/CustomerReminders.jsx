import React, { useState, useEffect } from 'react'
import { api } from '../../utils/api'
import { getTokenByRole } from '../../utils/tokenUtils'
import AdminSidebar from '../../components/admin/AdminSidebar'
import Sidebar from '../../components/superadmin/Sidebar'
import EmployeeNavbar from '../../components/employee/EmployeeNavbar'
import { MdChat, MdAccessTime, MdPhone, MdPerson, MdDomain } from 'react-icons/md'

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
    return <EmployeeNavbar />
  }

  const containerClass = role === 'employee' ? 'emp-page' : 'dash-page'
  const contentClass = role === 'employee' ? 'emp-page-content' : 'dash-content'

  const formatDays = (dateStr) => {
    const diffTime = Math.abs(new Date() - new Date(dateStr))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className={containerClass}>
      {renderSidebar()}
      <div className={contentClass}>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #1a0a2e, #402070, #c02040)', 
            borderRadius: '24px', 
            padding: '32px', 
            marginBottom: '24px',
            color: '#fff',
            boxShadow: '0 20px 40px rgba(64,32,112,0.15)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MdAccessTime size={36} color="#d4af37" />
                Customer Reminders
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', maxWidth: '600px', lineHeight: 1.6 }}>
                Reach out to customers who haven't visited us in 35 days or more. Send them a warm, professional WhatsApp reminder to check in and offer our assistance.
              </p>
            </div>
            
            <div style={{ position: 'absolute', top: '-50px', right: '-20px', fontSize: '200px', opacity: 0.05, transform: 'rotate(-15deg)' }}>
              <MdChat />
            </div>
          </div>

          {/* Filters */}
          <div style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '20px', 
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            border: '1px solid #f1f5f9',
            display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Number of Days</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[15, 30, 35, 60, 90].map(d => (
                  <button key={d} onClick={() => setDaysFilter(d)}
                    style={{
                      padding: '6px 14px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                      background: daysFilter === d ? '#402070' : '#f1f5f9',
                      color: daysFilter === d ? '#fff' : '#64748b'
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ width: '1px', height: '40px', background: '#e2e8f0', margin: '0 10px' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Match Condition</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setExactMatch(true)}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                    background: exactMatch ? '#c02040' : '#f1f5f9',
                    color: exactMatch ? '#fff' : '#64748b'
                  }}>
                  Exactly {daysFilter} Days
                </button>
                <button onClick={() => setExactMatch(false)}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                    background: !exactMatch ? '#c02040' : '#f1f5f9',
                    color: !exactMatch ? '#fff' : '#64748b'
                  }}>
                  {daysFilter} or More Days
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '18px', fontWeight: 600 }}>
              Loading reminders...
            </div>
          ) : customers.length === 0 ? (
            <div style={{ 
              background: '#fff', 
              borderRadius: '20px', 
              padding: '60px', 
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              border: '1px solid #f1f5f9'
            }}>
              <MdPerson size={64} color="#cbd5e1" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', color: '#334155', marginBottom: '8px' }}>All caught up!</h3>
              <p style={{ color: '#64748b' }}>There are no customers who haven't visited for {exactMatch ? 'exactly' : 'at least'} {daysFilter} days.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: role === 'employee' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '20px' }}>
              {customers.map(c => (
                <div key={c.id} style={{
                  background: '#fff',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                  border: '1px solid rgba(64,32,112,0.05)',
                  transition: 'transform 0.2s, boxShadow 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(64,32,112,0.08)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.03)'
                }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '48px', height: '48px', 
                          borderRadius: '14px', 
                          background: 'linear-gradient(135deg, rgba(64,32,112,0.1), rgba(192,32,64,0.1))',
                          color: '#402070',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '20px', fontWeight: 800
                        }}>
                          {c.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', color: '#1a0a2e', fontWeight: 800 }}>{c.name}</h3>
                          <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <MdPhone size={14} /> {c.phone}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Last Visited</span>
                        <span style={{ fontSize: '12px', color: '#402070', fontWeight: 800 }}>
                          {new Date(c.last_visited).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Days Absent</span>
                        <span style={{ fontSize: '12px', color: '#c02040', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MdAccessTime /> {formatDays(c.last_visited)} days
                        </span>
                      </div>
                      {c.branch && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Branch</span>
                          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MdDomain /> {c.branch}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleWhatsApp(c)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#25D366',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
                      transition: 'background 0.2s, transform 0.1s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#20bd5a'}
                    onMouseLeave={e => e.currentTarget.style.background = '#25D366'}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
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
  )
}
