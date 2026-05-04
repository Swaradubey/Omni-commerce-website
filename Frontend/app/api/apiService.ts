/**
 * Standardized API service for the EcoShop frontend.
 * Handles base URL, headers, authentication, and error parsing.
 */

const TOKEN_KEY = "eco_shop_token";

/** Resolves final request URL whether env base includes `/api` or not. */
function buildApiUrl(endpoint: string): string {
  const fallback = "https://omni-commerce-website.onrender.com/api";
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? "").trim() || fallback;
  console.log(`[ApiService] Using API Base URL: ${raw}`);
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
    options: RequestInit & { pageName?: string } = {}
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);
    const pageName = options.pageName || "Unknown Page";
    
    // Auto-inject Authorization header if token exists
    const token = localStorage.getItem(TOKEN_KEY);
    
    // Get user from storage to check role and clientId
    let userRole = "";
    let userClientId = null;
    try {
      const storedUser = localStorage.getItem("eco_shop_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        userRole = parsed.role || "";
        userClientId = parsed.clientId || parsed.linkedClientId || null;
      }
    } catch (e) {
      // Ignore parse errors
    }

    const isPrivileged = userRole === "admin" || userRole === "super_admin";
    
    // Priority for x-client-id:
    // 1. User's own clientId or linkedClientId (works for admins, managers, and assigned customers)
    // 2. localStorage retail_verse_client_id if guest or unassigned
    let clientId = userClientId || localStorage.getItem("retail_verse_client_id");

    // Clean up clientId to avoid sending "null" or "undefined" as strings
    if (clientId === "null" || clientId === "undefined" || !clientId) {
      clientId = null;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(clientId ? { "x-client-id": clientId } : {}),
      "x-client-domain": window.location.hostname,
      "x-client-origin": window.location.origin,
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      // Requirement 16: Log Request URL, Method, Page Name
      console.log(`[ApiService] [${pageName}] ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, { ...options, headers });
      
      // Requirement 16: Log Status
      console.log(`[ApiService] [${pageName}] Status: ${response.status}`);

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
        console.error(`[ApiService] [${pageName}] Error:`, data.message || response.statusText);
        
        if (response.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem("eco_shop_user");
        }
        
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data as ApiResponse<T>;
    } catch (error: any) {
      console.error(`[ApiService] [${pageName}] Exception:`, error.message);
      throw error;
    }
  }

  static get<T>(endpoint: string, options?: RequestInit & { pageName?: string }) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  static post<T>(endpoint: string, body: any, options?: RequestInit & { pageName?: string }) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  static put<T>(endpoint: string, body: any, options?: RequestInit & { pageName?: string }) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  static patch<T>(endpoint: string, body: any, options?: RequestInit & { pageName?: string }) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  static delete<T>(endpoint: string, options?: RequestInit & { pageName?: string }) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export default ApiService;
