import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { isStaffRole, isSuperAdminRole } from '../utils/staffRoles';

/**
 * Help Center: end customers (`user`) and staff, but not Super Admin (moved off SA sidebar).
 */
export function HelpCenterRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isSuperAdminRole(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const allowed = user.role === 'user' || isStaffRole(user.role);
  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
