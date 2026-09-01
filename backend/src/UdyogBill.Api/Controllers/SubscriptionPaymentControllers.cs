using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/subscription")]
public class TenantSubscriptionPaymentController : BaseApiController
{
    private readonly ISubscriptionPaymentService _paymentService;
    private readonly ITenantContext _tenantContext;

    public TenantSubscriptionPaymentController(
        ISubscriptionPaymentService paymentService,
        ITenantContext tenantContext)
    {
        _paymentService = paymentService;
        _tenantContext = tenantContext;
    }

    [HttpGet("status")]
    [ProducesResponseType(typeof(TenantSubscriptionStatusSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken)
    {
        var result = await _paymentService.GetTenantSubscriptionStatusAsync(_tenantContext.TenantId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("create-order")]
    [ProducesResponseType(typeof(CreateSubscriptionOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateOrder([FromBody] CreateSubscriptionOrderRequest request, CancellationToken cancellationToken)
    {
        var result = await _paymentService.CreateOrderAsync(_tenantContext.TenantId, request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("confirm-payment")]
    [ProducesResponseType(typeof(SubscriptionInvoiceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConfirmPayment([FromBody] ConfirmSubscriptionPaymentRequest request, CancellationToken cancellationToken)
    {
        var result = await _paymentService.ConfirmPaymentAsync(_tenantContext.TenantId, request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("invoices")]
    [ProducesResponseType(typeof(IReadOnlyList<SubscriptionInvoiceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInvoices(CancellationToken cancellationToken)
    {
        var result = await _paymentService.GetTenantInvoicesAsync(_tenantContext.TenantId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("invoices/{id:guid}")]
    [ProducesResponseType(typeof(SubscriptionInvoiceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInvoiceById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _paymentService.GetInvoiceByIdAsync(id, _tenantContext.TenantId, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin")]
public class SuperAdminSubscriptionController : BaseApiController
{
    private readonly ISubscriptionPaymentService _paymentService;

    public SuperAdminSubscriptionController(ISubscriptionPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpGet("gateway")]
    [ProducesResponseType(typeof(PaymentGatewayConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGatewayConfig(CancellationToken cancellationToken)
    {
        var result = await _paymentService.GetGatewayConfigAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("gateway")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateGatewayConfig([FromBody] UpdatePaymentGatewayConfigRequest request, CancellationToken cancellationToken)
    {
        var result = await _paymentService.UpdateGatewayConfigAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("addons")]
    [ProducesResponseType(typeof(IReadOnlyList<AddonCatalogItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAddons(CancellationToken cancellationToken)
    {
        var result = await _paymentService.GetSuperAdminAddonsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("addons/{code}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAddonPrice(string code, [FromBody] UpdateAddonPriceRequest request, CancellationToken cancellationToken)
    {
        var result = await _paymentService.UpdateAddonPriceAsync(code, request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("tenants/{id:guid}/addons/grant")]
    [ProducesResponseType(typeof(SubscriptionInvoiceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ManualGrantAddon(Guid id, [FromBody] ManualGrantAddonApiRequest request, CancellationToken cancellationToken)
    {
        var fullRequest = new ManualGrantAddonRequest(id, request.AddonCode, request.DurationDays, request.Reason);
        var result = await _paymentService.ManualGrantAddonAsync(fullRequest, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("tenants/{id:guid}/addons/revoke")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ManualRevokeAddon(Guid id, [FromBody] ManualRevokeAddonApiRequest request, CancellationToken cancellationToken)
    {
        var fullRequest = new ManualRevokeAddonRequest(id, request.AddonCode, request.Reason);
        var result = await _paymentService.ManualRevokeAddonAsync(fullRequest, cancellationToken);
        return HandleResult(result);
    }
}

public record ManualGrantAddonApiRequest(
    string AddonCode,
    int DurationDays = 30,
    string? Reason = "Manual Admin Grant"
);

public record ManualRevokeAddonApiRequest(
    string AddonCode,
    string? Reason = "Manual Admin Revocation"
);
