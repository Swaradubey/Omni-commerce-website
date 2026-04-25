import ApiService from './apiService';

export interface AnalyticsSummary {
  /** Current calendar month — sum of order totalPrice (website + POS). */
  totalRevenue?: number;
  totalRevenueChange?: number;
  totalRevenueTrend?: 'up' | 'down' | 'neutral';
  /** Orders created in the current calendar month. */
  orderCount?: number;
  orderCountChange?: number;
  orderCountTrend?: 'up' | 'down' | 'neutral';
  /** Super Admin full analytics: distinct ordering identities (user or guest email) this calendar month. */
  activeCustomers?: number;
  activeCustomersChange?: number;
  activeCustomersTrend?: 'up' | 'down' | 'neutral';
  /** New storefront accounts (user/customer) registered this calendar month. */
  newCustomersThisMonth?: number;
  newCustomersChange?: number;
  newCustomersTrend?: 'up' | 'down' | 'neutral';
  conversionRate: number;
  conversionRateChange: number;
  conversionRateTrend: 'up' | 'down' | 'neutral';
  avgOrderValue: number;
  avgOrderValueChange: number;
  avgOrderValueTrend: 'up' | 'down' | 'neutral';
  customerLifetimeValue: number;
  customerLifetimeValueChange: number;
  customerLifetimeValueTrend: 'up' | 'down' | 'neutral';
  sessions: number;
  sessionsChange: number;
  sessionsTrend: 'up' | 'down' | 'neutral';
  /** Super Admin month KPIs (orders collection; see API meta notes). */
  salesThisMonth?: number;
  lossThisMonth?: number;
  profitThisMonth?: number;
  meta?: Record<string, string>;
}

export interface RevenueFlowPoint {
  name: string;
  sales: number;
  /** Order count for that day (when provided by API). */
  orders?: number;
  date?: string;
}

export interface TopCategoryPoint {
  name: string;
  value: number;
  percent: number;
  color: string;
}

export interface TopProductRow {
  name: string;
  sales: number;
  growthPercent: number;
  image: string;
}

export interface AdminAnalyticsData {
  /** `full` = Super Admin (conversion, CLV, sessions). `operational` = revenue/orders/products only. `user` = user specific analytics. */
  analyticsScope?: 'full' | 'operational' | 'user';
  summary: AnalyticsSummary;
  revenueFlow: RevenueFlowPoint[];
  topCategories: TopCategoryPoint[];
  topProducts: TopProductRow[];
}

export interface UserAnalyticsSummary {
  totalRevenue: number;
  totalRevenueChange: number;
  totalRevenueTrend: 'up' | 'down' | 'neutral';
  orderCount: number;
  orderCountChange: number;
  orderCountTrend: 'up' | 'down' | 'neutral';
  avgOrderValue: number;
  totalOrders: number;
  totalSpent: number;
}

export interface UserAnalyticsData {
  analyticsScope: 'user';
  summary: UserAnalyticsSummary;
  revenueFlow: RevenueFlowPoint[];
  topCategories: TopCategoryPoint[];
  periods: {
    summaryMonth: { start: string; end: string };
    previousMonth: { start: string; end: string };
  };
}

export async function fetchAdminAnalytics(): Promise<AdminAnalyticsData> {
  const res = await ApiService.get<AdminAnalyticsData>('/admin/analytics');
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to load analytics');
  }
  return res.data as AdminAnalyticsData;
}

export async function fetchUserAnalytics(): Promise<UserAnalyticsData> {
  const res = await ApiService.get<UserAnalyticsData>('/user/analytics');
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to load user analytics');
  }
  return res.data as UserAnalyticsData;
}
