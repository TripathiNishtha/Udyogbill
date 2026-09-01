using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.Sales;

namespace UdyogBill.Application.DTOs;

public class CreateQuotationItemRequest
{
    public Guid ItemId { get; set; }
    public decimal Quantity { get; set; }
    public Guid UomId { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public string? AttributesJson { get; set; }
}

public class CreateQuotationRequest
{
    public Guid BranchId { get; set; }
    public Guid? PartyId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerGSTIN { get; set; }
    public string? BillingAddress { get; set; }
    public string? ShippingAddress { get; set; }
    public string? StateCode { get; set; }
    public string? PlaceOfSupply { get; set; }
    public DateTime QuotationDate { get; set; }
    public DateTime? ValidUntilDate { get; set; }
    public decimal QuotationDiscountPercent { get; set; }
    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }
    public string? AttributesJson { get; set; }
    public List<CreateQuotationItemRequest> Items { get; set; } = new();
}

public class ConvertQuotationRequest
{
    public Guid WarehouseId { get; set; }
    public DateTime InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
    public int PrimaryPaymentMode { get; set; } = 3; // 3: BankTransfer / Credit
    public decimal PaidAmount { get; set; } = 0;
    public string? PaymentReferenceNumber { get; set; }
    public string? Notes { get; set; }
}

public class QuotationItemListDto
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public string ItemSku { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? HsnCode { get; set; }
    public decimal Quantity { get; set; }
    public Guid UomId { get; set; }
    public string UomCode { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal GstRate { get; set; }
    public decimal CgstRate { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstRate { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal IgstRate { get; set; }
    public decimal IgstAmount { get; set; }
    public decimal CessRate { get; set; }
    public decimal CessAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

public class QuotationListDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string QuotationNumber { get; set; } = string.Empty;
    public QuotationStatus Status { get; set; }
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public Guid? PartyId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string? CustomerGSTIN { get; set; }
    public DateTime QuotationDate { get; set; }
    public DateTime? ValidUntilDate { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal IgstAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public int TotalItemsCount { get; set; }
    public Guid? ConvertedInvoiceId { get; set; }
    public string? ConvertedInvoiceNumber { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
}

public class QuotationDetailsDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string QuotationNumber { get; set; } = string.Empty;
    public QuotationStatus Status { get; set; }

    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string BranchGstin { get; set; } = string.Empty;
    public string BranchAddress { get; set; } = string.Empty;
    public string BranchStateCode { get; set; } = string.Empty;

    public Guid? PartyId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerGSTIN { get; set; }
    public string? BillingAddress { get; set; }
    public string? ShippingAddress { get; set; }
    public string BillingStateCode { get; set; } = string.Empty;
    public string ShippingStateCode { get; set; } = string.Empty;
    public string PlaceOfSupply { get; set; } = string.Empty;

    public DateTime QuotationDate { get; set; }
    public DateTime? ValidUntilDate { get; set; }
    public TaxSupplyType TaxSupplyType { get; set; }

    public decimal SubTotal { get; set; }
    public decimal ItemDiscountTotal { get; set; }
    public decimal QuotationDiscountPercent { get; set; }
    public decimal QuotationDiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal IgstAmount { get; set; }
    public decimal CessAmount { get; set; }
    public decimal RoundOff { get; set; }
    public decimal TotalAmount { get; set; }

    public Guid? ConvertedInvoiceId { get; set; }
    public string? ConvertedInvoiceNumber { get; set; }
    public DateTime? ConvertedAtUtc { get; set; }

    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }
    public string AttributesJson { get; set; } = "{}";

    public bool IsCancelled { get; set; }
    public string? CancellationReason { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }

    public List<QuotationItemListDto> Items { get; set; } = new();
    public List<GstTaxSummaryItemDto> TaxSummary { get; set; } = new();
}
