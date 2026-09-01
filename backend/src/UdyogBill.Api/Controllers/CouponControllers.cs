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
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin/coupons")]
public class SuperAdminCouponsController : BaseApiController
{
    private readonly ICouponService _couponService;

    public SuperAdminCouponsController(ICouponService couponService)
    {
        _couponService = couponService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<PlatformCouponDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllCoupons(CancellationToken cancellationToken)
    {
        var result = await _couponService.GetAllCouponsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PlatformCouponDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCouponById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _couponService.GetCouponByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCoupon([FromBody] CreatePlatformCouponRequest request, CancellationToken cancellationToken)
    {
        var result = await _couponService.CreateCouponAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCoupon(Guid id, [FromBody] UpdatePlatformCouponRequest request, CancellationToken cancellationToken)
    {
        var result = await _couponService.UpdateCouponAsync(id, request, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCoupon(Guid id, CancellationToken cancellationToken)
    {
        var result = await _couponService.DeleteCouponAsync(id, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[Route("api/v1/coupons")]
public class TenantCouponsController : BaseApiController
{
    private readonly ICouponService _couponService;

    public TenantCouponsController(ICouponService couponService)
    {
        _couponService = couponService;
    }

    [HttpPost("validate")]
    [ProducesResponseType(typeof(ValidatePlatformCouponResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ValidateCoupon([FromBody] ValidatePlatformCouponRequest request, CancellationToken cancellationToken)
    {
        var result = await _couponService.ValidateCouponAsync(request, cancellationToken);
        return HandleResult(result);
    }
}
