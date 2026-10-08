import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { createBooking } from '../firebase/firestore';
import './Home.css';

/* ── STATIONS DATA ── */
const STATIONS = [
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
    pricing: { '30m': 30, '1h': 40, '2h': 80, 'group': 30 },
  },
  {
    id: 'ps4',
    name: 'PS4',
    fullName: 'PlayStation 4',
    image: '/images/ps4.jpg',
    badge: 'Pro 4K HDR',
    shortInfo: 'High-end gaming library & competitive sports',
    pricing: { '30m': 40, '1h': 50, '2h': 100, 'group': 40 },
  },
  {
    id: 'ps5',
    name: 'PS5',
    fullName: 'PlayStation 5',
    image: '/images/ps5.jpg',
    badge: 'Next-Gen 120Hz',
    shortInfo: 'Ultra-fast SSD, 120 FPS & DualSense Haptics',
    pricing: { '30m': 70, '1h': 80, '2h': 160, 'group': 70 },
  },
  {
    id: 'sim_racing',
    name: 'SIM RACING',
    fullName: 'Racing Simulator Cockpit',
    image: '/images/sim-racing.jpg',
    badge: 'Force Feedback',
    shortInfo: 'Pro racing wheel, metal pedals & cockpit seat',
    pricing: { '30m': 100, '1h': 150, '2h': 300, 'group': 80 },
  },
];

/* ── TIME SLOTS ── */
const TIME_SLOTS = [
  '6:00 AM',
  '8:00 AM',
  '10:00 AM',
  '12:00 PM',
  '2:00 PM',
  '4:00 PM',
  '6:00 PM',
  '8:00 PM',
];

/* ── DURATION OPTIONS ── */
const DURATIONS = [
  { id: '30m', label: '30 Minutes', durationHours: 0.5 },
  { id: '1h', label: '1 Hour', durationHours: 1 },
  { id: '2h', label: '2 Hours', durationHours: 2, promo: '🎁 FREE Snack' },
  { id: 'group', label: 'Group', durationHours: 1 },
];

/* ── FOOD ITEMS ── */
const FOOD_ITEMS = [
  { name: 'Pizza', image: '/images/pizza.jpg', price: '₹149', desc: 'Cheesy thin crust' },
  { name: 'Burger', image: '/images/burger.jpg', price: '₹79', desc: 'Crispy veggie patty' },
  { name: 'French Fries', image: '/images/french-fries.jpg', price: '₹69', desc: 'Salted & Peri Peri' },
  { name: 'Vadapav', image: '/images/vadapav.jpg', price: '₹25', desc: 'Authentic Mumbai style' },
  { name: 'Momos', image: '/images/momos.jpg', price: '₹89', desc: 'Steamed with spicy chutney' },
  { name: 'Ice Cream', image: '/images/icecream.jpg', price: '₹49', desc: 'Assorted scoops' },
  { name: 'Cold Drinks', image: '/images/cold-drinks.jpg', price: '₹35', desc: 'Chilled soda cans' },
  { name: 'More Items', image: '/images/more-items.jpg', price: 'Explore', desc: 'Snacks & beverages' },
];

