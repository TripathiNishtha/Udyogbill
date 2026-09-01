import { apiClient } from "@/lib/api-client";
import { AuthResponse, Industry, TenantDetails, Plan } from "@/types";

export const authService = {
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/login", credentials);
    if (response.data.accessToken) {
      localStorage.setItem("udyogbill_token", response.data.accessToken);
      localStorage.setItem("udyogbill_user", JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async registerTenant(data: {
    businessName: string;
    tradeName?: string;
    adminFullName: string;
    adminEmail: string;
    adminPassword: string;
    primaryPhone: string;
    industryId: string;
    gstin?: string;
  }): Promise<string> {
    const response = await apiClient.post<string>("/auth/register", data);
    return response.data;
  },

  logout(): void {
    localStorage.removeItem("udyogbill_token");
    localStorage.removeItem("udyogbill_user");
    window.location.href = "/login";
  },

  getCurrentUser(): AuthResponse["user"] | null {
    if (typeof window === "undefined") return null;
    const userJson = localStorage.getItem("udyogbill_user");
    return userJson ? JSON.parse(userJson) : null;
  }
};

export const tenantService = {
  async getCurrentTenant(): Promise<TenantDetails> {
    const response = await apiClient.get<TenantDetails>("/tenants/current");
    return response.data;
  },

  async getAllTenants(page = 1, pageSize = 20): Promise<{ items: any[]; totalCount: number }> {
    const response = await apiClient.get(`/tenants?pageNumber=${page}&pageSize=${pageSize}`);
    return response.data;
  }
};

export const industryService = {
  async getIndustries(): Promise<Industry[]> {
    const response = await apiClient.get<Industry[]>("/industries");
    return response.data;
  },

  async getIndustryCapabilityMatrix(industryId: string) {
    const response = await apiClient.get(`/industries/matrix/${industryId}`);
    return response.data;
  }
};

export const planService = {
  async getPlans(): Promise<Plan[]> {
    const response = await apiClient.get<Plan[]>("/plans");
    return response.data;
  }
};

// Aliases for compatibility
export const catalogService = industryService;
export const subscriptionService = planService;
