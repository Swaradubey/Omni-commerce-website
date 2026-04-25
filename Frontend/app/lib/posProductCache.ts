import type { Product } from '../api/products';

const DB_NAME = 'pos-offline-products';
const DB_VERSION = 1;
const STORE = 'kv';
const IDB_KEY = 'pos_products_list';
const LS_KEY = 'pos_products_cache_v1';

function normalizeForCache(raw: Product): Product {
  const barcode = (raw as Product & { barcode?: string }).barcode;
  const p: Product = {
    _id: raw._id,
    name: raw.name ?? '',
    sku: raw.sku ?? '',
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price) || 0,
    stock: typeof raw.stock === 'number' ? raw.stock : Number(raw.stock) || 0,
    category: raw.category ?? '',
    image: raw.image,
    description: raw.description,
    isActive: raw.isActive,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
  if (barcode != null && String(barcode).length > 0) {
    (p as Product & { barcode?: string }).barcode = String(barcode);
  }
  return p;
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
        db.createObjectStore(STORE);
      }
    };
  });
}

async function idbPut(products: Product[]): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IDB write failed'));
      tx.objectStore(STORE).put(products, IDB_KEY);
    });
  } finally {
    db.close();
  }
}

async function idbGet(): Promise<Product[] | null> {
  const db = await openDb();
  try {
    const row = await new Promise<Product[] | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      tx.onerror = () => reject(tx.error ?? new Error('IDB read failed'));
      const req = tx.objectStore(STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result as Product[] | undefined);
      req.onerror = () => reject(req.error ?? new Error('IDB get failed'));
    });
    if (Array.isArray(row) && row.length > 0) return row;
    return null;
  } finally {
    db.close();
  }
}

function lsPut(products: Product[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(products));
  } catch {
    /* quota or private mode */
  }
}

function lsGet(): Product[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as Product[];
  } catch {
    return null;
  }
}

/** Persist POS product list after a successful online sync. */
export async function savePosProductsCache(products: Product[]): Promise<void> {
  const normalized = products.map(normalizeForCache);
  try {
    await idbPut(normalized);
  } catch {
    /* IndexedDB unavailable — localStorage only */
  }
  lsPut(normalized);
}

/** Load last synced POS products (IndexedDB first, then localStorage). */
export async function loadPosProductsCache(): Promise<Product[] | null> {
  try {
    const fromIdb = await idbGet();
    if (fromIdb && fromIdb.length > 0) return fromIdb;
  } catch {
    /* fall through */
  }
  return lsGet();
}
