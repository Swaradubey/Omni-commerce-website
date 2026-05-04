import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  ShoppingCart,
  Receipt,
  Users,
  Loader2,
  AlertCircle,
  PackageOpen,
  BadgeCheck,
  BadgeX,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { superAdminClientsApi, type SuperAdminClientData } from '../../api/superAdminClientsApi';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SaleRow {
  _id: string;
  orderId?: string;
  customerName?: string;
  user?: { name?: string; email?: string } | string;
  totalPrice?: number;
  paymentStatus?: string;
  isPaid?: boolean;
  createdAt?: string;
}

interface InvoiceRow {
  _id: string;
  invoiceNumber?: string;
  orderId?: string;
  customerName?: string;
  customer?: { name?: string; email?: string } | string;
  total?: number;
  totalAmount?: number;
  paymentStatus?: string;
  status?: string;
  createdAt?: string;
}

interface CustomerRow {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  totalOrders?: number;
  totalSpent?: number;
  createdAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n?: number) {
  if (n == null) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function PaymentBadge({ status, isPaid }: { status?: string; isPaid?: boolean }) {
  const s = (status ?? '').toLowerCase();
  const paid = isPaid || s === 'paid' || s === 'completed' || s === 'success';
  const pending = s === 'pending' || s === 'unpaid' || s === '';
  const failed = s === 'failed' || s === 'cancelled' || s === 'refunded';

  if (paid) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
      <BadgeCheck className="w-3 h-3" /> Paid
    </span>
  );
  if (failed) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
      <BadgeX className="w-3 h-3" /> {status || 'Failed'}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
      <Clock className="w-3 h-3" /> {status || 'Pending'}
    </span>
  );
}

