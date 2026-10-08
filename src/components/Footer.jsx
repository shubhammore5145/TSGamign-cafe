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
              <div className="footer__logo-badge">
                <span className="logo-ts">TS</span>
              </div>
              <div className="footer__logo-info">
                <div className="footer__logo-name">GAMING CAFE</div>
                <div className="footer__logo-tagline">PLAY · COMPETE · BELONG</div>
              </div>
            </Link>
            <p className="footer__desc">
              Aurangabad's ultimate gaming destination featuring PlayStation 2, 3, 4, 5, Sim Racing cockpit, and cafe bites.
            </p>
            <div className="footer__chips">
              <span className="footer__chip">🎮 Next-Gen Consoles</span>
              <span className="footer__chip">🏎️ Sim Cockpit</span>
              <span className="footer__chip">🍕 Food & Drinks</span>
            </div>
          </div>

          {/* ── Quick Links Column ── */}
          <div className="footer__col">
            <h4 className="footer__col-title">Quick Links</h4>
            <div className="footer__links-split">
              <ul className="footer__links">
                <li><a href="#hero" onClick={(e) => { e.preventDefault(); handleScroll('#hero'); }}>Home</a></li>
                <li><Link to="/games">Games</Link></li>
                <li><a href="#pricing" onClick={(e) => { e.preventDefault(); handleScroll('#pricing'); }}>Pricing</a></li>
              </ul>
              <ul className="footer__links">
                <li><a href="#food" onClick={(e) => { e.preventDefault(); handleScroll('#food'); }}>Food & Drinks</a></li>
                <li><Link to="/gallery">Gallery</Link></li>
                <li><a href="#booking" onClick={(e) => { e.preventDefault(); handleScroll('#booking'); }}>Book Session</a></li>
                <li><a href="#location" onClick={(e) => { e.preventDefault(); handleScroll('#location'); }}>Location</a></li>
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
                  <a href="tel:+919876543210" className="footer__phone-link">
                    +91 98765 43210
                  </a>
                </div>
              </li>
              <li>
                <div className="contact-icon-wrapper">
                  <MapPin size={15} />
                </div>
                <div>
                  <span>Waluj, Aurangabad, Maharashtra</span>
                </div>
              </li>
              <li>
                <div className="contact-icon-wrapper">
                  <Clock size={15} />
                </div>
                <div>
                  <div>Open : <strong>5:00 AM - 11:30 PM</strong></div>
                  <div className="footer__last-booking">Last Booking : 10:30 PM</div>
                </div>
              </li>
            </ul>
          </div>

          {/* ── Follow Us & Map Column ── */}
          <div className="footer__col footer__map-col">
            <h4 className="footer__col-title">Follow Us</h4>
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
                  <span className="map-sub">Waluj, Aurangabad</span>
                </div>
              </div>
              <a
                href="https://maps.google.com/?q=TS+Gaming+Cafe+Waluj+Aurangabad"
                target="_blank"
                rel="noopener noreferrer"
                className="footer__directions-btn"
              >
                <span>Get Directions</span>
                <ExternalLink size={14} />
              </a>
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
