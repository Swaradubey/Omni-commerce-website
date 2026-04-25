import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { Activity, Heart, Loader2, Package, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuth } from '../../context/AuthContext';
import { hasFullAdminPrivileges } from '../../utils/staffRoles';
import { adminWishlistApi, type AdminWishlistUserRow } from '../../api/wishlist';

function formatDate(iso: string | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function formatWishlistSource(source: string | undefined): string {
  if (!source) return '—';
  const s = source.toLowerCase();
  if (s === 'inventory') return 'POS / Inventory';
  if (s === 'mongo' || s === 'catalog') return 'Website';
  if (s === 'static') return 'Static catalog';
  return source;
}

export function DashboardWishlistActivity() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminWishlistUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminWishlistApi.getAll(true);
      if (res.success && res.data?.users) {
        setRows(res.data.users);
      } else {
        setRows([]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load wishlist activity';
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFullAdminPrivileges(user?.role)) {
      load();
    } else {
      setLoading(false);
      setError('This page is only available to administrators.');
    }
  }, [user?.role, load]);

  if (!hasFullAdminPrivileges(user?.role)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-800 px-6 py-12 text-center">
        <p className="text-amber-900 dark:text-amber-200 font-medium">Access denied</p>
        <p className="text-sm text-muted-foreground mt-2">
          Wishlist activity is visible to store administrators only.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-medium">Loading wishlist activity…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/80 dark:bg-red-950/20 dark:border-red-900 px-6 py-8">
        <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20">
          <Heart className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No wishlist activity yet</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          When customers save products to their wishlists, they will appear here with product details and
          timestamps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-none shadow-md bg-white/50 dark:bg-black/40 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-70" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Users with wishlists
              </CardTitle>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                <User className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{rows.length}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="border-none shadow-md bg-white/50 dark:bg-black/40 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 opacity-70" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total saved items
              </CardTitle>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                <Heart className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">
                {rows.reduce((acc, r) => acc + r.itemCount, 0)}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-none shadow-md bg-white/50 dark:bg-black/40 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-70" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sorted by
              </CardTitle>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Activity className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold text-foreground">Latest activity first</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="space-y-8">
        {rows.map((row, idx) => (
          <motion.section
            key={row.wishlistId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(idx * 0.05, 0.4) }}
          >
            <Card className="border-none shadow-xl bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      {row.user.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{row.user.email}</p>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p>
                      <span className="font-medium text-foreground">Last activity:</span>{' '}
                      {formatDate(row.lastActivityAt)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Items:</span> {row.itemCount}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                  {row.items.map((item) => {
                    const slug = (item.displaySlug || item.snapshot.slug || '').trim();
                    const productUrl = slug ? `/product/${encodeURIComponent(slug)}` : '/shop';
                    const stock = item.stock ?? item.snapshot.stock ?? 0;
                    const img =
                      item.displayImage ||
                      item.snapshot.image ||
                      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400';
                    return (
                      <div
                        key={`${row.wishlistId}-${item.productKey}`}
                        className="flex gap-4 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#09090b] p-4 shadow-sm"
                      >
                        <Link to={productUrl} className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          <img src={img} alt={item.displayName} className="h-full w-full object-cover" />
                        </Link>
                        <div className="min-w-0 flex-1 flex flex-col">
                          <Link
                            to={productUrl}
                            className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 line-clamp-2"
                          >
                            {item.displayName || item.snapshot.name}
                          </Link>
                          <p className="mt-1 text-base font-bold text-gray-900 dark:text-white">
                            ${Number(item.displayPrice ?? item.snapshot.price).toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {stock > 0 ? (
                              <span className="text-green-600 font-medium">In stock ({stock})</span>
                            ) : (
                              <span className="text-red-600 font-medium">Out of stock</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            <span className="font-medium text-foreground">Product ID:</span>{' '}
                            {(item.productId || item.productKey || '—').toString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium text-foreground">Source:</span>{' '}
                            {formatWishlistSource(item.source)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-auto pt-2">
                            Added {formatDate(item.addedAt ? String(item.addedAt) : undefined)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.section>
        ))}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Package className="h-3.5 w-3.5" />
        Product details reflect saved wishlist snapshots and live catalog data when available.
      </p>
    </div>
  );
}
