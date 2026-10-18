import React, { useState, useEffect, useMemo } from 'react';
import {
  Gamepad2,
  Clock,
  Calendar,
  Check,
  Phone,
  MessageCircle,
  X,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  createBooking,
  subscribeToAllBookings,
  subscribeToSetups,
} from '../firebase/firestore';
import UpiQrModal from '../components/UpiQrModal';
import CustomerAuthModal from '../components/CustomerAuthModal';
import { useAuth } from '../context/AuthContext';
import './Home.css';
import './admin/AdminDashboard.css';

// Available Time Slots (5:00 AM to 10:00 PM)
const TIME_SLOTS = [
  { id: '05:00', start: '05:00', end: '06:00', label: '5:00 – 6:00 AM' },
  { id: '06:00', start: '06:00', end: '07:00', label: '6:00 – 7:00 AM' },
  { id: '07:00', start: '07:00', end: '08:00', label: '7:00 – 8:00 AM' },
  { id: '08:00', start: '08:00', end: '09:00', label: '8:00 – 9:00 AM' },
  { id: '09:00', start: '09:00', end: '10:00', label: '9:00 – 10:00 AM' },
  { id: '10:00', start: '10:00', end: '11:00', label: '10:00 – 11:00 AM' },
  { id: '11:00', start: '11:00', end: '12:00', label: '11:00 – 12:00 PM' },
  { id: '12:00', start: '12:00', end: '13:00', label: '12:00 – 1:00 PM' },
  { id: '13:00', start: '13:00', end: '14:00', label: '1:00 – 2:00 PM' },
  { id: '14:00', start: '14:00', end: '15:00', label: '2:00 – 3:00 PM' },
  { id: '15:00', start: '15:00', end: '16:00', label: '3:00 – 4:00 PM' },
  { id: '16:00', start: '16:00', end: '17:00', label: '4:00 – 5:00 PM' },
  { id: '17:00', start: '17:00', end: '18:00', label: '5:00 – 6:00 PM' },
  { id: '18:00', start: '18:00', end: '19:00', label: '6:00 – 7:00 PM' },
  { id: '19:00', start: '19:00', end: '20:00', label: '7:00 – 8:00 PM' },
  { id: '20:00', start: '20:00', end: '21:00', label: '8:00 – 9:00 PM' },
  { id: '21:00', start: '21:00', end: '22:00', label: '9:00 – 10:00 PM' },
];

