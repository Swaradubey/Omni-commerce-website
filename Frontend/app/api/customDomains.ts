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
  getAll: (options?: any) => ApiService.get<CustomDomainData[]>('/custom-domains', options),
  create: (data: { domainName: string; clientId: string }, options?: any) => 
    ApiService.post<CustomDomainData>('/custom-domains', data, options),
  checkStatus: (id: string, options?: any) => ApiService.get<{ status: string; data: CustomDomainData }>(`/custom-domains/${id}/status`, options),
  delete: (id: string, options?: any) => ApiService.delete(`/custom-domains/${id}`, options),
};
