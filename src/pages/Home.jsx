import React, { useState, useEffect, useMemo } from 'react';
import {
  Gamepad2,
  Clock,
  MapPin,
  Calendar,
  Users,
  Tv,
  Coffee,
  Armchair,
  Check,
  ChevronRight,
  Gift,
  Phone,
  MessageCircle,
  X,
  Zap,
  Receipt,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  createBooking,
  subscribeToFoodItems,
  subscribeToSetups,
  subscribeToAllBookings,
  DEFAULT_FOOD_ITEMS,
} from '../firebase/firestore';
import './Home.css';
import './admin/AdminDashboard.css';

/* ── DEFAULT FALLBACK STATIONS ── */
const DEFAULT_STATIONS = [
  {
    id: 'ps2',
    name: 'PS2',
    fullName: 'PlayStation 2',
    image: '/images/ps2.jpg',
    badge: 'Retro Classic',
    shortInfo: 'Group games only (WWE, SmackDown etc.)',
    pricing: { '30m': 15, '1h': 30, '2h': 60, 'group': 20 },
  },
  {
    id: 'ps3',
    name: 'PS3',
    fullName: 'PlayStation 3',
    image: '/images/ps3.jpg',
    badge: 'Co-op Favorite',
    shortInfo: 'HD Multiplayer & legendary classic titles',
    pricing: { '30m': 20, '1h': 40, '2h': 80, 'group': 30 },
  },
  {
    id: 'ps4',
    name: 'PS4',
    fullName: 'PlayStation 4',
    image: '/images/ps4.jpg',
    badge: 'Pro 4K HDR',
    shortInfo: 'High-end gaming library & competitive sports',
    pricing: { '30m': 30, '1h': 50, '2h': 100, 'group': 40 },
  },
  {
    id: 'ps5',
    name: 'PS5',
    fullName: 'PlayStation 5',
    image: '/images/ps5.jpg',
    badge: 'Next-Gen 120Hz',
    shortInfo: 'Ultra-fast SSD, 120 FPS & DualSense Haptics',
    pricing: { '30m': 50, '1h': 80, '2h': 160, 'group': 70 },
  },
  {
    id: 'sim_racing',
    name: 'SIM RACING',
    fullName: 'Racing Simulator Cockpit',
    image: '/images/sim-racing.jpg',
    badge: 'Force Feedback',
    shortInfo: 'Pro racing wheel, metal pedals & cockpit seat',
    pricing: { '30m': 80, '1h': 150, '2h': 300, 'group': 80 },
  },
];

/* ── TIME SLOTS (5:00 AM to 9:00 PM for 1-hour session start) ── */
const TIME_SLOTS = [
  '5:00 AM',
  '6:00 AM',
  '7:00 AM',
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
  '7:00 PM',
  '8:00 PM',
  '9:00 PM',
];

/* ── DURATION OPTIONS (Matching Screenshot) ── */
const DURATIONS = [
  { id: '30m', label: '30 Min', durationHours: 0.5 },
  { id: '1h', label: '1 Hour', durationHours: 1 },
  { id: '2h', label: '2 Hours', durationHours: 2 },
  { id: 'group', label: 'Group', durationHours: 1 },
];