export default function Booking() {
  const toast = useToast();
  const { user, userDoc, loading: authLoading } = useAuth();

  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Real Setups from Firestore
  const [setups, setSetups] = useState([]);
  const [selectedStation, setSelectedStation] = useState('PS4');
  const [selectedDuration, setSelectedDuration] = useState('1 Hour');
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[6]); // 11:00 AM - 12:00 PM
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Firestore Subscriptions
  const [allBookings, setAllBookings] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    setCustomerName((current) => current || userDoc?.name || user.displayName || '');
    setCustomerPhone((current) => current || userDoc?.phone || '');
  }, [user, userDoc]);

  useEffect(() => {
    const unsubBookings = subscribeToAllBookings((b) => {
      if (Array.isArray(b)) setAllBookings(b);
    });
    const unsubSetups = subscribeToSetups((docs) => {
      if (Array.isArray(docs)) {
        setSetups(docs.filter((s) => s.status !== 'maintenance'));
      }
    });
    return () => {
      if (typeof unsubBookings === 'function') unsubBookings();
      if (typeof unsubSetups === 'function') unsubSetups();
    };
  }, []);

  // Compute Unique Console Types from Firestore Setups
  const availableStations = useMemo(() => {
    if (!setups || setups.length === 0) return [];
    const map = new Map();
    setups.forEach((s) => {
      const type = (s.type || 'PS4').toUpperCase();
      if (!map.has(type)) {
        const fallbackImg =
          type === 'PS5' ? '/images/ps5.jpg'
          : type === 'PS4' ? '/images/ps4.jpg'
          : type === 'PS3' ? '/images/ps3.jpg'
          : type === 'PS2' ? '/images/ps2.jpg'
          : type === 'RACING' ? '/images/sim-racing.jpg'
          : '/images/gallery/gaming-pc.jpg';

        map.set(type, {
          id: type.toLowerCase(),
          type: type,
          name: type,
          sub: Array.isArray(s.specs) ? s.specs[0] : (s.specs || `${type} Station`),
          image: s.image || fallbackImg,
          rate: Number(s.pricePerHour) || 50,
          rate30: Number(s.pricePer30Min) || Math.round((Number(s.pricePerHour) || 50) * 0.6),
          setups: [s],
          count: 1,
        });
      } else {
        const existing = map.get(type);
        existing.setups.push(s);
        existing.count += 1;
      }
    });
    return Array.from(map.values());
  }, [setups]);

  // Keep selectedStation synced to an existing real console type
  useEffect(() => {
    if (availableStations.length > 0) {
      if (!availableStations.some((st) => st.type === selectedStation)) {
        setSelectedStation(availableStations[0].type);
      }
    }
  }, [availableStations, selectedStation]);

  // Check if slot is booked across all units of this console type
  const isSlotBooked = (slot) => {
    const stationGroup = availableStations.find((s) => s.type === selectedStation);
    if (!stationGroup) return false;
    const totalConsoles = stationGroup.count || 1;
    const bookedCount = allBookings.filter((b) => {
      if (b.status === 'cancelled') return false;
      if (b.date !== selectedDate) return false;
      const bSetup = (b.setupName || '').toUpperCase();
      const sType = selectedStation.toUpperCase();
      if (!bSetup.includes(sType)) return false;
      return b.startTime === slot.start || b.time === slot.start;
    }).length;
    return bookedCount >= totalConsoles;
  };

  // Station Object
  const currentStationObj = useMemo(() => {
    if (availableStations.length === 0) {
      return { type: 'PS4', name: 'PS4', rate: 50, rate30: 40 };
    }
    return availableStations.find((s) => s.type === selectedStation) || availableStations[0];
  }, [availableStations, selectedStation]);

  // Gaming Cost Calculation
  const totalAmount = useMemo(() => {
    const rate = currentStationObj.rate || 50;
    const rate30 = currentStationObj.rate30 || Math.round(rate * 0.6);
    if (selectedDuration === '30 Min') {
      return rate30;
    }
    const durMult = selectedDuration === '2 Hours' ? 2 : selectedDuration === '3 Hours' ? 3 : 1;
    return rate * durMult;
  }, [currentStationObj, selectedDuration]);

  // Handle Form Submit
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (authLoading) {
      toast.show('Checking your sign-in status. Please try again in a moment.', 'info');
      return;
    }
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!customerName.trim()) {
      toast.show('Please enter your name', 'error');
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.show('Please enter a valid 10-digit mobile number', 'error');
      return;
    }
    if (isSlotBooked(selectedSlot)) {
      toast.show('This slot is already booked. Please pick another available slot.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        userId: user.uid,
        userName: customerName.trim(),
        customerName: customerName.trim(),
        userPhone: cleanPhone.slice(-10),
        customerPhone: cleanPhone.slice(-10),
        setupName: `${selectedStation} Station`,
        stationName: `${selectedStation} Station`,
        date: selectedDate,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        timeSlotRange: selectedSlot.label,
        duration: selectedDuration === '30 Min' ? 0.5 : selectedDuration === '2 Hours' ? 2 : selectedDuration === '3 Hours' ? 3 : 1,
        totalAmount,
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
      <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1rem' }}>
        
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
            fontSize: '2rem',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '0.04em',
            margin: '0 0 8px',
          }}>
            BOOK YOUR PLAYSTATION
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            TS Gaming Cafe • Waluj, Sambhajinagar • Pay at Counter
          </p>
        </div>

        {/* ── Focused 2-Column Booking Layout ── */}
        <div className="ts-dash-main-grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem' }}>
          
          {/* ══ LEFT: CONSOLE, DATE, DURATION & TIME SLOTS ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* 1. Station Picker */}
            <div className="ts-dash-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Gamepad2 size={16} style={{ color: '#ff5500' }} />
                <span>1. Choose PlayStation Console</span>
              </div>

              <div className="ts-dash-stations-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                {availableStations.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '12px' }}>
                    Loading available consoles...
                  </div>
                ) : (
                  availableStations.map((station) => {
                    const isActive = selectedStation === station.type;
                    return (
                      <button
                        key={station.id}
                        type="button"
                        className={`ts-dash-station-btn ${isActive ? 'ts-dash-station-btn--active' : ''}`}
                        onClick={() => setSelectedStation(station.type)}
                        style={{
                          padding: '10px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          borderRadius: 12,
                          border: isActive ? '2px solid #ff5500' : '1px solid rgba(255,255,255,0.08)',
                          background: isActive ? 'rgba(255, 85, 0, 0.12)' : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div className="ts-dash-station-img-wrap" style={{ width: 44, height: 44, marginBottom: 6 }}>
                          <img
                            src={station.image}
                            alt={station.name}
                            className="ts-dash-station-img"
                          />
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>{station.name}</span>
                        <span style={{ fontSize: '0.72rem', color: '#ff5500', fontWeight: 700, marginTop: 2 }}>
                          ₹{station.rate}/hr
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 1 }}>
                          {station.count} {station.count > 1 ? 'Units' : 'Unit'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Date & Duration */}
            <div className="ts-dash-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} style={{ color: '#ff5500' }} />
                <span>2. Select Date & Duration</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Date */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    Booking Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={getTodayDateStr()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 8,
                      color: '#fff',
                      padding: '8px 10px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Duration */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    Gaming Time
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {['30 Min', '1 Hour', '2 Hours'].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setSelectedDuration(dur)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: 8,
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          border: selectedDuration === dur ? '1px solid #ff5500' : '1px solid rgba(255,255,255,0.1)',
                          background: selectedDuration === dur ? 'rgba(255, 85, 0, 0.2)' : 'rgba(255,255,255,0.03)',
                          color: selectedDuration === dur ? '#fff' : '#94a3b8',
                          transition: 'all 0.12s',
                        }}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Time Slots */}
            <div className="ts-dash-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} style={{ color: '#ff5500' }} />
                  <span>3. Choose Available Slot</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', gap: 8 }}>
                  <span>🟢 Available</span>
                  <span>🔴 Booked</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                {TIME_SLOTS.map((slot) => {
                  const isBooked = isSlotBooked(slot);
                  const isSelected = selectedSlot.id === slot.id;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isBooked}
                      onClick={() => !isBooked && setSelectedSlot(slot)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isBooked ? 'not-allowed' : 'pointer',
                        border: isSelected
                          ? '2px solid #ff5500'
                          : isBooked
                          ? '1px solid rgba(239, 68, 68, 0.3)'
                          : '1px solid rgba(255,255,255,0.1)',
                        background: isSelected
                          ? '#ff5500'
                          : isBooked
                          ? 'rgba(239, 68, 68, 0.1)'
                          : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#fff' : isBooked ? '#ef4444' : '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.12s',
                      }}
                    >
                      <span>{slot.label}</span>
                      <span style={{ fontSize: '0.65rem' }}>{isBooked ? '✕' : isSelected ? '✓' : ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ══ RIGHT: CHECKOUT & CONFIRMATION (ONLY ESSENTIALS) ══ */}
          <div>
            <div className="ts-dash-card" style={{ padding: '20px', position: 'sticky', top: '90px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: 14 }}>
                Booking Summary
              </div>

              {/* Summary Details */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 16,
                fontSize: '0.85rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>PlayStation:</span>
                  <strong style={{ color: '#fff' }}>{selectedStation} Station</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Date:</span>
                  <strong style={{ color: '#fff' }}>{selectedDate}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Slot Timing:</span>
                  <strong style={{ color: '#38bdf8' }}>{selectedSlot.label}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Duration:</span>
                  <strong style={{ color: '#fff' }}>{selectedDuration}</strong>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  paddingTop: 10,
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  color: '#4ade80',
                }}>
                  <span>Total Payable:</span>
                  <span>₹{totalAmount}</span>
                </div>
              </div>

              {/* Customer Inputs Form */}
              <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required={Boolean(user)}
                    placeholder="e.g. Rohan Patil"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 8,
                      color: '#fff',
                      padding: '10px 12px',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>
                    WhatsApp Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required={Boolean(user)}
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 8,
                      color: '#fff',
                      padding: '10px 12px',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>
                  💵 <strong>Payment:</strong> Pay at cafe desk on arrival (Cash or UPI GPay/PhonePe).
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'linear-gradient(135deg, #ff5500, #ea580c)',
                    border: 'none',
                    padding: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#fff',
                    borderRadius: 10,
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(255, 85, 0, 0.4)',
                    marginTop: 4,
                  }}
                >
                  {isSubmitting ? 'Confirming...' : `Confirm Booking • ₹${totalAmount}`}
                </button>
              </form>

            </div>
          </div>

        </div>

      </div>

      {/* ── Simple Success Modal with WhatsApp Slip ── */}
      {bookingSuccess && (
        <div className="ts-modal-overlay" onClick={() => setBookingSuccess(null)}>
          <div className="ts-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: 20 }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#4ade80',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
              }}>
                <Check size={26} />
              </div>
              <h3 style={{ margin: '0 0 4px', color: '#fff', fontSize: '1.2rem' }}>
                Booking Confirmed!
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                Reserved for <strong>{bookingSuccess.userName}</strong>
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              padding: '12px',
              fontSize: '0.82rem',
              color: '#e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: 14,
            }}>
              <div>🎮 <strong>Console:</strong> {bookingSuccess.setupName}</div>
              <div>⏰ <strong>Slot:</strong> {bookingSuccess.timeSlotRange} ({bookingSuccess.date})</div>
              <div>💰 <strong>Total:</strong> ₹{bookingSuccess.totalAmount} (Pay at Counter)</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowUpiModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
                }}
              >
                <QrCode size={16} />
                <span>Pay via UPI QR (PhonePe / GPay)</span>
              </button>

              <a
                href={`https://wa.me/917972430951?text=${encodeURIComponent(
                  `🎮 *TS Gaming Cafe — Booking Slip*\n👤 Name: ${bookingSuccess.userName}\n🕹️ Console: ${bookingSuccess.setupName}\n⏰ Slot: ${bookingSuccess.timeSlotRange} (${bookingSuccess.date})\n💰 Total: ₹${bookingSuccess.totalAmount}\n📍 Waluj, Sambhajinagar`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#22c55e',
                  color: '#fff',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                <MessageCircle size={16} />
                <span>Share Slip on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── UPI QR Payment Modal ── */}
      {bookingSuccess && (
        <UpiQrModal
          isOpen={showUpiModal}
          onClose={() => setShowUpiModal(false)}
          amount={bookingSuccess.totalAmount}
          customerName={bookingSuccess.userName}
          purpose={`Gaming Session: ${bookingSuccess.setupName}`}
        />
      )}

      {showAuthModal && <CustomerAuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
