import { useState } from 'react';
import { createOrder, getOrderById } from './orders';

export function useOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState(null);

  const submitOrder = async (orderData) => {
    setLoading(true);
    setError('');

    try {
      const response = await createOrder(orderData);
      setOrderData(response.data);
      return response.data;
    } catch (err) {
      setError('Failed to place order. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchOrder = async (orderId) => {
    setLoading(true);
    setError('');

    try {
      const response = await getOrderById(orderId);
      setOrderData(response.data);
      return response.data;
    } catch (err) {
      setError('Failed to fetch order details.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    orderData,
    submitOrder,
    fetchOrder,
  };
}