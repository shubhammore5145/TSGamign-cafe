import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  subscribeToAllBookings,
  subscribeToSetups,
  subscribeToAllActiveSessions,
  createBooking,
  updateBooking,
  deleteBooking,
  createSession,
  updateSession,
  updateSetup,
  toFirestoreTimestamp,
} from '../../firebase/firestore';
import { useToast } from '../../context/ToastContext';
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
} from 'lucide-react';

// ── Fixed 1-Hour Slots up to Closing Time (10:00 PM) ──
export const ONE_HOUR_SLOTS = [
  { id: '09:00', start: '09:00', end: '10:00', label: '09:00 AM - 10:00 AM', short: '9 - 10 AM' },
  { id: '10:00', start: '10:00', end: '11:00', label: '10:00 AM - 11:00 AM', short: '10 - 11 AM' },
  { id: '11:00', start: '11:00', end: '12:00', label: '11:00 AM - 12:00 PM', short: '11 - 12 PM' },
  { id: '12:00', start: '12:00', end: '13:00', label: '12:00 PM - 01:00 PM', short: '12 - 1 PM' },
  { id: '13:00', start: '13:00', end: '14:00', label: '01:00 PM - 02:00 PM', short: '1 - 2 PM' },
  { id: '14:00', start: '14:00', end: '15:00', label: '02:00 PM - 03:00 PM', short: '2 - 3 PM' },
  { id: '15:00', start: '15:00', end: '16:00', label: '03:00 PM - 04:00 PM', short: '3 - 4 PM' },
  { id: '16:00', start: '16:00', end: '17:00', label: '04:00 PM - 05:00 PM', short: '4 - 5 PM' },
  { id: '17:00', start: '17:00', end: '18:00', label: '05:00 PM - 06:00 PM', short: '5 - 6 PM' },
  { id: '18:00', start: '18:00', end: '19:00', label: '06:00 PM - 07:00 PM', short: '6 - 7 PM' },
  { id: '19:00', start: '19:00', end: '20:00', label: '07:00 PM - 08:00 PM', short: '7 - 8 PM' },
  { id: '20:00', start: '20:00', end: '21:00', label: '08:00 PM - 09:00 PM', short: '8 - 9 PM' },
  { id: '21:00', start: '21:00', end: '22:00', label: '09:00 PM - 10:00 PM', short: '9 - 10 PM (Closing)' },
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

function formatTime12h(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSlotDetailsModal, setShowSlotDetailsModal] = useState(false);
  const [selectedSlotBooking, setSelectedSlotBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
  };
  const [formData, setFormData] = useState(initialForm);

  const toast = useToast();

  useEffect(() => {
    const unsubs = [
      subscribeToAllBookings(setBookings),
      subscribeToSetups(setSetups),
      subscribeToAllActiveSessions(setActiveSessions),
    ];
    return () => unsubs.forEach(f => f && f());
  }, []);

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
    } else if (range === 'afternoon') {
      matrixContainerRef.current.scrollTo({ left: 330, behavior: 'smooth' });
    } else if (range === 'evening') {
      matrixContainerRef.current.scrollTo({ left: 700, behavior: 'smooth' });
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

  // Open Add Modal directly for a specific console & slot
  const openDirectBookingForSlot = (setup, slot) => {
    const rate = setup.pricePerHour || 100;
    setFormData({
      ...initialForm,
      date: dateFilter || getTodayString(),
      setupId: setup.id,
      setupName: setup.name,
      selectedSlots: [slot.id],
      startTime: slot.start,
      endTime: slot.end,
      duration: 1,
      hourlyRate: rate,
      totalAmount: rate,
      status: 'confirmed',
    });
    setShowAddModal(true);
  };

  // Open standard Add Modal
  const openAddModal = () => {
    const firstAvailable = setups.find(s => s.status === 'available') || setups[0];
    const rate = firstAvailable?.pricePerHour || 100;
    const defaultSlot = ONE_HOUR_SLOTS[1];

    setFormData({
      ...initialForm,
      date: dateFilter || getTodayString(),
      setupId: firstAvailable?.id || '',
      setupName: firstAvailable?.name || '',
      hourlyRate: rate,
      totalAmount: rate,
      selectedSlots: [defaultSlot.id],
      startTime: defaultSlot.start,
      endTime: defaultSlot.end,
      duration: 1,
    });
    setShowAddModal(true);
  };

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
    });
    setShowSlotDetailsModal(false);
    setShowEditModal(true);
  };

  // Submit New Booking
  const handleCreateBookingSubmit = async (e) => {
    e.preventDefault();
    if (!formData.userName.trim()) {
      return toast.error('Validation Error', 'Customer Name is required.');
    }
    if (!formData.setupId) {
      return toast.error('Validation Error', 'Please select a PlayStation Setup.');
    }
    if (!formData.selectedSlots || formData.selectedSlots.length === 0) {
      return toast.error('Validation Error', 'Please select at least one 1-Hour Time Slot.');
    }

    setSubmitting(true);
    try {
      const setup = setups.find(s => s.id === formData.setupId);

      const payload = {
        userId: 'admin-walkin',
        userName: formData.userName.trim(),
        userPhone: formData.userPhone.trim(),
        userEmail: formData.userEmail.trim(),
        setupId: formData.setupId,
        setupName: formData.setupName || setup?.name || 'PlayStation Console',
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        duration: Number(formData.duration),
        hourlyRate: Number(formData.hourlyRate),
        totalAmount: Number(formData.totalAmount),
        paymentStatus: formData.paymentStatus,
        status: formData.status,
        notes: formData.notes.trim(),
        createdBy: 'admin',
      };

      const docRef = await createBooking(payload);

      if (formData.status === 'active') {
        const now = new Date();
        const sessionEnd = new Date(now.getTime() + Number(formData.duration) * 3600000);

        await createSession({
          bookingId: docRef.id,
          userId: 'admin-walkin',
          userName: formData.userName.trim(),
          userPhone: formData.userPhone.trim(),
          userImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.userName.trim())}&background=9333ea&color=fff`,
          setupId: formData.setupId,
          setupName: formData.setupName || setup?.name || 'PlayStation Console',
          sessionStartTime: toFirestoreTimestamp(now),
          sessionEndTime: toFirestoreTimestamp(sessionEnd),
          duration: Number(formData.duration),
        });

        await updateSetup(formData.setupId, { status: 'occupied' });
        toast.success('Live Session Started!', `🎮 ${formData.userName} is now live on ${payload.setupName}!`);
      } else {
        toast.success('Slot Booked!', `Slot ${formatTime12h(formData.startTime)} - ${formatTime12h(formData.endTime)} booked for ${formData.userName}!`);
      }

      setShowAddModal(false);
    } catch (err) {
      toast.error('Booking Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Update Booking
  const handleUpdateBookingSubmit = async (e) => {
    e.preventDefault();
    if (!editingBooking) return;

    setSubmitting(true);
    try {
      const setup = setups.find(s => s.id === formData.setupId);

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
        b.id?.toLowerCase().includes(q);
      return matchStatus && matchDate && matchSearch;
    });
  }, [bookings, statusFilter, dateFilter, search]);

  return (
    <div>
      {/* ── Sleek, Mobile-First Header Bar ── */}
      <div className="admin-section-header" style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Gamepad2 size={22} style={{ color: 'var(--color-primary)' }} />
              PlayStation 1-Hour Slots
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <span>🟢 Free (Book)</span>
              <span>·</span>
              <span>🔴 Booked (Edit/Cancel)</span>
              <span>·</span>
              <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                {activeBookingsCount} Playing Now
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* View Mode Toggle: Board vs List */}
            <div style={{ display: 'flex', background: 'var(--color-surface)', padding: 2, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setViewMode('board')}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  background: viewMode === 'board' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'board' ? '#fff' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <LayoutGrid size={13} /> Slots
              </button>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  background: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'table' ? '#fff' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <List size={13} /> List
              </button>
            </div>

            {/* Direct Book Button */}
            <button
              className="btn btn-primary btn-sm"
              onClick={openAddModal}
              id="admin-new-booking-btn"
              style={{ padding: '7px 14px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              <Plus size={15} /> + Book Slot
            </button>
          </div>
        </div>
      </div>

      {/* ── Single Clean Date & Time Control Bar ── */}
      <div
        className="glass"
        style={{
          padding: '8px 12px',
          marginBottom: '10px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Row 1: Back Day, Today, Next Day & Date Picker */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handlePrevDay}
              style={{ padding: '5px 8px', fontSize: '0.78rem', fontWeight: 700 }}
              title="Go to Previous Day"
            >
              <ChevronLeft size={15} /> Back
            </button>
            <button
              type="button"
              className={`btn btn-sm ${dateFilter === todayStr ? 'btn-primary' : 'btn-ghost'}`}
              onClick={handleToday}
              style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 800 }}
            >
              Today
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleNextDay}
              style={{ padding: '5px 8px', fontSize: '0.78rem', fontWeight: 700 }}
              title="Go to Next Day"
            >
              Next <ChevronRight size={15} />
            </button>

            <input
              type="date"
              className="form-input"
              style={{ width: 'auto', maxWidth: '135px', height: '32px', padding: '2px 6px', fontSize: '0.78rem', fontWeight: 700 }}
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
              📅 {getFormattedDateTitle(dateFilter)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>
              (₹{todayRevenue})
            </span>
          </div>
        </div>

        {/* Row 2: Time Jumps & Quick Scroll (Board Mode only) */}
        {viewMode === 'board' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'nowrap' }}>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', flexShrink: 1 }}>
              <button
                type="button"
                className={`admin-time-jump-pill ${activeTimeRange === 'morning' ? 'active' : ''}`}
                onClick={() => scrollToRange('morning')}
              >
                🌅 9-1
              </button>
              <button
                type="button"
                className={`admin-time-jump-pill ${activeTimeRange === 'afternoon' ? 'active' : ''}`}
                onClick={() => scrollToRange('afternoon')}
              >
                ☀️ 1-5
              </button>
              <button
                type="button"
                className={`admin-time-jump-pill ${activeTimeRange === 'evening' ? 'active' : ''}`}
                onClick={() => scrollToRange('evening')}
              >
                🌙 5-10
              </button>
              <button
                type="button"
                className={`admin-time-jump-pill ${activeTimeRange === 'all' ? 'active' : ''}`}
                onClick={() => scrollToRange('all')}
              >
                ⚡ All
              </button>
            </div>

            <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
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
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════
          MODE 1: 1-HOUR LIVE SLOT BOARD (SLOT GRID TIMELINE)
         ═════════════════════════════════════════════════════════════ */}
      {viewMode === 'board' && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          {/* Matrix Container with mouse-wheel, touch drag & smooth scroll */}
          <div
            className="admin-matrix-container glass"
            ref={matrixContainerRef}
            onWheel={handleMatrixWheel}
          >
            <div className="admin-matrix-inner">
              {/* Sticky Top Time Slots Header Row */}
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
              {setups.map(setup => (
                <div key={setup.id} className="admin-matrix-row">
                  {/* Console Info Column (Sticky on left, compact on phone) */}
                  <div className="admin-matrix-console-col">
                    <div className="console-name" style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Gamepad2 size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
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
                      const booked = getBookingForSlot(slot, setup.id, dateFilter || todayStr, bookings);
                      const isBooked = !!booked;

                      return (
                        <div
                          key={slot.id}
                          className={`admin-matrix-slot-cell ${isBooked ? 'admin-matrix-slot-cell--booked' : 'admin-matrix-slot-cell--free'}`}
                          onClick={() => {
                            if (isBooked) {
                              setSelectedSlotBooking({ booking: booked, setup, slot });
                              setShowSlotDetailsModal(true);
                            } else {
                              openDirectBookingForSlot(setup, slot);
                            }
                          }}
                          title={isBooked ? `Booked by: ${booked.userName} — Click to Edit or Cancel` : `Click to book ${slot.label} on ${setup.name}`}
                        >
                          <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>{slot.short}</div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '84px', whiteSpace: 'nowrap' }}>
                            {isBooked ? `🔴 ${booked.userName?.split(' ')[0]}` : '🟢 + Book'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

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
          MODE 2: ALL BOOKINGS LIST & TABLE VIEW
         ═════════════════════════════════════════════════════════════ */}
      {viewMode === 'table' && (
        <>
          {/* Status filter tabs */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: 'var(--space-md)',
              overflowX: 'auto',
              paddingBottom: '4px',
            }}
          >
            {STATUS_TABS.map(tab => {
              const count = tab.id === 'All'
                ? bookings.length
                : bookings.filter(b => b.status === tab.id).length;
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                    background: isActive ? 'var(--color-primary-dim)' : 'var(--color-surface)',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      background: isActive ? 'rgba(147, 51, 234, 0.3)' : 'rgba(255,255,255,0.08)',
                      color: isActive ? '#fff' : 'var(--color-text-dim)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bookings Table */}
          <div className="glass admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>PlayStation Console</th>
                  <th>Date & 1-Hour Slot</th>
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
                        background: isLive ? 'rgba(6, 182, 212, 0.04)' : undefined,
                      }}
                    >
                      <td style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: 'var(--color-primary)' }}>
                        #{b.id.slice(0, 6).toUpperCase()}
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                          {b.userName || 'Walk-in Gamer'}
                        </div>
                        {b.userPhone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            <Phone size={11} style={{ color: 'var(--color-primary)' }} />
                            <a href={`tel:${b.userPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {b.userPhone}
                            </a>
                            <a
                              href={`https://wa.me/91${b.userPhone.replace(/\D/g, '')}`}
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
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Gamepad2 size={15} style={{ color: 'var(--color-primary)' }} />
                          <span style={{ fontWeight: 600 }}>{b.setupName || 'PlayStation'}</span>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.date}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 700 }}>
                          {formatTime12h(b.startTime)} – {formatTime12h(b.endTime)}
                        </div>
                      </td>

                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.85rem' }}>
                          {b.duration}h
                        </span>
                      </td>

                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--color-accent)', fontSize: '0.95rem' }}>
                          ₹{b.totalAmount || 0}
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600,
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
                            letterSpacing: '0.05em',
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
                              className="btn btn-sm btn-primary"
                              onClick={() => handleStartSession(b)}
                              title="Start live session on this console"
                            >
                              <Play size={12} /> Start
                            </button>
                          )}

                          {b.status === 'active' && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleCompleteBooking(b)}
                              title="Complete session and free console"
                            >
                              <CheckCircle size={12} /> Complete
                            </button>
                          )}

                          {b.status !== 'completed' && b.status !== 'cancelled' && (
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleCancelBooking(b)}
                              title="Cancel booking and free slot"
                              style={{ color: 'var(--color-danger)' }}
                            >
                              <XCircle size={14} />
                            </button>
                          )}

                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => openEditModal(b)}
                            title="Edit Booking"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
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

            {filteredBookings.length === 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-muted)' }}>
                <Gamepad2 size={44} style={{ margin: '0 auto var(--space-md)', color: 'var(--color-text-dim)' }} />
                <h3 style={{ marginBottom: '8px' }}>No Bookings Found</h3>
                <p style={{ marginBottom: 'var(--space-lg)' }}>
                  {search || dateFilter || statusFilter !== 'All'
                    ? 'No bookings match your current filters.'
                    : 'No PlayStation bookings added yet.'}
                </p>
                <button className="btn btn-primary btn-sm" onClick={openAddModal}>
                  <Plus size={16} /> + Direct Book Slot
                </button>
              </div>
            )}
          </div>
        </>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      📞 {selectedSlotBooking.booking.userPhone}
                    </span>
                    <a
                      href={`tel:${selectedSlotBooking.booking.userPhone}`}
                      className="btn btn-sm btn-ghost"
                      style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    >
                      Call
                    </a>
                    <a
                      href={`https://wa.me/91${selectedSlotBooking.booking.userPhone.replace(/\D/g, '')}`}
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
          ADD BOOKING MODAL WITH 1-HOUR SLOT SELECTION
         ═════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
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
                  <Gamepad2 size={22} style={{ color: 'var(--color-primary)' }} />
                  Direct PlayStation Slot Booking
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Select a 1-hour slot and click Direct Book
                </span>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBookingSubmit}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-md)',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  paddingRight: '6px',
                }}
              >
                {/* Console & Date Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-md)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      PlayStation Console <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <select
                      className="form-input"
                      value={formData.setupId}
                      onChange={e => handleSetupSelect(e.target.value)}
                      required
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
                      required
                    />
                  </div>
                </div>

                {/* ── 1-Hour Time Slots Grid ── */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      ⚡ Select 1-Hour Time Slot <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 700 }}>
                      Selected: {formatTime12h(formData.startTime)} – {formatTime12h(formData.endTime)} ({formData.duration} hr)
                    </span>
                  </div>

                  <div className="admin-slot-grid">
                    {ONE_HOUR_SLOTS.map(slot => {
                      const booked = getBookingForSlot(slot, formData.setupId, formData.date, bookings);
                      const isBooked = !!booked;
                      const isSelected = formData.selectedSlots.includes(slot.id);

                      let btnClass = 'admin-slot-btn--available';
                      if (isBooked) btnClass = 'admin-slot-btn--booked';
                      else if (isSelected) btnClass = 'admin-slot-btn--selected';

                      return (
                        <button
                          type="button"
                          key={slot.id}
                          className={`admin-slot-btn ${btnClass}`}
                          onClick={() => handleSlotClick(slot)}
                          disabled={isBooked}
                        >
                          <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{slot.short}</div>
                          <div style={{ fontSize: '0.65rem' }}>
                            {isSelected ? '✓ SELECTED' : isBooked ? `🔴 ${booked.userName?.split(' ')[0]}` : '🟢 FREE'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Details Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Customer Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Rahul Sharma"
                      value={formData.userName}
                      onChange={e => setFormData(p => ({ ...p, userName: e.target.value }))}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone Number (Calling / WhatsApp)</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 9876543210"
                      value={formData.userPhone}
                      onChange={e => setFormData(p => ({ ...p, userPhone: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Pricing & Payment Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 'var(--space-md)',
                    padding: 'var(--space-md)',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Rate / Hour (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.hourlyRate}
                      min={0}
                      onChange={e => {
                        const rate = Number(e.target.value);
                        setFormData(p => ({
                          ...p,
                          hourlyRate: rate,
                          totalAmount: Math.round(rate * Number(p.duration)),
                        }));
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Total Amount (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.totalAmount}
                      min={0}
                      onChange={e => setFormData(p => ({ ...p, totalAmount: Number(e.target.value) }))}
                      style={{
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        color: 'var(--color-accent)',
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Payment Mode</label>
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
                </div>

                {/* Action & Notes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-md)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Booking Action</label>
                      <span style={{ fontSize: '0.72rem', color: formData.status === 'active' ? '#06b6d4' : formData.status === 'confirmed' ? '#22c55e' : '#f59e0b', fontWeight: 800 }}>
                        {formData.status === 'active' ? '⚡ Starts Live Session Now' : formData.status === 'confirmed' ? '✓ Slot Reserved (Confirmed)' : '⏳ Awaiting Confirmation'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <button
                        type="button"
                        className={`admin-action-chip ${formData.status === 'confirmed' ? 'admin-action-chip--confirmed' : ''}`}
                        onClick={() => setFormData(p => ({ ...p, status: 'confirmed' }))}
                      >
                        📅 Confirmed (Reserved)
                      </button>
                      <button
                        type="button"
                        className={`admin-action-chip ${formData.status === 'active' ? 'admin-action-chip--active' : ''}`}
                        onClick={() => setFormData(p => ({ ...p, status: 'active' }))}
                      >
                        🟢 Play Now (Live)
                      </button>
                      <button
                        type="button"
                        className={`admin-action-chip ${formData.status === 'pending' ? 'admin-action-chip--pending' : ''}`}
                        onClick={() => setFormData(p => ({ ...p, status: 'pending' }))}
                      >
                        ⏳ Pending
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Notes (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 2 Controllers, FIFA player"
                      value={formData.notes}
                      onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-sm)',
                  marginTop: 'var(--space-lg)',
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: 'var(--space-md)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary full-width"
                  disabled={submitting}
                  id="admin-create-booking-submit"
                >
                  {submitting
                    ? 'Booking...'
                    : formData.status === 'active'
                    ? '▶ Direct Book & Start Session'
                    : '⚡ Direct Book 1-Hour Slot'}
                </button>
              </div>
            </form>
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

                      let btnClass = 'admin-slot-btn--available';
                      if (isBookedByOther) btnClass = 'admin-slot-btn--booked';
                      else if (isSelected) btnClass = 'admin-slot-btn--selected';

                      return (
                        <button
                          type="button"
                          key={slot.id}
                          className={`admin-slot-btn ${btnClass}`}
                          onClick={() => handleEditSlotClick(slot)}
                          disabled={isBookedByOther}
                        >
                          <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{slot.short}</div>
                          <div style={{ fontSize: '0.65rem' }}>
                            {isSelected ? '✓ CURRENT' : isBookedByOther ? `🔴 ${booked.userName?.split(' ')[0]}` : '🟢 FREE'}
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

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  />
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
    </div>
  );
}
