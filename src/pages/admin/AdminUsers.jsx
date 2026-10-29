import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToAllUsers, addUser, updateUser, deleteUser } from '../../firebase/firestore';
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
} from 'lucide-react';
import { formatPhoneNumber, getClean10Phone } from '../../utils/staffStats';
import './AdminUsers.css';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'user' | 'admin'
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

  // Real-time synchronization of users collection
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAllUsers(
      (data) => {
        setUsers(data);
        setLoading(false);
      },
      (err) => {
        toast.error('Sync Error', 'Could not sync users: ' + (err?.message || 'Check Firestore'));
        setLoading(false);
      }
    );
    return () => unsub && unsub();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (roleFilter !== 'all') {
      list = list.filter((u) => (u.role || 'user').toLowerCase() === roleFilter.toLowerCase());
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const cleanDigits = q.replace(/\D/g, '');
      list = list.filter((u) => {
        const nameMatch = (u.name || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        const tagMatch = (u.gamerTag || '').toLowerCase().includes(q);
        const phoneMatch = cleanDigits
          ? getClean10Phone(u.phone).includes(cleanDigits)
          : false;
        return nameMatch || emailMatch || tagMatch || phoneMatch;
      });
    }

    return list;
  }, [users, roleFilter, search]);

  // Metric counts
  const phoneCount = useMemo(() => users.filter((u) => u.phone && getClean10Phone(u.phone).length >= 10).length, [users]);
  const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);

  // Handle Role Toggle
  const toggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await updateUser(user.id, { role: newRole });
      toast.success('Role Updated', `${user.name || 'Gamer'} is now ${newRole.toUpperCase()}.`);
    } catch (err) {
      toast.error('Error', err.message);
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
            <Users size={12} /> Gamers & Customers
          </div>
          <h2 className="admin-section-title">
            <div className="users-title-icon-wrap">
              <Users size={20} />
            </div>
            Customer Profiles
            <span className="users-badge-count">
              👥 {users.length} Registered
            </span>
          </h2>
        </div>

        <div className="users-page-actions">
          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={16} />
            <span>Add New Gamer (ॲड करा)</span>
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
            <div className="users-stat-val">{users.length}</div>
            <div className="users-stat-lbl">Total Gamers</div>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon green">
            <Phone size={18} />
          </div>
          <div>
            <div className="users-stat-val">{phoneCount}</div>
            <div className="users-stat-lbl">Phone Numbers</div>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon cyan">
            <Shield size={18} />
          </div>
          <div>
            <div className="users-stat-val">{adminCount}</div>
            <div className="users-stat-lbl">Admins & Staff</div>
          </div>
        </div>
      </div>

      {/* ── Filter / Search Bar ── */}
      <div className="users-filter-bar">
        <div className="users-search-box">
          <Search size={16} className="users-search-icon" />
          <input
            type="text"
            className="users-search-input"
            placeholder="Search gamer name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="users-role-filters">
          {[
            { id: 'all', label: `All (${users.length})` },
            { id: 'user', label: `Gamers (${users.filter((u) => u.role !== 'admin').length})` },
            { id: 'admin', label: `Admins (${adminCount})` },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              className={`users-filter-btn ${roleFilter === r.id ? 'active' : ''}`}
              onClick={() => setRoleFilter(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading & Empty States ── */}
      {loading && (
        <div className="users-empty-state">
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
          <div>Syncing gamers database...</div>
        </div>
      )}

      {!loading && filteredUsers.length === 0 && (
        <div className="users-empty-state">
          <div className="users-empty-icon">
            <Users size={26} />
          </div>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 6 }}>No gamers found</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            {search ? 'No gamer matches your search query.' : 'Click "Add New Gamer" above to register your first gamer!'}
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
      {!loading && filteredUsers.length > 0 && (
        <div className="users-cards-grid">
          {filteredUsers.map((u) => {
            const clean10 = getClean10Phone(u.phone);
            const hasPhone = clean10.length >= 10;
            const waLink = hasPhone ? `https://wa.me/91${clean10}` : null;
            const callLink = hasPhone ? `tel:+91${clean10}` : null;
            const isAdmin = u.role === 'admin';

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
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`gamer-role-badge ${isAdmin ? 'admin' : 'user'}`}>
                        {isAdmin ? <Shield size={10} /> : <User size={10} />}
                        {isAdmin ? 'ADMIN' : 'GAMER'}
                      </span>
                      <span className="gamer-joined-date">
                        Joined: {u.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) || 'Recent'}
                      </span>
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

                {/* Contact Information */}
                <div className="gamer-contact-row">
                  <div className="gamer-contact-item">
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Mobile:</span>
                    {hasPhone ? (
                      <a href={callLink} className="gamer-phone-link">
                        <Phone size={12} />
                        {formatPhoneNumber(u.phone)}
                      </a>
                    ) : (
                      <span style={{ color: '#64748b' }}>No phone</span>
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
                    <div className="gamer-contact-item" style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: 4 }}>
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
                      // Navigate to staff booking counter with customer prefilled
                      navigate('/admin/bookings', {
                        state: {
                          prefillUser: {
                            name: u.name,
                            phone: clean10,
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
                <span>Add New Gamer (नवा गेमर ॲड करा)</span>
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
                  <span>Save Gamer (जतन करा)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
