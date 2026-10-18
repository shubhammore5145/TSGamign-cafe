import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Gamepad2,
  Clock,
  Calendar,
  Users,
  Coffee,
  Check,
  ChevronRight,
  Phone,
  MessageCircle,
  X,
  Zap,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  createBooking,
  subscribeToSetups,
  subscribeToAllBookings,
  subscribeToFoodItems,
} from '../firebase/firestore';
import './Home.css';
import './admin/AdminDashboard.css';

// Preset Stations matching screenshot
const STATIONS = [
  { id: 'ps2', type: 'PS2', name: 'PS2', sub: 'Group Game Only (WWE, SmackDown)', image: '/images/ps2.jpg', rate: 30, rate30: 20 },
  { id: 'ps3', type: 'PS3', name: 'PS3', sub: 'Classic HD Multiplayer', image: '/images/ps3.jpg', rate: 40, rate30: 25 },
  { id: 'ps4', type: 'PS4', name: 'PS4', sub: 'Pro 4K HDR Gaming', image: '/images/ps4.jpg', rate: 60, rate30: 40 },
  { id: 'ps5', type: 'PS5', name: 'PS5', sub: 'Next-Gen 120Hz & DualSense', image: '/images/ps5.jpg', rate: 100, rate30: 60 },
  { id: 'sim', type: 'Sim Racing', name: 'Sim Racing', sub: 'G29 Wheel & Rig', image: '/images/sim-racing.jpg', rate: 150, rate30: 90 },
];

// Available Time Slots (5:00 AM to 10:00 PM)
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

// Preset Cafe Snacks
const DEFAULT_SNACKS = [
  { id: 'f-1', name: 'Burger', category: 'Burger', price: 60, image: '/images/burger.jpg' },
  { id: 'f-2', name: 'Pizza', category: 'Pizza', price: 120, image: '/images/pizza.jpg' },
  { id: 'f-3', name: 'French Fries', category: 'Snacks', price: 40, image: '/images/french-fries.jpg' },
  { id: 'f-4', name: 'Vadapav', category: 'Snacks', price: 40, image: '/images/vadapav.jpg' },
  { id: 'f-5', name: 'Momos', category: 'Snacks', price: 50, image: '/images/momos.jpg' },
  { id: 'f-6', name: 'Cold Drink', category: 'Drinks', price: 35, image: '/images/cold-drinks.jpg' },
  { id: 'f-7', name: 'Ice Cream', category: 'Ice Cream', price: 40, image: '/images/icecream.jpg' },
];

