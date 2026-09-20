import React, { useState, useEffect, useCallback } from 'react';
import {
  subscribeToAllActiveSessions,
  subscribeToSetups,
  createSession,
  updateSession,
  updateSetup,
  addNotification,
  tsToDate,
  toFirestoreTimestamp,
} from '../../firebase/firestore';
import { useSessionTimer, formatTime } from '../../hooks/useSessionTimer';
import { useToast } from '../../context/ToastContext';
import { Play, Pause, Square, Plus, AlertTriangle, Camera } from 'lucide-react';
import CameraCapture from '../../components/CameraCapture';

const EXTEND_OPTIONS = [
  { label: '+15 min', ms: 15 * 60 * 1000 },
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
];

export default function AdminSessions() {
  const [sessions, setSessions] = useState([]);
  const [setups, setSetups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newSessionData, setNewSessionData] = useState({ name: '', setupId: '', duration: 60, photoDataUrl: null });
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const unsubs = [
      subscribeToAllActiveSessions(setSessions),
      subscribeToSetups(setSetups),
    ];
    return () => unsubs.forEach(f => f());
  }, []);

  const handleEndSession = async (session) => {
    try {
      await updateSession(session.id, { status: 'completed' });
      await updateSetup(session.setupId, { status: 'available' });
      await addNotification({
        userId: session.userId,
        type: 'session_completed',
        message: `Your session on ${session.setupName} has been ended by admin.`,
      });
      toast.success('Session Ended', `${session.userName}'s session has been completed.`);
    } catch (err) {
      toast.error('Error', err.message);
    }
  };

  const handleExtend = async (session, ms) => {
    try {
      const currentEnd = tsToDate(session.sessionEndTime);
      const newEnd = new Date(currentEnd.getTime() + ms);
      await updateSession(session.id, { sessionEndTime: toFirestoreTimestamp(newEnd) });
      await addNotification({
        userId: session.userId,
        type: 'session_extended',
        message: `Your session on ${session.setupName} has been extended by ${ms / 60000} minutes!`,
      });
      toast.success('Time Extended', `Session extended by ${ms / 60000} minutes.`);
    } catch (err) {
      toast.error('Error', err.message);
    }
  };

  const handlePause = async (session) => {
    try {
      const now = Date.now();
      const endTime = tsToDate(session.sessionEndTime).getTime();
      const startTime = tsToDate(session.sessionStartTime).getTime();
      
      const remainingMs = endTime - now;
      const elapsedMs = now - startTime;

      await updateSession(session.id, { 
        status: 'paused',
        remainingMs,
        elapsedMs,
      });
      toast.info('Session Paused', `${session.userName}'s session is paused.`);
    } catch (err) {
      toast.error('Error', err.message);
    }
  };

  const handleResume = async (session) => {
    try {
      const now = Date.now();
      const newEndTime = new Date(now + session.remainingMs);
      const newStartTime = new Date(now - session.elapsedMs);

      await updateSession(session.id, { 
        status: 'active',
        sessionEndTime: toFirestoreTimestamp(newEndTime),
        sessionStartTime: toFirestoreTimestamp(newStartTime),
      });
      toast.success('Session Resumed', `${session.userName}'s session is active.`);
    } catch (err) {
      toast.error('Error', err.message);
    }
  };

  const handleStartNewSession = async (e) => {
    e.preventDefault();
    if (!newSessionData.name.trim() || !newSessionData.setupId) {
      return toast.error('Validation Error', 'Please enter customer name and select a setup.');
    }
    const setup = setups.find(s => s.id === newSessionData.setupId);
    if (!setup) return;

    setCreating(true);
    try {
      const now = new Date();
      const end = new Date(now.getTime() + newSessionData.duration * 60000);
      
      await createSession({
        userId: 'walk-in',
        userName: newSessionData.name.trim(),
        userImage: newSessionData.photoDataUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newSessionData.name.trim())}&background=9333ea&color=fff`,
        setupId: setup.id,
        setupName: setup.name,
        sessionStartTime: toFirestoreTimestamp(now),
        sessionEndTime: toFirestoreTimestamp(end),
      });

      await updateSetup(setup.id, { status: 'occupied' });
      toast.success('Session Started', `${newSessionData.name} is now playing.`);
      setShowModal(false);
      setNewSessionData({ name: '', setupId: '', duration: 60, photoDataUrl: null });
    } catch (err) {
      toast.error('Failed to start session', err.message);
    } finally {
      setCreating(false);
    }
  };

  const availableSetups = setups.filter(s => s.status === 'available');

  return (
    <div>
      <div className="admin-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <h2 className="admin-section-title">🟢 Live Sessions ({sessions.length})</h2>
          <span className="badge badge-active">REAL-TIME</span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Start Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="glass" style={{ padding: 'var(--space-3xl)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>😴</div>
          <h3>No Active Sessions</h3>
          <p className="text-muted">All gaming setups are currently available.</p>
        </div>
      ) : (
        <div className="admin-sessions-grid">
          {sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onEnd={handleEndSession}
              onExtend={handleExtend}
              onPause={handlePause}
              onResume={handleResume}
            />
          ))}
        </div>
      )}

      {/* Setup status */}
      <div className="glass" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-xl)' }}>
        <h3 className="admin-section-title" style={{ marginBottom: 'var(--space-lg)' }}>All Setups Status</h3>
        <div className="admin-setups-grid">
          {setups.map(s => (
            <div key={s.id} className={`admin-setup-tile admin-setup-tile--${s.status}`}>
              <div className="admin-setup-tile__number">#{String(s.setupNumber || '?').padStart(2, '0')}</div>
              <div className={`status-dot ${s.status === 'available' ? 'green' : s.status === 'occupied' ? 'red' : 'gray'}`} style={{ margin: '4px auto' }} />
              <div className="admin-setup-tile__name">{s.type}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Start Session Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal glass-strong">
            <h2 className="admin-modal-title">Start New Session</h2>
            <form onSubmit={handleStartNewSession} className="admin-modal-form">
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="E.g. Aryan K."
                  value={newSessionData.name}
                  onChange={e => setNewSessionData(d => ({ ...d, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Customer Photo (Optional)</label>
                <CameraCapture onCapture={(url) => setNewSessionData(d => ({ ...d, photoDataUrl: url }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Setup</label>
                <select
                  className="form-input"
                  value={newSessionData.setupId}
                  onChange={e => setNewSessionData(d => ({ ...d, setupId: e.target.value }))}
                >
                  <option value="">-- Select Available Setup --</option>
                  {availableSetups.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (₹{s.pricePerHour}/hr)</option>
                  ))}
                </select>
                {availableSetups.length === 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-warning)', marginTop: 4 }}>
                    No setups currently available!
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Duration</label>
                <select
                  className="form-input"
                  value={newSessionData.duration}
                  onChange={e => setNewSessionData(d => ({ ...d, duration: Number(e.target.value) }))}
                >
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour</option>
                  <option value={120}>2 Hours</option>
                  <option value={180}>3 Hours</option>
                  <option value={240}>4 Hours</option>
                  <option value={300}>5 Hours</option>
                </select>
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating || availableSetups.length === 0}>
                  {creating ? 'Starting...' : 'Start Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function SessionCard({ session, onEnd, onExtend, onPause, onResume }) {
  const { remaining, elapsed } = useSessionTimer(session, null);
  const isEndingSoon = remaining !== null && remaining <= 600_000 && remaining > 0;
  const isPaused = session.status === 'paused';

  return (
    <div className={`admin-session-card glass ${isEndingSoon && !isPaused ? 'neon-border-orange' : ''}`}
      style={{ borderColor: isEndingSoon && !isPaused ? 'var(--color-warning)' : undefined }}>
      <div className="admin-session-card__header">
        <div className="admin-session-card__user">
          <img
            src={session.userImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.userName || 'U')}&background=9333ea&color=fff`}
            alt={session.userName}
            className="admin-session-card__avatar"
            style={{ opacity: isPaused ? 0.5 : 1 }}
          />
          <div>
            <div className="admin-session-card__username">{session.userName}</div>
            <div className="admin-session-card__setup">{session.setupName}</div>
          </div>
        </div>
        {isEndingSoon && !isPaused && <AlertTriangle size={16} color="var(--color-warning)" />}
        {isPaused && <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>PAUSED</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', margin: 'var(--space-sm) 0', textAlign: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginBottom: 2, textTransform: 'uppercase' }}>Time Elapsed</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>
            {formatTime(elapsed)}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginBottom: 2, textTransform: 'uppercase' }}>Time Remaining</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: isEndingSoon ? 'var(--color-warning)' : 'var(--color-accent)' }}>
            {formatTime(remaining)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)', justifyContent: 'center' }}>
        <span>Start: {tsToDate(session.sessionStartTime)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span>·</span>
        <span>End: {tsToDate(session.sessionEndTime)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Extend time */}
      <div className="extend-btns">
        {EXTEND_OPTIONS.map(opt => (
          <button
            key={opt.label}
            className="btn btn-sm btn-ghost"
            onClick={() => onExtend(session, opt.ms)}
            id={`extend-${session.id}-${opt.ms}`}
            style={{ flex: 1 }}
            disabled={isPaused}
          >
            <Plus size={12} /> {opt.label}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
        {isPaused ? (
          <button className="btn btn-sm" style={{ flex: 1, background: 'var(--color-success)', color: '#fff' }} onClick={() => onResume?.(session)}>
            <Play size={12} /> Resume
          </button>
        ) : (
          <button className="btn btn-sm btn-ghost" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }} onClick={() => onPause?.(session)}>
            <Pause size={12} /> Pause
          </button>
        )}
        <button
          className="btn btn-sm btn-danger"
          style={{ flex: 1 }}
          onClick={() => onEnd(session)}
        >
          <Square size={12} /> End
        </button>
      </div>
    </div>
  );
}
