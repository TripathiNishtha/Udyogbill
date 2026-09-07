using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Referrals;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class ReferralService : IReferralService
{
    private readonly IAppDbContext _context;
    private readonly ILogger<ReferralService> _logger;

    public ReferralService(IAppDbContext context, ILogger<ReferralService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<ReferralProgramConfigDto>> GetReferralConfigAsync(CancellationToken cancellationToken = default)
    {
        var config = await _context.ReferralProgramConfigs
            .Where(c => !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (config == null)
        {
            config = new ReferralProgramConfig
            {
                IsEnabled = true,
                RewardType = ReferralRewardType.FixedAmount,
                DefaultRewardAmount = 500m,
                PayoutScheduleDays = 1,
                MinimumPayoutThreshold = 500m,
                TermsAndConditions = "Referral commission is credited and scheduled for next-day payout upon paid subscription purchase."
            };
            _context.Add(config);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Result<ReferralProgramConfigDto>.Success(new ReferralProgramConfigDto(
            config.IsEnabled,
            (int)config.RewardType,
            config.DefaultRewardAmount,
            config.PayoutScheduleDays,
            config.MinimumPayoutThreshold,
            config.TermsAndConditions,
            config.UpdatedAtUtc ?? config.CreatedAtUtc
        ));
    }

    public async Task<Result<ReferralProgramConfigDto>> UpdateReferralConfigAsync(UpdateReferralProgramConfigRequest request, CancellationToken cancellationToken = default)
    {
        var config = await _context.ReferralProgramConfigs
            .Where(c => !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (config == null)
        {
            config = new ReferralProgramConfig();
            _context.Add(config);
        }

        config.IsEnabled = request.IsEnabled;
        config.RewardType = (ReferralRewardType)request.RewardType;
        config.DefaultRewardAmount = request.DefaultRewardAmount > 0 ? request.DefaultRewardAmount : 500m;
        config.PayoutScheduleDays = request.PayoutScheduleDays > 0 ? request.PayoutScheduleDays : 1;
        config.MinimumPayoutThreshold = request.MinimumPayoutThreshold;
        if (!string.IsNullOrWhiteSpace(request.TermsAndConditions))
        {
            config.TermsAndConditions = request.TermsAndConditions.Trim();
        }
        config.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return await GetReferralConfigAsync(cancellationToken);
    }

    public async Task<Result<TenantReferralSummaryDto>> GetTenantReferralSummaryAsync(Guid tenantId, string? baseUrl = null, CancellationToken cancellationToken = default)
    {
        var profile = await EnsureTenantProfileAsync(tenantId, cancellationToken);
        var configRes = await GetReferralConfigAsync(cancellationToken);
        decimal effectiveReward = profile.CustomRewardAmount ?? (configRes.Data?.DefaultRewardAmount ?? 500m);

        string cleanBaseUrl = (baseUrl ?? "http://localhost:3000").TrimEnd('/');
        string referralLink = $"{cleanBaseUrl}/register?ref={profile.ReferralCode}";

        var conversions = await _context.TenantReferralConversions
            .Include(c => c.RefereeTenant)
            .Where(c => c.ReferrerTenantId == tenantId && !c.IsDeleted)
            .OrderByDescending(c => c.RegistrationDateUtc)
            .ToListAsync(cancellationToken);

        var referralItems = conversions.Select(c => new TenantReferralItemDto(
            c.Id,
            c.RefereeTenant?.BusinessName ?? "Registered Partner Store",
            c.RefereeTenant?.Code ?? "STORE",
            c.RegistrationDateUtc,
            c.Status.ToString(),
            c.FirstPaidDateUtc,
            c.CommissionRewardAmount,
            c.ScheduledPayoutDateUtc,
            c.PaidAtUtc,
            c.PayoutReference
        )).ToList();

        var summary = new TenantReferralSummaryDto(
            profile.ReferralCode,
            referralLink,
            effectiveReward,
            profile.TotalReferralsCount,
            profile.PaidConversionsCount,
            profile.TotalEarnedAmount,
            profile.TotalPaidOutAmount,
            profile.PendingBalanceAmount,
            profile.UpiId,
            profile.BankName,
            profile.BankAccountNumber,
            profile.BankIfsc,
            profile.AccountHolderName,
            referralItems
        );

        return Result<TenantReferralSummaryDto>.Success(summary);
    }

    public async Task<Result<bool>> UpdateTenantPayoutSettingsAsync(Guid tenantId, UpdateReferralPayoutSettingsRequest request, CancellationToken cancellationToken = default)
    {
        var profile = await EnsureTenantProfileAsync(tenantId, cancellationToken);

        profile.UpiId = request.UpiId?.Trim();
        profile.BankName = request.BankName?.Trim();
        profile.BankAccountNumber = request.BankAccountNumber?.Trim();
        profile.BankIfsc = request.BankIfsc?.Trim()?.ToUpperInvariant();
        profile.AccountHolderName = request.AccountHolderName?.Trim();
        profile.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> RecordTenantRegistrationReferralAsync(Guid refereeTenantId, string referralCode, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(referralCode))
            return Result<bool>.Success(false);

        string normalizedCode = referralCode.Trim().ToUpperInvariant();
        var referrerProfile = await _context.TenantReferralProfiles
            .FirstOrDefaultAsync(p => p.ReferralCode.ToUpper() == normalizedCode && !p.IsDeleted, cancellationToken);

        if (referrerProfile == null || referrerProfile.TenantId == refereeTenantId)
        {
            _logger.LogInformation("Invalid or self referral code: {Code}", referralCode);
            return Result<bool>.Success(false);
        }

        bool alreadyRecorded = await _context.TenantReferralConversions
            .AnyAsync(c => c.RefereeTenantId == refereeTenantId && !c.IsDeleted, cancellationToken);

        if (alreadyRecorded)
            return Result<bool>.Success(true);

        var conversion = new TenantReferralConversion
        {
            ReferrerTenantId = referrerProfile.TenantId,
            RefereeTenantId = refereeTenantId,
            ReferralCodeUsed = referrerProfile.ReferralCode,
            RegistrationDateUtc = DateTimeOffset.UtcNow,
            Status = ReferralConversionStatus.Registered,
            CommissionRewardAmount = 0m
        };

        _context.Add(conversion);

        referrerProfile.TotalReferralsCount++;
        referrerProfile.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Recorded referral for new tenant {Referee} by referrer {Referrer}", refereeTenantId, referrerProfile.TenantId);

        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> ProcessSubscriptionPaidReferralTriggerAsync(Guid refereeTenantId, Guid invoiceId, decimal paidAmount, CancellationToken cancellationToken = default)
    {
        var conversion = await _context.TenantReferralConversions
            .FirstOrDefaultAsync(c => c.RefereeTenantId == refereeTenantId && !c.IsDeleted, cancellationToken);

        if (conversion == null)
            return Result<bool>.Success(false); // Not a referred tenant

        // Only credit on the FIRST paid subscription conversion
        if (conversion.Status != ReferralConversionStatus.Registered)
            return Result<bool>.Success(true);

        var configRes = await GetReferralConfigAsync(cancellationToken);
        var config = configRes.Data;
        if (config != null && !config.IsEnabled)
            return Result<bool>.Success(false); // Program disabled

        var referrerProfile = await EnsureTenantProfileAsync(conversion.ReferrerTenantId, cancellationToken);

        // Calculate commission: Fixed or Percentage
        decimal commission = 500m;
        if (referrerProfile.CustomRewardAmount.HasValue && referrerProfile.CustomRewardAmount.Value > 0)
        {
            commission = referrerProfile.CustomRewardAmount.Value;
        }
        else if (config != null)
        {
            if (config.RewardType == 2) // Percentage
            {
                commission = Math.Round(paidAmount * (config.DefaultRewardAmount / 100m), 2);
            }
            else
            {
                commission = config.DefaultRewardAmount;
            }
        }

        conversion.Status = ReferralConversionStatus.ConvertedPaid;
        conversion.FirstPaidDateUtc = DateTimeOffset.UtcNow;
        conversion.SubscriptionInvoiceId = invoiceId;
        conversion.SubscriptionAmount = paidAmount;
        conversion.CommissionRewardAmount = commission;
        // Scheduled payout is NEXT DAY
        int scheduleDays = config?.PayoutScheduleDays ?? 1;
        conversion.ScheduledPayoutDateUtc = DateTimeOffset.UtcNow.AddDays(scheduleDays);
        conversion.UpdatedAtUtc = DateTimeOffset.UtcNow;

        referrerProfile.PaidConversionsCount++;
        referrerProfile.TotalEarnedAmount += commission;
        referrerProfile.PendingBalanceAmount += commission;
        referrerProfile.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Referral conversion rewarded! Referrer {Referrer} earned {Commission} from referee {Referee}", conversion.ReferrerTenantId, commission, refereeTenantId);

        return Result<bool>.Success(true);
    }

    public async Task<Result<SuperAdminReferralAnalyticsDto>> GetSuperAdminReferralAnalyticsAsync(CancellationToken cancellationToken = default)
    {
        var allConversions = await _context.TenantReferralConversions
            .Include(c => c.ReferrerTenant)
            .Include(c => c.RefereeTenant)
            .Where(c => !c.IsDeleted)
            .OrderByDescending(c => c.RegistrationDateUtc)
            .ToListAsync(cancellationToken);

        var allProfiles = await _context.TenantReferralProfiles
            .Include(p => p.Tenant)
            .Where(p => !p.IsDeleted)
            .ToListAsync(cancellationToken);

        int totalRegistered = allConversions.Count;
        int totalPaid = allConversions.Count(c => c.Status == ReferralConversionStatus.ConvertedPaid || c.Status == ReferralConversionStatus.PayoutDue || c.Status == ReferralConversionStatus.Paid);
        decimal totalAccrued = allProfiles.Sum(p => p.TotalEarnedAmount);
        decimal totalPaidOut = allProfiles.Sum(p => p.TotalPaidOutAmount);
        decimal pendingBalance = allProfiles.Sum(p => p.PendingBalanceAmount);

        var topReferrers = allProfiles
            .OrderByDescending(p => p.TotalEarnedAmount)
            .ThenByDescending(p => p.TotalReferralsCount)
            .Select(p => new SuperAdminTopReferrerDto(
                p.TenantId,
                p.Tenant?.BusinessName ?? "Partner Store",
                p.Tenant?.Code ?? "STORE",
                p.ReferralCode,
                p.Tenant?.AdminEmail ?? "-",
                p.Tenant?.PrimaryPhone ?? "-",
                p.UpiId,
                p.BankAccountNumber,
                p.BankIfsc,
                p.TotalReferralsCount,
                p.PaidConversionsCount,
                p.TotalEarnedAmount,
                p.TotalPaidOutAmount,
                p.PendingBalanceAmount
            )).ToList();

        var conversionDtos = allConversions.Select(c => {
            var prof = allProfiles.FirstOrDefault(p => p.TenantId == c.ReferrerTenantId);
            string statusName = c.Status switch
            {
                ReferralConversionStatus.Registered => "Registered (Trial)",
                ReferralConversionStatus.ConvertedPaid => "Paid (Next-Day Due)",
                ReferralConversionStatus.PayoutDue => "Payout Processing",
                ReferralConversionStatus.Paid => "Paid (Completed)",
                ReferralConversionStatus.Rejected => "Rejected",
                _ => "Unknown"
            };

            return new SuperAdminReferralConversionDto(
                c.Id,
                c.ReferrerTenantId,
                c.ReferrerTenant?.BusinessName ?? "Referrer Store",
                c.ReferrerTenant?.Code ?? "STORE",
                prof?.UpiId,
                prof != null && !string.IsNullOrEmpty(prof.BankAccountNumber) ? $"{prof.BankName} - {prof.BankAccountNumber} ({prof.BankIfsc})" : null,
                c.RefereeTenantId,
                c.RefereeTenant?.BusinessName ?? "Referred Store",
                c.RefereeTenant?.Code ?? "STORE",
                c.ReferralCodeUsed,
                c.RegistrationDateUtc,
                (int)c.Status,
                statusName,
                c.FirstPaidDateUtc,
                c.SubscriptionAmount,
                c.CommissionRewardAmount,
                c.ScheduledPayoutDateUtc,
                c.PaidAtUtc,
                c.PayoutReference,
                c.PayoutMode
            );
        }).ToList();

        var result = new SuperAdminReferralAnalyticsDto(
            totalRegistered,
            totalPaid,
            totalAccrued,
            totalPaidOut,
            pendingBalance,
            topReferrers,
            conversionDtos
        );

        return Result<SuperAdminReferralAnalyticsDto>.Success(result);
    }

    public async Task<Result<bool>> ProcessPayoutAsync(Guid conversionId, ProcessReferralPayoutRequest request, CancellationToken cancellationToken = default)
    {
        var conversion = await _context.TenantReferralConversions
            .FirstOrDefaultAsync(c => c.Id == conversionId && !c.IsDeleted, cancellationToken);

        if (conversion == null)
            return Result<bool>.Failure("Referral record not found.", "NOT_FOUND");

        if (conversion.Status == ReferralConversionStatus.Paid)
            return Result<bool>.Failure("This referral payout has already been processed.", "ALREADY_PAID");

        decimal payoutAmount = conversion.CommissionRewardAmount;

        conversion.Status = ReferralConversionStatus.Paid;
        conversion.PaidAtUtc = DateTimeOffset.UtcNow;
        conversion.PayoutMode = request.PayoutMode?.Trim() ?? "UPI";
        conversion.PayoutReference = request.PayoutReference?.Trim() ?? "UTR-MANUAL";
        conversion.AdminNotes = request.AdminNotes?.Trim();
        conversion.UpdatedAtUtc = DateTimeOffset.UtcNow;

        var profile = await EnsureTenantProfileAsync(conversion.ReferrerTenantId, cancellationToken);
        profile.TotalPaidOutAmount += payoutAmount;
        profile.PendingBalanceAmount = Math.Max(0, profile.PendingBalanceAmount - payoutAmount);
        profile.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Processed referral payout {Amount} for conversion {Id} with Ref {Ref}", payoutAmount, conversionId, request.PayoutReference);

        return Result<bool>.Success(true);
    }

    private async Task<TenantReferralProfile> EnsureTenantProfileAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var profile = await _context.TenantReferralProfiles
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && !p.IsDeleted, cancellationToken);

        if (profile == null)
        {
            var tenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

            string codeSlug = tenant != null && !string.IsNullOrWhiteSpace(tenant.Code)
                ? tenant.Code.Replace("TNT-", "").Replace("PHARMA-", "").Replace("STORE-", "").ToUpperInvariant()
                : "PARTNER";

            string randomSuffix = Guid.NewGuid().ToString("N").Substring(0, 5).ToUpperInvariant();
            string generatedCode = $"UB-REF-{codeSlug}-{randomSuffix}";

            profile = new TenantReferralProfile
            {
                TenantId = tenantId,
                ReferralCode = generatedCode,
                IsActive = true,
                TotalReferralsCount = 0,
                PaidConversionsCount = 0,
                TotalEarnedAmount = 0m,
                TotalPaidOutAmount = 0m,
                PendingBalanceAmount = 0m,
                CreatedAtUtc = DateTimeOffset.UtcNow
            };

            _context.Add(profile);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return profile;
    }
}
