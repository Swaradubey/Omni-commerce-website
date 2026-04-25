import ApiService from './apiService';

export type ImpersonationPayload = {
  active: boolean;
  superAdminId: string;
  superAdminName: string;
  superAdminEmail?: string;
};

export type ImpersonateApiUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
};

export type ImpersonateResponseData = {
  token: string;
  expiresIn?: string;
  user: ImpersonateApiUser;
  impersonation: ImpersonationPayload;
};

export type StopImpersonationResponseData = {
  token: string;
  user: ImpersonateApiUser & { isSuperAdmin?: boolean };
};

export const superadminApi = {
  impersonate: (adminId: string) =>
    ApiService.post<ImpersonateResponseData>(`/api/superadmin/impersonate/${adminId}`, {}),

  stopImpersonation: () =>
    ApiService.post<StopImpersonationResponseData>('/api/superadmin/impersonate/stop', {}),
};
