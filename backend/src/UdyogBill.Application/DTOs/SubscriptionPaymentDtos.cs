using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

// --- Razorpay & Online Checkout DTOs ---

public record CreateSubscriptionOrderRequest(
    string? PlanCode,
    string? AddonCode,
    string BillingCycle = "Monthly" // "Monthly" or "Annual"
);

public record CreateSubscriptionOrderResponse(
    string OrderId,
    decimal Amount, // in INR rupees
    decimal AmountInPaisa, // in Paisa for Razorpay JS
    string Currency,
    string KeyId,
    string BusinessName,
    string Description,
    string ItemName,
    string? CustomerEmail,
    string? CustomerPhone
);

public record ConfirmSubscriptionPaymentRequest(
    string RazorpayOrderId,
    string RazorpayPaymentId,
    string RazorpaySignature,
    string? PlanCode,
    string? AddonCode,
    string BillingCycle = "Monthly"
);

public record SubscriptionInvoiceDto(
    Guid Id,
    Guid TenantId,
    string InvoiceNumber,
    DateTimeOffset InvoiceDate,
    string TenantBusinessName,
    string? TenantGstin,
    string? TenantPan,
    string? TenantBillingAddress,
    string? TenantEmail,
    string? TenantPhone,
    string ItemDescription,
    string? PlanCode,
    string? AddonCode,
    string BillingCycle,
    int DurationDays,
    decimal SubTotal,
    decimal TaxRatePercent,
    decimal TaxAmount,
    decimal TotalAmount,
    string Currency,
    bool IsInterState,
    decimal CgstRatePercent,
    decimal CgstAmount,
    decimal SgstRatePercent,
    decimal SgstAmount,
    decimal IgstRatePercent,
    decimal IgstAmount,
    string? PlaceOfSupply,
    string? SupplierLegalName,
    string? SupplierGstin,
    string? SupplierAddress,
    string? SupplierStateCode,
    string? SubscriberStateCode,
    string? SupplierLogoUrl,
    string? SupplierBankName,
    string? SupplierBankAccountNumber,
    string? SupplierBankIfsc,
    string? SupplierBankBranch,
    string? SupplierUpiId,
    string? SupplierSignatoryName,
    string? SupplierSignatoryDesignation,
    string? SupplierSignatoryImageUrl,
    string? InvoiceTermsAndConditions,
    string PaymentGateway,
    string? GatewayOrderId,
    string? GatewayPaymentId,
    string PaymentStatus,
    DateTimeOffset? PaidAtUtc,
    string? Notes
);

// --- Super Admin Gateway & Pricing DTOs ---

public record PaymentGatewayConfigDto(
    string Provider,
    string KeyId,
    string? WebhookSecret,
    string Mode,
    bool IsActive,
    bool HasSecret
);

public record UpdatePaymentGatewayConfigRequest(
    string KeyId,
    string KeySecret,
    string? WebhookSecret,
    string Mode,
    bool IsActive
);

public record AddonCatalogItemDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    decimal Price,
    string BillingCycle,
    bool IsActive,
    bool IsEnrolled,
    DateTimeOffset? EnrolledExpiresAtUtc,
    int RemainingDays,
    decimal AnnualPrice = 0
);

public record UpdateAddonPriceRequest(
    decimal Price,
    bool IsActive,
    string? Description,
    decimal AnnualPrice = 0
);

public record ManualGrantAddonRequest(
    Guid TenantId,
    string AddonCode,
    int DurationDays = 30,
    string? Reason = "Manual Admin Grant"
);

public record ManualRevokeAddonRequest(
    Guid TenantId,
    string AddonCode,
    string? Reason = "Manual Admin Revocation"
);

public record TenantSubscriptionStatusSummaryDto(
    string CurrentPlanCode,
    string CurrentPlanName,
    DateTimeOffset PlanExpiresAtUtc,
    int PlanRemainingDays,
    bool IsTrial,
    List<AddonCatalogItemDto> Addons,
    List<SubscriptionInvoiceDto> RecentInvoices
);
