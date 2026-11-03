import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeToAllActiveSessions,
  subscribeToSetups,
  subscribeToAllBookings,
  subscribeToStaff,
  subscribeToFoodItems,
  subscribeToFoodSales,
  subscribeToAllUsers,
} from '../../firebase/firestore';
import {
  Gamepad2,
  Calendar,
  Zap,
  CheckCircle,
  Users,
  Coffee,
  Receipt,
  Search,
  Clock,
  ShoppingBag,
  Share2,
  Bell,
  User,
  Plus,
  X,
  Check,
  ChevronRight,
  TrendingUp,
  Package,
  Layers,
  Sparkles,
  Target,
  QrCode,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { isAdminLoggedIn, isStaffLoggedIn, getStaffUser } from '../../utils/adminAuth';
import {
  calculateAllStaffSummary,
  calculateStaffStats,
  isBookingHandledByStaff,
  isFoodSaleHandledByStaff,
  isStaffCurrentlyOnShift,
  getTodayString,
  formatINR,
  getClean10Phone,
  getCustomerWhatsAppUrl,
} from '../../utils/staffStats';
import { useToast } from '../../context/ToastContext';
import UpiQrModal from '../../components/UpiQrModal';
import DailyReportModal from '../../components/DailyReportModal';
import WhatsAppSettingsModal from '../../components/WhatsAppSettingsModal';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const toast = useToast();
  const isAdmin = isAdminLoggedIn();
  const isStaff = isStaffLoggedIn();
  const staffUser = getStaffUser();

  // Counter UPI QR, Daily Closing Report & Auto WhatsApp Modals
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [showWhatsAppSettings, setShowWhatsAppSettings] = useState(false);

  // Firestore Subscriptions
  const [activeSessions, setActiveSessions] = useState([]);
  const [setups, setSetups] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [foodSales, setFoodSales] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Live Clock & Date
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => getTodayString(), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getTodayString(d);
  }, []);

  // Food Sale category filter (NO POS, only Food Sale records)
  const [foodCategoryFilter, setFoodCategoryFilter] = useState('All');

  // Load Firestore data
  useEffect(() => {
    const unsubs = [
      subscribeToAllActiveSessions(setActiveSessions),
      subscribeToSetups(setSetups),
      subscribeToAllBookings(setBookings),
      subscribeToStaff(setStaffList),
      subscribeToFoodItems(setFoodItems),
      subscribeToFoodSales(setFoodSales),
      subscribeToAllUsers(setAllUsers),
    ];
    return () => unsubs.forEach((f) => f && f());
  }, []);

  // ── Financial Metrics Calculation (Date-wise Sales) ──
  const customerVisitsMap = useMemo(() => {
    const map = new Map();
    bookings.forEach(b => {
      if (!b || b.status === 'cancelled') return;
      const p = getClean10Phone(b.userPhone || b.customerPhone);
      if (p.length === 10) {
        map.set(p, (map.get(p) || 0) + 1);
      }
    });
    return map;
  }, [bookings]);

  const getGamerVisits = (phone) => {
    const clean = getClean10Phone(phone);
    if (clean.length === 10 && customerVisitsMap.has(clean)) {
      return customerVisitsMap.get(clean);
    }
    return 1;
  };

  const selectedDateBookings = useMemo(() => {
    return bookings.filter((b) => b && b.date === selectedDate && b.status !== 'cancelled');
  }, [bookings, selectedDate]);

  const selectedDateFoodSales = useMemo(() => {
    return foodSales.filter((s) => s && s.date === selectedDate);
  }, [foodSales, selectedDate]);

  // Aliases for component compatibility
  const todayBookings = selectedDateBookings;
  const todayFoodSales = selectedDateFoodSales;

  const stats = useMemo(() => {
    // Gaming Sales for selected date
    const gamingRevenue = selectedDateBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const gamingCash = selectedDateBookings
      .filter((b) => b.paymentStatus === 'paid_cash' || b.paymentMode === 'cash')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const gamingUpi = selectedDateBookings
      .filter((b) => b.paymentStatus === 'paid_upi' || b.paymentMode === 'upi' || b.paymentStatus === 'paid_card')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

    // Food Sales for selected date
    const foodRevenue = selectedDateFoodSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const foodCash = selectedDateFoodSales
      .filter((s) => s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const foodUpi = selectedDateFoodSales
      .filter((s) => s.paymentMethod === 'upi' || (s.paymentMethod && s.paymentMethod !== 'cash'))
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    // Food Items Sold count
    const foodItemsCount = selectedDateFoodSales.reduce((sum, s) => {
      if (Array.isArray(s.items)) {
        return sum + s.items.reduce((iSum, i) => iSum + (Number(i.quantity) || 1), 0);
      }
      return sum + (Number(s.totalItemsCount) || 1);
    }, 0);

    const totalCash = gamingCash + foodCash;
    const totalUpi = gamingUpi + foodUpi;
    const totalSales = gamingRevenue + foodRevenue;

    const finalCash = totalCash > 0 ? totalCash : 0;
    const finalUpi = totalUpi > 0 ? totalUpi : 0;
    const finalGaming = gamingRevenue > 0 ? gamingRevenue : 0;
    const finalGamingSessions = selectedDateBookings.length > 0 ? selectedDateBookings.length : 0;
    const finalFood = foodRevenue > 0 ? foodRevenue : 0;
    const finalFoodItems = foodItemsCount > 0 ? foodItemsCount : 0;
    const finalTotal = totalSales > 0 ? totalSales : 0;

    return {
      cash: finalCash,
      upi: finalUpi,
      gaming: finalGaming,
      sessionsCount: finalGamingSessions,
      food: finalFood,
      itemsCount: finalFoodItems,
      total: finalTotal,
    };
  }, [selectedDateBookings, selectedDateFoodSales]);

  const displayBookings = useMemo(() => {
    if (selectedDateBookings.length > 0) {
      return selectedDateBookings.slice(0, 15).map((b, idx) => ({
        id: b.id,
        index: idx + 1,
        time: `${b.startTime || b.time || '5:00 PM'} - ${b.endTime || '6:00 PM'}`,
        station: b.setupName ? b.setupName.replace(/ — Station #\d+/, '').replace('PlayStation ', 'PS') : 'Station',
        players: b.players || 1,
        customer: b.userName || 'Customer',
        bookedBy: (b.handledBy || (b.userId ? 'Website' : 'Staff')).replace(/\s*\(Staff\)/gi, ''),
        amount: b.totalAmount || 100,
        status: b.status === 'active' ? 'Playing' : b.status === 'completed' ? 'Completed' : b.status || 'Confirmed',
      }));
    }

    return [];
  }, [selectedDateBookings]);

  const displayFoodSales = useMemo(() => {
    if (todayFoodSales.length > 0) {
      return todayFoodSales.slice(0, 8);
    }

    return [];
  }, [todayFoodSales]);

  const displayStock = useMemo(() => {
    if (foodItems && foodItems.length > 0) {
      return foodItems.slice(0, 7).map((item) => {
        const soldQty = todayFoodSales.reduce((sum, sale) => {
          if (Array.isArray(sale.items)) {
            const found = sale.items.find((i) => i.name?.toLowerCase() === item.name?.toLowerCase());
            return sum + (found ? Number(found.quantity) || 1 : 0);
          }
          return sum;
        }, 0);
        const total = Number(item.stock) + soldQty || 0;
        return {
          name: item.name,
          image: item.image || '/images/more-items.jpg',
          total: total,
          sold: soldQty,
          remaining: Number(item.stock) || 0,
        };
      });
    }

    return [];
  }, [foodItems, todayFoodSales]);

  const displayStaffSales = useMemo(() => {
    const { summary } = calculateAllStaffSummary(staffList, bookings, foodSales, selectedDate);
    const rows = [];

    if (isAdmin) {
      rows.push({
        name: 'Admin',
        isAdmin: true,
        isCurrent: true,
        gaming: 0,
        food: 0,
        total: 0,
      });
    }

    if (staffUser) {
      rows.push({
        name: `${staffUser.name || 'Staff member'}${isStaff ? ' (You)' : ''}`,
        isAdmin: false,
        isCurrent: isStaff,
        gaming: 0,
        food: 0,
        total: 0,
      });
    }

    if (summary && summary.length > 0) {
      summary.forEach((st) => {
        if (st.todayTotal > 0) {
          const match = rows.find((r) => r.name.toLowerCase().includes(st.name.toLowerCase()));
          if (match) {
            match.gaming = st.todayGamingAmount;
            match.food = st.todayFoodAmount;
            match.total = st.todayTotal;
          } else {
            rows.push({
              name: st.name || 'Staff member',
              isAdmin: false,
              isCurrent: staffUser?.id === st.id,
              gaming: st.todayGamingAmount,
              food: st.todayFoodAmount,
              total: st.todayTotal,
            });
          }
        }
      });
    }

    return rows.filter((row) => row.total > 0 || row.isCurrent || row.isAdmin).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [staffList, bookings, foodSales, isAdmin, isStaff, staffUser, selectedDate]);

  // Formatted date & time strings
  const formattedDate = currentDateTime.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    weekday: 'long',
  });

  const formattedTime = currentDateTime.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // ── STAFF PERSONAL METRICS (STRICTLY NO ADMIN DATA) ──
  const myStaffStats = useMemo(() => {
    if (!staffUser) return null;
    return calculateStaffStats(staffUser.id, staffUser.name, bookings, foodSales, selectedDate);
  }, [staffUser, bookings, foodSales, selectedDate]);

  const isOnShift = staffUser ? isStaffCurrentlyOnShift(staffUser.shift, staffUser.status) : false;

  const myTodayBookings = useMemo(() => {
    if (!staffUser) return [];
    return (bookings || []).filter(
      (b) =>
        b &&
        b.date === selectedDate &&
        b.status !== 'cancelled' &&
        isBookingHandledByStaff(b, staffUser.id, staffUser.name)
    );
  }, [bookings, staffUser, selectedDate]);

  const myTodayFoodSales = useMemo(() => {
    if (!staffUser) return [];
    return (foodSales || []).filter(
      (s) => s && s.date === selectedDate && isFoodSaleHandledByStaff(s, staffUser.id, staffUser.name)
    );
  }, [foodSales, staffUser, selectedDate]);

  // ── FOR STAFF: ONLY SHOW WHAT THEY BOOKED, CASH, UPI, AND TOTAL (NO ADMIN DATA!) ──
  if (!isAdmin && isStaff) {
    return (
      <div className="ts-dash-container">
        {/* Staff Dashboard Header */}
        <header className="ts-dash-header">
          <div className="ts-dash-header__brand">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.2rem',
                fontFamily: 'var(--font-display, Orbitron, monospace)',
                boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
              }}
            >
              {(staffUser?.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#00f5d4', fontWeight: 800, letterSpacing: '0.05em' }}>
                ⚡ STAFF DUTY DESK
              </div>
              <div className="ts-dash-header__brand-title">{staffUser?.name || 'Staff Member'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#94a3b8' }}>
                <span>{staffUser?.role || 'Staff Operator'}</span>
                <span>·</span>
                <span>⏱️ {staffUser?.shift || 'General Shift'}</span>
                <span
                  style={{
                    padding: '1px 7px',
                    borderRadius: 999,
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    background: isOnShift ? 'rgba(34, 197, 94, 0.18)' : 'rgba(148, 163, 184, 0.15)',
                    color: isOnShift ? '#22c55e' : '#94a3b8',
                    border: `1px solid ${isOnShift ? 'rgba(34, 197, 94, 0.4)' : 'rgba(148, 163, 184, 0.3)'}`,
                  }}
                >
                  {isOnShift ? '🟢 On Duty Now' : '⚪ Shift Off'}
                </span>
              </div>
            </div>
          </div>

          <nav className="ts-dash-header__nav">
            <Link
              to="/admin/bookings"
              className="ts-dash-nav-btn"
              style={{
                background: 'rgba(0, 255, 102, 0.15)',
                border: '1px solid rgba(0, 255, 102, 0.4)',
                color: '#00ff66',
                fontWeight: 700,
              }}
            >
              <Gamepad2 size={14} /> 🎮 Booking Counter
            </Link>
            <Link
              to="/admin/food"
              className="ts-dash-nav-btn"
              style={{
                background: 'rgba(255, 85, 0, 0.15)',
                border: '1px solid rgba(255, 85, 0, 0.4)',
                color: '#ff5500',
                fontWeight: 700,
              }}
            >
              <Coffee size={14} /> 🍔 Cafe POS
            </Link>
            <Link to="/admin/timer" className="ts-dash-nav-btn">
              <Clock size={14} /> Big Timer
            </Link>
            <button
              type="button"
              className="ts-dash-nav-btn"
              onClick={() => setShowUpiQr(true)}
              style={{
                background: 'rgba(168, 85, 247, 0.18)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                color: '#c084fc',
                fontWeight: 700,
              }}
              title="Instant UPI Payment QR Code"
            >
              <QrCode size={14} /> 📱 Counter UPI QR
            </button>
          </nav>

          <div className="ts-dash-header__right">
            <div className="ts-dash-clock">
              <span>{formattedDate}</span>
              <span style={{ color: '#475569' }}>|</span>
              <Clock size={13} style={{ color: '#38bdf8' }} />
              <span className="ts-dash-clock__time">{formattedTime}</span>
            </div>
          </div>
        </header>

        {/* ── Date Navigation Bar for Staff ── */}
        <div className="ts-dash-date-bar">
          <div className="ts-dash-date-bar__left">
            <span className="ts-dash-date-bar__label">
              <Calendar size={15} style={{ color: '#00f5d4' }} />
              <span>Shift Date:</span>
            </span>
            <button
              type="button"
              className={`ts-dash-date-pill ${selectedDate === todayStr ? 'active' : ''}`}
              onClick={() => setSelectedDate(todayStr)}
            >
              ⚡ Today ({myTodayBookings.length} Bookings)
            </button>
            <button
              type="button"
              className={`ts-dash-date-pill ${selectedDate === yesterdayStr ? 'active' : ''}`}
              onClick={() => setSelectedDate(yesterdayStr)}
            >
              ⏪ Yesterday
            </button>
            <label className={`ts-dash-date-picker-label ${selectedDate !== todayStr && selectedDate !== yesterdayStr ? 'active' : ''}`}>
              <span>📅 {selectedDate !== todayStr && selectedDate !== yesterdayStr ? selectedDate : 'Other Date'}</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="ts-dash-date-native-input"
              />
            </label>
          </div>
          <div className="ts-dash-date-bar__right">
            <span className="ts-dash-date-summary-badge">
              🎮 <strong>{myTodayBookings.length} Bookings</strong> done by you on {selectedDate === todayStr ? 'Today' : selectedDate}
            </span>
          </div>
        </div>

        {/* ── TOP KPI CARDS: ONLY THAT STAFF'S NUMBERS ── */}
        <section className="ts-dash-stats-grid">
          {/* 1. Bookings by this staff */}
          <div className="ts-dash-stat-card">
            <div className="ts-dash-stat-icon ts-dash-stat-icon--blue">
              <Gamepad2 size={20} />
            </div>
            <div className="ts-dash-stat-body">
              <span className="ts-dash-stat-label">Bookings Done by You</span>
              <span className="ts-dash-stat-val" style={{ color: '#38bdf8' }}>
                {myTodayBookings.length}
              </span>
              <span className="ts-dash-stat-sub">
                ₹{(myStaffStats?.todayGamingCollection || 0).toLocaleString('en-IN')} gaming value
              </span>
            </div>
          </div>

          {/* 2. Cash Collected by this staff */}
          <div className="ts-dash-stat-card">
            <div className="ts-dash-stat-icon ts-dash-stat-icon--green">
              <span>₹</span>
            </div>
            <div className="ts-dash-stat-body">
              <span className="ts-dash-stat-label">Cash Collected by You</span>
              <span className="ts-dash-stat-val" style={{ color: '#00ff66' }}>
                ₹{(myStaffStats?.todayCash || 0).toLocaleString('en-IN')}
              </span>
              <span className="ts-dash-stat-sub">Physical cash to handover</span>
            </div>
          </div>

          {/* 3. UPI Payments handled by this staff */}
          <div className="ts-dash-stat-card">
            <div className="ts-dash-stat-icon ts-dash-stat-icon--purple">
              <Zap size={20} />
            </div>
            <div className="ts-dash-stat-body">
              <span className="ts-dash-stat-label">UPI Online by You</span>
              <span className="ts-dash-stat-val" style={{ color: '#00f5d4' }}>
                ₹{(myStaffStats?.todayUpi || 0).toLocaleString('en-IN')}
              </span>
              <span className="ts-dash-stat-sub">Direct QR scanner payments</span>
            </div>
          </div>

          {/* 4. Total Handled by this staff */}
          <div className="ts-dash-stat-card">
            <div className="ts-dash-stat-icon ts-dash-stat-icon--orange">
              <TrendingUp size={20} />
            </div>
            <div className="ts-dash-stat-body">
              <span className="ts-dash-stat-label">Your Total Collection</span>
              <span className="ts-dash-stat-val" style={{ color: '#ff7700' }}>
                ₹{(myStaffStats?.todayCollection || 0).toLocaleString('en-IN')}
              </span>
              <span className="ts-dash-stat-sub">Total Cash + UPI collected</span>
            </div>
          </div>

          {/* 5. Food Orders by this staff */}
          <div className="ts-dash-stat-card">
            <div
              className="ts-dash-stat-icon"
              style={{
                background: 'rgba(236, 72, 153, 0.15)',
                color: '#ec4899',
                border: '1px solid rgba(236, 72, 153, 0.3)',
              }}
            >
              <Coffee size={20} />
            </div>
            <div className="ts-dash-stat-body">
              <span className="ts-dash-stat-label">Cafe Orders by You</span>
              <span className="ts-dash-stat-val" style={{ color: '#ec4899' }}>
                {myStaffStats?.todayFoodCount || 0}
              </span>
              <span className="ts-dash-stat-sub">
                ₹{(myStaffStats?.todayFoodCollection || 0).toLocaleString('en-IN')} cafe value
              </span>
            </div>
          </div>
        </section>

        {/* ── SHIFT HANDOVER SUMMARY BOX ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(6, 182, 212, 0.1))',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '1rem',
                fontWeight: 800,
                color: '#00f5d4',
              }}
            >
              <Receipt size={18} /> Shift Handover Summary
            </div>
            <div style={{ fontSize: '0.84rem', color: '#cbd5e1', marginTop: 4 }}>
              💵 Cash to Handover: <strong style={{ color: '#00ff66' }}>₹{(myStaffStats?.todayCash || 0).toLocaleString('en-IN')}</strong> · 
              📱 UPI: <strong style={{ color: '#38bdf8' }}>₹{(myStaffStats?.todayUpi || 0).toLocaleString('en-IN')}</strong> · 
              💰 Total: <strong style={{ color: '#f59e0b' }}>₹{(myStaffStats?.todayCollection || 0).toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const text =
                  `📋 *TS GAMING CAFÉ — SHIFT HANDOVER REPORT*\n` +
                  `👤 *Staff:* ${staffUser.name} (${staffUser.role || 'Staff'})\n` +
                  `📅 *Date:* ${todayStr}\n` +
                  `⏱️ *Shift:* ${staffUser.shift || 'General'}\n` +
                  `━━━━━━━━━━━━━━━━━━━━\n` +
                  `🎮 *Bookings Done by You:* ${myStaffStats?.todayGamingCount || 0}\n` +
                  `💵 *Cash to Handover (Drawer):* ₹${(myStaffStats?.todayCash || 0).toLocaleString('en-IN')}\n` +
                  `📱 *UPI Payments:* ₹${(myStaffStats?.todayUpi || 0).toLocaleString('en-IN')}\n` +
                  `💰 *Total Collected Today:* ₹${(myStaffStats?.todayCollection || 0).toLocaleString('en-IN')}\n` +
                  `━━━━━━━━━━━━━━━━━━━━\n` +
                  `✅ Shift Verified.`;
                navigator.clipboard.writeText(text);
                toast.success('Report Copied! 📋', 'Handover report copied to clipboard.');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              📋 Copy Shift Report
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                const text =
                  `📋 *TS GAMING CAFÉ — SHIFT HANDOVER REPORT*\n` +
                  `👤 *Staff:* ${staffUser.name} (${staffUser.role || 'Staff'})\n` +
                  `📅 *Date:* ${todayStr}\n` +
                  `⏱️ *Shift:* ${staffUser.shift || 'General'}\n` +
                  `━━━━━━━━━━━━━━━━━━━━\n` +
                  `🎮 *Bookings Done:* ${myStaffStats?.todayGamingCount || 0}\n` +
                  `💵 *Cash in Hand:* ₹${(myStaffStats?.todayCash || 0).toLocaleString('en-IN')}\n` +
                  `📱 *UPI Payments:* ₹${(myStaffStats?.todayUpi || 0).toLocaleString('en-IN')}\n` +
                  `💰 *Total Collection:* ₹${(myStaffStats?.todayCollection || 0).toLocaleString('en-IN')}\n` +
                  `✅ Ready for handover.`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              📱 WhatsApp to Owner
            </button>
          </div>
        </div>

        {/* ── TODAY'S BOOKINGS HANDLED BY THIS STAFF ONLY ── */}
        <section className="ts-dash-section" style={{ marginBottom: '1.5rem' }}>
          <div className="ts-dash-section__header">
            <h2 className="ts-dash-section__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gamepad2 size={18} style={{ color: '#00ff66' }} />
              Today's Bookings Done by You ({myTodayBookings.length})
            </h2>
            <Link to="/admin/bookings" className="ts-dash-view-all">
              Open Booking Counter →
            </Link>
          </div>

          {myTodayBookings.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                color: '#94a3b8',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 12,
                border: '1px dashed rgba(255,255,255,0.1)',
              }}
            >
              🎮 You haven't started any bookings yet today. Open the Booking Counter to start games!
            </div>
          ) : (
            <div className="ts-dash-table-wrap">
              <table className="ts-dash-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Console</th>
                    <th>Timing</th>
                    <th>Duration</th>
                    <th>Payment</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {myTodayBookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <strong>{b.userName || 'Walk-in Gamer'}</strong>
                          {b.userPhone && (
                            <span
                              style={{
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: getGamerVisits(b.userPhone) >= 2 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                                color: getGamerVisits(b.userPhone) >= 2 ? '#fbbf24' : '#4ade80',
                                border: `1px solid ${getGamerVisits(b.userPhone) >= 2 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(34, 197, 94, 0.25)'}`,
                              }}
                            >
                              {getGamerVisits(b.userPhone) >= 2 ? `🔥 ${getGamerVisits(b.userPhone)} Visits` : '🌱 1st'}
                            </span>
                          )}
                        </div>
                        {b.userPhone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                            <span>📱 {b.userPhone}</span>
                            <a
                              href={getCustomerWhatsAppUrl(b) || `https://wa.me/91${getClean10Phone(b.userPhone)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#25D366' }}
                              title="Send WhatsApp Confirmation Slip"
                            >
                              <MessageSquare size={12} />
                            </a>
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ color: '#38bdf8', fontWeight: 700 }}>{b.setupName || 'Console'}</span>
                      </td>
                      <td>
                        {b.startTime} → {b.endTime}
                      </td>
                      <td>{b.durationMins || 60} min</td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background:
                              b.paymentStatus === 'paid_cash'
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(56, 189, 248, 0.15)',
                            color: b.paymentStatus === 'paid_cash' ? '#22c55e' : '#38bdf8',
                          }}
                        >
                          {b.paymentStatus === 'paid_cash' ? '💵 Cash' : '📱 UPI'}
                        </span>
                      </td>
                      <td style={{ color: '#00ff66', fontWeight: 800 }}>₹{b.totalAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── TODAY'S CAFE ORDERS HANDLED BY THIS STAFF ONLY (IF ANY) ── */}
        {myTodayFoodSales.length > 0 && (
          <section className="ts-dash-section">
            <div className="ts-dash-section__header">
              <h2 className="ts-dash-section__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Coffee size={18} style={{ color: '#f59e0b' }} />
                Cafe Orders Taken by You ({myTodayFoodSales.length})
              </h2>
              <Link to="/admin/food" className="ts-dash-view-all">
                Open Cafe POS →
              </Link>
            </div>

            <div className="ts-dash-table-wrap">
              <table className="ts-dash-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Payment</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {myTodayFoodSales.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.customerName || 'Counter Customer'}</strong>
                      </td>
                      <td>
                        {Array.isArray(s.items)
                          ? s.items.map((i) => `${i.name} x${i.quantity}`).join(', ')
                          : 'Cafe Items'}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background:
                              s.paymentMethod === 'cash'
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(56, 189, 248, 0.15)',
                            color: s.paymentMethod === 'cash' ? '#22c55e' : '#38bdf8',
                          }}
                        >
                          {s.paymentMethod === 'cash' ? '💵 Cash' : '📱 UPI'}
                        </span>
                      </td>
                      <td style={{ color: '#f59e0b', fontWeight: 800 }}>₹{s.totalAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {showUpiQr && <UpiQrModal onClose={() => setShowUpiQr(false)} />}
      </div>
    );
  }

  return (
    <div className="ts-dash-container">
      {/* ── Top Bar / Header Matching Screenshot ── */}
      <header className="ts-dash-header">
        <div className="ts-dash-header__brand">
          <img
            src="/images/logo.png"
            alt="TS Gaming Cafe Logo"
            className="ts-dash-header__logo"
          />
          <div>
            <div className="ts-dash-header__brand-title">TS GAMING CAFE</div>
            <div className="ts-dash-header__brand-sub">PLAY • COMPETE • BELONG</div>
          </div>
        </div>

        {/* Quick Nav Tabs */}
        <nav className="ts-dash-header__nav">
          <Link to="/admin" className="ts-dash-nav-btn ts-dash-nav-btn--active">
            <Layers size={14} /> Dashboard
          </Link>
          <Link to="/admin/bookings" className="ts-dash-nav-btn">
            <Calendar size={14} /> New Booking
          </Link>
          <Link
            to="/admin/bookings?mode=custom"
            className="ts-dash-nav-btn"
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(139, 92, 246, 0.25))',
              border: '1px solid rgba(236, 72, 153, 0.45)',
              color: '#f472b6',
              fontWeight: 800,
            }}
          >
            <Sparkles size={14} /> 🎯 Custom Booking
          </Link>
          {/* NOTICE: As user requested, this is Food Sale, not Food POS! */}
          <Link to="/admin/food" className="ts-dash-nav-btn">
            <Coffee size={14} /> Food Sale
          </Link>
          <Link to="/admin/food" className="ts-dash-nav-btn">
            <Package size={14} /> Stock
          </Link>
          <Link to="/admin/users" className="ts-dash-nav-btn" title="View & Add Registered Gamers">
            <Users size={14} /> Gamers ({allUsers.length})
          </Link>
          <button
            type="button"
            className="ts-dash-nav-btn"
            onClick={() => setShowDailyReport(true)}
            style={{
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              color: '#4ade80',
              fontWeight: 700,
            }}
            title="Today's Cash Settlement & WhatsApp Summary"
          >
            <TrendingUp size={14} /> 📊 Day Closing Report
          </button>
          <button
            type="button"
            className="ts-dash-nav-btn"
            onClick={() => setShowUpiQr(true)}
            style={{
              background: 'rgba(168, 85, 247, 0.18)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              color: '#c084fc',
              fontWeight: 700,
            }}
            title="Instant UPI Payment QR Code"
          >
            <QrCode size={14} /> 📱 Counter UPI QR
          </button>
          <button
            type="button"
            className="ts-dash-nav-btn"
            onClick={() => setShowWhatsAppSettings(true)}
            style={{
              background: 'rgba(37, 211, 102, 0.18)',
              border: '1px solid rgba(37, 211, 102, 0.4)',
              color: '#25D366',
              fontWeight: 700,
            }}
            title="Auto WhatsApp Background Gateway Settings"
          >
            <MessageSquare size={14} /> 💬 Auto WhatsApp
          </button>
        </nav>

        {/* Right Info: Clock, Notifications, Profile */}
        <div className="ts-dash-header__right">
          <div className="ts-dash-clock">
            <span>{formattedDate}</span>
            <span style={{ color: '#475569' }}>|</span>
            <Clock size={13} style={{ color: '#38bdf8' }} />
            <span className="ts-dash-clock__time">{formattedTime}</span>
          </div>

          <button className="ts-dash-notif-btn" title="3 Notifications" onClick={() => toast.show('3 New Slot Bookings Today!', 'info')}>
            <Bell size={16} />
            <span className="ts-dash-notif-badge">3</span>
          </button>

          <div className="ts-dash-profile">
            <div className="ts-dash-profile__avatar">
              {isAdmin ? '👑' : <User size={16} />}
            </div>
            <div>
              <div className="ts-dash-profile__name">
                {isAdmin ? 'Admin' : (staffUser?.name || 'Staff')}
              </div>
              <div className="ts-dash-profile__role">
                {isAdmin ? 'Super Admin' : 'Staff Desk'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Date-wise Report Navigation Bar ── */}
      <div className="ts-dash-date-bar">
        <div className="ts-dash-date-bar__left">
          <span className="ts-dash-date-bar__label">
            <Calendar size={15} style={{ color: '#ff5500' }} />
            <span>Report Date:</span>
          </span>
          <button
            type="button"
            className={`ts-dash-date-pill ${selectedDate === todayStr ? 'active' : ''}`}
            onClick={() => setSelectedDate(todayStr)}
          >
            ⚡ Today ({bookings.filter((b) => b.date === todayStr && b.status !== 'cancelled').length} Bookings)
          </button>
          <button
            type="button"
            className={`ts-dash-date-pill ${selectedDate === yesterdayStr ? 'active' : ''}`}
            onClick={() => setSelectedDate(yesterdayStr)}
          >
            ⏪ Yesterday ({bookings.filter((b) => b.date === yesterdayStr && b.status !== 'cancelled').length} Bookings)
          </button>
          <label className={`ts-dash-date-picker-label ${selectedDate !== todayStr && selectedDate !== yesterdayStr ? 'active' : ''}`}>
            <span>📅 {selectedDate !== todayStr && selectedDate !== yesterdayStr ? selectedDate : 'Pick Custom Date'}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="ts-dash-date-native-input"
            />
          </label>
        </div>

        <div className="ts-dash-date-bar__right">
          <span className="ts-dash-date-summary-badge">
            🎮 <strong>{selectedDateBookings.length} Bookings</strong> on {selectedDate === todayStr ? 'Today' : selectedDate}
          </span>
          <button
            type="button"
            className="ts-dash-open-report-btn"
            onClick={() => setShowDailyReport(true)}
          >
            <TrendingUp size={14} /> Full Day Report
          </button>
        </div>
      </div>

      {/* ── Top 5 Stat KPI Cards Row ── */}
      <section className="ts-dash-stats-grid">
        {/* Card 1: Cash Collection */}
        <div className="ts-dash-stat-card">
          <div className="ts-dash-stat-icon ts-dash-stat-icon--green">
            <span>₹</span>
          </div>
          <div className="ts-dash-stat-body">
            <span className="ts-dash-stat-label">Cash Collection</span>
            <span className="ts-dash-stat-val">₹{stats.cash.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 2: UPI Collection */}
        <div className="ts-dash-stat-card">
          <div className="ts-dash-stat-icon ts-dash-stat-icon--purple">
            <Zap size={22} />
          </div>
          <div className="ts-dash-stat-body">
            <span className="ts-dash-stat-label">UPI Collection</span>
            <span className="ts-dash-stat-val">₹{stats.upi.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 3: Gaming Sales */}
        <div className="ts-dash-stat-card">
          <div className="ts-dash-stat-icon ts-dash-stat-icon--blue">
            <Gamepad2 size={22} />
          </div>
          <div className="ts-dash-stat-body">
            <span className="ts-dash-stat-label">Gaming Sales</span>
            <span className="ts-dash-stat-val">₹{stats.gaming.toLocaleString('en-IN')}</span>
            <span className="ts-dash-stat-sub">
              🎮 {selectedDateBookings.length} Bookings on {selectedDate === todayStr ? 'Today' : selectedDate}
            </span>
          </div>
        </div>

        {/* Card 4: Food & Drinks Sales */}
        <div className="ts-dash-stat-card">
          <div className="ts-dash-stat-icon ts-dash-stat-icon--orange">
            <Coffee size={22} />
          </div>
          <div className="ts-dash-stat-body">
            <span className="ts-dash-stat-label">Food & Drinks Sales</span>
            <span className="ts-dash-stat-val">₹{stats.food.toLocaleString('en-IN')}</span>
            <span className="ts-dash-stat-sub">{stats.itemsCount} Items</span>
          </div>
        </div>

        {/* Card 5: Total Sales */}
        <div className="ts-dash-stat-card">
          <div className="ts-dash-stat-icon ts-dash-stat-icon--dark">
            <Calendar size={22} />
          </div>
          <div className="ts-dash-stat-body">
            <span className="ts-dash-stat-label">Total Sales ({selectedDate === todayStr ? 'Today' : selectedDate})</span>
            <span className="ts-dash-stat-val">₹{stats.total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 6: Registered Gamers */}
        <Link to="/admin/users" className="ts-dash-stat-card" style={{ textDecoration: 'none' }}>
          <div className="ts-dash-stat-icon ts-dash-stat-icon--purple" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
            <Users size={22} />
          </div>
          <div className="ts-dash-stat-body">
            <span className="ts-dash-stat-label">Registered Gamers</span>
            <span className="ts-dash-stat-val">{allUsers.length}</span>
            <span className="ts-dash-stat-sub" style={{ color: '#a855f7' }}>+ Manage & Add</span>
          </div>
        </Link>
      </section>

      {/* ── Main Two-Column Layout ── */}
      <div className="ts-dash-main-grid">
        {/* ══ LEFT COLUMN (New Booking + Today's Bookings) ══ */}
        <div className="ts-dash-col-left">
          {/* Card 1: Live Gaming Stations (Real Setups from Firestore) */}
          <div className="ts-dash-card">
            <div className="ts-dash-card__header">
              <div className="ts-dash-card__title">
                <Gamepad2 size={18} style={{ color: '#ff5500' }} />
                <span>Live Consoles & Stations</span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(255, 85, 0, 0.15)',
                  color: '#ff5500',
                  border: '1px solid rgba(255, 85, 0, 0.3)',
                }}>
                  {setups.length} Setups
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link
                  to="/admin/bookings"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    background: 'linear-gradient(135deg, #ff5500, #ff7700)',
                    borderRadius: 8,
                    color: '#fff',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 2px 10px rgba(255, 85, 0, 0.3)',
                  }}
                >
                  <Plus size={14} /> New Booking
                </Link>
                <Link
                  to="/admin/setups"
                  className="ts-dash-card__link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  Manage Setups →
                </Link>
              </div>
            </div>

            <div className="ts-dash-card__body">
              {setups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>No gaming setups found in your system.</p>
                  <Link
                    to="/admin/setups"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      background: '#ff5500',
                      color: '#fff',
                      borderRadius: 8,
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    + Add Your First Console Setup
                  </Link>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: '12px',
                }}>
                  {setups.map((s) => {
                    const activeSession = activeSessions.find(
                      (sess) => sess.setupId === s.id || (sess.setupName && s.name && sess.setupName.toLowerCase() === s.name.toLowerCase())
                    );
                    const isOccupied = !!activeSession;
                    const setupType = (s.type || 'PS4').toUpperCase();
                    const fallbackImg = setupType === 'PS5' ? '/images/ps5.jpg'
                      : setupType === 'PS4' ? '/images/ps4.jpg'
                      : setupType === 'PS3' ? '/images/ps3.jpg'
                      : setupType === 'PS2' ? '/images/ps2.jpg'
                      : setupType === 'RACING' ? '/images/sim-racing.jpg'
                      : '/images/gallery/gaming-pc.jpg';

                    return (
                      <div
                        key={s.id}
                        style={{
                          background: isOccupied ? 'rgba(239, 68, 68, 0.07)' : 'rgba(255, 255, 255, 0.03)',
                          border: isOccupied ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '12px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          position: 'relative',
                        }}
                      >
                        {/* Type & Status Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: setupType === 'PS5' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 85, 0, 0.15)',
                            color: setupType === 'PS5' ? '#38bdf8' : '#ff5500',
                            border: `1px solid ${setupType === 'PS5' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 85, 0, 0.3)'}`,
                          }}>
                            {setupType}
                          </span>

                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            color: isOccupied ? '#f87171' : '#4ade80',
                          }}>
                            <span style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: isOccupied ? '#ef4444' : '#22c55e',
                              boxShadow: isOccupied ? '0 0 8px #ef4444' : '0 0 8px #22c55e',
                            }} />
                            {isOccupied ? 'In Use' : 'Available'}
                          </span>
                        </div>

                        {/* Setup Name & Thumbnail */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                          <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: '#070a12',
                            flexShrink: 0,
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}>
                            <img
                              src={s.image || fallbackImg}
                              alt={s.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.target.src = fallbackImg; }}
                            />
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: '#f8fafc',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 2 }}>
                              ₹{s.pricePerHour || 50}/hr {s.pricePer30Min ? `• ₹${s.pricePer30Min}/30m` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Info or Action */}
                        {isOccupied ? (
                          <div style={{
                            marginTop: 4,
                            padding: '6px 8px',
                            borderRadius: 6,
                            background: 'rgba(239, 68, 68, 0.1)',
                            fontSize: '0.72rem',
                            color: '#fca5a5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                              👤 {activeSession.customerName || activeSession.userName || 'Player'}
                            </span>
                            <Link
                              to="/admin/sessions"
                              style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'none' }}
                            >
                              View Session →
                            </Link>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <Link
                              to={`/admin/bookings?setup=${encodeURIComponent(s.id)}`}
                              style={{
                                flex: 1,
                                textAlign: 'center',
                                padding: '5px 8px',
                                borderRadius: 6,
                                background: 'rgba(255, 85, 0, 0.12)',
                                border: '1px solid rgba(255, 85, 0, 0.3)',
                                color: '#ff5500',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                              }}
                            >
                              ⚡ Start / Book
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Bookings for Selected Date (All Stations) */}
          <div className="ts-dash-card">
            <div className="ts-dash-card__header">
              <div className="ts-dash-card__title">
                <Calendar size={16} style={{ color: '#38bdf8' }} />
                <span>
                  {selectedDate === todayStr
                    ? `Today's Bookings (Total: ${selectedDateBookings.length})`
                    : `Bookings on ${selectedDate} (Total: ${selectedDateBookings.length})`}
                </span>
              </div>
              <Link to="/admin/bookings" className="ts-dash-card__link">
                View All
              </Link>
            </div>

            <div className="ts-dash-table-wrap">
              <table className="ts-dash-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>Station</th>
                    <th>Players</th>
                    <th>Customer</th>
                    <th>Booked By</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        No bookings recorded on {selectedDate === todayStr ? 'Today' : selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    displayBookings.map((b) => (
                      <tr key={b.id}>
                        <td style={{ color: '#94a3b8' }}>{b.index}</td>
                        <td style={{ fontWeight: 600 }}>{b.time}</td>
                        <td>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(255, 255, 255, 0.06)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#38bdf8',
                          }}>
                            {b.station}
                          </span>
                        </td>
                        <td>{b.players}</td>
                        <td style={{ fontWeight: 600, color: '#fff' }}>{b.customer}</td>
                        <td style={{ color: '#94a3b8' }}>{b.bookedBy}</td>
                        <td style={{ fontWeight: 700, color: '#4ade80' }}>₹{b.amount}</td>
                        <td>
                          <span
                            className={`ts-dash-badge ${
                              b.status === 'Playing'
                                ? 'ts-dash-badge--playing'
                                : b.status === 'Completed'
                                ? 'ts-dash-badge--completed'
                                : 'ts-dash-badge--confirmed'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ══ RIGHT COLUMN (Food Sale + Stock + Sales by Staff) ══ */}
        <div className="ts-dash-col-right">
          {/* Card 1: Food Sale (Food Sale only, NO Food POS) */}
          <div className="ts-dash-card">
            <div className="ts-dash-card__header">
              <div className="ts-dash-card__title">
                <Coffee size={16} style={{ color: '#ff5500' }} />
                <span>Food Sale Today</span>
              </div>
              <Link to="/admin/food" className="ts-dash-card__link">
                View All Sales
              </Link>
            </div>

            <div className="ts-dash-card__body">
              {/* Category Filter Pills */}
              <div className="ts-dash-food-filters">
                {['All', 'Pizza', 'Burger', 'Snacks', 'Drinks', 'Ice Cream'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`ts-dash-food-tab ${foodCategoryFilter === cat ? 'ts-dash-food-tab--active' : ''}`}
                    onClick={() => setFoodCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Food Sales Activity Ledger List */}
              <div className="ts-dash-food-sales-list">
                {displayFoodSales.map((sale) => {
                  const itemsText = Array.isArray(sale.items)
                    ? sale.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')
                    : 'Food Items';

                  const firstItemName = Array.isArray(sale.items) && sale.items[0]?.name?.toLowerCase();
                  let thumb = '/images/more-items.jpg';
                  if (firstItemName?.includes('burger')) thumb = '/images/burger.jpg';
                  else if (firstItemName?.includes('pizza')) thumb = '/images/pizza.jpg';
                  else if (firstItemName?.includes('fries')) thumb = '/images/french-fries.jpg';
                  else if (firstItemName?.includes('vada')) thumb = '/images/vadapav.jpg';
                  else if (firstItemName?.includes('momo')) thumb = '/images/momos.jpg';
                  else if (firstItemName?.includes('drink') || firstItemName?.includes('coke')) thumb = '/images/cold-drinks.jpg';
                  else if (firstItemName?.includes('ice')) thumb = '/images/icecream.jpg';

                  return (
                    <div key={sale.id} className="ts-dash-food-sale-item">
                      <div className="ts-dash-food-item-left">
                        <img
                          src={thumb}
                          alt="Food Thumb"
                          className="ts-dash-food-thumb"
                        />
                        <div>
                          <div className="ts-dash-food-item-title">{itemsText}</div>
                          <div className="ts-dash-food-item-sub">
                            {sale.customerName || 'Walk-in'} • {sale.time || 'Today'} • by {(sale.handledBy || 'Staff').replace(/\s*\(Staff\)/gi, '')}
                          </div>
                        </div>
                      </div>
                      <div className="ts-dash-food-item-right">
                        <span className="ts-dash-food-item-price">₹{sale.totalAmount}</span>
                        <span style={{
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          color: sale.paymentMethod === 'cash' ? '#fbbf24' : '#22d3ee',
                        }}>
                          {sale.paymentMethod === 'cash' ? '💵 Cash' : '📱 UPI'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: Current Stock (Food & Drinks) */}
          <div className="ts-dash-card">
            <div className="ts-dash-card__header">
              <div className="ts-dash-card__title">
                <Package size={16} style={{ color: '#f59e0b' }} />
                <span>Current Stock (Food & Drinks)</span>
              </div>
              <Link to="/admin/food" className="ts-dash-card__link">
                View All
              </Link>
            </div>

            <div className="ts-dash-table-wrap">
              <table className="ts-dash-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Total Stock</th>
                    <th>Sold (Today)</th>
                    <th>Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStock.map((stk, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="ts-dash-stock-item-cell">
                          <img
                            src={stk.image}
                            alt={stk.name}
                            className="ts-dash-stock-thumb"
                          />
                          <span style={{ fontWeight: 600 }}>{stk.name}</span>
                        </div>
                      </td>
                      <td>{stk.total}</td>
                      <td style={{ color: '#f59e0b', fontWeight: 600 }}>{stk.sold}</td>
                      <td style={{ color: stk.remaining <= 10 ? '#ef4444' : '#4ade80', fontWeight: 700 }}>
                        {stk.remaining}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Today's Sales by Staff */}
          <div className="ts-dash-card">
            <div className="ts-dash-card__header">
              <div className="ts-dash-card__title">
                <Users size={16} style={{ color: '#c084fc' }} />
                <span>Today's Sales by Staff</span>
              </div>
              <Link to="/admin/staff" className="ts-dash-card__link">
                View All
              </Link>
            </div>

            <div className="ts-dash-table-wrap">
              <table className="ts-dash-table">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Gaming Sales</th>
                    <th>Food Sales</th>
                    <th>Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStaffSales.map((staff, idx) => {
                    let rowClass = '';
                    if (staff.isCurrent) rowClass = 'ts-dash-staff-row--current';
                    else if (staff.isAdmin) rowClass = 'ts-dash-staff-row--admin';

                    return (
                      <tr key={idx} className={rowClass}>
                        <td style={{ fontWeight: 700 }}>
                          {staff.name}
                        </td>
                        <td style={{ color: '#60a5fa' }}>₹{staff.gaming}</td>
                        <td style={{ color: '#f97316' }}>₹{staff.food}</td>
                        <td style={{ color: '#4ade80', fontWeight: 800 }}>
                          ₹{staff.total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Counter UPI QR Modal ── */}
      <UpiQrModal
        isOpen={showUpiQr}
        onClose={() => setShowUpiQr(false)}
        purpose="TS Gaming Cafe Counter Payment"
      />

      {/* ── Daily Settlement / Cash Closing Report Modal ── */}
      <DailyReportModal
        isOpen={showDailyReport}
        onClose={() => setShowDailyReport(false)}
        allBookings={bookings}
        allFoodSales={foodSales}
        staffList={staffList}
        initialDate={selectedDate}
        stats={stats}
        staffSales={displayStaffSales}
        todayDateStr={selectedDate}
      />

      {/* ── WhatsApp Background Auto-Delivery Settings Modal ── */}
      <WhatsAppSettingsModal
        isOpen={showWhatsAppSettings}
        onClose={() => setShowWhatsAppSettings(false)}
      />
    </div>
  );
}
