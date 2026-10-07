import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { adminLogout } from './AdminLogin';
import {
  LayoutDashboard, Monitor, Calendar, Users, Trophy,
  LogOut, Gamepad2, Zap, Menu, X, Clock, Download
} from 'lucide-react';
import PWAInstallModal from '../../components/PWAInstallModal';
import './Admin.css';

const NAV_LINKS = [
  { to: '/',            label: 'Bookings & Add',    shortLabel: 'Slots',     icon: Calendar, end: true },
  { to: '/sessions',     label: 'Live Sessions',     shortLabel: 'Live',      icon: Zap },
  { to: '/timer',        label: 'Big Timer',         shortLabel: 'Timer',     icon: Clock },
  { to: '/setups',       label: 'PlayStation Setups',shortLabel: 'PS Setups', icon: Gamepad2 },
  { to: '/dashboard',    label: 'Dashboard Stats',   shortLabel: 'Stats',     icon: LayoutDashboard },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = () => {
    adminLogout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__logo">
          <div className="admin-sidebar__logo-icon"><Gamepad2 size={18} /></div>
          <div>
            <div className="admin-sidebar__logo-text">TS Gaming Café</div>
            <div className="admin-sidebar__logo-sub">ADMIN PORTAL</div>
          </div>
        </div>

        <nav className="admin-sidebar__nav">
          <div className="admin-sidebar__section-label">Booking & Cafe Control</div>
          {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <button className="admin-nav-link" style={{ color: 'var(--color-danger)' }} onClick={handleSignOut}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <button className="btn btn-icon btn-ghost admin-mobile-toggle" onClick={() => setSidebarOpen(v => !v)} id="admin-sidebar-toggle">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="admin-topbar__title">⚡ TS Gaming</span>
          </div>

          <div className="admin-topbar__user" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* PWA Install Button and Handlers */}
            <PWAInstallModal />

            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: '#fff',
            }} title="Admin logged in">
              👑
            </div>
          </div>
        </header>

        {/* Page content rendered by nested routes */}
        <main className="admin-content">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar (Visible on phones) */}
        <nav className="admin-mobile-bottom-nav">
          {NAV_LINKS.map(({ to, shortLabel, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `admin-mobile-bottom-tab ${isActive ? 'admin-mobile-bottom-tab--active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{shortLabel}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

