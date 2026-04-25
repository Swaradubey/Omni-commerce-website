import ApiService from "./apiService";

export interface WishlistCheckResponse {
  success: boolean;
  inWishlist?: boolean;
  message?: string;
}

export interface WishlistToggleResponse {
  success: boolean;
  inWishlist?: boolean;
  message?: string;
}

export interface WishlistEnrichedItem {
  productKey: string;
  source: string;
  productRef: string | null;
  /** String id: Mongo hex or static/catalog key — mirrors stored wishlist item. */
  productId?: string;
  productType?: string;
  addedAt?: string;
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
  displayName: string;
  displayPrice: number;
  displayImage: string;
  displaySlug: string;
  stock?: number;
  live?: {
    _id: string;
    name: string;
    sku?: string;
    category?: string;
    price: number;
    stock: number;
    image: string;
  } | null;
}

export interface WishlistListResponse {
  success: boolean;
  message?: string;
  data?: {
    productIds: string[];
    items: WishlistEnrichedItem[];
  };
}

export interface WishlistAddResponse {
  success: boolean;
  inWishlist?: boolean;
  alreadyExists?: boolean;
  message?: string;
}

export interface WishlistRemoveResponse {
  success: boolean;
  removed?: boolean;
  message?: string;
}

export type WishlistTogglePayload =
  | { productId: string }
  | {
      item: {
        productKey: string;
        source: "static" | "catalog" | "inventory" | "mongo";
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

function buildCheckQuery(params: { productId?: string; productKey?: string }): string {
  const sp = new URLSearchParams();
  if (params.productId) sp.set("productId", params.productId);
  if (params.productKey) sp.set("productKey", params.productKey);
  const q = sp.toString();
  return q ? `?${q}` : "";
}

/** Admin dashboard: grouped wishlists (GET /api/admin/wishlists). */
export interface AdminWishlistUserRow {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  wishlistId: string;
  itemCount: number;
  lastActivityAt: string;
  wishlistUpdatedAt?: string;
  createdAt?: string;
  productIds: string[];
  items: WishlistEnrichedItem[];
}

export interface AdminWishlistsResponse {
  success: boolean;
  message?: string;
  data?: {
    users: AdminWishlistUserRow[];
  };
}

export const adminWishlistApi = {
  /** sort=latest: most recent wishlist activity first */
  getAll: (sortLatest = true) =>
    ApiService.get<AdminWishlistsResponse["data"]>(
      `/api/admin/wishlists${sortLatest ? "?sort=latest" : ""}`
    ),
};

export const wishlistApi = {
  check: (params: { productId?: string; productKey?: string }) =>
    ApiService.get<WishlistCheckResponse>(`/api/wishlist/check${buildCheckQuery(params)}`),

  getList: () => ApiService.get<WishlistListResponse>("/api/wishlist"),

  toggle: (payload: WishlistTogglePayload) =>
    ApiService.post<WishlistToggleResponse>("/api/wishlist/toggle", payload),

  add: (payload: WishlistTogglePayload) =>
    ApiService.post<WishlistAddResponse>("/api/wishlist", payload),

  remove: (params: { productId?: string; productKey?: string }) => {
    if (params.productId && /^[a-fA-F0-9]{24}$/.test(params.productId)) {
      return ApiService.delete<WishlistRemoveResponse>(`/api/wishlist/${params.productId}`);
    }
    if (params.productKey) {
      const enc = encodeURIComponent(params.productKey);
      return ApiService.delete<WishlistRemoveResponse>(`/api/wishlist/${enc}`);
    }
    return Promise.reject(new Error("remove: need productId or productKey"));
  },
};
