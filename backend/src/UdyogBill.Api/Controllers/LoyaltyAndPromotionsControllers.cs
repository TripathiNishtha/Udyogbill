using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/loyalty")]
public class TenantLoyaltyController : BaseApiController
{
    private readonly ILoyaltyAndPromotionsService _loyaltyService;

    public TenantLoyaltyController(ILoyaltyAndPromotionsService loyaltyService)
    {
        _loyaltyService = loyaltyService;
    }

    [HttpGet("config")]
    [ProducesResponseType(typeof(LoyaltyProgramConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConfig(CancellationToken cancellationToken)
    {
        var result = await _loyaltyService.GetLoyaltyConfigAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("config")]
    [ProducesResponseType(typeof(LoyaltyProgramConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateConfig([FromBody] UpdateLoyaltyConfigRequest request, CancellationToken cancellationToken)
    {
        var result = await _loyaltyService.UpdateLoyaltyConfigAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("accounts")]
    [ProducesResponseType(typeof(IReadOnlyList<CustomerLoyaltyAccountDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAccounts(CancellationToken cancellationToken)
    {
        var result = await _loyaltyService.GetLoyaltyAccountsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("customer/{partyId:guid}")]
    [ProducesResponseType(typeof(CustomerLoyaltyAccountDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCustomerAccount(Guid partyId, CancellationToken cancellationToken)
    {
        var result = await _loyaltyService.GetCustomerLoyaltyAccountAsync(partyId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("customer/{partyId:guid}/add-credit")]
    [ProducesResponseType(typeof(CustomerLoyaltyAccountDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AddStoreCredit(Guid partyId, [FromBody] AddStoreCreditRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _loyaltyService.AddStoreCreditAsync(partyId, request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("customer/{partyId:guid}/redeem")]
    [ProducesResponseType(typeof(LoyaltyCheckoutRedemptionResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RedeemAtCheckout(Guid partyId, [FromBody] RedeemLoyaltyAtCheckoutRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _loyaltyService.CalculateAndRedeemAtCheckoutAsync(partyId, request, ip, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[Route("api/v1/tenant/promotions/coupons")]
public class TenantPromotionsController : BaseApiController
{
    private readonly ILoyaltyAndPromotionsService _loyaltyService;

    public TenantPromotionsController(ILoyaltyAndPromotionsService loyaltyService)
    {
        _loyaltyService = loyaltyService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<PromotionalCouponDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCoupons(CancellationToken cancellationToken)
    {
        var result = await _loyaltyService.GetCouponsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateCoupon([FromBody] CreateCouponRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _loyaltyService.CreateCouponAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("validate")]
    [ProducesResponseType(typeof(CouponValidationResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ValidateCoupon([FromBody] ValidateCouponRequest request, CancellationToken cancellationToken)
    {
        var result = await _loyaltyService.ValidateAndApplyCouponAsync(request, cancellationToken);
        return HandleResult(result);
    }
}
