import React, { useState, useEffect } from 'react';
import { subscribeToAllActiveSessions } from '../../firebase/firestore';
import { useSessionTimer, formatTime } from '../../hooks/useSessionTimer';
import { AlertTriangle, Clock } from 'lucide-react';

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-xl)' }}>
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
    <div className={`glass ${isEndingSoon ? 'neon-border-orange' : ''}`} style={{ 
      padding: 'var(--space-2xl)', 
      display: 'flex', 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'flex-start',
      gap: 'var(--space-2xl)',
      borderColor: isEndingSoon ? 'var(--color-warning)' : 'rgba(255, 255, 255, 0.05)',
      borderWidth: isEndingSoon ? '2px' : '1px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Decorative background glow if ending soon */}
      {isEndingSoon && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(circle at right center, rgba(245,158,11,0.15) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />
      )}

      {/* LEFT SIDE: Big Photo */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <img
          src={session.userImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.userName || 'U')}&background=9333ea&color=fff&size=300`}
          alt={session.userName}
          style={{
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: `6px solid ${isEndingSoon ? 'var(--color-warning)' : 'var(--color-surface)'}`,
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            transition: 'border-color 0.3s ease'
          }}
        />
      </div>

      {/* RIGHT SIDE: Info and Timer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 1 }}>
        
        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--space-lg)' }}>
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
        <h3 style={{ 
          fontSize: '3.5rem', 
          fontWeight: 900,
          marginBottom: 'var(--space-xl)',
          background: 'linear-gradient(to right, #fff, var(--color-text-dim))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.1
        }}>
          {session.userName}
        </h3>
        
        {/* Timer Block */}
        <div style={{ 
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.05)',
          padding: 'var(--space-xl) var(--space-2xl)',
          borderRadius: 'var(--radius-lg)',
          display: 'inline-block',
          alignSelf: 'flex-start',
          boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: 3, fontSize: '0.9rem', marginBottom: 12, fontWeight: 600 }}>
            Time Remaining
          </div>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '5rem', 
            fontWeight: 800, 
            lineHeight: 1,
            color: isEndingSoon ? 'var(--color-warning)' : 'var(--color-accent)',
            textShadow: `0 0 25px ${isEndingSoon ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)'}`
          }}>
            {formatTime(remaining)}
          </div>
        </div>

      </div>
    </div>
  );
}
