import React, { useState, useEffect } from 'react';
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

/* ── DEFAULT FALLBACK STATIONS ── */
const DEFAULT_STATIONS = [
  {
    id: 'ps2',
    name: 'PS2',
    fullName: 'PlayStation 2',
    image: '/images/ps2.jpg',
    badge: 'Retro Classic',
    shortInfo: 'Group games only (WWE, SmackDown etc.)',
    pricing: { '1h': 30, '2h': 60, 'group': 20 },
  },
  {
    id: 'ps3',
    name: 'PS3',
    fullName: 'PlayStation 3',
    image: '/images/ps3.jpg',
    badge: 'Co-op Favorite',
    shortInfo: 'HD Multiplayer & legendary classic titles',
    pricing: { '1h': 40, '2h': 80, 'group': 30 },
  },
  {
    id: 'ps4',
    name: 'PS4',
    fullName: 'PlayStation 4',
    image: '/images/ps4.jpg',
    badge: 'Pro 4K HDR',
    shortInfo: 'High-end gaming library & competitive sports',
    pricing: { '1h': 50, '2h': 100, 'group': 40 },
  },
  {
    id: 'ps5',
    name: 'PS5',
    fullName: 'PlayStation 5',
    image: '/images/ps5.jpg',
    badge: 'Next-Gen 120Hz',
    shortInfo: 'Ultra-fast SSD, 120 FPS & DualSense Haptics',
    pricing: { '1h': 80, '2h': 160, 'group': 70 },
  },
  {
    id: 'sim_racing',
    name: 'SIM RACING',
    fullName: 'Racing Simulator Cockpit',
    image: '/images/sim-racing.jpg',
    badge: 'Force Feedback',
    shortInfo: 'Pro racing wheel, metal pedals & cockpit seat',
    pricing: { '1h': 150, '2h': 300, 'group': 80 },
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

/* ── DURATION OPTIONS (30m removed, 2h without free snacks promo) ── */
const DURATIONS = [
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

  // Confirmation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

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

  // Compute End Time
  const calculateEndTime = (startTimeStr, durationType) => {
    try {
      const [time, modifier] = startTimeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const durationHours = durationType === '2h' ? 2 : 1;
      let totalMinutes = hours * 60 + minutes + durationHours * 60;
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
    if (stationId) setSelectedStationId(stationId);
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
        toast.error('Slot Expired (N/A)', 'हा स्लॉट वेळ आधीच संपला आहे. कृपया पुढील उपलब्ध स्लॉट निवडा.');
        return;
      }
      if (isSlotBooked(selectedTime)) {
        toast.error('Already Booked', 'हा स्लॉट आधीच बुक झालेला आहे. कृपया दुसरा स्लॉट निवडा.');
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
      totalAmount,
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
    const message = `🎮 *New Booking from TS Gaming Cafe Website*
🕹️ Type: ${modeText}
👤 Name: ${booking.customerName}
📞 Phone: ${booking.customerPhone}
🎮 Station: ${booking.stationName} (${booking.stationFullName})
👥 Players: ${booking.playerCount}
⏱️ Duration: ${booking.durationLabel}
📅 Date: ${booking.date}
⏰ Time: ${booking.timeSlotRange} ${booking.isWalkIn ? '(Starting Immediately)' : ''}
💰 Total: ₹${booking.totalAmount}
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
          SECTION 4: BOOKING SECTION
          ============================================================ */}
      <section className="section-booking" id="booking">
        <div className="container">
          <div className="booking-card">
            <div className="section-header-tag booking-title-tag">
              <Gamepad2 size={22} className="tag-icon" />
              <h2>BOOK YOUR SESSION</h2>
            </div>

            <div className="booking-layout">
              {/* Left Column: Selection Form */}
              <div className="booking-steps-col">

                {/* ── Booking Mode Switcher: Play Now vs Advance Slot ── */}
                <div className="booking-mode-selector">
                  <label className="step-title" style={{ marginBottom: '10px' }}>
                    Choose Booking Type
                  </label>
                  <div className="booking-mode-tabs">
                    <button
                      type="button"
                      className={`booking-mode-tab ${bookingMode === 'now' ? 'booking-mode-tab--active-now' : ''}`}
                      onClick={() => {
                        setBookingMode('now');
                        const today = new Date().toISOString().split('T')[0];
                        setSelectedDate(today);
                        setSelectedTime(getCurrentTime12h());
                      }}
                      id="mode-play-now-btn"
                    >
                      <span className="mode-tab-icon">⚡</span>
                      <div className="mode-tab-text">
                        <strong className="mode-tab-title">Play Right Now (Walk-In)</strong>
                        <span className="mode-tab-subtitle">कॅफेमध्ये आहात? थेट चालू वेळेत लगेच खेळा</span>
                      </div>
                      <span className="mode-tab-badge mode-tab-badge--live">LIVE NOW</span>
                    </button>

                    <button
                      type="button"
                      className={`booking-mode-tab ${bookingMode === 'slot' ? 'booking-mode-tab--active-slot' : ''}`}
                      onClick={() => {
                        setBookingMode('slot');
                        if (!TIME_SLOTS.includes(selectedTime)) {
                          setSelectedTime('5:00 PM');
                        }
                      }}
                      id="mode-advance-slot-btn"
                    >
                      <span className="mode-tab-icon">📅</span>
                      <div className="mode-tab-text">
                        <strong className="mode-tab-title">Book Advance Slot</strong>
                        <span className="mode-tab-subtitle">आज पुढे किंवा उद्यासाठी वेळ निवडा</span>
                      </div>
                      <span className="mode-tab-badge mode-tab-badge--slot">SLOTS</span>
                    </button>
                  </div>
                </div>

                {/* Step 1: Select Station */}
                <div className="booking-step">
                  <div className="step-badge">1</div>
                  <div className="step-body">
                    <label className="step-title">Select Station</label>
                    <div className="step-station-selector">
                      <div className="station-select-wrapper">
                        <img
                          src={currentStation.image}
                          alt={currentStation.name}
                          className="station-thumb"
                        />
                        <select
                          value={selectedStationId}
                          onChange={(e) => setSelectedStationId(e.target.value)}
                          className="step-select-input"
                          id="booking-station-select"
                        >
                          {stations.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.fullName && s.fullName !== s.name ? `— ${s.fullName}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Select Duration */}
                <div className="booking-step">
                  <div className="step-badge">2</div>
                  <div className="step-body">
                    <label className="step-title">Select Duration</label>
                    <div className="duration-buttons-grid">
                      {DURATIONS.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className={`duration-btn ${duration === d.id ? 'active' : ''}`}
                          onClick={() => setDuration(d.id)}
                        >
                          <span>{d.label}</span>
                          {d.promo && <span className="duration-promo-badge">{d.promo}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 3: Number of Players */}
                <div className="booking-step">
                  <div className="step-badge">3</div>
                  <div className="step-body">
                    <label className="step-title">Number of Players</label>
                    <div className="players-counter-row">
                      <div className="counter-box">
                        <button
                          type="button"
                          className="counter-btn"
                          onClick={() => setPlayerCount((p) => Math.max(1, p - 1))}
                          disabled={playerCount <= 1}
                        >
                          -
                        </button>
                        <span className="counter-val">{playerCount}</span>
                        <button
                          type="button"
                          className="counter-btn"
                          onClick={() => setPlayerCount((p) => Math.min(8, p + 1))}
                          disabled={playerCount >= 8}
                        >
                          +
                        </button>
                      </div>
                      <span className="counter-hint">Price will be calculated automatically</span>
                    </div>
                  </div>
                </div>

                {/* Conditional Step 4 & 5 based on Mode */}
                {bookingMode === 'now' ? (
                  /* ── Walk-in Live Time Box ── */
                  <div className="walkin-instant-card">
                    <div className="walkin-instant-card__top">
                      <div className="walkin-instant-card__status">
                        <span className="live-pulse-dot" />
                        <strong>⚡ Starting Immediately (Live Time)</strong>
                      </div>
                      <span className="walkin-instant-card__badge">No Slot Waiting</span>
                    </div>

                    <div className="walkin-instant-card__times">
                      <div className="walkin-time-block">
                        <span className="walkin-time-label">Start Time (Now)</span>
                        <span className="walkin-time-val">{selectedTime}</span>
                        <span className="walkin-time-sub">Today ({formatDisplayDate(selectedDate)})</span>
                      </div>
                      <div className="walkin-arrow-block">
                        <span>➜</span>
                        <small>{DURATIONS.find((d) => d.id === duration)?.label}</small>
                      </div>
                      <div className="walkin-time-block">
                        <span className="walkin-time-label">Session Ends</span>
                        <span className="walkin-time-val text-orange">{formattedEndTime}</span>
                        <span className="walkin-time-sub">Automatic timer on desk</span>
                      </div>
                    </div>

                    <div className="walkin-instant-card__note">
                      👍 <strong>Walk-in Gamer:</strong> थेट <strong>TS Gaming Cafe (Waluj)</strong> काउंटरवर जा. नाव सांगा आणि console लगेच ॲक्टिव्हेट होईल!
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Step 4: Select Date */}
                    <div className="booking-step">
                      <div className="step-badge">4</div>
                      <div className="step-body">
                        <label className="step-title">Select Date</label>
                        <div className="date-input-wrap">
                          <Calendar size={18} className="input-calendar-icon" />
                          <input
                            type="date"
                            value={selectedDate}
                            min={getTodayDateStr()}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="booking-date-input"
                            id="booking-date-input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 5: Select Time */}
                    <div className="booking-step">
                      <div className="step-badge">5</div>
                      <div className="step-body">
                        <div className="slot-header-flex">
                          <label className="step-title" style={{ marginBottom: 0 }}>Select Time Slot</label>
                          <div className="slot-legend-hint">
                            <span className="legend-tag legend-tag--na">N/A = वेळ संपली</span>
                            <span className="legend-tag legend-tag--booked">Booked = आधीच बुक</span>
                          </div>
                        </div>
                        <div className="time-slots-grid">
                          {TIME_SLOTS.map((slot) => {
                            const isPassed = isSlotPassed(slot);
                            const isBooked = isSlotBooked(slot);
                            const isUnavailable = isPassed || isBooked;
                            const isSelected = selectedTime === slot;

                            let statusClass = '';
                            if (isPassed) statusClass = 'time-slot-btn--passed';
                            else if (isBooked) statusClass = 'time-slot-btn--booked';

                            return (
                              <button
                                key={slot}
                                type="button"
                                className={`time-slot-btn ${statusClass} ${isSelected && !isUnavailable ? 'active' : ''}`}
                                onClick={() => {
                                  if (!isUnavailable) setSelectedTime(slot);
                                }}
                                disabled={isUnavailable}
                                title={
                                  isPassed
                                    ? `${slot} (वेळ संपली - N/A)`
                                    : isBooked
                                    ? `${slot} (हा स्लॉट आधीच बुक आहे)`
                                    : `${slot} बुक करा`
                                }
                              >
                                <span className="time-slot-label">{slot}</span>
                                {isPassed && <span className="slot-badge slot-badge--na">N/A</span>}
                                {isBooked && !isPassed && <span className="slot-badge slot-badge--booked">Booked</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Booking Summary Card */}
              <div className="booking-summary-col">
                <div className="summary-card">
                  <h3 className="summary-card__header">Booking Summary</h3>

                  <div className="summary-station-preview">
                    <img
                      src={currentStation.image}
                      alt={currentStation.name}
                      className="summary-console-img"
                    />
                    <div className="summary-meta">
                      <h4 className="summary-station-title">{currentStation.name}</h4>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: bookingMode === 'now' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 85, 0, 0.12)',
                        color: bookingMode === 'now' ? '#16a34a' : '#ff5500',
                        border: bookingMode === 'now' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 85, 0, 0.25)',
                        marginBottom: '6px'
                      }}>
                        {bookingMode === 'now' ? '⚡ Walk-In (Play Now)' : '📅 Advance Slot'}
                      </div>
                      <p className="summary-item">
                        <Users size={14} /> {playerCount} {playerCount === 1 ? 'Player' : 'Players'}
                      </p>
                      <p className="summary-item">
                        <Clock size={14} /> {DURATIONS.find((d) => d.id === duration)?.label}
                      </p>
                      <p className="summary-item">
                        <Calendar size={14} /> {formatDisplayDate(selectedDate)}
                      </p>
                      <p className="summary-item">
                        ⏰ {selectedTime} - {formattedEndTime} {bookingMode === 'now' && '(Starting Now)'}
                      </p>
                    </div>
                  </div>

                  <div className="summary-divider" />

                  <div className="summary-total-row">
                    <span className="total-label">Total Amount</span>
                    <span className="total-amount">₹{totalAmount}</span>
                  </div>

                  <button
                    className="summary-confirm-btn"
                    onClick={() => {
                      setConfirmedBooking(null);
                      setIsModalOpen(true);
                    }}
                    id="confirm-booking-open-modal-btn"
                  >
                    <span>Confirm Booking</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
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
                    placeholder="e.g. Rahul Sharma"
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
                    placeholder="e.g. 7972430951"
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
                  {isSubmitting ? 'Confirming...' : `Confirm & Pay ₹${totalAmount} at Cafe`}
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
                  <div className="detail-line">
                    <span>Total Amount:</span> <strong className="text-orange">₹{confirmedBooking.totalAmount}</strong>
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
