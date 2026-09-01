using System;
using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Subscriptions;

public class PaymentGatewayConfig : BaseAuditableEntity
{
    public string Provider { get; set; } = "Razorpay"; // Default provider
    public string KeyId { get; set; } = string.Empty;
    public string KeySecret { get; set; } = string.Empty;
    public string? WebhookSecret { get; set; }
    public string Mode { get; set; } = "Test"; // "Test" or "Live"
    public bool IsActive { get; set; } = true;
    public string? AdditionalSettingsJson { get; set; } = "{}";
}

public class SubscriptionInvoice : BaseAuditableEntity
{
    public Guid TenantId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty; // e.g. "INV-SUB-2026-0001"
    public DateTimeOffset InvoiceDate { get; set; } = DateTimeOffset.UtcNow;

    // Tenant / Buyer Snapshot
    public string TenantBusinessName { get; set; } = string.Empty;
    public string? TenantGstin { get; set; }
    public string? TenantPan { get; set; }
    public string? TenantBillingAddress { get; set; }
    public string? TenantEmail { get; set; }
    public string? TenantPhone { get; set; }

    // Line Item / Purchased Item
    public string ItemDescription { get; set; } = string.Empty; // e.g. "Pharma & Healthcare Suite Add-on (1 Month)"
    public string? PlanCode { get; set; }
    public string? AddonCode { get; set; }
    public string BillingCycle { get; set; } = "Monthly"; // "Monthly" or "Annual"
    public int DurationDays { get; set; } = 30;

    // Pricing & Tax Breakdown (18% GST for software SaaS in India)
    public decimal SubTotal { get; set; }
    public decimal TaxRatePercent { get; set; } = 18m;
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "INR";

    // Dynamic Indian GST Breakdown (CGST+SGST vs IGST)
    public bool IsInterState { get; set; } = false;
    public decimal CgstRatePercent { get; set; } = 0;
    public decimal CgstAmount { get; set; } = 0;
    public decimal SgstRatePercent { get; set; } = 0;
    public decimal SgstAmount { get; set; } = 0;
    public decimal IgstRatePercent { get; set; } = 0;
    public decimal IgstAmount { get; set; } = 0;
    public string? PlaceOfSupply { get; set; }
    public string? SupplierLegalName { get; set; }
    public string? SupplierGstin { get; set; }
    public string? SupplierAddress { get; set; }
    public string? SupplierStateCode { get; set; }
    public string? SubscriberStateCode { get; set; }

    // Platform Company Branding & Banking Snapshot
    public string? SupplierLogoUrl { get; set; }
    public string? SupplierBankName { get; set; }
    public string? SupplierBankAccountNumber { get; set; }
    public string? SupplierBankIfsc { get; set; }
    public string? SupplierBankBranch { get; set; }
    public string? SupplierUpiId { get; set; }
    public string? SupplierSignatoryName { get; set; }
    public string? SupplierSignatoryDesignation { get; set; }
    public string? SupplierSignatoryImageUrl { get; set; }
    public string? InvoiceTermsAndConditions { get; set; }

    // Payment Gateway Details
    public string PaymentGateway { get; set; } = "Razorpay"; // "Razorpay" or "ManualGrant"
    public string? GatewayOrderId { get; set; }
    public string? GatewayPaymentId { get; set; }
    public string? GatewaySignature { get; set; }
    public string PaymentStatus { get; set; } = "Paid"; // "Paid", "Pending", "Failed", "Refunded"
    public DateTimeOffset? PaidAtUtc { get; set; }

    public string? Notes { get; set; }
}
