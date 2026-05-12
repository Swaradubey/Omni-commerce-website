import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { resolvePostLoginPath } from '../../utils/staffRoles';
import { USER_STORAGE_KEY, TOKEN_STORAGE_KEY } from '../../context/AuthContext';

/**
 * Handles the redirect from the backend after a successful Google OAuth login.
 * Reads the JWT token from the URL query params, stores it in localStorage,
 * and redirects to the home/dashboard page.
 */
export function GoogleAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const name = searchParams.get('name') || '';
    const email = searchParams.get('email') || '';
    const role = searchParams.get('role') || 'user';
    const id = searchParams.get('id') || '';
    const clientId = searchParams.get('clientId');

    if (!token) {
      console.error('[Google OAuth] Missing token in URL params');
      setError('Google login failed. No authentication token received.');
      setTimeout(() => navigate('/login?error=missing_google_token', { replace: true }), 3000);
      return;
    }

    // Store auth data using the same keys as AuthContext
    const userData = {
      id,
      _id: id,
      name,
      email,
      role,
      token,
      clientId,
      isAdmin: role === 'admin' || role === 'super_admin',
      isSuperAdmin: role === 'super_admin',
    };

    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));

    if (clientId) {
      localStorage.setItem('retail_verse_client_id', clientId);
    }

    // Also set client info if needed by the app
    localStorage.setItem('retail_verse_client_domain', window.location.hostname);
    localStorage.setItem('retail_verse_client_origin', window.location.origin);

    console.log('[Google OAuth] Auth data saved, redirecting to dashboard...');

    // Redirect to dashboard page (forces AuthContext to rehydrate from localStorage)
    // We use window.location.href to ensure a clean state and full reload of AuthContext
    const targetPath = resolvePostLoginPath(role, '/');
    window.location.href = targetPath;
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <div className="text-red-500 text-lg font-semibold mb-2">Authentication Failed</div>
          <p className="text-gray-600 text-sm">{error}</p>
          <p className="text-gray-400 text-xs mt-4">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-700 font-medium">Signing you in with Google...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait a moment.</p>
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-green-600 font-medium bg-green-50 py-1 px-3 rounded-full inline-block">
            Google callback loaded
          </p>
        </div>
      </div>
    </div>
  );
}
