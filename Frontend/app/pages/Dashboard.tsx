import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  TrendingUp,
  HelpCircle,
  Headphones,
  PieChart as PieChartIcon,
  Warehouse,
  Heart,
  Activity,
  Mail,
  Truck,
  Shield,
  UserCog,
  UserPlus,
  ScrollText,
  Building2,
  CreditCard,
  Receipt,
  Globe,
} from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link, Navigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarRail
} from '../components/ui/sidebar';
import { DashboardStats } from '../components/DashboardStats';
import { DashboardCharts } from '../components/DashboardCharts';
import { DashboardRecentActivity } from '../components/DashboardRecentActivity';
import { DashboardRecentTickets } from '../components/DashboardRecentTickets';
import { DashboardQuickActions } from '../components/DashboardQuickActions';
import { DashboardContactSummary } from '../components/DashboardContactSummary';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { canAccessInventoryEditor } from '../utils/inventoryPermissions';
import {
  hasFullAdminPrivileges,
  isCashierRole,
  isClientRole,
  isCustomerAccountRole,
  isCounterManagerRole,
  isInventoryManagerRole,
  isRestrictedInventoryDashboardRole,
  isStaffRole,
  isSuperAdminRole,
  normalizeRole,
} from '../utils/staffRoles';
import { fetchAdminAnalytics, fetchUserAnalytics, type AdminAnalyticsData, type UserAnalyticsData } from '../api/analytics';
import { fetchUserDashboardOverview, type UserDashboardOverviewData } from '../api/orders';
import { ImpersonationBanner } from '../components/ImpersonationBanner';
import { toast } from 'sonner';

