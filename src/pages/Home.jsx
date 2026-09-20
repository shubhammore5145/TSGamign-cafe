import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Gamepad2, Glasses, Car, ChevronDown, Users, Trophy, Zap, Star } from 'lucide-react';
import { useSetups } from '../hooks/useSetups';
import { subscribeToCafeConfig } from '../firebase/firestore';
import './Home.css';

// --- Static demo data for stats ---
const STATS = [
  { icon: Monitor,   label: 'Gaming PCs',       value: 12, color: 'purple' },
  { icon: Gamepad2,  label: 'PS5 Consoles',      value: 6,  color: 'cyan'   },
  { icon: Glasses,   label: 'VR Headsets',       value: 4,  color: 'green'  },
  { icon: Car,       label: 'Racing Simulators', value: 2,  color: 'yellow' },
];

const TESTIMONIALS = [
  { name: 'Aryan K.',   rating: 5, text: 'Best gaming café in the city! The RTX PCs are insane.' },
  { name: 'Priya M.',   rating: 5, text: 'The PS5 setup is premium and staff is super helpful.' },
  { name: 'Rohit S.',   rating: 5, text: 'Won my first tournament here. The vibe is unmatched!' },
];

const WHY_US = [
  { icon: Monitor, title: 'Top-Tier Hardware', desc: 'RTX 4090 PCs, 240Hz monitors, mechanical keyboards for pro-level performance.' },
  { icon: Zap,     title: 'Ultra-Fast Internet', desc: '1 Gbps fiber optic connection. Zero lag, zero excuses.' },
  { icon: Trophy,  title: 'Pro Tournaments',   desc: 'Weekly esports tournaments with cash prizes and leaderboards.' },
  { icon: Users,   title: 'Gaming Community',  desc: 'Join hundreds of gamers, make friends, and level up together.' },
];

