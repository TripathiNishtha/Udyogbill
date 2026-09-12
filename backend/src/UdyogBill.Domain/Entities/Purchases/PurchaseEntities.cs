using System.ComponentModel.DataAnnotations.Schema;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;

namespace UdyogBill.Domain.Entities.Purchases;

public enum PurchaseOrderStatus
{
    Draft = 1,
    Confirmed = 2,
    PartiallyReceived = 3,
    Completed = 4,
    Cancelled = 5
}

public enum GrnStatus
{
    Draft = 1,
    Verified = 2,
    Cancelled = 3
}

public enum PurchaseBillStatus
{
    Draft = 1,
    Approved = 2,
    Paid = 3,
    PartiallyPaid = 4,
    Overdue = 5,
    Cancelled = 6
}

public class PurchaseOrder : BaseTenantAuditableEntity
{
    public string OrderNumber { get; set; } = string.Empty; // PO-2627-00001
    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Draft;

    public Guid BranchId { get; set; }
    public TenantBranch Branch { get; set; } = null!;

    public Guid WarehouseId { get; set; }
    public TenantWarehouse Warehouse { get; set; } = null!;

    public Guid PartyId { get; set; } // Supplier (Creditor)
    public Party Party { get; set; } = null!;

    public string SupplierName { get; set; } = string.Empty;
    public string? SupplierPhone { get; set; }
    public string? SupplierGSTIN { get; set; }
    public string? SupplierAddress { get; set; }

    public DateTime OrderDate { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }

    public TaxSupplyType TaxSupplyType { get; set; } = TaxSupplyType.IntraState;
    public string SupplierStateCode { get; set; } = string.Empty;
    public string PlaceOfSupply { get; set; } = string.Empty;

    // Amounts
    public decimal SubTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal IgstAmount { get; set; }
    public decimal CessAmount { get; set; }
    public decimal RoundOff { get; set; }
    public decimal TotalAmount { get; set; }

    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }
    public string AttributesJson { get; set; } = "{}";

    public bool IsCancelled { get; set; }
    public string? CancellationReason { get; set; }

    public ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
    public ICollection<GoodsReceiptNote> GoodsReceiptNotes { get; set; } = new List<GoodsReceiptNote>();
    public ICollection<PurchaseBill> PurchaseBills { get; set; } = new List<PurchaseBill>();
}

public class PurchaseOrderItem : BaseTenantAuditableEntity
{
    public Guid PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;

    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public string ItemSku { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? HsnCode { get; set; }

    public decimal OrderQuantity { get; set; }
    public decimal FreeQuantity { get; set; } = 0m;
    public decimal ReceivedQuantity { get; set; }
    public decimal RemainingQuantity => (OrderQuantity + FreeQuantity) - ReceivedQuantity;

    public Guid UomId { get; set; }
    public UnitOfMeasure Uom { get; set; } = null!;
    public string UomCode { get; set; } = string.Empty;

    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal SchemeDiscountPercent { get; set; } = 0m;
    public decimal CashDiscountPercent { get; set; } = 0m;
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
    public string AttributesJson { get; set; } = "{}";
}

public class GoodsReceiptNote : BaseTenantAuditableEntity
{
    public string GrnNumber { get; set; } = string.Empty; // GRN-2627-00001
    public GrnStatus Status { get; set; } = GrnStatus.Verified;

    public Guid? PurchaseOrderId { get; set; }
    public PurchaseOrder? PurchaseOrder { get; set; }

    public Guid BranchId { get; set; }
    public TenantBranch Branch { get; set; } = null!;

    public Guid WarehouseId { get; set; }
    public TenantWarehouse Warehouse { get; set; } = null!;

    public Guid PartyId { get; set; } // Supplier
    public Party Party { get; set; } = null!;

    public string SupplierName { get; set; } = string.Empty;
    public string? DeliveryChallanNumber { get; set; }
    public DateTime? DeliveryChallanDate { get; set; }

    public DateTime ReceivedDate { get; set; }
    public string? ReceivedBy { get; set; }
    public string? Remarks { get; set; }

    public bool IsCancelled { get; set; }
    public string? CancellationReason { get; set; }

    public ICollection<GoodsReceiptNoteItem> Items { get; set; } = new List<GoodsReceiptNoteItem>();
}

public class GoodsReceiptNoteItem : BaseTenantAuditableEntity
{
    public Guid GoodsReceiptNoteId { get; set; }
    public GoodsReceiptNote GoodsReceiptNote { get; set; } = null!;

