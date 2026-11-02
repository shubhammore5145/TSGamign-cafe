import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  subscribeToAllUsers,
  addUser,
  updateUser,
  deleteUser,
  subscribeToAllBookings,
  syncMissingCustomersFromBookings,
} from '../../firebase/firestore';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  UserPlus,
  Shield,
  User,
  Phone,
  Search,
  Trash2,
  X,
  Plus,
  Gamepad2,
  Sparkles,
  Check,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Flame,
  ArrowUpDown,
  Calendar,
  Wallet,
} from 'lucide-react';
import { formatPhoneNumber, getClean10Phone } from '../../utils/staffStats';
import './AdminUsers.css';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'repeat' | 'first' | 'admin'
  const [sortBy, setSortBy] = useState('most_visits'); // 'most_visits' | 'recent' | 'spend' | 'name'
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newGamer, setNewGamer] = useState({
    name: '',
    phone: '',
    email: '',
    gamerTag: '',
    notes: '',
    role: 'user',
  });

  const toast = useToast();
  const navigate = useNavigate();

  // Real-time synchronization of users & bookings collections
  useEffect(() => {
    setLoading(true);
    let unsubUsers = null;
    let unsubBookings = null;

    unsubUsers = subscribeToAllUsers(
      (data) => {
        setUsers(data || []);
        setLoading(false);
      },
      (err) => {
        console.warn('subscribeToAllUsers warning:', err?.message);
        setLoading(false);
      }
    );

    unsubBookings = subscribeToAllBookings((data) => {
      setBookings(data || []);
    });

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubBookings) unsubBookings();
    };
  }, []);

  // Compute live visits & stats for every user
  const gamersWithStats = useMemo(() => {
    // 1. Group bookings by clean 10-digit phone and by userId
    const bookingsByPhone = new Map();
    const bookingsByUid = new Map();

    bookings.forEach((b) => {
      if (!b || b.status === 'cancelled') return;
      const cleanP = getClean10Phone(b.userPhone || b.customerPhone || b.phone);
      if (cleanP.length >= 10) {
        const list = bookingsByPhone.get(cleanP) || [];
        list.push(b);
        bookingsByPhone.set(cleanP, list);
      }
      if (b.userId) {
        const list = bookingsByUid.get(b.userId) || [];
        list.push(b);
        bookingsByUid.set(b.userId, list);
      }
    });

    return users.map((u) => {
      const cleanP = getClean10Phone(u.phone);
      const phoneBookings = cleanP.length >= 10 ? (bookingsByPhone.get(cleanP) || []) : [];
      const uidBookings = u.id ? (bookingsByUid.get(u.id) || []) : [];

      // Combine unique bookings
      const bSet = new Set();
      const combined = [];
      [...phoneBookings, ...uidBookings].forEach((b) => {
        if (!bSet.has(b.id)) {
          bSet.add(b.id);
          combined.push(b);
        }
      });

      // Accurate visit count: Math.max of stored visitCount and actual matching bookings
      const storedVisits = Number(u.visitCount) || 0;
      const totalVisits = Math.max(storedVisits, combined.length, 1);

      // Total money spent on cafe & PlayStation
      const bookingsSpend = combined.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
      const totalSpend = Math.max(Number(u.totalSpent) || 0, bookingsSpend);

      // Find latest visit date
      let lastVisitDate = u.lastVisit || null;
      combined.forEach((b) => {
        if (b.date && (!lastVisitDate || b.date > lastVisitDate)) {
          lastVisitDate = b.date;
        }
      });

      return {
        ...u,
        clean10Phone: cleanP,
        visitsCount: totalVisits,
        totalSpend,
        lastVisitDate,
        bookingsCount: combined.length,
      };
    });
  }, [users, bookings]);

  // Metric counts
  const phoneCount = useMemo(() => gamersWithStats.filter((u) => u.clean10Phone.length >= 10).length, [gamersWithStats]);
  const adminCount = useMemo(() => gamersWithStats.filter((u) => u.role === 'admin').length, [gamersWithStats]);
  const repeatCount = useMemo(() => gamersWithStats.filter((u) => u.visitsCount >= 2 && u.role !== 'admin').length, [gamersWithStats]);
  const firstTimerCount = useMemo(() => gamersWithStats.filter((u) => u.visitsCount === 1 && u.role !== 'admin').length, [gamersWithStats]);
  const totalVisitsSum = useMemo(() => gamersWithStats.reduce((sum, u) => sum + (u.visitsCount || 1), 0), [gamersWithStats]);

  // Filtered & Sorted gamers list
  const filteredGamers = useMemo(() => {
    let list = [...gamersWithStats];

    if (filterTab === 'repeat') {
      list = list.filter((u) => u.visitsCount >= 2 && u.role !== 'admin');
    } else if (filterTab === 'first') {
      list = list.filter((u) => u.visitsCount === 1 && u.role !== 'admin');
    } else if (filterTab === 'admin') {
      list = list.filter((u) => u.role === 'admin');
    } else if (filterTab === 'user') {
      list = list.filter((u) => u.role !== 'admin');
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const cleanDigits = q.replace(/\D/g, '');
      list = list.filter((u) => {
        const nameMatch = (u.name || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        const tagMatch = (u.gamerTag || '').toLowerCase().includes(q);
        const phoneMatch = cleanDigits ? u.clean10Phone.includes(cleanDigits) : false;
        return nameMatch || emailMatch || tagMatch || phoneMatch;
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'most_visits') {
        return (b.visitsCount || 0) - (a.visitsCount || 0);
      }
      if (sortBy === 'spend') {
        return (b.totalSpend || 0) - (a.totalSpend || 0);
      }
      if (sortBy === 'recent') {
        const dateA = a.lastVisitDate || (a.createdAt?.toDate ? a.createdAt.toDate().toISOString() : '0');
        const dateB = b.lastVisitDate || (b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : '0');
        return dateB.localeCompare(dateA);
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    return list;
  }, [gamersWithStats, filterTab, search, sortBy]);

  // Handle Sync from Bookings History
  const handleSyncFromBookings = async () => {
    setSyncing(true);
    try {
      const res = await syncMissingCustomersFromBookings();
      toast.success(
        'Synced with History! 🎮',
        `Processed ${res.totalAggregated} customer phones (${res.createdCount} new registered, ${res.updatedCount} visits updated).`
      );
    } catch (err) {
      toast.error('Sync Failed', err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Handle Delete User
  const handleDelete = async (user) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${user.name || 'this gamer'}"?`);
    if (!confirmDelete) return;

    try {
      await deleteUser(user.id);
      toast.success('Deleted', `${user.name || 'Gamer'} was removed.`);
    } catch (err) {
      toast.error('Delete Failed', err.message);
    }
  };

  // Handle Add New Gamer Form Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newGamer.name.trim()) {
      return toast.warning('Name Required', 'Please enter gamer full name.');
    }

    const cleanPhone = getClean10Phone(newGamer.phone);
    if (newGamer.phone && cleanPhone.length !== 10) {
      return toast.warning('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
    }

    setSubmitting(true);
    try {
      await addUser({
        name: newGamer.name.trim(),
        phone: cleanPhone || '',
        email: newGamer.email.trim() || '',
        gamerTag: newGamer.gamerTag.trim() || '',
        notes: newGamer.notes.trim() || '',
        role: newGamer.role || 'user',
        visitCount: 1,
        totalSpent: 0,
      });

      toast.success('Gamer Registered! 🎮', `${newGamer.name} added to database.`);
      setShowAddModal(false);
      setNewGamer({
        name: '',
        phone: '',
        email: '',
        gamerTag: '',
        notes: '',
        role: 'user',
      });
    } catch (err) {
      toast.error('Add Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-users-page">
      {/* ── Page Header ── */}
      <div className="users-page-header">
        <div className="users-page-heading">
          <div className="users-page-eyebrow">
            <Users size={12} /> Gamers & Customers Database
          </div>
          <h2 className="admin-section-title">
            <div className="users-title-icon-wrap">
              <Users size={20} />
            </div>
            Customer Profiles
            <span className="users-badge-count">
              👥 {gamersWithStats.length} Registered
            </span>
          </h2>
        </div>

        <div className="users-page-actions">
          <button
            type="button"
            className="users-sync-btn"
            onClick={handleSyncFromBookings}
            disabled={syncing}
            title="Sync all customers and their visit counts from past booking records"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync From Bookings'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={16} />
            <span>Add Gamer</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metrics Strip ── */}
      <div className="users-stats-grid">
        <div className="users-stat-card">
          <div className="users-stat-icon purple">
            <Users size={18} />
          </div>
          <div>
            <div className="users-stat-val">{gamersWithStats.length}</div>
            <div className="users-stat-lbl">Total Gamers</div>
          </div>
        </div>

        <div className="users-stat-card" style={{ borderColor: 'rgba(245, 158, 11, 0.35)' }}>
          <div className="users-stat-icon amber" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
            <Flame size={18} />
          </div>
          <div>
            <div className="users-stat-val" style={{ color: '#fbbf24' }}>{repeatCount}</div>
            <div className="users-stat-lbl">Repeat Gamers (2+ Visits)</div>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon cyan">
            <Gamepad2 size={18} />
          </div>
          <div>
            <div className="users-stat-val">{totalVisitsSum}</div>
            <div className="users-stat-lbl">Total Visits</div>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon green">
            <Phone size={18} />
          </div>
          <div>
            <div className="users-stat-val">{phoneCount}</div>
            <div className="users-stat-lbl">With Mobile No.</div>
          </div>
        </div>
      </div>

      {/* ── Filter / Search / Sort Bar ── */}
      <div className="users-filter-bar">
        <div className="users-search-box">
          <Search size={16} className="users-search-icon" />
          <input
            type="text"
            className="users-search-input"
            placeholder="Search gamer name, phone, or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="users-role-filters">
          {[
            { id: 'all', label: `All (${gamersWithStats.length})` },
            { id: 'repeat', label: `🔥 Regulars (${repeatCount})` },
            { id: 'first', label: `🌱 1st Visit (${firstTimerCount})` },
            { id: 'admin', label: `Admins (${adminCount})` },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              className={`users-filter-btn ${filterTab === r.id ? 'active' : ''}`}
              onClick={() => setFilterTab(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowUpDown size={14} style={{ color: '#94a3b8' }} />
          <select
            className="users-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Sort gamers list"
          >
            <option value="most_visits">🔥 Most Visits</option>
            <option value="recent">🕒 Recently Visited</option>
            <option value="spend">💰 Highest Spend</option>
            <option value="name">🔤 Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="users-empty-state">
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
          <div>Syncing gamers database...</div>
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && filteredGamers.length === 0 && (
        <div className="users-empty-state">
          <div className="users-empty-icon">
            <Users size={26} />
          </div>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 6 }}>No gamers found</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            {search ? 'No gamer matches your search query.' : 'Click "Add Gamer" above or make a booking to save customer details!'}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ marginTop: 14 }}
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={14} style={{ marginRight: 6 }} /> Add Gamer Now
          </button>
        </div>
      )}

      {/* ── Gamers Cards Grid (Thumb & Mobile Friendly) ── */}
      {!loading && filteredGamers.length > 0 && (
        <div className="users-cards-grid">
          {filteredGamers.map((u) => {
            const hasPhone = u.clean10Phone.length >= 10;
            const waLink = hasPhone ? `https://wa.me/91${u.clean10Phone}` : null;
            const callLink = hasPhone ? `tel:+91${u.clean10Phone}` : null;
            const isAdmin = u.role === 'admin';
            const visits = u.visitsCount || 1;

            return (
              <div key={u.id} className={`gamer-card ${isAdmin ? 'is-admin' : ''}`}>
                <div className="gamer-card-top">
                  <img
                    src={
                      u.photoURL ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'Gamer')}&background=9333ea&color=fff&size=80`
                    }
                    alt={u.name || 'Gamer'}
                    className="gamer-avatar"
                  />
                  <div className="gamer-info">
                    <div className="gamer-name-row">
                      <span className="gamer-name" title={u.name}>
                        {u.name || 'Gamer'}
                      </span>
                      {u.gamerTag && (
                        <span className="gamer-tag" title="Favorite Game / Tag">
                          🎮 {u.gamerTag}
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className={`gamer-role-badge ${isAdmin ? 'admin' : 'user'}`}>
                        {isAdmin ? <Shield size={10} /> : <User size={10} />}
                        {isAdmin ? 'ADMIN' : 'GAMER'}
                      </span>

                      {/* Prominent Visit Count Badge (Customer Visit Count) */}
                      {!isAdmin && (
                        <span
                          className={`gamer-visit-badge ${
                            visits >= 5 ? 'vip' : visits >= 2 ? 'repeat' : 'first'
                          }`}
                          title={`Customer visit count: ${visits} times`}
                        >
                          {visits >= 5 ? (
                            <>👑 <strong>{visits} Visits</strong> (VIP Regular)</>
                          ) : visits >= 2 ? (
                            <>🔥 <strong>{visits} Visits</strong> (Regular)</>
                          ) : (
                            <>🌱 <strong>1st Visit</strong> (New Gamer)</>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Dropdown / Trash */}
                  <button
                    type="button"
                    className="gamer-icon-btn danger"
                    title="Delete Gamer Profile"
                    onClick={() => handleDelete(u)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Customer Gaming Activity Strip (Visits, Spend, Last Visit) */}
                {!isAdmin && (
                  <div className="gamer-metrics-strip">
                    <div className="gamer-metric-pill" title="Total Visits to TS Gaming Cafe">
                      <span className="metric-icon">🔁</span>
                      <div>
                        <div className="metric-val">{visits} Visits</div>
                        <div className="metric-lbl">Total Visits</div>
                      </div>
                    </div>

                    <div className="gamer-metric-pill" title="Total Spent on Gaming & Cafe">
                      <span className="metric-icon">💰</span>
                      <div>
                        <div className="metric-val">₹{Number(u.totalSpend || 0).toLocaleString('en-IN')}</div>
                        <div className="metric-lbl">Total Spent</div>
                      </div>
                    </div>

                    <div className="gamer-metric-pill" title="Latest Visit Date">
                      <span className="metric-icon">📅</span>
                      <div>
                        <div className="metric-val">
                          {u.lastVisitDate ? u.lastVisitDate : 'Recent'}
                        </div>
                        <div className="metric-lbl">Last Visit</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <div className="gamer-contact-row">
                  <div className="gamer-contact-item">
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Mobile Number:</span>
                    {hasPhone ? (
                      <a href={callLink} className="gamer-phone-link">
                        <Phone size={12} />
                        {formatPhoneNumber(u.phone)}
                      </a>
                    ) : (
                      <span style={{ color: '#64748b' }}>No phone saved</span>
                    )}
                  </div>
                  {u.email && (
                    <div className="gamer-contact-item">
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Email:</span>
                      <span className="gamer-email-text" title={u.email}>
                        {u.email}
                      </span>
                    </div>
                  )}
                  {u.notes && (
                    <div
                      className="gamer-contact-item"
                      style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: 4 }}
                    >
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Note:</span>
                      <span style={{ color: '#e2e8f0', fontSize: '0.75rem' }}>{u.notes}</span>
                    </div>
                  )}
                </div>

                {/* Quick Action Buttons (Call, WhatsApp, Book Slot) */}
                <div className="gamer-actions-row">
                  {hasPhone && (
                    <>
                      <a href={callLink} className="gamer-action-btn call" title="Call Gamer">
                        <Phone size={13} />
                        <span>Call</span>
                      </a>
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gamer-action-btn whatsapp"
                        title="Chat on WhatsApp"
                      >
                        <MessageSquare size={13} />
                        <span>WhatsApp</span>
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    className="gamer-action-btn book"
                    onClick={() => {
                      navigate('/admin/bookings', {
                        state: {
                          prefillUser: {
                            name: u.name,
                            phone: u.clean10Phone,
                          },
                        },
                      });
                    }}
                    title="Book PlayStation slot for this gamer"
                  >
                    <Gamepad2 size={13} />
                    <span>Book Slot</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add New Gamer Modal ── */}
      {showAddModal && (
        <div className="gamer-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="gamer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gamer-modal-header">
              <div className="gamer-modal-title">
                <UserPlus size={18} style={{ color: '#a855f7' }} />
                <span>Add New Gamer</span>
              </div>
              <button
                type="button"
                className="gamer-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="gamer-modal-body">
                {/* Full Name */}
                <div className="gamer-input-group">
                  <label className="gamer-input-label">
                    <span>Gamer Name *</span>
                    <span style={{ color: '#a855f7', fontSize: '0.7rem' }}>Required</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="gamer-input-field"
                    placeholder="e.g. Rohan Patil"
                    value={newGamer.name}
                    onChange={(e) => setNewGamer((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                {/* Mobile Phone */}
                <div className="gamer-input-group">
                  <label className="gamer-input-label">
                    <span>Mobile Phone Number</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>10 Digits</span>
                  </label>
                  <input
                    type="tel"
                    className="gamer-input-field"
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    value={newGamer.phone}
                    onChange={(e) =>
                      setNewGamer((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))
                    }
                  />
                </div>

                {/* Favorite Game / Tag */}
                <div className="gamer-input-group">
                  <label className="gamer-input-label">
                    <span>Favorite Game / Tag (Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="gamer-input-field"
                    placeholder="e.g. PS5 FIFA 24 / GTA V"
                    value={newGamer.gamerTag}
                    onChange={(e) => setNewGamer((prev) => ({ ...prev, gamerTag: e.target.value }))}
                  />
                </div>

                {/* Email (Optional) */}
                <div className="gamer-input-group">
                  <label className="gamer-input-label">
                    <span>Email Address (Optional)</span>
                  </label>
                  <input
                    type="email"
                    className="gamer-input-field"
                    placeholder="e.g. rohan@gmail.com"
                    value={newGamer.email}
                    onChange={(e) => setNewGamer((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                {/* Notes (Optional) */}
                <div className="gamer-input-group">
                  <label className="gamer-input-label">
                    <span>Staff Notes (Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="gamer-input-field"
                    placeholder="e.g. Regular college customer, prefers PS5 Setup 1"
                    value={newGamer.notes}
                    onChange={(e) => setNewGamer((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="gamer-modal-footer">
                <button
                  type="button"
                  className="gamer-btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="gamer-btn-submit"
                >
                  {submitting ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>Save Gamer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
