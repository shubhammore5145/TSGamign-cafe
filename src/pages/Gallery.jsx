import React from 'react';
import './Gallery.css';

const GALLERY_ITEMS = [
  { id: 1, label: 'Gaming PCs',      emoji: '🖥️',  color: '#9333ea', span: 'wide' },
  { id: 2, label: 'PS5 Arena',       emoji: '🎮',  color: '#06b6d4', span: 'tall' },
  { id: 3, label: 'Tournament Night',emoji: '🏆',  color: '#f59e0b', span: '' },
  { id: 4, label: 'Racing Sim',      emoji: '🏎️',  color: '#22c55e', span: '' },
  { id: 5, label: 'VR Zone',         emoji: '🥽',  color: '#ec4899', span: 'wide' },
  { id: 6, label: 'Café Lounge',     emoji: '☕',  color: '#9333ea', span: '' },
  { id: 7, label: 'Night Gaming',    emoji: '🌙',  color: '#06b6d4', span: '' },
  { id: 8, label: 'Champions',       emoji: '🥇',  color: '#f59e0b', span: 'tall' },
  { id: 9, label: 'Squad Goals',     emoji: '👾',  color: '#ef4444', span: '' },
  { id: 10, label: 'Streaming Setup',emoji: '🎙️',  color: '#22c55e', span: '' },
];

export default function Gallery() {
  return (
    <div className="gallery-page page-enter">
      <div className="container">
        <div className="gallery-header">
          <div className="section-tag">📸 Gallery</div>
          <h1 className="section-title">Life at <span>TS Gaming Café</span></h1>
          <p className="section-desc">Snapshots from our gaming arena, tournaments, and community events.</p>
        </div>

        <div className="gallery-grid">
          {GALLERY_ITEMS.map(item => (
            <div
              key={item.id}
              className={`gallery-item glass gallery-item--${item.span || 'normal'}`}
              style={{ '--item-color': item.color }}
            >
              <div className="gallery-item__inner">
                <div className="gallery-item__emoji">{item.emoji}</div>
                <div className="gallery-item__overlay">
                  <span className="gallery-item__label">{item.label}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="gallery-cta glass" style={{ marginTop: 'var(--space-2xl)', padding: 'var(--space-xl)', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
            Follow us on Instagram for daily gaming moments
          </p>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            id="gallery-instagram-btn"
          >
            📷 @TSGamingCafe
          </a>
        </div>
      </div>
    </div>
  );
}
