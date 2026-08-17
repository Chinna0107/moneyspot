import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  MdDashboard, MdPeople, MdPersonAdd,
  MdMiscellaneousServices, MdPerson, MdLogout, MdBarChart, MdLeaderboard,
  MdInbox, MdAssessment
} from 'react-icons/md'
import { useRoleBasedAuth } from '../../hooks/useRoleBasedAuth'
import { getUserByRole, getTokenByRole } from '../../utils/tokenUtils'
import { api } from '../../utils/api'
import NotificationBell from '../NotificationBell'
import logoImg from '../../assets/icons png/MS Logo.png'
import nameImg from '../../assets/icons png/Money Spot Logo.png'
import '../../pages/dashboard.css'

export default function EmployeeSidebar() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const { logout }   = useRoleBasedAuth()
  const [user, setUser] = useState(getUserByRole('employee') || getUserByRole('admin'))

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

  const features = user?.permissions?.features || []

  // Construct dynamic navigation structure
  const NAV = [
    { group: 'Overview',
      items: [
        { to: '/employee/dashboard',     icon: <MdDashboard />,             label: 'Dashboard' },
        { to: '/employee/services',      icon: <MdMiscellaneousServices />, label: 'New Transaction' },
      ]},
    { group: 'Customers',
      items: [
        { to: '/employee/customer-info', icon: <MdPeople />,                label: 'Customers' },
        { to: '/employee/add-customer',  icon: <MdPersonAdd />,             label: 'Add Customer' },
      ]},
    { group: 'Sales & Tracking',
      items: [
        { to: '/employee/leads',         icon: <MdLeaderboard />,           label: '🎯 Leads' },
        { to: '/employee/due-dates',     icon: <MdLeaderboard />,           label: '📅 Due Dates' },
      ]},
  ]

  const branchItems = []
  if (features.includes('Attendance'))          branchItems.push({ to: '/employee/branch-attendance',   icon: <MdBarChart />, label: 'Attendance' })
  if (features.includes('All Transactions'))    branchItems.push({ to: '/employee/branch-transactions', icon: <MdBarChart />, label: 'Branch Txns' })
  if (features.includes('Expenses Management')) branchItems.push({ to: '/employee/branch-expenses',     icon: <MdBarChart />, label: 'Expenses' })
  if (features.includes('Customer Requests'))   branchItems.push({ to: '/employee/branch-requests',     icon: <MdInbox />,    label: 'Requests' })
  if (features.includes('Pending Payments'))    branchItems.push({ to: '/employee/pending-payments',    icon: <MdAssessment />, label: 'Pending Payments' })
  if (features.includes('Customer Reminders'))  branchItems.push({ to: '/employee/customer-reminders',  icon: <MdPeople />,   label: 'Reminders' })
  
  if (branchItems.length > 0) {
    NAV.push({ group: 'Branch Features', items: branchItems })
  }

  NAV.push({
    group: 'Settings',
    items: [
      { to: '/employee/reports',       icon: <MdBarChart />,              label: 'Reports' },
      { to: '/employee/profile',       icon: <MdPerson />,                label: 'Profile' }
    ]
  })

  const handleLogout = async () => {
    try {
      const token = getTokenByRole('employee')
      await api('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    } catch (_) {}
    logout('employee')
    navigate('/login/employee')
  }

  return (
    <aside className="adm-sidebar" style={{ width: 220, overflowY: 'auto' }}>
      <div className="adm-sidebar-brand">
        <img src={logoImg} alt="MoneySpot" className="adm-brand-logo" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <img src={nameImg} alt="MoneySpot" className="adm-brand-name" />
          <span className="adm-brand-role">Employee Portal</span>
        </div>
      </div>

      <nav className="adm-sidebar-nav" style={{ gap: 0 }}>
        {NAV.map((group) => (
          <div key={group.group}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.2, padding: '14px 14px 4px' }}>
              {group.group}
            </div>
            {group.items.map(item => (
              <Link key={item.to} to={item.to}
                className={`adm-nav-link ${pathname === item.to ? 'active' : ''}`}>
                <span className="adm-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="adm-sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)', paddingLeft: 4 }}>
            <MdPerson /> {user?.name || 'Employee'}
          </div>
          <NotificationBell role="employee" />
        </div>
        <button className="adm-logout-btn" onClick={handleLogout}>
          <MdLogout /> Logout
        </button>
      </div>
    </aside>
  )
}