const sidebarItems = [
  { title: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Products", icon: Package, href: "/dashboard/products", hideForSuperAdmin: true },
  { title: "Inventory", icon: Warehouse, href: "/dashboard/inventory", staffOnly: true },
  { title: "POS", icon: ShoppingCart, href: "/pos", hideForSuperAdmin: true, hideForUser: true },
  { title: "Wishlist", icon: Heart, href: "/dashboard/wishlist", hideForSuperAdmin: true },
  { title: "Track Order", icon: Truck, href: "/track-order", hideForInventoryManager: true, hideForSuperAdmin: true },
  { title: "Wishlist Activity", icon: Activity, href: "/dashboard/wishlist-activity", adminOnly: true, hideForSuperAdmin: true },
  { title: "Super Admin", icon: Shield, href: "/super-admin", superAdminOnly: true, hideForSuperAdmin: true },
  { title: "Orders", icon: ShoppingCart, href: "/dashboard/orders", hideForUser: false },
  { title: "Invoice", icon: Receipt, href: "/dashboard/invoices", superAdminOnly: true },
  { title: "Customers", icon: Users, href: "/dashboard/customers", superAdminOnly: true },
  { title: "Users & roles", icon: UserCog, href: "/dashboard/users", superAdminOnly: true },
  { title: "Add Client", icon: Building2, href: "/dashboard/clients", superAdminOnly: true },
  { title: "Add Custom Domain", icon: Globe, href: "/super-admin/custom-domain", superAdminOnly: true },
  { title: "Add Employee", icon: UserPlus, href: "/dashboard/add-employee", staffOnly: true, hideForSuperAdmin: true },
  { title: "Analytics", icon: PieChartIcon, href: "/dashboard/analytics", superAdminOnly: true },
  { title: "Admin login logs", icon: ScrollText, href: "/dashboard/admin-logs", superAdminOnly: true },
  { title: "Support", icon: Headphones, href: "/dashboard/support" },
  { title: "Help Center", icon: HelpCircle, href: "/dashboard/help-center", helpCenter: true },
  { title: "Swipe Machine", icon: CreditCard, href: "/pos", counterManagerOnly: true },
];

const secondaryItems = [
  { title: "Settings", icon: Settings, href: "/dashboard/settings", adminOnly: true, hideForSuperAdmin: true },
];

/** Shared pill layout for every dashboard sidebar link (matches Overview row: radius, padding, min-height, icon gap). */
function dashboardSidebarNavButtonClass(isActive: boolean, pageIsOverview: boolean): string {
  const base =
    'relative group flex w-full h-auto min-h-[44px] items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-all duration-300 ease-out outline-hidden ring-sidebar-ring focus-visible:ring-2 overflow-hidden [&>svg]:!size-5 [&>svg]:shrink-0 [&>svg]:transition-transform [&>svg]:duration-300 [&>svg]:ease-out group-hover:[&>svg]:scale-105 group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!min-h-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:gap-0';

  if (isActive) {
    return `${base} border border-amber-200/70 bg-gradient-to-r from-amber-100/90 via-amber-50/80 to-transparent text-amber-900 shadow-sm shadow-amber-900/10 dark:border-amber-700/45 dark:from-amber-900/35 dark:via-amber-950/30 dark:to-transparent dark:text-amber-100 font-bold hover:shadow-md`;
  }

  if (pageIsOverview) {
    return `${base} border border-amber-200/55 bg-amber-50/40 text-muted-foreground shadow-sm shadow-amber-900/5 dark:border-amber-800/40 dark:bg-amber-950/30 hover:border-amber-300/70 hover:bg-amber-500/12 hover:text-foreground hover:shadow-md dark:hover:bg-amber-400/12`;
  }
  return `${base} border border-gray-200/90 bg-white/85 text-muted-foreground shadow-sm dark:border-white/12 dark:bg-zinc-900/50 hover:border-gray-300 hover:bg-gray-50 hover:text-foreground hover:shadow-md dark:hover:bg-white/10 dark:hover:border-white/18`;
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const restrictedInventoryDashboardRole = isRestrictedInventoryDashboardRole(user?.role);
  const staff = isStaffRole(user?.role);
  const isOverviewPath = location.pathname === '/dashboard';

  const [overviewData, setOverviewData] = useState<AdminAnalyticsData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [userOverviewData, setUserOverviewData] = useState<UserDashboardOverviewData | null>(null);
  const [userOverviewError, setUserOverviewError] = useState<string | null>(null);
  const [userAnalyticsData, setUserAnalyticsData] = useState<UserAnalyticsData | null>(null);
  const [userAnalyticsError, setUserAnalyticsError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const loadOverview = useCallback(
    async (opts?: { silent?: boolean }): Promise<{ ok: boolean; error?: string }> => {
      if (!staff || !isOverviewPath) {
        setOverviewLoading(false);
        return { ok: true };
      }
      if (!opts?.silent) {
        setOverviewLoading(true);
      }
      setOverviewError(null);
      try {
        const d = await fetchAdminAnalytics();
        setOverviewData(d);
        return { ok: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load dashboard data';
        setOverviewError(msg);
        if (!opts?.silent) {
          setOverviewData(null);
        }
        return { ok: false, error: msg };
      } finally {
        if (!opts?.silent) {
          setOverviewLoading(false);
        }
      }
    },
    [staff, isOverviewPath, user?.role]
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!isCustomerAccountRole(user?.role) || location.pathname !== '/dashboard') {
      setUserOverviewData(null);
      setUserOverviewError(null);
      setUserAnalyticsData(null);
      setUserAnalyticsError(null);
      return;
    }
    let cancelled = false;
    setUserOverviewError(null);
    setUserAnalyticsError(null);
    (async () => {
      try {
        const [overview, analytics] = await Promise.all([
          fetchUserDashboardOverview(),
          fetchUserAnalytics(),
        ]);
        if (!cancelled) {
          setUserOverviewData(overview);
          setUserAnalyticsData(analytics);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const errMsg = e instanceof Error ? e.message : 'Failed to load overview';
          setUserOverviewError(errMsg);
          setUserAnalyticsError(errMsg);
          setUserOverviewData(null);
          setUserAnalyticsData(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role, location.pathname]);

  useEffect(() => {
    // Clients can now access the main dashboard overview
    if (isClientRole(user?.role) && location.pathname === '/dashboard') {
      // No redirect
    }
  }, [user?.role, location.pathname, navigate]);

  const handleDashboardSync = useCallback(async () => {
    setSyncing(true);
    try {
      if (isCustomerAccountRole(user?.role) && location.pathname === '/dashboard') {
        try {
          const d = await fetchUserDashboardOverview();
          setUserOverviewData(d);
          setUserOverviewError(null);
          toast.success('Dashboard synced');
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Could not refresh dashboard';
          setUserOverviewError(msg);
          toast.error(msg);
        }
        return;
      }
      const res = await loadOverview({ silent: true });
      if (res.ok) {
        toast.success('Dashboard synced');
      } else {
        toast.error(res.error || 'Could not refresh dashboard');
      }
    } finally {
      setSyncing(false);
    }
  }, [loadOverview, user?.role, location.pathname]);

  const mainSidebarItems = sidebarItems.filter((item) => {
    if (isCustomerAccountRole(user?.role) && 'hideForUser' in item && item.hideForUser) {
      return false;
    }
    if (isCashierRole(user?.role)) {
      return (
        item.href === '/dashboard/products' ||
        item.href === '/pos'
      );
    }
    if (isCounterManagerRole(user?.role)) {
      return (
        item.href === '/dashboard/products' ||
        item.href === '/dashboard/inventory' ||
        item.title === 'Swipe Machine'
      );
    }
    if ('counterManagerOnly' in item && item.counterManagerOnly) {
      return false;
    }
    if (restrictedInventoryDashboardRole) {
      return item.href === '/dashboard/products' || item.href === '/dashboard/inventory';
    }
    if (isClientRole(user?.role)) {
      return (
        item.href === '/dashboard' ||
        item.href === '/dashboard/products' ||
        item.href === '/dashboard/inventory' ||
        item.href === '/dashboard/orders' ||
        item.href === '/dashboard/invoices' ||
        item.href === '/dashboard/users' ||
        item.href === '/super-admin/custom-domain' ||
        item.href === '/dashboard/add-employee' ||
        item.href === '/dashboard/analytics' ||
        item.href === '/dashboard/support'
      );
    }
    if ('hideForSuperAdmin' in item && item.hideForSuperAdmin && isSuperAdminRole(user?.role)) {
      return false;
    }
    if ('superAdminOnly' in item && item.superAdminOnly && !isSuperAdminRole(user?.role)) {
      return false;
    }
    if ('staffOnly' in item && item.staffOnly && !isStaffRole(user?.role)) {
      return false;
    }
    if ('adminOnly' in item && item.adminOnly && !hasFullAdminPrivileges(user?.role)) {
      return false;
    }
    if (item.href === '/dashboard/inventory') {
      return canAccessInventoryEditor(user?.role);
    }
    if ('hideForInventoryManager' in item && item.hideForInventoryManager && isInventoryManagerRole(user?.role)) {
      return false;
    }
    if ('helpCenter' in item && item.helpCenter) {
      if (isSuperAdminRole(user?.role) || normalizeRole(user?.role) === 'admin') return false;
      return isCustomerAccountRole(user?.role) || isStaffRole(user?.role);
    }
    return true;
  });
  const resourceSidebarItems = secondaryItems.filter((item) => {
    if (isCashierRole(user?.role)) {
      return false;
    }
    if (restrictedInventoryDashboardRole) {
      return false;
    }
    if (isClientRole(user?.role)) {
      return false;
    }
    if ('hideForSuperAdmin' in item && item.hideForSuperAdmin && isSuperAdminRole(user?.role)) {
      return false;
    }
    if ('superAdminOnly' in item && item.superAdminOnly && !isSuperAdminRole(user?.role)) {
      return false;
    }
    if ('adminOnly' in item && item.adminOnly && !hasFullAdminPrivileges(user?.role)) {
      return false;
    }
    if ('helpCenter' in item && item.helpCenter) {
      if (isSuperAdminRole(user?.role) || normalizeRole(user?.role) === 'admin') return false;
      return isCustomerAccountRole(user?.role) || isStaffRole(user?.role);
    }
    if ('staffOnly' in item && item.staffOnly && !isStaffRole(user?.role)) {
      return false;
    }
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isOverview = location.pathname === '/dashboard';
  const isInventoryOrAnalytics = location.pathname === '/dashboard/inventory' || location.pathname === '/dashboard/analytics';
  const isCustomerOverview = isOverview && isCustomerAccountRole(user?.role);
  const userOverviewPending =
    isCustomerOverview && userOverviewData === null && userOverviewError === null;
  const showOverviewSkeleton =
    isOverview &&
    ((staff && (overviewLoading || (!overviewData && !overviewError))) || userOverviewPending);

  const canAccessCurrentDashboardRoute =
    location.pathname === '/dashboard/products' ||
    location.pathname.startsWith('/dashboard/products/') ||
    location.pathname === '/dashboard/inventory' ||
    location.pathname.startsWith('/dashboard/inventory/');
  const shouldRedirectRestrictedRole =
    (restrictedInventoryDashboardRole || isCounterManagerRole(user?.role)) && !canAccessCurrentDashboardRoute;

  if (shouldRedirectRestrictedRole) {
    return <Navigate to="/dashboard/inventory" replace />;
  }

  const cashierAllowedRoute =
    location.pathname === '/dashboard/products' ||
    location.pathname.startsWith('/dashboard/products/') ||
    location.pathname === '/pos' ||
    location.pathname.startsWith('/pos/');
  if (isCashierRole(user?.role) && !cashierAllowedRoute) {
    return <Navigate to="/dashboard/products" replace />;
  }

  return (
    <SidebarProvider>
      <div
        className={
          isOverview || isInventoryOrAnalytics
            ? 'flex flex-col min-h-screen w-full bg-[linear-gradient(145deg,#fdf6e3_0%,#ffffff_45%,#fff8dc_100%)] dark:bg-[linear-gradient(145deg,#1a1510_0%,#0c0a08_50%,#14110c_100%)]'
            : 'flex flex-col min-h-screen w-full bg-[#fafafa] dark:bg-[#09090b]'
        }
      >
        <ImpersonationBanner />
        <div className="flex min-h-0 flex-1 w-full">
          {/* Sidebar */}
          <Sidebar
            collapsible="icon"
            className={
              isOverview || isInventoryOrAnalytics
                ? 'border-r border-amber-200/35 dark:border-amber-900/25 bg-white/55 dark:bg-zinc-950/55 backdrop-blur-xl shadow-[4px_0_24px_-12px_rgba(212,175,55,0.15)]'
                : 'border-r border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-xl'
            }
          >
            <SidebarHeader className="h-16 flex items-center px-6">
              <div className="flex items-center gap-3">
                <div
                  className={
                    isOverview
                      ? 'w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] via-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-amber-900/20'
                      : 'w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg'
                  }
                >
                  <span className="font-bold text-lg">E</span>
                </div>
                <span className="font-bold text-xl tracking-tight group-data-[collapsible=icon]:hidden">Retail Verse</span>
              </div>
            </SidebarHeader>
            <SidebarContent className="px-2 pt-4">
              <SidebarGroup>
                <SidebarGroupLabel
                  className={
                    mainSidebarItems.some(item => item.href && location.pathname.startsWith(item.href))
                      ? 'px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-900/55 dark:text-amber-200/50 group-data-[collapsible=icon]:hidden'
                      : 'px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden'
                  }
                >
                  Main Menu
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-2">
                    {mainSidebarItems.map((item) => {
                      const href = item.href;
                      const isActive = href === '/dashboard' ? location.pathname === '/dashboard' : (href ? location.pathname.startsWith(href) : item.title === 'Overview' && location.pathname === '/dashboard');
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.title === 'Orders' && (isSuperAdminRole(user?.role) || isClientRole(user?.role)) ? 'Sale' : item.title}
                            className={dashboardSidebarNavButtonClass(isActive, false)}
                          >
                            <Link to={href || '#'}>
                              <item.icon
                                className={`w-5 h-5 shrink-0 ${isActive
                                  ? 'text-[#b8860b] dark:text-amber-300'
                                  : ''
                                  }`}
                              />
                              <span className="group-data-[collapsible=icon]:hidden flex-1 min-w-0 text-left text-[16px] font-semibold tracking-wide leading-snug">
                                {item.title === 'Orders' && (isSuperAdminRole(user?.role) || isClientRole(user?.role)) ? 'Sale' : item.title}</span>

                              {'badge' in item &&
                                item.badge != null &&
                                item.badge !== '' &&
                                (typeof item.badge === 'string' || typeof item.badge === 'number') && (
                                  <span
                                    className={
                                      isActive
                                        ? 'ml-auto shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-[#d4af37] to-amber-700 text-[10px] text-white flex items-center justify-center font-bold group-data-[collapsible=icon]:hidden shadow-sm'
                                        : 'ml-auto shrink-0 w-5 h-5 rounded-full bg-muted-foreground text-[10px] text-white flex items-center justify-center font-bold group-data-[collapsible=icon]:hidden'
                                    }
                                  >
                                    {item.badge}
                                  </span>
                                )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup className="mt-4">
                <SidebarGroupLabel className="sr-only">Resources</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-2">
                    {resourceSidebarItems.map((item) => {
                      const isActive = item.href ? location.pathname.startsWith(item.href) : false;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.title}
                            className={dashboardSidebarNavButtonClass(isActive, false)}
                          >
                            <Link to={item.href || '#'}>
                              <item.icon
                                className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#b8860b] dark:text-amber-300' : ''}`}
                              />
                              <span className="group-data-[collapsible=icon]:hidden flex-1 min-w-0 text-left text-[16px] font-semibold tracking-wide leading-snug">
                                {item.title}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter
              className={
                isOverview
                  ? 'p-4 border-t border-amber-200/25 dark:border-amber-900/20'
                  : 'p-4 border-t border-gray-100 dark:border-white/5'
              }
            >
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-300 ease-out font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
              </button>
            </SidebarFooter>
            <SidebarRail />
          </Sidebar>

          {/* Main Content Area */}
          <SidebarInset
            className={
              isOverview || isInventoryOrAnalytics
                ? 'flex flex-col flex-1 overflow-hidden bg-transparent'
                : 'flex flex-col flex-1 overflow-hidden bg-white dark:bg-[#09090b]'
            }
          >
            <DashboardNavbar premiumOverview={isOverview} />

            <main
              className={
                isOverview || isInventoryOrAnalytics
                  ? 'flex-1 overflow-y-auto p-5 sm:p-7 lg:p-10 custom-scrollbar dashboard-overview-fade'
                  : location.pathname.startsWith('/dashboard/products')
                    ? 'flex-1 overflow-y-auto custom-scrollbar'
                    : 'flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar'
              }
              style={isOverview ? { fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" } : undefined}
            >
              <div className="max-w-[1600px] mx-auto space-y-8 sm:space-y-10">
                {/* Welcome Section */}
                {location.pathname !== '/dashboard/products' && (
                  <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div>
                      <div
                        className={
                          isOverview
                            ? 'flex items-center gap-2 text-[#9a7b28] dark:text-amber-300/90 mb-3'
                            : 'flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2'
                        }
                      >
                        <TrendingUp className="w-4 h-4 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em]">
                          {location.pathname === '/dashboard' ? 'Performance Live' :
                            location.pathname.split('/').pop()?.replace('-', ' ')}
                        </span>
                      </div>
                      <h1
                        className={
                          isOverview
                            ? 'text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 capitalize leading-tight'
                            : 'text-3xl font-extrabold tracking-tight capitalize'
                        }
                      >
                        {location.pathname === '/dashboard' ? 'Dashboard Overview' :
                          location.pathname.split('/').pop()?.replace('-', ' ')}
                      </h1>
                      <p
                        className={
                          isOverview
                            ? 'text-muted-foreground mt-2 text-base max-w-xl leading-relaxed'
                            : 'text-muted-foreground mt-1'
                        }
                      >
                        {location.pathname === '/dashboard'
                          ? <>Welcome back, <span className="text-foreground font-semibold">{user?.name || 'Admin'}</span>. Here&apos;s what&apos;s happening today.</>
                          : `Manage your ${location.pathname.split('/').pop()?.replace('-', ' ')} and view detailed insights.`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className={
                              isOverview
                                ? 'w-9 h-9 rounded-full border-2 border-white dark:border-zinc-900 bg-gray-200 overflow-hidden shadow-md ring-1 ring-amber-200/40 dark:ring-amber-900/30'
                                : 'w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 overflow-hidden shadow-sm'
                            }
                          >
                            <img src={`https://i.pravatar.cc/150?u=${i + 10}`} alt="user" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        <div
                          className={
                            isOverview
                              ? 'w-9 h-9 rounded-full border-2 border-white dark:border-zinc-900 bg-gradient-to-br from-amber-100 to-amber-200 text-[#8b6914] flex items-center justify-center text-[10px] font-bold shadow-md ring-1 ring-amber-300/50'
                              : 'w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shadow-sm'
                          }
                        >
                          +12
                        </div>
                      </div>
                      <span
                        className={
                          isOverview
                            ? 'text-xs text-muted-foreground font-semibold underline-offset-4 hover:underline hover:text-[#b8860b] cursor-pointer transition-colors duration-300'
                            : 'text-xs text-muted-foreground font-medium underline cursor-pointer'
                        }
                      >
                        Live Customers
                      </span>
                    </div>
                  </motion.div>
                )}

                <AnimatePresence mode="wait">
                  {showOverviewSkeleton ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <DashboardSkeleton />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                      {location.pathname === '/dashboard' ? (
                        <motion.div
                          className="space-y-8 sm:space-y-10"
                          initial="hidden"
                          animate="show"
                          variants={{
                            hidden: { opacity: 0 },
                            show: {
                              opacity: 1,
                              transition: { staggerChildren: 0.08, delayChildren: 0.05 },
                            },
                          }}
                        >
                          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } }}>
                            <DashboardStats
                              analytics={overviewData}
                              staffView={staff}
                              error={overviewError}
                              superAdminOverview={isSuperAdminRole(user?.role) || isClientRole(user?.role)}
                              userOverview={
                                isCustomerOverview
                                  ? {
                                    metrics: userOverviewData,
                                    error: userOverviewError,
                                    pending: userOverviewPending,
                                  }
                                  : undefined
                              }
                            />
                          </motion.div>
                          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } }}>
                            <DashboardCharts
                              analytics={isCustomerOverview ? userAnalyticsData : overviewData}
                              staffView={staff || isCustomerOverview}
                              revenueInInr={isSuperAdminRole(user?.role) || isClientRole(user?.role)}
                            />
                          </motion.div>
                          {(isSuperAdminRole(user?.role) || isClientRole(user?.role)) && (
                            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } }}>
                              <DashboardContactSummary />
                            </motion.div>
                          )}
                          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } }}>
                            <DashboardQuickActions onSync={handleDashboardSync} syncing={syncing} />
                          </motion.div>
                          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } }}>
                            <DashboardRecentActivity indianRupee={isSuperAdminRole(user?.role) || isClientRole(user?.role)} />
                          </motion.div>
                          {(isSuperAdminRole(user?.role) || isClientRole(user?.role)) && (
                            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } }}>
                              <DashboardRecentTickets />
                            </motion.div>
                          )}
                        </motion.div>
                      ) : (
                        <Outlet />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer */}
                <footer
                  className={
                    isOverview
                      ? 'mt-14 pt-10 border-t border-amber-200/30 dark:border-amber-900/25 flex flex-col md:flex-row items-center justify-between text-muted-foreground text-sm pb-10'
                      : 'mt-12 pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between text-muted-foreground text-sm pb-8'
                  }
                >
                  <p>© 2026 Retail Verse Admin. All rights reserved.</p>
                  <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 mt-4 md:mt-0">
                    <Link
                      to="/privacy-policy"
                      className={
                        isOverview
                          ? 'transition-colors duration-300 hover:text-[#b8860b] dark:hover:text-amber-300'
                          : 'hover:text-blue-600 transition-colors'
                      }
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      to="/terms-of-service"
                      className={
                        isOverview
                          ? 'transition-colors duration-300 hover:text-[#b8860b] dark:hover:text-amber-300'
                          : 'hover:text-blue-600 transition-colors'
                      }
                    >
                      Terms of Service
                    </Link>
                    <a
                      href="#"
                      className={
                        isOverview
                          ? 'transition-colors duration-300 hover:text-[#b8860b] dark:hover:text-amber-300'
                          : 'hover:text-blue-600 transition-colors'
                      }
                    >
                      Documentation
                    </a>
                  </div>
                </footer>
              </div>
            </main>
          </SidebarInset>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1f2937;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        @keyframes dashboard-overview-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .dashboard-overview-fade {
          animation: dashboard-overview-fade-in 0.5s ease-out both;
        }
      `}} />
    </SidebarProvider>
  );
}
