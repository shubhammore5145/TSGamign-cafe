import React, { useState, useEffect } from 'react';
import {
  subscribeToAllBookings,
  subscribeToSetups,
  updateBooking,
  updateSetup,
  createSession,
  addNotification,
  toFirestoreTimestamp,
  tsToDate,
} from '../../firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { Search, Filter } from 'lucide-react';

const STATUS_OPTIONS = ['All', 'pending', 'confirmed', 'active', 'completed', 'cancelled'];

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [setups, setSetups] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const toast = useToast();

  useEffect(() => {
    const unsubs = [
      subscribeToAllBookings(setBookings),
      subscribeToSetups(setSetups),
    ];
    return () => unsubs.forEach(f => f());
  }, []);

  const filtered = bookings.filter(b => {
    const matchStatus = statusFilter === 'All' || b.status === statusFilter;
    const matchDate = !dateFilter || b.date === dateFilter;
    const matchSearch = !search || b.userName?.toLowerCase().includes(search.toLowerCase())
      || b.setupName?.toLowerCase().includes(search.toLowerCase())
      || b.id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchDate && matchSearch;
  });

  const handleStatusChange = async (bookingId, newStatus, booking) => {
    try {
      await updateBooking(bookingId, { status: newStatus });

      if (newStatus === 'confirmed') {
        await addNotification({ userId: booking.userId, type: 'booking_confirmed', message: `Your booking for ${booking.setupName} on ${booking.date} is confirmed!` });
      }

      if (newStatus === 'active') {
        // Create a live session
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + booking.duration * 3600000);
        const setup = setups.find(s => s.id === booking.setupId);

        await createSession({
          bookingId,
          userId: booking.userId,
          userName: booking.userName,
          userImage: booking.userImage || '',
          setupId: booking.setupId,
          setupName: booking.setupName || setup?.name || 'Gaming Setup',
          sessionStartTime: toFirestoreTimestamp(startTime),
          sessionEndTime: toFirestoreTimestamp(endTime),
          duration: booking.duration,
        });

        await updateSetup(booking.setupId, { status: 'occupied' });
        await addNotification({ userId: booking.userId, type: 'session_started', message: `Your session on ${booking.setupName} has started! Enjoy gaming!` });
        toast.success('Session Started', `${booking.userName}'s session is now live!`);
      }

      if (newStatus === 'completed') {
        await updateSetup(booking.setupId, { status: 'available' });
      }

      if (newStatus === 'cancelled') {
        await addNotification({ userId: booking.userId, type: 'booking_cancelled', message: `Your booking for ${booking.setupName} has been cancelled.` });
      }

      toast.success('Updated', `Booking status changed to ${newStatus}.`);
    } catch (err) {
      toast.error('Error', err.message);
    }
  };

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-section-title">All Bookings ({bookings.length})</h2>
      </div>

      {/* Filters */}
      <div className="glass" style={{ padding: 'var(--space-md) var(--space-lg)', marginBottom: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
          <input
            type="text"
            placeholder="Search by name, setup, or booking ID..."
            className="form-input"
            style={{ paddingLeft: '36px', height: '38px' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="admin-bookings-search"
          />
        </div>

        <input
          type="date"
          className="form-input"
          style={{ width: 'auto', height: '38px' }}
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          id="admin-bookings-date-filter"
        />

        <select
          className="form-input"
          style={{ width: 'auto', height: '38px' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          id="admin-bookings-status-filter"
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Customer</th>
              <th>Setup</th>
              <th>Date</th>
              <th>Time</th>
              <th>Duration</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id}>
                <td style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: 'var(--color-primary)' }}>
                  {b.id.slice(0, 8).toUpperCase()}
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{b.userName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{b.userEmail}</div>
                </td>
                <td>{b.setupName}</td>
                <td>{b.date}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{b.startTime} – {b.endTime}</td>
                <td>{b.duration}h</td>
                <td style={{ fontWeight: 700, color: 'var(--color-accent)' }}>₹{b.totalAmount}</td>
                <td><span className={`badge badge-${b.status}`}>{b.status?.toUpperCase()}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {b.status === 'pending' && (
                      <>
                        <button className="btn btn-sm btn-accent" onClick={() => handleStatusChange(b.id, 'confirmed', b)}>Confirm</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleStatusChange(b.id, 'cancelled', b)}>Cancel</button>
                      </>
                    )}
                    {b.status === 'confirmed' && (
                      <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange(b.id, 'active', b)}>▶ Start</button>
                    )}
                    {b.status === 'active' && (
                      <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange(b.id, 'completed', b)}>✓ Complete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>No bookings match your filters.</div>
        )}
      </div>
    </div>
  );
}
