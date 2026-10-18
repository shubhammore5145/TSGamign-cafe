import React, { useState, useEffect } from 'react';
import { Search, Gamepad2, Monitor, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGames } from '../firebase/firestore';
import './Games.css';

const CATEGORIES = ['All', 'Sports', 'Open World', 'Multiplayer', 'Racing'];

const FALLBACK_GAMES = [
  { id: '1', name: 'EA Sports FC / FIFA 23', category: 'Sports', supportedSetups: ['PS4'], playerCount: '1v1 / 2v2', image: '/images/games/eafc25.jpg' },
  { id: '2', name: 'GTA V', category: 'Open World', supportedSetups: ['PS4'], playerCount: 'Story / Solo', image: '/images/games/gta5.jpg' },
  { id: '3', name: 'WWE 2K24 / 2K22', category: 'Sports', supportedSetups: ['PS4'], playerCount: '1-4 Players', image: '/images/games/wwe2k24.jpg' },
  { id: '4', name: 'God of War', category: 'Open World', supportedSetups: ['PS4'], playerCount: '1 Player', image: '/images/games/gow.jpg' },
  { id: '5', name: 'Marvel Spider-Man', category: 'Open World', supportedSetups: ['PS4'], playerCount: '1 Player', image: '/images/games/spiderman2.jpg' },
  { id: '6', name: 'Mortal Kombat 11', category: 'Multiplayer', supportedSetups: ['PS4'], playerCount: '1v1 Combat', image: '/images/games/mk1.jpg' },
  { id: '7', name: 'Cricket 24', category: 'Sports', supportedSetups: ['PS4'], playerCount: '1v1 / 2v2', image: '/images/games/cricket24.jpg' },
  { id: '8', name: 'Tekken 7', category: 'Multiplayer', supportedSetups: ['PS4'], playerCount: '1v1 Battle', image: '/images/games/tekken8.jpg' },
  { id: '9', name: 'Need for Speed Heat', category: 'Racing', supportedSetups: ['PS4'], playerCount: 'Single / Split', image: '/images/games/nfs.jpg' },
  { id: '10', name: 'Uncharted 4', category: 'Open World', supportedSetups: ['PS4'], playerCount: '1 Player', image: '/images/games/uncharted4.jpg' },
  { id: '11', name: 'WWE SmackDown Here Comes The Pain', category: 'Sports', supportedSetups: ['PS2'], playerCount: '1-4 Players (Group)', image: '/images/ps2.jpg' },
  { id: '12', name: 'GTA San Andreas', category: 'Open World', supportedSetups: ['PS2'], playerCount: '1 Player', image: '/images/ps2.jpg' },
  { id: '13', name: 'GTA Vice City', category: 'Open World', supportedSetups: ['PS2'], playerCount: '1 Player', image: '/images/ps2.jpg' },
  { id: '14', name: 'God of War II', category: 'Open World', supportedSetups: ['PS2'], playerCount: '1 Player', image: '/images/ps2.jpg' },
  { id: '15', name: 'Tekken 5', category: 'Multiplayer', supportedSetups: ['PS2'], playerCount: '1v1 Classic', image: '/images/ps2.jpg' },
];

const CATEGORY_COLORS = {
  'Sports':       { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',   text: '#22c55e' },
  'Open World':   { bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)',   text: '#06b6d4' },
  'Multiplayer':  { bg: 'rgba(236,72,153,0.1)',  border: 'rgba(236,72,153,0.25)',  text: '#ec4899' },
  'Racing':       { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  text: '#f59e0b' },
};

const GAME_EMOJIS = {
  'Racing': '🏎️', 'Sports': '⚽', 'Open World': '🌍', 'Multiplayer': '👥',
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
