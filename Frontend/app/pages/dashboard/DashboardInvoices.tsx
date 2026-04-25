import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Receipt,
  Search,
  Eye,
  FileText,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import ApiService from '../../api/apiService';
import { toast } from 'sonner';

export function DashboardInvoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.get('/invoices');
      if (response.success && response.data && Array.isArray(response.data)) {
        setInvoices(response.data);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('Failed to fetch invoices', error);
      setInvoices([]);
      toast.error('Could not load invoices.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return invoices;
    return invoices.filter((o) => {
      const id = String(o.invoiceNumber || '').toLowerCase();
      const orderId = String(o.orderId || '').toLowerCase();
      const name = String(o.customerName || '').toLowerCase();
      const email = String(o.customerEmail || '').toLowerCase();
      return id.includes(t) || orderId.includes(t) || name.includes(t) || email.includes(t);
    });
  }, [invoices, searchTerm]);

  const stats = useMemo(() => {
    const total = invoices.length;
    const completed = invoices.filter((o) => String(o.paymentStatus).toLowerCase() === 'paid' || String(o.paymentStatus).toLowerCase() === 'completed').length;
    const pending = total - completed;
    const revenue = invoices.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
    return [
      { title: 'Total Invoices', value: total, icon: Receipt, color: 'blue' },
      { title: 'Paid / Completed', value: completed, icon: CheckCircle2, color: 'emerald' },
      { title: 'Pending', value: pending, icon: FileText, color: 'amber' },
      { title: 'Total Amount', value: `₹${revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'indigo' },
    ];
  }, [invoices]);

  return (
    <div className="relative min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#fff8e8_45%,#fffdf7_100%)] dark:from-[#1a1510] dark:via-[#14120d] dark:to-[#1a1610]">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_60%)] pointer-events-none" />
      <div className="relative space-y-8 p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="relative overflow-hidden rounded-3xl border border-[#F0E4C8] bg-[#FFFDF8]/95 shadow-[0_10px_30px_rgba(212,175,55,0.08)] dark:border-[#3d3522] dark:bg-[#1a1610]/95">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-60" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5">
                  <CardTitle className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#6B7280] dark:text-[#9CA3AF]">
                    {stat.title}
                  </CardTitle>
                  <div
                    className={`rounded-xl p-2.5 ${stat.color === 'blue'
                      ? 'bg-[#EFF6FF] text-[#3B82F6] dark:bg-[#1e3a5f] dark:text-[#60A5FA]'
                      : stat.color === 'amber'
                        ? 'bg-[#FFFBEB] text-[#D97706] dark:bg-[#451a03] dark:text-[#FBBF24]'
                        : stat.color === 'emerald'
                          ? 'bg-[#ECFDF5] text-[#059669] dark:bg-[#042f2e] dark:text-[#34D399]'
                          : 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1e1b4b] dark:text-[#818CF8]'
                      }`}
                  >
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="pb-5">
                  <div className="text-3xl font-bold text-[#1F1F1F] dark:text-[#F9FAFB]">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="overflow-hidden rounded-3xl border border-[#EADFBF] bg-[#FFFDF8] shadow-[0_20px_40px_rgba(212,175,55,0.1)] dark:border-[#3d3522] dark:bg-[#1a1610]">
          <CardHeader className="border-b border-[#EADFBF]/50 pb-6 pt-6 md:pt-8 dark:border-[#3d3522]">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <CardTitle className="text-2xl font-bold text-[#1F1F1F] dark:text-[#F9FAFB]">Invoices & Receipts</CardTitle>
                <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                  View and track invoice records associated with customer orders.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    placeholder="Invoice or Order ID..."
                    className="w-full rounded-xl border border-[#EADFBF] bg-[#FFFCF4] py-2.5 pr-4 pl-10 text-sm text-[#1F1F1F] placeholder:text-[#9CA3AF] transition-all focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none dark:border-[#3d3522] dark:bg-[#252117] dark:text-[#F9FAFB] dark:placeholder:text-[#6B7280] md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#F4E7C5]/30 text-[11px] font-semibold tracking-[0.1em] text-[#6B7280] uppercase dark:bg-[#2a2318] dark:text-[#9CA3AF]">
                  <tr>
                    <th className="px-6 py-4">Invoice No</th>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EADFBF]/50 dark:divide-[#3d3522]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#6B7280]">
                        Loading invoices…
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#6B7280]">
                        No invoices match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv, idx) => (
                      <motion.tr
                        key={inv._id || idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className="group transition-all duration-200 hover:bg-[#F4E7C5]/20 dark:hover:bg-[#2a2318]"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-semibold text-[#D4AF37] dark:text-[#D4AF37]">
                            {inv.invoiceNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-[#6B7280]">
                            {inv.orderId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-[#1F1F1F] dark:text-[#F9FAFB]">
                              {inv.customerName || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-[#9CA3AF]">
                              {inv.createdAt
                                ? new Date(inv.createdAt).toISOString().split('T')[0]
                                : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-[#1F1F1F] dark:text-[#F9FAFB]">
                            ₹{(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide ${String(inv.paymentStatus).toLowerCase() === 'paid' || String(inv.paymentStatus).toLowerCase() === 'completed'
                              ? 'bg-[#ECFDF5] text-[#059669] dark:bg-[#064e3b] dark:text-[#34D399]'
                              : 'bg-[#FFFBEB] text-[#D97706] dark:bg-[#451a03] dark:text-[#FBBF24]'
                              }`}
                          >
                            {inv.paymentStatus || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-full border-[#EADFBF] bg-transparent text-[#1F1F1F] hover:border-[#D4AF37] hover:bg-[#FFFDF8] hover:shadow-md hover:shadow-[#D4AF37]/10 dark:border-[#3d3522] dark:text-[#F9FAFB] dark:hover:border-[#D4AF37] dark:hover:bg-[#252117]"
                              onClick={() => setViewInvoice(inv)}
                            >
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              View
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-stone-200 sm:max-w-2xl bg-white dark:bg-zinc-950">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                Invoice
              </DialogTitle>
            </DialogHeader>

            {viewInvoice && (
              <div className="space-y-6 pt-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-semibold">Billed To</p>
                    <p className="font-bold text-base">{viewInvoice.customerName}</p>
                    <p className="text-muted-foreground">{viewInvoice.customerEmail}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="font-bold text-base text-blue-600 dark:text-blue-400">{viewInvoice.invoiceNumber}</p>
                    <p className="text-muted-foreground">Order ID: {viewInvoice.orderId}</p>
                    <p className="text-muted-foreground">Date: {new Date(viewInvoice.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden mt-6">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {viewInvoice.items?.map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right">₹${Number(item.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-white/5 font-bold">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right">Subtotal</td>
                        <td className="px-4 py-3 text-right">₹${Number(viewInvoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right">Tax</td>
                        <td className="px-4 py-3 text-right">₹${Number(viewInvoice.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="text-base text-blue-600 dark:text-blue-400 border-t">
                        <td colSpan={3} className="px-4 py-4 text-right">Total Amount</td>
                        <td className="px-4 py-4 text-right">₹${Number(viewInvoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Payment Method</p>
                    <p className="font-medium capitalize">{viewInvoice.paymentMethod || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Payment Status</p>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase ${String(viewInvoice.paymentStatus).toLowerCase() === 'paid' || String(viewInvoice.paymentStatus).toLowerCase() === 'completed'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                      }`}>
                      {viewInvoice.paymentStatus || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setViewInvoice(null)}>
                Close
              </Button>
              <Button type="button" className="gap-2" onClick={() => window.print()}>
                <FileText className="w-4 h-4" /> Print Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
