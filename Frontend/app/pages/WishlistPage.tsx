import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Heart, Loader2, ShoppingCart, Trash2, ExternalLink, Package } from 'lucide-react';
 import { wishlistApi, type WishlistEnrichedItem } from '../api/wishlist';
 import { useCart } from '../context/CartContext';
 import type { Product } from '../types/product';
 import { formatINR } from '../utils/formatINR';

function wishlistItemToProduct(item: WishlistEnrichedItem): Product {
  const slug =
    (item.displaySlug || item.snapshot.slug || '').trim() ||
    item.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const image =
    item.displayImage ||
    item.snapshot.image ||
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1000&auto=format&fit=crop';
  const stock = item.stock ?? item.snapshot.stock ?? 0;
  return {
    id: item.productRef || item.productId || item.productKey,
    name: item.displayName || item.snapshot.name,
    slug,
    price: item.displayPrice ?? item.snapshot.price,
    salePrice: item.snapshot.salePrice,
    description: '',
    category: item.snapshot.category || 'General',
    image,
    images: [image],
    stock,
    rating: 0,
    reviews: 0,
    sku: item.snapshot.sku,
  };
}

export function WishlistPage() {
  const { addToCart } = useCart();
  const [items, setItems] = useState<WishlistEnrichedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await wishlistApi.getList();
      if (res.success && res.data?.items) {
        setItems(res.data.items);
      } else {
        setItems([]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load wishlist';
      toast.error(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (item: WishlistEnrichedItem) => {
    setRemovingKey(item.productKey);
    try {
      const params =
        item.productKey.startsWith('mongo:') && item.productKey.length > 12
          ? { productId: item.productKey.slice(6) }
          : { productKey: item.productKey };
      const res = await wishlistApi.remove(params);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.productKey !== item.productKey));
        toast.success(res.message || 'Removed from wishlist');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not remove item';
      toast.error(msg);
    } finally {
      setRemovingKey(null);
    }
  };

  const handleAddToCart = (item: WishlistEnrichedItem) => {
    const p = wishlistItemToProduct(item);
    if (p.stock <= 0) {
      toast.error('This item is out of stock.');
      return;
    }
    addToCart(p);
    toast.success('Added to cart');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-medium">Loading your wishlist…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-900/20">
          <Heart className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your wishlist is empty</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Save products you love while browsing — they will appear here for quick access.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Package className="h-4 w-4" />
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {items.map((item) => {
          const slug = (item.displaySlug || item.snapshot.slug || '').trim();
          const productUrl = slug ? `/product/${encodeURIComponent(slug)}` : '/shop';
          const busy = removingKey === item.productKey;
          const stock = item.stock ?? item.snapshot.stock ?? 0;

          return (
            <div
              key={item.productKey}
              className="flex gap-4 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#09090b] p-4 shadow-sm"
            >
              <Link to={productUrl} className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                <img
                  src={
                    item.displayImage ||
                    item.snapshot.image ||
                    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400'
                  }
                  alt={item.displayName}
                  className="h-full w-full object-cover hover:opacity-90 transition-opacity"
                />
              </Link>
              <div className="min-w-0 flex-1 flex flex-col">
                <Link to={productUrl} className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 line-clamp-2">
                  {item.displayName}
                </Link>
                 <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                   {formatINR(Number(item.displayPrice ?? item.snapshot.price))}
                 </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stock > 0 ? (
                    <span className="text-green-600 font-medium">In stock ({stock})</span>
                  ) : (
                    <span className="text-red-600 font-medium">Out of stock</span>
                  )}
                </p>
                <div className="mt-auto pt-3 flex flex-wrap gap-2">
                  <Link
                    to={productUrl}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    disabled={stock <= 0}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Add to cart
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
