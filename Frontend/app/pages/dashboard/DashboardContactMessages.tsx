import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { Loader2, Mail, MessageSquareText, TicketCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  adminContactApi,
  type ContactMessage,
  type ContactMessageStatus,
} from '../../api/contact';
import {
  getAdminTickets,
  updateTicketStatus,
  type SupportTicket,
  type TicketStatus,
  ISSUE_TYPE_LABELS,
  TICKET_STATUS_LABELS,
} from '../../api/supportTickets';
import { useAuth } from '../../context/AuthContext';
import { hasFullAdminPrivileges } from '../../utils/staffRoles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function ticketStatusBadgeClass(s: TicketStatus): string {
  switch (s) {
    case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-none';
    case 'in_progress': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-none';
    case 'resolved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-none';
    case 'closed': return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400 border-none';
    default: return 'bg-gray-100 text-gray-800 border-none';
  }
}

function truncate(text: string, max: number) {
  if (!text) return '—';
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

type ActiveTab = 'contact' | 'tickets';

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardContactMessages() {
  const { token, user } = useAuth();
  const canView = hasFullAdminPrivileges(user?.role);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('contact');

  // ── Contact messages state ─────────────────────────────────────────────────
  const [rows, setRows] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Support tickets state ──────────────────────────────────────────────────
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [ticketUpdatingId, setTicketUpdatingId] = useState<string | null>(null);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<TicketStatus | ''>('');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [adminReply, setAdminReply] = useState<Record<string, string>>({});

  // ─── Load contact messages ──────────────────────────────────────────────
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

  // ─── Load support tickets ───────────────────────────────────────────────
  const loadTickets = useCallback(async () => {
    if (!token || !canView) { setTicketsLoading(false); return; }
    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const res = await getAdminTickets(
        ticketStatusFilter ? { status: ticketStatusFilter as TicketStatus } : undefined
      );
      setTickets(res.data);
    } catch (e) {
      setTicketsError(e instanceof Error ? e.message : 'Could not load support tickets');
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, [token, canView, ticketStatusFilter]);

  useEffect(() => { if (activeTab === 'tickets') loadTickets(); }, [activeTab, loadTickets]);

  // ─── Derived values ─────────────────────────────────────────────────────
  const total = rows.length;
  const newCount = useMemo(() => rows.filter((r) => r.status === 'new').length, [rows]);
  const isAdmin = hasFullAdminPrivileges(user?.role);

  const openTickets = useMemo(() => tickets.filter((t) => t.status === 'open').length, [tickets]);

  const DELETE_SELECT_VALUE = 'delete';

  // ─── Contact message handlers ────────────────────────────────────────────
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

  // ─── Ticket status update ────────────────────────────────────────────────
  const onTicketStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    setTicketUpdatingId(ticketId);
    try {
      const reply = adminReply[ticketId]?.trim() || undefined;
      const updated = await updateTicketStatus(ticketId, { status: newStatus, adminResponse: reply });
      setTickets((prev) => prev.map((t) => (t._id === ticketId ? updated : t)));
      setAdminReply((prev) => ({ ...prev, [ticketId]: '' }));
      toast.success('Ticket updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update ticket');
    } finally {
      setTicketUpdatingId(null);
    }
  };

  // ─── Access guard ────────────────────────────────────────────────────────
  if (!canView) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-800 px-6 py-12 text-center">
        <p className="text-amber-900 dark:text-amber-200 font-medium">Access denied</p>
        <p className="text-sm text-muted-foreground mt-2">Contact messages and support tickets are visible to administrators only.</p>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
        <MessageSquareText className="w-5 h-5 text-blue-600 shrink-0" aria-hidden />
        <p className="text-foreground">
          <span className="font-semibold">Messages & Tickets</span>
          {' — '}
          Contact form entries and order-related support tickets from users.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-none shadow-md bg-white/50 dark:bg-black/40 backdrop-blur-md overflow-hidden relative">
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
          <Card className="border-none shadow-md bg-white/50 dark:bg-black/40 backdrop-blur-md overflow-hidden relative">
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-none shadow-md bg-white/50 dark:bg-black/40 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-70" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Open tickets</CardTitle>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500"><TicketCheck className="w-4 h-4" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{openTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">User support tickets awaiting response</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/5 p-1.5 w-fit">
        <button
          type="button"
          id="tab-contact-messages"
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition ${activeTab === 'contact' ? 'bg-white dark:bg-black/60 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Mail className="w-4 h-4" />
          Contact Messages
          {newCount > 0 && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">{newCount}</span>
          )}
        </button>
        <button
          type="button"
          id="tab-support-tickets"
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition ${activeTab === 'tickets' ? 'bg-white dark:bg-black/60 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <TicketCheck className="w-4 h-4" />
          Support Tickets
          {openTickets > 0 && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{openTickets}</span>
          )}
        </button>
      </div>

      {/* ── Contact Messages Tab ─────────────────────────────────────────── */}
      {activeTab === 'contact' && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
              <p className="text-sm font-medium">Loading contact messages…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 dark:bg-red-950/20 dark:border-red-900 px-6 py-8">
              <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
              <button type="button" onClick={() => load()} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Retry</button>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                <Mail className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No contact messages yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                When visitors submit the contact form on your site, entries will appear here.
              </p>
            </div>
          ) : (
            <Card className="border-none shadow-xl bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-100 dark:border-white/5 pb-4">
                <CardTitle className="text-xl font-bold">Contact form submissions</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage inquiries from the website contact page. Open{' '}
                  <Link to="/dashboard/inbox" className="text-blue-600 font-semibold hover:underline">Inbox</Link>{' '}
                  for ongoing customer conversations.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 dark:bg-white/[0.02] text-muted-foreground text-[12px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Subject</th>
                        <th className="px-6 py-4 min-w-[200px]">Message</th>
                        <th className="px-6 py-4">Submitted</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {rows.map((row) => (
                        <tr key={row._id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold">{row.firstName} {row.lastName}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{row.email}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{row.phone || '—'}</td>
                          <td className="px-6 py-4 text-sm max-w-[180px]" title={row.subject}>{truncate(row.subject, 48)}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground max-w-[280px]" title={row.message}>{truncate(row.message, 120)}</td>
                          <td className="px-6 py-4 text-xs whitespace-nowrap text-muted-foreground">{formatDate(row.createdAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <Badge className={statusBadgeClass(row.status)}>{statusLabel(row.status)}</Badge>
                              <label className="sr-only" htmlFor={`status-${row._id}`}>Update status for {row.email}</label>
                              <select
                                id={`status-${row._id}`}
                                className="text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-2 py-1.5 max-w-[140px]"
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
        </>
      )}

      {/* ── Support Tickets Tab ──────────────────────────────────────────── */}
      {activeTab === 'tickets' && (
        <>
          {/* Filter + refresh */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold" htmlFor="ticket-status-filter">Filter by status:</label>
            <select
              id="ticket-status-filter"
              value={ticketStatusFilter}
              onChange={(e) => setTicketStatusFilter(e.target.value as TicketStatus | '')}
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-1.5 text-sm"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button
              type="button"
              onClick={() => void loadTickets()}
              disabled={ticketsLoading}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${ticketsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {ticketsLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
              <p className="text-sm font-medium">Loading support tickets…</p>
            </div>
          ) : ticketsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 dark:bg-red-950/20 dark:border-red-900 px-6 py-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 dark:text-red-200 font-medium">{ticketsError}</p>
                  <button type="button" onClick={() => void loadTickets()} className="mt-2 text-sm font-bold text-blue-600 hover:underline">Retry</button>
                </div>
              </div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20">
                <TicketCheck className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold mb-2">No support tickets yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                When users submit order-related support requests from the Help Center, tickets will appear here.
              </p>
            </div>
          ) : (
            <Card className="border-none shadow-xl bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-100 dark:border-white/5 pb-4">
                <CardTitle className="text-xl font-bold">Support Tickets ({tickets.length})</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Order-related user support requests. Update status and optionally add a reply for each ticket.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {tickets.map((t) => {
                    const isExpanded = expandedTicketId === t._id;
                    const userName = typeof t.user === 'object' ? t.user?.name : t.userName || '—';
                    const userEmail = typeof t.user === 'object' ? t.user?.email : t.userEmail || '—';
                    const orderObj = typeof t.order === 'object' && t.order ? t.order : null;
                    return (
                      <div key={t._id} className="p-6">
                        {/* Ticket header row */}
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-muted-foreground">#{t._id.slice(-6).toUpperCase()}</span>
                              <Badge className={ticketStatusBadgeClass(t.status)}>{TICKET_STATUS_LABELS[t.status] ?? t.status}</Badge>
                            </div>
                            <p className="text-sm font-bold">{t.subject}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span><span className="font-semibold text-foreground">User:</span> {userName} ({userEmail})</span>
                              <span><span className="font-semibold text-foreground">Type:</span> {ISSUE_TYPE_LABELS[t.issueType] ?? t.issueType}</span>
                              {(t.orderRef || orderObj) && (
                                <span>
                                  <span className="font-semibold text-foreground">Order:</span>{' '}
                                  <span className="font-mono text-blue-600 dark:text-blue-400">
                                    #{t.orderRef || (orderObj as any)?.orderId}
                                  </span>
                                </span>
                              )}
                              <span><span className="font-semibold text-foreground">Submitted:</span> {formatDate(t.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <label className="sr-only" htmlFor={`ticket-status-${t._id}`}>Update ticket status</label>
                            <select
                              id={`ticket-status-${t._id}`}
                              className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                              value={t.status}
                              disabled={ticketUpdatingId === t._id}
                              onChange={(e) => void onTicketStatusChange(t._id, e.target.value as TicketStatus)}
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setExpandedTicketId(isExpanded ? null : t._id)}
                              className="rounded-xl border border-gray-200 dark:border-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition"
                            >
                              {isExpanded ? 'Collapse' : 'View details'}
                            </button>
                          </div>
                        </div>

                        {/* Expanded detail panel */}
                        {isExpanded && (
                          <div className="mt-4 space-y-4">
                            <div className="rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-4">
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">User Message</p>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{t.description}</p>
                            </div>

                            {t.adminResponse && (
                              <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-4">
                                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-2">Admin Response</p>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{t.adminResponse}</p>
                              </div>
                            )}

                            {/* Admin reply textarea */}
                            <div>
                              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground" htmlFor={`admin-reply-${t._id}`}>
                                {t.adminResponse ? 'Update reply' : 'Add reply (optional)'}
                              </label>
                              <textarea
                                id={`admin-reply-${t._id}`}
                                rows={3}
                                value={adminReply[t._id] ?? ''}
                                onChange={(e) => setAdminReply((prev) => ({ ...prev, [t._id]: e.target.value }))}
                                placeholder="Type a response to the user…"
                                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-y"
                              />
                              <div className="mt-2 flex justify-end">
                                <button
                                  type="button"
                                  disabled={ticketUpdatingId === t._id || !adminReply[t._id]?.trim()}
                                  onClick={() => void onTicketStatusChange(t._id, t.status)}
                                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                                >
                                  {ticketUpdatingId === t._id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                  Save reply
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
