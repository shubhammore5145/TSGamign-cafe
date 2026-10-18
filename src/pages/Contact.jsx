import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Instagram, MessageCircle, Navigation, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import './Contact.css';

const CONTACT_INFO = [
  { icon: MapPin,   label: 'Address',   value: 'TS Gaming Cafe, Waluj, Aurangabad, Maharashtra', link: 'https://maps.google.com/?q=TS+Gaming+Cafe+Waluj+Aurangabad' },
  { icon: Phone,    label: 'Phone',      value: '+91 79724 30951',      link: 'tel:+917972430951' },
  { icon: Mail,     label: 'Email',      value: 'hello@tsgamingcafe.in', link: 'mailto:hello@tsgamingcafe.in' },
  { icon: Clock,    label: 'Hours',      value: 'Open Daily: 5:00 AM – 10:00 PM (Last Booking: 9:00 PM)', link: null },
];

const SOCIAL = [
  { icon: Instagram, label: 'Instagram', handle: '@ts_gaming_cafe_waluj', color: '#e1306c', link: 'https://www.instagram.com/ts_gaming_cafe_waluj' },
  { icon: MessageCircle, label: 'WhatsApp', handle: '+91 79724 30951', color: '#25d366', link: 'https://wa.me/917972430951' },
];

export default function Contact() {
  const toast = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.message.trim()) {
      toast.show('Please enter your name and message.', 'error');
      return;
    }
    const waUrl = `https://wa.me/917972430951?text=${encodeURIComponent(
      `Hello TS Gaming Cafe!\n\nName: ${formData.name}\nEmail: ${formData.email || 'N/A'}\nMessage: ${formData.message}`
    )}`;
    window.open(waUrl, '_blank');
    toast.show('Opening WhatsApp to send your message directly to TS Gaming Cafe!', 'success');
    setFormData({ name: '', email: '', message: '' });
  };

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
                href="https://maps.google.com/?q=TS+Gaming+Cafe+Waluj+Aurangabad"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                id="contact-directions-btn"
              >
                <Navigation size={16} /> Get Directions
              </a>
              <Link to="/#booking" className="btn btn-primary" id="contact-book-btn">
                🎮 Book Now
              </Link>
            </div>
          </div>

          {/* Right — Map + Form */}
          <div className="contact-right-col">
            {/* Map */}
            <div className="contact-map glass">
              <iframe
                src="https://maps.google.com/maps?q=TS+Gaming+Cafe,+Waluj,+Aurangabad,+Maharashtra&t=&z=15&ie=UTF8&iwloc=&output=embed"
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
              <form onSubmit={handleSubmit} className="contact-form__fields">
                <div className="form-group">
                  <label className="form-label">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    className="form-input"
                    id="contact-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone or Email</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210 or email"
                    className="form-input"
                    id="contact-email-input"
                    value={formData.email}
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Message *</label>
                  <textarea
                    required
                    placeholder="How can we help you? Ask about bookings, setups, or timings..."
                    className="form-input"
                    rows={4}
                    style={{ resize: 'vertical', minHeight: '100px' }}
                    id="contact-message-input"
                    value={formData.message}
                    onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn btn-primary full-width" id="contact-submit-btn" style={{ gap: '8px' }}>
                  <Send size={16} /> Send via WhatsApp
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
