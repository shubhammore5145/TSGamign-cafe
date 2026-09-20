import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 5000 }) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (title, message, duration) => addToast({ type: 'success', title, message, duration }),
    error:   (title, message, duration) => addToast({ type: 'error',   title, message, duration }),
    warning: (title, message, duration) => addToast({ type: 'warning', title, message, duration }),
    info:    (title, message, duration) => addToast({ type: 'info',    title, message, duration }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/* ---- Toast Container ---- */
const icons = {
  success: '✅',
  error:   '❌',
  warning: '⚠️',
  info:    'ℹ️',
};

const colors = {
  success: 'var(--color-accent)',
  error:   'var(--color-danger)',
  warning: 'var(--color-warning)',
  info:    'var(--color-secondary)',
};

function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '16px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      width: '100%',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 16px',
            background: 'rgba(10, 11, 16, 0.95)',
            border: `1px solid ${colors[toast.type]}40`,
            borderLeft: `3px solid ${colors[toast.type]}`,
            borderRadius: 'var(--radius-md)',
            backdropFilter: 'blur(20px)',
            boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 20px ${colors[toast.type]}20`,
            cursor: 'pointer',
            animation: 'slide-down 0.3s ease-out',
          }}
        >
          <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '1px' }}>
            {icons[toast.type]}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {toast.title && (
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: colors[toast.type],
                marginBottom: toast.message ? '3px' : 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {toast.title}
              </div>
            )}
            {toast.message && (
              <div style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.4,
              }}>
                {toast.message}
              </div>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); removeToast(toast.id); }}
            style={{
              color: 'var(--color-text-dim)',
              fontSize: '1rem',
              flexShrink: 0,
              lineHeight: 1,
              padding: '2px',
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
