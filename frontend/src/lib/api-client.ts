import axios from "axios";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Always use the same host via Next.js / Nginx backend proxy
    return `${window.location.origin}/api/backend`;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    const url = process.env.NEXT_PUBLIC_API_URL;
    return url.endsWith("/api/backend") ? url : `${url}/api/backend`;
  }
  return "http://localhost:5050/api/v1";
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Guarantee correct baseURL in browser
    config.baseURL = `${window.location.origin}/api/backend`;
    const isPublicAuth = config.url?.includes("/auth/login") || config.url?.includes("/auth/register");
    const token = localStorage.getItem("udyogbill_token");
    if (token && !isPublicAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach Tenant Context headers for multitenancy & SuperAdmin impersonation
    try {
      const impStr = localStorage.getItem("udyogbill_impersonating");
      const userStr = localStorage.getItem("udyogbill_user");
      let activeTenantId: string | null = null;
      let activeTenantCode: string | null = null;

      if (impStr) {
        const imp = JSON.parse(impStr);
        activeTenantId = imp.tenantId || imp.id || null;
        activeTenantCode = imp.tenantCode || imp.code || null;
      }
      if (!activeTenantId && userStr) {
        const u = JSON.parse(userStr);
        activeTenantId = u.tenantId || null;
        activeTenantCode = u.tenantCode || null;
      }

      if (activeTenantId) {
        config.headers["X-Tenant-Id"] = activeTenantId;
      }
      if (activeTenantCode) {
        config.headers["X-Tenant-Code"] = activeTenantCode;
      }
    } catch {
      // Ignore JSON parse errors in localStorage
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const requestUrl = error.config?.url || "";
      // Never trigger full app logout from background sync or telemetry endpoints!
      if (
        requestUrl.includes("/tenant/sync") ||
        requestUrl.includes("/sync/") ||
        requestUrl.includes("/analytics") ||
        requestUrl.includes("/health")
      ) {
        return Promise.reject(error);
      }

      localStorage.removeItem("udyogbill_token");
      localStorage.removeItem("udyogbill_user");
      localStorage.removeItem("udyogbill_superadmin_token_backup");
      localStorage.removeItem("udyogbill_superadmin_user_backup");
      localStorage.removeItem("udyogbill_impersonating");
      localStorage.removeItem("udyog_access_token");
      localStorage.removeItem("udyog_refresh_token");
      localStorage.removeItem("udyog_user");

      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
