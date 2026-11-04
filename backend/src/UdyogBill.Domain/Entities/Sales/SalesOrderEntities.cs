using System;
using System.Collections.Generic;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Logistics;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Tenants;

namespace UdyogBill.Domain.Entities.Sales;

public enum SalesOrderStatus
{
    Draft = 1,
    Confirmed = 2,
    Dispatched = 3,
    Invoiced = 4,
    Cancelled = 5
}

public class SalesOrder : BaseAuditableEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public string OrderNumber { get; set; } = string.Empty; // e.g. SO-2627-00001
    public SalesOrderStatus Status { get; set; } = SalesOrderStatus.Draft;

    public Guid BranchId { get; set; }
    public TenantBranch? Branch { get; set; }

    public Guid WarehouseId { get; set; }
    public TenantWarehouse? Warehouse { get; set; }

    public Guid? PartyId { get; set; }
    public Party? Party { get; set; }

    // Customer Snapshot
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerGSTIN { get; set; }
    public string? CustomerPAN { get; set; }
    public string? BillingAddress { get; set; }
    public string? ShippingAddress { get; set; }
    public string BillingStateCode { get; set; } = string.Empty;
    public string ShippingStateCode { get; set; } = string.Empty;
    public string PlaceOfSupply { get; set; } = string.Empty;

    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime? DeliveryDueDate { get; set; }
    public TaxSupplyType TaxSupplyType { get; set; } = TaxSupplyType.IntraState;

    // Financials
    public decimal SubTotal { get; set; }
    public decimal ItemDiscountTotal { get; set; }
    public decimal OrderDiscountPercent { get; set; }
    public decimal OrderDiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal IgstAmount { get; set; }
    public decimal CessAmount { get; set; }
    public decimal RoundOff { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AdvancePaidAmount { get; set; }

    // Conversion Linkage
    public Guid? QuotationId { get; set; }
    public Quotation? Quotation { get; set; }

    public Guid? ConvertedInvoiceId { get; set; }
    public SalesInvoice? ConvertedInvoice { get; set; }

    public Guid? ConvertedChallanId { get; set; }
    public DeliveryChallan? ConvertedChallan { get; set; }

    public DateTime? ConvertedAtUtc { get; set; }

    public string? PoNumber { get; set; }
    public DateTime? PoDate { get; set; }
    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }
    public string AttributesJson { get; set; } = "{}";

    public bool IsCancelled { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAtUtc { get; set; }

    public ICollection<SalesOrderItem> Items { get; set; } = new List<SalesOrderItem>();
}

public class SalesOrderItem : BaseAuditableEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }

    public Guid SalesOrderId { get; set; }
    public SalesOrder SalesOrder { get; set; } = null!;

    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public Guid? VariantId { get; set; }
    public ItemVariant? Variant { get; set; }

    public string ItemName { get; set; } = string.Empty;
    public string? HsnCode { get; set; }

    public decimal Quantity { get; set; }
    public Guid? UomId { get; set; }
    public UnitOfMeasure? Uom { get; set; }
    public string? UomCode { get; set; }

    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal GstRate { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal IgstAmount { get; set; }
    public decimal CessAmount { get; set; }
    public decimal TotalAmount { get; set; }

    public string? BatchNumber { get; set; }
    public string AttributesJson { get; set; } = "{}";
}
