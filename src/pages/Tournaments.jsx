import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { getTournaments } from '../firebase/firestore';
import { Trophy, Calendar, Users, Clock, Award, ChevronRight } from 'lucide-react';
import './Tournaments.css';

const FALLBACK = [
  {
    id: 't1', title: 'Valorant Championship', game: 'Valorant', banner: null,
    date: '2026-09-28', time: '4:00 PM', entryFee: 100, prizePool: '₹5,000',
    maxPlayers: 20, registeredPlayers: 14, status: 'registration_open',
    description: 'The ultimate Valorant showdown. 5v5 format. Best of 3 matches.',
    winners: [],
  },
  {
    id: 't2', title: 'CS2 Masters Cup', game: 'Counter-Strike 2', banner: null,
    date: '2026-10-05', time: '6:00 PM', entryFee: 150, prizePool: '₹10,000',
    maxPlayers: 16, registeredPlayers: 8, status: 'registration_open',
    description: 'Prove your CS2 skills. Team of 5. Swiss format.',
    winners: [],
  },
  {
    id: 't3', title: 'FIFA Sunday League', game: 'EA Sports FC 25', banner: null,
    date: '2026-10-12', time: '2:00 PM', entryFee: 50, prizePool: '₹2,000',
    maxPlayers: 16, registeredPlayers: 16, status: 'full',
    description: 'Weekly FIFA tournament. 1v1 format, knockout rounds.',
    winners: [],
  },
  {
    id: 't4', title: 'Forza Racing Grand Prix', game: 'Forza Horizon 5', banner: null,
    date: '2026-09-14', time: '3:00 PM', entryFee: 100, prizePool: '₹3,000',
    maxPlayers: 8, registeredPlayers: 8, status: 'completed',
    description: 'Racing simulator championships on the full track.',
    winners: ['Aryan K.', 'Rohit S.', 'Priya M.'],
  },
];

export default function Tournaments() {
  const toast = useToast();
  const [tournaments, setTournaments] = useState(FALLBACK);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    getTournaments().then(snap => {
      if (!snap.empty) setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(() => {});
  }, []);

  const upcoming = tournaments.filter(t => t.status === 'registration_open' || t.status === 'full');
  const past     = tournaments.filter(t => t.status === 'completed');

  return (
    <div className="tournaments-page page-enter">
      <div className="container">
        <div className="tournaments-header">
          <div className="section-tag"><Trophy size={12} /> Esports</div>
          <h1 className="section-title">Gaming <span>Tournaments</span></h1>
          <p className="section-desc">Compete, win, and claim your spot on the leaderboard.</p>
        </div>

        {/* Prize pool highlight */}
        <div className="tournaments-highlight glass neon-border-purple">
          <div className="hud-corner tl" /><div className="hud-corner tr" />
          <div style={{ textAlign: 'center' }}>
            <div className="section-tag" style={{ justifyContent: 'center' }}><Trophy size={12} /> Total Prize Pool</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 700, background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              ₹50,000+
            </div>
            <p className="text-muted">In prizes across all tournaments this season</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="dashboard__tabs" style={{ marginTop: 'var(--space-2xl)' }}>
          <button className={`dashboard__tab ${activeTab === 'upcoming' ? 'dashboard__tab--active' : ''}`} onClick={() => setActiveTab('upcoming')}>
            <Trophy size={15} /> Upcoming ({upcoming.length})
          </button>
          <button className={`dashboard__tab ${activeTab === 'history' ? 'dashboard__tab--active' : ''}`} onClick={() => setActiveTab('history')}>
            <Award size={15} /> Results & Leaderboard ({past.length})
          </button>
        </div>

        {activeTab === 'upcoming' && (
          <div className="tournaments-grid">
            {upcoming.map(t => (
              <TournamentCard
                key={t.id}
                tournament={t}
              />
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="tournaments-grid">
            {past.length === 0 ? (
              <div className="glass tournaments-empty">
                <Trophy size={48} className="text-dim" />
                <p>No completed tournaments yet.</p>
              </div>
            ) : past.map(t => (
              <PastTournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentCard({ tournament: t }) {
  const isFull = t.status === 'full' || t.registeredPlayers >= t.maxPlayers;
  const progress = Math.min((t.registeredPlayers / t.maxPlayers) * 100, 100);
  const spotsLeft = Math.max(0, t.maxPlayers - t.registeredPlayers);

  return (
    <div className="tournament-card glass">
      <div className="tournament-card__banner">
        <div className="tournament-card__game-emoji">🏆</div>
        <div className={`badge ${isFull ? 'badge-occupied' : 'badge-active'} tournament-card__status-badge`}>
          {isFull ? '🔴 FULL' : '🟢 OPEN'}
        </div>
      </div>

      <div className="tournament-card__body">
        <div className="tournament-card__game">{t.game}</div>
        <h3 className="tournament-card__title">{t.title}</h3>

        <div className="tournament-card__details">
          <div className="tournament-card__detail">
            <Calendar size={13} /> {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="tournament-card__detail">
            <Clock size={13} /> {t.time}
          </div>
          <div className="tournament-card__detail">
            <Users size={13} /> {t.registeredPlayers}/{t.maxPlayers} Players
          </div>
          <div className="tournament-card__detail">
            <Trophy size={13} /> Prize: {t.prizePool}
          </div>
        </div>

        {/* Registration progress */}
        <div className="tournament-card__progress-wrap">
          <div className="tournament-card__progress-bar">
            <div className="tournament-card__progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="tournament-card__progress-text">
            {isFull ? 'Tournament Full' : `${spotsLeft} spots remaining`}
          </div>
        </div>

        <div className="tournament-card__footer">
          <div className="tournament-card__fee">
            Entry: <span>₹{t.entryFee}</span>
          </div>
          <div className={`badge ${isFull ? 'badge-occupied' : 'badge-active'}`} style={{ fontSize: '0.7rem' }}>
            {isFull ? 'Registration Closed' : 'Registration Open'}
          </div>
        </div>
      </div>
    </div>
  );
}

function PastTournamentCard({ tournament: t }) {
  return (
    <div className="tournament-card glass">
      <div className="tournament-card__banner" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(147,51,234,0.1))' }}>
        <div className="tournament-card__game-emoji">🏅</div>
        <div className="badge badge-completed tournament-card__status-badge">COMPLETED</div>
      </div>
      <div className="tournament-card__body">
        <div className="tournament-card__game">{t.game}</div>
        <h3 className="tournament-card__title">{t.title}</h3>
        <div className="tournament-card__details">
          <div className="tournament-card__detail"><Calendar size={13} /> {t.date}</div>
          <div className="tournament-card__detail"><Users size={13} /> {t.registeredPlayers} Players</div>
          <div className="tournament-card__detail"><Trophy size={13} /> Prize: {t.prizePool}</div>
        </div>
        {t.winners?.length > 0 && (
          <div className="tournament-card__winners">
            <div className="tournament-card__winners-title">🏆 Winners</div>
            {t.winners.map((w, i) => (
              <div key={i} className="tournament-card__winner">
                <span>{['🥇', '🥈', '🥉'][i]}</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
