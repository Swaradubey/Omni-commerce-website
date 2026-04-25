import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { SuperAdminRoute } from './components/SuperAdminRoute';
import { SuperAdminOnlyRoute } from './components/SuperAdminOnlyRoute';
import { FullAdminOnlyRoute } from './components/FullAdminOnlyRoute';
import { HelpCenterRoute } from './components/HelpCenterRoute';
import { SupportRoute } from './components/SupportRoute';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { NotFound } from './pages/NotFound';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/auth/Login';
import { SuperAdminLogin } from './pages/auth/SuperAdminLogin';
import { SuperAdminDashboard } from './pages/super-admin/SuperAdminDashboard';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { Contact } from './pages/Contact';
import { About } from './pages/About';
import { Inventory } from './pages/Inventory';
import { Pos } from './pages/Pos';
import { DashboardProducts } from './pages/dashboard/DashboardProducts';
import { DashboardOrders } from './pages/dashboard/DashboardOrders';
import { DashboardInvoices } from './pages/dashboard/DashboardInvoices';
import { DashboardCustomers } from './pages/dashboard/DashboardCustomers';
import { DashboardAnalytics } from './pages/dashboard/DashboardAnalytics';
import { DashboardInbox } from './pages/dashboard/DashboardInbox';
import { DashboardSettings } from './pages/dashboard/DashboardSettings';
import { DashboardHelpCenter } from './pages/dashboard/DashboardHelpCenter';
import { DashboardWishlistActivity } from './pages/dashboard/DashboardWishlistActivity';
import { DashboardContactMessages } from './pages/dashboard/DashboardContactMessages';
import { DashboardUsers } from './pages/dashboard/DashboardUsers';
import { DashboardSeo } from './pages/dashboard/DashboardSeo';
import { DashboardAdminLogs } from './pages/dashboard/DashboardAdminLogs';
import { DashboardSupport } from './pages/dashboard/DashboardSupport';
import { DashboardClients } from './pages/dashboard/DashboardClients';
import { DashboardAddEmployee } from './pages/dashboard/DashboardAddEmployee';
import { Account } from './pages/Account';
import { WishlistPage } from './pages/WishlistPage';
import { TrackOrder } from './pages/TrackOrder';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: 'shop', Component: Shop },
      { path: 'product/:slug', Component: ProductDetail },
      { path: 'cart', Component: Cart },
      { path: 'checkout', Component: Checkout },
      { path: 'order-confirmation/:orderId', Component: OrderConfirmation },
      { path: 'track-order', Component: TrackOrder },
      { path: 'login', Component: Login },
      { path: 'super-admin/login', Component: SuperAdminLogin },
      {
        path: 'super-admin',
        element: (
          <ProtectedRoute loginPath="/super-admin/login">
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          </ProtectedRoute>
        ),
      },
      { path: 'register', Component: Register },
      { path: 'forgot-password', Component: ForgotPassword },
      { path: 'contact', Component: Contact },
      { path: 'about', Component: About },
      {
        path: 'pos',
        element: (
          <ProtectedRoute>
            <Pos />
          </ProtectedRoute>
        ),
      },
      {
        path: 'account',
        element: (
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'wishlist', element: <WishlistPage /> },
          { path: 'track', element: <TrackOrder variant="account" /> },
        ],
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: null },
          { path: 'products', element: <DashboardProducts /> },
          {
            path: 'inventory',
            element: (
              <AdminRoute>
                <Inventory />
              </AdminRoute>
            ),
          },
          {
            path: 'orders',
            element: <DashboardOrders />,
          },
          {
            path: 'invoices',
            element: (
              <SuperAdminOnlyRoute>
                <DashboardInvoices />
              </SuperAdminOnlyRoute>
            ),
          },
          {
            path: 'customers',
            element: (
              <SuperAdminOnlyRoute>
                <DashboardCustomers />
              </SuperAdminOnlyRoute>
            ),
          },
          {
            path: 'users',
            element: (
              <SuperAdminOnlyRoute>
                <DashboardUsers />
              </SuperAdminOnlyRoute>
            ),
          },
          {
            path: 'clients',
            element: (
              <SuperAdminOnlyRoute>
                <DashboardClients />
              </SuperAdminOnlyRoute>
            ),
          },
          {
            path: 'admin-logs',
            element: (
              <SuperAdminOnlyRoute>
                <DashboardAdminLogs />
              </SuperAdminOnlyRoute>
            ),
          },
          {
            path: 'support',
            element: <SupportRoute />,
          },
          {
            path: 'analytics',
            element: (
              <SuperAdminOnlyRoute>
                <DashboardAnalytics />
              </SuperAdminOnlyRoute>
            ),
          },
          {
            path: 'inbox',
            element: (
              <AdminRoute>
                <DashboardInbox />
              </AdminRoute>
            ),
          },
          {
            path: 'contact-messages',
            element: (
              <FullAdminOnlyRoute>
                <DashboardContactMessages />
              </FullAdminOnlyRoute>
            ),
          },
          {
            path: 'settings',
            element: (
              <FullAdminOnlyRoute>
                <DashboardSettings />
              </FullAdminOnlyRoute>
            ),
          },
          {
            path: 'help-center',
            element: (
              <HelpCenterRoute>
                <DashboardHelpCenter />
              </HelpCenterRoute>
            ),
          },
          { path: 'wishlist', element: <WishlistPage /> },
          {
            path: 'wishlist-activity',
            element: (
              <FullAdminOnlyRoute>
                <DashboardWishlistActivity />
              </FullAdminOnlyRoute>
            ),
          },
          {
            path: 'add-employee',
            element: (
              <AdminRoute>
                <DashboardAddEmployee />
              </AdminRoute>
            ),
          },
          {
            path: 'seo',
            element: (
              <AdminRoute>
                <DashboardSeo />
              </AdminRoute>
            ),
          },
        ]
      },
      { path: '*', Component: NotFound },
    ],
  },
]);
