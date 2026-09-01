using System;
using System.Collections.Generic;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Tenants;

namespace UdyogBill.Domain.Entities.Sales;

public enum QuotationStatus
{
    Draft = 1,
    Sent = 2,
    Accepted = 3,
    Rejected = 4,
    ConvertedToInvoice = 5,
    Expired = 6,
    Cancelled = 7
}

public class Quotation : BaseAuditableEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public string QuotationNumber { get; set; } = string.Empty; // e.g. QT-2627-00001
    public QuotationStatus Status { get; set; } = QuotationStatus.Draft;

    public Guid BranchId { get; set; }
    public TenantBranch? Branch { get; set; }

    public Guid? PartyId { get; set; } // Optional Customer / Prospect
    public Party? Party { get; set; }

    // Customer Snapshot
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
    public TaxSupplyType TaxSupplyType { get; set; } = TaxSupplyType.IntraState;

    // Financials
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

    // Conversion Linkage
    public Guid? ConvertedInvoiceId { get; set; }
    public SalesInvoice? ConvertedInvoice { get; set; }
    public DateTime? ConvertedAtUtc { get; set; }

    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }
    public string AttributesJson { get; set; } = "{}";

    public bool IsCancelled { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAtUtc { get; set; }

    public ICollection<QuotationItem> Items { get; set; } = new List<QuotationItem>();
}

public class QuotationItem : BaseAuditableEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public Guid QuotationId { get; set; }
    public Quotation? Quotation { get; set; }

    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    public string ItemSku { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? HsnCode { get; set; }

    public decimal Quantity { get; set; }
    public Guid UomId { get; set; }
    public UnitOfMeasure? Uom { get; set; }

    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }

    // GST Breakdown
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
    public string AttributesJson { get; set; } = "{}";
}
