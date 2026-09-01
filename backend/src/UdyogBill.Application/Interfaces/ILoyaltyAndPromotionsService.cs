using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface ILoyaltyAndPromotionsService
{
    // Loyalty Config
    Task<Result<LoyaltyProgramConfigDto>> GetLoyaltyConfigAsync(CancellationToken cancellationToken = default);
    Task<Result<LoyaltyProgramConfigDto>> UpdateLoyaltyConfigAsync(UpdateLoyaltyConfigRequest request, CancellationToken cancellationToken = default);

    // Customer Loyalty & Wallet
    Task<Result<IReadOnlyList<CustomerLoyaltyAccountDto>>> GetLoyaltyAccountsAsync(CancellationToken cancellationToken = default);
    Task<Result<CustomerLoyaltyAccountDto>> GetCustomerLoyaltyAccountAsync(Guid partyId, CancellationToken cancellationToken = default);
    Task<Result<CustomerLoyaltyAccountDto>> AddStoreCreditAsync(Guid partyId, AddStoreCreditRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<LoyaltyCheckoutRedemptionResultDto>> CalculateAndRedeemAtCheckoutAsync(Guid partyId, RedeemLoyaltyAtCheckoutRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> AccruePointsForSaleInvoiceAsync(Guid partyId, decimal invoiceNetTotal, Guid invoiceId, string invoiceNumber, CancellationToken cancellationToken = default);

    // Promotional Coupons
    Task<Result<IReadOnlyList<PromotionalCouponDto>>> GetCouponsAsync(CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateCouponAsync(CreateCouponRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<CouponValidationResultDto>> ValidateAndApplyCouponAsync(ValidateCouponRequest request, CancellationToken cancellationToken = default);
}
