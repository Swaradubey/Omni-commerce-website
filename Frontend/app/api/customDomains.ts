import ApiService from './apiService';

export interface CustomDomainData {
  _id: string;
  domain: string;
  clientName?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const customDomainApi = {
  getAll: () => ApiService.get<CustomDomainData[]>('/custom-domains'),
  create: (data: { domain: string; clientName?: string }) => 
    ApiService.post<CustomDomainData>('/custom-domains', data),
  delete: (id: string) => ApiService.delete(`/custom-domains/${id}`),
};
