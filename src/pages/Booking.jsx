import React, { useState, useEffect, useMemo } from 'react';
import {
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
  Share2,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  createBooking,
  subscribeToAllBookings,
  subscribeToSetups,
  subscribeToAllActiveSessions,
} from '../firebase/firestore';
import UpiQrModal from '../components/UpiQrModal';
import CustomerAuthModal from '../components/CustomerAuthModal';
import './Booking.css';

const DURATION_OPTIONS = [
  { id: '30m', label: '30 Minutes', durationMins: 30, durationHrs: 0.5, description: 'Quick warm-up' },
  { id: '1h', label: '1 Hour', durationMins: 60, durationHrs: 1, description: 'Most popular' },
  { id: '2h', label: '2 Hours', durationMins: 120, durationHrs: 2, description: 'Double the play time' },
  { id: 'group', label: 'Group', durationMins: 60, durationHrs: 1, description: 'Group rate per player' },
];

const TWO_HOUR_COMPLIMENTARY_ITEMS = [
  { name: 'Cold Drink', quantity: 1, price: 0 },
  { name: 'Chips', quantity: 1, price: 0 },
];

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeLabel = (time) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes || 0, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

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
  const [activeSessions, setActiveSessions] = useState([]);

  // ── Selections ──
  const [selectedStationType, setSelectedStationType] = useState('PS5');
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [durationOptionId, setDurationOptionId] = useState('1h');
  const [playerCount, setPlayerCount] = useState(2);
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

  const todayDateString = formatLocalDate(new Date());
  const maxBookingDate = new Date();
  maxBookingDate.setDate(maxBookingDate.getDate() + 30);
  const maxBookingDateString = formatLocalDate(maxBookingDate);

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const dateString = formatLocalDate(date);
      const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
      return {
        date,
        dateString,
        isCurrentMonth,
        isDisabled:
          !isCurrentMonth || dateString < todayDateString || dateString > maxBookingDateString,
      };
    });
  }, [calendarMonth, todayDateString, maxBookingDateString]);

  const monthLabel = calendarMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const maxMonthStart = new Date(maxBookingDate.getFullYear(), maxBookingDate.getMonth(), 1);
  const canGoToPreviousMonth =
    calendarMonth.getFullYear() > currentMonthStart.getFullYear() ||
    (calendarMonth.getFullYear() === currentMonthStart.getFullYear() &&
      calendarMonth.getMonth() > currentMonthStart.getMonth());
  const canGoToNextMonth =
    calendarMonth.getFullYear() < maxMonthStart.getFullYear() ||
    (calendarMonth.getFullYear() === maxMonthStart.getFullYear() &&
      calendarMonth.getMonth() < maxMonthStart.getMonth());

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
    const unsubSessions = subscribeToAllActiveSessions(s => {
      if (Array.isArray(s)) setActiveSessions(s);
    });
    return () => {
      if (typeof unsubBookings === 'function') unsubBookings();
      if (typeof unsubSetups === 'function') unsubSetups();
      if (typeof unsubSessions === 'function') unsubSessions();
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
          image: '/images/ps5.jpg',
          rate: 100,
          rate30: 60,
          count: 2,
        },
        {
          id: 'ps4',
          type: 'PS4',
          name: 'PS4 Pro',
          sub: 'Standard Controllers',
          image: '/images/ps4.jpg',
          rate: 80,
          rate30: 48,
          count: 2,
        },
        {
          id: 'pc',
          type: 'PC',
          name: 'Gaming PC',
          sub: 'RTX 4060, 144Hz',
          image: '/images/gallery/gaming-pc.jpg',
          rate: 120,
          rate30: 72,
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
          : type === 'PS2' ? '6-Player Co-op, Retro Classic'
          : (Array.isArray(s.specs) ? s.specs[0] : s.specs) || 'High Performance';

        map.set(type, {
          id: type.toLowerCase(),
          type: type,
          name: title,
          sub: sub,
          image:
            s.image ||
            (type === 'PC'
              ? '/images/gallery/gaming-pc.jpg'
              : type === 'RACING'
              ? '/images/sim-racing.jpg'
              : type === 'PS5'
              ? '/images/ps5.jpg'
              : type === 'PS4'
              ? '/images/ps4.jpg'
              : type === 'PS3'
              ? '/images/ps3.jpg'
              : '/images/ps2.jpg'),
          rate: Number(s.pricePerHour) || 100,
          rate30: Number(s.pricePer30Min) || Math.round((Number(s.pricePerHour) || 100) * 0.6),
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

  const selectedDuration =
    DURATION_OPTIONS.find((option) => option.id === durationOptionId) || DURATION_OPTIONS[1];

  function timeToMins(t) {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  // Check if slot has passed for today (15-min grace period)
  const isSlotPast = (slotStart) => {
    if (selectedDate !== todayDateString) return false;
    const now = new Date();
    const [h, m] = slotStart.split(':').map(Number);
    const slotDate = new Date();
    slotDate.setHours(h, m, 0, 0);
    return now.getTime() > (slotDate.getTime() + 15 * 60 * 1000);
  };

  // Get available seats for this slot (considering PS2 multi-seat capacity = 6)
  const getSlotAvailableSeats = (slot) => {
    if (!currentStation) return 1;
    const isPS2 = selectedStationType === 'PS2';
    const totalCapacity = isPS2 ? ((currentStation.count || 1) * 6) : (currentStation.count || 1);
    const reqStart = timeToMins(slot.start);
    const reqEnd = reqStart + selectedDuration.durationMins;

    // 1. Overlapping bookings for this date
    let occupied = 0;
    allBookings.forEach(b => {
      if (b.status === 'cancelled') return;
      if (b.date !== selectedDate) return;
      const bSetup = (b.setupName || '').toUpperCase();
      const sType = selectedStationType.toUpperCase();
      if (!bSetup.includes(sType)) return;

      const bStart = timeToMins(b.startTime);
      const bDuration = Number(b.duration) || (Number(b.durationMins) / 60) || 1;
      const bEnd = b.endTime ? timeToMins(b.endTime) : (bStart + bDuration * 60);

      if (reqStart < bEnd && reqEnd > bStart) {
        occupied += isPS2 ? (Number(b.players || b.playerCount) || 1) : 1;
      }
    });

    // 2. Overlapping active live sessions if today
    if (selectedDate === todayDateString) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      activeSessions.forEach(ses => {
        if (ses.status === 'completed') return;
        const sesSetup = (ses.setupName || '').toUpperCase();
        const sType = selectedStationType.toUpperCase();
        if (!sesSetup.includes(sType)) return;

        const sesEnd = ses.sessionEndTime?.toDate ? ses.sessionEndTime.toDate() : new Date(ses.sessionEndTime);
        const sesEndMins = sesEnd.getHours() * 60 + sesEnd.getMinutes();
        if (sesEndMins > reqStart && nowMins < reqEnd) {
          occupied += isPS2 ? (Number(ses.players || ses.playerCount) || 1) : 1;
        }
      });
    }

    return Math.max(0, totalCapacity - occupied);
  };

  // Check if slot has enough seats for the requested player count
  const isSlotBooked = (slot) => {
    const seatsFree = getSlotAvailableSeats(slot);
    return seatsFree < playerCount;
  };

  // Pricing calculations
  const pricePerPlayer =
    durationOptionId === '30m'
      ? currentStation?.rate30 || Math.round((currentStation?.rate || 100) * 0.6)
      : durationOptionId === '2h'
      ? (currentStation?.rate || 100) * 2
      : durationOptionId === 'group'
      ? Math.round((currentStation?.rate || 100) * 0.8)
      : currentStation?.rate || 100;
  const subtotal = pricePerPlayer * playerCount;
  const convenienceFee = 0; // FREE
  const totalAmount = subtotal + convenienceFee;
  const complimentaryItems =
    durationOptionId === '2h' ? TWO_HOUR_COMPLIMENTARY_ITEMS : [];
  const hasTwoHourOffer = complimentaryItems.length > 0;
  const complimentaryOfferLabel = '1 Cold Drink + 1 Chips FREE';

  // Step Meta
  const stepTitles = [
    { step: 1, title: 'Select Station', progress: '20%' },
    { step: 2, title: 'Select Duration', progress: '40%' },
    { step: 3, title: 'Number of Players', progress: '60%' },
    { step: 4, title: 'Date & Time', progress: '80%' },
    { step: 5, title: 'Booking Summary', progress: '100%' },
  ];

  const currentStepMeta = stepTitles[currentStep - 1] || stepTitles[0];

  // ── AUTO ADVANCE ON SELECTION (User Request: "select keli ki next time auto madhe aali pahije") ──
  const handleSelectStation = (stationType) => {
    setSelectedStationType(stationType);
    setSelectedSlot(null);
    // Smooth auto-advance to Step 2
    setTimeout(() => {
      setCurrentStep(2);
    }, 220);
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    // Smooth auto-advance to booking summary
    setTimeout(() => {
      setCurrentStep(5);
    }, 220);
  };

  // Step Validation & Navigation
  const canProceedStep1 = !!selectedStationType;
  const canProceedStep4 = !!selectedSlot;
  const cleanPhone = customerPhone.replace(/\D/g, '');
  const canProceedStep5 = customerName.trim().length >= 2 && cleanPhone.length === 10;

  const nextStep = () => {
    if (currentStep === 1 && canProceedStep1) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(3);
    else if (currentStep === 3) setCurrentStep(4);
    else if (currentStep === 4 && canProceedStep4) setCurrentStep(5);
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Final Booking Submit
  const handleFinalSubmit = async () => {
    if (!canProceedStep5) {
      toast.show('Please complete your name and 10-digit mobile number.', 'error');
      setCurrentStep(5);
      return;
    }
    if (!selectedSlot || isSlotPast(selectedSlot.start) || isSlotBooked(selectedSlot)) {
      toast.show('That time slot is no longer available. Please choose another one.', 'error');
      setSelectedSlot(null);
      setCurrentStep(4);
      return;
    }

    setIsSubmitting(true);
    try {
      const [startH, startM] = (selectedSlot?.start || '10:00').split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(startH, startM + selectedDuration.durationMins, 0, 0);
      const computedEndTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

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
        duration: selectedDuration.durationHrs,
        durationMins: selectedDuration.durationMins,
        durationLabel: selectedDuration.label,
        playerCount,
        pricePerPlayer,
        gamingAmount: totalAmount,
        complimentaryItems,
        offerCode: hasTwoHourOffer ? '2H_FREE_DRINK_CHIPS' : null,
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
    if (!selectedDate) return 'Select a date';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSelectedEndTimeDisplay = () => {
    if (!selectedSlot) return '';
    const [startHour, startMinute] = selectedSlot.start.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(startHour, startMinute + selectedDuration.durationMins, 0, 0);
    return formatTimeLabel(
      `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
    );
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
                  <span className="receipt-item-val">{getSelectedDateDisplay()}</span>
                </div>

                <div className="receipt-item-row">
                  <span className="receipt-item-label">
                    <Clock size={13} /> Time Slot
                  </span>
                  <span className="receipt-item-val">
                    {selectedSlot?.label} – {formatTimeLabel(bookingSuccess.endTime)}
                  </span>
                </div>

                <div className="receipt-item-row">
                  <span className="receipt-item-label">
                    <Users size={13} /> Players · {bookingSuccess.durationLabel}
                  </span>
                  <span className="receipt-item-val">
                    {bookingSuccess.playerCount === 5 ? '5+' : bookingSuccess.playerCount}
                  </span>
                </div>

                {bookingSuccess.complimentaryItems?.length > 0 && (
                  <div className="booking-offer-summary">
                    🎁 Free with your 2-hour booking: 1 Cold Drink + 1 Chips
                  </div>
                )}

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
                    `🎮 *TS Gaming Cafe — Booking Slip*\n👤 Gamer: ${bookingSuccess.userName}\n🕹️ Setup: ${bookingSuccess.setupName}\n👥 Players: ${bookingSuccess.playerCount === 5 ? '5+' : bookingSuccess.playerCount}\n⏱️ Duration: ${bookingSuccess.durationLabel}${bookingSuccess.complimentaryItems?.length ? '\n🎁 Free: 1 Cold Drink + 1 Chips' : ''}\n📅 Date: ${getSelectedDateDisplay()}\n⏰ Time: ${selectedSlot?.label} - ${formatTimeLabel(bookingSuccess.endTime)}\n💰 Total: ₹${bookingSuccess.totalAmount}\n📍 Waluj, Sambhajinagar`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp-slip"
                >
                  <MessageSquare size={15} /> WhatsApp Confirmation
                </a>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🎮 Hey squad, I booked a slot at *TS Gaming Cafe*!\n🕹️ Station: ${bookingSuccess.setupName}\n👥 Players: ${bookingSuccess.playerCount === 5 ? '5+' : bookingSuccess.playerCount}\n📅 Date: ${getSelectedDateDisplay()} (${selectedSlot?.label} - ${formatTimeLabel(bookingSuccess.endTime)})\nJoin me for some games! 🔥`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp-slip"
                  style={{
                    background: 'rgba(37, 211, 102, 0.12)',
                    color: '#25d366',
                    border: '1px solid rgba(37, 211, 102, 0.35)',
                  }}
                >
                  <Share2 size={14} /> Invite Squad on WhatsApp
                </a>

                {paymentChoice === 'upi' && (
                  <button
                    type="button"
                    className="btn-whatsapp-slip"
                    style={{ background: 'linear-gradient(135deg, #ff5500, #ff8800)' }}
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
                        <button
                          type="button"
                          key={station.id}
                          className={`console-card-option ${isSelected ? 'selected' : ''}`}
                          aria-pressed={isSelected}
                          onClick={() => handleSelectStation(station.type)}
                        >
                          <img className="console-card-image" src={station.image} alt="" />
                          <div className="console-card-info">
                            <span className="console-card-title">{station.name}</span>
                            <span className="console-card-sub">{station.sub}</span>
                          </div>
                          <div className="console-card-price">
                            <span className="card-price-rate">₹{station.rate}</span>
                            <span className="card-price-unit">/h</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  STEP 2: SESSION DURATION
                 ═══════════════════════════════════════════════════════ */}
              {currentStep === 2 && (
                <div className="step-container">
                  <h2 className="step-heading">Select Duration</h2>
                  <p className="step-subtitle">Choose how long your gaming session should be.</p>

                  <div className="duration-options-grid">
                    {DURATION_OPTIONS.map((option) => {
                      const isSelected = durationOptionId === option.id;
                      const rate =
                        option.id === '30m'
                          ? currentStation?.rate30 || Math.round((currentStation?.rate || 100) * 0.6)
                          : option.id === '2h'
                          ? (currentStation?.rate || 100) * 2
                          : option.id === 'group'
                          ? Math.round((currentStation?.rate || 100) * 0.8)
                          : currentStation?.rate || 100;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`duration-option-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setDurationOptionId(option.id);
                            setSelectedSlot(null);
                          }}
                        >
                          <span className="duration-option-title">{option.label}</span>
                          <span className="duration-option-description">{option.description}</span>
                          {option.id === '2h' && (
                            <span className="duration-offer-badge">
                              🎁 1 Cold Drink + 1 Chips FREE
                            </span>
                          )}
                          <span className="duration-option-price">
                            ₹{rate}<small> / player</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  STEP 3: PLAYER COUNT
                 ═══════════════════════════════════════════════════════ */}
              {currentStep === 3 && (
                <div className="step-container">
                  <h2 className="step-heading">Number of Players</h2>
                  <p className="step-subtitle">How many gamers are joining your session?</p>

                  <div className="player-count-card">
                    <div className="player-count-copy">
                      <Users size={20} />
                      <div>
                        <strong>Your squad</strong>
                        <span>₹{pricePerPlayer} per player · {selectedDuration.label}</span>
                      </div>
                    </div>
                    <div className="player-count-control" aria-label="Player count">
                      <button
                        type="button"
                        className="player-count-button"
                        aria-label="Remove one player"
                        disabled={playerCount <= 1}
                        onClick={() => setPlayerCount((count) => Math.max(1, count - 1))}
                      >
                        <Minus size={18} />
                      </button>
                      <strong>{selectedStationType === 'PS2' ? `${playerCount} Players` : playerCount === 5 ? '5+' : playerCount}</strong>
                      <button
                        type="button"
                        className="player-count-button"
                        aria-label="Add one player"
                        disabled={playerCount >= (selectedStationType === 'PS2' ? 6 : 5)}
                        onClick={() => setPlayerCount((count) => Math.min(selectedStationType === 'PS2' ? 6 : 5, count + 1))}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="player-total-preview">
                    <span>Session total</span>
                    <strong>₹{totalAmount}</strong>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  STEP 4: CALENDAR & TIME
                 ═══════════════════════════════════════════════════════ */}
              {currentStep === 4 && (
                <div className="step-container">
                  <h2 className="step-heading">Select Date & Time</h2>
                  <p className="step-subtitle">Pick a date, then choose an available time slot.</p>

                  <div className="calendar-picker">
                    <div className="calendar-picker-header">
                      <strong>{monthLabel}</strong>
                      <div>
                        <button
                          type="button"
                          aria-label="Previous month"
                          disabled={!canGoToPreviousMonth}
                          onClick={() =>
                            setCalendarMonth(
                              (month) => new Date(month.getFullYear(), month.getMonth() - 1, 1)
                            )
                          }
                        >
                          <ChevronLeft size={17} />
                        </button>
                        <button
                          type="button"
                          aria-label="Next month"
                          disabled={!canGoToNextMonth}
                          onClick={() =>
                            setCalendarMonth(
                              (month) => new Date(month.getFullYear(), month.getMonth() + 1, 1)
                            )
                          }
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                    </div>
                    <div className="calendar-weekdays" aria-hidden="true">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    <div className="calendar-days-grid">
                      {calendarCells.map(({ date, dateString, isCurrentMonth, isDisabled }) => (
                        <button
                          key={dateString}
                          type="button"
                          disabled={isDisabled}
                          aria-pressed={selectedDate === dateString}
                          className={[
                            'calendar-day-button',
                            !isCurrentMonth ? 'outside-month' : '',
                            selectedDate === dateString ? 'selected' : '',
                            dateString === todayDateString ? 'today' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => {
                            setSelectedDate(dateString);
                            setSelectedSlot(null);
                          }}
                        >
                          {date.getDate()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="section-mini-label time-slot-heading">
                    Available Time Slots · {getSelectedDateDisplay()}
                  </div>
                  <div className="time-slots-grid">
                    {TIME_SLOTS.map((slot) => {
                      const availSeats = getSlotAvailableSeats(slot);
                      const isBooked = isSlotBooked(slot);
                      const isPast = isSlotPast(slot.start);
                      const isDisabled = isBooked || isPast;
                      const isSelected = selectedSlot?.id === slot.id;
                      const isPS2 = selectedStationType === 'PS2';

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isDisabled}
                          className={`time-slot-btn ${isSelected ? 'selected' : ''} ${isDisabled ? 'booked' : ''}`}
                          onClick={() => handleSelectSlot(slot)}
                          title={isPast ? 'Time passed' : isBooked ? 'Not enough seats' : isPS2 ? `${availSeats} of 6 seats free` : 'Available'}
                        >
                          <span>{slot.label}</span>
                          {isPS2 && !isPast && (
                            <span className="slot-seats-badge">
                              {isBooked ? 'Full' : `${availSeats}/6 Free`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  STEP 5: DETAILS, SUMMARY & PAYMENT
                 ═══════════════════════════════════════════════════════ */}
              {currentStep === 5 && (
                <div className="step-container">
                  <div className="checkout-hero-icon">
                    <CheckCircle2 size={30} />
                  </div>
                  <h2 className="step-heading" style={{ textAlign: 'center' }}>
                    Booking Summary
                  </h2>
                  <p className="step-subtitle" style={{ textAlign: 'center', marginBottom: 14 }}>
                    Check your session details and add your contact information.
                  </p>

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
                        {selectedSlot?.label || '10:00 AM'} – {getSelectedEndTimeDisplay()}
                      </span>
                    </div>

                    <div className="receipt-item-row">
                      <span className="receipt-item-label">Duration</span>
                      <span className="receipt-item-val">{selectedDuration.label}</span>
                    </div>

                    <div className="receipt-item-row">
                      <span className="receipt-item-label">
                        <Users size={13} /> Players
                      </span>
                      <span className="receipt-item-val">{playerCount === 5 ? '5+' : playerCount}</span>
                    </div>

                    <div className="receipt-item-row">
                      <span className="receipt-item-label">Price per player</span>
                      <span className="receipt-item-val">₹{pricePerPlayer}</span>
                    </div>

                    <div className="receipt-item-row">
                      <span className="receipt-item-label">
                        <User size={13} /> Gamer
                      </span>
                      <span className="receipt-item-val">
                        {customerName || 'Your name'} {cleanPhone ? `(+91 ${cleanPhone})` : ''}
                      </span>
                    </div>

                    <div className="receipt-divider-dashed" />

                    <div className="receipt-item-row">
                      <span className="receipt-item-label">₹{pricePerPlayer} × {playerCount === 5 ? '5+' : playerCount} players</span>
                      <span className="receipt-item-val">₹{subtotal}</span>
                    </div>

                    <div className="receipt-total-row" style={{ marginTop: 8 }}>
                      <span className="receipt-total-label">Total Amount</span>
                      <span className="receipt-total-val">₹{totalAmount}</span>
                    </div>
                    {hasTwoHourOffer && (
                      <div className="booking-offer-summary">
                        🎁 {complimentaryOfferLabel} with this 2-hour booking
                      </div>
                    )}
                  </div>

                  <div className="customer-fields-card">
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
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="field-group">
                      <label className="field-label">
                        <Phone size={13} /> Mobile Number (10 digits) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div className="field-input-box">
                        <span className="input-prefix-flag">🇮🇳 +91</span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          className="customer-text-input with-prefix"
                          placeholder="9876543210"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    </div>

                    <label className="whatsapp-optin-row">
                      <input
                        type="checkbox"
                        checked={whatsappReceipt}
                        onChange={() => setWhatsappReceipt((enabled) => !enabled)}
                        style={{ width: 15, height: 15, accentColor: '#25d366' }}
                      />
                      <span className="whatsapp-optin-text">📱 Send booking receipt on WhatsApp</span>
                    </label>

                    {!user && (
                      <div style={{ textAlign: 'center', marginTop: 4 }}>
                        <button
                          type="button"
                          className="minimal-ghost-link"
                          style={{ color: '#ff8855', fontSize: '0.78rem' }}
                          onClick={() => setShowAuthModal(true)}
                        >
                          Already have an account? Sign In
                        </button>
                      </div>
                    )}
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
                <span>Continue to Duration</span>
                <ArrowRight size={15} />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                className="main-action-step-btn"
                onClick={nextStep}
              >
                <span>Continue to Players</span>
                <ArrowRight size={15} />
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                className="main-action-step-btn"
                onClick={nextStep}
              >
                <span>Choose Date & Time</span>
                <ArrowRight size={15} />
              </button>
            )}

            {currentStep === 4 && (
              <button
                type="button"
                className="main-action-step-btn"
                disabled={!canProceedStep4}
                onClick={nextStep}
              >
                <span>{selectedSlot ? 'Continue to Summary' : 'Select a Time Slot'}</span>
                {selectedSlot && <ArrowRight size={15} />}
              </button>
            )}

            {currentStep === 5 && (
              <button
                type="button"
                className="main-action-step-btn btn-pay-final"
                disabled={isSubmitting || !canProceedStep5}
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
