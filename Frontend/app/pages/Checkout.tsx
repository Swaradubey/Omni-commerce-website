import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useCart } from '../context/CartContext';
import { CreditCard, Lock } from 'lucide-react';
import { createOrder, OrderPayload, createRazorpayOrder, verifyRazorpayPayment } from '../api/orders';
import { formatINR } from '../utils/formatINR';

declare global {
  interface Window {
    Razorpay: any;
  }
}


export function Checkout() {
  const navigate = useNavigate();
  const { cart, cartTotal, clearCart } = useCart();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
  });

  const shipping = cartTotal > 50 ? 0 : 10;
  const total = cartTotal + shipping;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderPlacedSuccessfully, setOrderPlacedSuccessfully] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    // Phone Validation
    const phoneClean = formData.phone.replace(/\D/g, '');
    const isIndian = formData.country === 'India';

    // Reject known placeholders (9999999999, etc.) for ALL countries
    const placeholders = ["9999999999", "0000000000", "1234567890", "1111111111", "8888888888", "7777777777"];
    if (placeholders.includes(phoneClean)) {
      setError('Please enter a real mobile number, not a placeholder.');
      setLoading(false);
      return;
    }

    if (isIndian) {
      // Basic check for 10 digits and valid starting digits for Indian mobiles (6, 7, 8, or 9)
      if (!/^[6-9]\d{9}$/.test(phoneClean)) {
        setError('Please enter a valid 10-digit Indian mobile number.');
        setLoading(false);
        return;
      }
    } else if (phoneClean.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits).');
      setLoading(false);
      return;
    }

    // Internal business order reference
    const internalOrderId = 'ORD-' + Date.now();

    try {
      // 1. Create Razorpay Order
      const rzpOrder = await createRazorpayOrder(total);

      if (!rzpOrder.success) {
        throw new Error(rzpOrder.message || 'Failed to initialize Razorpay');
      }

      // 2. Open Razorpay Modal
      const options = {
        key: rzpOrder.key_id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "E-commerce Store",
        description: "Secure Order Payment",
        order_id: rzpOrder.order_id,
        handler: async (response: any) => {
          try {
            setLoading(true);
            // 3. Verify Payment
            const verifyResult = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              internal_order_id: internalOrderId,
            });

            if (verifyResult.success) {
              // 4. Create final order in our database
              const orderData: OrderPayload = {
                orderId: internalOrderId,
                items: (cart || []).map((item) => ({
                  productId: String(item.id),
                  name: item.name,
                  price: Number(item.salePrice || item.price),
                  quantity: Number(item.quantity),
                  image: item.image,
                })),
                shippingAddress: {
                  fullName: `${formData.firstName} ${formData.lastName}`,
                  address: formData.address,
                  city: formData.city,
                  state: formData.state,
                  zipCode: formData.zip,
                  country: formData.country,
                  phone: formData.phone.trim(),
                },
                paymentMethod: "razorpay",
                totalPrice: Number(total),
                customerEmail: formData.email.trim(),
                customerName: `${formData.firstName} ${formData.lastName}`.trim(),
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              };

              console.log('[CHECKOUT] Submitting order payload:', JSON.stringify(orderData, null, 2));

              const result = await createOrder(orderData);
              if (result.success) {
                setOrderPlacedSuccessfully(true);
                clearCart();
              } else {
                throw new Error(result.message || 'Failed to record order after payment.');
              }
            } else {
              throw new Error('Payment verification failed.');
            }
          } catch (err: any) {
            setError(err.message || 'Verification failed');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#2563eb", // blue-600
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to initialize payment. Please try again.';
      console.error('[CHECKOUT] Razorpay flow error:', message);
      setError(message);
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (orderPlacedSuccessfully) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* CSS for Sparkles and Glow */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes floatSparkle {
            0% { transform: translateY(0) scale(0.8); opacity: 0; }
            50% { opacity: 0.8; transform: translateY(-40px) scale(1.2); }
            100% { transform: translateY(-80px) scale(0.8); opacity: 0; }
          }
          @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.4); transform: scale(1); }
            50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.7); transform: scale(1.05); }
          }
          .sparkle {
            position: absolute;
            border-radius: 50%;
            opacity: 0;
            pointer-events: none;
            animation: floatSparkle 3.5s ease-in-out infinite;
          }
          .sparkle:nth-child(1) { left: 15%; top: 30%; width: 8px; height: 8px; animation-delay: 0s; background: #ffd700; box-shadow: 0 0 8px #ffd700; }
          .sparkle:nth-child(2) { left: 80%; top: 20%; width: 10px; height: 10px; animation-delay: 0.5s; background: #ff6b6b; box-shadow: 0 0 8px #ff6b6b; }
          .sparkle:nth-child(3) { left: 25%; top: 75%; width: 6px; height: 6px; animation-delay: 1.2s; background: #4facfe; box-shadow: 0 0 8px #4facfe; }
          .sparkle:nth-child(4) { left: 75%; top: 80%; width: 9px; height: 9px; animation-delay: 0.8s; background: #43e97b; box-shadow: 0 0 8px #43e97b; }
          .sparkle:nth-child(5) { left: 40%; top: 15%; width: 5px; height: 5px; animation-delay: 1.5s; background: #a18cd1; box-shadow: 0 0 8px #a18cd1; }
          .sparkle:nth-child(6) { left: 65%; top: 85%; width: 7px; height: 7px; animation-delay: 2.1s; background: #fbc2eb; box-shadow: 0 0 8px #fbc2eb; }
          .sparkle:nth-child(7) { left: 50%; top: 5%; width: 12px; height: 12px; animation-delay: 0.3s; background: #ffd700; box-shadow: 0 0 8px #ffd700; }
          .sparkle:nth-child(8) { left: 45%; top: 85%; width: 6px; height: 6px; animation-delay: 1.8s; background: #ff6b6b; box-shadow: 0 0 8px #ff6b6b; }
          .sparkle:nth-child(9) { left: 10%; top: 55%; width: 9px; height: 9px; animation-delay: 0.7s; background: #43e97b; box-shadow: 0 0 8px #43e97b; }
          .sparkle:nth-child(10) { left: 85%; top: 50%; width: 6px; height: 6px; animation-delay: 1.1s; background: #a18cd1; box-shadow: 0 0 8px #a18cd1; }
          .icon-glow {
            animation: pulseGlow 2.5s infinite ease-in-out;
          }
        `}} />

        {/* Floating Sparkles Background */}
        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
            <div className="relative w-full max-w-4xl h-full min-h-[500px]">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="sparkle"></div>
                ))}
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center relative z-10 transition-all duration-500 hover:shadow-md hover:-translate-y-1">
          <div className="icon-glow w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Congratulations Thank you for shopping!
          </h1>
          <p className="text-gray-600 mb-8">
            Your order has been placed successfully.
          </p>
          <button
            onClick={() => navigate('/shop')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (!cart || cart.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Information */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Shipping Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={formData.address || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      required
                      value={formData.state || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      name="zip"
                      required
                      value={formData.zip || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <select
                      name="country"
                      required
                      value={formData.country || 'United States'}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>United States</option>
                      <option>Canada</option>
                      <option>United Kingdom</option>
                      <option>Australia</option>
                      <option>India</option>

                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="w-5 h-5 text-gray-700" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Payment Information
                  </h2>
                </div>

                <div className="p-4 border border-blue-100 bg-blue-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-blue-900">Payment Method: Razorpay</span>
                    <img
                      src="https://razorpay.com/assets/razorpay-glyph.svg"
                      alt="Razorpay"
                      className="h-6"
                    />
                  </div>
                  <p className="text-sm text-blue-800">
                    Secure payment via Razorpay. Clicking "Place Order" will open the Razorpay payment portal.
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                  <Lock className="w-4 h-4" />
                  <span>Secure payment processed by Razorpay</span>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Order Summary
                </h2>

                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {(cart || []).map((item) => {
                    const itemPrice = item.salePrice || item.price;
                    return (
                      <div key={item.id} className="flex gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Qty: {item.quantity}
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatINR(itemPrice * item.quantity)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">
                      {formatINR(cartTotal || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="font-semibold">
                      {shipping === 0 ? (
                        <span className="text-green-600">FREE</span>
                      ) : (
                        formatINR(shipping || 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-4">
                    <span>Total</span>
                    <span>{formatINR(total || 0)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Placing Order...' : 'Place Order'}
                </button>
                {error && (
                  <p className="mt-4 text-red-600 text-sm">{error}</p>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
