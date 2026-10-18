import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  subscribeToAllBookings,
  subscribeToSetups,
  subscribeToAllActiveSessions,
  subscribeToStaff,
  createBooking,
  updateBooking,
  deleteBooking,
  createSession,
  updateSession,
  updateSetup,
  toFirestoreTimestamp,
} from '../../firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { getStaffUser, isAdminLoggedIn, isStaffLoggedIn } from '../../utils/adminAuth';
import {
  calculateStaffStats,
  isBookingHandledByStaff,
  formatPhoneNumber,
  getClean10Phone,
} from '../../utils/staffStats';
import {
  Search,
  Plus,
  Calendar,
  Clock,
  DollarSign,
  Phone,
  CheckCircle,
  XCircle,
  Play,
  X,
  Edit2,
  Trash2,
  Gamepad2,
  Zap,
  MessageSquare,
  Check,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Receipt,
  Sparkles,
  Target,
} from 'lucide-react';
import ClockTimePicker from '../../components/ClockTimePicker';
import './AdminBookings.css';

// ── Fixed 1-Hour Slots from Opening (5:00 AM) to Closing Time (10:00 PM) ──
export const ONE_HOUR_SLOTS = [
  { id: '05:00', start: '05:00', end: '06:00', label: '05:00 AM - 06:00 AM', short: '5 - 6 AM', time12: '5:00 AM' },
  { id: '06:00', start: '06:00', end: '07:00', label: '06:00 AM - 07:00 AM', short: '6 - 7 AM', time12: '6:00 AM' },
  { id: '07:00', start: '07:00', end: '08:00', label: '07:00 AM - 08:00 AM', short: '7 - 8 AM', time12: '7:00 AM' },
  { id: '08:00', start: '08:00', end: '09:00', label: '08:00 AM - 09:00 AM', short: '8 - 9 AM', time12: '8:00 AM' },
  { id: '09:00', start: '09:00', end: '10:00', label: '09:00 AM - 10:00 AM', short: '9 - 10 AM', time12: '9:00 AM' },
  { id: '10:00', start: '10:00', end: '11:00', label: '10:00 AM - 11:00 AM', short: '10 - 11 AM', time12: '10:00 AM' },
  { id: '11:00', start: '11:00', end: '12:00', label: '11:00 AM - 12:00 PM', short: '11 - 12 PM', time12: '11:00 AM' },
  { id: '12:00', start: '12:00', end: '13:00', label: '12:00 PM - 01:00 PM', short: '12 - 1 PM', time12: '12:00 PM' },
  { id: '13:00', start: '13:00', end: '14:00', label: '01:00 PM - 02:00 PM', short: '1 - 2 PM', time12: '1:00 PM' },
  { id: '14:00', start: '14:00', end: '15:00', label: '02:00 PM - 03:00 PM', short: '2 - 3 PM', time12: '2:00 PM' },
  { id: '15:00', start: '15:00', end: '16:00', label: '03:00 PM - 04:00 PM', short: '3 - 4 PM', time12: '3:00 PM' },
  { id: '16:00', start: '16:00', end: '17:00', label: '04:00 PM - 05:00 PM', short: '4 - 5 PM', time12: '4:00 PM' },
  { id: '17:00', start: '17:00', end: '18:00', label: '05:00 PM - 06:00 PM', short: '5 - 6 PM', time12: '5:00 PM' },
  { id: '18:00', start: '18:00', end: '19:00', label: '06:00 PM - 07:00 PM', short: '6 - 7 PM', time12: '6:00 PM' },
  { id: '19:00', start: '19:00', end: '20:00', label: '07:00 PM - 08:00 PM', short: '7 - 8 PM', time12: '7:00 PM' },
  { id: '20:00', start: '20:00', end: '21:00', label: '08:00 PM - 09:00 PM', short: '8 - 9 PM', time12: '8:00 PM' },
  { id: '21:00', start: '21:00', end: '22:00', label: '09:00 PM - 10:00 PM', short: '9 - 10 PM (Closing)', time12: '9:00 PM' },
];

