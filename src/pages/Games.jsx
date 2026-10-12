import React, { useState, useEffect } from 'react';
import { Search, Gamepad2, Monitor, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGames } from '../firebase/firestore';
import './Games.css';

const CATEGORIES = ['All', 'FPS', 'Racing', 'Sports', 'Battle Royale', 'Open World', 'Multiplayer'];

const FALLBACK_GAMES = [
  { id: '1', name: 'Valorant', category: 'FPS', supportedSetups: ['PC'], playerCount: '5v5', image: '/images/games/valorant.jpg' },
  { id: '2', name: 'Counter-Strike 2', category: 'FPS', supportedSetups: ['PC'], playerCount: '5v5', image: '/images/games/cs2.jpg' },
  { id: '3', name: 'GTA V', category: 'Open World', supportedSetups: ['PC', 'PS5', 'PS4'], playerCount: '1-30', image: '/images/games/gta5.jpg' },
  { id: '4', name: 'EA Sports FC 25', category: 'Sports', supportedSetups: ['PS5', 'PS4'], playerCount: '1v1 / 2v2', image: '/images/games/eafc25.jpg' },
  { id: '5', name: 'Forza Horizon 5', category: 'Racing', supportedSetups: ['Racing', 'PC'], playerCount: '1-12', image: '/images/games/forza5.jpg' },
  { id: '6', name: 'Gran Turismo 7', category: 'Racing', supportedSetups: ['Racing', 'PS5'], playerCount: '1-20', image: '/images/games/gt7.jpg' },
  { id: '7', name: 'WWE 2K24', category: 'Sports', supportedSetups: ['PS5', 'PS4', 'PS3', 'PS2'], playerCount: '1-4', image: '/images/games/wwe2k24.jpg' },
  { id: '8', name: 'Tekken 8', category: 'Multiplayer', supportedSetups: ['PS5'], playerCount: '1v1', image: '/images/games/tekken8.jpg' },
  { id: '9', name: 'Spider-Man 2', category: 'Open World', supportedSetups: ['PS5'], playerCount: '1 Player', image: '/images/games/spiderman2.jpg' },
  { id: '10', name: 'Mortal Kombat 1', category: 'Multiplayer', supportedSetups: ['PS5'], playerCount: '1v1', image: '/images/games/mk1.jpg' },
  { id: '11', name: 'Call of Duty: Warzone', category: 'Battle Royale', supportedSetups: ['PC', 'PS5'], playerCount: '1-150', image: '/images/games/warzone.jpg' },
  { id: '12', name: 'Fortnite', category: 'Battle Royale', supportedSetups: ['PC', 'PS5'], playerCount: '1-100', image: '/images/games/fortnite.jpg' },
  { id: '13', name: 'Minecraft', category: 'Open World', supportedSetups: ['PC'], playerCount: '1-20', image: '/images/games/minecraft.jpg' },
  { id: '14', name: 'Rocket League', category: 'Sports', supportedSetups: ['PC', 'PS5'], playerCount: '3v3', image: '/images/games/rocketleague.jpg' },
  { id: '15', name: 'Need for Speed Unbound', category: 'Racing', supportedSetups: ['Racing', 'PS5'], playerCount: '1-8', image: '/images/games/nfs.jpg' },
];

const CATEGORY_COLORS = {
  'FPS':          { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   text: '#ef4444' },
  'Racing':       { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  text: '#f59e0b' },
  'Sports':       { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',   text: '#22c55e' },
  'Battle Royale':{ bg: 'rgba(255,85,0,0.12)',  border: 'rgba(255,85,0,0.3)',  text: '#ff5500' },
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
        const fallbackMap = Object.fromEntries(
          FALLBACK_GAMES.map(g => [g.name.toLowerCase(), g.image])
        );
        const loadedGames = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            image: data.image || fallbackMap[data.name?.toLowerCase()] || null,
          };
        });
        setGames(loadedGames);
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
                  {game.image && (
                    <img
                      src={game.image}
                      alt={game.name}
                      className="game-card__img"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const emojiEl = e.currentTarget.parentElement?.querySelector('.game-card__emoji');
                        if (emojiEl) emojiEl.style.display = 'flex';
                      }}
                    />
                  )}
                  <div
                    className="game-card__emoji"
                    style={{ display: game.image ? 'none' : 'flex' }}
                  >
                    {GAME_EMOJIS[game.category] || '🎮'}
                  </div>
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

                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
                    <Link
                      to="/#booking"
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#ff5500', gap: '4px' }}
                    >
                      <Calendar size={12} /> Book to Play
                    </Link>
                  </div>
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
