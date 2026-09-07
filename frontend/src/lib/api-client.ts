import axios from "axios";

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    // In browser / mobile WebView: use the same host via Next.js backend proxy
    // This works seamlessly whether running on localhost, 192.168.x.x Wi-Fi, or public cloud!
    return `${window.location.origin}/api/backend`;
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
    // Dynamically update baseURL in case origin changed
    if (!config.baseURL || config.baseURL.includes("localhost:5050")) {
      config.baseURL = `${window.location.origin}/api/backend`;
    }
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
      localStorage.removeItem("udyogbill_token");
      localStorage.removeItem("udyogbill_user");
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
