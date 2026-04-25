/** Mirrors backend: admin / super_admin full access; inventory_manager may view and edit title/description only (mutations enforced server-side). */

import { normalizeRole } from './staffRoles';

export type InventoryEditMode = 'admin' | 'inventory_manager';

const INVENTORY_PRODUCT_CREATE_ROLES = [
  'super admin',
  'admin',
  'client',
  'employee',
  'staff',
  'store manager',
  'seo manager',
  'inventory manager',
  'counter manager',
] as const;

function normalizeInventoryRole(role: string | undefined): string {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function getInventoryEditMode(role: string | undefined): InventoryEditMode | null {
  const normalized = normalizeRole(role);
  if (normalized === 'admin' || normalized === 'super_admin' || normalized === 'client') return 'admin';
  if (normalized === 'store_manager' || normalized === 'employee' || normalized === 'staff' || normalized === 'seo_manager' || normalized === 'counter_manager') return 'admin';
  if (normalized === 'inventory_manager') return 'inventory_manager';
  return null;
}

export function canAccessInventoryEditor(role: string | undefined): boolean {
  const normalized = normalizeRole(role);
  return (
    normalized === 'admin' ||
    normalized === 'super_admin' ||
    normalized === 'inventory_manager' ||
    normalized === 'client' ||
    normalized === 'store_manager' ||
    normalized === 'employee' ||
    normalized === 'staff' ||
    normalized === 'seo_manager' ||
    normalized === 'counter_manager'
  );
}

export function canCreateInventoryProduct(role: string | undefined): boolean {
  return (INVENTORY_PRODUCT_CREATE_ROLES as readonly string[]).includes(
    normalizeInventoryRole(role)
  );
}

export function canDeleteInventoryProduct(role: string | undefined): boolean {
  const normalized = normalizeRole(role);
  return (
    normalized === 'admin' ||
    normalized === 'super_admin' ||
    normalized === 'client' ||
    normalized === 'store_manager' ||
    normalized === 'employee' ||
    normalized === 'counter_manager'
  );
}

export function canAdjustInventoryStock(role: string | undefined): boolean {
  const normalized = normalizeRole(role);
  return (
    normalized === 'admin' ||
    normalized === 'super_admin' ||
    normalized === 'client' ||
    normalized === 'store_manager' ||
    normalized === 'employee' ||
    normalized === 'counter_manager'
  );
}

export function canOpenProductEditModal(role: string | undefined): boolean {
  return canAccessInventoryEditor(role);
}
