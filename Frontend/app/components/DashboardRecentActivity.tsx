import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { formatDistanceToNow, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowUpRight, Clock, MapPin, CreditCard, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Separator } from './ui/separator';
import {
  fetchLatestTransactions,
  getOrderById,
  type LatestTransactionRow,
} from '../api/orders';

function formatStatusLabel(status: string): string {
  const s = String(status || '').trim();
  if (!s) return '—';
  return s.replace(/_/g, ' ');
}

function normalizeStatusKey(status: string): string {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function statusBadgeClass(orderStatus: string): string {
  const key = normalizeStatusKey(orderStatus);
  const completed =
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-300 border-none';
  const pending =
    'bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-200 border-none';
  const failed =
    'bg-rose-100 text-rose-800 dark:bg-rose-900/35 dark:text-rose-300 border-none';
  const inProgress =
    'bg-sky-100 text-sky-900 dark:bg-sky-900/35 dark:text-sky-200 border-none';
  const neutral =
    'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300 border-none';

  if (key === 'delivered' || key === 'completed') return completed;
  if (key === 'placed' || key === 'pending') return pending;
  if (key === 'failed' || key === 'cancelled' || key === 'canceled') return failed;
  if (
    key === 'confirmed' ||
    key === 'packed' ||
    key === 'shipped' ||
    key === 'out_for_delivery' ||
    key === 'processing' ||
    key === 'order_placed'
  ) {
    return inProgress;
  }
  return neutral;
}

function paymentBadgeClass(isPaid: boolean | undefined): string {
  if (isPaid) {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-300 border-none';
  }
  return 'bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-200 border-none';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts[0]?.[0]?.toUpperCase() || '?';
}

function makeFormatMoney(_useInr?: boolean): (amount: number) => string {
  return (amount: number) => {
    const n = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };
}

function relativeTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatDistanceToNow(d, { addSuffix: true });
}

function na(v: unknown): string {
  if (v == null) return 'N/A';
  if (typeof v === 'string' && !String(v).trim()) return 'N/A';
  if (typeof v === 'number' && Number.isNaN(v)) return 'N/A';
  return String(v);
}

function fmtDateTime(iso: string | undefined): string {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return format(d, 'PPpp');
}

function formatOrderSource(src: string | null | undefined): string {
  if (src == null || String(src).trim() === '') return 'N/A';
  const s = String(src).trim().toLowerCase();
  if (s === 'pos') return 'POS';
  if (s === 'website' || s === 'web') return 'Website';
  if (s === 'admin') return 'Admin';
  return String(src).trim();
}

type OrderDetail = Record<string, unknown> & {
  items?: Array<{ name?: string; price?: number; quantity?: number; productId?: string }>;
  shippingAddress?: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
};

function computeSubtotal(items: OrderDetail['items']): number | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  let sum = 0;
  for (const it of items) {
    const p = Number(it?.price);
    const q = Number(it?.quantity);
    if (Number.isFinite(p) && Number.isFinite(q)) sum += p * q;
  }
  return sum;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 py-2 text-sm border-b border-zinc-100/80 dark:border-zinc-800/80 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-zinc-900 dark:text-zinc-50 text-right sm:max-w-[65%] break-words">
        {value}
      </span>
    </div>
  );
}

