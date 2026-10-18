import React, { useState } from 'react';
import { Monitor, Gamepad2, Glasses, Car, Filter, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSetups } from '../hooks/useSetups';
import './Setups.css';

const TYPE_ICONS = {
  PS4: Gamepad2,
  PS2: Gamepad2,
  PS5: Gamepad2,
  PC: Monitor,
  Racing: Car,
  VR: Glasses,
};

const FALLBACK_SETUPS = [
  {
    id: 'setup-ps2-1',
    setupNumber: 1,
    name: 'PS 2 — Station #01',
    type: 'PS2',
    status: 'available',
    pricePerHour: 20,
    pricePer30Min: 15,
    specs: ['2x DualShock 2 Controllers', 'Memory Card 64MB', 'CRT / Gaming Display'],
    games: ['GTA San Andreas', 'GTA Vice City', 'WWE SmackDown Here Comes The Pain', 'God of War II', 'Tekken 5'],
    image: '/images/ps2.jpg',
  },
  {
    id: 'setup-ps4-2',
    setupNumber: 2,
    name: 'PS4 — Station #02',
    type: 'PS4',
    status: 'available',
    pricePerHour: 50,
    pricePer30Min: 40,
    specs: ['2x DualShock 4 Wireless Controllers', '43-inch 4K HDR TV', 'Low Input Lag Gaming Mode'],
    games: ['FIFA 23', 'GTA V', 'WWE 2K22', 'God of War', 'Spider-Man', 'Mortal Kombat 11'],
    image: '/images/ps4.jpg',
  },
  {
    id: 'setup-ps4-3',
    setupNumber: 3,
    name: 'PS4 — Station #03',
    type: 'PS4',
    status: 'available',
    pricePerHour: 50,
    pricePer30Min: 40,
    specs: ['2x DualShock 4 Wireless Controllers', '43-inch 4K HDR TV', 'Surround Sound Audio'],
    games: ['FIFA 23', 'GTA V', 'WWE 2K22', 'God of War', 'Spider-Man', 'Mortal Kombat 11'],
    image: '/images/ps4.jpg',
  },
  {
    id: 'setup-ps4-4',
    setupNumber: 4,
    name: 'PS 4 — Station #04',
    type: 'PS4',
    status: 'available',
    pricePerHour: 50,
    pricePer30Min: 40,
    specs: ['2x DualShock 4 Wireless Controllers', '43-inch 4K HDR TV'],
    games: ['FIFA 23', 'GTA V', 'WWE 2K22', 'God of War', 'Spider-Man', 'Mortal Kombat 11'],
    image: '/images/ps4.jpg',
  },
  {
    id: 'setup-ps4-5',
    setupNumber: 5,
    name: 'PS 4 — Station #05',
    type: 'PS4',
    status: 'available',
    pricePerHour: 50,
    pricePer30Min: 40,
    specs: ['2x DualShock 4 Wireless Controllers', '43-inch 4K HDR TV'],
    games: ['FIFA 23', 'GTA V', 'WWE 2K22', 'God of War', 'Spider-Man', 'Mortal Kombat 11'],
    image: '/images/ps4.jpg',
  },
];

export default function Setups() {
  const { setups: liveSetups, loading, error } = useSetups();
  const [activeCategory, setActiveCategory] = useState('All');

  const setups = (liveSetups && liveSetups.length > 0) ? liveSetups : FALLBACK_SETUPS;

  const categories = React.useMemo(() => {
    const types = new Set(setups.map(s => s.type).filter(Boolean));
    return ['All', ...Array.from(types)];
  }, [setups]);

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
            Choose your battle station. Premium PlayStation setups (PS4 Pro & PS2 Classic) in Waluj, Sambhajinagar — ready for solo and multiplayer battles.
          </p>
        </div>

        {/* Category Filter */}
        <div className="setups-filter">
          <Filter size={16} className="text-muted" />
          {categories.map(cat => (
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
