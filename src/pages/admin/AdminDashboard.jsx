import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeToAllActiveSessions,
  subscribeToSetups,
  subscribeToAllBookings,
  subscribeToStaff,
} from '../../firebase/firestore';
import { Gamepad2, Calendar, Zap, CheckCircle, DollarSign, Users, TrendingUp, ShieldAlert, UserCheck } from 'lucide-react';
import { useSessionTimer, formatTime } from '../../hooks/useSessionTimer';
import { isAdminLoggedIn } from '../../utils/adminAuth';
import { calculateAllStaffSummary } from '../../utils/staffStats';

export default function AdminDashboard() {
  const isAdmin = isAdminLoggedIn();
  const [activeSessions, setActiveSessions] = useState([]);
  const [setups, setSetups] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubs = [
      subscribeToAllActiveSessions(setActiveSessions),
      subscribeToSetups(setSetups),
      subscribeToAllBookings(setBookings),
      subscribeToStaff(setStaffList),
    ];
    return () => unsubs.forEach(f => f());
  }, [isAdmin]);

  const { summary: staffDailySummary, totals: staffDailyTotals } = useMemo(() => {
    return calculateAllStaffSummary(staffList, bookings);
  }, [staffList, bookings]);

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: 'var(--space-2xl)', textAlign: 'center' }} className="glass">
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)',
          color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto var(--space-md)'
        }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ color: '#fff', marginBottom: 'var(--space-sm)' }}>Access Restricted</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)', fontSize: '0.9rem' }}>
          Revenue & cafe financial analytics are only accessible by Super Admin.
        </p>
        <Link to="/admin" className="btn btn-primary">
          ← Back to Bookings & Slots
        </Link>
      </div>
    );
  }

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

      {/* Staff Collection Breakdown */}
      <div className="glass" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <div className="admin-section-header">
          <div>
            <h3 className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck size={18} style={{ color: 'var(--color-primary)' }} />
              Staff Collection Breakdown Today (आजचा स्टाफनिहाय हिशोब)
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              कोणत्या स्टाफने किती बुकिंग्स घेतल्या व किती रक्कम गोळा केली
            </span>
          </div>
          <Link to="/admin/staff" className="btn btn-sm btn-ghost">Full Staff Report →</Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-md)',
          marginTop: 'var(--space-sm)',
        }}>
          {staffDailySummary.map(({ staff, todayCount, todayCash, todayUpi, todayCollection }) => (
            <div
              key={staff.id}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.75rem'
                  }}>
                    {(staff.name || 'S')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{staff.name}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>{staff.role}</div>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.7rem', padding: '2px 6px', borderRadius: 6,
                  background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700,
                }}>
                  {todayCount} Bookings
                </span>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>एकूण जमा:</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
                  ₹{todayCollection}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                <span>💵 Cash: <strong style={{ color: '#f59e0b' }}>₹{todayCash}</strong></span>
                <span>📱 UPI: <strong style={{ color: 'var(--color-accent)' }}>₹{todayUpi}</strong></span>
              </div>
            </div>
          ))}

          {staffDailySummary.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-md)' }}>
              No staff members registered. <Link to="/admin/staff">Add Staff →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Live Setup Overview */}
      <div className="glass" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <div className="admin-section-header">
          <h3 className="admin-section-title">PlayStation Consoles Status (PS2 / PS3 / PS4 / PS5)</h3>
          <Link to="/admin/setups" className="btn btn-sm btn-ghost">Manage Consoles →</Link>
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
              No PlayStation setups found. <Link to="/admin/setups">Add Consoles →</Link>
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
