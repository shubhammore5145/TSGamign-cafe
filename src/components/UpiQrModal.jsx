import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Check, Copy, QrCode, Smartphone, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function UpiQrModal({
  isOpen,
  onClose,
  amount = 0,
  customerName = '',
  purpose = 'Gaming Session',
  onPaidSuccess,
  defaultVpa = '7972430951@upi',
  payeeName = 'TS Gaming Cafe',
}) {
  const toast = useToast();
  const [vpa, setVpa] = useState(defaultVpa);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const validAmount = Number(amount) > 0 ? Number(amount) : '';
  const upiPayload = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(payeeName)}${validAmount ? `&am=${validAmount}` : ''}&cu=INR&tn=${encodeURIComponent(purpose || 'TS Gaming Cafe')}`;

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(vpa);
    setCopied(true);
    toast?.show?.('UPI ID copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#0d121f',
          border: '1px solid rgba(255, 85, 0, 0.35)',
          borderRadius: '18px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 85, 0, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.15), rgba(13, 18, 31, 0))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'rgba(255, 85, 0, 0.2)',
                color: '#ff5500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QrCode size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                UPI Instant Payment
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Scan with PhonePe • GPay • Paytm
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* QR Code Body */}
        <div
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* Customer / Amount Badge */}
          <div
            style={{
              marginBottom: 16,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '10px 16px',
              borderRadius: 12,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Customer / Purpose</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                {customerName ? `${customerName} • ` : ''}{purpose}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#ff5500', fontWeight: 800 }}>AMOUNT DUE</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4ade80' }}>
                ₹{validAmount || 0}
              </div>
            </div>
          </div>

          {/* QR Container */}
          <div
            style={{
              padding: '14px',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              display: 'inline-block',
              margin: '0 auto 16px',
            }}
          >
            <QRCodeSVG
              value={upiPayload}
              size={190}
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Accepted App Badges */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#cbd5e1',
              marginBottom: 14,
            }}
          >
            <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>GPay</span>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(147, 51, 234, 0.15)', color: '#c084fc' }}>PhonePe</span>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>Paytm</span>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>BHIM</span>
          </div>

          {/* VPA Copy Bar */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              fontSize: '0.8rem',
            }}
          >
            <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{vpa}</span>
            <button
              type="button"
              onClick={handleCopyVpa}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                color: copied ? '#4ade80' : '#ff5500',
                fontWeight: 700,
                fontSize: '0.74rem',
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy UPI'}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            gap: 10,
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            style={{ flex: 1, padding: '10px', fontSize: '0.82rem' }}
            onClick={onClose}
          >
            Close
          </button>
          {onPaidSuccess && (
            <button
              type="button"
              className="btn btn-primary"
              style={{
                flex: 1.4,
                padding: '10px',
                fontSize: '0.82rem',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                borderColor: '#16a34a',
                color: '#fff',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onClick={() => {
                onPaidSuccess();
                onClose();
              }}
            >
              <Check size={16} /> Mark as Paid (UPI)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
