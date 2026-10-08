import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Calendar, Phone, Instagram, Shield } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (target) => {
    setMobileOpen(false);
    if (target.startsWith('#')) {
      if (location.pathname !== '/') {
        navigate('/' + target);
      } else {
        const el = document.querySelector(target);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  const navItems = [
    { label: 'Home', target: '#hero', to: '/' },
    { label: 'Games', target: '#stations', to: '/games' },
    { label: 'Pricing', target: '#pricing' },
    { label: 'Food & Drinks', target: '#food' },
    { label: 'Gallery', to: '/gallery' },
    { label: 'Location', target: '#location' },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        {/* ── Brand Logo (Matching Mockup) ── */}
        <Link to="/" className="navbar__logo" onClick={() => handleNavClick('#hero')}>
          <div className="navbar__logo-badge">
            <span className="logo-ts">TS</span>
          </div>
          <div className="navbar__logo-info">
            <div className="navbar__logo-name">GAMING CAFE</div>
            <div className="navbar__logo-tagline">PLAY · COMPETE · BELONG</div>
          </div>
        </Link>

        {/* ── Desktop Navigation Links ── */}
        <ul className="navbar__menu">
          {navItems.map((item) => {
            const isHome = location.pathname === '/';
            return (
              <li key={item.label}>
                {item.target ? (
                  <a
                    href={item.target}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.target);
                    }}
                    className={`navbar__menu-link ${
                      item.label === 'Home' && isHome ? 'navbar__menu-link--active' : ''
                    }`}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`navbar__menu-link ${
                      location.pathname === item.to ? 'navbar__menu-link--active' : ''
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {/* ── Right Actions ── */}
        <div className="navbar__right">
          {/* Book Now Button */}
          <button
            onClick={() => handleNavClick('#booking')}
            className="navbar__book-btn"
            id="nav-book-now-btn"
          >
            <Calendar size={16} />
            <span>Book Now</span>
          </button>

          {/* Contact Phone */}
          <a
            href="tel:+919876543210"
            className="navbar__contact-link"
            title="Call TS Gaming Cafe"
          >
            <span className="navbar__contact-icon">
              <Phone size={14} />
            </span>
            <span className="navbar__contact-num">+91 98765 43210</span>
          </a>

          {/* Instagram Button */}
          <a
            href="https://www.instagram.com/ts_gaming_cafe_waluj"
            target="_blank"
            rel="noopener noreferrer"
            className="navbar__social-btn instagram"
            aria-label="Follow TS Gaming Cafe on Instagram"
            title="@ts_gaming_cafe_waluj"
          >
            <Instagram size={18} />
          </a>

          {/* Discreet Admin Portal Link */}
          <Link
            to="/admin"
            className="navbar__admin-icon"
            title="Admin Login"
            aria-label="Admin Portal"
          >
            <Shield size={16} />
          </Link>

          {/* Mobile Hamburger */}
          <button
            className="navbar__hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown Menu ── */}
      {mobileOpen && (
        <div className="navbar__mobile-drawer">
          <ul className="navbar__mobile-list">
            {navItems.map((item) => (
              <li key={item.label}>
                {item.target ? (
                  <a
                    href={item.target}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.target);
                    }}
                    className="navbar__mobile-link"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className="navbar__mobile-link"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className="navbar__mobile-actions">
            <button
              onClick={() => handleNavClick('#booking')}
              className="navbar__book-btn navbar__book-btn--full"
            >
              <Calendar size={16} />
              <span>Book Now</span>
            </button>
            <a href="tel:+919876543210" className="navbar__mobile-phone">
              <Phone size={15} /> +91 98765 43210
            </a>
            <div className="navbar__mobile-bottom-row">
              <a
                href="https://www.instagram.com/ts_gaming_cafe_waluj"
                target="_blank"
                rel="noopener noreferrer"
                className="navbar__mobile-ig"
              >
                <Instagram size={16} /> Instagram (@ts_gaming_cafe_waluj)
              </a>
              <Link to="/admin" className="navbar__mobile-admin" onClick={() => setMobileOpen(false)}>
                <Shield size={14} /> Admin
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
