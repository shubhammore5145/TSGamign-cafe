import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeToAllActiveSessions,
  subscribeToSetups,
  subscribeToAllBookings,
  subscribeToStaff,
  subscribeToFoodItems,
  subscribeToFoodSales,
  createBooking,
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
} from 'lucide-react';
import { isAdminLoggedIn, isStaffLoggedIn, getStaffUser } from '../../utils/adminAuth';
import { calculateAllStaffSummary, getTodayString } from '../../utils/staffStats';
import { useToast } from '../../context/ToastContext';
import './AdminDashboard.css';

// ── Standard 1-Hour Gaming Slots (5:00 AM to 10:00 PM) ──
const TIME_SLOTS = [
  { id: '05:00', start: '05:00', end: '06:00', label: '5:00 - 6:00 AM' },
  { id: '06:00', start: '06:00', end: '07:00', label: '6:00 - 7:00 AM' },
  { id: '07:00', start: '07:00', end: '08:00', label: '7:00 - 8:00 AM' },
  { id: '08:00', start: '08:00', end: '09:00', label: '8:00 - 9:00 AM' },
  { id: '09:00', start: '09:00', end: '10:00', label: '9:00 - 10:00 AM' },
  { id: '10:00', start: '10:00', end: '11:00', label: '10:00 - 11:00 AM' },
  { id: '11:00', start: '11:00', end: '12:00', label: '11:00 - 12:00 PM' },
  { id: '12:00', start: '12:00', end: '13:00', label: '12:00 - 1:00 PM' },
  { id: '13:00', start: '13:00', end: '14:00', label: '1:00 - 2:00 PM' },
  { id: '14:00', start: '14:00', end: '15:00', label: '2:00 - 3:00 PM' },
  { id: '15:00', start: '15:00', end: '16:00', label: '3:00 - 4:00 PM' },
  { id: '16:00', start: '16:00', end: '17:00', label: '4:00 - 5:00 PM' },
  { id: '17:00', start: '17:00', end: '18:00', label: '5:00 - 6:00 PM' },
  { id: '18:00', start: '18:00', end: '19:00', label: '6:00 - 7:00 PM' },
  { id: '19:00', start: '19:00', end: '20:00', label: '7:00 - 8:00 PM' },
];

// ── Default station presets ──
const PRESET_STATIONS = [
  { id: 'ps2', type: 'PS2', name: 'PS2', sub: 'Group Game Only\n(WWE, SmackDown)', image: '/images/ps2.jpg', rate: 30 },
  { id: 'ps3', type: 'PS3', name: 'PS3', sub: 'Classic HD Games', image: '/images/ps3.jpg', rate: 40 },
  { id: 'ps4', type: 'PS4', name: 'PS4', sub: 'Pro HDR Gaming', image: '/images/ps4.jpg', rate: 60 },
  { id: 'ps5', type: 'PS5', name: 'PS5', sub: '4K 120Hz Next-Gen', image: '/images/ps5.jpg', rate: 100 },
  { id: 'sim', type: 'Sim Racing', name: 'Sim Racing', sub: 'G29 Wheel & Rig', image: '/images/sim-racing.jpg', rate: 150 },
];

