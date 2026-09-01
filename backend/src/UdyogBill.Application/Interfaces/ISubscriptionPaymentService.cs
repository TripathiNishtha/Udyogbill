using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface ISubscriptionPaymentService
{
    // Tenant Checkout & Order Workflow
    Task<Result<CreateSubscriptionOrderResponse>> CreateOrderAsync(Guid tenantId, CreateSubscriptionOrderRequest request, CancellationToken cancellationToken = default);
    Task<Result<SubscriptionInvoiceDto>> ConfirmPaymentAsync(Guid tenantId, ConfirmSubscriptionPaymentRequest request, CancellationToken cancellationToken = default);
    Task<Result<TenantSubscriptionStatusSummaryDto>> GetTenantSubscriptionStatusAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<SubscriptionInvoiceDto>>> GetTenantInvoicesAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<Result<SubscriptionInvoiceDto>> GetInvoiceByIdAsync(Guid invoiceId, Guid? tenantId = null, CancellationToken cancellationToken = default);

    // Super Admin Gateway Settings
    Task<Result<PaymentGatewayConfigDto>> GetGatewayConfigAsync(CancellationToken cancellationToken = default);
    Task<Result> UpdateGatewayConfigAsync(UpdatePaymentGatewayConfigRequest request, CancellationToken cancellationToken = default);

    // Super Admin Add-on Pricing & Management
    Task<Result<IReadOnlyList<AddonCatalogItemDto>>> GetSuperAdminAddonsAsync(CancellationToken cancellationToken = default);
    Task<Result> UpdateAddonPriceAsync(string addonCode, UpdateAddonPriceRequest request, CancellationToken cancellationToken = default);
    Task<Result<SubscriptionInvoiceDto>> ManualGrantAddonAsync(ManualGrantAddonRequest request, CancellationToken cancellationToken = default);
    Task<Result> ManualRevokeAddonAsync(ManualRevokeAddonRequest request, CancellationToken cancellationToken = default);
}
