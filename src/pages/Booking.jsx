import React, { useState, useEffect, useMemo } from 'react';
import {
  Gamepad2,
  Clock,
  Calendar,
  Check,
  Phone,
  User,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  CheckCircle2,
  QrCode,
  MessageSquare,
  Monitor,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  createBooking,
  subscribeToAllBookings,
  subscribeToSetups,
} from '../firebase/firestore';
import UpiQrModal from '../components/UpiQrModal';
import CustomerAuthModal from '../components/CustomerAuthModal';
import './Booking.css';

// 1-Hour Time Slots from 10:00 AM to 10:00 PM
const TIME_SLOTS = [
  { id: '10:00', start: '10:00', end: '11:00', label: '10:00 AM' },
  { id: '11:00', start: '11:00', end: '12:00', label: '11:00 AM' },
  { id: '12:00', start: '12:00', end: '13:00', label: '12:00 PM' },
  { id: '13:00', start: '13:00', end: '14:00', label: '01:00 PM' },
  { id: '14:00', start: '14:00', end: '15:00', label: '02:00 PM' },
  { id: '15:00', start: '15:00', end: '16:00', label: '03:00 PM' },
  { id: '16:00', start: '16:00', end: '17:00', label: '04:00 PM' },
  { id: '17:00', start: '17:00', end: '18:00', label: '05:00 PM' },
  { id: '18:00', start: '18:00', end: '19:00', label: '06:00 PM' },
  { id: '19:00', start: '19:00', end: '20:00', label: '07:00 PM' },
  { id: '20:00', start: '20:00', end: '21:00', label: '08:00 PM' },
  { id: '21:00', start: '21:00', end: '22:00', label: '09:00 PM' },
];

