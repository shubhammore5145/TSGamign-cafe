import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { adminLogout, isAdminLoggedIn, isStaffLoggedIn, getStaffUser } from '../../utils/adminAuth';
import {
  LayoutDashboard,
  Calendar,
  Users,
  LogOut,
  Gamepad2,
  Zap,
  Menu,
  X,
  Clock,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  Coffee,
} from 'lucide-react';
import PWAInstallModal from '../../components/PWAInstallModal';
import './Admin.css';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = isAdminLoggedIn();
  const isStaff = isStaffLoggedIn();
  const staffUser = getStaffUser();

  const handleSignOut = () => {
    adminLogout();
    navigate('/login');
  };

  // Role-based Navigation Links (Available to both Admin & Staff!)
  const navLinks = [
    ...(isAdmin
      ? [{ to: '/admin/dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard }]
      : []),
    { to: '/admin/bookings', label: 'Bookings & Slots', shortLabel: 'Slots', icon: Calendar },
    { to: '/admin/sessions', label: 'Live Sessions', shortLabel: 'Live', icon: Zap },
    { to: '/admin/timer', label: 'Big Timer', shortLabel: 'Timer', icon: Clock },
    {
      to: '/admin/food',
      label: isAdmin ? 'Food Sale & Stock' : 'Cafe POS Counter',
      shortLabel: isAdmin ? 'Food Sale' : 'Cafe POS',
      icon: Coffee,
    },
    ...(isAdmin
      ? [
          { to: '/admin/setups', label: 'PlayStation Setups', shortLabel: 'Setups', icon: Gamepad2 },
          { to: '/admin/staff', label: 'Staff Management', shortLabel: 'Staff', icon: Users },
        ]
      : []),
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__logo">
          <img
            src="/images/logo.png"
            alt="TS Gaming Cafe"
            style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: '50%', flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.4))' }}
          />
          <div>
            <div className="admin-sidebar__logo-text">TS Gaming Café</div>
            <div className="admin-sidebar__logo-sub">
              {isAdmin ? 'ADMIN PORTAL' : 'STAFF DUTY DESK'}
            </div>
          </div>
        </div>

        {/* User Identity Chip in Sidebar */}
        <div style={{
          margin: '12px 14px',
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          background: isAdmin ? 'rgba(245, 158, 11, 0.1)' : 'rgba(147, 51, 234, 0.12)',
          border: `1px solid ${isAdmin ? 'rgba(245, 158, 11, 0.25)' : 'rgba(147, 51, 234, 0.25)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: isAdmin ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #9333ea, #06b6d4)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.85rem',
            flexShrink: 0,
          }}>
            {isAdmin ? '👑' : <UserCheck size={16} />}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {isAdmin ? 'Super Admin' : (staffUser?.name || 'Staff')}
            </div>
            <div style={{
              fontSize: '0.68rem',
              color: isAdmin ? '#f59e0b' : 'var(--color-primary-light)',
              fontWeight: 600,
            }}>
              {isAdmin ? 'Full Owner Access' : (staffUser?.role || 'Staff Operator')}
            </div>
          </div>
        </div>

        <nav className="admin-sidebar__nav">
          <div className="admin-sidebar__section-label">
            {isAdmin ? 'Cafe & System Control' : 'Duty Operations'}
          </div>
          {navLinks.map(({ to, label, icon: Icon, end }) => (
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

        <div className="admin-sidebar__footer" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-nav-link"
            style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}
          >
            <ExternalLink size={14} /> View Website
          </a>

          <button
            className="admin-nav-link"
            style={{ color: 'var(--color-danger)' }}
            onClick={handleSignOut}
          >
            <LogOut size={16} /> Sign Out ({isAdmin ? 'Admin' : 'Staff'})
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <button
              className="btn btn-icon btn-ghost admin-mobile-toggle"
              onClick={() => setSidebarOpen((v) => !v)}
              id="admin-sidebar-toggle"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="admin-topbar__title">⚡ TS Gaming</span>
          </div>

          <div className="admin-topbar__user" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* PWA Install Button */}
            <PWAInstallModal />

            {/* Role Chip */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderRadius: 20,
              background: isAdmin ? 'rgba(245, 158, 11, 0.15)' : 'rgba(147, 51, 234, 0.15)',
              border: `1px solid ${isAdmin ? 'rgba(245, 158, 11, 0.3)' : 'rgba(147, 51, 234, 0.3)'}`,
            }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: isAdmin ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #9333ea, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: '#fff',
              }}>
                {isAdmin ? '👑' : '👤'}
              </div>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: isAdmin ? '#f59e0b' : 'var(--color-primary-light)',
              }}>
                {isAdmin ? 'Super Admin' : `${staffUser?.name || 'Staff'}`}
              </span>
            </div>
          </div>
        </header>

        {/* Page content rendered by nested routes */}
        <main className="admin-content">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar (Visible on phones) */}
        <nav className="admin-mobile-bottom-nav">
          {navLinks.map(({ to, shortLabel, icon: Icon, end }) => (
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
