import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, Gamepad2 } from 'lucide-react';
import './Admin.css';

// ═══════════════════════════════════════════════════════
// ADMIN PASSWORD — Change this to your own secret password
// ═══════════════════════════════════════════════════════
const ADMIN_PASSWORD = 'TSGaming@2024';

export function isAdminLoggedIn() {
  return sessionStorage.getItem('ts_admin_auth') === 'true';
}

export function adminLogout() {
  sessionStorage.removeItem('ts_admin_auth');
}

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  // If already logged in, redirect
  useEffect(() => {
    if (isAdminLoggedIn()) navigate('/admin', { replace: true });
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('ts_admin_auth', 'true');
        navigate('/admin');
      } else {
        setError('Wrong password. Access denied.');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
      setLoading(false);
    }, 500); // Small delay for realistic feel
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-bg">
        <div className="admin-login-bg__grid" />
        <div className="admin-login-bg__gradient" />
      </div>

      <div className={`admin-login-card glass-strong ${shake ? 'shake-animation' : ''}`}>
        <div className="hud-corner tl" /><div className="hud-corner tr" />
        <div className="hud-corner bl" /><div className="hud-corner br" />

        <div className="admin-login__icon">
          <ShieldCheck size={28} />
        </div>
        <h1 className="admin-login__title">ADMIN ACCESS</h1>
        <p className="admin-login__subtitle">TS Gaming Café Control Panel</p>

        <form onSubmit={handleSubmit} className="admin-login__form">
          <div className="form-group">
            <label className="form-label">ADMIN PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter admin password"
                className="form-input"
                style={{ paddingLeft: '42px', paddingRight: '42px' }}
                required
                autoFocus
                id="admin-password-input"
              />
              <button
                type="button"
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowPw(v => !v)}
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
            id="admin-login-btn"
            style={{ height: 48, marginTop: 8 }}
          >
            {loading
              ? <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'rotate-slow 0.7s linear infinite' }} />
              : <><ShieldCheck size={16} /> Access Admin Panel</>
            }
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
          <a href="/" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', textDecoration: 'none' }}>← Back to Website</a>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: 'var(--space-md)',
          padding: 'var(--space-sm) var(--space-md)',
          background: 'rgba(147, 51, 234, 0.08)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.7rem',
          color: 'var(--color-text-dim)',
          letterSpacing: '0.05em',
        }}>
          <Gamepad2 size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          AUTHORIZED PERSONNEL ONLY
        </div>
      </div>
    </div>
  );
}
