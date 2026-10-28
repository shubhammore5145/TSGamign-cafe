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
 * Checks if a food sale was handled by a given staff member
 */
export function isFoodSaleHandledByStaff(sale, staffId, staffName) {
  if (!sale) return false;

  if (staffId && (sale.staffId === staffId || sale.handledByStaffId === staffId)) {
    return true;
  }

  if (staffName) {
    const sName = staffName.toLowerCase().trim();
    const sHandled = (sale.handledBy || '').toLowerCase();
    if (sHandled.includes(sName)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates collection and booking/sales statistics for a single staff member
 */
export function calculateStaffStats(staffId, staffName, bookings = [], foodSales = []) {
  const today = getTodayString();

  const validBookings = bookings.filter((b) => b && b.status !== 'cancelled');

  const staffBookings = validBookings.filter((b) =>
    isBookingHandledByStaff(b, staffId, staffName)
  );

  const todayBookings = staffBookings.filter((b) => b.date === today);

  // Today Gaming calculations
  const todayGamingCash = todayBookings
    .filter((b) => b.paymentStatus === 'paid_cash')
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  const todayGamingUpi = todayBookings
    .filter((b) => b.paymentStatus === 'paid_upi' || b.paymentStatus === 'paid_card')
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  const todayPending = todayBookings
    .filter((b) => b.paymentStatus === 'pending')
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  const todayGamingCollection = todayGamingCash + todayGamingUpi;

  // Food Sales handled by this staff
  const staffFoodSales = (foodSales || []).filter((s) =>
    isFoodSaleHandledByStaff(s, staffId, staffName)
  );
  const todayFoodSales = staffFoodSales.filter((s) => s.date === today);

  const todayFoodCash = todayFoodSales
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

  const todayFoodUpi = todayFoodSales
    .filter((s) => s.paymentMethod === 'upi')
    .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

  const todayFoodCollection = todayFoodCash + todayFoodUpi;

  // Combined Totals for today
  const todayCash = todayGamingCash + todayFoodCash;
  const todayUpi = todayGamingUpi + todayFoodUpi;
  const todayCollection = todayCash + todayUpi;
  const todayTotalAmount = todayBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0) +
    todayFoodSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

  // All time calculations
  const allTimeGamingCash = staffBookings
    .filter((b) => b.paymentStatus === 'paid_cash')
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  const allTimeGamingUpi = staffBookings
    .filter((b) => b.paymentStatus === 'paid_upi' || b.paymentStatus === 'paid_card')
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  const allTimeFoodCash = staffFoodSales
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

  const allTimeFoodUpi = staffFoodSales
    .filter((s) => s.paymentMethod === 'upi')
    .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

  const allTimeCash = allTimeGamingCash + allTimeFoodCash;
  const allTimeUpi = allTimeGamingUpi + allTimeFoodUpi;
  const allTimeCollection = allTimeCash + allTimeUpi;
  const allTimeTotalAmount = staffBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0) +
    staffFoodSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

  return {
    todayCount: todayBookings.length,
    todayGamingCount: todayBookings.length,
    todayFoodCount: todayFoodSales.length,
    todayGamingCash,
    todayGamingUpi,
    todayGamingCollection,
    todayFoodCash,
    todayFoodUpi,
    todayFoodCollection,
    todayCash,
    todayUpi,
    todayPending,
    todayCollection,
    todayTotalAmount,
    allTimeCount: staffBookings.length + staffFoodSales.length,
    allTimeGamingCount: staffBookings.length,
    allTimeFoodCount: staffFoodSales.length,
    allTimeCash,
    allTimeUpi,
    allTimeCollection,
    allTimeTotalAmount,
  };
}

/**
 * Calculates collection statistics for all staff members together
 */
export function calculateAllStaffSummary(staffList = [], bookings = [], foodSales = []) {
  const summary = staffList.map((staff) => {
    const stats = calculateStaffStats(staff.id, staff.name, bookings, foodSales);
    return {
      staff,
      ...stats,
    };
  });

  const totals = summary.reduce(
    (acc, curr) => ({
      todayCount: acc.todayCount + curr.todayCount,
      todayGamingCount: (acc.todayGamingCount || 0) + (curr.todayGamingCount || 0),
      todayFoodCount: (acc.todayFoodCount || 0) + (curr.todayFoodCount || 0),
      todayCash: acc.todayCash + curr.todayCash,
      todayUpi: acc.todayUpi + curr.todayUpi,
      todayCollection: acc.todayCollection + curr.todayCollection,
      allTimeCount: acc.allTimeCount + curr.allTimeCount,
      allTimeCollection: acc.allTimeCollection + curr.allTimeCollection,
    }),
    {
      todayCount: 0,
      todayGamingCount: 0,
      todayFoodCount: 0,
      todayCash: 0,
      todayUpi: 0,
      todayCollection: 0,
      allTimeCount: 0,
      allTimeCollection: 0,
    }
  );

  return { summary, totals };
}

/**
 * Formats Rupee amounts with Indian commas: e.g. 1500 -> ₹1,500
 */
export function formatINR(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Formats phone numbers cleanly for Indian mobile displays:
 * e.g. "9579897652" -> "+91 95798 97652"
 * e.g. "09579897652" -> "+91 95798 97652"
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '—';
  // Strip hidden LTR/RTL unicode marks and non-digits
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  if (clean.length === 11 && clean.startsWith('0')) {
    const ten = clean.slice(1);
    return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
  }
  if (clean.length === 12 && clean.startsWith('91')) {
    const ten = clean.slice(2);
    return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
  }
  return String(phone).trim();
}

/**
 * Extracts 10 clean digits for tel: and https://wa.me/91... links
 */
export function getClean10Phone(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/\D/g, '');
  return clean.slice(-10);
}

/**
 * Checks if a staff member is currently on shift based on real-time clock
 */
export function isStaffCurrentlyOnShift(shift = '', status = 'active') {
  if (status !== 'active') return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const lower = (shift || '').toLowerCase();

  if (lower.includes('morning')) {
    // 09:00 AM (540 min) to 03:00 PM (900 min)
    return currentMinutes >= 540 && currentMinutes < 900;
  }
  if (lower.includes('evening')) {
    // 03:00 PM (900 min) to 10:00 PM (1320 min)
    return currentMinutes >= 900 && currentMinutes < 1320;
  }
  if (lower.includes('full day')) {
    // 09:00 AM (540 min) to 10:00 PM (1320 min)
    return currentMinutes >= 540 && currentMinutes < 1320;
  }
  return false;
}

/**
 * Pre-formats WhatsApp message containing staff login credentials
 */
export function generateStaffCredentialsMessage(staff) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `🎮 *TS GAMING CAFÉ — STAFF DUTY DESK* 🎮

Hello *${staff.name}*, here are your login details:

👤 *Staff Name:* ${staff.name}
🔑 *Duty PIN:* ${staff.pin}
💼 *Role:* ${staff.role || 'Counter Operator'}
⏰ *Work Shift:* ${staff.shift || 'Flexible'}
🌐 *Login Portal:* ${origin}/login

⚠️ _Keep your PIN secure and punch in at the start of your shift!_`;
}

