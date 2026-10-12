import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeToAllActiveSessions,
  subscribeToSetups,
  subscribeToAllBookings,
  subscribeToStaff,
  subscribeToFoodSales,
} from '../../firebase/firestore';
import {
  Gamepad2,
  Calendar,
  Zap,
  CheckCircle,
  DollarSign,
  Users,
  TrendingUp,
  ShieldAlert,
  UserCheck,
  Coffee,
  Banknote,
  CreditCard,
  Receipt,
  Search,
  Filter,
  Clock,
  ArrowUpRight,
  ShoppingBag,
  Share2,
  MessageCircle,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useSessionTimer, formatTime } from '../../hooks/useSessionTimer';
import { isAdminLoggedIn } from '../../utils/adminAuth';
import { calculateAllStaffSummary, getTodayString } from '../../utils/staffStats';

export default function AdminDashboard() {
  const isAdmin = isAdminLoggedIn();
  const [activeSessions, setActiveSessions] = useState([]);
  const [setups, setSetups] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [foodSales, setFoodSales] = useState([]);

  // Date selection state ('today' | 'yesterday' | 'all' | 'custom')
  const todayStr = useMemo(() => getTodayString(), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [dateFilterMode, setDateFilterMode] = useState('today'); // 'today' | 'yesterday' | 'all' | 'custom'
  const [customDate, setCustomDate] = useState(todayStr);

  // Activity feed tab filter ('all' | 'gaming' | 'food')
  const [activityTab, setActivityTab] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    const unsubs = [
      subscribeToAllActiveSessions(setActiveSessions),
      subscribeToSetups(setSetups),
      subscribeToAllBookings(setBookings),
      subscribeToStaff(setStaffList),
      subscribeToFoodSales(setFoodSales),
    ];
    return () => unsubs.forEach((f) => f && f());
  }, [isAdmin]);

  // Active filter date string
  const activeDate = useMemo(() => {
    if (dateFilterMode === 'today') return todayStr;
    if (dateFilterMode === 'yesterday') return yesterdayStr;
    if (dateFilterMode === 'custom') return customDate;
    return 'all';
  }, [dateFilterMode, todayStr, yesterdayStr, customDate]);

  // Filtered Bookings for the selected date
  const filteredBookings = useMemo(() => {
    if (activeDate === 'all') return bookings;
    return bookings.filter((b) => b.date === activeDate);
  }, [bookings, activeDate]);

  // Filtered Food Sales for the selected date
  const filteredFoodSales = useMemo(() => {
    if (activeDate === 'all') return foodSales;
    return foodSales.filter((s) => s.date === activeDate);
  }, [foodSales, activeDate]);

  // Combined Financial Metrics for the selected date
  const financialMetrics = useMemo(() => {
    // 1. Gaming
    const validBookings = filteredBookings.filter((b) => b && b.status !== 'cancelled');
    const gamingRevenue = validBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const gamingCash = validBookings
      .filter((b) => b.paymentStatus === 'paid_cash' || b.paymentMode === 'cash')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const gamingUpi = validBookings
      .filter((b) => b.paymentStatus === 'paid_upi' || b.paymentMode === 'upi' || b.paymentStatus === 'paid_card')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

    // 2. Food & Snacks
    const foodRevenue = filteredFoodSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const foodCash = filteredFoodSales
      .filter((s) => s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const foodUpi = filteredFoodSales
      .filter((s) => s.paymentMethod === 'upi')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    // 3. Combined Total Cafe Sales
    const totalRevenue = gamingRevenue + foodRevenue;
    const totalCash = gamingCash + foodCash;
    const totalUpi = gamingUpi + foodUpi;

    // Monthly calculation (current month)
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const monthGaming = bookings
      .filter((b) => b.date?.startsWith(currentMonthPrefix) && b.status !== 'cancelled')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const monthFood = foodSales
      .filter((s) => s.date?.startsWith(currentMonthPrefix))
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const monthTotalRevenue = monthGaming + monthFood;

    return {
      totalRevenue,
      totalCash,
      totalUpi,
      gamingRevenue,
      gamingCash,
      gamingUpi,
      gamingCount: validBookings.length,
      foodRevenue,
      foodCash,
      foodUpi,
      foodCount: filteredFoodSales.length,
      monthTotalRevenue,
      monthGaming,
      monthFood,
    };
  }, [filteredBookings, filteredFoodSales, bookings, foodSales]);

  // Staff Daily Summary (includes both bookings & food sales!)
  const { summary: staffDailySummary } = useMemo(() => {
    return calculateAllStaffSummary(staffList, bookings, foodSales);
  }, [staffList, bookings, foodSales]);

  // Consoles status counters
  const availableSetups = setups.filter((s) => s.status === 'available').length;
  const occupiedSetups = setups.filter((s) => s.status === 'occupied').length;
  const maintenanceSetups = setups.filter((s) => s.status === 'maintenance').length;

  // Unified "काय काय झाले (Activity Ledger)" Feed
  const unifiedActivities = useMemo(() => {
    const list = [];

    // Add Gaming Bookings
    filteredBookings.forEach((b) => {
      list.push({
        id: 'booking-' + b.id,
        type: 'gaming',
        rawId: b.id,
        date: b.date,
        time: b.startTime || b.time || 'Time N/A',
        timestamp: b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0,
        customerName: b.userName || 'Walk-in Gamer',
        phone: b.userPhone || '',
        title: `${b.setupName || 'Console'} Session`,
        subtitle: `${b.startTime || ''} to ${b.endTime || ''} (${b.duration || b.totalHours || 1} hr)`,
        amount: Number(b.totalAmount) || 0,
        paymentMethod: (b.paymentStatus === 'paid_cash' || b.paymentMode === 'cash') ? 'cash' : 'upi',
        paymentStatus: b.paymentStatus || 'confirmed',
        status: b.status || 'confirmed',
        handledBy: b.handledBy || b.createdBy || 'Counter Staff',
        raw: b,
      });
    });

    // Add Cafe Food Sales
    filteredFoodSales.forEach((s) => {
      const itemsText = Array.isArray(s.items)
        ? s.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')
        : `${s.totalItemsCount || 1} items`;

      list.push({
        id: 'food-' + (s.id || Math.random()),
        type: 'food',
        rawId: s.id,
        date: s.date,
        time: s.time || 'Time N/A',
        timestamp: s.createdAt?.toDate ? s.createdAt.toDate().getTime() : s.createdAt ? new Date(s.createdAt).getTime() : 0,
        customerName: s.customerName || 'Cafe Customer',
        phone: '',
        title: `Food & Snacks (${s.tableOrStation || 'Counter'})`,
        subtitle: itemsText,
        amount: Number(s.totalAmount) || 0,
        paymentMethod: s.paymentMethod === 'cash' ? 'cash' : 'upi',
        paymentStatus: 'paid',
        status: 'completed',
        handledBy: s.handledBy || 'Staff Desk',
        raw: s,
      });
    });

    // Sort by timestamp or time descending
    return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [filteredBookings, filteredFoodSales]);

  // Filtered Activities by tab and search
  const displayedActivities = useMemo(() => {
    return unifiedActivities.filter((act) => {
      if (activityTab === 'gaming' && act.type !== 'gaming') return false;
      if (activityTab === 'food' && act.type !== 'food') return false;

      if (activitySearch.trim()) {
        const query = activitySearch.toLowerCase().trim();
        const matchCust = act.customerName.toLowerCase().includes(query);
        const matchTitle = act.title.toLowerCase().includes(query);
        const matchSub = act.subtitle.toLowerCase().includes(query);
        const matchHandler = act.handledBy.toLowerCase().includes(query);
        return matchCust || matchTitle || matchSub || matchHandler;
      }
      return true;
    });
  }, [unifiedActivities, activityTab, activitySearch]);

  // Top Selling Food items on selected date
  const topSellingFood = useMemo(() => {
    const map = {};
    filteredFoodSales.forEach((sale) => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          if (!map[item.name]) {
            map[item.name] = { name: item.name, quantity: 0, revenue: 0 };
          }
          map[item.name].quantity += Number(item.quantity) || 1;
          map[item.name].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
        });
      }
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredFoodSales]);

  // WhatsApp Bill Generator for food
  const getWhatsAppFoodBill = (sale) => {
    if (!sale) return '';
    const itemLines = Array.isArray(sale.items)
      ? sale.items.map((i) => `• ${i.name} x ${i.quantity} = ₹${i.subtotal || i.price * i.quantity}`).join('\n')
      : '';
    const msg = `🧾 *TS GAMING CAFE — Bill*
👤 Customer: ${sale.customerName}
🎮 Station: ${sale.tableOrStation}
📅 Date: ${sale.date} (${sale.time})
------------------------
${itemLines}
------------------------
💰 *Total: ₹${sale.totalAmount}* (${sale.paymentMethod.toUpperCase()})
👨‍💼 Handled by: ${sale.handledBy}
📍 TS Gaming Cafe, Waluj, Sambhajinagar`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  // WhatsApp Booking Reminder / Receipt
  const getWhatsAppBookingReceipt = (booking) => {
    if (!booking) return '';
    const msg = `🎮 *TS GAMING CAFE — Booking Slip*
👤 Gamer: ${booking.userName}
🕹️ Console: ${booking.setupName}
📅 Date: ${booking.date}
⏰ Slot: ${booking.startTime} - ${booking.endTime}
💰 *Amount: ₹${booking.totalAmount}* (${booking.paymentMode?.toUpperCase() || 'PAID'})
👨‍💼 Billed by: ${booking.handledBy || 'Admin'}
📍 TS Gaming Cafe, Waluj, Sambhajinagar`;
    return `https://wa.me/${booking.userPhone ? '91' + booking.userPhone : ''}?text=${encodeURIComponent(msg)}`;
  };

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: 'var(--space-2xl)', textAlign: 'center' }} className="glass">
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)',
          color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto var(--space-md)'
        }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ color: '#fff', marginBottom: 'var(--space-sm)' }}>Access Restricted</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)', fontSize: '0.9rem' }}>
          Revenue & cafe financial analytics are only accessible by Super Admin.
        </p>
        <Link to="/admin" className="btn btn-primary">
          ← Back to Bookings & Slots
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* ── Top Header with Date Filter Bar ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '1.25rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="admin-page__title" style={{ margin: 0 }}>
              कॅफे विक्री & हिशोब (Cafe Sales & Activity)
            </h1>
            <span style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.3))',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#f59e0b',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 6,
            }}>
              👑 SUPER ADMIN
            </span>
          </div>
          <p className="admin-page__subtitle" style={{ margin: '4px 0 0' }}>
            गेमिंग + कॅफे फूड विक्री, कॅश व UPI गल्ला आणि कॅफेमध्ये काय काय घडले याची संपूर्ण माहिती
          </p>
        </div>

        {/* Date Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            gap: 4,
          }}>
            <button
              onClick={() => setDateFilterMode('today')}
              className={`btn btn-sm ${dateFilterMode === 'today' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '5px 10px' }}
            >
              आज (Today)
            </button>
            <button
              onClick={() => setDateFilterMode('yesterday')}
              className={`btn btn-sm ${dateFilterMode === 'yesterday' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '5px 10px' }}
            >
              काल (Yesterday)
            </button>
            <button
              onClick={() => setDateFilterMode('all')}
              className={`btn btn-sm ${dateFilterMode === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '5px 10px' }}
            >
              सर्व (All Time)
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="date"
              value={dateFilterMode === 'custom' ? customDate : activeDate === 'all' ? todayStr : activeDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDateFilterMode('custom');
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                outline: 'none',
              }}
              title="तारीख निवडा (Pick any custom date)"
            />
          </div>
        </div>
      </div>

      {/* ── MASTER SALES CARDS (Total Revenue, Cash, UPI, Gaming, Food) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-md)',
        marginBottom: '1.5rem',
      }}>
        {/* Card 1: Total Cafe Revenue */}
        <div className="glass" style={{
          padding: '16px 18px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              एकूण कॅफे विक्री ({dateFilterMode === 'all' ? 'सर्व' : activeDate})
            </span>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4ade80', margin: '8px 0 4px', fontFamily: 'var(--font-display)' }}>
            ₹{financialMetrics.totalRevenue}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
            🎮 गेमिंग: ₹{financialMetrics.gamingRevenue} + 🍔 फूड: ₹{financialMetrics.foodRevenue}
          </div>
        </div>

        {/* Card 2: Cash in Drawer */}
        <div className="glass" style={{
          padding: '16px 18px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fcd34d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              कॅश गल्ला (Cash in Drawer)
            </span>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Banknote size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fbbf24', margin: '8px 0 4px', fontFamily: 'var(--font-display)' }}>
            ₹{financialMetrics.totalCash}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
            💵 गेमिंग कॅश: ₹{financialMetrics.gamingCash} • फूड कॅश: ₹{financialMetrics.foodCash}
          </div>
        </div>

        {/* Card 3: Online UPI Collection */}
        <div className="glass" style={{
          padding: '16px 18px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.05))',
          border: '1px solid rgba(6, 182, 212, 0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ऑनलाईन / UPI गल्ला (Online UPI)
            </span>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(6, 182, 212, 0.2)', color: '#22d3ee',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CreditCard size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#22d3ee', margin: '8px 0 4px', fontFamily: 'var(--font-display)' }}>
            ₹{financialMetrics.totalUpi}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
            📱 गेमिंग UPI: ₹{financialMetrics.gamingUpi} • फूड UPI: ₹{financialMetrics.foodUpi}
          </div>
        </div>

        {/* Card 4: Month Total Revenue */}
        <div className="glass" style={{
          padding: '16px 18px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(126, 34, 206, 0.05))',
          border: '1px solid rgba(147, 51, 234, 0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              चालू महिना एकूण (This Month)
            </span>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(147, 51, 234, 0.2)', color: '#c084fc',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#c084fc', margin: '8px 0 4px', fontFamily: 'var(--font-display)' }}>
            ₹{financialMetrics.monthTotalRevenue}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
            गेमिंग ₹{financialMetrics.monthGaming} + फूड ₹{financialMetrics.monthFood}
          </div>
        </div>
      </div>

      {/* ── Secondary Quick Metrics Row (Gaming vs Food counts, Consoles) ── */}
      <div className="admin-kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-kpi-card glass">
          <div className="admin-kpi-card__icon" style={{ background: 'rgba(147, 51, 234, 0.15)' }}>
            <Gamepad2 size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className="admin-kpi-card__value" style={{ color: 'var(--color-primary-light)' }}>
            {financialMetrics.gamingCount}
          </div>
          <div className="admin-kpi-card__label">गेमिंग बुकिंग्स (Gaming Sessions)</div>
        </div>

        <div className="admin-kpi-card glass">
          <div className="admin-kpi-card__icon" style={{ background: 'rgba(255, 85, 0, 0.15)' }}>
            <Coffee size={18} style={{ color: '#ff5500' }} />
          </div>
          <div className="admin-kpi-card__value" style={{ color: '#ff7733' }}>
            {financialMetrics.foodCount}
          </div>
          <div className="admin-kpi-card__label">कॅफे ऑर्डर्स (Food/Drinks Billed)</div>
        </div>

        <div className="admin-kpi-card glass">
          <div className="admin-kpi-card__icon" style={{ background: 'var(--color-accent-dim)' }}>
            <Zap size={18} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="admin-kpi-card__value" style={{ color: 'var(--color-accent)' }}>
            {activeSessions.length}
          </div>
          <div className="admin-kpi-card__label">लाईव्ह सेशन्स (Live Playing Now)</div>
        </div>

        <div className="admin-kpi-card glass">
          <div className="admin-kpi-card__icon" style={{ background: 'var(--color-secondary-dim)' }}>
            <CheckCircle size={18} style={{ color: 'var(--color-secondary)' }} />
          </div>
          <div className="admin-kpi-card__value" style={{ color: 'var(--color-secondary)' }}>
            {availableSetups} / {setups.length}
          </div>
          <div className="admin-kpi-card__label">उपलब्ध प्लेस्टेशन (Available Consoles)</div>
        </div>
      </div>

      {/* ── SECTION: "काय काय झाले (Cafe Activity Timeline / Ledger)" ── */}
      <div className="glass" style={{ padding: 'var(--space-lg)', marginBottom: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '1rem',
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Receipt size={20} style={{ color: 'var(--color-accent)' }} />
              काय काय झाले — संपूर्ण व्यवहार लेजर ({displayedActivities.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              निवडलेल्या तारखेतील गेमिंग बुकिंग्स व कॅफे फूड ऑर्डर्सची वेळोवेळी नोंद
            </span>
          </div>

          {/* Filter Pills & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              gap: 4,
            }}>
              <button
                onClick={() => setActivityTab('all')}
                className={`btn btn-sm ${activityTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                सगळे ({unifiedActivities.length})
              </button>
              <button
                onClick={() => setActivityTab('gaming')}
                className={`btn btn-sm ${activityTab === 'gaming' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                🎮 गेमिंग ({financialMetrics.gamingCount})
              </button>
              <button
                onClick={() => setActivityTab('food')}
                className={`btn btn-sm ${activityTab === 'food' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                🍔 फूड/स्नॅक्स ({financialMetrics.foodCount})
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
              <input
                type="text"
                placeholder="ग्राहक किंवा स्टाफ शोधा..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  padding: '6px 10px 6px 30px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  width: '180px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Timeline / Ledger Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayedActivities.map((act) => (
            <div
              key={act.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                gap: 12,
                flexWrap: 'wrap',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Left: Icon & Description */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260, flex: 1 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: act.type === 'gaming' ? 'rgba(147, 51, 234, 0.15)' : 'rgba(255, 85, 0, 0.15)',
                  border: `1px solid ${act.type === 'gaming' ? 'rgba(147, 51, 234, 0.3)' : 'rgba(255, 85, 0, 0.3)'}`,
                  color: act.type === 'gaming' ? 'var(--color-primary-light)' : '#ff5500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {act.type === 'gaming' ? <Gamepad2 size={20} /> : <Coffee size={20} />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
                      {act.customerName}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                      background: act.type === 'gaming' ? 'rgba(147, 51, 234, 0.2)' : 'rgba(255, 85, 0, 0.2)',
                      color: act.type === 'gaming' ? '#c084fc' : '#ff7733',
                    }}>
                      {act.type === 'gaming' ? '🎮 Gaming' : '🍔 Food'}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      color: 'var(--color-text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <Clock size={11} /> {act.time}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    <strong>{act.title}</strong> — {act.subtitle}
                  </div>
                </div>
              </div>

              {/* Middle: Handled By & Staff info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.74rem',
                color: 'var(--color-text-dim)',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
              }}>
                <UserCheck size={14} style={{ color: 'var(--color-accent)' }} />
                <span>हाताळले: <strong style={{ color: '#fff' }}>{act.handledBy}</strong></span>
              </div>

              {/* Right: Payment badge, Amount & Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontWeight: 700,
                  background: act.paymentMethod === 'cash' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                  color: act.paymentMethod === 'cash' ? '#fbbf24' : '#22d3ee',
                  border: `1px solid ${act.paymentMethod === 'cash' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {act.paymentMethod === 'cash' ? '💵 Cash' : '📱 UPI'}
                </span>

                <div style={{
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: '#4ade80',
                  fontFamily: 'var(--font-display)',
                  minWidth: 70,
                  textAlign: 'right',
                }}>
                  ₹{act.amount}
                </div>

                {/* WhatsApp Receipt trigger */}
                {act.type === 'food' ? (
                  <a
                    href={getWhatsAppFoodBill(act.raw)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp पावती पाठवा"
                    className="btn btn-sm btn-ghost"
                    style={{ padding: '4px 6px', color: '#22c55e' }}
                  >
                    <MessageCircle size={15} />
                  </a>
                ) : (
                  <a
                    href={getWhatsAppBookingReceipt(act.raw)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp बुकिंग स्लिप पाठवा"
                    className="btn btn-sm btn-ghost"
                    style={{ padding: '4px 6px', color: '#22c55e' }}
                  >
                    <MessageCircle size={15} />
                  </a>
                )}
              </div>
            </div>
          ))}

          {displayedActivities.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem',
              color: 'var(--color-text-muted)',
              fontSize: '0.85rem',
            }}>
              या तारखेला कोणतीही नोंद आढळली नाही. (No activities recorded on this date).
            </div>
          )}
        </div>
      </div>

      {/* ── TWO-COLUMN GRID: Staff Collection & Best Sellers ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 'var(--space-md)',
        marginBottom: '1.5rem',
      }}>
        {/* Staff-wise Collection Breakdown */}
        <div className="glass" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
          <div className="admin-section-header" style={{ marginBottom: '12px' }}>
            <div>
              <h3 className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <UserCheck size={18} style={{ color: 'var(--color-primary)' }} />
                स्टाफ हिशोब आज (Staff Collection Breakdown)
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                कोणत्या स्टाफने किती रोख (Cash) व किती UPI जमा केले
              </span>
            </div>
            <Link to="/admin/staff" className="btn btn-sm btn-ghost">Full Staff →</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {staffDailySummary.map(({ staff, todayCount, todayGamingCount, todayFoodCount, todayCash, todayUpi, todayCollection }) => (
              <div
                key={staff.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.75rem',
                    }}>
                      {(staff.name || 'S')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{staff.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                        🎮 {todayGamingCount || 0} गेमिंग • 🍔 {todayFoodCount || 0} फूड ऑर्डर्स
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#4ade80' }}>
                      ₹{todayCollection}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>एकूण गोळा</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  fontSize: '0.72rem',
                }}>
                  <span>💵 हातातील रोख (Cash to collect): <strong style={{ color: '#fbbf24' }}>₹{todayCash}</strong></span>
                  <span>📱 ऑनलाइन (UPI): <strong style={{ color: '#22d3ee' }}>₹{todayUpi}</strong></span>
                </div>
              </div>
            ))}

            {staffDailySummary.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                कोणताही स्टाफ जोडलेला नाही. <Link to="/admin/staff">स्टाफ जोडा →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Food / Snacks Breakdown */}
        <div className="glass" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
          <div className="admin-section-header" style={{ marginBottom: '12px' }}>
            <div>
              <h3 className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <ShoppingBag size={18} style={{ color: '#ff5500' }} />
                जास्त विकलेले पदार्थ (Top Selling Items Today)
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                कॅफेमध्ये आज कोणत्या स्नॅक्स किंवा पेयांची सर्वाधिक विक्री झाली
              </span>
            </div>
            <Link to="/admin/food" className="btn btn-sm btn-ghost">Food Stock →</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topSellingFood.map((item, idx) => (
              <div
                key={item.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: idx === 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: idx === 0 ? '#fbbf24' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.72rem',
                  }}>
                    #{idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{item.name}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                      विकलेली संख्या: <strong>{item.quantity}</strong> units
                    </div>
                  </div>
                </div>

                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ff7733' }}>
                  ₹{item.revenue}
                </div>
              </div>
            ))}

            {topSellingFood.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                आज अजून कोणतीही फूड ऑर्डर झालेली नाही.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PlayStation Consoles Status ── */}
      <div className="glass" style={{ padding: 'var(--space-lg)', marginBottom: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <div className="admin-section-header">
          <div>
            <h3 className="admin-section-title" style={{ margin: 0 }}>
              प्लेस्टेशन कंसोल स्थिती (PlayStation Setups Status)
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              PS2, PS3, PS4, PS5 व PC setups ची लाईव्ह स्थिती
            </span>
          </div>
          <Link to="/admin/setups" className="btn btn-sm btn-ghost">Manage Setups →</Link>
        </div>
        <div className="admin-setups-grid">
          {setups.map((setup) => (
            <div
              key={setup.id}
              className={`admin-setup-tile admin-setup-tile--${setup.status}`}
              title={`${setup.name} — ${setup.status}`}
            >
              <div className="admin-setup-tile__number">#{String(setup.setupNumber || '?').padStart(2, '0')}</div>
              <div className={`status-dot ${setup.status === 'available' ? 'green' : setup.status === 'occupied' ? 'red' : 'gray'}`} style={{ margin: '4px auto' }} />
              <div className="admin-setup-tile__name">{setup.type || 'PS'}</div>
            </div>
          ))}
          {setups.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
              No PlayStation setups found. <Link to="/admin/setups">Add Consoles →</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Active Live Sessions Preview ── */}
      {activeSessions.length > 0 && (
        <div className="glass" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
          <div className="admin-section-header">
            <h3 className="admin-section-title" style={{ margin: 0 }}>
              🟢 चालू गेमिंग सेशन्स (Live Playing Now — {activeSessions.length})
            </h3>
            <Link to="/admin/sessions" className="btn btn-sm btn-ghost">Full Live Sessions →</Link>
          </div>
          <div className="admin-sessions-grid">
            {activeSessions.slice(0, 4).map((session) => (
              <MiniSessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniSessionCard({ session }) {
  const { remaining } = useSessionTimer(session, null);
  return (
    <div className="admin-session-card glass">
      <div className="admin-session-card__user">
        <img
          src={session.userImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.userName || 'U')}&background=9333ea&color=fff`}
          alt={session.userName}
          className="admin-session-card__avatar"
          style={{ width: 32, height: 32 }}
        />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{session.userName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{session.setupName}</div>
        </div>
      </div>
      <div className="admin-session-card__timer" style={{ fontSize: '1.4rem' }}>
        {formatTime(remaining)}
      </div>
    </div>
  );
}
