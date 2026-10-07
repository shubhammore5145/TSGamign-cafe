import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { adminLogout } from './AdminLogin';
import {
  LayoutDashboard, Monitor, Calendar, Users, Trophy,
  LogOut, Gamepad2, Zap, Menu, X, Clock
} from 'lucide-react';
import './Admin.css';

const NAV_LINKS = [
  { to: '/',            label: 'Bookings & Add',    icon: Calendar, end: true },
  { to: '/sessions',     label: 'Live Sessions',     icon: Zap },
  { to: '/timer',        label: 'Big Timer',         icon: Clock },
  { to: '/setups',       label: 'PlayStation Setups',icon: Gamepad2 },
  { to: '/dashboard',    label: 'Dashboard Stats',   icon: LayoutDashboard },
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
            <span className="admin-topbar__title">⚡ Admin Panel</span>
          </div>

          <div className="admin-topbar__user">
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Admin
            </span>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: '#fff',
            }}>
              👑
            </div>
          </div>
        </header>

        {/* Page content rendered by nested routes */}
        <main className="admin-content">
          <Outlet />
        </main>
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
