/** Matches backend: who may use dashboard and staff tools (not public `user` / `customer`). POS is allowed for any logged-in user via ProtectedRoute. */
export const STAFF_ROLES = [
  'super_admin',
  'admin',
  'staff',
  'inventory_manager',
  'cashier',
  'seo_manager',
  'client',
  'store_manager',
  'employee',
  'counter_manager',
] as const;

/**
 * Normalizes role values from JWT/DB/UI labels into canonical snake_case.
 * Keeps compatibility with legacy values like "Store Manager".
 */
export function normalizeRole(role: string | undefined): string {
  if (!role) return '';
  const canonicalWords = String(role)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\brole\b/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!canonicalWords) return '';
  return canonicalWords.replace(/\s+/g, '_');
}

export function isClientRole(role: string | undefined): boolean {
  return normalizeRole(role) === 'client';
}

/** Storefront shopper accounts (User dashboard overview, not staff). */
export function isCustomerAccountRole(role: string | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'user' || normalized === 'customer';
}

export function isStaffRole(role: string | undefined): boolean {
  const normalized = normalizeRole(role);
  return !!normalized && (STAFF_ROLES as readonly string[]).includes(normalized);
}

export function isSuperAdminRole(role: string | undefined): boolean {
  return normalizeRole(role) === 'super_admin';
}

export function isInventoryManagerRole(role: string | undefined): boolean {
  return normalizeRole(role) === 'inventory_manager';
}

export function isCounterManagerRole(role: string | undefined): boolean {
  return normalizeRole(role) === 'counter_manager';
}

export function isCashierRole(role: string | undefined): boolean {
  return normalizeRole(role) === 'cashier';
}

export function isRestrictedInventoryDashboardRole(role: string | undefined): boolean {
  const normalized = normalizeRole(role);
  return (
    normalized === 'store_manager' ||
    normalized === 'inventory_manager' ||
    normalized === 'seo_manager' ||
    normalized === 'employee' ||
    normalized === 'staff' ||
    normalized === 'counter_manager'
  );
}

export function hasOperationalAdminAccess(role: string | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'super_admin' || normalized === 'client';
}

/** Full admin dashboard privileges (admin + super admin + client). */
export function hasFullAdminPrivileges(role: string | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'super_admin' || normalized === 'client';
}

/** Compact badge label for header/nav (null = no badge). */
export function accountRoleBadgeText(role: string | undefined): string | null {
  const normalized = normalizeRole(role);
  if (normalized === 'super_admin') return 'Super Admin';
  if (normalized === 'admin') return 'Admin';
  return null;
}

/** Subline under the user name in dashboard chrome. */
export function accountRoleSubtitle(role: string | undefined): string {
  const normalized = normalizeRole(role);
  if (normalized === 'super_admin') return 'Logged in as Super Admin';
  if (normalized === 'admin') return 'Logged in as Admin';
  return 'Premium Plan';
}

function isAllowedUserDashboardPath(path: string): boolean {
  return (
    path === '/dashboard' ||
    path.startsWith('/dashboard/products') ||
    path.startsWith('/dashboard/wishlist') ||
    path.startsWith('/dashboard/orders')
  );
}

/** Where to send the user after a successful login. */
export function resolvePostLoginPath(role: string | undefined, fromPath: string): string {
  const normalized = normalizeRole(role);
  if (isRestrictedInventoryDashboardRole(normalized) || normalized === 'client') {
    const blocked = fromPath.startsWith('/login') || fromPath.startsWith('/register');
    if (!blocked && (fromPath.startsWith('/dashboard/inventory') || fromPath.startsWith('/dashboard/products'))) {
      return fromPath;
    }
    return '/dashboard/inventory';
  }
  if (normalized === 'super_admin') {
    const blocked =
      fromPath.startsWith('/login') ||
      fromPath.startsWith('/register') ||
      fromPath.startsWith('/super-admin/login');
    if (!blocked && fromPath.startsWith('/super-admin')) {
      return fromPath;
    }
    if (!blocked && (fromPath.startsWith('/dashboard') || fromPath === '/pos')) {
      return fromPath;
    }
    return '/dashboard';
  }
  if (isStaffRole(normalized)) {
    const blocked = fromPath.startsWith('/login') || fromPath.startsWith('/register');
    if (!blocked && (fromPath.startsWith('/dashboard') || fromPath === '/pos')) {
      return fromPath;
    }
    return '/dashboard';
  }
  if (fromPath?.startsWith('/pos')) {
    return '/pos';
  }
  if (isAllowedUserDashboardPath(fromPath)) {
    return fromPath;
  }
  if (
    fromPath &&
    !fromPath.startsWith('/login') &&
    !fromPath.startsWith('/register') &&
    !fromPath.startsWith('/dashboard')
  ) {
    return fromPath;
  }
  return '/';
}