export default function AdminDashboard() {
  const toast = useToast();
  const isAdmin = isAdminLoggedIn();
  const isStaff = isStaffLoggedIn();
  const staffUser = getStaffUser();

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

  // Wizard State
  const [selectedStation, setSelectedStation] = useState('PS5');
  const [selectedDuration, setSelectedDuration] = useState('1 Hour');
  const [selectedPlayers, setSelectedPlayers] = useState(1);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[8]); // Default 1:00 - 2:00 PM (Selected like screenshot)

  // Booking Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingCustName, setBookingCustName] = useState('');
  const [bookingCustPhone, setBookingCustPhone] = useState('');
  const [bookingPaymentMode, setBookingPaymentMode] = useState('cash');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

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

  // Check if slot is booked for selected station & date
  const isSlotBooked = (slot) => {
    return bookings.some((b) => {
      if (b.status === 'cancelled') return false;
      if (b.date !== selectedDate) return false;
      const bSetup = (b.setupName || '').toUpperCase();
      const sType = selectedStation.toUpperCase();
      if (!bSetup.includes(sType)) return false;
      return b.startTime === slot.start || b.time === slot.start;
    });
  };

  // Station rate finder
  const currentStationRate = useMemo(() => {
    const found = PRESET_STATIONS.find((s) => s.type === selectedStation);
    return found ? found.rate : 100;
  }, [selectedStation]);

  // Handle Quick Booking Save
  const handleQuickBook = async (e) => {
    e.preventDefault();
    if (!bookingCustName.trim()) {
      toast.show('Please enter customer name', 'error');
      return;
    }
    setIsSubmittingBooking(true);

    try {
      const activeSetup = setups.find((s) => (s.type || '').toUpperCase() === selectedStation.toUpperCase()) || {
        id: 'station-' + selectedStation.toLowerCase(),
        name: selectedStation + ' — Station',
      };

      const durationMultiplier = selectedDuration === '30 Min' ? 0.5 : selectedDuration === '2 Hours' ? 2 : selectedDuration === 'Group' ? 3 : 1;
      const amount = Math.round(currentStationRate * durationMultiplier * (selectedPlayers > 2 ? 1.4 : 1));

      const newBookingData = {
        userName: bookingCustName.trim(),
        userPhone: bookingCustPhone.trim() || '7972430951',
        setupId: activeSetup.id || 'station-1',
        setupName: `${selectedStation} Station`,
        date: selectedDate,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        duration: durationMultiplier,
        players: selectedPlayers,
        totalAmount: amount,
        paymentStatus: bookingPaymentMode === 'cash' ? 'paid_cash' : 'paid_upi',
        paymentMode: bookingPaymentMode,
        status: 'confirmed',
        handledBy: isAdmin ? 'Admin' : (staffUser?.name || 'Staff'),
      };

      await createBooking(newBookingData);
      toast.show(`Booking confirmed for ${bookingCustName} at ${selectedSlot.label}!`, 'success');
      setIsBookModalOpen(false);
      setBookingCustName('');
      setBookingCustPhone('');
    } catch (err) {
      console.error('Quick book error:', err);
      toast.show('Failed to book: ' + err.message, 'error');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const displayBookings = useMemo(() => {
    if (todayBookings.length > 0) {
      return todayBookings.slice(0, 10).map((b, idx) => ({
        id: b.id,
        index: idx + 1,
        time: `${b.startTime || b.time || '5:00 PM'} - ${b.endTime || '6:00 PM'}`,
        station: b.setupName ? b.setupName.replace(/ — Station #\d+/, '').replace('PlayStation ', 'PS') : 'PS5',
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
          {/* NOTICE: As user requested, this is Food Sale, not Food POS! */}
          <Link to="/admin/food" className="ts-dash-nav-btn">
            <Coffee size={14} /> Food Sale
          </Link>
          <Link to="/admin/food" className="ts-dash-nav-btn">
            <Package size={14} /> Stock
          </Link>
          <Link to="/admin/dashboard" className="ts-dash-nav-btn">
            <TrendingUp size={14} /> Today's Report
          </Link>
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
          {/* Card 1: New Booking Wizard */}
          <div className="ts-dash-card">
            <div className="ts-dash-card__header">
              <div className="ts-dash-card__title">
                <Plus size={16} style={{ color: '#ff5500' }} />
                <span>New Booking</span>
              </div>
              <Link to="/admin/bookings" className="ts-dash-card__link">
                View All Bookings
              </Link>
            </div>

            <div className="ts-dash-card__body">
              {/* Stepper Bar */}
              <div className="ts-dash-stepper">
                <div className="ts-dash-step-item ts-dash-step-item--active">
                  <span className="ts-dash-step-num">1</span>
                  <span>Select Station</span>
                </div>
                <ChevronRight size={12} color="#475569" />
                <div className="ts-dash-step-item">
                  <span className="ts-dash-step-num">2</span>
                  <span>Duration</span>
                </div>
                <ChevronRight size={12} color="#475569" />
                <div className="ts-dash-step-item">
                  <span className="ts-dash-step-num">3</span>
                  <span>Players</span>
                </div>
                <ChevronRight size={12} color="#475569" />
                <div className="ts-dash-step-item">
                  <span className="ts-dash-step-num">4</span>
                  <span>Date & Time</span>
                </div>
                <ChevronRight size={12} color="#475569" />
                <div className="ts-dash-step-item">
                  <span className="ts-dash-step-num">5</span>
                  <span>Confirm</span>
                </div>
              </div>

              {/* Station Selection Row */}
              <div className="ts-dash-stations-row">
                {PRESET_STATIONS.map((station) => {
                  const isActive = selectedStation === station.type;
                  return (
                    <button
                      key={station.id}
                      type="button"
                      className={`ts-dash-station-btn ${isActive ? 'ts-dash-station-btn--active' : ''}`}
                      onClick={() => setSelectedStation(station.type)}
                    >
                      <div className="ts-dash-station-img-wrap">
                        <img
                          src={station.image}
                          alt={station.name}
                          className="ts-dash-station-img"
                        />
                      </div>
                      <span className="ts-dash-station-title">{station.name}</span>
                      {station.sub && (
                        <span className="ts-dash-station-note">{station.sub}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Controls Row: Date, Duration, Players */}
              <div className="ts-dash-controls-row">
                {/* Select Date */}
                <div className="ts-dash-control-group">
                  <label className="ts-dash-control-label">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="ts-dash-date-select"
                  />
                </div>

                {/* Select Duration */}
                <div className="ts-dash-control-group">
                  <label className="ts-dash-control-label">Select Duration</label>
                  <div className="ts-dash-pill-group">
                    {['30 Min', '1 Hour', '2 Hours', 'Group'].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        className={`ts-dash-pill ${selectedDuration === dur ? 'ts-dash-pill--active' : ''}`}
                        onClick={() => setSelectedDuration(dur)}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>

                {/* No. of Players */}
                <div className="ts-dash-control-group">
                  <label className="ts-dash-control-label">No. of Players</label>
                  <div className="ts-dash-pill-group">
                    {[1, 2, 3, 4].map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`ts-dash-pill ${selectedPlayers === p ? 'ts-dash-pill--active' : ''}`}
                        onClick={() => setSelectedPlayers(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`ts-dash-pill ${selectedPlayers > 4 ? 'ts-dash-pill--active' : ''}`}
                      onClick={() => setSelectedPlayers(5)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Available Time Slots Section */}
              <div className="ts-dash-slots-header">
                <div className="ts-dash-slots-title">
                  <Clock size={15} style={{ color: '#ff5500' }} />
                  <span>Available Time Slots ({selectedStation})</span>
                </div>
                <div className="ts-dash-slots-legend">
                  <span>
                    <span className="ts-dash-legend-dot ts-dash-legend-dot--green"></span> Available
                  </span>
                  <span>
                    <span className="ts-dash-legend-dot ts-dash-legend-dot--red"></span> Booked
                  </span>
                  <span>
                    <span className="ts-dash-legend-dot ts-dash-legend-dot--orange"></span> Selected
                  </span>
                </div>
              </div>

              {/* Slots Grid */}
              <div className="ts-dash-slots-grid">
                {TIME_SLOTS.map((slot) => {
                  const isBooked = isSlotBooked(slot);
                  const isSelected = selectedSlot && selectedSlot.id === slot.id;

                  let slotClass = 'ts-dash-slot-badge--available';
                  let statusText = 'Available';
                  let dotClass = 'ts-dash-legend-dot--green';

                  if (isBooked) {
                    slotClass = 'ts-dash-slot-badge--booked';
                    statusText = 'Booked';
                    dotClass = 'ts-dash-legend-dot--red';
                  } else if (isSelected) {
                    slotClass = 'ts-dash-slot-badge--selected';
                    statusText = 'Selected';
                    dotClass = 'ts-dash-legend-dot--orange';
                  }

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isBooked}
                      className={`ts-dash-slot-badge ${slotClass}`}
                      onClick={() => !isBooked && setSelectedSlot(slot)}
                    >
                      <span className={`ts-dash-legend-dot ${dotClass}`}></span>
                      <span>{slot.label}</span>
                      <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: 'auto' }}>
                        {statusText}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Book Action Bar */}
              {selectedSlot && (
                <div className="ts-dash-book-action-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={16} color="#ff5500" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
                      Selected: <strong>{selectedStation}</strong> for <strong>{selectedSlot.label}</strong> ({selectedDuration}, {selectedPlayers} Player{selectedPlayers > 1 ? 's' : ''})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ts-dash-book-action-btn"
                    onClick={() => setIsBookModalOpen(true)}
                  >
                    Confirm Booking →
                  </button>
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

      {/* ── Quick Booking Modal ── */}
      {isBookModalOpen && (
        <div className="ts-modal-overlay" onClick={() => setIsBookModalOpen(false)}>
          <div className="ts-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ts-modal-header">
              <div className="ts-modal-title">
                <Gamepad2 size={20} color="#ff5500" />
                <span>New Booking Confirmation</span>
              </div>
              <button
                type="button"
                className="ts-modal-close-btn"
                onClick={() => setIsBookModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickBook}>
              <div className="ts-modal-body">
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 85, 0, 0.08)',
                  border: '1px solid rgba(255, 85, 0, 0.25)',
                  fontSize: '0.8rem',
                  color: '#e2e8f0',
                  lineHeight: 1.5,
                }}>
                  🎮 Console: <strong>{selectedStation}</strong> | ⏰ Slot: <strong>{selectedSlot.label}</strong> ({selectedDate})<br />
                  ⏳ Duration: <strong>{selectedDuration}</strong> | 👥 Players: <strong>{selectedPlayers}</strong>
                </div>

                <div className="ts-form-field">
                  <label className="ts-form-label">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Customer name"
                    value={bookingCustName}
                    onChange={(e) => setBookingCustName(e.target.value)}
                    className="ts-form-input"
                    autoFocus
                  />
                </div>

                <div className="ts-form-field">
                  <label className="ts-form-label">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={bookingCustPhone}
                    onChange={(e) => setBookingCustPhone(e.target.value)}
                    className="ts-form-input"
                  />
                </div>

                <div className="ts-form-field">
                  <label className="ts-form-label">Payment Mode</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.82rem' }}>
                      <input
                        type="radio"
                        name="payMode"
                        value="cash"
                        checked={bookingPaymentMode === 'cash'}
                        onChange={() => setBookingPaymentMode('cash')}
                      />
                      💵 Cash
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.82rem' }}>
                      <input
                        type="radio"
                        name="payMode"
                        value="upi"
                        checked={bookingPaymentMode === 'upi'}
                        onChange={() => setBookingPaymentMode('upi')}
                      />
                      📱 Online UPI
                    </label>
                  </div>
                </div>
              </div>

              <div className="ts-modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsBookModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="btn btn-primary btn-sm"
                  style={{ background: '#ff5500', borderColor: '#ff5500' }}
                >
                  {isSubmittingBooking ? 'Saving...' : 'Confirm & Save Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
