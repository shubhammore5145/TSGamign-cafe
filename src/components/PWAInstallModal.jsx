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
                📲 फोनमध्ये App Install करा
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
                    {isIOS ? '📱 iPhone वर App कसे Install करायचे?' : '📱 फोनवर App कसे Install करायचे?'}
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
                        Safari मध्ये खालील <strong>'Share'</strong> बटण दाबा
                      </div>
                      <div className="pwa-step-desc">
                        iPhone च्या Safari ब्राऊझरमध्ये तळाशी असलेले <strong>Share (⎋)</strong> आयकॉन वर टॅप करा.
                      </div>
                    </div>
                  </div>

                  <div className="pwa-step-card">
                    <div className="pwa-step-num">2</div>
                    <div className="pwa-step-content">
                      <div className="pwa-step-title">
                        <strong>'Add to Home Screen' (➕)</strong> निवडा
                      </div>
                      <div className="pwa-step-desc">
                        खाली स्क्रोल करा आणि <strong>'Add to Home Screen'</strong> (किंवा होम स्क्रीनवर जोडा) पर्याय दाबा.
                      </div>
                    </div>
                  </div>

                  <div className="pwa-step-card">
                    <div className="pwa-step-num">3</div>
                    <div className="pwa-step-content">
                      <div className="pwa-step-title">
                        वरच्या उजव्या कोपऱ्यात <strong>'Add'</strong> दाबा
                      </div>
                      <div className="pwa-step-desc">
                        App तुमच्या फोनच्या होम स्क्रीनवर लगेच तयार होईल!
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
                        Chrome मध्ये वरचे 3 ठिपके (⋮) दाबा
                      </div>
                      <div className="pwa-step-desc">
                        Google Chrome ब्राउझरच्या उजव्या बाजूला वर मेनू <strong>(⋮)</strong> वर क्लिक करा.
                      </div>
                    </div>
                  </div>

                  <div className="pwa-step-card">
                    <div className="pwa-step-num">2</div>
                    <div className="pwa-step-content">
                      <div className="pwa-step-title">
                        <strong>'Install app'</strong> किंवा <strong>'Add to Home screen'</strong> निवडा
                      </div>
                      <div className="pwa-step-desc">
                        या पर्यायावर क्लिक करताच TS Gaming App थेट तुमच्या मोबाईलमध्ये ॲप म्हणून सेव्ह होईल!
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
                समजले (Got it) 👍
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
