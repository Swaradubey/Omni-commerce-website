import ApiService from './apiService';

export type StoreManager = {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  role: string;
  clientId: string;
  shopName?: string;
  status?: string;
  managerId?: string | null;
  createdBy?: string;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateStoreManagerPayload = {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  /** Required when called by super_admin from the client directory */
  clientId?: string;
  shopName?: string;
};

export const storeManagersApi = {
  create: (body: CreateStoreManagerPayload) =>
    ApiService.post<StoreManager>('/api/store-managers', body),

  listByClient: (clientId: string) =>
    ApiService.get<StoreManager[]>(
      `/api/store-managers/client/${encodeURIComponent(clientId)}`
    ),

  list: (clientId?: string) => {
    const q = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
    return ApiService.get<StoreManager[]>(`/api/store-managers${q}`);
  },

  get: (id: string) =>
    ApiService.get<StoreManager>(`/api/store-managers/${encodeURIComponent(id)}`),

  update: (id: string, body: Partial<Pick<StoreManager, 'name' | 'phone' | 'address' | 'shopName' | 'status'>>) =>
    ApiService.put<StoreManager>(`/api/store-managers/${encodeURIComponent(id)}`, body),

  remove: (id: string) => ApiService.delete(`/api/store-managers/${encodeURIComponent(id)}`),
};
