import ApiService from './apiService';

export type CustomerDetailStats = {
  totalSpent: number;
  totalOrders: number;
  totalItems: number;
};

export type RecentOrder = {
  orderId: string;
  totalPrice: number;
  itemCount: number;
  status: string;
  createdAt: string;
};

export type CustomerDetail = {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  address: string;
  country: string;
  bio: string;
  profilePhoto: string;
  isActive: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  lastSeen: string | null;
  stats: CustomerDetailStats;
  recentOrders: RecentOrder[];
};

export type CustomerDetailResponse = {
  success: boolean;
  data?: CustomerDetail;
  message?: string;
};

export const adminCustomersApi = {
  getCustomerById: (id: string) =>
    ApiService.get<CustomerDetailResponse>(`/api/admin/customers/${id}`),
};