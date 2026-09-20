import React, { useState, useEffect } from 'react';
import { Search, Gamepad2, Monitor } from 'lucide-react';
import { getGames } from '../firebase/firestore';
import './Games.css';

const CATEGORIES = ['All', 'FPS', 'Racing', 'Sports', 'Battle Royale', 'Open World', 'Multiplayer'];

const FALLBACK_GAMES = [
  { id: '1', name: 'Valorant',       category: 'FPS',         supportedSetups: ['PC'],    playerCount: '5v5',   image: null },
  { id: '2', name: 'Counter-Strike 2', category: 'FPS',       supportedSetups: ['PC'],    playerCount: '5v5',   image: null },
  { id: '3', name: 'GTA V',           category: 'Open World', supportedSetups: ['PC', 'PS5'], playerCount: '1-30', image: null },
  { id: '4', name: 'Fortnite',        category: 'Battle Royale', supportedSetups: ['PC','PS5'], playerCount: '1-100', image: null },
  { id: '5', name: 'Minecraft',       category: 'Open World', supportedSetups: ['PC'],    playerCount: '1-20',  image: null },
  { id: '6', name: 'EA Sports FC 25', category: 'Sports',     supportedSetups: ['PS5'],   playerCount: '1v1',   image: null },
  { id: '7', name: 'Forza Horizon 5', category: 'Racing',     supportedSetups: ['PC','Racing'], playerCount: '1-12', image: null },
  { id: '8', name: 'Call of Duty: Warzone', category: 'Battle Royale', supportedSetups: ['PC','PS5'], playerCount: '1-150', image: null },
  { id: '9', name: 'Rocket League',  category: 'Sports',     supportedSetups: ['PC','PS5'], playerCount: '3v3',  image: null },
  { id: '10', name: 'Cyberpunk 2077', category: 'Open World', supportedSetups: ['PC'],    playerCount: '1',     image: null },
  { id: '11', name: 'Apex Legends',  category: 'Battle Royale', supportedSetups: ['PC'], playerCount: '3',      image: null },
  { id: '12', name: 'Gran Turismo 7', category: 'Racing',     supportedSetups: ['PS5','Racing'], playerCount: '1-20', image: null },
  { id: '13', name: 'Beat Saber',    category: 'Multiplayer', supportedSetups: ['VR'],    playerCount: '1-2',   image: null },
  { id: '14', name: 'Half-Life: Alyx', category: 'FPS',       supportedSetups: ['VR'],    playerCount: '1',     image: null },
];

const CATEGORY_COLORS = {
  'FPS':          { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   text: '#ef4444' },
  'Racing':       { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  text: '#f59e0b' },
  'Sports':       { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',   text: '#22c55e' },
  'Battle Royale':{ bg: 'rgba(147,51,234,0.1)',  border: 'rgba(147,51,234,0.25)',  text: '#9333ea' },
  'Open World':   { bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)',   text: '#06b6d4' },
  'Multiplayer':  { bg: 'rgba(236,72,153,0.1)',  border: 'rgba(236,72,153,0.25)',  text: '#ec4899' },
};

const GAME_EMOJIS = {
  'FPS': '🎯', 'Racing': '🏎️', 'Sports': '⚽', 'Battle Royale': '🔥',
  'Open World': '🌍', 'Multiplayer': '👥',
};

export default function Games() {
  const [games, setGames] = useState(FALLBACK_GAMES);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getGames().then(snap => {
      if (!snap.empty) {
        setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    }).catch(() => {/* use fallback */});
  }, []);

  const filtered = games.filter(g => {
    const matchCat = category === 'All' || g.category === category;
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="games-page page-enter">
      <div className="container">
        <div className="games-header">
          <div className="section-tag"><Gamepad2 size={12} /> Game Library</div>
          <h1 className="section-title">Our <span>Games</span></h1>
          <p className="section-desc">
            {games.length}+ titles across every genre. From competitive shooters to open-world adventures.
          </p>
        </div>

        {/* Filter & Search */}
        <div className="games-controls">
          <div className="games-search">
            <Search size={16} className="games-search__icon" />
            <input
              type="text"
              placeholder="Search games..."
              className="form-input games-search__input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="games-search-input"
            />
          </div>

          <div className="games-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`setups-filter__btn ${category === cat ? 'setups-filter__btn--active' : ''}`}
                onClick={() => setCategory(cat)}
                id={`games-cat-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="games-grid">
          {filtered.map(game => {
            const catStyle = CATEGORY_COLORS[game.category] || {};
            return (
              <div key={game.id} className="game-card glass glass-hover">
                <div className="game-card__image">
                  <div className="game-card__emoji">{GAME_EMOJIS[game.category] || '🎮'}</div>
                </div>
                <div className="game-card__body">
                  <h3 className="game-card__name">{game.name}</h3>
                  <div className="game-card__meta">
                    <span
                      className="game-card__category"
                      style={{ background: catStyle.bg, border: `1px solid ${catStyle.border}`, color: catStyle.text }}
                    >
                      {game.category}
                    </span>
                    <span className="game-card__players">👥 {game.playerCount}</span>
                  </div>
                  {game.supportedSetups && (
                    <div className="game-card__setups">
                      {game.supportedSetups.map(s => (
                        <span key={s} className="game-card__setup-tag">
                          {s === 'PC' ? <Monitor size={10} /> : s === 'VR' ? '🥽' : '🎮'} {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="games-empty glass">
            <span style={{ fontSize: '3rem' }}>🎮</span>
            <p>No games found for "{search}" in {category}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
