import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

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

    if (!token) {
      setError('Google login failed. No authentication token received.');
      setTimeout(() => navigate('/register', { replace: true }), 3000);
      return;
    }

    // Store auth data using the same keys as AuthContext
    const userData = {
      _id: id,
      id,
      name,
      email,
      role,
      token,
      isAdmin: role === 'admin' || role === 'super_admin',
      isSuperAdmin: role === 'super_admin',
    };

    localStorage.setItem('eco_shop_token', token);
    localStorage.setItem('eco_shop_user', JSON.stringify(userData));

    // Redirect to home page (forces AuthContext to rehydrate from localStorage)
    window.location.href = '/';
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <div className="text-red-500 text-lg font-semibold mb-2">Authentication Failed</div>
          <p className="text-gray-600 text-sm">{error}</p>
          <p className="text-gray-400 text-xs mt-4">Redirecting to sign up page...</p>
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
      </div>
    </div>
  );
}
