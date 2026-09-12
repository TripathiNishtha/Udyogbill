import { apiClient } from "@/lib/api-client";

export interface ReferralProgramConfigDto {
  isEnabled: boolean;
  rewardType: number; // 1 = FixedAmount, 2 = Percentage
  defaultRewardAmount: number;
  payoutScheduleDays: number;
  minimumPayoutThreshold: number;
  termsAndConditions: string;
  updatedAtUtc?: string | null;
}

export interface TenantReferralItemDto {
  id: string;
  refereeStoreName: string;
  refereeStoreCode: string;
  registrationDateUtc: string;
  status: string;
  paidDateUtc?: string | null;
  commissionAmount: number;
  scheduledPayoutDateUtc?: string | null;
  paidAtUtc?: string | null;
  payoutReference?: string | null;
}

export interface TenantReferralSummaryDto {
  referralCode: string;
  referralLink: string;
  rewardAmount: number;
  totalReferralsCount: number;
  paidConversionsCount: number;
  totalEarnedAmount: number;
  totalPaidOutAmount: number;
  pendingBalanceAmount: number;
  upiId?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  accountHolderName?: string | null;
  referrals: TenantReferralItemDto[];
  hasActiveSubscription?: boolean;
  ineligibilityReason?: string | null;
}

export interface UpdateReferralPayoutSettingsRequest {
  upiId?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  accountHolderName?: string;
}

export interface SuperAdminTopReferrerDto {
  tenantId: string;
  storeName: string;
  storeCode: string;
  referralCode: string;
  adminEmail: string;
  primaryPhone: string;
  upiId?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  totalReferrals: number;
  paidConversions: number;
  totalEarned: number;
  totalPaid: number;
  pendingBalance: number;
}

export interface SuperAdminReferralConversionDto {
  id: string;
  referrerTenantId: string;
  referrerStoreName: string;
  referrerStoreCode: string;
  referrerUpi?: string | null;
  referrerBank?: string | null;
  refereeTenantId: string;
  refereeStoreName: string;
  refereeStoreCode: string;
  referralCodeUsed: string;
  registrationDateUtc: string;
  status: number;
  statusName: string;
  firstPaidDateUtc?: string | null;
  subscriptionAmount?: number | null;
  commissionRewardAmount: number;
  scheduledPayoutDateUtc?: string | null;
  paidAtUtc?: string | null;
  payoutReference?: string | null;
  payoutMode?: string | null;
}

export interface SuperAdminReferralAnalyticsDto {
  totalReferralsRegistered: number;
  totalPaidConversions: number;
  totalCommissionsAccrued: number;
  totalCommissionsPaidOut: number;
  pendingPayoutsAmount: number;
  topReferrers: SuperAdminTopReferrerDto[];
  conversions: SuperAdminReferralConversionDto[];
}

export interface UpdateReferralProgramConfigRequest {
  isEnabled: boolean;
  rewardType: number;
  defaultRewardAmount: number;
  payoutScheduleDays: number;
  minimumPayoutThreshold: number;
  termsAndConditions?: string;
}

export interface ProcessReferralPayoutRequest {
  payoutMode: string;
  payoutReference: string;
  adminNotes?: string;
}

export const referralService = {
  // Tenant Portal APIs
  getTenantSummary: async (): Promise<TenantReferralSummaryDto> => {
    const res = await apiClient.get('/tenant/referral/summary');
    return res.data?.data || res.data;
  },

  updatePayoutSettings: async (req: UpdateReferralPayoutSettingsRequest): Promise<void> => {
    await apiClient.put('/tenant/referral/payout-settings', req);
  },

  // SuperAdmin APIs
  getAdminConfig: async (): Promise<ReferralProgramConfigDto> => {
    const res = await apiClient.get('/superadmin/referrals/config');
    return res.data?.data || res.data;
  },

  updateAdminConfig: async (req: UpdateReferralProgramConfigRequest): Promise<ReferralProgramConfigDto> => {
    const res = await apiClient.put('/superadmin/referrals/config', req);
    return res.data?.data || res.data;
  },

  getAdminAnalytics: async (): Promise<SuperAdminReferralAnalyticsDto> => {
    const res = await apiClient.get('/superadmin/referrals/analytics');
    return res.data?.data || res.data;
  },

  processPayout: async (conversionId: string, req: ProcessReferralPayoutRequest): Promise<void> => {
    await apiClient.post(`/superadmin/referrals/conversions/${conversionId}/payout`, req);
  },
};
