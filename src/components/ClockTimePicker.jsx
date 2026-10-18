import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import './ClockTimePicker.css';

/**
 * Material Analog Circular Clock Dial Time Picker
 * Matches the user's reference screenshot with 100% fidelity:
 * - Outline input labeled "With Time Clock" with "11:00 AM" and clock icon
 * - Popover dialog with gray circular clock face
 * - Radial hours (1..12) and minutes (00..55)
 * - Blue hand line with center dot and circular knob over selected number
 * - '<' and '>' arrows for toggling hour / minute modes
 * - Bottom AM/PM pill toggle & flat blue OK action
 * - Supports touch / mouse drag & click on dial
 */
export default function ClockTimePicker({
  value = '11:00',
  onChange,
  label = 'With Time Clock',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [clockMode, setClockMode] = useState('hours'); // 'hours' | 'minutes'
  const isDraggingRef = useRef(false);
  const containerRef = useRef(null);
  const dialRef = useRef(null);

  // Parse 24h string "HH:mm" into 12h parts
  const parseTime = useCallback((time24) => {
    if (!time24) {
      const now = new Date();
      const curH = now.getHours();
      const curM = String(now.getMinutes()).padStart(2, '0');
      return {
        hour: curH % 12 || 12,
        minute: curM,
        period: curH >= 12 ? 'PM' : 'AM',
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
  }, []);

  const [timeState, setTimeState] = useState(() => parseTime(value));

  // Sync internal state when external value changes
  useEffect(() => {
    setTimeState(parseTime(value));
  }, [value, parseTime]);

  // Convert 12h parts to 24h string and emit
  const emitChange = (h12, mStr, pStr) => {
    let h = Number(h12) || 12;
    const period = (pStr || 'AM').toUpperCase();
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const time24 = `${String(h).padStart(2, '0')}:${String(mStr || '00').padStart(2, '0')}`;
    if (onChange) {
      onChange(time24);
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle Hour selection
  const handleSelectHour = (hr, autoAdvance = true) => {
    const nextState = { ...timeState, hour: hr };
    setTimeState(nextState);
    emitChange(hr, nextState.minute, nextState.period);
    if (autoAdvance) {
      setClockMode('minutes');
    }
  };

  // Handle Minute selection
  const handleSelectMinute = (minStr) => {
    const nextState = { ...timeState, minute: minStr };
    setTimeState(nextState);
    emitChange(nextState.hour, minStr, nextState.period);
  };

  // Handle AM/PM change
  const handleSelectPeriod = (newPeriod) => {
    const nextState = { ...timeState, period: newPeriod };
    setTimeState(nextState);
    emitChange(nextState.hour, nextState.minute, newPeriod);
  };

  // Dial geometry calculations
  const dialRadius = 125;
  const numberRadius = 90;
  const cx = dialRadius;
  const cy = dialRadius;

  // Calculate angle from client coordinates relative to dial center
  const updateAngleFromCoords = (clientX, clientY, autoAdvance = false) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    const angleRad = Math.atan2(dx, -dy);
    let angleDeg = (angleRad * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    if (clockMode === 'hours') {
      let hr = Math.round(angleDeg / 30) % 12;
      if (hr === 0) hr = 12;
      handleSelectHour(hr, autoAdvance);
    } else {
      let minVal = (Math.round(angleDeg / 6) % 60);
      // Snap to nearest 5 or allow exact minute
      const roundedMin = (Math.round(angleDeg / 30) * 5) % 60;
      handleSelectMinute(String(roundedMin).padStart(2, '0'));
    }
  };

  // Dial mouse & touch event listeners for click + drag
  const handleDialPointerDown = (e) => {
    isDraggingRef.current = true;
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    updateAngleFromCoords(clientX, clientY, false);
  };

  const handleDialPointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    updateAngleFromCoords(clientX, clientY, false);
  };

  const handleDialPointerUp = (e) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (clockMode === 'hours') {
        // Auto switch to minutes after releasing hour pointer
        setClockMode('minutes');
      }
    }
  };

  // Hand angle calculation
  const handAngle = clockMode === 'hours'
    ? (timeState.hour % 12) * 30
    : (Number(timeState.minute) / 60) * 360;

  // Knob center coordinate
  const handRad = (handAngle * Math.PI) / 180;
  const knobX = cx + numberRadius * Math.sin(handRad);
  const knobY = cy - numberRadius * Math.cos(handRad);

  // Formatted display: e.g. "11:00 AM"
  const formattedDisplay = `${String(timeState.hour).padStart(2, '0')}:${String(timeState.minute).padStart(2, '0')} ${timeState.period}`;

  return (
    <div className="material-clock-picker-wrap" ref={containerRef}>
      {/* ── Input Box Matching Screenshot Style ── */}
      <div
        className={`material-clock-input ${isOpen ? 'material-clock-input--active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <span className="material-clock-label-cutout">{label}</span>
        <span className="material-clock-display-text">{formattedDisplay}</span>
        <span className="material-clock-icon-wrap">
          <Clock size={19} />
        </span>
      </div>

      {/* ── Popover Dialog Matching Screenshot ── */}
      {isOpen && (
        <div className="material-clock-popover" onClick={(e) => e.stopPropagation()}>
          {/* Top navigation row with mode indicator & arrows */}
          <div className="material-clock-top-nav">
            <div className="material-clock-mode-label">
              <button
                type="button"
                className={`mode-tab ${clockMode === 'hours' ? 'active' : ''}`}
                onClick={() => setClockMode('hours')}
              >
                {String(timeState.hour).padStart(2, '0')}
              </button>
              <span className="mode-sep">:</span>
              <button
                type="button"
                className={`mode-tab ${clockMode === 'minutes' ? 'active' : ''}`}
                onClick={() => setClockMode('minutes')}
              >
                {String(timeState.minute).padStart(2, '0')}
              </button>
              <span className="mode-desc">
                ({clockMode === 'hours' ? 'Hours' : 'Minutes'})
              </span>
            </div>

            {/* < and > chevron arrows matching screenshot */}
            <div className="material-clock-nav-chevrons">
              <button
                type="button"
                className={`chevron-btn ${clockMode === 'hours' ? 'disabled' : ''}`}
                onClick={() => setClockMode('hours')}
                title="Select Hours"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className={`chevron-btn ${clockMode === 'minutes' ? 'disabled' : ''}`}
                onClick={() => setClockMode('minutes')}
                title="Select Minutes"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Circular Analog Clock Dial Face */}
          <div className="material-clock-dial-container">
            <div
              className="material-clock-dial-face"
              ref={dialRef}
              onMouseDown={handleDialPointerDown}
              onMouseMove={handleDialPointerMove}
              onMouseUp={handleDialPointerUp}
              onTouchStart={handleDialPointerDown}
              onTouchMove={handleDialPointerMove}
              onTouchEnd={handleDialPointerUp}
              style={{ width: dialRadius * 2, height: dialRadius * 2 }}
            >
              {/* SVG Clock Hand & Center Pivot */}
              <svg
                className="material-clock-hand-svg"
                width={dialRadius * 2}
                height={dialRadius * 2}
              >
                {/* Hand pointer line */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={knobX}
                  y2={knobY}
                  stroke="#1976d2"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Center pivot dot */}
                <circle cx={cx} cy={cy} r="3.5" fill="#1976d2" />
              </svg>

              {/* Blue selection knob circle over selected number */}
              <div
                className="material-clock-selection-knob"
                style={{
                  left: `${knobX}px`,
                  top: `${knobY}px`,
                }}
              />

              {/* Dial Radial Numbers */}
              {clockMode === 'hours'
                ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hr) => {
                    const angle = (hr % 12) * 30;
                    const rad = (angle * Math.PI) / 180;
                    const numX = cx + numberRadius * Math.sin(rad);
                    const numY = cy - numberRadius * Math.cos(rad);
                    const isSelected = timeState.hour === hr;

                    return (
                      <div
                        key={hr}
                        className={`material-clock-number ${isSelected ? 'selected' : ''}`}
                        style={{
                          left: `${numX}px`,
                          top: `${numY}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectHour(hr, true);
                        }}
                      >
                        {hr}
                      </div>
                    );
                  })
                : ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(
                    (minStr, idx) => {
                      const angle = idx * 30;
                      const rad = (angle * Math.PI) / 180;
                      const numX = cx + numberRadius * Math.sin(rad);
                      const numY = cy - numberRadius * Math.cos(rad);
                      const isSelected = Number(timeState.minute) === Number(minStr);

                      return (
                        <div
                          key={minStr}
                          className={`material-clock-number ${isSelected ? 'selected' : ''}`}
                          style={{
                            left: `${numX}px`,
                            top: `${numY}px`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectMinute(minStr);
                          }}
                        >
                          {minStr}
                        </div>
                      );
                    }
                  )}
            </div>
          </div>

          {/* Bottom Row matching screenshot: AM (blue circle) / PM, and OK text button */}
          <div className="material-clock-bottom-bar">
            {/* AM / PM Pills */}
            <div className="material-clock-ampm-row">
              <button
                type="button"
                className={`ampm-circle-pill ${timeState.period === 'AM' ? 'active' : ''}`}
                onClick={() => handleSelectPeriod('AM')}
              >
                AM
              </button>
              <button
                type="button"
                className={`ampm-circle-pill ${timeState.period === 'PM' ? 'active' : ''}`}
                onClick={() => handleSelectPeriod('PM')}
              >
                PM
              </button>
            </div>

            {/* OK and Cancel Action */}
            <div className="material-clock-actions">
              <button
                type="button"
                className="material-action-btn cancel"
                onClick={() => setIsOpen(false)}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="material-action-btn ok"
                onClick={() => setIsOpen(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