const STATUS_TABS = [
  { id: 'All', label: 'All Bookings' },
  { id: 'active', label: '🟢 Live Playing' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_OPTIONS = [
  { value: 'paid_cash', label: '💵 Paid (Cash)' },
  { value: 'paid_upi', label: '📱 Paid (UPI / GPay / PhonePe)' },
  { value: 'paid_card', label: '💳 Paid (Card)' },
  { value: 'pending', label: '⏳ Unpaid / Pending' },
];

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeToMins(t) {
  if (!t) return 0;
  let [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Calculate price supporting separate 30-min price and hourly rates
function getDurationPrice(hours, hourlyRate, pricePer30Min) {
  const h = Number(hours) || 1;
  const hr = Number(hourlyRate) || 100;
  const p30 = Number(pricePer30Min) > 0 ? Number(pricePer30Min) : Math.round(hr * 0.6);

  if (h === 0.5) return p30;
  if (h === 1) return hr;
  if (h === 1.5) return hr + p30;
  if (h === 2) return hr * 2;
  const fullHours = Math.floor(h);
  const remainderHalf = (h - fullHours) >= 0.5 ? 1 : 0;
  return (fullHours * hr) + (remainderHalf * p30);
}

// Helper to add arbitrary minutes to a 24h time string ("HH:mm" + mins -> "HH:mm")
function addMinutesToTime(timeStr, mins) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const total = ((h || 0) * 60 + (m || 0) + (Number(mins) || 0)) % 1440;
  const endH = Math.floor(total / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

// Helper to get current local time formatted as "HH:mm"
function getCurrentTime24() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Convert 24h string ("16:30") to 12h watch object { hour: 4, minute: "30", period: "PM" }
function parse24to12(time24) {
  if (!time24) {
    const now = new Date();
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    return {
      hour: h % 12 || 12,
      minute: m,
      period: h >= 12 ? 'PM' : 'AM',
    };
  }
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr) || 0;
  const m = String(mStr !== undefined ? mStr : '00').padStart(2, '0');
  return {
    hour: h % 12 || 12,
    minute: m,
    period: h >= 12 ? 'PM' : 'AM',
  };
}

// Convert 12h watch components (hour: 4, minute: "30", period: "PM") to 24h string ("16:30")
function format12to24(hour12, minute, period) {
  let h = Number(hour12) || 12;
  const p = (period || 'PM').toUpperCase();
  if (p === 'PM' && h < 12) h += 12;
  if (p === 'AM' && h === 12) h = 0;
  const m = String(minute !== undefined ? minute : '00').padStart(2, '0');
  return `${String(h).padStart(2, '0')}:${m}`;
}

// Friendly Marathi time label for watch display
function getFriendlyTimeMarathi(time24) {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  const minText = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;

  let partOfDay = 'सकाळी';
  if (h >= 12 && h < 16) partOfDay = 'दुपारी';
  else if (h >= 16 && h < 20) partOfDay = 'संध्याकाळी';
  else if (h >= 20 || h < 4) partOfDay = 'रात्री';

  return `${hour12}${minText} ${period} (${partOfDay} ${hour12}${minText} वाजता)`;
}

// Calculate custom booking price for arbitrary duration in minutes with separate 30m base
function calculateCustomPrice(mins, hourlyRate, pricePer30Min) {
  const m = Number(mins) || 60;
  const hr = Number(hourlyRate) || 100;
  const p30 = Number(pricePer30Min) > 0 ? Number(pricePer30Min) : Math.round(hr * 0.6);

  if (m === 15) return Math.max(10, Math.round(p30 * 0.6));
  if (m === 30) return p30;
  if (m === 45) return Math.round(p30 + (hr - p30) * 0.5);
  if (m === 60) return hr;
  if (m === 90) return hr + p30;
  if (m === 120) return hr * 2;
  if (m === 180) return hr * 3;

  const fullHours = Math.floor(m / 60);
  const rem = m % 60;
  let total = fullHours * hr;
  if (rem > 0) {
    if (rem <= 30) total += p30;
    else total += hr;
  }
  return Math.max(0, Math.round(total));
}

// Check if a slot is booked for a specific console and date
function getBookingForSlot(slot, setupId, date, bookings) {
  if (!setupId || !date) return null;
  const sStart = timeToMins(slot.start);
  const sEnd = timeToMins(slot.end);

  return bookings.find(b => {
    if (b.status === 'cancelled') return false;
    if (b.setupId !== setupId || b.date !== date) return false;
    const bStart = timeToMins(b.startTime);
    const bEnd = timeToMins(b.endTime);
    return sStart < bEnd && sEnd > bStart;
  }) || null;
}

// Check if a 1-hour slot has already passed for a specific date (with 15-minute grace period)
function isSlotTimePassed(slotStart, dateStr) {
  if (!dateStr || !slotStart) return false;
  const today = getTodayString();
  if (dateStr < today) return true; // Past dates are all passed
  if (dateStr > today) return false; // Future dates are never passed

  // If today: 15-minute grace period (e.g. 6:00 PM slot stays open until 6:15 PM, blocks at 6:15 PM)
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const slotMins = timeToMins(slotStart);
  return currentMins >= slotMins + 15;
}

function formatTime12h(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

export function formatHandledByName(name) {
  if (!name) return '';
  return name.replace(/\s*\(Staff\)/gi, '').trim();
}

function getFormattedDateTitle(dateStr) {
  if (!dateStr) return 'All Dates';
  const today = getTodayString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const d = new Date(dateStr + 'T00:00:00');
  const formatted = d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (dateStr === today) return `Today (${formatted})`;
  if (dateStr === tomorrowStr) return `Tomorrow (${formatted})`;
  if (dateStr === yesterdayStr) return `Yesterday (${formatted})`;
  return formatted;
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [setups, setSetups] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  // View Mode: 'board' (Slot Grid Timeline) or 'table' (List view)
  const [viewMode, setViewMode] = useState('board');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState(getTodayString());

  // Ref for horizontal matrix scrolling
  const matrixContainerRef = useRef(null);

  // Modals
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSlotDetailsModal, setShowSlotDetailsModal] = useState(false);
  const [selectedSlotBooking, setSelectedSlotBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffFilter, setStaffFilter] = useState('all'); // 'all' | 'my' | specific staffId

  // Compatibility aliases for any leftover references
  const showAddModal = false;
  const setShowAddModal = setShowBookingModal;
  const showOnTimeModal = false;
  const setShowOnTimeModal = setShowBookingModal;
  const showCustomModal = false;
  const setShowCustomModal = setShowBookingModal;

  // Unified Essential Booking Form State (Only what is necessary!)
  const [bookingForm, setBookingForm] = useState({
    userName: '',
    userPhone: '',
    setupId: '',
    setupName: '',
    date: getTodayString(),
    startTime: getCurrentTime24(),
    endTime: addMinutesToTime(getCurrentTime24(), 60),
    durationMins: 60,
    hourlyRate: 100,
    pricePer30Min: 60,
    totalAmount: 100,
    paymentStatus: 'paid_cash',
    startSessionNow: true,
  });

  const isStaff = isStaffLoggedIn();
  const isAdmin = isAdminLoggedIn();
  const currentStaffUser = getStaffUser();

  // Form State
  const initialForm = {
    userName: '',
    userPhone: '',
    userEmail: '',
    setupId: '',
    setupName: '',
    date: getTodayString(),
    selectedSlots: [ONE_HOUR_SLOTS[1].id], // default 10:00 AM
    startTime: ONE_HOUR_SLOTS[1].start,
    endTime: ONE_HOUR_SLOTS[1].end,
    duration: 1,
    hourlyRate: 100,
    totalAmount: 100,
    paymentStatus: 'paid_cash',
    status: 'confirmed',
    notes: '',
    staffId: currentStaffUser?.id || 'admin',
    staffName: currentStaffUser?.name || 'Super Admin',
  };
  const [formData, setFormData] = useState(initialForm);

  const toast = useToast();

  useEffect(() => {
    const unsubs = [
      subscribeToAllBookings(setBookings),
      subscribeToSetups(setSetups),
      subscribeToAllActiveSessions(setActiveSessions),
      subscribeToStaff(setStaffList),
    ];
    return () => unsubs.forEach(f => f && f());
  }, []);

  // Calculate personal duty stats for logged-in staff
  const myStaffStats = useMemo(() => {
    if (!currentStaffUser) return null;
    return calculateStaffStats(currentStaffUser.id, currentStaffUser.name, bookings);
  }, [currentStaffUser, bookings]);

  // When setups load, auto-select first available console
  useEffect(() => {
    if (setups.length > 0 && !formData.setupId) {
      const firstAvailable = setups.find(s => s.status === 'available') || setups[0];
      const rate = firstAvailable.pricePerHour || 100;
      setFormData(prev => ({
        ...prev,
        setupId: firstAvailable.id,
        setupName: firstAvailable.name,
        hourlyRate: rate,
        totalAmount: rate * prev.duration,
      }));
    }
  }, [setups]);

  // Active Time Section for Matrix Board
  const [activeTimeRange, setActiveTimeRange] = useState('all');

  // Live timer tick to re-evaluate slots as time progresses (e.g. at :15 mins past the hour)
  const [, setLiveTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setLiveTimeTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Date Navigation handlers
  const handlePrevDay = () => {
    const current = dateFilter ? new Date(dateFilter + 'T00:00:00') : new Date();
    current.setDate(current.getDate() - 1);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setDateFilter(`${y}-${m}-${d}`);
  };

  const handleNextDay = () => {
    const current = dateFilter ? new Date(dateFilter + 'T00:00:00') : new Date();
    current.setDate(current.getDate() + 1);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setDateFilter(`${y}-${m}-${d}`);
  };

  const handleToday = () => {
    setDateFilter(getTodayString());
  };

  const handleDayOffset = (offsetDays) => {
    const base = new Date();
    base.setDate(base.getDate() + offsetDays);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    setDateFilter(`${y}-${m}-${d}`);
  };

  // Horizontal Matrix scroll helper
  const scrollMatrix = (delta) => {
    if (matrixContainerRef.current) {
      matrixContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  // Scroll directly to time period
  const scrollToRange = (range) => {
    setActiveTimeRange(range);
    if (!matrixContainerRef.current) return;
    if (range === 'morning') {
      matrixContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (range === 'midday') {
      matrixContainerRef.current.scrollTo({ left: 420, behavior: 'smooth' });
    } else if (range === 'afternoon') {
      matrixContainerRef.current.scrollTo({ left: 840, behavior: 'smooth' });
    } else if (range === 'evening') {
      matrixContainerRef.current.scrollTo({ left: 1260, behavior: 'smooth' });
    } else if (range === 'all') {
      matrixContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  // Enable mouse wheel horizontal scrolling on the slot board
  const handleMatrixWheel = (e) => {
    if (matrixContainerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        matrixContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Handle console select
  const handleSetupSelect = (setupId) => {
    const s = setups.find(setup => setup.id === setupId);
    const rate = s?.pricePerHour || 100;
    setFormData(prev => ({
      ...prev,
      setupId,
      setupName: s?.name || '',
      hourlyRate: rate,
      totalAmount: Math.round(rate * Number(prev.duration)),
    }));
  };

  // Handle clicking a 1-hour slot in Add Modal
  const handleSlotClick = (slot) => {
    if (isSlotTimePassed(slot.start, formData.date)) {
      toast.warning('Slot Expired (N/A)', `This time has already passed (${slot.label}).`);
      return;
    }

    const isBooked = getBookingForSlot(slot, formData.setupId, formData.date, bookings);
    if (isBooked) {
      toast.info('Slot Unavailable', `${slot.label} is already booked by ${isBooked.userName}`);
      return;
    }

    const alreadySelected = formData.selectedSlots.includes(slot.id);
    let newSelected;

    if (alreadySelected && formData.selectedSlots.length > 1) {
      newSelected = formData.selectedSlots.filter(id => id !== slot.id);
    } else {
      newSelected = [slot.id];
    }

    newSelected.sort((a, b) => timeToMins(a) - timeToMins(b));

    const firstSlot = ONE_HOUR_SLOTS.find(s => s.id === newSelected[0]) || slot;
    const lastSlot = ONE_HOUR_SLOTS.find(s => s.id === newSelected[newSelected.length - 1]) || slot;

    const dur = newSelected.length;
    const rate = formData.hourlyRate || 100;

    setFormData(prev => ({
      ...prev,
      selectedSlots: newSelected,
      startTime: firstSlot.start,
      endTime: lastSlot.end,
      duration: dur,
      totalAmount: Math.round(rate * dur),
    }));
  };

  // Handle clicking a 1-hour slot in Edit Modal
  const handleEditSlotClick = (slot) => {
    if (isSlotTimePassed(slot.start, formData.date)) {
      toast.warning('Slot Expired (N/A)', `This time has already passed (${slot.label}).`);
      return;
    }

    const booked = getBookingForSlot(slot, formData.setupId, formData.date, bookings);
    const isBookedByOther = booked && booked.id !== editingBooking?.id;

    if (isBookedByOther) {
      toast.info('Slot Unavailable', `${slot.label} is already booked by ${booked.userName}`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      selectedSlots: [slot.id],
      startTime: slot.start,
      endTime: slot.end,
      duration: 1,
      totalAmount: prev.hourlyRate || 100,
    }));
  };

  // ── Unified Fast Booking Modal Opener ──
  const openBookingModal = ({
    startSessionNow = false,
    initialSetup = null,
    initialSlot = null,
    initialDate = null,
    durationMins = 60,
  } = {}) => {
    const curTime = getCurrentTime24();
    const today = getTodayString();
    const targetDate = initialDate || dateFilter || today;
    const targetSetup = initialSetup || setups.find(s => s.status === 'available') || setups[0];
    const rate = targetSetup?.pricePerHour || 100;
    const rate30 = targetSetup?.pricePer30Min || Math.round(rate * 0.6);

    let start = curTime;
    if (initialSlot?.start) {
      start = initialSlot.start;
    } else if (!startSessionNow) {
      const defaultSlot =
        ONE_HOUR_SLOTS.find(s => !isSlotTimePassed(s.start, targetDate) && !getBookingForSlot(s, targetSetup?.id, targetDate, bookings)) ||
        ONE_HOUR_SLOTS.find(s => !isSlotTimePassed(s.start, targetDate)) ||
        ONE_HOUR_SLOTS[0];
      start = defaultSlot?.start || curTime;
    }

    const dur = durationMins || 60;
    const end = addMinutesToTime(start, dur);
    const amount = calculateCustomPrice(dur, rate, rate30);

    setBookingForm({
      userName: '',
      userPhone: '',
      setupId: targetSetup?.id || '',
      setupName: targetSetup?.name || '',
      date: targetDate,
      startTime: start,
      endTime: end,
      durationMins: dur,
      hourlyRate: rate,
      pricePer30Min: rate30,
      totalAmount: amount,
      paymentStatus: 'paid_cash',
      startSessionNow: Boolean(startSessionNow),
    });
    setShowBookingModal(true);
  };

  const handleBookingDurationChange = (mins) => {
    const m = Math.max(5, Number(mins) || 30);
    const end = addMinutesToTime(bookingForm.startTime, m);
    const newPrice = calculateCustomPrice(m, bookingForm.hourlyRate, bookingForm.pricePer30Min);
    setBookingForm(p => ({
      ...p,
      durationMins: m,
      endTime: end,
      totalAmount: newPrice,
    }));
  };

  const handleBookingStartTimeChange = (newStartTime) => {
    const end = addMinutesToTime(newStartTime, bookingForm.durationMins);
    setBookingForm(p => ({
      ...p,
      startTime: newStartTime,
      endTime: end,
    }));
  };

  const handleBookingSetupSelect = (setupId) => {
    const s = setups.find(item => item.id === setupId);
    if (!s) return;
    const rate = s.pricePerHour || 100;
    const rate30 = s.pricePer30Min || Math.round(rate * 0.6);
    const newPrice = calculateCustomPrice(bookingForm.durationMins, rate, rate30);
    setBookingForm(p => ({
      ...p,
      setupId: s.id,
      setupName: s.name,
      hourlyRate: rate,
      pricePer30Min: rate30,
      totalAmount: newPrice,
    }));
  };

  // Compatibility openers
  const openAddModal = () => openBookingModal({ startSessionNow: false });
  const openOnTimeBookingModal = () => openBookingModal({ startSessionNow: true, initialDate: getTodayString() });
  const openCustomBookingModal = (setup = null) => openBookingModal({ startSessionNow: false, initialSetup: setup });
  const openDirectBookingForSlot = (setup, slot) => {
    const targetDate = dateFilter || getTodayString();
    if (isSlotTimePassed(slot.start, targetDate)) {
      toast.warning('Slot Expired (N/A)', `This time has passed (${slot.label}). Please choose the next available slot.`);
      return;
    }
    openBookingModal({
      initialSetup: setup,
      initialSlot: slot,
      initialDate: targetDate,
      durationMins: 60,
      startSessionNow: false,
    });
  };

  // Submit Unified Booking
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingForm.userName.trim()) {
      return toast.error('Validation Error', 'Customer Name is required.');
    }
    if (!bookingForm.setupId) {
      return toast.error('Validation Error', 'Please select a PlayStation Setup.');
    }
    if (!bookingForm.startTime) {
      return toast.error('Validation Error', 'Start time is required.');
    }

    setSubmitting(true);
    try {
      const setup = setups.find(s => s.id === bookingForm.setupId);
      const computedEndTime = addMinutesToTime(bookingForm.startTime, bookingForm.durationMins);
      const durHours = Math.round((Number(bookingForm.durationMins) / 60) * 100) / 100;

      const staffNameToSave = isStaff ? (currentStaffUser?.name || 'Staff') : 'Super Admin';
      const staffIdToSave = isStaff ? (currentStaffUser?.id || 'staff') : 'admin';

      const bookingStatus = bookingForm.startSessionNow ? 'active' : 'confirmed';

      const payload = {
        userId: 'admin-walkin',
        userName: bookingForm.userName.trim(),
        userPhone: bookingForm.userPhone.trim(),
        userEmail: '',
        setupId: bookingForm.setupId,
        setupName: bookingForm.setupName || setup?.name || 'PlayStation Console',
        date: bookingForm.date || getTodayString(),
        startTime: bookingForm.startTime,
        endTime: computedEndTime,
        actualStartTime: bookingForm.startTime,
        actualEndTime: computedEndTime,
        duration: durHours,
        durationMins: Number(bookingForm.durationMins),
        hourlyRate: Number(bookingForm.hourlyRate),
        totalAmount: Number(bookingForm.totalAmount),
        paymentStatus: bookingForm.paymentStatus,
        status: bookingStatus,
        isWalkIn: bookingForm.startSessionNow,
        bookingTypeLabel: bookingForm.startSessionNow ? '⚡ Live Walk-In' : '📅 Reserved Slot',
        staffId: staffIdToSave,
        staffName: staffNameToSave,
        handledByStaffId: staffIdToSave,
        createdBy: staffNameToSave,
        handledBy: staffNameToSave,
      };

      const docRef = await createBooking(payload);

      if (bookingForm.startSessionNow) {
        const [startH, startM] = bookingForm.startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(startH || 0, startM || 0, 0, 0);
        const endDate = new Date(startDate.getTime() + Number(bookingForm.durationMins) * 60000);

        await createSession({
          bookingId: docRef.id,
          userId: 'admin-walkin',
          userName: bookingForm.userName.trim(),
          userPhone: bookingForm.userPhone.trim(),
          userImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(bookingForm.userName.trim())}&background=06b6d4&color=fff`,
          setupId: bookingForm.setupId,
          setupName: payload.setupName,
          sessionStartTime: toFirestoreTimestamp(startDate),
          sessionEndTime: toFirestoreTimestamp(endDate),
          duration: durHours,
          handledBy: staffNameToSave,
        });

        await updateSetup(bookingForm.setupId, { status: 'occupied' });

        toast.success(
          '⚡ Live Session Started!',
          `🎮 ${bookingForm.userName} is live on ${payload.setupName} (${bookingForm.durationMins} min) • ₹${bookingForm.totalAmount}`
        );
      } else {
        toast.success(
          '📅 Slot Reserved!',
          `Slot reserved on ${payload.setupName} for ${bookingForm.userName} (${formatTime12h(bookingForm.startTime)} – ${formatTime12h(computedEndTime)}) • ₹${bookingForm.totalAmount}`
        );
      }

      setShowBookingModal(false);
    } catch (err) {
      toast.error('Booking Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open booking modal automatically if navigated via ?mode=custom or ?mode=new
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if ((params.get('mode') === 'custom' || params.get('mode') === 'new') && setups.length > 0) {
      openBookingModal();
    }
  }, [setups.length]);

  // Open Edit Modal
  const openEditModal = (b) => {
    setEditingBooking(b);
    setFormData({
      userName: b.userName || '',
      userPhone: b.userPhone || '',
      userEmail: b.userEmail || '',
      setupId: b.setupId || '',
      setupName: b.setupName || '',
      date: b.date || getTodayString(),
      selectedSlots: [b.startTime],
      startTime: b.startTime || '10:00',
      endTime: b.endTime || '11:00',
      duration: b.duration || 1,
      hourlyRate: b.hourlyRate || 100,
      totalAmount: b.totalAmount || 100,
      paymentStatus: b.paymentStatus || 'paid_cash',
      status: b.status || 'confirmed',
      notes: b.notes || '',
      staffId: b.staffId || b.handledByStaffId || (currentStaffUser ? currentStaffUser.id : 'admin'),
      staffName: b.staffName || '',
    });
    setShowSlotDetailsModal(false);
    setShowEditModal(true);
  };

  // Submit Update Booking
  const handleUpdateBookingSubmit = async (e) => {
    e.preventDefault();
    if (!editingBooking) return;

    setSubmitting(true);
    try {
      const setup = setups.find(s => s.id === formData.setupId);

      // Determine updated staff attribution (pure name, no '(Staff)' suffix)
      const selectedStaffObj = staffList.find(s => s.id === formData.staffId);
      const staffIdToSave = isStaff ? (currentStaffUser?.id || 'staff') : (formData.staffId || editingBooking.staffId || 'admin');
      const staffNameToSave = isStaff
        ? (currentStaffUser?.name || 'Staff')
        : (selectedStaffObj ? selectedStaffObj.name : (formData.staffName || editingBooking.staffName || (staffIdToSave === 'admin' ? 'Super Admin' : 'Staff')));
      const staffLabelToSave = staffIdToSave === 'admin' ? 'Super Admin' : formatHandledByName(staffNameToSave);

      const updates = {
        userName: formData.userName.trim(),
        userPhone: formData.userPhone.trim(),
        userEmail: formData.userEmail.trim(),
        setupId: formData.setupId,
        setupName: formData.setupName || setup?.name || editingBooking.setupName,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        duration: Number(formData.duration),
        hourlyRate: Number(formData.hourlyRate),
        totalAmount: Number(formData.totalAmount),
        paymentStatus: formData.paymentStatus,
        status: formData.status,
        notes: formData.notes.trim(),
        staffId: staffIdToSave,
        staffName: staffNameToSave,
        handledByStaffId: staffIdToSave,
        handledBy: staffLabelToSave,
      };

      await updateBooking(editingBooking.id, updates);
      toast.success('Updated', 'Booking details updated.');
      setShowEditModal(false);
      setEditingBooking(null);
    } catch (err) {
      toast.error('Update Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartSession = async (b) => {
    try {
      const startTime = new Date();
      const dur = Number(b.duration) || 1;
      const endTime = new Date(startTime.getTime() + dur * 3600000);
      const setup = setups.find(s => s.id === b.setupId);

      await createSession({
        bookingId: b.id,
        userId: b.userId || 'admin-walkin',
        userName: b.userName,
        userPhone: b.userPhone || '',
        userImage: b.userImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.userName)}&background=9333ea&color=fff`,
        setupId: b.setupId,
        setupName: b.setupName || setup?.name || 'PlayStation Console',
        sessionStartTime: toFirestoreTimestamp(startTime),
        sessionEndTime: toFirestoreTimestamp(endTime),
        duration: dur,
      });

      await updateBooking(b.id, { status: 'active' });
      await updateSetup(b.setupId, { status: 'occupied' });
      toast.success('Session Started', `▶ ${b.userName} is now live on ${b.setupName}!`);
    } catch (err) {
      toast.error('Failed to start session', err.message);
    }
  };

  const handleCompleteBooking = async (b) => {
    try {
      await updateBooking(b.id, { status: 'completed' });
      await updateSetup(b.setupId, { status: 'available' });

      const matchingSession = activeSessions.find(s => s.bookingId === b.id || s.setupId === b.setupId);
      if (matchingSession) {
        await updateSession(matchingSession.id, { status: 'completed' });
      }

      toast.success('Session Completed', `✓ Console is now free and available.`);
    } catch (err) {
      toast.error('Error completing session', err.message);
    }
  };

  // Cancel Booking and Free Slot
  const handleCancelBooking = async (b) => {
    if (!confirm(`Cancel slot for ${b.userName}? Slot ${formatTime12h(b.startTime)} - ${formatTime12h(b.endTime)} will become FREE immediately.`)) return;
    try {
      await updateBooking(b.id, { status: 'cancelled' });
      if (b.status === 'active') {
        await updateSetup(b.setupId, { status: 'available' });
      }
      toast.info('Slot Cancelled', `Slot ${formatTime12h(b.startTime)} - ${formatTime12h(b.endTime)} is now FREE.`);
      setShowSlotDetailsModal(false);
      setShowEditModal(false);
    } catch (err) {
      toast.error('Error cancelling', err.message);
    }
  };

  const handleDeleteBooking = async (b) => {
    if (!confirm(`Permanently delete booking for "${b.userName}"?`)) return;
    try {
      await deleteBooking(b.id);
      toast.success('Deleted', 'Booking removed permanently.');
      setShowSlotDetailsModal(false);
    } catch (err) {
      toast.error('Delete failed', err.message);
    }
  };

  // KPIs
  const todayStr = getTodayString();
  const todayBookings = useMemo(() => bookings.filter(b => b.date === todayStr), [bookings, todayStr]);
  const activeBookingsCount = useMemo(() => bookings.filter(b => b.status === 'active').length, [bookings]);
  const todayRevenue = useMemo(() => {
    return todayBookings
      .filter(b => b.status !== 'cancelled')
      .reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
  }, [todayBookings]);

  // Filtered Bookings for Table View
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchStatus = statusFilter === 'All' || b.status === statusFilter;
      const matchDate = !dateFilter || b.date === dateFilter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        b.userName?.toLowerCase().includes(q) ||
        b.userPhone?.toLowerCase().includes(q) ||
        b.setupName?.toLowerCase().includes(q) ||
        b.handledBy?.toLowerCase().includes(q) ||
        b.createdBy?.toLowerCase().includes(q) ||
        b.id?.toLowerCase().includes(q);

      // Staff filtering
      let matchStaff = true;
      if (staffFilter === 'my' && currentStaffUser) {
        matchStaff = isBookingHandledByStaff(b, currentStaffUser.id, currentStaffUser.name);
      } else if (staffFilter !== 'all') {
        const targetStaff = staffList.find(s => s.id === staffFilter);
        matchStaff = isBookingHandledByStaff(b, staffFilter, targetStaff?.name);
      }

      return matchStatus && matchDate && matchSearch && matchStaff;
    });
  }, [bookings, statusFilter, dateFilter, search, staffFilter, currentStaffUser, staffList]);


  return (
    <div className="bookings-page-container">
      {/* ── 1. Top Executive Header Bar ── */}
      <div className="bookings-hero-header">
        <div className="bookings-hero-left">
          <div className="bookings-hero-title-row">
            <h2 className="bookings-hero-title">
              <Gamepad2 size={24} style={{ color: 'var(--color-primary)' }} />
              PlayStation Bookings Desk
            </h2>
            {activeBookingsCount > 0 && (
              <span className="bookings-live-pill">
                <span className="live-pulse-dot" />
                {activeBookingsCount} Live Playing
              </span>
            )}
          </div>
          <div className="bookings-hero-stats-row">
            <span>Today: <strong>{todayBookings.length} Bookings</strong></span>
            <span>•</span>
            <span className="bookings-revenue-stat">₹{todayRevenue} Total</span>
            <span>•</span>
            <span style={{ color: 'var(--color-text-dim)' }}>
              🟢 Free · 🔴 Booked · ⚪ N/A
            </span>
          </div>
        </div>

        {/* 2 Primary Action Buttons */}
        <div className="bookings-hero-actions">
          <button
            type="button"
            className="booking-action-btn booking-action-btn--walkin"
            onClick={() => openBookingModal({ startSessionNow: true, initialDate: getTodayString() })}
            id="admin-ontime-booking-btn"
            title="Fast counter walk-in live session"
          >
            <Zap size={16} style={{ color: '#ffea79' }} />
            <span>⚡ Play Live Now</span>
          </button>

          <button
            type="button"
            className="booking-action-btn booking-action-btn--add"
            onClick={() => openBookingModal({ startSessionNow: false })}
            id="admin-new-booking-btn"
            title="Reserve advance PlayStation slot"
          >
            <Calendar size={16} />
            <span>+ Reserve Slot</span>
          </button>
        </div>
      </div>

      {/* ── 2. Staff Duty & Collection Banner (Compact) ── */}
      {isStaff && myStaffStats && (
        <div className="bookings-staff-strip">
          <div className="staff-strip-info">
            <div className="staff-strip-avatar">👤</div>
            <div>
              <strong>{currentStaffUser?.name}</strong>{' '}
              <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>({currentStaffUser?.role || 'Staff'})</span>
            </div>
            <div className="staff-strip-metrics">
              <span>My Today: <strong>{myStaffStats.todayCount} Slots</strong></span>
              <span>•</span>
              <span>Total: <strong>₹{myStaffStats.todayCollection}</strong> (₹{myStaffStats.todayCash} Cash / ₹{myStaffStats.todayUpi} UPI)</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setStaffFilter('all')}
              className={`staff-pill-btn ${staffFilter === 'all' ? 'active' : ''}`}
            >
              All Bookings
            </button>
            <button
              type="button"
              onClick={() => setStaffFilter('my')}
              className={`staff-pill-btn ${staffFilter === 'my' ? 'active' : ''}`}
            >
              🎯 Only Mine ({myStaffStats.todayCount})
            </button>
          </div>
        </div>
      )}

      {/* ── Admin Staff Filter Strip ── */}
      {isAdmin && (
        <div className="bookings-staff-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ffffff', fontWeight: 700, fontSize: '0.78rem' }}>
            <span>👥 Staff Filter:</span>
          </div>
          <div className="staff-filter-pills">
            <button
              type="button"
              onClick={() => setStaffFilter('all')}
              className={`staff-pill-btn ${staffFilter === 'all' ? 'active' : ''}`}
            >
              All Staff ({todayBookings.length} • ₹{todayRevenue})
            </button>
            {staffList.map(s => {
              const sStats = calculateStaffStats(s.id, s.name, bookings);
              const isSelected = staffFilter === s.id;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setStaffFilter(isSelected ? 'all' : s.id)}
                  className={`staff-pill-btn ${isSelected ? 'active' : ''}`}
                >
                  <span>👤 {s.name}</span>
                  <span style={{ fontSize: '0.68rem', opacity: 0.9 }}>
                    ({sStats.todayCount} • ₹{sStats.todayCollection})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Unified Control Deck (Date + Live Search + View Switcher) ── */}
      <div className="bookings-control-deck">
        <div className="bookings-deck-row">
          {/* Date Navigator */}
          <div className="bookings-date-nav">
            <button
              type="button"
              className="date-nav-btn"
              onClick={handlePrevDay}
              title="Previous Day"
            >
              <ChevronLeft size={15} /> Back
            </button>
            <button
              type="button"
              className={`date-nav-btn ${dateFilter === todayStr ? 'active' : ''}`}
              onClick={handleToday}
            >
              Today
            </button>
            <button
              type="button"
              className="date-nav-btn"
              onClick={handleNextDay}
              title="Next Day"
            >
              Next <ChevronRight size={15} />
            </button>

            <input
              type="date"
              className="date-native-picker"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />

            <span className="date-display-badge">
              📅 {getFormattedDateTitle(dateFilter)}
            </span>
          </div>

          {/* Search Box */}
          <div className="bookings-search-wrap">
            <Search size={14} className="bookings-search-icon" />
            <input
              type="text"
              className="bookings-search-input"
              placeholder="Search gamer, phone, console..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="bookings-search-clear"
                onClick={() => setSearch('')}
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="bookings-view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'board' ? 'active' : ''}`}
              onClick={() => setViewMode('board')}
            >
              <LayoutGrid size={13} />
              <span>Timeline Grid</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <List size={13} />
              <span>Bookings List ({filteredBookings.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          MODE 1: 1-HOUR LIVE SLOT TIMELINE GRID (BOARD)
         ═════════════════════════════════════════════════════════════ */}
      {viewMode === 'board' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Timeline Secondary Jumps & Scroll Bar */}
          <div className="timeline-jumps-bar">
            <div className="timeline-jumps-group">
              <button
                type="button"
                className={`admin-time-jump-pill ${activeTimeRange === 'morning' ? 'active' : ''}`}
                onClick={() => scrollToRange('morning')}
              >
                🌅 5–10 AM
              </button>
              <button
                type="button"
                className={`admin-time-jump-pill ${activeTimeRange === 'midday' ? 'active' : ''}`}
                onClick={() => scrollToRange('midday')}
              >
                ☀️ 10–3 PM
              </button>
              <button
                type="button"
                className={`admin-time-jump-pill ${activeTimeRange === 'afternoon' ? 'active' : ''}`}
                onClick={() => scrollToRange('afternoon')}
              >
                🌆 3–7 PM
              </button>
              <button
                type="button"
                className={`admin-time-jump-pill ${activeTimeRange === 'evening' ? 'active' : ''}`}
                onClick={() => scrollToRange('evening')}
              >
                🌙 7–10 PM
              </button>
              <button
                type="button"
                className={`admin-time-jump-pill ${activeTimeRange === 'all' ? 'active' : ''}`}
                onClick={() => scrollToRange('all')}
              >
                ⚡ All Day
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => scrollMatrix(-260)}
                style={{ padding: '4px 6px', fontSize: '0.72rem' }}
                title="Scroll Left"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => scrollMatrix(260)}
                style={{ padding: '4px 6px', fontSize: '0.72rem' }}
                title="Scroll Right"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Matrix Board */}
          <div
            className="admin-matrix-container glass"
            ref={matrixContainerRef}
            onWheel={handleMatrixWheel}
          >
            <div className="admin-matrix-inner">
              {/* Sticky Header Row */}
              <div className="admin-matrix-header-row">
                <div
                  className="admin-matrix-console-col"
                  style={{
                    background: '#111827',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    letterSpacing: '0.05em',
                    color: 'var(--color-primary)',
                    borderBottom: 'none',
                  }}
                >
                  🎮 CONSOLE
                </div>
                <div className="admin-matrix-slots-col">
                  {ONE_HOUR_SLOTS.map(slot => (
                    <div
                      key={slot.id}
                      style={{
                        width: 78,
                        minWidth: 78,
                        textAlign: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: 'var(--color-text-muted)',
                        padding: '4px 0',
                      }}
                    >
                      {slot.short}
                    </div>
                  ))}
                </div>
              </div>

              {/* PlayStation Rows */}
              {setups.map(setup => {
                const isConsoleActive = activeSessions.some(ses => ses.setupId === setup.id && ses.status !== 'completed');
                return (
                  <div key={setup.id} className="admin-matrix-row">
                    {/* Console Info Column */}
                    <div className="admin-matrix-console-col">
                      <div className="console-name" style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Gamepad2 size={14} style={{ color: isConsoleActive ? '#22c55e' : 'var(--color-primary)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {setup.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 3 }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.6rem', padding: '1px 4px' }}>
                          {setup.type || 'PS'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-accent)', fontWeight: 700 }}>
                          ₹{setup.pricePerHour}
                        </span>
                      </div>
                    </div>

                    {/* 1-Hour Slots Columns */}
                    <div className="admin-matrix-slots-col">
                      {ONE_HOUR_SLOTS.map(slot => {
                        const activeDate = dateFilter || todayStr;
                        const booked = getBookingForSlot(slot, setup.id, activeDate, bookings);
                        const isBooked = !!booked;
                        const isPassed = isSlotTimePassed(slot.start, activeDate);

                        let cellClass = 'admin-matrix-slot-cell--free';
                        if (isBooked) cellClass = 'admin-matrix-slot-cell--booked';
                        else if (isPassed) cellClass = 'admin-matrix-slot-cell--passed';

                        return (
                          <div
                            key={slot.id}
                            className={`admin-matrix-slot-cell ${cellClass}`}
                            onClick={() => {
                              if (isBooked) {
                                setSelectedSlotBooking({ booking: booked, setup, slot });
                                setShowSlotDetailsModal(true);
                              } else if (isPassed) {
                                toast.info('Slot Expired (N/A)', `This time has passed (${slot.label}).`);
                              } else {
                                openDirectBookingForSlot(setup, slot);
                              }
                            }}
                            title={
                              isBooked
                                ? `Booked by: ${booked.userName} — Click to Edit or Cancel`
                                : isPassed
                                ? `Slot time has passed (N/A) — ${slot.label}`
                                : `Click to book ${slot.label} on ${setup.name}`
                            }
                          >
                            <div style={{ fontSize: '0.68rem', opacity: isPassed ? 0.55 : 0.85 }}>{slot.short}</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '84px', whiteSpace: 'nowrap' }}>
                              {isBooked ? `🔴 ${booked.userName?.split(' ')[0]}` : isPassed ? '⚪ N/A' : '🟢 + Book'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {setups.length === 0 && (
                <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No PlayStation consoles found. Please add PlayStations in <strong>PlayStation Setups</strong> first.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          MODE 2: ALL BOOKINGS LIST & CARDS (RESPONSIVE)
         ═════════════════════════════════════════════════════════════ */}
      {viewMode === 'table' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Status Filter Tabs */}
          <div className="bookings-status-tabs-row">
            {STATUS_TABS.map(tab => {
              const count = tab.id === 'All'
                ? bookings.length
                : bookings.filter(b => b.status === tab.id).length;
              const isActive = statusFilter === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`booking-status-tab ${isActive ? 'active' : ''}`}
                >
                  <span>{tab.label}</span>
                  <span className="status-count-badge">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Desktop Table View (Hidden on mobile) */}
          <div className="glass admin-table-wrap desktop-bookings-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Console</th>
                  <th>Date & Time</th>
                  <th>Duration</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map(b => {
                  const isLive = b.status === 'active';
                  return (
                    <tr
                      key={b.id}
                      style={{
                        background: isLive ? 'rgba(6, 182, 212, 0.05)' : undefined,
                      }}
                    >
                      <td style={{ fontFamily: 'var(--font-display)', fontSize: '0.68rem', color: 'var(--color-primary)' }}>
                        #{b.id.slice(0, 6).toUpperCase()}
                      </td>

                      <td>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#ffffff' }}>
                          {b.userName || 'Walk-in Gamer'}
                        </div>
                        {b.userPhone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            <Phone size={11} style={{ color: 'var(--color-primary)' }} />
                            <a
                              href={`tel:+91${getClean10Phone(b.userPhone)}`}
                              style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}
                            >
                              {formatPhoneNumber(b.userPhone)}
                            </a>
                            <a
                              href={`https://wa.me/91${getClean10Phone(b.userPhone)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#25D366', marginLeft: 4 }}
                              title="WhatsApp"
                            >
                              <MessageSquare size={12} />
                            </a>
                          </div>
                        )}
                        {b.notes && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-warning)', marginTop: 2, fontStyle: 'italic' }}>
                            "{b.notes}"
                          </div>
                        )}
                        {(b.handledBy || b.createdBy) && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-primary-light)', marginTop: 2 }}>
                            👤 By: {formatHandledByName(b.handledBy || b.createdBy)}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Gamepad2 size={15} style={{ color: 'var(--color-primary)' }} />
                          <span style={{ fontWeight: 700 }}>{b.setupName || 'PlayStation'}</span>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{b.date}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 800 }}>
                          {formatTime12h(b.startTime)} – {formatTime12h(b.endTime)}
                        </div>
                      </td>

                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem' }}>
                          {b.duration}h
                        </span>
                      </td>

                      <td>
                        <div style={{ fontWeight: 900, color: '#10b981', fontSize: '0.98rem' }}>
                          ₹{b.totalAmount || 0}
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background:
                              b.paymentStatus?.startsWith('paid')
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              b.paymentStatus?.startsWith('paid')
                                ? 'var(--color-success)'
                                : 'var(--color-warning)',
                            border: '1px solid',
                            borderColor:
                              b.paymentStatus?.startsWith('paid')
                                ? 'rgba(34, 197, 94, 0.3)'
                                : 'rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          {b.paymentStatus ? b.paymentStatus.replace('_', ' ') : 'PAID'}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge badge-${b.status}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            letterSpacing: '0.04em',
                            fontWeight: 800,
                          }}
                        >
                          {isLive && (
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#06b6d4',
                                animation: 'glow-pulse 1.5s infinite',
                              }}
                            />
                          )}
                          {b.status?.toUpperCase()}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {(b.status === 'confirmed' || b.status === 'pending') && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleStartSession(b)}
                              title="Start live session on this console"
                            >
                              <Play size={12} /> Start
                            </button>
                          )}

                          {b.status === 'active' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleCompleteBooking(b)}
                              title="Complete session and free console"
                            >
                              <CheckCircle size={12} /> Complete
                            </button>
                          )}

                          {b.status !== 'completed' && b.status !== 'cancelled' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleCancelBooking(b)}
                              title="Cancel booking and free slot"
                              style={{ color: 'var(--color-danger)' }}
                            >
                              <XCircle size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => openEditModal(b)}
                            title="Edit Booking"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteBooking(b)}
                            title="Delete permanently"
                            style={{ padding: '6px 8px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (Displayed on <= 768px screens) */}
          <div className="bookings-mobile-cards-list">
            {filteredBookings.map(b => {
              const isLive = b.status === 'active';
              return (
                <div
                  key={b.id}
                  className={`mobile-booking-card ${isLive ? 'mobile-booking-card--live' : ''}`}
                >
                  {/* Top Row: Customer + Status */}
                  <div className="mobile-card-top-row">
                    <div className="mobile-card-user-info">
                      <div className="mobile-card-name">
                        {b.userName || 'Walk-in Gamer'}
                      </div>
                      {b.userPhone && (
                        <div className="mobile-card-phone-row">
                          <a href={`tel:+91${getClean10Phone(b.userPhone)}`} className="phone-quick-btn">
                            <Phone size={10} /> {formatPhoneNumber(b.userPhone)}
                          </a>
                          <a
                            href={`https://wa.me/91${getClean10Phone(b.userPhone)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="whatsapp-quick-btn"
                          >
                            <MessageSquare size={10} /> WhatsApp
                          </a>
                        </div>
                      )}
                    </div>

                    <span className={`badge badge-${b.status}`}>
                      {isLive && <span className="live-pulse-dot" style={{ width: 5, height: 5 }} />}
                      {b.status?.toUpperCase()}
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div className="mobile-card-grid">
                    <div className="mobile-grid-item">
                      <span className="mobile-grid-label">Console</span>
                      <span className="mobile-grid-val" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Gamepad2 size={13} style={{ color: 'var(--color-primary)' }} />
                        {b.setupName || 'PlayStation'}
                      </span>
                    </div>

                    <div className="mobile-grid-item">
                      <span className="mobile-grid-label">Time Span</span>
                      <span className="mobile-grid-val time-val">
                        {formatTime12h(b.startTime)} – {formatTime12h(b.endTime)}
                      </span>
                    </div>

                    <div className="mobile-grid-item">
                      <span className="mobile-grid-label">Date</span>
                      <span className="mobile-grid-val">{b.date}</span>
                    </div>

                    <div className="mobile-grid-item">
                      <span className="mobile-grid-label">Amount & Mode</span>
                      <span className="mobile-grid-val amount-val">
                        ₹{b.totalAmount || 0}{' '}
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>
                          ({b.paymentStatus?.replace('_', ' ') || 'Paid'})
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Notes if any */}
                  {b.notes && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-warning)', fontStyle: 'italic', padding: '0 4px' }}>
                      "{b.notes}"
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="mobile-card-actions-row">
                    <div className="mobile-card-handled-by">
                      👤 {formatHandledByName(b.handledBy || b.createdBy || 'Counter')}
                    </div>

                    <div className="mobile-card-btns">
                      {(b.status === 'confirmed' || b.status === 'pending') && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleStartSession(b)}
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <Play size={11} /> Start
                        </button>
                      )}

                      {b.status === 'active' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleCompleteBooking(b)}
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <CheckCircle size={11} /> Complete
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => openEditModal(b)}
                        title="Edit Booking"
                        style={{ padding: '4px 8px' }}
                      >
                        <Edit2 size={13} />
                      </button>

                      {b.status !== 'completed' && b.status !== 'cancelled' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleCancelBooking(b)}
                          title="Cancel Booking"
                          style={{ color: 'var(--color-danger)', padding: '4px 8px' }}
                        >
                          <XCircle size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteBooking(b)}
                        title="Delete permanently"
                        style={{ padding: '4px 8px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredBookings.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-muted)' }}>
              <Gamepad2 size={44} style={{ margin: '0 auto var(--space-md)', color: 'var(--color-text-dim)' }} />
              <h3 style={{ marginBottom: '8px' }}>No Bookings Found</h3>
              <p style={{ marginBottom: 'var(--space-lg)' }}>
                {search || dateFilter || statusFilter !== 'All'
                  ? 'No bookings match your current search or filters.'
                  : 'No PlayStation bookings added yet.'}
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>
                <Plus size={16} /> + Direct Book Slot
              </button>
            </div>
          )}
        </div>
      )}


      {/* ═════════════════════════════════════════════════════════════
          SLOT DETAILS & QUICK ACTION MODAL (EDIT / CANCEL)
         ═════════════════════════════════════════════════════════════ */}
      {showSlotDetailsModal && selectedSlotBooking && (
        <div className="modal-overlay" onClick={() => setShowSlotDetailsModal(false)}>
          <div
            className="modal-card glass-strong"
            style={{ maxWidth: '520px', width: '95%' }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-md)',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: 'var(--space-sm)',
              }}
            >
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Gamepad2 size={20} style={{ color: 'var(--color-primary)' }} />
                  {selectedSlotBooking.setup?.name}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 700, marginTop: 2 }}>
                  🕒 {selectedSlotBooking.slot?.label} · {selectedSlotBooking.booking.date}
                </div>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowSlotDetailsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Customer Details Box */}
              <div style={{ padding: 'var(--space-md)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Gamer / Customer</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text)' }}>
                      {selectedSlotBooking.booking.userName}
                    </div>
                  </div>
                  <span className={`badge badge-${selectedSlotBooking.booking.status}`}>
                    {selectedSlotBooking.booking.status?.toUpperCase()}
                  </span>
                </div>

                {selectedSlotBooking.booking.userPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                      📞 {formatPhoneNumber(selectedSlotBooking.booking.userPhone)}
                    </span>
                    <a
                      href={`tel:+91${getClean10Phone(selectedSlotBooking.booking.userPhone)}`}
                      className="btn btn-sm btn-ghost"
                      style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    >
                      Call
                    </a>
                    <a
                      href={`https://wa.me/91${getClean10Phone(selectedSlotBooking.booking.userPhone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-ghost"
                      style={{ padding: '3px 8px', fontSize: '0.75rem', color: '#25D366' }}
                    >
                      WhatsApp
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-dim)' }}>Amount: </span>
                    <strong style={{ color: 'var(--color-accent)' }}>₹{selectedSlotBooking.booking.totalAmount}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-dim)' }}>Payment: </span>
                    <strong>{selectedSlotBooking.booking.paymentStatus?.replace('_', ' ').toUpperCase()}</strong>
                  </div>
                </div>

                {selectedSlotBooking.booking.notes && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: 8, fontStyle: 'italic' }}>
                    Note: "{selectedSlotBooking.booking.notes}"
                  </div>
                )}
                {(selectedSlotBooking.booking.handledBy || selectedSlotBooking.booking.createdBy) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)', marginTop: 6 }}>
                    👤 Handled by: {formatHandledByName(selectedSlotBooking.booking.handledBy || selectedSlotBooking.booking.createdBy)}
                  </div>
                )}
              </div>

              {/* Action Buttons: Edit, Cancel, Start, Complete */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {/* Edit Slot Button */}
                  <button
                    className="btn btn-secondary"
                    onClick={() => openEditModal(selectedSlotBooking.booking)}
                    style={{ justifyContent: 'center', padding: '10px' }}
                  >
                    <Edit2 size={14} /> ✏️ Edit Slot / Time
                  </button>

                  {/* Cancel Slot Button */}
                  <button
                    className="btn btn-danger"
                    onClick={() => handleCancelBooking(selectedSlotBooking.booking)}
                    style={{ justifyContent: 'center', padding: '10px' }}
                  >
                    <XCircle size={14} /> ✕ Cancel Slot (Free)
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {(selectedSlotBooking.booking.status === 'confirmed' || selectedSlotBooking.booking.status === 'pending') && (
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => {
                        handleStartSession(selectedSlotBooking.booking);
                        setShowSlotDetailsModal(false);
                      }}
                    >
                      <Play size={14} /> ▶ Start Live Session Now
                    </button>
                  )}

                  {selectedSlotBooking.booking.status === 'active' && (
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => {
                        handleCompleteBooking(selectedSlotBooking.booking);
                        setShowSlotDetailsModal(false);
                      }}
                    >
                      <CheckCircle size={14} /> ✓ Complete Session
                    </button>
                  )}

                  <button
                    className="btn btn-ghost"
                    style={{ color: 'var(--color-danger)' }}
                    onClick={() => {
                      handleDeleteBooking(selectedSlotBooking.booking);
                      setShowSlotDetailsModal(false);
                    }}
                    title="Permanently delete booking"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ═════════════════════════════════════════════════════════════
          EDIT BOOKING MODAL (WITH 1-HOUR SLOT RE-SELECTION & CANCEL)
         ═════════════════════════════════════════════════════════════ */}
      {showEditModal && editingBooking && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div
            className="modal-card glass-strong"
            style={{ maxWidth: '680px', width: '95%' }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-md)',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: 'var(--space-sm)',
              }}
            >
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✏️ Edit / Reschedule Slot
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
                  #{editingBooking.id.slice(0, 8).toUpperCase()} · {editingBooking.setupName}
                </span>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateBookingSubmit}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-md)',
                  maxHeight: '68vh',
                  overflowY: 'auto',
                  paddingRight: '6px',
                }}
              >
                {/* Console & Date Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-md)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Change PlayStation Console</label>
                    <select
                      className="form-input"
                      value={formData.setupId}
                      onChange={e => handleSetupSelect(e.target.value)}
                    >
                      {setups.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.type || 'PS'}) — ₹{s.pricePerHour}/hr
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Booking Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.date}
                      onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* ── Visual 1-Hour Slot Re-Selection Grid ── */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      ⚡ Click to Change Time Slot
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 700 }}>
                      Active: {formatTime12h(formData.startTime)} – {formatTime12h(formData.endTime)}
                    </span>
                  </div>

                  <div className="admin-slot-grid">
                    {ONE_HOUR_SLOTS.map(slot => {
                      const booked = getBookingForSlot(slot, formData.setupId, formData.date, bookings);
                      const isBookedByOther = booked && booked.id !== editingBooking?.id;
                      const isSelected = formData.selectedSlots?.includes(slot.id) || formData.startTime === slot.start;
                      const isPassed = isSlotTimePassed(slot.start, formData.date);

                      let btnClass = 'admin-slot-btn--available';
                      if (isBookedByOther) btnClass = 'admin-slot-btn--booked';
                      else if (isSelected) btnClass = 'admin-slot-btn--selected';
                      else if (isPassed) btnClass = 'admin-slot-btn--passed';

                      return (
                        <button
                          type="button"
                          key={slot.id}
                          className={`admin-slot-btn ${btnClass}`}
                          onClick={() => handleEditSlotClick(slot)}
                          disabled={isBookedByOther || (!isSelected && isPassed)}
                          title={isBookedByOther ? `Booked by ${booked.userName}` : isPassed && !isSelected ? `${slot.label} (Time passed - N/A)` : slot.label}
                        >
                          <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{slot.short}</div>
                          <div style={{ fontSize: '0.65rem' }}>
                            {isSelected ? '✓ CURRENT' : isBookedByOther ? `🔴 ${booked.userName?.split(' ')[0]}` : isPassed ? '⚪ N/A' : '🟢 FREE'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Details Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Customer Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.userName}
                      onChange={e => setFormData(p => ({ ...p, userName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.userPhone}
                      onChange={e => setFormData(p => ({ ...p, userPhone: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Amount, Payment & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Total Amount (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.totalAmount}
                      onChange={e => setFormData(p => ({ ...p, totalAmount: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Payment Status</label>
                    <select
                      className="form-input"
                      value={formData.paymentStatus}
                      onChange={e => setFormData(p => ({ ...p, paymentStatus: e.target.value }))}
                    >
                      {PAYMENT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Edit Staff Selector: ONLY staff name! */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <UserCheck size={13} style={{ color: 'var(--color-primary)' }} /> Handled by
                    </label>
                    {isStaff ? (
                      <div
                        className="form-input"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(147, 51, 234, 0.12)',
                          borderColor: 'rgba(147, 51, 234, 0.35)',
                          color: '#fff',
                          fontWeight: 700,
                          height: '38px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <span>👤 {formatHandledByName(currentStaffUser?.name || formData.staffName || 'Staff Member')}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-primary-light)', marginLeft: 'auto', background: 'rgba(147,51,234,0.25)', padding: '2px 6px', borderRadius: 4 }}>
                          Logged In
                        </span>
                      </div>
                    ) : (
                      <select
                        className="form-input"
                        value={formData.staffId || ''}
                        onChange={e => {
                          const sId = e.target.value;
                          const sObj = staffList.find(s => s.id === sId);
                          setFormData(p => ({
                            ...p,
                            staffId: sId,
                            staffName: sObj ? sObj.name : 'Super Admin',
                          }));
                        }}
                      >
                        <option value="admin">👑 Super Admin</option>
                        {staffList.map(s => (
                          <option key={s.id} value={s.id}>
                            👤 {formatHandledByName(s.name)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Booking Status</label>
                    <select
                      className="form-input"
                      value={formData.status}
                      onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                    >
                      <option value="confirmed">📅 Confirmed (Slot Reserved)</option>
                      <option value="active">🟢 Active (Live Playing)</option>
                      <option value="pending">⏳ Pending Confirmation</option>
                      <option value="completed">✓ Completed</option>
                      <option value="cancelled">✕ Cancelled (Free Slot)</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Edit Modal Actions: Cancel Slot vs Save Changes */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  marginTop: 'var(--space-lg)',
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: 'var(--space-md)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleCancelBooking(editingBooking)}
                >
                  <XCircle size={14} /> ✕ Cancel Slot (Free Up)
                </button>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowEditModal(false)}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : '✓ Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ⚡ UNIFIED ESSENTIAL PLAYSTATION BOOKING MODAL (Staff & Admin) ─── */}
      {showBookingModal && (
        <div className="modal-backdrop" onClick={() => setShowBookingModal(false)}>
          <div
            className="modal-box glass-strong"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 560, width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '20px 16px' }}
          >
            {/* Header */}
            <div className="modal-header" style={{ marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 34,
                    height: 34,
                    borderRadius: '8px',
                    background: bookingForm.startSessionNow
                      ? 'linear-gradient(135deg, #06b6d4, #10b981)'
                      : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: bookingForm.startSessionNow
                      ? '0 0 14px rgba(6, 182, 212, 0.45)'
                      : '0 0 14px rgba(236, 72, 153, 0.45)'
                  }}>
                    {bookingForm.startSessionNow ? <Zap size={18} /> : <Calendar size={18} />}
                  </span>
                  <div>
                    <h3 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{bookingForm.startSessionNow ? '⚡ Play Live Now' : '📅 Reserve Slot'}</span>
                      <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', color: '#94a3b8', fontWeight: 700 }}>
                        {isStaff ? 'Staff Desk' : 'Admin'}
                      </span>
                    </h3>
                  </div>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: 'var(--color-text-dim)' }}>
                  {bookingForm.startSessionNow ? 'Walk-in counter session: starts timer immediately' : 'Schedule advance PlayStation reservation'}
                </p>
              </div>
              <button className="btn-close" onClick={() => setShowBookingModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 1. PlayStation Console Picker */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <Gamepad2 size={13} style={{ color: 'var(--color-primary)' }} /> Select PlayStation Console <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: 8 }}>
                  {setups.map(s => {
                    const isSelected = bookingForm.setupId === s.id;
                    const isBusy = activeSessions.some(ses => ses.setupId === s.id && ses.status !== 'completed');
                    const rate = s.pricePerHour || 100;
                    const p30 = s.pricePer30Min || Math.round(rate * 0.6);

                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => handleBookingSetupSelect(s.id)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.08)',
                          background: isSelected ? 'rgba(6, 182, 212, 0.16)' : 'rgba(255,255,255,0.03)',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 4,
                          boxShadow: isSelected ? '0 0 16px rgba(6, 182, 212, 0.35)' : 'none',
                          transition: 'all 0.15s ease',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                          {s.name}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.7rem' }}>
                          <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                            ₹{rate}/hr <span style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem' }}>· 30m: ₹{p30}</span>
                          </span>
                          <span style={{
                            color: isBusy ? '#ef4444' : '#10b981',
                            fontWeight: 700,
                            fontSize: '0.65rem'
                          }}>
                            {isBusy ? '🔴 Busy' : '🟢 Free'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Customer Name & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: 4 }}>
                    Customer Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rohan Patil"
                    value={bookingForm.userName}
                    onChange={e => setBookingForm(p => ({ ...p, userName: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: 4 }}>
                    WhatsApp Mobile Number
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="10-digit mobile"
                    value={bookingForm.userPhone}
                    onChange={e => setBookingForm(p => ({ ...p, userPhone: e.target.value }))}
                  />
                </div>
              </div>

              {/* 3. Date & Circular Analog Clock Time Picker */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      📅 Booking Date
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setBookingForm(p => ({ ...p, date: getTodayString() }))}
                        style={{
                          background: bookingForm.date === getTodayString() ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
                          color: bookingForm.date === getTodayString() ? '#fff' : 'var(--color-text-dim)',
                          border: 'none',
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tom = new Date();
                          tom.setDate(tom.getDate() + 1);
                          const y = tom.getFullYear();
                          const m = String(tom.getMonth() + 1).padStart(2, '0');
                          const d = String(tom.getDate()).padStart(2, '0');
                          setBookingForm(p => ({ ...p, date: `${y}-${m}-${d}` }));
                        }}
                        style={{
                          background: bookingForm.date !== getTodayString() ? 'var(--color-accent)' : 'rgba(255,255,255,0.06)',
                          color: bookingForm.date !== getTodayString() ? '#fff' : 'var(--color-text-dim)',
                          border: 'none',
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        Tomorrow
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    className="form-input"
                    value={bookingForm.date}
                    onChange={e => setBookingForm(p => ({ ...p, date: e.target.value }))}
                    required
                  />
                </div>

                {/* Clock Dial Time Picker */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <ClockTimePicker
                    label="Booking Start Time"
                    value={bookingForm.startTime}
                    onChange={newTime => handleBookingStartTimeChange(newTime)}
                  />
                </div>

                {/* Calculated Time Span Banner */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  fontSize: '0.8rem',
                }}>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 800 }}>
                    🕒 Time Span: <strong>{formatTime12h(bookingForm.startTime)}</strong> → <strong>{formatTime12h(bookingForm.endTime)}</strong>
                  </span>
                  <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                    ({bookingForm.durationMins} minutes session)
                  </span>
                </div>
              </div>

              {/* 4. Duration Selector Chips */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    ⏱️ Select Duration
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 700 }}>
                    {bookingForm.durationMins} min ({Math.round((bookingForm.durationMins / 60) * 10) / 10} hr)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {[
                    { label: '30 Min', mins: 30 },
                    { label: '1 Hour', mins: 60 },
                    { label: '1.5 Hr', mins: 90 },
                    { label: '2 Hours', mins: 120 },
                    { label: '3 Hours', mins: 180 },
                  ].map(item => {
                    const isSelected = bookingForm.durationMins === item.mins;
                    const calculatedPrice = calculateCustomPrice(item.mins, bookingForm.hourlyRate, bookingForm.pricePer30Min);
                    return (
                      <button
                        type="button"
                        key={item.mins}
                        onClick={() => handleBookingDurationChange(item.mins)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '2px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.08)',
                          background: isSelected ? 'linear-gradient(135deg, #06b6d4, #9333ea)' : 'rgba(255,255,255,0.04)',
                          color: isSelected ? '#fff' : 'var(--color-text-dim)',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{item.label}</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>₹{calculatedPrice}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Total Booking Amount (Editable) & Payment Mode */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 10 }}>
                {/* Total Charge (Editable) */}
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', marginBottom: 4 }}>
                    TOTAL AMOUNT (₹)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1.1rem' }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={bookingForm.totalAmount}
                      onChange={e => setBookingForm(p => ({ ...p, totalAmount: Number(e.target.value) || 0 }))}
                      style={{
                        height: 36,
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: 6,
                        color: '#10b981',
                        fontWeight: 900,
                        fontSize: '1.1rem',
                        textAlign: 'center',
                        padding: '4px',
                      }}
                      title="Editable for custom discount or offers"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: 4 }}>
                    Payment Mode
                  </label>
                  <select
                    className="form-input"
                    value={bookingForm.paymentStatus}
                    onChange={e => setBookingForm(p => ({ ...p, paymentStatus: e.target.value }))}
                  >
                    <option value="paid_cash">💵 Cash Received</option>
                    <option value="paid_upi">📱 UPI / QR Received</option>
                    <option value="paid_card">💳 Card Received</option>
                    <option value="pending">⏳ Pay Later / Unpaid</option>
                  </select>
                </div>
              </div>

              {/* 6. Execution Choice: Play Live Now vs Reserve Slot */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ marginBottom: 6 }}>
                  Booking Action
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setBookingForm(p => ({ ...p, startSessionNow: true }))}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: bookingForm.startSessionNow ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                      background: bookingForm.startSessionNow ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255,255,255,0.03)',
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🟢</span>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: bookingForm.startSessionNow ? '#10b981' : '#fff' }}>
                        Play Live Now
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                        Starts timer immediately
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookingForm(p => ({ ...p, startSessionNow: false }))}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: !bookingForm.startSessionNow ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.08)',
                      background: !bookingForm.startSessionNow ? 'rgba(147, 51, 234, 0.16)' : 'rgba(255,255,255,0.03)',
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>📅</span>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: !bookingForm.startSessionNow ? 'var(--color-primary-light)' : '#fff' }}>
                        Reserve Slot
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                        Scheduled for selected time
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 7. Handled By */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <UserCheck size={13} style={{ color: 'var(--color-primary)' }} /> Handled by
                </label>
                <div
                  className="form-input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(147, 51, 234, 0.12)',
                    borderColor: 'rgba(147, 51, 234, 0.35)',
                    color: '#fff',
                    fontWeight: 700,
                    height: '38px',
                    fontSize: '0.82rem',
                  }}
                >
                  <span>👤 {formatHandledByName(isStaff ? (currentStaffUser?.name || 'Staff') : 'Super Admin')}</span>
                </div>
              </div>

              {/* 8. Action Buttons */}
              <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowBookingModal(false)}
                  style={{ flex: '0 0 90px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    background: bookingForm.startSessionNow
                      ? 'linear-gradient(135deg, #06b6d4, #10b981)'
                      : 'linear-gradient(135deg, #9333ea, #06b6d4)',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: bookingForm.startSessionNow
                      ? '0 0 20px rgba(6, 182, 212, 0.45)'
                      : '0 0 20px rgba(147, 51, 234, 0.45)',
                  }}
                >
                  {submitting ? 'Saving...' : (
                    <>
                      {bookingForm.startSessionNow ? <Zap size={18} style={{ color: '#ffea79' }} /> : <Calendar size={18} />}
                      <span>
                        {bookingForm.startSessionNow
                          ? `Start Session Now • ₹${bookingForm.totalAmount}`
                          : `Confirm Booking • ₹${bookingForm.totalAmount}`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
