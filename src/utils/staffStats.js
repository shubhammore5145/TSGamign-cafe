// ═══════════════════════════════════════════════════════
// TS Gaming Café — Staff Collection & Booking Analytics
// ═══════════════════════════════════════════════════════

export function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a booking belongs to a given staff member
 */
export function isBookingHandledByStaff(booking, staffId, staffName) {
  if (!booking) return false;

  // Direct ID match
  if (staffId && (booking.staffId === staffId || booking.handledByStaffId === staffId)) {
    return true;
  }

  // Name match fallback
  if (staffName) {
    const sName = staffName.toLowerCase().trim();
    const bHandled = (booking.handledBy || '').toLowerCase();
    const bCreated = (booking.createdBy || '').toLowerCase();
    const bStaffName = (booking.staffName || '').toLowerCase();

    if (bHandled.includes(sName) || bCreated.includes(sName) || bStaffName.includes(sName)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates collection and booking statistics for a single staff member
 */
export function calculateStaffStats(staffId, staffName, bookings = []) {
  const today = getTodayString();

  const validBookings = bookings.filter((b) => b && b.status !== 'cancelled');

  const staffBookings = validBookings.filter((b) =>
    isBookingHandledByStaff(b, staffId, staffName)
  );

  const todayBookings = staffBookings.filter((b) => b.date === today);

  // Today calculations
  const todayCash = todayBookings
    .filter((b) => b.paymentStatus === 'paid_cash')
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  const todayUpi = todayBookings
    .filter((b) => b.paymentStatus === 'paid_upi' || b.paymentStatus === 'paid_card')
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  const todayPending = todayBookings
    .filter((b) => b.paymentStatus === 'pending')
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  const todayCollection = todayCash + todayUpi;
  const todayTotalAmount = todayBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  // All time calculations
  const allTimeCash = staffBookings
    .filter((b) => b.paymentStatus === 'paid_cash')
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  const allTimeUpi = staffBookings
    .filter((b) => b.paymentStatus === 'paid_upi' || b.paymentStatus === 'paid_card')
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  const allTimeCollection = allTimeCash + allTimeUpi;
  const allTimeTotalAmount = staffBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  return {
    todayCount: todayBookings.length,
    todayCash,
    todayUpi,
    todayPending,
    todayCollection,
    todayTotalAmount,
    allTimeCount: staffBookings.length,
    allTimeCash,
    allTimeUpi,
    allTimeCollection,
    allTimeTotalAmount,
  };
}

/**
 * Calculates collection statistics for all staff members together
 */
export function calculateAllStaffSummary(staffList = [], bookings = []) {
  const summary = staffList.map((staff) => {
    const stats = calculateStaffStats(staff.id, staff.name, bookings);
    return {
      staff,
      ...stats,
    };
  });

  const totals = summary.reduce(
    (acc, curr) => ({
      todayCount: acc.todayCount + curr.todayCount,
      todayCash: acc.todayCash + curr.todayCash,
      todayUpi: acc.todayUpi + curr.todayUpi,
      todayCollection: acc.todayCollection + curr.todayCollection,
      allTimeCount: acc.allTimeCount + curr.allTimeCount,
      allTimeCollection: acc.allTimeCollection + curr.allTimeCollection,
    }),
    {
      todayCount: 0,
      todayCash: 0,
      todayUpi: 0,
      todayCollection: 0,
      allTimeCount: 0,
      allTimeCollection: 0,
    }
  );

  return { summary, totals };
}
