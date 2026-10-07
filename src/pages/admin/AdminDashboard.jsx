import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeToAllActiveSessions,
  subscribeToSetups,
  subscribeToAllBookings,
} from '../../firebase/firestore';
import { Gamepad2, Calendar, Zap, CheckCircle, DollarSign, Users, TrendingUp } from 'lucide-react';
import { useSessionTimer, formatTime } from '../../hooks/useSessionTimer';

export default function AdminDashboard() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [setups, setSetups] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const unsubs = [
      subscribeToAllActiveSessions(setActiveSessions),
      subscribeToSetups(setSetups),
      subscribeToAllBookings(setBookings),
    ];
    return () => unsubs.forEach(f => f());
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === todayStr);
  const todayRevenue = todayBookings.reduce((a, b) => a + (b.totalAmount || 0), 0);
  const monthRevenue = bookings.filter(b => b.date?.startsWith(new Date().toISOString().slice(0, 7)))
                               .reduce((a, b) => a + (b.totalAmount || 0), 0);

  const availableSetups  = setups.filter(s => s.status === 'available').length;
  const occupiedSetups   = setups.filter(s => s.status === 'occupied').length;
  const maintenanceSetups = setups.filter(s => s.status === 'maintenance').length;

  const kpis = [
    { icon: Calendar,  label: "Today's Bookings", value: todayBookings.length,  color: 'var(--color-primary)',   bg: 'var(--color-primary-dim)' },
    { icon: Zap,       label: 'Active Sessions',   value: activeSessions.length, color: 'var(--color-accent)',    bg: 'var(--color-accent-dim)' },
    { icon: Gamepad2,  label: 'Available Consoles',value: availableSetups,       color: 'var(--color-secondary)', bg: 'var(--color-secondary-dim)' },
    { icon: DollarSign,label: "Today's Revenue",   value: `₹${todayRevenue}`,    color: 'var(--color-warning)',   bg: 'rgba(245,158,11,0.15)' },
    { icon: Gamepad2,  label: 'In-Play Consoles',  value: occupiedSetups,         color: 'var(--color-danger)',    bg: 'var(--color-danger-dim)' },
    { icon: TrendingUp,label: 'Monthly Revenue',   value: `₹${monthRevenue}`,    color: 'var(--color-primary)',   bg: 'var(--color-primary-dim)' },
    { icon: Users,     label: 'Total Bookings',    value: bookings.length,        color: 'var(--color-secondary)', bg: 'var(--color-secondary-dim)' },
    { icon: CheckCircle,label: 'In Maintenance',  value: maintenanceSetups,      color: 'var(--color-text-dim)',  bg: 'rgba(100,116,139,0.15)' },
  ];

  const recentBookings = bookings.slice(0, 10);

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Dashboard Overview</h2>
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* KPI Grid */}
      <div className="admin-kpi-grid">
        {kpis.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="admin-kpi-card glass">
            <div className="admin-kpi-card__icon" style={{ background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div className="admin-kpi-card__value" style={{ color }}>{value}</div>
            <div className="admin-kpi-card__label">{label}</div>
          </div>
        ))}
      </div>

      {/* Live Setup Overview */}
      <div className="glass" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <div className="admin-section-header">
          <h3 className="admin-section-title">PlayStation Consoles Status (PS2 / PS3 / PS4 / PS5)</h3>
          <Link to="/setups" className="btn btn-sm btn-ghost">Manage Consoles →</Link>
        </div>
        <div className="admin-setups-grid">
          {setups.map(setup => (
            <div
              key={setup.id}
              className={`admin-setup-tile admin-setup-tile--${setup.status}`}
              title={`${setup.name} — ${setup.status}`}
            >
              <div className="admin-setup-tile__number">#{String(setup.setupNumber || '?').padStart(2, '0')}</div>
              <div className={`status-dot ${setup.status === 'available' ? 'green' : setup.status === 'occupied' ? 'red' : 'gray'}`} style={{ margin: '4px auto' }} />
              <div className="admin-setup-tile__name">{setup.type || 'PS'}</div>
            </div>
          ))}
          {setups.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
              No PlayStation setups found. <Link to="/setups">Add Consoles →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Active Sessions Preview */}
      {activeSessions.length > 0 && (
        <div className="glass" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
          <div className="admin-section-header">
            <h3 className="admin-section-title">🟢 Active Sessions ({activeSessions.length})</h3>
            <Link to="/admin/sessions" className="btn btn-sm btn-ghost">View All →</Link>
          </div>
          <div className="admin-sessions-grid">
            {activeSessions.slice(0, 3).map(session => (
              <MiniSessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      <div className="glass">
        <div className="admin-section-header" style={{ padding: 'var(--space-lg) var(--space-lg) 0' }}>
          <h3 className="admin-section-title">Recent Bookings</h3>
          <Link to="/admin/bookings" className="btn btn-sm btn-ghost">View All →</Link>
        </div>
        <div className="admin-table-wrap" style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-md)' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>User</th>
                <th>Setup</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map(b => (
                <tr key={b.id}>
                  <td style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', color: 'var(--color-primary)' }}>
                    {b.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td style={{ fontWeight: 600 }}>{b.userName}</td>
                  <td>{b.setupName}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{b.date}</td>
                  <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>₹{b.totalAmount}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status?.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentBookings.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>
              No bookings yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniSessionCard({ session }) {
  const { remaining } = useSessionTimer(session, null);
  return (
    <div className="admin-session-card glass">
      <div className="admin-session-card__user">
        <img
          src={session.userImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.userName || 'U')}&background=9333ea&color=fff`}
          alt={session.userName}
          className="admin-session-card__avatar"
          style={{ width: 32, height: 32 }}
        />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{session.userName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{session.setupName}</div>
        </div>
      </div>
      <div className="admin-session-card__timer" style={{ fontSize: '1.4rem' }}>
        {formatTime(remaining)}
      </div>
    </div>
  );
}