export default function Booking() {
  const toast = useToast();
  const { user, userDoc, loading: authLoading } = useAuth();

  // ── Step State ──
  const [currentStep, setCurrentStep] = useState(1);

  // ── Real Setups & Bookings from Firestore ──
  const [setups, setSetups] = useState([]);
  const [allBookings, setAllBookings] = useState([]);

  // ── Selections ──
  const [selectedStationType, setSelectedStationType] = useState('PS5');
  const [selectedDate, setSelectedDate] = useState('');
  const [durationHrs, setDurationHrs] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // ── Customer Information (Added as requested) ──
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [whatsappReceipt, setWhatsappReceipt] = useState(true);

  // ── Payment & Submission ──
  const [paymentChoice, setPaymentChoice] = useState('counter'); // 'counter' | 'upi'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Generate next 7 days
  const nextDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      days.push({
        dateStr,
        dayName,
        dayNum,
        isToday: i === 0,
      });
    }
    return days;
  }, []);

  // Initialize date to today
  useEffect(() => {
    if (nextDays.length > 0 && !selectedDate) {
      setSelectedDate(nextDays[0].dateStr);
    }
  }, [nextDays, selectedDate]);

  // Autofill user details if logged in
  useEffect(() => {
    if (!user) return;
    setCustomerName(prev => prev || userDoc?.name || user.displayName || '');
    setCustomerPhone(prev => prev || userDoc?.phone || '');
  }, [user, userDoc]);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    const unsubBookings = subscribeToAllBookings(b => {
      if (Array.isArray(b)) setAllBookings(b);
    });
    const unsubSetups = subscribeToSetups(docs => {
      if (Array.isArray(docs)) {
        setSetups(docs.filter(s => s.status !== 'maintenance'));
      }
    });
    return () => {
      if (typeof unsubBookings === 'function') unsubBookings();
      if (typeof unsubSetups === 'function') unsubSetups();
    };
  }, []);

  // Compute station categories from setups
  const availableStations = useMemo(() => {
    if (!setups || setups.length === 0) {
      return [
        {
          id: 'ps5',
          type: 'PS5',
          name: 'PlayStation 5',
          sub: '4K Ultra, DualSense',
          rate: 100,
          count: 2,
        },
        {
          id: 'ps4',
          type: 'PS4',
          name: 'PS4 Pro',
          sub: 'Standard Controllers',
          rate: 80,
          count: 2,
        },
        {
          id: 'pc',
          type: 'PC',
          name: 'Gaming PC',
          sub: 'RTX 4060, 144Hz',
          rate: 120,
          count: 1,
        },
      ];
    }

    const map = new Map();
    setups.forEach(s => {
      const type = (s.type || 'PS4').toUpperCase();
      if (!map.has(type)) {
        const title =
          type === 'PS5' ? 'PlayStation 5'
          : type === 'PS4' ? 'PS4 Pro'
          : type === 'PC' ? 'Gaming PC'
          : type === 'RACING' ? 'Racing Simulator'
          : `${type} Station`;

        const sub =
          type === 'PS5' ? '4K Ultra, DualSense'
          : type === 'PS4' ? 'Standard Controllers'
          : type === 'PC' ? 'RTX 4060, 144Hz'
          : type === 'RACING' ? 'Wheel & Pedals'
          : (Array.isArray(s.specs) ? s.specs[0] : s.specs) || 'High Performance';

        map.set(type, {
          id: type.toLowerCase(),
          type: type,
          name: title,
          sub: sub,
          rate: Number(s.pricePerHour) || 100,
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

  // Keep selectedStationType valid
  useEffect(() => {
    if (availableStations.length > 0) {
      if (!availableStations.some(st => st.type === selectedStationType)) {
        setSelectedStationType(availableStations[0].type);
      }
    }
  }, [availableStations, selectedStationType]);

  const currentStation = useMemo(() => {
    return availableStations.find(s => s.type === selectedStationType) || availableStations[0];
  }, [availableStations, selectedStationType]);

  // Check if slot has passed for today
  const isSlotPast = (slotStart) => {
    if (!nextDays[0] || selectedDate !== nextDays[0].dateStr) return false;
    const now = new Date();
    const [h, m] = slotStart.split(':').map(Number);
    const slotDate = new Date();
    slotDate.setHours(h, m, 0, 0);
    return now.getTime() > slotDate.getTime();
  };

  // Check if all units of this station are booked for this slot
  const isSlotBooked = (slot) => {
    if (!currentStation) return false;
    const totalUnits = currentStation.count || 1;
    const bookedCount = allBookings.filter(b => {
      if (b.status === 'cancelled') return false;
      if (b.date !== selectedDate) return false;
      const bSetup = (b.setupName || '').toUpperCase();
      const sType = selectedStationType.toUpperCase();
      if (!bSetup.includes(sType)) return false;
      return b.startTime === slot.start;
    }).length;
    return bookedCount >= totalUnits;
  };

  // Pricing calculations
  const subtotal = (currentStation?.rate || 100) * durationHrs;
  const convenienceFee = 0; // FREE
  const totalAmount = subtotal + convenienceFee;

  // Step Meta
  const stepTitles = [
    { step: 1, title: 'Choose Setup', progress: '25%' },
    { step: 2, title: 'Select Time', progress: '50%' },
    { step: 3, title: 'Your Details', progress: '75%' },
    { step: 4, title: 'Checkout', progress: '100%' },
  ];

  const currentStepMeta = stepTitles[currentStep - 1] || stepTitles[0];

  // Duration modifier
  const updateDuration = (change) => {
    const next = durationHrs + change;
    if (next >= 1 && next <= 6) {
      setDurationHrs(next);
    }
  };

  // ── AUTO ADVANCE ON SELECTION (User Request: "select keli ki next time auto madhe aali pahije") ──
  const handleSelectStation = (stationType) => {
    setSelectedStationType(stationType);
    // Smooth auto-advance to Step 2
    setTimeout(() => {
      setCurrentStep(2);
    }, 220);
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    // Smooth auto-advance to Step 3
    setTimeout(() => {
      setCurrentStep(3);
    }, 220);
  };

  // Step Validation & Navigation
  const canProceedStep1 = !!selectedStationType;
  const canProceedStep2 = !!selectedSlot;
  const cleanPhone = customerPhone.replace(/\D/g, '');
  const canProceedStep3 = customerName.trim().length >= 2 && cleanPhone.length === 10;

  const nextStep = () => {
    if (currentStep === 1 && canProceedStep1) setCurrentStep(2);
    else if (currentStep === 2 && canProceedStep2) setCurrentStep(3);
    else if (currentStep === 3) {
      if (!canProceedStep3) {
        if (!customerName.trim()) return toast.show('Please enter your full name', 'error');
        if (cleanPhone.length !== 10) return toast.show('Please enter a valid 10-digit mobile number', 'error');
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      handleFinalSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Final Booking Submit
  const handleFinalSubmit = async () => {
    if (!canProceedStep3) {
      toast.show('Please complete your name and 10-digit mobile number.', 'error');
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);
    try {
      const [startH, startM] = (selectedSlot?.start || '10:00').split(':').map(Number);
      const endH = startH + durationHrs;
      const computedEndTime = `${String(endH).padStart(2, '0')}:${String(startM || 0).padStart(2, '0')}`;

      const matchingSetups = currentStation.setups || [];
      const assignedSetup = matchingSetups[0] || null;

      const payload = {
        userId: user?.uid || 'guest-web-user',
        userName: customerName.trim(),
        customerName: customerName.trim(),
        userPhone: cleanPhone,
        customerPhone: cleanPhone,
        setupId: assignedSetup?.id || 'general-setup',
        setupName: currentStation.name,
        stationName: currentStation.name,
        date: selectedDate,
        startTime: selectedSlot.start,
        endTime: computedEndTime,
        duration: durationHrs,
        durationMins: durationHrs * 60,
        totalAmount,
        status: 'confirmed',
        paymentStatus: paymentChoice === 'upi' ? 'pending' : 'pending',
        paymentMode: paymentChoice === 'upi' ? 'upi' : 'pay_at_cafe',
        whatsappReceipt: whatsappReceipt,
        source: 'website_user',
      };

      const docRef = await createBooking(payload);
      const finalBooking = { ...payload, id: docRef?.id || String(Date.now()).slice(-6) };
      setBookingSuccess(finalBooking);

      toast.show('Booking Confirmed! See you at TS Gaming Cafe.', 'success');

      if (paymentChoice === 'upi') {
        setShowUpiModal(true);
      }
    } catch (err) {
      console.error('Booking failed:', err);
      toast.show('Failed to create booking: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date readable
  const getSelectedDateDisplay = () => {
    if (!selectedDate) return 'Today';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="customer-booking-page">
      {/* Mobile Device Frame */}
      <div className="customer-booking-frame">
        {/* Top Header */}
        <header className="booking-frame-header">
          <button
            type="button"
            className={`header-back-btn ${currentStep === 1 || bookingSuccess ? 'hidden' : ''}`}
            onClick={prevStep}
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="header-title-box">
            <h1 className="header-step-title">
              {bookingSuccess ? 'Receipt' : currentStepMeta.title}
            </h1>
          </div>

          <div className="header-spacer" />
        </header>

        {/* Progress Line */}
        {!bookingSuccess && (
          <div className="booking-progress-track">
            <div
              className="booking-progress-fill"
              style={{ width: currentStepMeta.progress }}
            />
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="booking-content-scroll">
          {/* ═══════════════════════════════════════════════════════
              SUCCESS SCREEN (After Confirmation)
             ═══════════════════════════════════════════════════════ */}
          {bookingSuccess ? (
            <div className="booking-success-view">
              <div className="success-badge-icon">
                <CheckCircle2 size={32} />
              </div>

              <h2 className="success-booking-title">Booking Confirmed!</h2>
              <p className="success-booking-desc">
                Your slot is reserved at <strong>TS Gaming Cafe</strong>.
              </p>

              {/* Receipt Box */}
              <div className="receipt-card">
                <h3 className="receipt-header-title">{bookingSuccess.setupName}</h3>

                <div className="receipt-item-row">
                  <span className="receipt-item-label">
                    <Calendar size={13} /> Date
                  </span>
                  <span className="receipt-item-val">{bookingSuccess.date}</span>
                </div>

                <div className="receipt-item-row">
                  <span className="receipt-item-label">
                    <Clock size={13} /> Time Slot
                  </span>
                  <span className="receipt-item-val">
                    {bookingSuccess.startTime} – {bookingSuccess.endTime}
                  </span>
                </div>

                <div className="receipt-item-row">
                  <span className="receipt-item-label">
                    <User size={13} /> Gamer
                  </span>
                  <span className="receipt-item-val">{bookingSuccess.userName}</span>
                </div>

                <div className="receipt-item-row">
                  <span className="receipt-item-label">
                    <Phone size={13} /> Mobile
                  </span>
                  <span className="receipt-item-val">+91 {bookingSuccess.userPhone}</span>
                </div>

                <div className="receipt-divider-dashed" />

                <div className="receipt-total-row">
                  <span className="receipt-total-label">Total Payable</span>
                  <span className="receipt-total-val">₹{bookingSuccess.totalAmount}</span>
                </div>
              </div>

              <div className="success-actions-col">
                <a
                  href={`https://wa.me/917972430951?text=${encodeURIComponent(
                    `🎮 *TS Gaming Cafe — Booking Slip*\n👤 Gamer: ${bookingSuccess.userName}\n🕹️ Setup: ${bookingSuccess.setupName}\n📅 Date: ${bookingSuccess.date}\n⏰ Time: ${bookingSuccess.startTime} - ${bookingSuccess.endTime}\n💰 Total: ₹${bookingSuccess.totalAmount}\n📍 Waluj, Sambhajinagar`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp-slip"
                >
                  <MessageSquare size={15} /> WhatsApp Confirmation
                </a>

                {paymentChoice === 'upi' && (
                  <button
                    type="button"
                    className="btn-whatsapp-slip"
                    style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
                    onClick={() => setShowUpiModal(true)}
                  >
                    <QrCode size={15} /> Show UPI QR Code
                  </button>
                )}

                <button
                  type="button"
                  className="btn-book-another"
                  onClick={() => {
                    setBookingSuccess(null);
                    setCurrentStep(1);
                    setSelectedSlot(null);
                  }}
                >
                  Book Another Slot
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════
                  STEP 1: CHOOSE SETUP (Compact Mobile Cards)
                 ═══════════════════════════════════════════════════════ */}
              {currentStep === 1 && (
                <div className="step-container">
                  <h2 className="step-heading">Choose Setup</h2>
                  <p className="step-subtitle">Select station to continue.</p>

                  <div className="console-options-list">
                    {availableStations.map(station => {
                      const isSelected = selectedStationType === station.type;
                      return (
                        <div
                          key={station.id}
                          className={`console-card-option ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectStation(station.type)}
                        >
                          <div className="console-card-icon">
                            {station.type === 'PC' ? (
                              <Monitor size={18} />
                            ) : (
                              <Gamepad2 size={18} />
                            )}
                          </div>
                          <div className="console-card-info">
                            <h3 className="console-card-title">{station.name}</h3>
                            <p className="console-card-sub">{station.sub}</p>
                          </div>
                          <div className="console-card-price">
                            <span className="card-price-rate">₹{station.rate}</span>
                            <span className="card-price-unit">/h</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  STEP 2: DATE & TIME (Compact Selector)
                 ═══════════════════════════════════════════════════════ */}
              {currentStep === 2 && (
                <div className="step-container">
                  <h2 className="step-heading">Date & Time</h2>
                  <p className="step-subtitle">Tap an available slot to continue.</p>

                  {/* Date Selector */}
                  <div className="section-mini-label">Date</div>
                  <div className="date-scroll-strip">
                    {nextDays.map(d => {
                      const isSel = selectedDate === d.dateStr;
                      return (
                        <button
                          key={d.dateStr}
                          type="button"
                          className={`date-pill-btn ${isSel ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedDate(d.dateStr);
                            setSelectedSlot(null);
                          }}
                        >
                          <span className="date-pill-day">{d.dayName}</span>
                          <span className="date-pill-num">{d.dayNum}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Duration Stepper */}
                  <div className="duration-row">
                    <span className="section-mini-label" style={{ margin: 0 }}>
                      Duration
                    </span>
                    <div className="duration-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        disabled={durationHrs <= 1}
                        onClick={() => updateDuration(-1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="stepper-value">{durationHrs}h</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        disabled={durationHrs >= 6}
                        onClick={() => updateDuration(1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Available Time Slots Grid */}
                  <div className="section-mini-label">Available Slots</div>
                  <div className="time-slots-grid">
                    {TIME_SLOTS.map(slot => {
                      const isBooked = isSlotBooked(slot);
                      const isPast = isSlotPast(slot.start);
                      const isDisabled = isBooked || isPast;
                      const isSelected = selectedSlot?.id === slot.id;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isDisabled}
                          className={`time-slot-btn ${
                            isSelected ? 'selected' : ''
                          } ${isDisabled ? 'booked' : ''}`}
                          onClick={() => handleSelectSlot(slot)}
                          title={
                            isPast
                              ? 'Time passed'
                              : isBooked
                              ? 'Booked'
                              : 'Available'
                          }
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  STEP 3: CUSTOMER INFORMATION
                 ═══════════════════════════════════════════════════════ */}
              {currentStep === 3 && (
                <div className="step-container">
                  <h2 className="step-heading">Your Details</h2>
                  <p className="step-subtitle">
                    Enter details for booking confirmation slip.
                  </p>

                  <div className="customer-fields-card">
                    {/* Full Name */}
                    <div className="field-group">
                      <label className="field-label">
                        <User size={13} /> Full Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div className="field-input-box">
                        <input
                          type="text"
                          className="customer-text-input"
                          placeholder="e.g. Rahul Sharma"
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Mobile Number */}
                    <div className="field-group">
                      <label className="field-label">
                        <Phone size={13} /> Mobile Number (10 digits) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div className="field-input-box">
                        <span className="input-prefix-flag">🇮🇳 +91</span>
                        <input
                          type="tel"
                          maxLength={10}
                          className="customer-text-input with-prefix"
                          placeholder="9876543210"
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    </div>

                    {/* WhatsApp Toggle */}
                    <div
                      className="whatsapp-optin-row"
                      onClick={() => setWhatsappReceipt(!whatsappReceipt)}
                    >
                      <input
                        type="checkbox"
                        checked={whatsappReceipt}
                        onChange={() => {}}
                        style={{ width: 15, height: 15, accentColor: '#25d366' }}
                      />
                      <span className="whatsapp-optin-text">
                        📱 Send booking receipt on WhatsApp
                      </span>
                    </div>

                    {!user && (
                      <div style={{ textAlign: 'center', marginTop: 4 }}>
                        <button
                          type="button"
                          className="minimal-ghost-link"
                          style={{ color: '#a855f7', fontSize: '0.78rem' }}
                          onClick={() => setShowAuthModal(true)}
                        >
                          Already have an account? Sign In
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  STEP 4: CHECKOUT & REVIEW
                 ═══════════════════════════════════════════════════════ */}
              {currentStep === 4 && (
                <div className="step-container">
                  <div className="checkout-hero-icon">
                    <CheckCircle2 size={30} />
                  </div>
                  <h2 className="step-heading" style={{ textAlign: 'center' }}>
                    Review Booking
                  </h2>
                  <p className="step-subtitle" style={{ textAlign: 'center', marginBottom: 14 }}>
                    Confirm your details to lock this session.
                  </p>

                  {/* Receipt Ticket */}
                  <div className="receipt-card">
                    <h3 className="receipt-header-title">{currentStation.name}</h3>

                    <div className="receipt-item-row">
                      <span className="receipt-item-label">
                        <Calendar size={13} /> Date
                      </span>
                      <span className="receipt-item-val">{getSelectedDateDisplay()}</span>
                    </div>

                    <div className="receipt-item-row">
                      <span className="receipt-item-label">
                        <Clock size={13} /> Time Slot
                      </span>
                      <span className="receipt-item-val">
                        {selectedSlot?.label || '10:00 AM'} ({durationHrs}h)
                      </span>
                    </div>

                    <div className="receipt-item-row">
                      <span className="receipt-item-label">
                        <User size={13} /> Gamer
                      </span>
                      <span className="receipt-item-val">
                        {customerName} (+91 {cleanPhone})
                      </span>
                    </div>

                    <div className="receipt-divider-dashed" />

                    <div className="receipt-item-row">
                      <span className="receipt-item-label">Subtotal</span>
                      <span className="receipt-item-val">₹{subtotal}</span>
                    </div>

                    <div className="receipt-item-row">
                      <span className="receipt-item-label">Fee</span>
                      <span className="receipt-item-val" style={{ color: '#00ff66' }}>
                        ₹0 (FREE)
                      </span>
                    </div>

                    <div className="receipt-total-row" style={{ marginTop: 8 }}>
                      <span className="receipt-total-label">Total Amount</span>
                      <span className="receipt-total-val">₹{totalAmount}</span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="checkout-payment-box">
                    <div
                      className={`checkout-pay-option ${paymentChoice === 'counter' ? 'active' : ''}`}
                      onClick={() => setPaymentChoice('counter')}
                    >
                      <span style={{ fontSize: '1.1rem' }}>💵</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.84rem' }}>Pay at Counter</div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Cash or UPI on arrival</div>
                      </div>
                    </div>

                    <div
                      className={`checkout-pay-option ${paymentChoice === 'upi' ? 'active' : ''}`}
                      onClick={() => setPaymentChoice('upi')}
                    >
                      <span style={{ fontSize: '1.1rem' }}>📱</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.84rem' }}>Pay via UPI QR</div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Instant payment via GPay / PhonePe</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Sticky Bottom Action Button ── */}
        {!bookingSuccess && (
          <div className="booking-sticky-action-bar">
            {currentStep === 1 && (
              <button
                type="button"
                className="main-action-step-btn"
                disabled={!canProceedStep1}
                onClick={nextStep}
              >
                <span>Continue to Time</span>
                <ArrowRight size={15} />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                className="main-action-step-btn"
                disabled={!canProceedStep2}
                onClick={nextStep}
              >
                <span>{selectedSlot ? 'Continue to Details' : 'Select a Time Slot'}</span>
                {selectedSlot && <ArrowRight size={15} />}
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                className="main-action-step-btn"
                disabled={!canProceedStep3}
                onClick={nextStep}
              >
                <span>Review Booking</span>
                <ArrowRight size={15} />
              </button>
            )}

            {currentStep === 4 && (
              <button
                type="button"
                className="main-action-step-btn btn-pay-final"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
              >
                {isSubmitting ? (
                  <span>Processing Booking...</span>
                ) : (
                  <>
                    <span>Confirm Booking • ₹{totalAmount}</span>
                    <Check size={15} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── UPI QR Modal ── */}
      {showUpiModal && (
        <UpiQrModal
          amount={totalAmount}
          onClose={() => setShowUpiModal(false)}
          note={`TS Gaming - ${currentStation?.name || 'PlayStation'} (${customerName || 'Gamer'})`}
        />
      )}

      {/* ── Customer Auth Modal ── */}
      {showAuthModal && (
        <CustomerAuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
