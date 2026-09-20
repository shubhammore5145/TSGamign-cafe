import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Crown, Star, Zap, Trophy, Clock } from 'lucide-react';
import './Membership.css';

const PLANS = [
  {
    id: 'bronze',
    name: 'BRONZE',
    icon: '🥉',
    price: 999,
    period: 'month',
    hours: 20,
    discount: 10,
    color: 'var(--color-warning)',
    colorDim: 'rgba(245,158,11,0.1)',
    colorBorder: 'rgba(245,158,11,0.3)',
    features: [
      '20 Gaming Hours/month',
      '10% discount on bookings',
      'Priority queue access',
      'Access to all game titles',
      'Basic tournament entry',
      'Monthly newsletter',
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    icon: '🥈',
    price: 1999,
    period: 'month',
    hours: 50,
    discount: 20,
    color: 'var(--color-secondary)',
    colorDim: 'rgba(6,182,212,0.1)',
    colorBorder: 'rgba(6,182,212,0.3)',
    popular: true,
    features: [
      '50 Gaming Hours/month',
      '20% discount on bookings',
      'Priority booking access',
      'VR & Racing Simulator access',
      'Free tournament entry (2/month)',
      'Dedicated gaming locker',
      'Monthly gaming pack',
    ],
  },
  {
    id: 'elite',
    name: 'ELITE',
    icon: '👑',
    price: 3499,
    period: 'month',
    hours: 100,
    discount: 35,
    color: 'var(--color-primary)',
    colorDim: 'rgba(147,51,234,0.1)',
    colorBorder: 'rgba(147,51,234,0.3)',
    features: [
      'Unlimited Gaming Hours',
      '35% discount on all bookings',
      'Instant priority booking',
      'All setups + VIP lounge',
      'Unlimited tournament entries',
      'Personal gaming locker',
      'Exclusive member events',
      'Custom gaming profile badge',
      'Guest passes (2/month)',
    ],
  },
];

export default function Membership() {
  return (
    <div className="membership-page page-enter">
      <div className="container">
        <div className="membership-header">
          <div className="section-tag"><Crown size={12} /> Membership</div>
          <h1 className="section-title">Choose Your <span>Battle Plan</span></h1>
          <p className="section-desc">
            Unlock exclusive perks, discounts, and priority access. Level up your gaming experience.
          </p>
        </div>

        {/* Plans */}
        <div className="membership-grid">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`membership-card glass ${plan.popular ? 'membership-card--popular' : ''}`}
              style={{ borderColor: plan.popular ? plan.color : undefined }}
            >
              {plan.popular && (
                <div className="membership-card__popular">
                  <Star size={12} fill="currentColor" /> MOST POPULAR
                </div>
              )}

              <div className="membership-card__header" style={{ borderColor: plan.colorBorder }}>
                <div className="membership-card__icon" style={{ background: plan.colorDim, border: `1px solid ${plan.colorBorder}` }}>
                  <span style={{ fontSize: '1.5rem' }}>{plan.icon}</span>
                </div>
                <div className="membership-card__name" style={{ color: plan.color }}>
                  {plan.name}
                </div>
              </div>

              <div className="membership-card__price">
                <span className="membership-card__currency">₹</span>
                <span className="membership-card__amount">{plan.price.toLocaleString()}</span>
                <span className="membership-card__period">/{plan.period}</span>
              </div>

              <div className="membership-card__stats">
                <div className="membership-card__stat">
                  <Clock size={14} />
                  <span>{plan.hours === Infinity ? 'Unlimited' : `${plan.hours}h`} Gaming</span>
                </div>
                <div className="membership-card__stat">
                  <Zap size={14} />
                  <span>{plan.discount}% Discount</span>
                </div>
              </div>

              <ul className="membership-card__features">
                {plan.features.map((feat, i) => (
                  <li key={i}>
                    <Check size={14} style={{ color: plan.color, flexShrink: 0 }} />
                    {feat}
                  </li>
                ))}
              </ul>

              <Link
                to="/login"
                className="btn full-width membership-card__cta"
                style={plan.popular
                  ? { background: `linear-gradient(135deg, ${plan.color}, #0891b2)`, color: '#fff' }
                  : { background: plan.colorDim, border: `1px solid ${plan.colorBorder}`, color: plan.color }
                }
                id={`membership-join-${plan.id}`}
              >
                <Crown size={16} /> Join {plan.name}
              </Link>
            </div>
          ))}
        </div>

        {/* Comparison note */}
        <div className="membership-note glass" style={{ marginTop: 'var(--space-2xl)', padding: 'var(--space-xl)', textAlign: 'center' }}>
          <Trophy size={20} className="text-primary" style={{ margin: '0 auto var(--space-sm)' }} />
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            All plans include free Wi-Fi, snack discount, and access to the gaming lounge community.
            Memberships auto-renew monthly. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