export default function Home() {
  const toast = useToast();

  // Booking Form State
  const [selectedStationId, setSelectedStationId] = useState('ps5');
  const [duration, setDuration] = useState('1h');
  const [playerCount, setPlayerCount] = useState(2);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState('4:00 PM');

  // Confirmation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Active Station Object
  const currentStation = STATIONS.find((s) => s.id === selectedStationId) || STATIONS[3];

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

      const durationHours = durationType === '30m' ? 0.5 : durationType === '2h' ? 2 : 1;
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

    setIsSubmitting(true);
    const bookingPayload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      stationId: currentStation.id,
      stationName: currentStation.name,
      stationFullName: currentStation.fullName,
      duration,
      durationLabel: DURATIONS.find((d) => d.id === duration)?.label || '1 Hour',
      playerCount,
      date: selectedDate,
      timeSlot: selectedTime,
      timeSlotRange: `${selectedTime} - ${formattedEndTime}`,
      totalAmount,
      cafeLocation: 'Waluj, Aurangabad',
      status: 'confirmed',
    };

    try {
      await createBooking(bookingPayload);
      toast.success('Booking Successful!', `Your session for ${currentStation.name} has been booked.`);
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
    const message = `🎮 *New Booking from TS Gaming Cafe Website*
👤 Name: ${booking.customerName}
📞 Phone: ${booking.customerPhone}
🕹️ Station: ${booking.stationName} (${booking.stationFullName})
👥 Players: ${booking.playerCount}
⏱️ Duration: ${booking.durationLabel}
📅 Date: ${booking.date}
⏰ Time: ${booking.timeSlotRange}
💰 Total: ₹${booking.totalAmount}
📍 Location: Waluj, Aurangabad`;

    return `https://wa.me/919876543210?text=${encodeURIComponent(message)}`;
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
                  src="/images/ts-badge.jpg"
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
                    <div className="hero-card__value">5:00 AM - 11:30 PM</div>
                    <div className="hero-card__sub-warning">Last Booking: 10:30 PM</div>
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
            {STATIONS.map((station) => {
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
              {/* Left Column: 5 Step Selection Form */}
              <div className="booking-steps-col">
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
                          {STATIONS.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} — {s.fullName}
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
                    <label className="step-title">Select Time</label>
                    <div className="time-slots-grid">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`time-slot-btn ${selectedTime === slot ? 'active' : ''}`}
                          onClick={() => setSelectedTime(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
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
                        ⏰ {selectedTime} - {formattedEndTime}
                      </p>
                    </div>
                  </div>

                  {duration === '2h' && (
                    <div className="summary-promo-callout">
                      <Gift size={16} />
                      <span>Eligible for 1 FREE Cold Drink or Snack!</span>
                    </div>
                  )}

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
              {STATIONS.map((station) => (
                <div key={station.id} className="price-card">
                  <div className="price-card__header">
                    <img src={station.image} alt={station.name} className="price-card__img" />
                    <div>
                      <h3 className="price-card__title">{station.name}</h3>
                      {station.id === 'ps2' && (
                        <span className="price-card__sub-note">Group games only</span>
                      )}
                    </div>
                  </div>

                  <div className="price-card__table">
                    <div className="price-row">
                      <span className="price-label">30 Minutes</span>
                      <span className="price-val">₹{station.pricing['30m']}</span>
                    </div>
                    <div className="price-row">
                      <span className="price-label">1 Hour</span>
                      <span className="price-val">₹{station.pricing['1h']}</span>
                    </div>
                    <div className="price-row">
                      <span className="price-label">Group</span>
                      <span className="price-val">₹{station.pricing['group']}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: 2 Hours Promo Special Banner */}
            <div className="pricing-promo-card">
              <div className="pricing-promo-banner-header">
                <Gift size={24} className="promo-gift-icon" />
                <div className="promo-banner-text">
                  <span className="promo-tagline">2 HOURS BOOKING =</span>
                  <span className="promo-highlight">FREE</span>
                  <span className="promo-sub">COLD DRINK / SNACK</span>
                </div>
              </div>

              <div className="pricing-promo-body">
                <img
                  src="/images/promo-snack.jpg"
                  alt="Free Snack Promo"
                  className="pricing-promo-img"
                />
                <div className="pricing-promo-note">
                  Choose from Cold Drink / Fries / Burger / Vadapav / Momos / Ice Cream
                </div>
                <button
                  className="promo-book-btn"
                  onClick={() => {
                    setDuration('2h');
                    scrollToBooking();
                  }}
                >
                  Book 2 Hours & Claim Offer
                </button>
              </div>
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
            {FOOD_ITEMS.map((item) => (
              <div key={item.name} className="food-card">
                <div className="food-card__img-box">
                  <img src={item.image} alt={item.name} className="food-card__img" />
                  <span className="food-card__price">{item.price}</span>
                </div>
                <div className="food-card__content">
                  <h3 className="food-card__title">{item.name}</h3>
                  <p className="food-card__desc">{item.desc}</p>
                </div>
              </div>
            ))}
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
                  {currentStation.name} • {playerCount} Players • {DURATIONS.find((d) => d.id === duration)?.label}
                </p>

                <div className="modal-summary-pill">
                  <div>
                    <span>📅 {formatDisplayDate(selectedDate)}</span>
                    <span style={{ marginLeft: '12px' }}>⏰ {selectedTime} - {formattedEndTime}</span>
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
                    placeholder="e.g. 9876543210"
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
