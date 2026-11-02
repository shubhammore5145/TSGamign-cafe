import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeToStaff,
  subscribeToAllBookings,
  subscribeToFoodSales,
  addStaff,
  updateStaff,
  deleteStaff,
} from '../../firebase/firestore';
import { isAdminLoggedIn, isStaffLoggedIn, getStaffUser } from '../../utils/adminAuth';
import {
  calculateStaffStats,
  calculateAllStaffSummary,
  isBookingHandledByStaff,
  isFoodSaleHandledByStaff,
  formatINR,
  formatPhoneNumber,
  getClean10Phone,
  isStaffCurrentlyOnShift,
  generateStaffCredentialsMessage,
  getTodayString,
} from '../../utils/staffStats';
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
  Search,
  X,
  DollarSign,
  TrendingUp,
  Receipt,
  LayoutGrid,
  Layers,
  Table,
  MessageSquare,
  Copy,
  Check,
  Share2,
  Printer,
  Gamepad2,
  Coffee,
  Sparkles,
  Filter,
  Calendar,
  Zap,
  LayoutDashboard,
} from 'lucide-react';
import './Admin.css';
import './AdminStaff.css';

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
  const isStaff = isStaffLoggedIn();
  const staffUser = getStaffUser();
  const toast = useToast();

  const [staffList, setStaffList] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [foodSales, setFoodSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [roleFilter, setRoleFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [viewTab, setViewTab] = useState('overview'); // 'overview' | 'cards' | 'report'

  // PIN visibility map { [staffId]: boolean }
  const [showPins, setShowPins] = useState({});

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form state with enhanced fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'Counter Operator',
    pin: '',
    shift: 'Morning (09:00 AM - 03:00 PM)',
    status: 'active',
    joiningDate: getTodayString(),
    emergencyContact: '',
    upiId: '',
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
    const unsubFood = subscribeToFoodSales((fList) => {
      setFoodSales(fList || []);
    });
    return () => {
      unsubStaff && unsubStaff();
      unsubBookings && unsubBookings();
      unsubFood && unsubFood();
    };
  }, []);

  // Performance calculation for all staff members (includes food sales!)
  const { summary: staffSummaryList, totals: overallTotals } = useMemo(() => {
    return calculateAllStaffSummary(staffList, bookings, foodSales);
  }, [staffList, bookings, foodSales]);

  // Count currently on duty staff members
  const onDutyCount = useMemo(() => {
    return staffList.filter((s) => isStaffCurrentlyOnShift(s.shift, s.status)).length;
  }, [staffList]);

  // ── Full Business Overview (Overview Dashboard tab) ──
  const overview = useMemo(() => {
    const today = getTodayString();
    const validBookings = bookings.filter((b) => b && b.status !== 'cancelled');
    const todayBookings = validBookings.filter((b) => b.date === today);
    const todayFood = foodSales.filter((s) => s && s.date === today);

    const todayGamingRevenue = todayBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const todayGamingCash = todayBookings
      .filter((b) => b.paymentStatus === 'paid_cash')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const todayGamingUpi = todayBookings
      .filter((b) => b.paymentStatus === 'paid_upi' || b.paymentStatus === 'paid_card')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

    const todayFoodRevenue = todayFood.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const todayFoodCash = todayFood
      .filter((s) => s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const todayFoodUpi = todayFood
      .filter((s) => s.paymentMethod === 'upi')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    const todayFoodItems = todayFood.reduce((sum, s) => {
      if (Array.isArray(s.items)) {
        return sum + s.items.reduce((iSum, i) => iSum + (Number(i.quantity) || 1), 0);
      }
      return sum + (Number(s.totalItemsCount) || 1);
    }, 0);

    const allTimeGaming = validBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const allTimeFood = foodSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    // Last 7 days (including today) revenue trend
    const fmtLocal = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = fmtLocal(d);
      const gaming = validBookings
        .filter((b) => b.date === dateStr)
        .reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
      const food = foodSales
        .filter((s) => s && s.date === dateStr)
        .reduce((s, x) => s + (Number(x.totalAmount) || 0), 0);
      return {
        dateStr,
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        gaming,
        food,
        total: gaming + food,
      };
    });
    const weekMax = Math.max(1, ...week.map((w) => w.total));

    return {
      todayGamingSessions: todayBookings.length,
      todayGamingRevenue,
      todayGamingCash,
      todayGamingUpi,
      todayFoodOrders: todayFood.length,
      todayFoodRevenue,
      todayFoodCash,
      todayFoodUpi,
      todayFoodItems,
      todayCash: todayGamingCash + todayFoodCash,
      todayUpi: todayGamingUpi + todayFoodUpi,
      todayTotal: todayGamingRevenue + todayFoodRevenue,
      allTimeGaming,
      allTimeFood,
      allTimeTotal: allTimeGaming + allTimeFood,
      totalBookings: validBookings.length,
      totalFoodSales: foodSales.length,
      week,
      weekMax,
    };
  }, [bookings, foodSales]);

  const topPerformers = useMemo(() => {
    return [...staffSummaryList]
      .sort((a, b) => b.todayCollection - a.todayCollection)
      .slice(0, 4);
  }, [staffSummaryList]);

  const togglePinVisibility = (id) => {
    setShowPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyPin = (staff) => {
    if (!staff.pin) return;
    navigator.clipboard.writeText(staff.pin);
    toast.success('PIN Copied', `PIN for ${staff.name} copied to clipboard!`);
  };

  const handleCopyCredentials = (staff) => {
    const message = generateStaffCredentialsMessage(staff);
    navigator.clipboard.writeText(message);
    toast.success('Credentials Copied', `Login instructions for ${staff.name} copied to clipboard!`);
  };

  const handleOpenAdd = () => {
    const randomPin = String(Math.floor(1000 + Math.random() * 9000));
    setFormData({
      name: '',
      phone: '',
      email: '',
      role: 'Counter Operator',
      pin: randomPin,
      shift: 'Morning (09:00 AM - 03:00 PM)',
      status: 'active',
      joiningDate: getTodayString(),
      emergencyContact: '',
      upiId: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name || '',
      phone: staff.phone || '',
      email: staff.email || '',
      role: staff.role || 'Counter Operator',
      pin: staff.pin || '1234',
      shift: staff.shift || 'Morning (09:00 AM - 03:00 PM)',
      status: staff.status || 'active',
      joiningDate: staff.joiningDate || getTodayString(),
      emergencyContact: staff.emergencyContact || '',
      upiId: staff.upiId || '',
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
      const staffPayload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        role: formData.role,
        pin: formData.pin.trim(),
        shift: formData.shift,
        status: formData.status,
        joiningDate: formData.joiningDate || getTodayString(),
        emergencyContact: formData.emergencyContact.trim(),
        upiId: formData.upiId.trim(),
        notes: formData.notes.trim(),
      };

      if (editingStaff) {
        // Optimistic UI update
        setStaffList((prev) =>
          prev.map((s) => (s.id === editingStaff.id ? { ...s, ...staffPayload } : s))
        );
        await updateStaff(editingStaff.id, staffPayload);
        toast.success('Staff Updated', `${formData.name} updated successfully!`);
        setEditingStaff(null);
      } else {
        const newId = await addStaff(staffPayload);
        // Optimistic UI update
        setStaffList((prev) => [
          ...prev.filter((s) => s.id !== newId),
          { id: newId, ...staffPayload },
        ]);
        toast.success('Staff Added', `🎉 ${formData.name} has been added as ${formData.role}!`);
        setShowAddModal(false);
      }
    } catch (err) {
      toast.error('Save Failed', err.message);
    }
  };

  const handleToggleStatus = async (staff) => {
    const newStatus = staff.status === 'active' ? 'inactive' : 'active';
    // Optimistic UI update
    setStaffList((prev) =>
      prev.map((s) => (s.id === staff.id ? { ...s, status: newStatus } : s))
    );
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
    const target = deleteTarget;
    setDeleteTarget(null);

    // Optimistic instant UI removal
    setStaffList((prev) => prev.filter((s) => s.id !== target.id));

    try {
      await deleteStaff(target.id);
      toast.success('Staff Deleted', `${target.name} has been removed.`);
    } catch (err) {
      toast.error('Error', err.message);
    }
  };

  // Copy Handover Shift Closing Summary
  const handleCopyHandoverSummary = () => {
    const dateStr = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const lines = [
      `🎮 *TS GAMING CAFÉ — DAILY SHIFT HANDOVER REPORT* 🎮`,
      `📅 *Date:* ${dateStr}`,
      `⏰ *Generated at:* ${new Date().toLocaleTimeString('en-IN')}`,
      `─────────────────────────`,
      `💰 *Total Collected Today:* ${formatINR(overallTotals.todayCollection)}`,
      `💵 *Cash In Drawer:* ${formatINR(overallTotals.todayCash)}`,
      `📱 *UPI / Online:* ${formatINR(overallTotals.todayUpi)}`,
      `🎮 *Gaming Bookings:* ${overallTotals.todayGamingCount || overallTotals.todayCount}`,
      `🍔 *Cafe POS Sales:* ${overallTotals.todayFoodCount || 0}`,
      `─────────────────────────`,
      `*STAFF BREAKDOWN:*`,
      ...staffSummaryList.map(
        (s, idx) =>
          `${idx + 1}. *${s.staff.name}* (${s.staff.role}) — ${formatINR(s.todayCollection)} (Cash: ${formatINR(s.todayCash)}, UPI: ${formatINR(s.todayUpi)})`
      ),
      `─────────────────────────`,
      `_TS Gaming Cafe Management System_`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Handover Copied', 'Daily handover summary copied to clipboard!');
  };

  // Print Handover Report
  const handlePrintReport = () => {
    window.print();
  };

  // If non-admin logged in (Staff member), show their Personal Duty Dashboard!
  if (!isAdmin) {
    if (isStaff && staffUser) {
      return (
        <StaffPersonalDashboard
          staffUser={staffUser}
          bookings={bookings}
          foodSales={foodSales}
          toast={toast}
        />
      );
    }

    return (
      <div
        style={{
          maxWidth: 600,
          margin: '60px auto',
          padding: '2.5rem',
          textAlign: 'center',
          borderRadius: 20,
          background: 'linear-gradient(145deg, #0f1422, #07090f)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ color: '#fff', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' }}>
          Access Restricted
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Staff Management is restricted to Cafe Owners and Authorized Staff Members.
        </p>
        <Link
          to="/admin"
          className="btn"
          style={{
            background: '#ff5500',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 8,
            fontWeight: 700,
          }}
        >
          ← Return to Duty Desk
        </Link>
      </div>
    );
  }

  // Filter staff members
  const filteredStaff = staffList.filter((s) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (s.name || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.role || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? s.status === 'active'
        : s.status === 'inactive';

    const matchesRole = roleFilter === 'all' || s.role === roleFilter;

    const matchesShift =
      shiftFilter === 'all'
        ? true
        : (s.shift || '').toLowerCase().includes(shiftFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesRole && matchesShift;
  });

  const activeCount = staffList.filter((s) => s.status === 'active').length;
  const inactiveCount = staffList.length - activeCount;

  return (
    <div className="admin-staff-page">
      {/* ── Page Header ── */}
      <div className="staff-page-header">
        <div className="staff-page-heading">
          <span className="staff-page-eyebrow">
            <Sparkles size={13} /> TEAM & SHIFT MANAGEMENT
          </span>
          <h2 className="admin-section-title">
            <span className="staff-title-icon-wrap">
              <Users size={22} />
            </span>
            Staff & Duty Roster
          </h2>
          <p className="staff-page-description">
            Manage staff credentials, PIN access, shift rotations, and live revenue collected from
            gaming sessions & cafe orders.
          </p>
        </div>

        <div className="staff-page-actions">
          {/* Tab Switcher: Cards vs Report Table */}
          <div className="staff-view-switcher">
            <button
              onClick={() => setViewTab('overview')}
              className={viewTab === 'overview' ? 'active' : ''}
              type="button"
            >
              <LayoutDashboard size={14} /> Overview Dashboard
            </button>
            <button
              onClick={() => setViewTab('cards')}
              className={viewTab === 'cards' ? 'active' : ''}
              type="button"
            >
              <LayoutGrid size={14} /> Staff Cards ({filteredStaff.length})
            </button>
            <button
              onClick={() => setViewTab('report')}
              className={viewTab === 'report' ? 'active' : ''}
              type="button"
            >
              <Table size={14} /> Handover & Performance
            </button>
          </div>

          <Link
            to="/admin/dashboard"
            className="staff-header-dash-btn"
            title="Open Main Cafe Business Dashboard"
          >
            <LayoutDashboard size={15} /> Main Dashboard
          </Link>

          <button
            onClick={handleOpenAdd}
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #ff5500, #ff7700)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: '0 0 16px rgba(255, 85, 0, 0.4)',
            }}
          >
            <UserPlus size={16} /> Add Staff Member
          </button>
        </div>
      </div>

      {/* ── Top Cyber KPI Grid ── */}
      <div className="staff-summary-grid">
        {/* Total Staff */}
        <div className="staff-summary-card">
          <div
            className="staff-summary-icon"
            style={{
              background: 'rgba(255, 85, 0, 0.15)',
              color: '#ff5500',
              border: '1px solid rgba(255, 85, 0, 0.3)',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div className="staff-summary-value" style={{ color: '#fff' }}>
              {staffList.length}
            </div>
            <div className="staff-summary-label">Total Crew</div>
            <div className="staff-summary-note">
              <span style={{ color: '#22c55e', fontWeight: 700 }}>{onDutyCount} On Duty Now</span> · {activeCount} Active
            </div>
          </div>
        </div>

        {/* Collected Today */}
        <div className="staff-summary-card">
          <div
            className="staff-summary-icon"
            style={{
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <DollarSign size={22} />
          </div>
          <div>
            <div className="staff-summary-value" style={{ color: '#22c55e' }}>
              {formatINR(overallTotals.todayCollection)}
            </div>
            <div className="staff-summary-label">Collected Today</div>
            <div className="staff-summary-note">
              🎮 {overallTotals.todayCount} Sessions · 🍔 {overallTotals.todayFoodCount || 0} Cafe Items
            </div>
          </div>
        </div>

        {/* Cash vs UPI Today */}
        <div className="staff-summary-card">
          <div
            className="staff-summary-icon"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <Receipt size={22} />
          </div>
          <div>
            <div className="staff-summary-value" style={{ color: '#f59e0b' }}>
              {formatINR(overallTotals.todayCash)}
            </div>
            <div className="staff-summary-label">Cash In Register</div>
            <div className="staff-summary-note">
              UPI Collected: <strong style={{ color: '#00e5ff' }}>{formatINR(overallTotals.todayUpi)}</strong>
            </div>
          </div>
        </div>

        {/* All Time Collection */}
        <div className="staff-summary-card">
          <div
            className="staff-summary-icon"
            style={{
              background: 'rgba(0, 229, 255, 0.15)',
              color: '#00e5ff',
              border: '1px solid rgba(0, 229, 255, 0.3)',
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="staff-summary-value" style={{ color: '#00e5ff' }}>
              {formatINR(overallTotals.allTimeCollection)}
            </div>
            <div className="staff-summary-label">All-Time Revenue</div>
            <div className="staff-summary-note">Across {overallTotals.allTimeCount} Orders & Bookings</div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Control Bar (Only for Staff Cards and Report) ── */}
      {viewTab !== 'overview' && (
        <div className="staff-filter-bar">
          {/* Search */}
          <div className="staff-search-input-wrap">
            <Search size={16} className="staff-search-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search staff by name, phone, role..."
              className="staff-search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filter Groups */}
          <div className="staff-filter-groups">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="staff-filter-select"
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Shift Filter */}
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="staff-filter-select"
            >
              <option value="all">All Shifts</option>
              <option value="morning">Morning Shift</option>
              <option value="evening">Evening Shift</option>
              <option value="full day">Full Day</option>
              <option value="flexible">Flexible</option>
            </select>

            {/* Status Pills */}
            <div className="staff-status-pills">
              {['all', 'active', 'inactive'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`staff-status-pill-btn ${statusFilter === tab ? 'active' : ''}`}
                  type="button"
                >
                  {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {(searchTerm || roleFilter !== 'all' || shiftFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                  setShiftFilter('all');
                  setStatusFilter('all');
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW 0: ALL-OVERVIEW DASHBOARD ── */}
      {viewTab === 'overview' && (
        <div className="staff-dashboard">
          {/* ── Business KPI Grid ── */}
          <div className="sd-kpi-grid">
            <div className="sd-kpi-card sd-kpi--total">
              <div className="sd-kpi-icon"><TrendingUp size={22} /></div>
              <div className="sd-kpi-body">
                <div className="sd-kpi-label">Today's Total Collection</div>
                <div className="sd-kpi-value">{formatINR(overview.todayTotal)}</div>
                <div className="sd-kpi-note">
                  {overview.todayGamingSessions} gaming sessions · {overview.todayFoodOrders} food orders
                </div>
              </div>
            </div>

            <div className="sd-kpi-card sd-kpi--cash">
              <div className="sd-kpi-icon"><Receipt size={22} /></div>
              <div className="sd-kpi-body">
                <div className="sd-kpi-label">Cash Today</div>
                <div className="sd-kpi-value">{formatINR(overview.todayCash)}</div>
                <div className="sd-kpi-note">In register / drawer</div>
              </div>
            </div>

            <div className="sd-kpi-card sd-kpi--upi">
              <div className="sd-kpi-icon"><Zap size={22} /></div>
              <div className="sd-kpi-body">
                <div className="sd-kpi-label">UPI Today</div>
                <div className="sd-kpi-value">{formatINR(overview.todayUpi)}</div>
                <div className="sd-kpi-note">Online + card payments</div>
              </div>
            </div>

            <div className="sd-kpi-card sd-kpi--gaming">
              <div className="sd-kpi-icon"><Gamepad2 size={22} /></div>
              <div className="sd-kpi-body">
                <div className="sd-kpi-label">Gaming Today</div>
                <div className="sd-kpi-value">{formatINR(overview.todayGamingRevenue)}</div>
                <div className="sd-kpi-note">{overview.todayGamingSessions} sessions booked</div>
              </div>
            </div>

            <div className="sd-kpi-card sd-kpi--food">
              <div className="sd-kpi-icon"><Coffee size={22} /></div>
              <div className="sd-kpi-body">
                <div className="sd-kpi-label">Food & Drinks Today</div>
                <div className="sd-kpi-value">{formatINR(overview.todayFoodRevenue)}</div>
                <div className="sd-kpi-note">{overview.todayFoodItems} items sold</div>
              </div>
            </div>

            <div className="sd-kpi-card sd-kpi--alltime">
              <div className="sd-kpi-icon"><Layers size={22} /></div>
              <div className="sd-kpi-body">
                <div className="sd-kpi-label">All-Time Revenue</div>
                <div className="sd-kpi-value">{formatINR(overview.allTimeTotal)}</div>
                <div className="sd-kpi-note">Across {overview.totalBookings} bookings & {overview.totalFoodSales} food sales</div>
              </div>
            </div>
          </div>

          {/* ── Weekly Revenue Trend + On-Duty Roster ── */}
          <div className="sd-mid-grid">
            <div className="sd-panel">
              <div className="sd-panel-title">
                <TrendingUp size={16} style={{ color: '#22d3ee' }} /> Revenue — Last 7 Days
              </div>
              <div className="sd-week-chart">
                {overview.week.map((w) => (
                  <div className="sd-week-col" key={w.dateStr} title={`${w.dateStr}: ${formatINR(w.total)}`}>
                    <div className="sd-week-bars">
                      <div
                        className="sd-week-bar sd-week-bar--gaming"
                        style={{ height: `${Math.max(6, Math.round((w.gaming / overview.weekMax) * 100))}%` }}
                      />
                      <div
                        className="sd-week-bar sd-week-bar--food"
                        style={{ height: `${Math.max(6, Math.round((w.food / overview.weekMax) * 100))}%` }}
                      />
                    </div>
                    <div className="sd-week-label">{w.label}</div>
                    <div className="sd-week-value">{formatINR(w.total)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sd-panel">
              <div className="sd-panel-title">
                <Clock size={16} style={{ color: '#f59e0b' }} /> On-Duty Roster ({onDutyCount})
              </div>
              {staffList.filter((s) => isStaffCurrentlyOnShift(s.shift, s.status)).length === 0 ? (
                <div className="sd-empty">No one is on duty right now.</div>
              ) : (
                <div className="sd-duty-list">
                  {staffList
                    .filter((s) => isStaffCurrentlyOnShift(s.shift, s.status))
                    .slice(0, 6)
                    .map((s) => (
                      <div className="sd-duty-row" key={s.id}>
                        <div className="sd-duty-avatar">{(s.name || 'S')[0].toUpperCase()}</div>
                        <div className="sd-duty-info">
                          <div className="sd-duty-name">{s.name}</div>
                          <div className="sd-duty-role">{s.role}</div>
                        </div>
                        <span className="sd-duty-badge">On Duty</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Lower Grid: split analysis + top performers ── */}
          <div className="sd-lower-grid">
            {/* Payment Mix */}
            <div className="sd-panel">
              <div className="sd-panel-title">
                <Receipt size={16} style={{ color: '#f59e0b' }} /> Today's Payment Mix
              </div>
              <div className="sd-split-bar">
                <div
                  className="sd-split-seg sd-split-seg--cash"
                  style={{ width: `${overview.todayTotal > 0 ? Math.round((overview.todayCash / overview.todayTotal) * 100) : 0}%` }}
                />
                <div
                  className="sd-split-seg sd-split-seg--upi"
                  style={{ width: `${overview.todayTotal > 0 ? Math.round((overview.todayUpi / overview.todayTotal) * 100) : 100}%` }}
                />
              </div>
              <div className="sd-split-legend">
                <span><i className="sd-dot sd-dot--cash" /> Cash · {formatINR(overview.todayCash)} ({overview.todayTotal > 0 ? Math.round((overview.todayCash / overview.todayTotal) * 100) : 0}%)</span>
                <span><i className="sd-dot sd-dot--upi" /> UPI · {formatINR(overview.todayUpi)} ({overview.todayTotal > 0 ? Math.round((overview.todayUpi / overview.todayTotal) * 100) : 0}%)</span>
              </div>
            </div>

            {/* Revenue split: gaming vs food */}
            <div className="sd-panel">
              <div className="sd-panel-title">
                <Layers size={16} style={{ color: '#00e5ff' }} /> Today's Revenue Split
              </div>
              <div className="sd-split-bar">
                <div
                  className="sd-split-seg sd-split-seg--gaming"
                  style={{ width: `${overview.todayTotal > 0 ? Math.round((overview.todayGamingRevenue / overview.todayTotal) * 100) : 0}%` }}
                />
                <div
                  className="sd-split-seg sd-split-seg--food"
                  style={{ width: `${overview.todayTotal > 0 ? Math.round((overview.todayFoodRevenue / overview.todayTotal) * 100) : 100}%` }}
                />
              </div>
              <div className="sd-split-legend">
                <span><i className="sd-dot sd-dot--gaming" /> Gaming · {formatINR(overview.todayGamingRevenue)} ({overview.todayTotal > 0 ? Math.round((overview.todayGamingRevenue / overview.todayTotal) * 100) : 0}%)</span>
                <span><i className="sd-dot sd-dot--food" /> Food · {formatINR(overview.todayFoodRevenue)} ({overview.todayTotal > 0 ? Math.round((overview.todayFoodRevenue / overview.todayTotal) * 100) : 0}%)</span>
              </div>
            </div>

            {/* Top performers */}
            <div className="sd-panel sd-performers-panel">
              <div className="sd-panel-title">
                <Users size={16} style={{ color: '#ff5500' }} /> Top Performers Today
              </div>
              {topPerformers.length === 0 ? (
                <div className="sd-empty">No staff collections recorded yet today.</div>
              ) : (
                <div className="sd-performers">
                  {topPerformers.map((p, idx) => (
                    <div className="sd-performer-row" key={p.staff.id || idx}>
                      <span className={`sd-rank ${idx === 0 ? 'sd-rank--gold' : idx === 1 ? 'sd-rank--silver' : ''}`}>
                        {idx + 1}
                      </span>
                      <div className="sd-performer-info">
                        <div className="sd-performer-name">{p.staff.name}</div>
                        <div className="sd-performer-role">{p.staff.role} · {isStaffCurrentlyOnShift(p.staff.shift, p.staff.status) ? 'On Duty' : 'Off Shift'}</div>
                      </div>
                      <div className="sd-performer-amount">{formatINR(p.todayCollection)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 1: STAFF CARDS VIEW ── */}
      {viewTab === 'cards' && (
        <>
          {loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#94a3b8',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Loading TS Gaming Cafe crew...
            </div>
          )}

          {!loading && filteredStaff.length > 0 && (
            <div className="staff-card-grid">
              {filteredStaff.map((staff) => {
                const isActive = staff.status === 'active';
                const isPinVisible = showPins[staff.id];
                const stats = calculateStaffStats(staff.id, staff.name, bookings, foodSales);
                const isOnDuty = isStaffCurrentlyOnShift(staff.shift, staff.status);
                const waCredsMsg = generateStaffCredentialsMessage(staff);

                return (
                  <div
                    key={staff.id}
                    className={`staff-card ${!isActive ? 'staff-card--inactive' : ''}`}
                  >
                    <div>
                      {/* Top Row: Avatar, Name, Role & Live Duty Badge */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className={`staff-avatar ${!isActive ? 'staff-avatar--inactive' : ''}`}>
                            {(staff.name || 'S')[0].toUpperCase()}
                          </div>
                          <div>
                            <h3
                              style={{
                                fontSize: '1.1rem',
                                fontWeight: 800,
                                color: '#fff',
                                margin: '0 0 4px',
                                letterSpacing: '0.02em',
                              }}
                            >
                              {staff.name}
                            </h3>
                            <span className="staff-role-pill">
                              <Zap size={10} /> {staff.role || 'Staff Member'}
                            </span>
                          </div>
                        </div>

                        {/* Duty Status Badge */}
                        {isActive ? (
                          isOnDuty ? (
                            <span className="staff-duty-badge staff-duty-badge--live" title="Shift active right now">
                              <span className="staff-duty-radar" /> ON DUTY
                            </span>
                          ) : (
                            <span className="staff-duty-badge staff-duty-badge--off" title="Off duty currently">
                              OFF-DUTY
                            </span>
                          )
                        ) : (
                          <span className="staff-duty-badge staff-duty-badge--inactive">
                            DEACTIVATED
                          </span>
                        )}
                      </div>

                      {/* Staff Meta Box */}
                      <div
                        style={{
                          marginTop: '1rem',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: 12,
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          fontSize: '0.82rem',
                        }}
                      >
                        {/* Phone + Action Buttons */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
                            <Phone size={13} style={{ color: '#00e5ff' }} /> Phone
                          </span>
                          {staff.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ color: '#fff', fontWeight: 600 }}>
                                {formatPhoneNumber(staff.phone)}
                              </span>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {/* Call */}
                                <a
                                  href={`tel:+91${getClean10Phone(staff.phone)}`}
                                  className="staff-phone-action-btn staff-phone-call"
                                  title={`Call ${staff.name}`}
                                >
                                  <Phone size={12} />
                                </a>
                                {/* WhatsApp General */}
                                <a
                                  href={`https://wa.me/91${getClean10Phone(staff.phone)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="staff-phone-action-btn staff-phone-wa"
                                  title={`Chat on WhatsApp with ${staff.name}`}
                                >
                                  <MessageSquare size={12} />
                                </a>
                                {/* Share Login Credentials via WhatsApp */}
                                <a
                                  href={`https://wa.me/91${getClean10Phone(staff.phone)}?text=${encodeURIComponent(waCredsMsg)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="staff-phone-action-btn staff-share-cred-btn"
                                  title="Send Portal Login Credentials to WhatsApp"
                                >
                                  <Share2 size={12} />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>Not provided</span>
                          )}
                        </div>

                        {/* Shift */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
                            <Clock size={13} style={{ color: '#ff5500' }} /> Work Shift
                          </span>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{staff.shift || 'Flexible'}</span>
                        </div>

                        {/* Security PIN with Copy & Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
                            <KeyRound size={13} style={{ color: '#ff7700' }} /> Login PIN
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="staff-pin-chip">
                              {isPinVisible ? staff.pin : '••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePinVisibility(staff.id)}
                              className="staff-phone-action-btn"
                              style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
                              title={isPinVisible ? 'Hide PIN' : 'View PIN'}
                            >
                              {isPinVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyPin(staff)}
                              className="staff-phone-action-btn staff-copy-pin-btn"
                              title="Copy PIN to clipboard"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Revenue Performance Strip */}
                        <div className="staff-perf-strip">
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.8rem',
                            }}
                          >
                            <span style={{ color: '#ff5500', fontWeight: 800 }}>TODAY'S TOTAL</span>
                            <span style={{ color: '#22c55e', fontWeight: 800, fontSize: '0.95rem' }}>
                              {formatINR(stats.todayCollection)}
                            </span>
                          </div>

                          {/* Split: Gaming Sessions vs Food POS */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span className="staff-perf-stream-tag staff-perf-stream--gaming">
                              <Gamepad2 size={12} /> Gaming: {formatINR(stats.todayGamingCollection)}
                            </span>
                            <span className="staff-perf-stream-tag staff-perf-stream--food">
                              <Coffee size={12} /> Cafe: {formatINR(stats.todayFoodCollection)}
                            </span>
                          </div>

                          {/* Cash & UPI breakdown */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.72rem',
                              color: '#94a3b8',
                              borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
                              paddingTop: 6,
                            }}
                          >
                            <span>
                              Cash: <strong style={{ color: '#f59e0b' }}>{formatINR(stats.todayCash)}</strong>
                            </span>
                            <span>
                              UPI: <strong style={{ color: '#00e5ff' }}>{formatINR(stats.todayUpi)}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Notes if any */}
                        {staff.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                            📝 {staff.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="staff-card-footer">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(staff)}
                        className="btn"
                        style={{
                          flex: 1,
                          fontSize: '0.75rem',
                          height: 34,
                          borderRadius: 8,
                          fontWeight: 700,
                          background: isActive ? 'rgba(255, 255, 255, 0.06)' : 'rgba(34, 197, 94, 0.2)',
                          color: isActive ? '#94a3b8' : '#22c55e',
                          border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.1)' : 'rgba(34, 197, 94, 0.4)'}`,
                        }}
                      >
                        {isActive ? 'Deactivate' : 'Activate Access'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(staff)}
                        className="btn"
                        style={{
                          fontSize: '0.75rem',
                          height: 34,
                          padding: '0 10px',
                          borderRadius: 8,
                          background: 'rgba(255, 85, 0, 0.12)',
                          color: '#ff5500',
                          border: '1px solid rgba(255, 85, 0, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                        title="Copy full login credentials text"
                      >
                        <Copy size={13} /> Share
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(staff)}
                        className="btn"
                        style={{
                          fontSize: '0.75rem',
                          height: 34,
                          padding: '0 10px',
                          borderRadius: 8,
                          background: 'rgba(0, 229, 255, 0.12)',
                          color: '#00e5ff',
                          border: '1px solid rgba(0, 229, 255, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                        title="Edit staff details"
                      >
                        <Edit2 size={13} /> Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(staff)}
                        className="btn"
                        style={{
                          fontSize: '0.75rem',
                          height: 34,
                          padding: '0 10px',
                          borderRadius: 8,
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Delete staff"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── VIEW 2: STAFF PERFORMANCE & HANDOVER REPORT TABLE ── */}
      {viewTab === 'report' && (
        <div className="staff-report">
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#fff',
                  margin: 0,
                  fontFamily: 'var(--font-heading)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Receipt size={18} style={{ color: '#ff5500' }} />
                Shift Closing & Daily Handover Report
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0' }}>
                Summary of all gaming sessions and cafe food counter collections logged by each staff member.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleCopyHandoverSummary}
                className="btn"
                style={{
                  background: 'rgba(255, 85, 0, 0.15)',
                  color: '#ff5500',
                  border: '1px solid rgba(255, 85, 0, 0.3)',
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Copy size={14} /> Copy Handover Summary
              </button>
              <button
                type="button"
                onClick={handlePrintReport}
                className="btn"
                style={{
                  background: 'rgba(0, 229, 255, 0.15)',
                  color: '#00e5ff',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Printer size={14} /> Print Report
              </button>
            </div>
          </div>

          <div className="staff-table-scroll-hint">
            👈 Swipe horizontally to view full table details 👉
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Shift / Status</th>
                <th>Today Gaming</th>
                <th>Today Food</th>
                <th>Today Cash</th>
                <th>Today UPI</th>
                <th>Total Today</th>
                <th>All-Time Revenue</th>
              </tr>
            </thead>
            <tbody>
              {staffSummaryList.map(
                ({
                  staff,
                  todayGamingCollection,
                  todayFoodCollection,
                  todayCash,
                  todayUpi,
                  todayCollection,
                  todayCount,
                  allTimeCollection,
                  allTimeCount,
                }) => {
                  const onDuty = isStaffCurrentlyOnShift(staff.shift, staff.status);
                  return (
                    <tr key={staff.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              background: 'linear-gradient(135deg, #ff5500, #ff7700)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              fontFamily: 'var(--font-display)',
                            }}
                          >
                            {(staff.name || 'S')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                              {staff.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              {staff.role}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                          {staff.shift || 'Flexible'}
                        </div>
                        {staff.status === 'active' ? (
                          onDuty ? (
                            <span style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: 700 }}>
                              ● On Duty Now
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                              ○ Off Shift
                            </span>
                          )
                        ) : (
                          <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700 }}>
                            ✕ Inactive
                          </span>
                        )}
                      </td>

                      {/* Gaming Revenue Today */}
                      <td>
                        <span style={{ color: '#00e5ff', fontWeight: 700 }}>
                          {formatINR(todayGamingCollection)}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {todayCount} bookings
                        </div>
                      </td>

                      {/* Food Revenue Today */}
                      <td>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                          {formatINR(todayFoodCollection)}
                        </span>
                      </td>

                      {/* Cash Received Today */}
                      <td>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                          {formatINR(todayCash)}
                        </span>
                      </td>

                      {/* UPI Received Today */}
                      <td>
                        <span style={{ color: '#00e5ff', fontWeight: 700 }}>
                          {formatINR(todayUpi)}
                        </span>
                      </td>

                      {/* Total Today */}
                      <td>
                        <span
                          style={{
                            color: '#22c55e',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: todayCollection > 0 ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                          }}
                        >
                          {formatINR(todayCollection)}
                        </span>
                      </td>

                      {/* All Time Total */}
                      <td>
                        <strong style={{ color: '#fff', fontSize: '0.9rem' }}>
                          {formatINR(allTimeCollection)}
                        </strong>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {allTimeCount} items/slots
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}

              {loading ? (
                <tr>
                  <td colSpan={8} style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>
                    Loading staff report...
                  </td>
                </tr>
              ) : staffSummaryList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>
                    No staff members to report yet.
                  </td>
                </tr>
              ) : null}

              {/* Cafe Total Row */}
              <tr className="staff-report-total-row">
                <td colSpan={2} style={{ color: '#fff', fontSize: '0.95rem' }}>
                  TS Gaming Cafe Total Handover
                </td>
                <td style={{ color: '#00e5ff' }}>
                  {formatINR(overallTotals.todayGamingCollection || overallTotals.todayCash + overallTotals.todayUpi - (overallTotals.todayFoodCollection || 0))}
                </td>
                <td style={{ color: '#f59e0b' }}>
                  {formatINR(overallTotals.todayFoodCollection || 0)}
                </td>
                <td style={{ color: '#f59e0b', fontSize: '1rem' }}>
                  {formatINR(overallTotals.todayCash)}
                </td>
                <td style={{ color: '#00e5ff', fontSize: '1rem' }}>
                  {formatINR(overallTotals.todayUpi)}
                </td>
                <td style={{ color: '#22c55e', fontSize: '1.1rem' }}>
                  {formatINR(overallTotals.todayCollection)}
                </td>
                <td style={{ color: '#ff5500', fontSize: '1.05rem' }}>
                  {formatINR(overallTotals.allTimeCollection)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Empty State ── */}
      {viewTab === 'cards' && !loading && filteredStaff.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            borderRadius: 18,
            background: 'linear-gradient(145deg, #0f1422, #07090f)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginTop: '1.5rem',
          }}
        >
          <Users size={48} style={{ color: '#64748b', marginBottom: 12 }} />
          <h3 style={{ color: '#fff', marginBottom: 6 }}>
            {staffList.length === 0 ? 'No Staff Members Registered' : 'No Crew Matches Filters'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 20 }}>
            {staffList.length === 0
              ? 'Add your first staff member to give them shift access and login credentials.'
              : 'Try clearing your search keyword or switching shift/role filters.'}
          </p>
          <button
            onClick={
              staffList.length === 0
                ? handleOpenAdd
                : () => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setRoleFilter('all');
                    setShiftFilter('all');
                  }
            }
            className="btn"
            style={{
              background: '#ff5500',
              color: '#fff',
              padding: '8px 20px',
              borderRadius: 8,
              fontWeight: 700,
            }}
          >
            {staffList.length === 0 ? '+ Add First Staff Member' : 'Clear All Filters'}
          </button>
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {(showAddModal || editingStaff) && (
        <div
          className="staff-modal-backdrop"
          onClick={() => {
            setShowAddModal(false);
            setEditingStaff(null);
          }}
        >
          <div
            className="staff-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 540, width: '100%' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: 14,
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  margin: 0,
                  color: '#fff',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.25rem',
                }}
              >
                {editingStaff ? <Edit2 size={18} style={{ color: '#00e5ff' }} /> : <UserPlus size={18} style={{ color: '#ff5500' }} />}
                {editingStaff ? `Edit ${editingStaff.name}` : 'Add Staff Member'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingStaff(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="form-input"
                  style={{
                    background: '#070a12',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    height: 42,
                    color: '#fff',
                    padding: '0 12px',
                  }}
                  required
                  autoFocus
                />
              </div>

              {/* Phone & PIN */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>
                    Phone Number (for WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit mobile"
                    className="form-input"
                    style={{
                      background: '#070a12',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      height: 42,
                      color: '#fff',
                      padding: '0 12px',
                    }}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>
                      Login PIN *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          pin: String(Math.floor(1000 + Math.random() * 9000)),
                        })
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ff5500',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🎲 Generate PIN
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="4-digit PIN"
                    className="form-input"
                    style={{
                      background: '#070a12',
                      border: '1px solid rgba(255, 85, 0, 0.4)',
                      borderRadius: 8,
                      height: 42,
                      color: '#ff7700',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      letterSpacing: '0.18em',
                      padding: '0 12px',
                    }}
                    required
                  />
                </div>
              </div>

              {/* Role & Shift */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="form-input"
                    style={{
                      background: '#070a12',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      height: 42,
                      color: '#fff',
                      padding: '0 12px',
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>
                    Work Shift
                  </label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="form-input"
                    style={{
                      background: '#070a12',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      height: 42,
                      color: '#fff',
                      padding: '0 12px',
                    }}
                  >
                    {SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional UPI ID & Emergency Contact */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>
                    Salary UPI ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="e.g. name@okhdfcbank"
                    className="form-input"
                    style={{
                      background: '#070a12',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      height: 42,
                      color: '#fff',
                      padding: '0 12px',
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>
                    Emergency Contact (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="Family/guardian number"
                    className="form-input"
                    style={{
                      background: '#070a12',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      height: 42,
                      color: '#fff',
                      padding: '0 12px',
                    }}
                  />
                </div>
              </div>

              {/* Login Access Radio */}
              <div className="form-group">
                <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>
                  Portal Login Access
                </label>
                <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={() => setFormData({ ...formData, status: 'active' })}
                    />
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>Active (Can login to counter)</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formData.status === 'inactive'}
                      onChange={() => setFormData({ ...formData, status: 'inactive' })}
                    />
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>Deactivated (Access blocked)</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}>
                  Notes / Responsibilities (Optional)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Opens cafe at 9 AM, handles PS5 controller repairs"
                  className="form-input"
                  style={{
                    background: '#070a12',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    height: 42,
                    color: '#fff',
                    padding: '0 12px',
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    borderRadius: 8,
                    height: 42,
                    fontWeight: 700,
                  }}
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingStaff(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #ff5500, #ff7700)',
                    color: '#fff',
                    borderRadius: 8,
                    height: 42,
                    fontWeight: 800,
                    boxShadow: '0 0 16px rgba(255, 85, 0, 0.4)',
                  }}
                >
                  {editingStaff ? 'Save Changes' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div className="staff-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div
            className="staff-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440, textAlign: 'center' }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <Trash2 size={24} />
            </div>
            <h3 style={{ color: '#fff', marginBottom: 8, fontFamily: 'var(--font-heading)' }}>
              Remove Crew Member?
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 24, lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>? Their PIN will be
              revoked immediately and they will no longer be able to log into the counter duty desk.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  borderRadius: 8,
                  height: 40,
                  fontWeight: 700,
                }}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: 8,
                  height: 40,
                  fontWeight: 800,
                }}
                onClick={handleDeleteStaff}
              >
                Yes, Delete Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Personal Staff Duty Desk & Dashboard (for Staff role) ──
function StaffPersonalDashboard({ staffUser, bookings, foodSales, toast }) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'bookings' | 'food'

  const myStats = useMemo(() => {
    if (!staffUser) return null;
    return calculateStaffStats(staffUser.id, staffUser.name, bookings, foodSales);
  }, [staffUser, bookings, foodSales]);

  const isOnShift = staffUser ? isStaffCurrentlyOnShift(staffUser.shift, staffUser.status) : false;
  const todayStr = useMemo(() => getTodayString(), []);

  const myTodayBookings = useMemo(() => {
    if (!staffUser) return [];
    return (bookings || []).filter(
      (b) => b && b.date === todayStr && isBookingHandledByStaff(b, staffUser.id, staffUser.name)
    );
  }, [bookings, staffUser, todayStr]);

  const myTodayFood = useMemo(() => {
    if (!staffUser) return [];
    return (foodSales || []).filter(
      (s) => s && s.date === todayStr && isFoodSaleHandledByStaff(s, staffUser.id, staffUser.name)
    );
  }, [foodSales, staffUser, todayStr]);

  const handleCopyHandover = () => {
    if (!staffUser || !myStats) return;
    const text =
      `📋 *TS GAMING CAFÉ — SHIFT HANDOVER REPORT*\n` +
      `👤 *Staff:* ${staffUser.name} (${staffUser.role || 'Staff'})\n` +
      `📅 *Date:* ${getTodayString()}\n` +
      `⏱️ *Shift:* ${staffUser.shift || 'General'}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *Cash to Handover (In Drawer):* ${formatINR(myStats.todayCash)}\n` +
      `📱 *UPI / Online Payments:* ${formatINR(myStats.todayUpi)}\n` +
      `💰 *Total Collected Today:* ${formatINR(myStats.todayCollection)}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎮 *Gaming Sessions Handled:* ${myStats.todayGamingCount} (${formatINR(myStats.todayGamingCash)} Cash / ${formatINR(myStats.todayGamingUpi)} UPI)\n` +
      `🍔 *Cafe POS Orders Handled:* ${myStats.todayFoodCount} (${formatINR(myStats.todayFoodCash)} Cash / ${formatINR(myStats.todayFoodUpi)} UPI)\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ Handover Verified.`;

    navigator.clipboard.writeText(text);
    toast.success('Report Copied! 📋', 'Handover summary copied to clipboard.');
  };

  const handleShareWhatsApp = () => {
    if (!staffUser || !myStats) return;
    const text =
      `📋 *TS GAMING CAFÉ — SHIFT HANDOVER REPORT*\n` +
      `👤 *Staff:* ${staffUser.name} (${staffUser.role || 'Staff'})\n` +
      `📅 *Date:* ${getTodayString()}\n` +
      `⏱️ *Shift:* ${staffUser.shift || 'General'}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *Cash to Handover:* ${formatINR(myStats.todayCash)}\n` +
      `📱 *UPI Payments:* ${formatINR(myStats.todayUpi)}\n` +
      `💰 *Total Collection:* ${formatINR(myStats.todayCollection)}\n` +
      `🎮 *Gaming Sessions:* ${myStats.todayGamingCount}\n` +
      `🍔 *Cafe Sales:* ${myStats.todayFoodCount}\n` +
      `✅ Ready for Shift Close.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="admin-staff-page">
      {/* ── Staff Hero Header ── */}
      <div className="staff-duty-hero">
        <div className="staff-duty-hero__info">
          <div className="staff-duty-avatar">
            {(staffUser.name || 'S').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="staff-page-eyebrow">
              <Sparkles size={12} /> PERSONAL DUTY DESK
            </div>
            <h2 className="staff-duty-title">
              Welcome, {staffUser.name}
            </h2>
            <div className="staff-duty-meta">
              <span className="staff-duty-role">{staffUser.role || 'Staff Operator'}</span>
              <span className="staff-duty-dot">·</span>
              <span className="staff-duty-shift">⏱️ {staffUser.shift || 'General Shift'}</span>
              <span className={`staff-duty-status-badge ${isOnShift ? 'on-shift' : 'off-shift'}`}>
                {isOnShift ? '🟢 On Duty Now' : '⚪ Shift Off'}
              </span>
            </div>
          </div>
        </div>

        <div className="staff-duty-hero__actions">
          <Link to="/admin/bookings" className="btn btn-primary btn-sm">
            <Gamepad2 size={15} /> Booking Counter
          </Link>
          <Link to="/admin/food" className="btn btn-secondary btn-sm">
            <Coffee size={15} /> Cafe POS
          </Link>
          <Link to="/admin/dashboard" className="btn btn-ghost btn-sm">
            <LayoutDashboard size={15} /> Main Dashboard
          </Link>
        </div>
      </div>

      {/* ── Personal KPI Grid ── */}
      <div className="sd-kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="sd-kpi-card sd-kpi--total">
          <div className="sd-kpi-icon"><TrendingUp size={22} /></div>
          <div className="sd-kpi-body">
            <div className="sd-kpi-label">Your Total Collection Today</div>
            <div className="sd-kpi-value">{formatINR(myStats?.todayCollection || 0)}</div>
            <div className="sd-kpi-note">
              {myStats?.todayGamingCount || 0} gaming · {myStats?.todayFoodCount || 0} cafe orders
            </div>
          </div>
        </div>

        <div className="sd-kpi-card sd-kpi--cash">
          <div className="sd-kpi-icon"><Receipt size={22} /></div>
          <div className="sd-kpi-body">
            <div className="sd-kpi-label">Cash In Drawer (To Handover)</div>
            <div className="sd-kpi-value">{formatINR(myStats?.todayCash || 0)}</div>
            <div className="sd-kpi-note">Count physical cash in register</div>
          </div>
        </div>

        <div className="sd-kpi-card sd-kpi--upi">
          <div className="sd-kpi-icon"><Zap size={22} /></div>
          <div className="sd-kpi-body">
            <div className="sd-kpi-label">UPI Online Payments</div>
            <div className="sd-kpi-value">{formatINR(myStats?.todayUpi || 0)}</div>
            <div className="sd-kpi-note">Collected via Scanner / Online</div>
          </div>
        </div>

        <div className="sd-kpi-card sd-kpi--gaming">
          <div className="sd-kpi-icon"><Gamepad2 size={22} /></div>
          <div className="sd-kpi-body">
            <div className="sd-kpi-label">Gaming Sessions Booked</div>
            <div className="sd-kpi-value">{myStats?.todayGamingCount || 0}</div>
            <div className="sd-kpi-note">{formatINR(myStats?.todayGamingCollection || 0)} gaming value</div>
          </div>
        </div>
      </div>

      {/* ── Handover & Settlement Card ── */}
      <div className="sd-panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1rem' }}>
          <div>
            <div className="sd-panel-title" style={{ margin: 0 }}>
              <Receipt size={18} style={{ color: '#22c55e' }} /> Shift Handover Summary
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Handover this exact cash amount to the manager or next duty staff at the end of your shift.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handleCopyHandover}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Copy size={14} /> Copy Handover Report
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Share2 size={14} /> Send on WhatsApp
            </button>
          </div>
        </div>

        <div className="sd-split-bar">
          <div
            className="sd-split-seg sd-split-seg--cash"
            style={{ width: `${(myStats?.todayCollection || 0) > 0 ? Math.round(((myStats?.todayCash || 0) / myStats.todayCollection) * 100) : 0}%` }}
          />
          <div
            className="sd-split-seg sd-split-seg--upi"
            style={{ width: `${(myStats?.todayCollection || 0) > 0 ? Math.round(((myStats?.todayUpi || 0) / myStats.todayCollection) * 100) : 100}%` }}
          />
        </div>
        <div className="sd-split-legend">
          <span><i className="sd-dot sd-dot--cash" /> Cash to Handover · {formatINR(myStats?.todayCash || 0)}</span>
          <span><i className="sd-dot sd-dot--upi" /> UPI Collected · {formatINR(myStats?.todayUpi || 0)}</span>
          <span><i className="sd-dot sd-dot--gaming" /> Total · {formatINR(myStats?.todayCollection || 0)}</span>
        </div>
      </div>

      {/* ── Today's Handled Activity Tabs ── */}
      <div className="sd-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: '1rem' }}>
          <div className="sd-panel-title" style={{ margin: 0 }}>
            <Clock size={16} style={{ color: '#00f5d4' }} /> Today's Handled Records
          </div>
          <div className="staff-view-switcher">
            <button
              type="button"
              className={activeTab === 'summary' ? 'active' : ''}
              onClick={() => setActiveTab('summary')}
            >
              All Records ({myTodayBookings.length + myTodayFood.length})
            </button>
            <button
              type="button"
              className={activeTab === 'bookings' ? 'active' : ''}
              onClick={() => setActiveTab('bookings')}
            >
              🎮 Gaming ({myTodayBookings.length})
            </button>
            <button
              type="button"
              className={activeTab === 'food' ? 'active' : ''}
              onClick={() => setActiveTab('food')}
            >
              ☕ Cafe Orders ({myTodayFood.length})
            </button>
          </div>
        </div>

        {myTodayBookings.length === 0 && myTodayFood.length === 0 ? (
          <div className="sd-empty">
            No bookings or orders recorded under your name yet today. Start bookings at the counter to track them here!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="staff-table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Customer / Details</th>
                  <th>Timing</th>
                  <th>Payment</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'summary' || activeTab === 'bookings') &&
                  myTodayBookings.map((b) => (
                    <tr key={b.id}>
                      <td><span style={{ color: '#00ff66', fontWeight: 700 }}>🎮 Gaming</span></td>
                      <td><strong>{b.userName || 'Walk-in Gamer'}</strong> · {b.setupName || 'Console'}</td>
                      <td>{b.startTime} - {b.endTime} ({b.durationMins || 60}m)</td>
                      <td>
                        <span className={`staff-shift-badge ${b.paymentStatus === 'paid_cash' ? 'shift-morning' : 'shift-evening'}`}>
                          {b.paymentStatus === 'paid_cash' ? '💵 Cash' : '📱 UPI'}
                        </span>
                      </td>
                      <td style={{ color: '#00ff66', fontWeight: 800 }}>{formatINR(b.totalAmount)}</td>
                    </tr>
                  ))}
                {(activeTab === 'summary' || activeTab === 'food') &&
                  myTodayFood.map((s) => (
                    <tr key={s.id}>
                      <td><span style={{ color: '#f59e0b', fontWeight: 700 }}>☕ Cafe</span></td>
                      <td>
                        <strong>{s.customerName || 'Counter Customer'}</strong> (
                        {Array.isArray(s.items)
                          ? s.items.map((i) => `${i.name} x${i.quantity}`).join(', ')
                          : 'Cafe Items'}
                        )
                      </td>
                      <td>{s.time || 'Today'}</td>
                      <td>
                        <span className={`staff-shift-badge ${s.paymentMethod === 'cash' ? 'shift-morning' : 'shift-evening'}`}>
                          {s.paymentMethod === 'cash' ? '💵 Cash' : '📱 UPI'}
                        </span>
                      </td>
                      <td style={{ color: '#f59e0b', fontWeight: 800 }}>{formatINR(s.totalAmount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