function time12To24(time12Str) {
  if (!time12Str) return '05:00';
  try {
    const [time, modifier] = time12Str.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}`;
  } catch {
    return '05:00';
  }
}

export default function Home() {
  const toast = useToast();

  // Live Stations from Admin (Firestore gamingSetups)
  const [stations, setStations] = useState(DEFAULT_STATIONS);
  // Live Bookings from Firestore (to block occupied slots)
  const [allBookings, setAllBookings] = useState([]);
  // Live Food Items from Firestore
  const [foodItems, setFoodItems] = useState(DEFAULT_FOOD_ITEMS);

  useEffect(() => {
    const unsubFood = subscribeToFoodItems((items) => {
      if (Array.isArray(items) && items.length > 0) {
        setFoodItems(items);
      }
    });

    const unsubSetups = subscribeToSetups(
      (docs) => {
        if (Array.isArray(docs) && docs.length > 0) {
          const mapped = docs
            .filter((s) => s.status !== 'maintenance')
            .map((s) => {
              const type = s.type || 'PS5';
              const fallbackImg =
                type === 'PC'
                  ? '/images/gallery/gaming-pc.jpg'
                  : type === 'Racing'
                  ? '/images/sim-racing.jpg'
                  : type === 'PS5'
                  ? '/images/ps5.jpg'
                  : type === 'PS4'
                  ? '/images/ps4.jpg'
                  : type === 'PS3'
                  ? '/images/ps3.jpg'
                  : '/images/ps2.jpg';

              const p1h = Number(s.pricePerHour) || 80;
              return {
                id: s.id,
                name: s.name || `${s.type} #${s.setupNumber || ''}`,
                fullName: s.name || `${s.type} Station #${s.setupNumber || ''}`,
                image: s.image || fallbackImg,
                badge: s.type || 'Gaming',
                shortInfo: Array.isArray(s.specs) ? s.specs.join(' • ') : (s.specs || 'HD Gaming Setup'),
                pricing: {
                  '1h': p1h,
                  '2h': p1h * 2,
                  group: Math.round(p1h * 0.8),
                },
                status: s.status || 'available',
              };
            });
          if (mapped.length > 0) {
            setStations(mapped);
          }
        }
      },
      (err) => console.warn('Setups subscribe fallback:', err)
    );

    const unsubBookings = subscribeToAllBookings((data) => {
      if (Array.isArray(data)) {
        setAllBookings(data);
      }
    });

    return () => {
      if (typeof unsubFood === 'function') unsubFood();
      if (typeof unsubSetups === 'function') unsubSetups();
      if (typeof unsubBookings === 'function') unsubBookings();
    };
  }, []);

  // Handle URL hash navigation on mount
  useEffect(() => {
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 120);
      }
    }
  }, []);

  // Helper: Get Live Current Time in 12h format
  const getCurrentTime12h = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const modifier = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${minutesStr} ${modifier}`;
  };

  // Booking Form State
  const [bookingMode, setBookingMode] = useState('now'); // 'now' (Play Right Now / Walk-in) | 'slot' (Advance Slot)
  const [selectedStationId, setSelectedStationId] = useState('ps5');
  const [duration, setDuration] = useState('1h');
  const [playerCount, setPlayerCount] = useState(2);
  const getTodayDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(() => getTodayDateStr());
  const [selectedTime, setSelectedTime] = useState(() => getCurrentTime12h());

  // Auto-refresh current time and keep slot states updated every 30 seconds
  const [, setMinuteTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setMinuteTick((t) => t + 1);
      if (bookingMode === 'now') {
        setSelectedTime(getCurrentTime12h());
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [bookingMode]);

  // Step-by-Step Wizard State (1: Station, 2: Duration & Players, 3: Date & Slot, 4: Snacks, 5: Confirm)
  const [bookingStep, setBookingStep] = useState(1);

  // Confirmation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Snacks Add-On State
  const [snackCategory, setSnackCategory] = useState('All');
  const [snackCart, setSnackCart] = useState([]);

  const handleAddSnack = (item) => {
    setSnackCart((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) => (i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.show(`Added ${item.name} to snacks!`, 'success');
  };

  const handleUpdateSnackQty = (itemName, delta) => {
    setSnackCart((prev) => {
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

  // Sync selectedStationId with loaded stations from admin
  useEffect(() => {
    if (stations && stations.length > 0 && !stations.some((s) => s.id === selectedStationId)) {
      setSelectedStationId(stations[0].id);
    }
  }, [stations, selectedStationId]);

  // Active Station Object (from dynamic admin setups)
  const currentStation = stations.find((s) => s.id === selectedStationId) || stations[0] || DEFAULT_STATIONS[0];

  // Helper to convert time string (12h or 24h) to total minutes from midnight
  const timeToMinutes = (tStr) => {
    if (!tStr) return 0;
    try {
      if (tStr.includes('AM') || tStr.includes('PM')) {
        const [time, modifier] = tStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + (minutes || 0);
      }
      const [h, m] = tStr.split(':').map(Number);
      return h * 60 + (m || 0);
    } catch {
      return 0;
    }
  };

  // Check if a time slot has already passed for today (with 15-minute grace period)
  const isSlotPassed = (slot12) => {
    const todayStr = getTodayDateStr();
    if (selectedDate < todayStr) {
      return true; // Past dates are all passed
    }
    if (selectedDate > todayStr) {
      return false; // Future date slots are never passed
    }
    // If selected date is today: 15-minute grace period
    // e.g. 6:00 PM slot stays open until 6:15 PM, and gets blocked at 6:15 PM
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const slotMins = timeToMinutes(slot12);
    return currentMins >= slotMins + 15;
  };

  // Check if a time slot is already booked for the currently selected station & date
  const isSlotBooked = (slot12) => {
    if (!currentStation || !selectedDate) return false;
    const slotStartMins = timeToMinutes(slot12);
    const durationHours = duration === '2h' ? 2 : 1;
    const slotEndMins = slotStartMins + durationHours * 60;

    return allBookings.some((b) => {
      if (b.status === 'cancelled') return false;
      if (b.date !== selectedDate) return false;

      // Match station by ID, setupId, setupName, or stationName
      const stationMatch =
        b.setupId === currentStation.id ||
        b.stationId === currentStation.id ||
        b.setupName === currentStation.name ||
        b.stationName === currentStation.name;

      if (!stationMatch) return false;

      // Check overlap with booking time
      const bStartMins = timeToMinutes(b.startTime || b.timeSlot);
      const bEndMins =
        timeToMinutes(b.endTime || (b.timeSlotRange ? b.timeSlotRange.split('-')[1]?.trim() : null)) ||
        bStartMins + 60;

      // Overlap formula: slotStart < bookingEnd && slotEnd > bookingStart
      return slotStartMins < bEndMins && slotEndMins > bStartMins;
    });
  };

  // Auto-switch to next available slot if currently selected time is passed or already booked
  useEffect(() => {
    if (bookingMode === 'slot') {
      const isCurrentInvalid = isSlotPassed(selectedTime) || isSlotBooked(selectedTime);
      if (isCurrentInvalid) {
        const firstAvailable = TIME_SLOTS.find((s) => !isSlotPassed(s) && !isSlotBooked(s));
        if (firstAvailable) {
          setSelectedTime(firstAvailable);
        }
      }
    }
  }, [selectedDate, selectedStationId, duration, bookingMode, allBookings]);

  // Price Calculation
  const pricePerPlayer = currentStation.pricing[duration] || currentStation.pricing['1h'];
  const totalAmount = pricePerPlayer * playerCount;

  const snacksTotal = useMemo(() => {
    return snackCart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  }, [snackCart]);

  const grandTotal = totalAmount + snacksTotal;

  // Compute End Time
  const calculateEndTime = (startTimeStr, durationType) => {
    try {
      const [time, modifier] = startTimeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const durationMinutes = durationType === '30m' ? 30 : durationType === '2h' ? 120 : 60;
      let totalMinutes = hours * 60 + minutes + durationMinutes;
      let endHours = Math.floor(totalMinutes / 60) % 24;
      let endMinutes = totalMinutes % 60;

      const endModifier = endHours >= 12 ? 'PM' : 'AM';
      let displayHours = endHours % 12 || 12;
      let displayMinutes = endMinutes < 10 ? `0${endMinutes}` : endMinutes;
      return `${displayHours}:${displayMinutes} ${endModifier}`;
    } catch {
      return '';
    }
  };

  const formattedEndTime = calculateEndTime(selectedTime, duration);

  // Scroll to Booking Handler
  const scrollToBooking = (stationId) => {
    if (stationId) {
      setSelectedStationId(stationId);
      setBookingStep(2);
    }
    const el = document.getElementById('booking');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Format Display Date
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Handle Booking Confirmation
  const handleConfirmBookingSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.warning('Details Required', 'Please enter your name and phone number.');
      return;
    }

    // Guard against expired or double-booked slots on submit
    if (bookingMode === 'slot') {
      if (isSlotPassed(selectedTime)) {
        toast.error('Slot Expired (N/A)', 'This slot has already passed. Please choose the next available slot.');
        return;
      }
      if (isSlotBooked(selectedTime)) {
        toast.error('Already Booked', 'This slot is already booked. Please choose another slot.');
        return;
      }
    }

    setIsSubmitting(true);
    const start24 = time12To24(selectedTime);
    const end24 = time12To24(formattedEndTime);

    const bookingPayload = {
      customerName: customerName.trim(),
      userName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      userPhone: customerPhone.trim(),
      stationId: currentStation.id,
      setupId: currentStation.id,
      stationName: currentStation.name,
      setupName: currentStation.name,
      stationFullName: currentStation.fullName,
      duration,
      durationLabel: DURATIONS.find((d) => d.id === duration)?.label || '1 Hour',
      playerCount,
      date: selectedDate,
      timeSlot: selectedTime,
      startTime: start24,
      endTime: end24,
      timeSlotRange: `${selectedTime} - ${formattedEndTime}`,
      gamingAmount: totalAmount,
      snacksAmount: snacksTotal,
      totalAmount: grandTotal,
      foodItems: snackCart,
      bookingMode,
      isWalkIn: bookingMode === 'now',
      bookingTypeLabel: bookingMode === 'now' ? '⚡ Walk-In (Play Now)' : '📅 Advance Slot',
      cafeLocation: 'Waluj, Aurangabad',
      status: 'confirmed',
      paymentStatus: 'pending',
      paymentMode: 'pay_at_cafe',
      paymentMethod: 'Pay at Cafe',
      source: 'website_user',
    };

    try {
      await createBooking(bookingPayload);
      toast.success(
        bookingMode === 'now' ? 'Walk-In Started!' : 'Slot Booked!',
        bookingMode === 'now'
          ? `Console is ready for ${customerName.trim()}! Pay at counter.`
          : `Your session for ${currentStation.name} has been reserved.`
      );
    } catch (err) {
      console.warn('Firebase booking fallback to local:', err);
      toast.success('Booking Reserved!', `Session reserved for ${customerName.trim()}.`);
    } finally {
      setIsSubmitting(false);
      setConfirmedBooking(bookingPayload);
    }
  };

  const getWhatsAppBookingUrl = (booking) => {
    if (!booking) return '';
    const modeText = booking.isWalkIn ? '⚡ Walk-In / Play Right Now' : '📅 Advance Slot Booking';
    let foodText = '';
    if (booking.foodItems && booking.foodItems.length > 0) {
      foodText = `\n🍔 *Snacks Ordered:* ` + booking.foodItems.map((i) => `${i.name} (x${i.quantity})`).join(', ') + ` (₹${booking.snacksAmount || 0})`;
    }
    const message = `🎮 *New Booking from TS Gaming Cafe Website*
