import { apiClient } from "@/lib/api-client";
import { TenantDetails, TenantQuotaSummary } from "@/types";

export interface BranchDetails {
  id: string;
  tenantId: string;
  branchCode: string;
  branchName: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  isHeadOffice: boolean;
  isActive: boolean;
  createdAtUtc: string;
  warehouses: WarehouseDetails[];
}

export interface WarehouseDetails {
  id: string;
  tenantId: string;
  branchId: string;
  branchName: string;
  warehouseCode: string;
  warehouseName: string;
  location?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAtUtc: string;
}

export interface StaffUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  designation?: string;
  isTenantAdmin: boolean;
  isActive: boolean;
  lastLoginAtUtc?: string;
  createdAtUtc: string;
  roles: Role[];
  assignedPermissions: string[];
}

export interface Role {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  isActive: boolean;
  permissionCodes: string[];
}

export interface PermissionGroup {
  moduleCode: string;
  moduleName: string;
  permissions: {
    id: string;
    code: string;
    name: string;
    description: string;
    moduleCode: string;
    moduleName: string;
  }[];
}

export interface CreateBranchInput {
  branchCode: string;
  branchName: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  isHeadOffice: boolean;
}

export interface CreateWarehouseInput {
  branchId: string;
  warehouseCode: string;
  warehouseName: string;
  location?: string;
  isDefault: boolean;
}

export interface CreateStaffUserInput {
  email: string;
  fullName: string;
  password: string;
  phoneNumber?: string;
  designation?: string;
  roleIds?: string[];
}

export interface UpdateBusinessProfileInput {
  businessName: string;
  tradeName: string;
  primaryPhone: string;
  gstin?: string;
  pan?: string;
  drugLicenseNumber?: string;
  fssaiNumber?: string;
  timeZone: string;
  currencyCode: string;
  logoUrl?: string;
  upiId?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;

  // Complete Registered Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  email?: string;
  website?: string;

  // Outgoing Mail / SMTP Server Configuration
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
  smtpEnableSsl?: boolean;
}

export interface UpdateTenantIndustryConfigInput {
  enableBatchTracking: boolean;
  enableExpiryTracking: boolean;
  enableSerialTracking: boolean;
  enableMultiUnitConversion: boolean;
  enableSizeColorMatrix: boolean;
  enableRecipeBOM: boolean;
  enableScheduleH1DrugTracking: boolean;
  enableEWayBill: boolean;
  enableEInvoicing: boolean;
  configurationJson?: string;
}

