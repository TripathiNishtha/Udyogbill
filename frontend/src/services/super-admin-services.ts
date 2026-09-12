import { apiClient } from "@/lib/api-client";
import { ApiResponse, PagedResponse, Tenant, TenantDetails, Industry, Plan, AuditLog, PlatformStats } from "@/types";

export interface CreateIndustryInput {
  code: string;
  name: string;
  description: string;
  icon: string;
  displayOrder: number;
  defaultConfigJson?: string;
}

export interface UpdateIndustryInput {
  name: string;
  description: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  defaultConfigJson?: string;
}

export interface CreatePlanInput {
  code: string;
  name: string;
  description: string;
  billingCycle: number;
  price: number;
  setupFee: number;
  trialDays: number;
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  maxInvoicesPerMonth: number;
  maxStorageMb: number;
  isPopular: boolean;
  entitledFeatureIds: string[];
}

export interface UpdatePlanInput {
  name: string;
  description: string;
  billingCycle: number;
  price: number;
  setupFee: number;
  trialDays: number;
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  maxInvoicesPerMonth: number;
  maxStorageMb: number;
  isActive: boolean;
  isPopular: boolean;
  entitledFeatureIds: string[];
}

export interface PlatformCommercialConfig {
  id: string;
  coreAnnualPrice: number;
  coreBiennialPrice: number;
  includedUsers: number;
  singleUserAnnualPrice: number;
  fiveUserPackAnnualPrice: number;
  aiProAnnualPrice: number;
  aiProMonthlyScanLimit: number;
  gstRatePercent: number;
  isActive: boolean;
  updatedAtUtc?: string | null;
  lastUpdatedByEmail?: string | null;
  notes?: string | null;
  pharmaSfaAnnualBasePrice?: number;
  pharmaSfaMonthlyBasePrice?: number;
  mrSeatAnnualPrice?: number;
  mrSeatMonthlyPrice?: number;
  managerSeatAnnualPrice?: number;
  managerSeatMonthlyPrice?: number;
}

export interface UpdateCommercialConfigInput {
  coreAnnualPrice: number;
  coreBiennialPrice: number;
  singleUserAnnualPrice: number;
  fiveUserPackAnnualPrice: number;
  aiProAnnualPrice: number;
  aiProMonthlyQuota: number;
  defaultIncludedUsers: number;
  gstRatePercent: number;
  commercialNotes?: string;
  pharmaSfaAnnualBasePrice?: number;
  pharmaSfaMonthlyBasePrice?: number;
  mrSeatAnnualPrice?: number;
  mrSeatMonthlyPrice?: number;
  managerSeatAnnualPrice?: number;
  managerSeatMonthlyPrice?: number;
}

