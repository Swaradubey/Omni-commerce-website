import { createOrder, type OrderPayload } from '../api/orders';

const DB_NAME = 'pos-offline-orders';
const DB_VERSION = 1;
const STORE = 'pending';
const LS_KEY = 'pos_offline_pending_orders_v1';

export type PosOfflineOrderRecord = {
  offlineOrderId: string;
  syncStatus: 'pending';
  createdAt: number;
  source: 'offline_pos';
  subtotal: number;
  total: number;
  orderPayload: OrderPayload;
};

function newOfflineOrderId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `off-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'offlineOrderId' });
      }
    };
  });
}

async function idbGetAll(): Promise<PosOfflineOrderRecord[]> {
  const db = await openDb();
  try {
    const rows = await new Promise<PosOfflineOrderRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      tx.onerror = () => reject(tx.error ?? new Error('IDB read failed'));
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as PosOfflineOrderRecord[]) || []);
      req.onerror = () => reject(req.error ?? new Error('IDB getAll failed'));
    });
    return rows.filter(r => r && r.syncStatus === 'pending');
  } finally {
    db.close();
  }
}

async function idbPut(record: PosOfflineOrderRecord): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IDB write failed'));
      tx.objectStore(STORE).put(record);
    });
  } finally {
    db.close();
  }
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IDB delete failed'));
      tx.objectStore(STORE).delete(id);
    });
  } finally {
    db.close();
  }
}

function lsGetAll(): PosOfflineOrderRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is PosOfflineOrderRecord =>
        r &&
        typeof r === 'object' &&
        typeof (r as PosOfflineOrderRecord).offlineOrderId === 'string' &&
        (r as PosOfflineOrderRecord).syncStatus === 'pending'
    );
  } catch {
    return [];
  }
}

function lsSetAll(rows: PosOfflineOrderRecord[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  } catch {
    /* quota */
  }
}

function mergeLsRecord(record: PosOfflineOrderRecord): void {
  const merged = lsGetAll().filter(r => r.offlineOrderId !== record.offlineOrderId);
  merged.push(record);
  lsSetAll(merged);
}

export async function getAllPendingOfflinePosOrders(): Promise<PosOfflineOrderRecord[]> {
  try {
    const fromIdb = await idbGetAll();
    if (fromIdb.length > 0) return fromIdb;
  } catch {
    /* fall through */
  }
  return lsGetAll();
}

export async function getPendingOfflinePosOrdersCount(): Promise<number> {
  const rows = await getAllPendingOfflinePosOrders();
  return rows.length;
}

export async function savePendingOfflinePosOrder(input: {
  /** When omitted, a new id is generated (POS should pass one so orderId can match). */
  offlineOrderId?: string;
  orderPayload: OrderPayload;
  subtotal: number;
  total: number;
}): Promise<PosOfflineOrderRecord> {
  const offlineOrderId = input.offlineOrderId ?? newOfflineOrderId();
  const record: PosOfflineOrderRecord = {
    offlineOrderId,
    syncStatus: 'pending',
    createdAt: Date.now(),
    source: 'offline_pos',
    subtotal: input.subtotal,
    total: input.total,
    orderPayload: input.orderPayload,
  };

  try {
    await idbPut(record);
  } catch {
    /* IndexedDB unavailable — localStorage only */
  }
  mergeLsRecord(record);

  return record;
}

export async function removeOfflinePosOrder(offlineOrderId: string): Promise<void> {
  try {
    await idbDelete(offlineOrderId);
  } catch {
    /* ignore */
  }
  lsSetAll(lsGetAll().filter(r => r.offlineOrderId !== offlineOrderId));
}

let syncInFlight = false;
let bootstrapDone = false;

/**
 * POST each pending record to the backend; removes local row on success.
 * Safe to call repeatedly; backend dedupes by offlineOrderId.
 */
export async function syncPendingPosOfflineOrders(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  if (syncInFlight) return 0;
  syncInFlight = true;
  let synced = 0;
  try {
    const pending = await getAllPendingOfflinePosOrders();
    for (const row of pending) {
      try {
        const payload: OrderPayload = {
          ...row.orderPayload,
          offlineOrderId: row.offlineOrderId,
        };
        const result = await createOrder(payload);
        if (result.success) {
          await removeOfflinePosOrder(row.offlineOrderId);
          synced += 1;
        }
      } catch {
        /* keep pending for next online / reload */
      }
    }
  } finally {
    syncInFlight = false;
  }
  return synced;
}

/** Run once on app load and on window "online" (idempotent registration). */
export function initPosOfflineOrdersSync(): void {
  if (typeof window === 'undefined' || bootstrapDone) return;
  bootstrapDone = true;
  const run = () => {
    if (navigator.onLine) void syncPendingPosOfflineOrders();
  };
  run();
  window.addEventListener('online', run);
}

export { newOfflineOrderId };
