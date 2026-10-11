import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeToStaff,
  subscribeToAllBookings,
  addStaff,
  updateStaff,
  deleteStaff,
} from '../../firebase/firestore';
import { isAdminLoggedIn } from '../../utils/adminAuth';
import { calculateStaffStats, calculateAllStaffSummary } from '../../utils/staffStats';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  UserPlus,
  ShieldAlert,
  Phone,
  Clock,
  KeyRound,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  X,
  DollarSign,
  TrendingUp,
  Receipt,
  LayoutGrid,
  Table,
} from 'lucide-react';
import './Admin.css';

const ROLES = [
  'Counter Operator',
  'Gaming Assistant / Host',
  'Hardware / Technician',
  'Cafe Manager',
  'General Staff',
];

const SHIFTS = [
  'Morning (09:00 AM - 03:00 PM)',
  'Evening (03:00 PM - 10:00 PM)',
  'Full Day (09:00 AM - 10:00 PM)',
  'Part Time / Flexible',
];

export default function AdminStaff() {
  const isAdmin = isAdminLoggedIn();
  const toast = useToast();

  const [staffList, setStaffList] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [viewTab, setViewTab] = useState('cards'); // 'cards' | 'report'

  // PIN visibility map { [staffId]: boolean }
  const [showPins, setShowPins] = useState({});

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'Counter Operator',
    pin: '',
    shift: 'Morning (09:00 AM - 03:00 PM)',
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    const unsubStaff = subscribeToStaff((list) => {
      setStaffList(list || []);
      setLoading(false);
    });
    const unsubBookings = subscribeToAllBookings((bList) => {
      setBookings(bList || []);
    });
    return () => {
      unsubStaff && unsubStaff();
      unsubBookings && unsubBookings();
    };
  }, []);

  // Performance calculation for all staff members
  const { summary: staffSummaryList, totals: overallTotals } = useMemo(() => {
    return calculateAllStaffSummary(staffList, bookings);
  }, [staffList, bookings]);

  const togglePinVisibility = (id) => {
    setShowPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    const randomPin = String(Math.floor(1000 + Math.random() * 9000));
    setFormData({
      name: '',
      phone: '',
      role: 'Counter Operator',
      pin: randomPin,
      shift: 'Morning (09:00 AM - 03:00 PM)',
      status: 'active',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name || '',
      phone: staff.phone || '',
      role: staff.role || 'Counter Operator',
      pin: staff.pin || '1234',
      shift: staff.shift || 'Morning (09:00 AM - 03:00 PM)',
      status: staff.status || 'active',
      notes: staff.notes || '',
    });
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Validation Error', 'Staff name is required.');
      return;
    }
    if (!formData.pin.trim()) {
      toast.error('Validation Error', 'Staff PIN is required.');
      return;
    }

    try {
      if (editingStaff) {
        await updateStaff(editingStaff.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
          pin: formData.pin.trim(),
          shift: formData.shift,
          status: formData.status,
          notes: formData.notes.trim(),
        });
        toast.success('Staff Updated', `${formData.name} updated successfully!`);
        setEditingStaff(null);
      } else {
        await addStaff({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
          pin: formData.pin.trim(),
          shift: formData.shift,
          status: formData.status,
          notes: formData.notes.trim(),
        });
        toast.success('Staff Added', `🎉 ${formData.name} has been added as ${formData.role}!`);
        setShowAddModal(false);
      }
    } catch (err) {
      toast.error('Save Failed', err.message);
    }
  };

  const handleToggleStatus = async (staff) => {
    const newStatus = staff.status === 'active' ? 'inactive' : 'active';
    try {
      await updateStaff(staff.id, { status: newStatus });
      toast.info(
        'Status Changed',
        `${staff.name} is now ${newStatus === 'active' ? 'Active (can login)' : 'Inactive (cannot login)'}.`
      );
    } catch (err) {
      toast.error('Error', err.message);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStaff(deleteTarget.id);
      toast.success('Staff Deleted', `${deleteTarget.name} has been removed.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Error', err.message);
    }
  };

  // If non-admin logged in and tries to access Staff Management
  if (!isAdmin) {
    return (
      <div style={{
        maxWidth: 600,
        margin: '60px auto',
        padding: 'var(--space-2xl)',
        textAlign: 'center',
      }} className="glass">
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          color: 'var(--color-danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-md)',
        }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ color: '#fff', marginBottom: 'var(--space-sm)' }}>Access Restricted</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)', fontSize: '0.9rem' }}>
          Staff Management and Collection Analytics are only accessible by the Super Admin / Cafe Owner.
        </p>
        <Link to="/admin" className="btn btn-primary">
          ← Back to Bookings & Slots
        </Link>
      </div>
    );
  }

  // Filter staff
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || '').includes(searchTerm) ||
      (s.role || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'active') return matchesSearch && s.status === 'active';
    if (statusFilter === 'inactive') return matchesSearch && s.status === 'inactive';
    return matchesSearch;
  });

  const activeCount = staffList.filter((s) => s.status === 'active').length;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="admin-section-header" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-md)' }}>
        <div>
          <h2 className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={24} style={{ color: 'var(--color-primary)' }} />
            Staff Management & Collection Report
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            कर्मचाऱ्यांची यादी, शिफ्ट, लॉगिन PIN आणि प्रत्येकाने केलेल्या बुकिंग्स व कलेक्शनचा हिशोब.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Tab Switcher: Cards vs Report Table */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: 3, borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setViewTab('cards')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                background: viewTab === 'cards' ? 'var(--color-primary)' : 'transparent',
                color: viewTab === 'cards' ? '#fff' : 'var(--color-text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <LayoutGrid size={13} /> Staff Cards
            </button>
            <button
              onClick={() => setViewTab('report')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                background: viewTab === 'report' ? 'var(--color-primary)' : 'transparent',
                color: viewTab === 'report' ? '#fff' : 'var(--color-text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Table size={13} /> Collection Report (हिशोब)
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <UserPlus size={16} /> Add New Staff
          </button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-lg)',
      }}>
        <div className="glass" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-dim)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{staffList.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Total Staff ({activeCount} Active)</div>
          </div>
        </div>

        <div className="glass" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
              ₹{overallTotals.todayCollection}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
              आजचे स्टाफ कलेक्शन ({overallTotals.todayCount} Bookings)
            </div>
          </div>
        </div>

        <div className="glass" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
              ₹{overallTotals.todayCash} <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>Cash</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
              UPI: ₹{overallTotals.todayUpi}
            </div>
          </div>
        </div>

        <div className="glass" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(6, 182, 212, 0.15)',
            color: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-accent)' }}>
              ₹{overallTotals.allTimeCollection}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
              एकूण ऑल-टाईम कलेक्शन ({overallTotals.allTimeCount} Bookings)
            </div>
          </div>
        </div>
      </div>

      {/* ─── VIEW 1: STAFF CARDS VIEW ─── */}
      {viewTab === 'cards' && (
        <>
          {/* Search and Filters */}
          <div className="glass" style={{
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-xl)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone or role..."
                className="form-input"
                style={{ paddingLeft: 38, height: 38, fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'active', 'inactive'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className="btn btn-sm"
                  style={{
                    textTransform: 'capitalize',
                    background: statusFilter === tab ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                    color: statusFilter === tab ? '#fff' : 'var(--color-text-dim)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                >
                  {tab === 'all' ? 'All Staff' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Staff Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 'var(--space-lg)',
          }}>
            {filteredStaff.map((staff) => {
              const isActive = staff.status === 'active';
              const isPinVisible = showPins[staff.id];
              const stats = calculateStaffStats(staff.id, staff.name, bookings);

              return (
                <div
                  key={staff.id}
                  className="glass"
                  style={{
                    padding: 'var(--space-lg)',
                    borderRadius: 'var(--radius-lg)',
                    border: isActive
                      ? '1px solid rgba(147, 51, 234, 0.25)'
                      : '1px solid rgba(239, 68, 68, 0.2)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    boxShadow: isActive ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
                    opacity: isActive ? 1 : 0.75,
                  }}
                >
                  <div>
                    {/* Header with avatar, name and status */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: isActive
                            ? 'linear-gradient(135deg, var(--color-primary), var(--color-accent))'
                            : '#334155',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          boxShadow: isActive ? '0 0 12px rgba(147,51,234,0.4)' : 'none',
                          flexShrink: 0,
                        }}>
                          {(staff.name || 'S')[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                            {staff.name}
                          </h3>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: 'rgba(147, 51, 234, 0.15)',
                            color: 'var(--color-primary-light)',
                            border: '1px solid rgba(147, 51, 234, 0.3)',
                          }}>
                            {staff.role || 'Staff Member'}
                          </span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 12,
                        background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isActive ? '#10b981' : '#ef4444',
                        border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      }}>
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isActive ? '#10b981' : '#ef4444',
                        }} />
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    {/* Details Section */}
                    <div style={{
                      marginTop: 'var(--space-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      fontSize: '0.8rem',
                      color: 'var(--color-text-dim)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      {/* Phone */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Phone size={13} style={{ color: 'var(--color-primary)' }} /> Mobile:
                        </span>
                        <a
                          href={staff.phone ? `tel:${staff.phone}` : '#'}
                          style={{ color: '#fff', fontWeight: 600, textDecoration: 'none' }}
                        >
                          {staff.phone || '—'}
                        </a>
                      </div>

                      {/* Shift */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={13} style={{ color: 'var(--color-secondary)' }} /> Shift:
                        </span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>{staff.shift || 'Flexible'}</span>
                      </div>

                      {/* Security PIN */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <KeyRound size={13} style={{ color: '#f59e0b' }} /> Login PIN:
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            color: '#f59e0b',
                            letterSpacing: isPinVisible ? 'normal' : '0.2em',
                            background: 'rgba(245, 158, 11, 0.1)',
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}>
                            {isPinVisible ? staff.pin : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePinVisibility(staff.id)}
                            className="btn btn-icon btn-ghost btn-xs"
                            style={{ padding: 2, height: 24, width: 24 }}
                            title={isPinVisible ? 'Hide PIN' : 'View PIN'}
                          >
                            {isPinVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* Staff Live Collection & Bookings Performance Strip */}
                      <div style={{
                        marginTop: 4,
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(16, 185, 129, 0.08))',
                        border: '1px solid rgba(147, 51, 234, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>
                            🎯 आजचे काम (Today):
                          </span>
                          <span style={{ color: '#fff', fontWeight: 800 }}>
                            {stats.todayCount} Bookings • <span style={{ color: '#10b981' }}>₹{stats.todayCollection}</span>
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
                          <span>💵 Cash: <strong style={{ color: '#f59e0b' }}>₹{stats.todayCash}</strong></span>
                          <span>📱 UPI: <strong style={{ color: 'var(--color-accent)' }}>₹{stats.todayUpi}</strong></span>
                        </div>

                        <div style={{
                          borderTop: '1px dashed rgba(255,255,255,0.08)',
                          paddingTop: 5,
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.72rem',
                        }}>
                          <span style={{ color: 'var(--color-text-dim)' }}>🏆 एकूण हिशोब (All-Time):</span>
                          <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                            {stats.allTimeCount} Bks • ₹{stats.allTimeCollection}
                          </span>
                        </div>
                      </div>

                      {staff.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                          📝 {staff.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    paddingTop: 12,
                  }}>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(staff)}
                      className={`btn btn-sm ${isActive ? 'btn-ghost' : 'btn-primary'}`}
                      style={{
                        flex: 1,
                        fontSize: '0.75rem',
                        height: 32,
                        borderColor: isActive ? 'rgba(255,255,255,0.1)' : undefined,
                      }}
                    >
                      {isActive ? 'Deactivate' : 'Activate Staff'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(staff)}
                      className="btn btn-sm btn-ghost"
                      style={{ fontSize: '0.75rem', height: 32, padding: '0 10px' }}
                      title="Edit staff details"
                    >
                      <Edit2 size={13} /> Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(staff)}
                      className="btn btn-sm btn-ghost"
                      style={{ fontSize: '0.75rem', height: 32, padding: '0 10px', color: 'var(--color-danger)' }}
                      title="Delete staff"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── VIEW 2: STAFF PERFORMANCE & COLLECTION REPORT TABLE ─── */}
      {viewTab === 'report' && (
        <div className="glass admin-table-wrap" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                📊 Staff Duty & Collection Report (कलेक्शन व बुकिंग रिपोर्ट)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', margin: '3px 0 0' }}>
                प्रत्येक कर्मचाऱ्याने आज आणि आतापर्यंत किती बुकिंग्स घेतल्या व किती रोख/ऑनलाइन रक्कम गोळा केली त्याचा तपशील.
              </p>
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Duty Shift</th>
                <th>Today's Bookings</th>
                <th>Today's Cash (रोख)</th>
                <th>Today's UPI (ऑनलाइन)</th>
                <th>Today's Collection</th>
                <th>All-Time Bookings</th>
                <th>All-Time Collection</th>
              </tr>
            </thead>
            <tbody>
              {staffSummaryList.map(({ staff, todayCount, todayCash, todayUpi, todayCollection, allTimeCount, allTimeCollection }) => (
                <tr key={staff.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                      }}>
                        {(staff.name || 'S')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>{staff.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>{staff.role}</div>
                      </div>
                    </div>
                  </td>

                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                    {staff.shift || 'Flexible'}
                  </td>

                  <td>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      color: todayCount > 0 ? 'var(--color-primary-light)' : 'var(--color-text-dim)',
                    }}>
                      {todayCount}
                    </span>
                  </td>

                  <td>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>₹{todayCash}</span>
                  </td>

                  <td>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>₹{todayUpi}</span>
                  </td>

                  <td>
                    <span style={{
                      color: '#10b981',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: todayCollection > 0 ? 'rgba(16,185,129,0.12)' : 'transparent',
                    }}>
                      ₹{todayCollection}
                    </span>
                  </td>

                  <td style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                    {allTimeCount}
                  </td>

                  <td>
                    <strong style={{ color: '#fff' }}>₹{allTimeCollection}</strong>
                  </td>
                </tr>
              ))}

              {/* Cafe Total Row */}
              <tr style={{
                background: 'rgba(147, 51, 234, 0.12)',
                borderTop: '2px solid rgba(147, 51, 234, 0.3)',
                fontWeight: 800,
              }}>
                <td colSpan={2} style={{ color: '#fff', fontSize: '0.9rem' }}>
                  ⚡ एकूण कॅफे बेरीज (CAFE TOTAL)
                </td>
                <td style={{ color: 'var(--color-primary-light)', fontSize: '1rem' }}>
                  {overallTotals.todayCount}
                </td>
                <td style={{ color: '#f59e0b', fontSize: '0.95rem' }}>
                  ₹{overallTotals.todayCash}
                </td>
                <td style={{ color: 'var(--color-accent)', fontSize: '0.95rem' }}>
                  ₹{overallTotals.todayUpi}
                </td>
                <td style={{ color: '#10b981', fontSize: '1.05rem' }}>
                  ₹{overallTotals.todayCollection}
                </td>
                <td style={{ color: '#fff' }}>
                  {overallTotals.allTimeCount}
                </td>
                <td style={{ color: 'var(--color-primary-light)', fontSize: '1rem' }}>
                  ₹{overallTotals.allTimeCollection}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredStaff.length === 0 && (
        <div className="glass" style={{
          textAlign: 'center',
          padding: '60px 20px',
          borderRadius: 'var(--radius-lg)',
          marginTop: 'var(--space-xl)',
        }}>
          <Users size={48} style={{ color: 'var(--color-text-dim)', marginBottom: 12 }} />
          <h3 style={{ color: '#fff', marginBottom: 6 }}>No Staff Members Found</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            {searchTerm ? 'No results matched your search query.' : 'Click Add New Staff to register your first cafe worker.'}
          </p>
          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
            <UserPlus size={14} /> Add First Staff
          </button>
        </div>
      )}

      {/* ─── ADD / EDIT MODAL ─── */}
      {(showAddModal || editingStaff) && (
        <div className="modal-backdrop" onClick={() => { setShowAddModal(false); setEditingStaff(null); }}>
          <div
            className="modal-box glass-strong"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 500, width: '92%' }}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingStaff ? <Edit2 size={18} /> : <UserPlus size={18} />}
                {editingStaff ? 'Edit Staff Member' : 'Register New Staff Member'}
              </h3>
              <button
                className="btn-close"
                onClick={() => { setShowAddModal(false); setEditingStaff(null); }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">FULL NAME (कर्मचाऱ्याचे पूर्ण नाव) *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Shinde"
                  className="form-input"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">PHONE NUMBER (मोबाईल)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>LOGIN PIN *</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pin: String(Math.floor(1000 + Math.random() * 9000)) })}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      🎲 Generate
                    </button>
                  </label>
                  <input
                    type="text"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="e.g. 1234"
                    className="form-input"
                    style={{ fontWeight: 700, letterSpacing: '0.15em' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ROLE / DESIGNATION (पद)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="form-input"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">DUTY SHIFT (शिफ्ट वेळ)</label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  className="form-input"
                >
                  {SHIFTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ACCOUNT STATUS</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={() => setFormData({ ...formData, status: 'active' })}
                    />
                    <span style={{ color: '#10b981', fontWeight: 600 }}>🟢 Active (Can Login)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formData.status === 'inactive'}
                      onChange={() => setFormData({ ...formData, status: 'inactive' })}
                    />
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>🔴 Inactive (Disabled)</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">NOTES / ADDRESS (पर्यायी)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Counter handling, morning batch"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => { setShowAddModal(false); setEditingStaff(null); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {editingStaff ? 'Save Changes' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL ─── */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-box glass-strong"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420, textAlign: 'center' }}
          >
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-md)',
            }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ color: '#fff', marginBottom: 6 }}>Delete Staff Member?</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              Are you sure you want to remove <strong>"{deleteTarget.name}"</strong>?
              They will no longer be able to log in to the staff duty portal.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ flex: 1, background: '#ef4444', color: '#fff' }}
                onClick={handleDeleteStaff}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
