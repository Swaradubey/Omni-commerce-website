import ApiService from './apiService';
import type { ClientRow } from './clients';

export interface SuperAdminClientData extends ClientRow {
  // additional fields if necessary
}

export const superAdminClientsApi = {
  listClients: () => 
    ApiService.get<SuperAdminClientData[]>('/superadmin/clients', { pageName: 'Super Admin Clients List' }),

  getClientSales: (clientId: string) => 
    ApiService.get<any[]>(`/superadmin/clients/${clientId}/sales`, { pageName: 'Super Admin Client Sales' }),

  getClientInvoices: (clientId: string) => 
    ApiService.get<any[]>(`/superadmin/clients/${clientId}/invoices`, { pageName: 'Super Admin Client Invoices' }),

  getClientCustomers: (clientId: string) => 
    ApiService.get<any[]>(`/superadmin/clients/${clientId}/customers`, { pageName: 'Super Admin Client Customers' }),

  getTrialSummary: () =>
    ApiService.get<any>('/superadmin/trials/summary', { pageName: 'Super Admin Trial Summary' }),

  updateTrial: (clientId: string, action: 'extend' | 'reset' | 'expire', days?: number) =>
    ApiService.patch<any>(`/superadmin/clients/${clientId}/trial`, { action, days }, { pageName: 'Super Admin Update Trial' })
};
