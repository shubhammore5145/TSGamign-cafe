import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Clock, Instagram, ExternalLink, Shield } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const handleScroll = (id) => {
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="footer" id="location">
      <div className="footer__top-glow" />

      <div className="container footer__container">
        <div className="footer__grid">
          {/* ── Brand Column ── */}
          <div className="footer__brand-col">
            <Link to="/" className="footer__logo">
              <img src="/images/logo.png" alt="TS Gaming Cafe" className="footer__logo-img" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: '50%', flexShrink: 0, filter: 'drop-shadow(0 0 10px rgba(255, 85, 0, 0.4))' }} />
              <div className="footer__logo-info">
                <div className="footer__logo-name">TS GAMING CAFE</div>
                <div className="footer__logo-tagline">PLAY · COMPETE · BELONG</div>
              </div>
            </Link>
            <p className="footer__desc">
              Waluj, Sambhajinagar's premier gaming destination featuring PlayStation consoles (PS4 Pro & PS2 Classic) and fresh cafe bites.
            </p>
            <div className="footer__chips">
              <span className="footer__chip">🎮 PlayStation Gaming</span>
              <span className="footer__chip">👥 Group Co-op</span>
              <span className="footer__chip">🍕 Food & Drinks</span>
            </div>
          </div>

          {/* ── Quick Links Column ── */}
          <div className="footer__col">
            <h4 className="footer__col-title">Quick Links</h4>
            <div className="footer__links-split">
              <ul className="footer__links">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/games">Games</Link></li>
                <li><Link to="/setups">Setups</Link></li>
              </ul>
              <ul className="footer__links">
                <li><a href="#pricing" onClick={(e) => { e.preventDefault(); handleScroll('#pricing'); }}>Pricing</a></li>
                <li><a href="#food" onClick={(e) => { e.preventDefault(); handleScroll('#food'); }}>Food & Drinks</a></li>
                <li><Link to="/gallery">Gallery</Link></li>
                <li><Link to="/contact">Contact Us</Link></li>
                <li><a href="#booking" onClick={(e) => { e.preventDefault(); handleScroll('#booking'); }}>Book Session</a></li>
              </ul>
            </div>
          </div>

          {/* ── Contact Us Column ── */}
          <div className="footer__col footer__contact-col">
            <h4 className="footer__col-title">Contact Us</h4>
            <ul className="footer__contact-list">
              <li>
                <div className="contact-icon-wrapper">
                  <Phone size={15} />
                </div>
                <div>
                  <a href="tel:+917972430951" className="footer__phone-link">
                    +91 79724 30951
                  </a>
                </div>
              </li>
              <li>
                <div className="contact-icon-wrapper">
                  <MapPin size={15} />
                </div>
                <div>
                  <span>Waluj, Sambhajinagar (Aurangabad), MH</span>
                </div>
              </li>
              <li>
                <div className="contact-icon-wrapper">
                  <Clock size={15} />
                </div>
                <div>
                  <div>Open : <strong>5:00 AM - 10:00 PM</strong></div>
                  <div className="footer__last-booking">Last Booking : 9:00 PM</div>
                </div>
              </li>
            </ul>
          </div>

          {/* ── Follow Us & Map Column ── */}
          <div className="footer__col footer__map-col">
            <h4 className="footer__col-title">Visit & Review</h4>
            <a
              href="https://www.instagram.com/ts_gaming_cafe_waluj"
              target="_blank"
              rel="noopener noreferrer"
              className="footer__ig-badge"
            >
              <div className="ig-icon-box">
                <Instagram size={18} />
              </div>
              <span className="ig-handle">ts_gaming_cafe_waluj</span>
            </a>

            {/* Visual Map Box (from Mockup) */}
            <div className="footer__map-box">
              <div className="footer__map-preview">
                <div className="footer__map-pin">
                  <MapPin size={20} color="#ff3300" />
                </div>
                <div className="footer__map-details">
                  <span className="map-title">TS GAMING CAFE</span>
                  <span className="map-sub">Waluj, Sambhajinagar</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <a
                  href="https://maps.google.com/?q=TS+Gaming+Cafe+Waluj+Aurangabad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer__directions-btn"
                  style={{ flex: 1 }}
                >
                  <span>Directions</span>
                  <ExternalLink size={13} />
                </a>
                <a
                  href="https://maps.google.com/?q=TS+Gaming+Cafe+Waluj+Aurangabad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer__directions-btn"
                  style={{ flex: 1, background: 'rgba(234, 179, 8, 0.15)', borderColor: 'rgba(234, 179, 8, 0.3)', color: '#fbbf24' }}
                >
                  <span>⭐ Review</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer Bottom ── */}
        <div className="footer__bottom">
          <p>© {currentYear} TS Gaming Café. All rights reserved.</p>
          <div className="footer__bottom-links">
            <span>Aurangabad, Maharashtra</span>
            <span className="dot">•</span>
            <Link to="/admin" className="footer__admin-link">
              <Shield size={13} />
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