function RecentActivityDetailBody({
  order,
  formatMoney,
}: {
  order: OrderDetail;
  formatMoney: (amount: number) => string;
}) {
  const ship = order.shippingAddress && typeof order.shippingAddress === 'object' ? order.shippingAddress : {};
  const customerName =
    na(order.customerName) !== 'N/A'
      ? String(order.customerName)
      : na(ship.fullName);
  const email =
    na(order.customerEmail) !== 'N/A'
      ? String(order.customerEmail)
      : na(ship.email);
  const phone = na(ship.phone);
  const orderStatus =
    (order.orderStatusResolved as string) ||
    (order.orderStatus as string) ||
    '';
  const trackingDisplay =
    (order.trackingStatusResolved as string) ||
    (order.trackingStatus as string) ||
    '';
  const subtotal = computeSubtotal(order.items);
  const items = Array.isArray(order.items) ? order.items : [];

  const addrParts = [
    ship.address,
    [ship.city, ship.state].filter(Boolean).join(', '),
    ship.zipCode,
    ship.country,
  ].filter((p) => p != null && String(p).trim() !== '');

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-wrap gap-2 items-center">
        <Badge className={statusBadgeClass(orderStatus)}>{formatStatusLabel(orderStatus) || 'N/A'}</Badge>
        <Badge className={paymentBadgeClass(order.isPaid as boolean | undefined)}>
          {(order.isPaid as boolean) ? 'Paid' : 'Unpaid'}
        </Badge>
        {trackingDisplay && trackingDisplay !== 'N/A' ? (
          <Badge variant="outline" className="border-zinc-300 dark:border-zinc-600">
            {trackingDisplay}
          </Badge>
        ) : null}
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Customer</h4>
        <DetailRow label="Name" value={customerName} />
        <DetailRow
          label="Email"
          value={
            email !== 'N/A' ? (
              <a href={`mailto:${email}`} className="text-[#b8860b] hover:underline dark:text-amber-300">
                {email}
              </a>
            ) : (
              'N/A'
            )
          }
        />
        <DetailRow label="Phone" value={phone} />
      </div>

      <Separator />

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
          <Package className="w-3.5 h-3.5" /> Order &amp; payment
        </h4>
        <DetailRow label="Order ID" value={na(order.orderId)} />
        <DetailRow
          label="Transaction / tracking ID"
          value={na((order.trackingId as string) || (order.effectiveTrackingId as string))}
        />
        <DetailRow label="Payment method" value={na(order.paymentMethod)} />
        <DetailRow label="Order source" value={formatOrderSource(order.orderSource as string)} />
        <DetailRow label="Created" value={fmtDateTime(order.createdAt as string)} />
        <DetailRow label="Last updated" value={fmtDateTime(order.updatedAt as string)} />
      </div>

      <Separator />

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Line items</h4>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">N/A</p>
        ) : (
          <ul className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 divide-y divide-zinc-200/80 dark:divide-zinc-800 overflow-hidden">
            {items.map((it, idx) => {
              const price = Number(it?.price);
              const qty = Number(it?.quantity);
              const line = Number.isFinite(price) && Number.isFinite(qty) ? price * qty : NaN;
              return (
                <li key={`${it.productId ?? 'item'}-${idx}`} className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 bg-white/50 dark:bg-zinc-950/30">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50 text-sm">{na(it?.name)}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground tabular-nums">
                    {formatMoney(Number.isFinite(price) ? price : 0)} × {Number.isFinite(qty) ? qty : 'N/A'} ={' '}
                    {Number.isFinite(line) ? formatMoney(line) : 'N/A'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Separator />

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Totals</h4>
        <DetailRow label="Subtotal (items)" value={subtotal != null ? formatMoney(subtotal) : 'N/A'} />
        <DetailRow label="Tax" value="N/A" />
        <DetailRow label="Discount" value="N/A" />
        <DetailRow label="Shipping" value="N/A" />
        <DetailRow label="Final total" value={formatMoney(Number(order.totalPrice))} />
      </div>

      <Separator />

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> Delivery address
        </h4>
        {addrParts.length > 0 ? (
          <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
            {addrParts.join('\n')}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">N/A</p>
        )}
      </div>

      {String(order.orderStatus || '').toLowerCase() === 'cancelled' ||
      String(order.orderStatusResolved || '').toLowerCase() === 'cancelled' ? (
        <>
          <Separator />
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> Cancellation
            </h4>
            <DetailRow label="Reason" value={na(order.cancellationReason)} />
            <DetailRow label="Cancelled at" value={fmtDateTime(order.cancelledAt as string)} />
          </div>
        </>
      ) : null}
    </div>
  );
}

type DashboardRecentActivityProps = {
  /** Super Admin overview: format amounts in ₹ */
  indianRupee?: boolean;
};

export function DashboardRecentActivity({ indianRupee = false }: DashboardRecentActivityProps) {
  const navigate = useNavigate();
  const formatMoney = useMemo(() => makeFormatMoney(!!indianRupee), [indianRupee]);
  const [rows, setRows] = useState<LatestTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLatestTransactions({ limit: 12 });
      if (res.success && Array.isArray(res.data)) {
        setRows(res.data);
      } else {
        setRows([]);
        if (!res.success && res.message) {
          setError(res.message);
        }
      }
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = useCallback(async (mongoId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailOrder(null);
    try {
      const res = await getOrderById(mongoId);
      if (res.success && res.data) {
        setDetailOrder(res.data as OrderDetail);
      } else {
        setDetailError(res.message || 'Could not load order details');
      }
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Failed to load order details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleDetailOpenChange = useCallback((open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      setDetailOrder(null);
      setDetailError(null);
      setDetailLoading(false);
    }
  }, []);

  return (
    <>
      <Card className="mt-2 overflow-hidden rounded-[1.125rem] border border-white/65 bg-white/65 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.1),0_0_0_1px_rgba(212,175,55,0.07)] backdrop-blur-xl transition-all duration-300 ease-out hover:shadow-[0_20px_48px_-20px_rgba(212,175,55,0.16)] dark:border-white/10 dark:bg-zinc-950/60">
        <CardHeader className="flex flex-row items-center justify-between pt-6 px-6 pb-2">
          <div>
            <CardTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Recent Activity</CardTitle>
            <CardDescription className="text-sm mt-1 leading-relaxed">Latest transactions across your store.</CardDescription>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/orders')}
            className="text-sm font-semibold text-[#b8860b] hover:text-[#9a7b28] transition-colors duration-300 dark:text-amber-300 dark:hover:text-amber-200"
          >
            View All
          </button>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6">
          {loading ? (
            <div className="space-y-2 sm:space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl border border-transparent"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                    <div className="space-y-2 min-w-0 flex-1">
                      <Skeleton className="h-4 w-36 rounded-md" />
                      <Skeleton className="h-3 w-52 max-w-full rounded-md" />
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 pl-14 sm:pl-0">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No recent transactions found</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {rows.map((activity, index) => {
                const emailDisplay = activity.customerEmail?.trim() || '—';
                const statusLabel = formatStatusLabel(activity.orderStatus);
                const isPos = (activity.orderSource || '').toLowerCase() === 'pos';

                return (
                  <motion.button
                    key={activity.id}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => void openDetail(activity.id)}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group w-full text-left p-4 rounded-2xl border border-transparent transition-all duration-300 ease-out hover:border-amber-200/40 hover:bg-amber-500/[0.04] hover:shadow-sm dark:hover:border-amber-900/25 dark:hover:bg-amber-400/[0.04] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="h-11 w-11 border-2 border-white dark:border-zinc-800 shadow-md ring-2 ring-amber-200/25 dark:ring-amber-900/30">
                          <AvatarFallback>{getInitials(activity.customerName)}</AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-zinc-900 shadow-sm ${
                            isPos ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        >
                          {isPos ? <ShoppingBag className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-tight text-zinc-900 dark:text-zinc-50 truncate">
                          {activity.customerName}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                          <span
                            className="text-xs text-[#b8860b] dark:text-amber-300 truncate max-w-[200px] sm:max-w-none group-hover:underline underline-offset-2"
                            title={emailDisplay}
                          >
                            {emailDisplay}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" /> {relativeTime(activity.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex flex-row sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 pl-14 sm:pl-0 pointer-events-none">
                      <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {formatMoney(activity.totalPrice)}
                      </span>
                      <Badge className={statusBadgeClass(activity.orderStatus)}>{statusLabel}</Badge>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={handleDetailOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[min(90vh,880px)] overflow-y-auto rounded-[1.125rem] border border-white/65 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-50">Order details</DialogTitle>
            <DialogDescription>
              Full activity for the selected order. Some fields may show N/A when not stored for this order.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3 py-4" aria-busy="true">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          ) : detailError ? (
            <p className="text-sm text-destructive py-4 text-center" role="alert">
              {detailError}
            </p>
          ) : detailOrder ? (
            <RecentActivityDetailBody order={detailOrder} formatMoney={formatMoney} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