🕹️ Type: ${modeText}
👤 Name: ${booking.customerName}
📞 Phone: ${booking.customerPhone}
🎮 Station: ${booking.stationName} (${booking.stationFullName || booking.stationName})
👥 Players: ${booking.playerCount}
⏱️ Duration: ${booking.durationLabel}
📅 Date: ${booking.date}
⏰ Time: ${booking.timeSlotRange} ${booking.isWalkIn ? '(Starting Immediately)' : ''}${foodText}
💰 Gaming: ₹${booking.gamingAmount || booking.totalAmount}
${booking.snacksAmount > 0 ? `🍔 Snacks: ₹${booking.snacksAmount}\n` : ''}🔥 *Grand Total: ₹${booking.totalAmount}*
📍 Location: Waluj, Aurangabad`;

    return `https://wa.me/917972430951?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="home-page">
      {/* ============================================================
          SECTION 2: HERO SECTION
          ============================================================ */}
      <section className="hero-banner" id="hero">
        <div className="hero-banner__bg">
          <img src="/images/hero-bg.jpg" alt="TS Gaming Cafe Ambiance" className="hero-banner__bg-img" />
          <div className="hero-banner__overlay" />
        </div>

        <div className="container hero-banner__container">
          <div className="hero-banner__grid">
            {/* Left Column: Bold Tagline */}
            <div className="hero-banner__left">
              <h1 className="hero-banner__headline">
                <span className="hl-line">YOUR GAME.</span>
                <span className="hl-line">YOUR TIME.</span>
                <span className="hl-line hl-line--orange">YOUR PLACE.</span>
              </h1>
            </div>

            {/* Center: Glowing Crest Emblem */}
            <div className="hero-banner__center">
              <div className="hero-banner__crest-wrapper">
                <div className="hero-banner__crest-glow" />
                <img
                  src="/images/logo.png"
                  alt="TS Gaming Cafe Badge"
                  className="hero-banner__crest-img"
                />
              </div>
              <div className="hero-banner__badge-location">
                <span>📍 Waluj, Aurangabad</span>
              </div>
            </div>

            {/* Right Column: Timings & CTA Card */}
            <div className="hero-banner__right">
              <div className="hero-card">
                <div className="hero-card__row">
                  <div className="hero-card__icon-wrap">
                    <Clock size={22} className="text-orange" />
                  </div>
                  <div>
                    <div className="hero-card__label">Open Daily</div>
                    <div className="hero-card__value">5:00 AM - 10:00 PM</div>
                    <div className="hero-card__sub-warning">Last Booking: 9:00 PM</div>
                  </div>
                </div>

                <div className="hero-card__row">
                  <div className="hero-card__icon-wrap">
                    <MapPin size={22} className="text-orange" />
                  </div>
                  <div>
                    <div className="hero-card__label">Location</div>
                    <div className="hero-card__value">TS GAMING CAFE</div>
                    <div className="hero-card__sub">Waluj, Aurangabad</div>
                  </div>
                </div>

                <button
                  className="hero-card__cta-btn"
                  onClick={() => scrollToBooking()}
                  id="hero-book-session-btn"
                >
                  <span>Book Your Session</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Strip: Quick Feature Badges */}
          <div className="hero-banner__features">
            <div className="hero-feature-item">
              <Gamepad2 size={18} />
              <span>Latest Games</span>
            </div>
            <div className="hero-feature-item">
              <Users size={18} />
              <span>Group Gaming</span>
            </div>
            <div className="hero-feature-item">
              <Tv size={18} />
              <span>Big Screen TVs</span>
            </div>
            <div className="hero-feature-item">
              <Coffee size={18} />
              <span>Food & Drinks</span>
            </div>
            <div className="hero-feature-item">
              <Armchair size={18} />
              <span>Comfortable Setup</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: STATION SELECTION
          ============================================================ */}
      <section className="section-stations" id="stations">
        <div className="container">
          <div className="section-header-tag">
            <Gamepad2 size={22} className="tag-icon" />
            <h2>CHOOSE YOUR GAMING STATION</h2>
          </div>

          <div className="stations-grid">
            {stations.map((station) => {
              const isSelected = selectedStationId === station.id;
              return (
                <div
                  key={station.id}
                  className={`station-card ${isSelected ? 'station-card--active' : ''}`}
                  onClick={() => setSelectedStationId(station.id)}
                >
                  <div className="station-card__img-box">
                    <img src={station.image} alt={station.name} className="station-card__img" />
                    <span className="station-card__badge">{station.badge}</span>
                  </div>

                  <div className="station-card__content">
                    <h3 className="station-card__title">{station.name}</h3>
                    <p className="station-card__info">{station.shortInfo}</p>
                    <button
                      className={`station-card__select-btn ${isSelected ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToBooking(station.id);
                      }}
                    >
                      {isSelected ? (
                        <>
                          <Check size={16} /> Selected
                        </>
                      ) : (
                        'Select'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: STEP-BY-STEP BOOKING WIZARD
          ============================================================ */}
      <section className="section-booking wizard-section-wrap" id="booking">
        <div className="container" style={{ maxWidth: '1360px', margin: '0 auto' }}>
          <div className="wizard-card">
            {/* Header with Title & Cafe Badge */}
            <div className="section-header-tag booking-title-tag" style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Gamepad2 size={26} style={{ color: '#ff5500' }} />
                <h2 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '0.04em', margin: 0 }}>
                  BOOK YOUR GAMING SESSION
                </h2>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 800 }}>
                ⚡ TS Gaming Cafe • Waluj, Sambhajinagar
              </span>
            </div>

            {/* ── 5-Step Stepper Navigation Bar ── */}
            <div className="wizard-stepper-nav">
              {[
                { step: 1, title: 'Console', sub: 'Select Station' },
                { step: 2, title: 'Duration & Squad', sub: 'Time & Players' },
                { step: 3, title: 'Date & Slot', sub: 'Choose Time' },
                { step: 4, title: 'Cafe Food', sub: 'Snacks Add-on' },
                { step: 5, title: 'Confirm', sub: 'Review & Slip' },
              ].map((s) => {
                const isActive = bookingStep === s.step;
                const isCompleted = bookingStep > s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setBookingStep(s.step)}
                    className={`wizard-step-tab ${isActive ? 'wizard-step-tab--active' : ''} ${isCompleted ? 'wizard-step-tab--completed' : ''}`}
                  >
                    <div className="wizard-step-badge">
                      {isCompleted ? '✓' : s.step}
                    </div>
                    <div className="wizard-step-info">
                      <span className="wizard-step-num-label">Step {s.step}</span>
                      <span className="wizard-step-title">{s.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Progress Bar ── */}
            <div className="wizard-progress-bar-wrap">
              <div
                className="wizard-progress-bar-fill"
                style={{ width: `${(bookingStep / 5) * 100}%` }}
              />
            </div>

            {/* ====================================================
                STEP 1: CHOOSE CONSOLE / STATION
                ==================================================== */}
            {bookingStep === 1 && (
              <div className="wizard-step-pane">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-left">
                    <span className="wizard-step-pill-tag">Step 1 of 5</span>
                    <h3 className="wizard-step-heading">Choose Your Gaming Station</h3>
                    <p className="wizard-step-subtext">
                      Select your preferred console setup from PS2 retro classic to PS5 next-gen and Racing Simulator.
                    </p>
                  </div>
                </div>

                {/* Stations Grid */}
                <div className="wizard-stations-grid">
                  {stations.map((station) => {
                    const isSelected = selectedStationId === station.id;
                    const startingPrice = station.pricing?.['1h'] || station.pricing?.['30m'] || 40;
                    return (
                      <div
                        key={station.id}
                        className={`wizard-station-card ${isSelected ? 'wizard-station-card--active' : ''}`}
                        onClick={() => setSelectedStationId(station.id)}
                      >
                        <div className="wizard-station-card-img-wrap">
                          <img
                            src={station.image}
                            alt={station.name}
                            className="wizard-station-card-img"
                            onError={(e) => { e.target.src = '/images/ps5.jpg'; }}
                          />
                          {station.badge && (
                            <span className="wizard-station-badge">{station.badge}</span>
                          )}
                        </div>

                        <div className="wizard-station-card-title">{station.name}</div>
                        <div className="wizard-station-card-spec">{station.shortInfo || station.fullName}</div>

                        <div className="wizard-station-card-footer">
                          <span className="wizard-station-price">₹{startingPrice}/hr</span>
                          <button
                            type="button"
                            className="wizard-station-check-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStationId(station.id);
                              setBookingStep(2);
                            }}
                          >
                            {isSelected ? 'Selected ✓' : 'Select'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Step 1 Footer Navigation */}
                <div className="wizard-nav-actions" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
                    🎮 Selected Console: <strong style={{ color: '#fff' }}>{currentStation.name}</strong> ({currentStation.badge || 'Available'})
                  </div>
                  <button
                    type="button"
                    className="wizard-btn-next"
                    onClick={() => setBookingStep(2)}
                  >
                    <span>Continue to Duration & Squad (Step 2)</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ====================================================
                STEP 2: SELECT DURATION & NUMBER OF PLAYERS
                ==================================================== */}
            {bookingStep === 2 && (
              <div className="wizard-step-pane">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-left">
                    <span className="wizard-step-pill-tag">Step 2 of 5</span>
                    <h3 className="wizard-step-heading">Select Session Time & Squad Size</h3>
                    <p className="wizard-step-subtext">
                      Choose how long you want to play and how many gamers are in your squad.
                    </p>
                  </div>
                </div>

                {/* Summary Ribbon */}
                <div className="wizard-summary-ribbon">
                  <div className="wizard-summary-ribbon-items">
                    <div className="wizard-summary-ribbon-item">
                      <span>🎮 Console:</span>
                      <strong>{currentStation.name} ({currentStation.badge || 'Setup'})</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBookingStep(1)}
                      style={{ background: 'transparent', border: 'none', color: '#ff8800', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
                    >
                      Change Console
                    </button>
                  </div>
                  <div className="wizard-summary-ribbon-price">
                    Gaming Subtotal: ₹{totalAmount}
                  </div>
                </div>

                {/* Duration Selection */}
                <div style={{ marginBottom: '1.6rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: 10 }}>
                    ⏱️ Select Playing Duration:
                  </label>
                  <div className="wizard-options-grid">
                    {DURATIONS.map((d) => {
                      const isSel = duration === d.id;
                      const rate = currentStation.pricing?.[d.id] || (d.id === '30m' ? Math.round(pricePerPlayer / 2) : pricePerPlayer);
                      return (
                        <div
                          key={d.id}
                          className={`wizard-option-card ${isSel ? 'wizard-option-card--active' : ''}`}
                          onClick={() => setDuration(d.id)}
                        >
                          <div className="wizard-option-card-title">
                            <span>{d.label}</span>
                            {isSel && <Check size={16} color="#ff5500" />}
                          </div>
                          <div className="wizard-option-card-desc">
                            {d.id === '30m' ? 'Quick Warmup / Blitz' : d.id === '1h' ? 'Standard (Most Popular)' : d.id === '2h' ? 'Marathon (Best Value)' : 'Special Squad Pass'}
                          </div>
                          <div className="wizard-option-card-price">
                            ₹{rate} / player
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Squad Size Selection */}
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: 10 }}>
                    👥 Select Number of Players (Controllers):
                  </label>
                  <div className="wizard-options-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    {[
                      { count: 1, label: '1 Player', sub: 'Solo Champion' },
                      { count: 2, label: '2 Players', sub: 'Duo / 1v1 Battle' },
                      { count: 3, label: '3 Players', sub: 'Trio Squad' },
                      { count: 4, label: '4 Players', sub: 'Full Squad Co-op' },
                      { count: 5, label: '5+ Players', sub: 'Group Party' },
                    ].map((p) => {
                      const isSel = playerCount === p.count || (p.count === 5 && playerCount >= 5);
                      return (
                        <div
                          key={p.count}
                          className={`wizard-option-card ${isSel ? 'wizard-option-card--active' : ''}`}
                          onClick={() => setPlayerCount(p.count)}
                        >
                          <div className="wizard-option-card-title">
                            <span>{p.label}</span>
                            {isSel && <Check size={16} color="#ff5500" />}
                          </div>
                          <div className="wizard-option-card-desc">{p.sub}</div>
                          <div className="wizard-option-card-price">
                            Total: ₹{pricePerPlayer * p.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2 Footer Navigation */}
                <div className="wizard-nav-actions">
                  <button
                    type="button"
                    className="wizard-btn-back"
                    onClick={() => setBookingStep(1)}
                  >
                    ⬅ Back to Consoles
                  </button>
                  <button
                    type="button"
                    className="wizard-btn-next"
                    onClick={() => setBookingStep(3)}
                  >
                    <span>Continue to Date & Time Slot (Step 3)</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ====================================================
                STEP 3: SELECT DATE & TIME SLOT
                ==================================================== */}
            {bookingStep === 3 && (
              <div className="wizard-step-pane">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-left">
                    <span className="wizard-step-pill-tag">Step 3 of 5</span>
                    <h3 className="wizard-step-heading">Select Date & Available Time Slot</h3>
                    <p className="wizard-step-subtext">
                      Choose when you want to play. Slots are updated in real-time.
                    </p>
                  </div>
                </div>

                {/* Summary Ribbon */}
                <div className="wizard-summary-ribbon">
                  <div className="wizard-summary-ribbon-items">
                    <div className="wizard-summary-ribbon-item">
                      <span>🎮 Console:</span>
                      <strong>{currentStation.name}</strong>
                    </div>
                    <div className="wizard-summary-ribbon-item">
                      <span>⏱️ Duration:</span>
                      <strong>{DURATIONS.find((d) => d.id === duration)?.label}</strong>
                    </div>
                    <div className="wizard-summary-ribbon-item">
                      <span>👥 Players:</span>
                      <strong>{playerCount}</strong>
                    </div>
                  </div>
                  <div className="wizard-summary-ribbon-price">
                    Gaming: ₹{totalAmount}
                  </div>
                </div>

                {/* Date Selection Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} color="#ff5500" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>Select Date:</span>
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    min={getTodayDateStr()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="ts-dash-date-select"
                    style={{ background: '#0a0d16', border: '1px solid rgba(255, 85, 0, 0.3)', color: '#fff', padding: '6px 12px', borderRadius: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="ts-dash-pill"
                      onClick={() => setSelectedDate(getTodayDateStr())}
                      style={{ fontSize: '0.78rem' }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className="ts-dash-pill"
                      onClick={() => {
                        const tm = new Date();
                        tm.setDate(tm.getDate() + 1);
                        setSelectedDate(tm.toISOString().split('T')[0]);
                      }}
                      style={{ fontSize: '0.78rem' }}
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>

                {/* Available Slots Header */}
                <div className="ts-dash-slots-header" style={{ marginBottom: 12 }}>
                  <div className="ts-dash-slots-title">
                    <Clock size={16} style={{ color: '#ff5500' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
                      Available Time Slots ({currentStation.name})
                    </span>
                  </div>
                  <div className="ts-dash-slots-legend">
                    <span><span className="ts-dash-legend-dot ts-dash-legend-dot--green"></span> Available</span>
                    <span><span className="ts-dash-legend-dot ts-dash-legend-dot--red"></span> Booked / Passed</span>
                    <span><span className="ts-dash-legend-dot ts-dash-legend-dot--orange"></span> Selected</span>
                  </div>
                </div>

                {/* 15 Time Slots Grid */}
                <div className="ts-dash-slots-grid" style={{ marginBottom: '1.5rem' }}>
                  {TIME_SLOTS.map((slot12) => {
                    const isPassed = isSlotPassed(slot12);
                    const isBooked = isSlotBooked(slot12);
                    const isUnavailable = isPassed || isBooked;
                    const isSelected = selectedTime === slot12;

                    let slotClass = 'ts-dash-slot-badge--available';
                    let statusText = 'Available';
                    let dotClass = 'ts-dash-legend-dot--green';

                    if (isUnavailable) {
                      slotClass = 'ts-dash-slot-badge--booked';
                      statusText = isPassed ? 'Passed' : 'Booked';
                      dotClass = 'ts-dash-legend-dot--red';
                    } else if (isSelected) {
                      slotClass = 'ts-dash-slot-badge--selected';
                      statusText = 'Selected';
                      dotClass = 'ts-dash-legend-dot--orange';
                    }

                    return (
                      <button
                        key={slot12}
                        type="button"
                        disabled={isUnavailable}
                        className={`ts-dash-slot-badge ${slotClass}`}
                        onClick={() => {
                          if (!isUnavailable) setSelectedTime(slot12);
                        }}
                      >
                        <span className={`ts-dash-legend-dot ${dotClass}`}></span>
                        <span>{slot12}</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: 'auto' }}>
                          {statusText}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Slot Highlight Box */}
                <div style={{
                  padding: '12px 18px',
                  borderRadius: 10,
                  background: 'rgba(255, 85, 0, 0.08)',
                  border: '1px solid rgba(255, 85, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                }}>
                  <div style={{ fontSize: '0.86rem', color: '#cbd5e1' }}>
                    ⏰ Selected Time Slot: <strong style={{ color: '#fff' }}>{selectedTime} - {formattedEndTime}</strong> on <strong>{formatDisplayDate(selectedDate)}</strong>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 800 }}>
                    ✓ Ready to Reserve
                  </span>
                </div>

                {/* Step 3 Footer Navigation */}
                <div className="wizard-nav-actions">
                  <button
                    type="button"
                    className="wizard-btn-back"
                    onClick={() => setBookingStep(2)}
                  >
                    ⬅ Back to Duration & Players
                  </button>
                  <button
                    type="button"
                    className="wizard-btn-next"
                    onClick={() => setBookingStep(4)}
                  >
                    <span>Continue to Snacks & Drinks (Step 4)</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ====================================================
                STEP 4: CAFE FOOD & DRINKS (OPTIONAL ADD-ON)
                ==================================================== */}
            {bookingStep === 4 && (
              <div className="wizard-step-pane">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-left">
                    <span className="wizard-step-pill-tag">Step 4 of 5 (Optional)</span>
                    <h3 className="wizard-step-heading">Level Up with Cafe Food & Drinks 🍕🥤</h3>
                    <p className="wizard-step-subtext">
                      Freshly prepared hot snacks and chilled cold drinks served right at your gaming chair! (You can skip this step).
                    </p>
                  </div>
                </div>

                {/* Summary Ribbon */}
                <div className="wizard-summary-ribbon">
                  <div className="wizard-summary-ribbon-items">
                    <div className="wizard-summary-ribbon-item">
                      <span>🎮 Gaming:</span>
                      <strong>{currentStation.name} ({selectedTime} - {formattedEndTime})</strong>
                    </div>
                    <div className="wizard-summary-ribbon-item">
                      <span>Gaming Total:</span>
                      <strong style={{ color: '#fff' }}>₹{totalAmount}</strong>
                    </div>
                    {snacksTotal > 0 && (
                      <div className="wizard-summary-ribbon-item">
                        <span>🍔 Snacks:</span>
                        <strong style={{ color: '#ff8800' }}>+₹{snacksTotal}</strong>
                      </div>
                    )}
                  </div>
                  <div className="wizard-summary-ribbon-price">
                    Subtotal: ₹{grandTotal}
                  </div>
                </div>

                {/* Food Category Tabs */}
                <div className="ts-dash-food-filters" style={{ marginBottom: 14 }}>
                  {['All', 'Pizza', 'Burger', 'Snacks', 'Drinks', 'Desserts'].map((cat) => (
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

                {/* Food Grid */}
                <div className="wizard-food-grid">
                  {foodItems
                    .filter((item) => snackCategory === 'All' || (item.category || '').toLowerCase().includes(snackCategory.toLowerCase()))
                    .map((item) => {
                      const inCart = snackCart.find((i) => i.name === item.name);
                      return (
                        <div key={item.id || item.name} className="wizard-food-card">
                          <img
                            src={item.image || '/images/more-items.jpg'}
                            alt={item.name}
                            className="wizard-food-card-img"
                            onError={(e) => { e.target.src = '/images/more-items.jpg'; }}
                          />
                          <span className="wizard-food-card-name">{item.name}</span>
                          <span className="wizard-food-card-price">₹{item.price}</span>

                          <div className="wizard-food-btn-wrap">
                            {inCart ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                  type="button"
                                  className="wizard-food-qty-btn"
                                  onClick={() => handleUpdateSnackQty(item.name, -1)}
                                >
                                  -
                                </button>
                                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>
                                  {inCart.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="wizard-food-qty-btn"
                                  onClick={() => handleUpdateSnackQty(item.name, 1)}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="wizard-btn-next"
                                style={{ padding: '5px 14px', fontSize: '0.78rem', borderRadius: 6 }}
                                onClick={() => handleAddSnack(item)}
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Active Snacks Cart Bar */}
                {snackCart.length > 0 && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'rgba(255, 85, 0, 0.08)',
                    border: '1px solid rgba(255, 85, 0, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginBottom: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#fff' }}>
                        🛒 Added Snacks ({snackCart.reduce((s, i) => s + i.quantity, 0)}):
                      </strong>
                      <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                        {snackCart.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#4ade80', fontSize: '0.95rem' }}>
                      Snacks Total: ₹{snacksTotal}
                    </span>
                  </div>
                )}

                {/* Step 4 Footer Navigation */}
                <div className="wizard-nav-actions">
                  <button
                    type="button"
                    className="wizard-btn-back"
                    onClick={() => setBookingStep(3)}
                  >
                    ⬅ Back to Time Slots
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {snackCart.length === 0 ? (
                      <button
                        type="button"
                        className="wizard-btn-skip"
                        onClick={() => setBookingStep(5)}
                      >
                        Skip Snacks & Checkout ➜
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="wizard-btn-next"
                        onClick={() => setBookingStep(5)}
                      >
                        <span>Continue with Snacks (₹{grandTotal})</span>
                        <ChevronRight size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ====================================================
                STEP 5: REVIEW BOOKING & INSTANT CONFIRMATION
                ==================================================== */}
            {bookingStep === 5 && (
              <div className="wizard-step-pane">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-left">
                    <span className="wizard-step-pill-tag">Step 5 of 5</span>
                    <h3 className="wizard-step-heading">Review & Instant Confirmation</h3>
                    <p className="wizard-step-subtext">
                      Verify your session details. Enter your contact info to receive an instant WhatsApp booking slip.
                    </p>
                  </div>
                </div>

                {/* If already confirmed */}
                {confirmedBooking ? (
                  <div className="modal-success-view" style={{ maxWidth: 650, margin: '0 auto', padding: '2.5rem' }}>
                    <div className="success-badge" style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
                    <h3 className="modal-title" style={{ fontSize: '1.6rem', color: '#fff', marginBottom: 8 }}>
                      Booking Confirmed!
                    </h3>
                    <p className="modal-subtitle" style={{ color: '#cbd5e1', marginBottom: 20 }}>
                      Thank you, <strong>{confirmedBooking.customerName}</strong>! Your gaming station for <strong>{confirmedBooking.stationName}</strong> has been successfully reserved.
                    </p>

                    <div className="confirmed-details-box" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 85, 0, 0.3)', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                      <div className="detail-line" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span>Station:</span> <strong>{confirmedBooking.stationName}</strong>
                      </div>
                      <div className="detail-line" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span>Date & Time:</span> <strong>{confirmedBooking.date} ({confirmedBooking.timeSlotRange})</strong>
                      </div>
                      <div className="detail-line" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span>Players:</span> <strong>{confirmedBooking.playerCount}</strong>
                      </div>
                      <div className="detail-line" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span>Gaming Charge:</span> <strong>₹{confirmedBooking.gamingAmount || confirmedBooking.totalAmount}</strong>
                      </div>
                      {confirmedBooking.snacksAmount > 0 && (
                        <div className="detail-line" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <span>Snacks:</span> <strong>{confirmedBooking.foodItems?.map((f) => `${f.name} x${f.quantity}`).join(', ')} (₹{confirmedBooking.snacksAmount})</strong>
                        </div>
                      )}
                      <div className="detail-line" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontSize: '1.15rem' }}>
                        <span>Grand Total:</span> <strong style={{ color: '#ff5500' }}>₹{confirmedBooking.totalAmount}</strong>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 8 }}>
                        📍 TS GAMING CAFE, Waluj, Sambhajinagar • Pay at Counter
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <a
                        href={getWhatsAppBookingUrl(confirmedBooking)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whatsapp-btn"
                        style={{ background: '#25D366', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, fontWeight: 800 }}
                      >
                        <MessageCircle size={20} />
                        <span>Send Slip on WhatsApp</span>
                      </a>
                      <button
                        type="button"
                        className="wizard-btn-back"
                        onClick={() => {
                          setConfirmedBooking(null);
                          setBookingStep(1);
                        }}
                      >
                        Book Another Session 🔄
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleConfirmBookingSubmit} className="wizard-checkout-grid">
                    {/* Left: Transparent Cyberpunk Ticket / Receipt */}
                    <div className="wizard-ticket-card">
                      <div className="wizard-ticket-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Receipt size={18} color="#ff5500" />
                          <strong style={{ color: '#fff', fontSize: '1rem', letterSpacing: '0.04em' }}>
                            BOOKING SUMMARY SLIP
                          </strong>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 800 }}>
                          ⚡ Pay at Counter
                        </span>
                      </div>

                      <div className="wizard-ticket-row">
                        <span>🎮 Station Setup:</span>
                        <strong>{currentStation.name} ({currentStation.badge || 'Console'})</strong>
                      </div>
                      <div className="wizard-ticket-row">
                        <span>⏱️ Session Duration:</span>
                        <strong>{DURATIONS.find((d) => d.id === duration)?.label}</strong>
                      </div>
                      <div className="wizard-ticket-row">
                        <span>👥 Number of Players:</span>
                        <strong>{playerCount} Gamer(s)</strong>
                      </div>
                      <div className="wizard-ticket-row">
                        <span>📅 Booking Date:</span>
                        <strong>{formatDisplayDate(selectedDate)}</strong>
                      </div>
                      <div className="wizard-ticket-row">
                        <span>⏰ Time Slot:</span>
                        <strong style={{ color: '#ff8800' }}>{selectedTime} - {formattedEndTime}</strong>
                      </div>
                      <div className="wizard-ticket-row">
                        <span>🎮 Gaming Subtotal:</span>
                        <strong style={{ color: '#4ade80' }}>₹{totalAmount}</strong>
                      </div>
                      {snacksTotal > 0 && (
                        <div className="wizard-ticket-row">
                          <span>🍔 Snacks & Drinks:</span>
                          <strong style={{ color: '#ff8800' }}>
                            {snackCart.map((i) => `${i.name} x${i.quantity}`).join(', ')} (₹{snacksTotal})
                          </strong>
                        </div>
                      )}
                      <div className="wizard-ticket-row">
                        <span>📍 Cafe Location:</span>
                        <span>Waluj, Sambhajinagar</span>
                      </div>

                      <div className="wizard-ticket-total-row">
                        <span>Total to Pay:</span>
                        <span style={{ color: '#4ade80' }}>₹{grandTotal}</span>
                      </div>
                    </div>

                    {/* Right: Customer Details Form & Confirmation */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.025)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 16,
                      padding: 22,
                    }}>
                      <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 900, marginBottom: 14 }}>
                        Customer Details
                      </h4>

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, marginBottom: 6 }}>
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Your name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="modal-input"
                          style={{
                            width: '100%',
                            background: '#070a12',
                            border: '1px solid rgba(255, 85, 0, 0.3)',
                            color: '#fff',
                            padding: '12px 14px',
                            borderRadius: 10,
                            fontSize: '0.9rem',
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: 18 }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, marginBottom: 6 }}>
                          Mobile / WhatsApp Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 7972430951"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="modal-input"
                          style={{
                            width: '100%',
                            background: '#070a12',
                            border: '1px solid rgba(255, 85, 0, 0.3)',
                            color: '#fff',
                            padding: '12px 14px',
                            borderRadius: 10,
                            fontSize: '0.9rem',
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="wizard-btn-next"
                        style={{
                          width: '100%',
                          padding: '14px',
                          justifyContent: 'center',
                          fontSize: '1rem',
                        }}
                      >
                        {isSubmitting ? 'Reserving Slot...' : `Confirm & Pay ₹${grandTotal} at Cafe ➔`}
                      </button>

                      <div style={{ textAlign: 'center', marginTop: 14 }}>
                        <button
                          type="button"
                          onClick={() => setBookingStep(4)}
                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          ⬅ Back to Edit Snacks (Step 4)
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5: STATION PRICING (PER PERSON)
          ============================================================ */}
      <section className="section-pricing" id="pricing">
        <div className="container">
          <div className="section-header-tag">
            <span className="rupee-icon">₹</span>
            <h2>STATION PRICING (Per Person)</h2>
          </div>

          <div className="pricing-layout-grid">
            {/* Left: 5 Pricing Cards */}
            <div className="pricing-cards-grid">
              {stations.map((station) => (
                <div key={station.id} className="price-card">
                  <div className="price-card__header">
                    <img src={station.image} alt={station.name} className="price-card__img" />
                    <div>
                      <h3 className="price-card__title">{station.name}</h3>
                      {station.badge && (
                        <span className="price-card__sub-note">{station.badge}</span>
                      )}
                    </div>
                  </div>

                  <div className="price-card__table">
                    <div className="price-row">
                      <span className="price-label">1 Hour</span>
                      <span className="price-val">₹{station.pricing['1h']}</span>
                    </div>
                    <div className="price-row">
                      <span className="price-label">2 Hours</span>
                      <span className="price-val">₹{station.pricing['2h'] || station.pricing['1h'] * 2}</span>
                    </div>
                    <div className="price-row">
                      <span className="price-label">Group</span>
                      <span className="price-val">₹{station.pricing['group']}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 6: FOOD & DRINKS AT CAFE
          ============================================================ */}
      <section className="section-food" id="food">
        <div className="container">
          <div className="section-header-tag">
            <span className="food-icon">🍴</span>
            <h2>FOOD & DRINKS AT CAFE</h2>
          </div>

          <div className="food-grid">
            {foodItems.map((item) => {
              const stock = Number(item.stock);
              const isOut = !isNaN(stock) && stock <= 0;
              const displayPrice = typeof item.price === 'number' ? `₹${item.price}` : item.price;

              return (
                <div key={item.id || item.name} className={`food-card ${isOut ? 'food-card--out' : ''}`}>
                  <div className="food-card__img-box">
                    <img
                      src={item.image || '/images/more-items.jpg'}
                      alt={item.name}
                      className="food-card__img"
                      onError={(e) => {
                        e.target.src = '/images/more-items.jpg';
                      }}
                    />
                    <span className="food-card__price">{displayPrice}</span>
                    {isOut && <span className="food-card__out-badge">Out of Stock</span>}
                  </div>
                  <div className="food-card__content">
                    <h3 className="food-card__title">{item.name}</h3>
                    <p className="food-card__desc">{item.desc || 'Fresh cafe snack'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          CONFIRMATION MODAL
          ============================================================ */}
      {isModalOpen && (
        <div className="booking-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="booking-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {!confirmedBooking ? (
              <form onSubmit={handleConfirmBookingSubmit} className="modal-form">
                <h3 className="modal-title">Complete Your Booking</h3>
                <p className="modal-subtitle">
                  {currentStation.name} • {playerCount} {playerCount === 1 ? 'Player' : 'Players'} • {DURATIONS.find((d) => d.id === duration)?.label}
                </p>

                <div className="modal-summary-pill">
                  <div>
                    <span>📅 {formatDisplayDate(selectedDate)}</span>
                    <span style={{ marginLeft: '12px' }}>
                      ⏰ {selectedTime} - {formattedEndTime}
                    </span>
                  </div>
                  <strong className="text-orange">₹{totalAmount}</strong>
                </div>

                <div className="modal-field">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="modal-input"
                    autoFocus
                  />
                </div>

                <div className="modal-field">
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9000000000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="modal-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="modal-submit-btn"
                  id="final-confirm-booking-btn"
                >
                  {isSubmitting ? 'Confirming...' : `Confirm & Pay ₹${grandTotal} at Cafe`}
                </button>
              </form>
            ) : (
              <div className="modal-success-view">
                <div className="success-badge">✅</div>
                <h3 className="modal-title">Booking Confirmed!</h3>
                <p className="modal-subtitle">
                  Thank you, {confirmedBooking.customerName}! Your slot for {confirmedBooking.stationName} has been booked.
                </p>

                <div className="confirmed-details-box">
                  <div className="detail-line">
                    <span>Station:</span> <strong>{confirmedBooking.stationName}</strong>
                  </div>
                  <div className="detail-line">
                    <span>Date & Time:</span> <strong>{confirmedBooking.date} ({confirmedBooking.timeSlotRange})</strong>
                  </div>
                  <div className="detail-line">
                    <span>Players:</span> <strong>{confirmedBooking.playerCount}</strong>
                  </div>
                  {confirmedBooking.snacksAmount > 0 && (
                    <div className="detail-line">
                      <span>Snacks:</span> <strong>{confirmedBooking.foodItems?.map((f) => `${f.name} x${f.quantity}`).join(', ')} (₹{confirmedBooking.snacksAmount})</strong>
                    </div>
                  )}
                  <div className="detail-line">
                    <span>Grand Total:</span> <strong className="text-orange">₹{confirmedBooking.totalAmount}</strong>
                  </div>
                  <div className="detail-line">
                    <span>Location:</span> <strong>TS GAMING CAFE, Waluj</strong>
                  </div>
                </div>

                <div className="modal-actions-row">
                  <a
                    href={getWhatsAppBookingUrl(confirmedBooking)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-btn"
                  >
                    <MessageCircle size={18} />
                    <span>Send on WhatsApp</span>
                  </a>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setIsModalOpen(false);
                      setConfirmedBooking(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