// ─── Loading / Empty / Error states ──────────────────────────────────────────

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3].map(i => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${60 + (j * 10) % 30}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={99} className="px-6 py-14 text-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <PackageOpen className="w-10 h-10 opacity-40" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      </td>
    </tr>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <tr>
      <td colSpan={99} className="px-6 py-14 text-center">
        <div className="flex flex-col items-center gap-3 text-rose-500 dark:text-rose-400">
          <AlertCircle className="w-8 h-8 opacity-60" />
          <p className="text-sm font-medium">{message}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabKey = 'sales' | 'invoices' | 'customers';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'sales',     label: 'Sales',     icon: ShoppingCart },
  { key: 'invoices',  label: 'Invoices',  icon: Receipt },
  { key: 'customers', label: 'Customers', icon: Users },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function SuperAdminClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('sales');

  // Client info
  const [client, setClient] = useState<SuperAdminClientData | null>(null);
  const [clientLoading, setClientLoading] = useState(true);

  // Tab data
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);

  // ── Load client info ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!clientId) return;
    setClientLoading(true);
    superAdminClientsApi.listClients()
      .then(res => {
        const found = (res.data ?? []).find(c => c._id === clientId) ?? null;
        setClient(found as SuperAdminClientData | null);
      })
      .catch(() => setClient(null))
      .finally(() => setClientLoading(false));
  }, [clientId]);

  // ── Sales ─────────────────────────────────────────────────────────────────
  const loadSales = useCallback(async () => {
    if (!clientId) return;
    console.log(`[SuperAdminClientDetail] Selected clientId: ${clientId}`);
    const url = `/api/superadmin/clients/${clientId}/sales`;
    console.log(`[SuperAdminClientDetail] API URL called: ${url}`);
    setSalesLoading(true);
    setSalesError(null);
    try {
      const res = await superAdminClientsApi.getClientSales(clientId);
      const rows: SaleRow[] = Array.isArray(res.data) ? res.data : [];
      console.log(`[SuperAdminClientDetail] Sales returned: ${rows.length}`);
      setSales(rows);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load sales';
      setSalesError(msg);
      toast.error(msg);
    } finally {
      setSalesLoading(false);
    }
  }, [clientId]);

  // ── Invoices ──────────────────────────────────────────────────────────────
  const loadInvoices = useCallback(async () => {
    if (!clientId) return;
    console.log(`[SuperAdminClientDetail] Selected clientId: ${clientId}`);
    const url = `/api/superadmin/clients/${clientId}/invoices`;
    console.log(`[SuperAdminClientDetail] API URL called: ${url}`);
    setInvoicesLoading(true);
    setInvoicesError(null);
    try {
      const res = await superAdminClientsApi.getClientInvoices(clientId);
      const rows: InvoiceRow[] = Array.isArray(res.data) ? res.data : [];
      console.log(`[SuperAdminClientDetail] Invoices returned: ${rows.length}`);
      setInvoices(rows);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load invoices';
      setInvoicesError(msg);
      toast.error(msg);
    } finally {
      setInvoicesLoading(false);
    }
  }, [clientId]);

  // ── Customers ─────────────────────────────────────────────────────────────
  const loadCustomers = useCallback(async () => {
    if (!clientId) return;
    console.log(`[SuperAdminClientDetail] Selected clientId: ${clientId}`);
    const url = `/api/superadmin/clients/${clientId}/customers`;
    console.log(`[SuperAdminClientDetail] API URL called: ${url}`);
    setCustomersLoading(true);
    setCustomersError(null);
    try {
      const res = await superAdminClientsApi.getClientCustomers(clientId);
      const rows: CustomerRow[] = Array.isArray(res.data) ? res.data : [];
      console.log(`[SuperAdminClientDetail] Customers returned: ${rows.length}`);
      setCustomers(rows);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load customers';
      setCustomersError(msg);
      toast.error(msg);
    } finally {
      setCustomersLoading(false);
    }
  }, [clientId]);

  // Load all tab data on mount
  useEffect(() => {
    void loadSales();
    void loadInvoices();
    void loadCustomers();
  }, [loadSales, loadInvoices, loadCustomers]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Back + header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Button asChild variant="ghost" size="sm" className="gap-2 -ml-1 text-muted-foreground hover:text-foreground">
          <Link to="/super-admin/clients">
            <ArrowLeft className="w-4 h-4" />
            Back to Clients
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-900/40 dark:to-violet-800/30 shadow-sm">
            <Building2 className="w-6 h-6 text-violet-600 dark:text-violet-300" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1 px-2.5 py-0.5 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 text-xs font-semibold uppercase tracking-wide">
                Super Admin
              </Badge>
            </div>
            {clientLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading client info…</span>
              </div>
            ) : client ? (
              <>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">{client.companyName}</h2>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground mt-1">
                  {client.shopName && <span>🏪 {client.shopName}</span>}
                  {client.email && <span>✉️ {client.email}</span>}
                  {client.phone && <span>📞 {client.phone}</span>}
                </div>
              </>
            ) : (
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Client Details</h2>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-border/50 w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const count = tab.key === 'sales' ? sales.length : tab.key === 'invoices' ? invoices.length : customers.length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab panels */}
        <div className="mt-4">

          {/* ── Sales Tab ────────────────────────────────────────────────── */}
          {activeTab === 'sales' && (
            <Card className="border-border/60 shadow-lg shadow-black/5 dark:shadow-black/20 rounded-xl overflow-hidden">
              <CardHeader className="pb-4 px-6 pt-5 bg-gradient-to-br from-slate-50/50 to-gray-50/30 dark:from-slate-950/20 dark:to-gray-950/10 border-b border-border/50">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/30 shadow-sm">
                    <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                  </div>
                  Sales / Orders
                  <span className="text-sm font-normal text-muted-foreground">({sales.length} records)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 dark:bg-slate-950/50 text-muted-foreground border-b border-border/50">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Order ID</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Payment</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {salesLoading ? (
                        <LoadingRows cols={5} />
                      ) : salesError ? (
                        <ErrorState message={salesError} onRetry={loadSales} />
                      ) : sales.length === 0 ? (
                        <EmptyState message="No sales found for this client." />
                      ) : (
                        sales.map(sale => {
                          const customerName = sale.customerName
                            ?? (typeof sale.user === 'object' && sale.user ? sale.user.name : undefined)
                            ?? (typeof sale.user === 'string' ? sale.user : undefined)
                            ?? '—';
                          return (
                            <tr key={sale._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/30 transition-colors duration-150">
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{sale.orderId || sale._id.slice(-8).toUpperCase()}</td>
                              <td className="px-4 py-3 font-medium text-foreground">{customerName}</td>
                              <td className="px-4 py-3 text-foreground">{fmt(sale.totalPrice)}</td>
                              <td className="px-4 py-3"><PaymentBadge status={sale.paymentStatus} isPaid={sale.isPaid} /></td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(sale.createdAt)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Invoices Tab ──────────────────────────────────────────────── */}
          {activeTab === 'invoices' && (
            <Card className="border-border/60 shadow-lg shadow-black/5 dark:shadow-black/20 rounded-xl overflow-hidden">
              <CardHeader className="pb-4 px-6 pt-5 bg-gradient-to-br from-slate-50/50 to-gray-50/30 dark:from-slate-950/20 dark:to-gray-950/10 border-b border-border/50">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30 shadow-sm">
                    <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  Invoices / Receipts
                  <span className="text-sm font-normal text-muted-foreground">({invoices.length} records)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 dark:bg-slate-950/50 text-muted-foreground border-b border-border/50">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Invoice #</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Order ID</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {invoicesLoading ? (
                        <LoadingRows cols={6} />
                      ) : invoicesError ? (
                        <ErrorState message={invoicesError} onRetry={loadInvoices} />
                      ) : invoices.length === 0 ? (
                        <EmptyState message="No invoices found for this client." />
                      ) : (
                        invoices.map(inv => {
                          const customerName = inv.customerName
                            ?? (typeof inv.customer === 'object' && inv.customer ? inv.customer.name : undefined)
                            ?? (typeof inv.customer === 'string' ? inv.customer : undefined)
                            ?? '—';
                          const total = inv.total ?? inv.totalAmount;
                          return (
                            <tr key={inv._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/30 transition-colors duration-150">
                              <td className="px-4 py-3 font-mono text-xs text-foreground font-medium">{inv.invoiceNumber || inv._id.slice(-8).toUpperCase()}</td>
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.orderId || '—'}</td>
                              <td className="px-4 py-3 font-medium text-foreground">{customerName}</td>
                              <td className="px-4 py-3 text-foreground">{fmt(total)}</td>
                              <td className="px-4 py-3"><PaymentBadge status={inv.paymentStatus || inv.status} /></td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(inv.createdAt)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Customers Tab ─────────────────────────────────────────────── */}
          {activeTab === 'customers' && (
            <Card className="border-border/60 shadow-lg shadow-black/5 dark:shadow-black/20 rounded-xl overflow-hidden">
              <CardHeader className="pb-4 px-6 pt-5 bg-gradient-to-br from-slate-50/50 to-gray-50/30 dark:from-slate-950/20 dark:to-gray-950/10 border-b border-border/50">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-900/40 dark:to-violet-800/30 shadow-sm">
                    <Users className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                  </div>
                  Customers
                  <span className="text-sm font-normal text-muted-foreground">({customers.length} records)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 dark:bg-slate-950/50 text-muted-foreground border-b border-border/50">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Email / Phone</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Total Orders</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Total Spent</th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {customersLoading ? (
                        <LoadingRows cols={5} />
                      ) : customersError ? (
                        <ErrorState message={customersError} onRetry={loadCustomers} />
                      ) : customers.length === 0 ? (
                        <EmptyState message="No customers found for this client." />
                      ) : (
                        customers.map(cust => (
                          <tr key={cust._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/30 transition-colors duration-150">
                            <td className="px-4 py-3 font-medium text-foreground">{cust.name || '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              <div className="flex flex-col gap-0.5">
                                {cust.email && <span>{cust.email}</span>}
                                {cust.phone && <span className="text-xs">{cust.phone}</span>}
                                {!cust.email && !cust.phone && '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-foreground font-semibold">{cust.totalOrders ?? 0}</td>
                            <td className="px-4 py-3 text-foreground">{fmt(cust.totalSpent)}</td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(cust.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </motion.div>
    </div>
  );
}
