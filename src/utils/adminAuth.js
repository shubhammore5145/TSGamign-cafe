// ═══════════════════════════════════════════════════════
// TS Gaming Café — Authentication & Role Management
// ═══════════════════════════════════════════════════════

export const ADMIN_PASSWORD = 'TSGaming@2024';

export const DEFAULT_STAFF = [];

const ADMIN_AUTH_KEY = 'ts_admin_auth';
const AUTH_ROLE_KEY = 'ts_auth_role';     // 'admin' | 'staff'
const STAFF_USER_KEY = 'ts_staff_user';   // JSON string of active staff member

/**
 * Returns current authenticated role: 'admin' | 'staff' | null
 */
export function getAuthRole() {
  const role = sessionStorage.getItem(AUTH_ROLE_KEY);
  if (role === 'admin' || role === 'staff') return role;
  if (sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true') {
    return sessionStorage.getItem(STAFF_USER_KEY) ? 'staff' : 'admin';
  }
  return null;
}

/**
 * Checks if Super Admin is logged in
 */
export function isAdminLoggedIn() {
  const role = getAuthRole();
  return role === 'admin';
}

/**
 * Checks if Staff is logged in
 */
export function isStaffLoggedIn() {
  const role = getAuthRole();
  return role === 'staff';
}

/**
 * Checks if either Admin or Staff is authenticated
 */
export function isAuthenticated() {
  return isAdminLoggedIn() || isStaffLoggedIn();
}

/**
 * Returns details of the logged in Staff member
 */
export function getStaffUser() {
  try {
    const raw = sessionStorage.getItem(STAFF_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Sets session as Super Admin
 */
export function setAdminAuth() {
  sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
  sessionStorage.setItem(AUTH_ROLE_KEY, 'admin');
  sessionStorage.removeItem(STAFF_USER_KEY);
}

/**
 * Sets session as Staff Member
 */
export function setStaffAuth(staffMember) {
  sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
  sessionStorage.setItem(AUTH_ROLE_KEY, 'staff');
  sessionStorage.setItem(STAFF_USER_KEY, JSON.stringify(staffMember));
}

/**
 * Logs out either Admin or Staff
 */
export function adminLogout() {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  sessionStorage.removeItem(AUTH_ROLE_KEY);
  sessionStorage.removeItem(STAFF_USER_KEY);
}
