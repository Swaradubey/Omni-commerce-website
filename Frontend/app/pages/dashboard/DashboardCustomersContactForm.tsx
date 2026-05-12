import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Mail, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  adminContactApi,
  type ContactMessage,
  type ContactMessageStatus,
} from '../../api/contact';
import { useAuth } from '../../context/AuthContext';
import { hasFullAdminPrivileges } from '../../utils/staffRoles';

function formatDate(iso: string | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function statusLabel(s: ContactMessageStatus): string {
  switch (s) {
    case 'new': return 'New';
    case 'in-progress': return 'In progress';
    case 'resolved': return 'Resolved';
    default: return s;
  }
}

function statusBadgeClass(s: ContactMessageStatus): string {
  switch (s) {
    case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-none';
    case 'in-progress': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-none';
    case 'resolved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-none';
    default: return 'bg-gray-100 text-gray-800 border-none';
  }
}

function truncate(text: string, max: number) {
  if (!text) return '—';
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function DashboardCustomersContactForm() {
  const { token, user } = useAuth();
  const canView = hasFullAdminPrivileges(user?.role);

  const [rows, setRows] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !canView) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await adminContactApi.getAll();
      setRows(res.success && Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load contact messages');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, canView]);

  useEffect(() => { load(); }, [load]);

  const total = rows.length;
  const newCount = useMemo(() => rows.filter((r) => r.status === 'new').length, [rows]);
  const isAdmin = hasFullAdminPrivileges(user?.role);
  const DELETE_SELECT_VALUE = 'delete';

  const onStatusChange = async (id: string, value: string) => {
    if (value === DELETE_SELECT_VALUE) {
      if (!window.confirm('Delete this contact message permanently?')) return;
      setUpdatingId(id);
      try {
        const res = await adminContactApi.deleteMessage(id);
        if (res.success) {
          setRows((prev) => prev.filter((r) => r._id !== id));
          toast.success(res.message || 'Message deleted');
        } else {
          throw new Error((res as any).message || 'Delete failed');
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not delete message');
      } finally {
        setUpdatingId(null);
      }
      return;
    }
    setUpdatingId(id);
    try {
      const res = await adminContactApi.updateStatus(id, value as ContactMessageStatus);
      if (res.success && res.data) {
        setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...res.data! } : r)));
        toast.success('Status updated');
      } else {
        throw new Error((res as any).message || 'Update failed');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!canView) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-8 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
        <p className="font-medium text-amber-900 dark:text-amber-100">
          Contact messages are restricted to authorized personnel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="group relative overflow-hidden border-none bg-white/50 shadow-md backdrop-blur-md dark:bg-black/40">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-70" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total messages</CardTitle>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500"><Mail className="w-4 h-4" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{total}</div>
              <p className="text-xs text-muted-foreground mt-1">All-time contact form submissions</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="group relative overflow-hidden border-none bg-white/50 shadow-md backdrop-blur-md dark:bg-black/40">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 opacity-70" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New / unread</CardTitle>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><MessageSquareText className="w-4 h-4" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{newCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Submissions still marked as new</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
          <p className="text-sm font-medium">Loading contact messages…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-6 py-8 dark:bg-red-950/20 dark:border-red-900">
          <p className="text-red-800 font-medium dark:text-red-200">{error}</p>
          <button type="button" onClick={() => load()} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Retry</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-16 text-center dark:border-white/10 dark:bg-white/5">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20">
            <Mail className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">No contact messages yet</h2>
          <p className="mx-auto max-w-md text-muted-foreground">
            When visitors submit the contact form on your site, entries will appear here.
          </p>
        </div>
      ) : (
        <Card className="overflow-hidden rounded-2xl border-none bg-white/80 shadow-xl backdrop-blur-xl dark:bg-black/40">
          <CardHeader className="border-b border-gray-100 pb-6 dark:border-white/5">
            <CardTitle className="text-xl font-bold">Contact Form Leads</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage inquiries and leads from the website contact page.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-[12px] font-bold uppercase tracking-wider text-muted-foreground dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4 min-w-[200px]">Message</th>
                    <th className="px-6 py-4">Submitted</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {rows.map((row) => (
                    <tr key={row._id} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{row.firstName} {row.lastName}</span>
                          <span className="text-[10px] text-muted-foreground">{row.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{row.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium" title={row.subject}>{truncate(row.subject, 40)}</span>
                          <span className="text-xs text-muted-foreground mt-0.5" title={row.message}>{truncate(row.message, 100)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs whitespace-nowrap text-muted-foreground">{formatDate(row.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Badge className={statusBadgeClass(row.status)}>{statusLabel(row.status)}</Badge>
                          <label className="sr-only" htmlFor={`status-${row._id}`}>Update status for {row.email}</label>
                          <select
                            id={`status-${row._id}`}
                            className="max-w-[140px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs dark:border-white/10 dark:bg-black/40"
                            value={row.status}
                            disabled={updatingId === row._id}
                            onChange={(e) => onStatusChange(row._id, e.target.value)}
                          >
                            <option value="new">New</option>
                            <option value="in-progress">In progress</option>
                            <option value="resolved">Resolved</option>
                            {isAdmin && <option value={DELETE_SELECT_VALUE}>Delete</option>}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
