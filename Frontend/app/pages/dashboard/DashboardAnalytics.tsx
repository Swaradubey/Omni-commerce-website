import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DollarSign, Target, Zap, Globe } from 'lucide-react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
 import { fetchAdminAnalytics, type AdminAnalyticsData } from '../../api/analytics';
 import { formatINR } from '../../utils/formatINR';

function formatSignedPct(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  if (rounded === 0) return '0%';
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function formatSessionsDisplay(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function changeBadgeClass(change: number): string {
  if (change > 0.05) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (change < -0.05) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

const PLACEHOLDER_IMG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect fill="#e5e7eb" width="64" height="64"/><path fill="#9ca3af" d="M20 40l8-10 6 8 10-14 10 16H20z"/></svg>'
  );

export function DashboardAnalytics() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    try {
      const res = await fetchAdminAnalytics();
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const safeLoad = async () => {
      if (!mounted) return;
      await loadAnalytics();
    };
    void safeLoad();

    const refreshHandle = window.setInterval(() => {
      if (mounted) {
        void loadAnalytics({ silent: true });
      }
    }, 60000);

    return () => {
      mounted = false;
      window.clearInterval(refreshHandle);
    };
  }, [loadAnalytics]);

  const statCards = useMemo(() => {
    if (!data?.summary) return [];
    const s = data.summary;
    return [
      {
        title: 'Conversion Rate',
        value: `${(s.conversionRate ?? 0).toFixed(2)}%`,
        change: formatSignedPct(s.conversionRateChange ?? 0),
        changeRaw: s.conversionRateChange ?? 0,
        icon: Target,
        color: 'blue',
      },
        {
          title: 'Avg. Order Value',
          value: formatINR(s.avgOrderValue ?? 0),
          change: formatSignedPct(s.avgOrderValueChange ?? 0),
          changeRaw: s.avgOrderValueChange ?? 0,
          icon: Zap,
          color: 'purple',
        },
        {
          title: 'Customer Lifetime',
          value: formatINR(s.customerLifetimeValue ?? 0),
          change: formatSignedPct(s.customerLifetimeValueChange ?? 0),
          changeRaw: s.customerLifetimeValueChange ?? 0,
          icon: DollarSign,
          color: 'emerald',
        },
      {
        title: 'Sessions',
        value: formatSessionsDisplay(s.sessions ?? 0),
        change: formatSignedPct(s.sessionsChange ?? 0),
        changeRaw: s.sessionsChange ?? 0,
        icon: Globe,
        color: 'indigo',
      },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] pb-12">
        <p className="text-sm text-muted-foreground">Loading analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-12">
        <Card className="border-none shadow-lg bg-white/50 dark:bg-black/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Analytics unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const revenueFlow = data?.revenueFlow ?? [];
  const categoryData = data?.topCategories ?? [];
  const topProducts = data?.topProducts ?? [];
  const hasCategoryData = categoryData.length > 0;
  const hasRevenuePoints = revenueFlow.some((d) => d.sales > 0);
  const hasSummaryData = statCards.length > 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void loadAnalytics({ silent: true })}
          disabled={refreshing}
          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {/* Stats Cards */}
      {!hasSummaryData ? (
        <Card className="border-none shadow-lg bg-white/50 dark:bg-black/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Analytics unavailable</CardTitle>
            <CardDescription>No summary metrics are available yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, i) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-none shadow-lg bg-white/50 dark:bg-black/50 backdrop-blur-xl overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black">{stat.value}</div>
                  <div className="flex items-center mt-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${changeBadgeClass(stat.changeRaw)}`}>
                      {stat.change}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-2">from last month</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Main Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-xl bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle>Revenue Flow</CardTitle>
            <CardDescription>Daily total revenue (website and POS), last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {!hasRevenuePoints ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No revenue in the last 7 days yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueFlow}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
            <CardDescription>Revenue by category (this month), from ordered line items.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            {!hasCategoryData ? (
              <p className="text-sm text-muted-foreground px-4 text-center">No category sales recorded for this month yet.</p>
            ) : (
              <>
                <div className="w-full max-w-[250px] h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                      <span className="text-xs font-medium text-muted-foreground">
                        {cat.name} ({cat.percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="border-none shadow-xl bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle>Top Performing Products</CardTitle>
          <CardDescription>The most popular items in your store this month.</CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No product sales this month yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {topProducts.map((product, i) => (
                <div
                  key={`${product.name}-${i}`}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-blue-500/50 transition-all cursor-pointer group"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                    <img
                      src={product.image ? product.image : PLACEHOLDER_IMG}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                   <div className="flex flex-col overflow-hidden">
                     <h4 className="text-sm font-bold truncate">{product.name}</h4>
                     <div className="flex items-center gap-2 mt-1">
                       <span className="text-xs font-black">{formatINR(product.sales)}</span>
                       <span
                         className={`text-[10px] font-bold ${
                           product.growthPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'
                         }`}
                       >
                         {product.growthPercent >= 0 ? '+' : ''}
                         {product.growthPercent}%
                       </span>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
