import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeToAllActiveSessions,
  subscribeToSetups,
  subscribeToAllBookings,
  subscribeToStaff,
  subscribeToFoodItems,
  subscribeToFoodSales,
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
} from 'lucide-react';
import { isAdminLoggedIn, isStaffLoggedIn, getStaffUser } from '../../utils/adminAuth';
import { calculateAllStaffSummary, getTodayString } from '../../utils/staffStats';
import { useToast } from '../../context/ToastContext';
import UpiQrModal from '../../components/UpiQrModal';
import DailyReportModal from '../../components/DailyReportModal';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const toast = useToast();
  const isAdmin = isAdminLoggedIn();
  const isStaff = isStaffLoggedIn();
  const staffUser = getStaffUser();

  // Counter UPI QR & Daily Closing Report Modals
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);

  // Firestore Subscriptions
  const [activeSessions, setActiveSessions] = useState([]);
  const [setups, setSetups] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [foodSales, setFoodSales] = useState([]);

  // Live Clock & Date
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => getTodayString(), []);

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
    ];
    return () => unsubs.forEach((f) => f && f());
  }, []);

  // ── Financial Metrics Calculation (Today's Sales) ──
  const todayBookings = useMemo(() => {
    return bookings.filter((b) => b && b.date === todayStr && b.status !== 'cancelled');
  }, [bookings, todayStr]);

  const todayFoodSales = useMemo(() => {
    return foodSales.filter((s) => s && s.date === todayStr);
  }, [foodSales, todayStr]);

  const stats = useMemo(() => {
    // Gaming Sales
    const gamingRevenue = todayBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const gamingCash = todayBookings
      .filter((b) => b.paymentStatus === 'paid_cash' || b.paymentMode === 'cash')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const gamingUpi = todayBookings
      .filter((b) => b.paymentStatus === 'paid_upi' || b.paymentMode === 'upi' || b.paymentStatus === 'paid_card')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

    // Food Sales
    const foodRevenue = todayFoodSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const foodCash = todayFoodSales
      .filter((s) => s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const foodUpi = todayFoodSales
      .filter((s) => s.paymentMethod === 'upi')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    // Food Items Sold count
    const foodItemsCount = todayFoodSales.reduce((sum, s) => {
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
    const finalGamingSessions = todayBookings.length > 0 ? todayBookings.length : 0;
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
  }, [todayBookings, todayFoodSales]);

  const displayBookings = useMemo(() => {
    if (todayBookings.length > 0) {
      return todayBookings.slice(0, 10).map((b, idx) => ({
        id: b.id,
        index: idx + 1,
        time: `${b.startTime || b.time || '5:00 PM'} - ${b.endTime || '6:00 PM'}`,
        station: b.setupName ? b.setupName.replace(/ — Station #\d+/, '').replace('PlayStation ', 'PS') : 'Station',
        players: b.players || 1,
        customer: b.userName || 'Customer',
        bookedBy: (b.handledBy || (b.userId ? 'Website' : 'Staff')).replace(/\s*\(Staff\)/gi, ''),
        amount: b.totalAmount || 100,
        status: b.status === 'active' ? 'Playing' : b.status || 'Confirmed',
      }));
    }

    return [];
  }, [todayBookings]);

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
    const { summary } = calculateAllStaffSummary(staffList, bookings, foodSales);
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
  }, [staffList, bookings, foodSales, isAdmin, isStaff, staffUser]);

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
            <TrendingUp size={14} /> 📊 Day Closing (हिशोब)
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
            <span className="ts-dash-stat-sub">{stats.sessionsCount} Sessions</span>
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

        {/* Card 5: Total Sales (Today) */}
        <div className="ts-dash-stat-card">
          <div className="ts-dash-stat-icon ts-dash-stat-icon--dark">
            <Calendar size={22} />
          </div>
          <div className="ts-dash-stat-body">
            <span className="ts-dash-stat-label">Total Sales (Today)</span>
            <span className="ts-dash-stat-val">₹{stats.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
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

          {/* Card 2: Today's Bookings (All Stations) */}
          <div className="ts-dash-card">
            <div className="ts-dash-card__header">
              <div className="ts-dash-card__title">
                <Calendar size={16} style={{ color: '#38bdf8' }} />
                <span>Today's Bookings (All Stations)</span>
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
                  {displayBookings.map((b) => (
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
                        <span className={`ts-dash-badge ${b.status === 'Playing' ? 'ts-dash-badge--playing' : 'ts-dash-badge--confirmed'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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
        stats={stats}
        staffSales={displayStaffSales}
        todayDateStr={todayStr}
      />
    </div>
  );
}
