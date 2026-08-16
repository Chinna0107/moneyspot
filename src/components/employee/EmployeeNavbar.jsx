import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  MdDashboard, MdPeople, MdPersonAdd,
  MdMiscellaneousServices, MdPerson, MdLogout, MdBarChart, MdLeaderboard,
  MdExpandMore, MdClose, MdMenu
} from 'react-icons/md'
import { useRoleBasedAuth } from '../../hooks/useRoleBasedAuth'
import { getUserByRole, getTokenByRole } from '../../utils/tokenUtils'
import { api } from '../../utils/api'
import NotificationBell from '../NotificationBell'
import nameImg from '../../assets/icons png/Money Spot Logo.png'
import logoImg from '../../assets/icons png/MS Logo.png'
import '../../pages/dashboard.css'

const PRIMARY_LIMIT = 5 // max links shown in navbar before "More"

export default function EmployeeNavbar() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const { logout }   = useRoleBasedAuth()
  const [user, setUser]         = useState(getUserByRole('employee') || getUserByRole('admin'))
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const moreRef = useRef(null)

  // Always fetch fresh permissions from server
  useEffect(() => {
    const role  = user?.is_admin ? 'admin' : 'employee'
    const token = getTokenByRole(role) || getTokenByRole('employee')
    if (!token) return
    api('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(data => {
        if (data?.permissions) {
          const stored = localStorage.getItem(`${role}_auth`)
          if (stored) {
            const parsed = JSON.parse(stored)
            parsed.user = { ...parsed.user, permissions: data.permissions }
            localStorage.setItem(`${role}_auth`, JSON.stringify(parsed))
            setUser(prev => ({ ...prev, permissions: data.permissions }))
          }
        }
      })
      .catch(() => {})
  }, [])

  // Close "More" dropdown on outside click
  useEffect(() => {
    const handler = e => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const features = user?.permissions?.features || []
  const allLinks = [
    { to: '/employee/dashboard',     icon: <MdDashboard />,             label: 'Dashboard' },
    { to: '/employee/services',      icon: <MdMiscellaneousServices />, label: 'New Transaction' },
    { to: '/employee/customer-info', icon: <MdPeople />,                label: 'Customers' },
    { to: '/employee/add-customer',  icon: <MdPersonAdd />,             label: 'Add Customer' },
    { to: '/employee/leads',         icon: <MdLeaderboard />,           label: '🎯 Leads' },
    { to: '/employee/reports',       icon: <MdBarChart />,              label: 'Reports' },
    { to: '/employee/due-dates',     icon: <MdLeaderboard />,           label: '📅 Due Dates' },
  ]
  if (features.includes('Attendance'))          allLinks.push({ to: '/employee/branch-attendance',   icon: <MdBarChart />, label: 'Attendance' })
  if (features.includes('All Transactions'))    allLinks.push({ to: '/employee/branch-transactions', icon: <MdBarChart />, label: 'Branch Txns' })
  if (features.includes('Expenses Management')) allLinks.push({ to: '/employee/branch-expenses',     icon: <MdBarChart />, label: 'Expenses' })
  if (features.includes('Customer Requests'))   allLinks.push({ to: '/employee/branch-requests',     icon: <MdPeople />,   label: 'Requests' })
  if (features.includes('Pending Payments'))    allLinks.push({ to: '/employee/pending-payments',    icon: <MdBarChart />, label: 'Pending Payments' })
  if (features.includes('Customer Reminders'))  allLinks.push({ to: '/employee/customer-reminders',  icon: <MdPeople />,   label: 'Reminders' })
  allLinks.push({ to: '/employee/profile', icon: <MdPerson />, label: 'Profile' })

  const primaryLinks = allLinks.slice(0, PRIMARY_LIMIT)
  const moreLinks    = allLinks.slice(PRIMARY_LIMIT)
  const hasMore      = moreLinks.length > 0
  const moreActive   = moreLinks.some(l => l.to === pathname)

  const handleLogout = async () => {
    try {
      const token = getTokenByRole('employee')
      await api('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    } catch (_) {}
    logout('employee')
    navigate('/login/employee')
  }

  return (
    <nav className="emp-navbar">
      {/* Brand */}
      <div className="emp-navbar-brand">
        <img src={logoImg} alt="MoneySpot" style={{ height: 32, width: 32, objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(192,32,64,0.5))' }} />
        <img src={nameImg} alt="MoneySpot" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
        <span>Employee Portal</span>
      </div>

      {/* Desktop Links */}
      <div className="emp-navbar-links" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {primaryLinks.map(l => (
          <Link key={l.to} to={l.to} className={`emp-nav-link ${pathname === l.to ? 'active' : ''}`}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{l.icon} {l.label}</span>
          </Link>
        ))}

        {/* More dropdown */}
        {hasMore && (
          <div ref={moreRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMoreOpen(v => !v)}
              className={`emp-nav-link ${moreActive ? 'active' : ''}`}
              style={{
                background: moreOpen
                  ? 'rgba(255,255,255,0.22)'
                  : 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 14px', borderRadius: 8,
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 0.3,
                backdropFilter: 'blur(4px)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)' }}
              onMouseLeave={e => {
                e.currentTarget.style.background = moreOpen ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'
              }}
            >
              More <MdExpandMore style={{ transition: 'transform 0.2s', transform: moreOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
            </button>

            {moreOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: '#fff', borderRadius: 14,
                boxShadow: '0 16px 48px rgba(0,0,0,0.18)', minWidth: 200,
                padding: '8px', zIndex: 999,
                border: '1px solid rgba(64,32,112,0.1)',
                animation: 'fadeSlideDown 0.15s ease'
              }}>
                {moreLinks.map(l => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMoreOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 10, textDecoration: 'none',
                      fontSize: 13, fontWeight: 600,
                      color: pathname === l.to ? '#402070' : '#374151',
                      background: pathname === l.to ? 'rgba(64,32,112,0.08)' : 'transparent',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { if (pathname !== l.to) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#402070' }}}
                    onMouseLeave={e => { if (pathname !== l.to) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151' }}}
                  >
                    <span style={{ fontSize: 16, opacity: 0.8 }}>{l.icon}</span>
                    {l.label}
                    {pathname === l.to && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#402070' }} />}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="emp-navbar-user">
        <span className="emp-user-name" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <MdPerson size={16} /> {user?.name || 'Employee'}
        </span>
        <NotificationBell role="employee" />
        <button className="emp-logout-btn" onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <MdLogout size={14} /> Logout
        </button>
      </div>
    </nav>
  )
}
