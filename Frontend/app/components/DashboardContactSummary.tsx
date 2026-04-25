import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { ArrowRight, Loader2, Mail, MessageSquareText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from '../context/AuthContext';
import { adminContactApi, type ContactMessage } from '../api/contact';
import { hasFullAdminPrivileges } from '../utils/staffRoles';

const glassWrap =
  'rounded-[1.125rem] border border-white/65 bg-white/65 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.1),0_0_0_1px_rgba(212,175,55,0.07)] backdrop-blur-xl transition-all duration-300 ease-out hover:shadow-[0_20px_48px_-20px_rgba(212,175,55,0.18)] dark:border-white/10 dark:bg-zinc-950/60';

/**
 * Overview strip for staff: contact form totals + link to full list.
 * Only renders for admin / super admin; hidden for staff, customers, and other roles.
 */
export function DashboardContactSummary() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<ContactMessage[] | null>(null);
  const [loading, setLoading] = useState(false);

  const canView = hasFullAdminPrivileges(user?.role);

  const load = useCallback(async () => {
    if (!token || !canView) return;
    setLoading(true);
    try {
      const res = await adminContactApi.getAll();
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, canView]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canView) return null;

  const total = items?.length ?? 0;
  const newCount = items?.filter((m) => m.status === 'new').length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="grid gap-5 sm:gap-6 grid-cols-1 md:grid-cols-3"
    >
      <Card className={`md:col-span-2 relative overflow-hidden border-none ${glassWrap}`}>
        <div className="absolute left-0 top-0 h-full w-1 rounded-l-[1.125rem] bg-gradient-to-b from-[#d4af37] to-amber-800/90" />
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2 pt-6 px-6">
          <div>
            <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2.5 text-zinc-900 dark:text-zinc-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/12 text-[#b8860b] dark:bg-amber-400/15 dark:text-amber-300">
                <MessageSquareText className="w-5 h-5" strokeWidth={2.25} />
              </span>
              Contact form (website)
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
              Visitors who use the public contact page are listed here. This is separate from{' '}
              <span className="text-foreground font-medium">Inbox</span> chat threads.
            </p>
          </div>
          <Link
            to="/dashboard/contact-messages"
            className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-[#b8860b] hover:text-[#9a7b28] transition-colors duration-300 dark:text-amber-300 dark:hover:text-amber-200"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent className="pt-0 px-6 pb-6">
          {loading || items === null ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading contact activity…
            </div>
          ) : total === 0 ? (
            <p className="text-sm text-muted-foreground py-1">No contact form submissions yet.</p>
          ) : (
            <ul className="space-y-2">
              {items.slice(0, 3).map((m) => (
                <li
                  key={m._id}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-sm border-b border-amber-200/20 dark:border-amber-900/20 pb-2 last:border-0 last:pb-0 transition-colors duration-300 hover:bg-amber-500/[0.04] rounded-lg px-1 -mx-1"
                >
                  <span className="font-medium">
                    {m.firstName} {m.lastName}
                    <span className="text-muted-foreground font-normal"> — {m.email}</span>
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {m.createdAt
                      ? new Date(m.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className={`relative overflow-hidden border-none ${glassWrap}`}>
        <div className="absolute left-0 top-0 h-full w-1 rounded-l-[1.125rem] bg-gradient-to-b from-amber-400 to-[#d4af37]" />
        <CardHeader className="pb-2 pt-6 px-6">
          <CardTitle className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/12 text-[#b8860b] dark:bg-amber-400/15 dark:text-amber-300">
              <Mail className="w-4 h-4" strokeWidth={2.25} />
            </span>
            Quick stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6">
          {loading || items === null ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <>
              <div>
                <div className="text-2xl font-extrabold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">{total}</div>
                <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wide mt-1">Total</p>
              </div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight tabular-nums text-[#b8860b] dark:text-amber-300">{newCount}</div>
                <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wide mt-1">New</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
