import ApiService from './apiService';

export type ClientRow = {
  _id: string;
  companyName: string;
  gst: string;
  phone: string;
  email: string;
  panNo?: string;
  permanentAddress?: string;
  shopName?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: { _id: string; name?: string; email?: string } | null;
  userId?: { _id: string; name?: string; email?: string; role?: string } | null;
};

export type CreateClientBody = {
  companyName: string;
  gst: string;
  phone: string;
  email: string;
  panNo: string;
  permanentAddress: string;
  shopName: string;
  password: string;
};

export const clientsApi = {
  list: () => ApiService.get<ClientRow[]>('/api/clients'),
  create: (body: CreateClientBody) => ApiService.post<ClientRow>('/api/clients', body),
  delete: (id: string) => ApiService.delete<{ success: boolean; message: string }>(`/api/clients/${id}`),
};
