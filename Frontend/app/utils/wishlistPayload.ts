import { Product as ShopProduct } from '../types/product';

export function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/** Normalized fields for wishlist API payloads (static/catalog items and logging). */
export type NormalizedWishlistProduct = {
  productId: string;
  productType: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  stock: number;
};

type ProductLike = ShopProduct & {
  _id?: string;
  title?: string;
  productType?: string;
  quantity?: number;
};

/**
 * Safe normalization before building wishlist POST bodies (matches static + API product shapes).
 */
export function normalizeProductForWishlist(product: ProductLike): NormalizedWishlistProduct {
  const imgs = (product.images || []).filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0
  );
  const image =
    (product.image && String(product.image).trim()) || imgs[0] || '';
  const name = (product.name || product.title || '').trim();
  const slug =
    (product.slug && product.slug.trim()) || (name ? slugifyProductName(name) : '');
  const idRaw = product._id || product.id || slug;
  return {
    productId: String(idRaw || ''),
    productType: product.productType || 'product',
    name: name || 'Unnamed Product',
    price: Number(product.price) || 0,
    image,
    slug,
    stock: Number(product.stock ?? product.quantity ?? 0),
  };
}

function isMongoObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Match a product shown on the page to a MongoDB Product id when the same SKU/slug/name exists in API data.
 */
export function resolveMongoProductIdForWishlist(
  product: ShopProduct & { _id?: string },
  candidates: (ShopProduct & { _id?: string })[]
): string | undefined {
  if (product._id && isMongoObjectId(product._id)) return product._id;
  const slug = product.slug;
  const nameKey = product.name?.trim().toLowerCase();
  for (const dp of candidates) {
    if (!dp._id || !isMongoObjectId(dp._id)) continue;
    if (dp.slug === slug) return dp._id;
    if (slugifyProductName(dp.name) === slug) return dp._id;
    if (nameKey && dp.name?.trim().toLowerCase() === nameKey) return dp._id;
    if (product.sku && dp.sku && product.sku === dp.sku) return dp._id;
    if (dp._id === product.id) return dp._id;
  }
  return undefined;
}

export function stableStaticProductKey(product: ShopProduct): string {
  const slug = product.slug?.trim() || slugifyProductName(product.name);
  return `static:${slug}`;
}

export type WishlistToggleBody =
  | { productId: string }
  | {
      item: {
        productKey: string;
        source: 'static' | 'catalog' | 'inventory' | 'mongo';
        productType?: string;
        snapshot: {
          name: string;
          slug: string;
          price: number;
          salePrice?: number;
          image: string;
          category: string;
          sku: string;
          stock?: number;
        };
      };
    };

export function buildWishlistCheckParams(
  product: ShopProduct & { _id?: string },
  candidates: (ShopProduct & { _id?: string })[]
): { productId: string } | { productKey: string } {
  const mongoId = resolveMongoProductIdForWishlist(product, candidates);
  if (mongoId) return { productId: mongoId };
  return { productKey: stableStaticProductKey(product) };
}

export function buildWishlistToggleBody(
  product: ShopProduct & { _id?: string },
  candidates: (ShopProduct & { _id?: string })[]
): WishlistToggleBody {
  const mongoId = resolveMongoProductIdForWishlist(product, candidates);
  if (mongoId) return { productId: mongoId };

  const n = normalizeProductForWishlist(product);
  const slug = n.slug || slugifyProductName(n.name);
  return {
    item: {
      productKey: slug ? `static:${slug}` : stableStaticProductKey(product),
      source: 'static',
      productType: n.productType,
      snapshot: {
        name: n.name,
        slug,
        price: n.price,
        salePrice: product.salePrice,
        image: n.image,
        category: product.category,
        sku: product.sku ?? '',
        stock: n.stock,
      },
    },
  };
}

/** Stable key used by GET /api/wishlist and duplicate checks (`mongo:ObjectId` or `static:slug`). */
export function buildWishlistKeyForProduct(
  product: ShopProduct & { _id?: string },
  candidates: (ShopProduct & { _id?: string })[]
): string {
  const mongoId = resolveMongoProductIdForWishlist(product, candidates);
  if (mongoId) return `mongo:${mongoId}`;
  return stableStaticProductKey(product);
}

export function buildWishlistRemoveParams(
  product: ShopProduct & { _id?: string },
  candidates: (ShopProduct & { _id?: string })[]
): { productId: string } | { productKey: string } {
  const mongoId = resolveMongoProductIdForWishlist(product, candidates);
  if (mongoId) return { productId: mongoId };
  return { productKey: stableStaticProductKey(product) };
}
