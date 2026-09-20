import { useState, useEffect, useRef } from 'react';
import { tsToDate } from '../firebase/firestore';

/**
 * Reliable session countdown hook.
 * Source of truth: Firestore sessionEndTime timestamp.
 * Remaining = sessionEndTime - Date.now() — survives refresh/reconnect.
 *
 * @param {Object|null} session - Firestore session document
 * @param {Function} onAlert - (alertType: '10min'|'5min'|'ended') => void
 */
export function useSessionTimer(session, onAlert) {
  const [times, setTimes] = useState({ remaining: null, elapsed: null });
  const alertFired = useRef({ tenMin: false, fiveMin: false, ended: false });

  useEffect(() => {
    if (!session) {
      setTimes({ remaining: null, elapsed: null });
      alertFired.current = { tenMin: false, fiveMin: false, ended: false };
      return;
    }

    // Reset alert flags when session changes
    alertFired.current = {
      tenMin: session.alerts?.tenMin || false,
      fiveMin: session.alerts?.fiveMin || false,
      ended: session.status === 'completed',
    };

    if (session.status === 'paused') {
      // If paused, just return the static stored times
      setTimes({
        remaining: session.remainingMs || 0,
        elapsed: session.elapsedMs || 0,
      });
      return; // Do not start interval
    }

    const endTime = tsToDate(session.sessionEndTime);
    const startTime = tsToDate(session.sessionStartTime);
    
    if (!endTime || !startTime) return;

    const tick = () => {
      const now = Date.now();
      const rem = endTime.getTime() - now;
      const elap = now - startTime.getTime();
      
      setTimes({ remaining: rem, elapsed: elap });

      if (rem <= 600_000 && rem > 300_000 && !alertFired.current.tenMin) {
        alertFired.current.tenMin = true;
        onAlert?.('10min');
      }
      if (rem <= 300_000 && rem > 0 && !alertFired.current.fiveMin) {
        alertFired.current.fiveMin = true;
        onAlert?.('5min');
      }
      if (rem <= 0 && !alertFired.current.ended) {
        alertFired.current.ended = true;
        onAlert?.('ended');
      }
    };

    tick(); // immediate
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session, onAlert]);

  return times;
}

/**
 * Formats milliseconds to HH:MM:SS string.
 */
export function formatTime(ms) {
  if (ms === null || ms === undefined) return '--:--:--';
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}
