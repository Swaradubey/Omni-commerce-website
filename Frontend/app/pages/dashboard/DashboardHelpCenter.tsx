import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Book,
  LifeBuoy,
  MessageCircle,
  Mail,
  FileText,
  ChevronRight,
  PlayCircle,
  HelpCircle,
  Loader2,
  AlertCircle,
  TicketCheck,
  Send,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  fetchHelpCenterBundle,
  searchHelpCenter,
  type HelpCenterBundle,
  type HelpCenterItem,
} from '../../api/helpCenter';
import {
  createSupportTicket,
  getMyTickets,
  type SupportTicket,
  type IssueType,
  type TicketStatus,
  ISSUE_TYPE_LABELS,
  TICKET_STATUS_LABELS,
} from '../../api/supportTickets';
import ApiService from '../../api/apiService';

// ─── Icon / accent helpers (unchanged) ───────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  book: Book,
  'file-text': FileText,
  filetext: FileText,
  'play-circle': PlayCircle,
  playcircle: PlayCircle,
  'life-buoy': LifeBuoy,
  lifebuoy: LifeBuoy,
  'message-circle': MessageCircle,
  messagecircle: MessageCircle,
  mail: Mail,
  helpcircle: HelpCircle,
};

function resolveIcon(key?: string): LucideIcon {
  if (!key) return HelpCircle;
  const k = key.trim().toLowerCase().replace(/\s+/g, '-');
  return ICON_MAP[k] || HelpCircle;
}

const ACCENT_BY_ICON: Record<string, string> = {
  book: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'file-text': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  filetext: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  'play-circle': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  playcircle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function categoryAccent(icon?: string): string {
  const k = (icon || '').trim().toLowerCase().replace(/\s+/g, '-');
  return ACCENT_BY_ICON[k] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
}

function typeLabel(type: string): string {
  const m: Record<string, string> = {
    faq: 'FAQ',
    article: 'Article',
    documentation: 'Documentation',
    tutorial: 'Tutorial',
    support_topic: 'Topic',
    category: 'Category',
    support_block: 'Support',
  };
  return m[type] || type;
}

function faqAnswer(f: HelpCenterItem): string {
  const d = (f.description || '').trim();
  if (d) return d;
  const c = (f.content || '').trim();
  return c.length > 400 ? `${c.slice(0, 400)}…` : c;
}

// ─── Support ticket helpers ───────────────────────────────────────────────────

const ISSUE_TYPE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: 'order_not_delivered', label: 'Order Not Delivered' },
  { value: 'wrong_product_received', label: 'Wrong Product Received' },
  { value: 'refund_issue', label: 'Refund Issue' },
  { value: 'payment_issue', label: 'Payment Issue' },
  { value: 'cancel_order_issue', label: 'Cancel Order Issue' },
  { value: 'order_tracking_issue', label: 'Order Tracking Issue' },
  { value: 'return_replacement_issue', label: 'Return / Replacement Issue' },
  { value: 'other', label: 'Other' },
];

function ticketStatusBadgeClass(status: TicketStatus): string {
  switch (status) {
    case 'open':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-none';
    case 'pending':
    case 'in_progress':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-none';
    case 'resolved':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-none';
    case 'closed':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-400 border-none';
    default:
      return 'bg-gray-100 text-gray-700 border-none';
  }
}

