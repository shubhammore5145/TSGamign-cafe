import React, { useState, useEffect, useRef } from 'react';
import { Clock, Check, RefreshCw, X, ChevronUp, ChevronDown } from 'lucide-react';
import './SimpleWatchPicker.css';

// Convert 24h string "HH:mm" to 12h parts { hour: 11, minute: "45", period: "PM" }
function parse24to12(time24) {
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
}

// Convert 12h parts to 24h string "HH:mm"
function format12to24(hour12, minute, period) {
  let h = Number(hour12) || 12;
  const p = (period || 'PM').toUpperCase();
  if (p === 'PM' && h < 12) h += 12;
  if (p === 'AM' && h === 12) h = 0;
  const m = String(minute !== undefined ? minute : '00').padStart(2, '0');
  return `${String(h).padStart(2, '0')}:${m}`;
}

export default function SimpleWatchPicker({
  value = '12:00',
  onChange,
  className = '',
  buttonLabel = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('hours'); // 'hours' | 'minutes'
  const containerRef = useRef(null);

  const { hour, minute, period } = parse24to12(value);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen]);

  const updateTime = (nextHour, nextMinute, nextPeriod) => {
    const h = nextHour !== undefined ? nextHour : hour;
    const m = nextMinute !== undefined ? nextMinute : minute;
    const p = nextPeriod !== undefined ? nextPeriod : period;
    const time24 = format12to24(h, m, p);
    onChange && onChange(time24);
  };

  const handleSelectHour = (h) => {
    updateTime(h, minute, period);
    setViewMode('minutes'); // auto-advance to minutes
  };

  const handleSelectMinute = (m) => {
    const mStr = String(m).padStart(2, '0');
    updateTime(hour, mStr, period);
  };

  const handleTogglePeriod = (p) => {
    updateTime(hour, minute, p);
  };

  const handleSetNow = () => {
    const now = new Date();
    const curH = now.getHours();
    const curM = String(now.getMinutes()).padStart(2, '0');
    const time24 = `${String(curH).padStart(2, '0')}:${curM}`;
    onChange && onChange(time24);
  };

  const stepHour = (delta) => {
    let nextH = hour + delta;
    if (nextH > 12) nextH = 1;
    if (nextH < 1) nextH = 12;
    updateTime(nextH, minute, period);
  };

  const stepMinute = (delta) => {
    let m = Number(minute) || 0;
    m = (m + delta + 60) % 60;
    updateTime(hour, String(m).padStart(2, '0'), period);
  };

  // Clock Hand Angles
  const minuteNum = Number(minute) || 0;
  const hourAngle = (hour % 12) * 30 + (minuteNum / 60) * 30;
  const minuteAngle = minuteNum * 6;

  // Numbers 1 to 12 coordinates around clock circle
  const radius = 68;
  const cx = 85;
  const cy = 85;
  const clockNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  // Friendly English period label
  const friendlyPeriod = (() => {
    let partOfDay = 'Morning';
    if (period === 'PM') {
      if (hour === 12 || hour < 4) partOfDay = 'Afternoon';
      else if (hour < 8) partOfDay = 'Evening';
      else partOfDay = 'Night';
    } else {
      if (hour >= 4 && hour < 12) partOfDay = 'Morning';
      else partOfDay = 'Early Morning';
    }
    return `${partOfDay} ${hour}:${minute} ${period}`;
  })();

  return (
    <div className={`simple-watch-container ${className}`} ref={containerRef}>
      {/* ── Main Watch Trigger Box ── */}
      <button
        type="button"
        className={`simple-watch-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Click to open Time Picker Watch"
      >
        <div className="simple-watch-trigger-icon">
          <Clock size={16} />
        </div>
        <div className="simple-watch-trigger-time">
          <span className="simple-watch-digits">
            {hour}:{minute}
          </span>
          <span className="simple-watch-ampm">{period}</span>
        </div>
        <span className="simple-watch-sublabel">{friendlyPeriod}</span>
        <span className="simple-watch-badge">⌚ Watch</span>
      </button>

      {/* ── Simple Watch Popover Modal / Drawer ── */}
      {isOpen && (
        <div className="simple-watch-popover">
          {/* Header */}
          <div className="simple-watch-header">
            <div className="simple-watch-title">
              <Clock size={16} style={{ color: '#00f5d4' }} />
              <span>Time Picker Watch</span>
            </div>
            <button
              type="button"
              className="simple-watch-close-btn"
              onClick={() => setIsOpen(false)}
            >
              <X size={15} />
            </button>
          </div>

          {/* Big Watch Display & Stepper Controls */}
          <div className="simple-watch-display-card">
            {/* Hour Block */}
            <div className="simple-watch-stepper-col">
              <button
                type="button"
                className="simple-watch-arrow-btn"
                onClick={() => stepHour(1)}
                title="Increase Hour"
              >
                <ChevronUp size={16} />
              </button>
              <div
                className={`simple-watch-display-val ${viewMode === 'hours' ? 'active-mode' : ''}`}
                onClick={() => setViewMode('hours')}
                title="Click to pick hour"
              >
                {String(hour).padStart(2, '0')}
              </div>
              <button
                type="button"
                className="simple-watch-arrow-btn"
                onClick={() => stepHour(-1)}
                title="Decrease Hour"
              >
                <ChevronDown size={16} />
              </button>
              <span className="simple-watch-unit-label">HOURS</span>
            </div>

            <div className="simple-watch-colon">:</div>

            {/* Minute Block */}
            <div className="simple-watch-stepper-col">
              <button
                type="button"
                className="simple-watch-arrow-btn"
                onClick={() => stepMinute(5)}
                title="Add 5 Minutes"
              >
                <ChevronUp size={16} />
              </button>
              <div
                className={`simple-watch-display-val ${viewMode === 'minutes' ? 'active-mode' : ''}`}
                onClick={() => setViewMode('minutes')}
                title="Click to pick minutes"
              >
                {String(minute).padStart(2, '0')}
              </div>
              <button
                type="button"
                className="simple-watch-arrow-btn"
                onClick={() => stepMinute(-5)}
                title="Subtract 5 Minutes"
              >
                <ChevronDown size={16} />
              </button>
              <span className="simple-watch-unit-label">MINS</span>
            </div>

            {/* AM / PM Toggle */}
            <div className="simple-watch-ampm-col">
              <button
                type="button"
                className={`simple-watch-period-btn ${period === 'AM' ? 'active' : ''}`}
                onClick={() => handleTogglePeriod('AM')}
              >
                AM
              </button>
              <button
                type="button"
                className={`simple-watch-period-btn ${period === 'PM' ? 'active' : ''}`}
                onClick={() => handleTogglePeriod('PM')}
              >
                PM
              </button>
            </div>
          </div>

          {/* Interactive Analog Watch Face Dial */}
          <div className="simple-watch-dial-wrap">
            <svg
              className="simple-watch-dial-svg"
              width="170"
              height="170"
              viewBox="0 0 170 170"
            >
              {/* Outer Watch Rim */}
              <circle
                cx={cx}
                cy={cy}
                r="80"
                className="simple-watch-rim"
              />
              <circle
                cx={cx}
                cy={cy}
                r="74"
                className="simple-watch-face"
              />

              {/* 12 Hour Markers & Clickable Numbers */}
              {clockNumbers.map((num) => {
                const angle = (num * 30 - 90) * (Math.PI / 180);
                const x = cx + radius * Math.cos(angle);
                const y = cy + radius * Math.sin(angle);
                const isSelected =
                  viewMode === 'hours'
                    ? num === hour
                    : minuteNum === (num * 5) % 60;

                const displayNum =
                  viewMode === 'hours'
                    ? num
                    : String((num * 5) % 60).padStart(2, '0');

                return (
                  <g
                    key={num}
                    className={`simple-watch-num-group ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (viewMode === 'hours') {
                        handleSelectHour(num);
                      } else {
                        handleSelectMinute((num * 5) % 60);
                      }
                    }}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      className="simple-watch-num-hit"
                    />
                    <text
                      x={x}
                      y={y + 4}
                      className="simple-watch-num-text"
                      textAnchor="middle"
                    >
                      {displayNum}
                    </text>
                  </g>
                );
              })}

              {/* Hour Hand */}
              <line
                x1={cx}
                y1={cy}
                x2={cx + 38 * Math.sin((hourAngle * Math.PI) / 180)}
                y2={cy - 38 * Math.cos((hourAngle * Math.PI) / 180)}
                className="simple-watch-hand-hour"
              />

              {/* Minute Hand */}
              <line
                x1={cx}
                y1={cy}
                x2={cx + 56 * Math.sin((minuteAngle * Math.PI) / 180)}
                y2={cy - 56 * Math.cos((minuteAngle * Math.PI) / 180)}
                className="simple-watch-hand-minute"
              />

              {/* Center Pivot Dot */}
              <circle cx={cx} cy={cy} r="4.5" className="simple-watch-center-dot" />
            </svg>

            {/* Mode Switcher Pills */}
            <div className="simple-watch-mode-pills">
              <button
                type="button"
                className={`simple-watch-mode-pill ${viewMode === 'hours' ? 'active' : ''}`}
                onClick={() => setViewMode('hours')}
              >
                1. Select Hour ({hour})
              </button>
              <button
                type="button"
                className={`simple-watch-mode-pill ${viewMode === 'minutes' ? 'active' : ''}`}
                onClick={() => setViewMode('minutes')}
              >
                2. Select Minute (:{minute})
              </button>
            </div>
          </div>

          {/* Quick Common Minutes Pills */}
          <div className="simple-watch-quick-minutes">
            <span className="simple-watch-quick-label">Quick Min:</span>
            {[0, 10, 15, 20, 30, 45, 50].map((m) => {
              const mStr = String(m).padStart(2, '0');
              const isMatch = minute === mStr;
              return (
                <button
                  type="button"
                  key={m}
                  className={`simple-watch-quick-btn ${isMatch ? 'active' : ''}`}
                  onClick={() => handleSelectMinute(m)}
                >
                  :{mStr}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="simple-watch-footer">
            <button
              type="button"
              className="simple-watch-now-btn"
              onClick={handleSetNow}
              title="Set to current device time"
            >
              <RefreshCw size={13} />
              <span>⚡ Right Now</span>
            </button>
            <button
              type="button"
              className="simple-watch-done-btn"
              onClick={() => setIsOpen(false)}
            >
              <Check size={14} />
              <span>✓ Set Time</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

