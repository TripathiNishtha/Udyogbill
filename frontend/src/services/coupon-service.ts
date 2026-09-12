import { apiClient } from "@/lib/api-client";

export interface PlatformCoupon {
  id: string;
  code: string;
  description: string;
  discountType: 1 | 2; // 1 = Percentage, 2 = FixedAmount
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  applicableType: 1 | 2 | 3;
  maxRedemptions?: number | null;
  timesRedeemed: number;
  validFromUtc?: string | null;
  validUntilUtc?: string | null;
  isActive: boolean;
  createdAtUtc: string;
}

export interface CreateCouponRequest {
  code: string;
  description: string;
  discountType: 1 | 2;
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  applicableType?: 1 | 2 | 3;
  maxRedemptions?: number | null;
  validFromUtc?: string | null;
  validUntilUtc?: string | null;
}

export interface ValidateCouponResponse {
  isValid: boolean;
  discountAmount: number;
  finalAmount: number;
  message: string;
  couponCode?: string | null;
}

export const platformCouponService = {
  async getAllCoupons(): Promise<PlatformCoupon[]> {
    const res = await apiClient.get<any>("/superadmin/coupons");
    return res.data?.data ?? res.data ?? [];
  },

  async createCoupon(data: CreateCouponRequest): Promise<string> {
    const res = await apiClient.post<any>("/superadmin/coupons", data);
    return res.data?.data ?? res.data;
  },

  async updateCoupon(id: string, data: any): Promise<void> {
    await apiClient.put(`/superadmin/coupons/${id}`, data);
  },

  async deleteCoupon(id: string): Promise<void> {
    await apiClient.delete(`/superadmin/coupons/${id}`);
  },

  async validateCoupon(code: string, orderType: string, orderAmount: number): Promise<ValidateCouponResponse> {
    const res = await apiClient.post<any>("/coupons/validate", {
      code,
      orderType,
      orderAmount,
    });
    return res.data?.data ?? res.data;
  },

  async assignPackageAndAddons(
    tenantId: string,
    data: {
      planId: string;
      planDurationDays: number;
      addons?: { addonCode: string; durationDays: number }[];
      reason?: string;
      notes?: string;
      customAmount?: number | null;
      isGstInclusive?: boolean;
      paymentMode?: string;
      paymentReference?: string;
      generateInvoice?: boolean;
    }
  ): Promise<void> {
    const payload = {
      ...data,
      reason: data.reason || data.notes || "Assigned by Super Admin",
    };
    await apiClient.post(`/superadmin/tenants/${tenantId}/assign-package-addons`, payload);
  },

  async extendTenantTrial(
    tenantId: string,
    data: { extensionDays: number; reason?: string }
  ): Promise<void> {
    await apiClient.post(`/superadmin/tenants/${tenantId}/extend-trial`, data);
  },
};
