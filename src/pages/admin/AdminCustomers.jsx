import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToAllBookings, subscribeToAllUsers } from '../../firebase/firestore';
import { useToast } from '../../context/ToastContext';
import {
  Phone,
  Search,
  Users,
  UserPlus,
  Gamepad2,
  MessageSquare,
  Calendar,
  TrendingUp,
  Wallet,
  RefreshCw,
  Filter,
  Repeat,
  ShieldCheck,
  User,
} from 'lucide-react';
import { formatINR, formatPhoneNumber, getClean10Phone, getTodayString } from '../../utils/staffStats';
import './AdminCustomers.css';

export default function AdminCustomers() {
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all'); // all | walkin | registered

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let unsubB, unsubU;
    setLoading(true);
    unsubB = subscribeToAllBookings((list) => {
      setBookings(list || []);
      setLoading(false);
    });
    unsubU = subscribeToAllUsers((list) => {
      setUsers(list || []);
    });
    return () => {
      if (unsubB) unsubB();
      if (unsubU) unsubU();
    };
  }, []);

  // Build a phone-keyed customer map from bookings + users
  const customers = useMemo(() => {
    const map = new Map();

    // Registered gamers from users collection
    users.forEach((u) => {
      const clean = getClean10Phone(u.phone);
      if (clean.length < 10) return;
      const key = clean;
      const existing = map.get(key);
      if (existing) {
        existing.source = existing.source === 'registered' ? 'registered' : 'both';
        if (!existing.name && u.name) existing.name = u.name;
        return;
      }
      map.set(key, {
        key,
        phone: clean,
        name: u.name || u.displayName || 'Customer',
        email: u.email || '',
        gamerTag: u.gamerTag || '',
        source: 'registered',
        registered: true,
        visits: Number(u.visitCount) || 0,
        bookings: 0,
        gamingSpend: Number(u.totalSpent) || 0,
        lastDate: u.lastVisit || null,
        firstDate: null,
      });
    });

    // Walk-in / booking customers
    bookings.forEach((b) => {
      if (!b) return;
      const clean = getClean10Phone(b.customerPhone || b.userPhone);
      if (clean.length < 10) return;
      const key = clean;
      const existing = map.get(key) || {
        key,
        phone: clean,
        name: b.customerName || b.userName || 'Customer',
        email: '',
        gamerTag: '',
        source: 'walkin',
        registered: false,
        visits: 0,
        bookings: 0,
        gamingSpend: 0,
        lastDate: null,
        firstDate: null,
      };
      existing.bookings += 1;
      existing.visits = Math.max(existing.visits || 0, existing.bookings, 1);
      const amount = Number(b.totalAmount) || 0;
      existing.gamingSpend = Math.max(existing.gamingSpend || 0, (existing.gamingSpend || 0) + amount);
      // prefer more descriptive non-generic name
      const bn = (b.customerName || b.userName || '').trim();
      if (bn && bn.toLowerCase() !== 'your name' && bn.toLowerCase() !== 'customer') {
        existing.name = bn;
      }
      if (b.date) {
        if (!existing.firstDate || b.date < existing.firstDate) existing.firstDate = b.date;
        if (!existing.lastDate || b.date > existing.lastDate) existing.lastDate = b.date;
      }
      map.set(key, existing);
    });

    return Array.from(map.values());
  }, [bookings, users]);

  const filtered = useMemo(() => {
    let list = [...customers];
    if (sourceFilter === 'walkin') list = list.filter((c) => c.source !== 'registered');
    if (sourceFilter === 'registered') list = list.filter((c) => c.registered);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const digits = q.replace(/\D/g, '');
      list = list.filter((c) => {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const phoneMatch = digits ? c.phone.includes(digits) : false;
        const emailMatch = (c.email || '').toLowerCase().includes(q);
        return nameMatch || phoneMatch || emailMatch;
      });
    }
    // Sort by visits desc, then lastDate desc
    list.sort((a, b) => (b.visits - a.visits) || (b.lastDate || '').localeCompare(a.lastDate || ''));
    return list;
  }, [customers, search, sourceFilter]);

  const repeatCount = useMemo(() => customers.filter((c) => c.visits > 1).length, [customers]);
  const totalSpend = useMemo(() => customers.reduce((s, c) => s + c.gamingSpend, 0), [customers]);
  const phoneCount = useMemo(() => customers.filter((c) => c.phone.length >= 10).length, [customers]);

  const today = getTodayString();
  const todaySpend = useMemo(
    () => bookings.filter((b) => b.date === today).reduce((s, b) => s + (Number(b.totalAmount) || 0), 0),
    [bookings, today]
  );

  const handleBook = (c) => {
    navigate('/admin/bookings', {
      state: {
        prefillUser: { name: c.name, phone: c.phone },
      },
    });
  };

  return (
    <div className="admin-customers-page">
      {/* ── Header ── */}
      <div className="cust-page-header">
        <div className="cust-page-heading">
          <div className="cust-page-eyebrow">
            <Users size={12} /> Customer Tracking
          </div>
          <h2 className="admin-section-title">
            <div className="cust-title-icon-wrap">
              <Phone size={20} />
            </div>
            All Customers by Phone
            <span className="cust-badge-count">📇 {customers.length} Contacted</span>
          </h2>
        </div>

        <div className="cust-page-sub">
          Every customer (walk-in + registered) auto-tracked by mobile number.
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="cust-stats-grid">
        <div className="cust-stat-card">
          <div className="cust-stat-icon purple"><Users size={18} /></div>
          <div>
            <div className="cust-stat-val">{customers.length}</div>
            <div className="cust-stat-lbl">Unique Customers</div>
          </div>
        </div>
        <div className="cust-stat-card">
          <div className="cust-stat-icon green"><Phone size={18} /></div>
          <div>
            <div className="cust-stat-val">{phoneCount}</div>
            <div className="cust-stat-lbl">Phone Numbers</div>
          </div>
        </div>
        <div className="cust-stat-card">
          <div className="cust-stat-icon cyan"><Repeat size={18} /></div>
          <div>
            <div className="cust-stat-val">{repeatCount}</div>
            <div className="cust-stat-lbl">Repeat Visitors</div>
          </div>
        </div>
        <div className="cust-stat-card">
          <div className="cust-stat-icon orange"><Wallet size={18} /></div>
          <div>
            <div className="cust-stat-val">{formatINR(totalSpend)}</div>
            <div className="cust-stat-lbl">Lifetime Spend</div>
          </div>
        </div>
      </div>

      {/* ── Filter / Search ── */}
      <div className="cust-filter-bar">
        <div className="cust-search-box">
          <Search size={16} className="cust-search-icon" />
          <input
            type="text"
            className="cust-search-input"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="cust-role-filters">
          {[
            { id: 'all', label: `All (${customers.length})` },
            { id: 'walkin', label: `Walk-In (${customers.filter((c) => c.source !== 'registered').length})` },
            { id: 'registered', label: `Registered (${customers.filter((c) => c.registered).length})` },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              className={`cust-filter-btn ${sourceFilter === r.id ? 'active' : ''}`}
              onClick={() => setSourceFilter(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Empty */}
      {loading && (
        <div className="cust-empty-state">
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
          <div>Tracking customers...</div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="cust-empty-state">
          <div className="cust-empty-icon"><Users size={26} /></div>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 6 }}>No customers found</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            {search || sourceFilter !== 'all'
              ? 'No customer matches your filter.'
              : 'Customers will appear automatically once bookings are created.'}
          </p>
        </div>
      )}

      {/* ── Customer Cards Grid ── */}
      {!loading && filtered.length > 0 && (
        <div className="cust-cards-grid">
          {filtered.map((c) => {
            const waLink = `https://wa.me/91${c.phone}`;
            const callLink = `tel:+91${c.phone}`;
            return (
              <div key={c.key} className={`cust-card ${c.source === 'registered' ? 'is-registered' : ''}`}>
                <div className="cust-card-top">
                  <div className="cust-avatar">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="cust-info">
                    <div className="cust-name-row">
                      <span className="cust-name" title={c.name}>{c.name}</span>
                      {c.gamerTag && (
                        <span className="cust-tag" title="Favorite Game">🎮 {c.gamerTag}</span>
                      )}
                    </div>
                    <div className="cust-meta-row">
                      <span className={`cust-source-badge ${c.source === 'registered' ? 'reg' : 'walkin'}`}>
                        {c.source === 'registered' ? <ShieldCheck size={10} /> : <User size={10} />}
                        {c.source === 'registered' ? 'REGISTERED' : 'WALK-IN'}
                      </span>
                      <span className="cust-phone">
                        <Phone size={11} /> {formatPhoneNumber(c.phone)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="cust-stats-row">
                  <div className="cust-stat-item">
                    <div className="cust-stat-num">{c.visits}</div>
                    <div className="cust-stat-lbl">Visits</div>
                  </div>
                  <div className="cust-stat-item">
                    <div className="cust-stat-num">{c.bookings}</div>
                    <div className="cust-stat-lbl">Sessions</div>
                  </div>
                  <div className="cust-stat-item">
                    <div className="cust-stat-num">{formatINR(c.gamingSpend)}</div>
                    <div className="cust-stat-lbl">Spend</div>
                  </div>
                  <div className="cust-stat-item">
                    <div className="cust-stat-num">
                      {c.lastDate
                        ? new Date(c.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : '—'}
                    </div>
                    <div className="cust-stat-lbl">Last Visit</div>
                  </div>
                </div>

                <div className="cust-actions-row">
                  <a href={callLink} className="cust-action-btn call" title="Call customer">
                    <Phone size={13} /><span>Call</span>
                  </a>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cust-action-btn whatsapp"
                    title="Chat on WhatsApp"
                  >
                    <MessageSquare size={13} /><span>WhatsApp</span>
                  </a>
                  <button type="button" className="cust-action-btn book" onClick={() => handleBook(c)} title="Book a slot">
                    <Gamepad2 size={13} /><span>Book Slot</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