function formatDate(iso: string | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

interface UserOrder {
  _id: string;
  orderId: string;
  totalPrice: number;
  orderStatus: string;
  createdAt: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardHelpCenter() {
  const navigate = useNavigate();
  // ── existing help center state ──────────────────────────────────────────────
  const [bundle, setBundle] = useState<HelpCenterBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<HelpCenterItem[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // ── support ticket form state ───────────────────────────────────────────────
  const [formSubject, setFormSubject] = useState('');
  const [formIssueType, setFormIssueType] = useState<IssueType | ''>('');
  const [formOrderId, setFormOrderId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── user orders for the dropdown ────────────────────────────────────────────
  const [userOrders, setUserOrders] = useState<UserOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // ── my tickets state ────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [ticketsOpen, setTicketsOpen] = useState(true);

  // ─── Load help center bundle ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchHelpCenterBundle();
        if (!cancelled) setBundle(data);
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Failed to load Help Center');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      setHasSearched(false);
      setSearchError(null);
    }
  }, [query]);

  // ─── Load user orders for the dropdown ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOrdersLoading(true);
      try {
        const res = await ApiService.get<UserOrder[]>('/orders/my-tracking');
        if (!cancelled && (res as any).success) {
          const data = (res as any).data ?? [];
          // Each item may have nested order doc — flatten
          const orders: UserOrder[] = Array.isArray(data)
            ? data.map((d: any) => ({
              _id: d._id ?? d.id ?? '',
              orderId: d.orderId ?? d.id ?? '',
              totalPrice: d.totalPrice ?? 0,
              orderStatus: d.orderStatus ?? d.status ?? '',
              createdAt: d.createdAt ?? '',
            }))
            : [];
          setUserOrders(orders);
        }
      } catch {
        // silently ignore — order dropdown becomes empty
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── Load my tickets ──────────────────────────────────────────────────────
  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const data = await getMyTickets();
      setTickets(data);
    } catch (e: unknown) {
      setTicketsError(e instanceof Error ? e.message : 'Failed to load tickets');
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    setSearchError(null);
    setHasSearched(true);
    if (!q) { setSearchResults(null); return; }
    setSearchLoading(true);
    try {
      const data = await searchHelpCenter(q);
      setSearchResults(data.results);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  }, [query]);

  // ─── Form validation ──────────────────────────────────────────────────────
  function validateForm(): boolean {
    const errs: Record<string, string> = {};
    if (!formSubject.trim()) errs.subject = 'Subject is required';
    if (!formIssueType) errs.issueType = 'Please select an issue type';
    if (!formDescription.trim()) errs.description = 'Description is required';
    else if (formDescription.trim().length < 20) errs.description = 'Please provide more detail (at least 20 characters)';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Submit handler ───────────────────────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setFormSubmitting(true);
    try {
      await createSupportTicket({
        subject: formSubject.trim(),
        issueType: formIssueType as IssueType,
        description: formDescription.trim(),
        priority: formPriority,
        ...(formOrderId ? { orderId: formOrderId } : {}),
      });
      toast.success("Support ticket submitted! We'll get back to you soon.");
      setFormSubject('');
      setFormIssueType('');
      setFormOrderId('');
      setFormDescription('');
      setFormPriority('normal');
      setFormErrors({});
      // Reload tickets list
      await loadTickets();
      // Scroll to ticket history
      setTimeout(() => {
        document.getElementById('my-tickets-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit ticket. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ─── Derived values ───────────────────────────────────────────────────────
  const page = bundle?.page;

  const { heroBlock, tileBlocks } = useMemo(() => {
    const list = [...(bundle?.supportBlocks || [])].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    );
    const hero =
      list.find((b) => b.variant === 'hero') ||
      (list.length && !list.some((b) => (b.variant || '').startsWith('tile')) ? list[0] : null);
    const tiles = list.filter((b) => b !== hero && (b.variant || '').startsWith('tile'));
    return { heroBlock: hero, tileBlocks: tiles };
  }, [bundle?.supportBlocks]);

  const openHref = (href?: string) => {
    const h = (href || '').trim();
    if (!h || h === '#') return;
    if (/^https?:\/\//i.test(h)) {
      window.open(h, '_blank', 'noopener,noreferrer');
    } else {
      navigate(h);
    }
  };

  // ─── Loading / error states ───────────────────────────────────────────────
  if (loading && !bundle) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 pb-12 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" aria-hidden />
        <p className="text-sm font-semibold">Loading Help Center…</p>
      </div>
    );
  }

  if (loadError && !bundle) {
    return (
      <div className="pb-12">
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">Could not load Help Center</p>
            <p className="text-sm opacity-90">{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative space-y-8 pb-12">
      {/* Golden gradient background for the whole page */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-amber-50 via-orange-50/40 to-yellow-50/60 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/40" />

      {/* ── Search Section (unchanged) ─────────────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center py-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl px-6"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100/50 px-3 py-1 text-xs font-bold uppercase leading-none tracking-widest text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <HelpCircle className="h-3 w-3" />
            {page?.badgeLabel ?? 'Support Hub'}
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight">
            {page?.title ?? 'How can we help today?'}
          </h1>
          <p className="mb-8 text-lg font-medium text-muted-foreground">
            {page?.subtitle ?? 'Search our knowledge base or browse help topics below.'}
          </p>

          <div className="group relative mx-auto max-w-xl">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-25 blur transition duration-1000 group-hover:opacity-40 group-hover:duration-200" />
            <div className="relative flex items-center rounded-2xl border border-gray-100 bg-white p-2 pl-4 dark:border-white/10 dark:bg-black/80">
              <Search className="mr-3 h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); void runSearch(); }
                }}
                placeholder={page?.searchPlaceholder ?? 'Search tutorials, documentation, and FAQs...'}
                className="min-w-0 flex-1 border-none bg-transparent text-sm font-semibold tracking-tight focus:outline-none"
                aria-label="Search Help Center"
              />
              <Button
                type="button"
                className="ml-2 h-10 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-500/25"
                onClick={() => void runSearch()}
                disabled={searchLoading}
              >
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Search'}
              </Button>
            </div>
          </div>

          {searchError && (
            <p className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400" role="alert">
              {searchError}
            </p>
          )}

          {hasSearched && query.trim() && searchResults && (
            <div className="mx-auto mt-8 w-full max-w-xl rounded-2xl border border-gray-100 bg-white/90 p-4 text-left shadow-lg dark:border-white/10 dark:bg-black/50">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Results for "{query.trim()}"
              </p>
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No matches yet. Try different keywords or browse categories below.
                </p>
              ) : (
                <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {searchResults.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="w-full rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50/80 dark:hover:border-blue-900/40 dark:hover:bg-blue-950/30"
                        onClick={() => openHref(r.href || r.actionHref)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold">{r.title}</span>
                          <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                            {typeLabel(r.type)}
                          </span>
                        </div>
                        {(r.description || r.category) && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {r.description || (r.category ? `Category: ${r.category}` : '')}
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Main Categories (unchanged) ───────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-3">
        {!bundle?.categories?.length ? (
          <div className="col-span-full rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-muted-foreground dark:border-white/10">
            No help categories are published yet. Ask an administrator to add categories in the database.
          </div>
        ) : (
          bundle.categories.map((item, i) => {
            const Icon = resolveIcon(item.icon);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <button type="button" className="w-full text-left" onClick={() => openHref(item.href)}>
                  <Card className="group cursor-pointer overflow-hidden rounded-2xl border-none bg-white/50 p-2 shadow-xl backdrop-blur-xl transition-all hover:shadow-2xl dark:bg-black/40">
                    <CardContent className="p-6">
                      <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${categoryAccent(item.icon)}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 opacity-60 transition-opacity group-hover:opacity-100 dark:text-blue-400">
                        Explore More <ChevronRight className="ml-1 h-3 w-3" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── Guides & articles (unchanged) ─────────────────────────────────── */}
      {!!bundle?.articles?.length && (
        <Card className="overflow-hidden rounded-3xl border-none bg-white/80 shadow-xl backdrop-blur-xl dark:bg-black/40">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Guides &amp; topics</CardTitle>
            <CardDescription>Articles, documentation, and tutorials from your knowledge base.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {bundle.articles.map((a) => (
              <button
                key={a.id}
                type="button"
                className="rounded-2xl border border-gray-100 bg-white/60 p-4 text-left transition hover:border-blue-200 hover:shadow-md dark:border-white/10 dark:bg-black/30 dark:hover:border-blue-900/50"
                onClick={() => openHref(a.href)}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{a.title}</span>
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                    {typeLabel(a.type)}
                  </span>
                </div>
                {a.description && <p className="line-clamp-3 text-xs text-muted-foreground">{a.description}</p>}
                {a.category && (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{a.category}</p>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── FAQs and Support Contact (unchanged) ──────────────────────────── */}
      <div className={`grid gap-6 ${!bundle?.supportBlocks?.length ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}>
        <Card
          id="faqs"
          className={`overflow-hidden rounded-3xl border-none bg-white/80 shadow-xl backdrop-blur-xl dark:bg-black/40 ${!bundle?.supportBlocks?.length ? 'lg:col-span-1' : 'lg:col-span-2'}`}
        >
          <CardHeader>
            <CardTitle className="text-xl font-bold">Frequently Asked Questions</CardTitle>
            <CardDescription>Quick answers to common questions from our merchant community.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!bundle?.faqs?.length ? (
              <div className="px-6 pb-6 text-sm text-muted-foreground">No FAQs are published yet.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {bundle.faqs.map((faq) => (
                  <div key={faq.id} className="group cursor-pointer p-6 transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-bold transition-colors group-hover:text-blue-600">{faq.title}</h4>
                      <ChevronRight className="h-4 w-4 opacity-30 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground opacity-80">{faqAnswer(faq)}</p>
                  </div>
                ))}
              </div>
            )}
            {(bundle?.faqTotal ?? 0) > 0 && (
              <div className="border-t border-gray-100 p-6 dark:border-white/5">
                <Button
                  variant="ghost"
                  type="button"
                  className="w-full rounded-xl font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/10"
                  onClick={() => { document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                >
                  View all {bundle?.faqTotal ?? bundle?.faqs?.length ?? 0}{' '}
                  {(bundle?.faqTotal ?? 0) === 1 ? 'FAQ' : 'FAQs'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {!!bundle?.supportBlocks?.length && (
          <div className="space-y-6">
            {heroBlock && (
              <Card className="group relative overflow-hidden rounded-3xl border-none bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl">
                <CardContent className="p-8">
                  <div className="relative z-10">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xl">
                      {React.createElement(resolveIcon(heroBlock.icon), { className: 'h-6 w-6 text-white' })}
                    </div>
                    <h3 className="mb-2 text-xl font-bold">{heroBlock.title}</h3>
                    {!!heroBlock.description?.trim() && (
                      <p className="mb-8 text-sm leading-relaxed text-blue-50 opacity-90">{heroBlock.description}</p>
                    )}
                    <Button
                      type="button"
                      className="h-11 w-full rounded-xl bg-white font-bold text-blue-600 shadow-lg shadow-black/10 hover:bg-blue-50"
                      onClick={() => openHref(heroBlock.actionHref)}
                    >
                      {heroBlock.actionLabel?.trim() || 'Open'}
                    </Button>
                  </div>
                  <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10 blur-3xl group-hover:animate-pulse" />
                </CardContent>
              </Card>
            )}
            {tileBlocks.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {tileBlocks.map((t) => {
                  const emerald = (t.variant || '').includes('emerald');
                  const orange = (t.variant || '').includes('orange');
                  const tileClass = emerald ? 'bg-emerald-500' : orange ? 'bg-orange-500' : 'bg-slate-600';
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`flex flex-col items-center justify-center rounded-2xl p-6 text-center text-white shadow-lg transition-transform hover:scale-[1.02] ${tileClass}`}
                      onClick={() => openHref(t.actionHref || t.href)}
                    >
                      {React.createElement(resolveIcon(t.icon), { className: 'mb-2 h-6 w-6' })}
                      <span className="text-xs font-bold">{t.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Terms and Conditions (Refined) ─────────────────────────────────── */}
      <Card className="overflow-hidden rounded-3xl border border-gray-100/60 bg-gradient-to-br from-white via-white/95 to-gray-50/50 shadow-xl shadow-gray-200/30 backdrop-blur-xl dark:border-white/10 dark:from-black/60 dark:via-black/80 dark:to-black/40 dark:shadow-none">
        <CardHeader className="pb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <CardTitle className="text-xl font-bold tracking-tight">Terms and Conditions</CardTitle>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 dark:bg-blue-900/30 dark:text-blue-300">
                  Policy
                </Badge>
              </div>
              <CardDescription className="text-sm leading-relaxed">
                Important policies and guidelines for using our platform.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Orders & Payments */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white/80 p-5 transition-all hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10 dark:border-white/10 dark:bg-black/30">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Orders & Payments</h4>
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Orders are subject to availability and successful payment completion.
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Payments must be completed successfully for order confirmation.
                  </p>
                </li>
              </ul>
            </div>

            {/* Delivery */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white/80 p-5 transition-all hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10 dark:border-white/10 dark:bg-black/30">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Delivery</h4>
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Delivery timelines may vary by location and are provided as estimates only.
                  </p>
                </li>
              </ul>
            </div>

            {/* Returns & Refunds */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white/80 p-5 transition-all hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/10 dark:border-white/10 dark:bg-black/30">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Returns & Refunds</h4>
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500 dark:bg-amber-400" />
                  <p className="text-sm  leading-relaxed text-muted-foreground">
                    Returns and refunds follow the platform return policy.
                  </p>
                </li>
              </ul>
            </div>

            {/* Account Responsibility */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white/80 p-5 transition-all hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/10 dark:border-white/10 dark:bg-black/30">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-violet-500" />
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Account Responsibility</h4>
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500 dark:bg-purple-400" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Users must provide accurate account and delivery details.
                  </p>
                </li>
              </ul>
            </div>

            {/* Platform Misuse */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white/80 p-5 transition-all hover:border-red-200 hover:shadow-lg hover:shadow-red-500/10 dark:border-white/10 dark:bg-black/30">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-rose-500" />
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Platform Misuse</h4>
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500 dark:bg-red-400" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Misuse, fraud, or abuse of platform services may lead to account restriction or termination.
                  </p>
                </li>
              </ul>
            </div>

            {/* Support Response */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white/80 p-5 transition-all hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/10 dark:border-white/10 dark:bg-black/30">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 to-sky-500" />
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Support Response</h4>
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Support response times may vary depending on issue type and volume.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <p className="text-sm text-muted-foreground/70">
              By using our platform, you agree to these terms. For full details, please read our complete policy.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
           NEW: Raise a Support Request form
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        id="raise-ticket"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {/* Golden gradient background wrapper */}
        {/* Premium golden gradient border wrapper */}
        <div className="relative rounded-3xl p-0.5 bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-200 shadow-2xl dark:from-amber-800 dark:via-yellow-700 dark:to-amber-800">
          <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-[#fffdf7] via-[#fff9ee] to-[#fff5e6] dark:from-[#1a1510] dark:via-[#1f1814] dark:to-[#241c16] backdrop-blur-xl">
            {/* Decorative golden glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-200/40 via-transparent to-transparent dark:from-amber-900/20 dark:via-transparent dark:to-transparent pointer-events-none" />

            <CardHeader className="relative border-b border-amber-100/60 dark:border-amber-900/30 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/20 dark:to-transparent px-8 pt-8 pb-6">
              <div className="flex items-start gap-4">
                {/* Premium gold icon container with ring */}
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-white shadow-lg ring-4 ring-amber-100 dark:ring-amber-900/40">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-700/30 blur-xl opacity-80" />
                  <TicketCheck className="relative z-10 h-6 w-6 drop-shadow-sm" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="mb-2 flex items-center gap-2">
                    <CardTitle className="text-2xl font-bold tracking-tight text-amber-950 dark:text-amber-100">
                      Raise a Support Request
                    </CardTitle>
                    <span className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                      Priority
                    </span>
                  </div>
                  <CardDescription className="text-sm leading-relaxed text-amber-900/70 dark:text-amber-200/70">
                    Submit an issue related to your orders and our team will respond shortly.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative px-8 py-7">
              <form onSubmit={(e) => void handleFormSubmit(e)} noValidate className="space-y-6">
                {/* Subject */}
                <div>
                  <label htmlFor="ticket-subject" className="mb-2 block text-sm font-bold text-amber-950 dark:text-amber-100">
                    Subject / Issue Title <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    id="ticket-subject"
                    type="text"
                    value={formSubject}
                    onChange={(e) => { setFormSubject(e.target.value); setFormErrors((p) => ({ ...p, subject: '' })); }}
                    placeholder="e.g. My order hasn't arrived"
                    maxLength={200}
                    className={`w-full rounded-xl border-2 bg-white px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 placeholder:text-amber-300 dark:placeholder:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 hover:border-amber-300 dark:hover:border-amber-700 ${formErrors.subject
                      ? 'border-red-400 dark:border-red-600 focus:ring-red-300'
                      : 'border-amber-200 dark:border-amber-800 focus:border-amber-400 dark:focus:border-amber-500'
                      }`}
                  />
                  {formErrors.subject && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-red-500"></span>
                      {formErrors.subject}
                    </p>
                  )}
                </div>

                {/* Issue Type */}
                <div>
                  <label htmlFor="ticket-issue-type" className="mb-2 block text-sm font-bold text-amber-950 dark:text-amber-100">
                    Issue Type <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="ticket-issue-type"
                      value={formIssueType}
                      onChange={(e) => { setFormIssueType(e.target.value as IssueType | ''); setFormErrors((p) => ({ ...p, issueType: '' })); }}
                      className={`w-full appearance-none rounded-xl border-2 bg-white px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 hover:border-amber-300 dark:hover:border-amber-700 ${formErrors.issueType
                        ? 'border-red-400 dark:border-red-600 focus:ring-red-300'
                        : 'border-amber-200 dark:border-amber-800 focus:border-amber-400 dark:focus:border-amber-500'
                        }`}
                    >
                      <option value="">— Select issue type —</option>
                      {ISSUE_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-amber-500">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                  {formErrors.issueType && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-red-500"></span>
                      {formErrors.issueType}
                    </p>
                  )}
                </div>

                {/* Related Order */}
                <div>
                  <label htmlFor="ticket-order" className="mb-2 block text-sm font-bold text-amber-950 dark:text-amber-100">
                    Related Order
                    <span className="ml-2 text-xs font-normal text-amber-700/60 dark:text-amber-300/60">(optional)</span>
                  </label>
                  <div className="relative">
                    <select
                      id="ticket-order"
                      value={formOrderId}
                      onChange={(e) => setFormOrderId(e.target.value)}
                      disabled={ordersLoading}
                      className="w-full appearance-none rounded-xl border-2 border-amber-200 bg-white px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 placeholder:text-amber-300 dark:bg-black/30 dark:border-amber-800 dark:placeholder:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 hover:border-amber-300 dark:hover:border-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">— Select an order (optional) —</option>
                      {ordersLoading ? (
                        <option disabled>Loading orders…</option>
                      ) : userOrders.length === 0 ? (
                        <option disabled>No orders found</option>
                      ) : (
                        userOrders.map((o) => (
                          <option key={o._id} value={o._id}>
                            #{o.orderId} — ₹{o.totalPrice} — {o.orderStatus}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-amber-500">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                  {ordersLoading && (
                    <p className="mt-1.5 text-xs text-amber-700/60 dark:text-amber-300/60">Fetching your orders…</p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label htmlFor="ticket-priority" className="mb-2 block text-sm font-bold text-amber-950 dark:text-amber-100">
                    Ticket Priority
                  </label>
                  <div className="relative">
                    <select
                      id="ticket-priority"
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as any)}
                      className="w-full appearance-none rounded-xl border-2 border-amber-200 bg-white px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 placeholder:text-amber-300 dark:bg-black/30 dark:border-amber-800 dark:placeholder:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 hover:border-amber-300 dark:hover:border-amber-700"
                    >
                      <option value="low">Low — General inquiry</option>
                      <option value="normal">Normal — Standard response</option>
                      <option value="high">High — Important issue</option>
                      <option value="urgent">Urgent — Critical blocker</option>
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-amber-500">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="ticket-description" className="mb-2 block text-sm font-bold text-amber-950 dark:text-amber-100">
                    Message / Description <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      id="ticket-description"
                      value={formDescription}
                      onChange={(e) => { setFormDescription(e.target.value); setFormErrors((p) => ({ ...p, description: '' })); }}
                      placeholder="Describe your issue in detail… be specific to help us assist you faster."
                      rows={5}
                      maxLength={5000}
                      className={`w-full rounded-xl border-2 bg-white px-4 py-3 pr-10 text-sm font-medium shadow-sm transition-all duration-200 placeholder:text-amber-300 dark:bg-black/30 dark:placeholder:text-amber-700 resize-y focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 hover:border-amber-300 dark:hover:border-amber-700 ${formErrors.description
                        ? 'border-red-400 dark:border-red-600 focus:ring-red-300'
                        : 'border-amber-200 dark:border-amber-800 focus:border-amber-400 dark:focus:border-amber-500'
                        }`}
                    />
                    <div className="absolute bottom-3 right-3 pointer-events-none opacity-30 text-amber-500">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    {formErrors.description ? (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-red-500"></span>
                        {formErrors.description}
                      </p>
                    ) : <span />}
                    <span className="text-xs text-amber-700/50 dark:text-amber-300/50 font-medium">
                      {formDescription.length}/5000 characters
                    </span>
                  </div>
                </div>

                {/* Info note */}
                <div className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-800/60 dark:bg-amber-900/20">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  </div>
                  <p className="text-xs leading-relaxed text-amber-900/70 dark:text-amber-200/70">
                    Our support team typically responds within <strong>24–48 hours</strong>. For urgent orders, consider calling our hotline.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  <Button
                    type="submit"
                    id="submit-support-ticket-btn"
                    disabled={formSubmitting}
                    className="relative h-11 gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-8 font-bold text-white shadow-lg shadow-amber-200/50 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-700 hover:shadow-xl hover:shadow-amber-300/50 focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 disabled:opacity-65 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <span className="flex items-center gap-2">
                      {formSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          <span>Submitting…</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" aria-hidden />
                          <span>Submit Ticket</span>
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          NEW: My Tickets history
         ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        id="my-tickets-section"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="overflow-hidden rounded-3xl border-none bg-white/80 shadow-xl backdrop-blur-xl dark:bg-black/40">
          <CardHeader className="border-b border-gray-100 dark:border-white/5">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setTicketsOpen((v) => !v)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">My Support Tickets</CardTitle>
                  <CardDescription className="mt-0.5">
                    Track the status of your previously submitted requests.
                  </CardDescription>
                </div>
              </div>
              <div className="shrink-0 ml-4">
                {ticketsOpen
                  ? <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  : <ChevronDown className="h-5 w-5 text-muted-foreground" />
                }
              </div>
            </button>
          </CardHeader>

          {ticketsOpen && (
            <CardContent className="p-0">
              {ticketsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                  <p className="text-sm font-medium">Loading your tickets…</p>
                </div>
              ) : ticketsError ? (
                <div className="px-6 py-8">
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900/40 dark:bg-red-950/20">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800 dark:text-red-200">{ticketsError}</p>
                      <button
                        type="button"
                        onClick={() => void loadTickets()}
                        className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                      >Retry</button>
                    </div>
                  </div>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                    <TicketCheck className="h-8 w-8" />
                  </div>
                  <h2 className="text-lg font-bold mb-1">No support tickets yet</h2>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Once you submit a support request above, it will appear here with its current status.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 dark:bg-white/[0.02] text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Ticket ID</th>
                        <th className="px-6 py-4 min-w-[180px]">Subject</th>
                        <th className="px-6 py-4">Issue Type</th>
                        <th className="px-6 py-4">Related Order</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 whitespace-nowrap">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {tickets.map((t) => (
                        <tr key={t._id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs text-muted-foreground">
                              #{t._id.slice(-6).toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold line-clamp-2 max-w-[220px]">{t.subject}</span>
                            {t.adminResponse && (
                              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium line-clamp-1">
                                ✓ Admin replied
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-muted-foreground">
                              {ISSUE_TYPE_LABELS[t.issueType] ?? t.issueType}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {t.orderRef ? (
                              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                                #{t.orderRef}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={ticketStatusBadgeClass(t.status)}>
                              {TICKET_STATUS_LABELS[t.status] ?? t.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-xs whitespace-nowrap text-muted-foreground">
                            {formatDate(t.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
