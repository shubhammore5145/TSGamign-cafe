import React from 'react';
import { MapPin, Phone, Mail, Clock, Instagram, MessageCircle, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Contact.css';

const CONTACT_INFO = [
  { icon: MapPin,   label: 'Address',   value: 'TS Gaming Cafe, Waluj, Aurangabad, Maharashtra', link: 'https://maps.google.com/?q=TS+Gaming+Cafe+Waluj+Aurangabad' },
  { icon: Phone,    label: 'Phone',      value: '+91 98765 43210',      link: 'tel:+919876543210' },
  { icon: Mail,     label: 'Email',      value: 'hello@tsgamingcafe.in', link: 'mailto:hello@tsgamingcafe.in' },
  { icon: Clock,    label: 'Hours',      value: 'Open Daily: 5:00 AM – 11:30 PM (Last Booking: 10:30 PM)', link: null },
];

const SOCIAL = [
  { icon: Instagram, label: 'Instagram', handle: '@ts_gaming_cafe_waluj', color: '#e1306c', link: 'https://www.instagram.com/ts_gaming_cafe_waluj' },
  { icon: MessageCircle, label: 'WhatsApp', handle: '+91 98765 43210', color: '#25d366', link: 'https://wa.me/919876543210' },
];

export default function Contact() {
  return (
    <div className="contact-page page-enter">
      <div className="container">
        <div className="contact-header">
          <div className="section-tag"><MapPin size={12} /> Contact</div>
          <h1 className="section-title">Find <span>Us Here</span></h1>
          <p className="section-desc">Visit us, call us, or message us. We're always ready to level up your experience.</p>
        </div>

        <div className="contact-layout">
          {/* Left — Info */}
          <div className="contact-info-col">
            {/* Info cards */}
            <div className="contact-cards">
              {CONTACT_INFO.map(({ icon: Icon, label, value, link }) => (
                <div key={label} className="contact-card glass glass-hover">
                  <div className="contact-card__icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="contact-card__label">{label}</div>
                    {link ? (
                      <a href={link} className="contact-card__value contact-card__value--link">{value}</a>
                    ) : (
                      <div className="contact-card__value">{value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Socials */}
            <div className="glass contact-social">
              <h3 className="contact-social__title">Find Us Online</h3>
              <div className="contact-social__btns">
                {SOCIAL.map(({ icon: Icon, label, handle, color, link }) => (
                  <a
                    key={label}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-social__btn"
                    style={{ '--social-color': color }}
                    id={`contact-${label.toLowerCase()}-btn`}
                  >
                    <div className="contact-social__icon">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="contact-social__platform">{label}</div>
                      <div className="contact-social__handle">{handle}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="contact-ctas">
              <a
                href="https://www.google.com/maps/search/TS+Gaming+Cafe+Waluj+Aurangabad"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                id="contact-directions-btn"
              >
                <Navigation size={16} /> Get Directions
              </a>
              <Link to="/setups" className="btn btn-primary" id="contact-book-btn">
                🎮 Book Now
              </Link>
            </div>
          </div>

          {/* Right — Map + Form */}
          <div className="contact-right-col">
            {/* Map */}
            <div className="contact-map glass">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241316.9938432403!2d72.74109974898816!3d19.08252485!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c6306644edc1%3A0x5da4ed8f8d648c69!2sMumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1695000000000!5m2!1sen!2sin"
                width="100%"
                height="300"
                style={{ border: 0, borderRadius: 'var(--radius-lg)' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="TS Gaming Café Location"
              />
            </div>

            {/* Contact form */}
            <div className="glass contact-form">
              <h3 className="contact-form__title">Send Us a Message</h3>
              <form onSubmit={e => { e.preventDefault(); }} className="contact-form__fields">
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input type="text" placeholder="Shubham Singh" className="form-input" id="contact-name-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" placeholder="gamer@example.com" className="form-input" id="contact-email-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea
                    placeholder="Your message..."
                    className="form-input"
                    rows={4}
                    style={{ resize: 'vertical', minHeight: '100px' }}
                    id="contact-message-input"
                  />
                </div>
                <button type="submit" className="btn btn-primary full-width" id="contact-submit-btn">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
