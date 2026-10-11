import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Gamepad2,
  UserCheck,
  KeyRound,
  Phone,
  User,
  Sparkles,
} from 'lucide-react';
import {
  ADMIN_PASSWORD,
  isAdminLoggedIn,
  isStaffLoggedIn,
  isAuthenticated,
  getStaffUser,
  getAuthRole,
  setAdminAuth,
  setStaffAuth,
  adminLogout,
} from '../../utils/adminAuth';
import { subscribeToStaff } from '../../firebase/firestore';
import './Admin.css';

// Re-export for compatibility with other files
export {
  isAdminLoggedIn,
  isStaffLoggedIn,
  isAuthenticated,
  getStaffUser,
  getAuthRole,
  adminLogout,
};

export default function AdminLogin() {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'admin'
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  // Staff login state
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const navigate = useNavigate();

  // If already authenticated, redirect to /admin
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  // Load staff list
  useEffect(() => {
    const unsub = subscribeToStaff((list) => {
      setStaffList(list || []);
      if (list && list.length > 0 && !selectedStaffId) {
        setSelectedStaffId(list[0].id);
      }
    });
    return () => unsub && unsub();
  }, [selectedStaffId]);

  const triggerShake = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  // Handle Admin Submit
  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        setAdminAuth();
        navigate('/admin');
      } else {
        triggerShake('Wrong Admin password. Access denied.');
      }
      setLoading(false);
    }, 400);
  };

  // Handle Staff Submit
  const handleStaffSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      const staffMember = staffList.find((s) => s.id === selectedStaffId);

      if (!staffMember) {
        triggerShake('Please select a staff member.');
        setLoading(false);
        return;
      }

      if (staffMember.status === 'inactive') {
        triggerShake(`Staff account "${staffMember.name}" is deactivated. Contact Admin.`);
        setLoading(false);
        return;
      }

      if (String(staffMember.pin || '').trim() === String(staffPin).trim()) {
        setStaffAuth(staffMember);
        navigate('/admin');
      } else {
        triggerShake('Wrong Security PIN for ' + staffMember.name + '.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-bg">
        <div className="admin-login-bg__grid" />
        <div className="admin-login-bg__gradient" />
      </div>

      <div className={`admin-login-card glass-strong ${shake ? 'shake-animation' : ''}`} style={{ maxWidth: 460 }}>
        <div className="hud-corner tl" /><div className="hud-corner tr" />
        <div className="hud-corner bl" /><div className="hud-corner br" />

        <div className="admin-login__icon" style={{
          background: activeTab === 'admin'
            ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
            : 'linear-gradient(135deg, #9333ea, #06b6d4)',
        }}>
          {activeTab === 'admin' ? <ShieldCheck size={30} /> : <UserCheck size={30} />}
        </div>

        <h1 className="admin-login__title" style={{ fontSize: '1.6rem', letterSpacing: '0.15em' }}>
          {activeTab === 'admin' ? 'ADMIN ACCESS' : 'STAFF LOGIN'}
        </h1>
        <p className="admin-login__subtitle" style={{ marginBottom: 'var(--space-md)' }}>
          {activeTab === 'admin' ? 'TS Gaming Café Owner Portal' : 'TS Gaming Café Duty Desk'}
        </p>

        {/* Login Type Switcher Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.05)',
          padding: 4,
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-lg)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => { setActiveTab('staff'); setError(''); }}
            style={{
              background: activeTab === 'staff' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'staff' ? '#fff' : 'var(--color-text-dim)',
              boxShadow: activeTab === 'staff' ? '0 0 12px rgba(147,51,234,0.5)' : 'none',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
            }}
          >
            <UserCheck size={14} /> 👤 Staff Login
          </button>

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => { setActiveTab('admin'); setError(''); }}
            style={{
              background: activeTab === 'admin' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: activeTab === 'admin' ? '#fff' : 'var(--color-text-dim)',
              boxShadow: activeTab === 'admin' ? '0 0 12px rgba(245,158,11,0.5)' : 'none',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
            }}
          >
            <ShieldCheck size={14} /> 👑 Owner / Admin
          </button>
        </div>

        {/* ─── STAFF LOGIN FORM ─── */}
        {activeTab === 'staff' && (
          <form onSubmit={handleStaffSubmit} className="admin-login__form">
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={13} style={{ color: 'var(--color-primary)' }} />
                SELECT YOUR NAME (कर्मचारी निवडा)
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => { setSelectedStaffId(e.target.value); setError(''); }}
                className="form-input"
                style={{
                  height: 44,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  background: 'rgba(20, 24, 38, 0.95)',
                  cursor: 'pointer',
                }}
                required
              >
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} — {staff.role || 'Staff'} ({staff.shift || 'Shift'})
                  </option>
                ))}
                {staffList.length === 0 && (
                  <option value="">No staff members found</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <KeyRound size={13} style={{ color: 'var(--color-primary)' }} />
                  STAFF SECURITY PIN
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                  (Default PIN: 1234 or 2024)
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-dim)',
                  }}
                />
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  value={staffPin}
                  onChange={(e) => { setStaffPin(e.target.value); setError(''); }}
                  placeholder="Enter 4-digit PIN"
                  className="form-input"
                  style={{
                    paddingLeft: '42px',
                    paddingRight: '42px',
                    letterSpacing: showPin ? 'normal' : '0.25em',
                    fontWeight: 700,
                  }}
                  required
                  autoFocus
                  maxLength={10}
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-dim)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowPin((v) => !v)}
                >
                  {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                color: 'var(--color-error)',
                fontSize: '0.8rem',
                textAlign: 'center',
                padding: '8px 12px',
                background: 'rgba(239,68,68,0.1)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                🔒 {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary full-width"
              disabled={loading || staffList.length === 0}
              style={{ height: 48, marginTop: 4 }}
            >
              {loading ? (
                <div style={{
                  width: 20,
                  height: 20,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%',
                  animation: 'rotate-slow 0.7s linear infinite',
                }} />
              ) : (
                <>
                  <UserCheck size={16} /> Login as Staff
                </>
              )}
            </button>
          </form>
        )}

        {/* ─── ADMIN LOGIN FORM ─── */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="admin-login__form">
            <div className="form-group">
              <label className="form-label">SUPER ADMIN PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-dim)',
                  }}
                />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter super admin password"
                  className="form-input"
                  style={{ paddingLeft: '42px', paddingRight: '42px' }}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-dim)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                color: 'var(--color-error)',
                fontSize: '0.8rem',
                textAlign: 'center',
                padding: '8px 12px',
                background: 'rgba(239,68,68,0.1)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                🔒 {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary full-width"
              disabled={loading}
              style={{
                height: 48,
                marginTop: 4,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderColor: '#f59e0b',
              }}
            >
              {loading ? (
                <div style={{
                  width: 20,
                  height: 20,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%',
                  animation: 'rotate-slow 0.7s linear infinite',
                }} />
              ) : (
                <>
                  <ShieldCheck size={16} /> Access Admin Portal
                </>
              )}
            </button>
          </form>
        )}

        <div style={{
          textAlign: 'center',
          marginTop: 'var(--space-md)',
          padding: 'var(--space-xs) var(--space-md)',
          background: 'rgba(147, 51, 234, 0.08)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          color: 'var(--color-text-dim)',
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}>
          <Sparkles size={12} style={{ color: 'var(--color-secondary)' }} />
          <span>TS GAMING CAFÉ • AUTHORIZED ACCESS ONLY</span>
        </div>
      </div>
    </div>
  );
}
