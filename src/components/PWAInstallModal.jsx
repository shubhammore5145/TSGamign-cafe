import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, CheckCircle, X, Sparkles } from 'lucide-react';

export default function PWAInstallModal() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone (installed) mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Listen for beforeinstallprompt event (Android / Chromium)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowModal(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Native Android / Chromium prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    } else {
      // Show guided instructions for iOS Safari or Chrome menu
      setShowModal(true);
    }
  };

  // If already installed and opened as app, don't show prompt banner
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* ── Topbar / Nav Button ── */}
      <button
        type="button"
        className="pwa-install-nav-btn"
        onClick={handleInstallClick}
        title="Install TS Gaming App on your phone"
      >
        <span className="pwa-pulse-dot" />
        <Download size={14} />
        <span>Install App</span>
      </button>

      {/* ── Mobile Floating Bottom Prompt Banner (visible on mobile if not dismissed) ── */}
      {!bannerDismissed && (
        <div className="pwa-mobile-banner glass-strong">
          <div className="pwa-mobile-banner__left">
            <div className="pwa-mobile-banner__icon">
              <Smartphone size={20} />
            </div>
            <div>
              <div className="pwa-mobile-banner__title">
                📲 Install the app on your phone
              </div>
              <div className="pwa-mobile-banner__sub">
                PlayStation 1-click slot booking app
              </div>
            </div>
          </div>
          <div className="pwa-mobile-banner__actions">
            <button
              type="button"
              className="btn btn-primary btn-sm pwa-install-btn"
              onClick={handleInstallClick}
            >
              Install ⬇
            </button>
            <button
              type="button"
              className="btn btn-icon btn-ghost pwa-close-btn"
              onClick={() => setBannerDismissed(true)}
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Installation Instruction Modal (for iOS or fallback) ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-card glass-strong pwa-guide-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="admin-sidebar__logo-icon" style={{ width: 34, height: 34 }}>
                  <Smartphone size={18} style={{ color: '#22c55e' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                    {isIOS ? '📱 Install the app on iPhone' : '📱 Install the app on your phone'}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    TS Gaming Café Admin Portal
                  </div>
                </div>
              </div>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pwa-guide-steps">
              {isIOS ? (
                /* iOS Safari instructions */
                <>
                  <div className="pwa-step-card">
                    <div className="pwa-step-num">1</div>
                    <div className="pwa-step-content">
                      <div className="pwa-step-title">
                        In Safari, tap the <strong>'Share'</strong> button at the bottom
                      </div>
                      <div className="pwa-step-desc">
                        In iPhone Safari, tap the <strong>Share (⎋)</strong> icon at the bottom.
                      </div>
                    </div>
                  </div>

                  <div className="pwa-step-card">
                    <div className="pwa-step-num">2</div>
                    <div className="pwa-step-content">
                      <div className="pwa-step-title">
                        Choose <strong>'Add to Home Screen' (➕)</strong>
                      </div>
                      <div className="pwa-step-desc">
                        Scroll down and tap <strong>'Add to Home Screen'</strong>.
                      </div>
                    </div>
                  </div>

                  <div className="pwa-step-card">
                    <div className="pwa-step-num">3</div>
                    <div className="pwa-step-content">
                      <div className="pwa-step-title">
                        Tap <strong>'Add'</strong> in the top-right corner
                      </div>
                      <div className="pwa-step-desc">
                        The app will be added to your phone's home screen.
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Android Chrome fallback instructions */
                <>
                  <div className="pwa-step-card">
                    <div className="pwa-step-num">1</div>
                    <div className="pwa-step-content">
                      <div className="pwa-step-title">
                        In Chrome, tap the three-dot menu (⋮)
                      </div>
                      <div className="pwa-step-desc">
                        In Google Chrome, tap the menu <strong>(⋮)</strong> in the top-right corner.
                      </div>
                    </div>
                  </div>

                  <div className="pwa-step-card">
                    <div className="pwa-step-num">2</div>
                    <div className="pwa-step-content">
                      <div className="pwa-step-title">
                        Choose <strong>'Install app'</strong> or <strong>'Add to Home screen'</strong>
                      </div>
                      <div className="pwa-step-desc">
                        The TS Gaming app will be installed on your phone.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', fontWeight: 700 }}
                onClick={() => setShowModal(false)}
              >
                Got it 👍
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
