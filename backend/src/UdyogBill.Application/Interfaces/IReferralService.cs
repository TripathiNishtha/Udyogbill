using System;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IReferralService
{
    // SuperAdmin Config
    Task<Result<ReferralProgramConfigDto>> GetReferralConfigAsync(CancellationToken cancellationToken = default);
    Task<Result<ReferralProgramConfigDto>> UpdateReferralConfigAsync(UpdateReferralProgramConfigRequest request, CancellationToken cancellationToken = default);

    // Tenant Referral
    Task<Result<TenantReferralSummaryDto>> GetTenantReferralSummaryAsync(Guid tenantId, string? baseUrl = null, CancellationToken cancellationToken = default);
    Task<Result<bool>> UpdateTenantPayoutSettingsAsync(Guid tenantId, UpdateReferralPayoutSettingsRequest request, CancellationToken cancellationToken = default);

    // Lifecycle Triggers
    Task<Result<bool>> RecordTenantRegistrationReferralAsync(Guid refereeTenantId, string referralCode, CancellationToken cancellationToken = default);
    Task<Result<bool>> ProcessSubscriptionPaidReferralTriggerAsync(Guid refereeTenantId, Guid invoiceId, decimal paidAmount, CancellationToken cancellationToken = default);

    // SuperAdmin Analytics & Payout
    Task<Result<SuperAdminReferralAnalyticsDto>> GetSuperAdminReferralAnalyticsAsync(CancellationToken cancellationToken = default);
    Task<Result<bool>> ProcessPayoutAsync(Guid conversionId, ProcessReferralPayoutRequest request, CancellationToken cancellationToken = default);
}