export default function Home() {
  const { setups } = useSetups();
  const [cafeConfig, setCafeConfig] = useState(null);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const availableCount = setups.filter(s => s.status === 'available').length;
  const isOpen = cafeConfig?.isOpen ?? true;

  useEffect(() => {
    const unsub = subscribeToCafeConfig(setCafeConfig);
    const timer = setTimeout(() => setHeroLoaded(true), 100);
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  return (
    <div className="home">
      {/* ── HERO ── */}
      <section className="hero">
        {/* Background */}
        <div className="hero__bg">
          <div className="hero__bg-gradient" />
          <div className="hero__bg-grid" />
          <div className="hero__scanline" />
          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`hero__particle hero__particle--${i}`} />
          ))}
        </div>

        <div className={`hero__content ${heroLoaded ? 'hero__content--loaded' : ''}`}>
          {/* Status badge */}
          <div className="hero__status">
            <span className={`status-dot ${isOpen ? 'green' : 'red'}`} />
            <span className="hero__status-text">{isOpen ? 'NOW OPEN' : 'CLOSED'}</span>
            {isOpen && availableCount > 0 && (
              <span className="hero__seats">{availableCount} SEATS AVAILABLE</span>
            )}
          </div>

          {/* Logo / Name */}
          <div className="hero__brand">
            <div className="hero__brand-icon">
              <Gamepad2 size={28} />
            </div>
            <span className="hero__brand-name">TS GAMING CAFÉ</span>
          </div>

          {/* Tagline */}
          <h1 className="hero__tagline">
            <span className="hero__tagline-line hero__tagline-line--1">PLAY.</span>
            <span className="hero__tagline-line hero__tagline-line--2">COMPETE.</span>
            <span className="hero__tagline-line hero__tagline-line--3">DOMINATE.</span>
          </h1>

          <p className="hero__desc">
            Mumbai's premier gaming lounge featuring RTX-powered PCs, PS5 consoles, VR headsets, and racing simulators. Elevate your game to the next level.
          </p>

          {/* CTAs */}
          <div className="hero__ctas">
            <Link to="/booking" className="btn btn-primary btn-lg hero__cta-primary" id="hero-book-btn">
              <Gamepad2 size={18} />
              Book Your Session
            </Link>
            <Link to="/games" className="btn btn-ghost btn-lg hero__cta-secondary" id="hero-games-btn">
              <Star size={18} />
              View Games
            </Link>
          </div>

          {/* Quick stats */}
          <div className="hero__stats">
            {STATS.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className={`hero__stat hero__stat--${color}`}>
                <Icon size={16} />
                <span className="hero__stat-value">{value}</span>
                <span className="hero__stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <a href="#why-us" className="hero__scroll">
          <span>Scroll Down</span>
          <ChevronDown size={18} className="hero__scroll-icon" />
        </a>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="section" id="why-us">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <div className="section-tag"><Star size={12} /> Why Choose Us</div>
            <h2 className="section-title">The <span>Ultimate</span> Gaming Experience</h2>
            <p className="section-desc" style={{ margin: '0 auto' }}>
              We're not just a gaming café — we're a battleground for champions.
            </p>
          </div>

          <div className="grid-4 home__why-grid">
            {WHY_US.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="home__why-card glass glass-hover" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="home__why-icon">
                  <Icon size={22} />
                </div>
                <h3 className="home__why-title">{title}</h3>
                <p className="home__why-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SETUP PREVIEW ── */}
      <section className="section home__setups-section">
        <div className="container">
          <div className="flex-between" style={{ marginBottom: 'var(--space-2xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <div className="section-tag"><Monitor size={12} /> Gaming Setups</div>
              <h2 className="section-title">Available <span>Rigs</span></h2>
            </div>
            <Link to="/setups" className="btn btn-ghost">View All Setups →</Link>
          </div>

          <div className="home__setup-grid">
            {setups.slice(0, 4).map(setup => (
              <SetupPreviewCard key={setup.id} setup={setup} />
            ))}
            {setups.length === 0 && [1,2,3,4].map(i => (
              <div key={i} className="glass home__setup-card-skeleton">
                <div className="skeleton" style={{ height: '180px', marginBottom: '12px' }} />
                <div className="skeleton" style={{ height: '14px', width: '60%', marginBottom: '8px' }} />
                <div className="skeleton" style={{ height: '12px', width: '40%' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOURNAMENTS BANNER ── */}
      <section className="section home__tournament-section">
        <div className="container">
          <div className="home__tournament-banner glass neon-border-purple">
            <div className="hud-corner tl" /><div className="hud-corner tr" />
            <div className="hud-corner bl" /><div className="hud-corner br" />
            <div className="home__tournament-content">
              <div className="section-tag"><Trophy size={12} /> Tournaments</div>
              <h2 className="section-title">Join the <span>Battle</span></h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
                Weekly esports tournaments in Valorant, CS2, FIFA, and more. Cash prizes, trophies, and glory await.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <Link to="/tournaments" className="btn btn-primary btn-lg" id="home-tournaments-btn">
                  <Trophy size={18} /> View Tournaments
                </Link>
                <Link to="/membership" className="btn btn-ghost btn-lg">
                  Join Membership
                </Link>
              </div>
            </div>
            <div className="home__tournament-stats">
              {[
                { value: '₹50K+', label: 'Prize Pool' },
                { value: '200+', label: 'Players' },
                { value: '20+', label: 'Tournaments' },
              ].map(({ value, label }) => (
                <div key={label} className="home__tournament-stat">
                  <span className="home__tournament-stat-value">{value}</span>
                  <span className="home__tournament-stat-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <div className="section-tag"><Star size={12} /> Testimonials</div>
            <h2 className="section-title">What <span>Gamers Say</span></h2>
          </div>

          <div className="grid-3">
            {TESTIMONIALS.map(({ name, rating, text }, i) => (
              <div key={i} className="glass glass-hover home__testimonial" style={{ padding: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                  {[...Array(rating)].map((_, j) => (
                    <Star key={j} size={14} fill="var(--color-warning)" color="var(--color-warning)" />
                  ))}
                </div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', fontStyle: 'italic', marginBottom: '14px' }}>
                  "{text}"
                </p>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-primary)' }}>
                  — {name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="section-sm">
        <div className="container">
          <div className="home__final-cta">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
              Ready to Level Up?
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)' }}>
              Book your gaming session now and experience the difference.
            </p>
            <Link to="/login" className="btn btn-primary btn-lg" id="home-final-cta-btn">
              Get Started — It's Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SetupPreviewCard({ setup }) {
  const statusColor = setup.status === 'available' ? 'green' : setup.status === 'occupied' ? 'red' : 'gray';
  const statusLabel = setup.status === 'available' ? 'AVAILABLE' : setup.status === 'occupied' ? 'OCCUPIED' : 'MAINTENANCE';

  return (
    <div className="home__setup-card glass glass-hover">
      <div className="home__setup-card-image">
        {setup.image ? (
          <img src={setup.image} alt={setup.name} />
        ) : (
          <div className="home__setup-card-placeholder">
            <Monitor size={36} />
          </div>
        )}
        <div className={`badge badge-${setup.status === 'available' ? 'available' : setup.status === 'occupied' ? 'occupied' : 'maintenance'} home__setup-badge`}>
          <span className={`status-dot ${statusColor}`} />
          {statusLabel}
        </div>
      </div>
      <div className="home__setup-card-body">
        <div className="home__setup-card-type">{setup.type}</div>
        <h3 className="home__setup-card-name">{setup.name}</h3>
        <div className="home__setup-card-price">₹{setup.pricePerHour}/hr</div>
        <Link
          to={setup.status === 'available' ? `/booking/${setup.id}` : '/setups'}
          className={`btn btn-sm full-width ${setup.status === 'available' ? 'btn-primary' : 'btn-ghost'}`}
        >
          {setup.status === 'available' ? 'Book Now' : 'View Details'}
        </Link>
      </div>
    </div>
  );
}
