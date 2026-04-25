import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { isSuperAdminRole } from '../utils/staffRoles';

export function SuperAdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isSuperAdminRole(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
