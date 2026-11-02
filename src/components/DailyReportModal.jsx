import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  TrendingUp,
  Calendar,
  Zap,
  Users,
  Coffee,
  Gamepad2,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

function getTodayString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = (h || 0) >= 12 ? 'PM' : 'AM';
  const hour12 = (h || 0) % 12 || 12;
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

export default function DailyReportModal({
  isOpen,
  onClose,
  allBookings = [],
  allFoodSales = [],
  staffList = [],
  initialDate = '',
  stats: fallbackStats = null,
  staffSales: fallbackStaffSales = [],
  todayDateStr: fallbackTodayDate = '',
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const todayStr = useMemo(() => getTodayString(), []);
  const [reportDate, setReportDate] = useState(initialDate || fallbackTodayDate || todayStr);

  // Sync if initialDate changes externally
  React.useEffect(() => {
    if (initialDate) setReportDate(initialDate);
  }, [initialDate]);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getTodayString(d);
  }, []);

  // Filter Bookings for Selected Date
  const dateBookings = useMemo(() => {
    return allBookings.filter((b) => b && b.date === reportDate && b.status !== 'cancelled');
  }, [allBookings, reportDate]);

  // Filter Food Sales for Selected Date
  const dateFoodSales = useMemo(() => {
    return allFoodSales.filter((s) => s && s.date === reportDate);
  }, [allFoodSales, reportDate]);

  // Financial Calculations for Selected Date
  const metrics = useMemo(() => {
    // If no raw bookings array provided, fall back to passed stats object
    if (allBookings.length === 0 && fallbackStats) {
      return {
        cash: fallbackStats.cash || 0,
        upi: fallbackStats.upi || 0,
        gaming: fallbackStats.gaming || 0,
        sessionsCount: fallbackStats.sessionsCount || 0,
        food: fallbackStats.food || 0,
        itemsCount: fallbackStats.itemsCount || 0,
        total: fallbackStats.total || 0,
      };
    }

    const gamingRevenue = dateBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const gamingCash = dateBookings
      .filter((b) => b.paymentStatus === 'paid_cash' || b.paymentMode === 'cash')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const gamingUpi = dateBookings
      .filter((b) => b.paymentStatus === 'paid_upi' || b.paymentMode === 'upi' || b.paymentStatus === 'paid_card')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

    const foodRevenue = dateFoodSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const foodCash = dateFoodSales
      .filter((s) => s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const foodUpi = dateFoodSales
      .filter((s) => s.paymentMethod !== 'cash')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    const foodItemsCount = dateFoodSales.reduce((sum, s) => {
      if (Array.isArray(s.items)) {
        return sum + s.items.reduce((iSum, item) => iSum + (Number(item.quantity) || 1), 0);
      }
      return sum + (Number(s.totalItemsCount) || 1);
    }, 0);

    return {
      cash: gamingCash + foodCash,
      upi: gamingUpi + foodUpi,
      gaming: gamingRevenue,
      sessionsCount: dateBookings.length,
      food: foodRevenue,
      itemsCount: foodItemsCount,
      total: gamingRevenue + foodRevenue,
    };
  }, [dateBookings, dateFoodSales, allBookings.length, fallbackStats]);

  // Staff Breakdown on this date
  const staffBreakdown = useMemo(() => {
    if (staffList.length === 0 && fallbackStaffSales.length > 0) {
      return fallbackStaffSales;
    }

    const map = new Map();
    staffList.forEach((st) => {
      map.set(st.id, {
        id: st.id,
        name: st.name,
        gaming: 0,
        food: 0,
        total: 0,
        count: 0,
      });
    });

    dateBookings.forEach((b) => {
      const sId = b.staffId || b.handledByStaffId || 'admin';
      const sName = (b.staffName || b.handledBy || 'Staff').replace(/\s*\(Staff\)/gi, '');
      const amt = Number(b.totalAmount) || 0;
      if (!map.has(sId)) {
        map.set(sId, { id: sId, name: sName, gaming: 0, food: 0, total: 0, count: 0 });
      }
      const entry = map.get(sId);
      entry.gaming += amt;
      entry.total += amt;
      entry.count += 1;
    });

    dateFoodSales.forEach((s) => {
      const sId = s.staffId || s.handledByStaffId || 'admin';
      const sName = (s.staffName || s.handledBy || 'Staff').replace(/\s*\(Staff\)/gi, '');
      const amt = Number(s.totalAmount) || 0;
      if (!map.has(sId)) {
        map.set(sId, { id: sId, name: sName, gaming: 0, food: 0, total: 0, count: 0 });
      }
      const entry = map.get(sId);
      entry.food += amt;
      entry.total += amt;
    });

    return Array.from(map.values()).filter((s) => s.total > 0 || s.count > 0);
  }, [staffList, dateBookings, dateFoodSales, fallbackStaffSales]);

  if (!isOpen) return null;

  // Format date display
  const formattedDisplayDate = (() => {
    try {
      const d = new Date(reportDate + 'T00:00:00');
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return reportDate;
    }
  })();

  const handleCopyWhatsApp = () => {
    let staffText = '';
    if (staffBreakdown.length > 0) {
      staffText =
        '\n👥 *Staff Collections:*\n' +
        staffBreakdown
          .map((s) => `• ${s.name}: ₹${s.total} (🎮 Bookings: ${s.count || 0}, 🍔 Food: ₹${s.food})`)
          .join('\n');
    }

    const reportMsg = `📊 *TS GAMING CAFE — DAILY REPORT*
📅 Date: ${reportDate} (${formattedDisplayDate})
📍 Location: Waluj, Sambhajinagar

🎮 *Total Bookings:* ${metrics.sessionsCount} Bookings
💰 *Financial Summary:*
• 💵 Cash in Drawer: ₹${metrics.cash}
• 📱 UPI Collection: ₹${metrics.upi}
• 🎮 Gaming Revenue: ₹${metrics.gaming} (${metrics.sessionsCount} Bookings)
• 🍔 Food Sales: ₹${metrics.food} (${metrics.itemsCount} Items)
━━━━━━━━━━━━━━━━━━━━
🔥 *Total Sales: ₹${metrics.total}*
━━━━━━━━━━━━━━━━━━━━${staffText}

Generated by TS Gaming Cafe Management System.`;

    navigator.clipboard.writeText(reportMsg);
    setCopied(true);
    toast?.show?.('Date report copied for WhatsApp! 📋', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 15, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#0d121f',
          border: '1px solid rgba(255, 85, 0, 0.35)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(255, 85, 0, 0.18)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.15), rgba(13, 18, 31, 0))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: 'rgba(255, 85, 0, 0.2)',
                color: '#ff5500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#fff' }}>
                Date-wise Business Report
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                {formattedDisplayDate} • TS Gaming Cafe Waluj
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Date Selector Navigation Strip */}
        <div
          style={{
            padding: '10px 20px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setReportDate(todayStr)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: reportDate === todayStr ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                background: reportDate === todayStr ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                color: reportDate === todayStr ? '#38bdf8' : '#cbd5e1',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ⚡ Today
            </button>
            <button
              type="button"
              onClick={() => setReportDate(yesterdayStr)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: reportDate === yesterdayStr ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.1)',
                background: reportDate === yesterdayStr ? 'rgba(192, 132, 252, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                color: reportDate === yesterdayStr ? '#c084fc' : '#cbd5e1',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ⏪ Yesterday
            </button>
          </div>

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '0.75rem',
              color: '#e2e8f0',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Calendar size={13} style={{ color: '#ff5500' }} />
            <span>{reportDate}</span>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => e.target.value && setReportDate(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.75rem',
                cursor: 'pointer',
                outline: 'none',
                width: 18,
                opacity: 0,
                position: 'absolute',
              }}
            />
          </label>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Grand Total Hero Box with Total Bookings Count */}
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.15), rgba(16, 185, 129, 0.08))',
              border: '1px solid rgba(255, 85, 0, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Total Sales ({reportDate === todayStr ? 'Today' : reportDate})
              </span>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#fff', marginTop: 2 }}>
                ₹{Number(metrics.total || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'rgba(56, 189, 248, 0.18)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Gamepad2 size={13} /> {metrics.sessionsCount} Bookings Done
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#4ade80',
                }}
              >
                ₹{metrics.gaming} Gaming Revenue
              </span>
            </div>
          </div>

          {/* Cash vs UPI Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>
                💵 Cash in Drawer
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginTop: 4 }}>
                ₹{Number(metrics.cash || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>Physical Cash Collected</div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#c084fc', fontWeight: 700 }}>
                📱 Online UPI Total
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginTop: 4 }}>
                ₹{Number(metrics.upi || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>PhonePe / GPay / Online</div>
            </div>
          </div>

          {/* Department Breakdown: Gaming vs Food */}
          <div
            style={{
              padding: '14px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc', marginBottom: 10 }}>
              Department Breakdown
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Gamepad2 size={15} style={{ color: '#38bdf8' }} /> Gaming Consoles ({metrics.sessionsCount} Bookings)
                </span>
                <span style={{ fontWeight: 800, color: '#38bdf8' }}>
                  ₹{Number(metrics.gaming || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Coffee size={15} style={{ color: '#f97316' }} /> Food & Drinks ({metrics.itemsCount} Items)
                </span>
                <span style={{ fontWeight: 800, color: '#f97316' }}>
                  ₹{Number(metrics.food || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Bookings Table for this Date */}
          <div
            style={{
              padding: '14px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#f8fafc',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Gamepad2 size={14} style={{ color: '#38bdf8' }} />
                <span>Bookings on {reportDate} ({dateBookings.length})</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                Total: ₹{metrics.gaming}
              </span>
            </div>

            {dateBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.78rem' }}>
                No bookings recorded on this date.
              </div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <th style={{ padding: '6px 4px' }}>Time</th>
                      <th style={{ padding: '6px 4px' }}>Customer</th>
                      <th style={{ padding: '6px 4px' }}>Console</th>
                      <th style={{ padding: '6px 4px' }}>Staff</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateBookings.map((b, idx) => {
                      const isCash = b.paymentStatus === 'paid_cash' || b.paymentMode === 'cash';
                      return (
                        <tr key={b.id || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                          <td style={{ padding: '6px 4px', color: '#94a3b8' }}>
                            {formatTime12(b.startTime)}
                          </td>
                          <td style={{ padding: '6px 4px', fontWeight: 600, color: '#fff' }}>
                            {b.userName || 'Customer'}
                          </td>
                          <td style={{ padding: '6px 4px', color: '#38bdf8' }}>
                            {(b.setupName || 'PS').replace('PlayStation ', 'PS')}
                          </td>
                          <td style={{ padding: '6px 4px', color: '#94a3b8' }}>
                            {(b.staffName || b.handledBy || 'Admin').replace(/\s*\(Staff\)/gi, '')}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: isCash ? '#4ade80' : '#c084fc' }}>
                            ₹{b.totalAmount}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: b.status === 'completed' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                color: b.status === 'completed' ? '#4ade80' : '#38bdf8',
                                fontWeight: 700,
                              }}
                            >
                              {b.status || 'Done'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Staff Sales Table */}
          {staffBreakdown.length > 0 && (
            <div
              style={{
                padding: '14px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#f8fafc',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Users size={14} style={{ color: '#c084fc' }} />
                <span>Staff Collections on {reportDate}</span>
              </div>
              <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <th style={{ padding: '6px 4px' }}>Staff</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center' }}>Bookings</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Gaming</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Food</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {staffBreakdown.map((s, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <td style={{ padding: '6px 4px', fontWeight: 600, color: '#fff' }}>{s.name}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'center', color: '#38bdf8', fontWeight: 700 }}>
                        {s.count || 0}
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'right', color: '#94a3b8' }}>₹{s.gaming}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right', color: '#94a3b8' }}>₹{s.food}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
                        ₹{s.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            gap: 10,
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onClick={handlePrint}
          >
            <Printer size={15} /> Print Slip
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              flex: 1.4,
              padding: '10px',
              fontSize: '0.82rem',
              background: 'linear-gradient(135deg, #ff5500, #ff7700)',
              borderColor: '#ff5500',
              color: '#fff',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onClick={handleCopyWhatsApp}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied Report!' : 'Copy for WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
