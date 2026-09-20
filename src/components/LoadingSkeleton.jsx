import React from 'react';

export default function LoadingSkeleton({ fullPage = true }) {
  if (fullPage) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 60,
            height: 60,
            border: '3px solid var(--color-surface)',
            borderTop: '3px solid var(--color-primary)',
            borderRadius: '50%',
            animation: 'rotate-slow 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: 'var(--color-primary)',
            textTransform: 'uppercase',
          }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <div style={{
        width: 36,
        height: 36,
        border: '2px solid var(--color-surface)',
        borderTop: '2px solid var(--color-primary)',
        borderRadius: '50%',
        animation: 'rotate-slow 0.8s linear infinite',
      }} />
    </div>
  );
}
