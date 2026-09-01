using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Loyalty;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class LoyaltyAndPromotionsService : ILoyaltyAndPromotionsService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public LoyaltyAndPromotionsService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
        _auditService = auditService;
    }

    private Guid RequireTenantId()
    {
        var tenantId = _tenantContext.TenantId != Guid.Empty
            ? _tenantContext.TenantId
            : _currentUserContext.TenantId ?? Guid.Empty;

        if (tenantId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Active tenant context is required.");
        }

        return tenantId;
    }

    #region 1. Loyalty Program Configuration

    public async Task<Result<LoyaltyProgramConfigDto>> GetLoyaltyConfigAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var config = await _context.LoyaltyProgramConfigs
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && !c.IsDeleted, cancellationToken);

        if (config == null)
        {
            // Seed default loyalty configuration
            config = new LoyaltyProgramConfig
            {
                TenantId = tenantId,
                PointsEarnSpendAmount = 100m,
                PointsEarnedPerUnit = 1m,
                PointRedemptionValue = 1m,
                MinOrderAmountToEarn = 100m,
                MaxRedeemPercentPerBill = 50m,
                SignupBonusPoints = 50m,
                ReferrerBonusPoints = 100m,
                RefereeBonusPoints = 50m,
                IsActive = true
            };
            _context.LoyaltyProgramConfigs.Add(config);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Result<LoyaltyProgramConfigDto>.Success(new LoyaltyProgramConfigDto(
            config.Id,
            config.PointsEarnSpendAmount,
            config.PointsEarnedPerUnit,
            config.PointRedemptionValue,
            config.MinOrderAmountToEarn,
            config.MaxRedeemPercentPerBill,
            config.SignupBonusPoints,
            config.ReferrerBonusPoints,
            config.RefereeBonusPoints,
            config.IsActive
        ));
    }

    public async Task<Result<LoyaltyProgramConfigDto>> UpdateLoyaltyConfigAsync(UpdateLoyaltyConfigRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var config = await _context.LoyaltyProgramConfigs
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && !c.IsDeleted, cancellationToken);

        if (config == null)
        {
            config = new LoyaltyProgramConfig { TenantId = tenantId };
            _context.LoyaltyProgramConfigs.Add(config);
        }

        config.PointsEarnSpendAmount = request.PointsEarnSpendAmount;
        config.PointsEarnedPerUnit = request.PointsEarnedPerUnit;
        config.PointRedemptionValue = request.PointRedemptionValue;
        config.MinOrderAmountToEarn = request.MinOrderAmountToEarn;
        config.MaxRedeemPercentPerBill = request.MaxRedeemPercentPerBill;
        config.SignupBonusPoints = request.SignupBonusPoints;
        config.ReferrerBonusPoints = request.ReferrerBonusPoints;
        config.RefereeBonusPoints = request.RefereeBonusPoints;
        config.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        return await GetLoyaltyConfigAsync(cancellationToken);
    }

    #endregion

    #region 2. Customer Loyalty & Wallet Engine

    public async Task<Result<IReadOnlyList<CustomerLoyaltyAccountDto>>> GetLoyaltyAccountsAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var parties = await _context.Parties
            .Where(p => p.TenantId == tenantId && p.PartyType != PartyType.Supplier && !p.IsDeleted)
            .Include(p => p.Addresses)
            .ToListAsync(cancellationToken);

        var list = new List<CustomerLoyaltyAccountDto>();

        foreach (var party in parties)
        {
            var accRes = await GetCustomerLoyaltyAccountAsync(party.Id, cancellationToken);
            if (accRes.IsSuccess && accRes.Data != null)
            {
                list.Add(accRes.Data);
            }
        }

        return Result<IReadOnlyList<CustomerLoyaltyAccountDto>>.Success(list);
    }

    public async Task<Result<CustomerLoyaltyAccountDto>> GetCustomerLoyaltyAccountAsync(Guid partyId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var party = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == partyId && !p.IsDeleted, cancellationToken);

        if (party == null)
        {
            return Result<CustomerLoyaltyAccountDto>.Failure("Customer not found.", "NOT_FOUND");
        }

        var account = await _context.CustomerLoyaltyAccounts
            .FirstOrDefaultAsync(a => a.TenantId == tenantId && a.PartyId == partyId && !a.IsDeleted, cancellationToken);

        if (account == null)
        {
            account = new CustomerLoyaltyAccount
            {
                TenantId = tenantId,
                PartyId = partyId,
                AvailablePoints = 50m, // Welcome bonus points
                TotalPointsEarned = 50m,
                TotalPointsRedeemed = 0m,
                StoreCreditBalance = 0m,
                ReferralCode = $"REF-{party.Code.Replace("CUST-", "")}-{Guid.NewGuid().ToString().Substring(0, 4).ToUpperInvariant()}",
                IsActive = true
            };
            _context.CustomerLoyaltyAccounts.Add(account);

            _context.LoyaltyTransactions.Add(new LoyaltyTransaction
            {
                TenantId = tenantId,
                PartyId = partyId,
                CustomerLoyaltyAccountId = account.Id,
                TransactionType = LoyaltyTransactionType.PointsEarned,
                PointsChange = 50m,
                StoreCreditChange = 0m,
                AvailablePointsAfter = 50m,
                StoreCreditBalanceAfter = 0m,
                Description = "Welcome Signup Bonus"
            });

            await _context.SaveChangesAsync(cancellationToken);
        }

        var transactions = await _context.LoyaltyTransactions
            .Where(t => t.TenantId == tenantId && t.PartyId == partyId && !t.IsDeleted)
            .OrderByDescending(t => t.CreatedAtUtc)
            .Take(20)
            .Select(t => new LoyaltyTransactionDto(
                t.Id,
                t.TransactionType,
                t.PointsChange,
                t.StoreCreditChange,
                t.AvailablePointsAfter,
                t.StoreCreditBalanceAfter,
                t.ReferenceInvoiceNumber,
                t.Description,
                t.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<CustomerLoyaltyAccountDto>.Success(new CustomerLoyaltyAccountDto(
            account.Id,
            party.Id,
            party.LegalName,
            party.Code,
            party.PrimaryPhone ?? party.Mobile,
            account.AvailablePoints,
            account.TotalPointsEarned,
            account.TotalPointsRedeemed,
            account.StoreCreditBalance,
            account.ReferralCode,
            account.ReferredByPartyId,
            account.IsActive,
            transactions
        ));
    }

    public async Task<Result<CustomerLoyaltyAccountDto>> AddStoreCreditAsync(
        Guid partyId,
        AddStoreCreditRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Amount <= 0)
        {
            return Result<CustomerLoyaltyAccountDto>.Failure("Amount must be greater than zero.", "INVALID_AMOUNT");
        }

        var accountRes = await GetCustomerLoyaltyAccountAsync(partyId, cancellationToken);
        if (!accountRes.IsSuccess || accountRes.Data == null)
        {
            return Result<CustomerLoyaltyAccountDto>.Failure("Could not find or initialize customer loyalty account.", "ERROR");
        }

        var account = await _context.CustomerLoyaltyAccounts
            .FirstAsync(a => a.TenantId == tenantId && a.PartyId == partyId && !a.IsDeleted, cancellationToken);

        account.StoreCreditBalance += request.Amount;

        var tx = new LoyaltyTransaction
        {
            TenantId = tenantId,
            PartyId = partyId,
            CustomerLoyaltyAccountId = account.Id,
            TransactionType = LoyaltyTransactionType.StoreCreditAdded,
            PointsChange = 0m,
            StoreCreditChange = request.Amount,
            AvailablePointsAfter = account.AvailablePoints,
            StoreCreditBalanceAfter = account.StoreCreditBalance,
            Description = request.Notes ?? "Store Credit Deposit / Return Refund"
        };
        _context.LoyaltyTransactions.Add(tx);

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "AddStoreCredit",
            EntityName = "CustomerLoyaltyAccount",
            EntityId = account.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { partyId, CreditAdded = request.Amount, NewBalance = account.StoreCreditBalance }),
            IpAddress = ipAddress
        }, cancellationToken);

        return await GetCustomerLoyaltyAccountAsync(partyId, cancellationToken);
    }

    public async Task<Result<LoyaltyCheckoutRedemptionResultDto>> CalculateAndRedeemAtCheckoutAsync(
        Guid partyId,
        RedeemLoyaltyAtCheckoutRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var configRes = await GetLoyaltyConfigAsync(cancellationToken);
        var config = configRes.Data!;

        var account = await _context.CustomerLoyaltyAccounts
            .FirstOrDefaultAsync(a => a.TenantId == tenantId && a.PartyId == partyId && !a.IsDeleted, cancellationToken);

        if (account == null)
        {
            return Result<LoyaltyCheckoutRedemptionResultDto>.Failure("Customer loyalty account not found.", "NOT_FOUND");
        }

        decimal pointsToUse = Math.Min(account.AvailablePoints, request.PointsToRedeem ?? 0m);
        decimal storeCreditToUse = Math.Min(account.StoreCreditBalance, request.StoreCreditToRedeem ?? 0m);

        // Max points redemption cap
        decimal maxPointsDiscount = (request.OrderTotalAmount * config.MaxRedeemPercentPerBill) / 100m;
        decimal pointsDiscount = pointsToUse * config.PointRedemptionValue;
        if (pointsDiscount > maxPointsDiscount)
        {
            pointsDiscount = maxPointsDiscount;
            pointsToUse = Math.Floor(pointsDiscount / config.PointRedemptionValue);
        }

        decimal netPayable = Math.Max(0m, request.OrderTotalAmount - pointsDiscount - storeCreditToUse);
        decimal totalDiscount = pointsDiscount + storeCreditToUse;

        // Deduct balances
        account.AvailablePoints -= pointsToUse;
        account.TotalPointsRedeemed += pointsToUse;
        account.StoreCreditBalance -= storeCreditToUse;

        if (pointsToUse > 0 || storeCreditToUse > 0)
        {
            _context.LoyaltyTransactions.Add(new LoyaltyTransaction
            {
                TenantId = tenantId,
                PartyId = partyId,
                CustomerLoyaltyAccountId = account.Id,
                TransactionType = pointsToUse > 0 ? LoyaltyTransactionType.PointsRedeemed : LoyaltyTransactionType.StoreCreditUsed,
                PointsChange = -pointsToUse,
                StoreCreditChange = -storeCreditToUse,
                AvailablePointsAfter = account.AvailablePoints,
                StoreCreditBalanceAfter = account.StoreCreditBalance,
                Description = $"Checkout Redemption: {pointsToUse} pts (₹{pointsDiscount}) + ₹{storeCreditToUse} Store Credit"
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<LoyaltyCheckoutRedemptionResultDto>.Success(new LoyaltyCheckoutRedemptionResultDto(
            pointsToUse,
            pointsDiscount,
            storeCreditToUse,
            totalDiscount,
            netPayable,
            account.AvailablePoints,
            account.StoreCreditBalance
        ));
    }

    public async Task<Result> AccruePointsForSaleInvoiceAsync(
        Guid partyId,
        decimal invoiceNetTotal,
        Guid invoiceId,
        string invoiceNumber,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var configRes = await GetLoyaltyConfigAsync(cancellationToken);
        var config = configRes.Data!;

        if (!config.IsActive || invoiceNetTotal < config.MinOrderAmountToEarn)
        {
            return Result.Success();
        }

        var accountRes = await GetCustomerLoyaltyAccountAsync(partyId, cancellationToken);
        if (!accountRes.IsSuccess || accountRes.Data == null)
        {
            return Result.Success();
        }

        var account = await _context.CustomerLoyaltyAccounts
            .FirstAsync(a => a.TenantId == tenantId && a.PartyId == partyId && !a.IsDeleted, cancellationToken);

        decimal pointsEarned = Math.Floor((invoiceNetTotal / config.PointsEarnSpendAmount) * config.PointsEarnedPerUnit);

        if (pointsEarned > 0)
        {
            account.AvailablePoints += pointsEarned;
            account.TotalPointsEarned += pointsEarned;

            _context.LoyaltyTransactions.Add(new LoyaltyTransaction
            {
                TenantId = tenantId,
                PartyId = partyId,
                CustomerLoyaltyAccountId = account.Id,
                TransactionType = LoyaltyTransactionType.PointsEarned,
                PointsChange = pointsEarned,
                StoreCreditChange = 0m,
                AvailablePointsAfter = account.AvailablePoints,
                StoreCreditBalanceAfter = account.StoreCreditBalance,
                ReferenceInvoiceId = invoiceId,
                ReferenceInvoiceNumber = invoiceNumber,
                Description = $"Earned on Invoice #{invoiceNumber}"
            });

            await _context.SaveChangesAsync(cancellationToken);
        }

        return Result.Success();
    }

    #endregion

    #region 3. Promotional Coupons Engine

    public async Task<Result<IReadOnlyList<PromotionalCouponDto>>> GetCouponsAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var coupons = await _context.PromotionalCoupons
            .Where(c => c.TenantId == tenantId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAtUtc)
            .Select(c => new PromotionalCouponDto(
                c.Id,
                c.Code,
                c.Description,
                c.DiscountType,
                c.DiscountValue,
                c.MinimumOrderAmount,
                c.MaximumDiscountAmount,
                c.ValidFromUtc,
                c.ValidUntilUtc,
                c.TotalUsageLimit,
                c.CurrentUsageCount,
                c.UsageLimitPerCustomer,
                c.IsActive
            ))
            .ToListAsync(cancellationToken);

        // Auto-seed default promo coupon if tenant has none
        if (coupons.Count == 0)
        {
            var defaultCoupon = new PromotionalCoupon
            {
                TenantId = tenantId,
                Code = "WELCOME10",
                Description = "10% off on first purchase above ₹500",
                DiscountType = CouponDiscountType.Percentage,
                DiscountValue = 10m,
                MinimumOrderAmount = 500m,
                MaximumDiscountAmount = 250m,
                ValidFromUtc = DateTimeOffset.UtcNow,
                ValidUntilUtc = DateTimeOffset.UtcNow.AddYears(1),
                TotalUsageLimit = 5000,
                IsActive = true
            };
            _context.PromotionalCoupons.Add(defaultCoupon);
            await _context.SaveChangesAsync(cancellationToken);

            return await GetCouponsAsync(cancellationToken);
        }

        return Result<IReadOnlyList<PromotionalCouponDto>>.Success(coupons);
    }

    public async Task<Result<Guid>> CreateCouponAsync(
        CreateCouponRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var normalizedCode = request.Code.Trim().ToUpperInvariant();

        var existing = await _context.PromotionalCoupons
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Code == normalizedCode && !c.IsDeleted, cancellationToken);

        if (existing != null)
        {
            return Result<Guid>.Failure("A coupon with this code already exists.", "DUPLICATE_CODE");
        }

        var coupon = new PromotionalCoupon
        {
            TenantId = tenantId,
            Code = normalizedCode,
            Description = request.Description?.Trim(),
            DiscountType = request.DiscountType,
            DiscountValue = request.DiscountValue,
            MinimumOrderAmount = request.MinimumOrderAmount,
            MaximumDiscountAmount = request.MaximumDiscountAmount,
            ValidFromUtc = DateTimeOffset.UtcNow,
            ValidUntilUtc = request.ValidUntilUtc,
            TotalUsageLimit = request.TotalUsageLimit,
            UsageLimitPerCustomer = request.UsageLimitPerCustomer,
            IsActive = request.IsActive
        };

        _context.PromotionalCoupons.Add(coupon);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreatePromotionalCoupon",
            EntityName = "PromotionalCoupon",
            EntityId = coupon.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { coupon.Code, coupon.DiscountType, coupon.DiscountValue }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(coupon.Id);
    }

    public async Task<Result<CouponValidationResultDto>> ValidateAndApplyCouponAsync(
        ValidateCouponRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var normalizedCode = request.CouponCode.Trim().ToUpperInvariant();

        var coupon = await _context.PromotionalCoupons
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Code == normalizedCode && !c.IsDeleted, cancellationToken);

        if (coupon == null)
        {
            return Result<CouponValidationResultDto>.Success(new CouponValidationResultDto(
                false, "Coupon code not found.", normalizedCode, null, 0m, request.CartTotalAmount));
        }

        if (!coupon.IsActive)
        {
            return Result<CouponValidationResultDto>.Success(new CouponValidationResultDto(
                false, "Coupon code is inactive.", normalizedCode, coupon.DiscountType, 0m, request.CartTotalAmount));
        }

        var now = DateTimeOffset.UtcNow;
        if (coupon.ValidUntilUtc.HasValue && coupon.ValidUntilUtc.Value < now)
        {
            return Result<CouponValidationResultDto>.Success(new CouponValidationResultDto(
                false, "Coupon code has expired.", normalizedCode, coupon.DiscountType, 0m, request.CartTotalAmount));
        }

        if (coupon.CurrentUsageCount >= coupon.TotalUsageLimit)
        {
            return Result<CouponValidationResultDto>.Success(new CouponValidationResultDto(
                false, "Coupon usage limit reached.", normalizedCode, coupon.DiscountType, 0m, request.CartTotalAmount));
        }

        if (request.CartTotalAmount < coupon.MinimumOrderAmount)
        {
            return Result<CouponValidationResultDto>.Success(new CouponValidationResultDto(
                false, $"Minimum order amount of ₹{coupon.MinimumOrderAmount} required for this coupon.", normalizedCode, coupon.DiscountType, 0m, request.CartTotalAmount));
        }

        decimal discount = 0m;
        if (coupon.DiscountType == CouponDiscountType.Percentage)
        {
            discount = (request.CartTotalAmount * coupon.DiscountValue) / 100m;
            if (coupon.MaximumDiscountAmount.HasValue)
            {
                discount = Math.Min(discount, coupon.MaximumDiscountAmount.Value);
            }
        }
        else
        {
            discount = Math.Min(request.CartTotalAmount, coupon.DiscountValue);
        }

        decimal finalAmount = Math.Max(0m, request.CartTotalAmount - discount);

        return Result<CouponValidationResultDto>.Success(new CouponValidationResultDto(
            true, null, coupon.Code, coupon.DiscountType, discount, finalAmount));
    }

    #endregion
}
