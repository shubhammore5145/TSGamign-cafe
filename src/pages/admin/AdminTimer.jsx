import React, { useState, useEffect } from 'react';
import { subscribeToAllActiveSessions } from '../../firebase/firestore';
import { useSessionTimer, formatTime } from '../../hooks/useSessionTimer';
import { AlertTriangle } from 'lucide-react';
import './AdminTimer.css';

export default function AdminTimer() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const unsub = subscribeToAllActiveSessions(setSessions);
    return () => unsub();
  }, []);

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-section-title">⏱️ Big Timer Display</h2>
      </div>

      {sessions.length === 0 ? (
        <div className="glass" style={{ padding: 'var(--space-3xl)', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>🎮</div>
          <h2>No Active Gamers</h2>
          <p className="text-muted">Wait for someone to start a session.</p>
        </div>
      ) : (
        <div className="admin-timer-list">
          {sessions.map(session => (
            <LargeTimerCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

function LargeTimerCard({ session }) {
  const { remaining, elapsed } = useSessionTimer(session, null);
  const isEndingSoon = remaining !== null && remaining <= 600_000 && remaining > 0;

  return (
    <div className={`admin-large-timer-card glass ${isEndingSoon ? 'neon-border-orange' : ''}`}>
      
      {/* Decorative background glow if ending soon */}
      {isEndingSoon && <div className="admin-large-timer-card__glow" />}

      {/* LEFT SIDE: Big Photo */}
      <div className="admin-large-timer-card__photo-wrap">
        <img
          src={session.userImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.userName || 'U')}&background=9333ea&color=fff&size=300`}
          alt={session.userName}
          className={`admin-large-timer-card__photo${isEndingSoon ? ' admin-large-timer-card__photo--ending' : ''}`}
        />
      </div>

      {/* RIGHT SIDE: Info and Timer */}
      <div className="admin-large-timer-card__details">
        
        {/* Badges */}
        <div className="admin-large-timer-card__badges">
          <div className="badge" style={{ 
            background: 'var(--color-primary)', 
            color: '#fff', 
            fontSize: '1rem', 
            padding: '6px 14px',
            fontWeight: 700,
            boxShadow: '0 4px 15px rgba(147, 51, 234, 0.3)'
          }}>
            {session.setupName}
          </div>
          {isEndingSoon && (
            <div className="badge" style={{ 
              background: 'var(--color-warning)', 
              color: '#000', 
              fontWeight: 800,
              fontSize: '1rem',
              padding: '6px 14px',
              animation: 'pulse 2s infinite'
            }}>
              <AlertTriangle size={16} style={{ marginRight: 6 }}/> ENDING SOON
            </div>
          )}
        </div>
        
        {/* User Name */}
        <h3 className="admin-large-timer-card__name">
          {session.userName}
        </h3>
        
        {/* Timer Block */}
        <div className="admin-large-timer-card__timer">
          <div className="admin-large-timer-card__timer-label">
            Time Remaining
          </div>
          <div className={`admin-large-timer-card__time${isEndingSoon ? ' admin-large-timer-card__time--ending' : ''}`}>
            {formatTime(remaining)}
          </div>
        </div>

      </div>
    </div>
  );
}