export const tenantAppService = {
  // Branches
  async getBranches(): Promise<BranchDetails[]> {
    const response = await apiClient.get<BranchDetails[]>("/tenant/branches");
    return response.data;
  },

  async createBranch(input: CreateBranchInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/branches", input);
    return response.data;
  },

  async updateBranch(id: string, input: Partial<CreateBranchInput> & { isActive?: boolean }): Promise<void> {
    await apiClient.put(`/tenant/branches/${id}`, input);
  },

  async deleteBranch(id: string): Promise<void> {
    await apiClient.delete(`/tenant/branches/${id}`);
  },

  // Warehouses
  async getWarehouses(branchId?: string): Promise<WarehouseDetails[]> {
    const url = branchId ? `/tenant/warehouses?branchId=${branchId}` : "/tenant/warehouses";
    const response = await apiClient.get<WarehouseDetails[]>(url);
    return response.data;
  },

  async createWarehouse(input: CreateWarehouseInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/warehouses", input);
    return response.data;
  },

  async updateWarehouse(id: string, input: Partial<CreateWarehouseInput> & { isActive?: boolean }): Promise<void> {
    await apiClient.put(`/tenant/warehouses/${id}`, input);
  },

  async deleteWarehouse(id: string): Promise<void> {
    await apiClient.delete(`/tenant/warehouses/${id}`);
  },

  // Staff & RBAC
  async getStaffUsers(params?: { pageNumber?: number; pageSize?: number; searchTerm?: string }): Promise<{ items: StaffUser[]; totalCount: number }> {
    const response = await apiClient.get("/tenant/staff", { params });
    return response.data;
  },

  async createStaffUser(input: CreateStaffUserInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/staff", input);
    return response.data;
  },

  async updateStaffUser(id: string, input: { fullName: string; phoneNumber?: string; designation?: string; isActive: boolean }): Promise<void> {
    await apiClient.put(`/tenant/staff/${id}`, input);
  },

  async assignUserRoles(id: string, roleIds: string[]): Promise<void> {
    await apiClient.put(`/tenant/staff/${id}/roles`, { roleIds });
  },

  async updateUserPermissions(id: string, grantedPermissionIds: string[], revokedPermissionIds: string[]): Promise<void> {
    await apiClient.put(`/tenant/staff/${id}/permissions`, { grantedPermissionIds, revokedPermissionIds });
  },

  async deleteStaffUser(id: string): Promise<void> {
    await apiClient.delete(`/tenant/staff/${id}`);
  },

  async updateMyProfile(input: { fullName: string; phoneNumber?: string; currentPassword?: string; newPassword?: string }): Promise<void> {
    await apiClient.put("/tenant/staff/my-profile", input);
  },

  async getRoles(): Promise<Role[]> {
    const response = await apiClient.get<Role[]>("/tenant/staff/roles");
    return response.data;
  },

  async createRole(input: { code: string; name: string; description: string; permissionIds: string[] }): Promise<string> {
    const response = await apiClient.post<string>("/tenant/staff/roles", input);
    return response.data;
  },

  async updateRole(id: string, input: { name: string; description: string; permissionIds: string[]; isActive: boolean }): Promise<void> {
    await apiClient.put(`/tenant/staff/roles/${id}`, input);
  },

  async deleteRole(id: string): Promise<void> {
    await apiClient.delete(`/tenant/staff/roles/${id}`);
  },

  async getAvailablePermissions(): Promise<PermissionGroup[]> {
    const response = await apiClient.get<PermissionGroup[]>("/tenant/staff/permissions");
    return response.data;
  },

  // Settings & Quotas
  async getBusinessProfile(): Promise<TenantDetails> {
    const response = await apiClient.get<TenantDetails>("/tenant/settings/profile");
    return response.data;
  },

  async updateBusinessProfile(input: UpdateBusinessProfileInput): Promise<void> {
    await apiClient.put("/tenant/settings/profile", input);
  },

  async sendTestEmail(input: { recipientEmail: string; subject?: string; message?: string }): Promise<boolean> {
    const response = await apiClient.post<boolean>("/tenant/settings/profile/test-email", input);
    return response.data;
  },

  async getIndustryConfig(): Promise<any> {
    const response = await apiClient.get("/tenant/settings/industry-config");
    return response.data;
  },

  async updateIndustryConfig(input: UpdateTenantIndustryConfigInput): Promise<void> {
    await apiClient.put("/tenant/settings/industry-config", input);
  },

  async getQuotaSummary(): Promise<TenantQuotaSummary> {
    const response = await apiClient.get<TenantQuotaSummary>("/tenant/settings/quotas");
    return response.data;
  },

  // Subscription, Add-on Purchasing & Invoicing
  async getSubscriptionStatus(): Promise<any> {
    const response = await apiClient.get<any>("/tenant/subscription/status");
    return response.data?.data ?? response.data;
  },

  async createSubscriptionOrder(input: { planCode?: string; addonCode?: string; billingCycle?: string }): Promise<any> {
    const response = await apiClient.post<any>("/tenant/subscription/create-order", input);
    return response.data?.data ?? response.data;
  },

  async confirmSubscriptionPayment(input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    planCode?: string;
    addonCode?: string;
    billingCycle?: string;
  }): Promise<any> {
    const response = await apiClient.post<any>("/tenant/subscription/confirm-payment", input);
    return response.data?.data ?? response.data;
  },

  async getSubscriptionInvoices(): Promise<any[]> {
    const response = await apiClient.get<any>("/tenant/subscription/invoices");
    return response.data?.data ?? response.data;
  },

  async getSubscriptionInvoiceById(id: string): Promise<any> {
    const response = await apiClient.get<any>(`/tenant/subscription/invoices/${id}`);
    return response.data?.data ?? response.data;
  },
};
