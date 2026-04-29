import ApiService from './apiService';

export interface CustomDomainData {
  _id: string;
  domainName: string;
  clientId: string;
  clientName: string;
  status: 'Pending' | 'Verified' | 'Error';
  dnsInstructions?: {
    root: { type: string; name: string; value: string };
    subdomain: { type: string; name: string; value: string };
  };
  createdAt: string;
  updatedAt: string;
}

export const customDomainApi = {
  getAll: () => ApiService.get<CustomDomainData[]>('/custom-domains'),
  create: (data: { domain: string; clientId: string }) => 
    ApiService.post<CustomDomainData>('/custom-domains', data),
  checkStatus: (id: string) => ApiService.get<{ status: string; data: CustomDomainData }>(`/custom-domains/${id}/status`),
  delete: (id: string) => ApiService.delete(`/custom-domains/${id}`),
};
