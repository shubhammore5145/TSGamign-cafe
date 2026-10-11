import React, { useState } from 'react';
import { Monitor, Gamepad2, Glasses, Car, Filter, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSetups } from '../hooks/useSetups';
import './Setups.css';

const CATEGORIES = ['All', 'PC', 'PS5', 'VR', 'Racing'];

const TYPE_ICONS = {
  PC:     Monitor,
  PS5:    Gamepad2,
  VR:     Glasses,
  Racing: Car,
};

const FALLBACK_SETUPS = [
  {
    id: 'setup-ps5-1',
    setupNumber: 1,
    name: 'PlayStation 5 Arena #01',
    type: 'PS5',
    status: 'available',
    pricePerHour: 80,
    specs: ['Sony 4K HDR 120Hz Display', 'DualSense Haptic Controllers', 'Pulse 3D Audio Headset', 'Ultra-fast NVMe SSD'],
    games: ['EA Sports FC 25', 'Spider-Man 2', 'God of War Ragnarok', 'Tekken 8', 'Mortal Kombat 1'],
    image: '/images/ps5.jpg',
  },
  {
    id: 'setup-ps5-2',
    setupNumber: 2,
    name: 'PlayStation 5 Arena #02',
    type: 'PS5',
    status: 'available',
    pricePerHour: 80,
    specs: ['Sony 4K HDR 120Hz Display', 'DualSense Haptic Controllers', 'Surround Sound Audio'],
    games: ['Call of Duty: Modern Warfare III', 'GTA V', 'Gran Turismo 7', 'NBA 2K25'],
    image: '/images/ps5.jpg',
  },
  {
    id: 'setup-sim-1',
    setupNumber: 3,
    name: 'Sim Racing Pro Cockpit',
    type: 'Racing',
    status: 'available',
    pricePerHour: 150,
    specs: ['Logitech G29 Force Feedback Wheel', 'Sequential 6-Speed Shifter', 'Cockpit Racing Bucket Seat', 'Surround Sound Audio'],
    games: ['Forza Horizon 5', 'Gran Turismo 7', 'F1 24', 'Assetto Corsa', 'Need for Speed Unbound'],
    image: '/images/sim-racing.jpg',
  },
  {
    id: 'setup-ps4-1',
    setupNumber: 4,
    name: 'PlayStation 4 Pro Arena',
    type: 'PS5',
    status: 'available',
    pricePerHour: 50,
    specs: ['55" 4K HDR Screen', 'DualShock 4 Wireless Controllers', 'Full Sports & Action Library'],
    games: ['WWE 2K24', 'FIFA 23', 'Cricket 24', 'Uncharted 4', 'Red Dead Redemption 2'],
    image: '/images/ps4.jpg',
  },
  {
    id: 'setup-ps3-1',
    setupNumber: 5,
    name: 'PlayStation 3 Co-Op Station',
    type: 'PC',
    status: 'available',
    pricePerHour: 40,
    specs: ['HD Gaming Display', '4-Player Co-Op Multiplayer', 'Classic Golden Era Titles'],
    games: ['WWE SmackDown vs Raw', 'Blur', 'Tekken 6', 'NFS Most Wanted', 'Call of Duty Black Ops II'],
    image: '/images/ps3.jpg',
  },
  {
    id: 'setup-ps2-1',
    setupNumber: 6,
    name: 'PlayStation 2 Retro Lounge',
    type: 'PC',
    status: 'available',
    pricePerHour: 30,
    specs: ['Retro Arcade Setup', 'Group Multiplayer Action', 'Nostalgic Classics'],
    games: ['WWE SmackDown Here Comes The Pain', 'GTA San Andreas', 'Dragon Ball Z Budokai Tenkaichi 3'],
    image: '/images/ps2.jpg',
  },
];

export default function Setups() {
  const { setups: liveSetups, loading, error } = useSetups();
  const [activeCategory, setActiveCategory] = useState('All');

  const setups = (liveSetups && liveSetups.length > 0) ? liveSetups : FALLBACK_SETUPS;

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
            Choose your weapon. From PS5 next-gen consoles to Sim Racing Cockpit, PS4, PS3 and PS2 — we've got the gear to match your game.
          </p>
        </div>

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
        {loading && setups.length === 0 ? (
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

        {!loading && filtered.length === 0 && (
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
            <span className="setup-card__games-label">Popular Games:</span>
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
          <Link
            to="/#booking"
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '6px', gap: '6px' }}
          >
            <Calendar size={13} /> Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
