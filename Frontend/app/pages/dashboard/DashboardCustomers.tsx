import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  UserCheck,
  Activity,
  Mail,
  MoreVertical,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { isSuperAdminRole, hasFullAdminPrivileges } from '../../utils/staffRoles';
import ApiService from '../../api/apiService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { CustomerDetailsDrawer } from '../../components/dashboard/CustomerDetailsDrawer';

type CustomerSummary = {
  totalCustomers: number;
  activeMembers: number;
  newThisMonth: number;
  churnRate: number;
  liveCustomers?: number;
  activeWindowDays?: number;
};

const PAGE_SIZE = 10;

type CustomerRow = {
  _id: string;
  name: string;
  email: string;
  totalSpent: number;
  totalOrders: number;
  status: string;
  createdAt?: string;
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
  profilePhoto?: string;
};

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function avatarUrl(c: CustomerRow): string {
  if (c.profilePhoto && String(c.profilePhoto).trim()) return c.profilePhoto;
  const name = encodeURIComponent(c.name || 'User');
  return `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=128`;
}

export function DashboardCustomers() {
  const { user, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listMeta, setListMeta] = useState({ total: 0, pages: 1, limit: PAGE_SIZE });
  const [listError, setListError] = useState<string | null>(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const canViewCustomers = hasFullAdminPrivileges(user?.role);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    if (!canViewCustomers || authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        setSummaryLoading(true);
        setSummaryError(null);
        const res = await ApiService.get<CustomerSummary>('/api/admin/customers/summary', { pageName: 'Customers' });
        if (cancelled) return;
        if (res.success && res.data) setSummary(res.data);
        else setSummaryError(res.message || 'Could not load customer summary');
      } catch (e: unknown) {
        if (!cancelled) setSummaryError(e instanceof Error ? e.message : 'Failed to load summary');
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canViewCustomers, authLoading]);

  useEffect(() => {
    if (!canViewCustomers || authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        setListLoading(true);
        setListError(null);
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          status: statusFilter,
        });
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        const res = await ApiService.get<{
          customers: CustomerRow[];
          total: number;
          pages: number;
          limit: number;
        }>(`/api/admin/customers?${params.toString()}`, { pageName: 'Customers' });
        if (cancelled) return;
        if (res.success && res.data) {
          setCustomers(res.data.customers || []);
          setListMeta({
            total: res.data.total ?? 0,
            pages: res.data.pages ?? 1,
            limit: res.data.limit ?? PAGE_SIZE,
          });
        } else {
          setListError(res.message || 'Could not load customers');
          setCustomers([]);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setListError(e instanceof Error ? e.message : 'Failed to load customers');
          setCustomers([]);
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canViewCustomers, authLoading, page, debouncedSearch, statusFilter]);

  const stats = useMemo(() => {
    const fmt = (n: number) => n.toLocaleString();
    return [
      {
        title: 'Total Customers',
        value: summaryLoading ? '—' : fmt(summary?.totalCustomers ?? 0),
        icon: Users,
        color: 'blue',
      },
      {
        title: 'Active Members',
        value: summaryLoading ? '—' : fmt(summary?.activeMembers ?? 0),
        icon: UserCheck,
        color: 'emerald',
      },
      {
        title: 'New This Month',
        value: summaryLoading ? '—' : fmt(summary?.newThisMonth ?? 0),
        icon: UserPlus,
        color: 'indigo',
      },
      {
        title: 'Churn Rate',
        value: summaryLoading ? '—' : `${(summary?.churnRate ?? 0).toFixed(1)}%`,
        icon: Activity,
        color: 'rose',
      },
    ];
  }, [summary, summaryLoading]);

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 text-center dark:border-white/10 dark:bg-black/40">
        <p className="text-muted-foreground">Sign in to view customer analytics.</p>
      </div>
    );
  }

  if (!canViewCustomers) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-8 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
        <p className="font-medium text-amber-900 dark:text-amber-100">
          Customer analytics and directory are restricted to authorized personnel.
        </p>
        <p className="mt-2 text-sm text-amber-800/80 dark:text-amber-200/80">
          Contact a Super Admin if you believe you should have access to this data.
        </p>
      </div>
    );
  }

  const showTableSkeleton = listLoading && customers.length === 0;
  const empty = !listLoading && customers.length === 0;

  return (
    <div className="space-y-6">
      {(summaryError || listError) && (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
          role="alert"
        >
          {summaryError && <p>{summaryError}</p>}
          {listError && <p className={summaryError ? 'mt-1' : ''}>{listError}</p>}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="group relative overflow-hidden border-none bg-white/50 shadow-md backdrop-blur-md dark:bg-black/40">
              <div className={`absolute left-0 top-0 h-full w-1 bg-${stat.color}-500 opacity-70`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-lg bg-${stat.color}-500/10 p-1.5 text-${stat.color}-500`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <div className="h-9 w-24 animate-pulse rounded-md bg-gray-200/80 dark:bg-white/10" />
                ) : (
                  <div className="text-2xl font-black">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Customer List */}
      <Card className="overflow-hidden rounded-2xl border-none bg-white/80 shadow-xl backdrop-blur-xl dark:bg-black/40">
        <CardHeader className="border-b border-gray-100 pb-6 dark:border-white/5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <CardTitle className="text-xl font-bold">Customer Directory</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your customer base and their engagement.
                {summary?.activeWindowDays != null && (
                  <span className="ml-1">
                    Active status uses the last {summary.activeWindowDays} days of activity.
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  className="w-64 rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search customers"
                />
              </div>
              <div className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 dark:border-white/10 dark:bg-black/40">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="max-w-[160px] cursor-pointer bg-transparent text-sm focus:outline-none"
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-[12px] font-bold uppercase tracking-wider text-muted-foreground dark:bg-white/[0.02]">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Total Spent</th>
                  <th className="px-6 py-4">Orders</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {showTableSkeleton &&
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`sk-${idx}`}>
                      <td className="px-6 py-4" colSpan={5}>
                        <div className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
                      </td>
                    </tr>
                  ))}
                {!listLoading &&
                  customers.map((customer, idx) => (
                    <motion.tr
                      key={customer._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/5">
                            <img
                              src={avatarUrl(customer)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">{customer.name}</span>
                            <span className="text-[10px] text-muted-foreground">{customer.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-foreground">
                          $
                          {Number(customer.totalSpent || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium">
                          {customer.totalOrders === 1 ? '1 order' : `${customer.totalOrders} orders`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            customer.status === 'active'
                              ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-gray-100/50 text-gray-600 dark:bg-white/5 dark:text-gray-400'
                          }`}
                        >
                          {customer.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                            asChild
                          >
                            <a href={`mailto:${encodeURIComponent(customer.email)}`} aria-label="Email customer">
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                type="button"
                              >
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCustomerId(customer._id);
                                  setDetailsDrawerOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>

          {empty && !showTableSkeleton && (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              No customers match your search or filters.
            </div>
          )}

          {listMeta.pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-white/5">
              <p className="text-xs text-muted-foreground">
                Page {page} of {listMeta.pages} ({listMeta.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page <= 1 || listLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page >= listMeta.pages || listLoading}
                  onClick={() => setPage((p) => Math.min(listMeta.pages, p + 1))}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerDetailsDrawer
        open={detailsDrawerOpen}
        onOpenChange={setDetailsDrawerOpen}
        customerId={selectedCustomerId}
      />
    </div>
  );
}