    public Guid? PurchaseOrderItemId { get; set; }
    public PurchaseOrderItem? PurchaseOrderItem { get; set; }

    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public string ItemSku { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;

    public Guid? BatchId { get; set; }
    public ItemBatch? Batch { get; set; }

    public string? BatchNumber { get; set; }
    public DateTime? ManufacturingDate { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public decimal ReceivedQuantity { get; set; }
    public decimal ReceivedFreeQuantity { get; set; } = 0m;
    public decimal AcceptedQuantity { get; set; }
    public decimal AcceptedFreeQuantity { get; set; } = 0m;
    public decimal RejectedQuantity { get; set; }

    public Guid UomId { get; set; }
    public UnitOfMeasure Uom { get; set; } = null!;
    public string UomCode { get; set; } = string.Empty;

    public decimal UnitCost { get; set; }
    public decimal TotalCost { get; set; }
    public string? RejectionReason { get; set; }
}

public class PurchaseBill : BaseTenantAuditableEntity
{
    public string BillNumber { get; set; } = string.Empty; // BILL-2627-00001
    public string? VendorInvoiceNumber { get; set; } // Supplier's own invoice reference
    public PurchaseBillStatus Status { get; set; } = PurchaseBillStatus.Approved;

    public Guid? PurchaseOrderId { get; set; }
    public PurchaseOrder? PurchaseOrder { get; set; }

    public Guid? GoodsReceiptNoteId { get; set; }
    public GoodsReceiptNote? GoodsReceiptNote { get; set; }

    public Guid BranchId { get; set; }
    public TenantBranch Branch { get; set; } = null!;

    public Guid WarehouseId { get; set; }
    public TenantWarehouse Warehouse { get; set; } = null!;

    public Guid PartyId { get; set; } // Supplier (Creditor)
    public Party Party { get; set; } = null!;

    public string SupplierName { get; set; } = string.Empty;
    public string? SupplierGSTIN { get; set; }
    public string? SupplierAddress { get; set; }
    public string SupplierStateCode { get; set; } = string.Empty;
    public string PlaceOfSupply { get; set; } = string.Empty;

    public DateTime BillDate { get; set; }
    public DateTime? DueDate { get; set; }

    public TaxSupplyType TaxSupplyType { get; set; } = TaxSupplyType.IntraState;

    // Amounts
    public decimal SubTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal IgstAmount { get; set; }
    public decimal CessAmount { get; set; }
    public decimal RoundOff { get; set; }
    public decimal TotalAmount { get; set; }

    // Payment Tracking
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;
    public PaymentMode PrimaryPaymentMode { get; set; } = PaymentMode.BankTransfer;

    public string? Notes { get; set; }
    public string AttributesJson { get; set; } = "{}";

    public bool IsCancelled { get; set; }
    public string? CancellationReason { get; set; }

    public ICollection<PurchaseBillItem> Items { get; set; } = new List<PurchaseBillItem>();
    public ICollection<PurchaseBillPayment> Payments { get; set; } = new List<PurchaseBillPayment>();
}

public class PurchaseBillItem : BaseTenantAuditableEntity
{
    public Guid PurchaseBillId { get; set; }
    public PurchaseBill PurchaseBill { get; set; } = null!;

    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public string ItemSku { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? HsnCode { get; set; }

    public Guid? BatchId { get; set; }
    public ItemBatch? Batch { get; set; }
    public string? BatchNumber { get; set; }

    // Garment / Product Variant
    public Guid? VariantId { get; set; }
    public ItemVariant? Variant { get; set; }

    public decimal Quantity { get; set; }
    public decimal FreeQuantity { get; set; } = 0m;
    public Guid UomId { get; set; }
    public UnitOfMeasure Uom { get; set; } = null!;
    public string UomCode { get; set; } = string.Empty;

    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal SchemeDiscountPercent { get; set; } = 0m;
    public decimal CashDiscountPercent { get; set; } = 0m;
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
    public string AttributesJson { get; set; } = "{}";
}

public class PurchaseBillPayment : BaseTenantAuditableEntity
{
    public Guid PurchaseBillId { get; set; }
    public PurchaseBill PurchaseBill { get; set; } = null!;

    public DateTime PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public PaymentMode PaymentMode { get; set; } = PaymentMode.BankTransfer;

    public string? TransactionReference { get; set; } // UTR / Cheque No
    public string? BankName { get; set; }
    public string? Notes { get; set; }
}

public class PurchaseReturn : BaseTenantAuditableEntity
{
    public string DebitNoteNumber { get; set; } = string.Empty;
    public DateTimeOffset ReturnDate { get; set; } = DateTimeOffset.UtcNow;
    public Guid? OriginalPurchaseBillId { get; set; }
    public PurchaseBill? OriginalPurchaseBill { get; set; }
    public string? OriginalBillNumber { get; set; }
    public Guid PartyId { get; set; }
    public Party Party { get; set; } = null!;
    public string SupplierName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public Guid WarehouseId { get; set; }
    public string ReturnReason { get; set; } = "Defective";
    public decimal SubTotal { get; set; } = 0m;
    public decimal TaxAmount { get; set; } = 0m;
    public decimal TotalAmount { get; set; } = 0m;
    public string? Notes { get; set; }
    public bool IsCancelled { get; set; } = false;
    public ICollection<PurchaseReturnItem> Items { get; set; } = new List<PurchaseReturnItem>();
}

public class PurchaseReturnItem : BaseTenantAuditableEntity
{
    public Guid PurchaseReturnId { get; set; }
    public PurchaseReturn PurchaseReturn { get; set; } = null!;
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;
    public string ItemName { get; set; } = string.Empty;
    public string ItemSku { get; set; } = string.Empty;
    public Guid? BatchId { get; set; }
    public string? BatchNumber { get; set; }
    public Guid? VariantId { get; set; }
    public ItemVariant? Variant { get; set; }
    public decimal ReturnQuantity { get; set; } = 0m;
    public decimal UnitPrice { get; set; } = 0m;
    public decimal GstRate { get; set; } = 0m;
    public decimal TotalAmount { get; set; } = 0m;
}