export default function Booking() {
  const toast = useToast();

  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State
  const [selectedStation, setSelectedStation] = useState('PS5');
  const [selectedDuration, setSelectedDuration] = useState('1 Hour');
  const [selectedPlayers, setSelectedPlayers] = useState(1);
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[8]); // 1:00 - 2:00 PM
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Firestore Subscriptions
  const [allBookings, setAllBookings] = useState([]);
  const [foodItems, setFoodItems] = useState(DEFAULT_SNACKS);

  // Snacks Cart State
  const [snackCategory, setSnackCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    const unsubBookings = subscribeToAllBookings((b) => {
      if (Array.isArray(b)) setAllBookings(b);
    });
    const unsubFood = subscribeToFoodItems((items) => {
      if (Array.isArray(items) && items.length > 0) {
        setFoodItems(items);
      }
    });
    return () => {
      if (typeof unsubBookings === 'function') unsubBookings();
      if (typeof unsubFood === 'function') unsubFood();
    };
  }, []);

  // Check if slot is booked
  const isSlotBooked = (slot) => {
    return allBookings.some((b) => {
      if (b.status === 'cancelled') return false;
      if (b.date !== selectedDate) return false;
      const bSetup = (b.setupName || '').toUpperCase();
      const sType = selectedStation.toUpperCase();
      if (!bSetup.includes(sType)) return false;
      return b.startTime === slot.start || b.time === slot.start;
    });
  };

  // Station Object
  const currentStationObj = useMemo(() => {
    return STATIONS.find((s) => s.type === selectedStation) || STATIONS[3];
  }, [selectedStation]);

  // Gaming Cost Calculation
  const gamingAmount = useMemo(() => {
    const rate = currentStationObj.rate || 100;
    const rate30 = currentStationObj.rate30 || Math.round(rate * 0.6);
    const playerMult = selectedPlayers > 2 ? 1.4 : 1;
    if (selectedDuration === '30 Min') {
      return Math.round(rate30 * playerMult);
    }
    const durMult = selectedDuration === '2 Hours' ? 2 : selectedDuration === 'Group' ? 3 : 1;
    return Math.round(rate * durMult * playerMult);
  }, [currentStationObj, selectedDuration, selectedPlayers]);

  // Food Cart Handlers
  const handleAddToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) => (i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.show(`Added ${item.name} to snacks order!`, 'success');
  };

  const handleUpdateCartQty = (itemName, delta) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.name === itemName) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean);
    });
  };

  const snacksAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  }, [cart]);

  const totalAmount = gamingAmount + snacksAmount;

  // Filtered Snacks
  const filteredSnacks = useMemo(() => {
    if (snackCategory === 'All') return foodItems;
    return foodItems.filter((i) => (i.category || '').toLowerCase() === snackCategory.toLowerCase());
  }, [foodItems, snackCategory]);

  // Handle Form Submit
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.show('Please enter your Name and Mobile Number', 'error');
      return;
    }
    if (isSlotBooked(selectedSlot)) {
      toast.show('This slot is already booked. Please pick another available slot.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        userName: customerName.trim(),
        customerName: customerName.trim(),
        userPhone: customerPhone.trim(),
        customerPhone: customerPhone.trim(),
        setupName: `${selectedStation} Station`,
        stationName: `${selectedStation} Station`,
        date: selectedDate,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        timeSlotRange: selectedSlot.label,
        duration: selectedDuration === '30 Min' ? 0.5 : selectedDuration === '2 Hours' ? 2 : selectedDuration === 'Group' ? 3 : 1,
        players: selectedPlayers,
        playerCount: selectedPlayers,
        gamingAmount,
        snacksAmount,
        totalAmount,
        foodItems: cart,
        status: 'confirmed',
        paymentStatus: 'pending',
        paymentMode: 'pay_at_cafe',
        source: 'website_user',
      };

      await createBooking(payload);
      setBookingSuccess(payload);
      toast.show('Session Booked Successfully! See you at TS Gaming Cafe.', 'success');
    } catch (err) {
      console.error('Booking failed:', err);
      toast.show('Failed to book session: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ paddingTop: '80px', paddingBottom: '60px', minHeight: '100vh', background: '#07080b' }}>
      <div className="container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 1rem' }}>
        
        {/* Page Heading */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 30,
            background: 'rgba(255, 85, 0, 0.12)',
            border: '1px solid rgba(255, 85, 0, 0.3)',
            color: '#ff5500',
            fontSize: '0.82rem',
            fontWeight: 800,
            marginBottom: '0.75rem',
          }}>
            <Sparkles size={15} /> INSTANT CONSOLE RESERVATION
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display, Orbitron)',
            fontSize: '2.2rem',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '0.04em',
            margin: '0 0 8px',
          }}>
            BOOK YOUR GAMING SESSION
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
            PlayStation 5, PS4, PS3, PS2 & Sim Racing Cockpit • Fresh Cafe Snacks at TS Gaming Cafe (Waluj)
          </p>
        </div>

        {/* ── Main Two-Column Layout Matching Screenshot ── */}
        <div className="ts-dash-main-grid" style={{ gridTemplateColumns: '1.45fr 1fr', gap: '1.5rem' }}>
          
          {/* ══ LEFT COLUMN: NEW BOOKING WIZARD ══ */}
          <div className="ts-dash-col-left">
            <div className="ts-dash-card">
              <div className="ts-dash-card__header">
                <div className="ts-dash-card__title">
                  <Gamepad2 size={18} style={{ color: '#ff5500' }} />
                  <span>New Booking</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600 }}>
                  Waluj, Sambhajinagar
                </span>
              </div>

              <div className="ts-dash-card__body">
                {/* 5-Step Stepper Bar */}
                <div className="ts-dash-stepper">
                  <div className="ts-dash-step-item ts-dash-step-item--active">
                    <span className="ts-dash-step-num">1</span>
                    <span>Select Station</span>
                  </div>
                  <ChevronRight size={12} color="#475569" />
                  <div className="ts-dash-step-item ts-dash-step-item--active">
                    <span className="ts-dash-step-num">2</span>
                    <span>Duration</span>
                  </div>
                  <ChevronRight size={12} color="#475569" />
                  <div className="ts-dash-step-item ts-dash-step-item--active">
                    <span className="ts-dash-step-num">3</span>
                    <span>Players</span>
                  </div>
                  <ChevronRight size={12} color="#475569" />
                  <div className="ts-dash-step-item ts-dash-step-item--active">
                    <span className="ts-dash-step-num">4</span>
                    <span>Date & Time</span>
                  </div>
                  <ChevronRight size={12} color="#475569" />
                  <div className="ts-dash-step-item">
                    <span className="ts-dash-step-num">5</span>
                    <span>Confirm</span>
                  </div>
                </div>

                {/* Station Selection Cards */}
                <div className="ts-dash-stations-row">
                  {STATIONS.map((station) => {
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
                      min={getTodayDateStr()}
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

                {/* Available Time Slots Header & Legend */}
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

                {/* 15 Time Slots Grid */}
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

                {/* Selected Slot Highlight Note */}
                <div style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 85, 0, 0.08)',
                  border: '1px solid rgba(255, 85, 0, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                    🎮 Selected Console: <strong style={{ color: '#fff' }}>{selectedStation}</strong> | Slot: <strong style={{ color: '#ff5500' }}>{selectedSlot.label}</strong> ({selectedDate})
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4ade80' }}>
                    ₹{gamingAmount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ══ RIGHT COLUMN: FOOD & SNACKS + SUMMARY CHECKOUT ══ */}
          <div className="ts-dash-col-right">
            
            {/* POS / Food Sale / Snacks Menu Section */}
            <div className="ts-dash-card">
              <div className="ts-dash-card__header">
                <div className="ts-dash-card__title">
                  <Coffee size={16} style={{ color: '#f97316' }} />
                  <span>Cafe Food & Drinks (Add-On)</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fresh & Hot</span>
              </div>

              <div className="ts-dash-card__body">
                {/* Category Pills */}
                <div className="ts-dash-food-filters">
                  {['All', 'Pizza', 'Burger', 'Snacks', 'Drinks', 'Ice Cream'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`ts-dash-food-tab ${snackCategory === cat ? 'ts-dash-food-tab--active' : ''}`}
                      onClick={() => setSnackCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Food Items Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: 10,
                  marginBottom: 12,
                }}>
                  {filteredSnacks.map((item) => (
                    <div
                      key={item.id || item.name}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 10,
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        position: 'relative',
                      }}
                    >
                      <img
                        src={item.image || '/images/more-items.jpg'}
                        alt={item.name}
                        style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }}
                        onError={(e) => { e.target.src = '/images/more-items.jpg'; }}
                      />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                        {item.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 4 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4ade80' }}>
                          ₹{item.price}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: '#ff5500',
                            border: 'none',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            boxShadow: '0 0 8px rgba(255, 85, 0, 0.4)',
                          }}
                          title="Add to order"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart View if items added */}
                {cart.length > 0 && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1' }}>
                      <span>🛒 Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                      <button
                        type="button"
                        onClick={() => setCart([])}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem' }}
                      >
                        Clear
                      </button>
                    </div>
                    {cart.map((i) => (
                      <div key={i.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#e2e8f0', marginBottom: 4 }}>
                        <span>{i.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(i.name, -1)}
                            style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', borderRadius: 4, width: 18, height: 18, cursor: 'pointer' }}
                          >
                            -
                          </button>
                          <span>{i.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(i.name, 1)}
                            style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', borderRadius: 4, width: 18, height: 18, cursor: 'pointer' }}
                          >
                            +
                          </button>
                          <strong style={{ color: '#4ade80', marginLeft: 6 }}>₹{i.price * i.quantity}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Booking Summary & Confirmation Form */}
            <div className="ts-dash-card">
              <div className="ts-dash-card__header">
                <div className="ts-dash-card__title">
                  <Receipt size={16} style={{ color: '#38bdf8' }} />
                  <span>Session Summary & Checkout</span>
                </div>
              </div>

              <div className="ts-dash-card__body">
                <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Summary Breakdown */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '0.78rem',
                    color: '#cbd5e1',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>🎮 Gaming ({selectedStation}, {selectedDuration}):</span>
                      <strong style={{ color: '#fff' }}>₹{gamingAmount}</strong>
                    </div>
                    {snacksAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>🍔 Food & Drinks:</span>
                        <strong style={{ color: '#f97316' }}>₹{snacksAmount}</strong>
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      paddingTop: 6,
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: '#4ade80',
                    }}>
                      <span>Total to Pay:</span>
                      <span>₹{totalAmount}</span>
                    </div>
                  </div>

                  {/* Customer Inputs */}
                  <div className="ts-form-field">
                    <label className="ts-form-label">Your Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Your name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="ts-form-input"
                    />
                  </div>

                  <div className="ts-form-field">
                    <label className="ts-form-label">WhatsApp Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="Phone number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="ts-form-input"
                    />
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    📍 <strong>Location:</strong> TS Gaming Cafe, Waluj, Sambhajinagar.<br />
                    💵 <strong>Payment:</strong> Pay at cafe counter (Cash or UPI GPay/PhonePe).
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #ff5500, #ea580c)',
                      border: 'none',
                      padding: '12px',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      boxShadow: '0 0 20px rgba(255, 85, 0, 0.4)',
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Confirming...' : `Confirm Booking • ₹${totalAmount}`}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── Success Modal with WhatsApp Slip ── */}
      {bookingSuccess && (
        <div className="ts-modal-overlay" onClick={() => setBookingSuccess(null)}>
          <div className="ts-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ts-modal-header">
              <div className="ts-modal-title" style={{ color: '#4ade80' }}>
                <Check size={20} />
                <span>Booking Confirmed!</span>
              </div>
              <button
                type="button"
                className="ts-modal-close-btn"
                onClick={() => setBookingSuccess(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="ts-modal-body">
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
                }}>
                  <Check size={30} />
                </div>
                <h3 style={{ margin: '0 0 6px', color: '#fff', fontSize: '1.25rem' }}>
                  Session Reserved for {bookingSuccess.userName}!
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                  Show this slip at TS Gaming Cafe desk to activate your console.
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                padding: '14px',
                fontSize: '0.82rem',
                color: '#e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                <div>🎮 <strong>Console:</strong> {bookingSuccess.setupName}</div>
                <div>⏰ <strong>Slot:</strong> {bookingSuccess.timeSlotRange} ({bookingSuccess.date})</div>
                <div>👥 <strong>Players:</strong> {bookingSuccess.players} Player(s)</div>
                {bookingSuccess.snacksAmount > 0 && (
                  <div>🍔 <strong>Snacks:</strong> {bookingSuccess.foodItems.map(i => `${i.quantity}x ${i.name}`).join(', ')}</div>
                )}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 6, color: '#4ade80', fontWeight: 800 }}>
                  💰 Total Amount: ₹{bookingSuccess.totalAmount} (Pay at Counter)
                </div>
              </div>

              <a
                href={`https://wa.me/917972430951?text=${encodeURIComponent(
                  `🎮 *TS Gaming Cafe — Booking Slip*\n👤 Name: ${bookingSuccess.userName}\n🕹️ Console: ${bookingSuccess.setupName}\n⏰ Slot: ${bookingSuccess.timeSlotRange} (${bookingSuccess.date})\n👥 Players: ${bookingSuccess.players}\n💰 Total: ₹${bookingSuccess.totalAmount}\n📍 Waluj, Sambhajinagar`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  background: '#22c55e',
                  borderColor: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <MessageCircle size={18} />
                <span>Share Booking Slip on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
