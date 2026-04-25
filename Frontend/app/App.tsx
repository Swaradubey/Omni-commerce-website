import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { router } from './routes';
import { Toaster } from 'sonner';
import { initPosOfflineOrdersSync } from './lib/posOfflineOrders';

export default function App() {
  useEffect(() => {
    initPosOfflineOrdersSync();
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton />
      </CartProvider>
    </AuthProvider>
  );
}
