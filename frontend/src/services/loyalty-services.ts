import { apiClient } from "@/lib/api-client";

export interface LoyaltyConfig {
  id: string;
  pointsEarnSpendAmount: number;
  pointsEarnedPerUnit: number;
  pointRedemptionValue: number;
  minOrderAmountToEarn: number;
  maxRedeemPercentPerBill: number;
  signupBonusPoints: number;
  referrerBonusPoints: number;
  refereeBonusPoints: number;
  isActive: boolean;
}

export interface LoyaltyTransaction {
  id: string;
  transactionType: number;
  pointsChange: number;
  storeCreditChange: number;
  availablePointsAfter: number;
  storeCreditBalanceAfter: number;
  referenceInvoiceNumber?: string;
  description?: string;
  createdAtUtc: string;
}

export interface CustomerLoyaltyAccount {
  id: string;
  partyId: string;
  partyName: string;
  partyCode: string;
  primaryPhone?: string;
  availablePoints: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  storeCreditBalance: number;
  referralCode: string;
  referredByPartyId?: string;
  isActive: boolean;
  recentTransactions: LoyaltyTransaction[];
}

export interface PromotionalCoupon {
  id: string;
  code: string;
  description?: string;
  discountType: number; // 1: Percentage, 2: FlatAmount
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount?: number;
  validFromUtc: string;
  validUntilUtc?: string;
  totalUsageLimit: number;
  currentUsageCount: number;
  usageLimitPerCustomer: number;
  isActive: boolean;
}

export interface CreateCouponInput {
  code: string;
  description?: string;
  discountType: number;
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  validUntilUtc?: string;
  totalUsageLimit?: number;
  usageLimitPerCustomer?: number;
  isActive?: boolean;
}

export interface CouponValidationResult {
  isValid: boolean;
  errorMessage?: string;
  couponCode?: string;
  discountType?: number;
  discountAmount: number;
  finalCartAmount: number;
}

export interface LoyaltyRedemptionResult {
  pointsRedeemed: number;
  pointsDiscountAmount: number;
  storeCreditRedeemed: number;
  totalDiscountApplied: number;
  netPayableAmount: number;
  remainingPoints: number;
  remainingStoreCredit: number;
}

export const loyaltyService = {
  // Config
  async getConfig(): Promise<LoyaltyConfig> {
    const response = await apiClient.get<LoyaltyConfig>("/tenant/loyalty/config");
    return response.data;
  },

  async updateConfig(input: Partial<LoyaltyConfig>): Promise<LoyaltyConfig> {
    const response = await apiClient.put<LoyaltyConfig>("/tenant/loyalty/config", input);
    return response.data;
  },

  // Accounts
  async getAccounts(): Promise<CustomerLoyaltyAccount[]> {
    const response = await apiClient.get<CustomerLoyaltyAccount[]>("/tenant/loyalty/accounts");
    return response.data;
  },

  async getCustomerAccount(partyId: string): Promise<CustomerLoyaltyAccount> {
    const response = await apiClient.get<CustomerLoyaltyAccount>(`/tenant/loyalty/customer/${partyId}`);
    return response.data;
  },

  async addStoreCredit(partyId: string, input: { amount: number; notes?: string }): Promise<CustomerLoyaltyAccount> {
    const response = await apiClient.post<CustomerLoyaltyAccount>(`/tenant/loyalty/customer/${partyId}/add-credit`, input);
    return response.data;
  },

  async redeemAtCheckout(partyId: string, input: { orderTotalAmount: number; pointsToRedeem?: number; storeCreditToRedeem?: number }): Promise<LoyaltyRedemptionResult> {
    const response = await apiClient.post<LoyaltyRedemptionResult>(`/tenant/loyalty/customer/${partyId}/redeem`, input);
    return response.data;
  },

  // Coupons
  async getCoupons(): Promise<PromotionalCoupon[]> {
    const response = await apiClient.get<PromotionalCoupon[]>("/tenant/promotions/coupons");
    return response.data;
  },

  async createCoupon(input: CreateCouponInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/promotions/coupons", input);
    return response.data;
  },

  async validateCoupon(input: { couponCode: string; cartTotalAmount: number; partyId?: string }): Promise<CouponValidationResult> {
    const response = await apiClient.post<CouponValidationResult>("/tenant/promotions/coupons/validate", input);
    return response.data;
  },
};
