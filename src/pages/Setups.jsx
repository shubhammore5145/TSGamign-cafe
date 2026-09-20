import React, { useState } from 'react';
import { Monitor, Gamepad2, Glasses, Car, Filter } from 'lucide-react';
import { useSetups } from '../hooks/useSetups';
import './Setups.css';

const CATEGORIES = ['All', 'PC', 'PS5', 'VR', 'Racing'];

const TYPE_ICONS = {
  PC:     Monitor,
  PS5:    Gamepad2,
  VR:     Glasses,
  Racing: Car,
};

export default function Setups() {
  const { setups, loading, error } = useSetups();
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? setups
    : setups.filter(s => s.type === activeCategory);

  return (
    <div className="setups-page page-enter">
      <div className="container">
        {/* Header */}
        <div className="setups-header">
          <div className="section-tag"><Monitor size={12} /> Gaming Arsenal</div>
          <h1 className="section-title">Our <span>Gaming Setups</span></h1>
          <p className="section-desc">
            Choose your weapon. From RTX-powered gaming PCs to PS5, VR, and Racing Simulators — we've got the gear to match your game.
          </p>
        </div>

        {/* Firestore Error Message */}
        {error && (
          <div className="glass" style={{
            padding: 'var(--space-xl)',
            marginBottom: 'var(--space-xl)',
            border: '1px solid var(--color-warning)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)' }}>⚠️</div>
            <h3 style={{ color: 'var(--color-warning)', marginBottom: 'var(--space-sm)' }}>
              Firebase Setup Required
            </h3>
            <p className="text-muted" style={{ marginBottom: 'var(--space-md)', maxWidth: '500px', margin: '0 auto var(--space-md)' }}>
              Firestore Database needs to be created in your Firebase Console. Follow these steps:
            </p>
            <div style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto', color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: 1.8 }}>
              <p>1️⃣ Go to <strong style={{ color: 'var(--color-primary)' }}>console.firebase.google.com</strong></p>
              <p>2️⃣ Open your project (<strong style={{ color: 'var(--color-primary)' }}>smartprint-1fd4a</strong>)</p>
              <p>3️⃣ Click <strong style={{ color: 'var(--color-accent)' }}>Firestore Database</strong> in the left sidebar (NOT Realtime Database)</p>
              <p>4️⃣ Click <strong style={{ color: 'var(--color-accent)' }}>Create database</strong></p>
              <p>5️⃣ Select <strong>Start in test mode</strong></p>
              <p>6️⃣ Choose a location and click <strong>Enable</strong></p>
              <p>7️⃣ Refresh this page!</p>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="setups-filter">
          <Filter size={16} className="text-muted" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`setups-filter__btn ${activeCategory === cat ? 'setups-filter__btn--active' : ''}`}
              id={`filter-${cat.toLowerCase()}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="setups-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass setup-card-skeleton">
                <div className="skeleton" style={{ height: '200px', marginBottom: '16px' }} />
                <div className="skeleton" style={{ height: '14px', width: '50%', marginBottom: '8px' }} />
                <div className="skeleton" style={{ height: '12px', marginBottom: '6px' }} />
                <div className="skeleton" style={{ height: '12px', width: '70%' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="setups-grid">
            {filtered.map(setup => (
              <SetupCard key={setup.id} setup={setup} />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="setups-empty glass">
            <Monitor size={48} className="text-dim" />
            <h3>No setups found</h3>
            <p className="text-muted">No {activeCategory} setups are currently listed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SetupCard({ setup }) {
  const Icon = TYPE_ICONS[setup.type] || Monitor;
  const isAvailable = setup.status === 'available';
  const isOccupied  = setup.status === 'occupied';

  return (
    <div className={`setup-card glass ${isOccupied ? 'setup-card--occupied' : ''}`}>
      {/* Image */}
      <div className="setup-card__image-wrap">
        {setup.image ? (
          <img src={setup.image} alt={setup.name} className="setup-card__image" />
        ) : (
          <div className="setup-card__image-placeholder">
            <Icon size={48} />
          </div>
        )}
        <div className={`badge badge-${isAvailable ? 'available' : isOccupied ? 'occupied' : 'maintenance'} setup-card__badge`}>
          <span className={`status-dot ${isAvailable ? 'green' : isOccupied ? 'red' : 'gray'}`} />
          {isAvailable ? 'AVAILABLE' : isOccupied ? 'OCCUPIED' : 'MAINTENANCE'}
        </div>
        <div className="setup-card__type-chip">
          <Icon size={12} /> {setup.type}
        </div>
      </div>

      {/* Body */}
      <div className="setup-card__body">
        <div className="setup-card__number">#{String(setup.setupNumber || '00').padStart(2, '0')}</div>
        <h3 className="setup-card__name">{setup.name}</h3>

        {/* Specs */}
        {setup.specs && setup.specs.length > 0 && (
          <ul className="setup-card__specs">
            {setup.specs.slice(0, 4).map((spec, i) => (
              <li key={i}>{spec}</li>
            ))}
          </ul>
        )}

        {/* Games */}
        {setup.games && setup.games.length > 0 && (
          <div className="setup-card__games">
            <span className="setup-card__games-label">Games:</span>
            <div className="setup-card__games-list">
              {setup.games.slice(0, 3).map((game, i) => (
                <span key={i} className="setup-card__game-tag">{game}</span>
              ))}
              {setup.games.length > 3 && (
                <span className="setup-card__game-tag setup-card__game-tag--more">+{setup.games.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* Price and CTA */}
        <div className="setup-card__footer">
          <div className="setup-card__price">
            <span className="setup-card__price-amount">₹{setup.pricePerHour}</span>
            <span className="setup-card__price-unit">/hour</span>
          </div>
          <div className={`badge ${isAvailable ? 'badge-available' : isOccupied ? 'badge-occupied' : 'badge-maintenance'}`} style={{ fontSize: '0.7rem' }}>
            {isAvailable ? '✅ Available' : isOccupied ? '🔴 In Use' : '🔧 Maintenance'}
          </div>
        </div>
      </div>
    </div>
  );
}
