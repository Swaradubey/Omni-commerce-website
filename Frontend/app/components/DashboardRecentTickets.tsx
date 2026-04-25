import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { motion } from 'framer-motion';
import { Headphones, Clock, Mail, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getAdminTickets, type SupportTicket, TICKET_STATUS_LABELS } from '../api/supportTickets';

function statusBadgeClass(status: string): string {
  const s = String(status || '').toLowerCase();
  if (s === 'resolved' || s === 'closed')
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-300 border-none';
  if (s === 'open')
    return 'bg-rose-100 text-rose-800 dark:bg-rose-900/35 dark:text-rose-300 border-none';
  if (s === 'pending' || s === 'in_progress')
    return 'bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-200 border-none';
  return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300 border-none';
}

export function DashboardRecentTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminTickets({ limit: 5 });
      setTickets(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="mt-8 overflow-hidden rounded-[1.125rem] border border-white/65 bg-white/65 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.1),0_0_0_1px_rgba(212,175,55,0.07)] backdrop-blur-xl transition-all duration-300 ease-out hover:shadow-[0_20px_48px_-20px_rgba(212,175,55,0.16)] dark:border-white/10 dark:bg-zinc-950/60">
      <CardHeader className="flex flex-row items-center justify-between pt-6 px-6 pb-2">
        <div>
          <CardTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Recent Support Tickets</CardTitle>
          <CardDescription className="text-sm mt-1 leading-relaxed">Most recent user-raised support requests.</CardDescription>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard/support')}
          className="text-sm font-semibold text-[#b8860b] hover:text-[#9a7b28] transition-colors duration-300 dark:text-amber-300 dark:hover:text-amber-200"
        >
          View All
        </button>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-2xl border border-transparent">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{error}</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No recent tickets found</p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {tickets.map((ticket, index) => (
              <motion.button
                key={ticket._id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.3 }}
                onClick={() => navigate(`/dashboard/support?ticketId=${ticket._id}`)}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group w-full text-left p-4 rounded-2xl border border-transparent transition-all duration-300 ease-out hover:border-amber-200/40 hover:bg-amber-500/[0.04] hover:shadow-sm dark:hover:border-amber-900/25 dark:hover:bg-amber-400/[0.04]"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Headphones className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight text-zinc-900 dark:text-zinc-50 truncate">
                      {ticket.subject}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {ticket.userName || ticket.userEmail || 'User'}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-14 sm:ml-0">
                  <Badge className={statusBadgeClass(ticket.status)}>
                    {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                  </Badge>
                  <Eye className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
