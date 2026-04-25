import ApiService from './apiService';

export type EmployeeRow = {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  role: string;
  clientId: string;
  managerId?: string | null;
  shopName?: string;
  status?: string;
  createdBy?: string;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateEmployeePayload = {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  clientId?: string;
  managerId?: string;
  shopName?: string;
  role?: 'employee' | 'staff' | 'seo_manager' | 'store_manager' | 'inventory_manager';
};

export const employeesApi = {
  create: (body: CreateEmployeePayload) =>
    ApiService.post<EmployeeRow>('/api/employees', body),

  listByClient: (clientId: string, roles?: string[]) => {
    const q =
      roles && roles.length > 0
        ? `?roles=${encodeURIComponent(roles.join(','))}`
        : '';
    return ApiService.get<EmployeeRow[]>(
      `/api/employees/client/${encodeURIComponent(clientId)}${q}`
    );
  },

  list: (clientId?: string, roles?: string[]) => {
    const params = new URLSearchParams();
    if (clientId) params.set('clientId', clientId);
    if (roles && roles.length > 0) params.set('roles', roles.join(','));
    const q = params.toString();
    return ApiService.get<EmployeeRow[]>(`/api/employees${q ? `?${q}` : ''}`);
  },

  get: (id: string) =>
    ApiService.get<EmployeeRow>(`/api/employees/${encodeURIComponent(id)}`),

  update: (
    id: string,
    body: Partial<
      Pick<EmployeeRow, 'name' | 'phone' | 'address' | 'shopName' | 'status' | 'managerId'>
    >
  ) => ApiService.put<EmployeeRow>(`/api/employees/${encodeURIComponent(id)}`, body),

  remove: (id: string) => ApiService.delete(`/api/employees/${encodeURIComponent(id)}`),
};

/** @deprecated Use EmployeeRow — kept for any stale imports */
export type Employee = EmployeeRow;
