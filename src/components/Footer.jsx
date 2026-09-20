import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, MapPin, Phone, Mail, Instagram, Youtube, Clock } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      {/* Glow line */}
      <div className="footer__glow-line" />

      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div className="footer__brand">
            <Link to="/" className="footer__logo">
              <div className="footer__logo-icon">
                <Gamepad2 size={20} />
              </div>
              <div>
                <div className="footer__logo-name">TS Gaming</div>
                <div className="footer__logo-sub">CAFÉ</div>
              </div>
            </Link>
            <p className="footer__tagline">
              Premium gaming experience in the heart of the city. Play, Compete, and Dominate with the best gaming gear.
            </p>
            <div className="footer__socials">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer__social-btn" aria-label="Instagram">
                <Instagram size={18} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="footer__social-btn" aria-label="YouTube">
                <Youtube size={18} />
              </a>
              <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="footer__social-btn footer__social-btn--whatsapp" aria-label="WhatsApp">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer__col">
            <h4 className="footer__col-title">Quick Links</h4>
            <ul className="footer__links">
              {[
                { to: '/setups', label: 'Gaming Setups' },
                { to: '/games', label: 'Games Library' },
                { to: '/tournaments', label: 'Tournaments' },
                { to: '/membership', label: 'Membership' },
                { to: '/gallery', label: 'Gallery' },
                { to: '/contact', label: 'Contact' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="footer__link">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Gaming */}
          <div className="footer__col">
            <h4 className="footer__col-title">Gaming</h4>
            <ul className="footer__links">
              {['RTX Gaming PCs', 'PS5 Consoles', 'VR Experience', 'Racing Simulator', 'Tournaments', 'Leaderboard'].map(item => (
                <li key={item}>
                  <span className="footer__link footer__link--plain">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="footer__col">
            <h4 className="footer__col-title">Contact Us</h4>
            <ul className="footer__contact">
              <li>
                <MapPin size={15} />
                <span>123, Gaming Street, Cyber City, Mumbai — 400001</span>
              </li>
              <li>
                <Phone size={15} />
                <a href="tel:+919876543210">+91 98765 43210</a>
              </li>
              <li>
                <Mail size={15} />
                <a href="mailto:hello@tsgamingcafe.in">hello@tsgamingcafe.in</a>
              </li>
              <li>
                <Clock size={15} />
                <span>Mon–Sun: 10:00 AM – 2:00 AM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__divider" />

        <div className="footer__bottom">
          <p>© {currentYear} TS Gaming Café. All rights reserved.</p>
          <p className="footer__bottom-right">
            Made with ❤️ for gamers • <Link to="/admin/login" className="footer__admin-link">Admin</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
