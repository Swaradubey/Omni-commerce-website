import ApiService from "./apiService";

export type ProductClientInfo = {
  _id?: string;
  companyName?: string;
  shopName?: string;
  email?: string;
};

export interface Product {
  _id?: string;
  name: string;
  title?: string;
  description?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  category: string;
  image?: string;
  sku: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isOnSale?: boolean;
  salePercentage?: number;
  rating?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  clientId?: string;
  client?: ProductClientInfo | null;
}

export const productApi = {
  getAll: (filters?: any) => {
    // Optional: Serialize filters to query string
    return ApiService.get("/api/products");
  },

  /** Scoped inventory list for dashboard (populates `client`; Super Admin sees all). */
  getManage: () => ApiService.get<Product[]>("/api/inventory/manage"),
  
  getOne: (id: string) => {
    return ApiService.get(`/api/products/${id}`);
  },

  getFeatured: () => {
    return ApiService.get("/api/products/featured");
  },
  
  create: (payload: Product) => {
    return ApiService.post("/api/products", payload);
  },
  
  update: (id: string, payload: Partial<Product>) => {
    return ApiService.put(`/api/products/${id}`, payload);
  },
  
  delete: (id: string) => {
    return ApiService.delete(`/api/products/${id}`);
  },
};

// Maintain compatibility with existing code that might import specific functions
export const getProducts = () => productApi.getAll();
export const createProduct = (data: Product) => productApi.create(data);
export const updateProduct = (id: string, data: Partial<Product>) => productApi.update(id, data);
export const deleteProduct = (id: string) => productApi.delete(id);
