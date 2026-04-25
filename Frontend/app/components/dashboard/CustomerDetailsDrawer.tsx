import React, { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '../ui/drawer';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  DollarSign,
  Package,
  Clock,
  User,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { adminCustomersApi, type CustomerDetail } from '../../api/adminCustomers';

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface CustomerDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
}

export function CustomerDetailsDrawer({
  open,
  onOpenChange,
  customerId,
}: CustomerDetailsDrawerProps) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !customerId) {
      setCustomer(null);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await adminCustomersApi.getCustomerById(customerId);
        if (cancelled) return;
        if (res.success && res.data) {
          setCustomer(res.data);
        } else {
          setError(res.message || 'Failed to load customer details');
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load customer details');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
    >
      <DrawerContent className="max-w-md w-full bg-white dark:bg-black">
        <DrawerHeader className="border-b border-gray-100 dark:border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-xl font-bold">Customer Details</DrawerTitle>
              <DrawerDescription>
                View full profile and order history
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="px-6 py-8">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
                {error}
              </div>
            </div>
          )}

          {!loading && !error && customer && (
            <div className="px-6 py-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-gray-100 dark:border-white/10">
                  <AvatarImage src={customer.profilePhoto} />
                  <AvatarFallback className="text-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold truncate">
                    {customer.name}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {customer.email}
                  </p>
                  <Badge
                    variant={customer.status === 'active' ? 'default' : 'secondary'}
                    className={`mt-1.5 ${
                      customer.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'
                    }`}
                  >
                    {customer.status === 'active' ? (
                      <>
                        <Eye className="mr-1 h-3 w-3" /> Active
                      </>
                    ) : (
                      <>
                      <EyeOff className="mr-1 h-3 w-3" /> Inactive
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <DollarSign className="h-3 w-3" />
                    Total Spent
                  </div>
                  <div className="mt-1 text-xl font-bold">
                    {formatCurrency(customer.stats.totalSpent)}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <ShoppingBag className="h-3 w-3" />
                    Total Orders
                  </div>
                  <div className="mt-1 text-xl font-bold">
                    {customer.stats.totalOrders}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Package className="h-3 w-3" />
                    Items Purchased
                  </div>
                  <div className="mt-1 text-xl font-bold">
                    {customer.stats.totalItems}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <User className="h-3 w-3" />
                    Account Type
                  </div>
                  <div className="mt-1 text-sm font-medium capitalize">
                    {customer.role}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  {customer.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {customer.email}
                    </a>
                  </div>
                  {customer.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{customer.address}</span>
                    </div>
                  )}
                  {customer.country && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{customer.country}</span>
                    </div>
                  )}
                  {!customer.phone && !customer.address && !customer.country && (
                    <p className="text-sm text-muted-foreground">
                      No contact information available
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Account Activity */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Account Activity
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Joined: {formatDate(customer.createdAt)}</span>
                  </div>
                  {customer.lastLoginAt && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Last Login: {formatDateTime(customer.lastLoginAt)}
                      </span>
                    </div>
                  )}
                  {customer.lastActiveAt && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Last Active: {formatDateTime(customer.lastActiveAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Recent Orders */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Recent Orders
                </h3>
                {customer.recentOrders && customer.recentOrders.length > 0 ? (
                  <div className="space-y-2">
                    {customer.recentOrders.map((order, idx) => (
                      <div
                        key={order.orderId || idx}
                        className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-white/5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {order.orderId || `Order #${idx + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            {formatCurrency(order.totalPrice)}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No orders found
                  </p>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}