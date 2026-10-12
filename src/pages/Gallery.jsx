import React, { useState, useEffect } from 'react';
import { X, Gamepad2, Sparkles, ZoomIn } from 'lucide-react';
import './Gallery.css';

const GALLERY_CATEGORIES = ['All', 'Games', 'Arena & Setups', 'Tournaments'];

const GALLERY_ITEMS = [
  { id: 1, label: 'Valorant 5v5 Tactical', category: 'Games', image: '/images/games/valorant.jpg', emoji: '🎯', color: '#ef4444', span: 'wide' },
  { id: 2, label: 'PS5 Next-Gen Arena', category: 'Arena & Setups', image: '/images/ps5.jpg', emoji: '🎮', color: '#06b6d4', span: 'tall' },
  { id: 3, label: 'Grand Tournament Night', category: 'Tournaments', image: '/images/gallery/tournament.jpg', emoji: '🏆', color: '#f59e0b', span: '' },
  { id: 4, label: 'GTA V Open World RP', category: 'Games', image: '/images/games/gta5.jpg', emoji: '🚗', color: '#06b6d4', span: '' },
  { id: 5, label: 'Pro Sim Racing Cockpit', category: 'Arena & Setups', image: '/images/sim-racing.jpg', emoji: '🏎️', color: '#22c55e', span: 'wide' },
  { id: 6, label: 'EA Sports FC 25 Showdown', category: 'Games', image: '/images/games/eafc25.jpg', emoji: '⚽', color: '#22c55e', span: '' },
  { id: 7, label: 'VR Immersion Zone', category: 'Arena & Setups', image: '/images/gallery/vr-zone.jpg', emoji: '🥽', color: '#ec4899', span: '' },
  { id: 8, label: 'Champions & Trophies', category: 'Tournaments', image: '/images/gallery/champions.jpg', emoji: '🥇', color: '#f59e0b', span: 'tall' },
  { id: 9, label: 'Tekken 8 Clash', category: 'Games', image: '/images/games/tekken8.jpg', emoji: '🥊', color: '#ec4899', span: '' },
  { id: 10, label: 'High-End RTX Gaming PCs', category: 'Arena & Setups', image: '/images/gallery/gaming-pc.jpg', emoji: '🖥️', color: '#ff5500', span: 'wide' },
  { id: 11, label: 'Call of Duty: Warzone Action', category: 'Games', image: '/images/games/warzone.jpg', emoji: '🔥', color: '#ff5500', span: '' },
  { id: 12, label: 'Gran Turismo 7 Simulator', category: 'Games', image: '/images/games/gt7.jpg', emoji: '🏁', color: '#f59e0b', span: '' },
  { id: 13, label: 'Late Night RGB Gaming', category: 'Arena & Setups', image: '/images/gallery/night-gaming.jpg', emoji: '🌙', color: '#06b6d4', span: '' },
  { id: 14, label: 'Squad & LAN Battles', category: 'Tournaments', image: '/images/gallery/squad.jpg', emoji: '👾', color: '#ef4444', span: 'wide' },
  { id: 15, label: 'Pro Streamer Station', category: 'Arena & Setups', image: '/images/gallery/streaming.jpg', emoji: '🎙️', color: '#22c55e', span: '' },
  { id: 16, label: 'Fortnite Battle Royale', category: 'Games', image: '/images/games/fortnite.jpg', emoji: '👑', color: '#8b5cf6', span: '' },
];

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredItems = GALLERY_ITEMS.filter(
    (item) => activeCategory === 'All' || item.category === activeCategory
  );

  return (
    <div className="gallery-page page-enter">
      <div className="container">
        <div className="gallery-header">
          <div className="section-tag">📸 Gallery & Games</div>
          <h1 className="section-title">Life at <span>TS Gaming Café</span></h1>
          <p className="section-desc">
            Explore our gaming stations, competitive tournaments, and trending game titles in action.
          </p>

          {/* Category Tabs */}
          <div className="gallery-tabs">
            {GALLERY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`gallery-tab-btn ${activeCategory === cat ? 'gallery-tab-btn--active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                id={`gallery-filter-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                {cat === 'Games' && <Gamepad2 size={14} />}
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="gallery-grid">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`gallery-item glass gallery-item--${item.span || 'normal'}`}
              style={{ '--item-color': item.color }}
              onClick={() => setSelectedImage(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedImage(item);
                }
              }}
            >
              <div className="gallery-item__inner">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.label}
                    className="gallery-item__img"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const emojiEl = e.currentTarget.parentElement?.querySelector('.gallery-item__emoji');
                      if (emojiEl) emojiEl.style.display = 'flex';
                    }}
                  />
                )}
                <div
                  className="gallery-item__emoji"
                  style={{ display: item.image ? 'none' : 'flex' }}
                >
                  {item.emoji}
                </div>
                <div className="gallery-item__zoom-hint">
                  <ZoomIn size={18} />
                </div>
                <div className="gallery-item__overlay">
                  <span className="gallery-item__category-badge">{item.category}</span>
                  <span className="gallery-item__label">{item.label}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox Modal */}
        {selectedImage && (
          <div
            className="gallery-modal-backdrop"
            onClick={() => setSelectedImage(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="gallery-modal-card glass"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="gallery-modal-close"
                onClick={() => setSelectedImage(null)}
                aria-label="Close image preview"
              >
                <X size={20} />
              </button>

              <div className="gallery-modal-image-wrapper">
                {selectedImage.image ? (
                  <img
                    src={selectedImage.image}
                    alt={selectedImage.label}
                    className="gallery-modal-img"
                  />
                ) : (
                  <div className="gallery-modal-emoji">{selectedImage.emoji}</div>
                )}
              </div>

              <div className="gallery-modal-footer">
                <div>
                  <span
                    className="gallery-item__category-badge"
                    style={{ marginBottom: '6px', display: 'inline-block' }}
                  >
                    {selectedImage.category}
                  </span>
                  <h3 className="gallery-modal-title">{selectedImage.label}</h3>
                </div>
                <a
                  href="/#booking"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={() => setSelectedImage(null)}
                >
                  Book Session 🎮
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="gallery-cta glass" style={{ marginTop: 'var(--space-2xl)', padding: 'var(--space-xl)', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
            Follow us on Instagram for daily gaming moments, setup clips & tournament highlights
          </p>
          <a
            href="https://www.instagram.com/ts_gaming_cafe_waluj"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            id="gallery-instagram-btn"
          >
            📷 @ts_gaming_cafe_waluj
          </a>
        </div>
      </div>
    </div>
  );
}