export const superAdminService = {
  // Platform Stats
  async getStats(): Promise<PlatformStats> {
    const res = await apiClient.get<any>("/superadmin/stats");
    return res.data?.data ?? res.data;
  },

  // Tenants Management
  async getTenants(params?: {
    pageNumber?: number;
    pageSize?: number;
    status?: number;
    industryId?: string;
    searchTerm?: string;
  }): Promise<PagedResponse<Tenant>> {
    const res = await apiClient.get<any>("/superadmin/tenants", { params });
    return res.data?.data ?? res.data;
  },

  async getTenantDetails(id: string): Promise<TenantDetails> {
    const res = await apiClient.get<any>(`/superadmin/tenants/${id}`);
    return res.data?.data ?? res.data;
  },

  async updateTenantStatus(id: string, status: number, reason?: string): Promise<void> {
    await apiClient.put(`/superadmin/tenants/${id}/status`, { status, reason });
  },

  async updateTenantSubscription(id: string, planId: string, status: number, endsAtUtc: string, autoRenew = true): Promise<void> {
    await apiClient.put(`/superadmin/tenants/${id}/subscription`, { planId, status, endsAtUtc, autoRenew });
  },

  async impersonateTenant(id: string): Promise<any> {
    const res = await apiClient.post<any>(`/superadmin/tenants/${id}/impersonate`);
    return res.data?.data ?? res.data;
  },

  async deleteTenant(id: string): Promise<void> {
    await apiClient.delete(`/superadmin/tenants/${id}`);
  },

  // Industry Catalog
  async createIndustry(data: CreateIndustryInput): Promise<string> {
    const res = await apiClient.post<any>("/superadmin/industries", data);
    return res.data?.data ?? res.data;
  },

  async updateIndustry(id: string, data: UpdateIndustryInput): Promise<void> {
    await apiClient.put(`/superadmin/industries/${id}`, data);
  },

  async deleteIndustry(id: string): Promise<void> {
    await apiClient.delete(`/superadmin/industries/${id}`);
  },

  // Plans & Entitlements
  async getPlans(): Promise<Plan[]> {
    const res = await apiClient.get<any>("/plans");
    return res.data?.data ?? res.data ?? [];
  },

  async createPlan(data: CreatePlanInput): Promise<string> {
    const res = await apiClient.post<any>("/superadmin/plans", data);
    return res.data?.data ?? res.data;
  },

  async updatePlan(id: string, data: UpdatePlanInput): Promise<void> {
    await apiClient.put(`/superadmin/plans/${id}`, data);
  },

  async deletePlan(id: string): Promise<void> {
    await apiClient.delete(`/superadmin/plans/${id}`);
  },

  // Canonical Commercial & Pricing Engine
  async getCommercialConfig(): Promise<PlatformCommercialConfig> {
    const res = await apiClient.get<any>("/superadmin/commercial/config");
    return res.data?.data ?? res.data;
  },

  async updateCommercialConfig(data: UpdateCommercialConfigInput): Promise<void> {
    await apiClient.put("/superadmin/commercial/config", data);
  },

  // Audit Logs
  async getAuditLogs(params?: {
    tenantId?: string;
    userId?: string;
    action?: number;
    entityName?: string;
    fromDate?: string;
    toDate?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<PagedResponse<AuditLog>> {
    const res = await apiClient.get<any>("/superadmin/audit", { params });
    return res.data?.data ?? res.data;
  },

  // Payment Gateway (Razorpay)
  async getGatewayConfig(): Promise<{
    provider: string;
    keyId: string;
    webhookSecret?: string;
    mode: string;
    isActive: boolean;
    hasSecret: boolean;
  }> {
    const res = await apiClient.get<any>("/superadmin/gateway");
    return res.data?.data ?? res.data;
  },

  async updateGatewayConfig(data: {
    keyId: string;
    keySecret: string;
    webhookSecret?: string;
    mode: string;
    isActive: boolean;
  }): Promise<void> {
    await apiClient.put("/superadmin/gateway", data);
  },

  // Add-on Catalog & Pricing
  async getAddons(): Promise<any[]> {
    try {
      const res = await apiClient.get<any>("/superadmin/addons");
      const list = res.data?.data ?? res.data;
      if (Array.isArray(list) && list.length > 0) return list;
    } catch (err) {
      console.warn("Could not fetch addons from backend, using defaults", err);
    }
    return [
      { id: "11111111-1111-1111-1111-111111111111", code: "ADDON_PHARMA", name: "Pharma & Healthcare Suite", description: "Generic Salt Substitutes, Multi-Batch FEFO, Schedule H1 registers, Strip/Loose packaging, Expiry dumping claims.", price: 499, annualPrice: 4990, billingCycle: "Monthly", isActive: true },
      { id: "66666666-6666-6666-6666-666666666666", code: "ADDON_PHARMA_SFA", name: "Pharma SFA & MR Field Force Suite", description: "Medical Representative Field Force, Daily Call Reports (DCR), Chemist POB, Doctor Detailing, Sample Bag & 3-Way Parity.", price: 1999, annualPrice: 19999, billingCycle: "Monthly", isActive: true },
      { id: "22222222-2222-2222-2222-222222222222", code: "ADDON_GARMENTS", name: "Apparel & Garments Matrix", description: "2D Size x Color SKU Matrix, variant generation, clothing hang-tag barcode studio.", price: 399, annualPrice: 3990, billingCycle: "Monthly", isActive: true },
      { id: "33333333-3333-3333-3333-333333333333", code: "ADDON_MANUFACTURING", name: "Manufacturing & Bakery (BOM)", description: "Recipe / Bill of Materials (BOM), raw materials auto-consumption, batch production runs & yield tracking.", price: 599, annualPrice: 5990, billingCycle: "Monthly", isActive: true },
      { id: "44444444-4444-4444-4444-444444444444", code: "ADDON_FMCG", name: "FMCG, Grocery & Distribution", description: "Multi-unit conversion (Case/Box/Pcs), free scheme discounts (10+1 free), auto re-order thresholds.", price: 399, annualPrice: 3990, billingCycle: "Monthly", isActive: true },
      { id: "55555555-5555-5555-5555-555555555555", code: "ADDON_ACCOUNTING", name: "Dual-Entry Financial Accounting", description: "Chart of Accounts (COA), Journal & Contra vouchers, Bank Reconciliation (BRS), and P&L / Balance Sheet.", price: 499, annualPrice: 4990, billingCycle: "Monthly", isActive: true }
    ];
  },

  async updateAddonPrice(code: string, data: { price: number; annualPrice?: number; isActive: boolean; description?: string }): Promise<void> {
    await apiClient.put(`/superadmin/addons/${code}`, data);
  },

  async manualGrantAddon(tenantId: string, data: { addonCode: string; durationDays: number; reason?: string }): Promise<any> {
    const res = await apiClient.post<any>(`/superadmin/tenants/${tenantId}/addons/grant`, data);
    return res.data?.data ?? res.data;
  },

  async manualRevokeAddon(tenantId: string, data: { addonCode: string; reason?: string }): Promise<void> {
    await apiClient.post(`/superadmin/tenants/${tenantId}/addons/revoke`, data);
  },

  // Platform Company Profile
  async getCompanyProfile(): Promise<any> {
    const res = await apiClient.get<any>("/superadmin/company-profile");
    return res.data?.data ?? res.data;
  },

  async updateCompanyProfile(data: any): Promise<void> {
    await apiClient.put("/superadmin/company-profile", data);
  },

  async testSandboxGst(data: { apiKey?: string; apiSecret?: string; testGstin?: string }): Promise<any> {
    const res = await apiClient.post<any>("/superadmin/company-profile/test-sandbox-gst", data);
    return res.data?.data ?? res.data;
  },

  // Email & SMTP Configuration
  async getEmailConfig(): Promise<{
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    fromEmail: string;
    fromName: string;
    replyToEmail?: string;
    enableSsl: boolean;
    isActive: boolean;
    hasPassword: boolean;
  }> {
    const res = await apiClient.get<any>("/superadmin/email-config");
    return res.data?.data ?? res.data;
  },

  async updateEmailConfig(data: any): Promise<void> {
    await apiClient.put("/superadmin/email-config", data);
  },

  async sendTestEmail(recipientEmail: string): Promise<void> {
    await apiClient.post("/superadmin/email-config/test", { recipientEmail });
  },

  // Bulk Broadcast Mailer
  async broadcastEmail(data: {
    subject: string;
    bodyHtml: string;
    targetPlanCode?: string;
    targetAddonCode?: string;
  }): Promise<{ totalTargeted: number; successfullySent: number; failedCount: number }> {
    const res = await apiClient.post<any>("/superadmin/broadcast-email", data);
    return res.data?.data ?? res.data;
  },

  // Organic Leads CRM
  async getLeads(params?: {
    page?: number;
    pageSize?: number;
    industry?: string;
    conversionStage?: string;
    search?: string;
  }): Promise<any> {
    const res = await apiClient.get<any>("/superadmin/leads", { params });
    return res.data;
  },

  async updateLeadStatus(id: string, data: {
    conversionStage?: string;
    paidAmount?: number | null;
    notes?: string;
    industryCode?: string;
    status?: string;
  }): Promise<any> {
    const res = await apiClient.patch<any>(`/superadmin/leads/${id}/status`, data);
    return res.data;
  },

  async deleteLead(id: string): Promise<any> {
    const res = await apiClient.delete<any>(`/superadmin/leads/${id}`);
    return res.data;
  },

  // Growth Command Center
  async getGrowthOverview(from?: string, to?: string): Promise<any> {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await apiClient.get<any>("/superadmin/growth/overview", { params });
    return res.data;
  },

  async getGrowthCitiesPerformance(from?: string, to?: string): Promise<any> {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await apiClient.get<any>("/superadmin/growth/cities-performance", { params });
    return res.data;
  },

  async getGrowthContentPerformance(from?: string, to?: string): Promise<any> {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await apiClient.get<any>("/superadmin/growth/content-performance", { params });
    return res.data;
  },

  // Mobile App Control Center
  async getMobileAppConfig(): Promise<any> {
    const res = await apiClient.get<any>("/superadmin/mobile-app/config");
    return res.data;
  },

  async saveMobileAppConfig(data: any): Promise<any> {
    const res = await apiClient.post<any>("/superadmin/mobile-app/config", data);
    return res.data;
  },

  async sendMobilePush(data: {
    title: string;
    message: string;
    imageUrl?: string;
    actionRoute?: string;
    targetSegment?: string;
  }): Promise<any> {
    const res = await apiClient.post<any>("/superadmin/mobile-app/push/send", data);
    return res.data;
  },

  async getMobilePushHistory(): Promise<any> {
    const res = await apiClient.get<any>("/superadmin/mobile-app/push/history");
    return res.data;
  },

  async getMobileDevices(): Promise<any> {
    const res = await apiClient.get<any>("/superadmin/mobile-app/devices");
    return res.data;
  },
};
