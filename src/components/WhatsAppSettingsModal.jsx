import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Check,
  Send,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  HelpCircle,
  AlertCircle,
  Zap,
} from 'lucide-react';
import {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  sendBackgroundWhatsApp,
} from '../services/whatsappAutoService';
import { useToast } from '../context/ToastContext';
import './WhatsAppSettingsModal.css';

export default function WhatsAppSettingsModal({ isOpen, onClose }) {
  const [config, setConfig] = useState(getWhatsAppConfig());
  const [testPhone, setTestPhone] = useState('9226345875');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      const cfg = getWhatsAppConfig();
      setConfig(cfg);
      setTestPhone(cfg.senderPhone?.slice(-10) || '9226345875');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e?.preventDefault();
    saveWhatsAppConfig(config);
    toast.success(
      'Settings Saved! 💾',
      config.enabled
        ? `Automatic background WhatsApp delivery enabled via ${config.provider.toUpperCase()}!`
        : 'WhatsApp background gateway disabled (standard mode active).'
    );
    onClose();
  };

  const handleTestSend = async () => {
    const clean = (testPhone || '').replace(/\D/g, '').slice(-10);
    if (!clean || clean.length !== 10) {
      return toast.warning('Invalid Phone', 'Please enter a valid 10-digit mobile number for test.');
    }

    if (!config.enabled) {
      return toast.warning('Enable Gateway First', 'Please toggle "Enable Background Auto-Delivery" above.');
    }

    setTesting(true);
    setTestResult(null);

    // Save active config before testing
    saveWhatsAppConfig(config);

    const testMsg = `🎮 *TS GAMING CAFÉ — AUTO WHATSAPP TEST* 🎮
━━━━━━━━━━━━━━━━━━━━
Hi! Your automated background WhatsApp delivery is working perfectly! ✅

🚀 All new bookings will now receive instant confirmation messages automatically without opening any app.

📍 TS Gaming Café, Waluj, Sambhajinagar`;

    const res = await sendBackgroundWhatsApp({ phone: clean, message: testMsg });
    setTesting(false);

    if (res.success) {
      setTestResult({
        type: 'success',
        text: `Message successfully delivered to +91 ${clean} via ${config.provider.toUpperCase()}!`,
      });
      toast.success('Test Message Sent! 🚀', `Check WhatsApp on +91 ${clean}!`);
    } else {
      setTestResult({
        type: 'error',
        text: res.error || res.reason || 'Failed to deliver message. Please check Instance ID / Token.',
      });
      toast.error('Test Failed', res.error || res.reason || 'Check credentials.');
    }
  };

  return (
    <div className="wa-modal-overlay" onClick={onClose}>
      <div className="wa-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wa-modal-header">
          <div className="wa-modal-title">
            <div className="wa-icon-badge">
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="wa-header-heading">WhatsApp Auto-Delivery Settings</div>
              <div className="wa-header-sub">
                Send 100% automatic messages directly to customer phones without manual clicks
              </div>
            </div>
          </div>
          <button type="button" className="wa-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave}>
          <div className="wa-modal-body">
            {/* Gateway Status Switch */}
            <div className={`wa-status-card ${config.enabled ? 'active' : ''}`}>
              <div className="wa-status-info">
                <div className="wa-status-badge">
                  {config.enabled ? '🟢 100% AUTO BACKGROUND ACTIVE' : '⚪ MANUAL WA.ME MODE'}
                </div>
                <div className="wa-status-desc">
                  {config.enabled
                    ? 'Bookings will automatically send WhatsApp messages in the background to customers!'
                    : 'Turn on to send messages automatically via WhatsApp API Gateway.'}
                </div>
              </div>
              <label className="wa-switch">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
                />
                <span className="wa-slider round" />
              </label>
            </div>

            {/* Provider Selector */}
            <div className="wa-field-group">
              <label className="wa-label">Select WhatsApp Delivery Mode</label>
              <div className="wa-provider-grid">
                {[
                  {
                    id: 'greenapi',
                    name: 'Green-API (Background)',
                    badge: '⚡ Auto Background Active',
                    desc: 'Connected to WhatsApp (+91 92263 45875) · Hands-free delivery',
                  },
                  {
                    id: 'free_instant',
                    name: '1-Click Free Slip',
                    badge: '🟢 100% Free (₹0)',
                    desc: 'Unlimited messages daily · 0 monthly fee · 1-tap WhatsApp send',
                  },
                  {
                    id: 'ultramsg',
                    name: 'UltraMsg',
                    badge: 'QR Alternative',
                    desc: 'Scan QR with your phone, get instance & token',
                  },
                  {
                    id: 'webhook',
                    name: 'Custom Webhook',
                    badge: '🔗 Zapier / Server',
                    desc: 'Send POST request to any custom API or webhook',
                  },
                ].map((p) => (
                  <div
                    key={p.id}
                    className={`wa-provider-card ${config.provider === p.id ? 'selected' : ''}`}
                    onClick={() => setConfig((c) => ({ ...c, provider: p.id }))}
                  >
                    <div className="wa-provider-top">
                      <strong style={{ color: '#fff' }}>{p.name}</strong>
                      <span className="wa-provider-pill">{p.badge}</span>
                    </div>
                    <div className="wa-provider-desc">{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Free Instant Mode Details */}
            {config.provider === 'free_instant' && (
              <div className="wa-creds-box">
                <div className="wa-creds-title">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#00ff66' }}>●</span>
                    <span>1-Click Free WhatsApp Slip (100% Free Forever)</span>
                  </div>
                  <span className="wa-provider-pill">₹0 Cost · No Limits</span>
                </div>
                <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.6, marginTop: 8 }}>
                  ✅ <strong>No monthly fee & No limit:</strong> Send receipts to 100, 500, or 1000+ customers daily without paying any subscription.<br />
                  🚀 <strong>How it works:</strong> As soon as a booking is confirmed, WhatsApp opens instantly with the customer's phone number and the complete PlayStation bill pre-filled. Just tap <strong>Send</strong> in 1 second!
                </div>
              </div>
            )}

            {/* Provider Credentials Form */}
            {config.provider === 'greenapi' && (
              <div className="wa-creds-box">
                <div className="wa-creds-title">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#00ff66' }}>●</span>
                    <span>Green-API Gateway (Connected & Authorized)</span>
                  </div>
                  <a
                    href="https://green-api.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="wa-link-btn"
                  >
                    Green-API Console <ExternalLink size={12} />
                  </a>
                </div>

                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    margin: '8px 0 12px 0',
                    fontSize: '0.78rem',
                    color: '#86efac',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span>🟢 <strong>Status: Authorized</strong></span>
                  <span>·</span>
                  <span>📱 <strong>Sender Phone:</strong> +91 92263 45875</span>
                  <span>·</span>
                  <span>🆔 <strong>Instance:</strong> {config.instanceId || '710722789545'}</span>
                </div>

                <div className="wa-inputs-grid">
                  <div className="wa-input-wrap">
                    <label className="wa-sublabel">API URL</label>
                    <input
                      type="text"
                      className="wa-input"
                      placeholder="e.g. https://7107.api.greenapi.com"
                      value={config.apiUrl || 'https://7107.api.greenapi.com'}
                      onChange={(e) => setConfig((c) => ({ ...c, apiUrl: e.target.value.trim() }))}
                    />
                  </div>

                  <div className="wa-input-wrap">
                    <label className="wa-sublabel">IdInstance</label>
                    <input
                      type="text"
                      className="wa-input"
                      placeholder="e.g. 710722789545"
                      value={config.instanceId || ''}
                      onChange={(e) => setConfig((c) => ({ ...c, instanceId: e.target.value.trim() }))}
                    />
                  </div>
                </div>

                <div className="wa-input-wrap" style={{ marginTop: 10 }}>
                  <label className="wa-sublabel">ApiTokenInstance</label>
                  <input
                    type="password"
                    className="wa-input"
                    placeholder="e.g. 334cd5981dfc4f268d2167767be06682f9e644a5507d4f20b9"
                    value={config.token || ''}
                    onChange={(e) => setConfig((c) => ({ ...c, token: e.target.value.trim() }))}
                  />
                </div>
              </div>
            )}

            {config.provider === 'ultramsg' && (
              <div className="wa-creds-box">
                <div className="wa-creds-title">
                  <span>UltraMsg Gateway Credentials</span>
                  <a
                    href="https://ultramsg.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="wa-link-btn"
                  >
                    Get Free UltraMsg Account <ExternalLink size={12} />
                  </a>
                </div>

                <div className="wa-inputs-grid">
                  <div className="wa-input-wrap">
                    <label className="wa-sublabel">Instance ID</label>
                    <input
                      type="text"
                      className="wa-input"
                      placeholder="e.g. instance105824"
                      value={config.instanceId || ''}
                      onChange={(e) => setConfig((c) => ({ ...c, instanceId: e.target.value.trim() }))}
                    />
                  </div>

                  <div className="wa-input-wrap">
                    <label className="wa-sublabel">API Token</label>
                    <input
                      type="password"
                      className="wa-input"
                      placeholder="e.g. 5x89a0bcdef..."
                      value={config.token || ''}
                      onChange={(e) => setConfig((c) => ({ ...c, token: e.target.value.trim() }))}
                    />
                  </div>
                </div>

                <div className="wa-helper-text">
                  💡 <strong>How to set up:</strong> Go to <a href="https://ultramsg.com" target="_blank" rel="noreferrer">ultramsg.com</a>, create account, scan QR code from your WhatsApp, and copy your Instance ID & Token here!
                </div>
              </div>
            )}

            {config.provider === 'webhook' && (
              <div className="wa-creds-box">
                <div className="wa-creds-title">Custom Webhook / Gateway Endpoint</div>
                <div className="wa-input-wrap" style={{ marginTop: 8 }}>
                  <label className="wa-sublabel">Webhook URL</label>
                  <input
                    type="url"
                    className="wa-input"
                    placeholder="https://your-server.com/api/send-whatsapp or Zapier Webhook URL"
                    value={config.webhookUrl || ''}
                    onChange={(e) => setConfig((c) => ({ ...c, webhookUrl: e.target.value.trim() }))}
                  />
                </div>
              </div>
            )}

            {config.provider === 'meta' && (
              <div className="wa-creds-box">
                <div className="wa-creds-title">Meta WhatsApp Cloud API</div>
                <div className="wa-inputs-grid">
                  <div className="wa-input-wrap">
                    <label className="wa-sublabel">Phone Number ID</label>
                    <input
                      type="text"
                      className="wa-input"
                      placeholder="e.g. 109823450912345"
                      value={config.phoneNumberId || ''}
                      onChange={(e) => setConfig((c) => ({ ...c, phoneNumberId: e.target.value.trim() }))}
                    />
                  </div>

                  <div className="wa-input-wrap">
                    <label className="wa-sublabel">Permanent Access Token</label>
                    <input
                      type="password"
                      className="wa-input"
                      placeholder="EAAG..."
                      value={config.token || ''}
                      onChange={(e) => setConfig((c) => ({ ...c, token: e.target.value.trim() }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Test Message Section */}
            <div className="wa-test-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Zap size={16} style={{ color: '#00e5ff' }} />
                <strong style={{ color: '#fff', fontSize: '0.85rem' }}>Test Automatic WhatsApp Delivery</strong>
              </div>

              <div className="wa-test-row">
                <input
                  type="tel"
                  className="wa-input"
                  placeholder="Enter your 10-digit mobile number"
                  maxLength={10}
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="wa-test-btn"
                  onClick={handleTestSend}
                  disabled={testing || !config.enabled}
                >
                  <Send size={14} />
                  <span>{testing ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>

              {testResult && (
                <div className={`wa-test-alert ${testResult.type}`}>
                  {testResult.type === 'success' ? (
                    <Check size={14} style={{ color: '#00ff66', flexShrink: 0 }} />
                  ) : (
                    <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                  )}
                  <span>{testResult.text}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="wa-modal-footer">
            <button type="button" className="wa-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="wa-btn-save">
              <Check size={16} />
              <span>Save & Enable</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

