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
    public string? BatchNumber { get; set; }
    public string? ExpiryDate { get; set; }
    public decimal? Mrp { get; set; }
    public string? AttributesJson { get; set; }
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

    // Subscriber / Company Identity
    public string CompanyName { get; set; } = string.Empty;
    public string CompanyTradeName { get; set; } = string.Empty;
    public string? CompanyLogoUrl { get; set; }
    public string CompanyGstin { get; set; } = string.Empty;
    public string CompanyPan { get; set; } = string.Empty;
    public string CompanyEmail { get; set; } = string.Empty;
    public string CompanyPhone { get; set; } = string.Empty;
    public string CompanyWebsite { get; set; } = string.Empty;
    public string CompanyAddress { get; set; } = string.Empty;
    public string CompanyCity { get; set; } = string.Empty;
    public string CompanyState { get; set; } = string.Empty;
    public string CompanyStateCode { get; set; } = string.Empty;
    public string CompanyPincode { get; set; } = string.Empty;
    public string IndustryTypeCode { get; set; } = "OTHER";

    // Bank & Payment Information
    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankIfsc { get; set; }
    public string? BankBranch { get; set; }
    public string? UpiId { get; set; }

    // Branch Information
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string BranchGstin { get; set; } = string.Empty;
    public string BranchAddress { get; set; } = string.Empty;
    public string BranchState { get; set; } = string.Empty;
    public string BranchStateCode { get; set; } = string.Empty;
    public string BranchCity { get; set; } = string.Empty;
    public string BranchPincode { get; set; } = string.Empty;
    public string BranchPhone { get; set; } = string.Empty;
    public string BranchEmail { get; set; } = string.Empty;

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
