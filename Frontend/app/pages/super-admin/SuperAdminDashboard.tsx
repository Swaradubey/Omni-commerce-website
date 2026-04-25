import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Shield, LayoutDashboard, LogOut } from 'lucide-react';

export function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">
      <div
        className="w-full max-w-lg rounded-2xl border border-indigo-200/80 bg-white shadow-xl shadow-indigo-100/50 p-8 md:p-10"
        style={{
          background: 'linear-gradient(145deg, #faf5ff 0%, #ffffff 50%, #eef2ff 100%)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-300/40">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Super Admin</h1>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800 mt-1">
              Logged in as Super Admin
            </p>
            <p className="text-sm text-indigo-600 font-medium mt-1">Authenticated · {user?.email}</p>
          </div>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed mb-8">
          You are signed in with the <span className="font-semibold text-gray-900">super_admin</span> role.
          Use the main dashboard for store operations, or sign out when finished.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
          >
            <LayoutDashboard className="w-4 h-4" />
            Open main dashboard
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/', { replace: true });
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
