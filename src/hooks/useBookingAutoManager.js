import { useEffect, useRef } from 'react';
import {
  subscribeToAllBookings,
  subscribeToSetups,
  subscribeToAllActiveSessions,
  updateBooking,
  updateSession,
  updateSetup,
  syncMissingCustomersFromBookings,
  tsToDate,
} from '../firebase/firestore';

function timeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getTodayString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Custom hook to automatically monitor bookings and sessions:
 * 1. As soon as a booking's time ends (or past date), marks booking as 'completed'.
 * 2. If a live session's timer expired, marks session as 'completed'.
 * 3. Immediately frees up the PS/console setup (sets status: 'available') if no ongoing sessions or active bookings remain.
 * 4. Ensures finished bookings automatically show in History.
 */
export function useBookingAutoManager() {
  const isRunningRef = useRef(false);
  const hasSyncedCustomersRef = useRef(false);

  useEffect(() => {
    // 0. Once on mount, auto-sync existing bookings into customer profiles with accurate visit counts
    if (!hasSyncedCustomersRef.current) {
      hasSyncedCustomersRef.current = true;
      syncMissingCustomersFromBookings().catch((err) =>
        console.warn('[AutoManager] Historical customer sync error:', err?.message)
      );
    }

    let bookings = [];
    let setups = [];
    let sessions = [];

    const runCheck = async () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;

      try {
        const now = new Date();
        const todayStr = getTodayString(now);
        const currentMins = now.getHours() * 60 + now.getMinutes();

        // 1. Identify expired sessions (sessionEndTime <= now)
        const expiredSessions = sessions.filter((s) => {
          if (!s || s.status === 'completed') return false;
          const end = s.sessionEndTime?.toDate
            ? s.sessionEndTime.toDate()
            : s.sessionEndTime
            ? new Date(s.sessionEndTime)
            : null;
          return end && end.getTime() <= now.getTime();
        });

        for (const s of expiredSessions) {
          try {
            await updateSession(s.id, { status: 'completed' });
          } catch (e) {
            console.warn('[AutoManager] Error completing session:', e?.message);
          }
        }

        // 2. Identify expired bookings (booking time has passed)
        // A booking is expired if:
        // status is not 'completed' and not 'cancelled'
        // AND (date is in the past OR (date is today and currentMins >= endTime in mins))
        const expiredBookings = bookings.filter((b) => {
          if (!b || b.status === 'completed' || b.status === 'cancelled') return false;
          if (!b.date || !b.endTime) return false;

          if (b.date < todayStr) return true;
          if (b.date === todayStr) {
            const endMins = timeToMins(b.endTime);
            return currentMins >= endMins;
          }
          return false;
        });

        for (const b of expiredBookings) {
          try {
            await updateBooking(b.id, { status: 'completed' });

            // Also complete any associated session linked to this booking
            const linkedSession = sessions.find(
              (s) =>
                (s.bookingId === b.id || s.setupId === b.setupId) &&
                s.status !== 'completed'
            );
            if (linkedSession) {
              await updateSession(linkedSession.id, { status: 'completed' });
            }
          } catch (e) {
            console.warn('[AutoManager] Error completing booking:', e?.message);
          }
        }

        // 3. Auto-Free Setups:
        // If a setup is marked 'occupied', check if there are any real, active, unexpired
        // sessions or bookings scheduled right now on this setup.
        // If none remain, free the console by setting status to 'available'!
        for (const setup of setups) {
          if (setup.status !== 'occupied') continue;

          // Check for ongoing, unexpired sessions
          const hasLiveSession = sessions.some((s) => {
            if (s.setupId !== setup.id || s.status === 'completed') return false;
            const end = s.sessionEndTime?.toDate
              ? s.sessionEndTime.toDate()
              : s.sessionEndTime
              ? new Date(s.sessionEndTime)
              : null;
            return !end || end.getTime() > now.getTime();
          });

          // Check for active bookings occurring right now today
          const hasLiveBooking = bookings.some((b) => {
            if (b.setupId !== setup.id) return false;
            if (b.status === 'completed' || b.status === 'cancelled') return false;
            if (b.date !== todayStr) return false;
            const startMins = timeToMins(b.startTime);
            const endMins = timeToMins(b.endTime);
            return currentMins >= startMins && currentMins < endMins;
          });

          if (!hasLiveSession && !hasLiveBooking) {
            try {
              await updateSetup(setup.id, { status: 'available' });
            } catch (e) {
              console.warn('[AutoManager] Error freeing setup:', e?.message);
            }
          }
        }
      } catch (err) {
        console.error('[AutoManager] Cycle error:', err);
      } finally {
        isRunningRef.current = false;
      }
    };

    const unsubBookings = subscribeToAllBookings((data) => {
      bookings = data || [];
      runCheck();
    });

    const unsubSetups = subscribeToSetups((data) => {
      setups = data || [];
    });

    const unsubSessions = subscribeToAllActiveSessions((data) => {
      sessions = data || [];
      runCheck();
    });

    // Check periodically every 10 seconds for real-time console release
    const interval = setInterval(runCheck, 10000);

    return () => {
      clearInterval(interval);
      unsubBookings && unsubBookings();
      unsubSetups && unsubSetups();
      unsubSessions && unsubSessions();
    };
  }, []);
}

