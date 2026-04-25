/**
 * Standardized API service for the EcoShop frontend.
 * Handles base URL, headers, authentication, and error parsing.
 */

const TOKEN_KEY = "eco_shop_token";

/** Resolves final request URL whether env base includes `/api` or not. */
function buildApiUrl(endpoint: string): string {
  const fallback = "http://localhost:5000/api";
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? "").trim() || fallback;
  const base = raw.replace(/\/+$/, "");
  let path = endpoint.trim();
  if (!path.startsWith("/")) path = `/${path}`;

  const baseEndsWithApi = /\/api$/i.test(base);

  if (path.startsWith("/api/") || path === "/api") {
    if (baseEndsWithApi) {
      path = path === "/api" ? "/" : path.slice(4);
      if (!path.startsWith("/")) path = `/${path}`;
    }
    return `${base}${path}`;
  }

  if (!baseEndsWithApi) {
    const suffix = path.startsWith("/") ? path : `/${path}`;
    if (suffix.startsWith("/api")) {
      return `${base}${suffix}`;
    }
    return `${base}/api${suffix}`;
  }

  return `${base}${path}`;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

class ApiService {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);
    
    // Auto-inject Authorization header if token exists
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      console.log(`[Frontend Debug] Token found in localStorage: ${token.substring(0, 10)}...`);
    } else {
      console.warn("[Frontend Debug] No token found in localStorage.");
    }

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    try {
      console.log(`[Frontend Debug] Requesting ${options.method || 'GET'} ${url}`);
      console.log(`[Frontend Debug] Headers:`, headers);
      if (options.body) console.log(`[Frontend Debug] Payload:`, options.body);
      
      const response = await fetch(url, { ...options, headers });
      
      // Attempt to parse JSON
      let data: any;
      try {
        data = await response.json();
      } catch (err) {
        data = {
          success: response.ok,
          message: response.statusText || "Invalid JSON response from server",
        };
      }

      if (!response.ok) {
        // Handle validation errors from backend
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
           throw new Error(data.errors.map((e: any) => e.msg || e.message).join(", "));
        }
        
        // Handle unauthorized (401) by clearing token
        if (response.status === 401) {
          console.warn("[ApiService] Unauthorized access (401). Clearing token...");
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem("eco_shop_user");
          localStorage.removeItem("eco_shop_impersonation_super_backup");
          // Optional: window.location.href = "/login"; // Force redirect if needed
        }
        
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data as ApiResponse<T>;
    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error.message);
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        throw new Error("Unable to connect to server. Please ensure the backend is running.");
      }
      throw error;
    }
  }

  static get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  static post<T>(endpoint: string, body: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  static put<T>(endpoint: string, body: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  static patch<T>(endpoint: string, body: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  static delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export default ApiService;
