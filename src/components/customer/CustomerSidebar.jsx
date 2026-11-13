import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  MdDashboard,
  MdCreditCard,
  MdReceiptLong,
  MdMonetizationOn,
  MdBadge,
  MdTrendingUp,
  MdLocalOffer,
  MdNotificationsNone,
  MdSupportAgent,
  MdSecurity,
  MdLogout,
  MdClose,
  MdMenu
} from 'react-icons/md'
import { getCustomerUser, useCustomerLogin } from '../../hooks/useCustomerAuth'
import logoImg from '../../assets/icons png/MS Logo.png'
import nameImg from '../../assets/icons png/Money Spot Logo.png'
import './CustomerSidebar.css'

const nav = [
  { to: '/customer/dashboard',     icon: <MdDashboard />,       label: 'Dashboard' },
  { to: '/customer/services',      icon: <MdCreditCard />,      label: 'Services' },
  { to: '/customer/transactions',  icon: <MdReceiptLong />,     label: 'Transactions' },
  { to: '/customer/coins',         icon: <MdMonetizationOn />,  label: 'MS Coins' },
  { to: '/customer/kyc',           icon: <MdBadge />,           label: 'KYC & Profile' },
  { to: '/customer/cibil',         icon: <MdTrendingUp />,      label: 'CIBIL Score' },
  { to: '/customer/offers',        icon: <MdLocalOffer />,      label: 'Offers & Gifts' },
  { to: '/customer/notifications', icon: <MdNotificationsNone />,label: 'Alerts' },
  { to: '/customer/support',       icon: <MdSupportAgent />,    label: 'Help & Support' },
  { to: '/customer/security',      icon: <MdSecurity />,        label: 'Security' },
]

// Bottom tab bar shows key items for mobile
const bottomTabs = [
  { to: '/customer/dashboard',    icon: <MdDashboard />,      label: 'Home' },
  { to: '/customer/services',     icon: <MdCreditCard />,     label: 'Services' },
  { to: '/customer/transactions', icon: <MdReceiptLong />,    label: 'History' },
  { to: '/customer/coins',        icon: <MdMonetizationOn />, label: 'Coins' },
  { to: '/customer/support',      icon: <MdSupportAgent />,   label: 'Support' },
]

export default function CustomerSidebar() {
  const user = getCustomerUser()
  const { logout } = useCustomerLogin()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login/customer')
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="csb">
        <div className="csb-brand">
          <img src={logoImg} alt="MoneySpot" className="csb-logo" />
          <div>
            <img src={nameImg} alt="MoneySpot" style={{ height: 18, width: 'auto', objectFit: 'contain', display: 'block' }} />
            <div className="csb-brand-sub">Customer Portal</div>
          </div>
        </div>

        <div className="csb-user">
          <div className="csb-avatar">{user?.name?.[0]?.toUpperCase() || 'C'}</div>
          <div>
            <div className="csb-user-name">{user?.name || 'Customer'}</div>
            <div className="csb-user-pan">{user?.pan || ''}</div>
          </div>
        </div>

        <nav className="csb-nav">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `csb-link${isActive ? ' active' : ''}`}>
              <span className="csb-icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="csb-logout" onClick={handleLogout}>
          <MdLogout style={{ fontSize: 18 }} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* ── Mobile top navbar ── */}
      <header className="csb-mobile-header">
        <div className="csb-mobile-brand">
          <img src={logoImg} alt="MoneySpot" className="csb-mobile-logo" />
          <img src={nameImg} alt="MoneySpot" style={{ height: 20, width: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="csb-mobile-user">
          <div className="csb-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
            {user?.name?.[0]?.toUpperCase() || 'C'}
          </div>
          <button className="csb-mobile-menu-btn" onClick={() => setDrawerOpen(true)}>
            <MdMenu style={{ fontSize: 22 }} />
          </button>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="csb-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="csb-drawer" onClick={e => e.stopPropagation()}>
            <div className="csb-drawer-header">
              <div className="csb-user" style={{ margin: 0, borderRadius: 0, background: 'transparent', padding: '16px 18px' }}>
                <div className="csb-avatar">{user?.name?.[0]?.toUpperCase() || 'C'}</div>
                <div>
                  <div className="csb-user-name">{user?.name || 'Customer'}</div>
                  <div className="csb-user-pan">{user?.pan || ''}</div>
                </div>
              </div>
              <button className="csb-drawer-close" onClick={() => setDrawerOpen(false)}>
                <MdClose style={{ fontSize: 20 }} />
              </button>
            </div>
            <nav className="csb-nav" style={{ padding: '8px 12px' }}>
              {nav.map(n => (
                <NavLink key={n.to} to={n.to} onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) => `csb-link${isActive ? ' active' : ''}`}>
                  <span className="csb-icon">{n.icon}</span>
                  <span>{n.label}</span>
                </NavLink>
              ))}
            </nav>
            <button className="csb-logout" onClick={handleLogout}>
              <MdLogout style={{ fontSize: 18 }} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav className="csb-bottom-tabs">
        {bottomTabs.map(n => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `csb-tab${isActive ? ' active' : ''}`}>
            <span className="csb-tab-icon">{n.icon}</span>
            <span className="csb-tab-label">{n.label}</span>
          </NavLink>
        ))}
        <button className="csb-tab" onClick={() => setDrawerOpen(true)}>
          <span className="csb-tab-icon">☰</span>
          <span className="csb-tab-label">More</span>
        </button>
      </nav>
    </>
  )
}
