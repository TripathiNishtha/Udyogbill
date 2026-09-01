using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Domain.Entities.Sales;

namespace UdyogBill.Application.DTOs;

public record CancelDocRequest(string CancellationReason);

// --- Purchase Order DTOs ---
public record CreatePurchaseOrderItemRequest(
    Guid ItemId,
    decimal Quantity,
    Guid UomId,
    decimal UnitPrice,
    decimal DiscountPercent = 0m,
    string? AttributesJson = null
);

public record CreatePurchaseOrderRequest(
    Guid BranchId,
    Guid WarehouseId,
    Guid PartyId,
    DateTime OrderDate,
    DateTime? ExpectedDeliveryDate,
    string? Notes = null,
    string? TermsAndConditions = null,
    string? AttributesJson = null,
    IReadOnlyList<CreatePurchaseOrderItemRequest>? Items = null
);

public record PurchaseOrderItemDto(
    Guid Id,
    Guid ItemId,
    string ItemSku,
    string ItemName,
    string? HsnCode,
    decimal OrderQuantity,
    decimal ReceivedQuantity,
    decimal RemainingQuantity,
    Guid UomId,
    string UomCode,
    decimal UnitPrice,
    decimal DiscountPercent,
    decimal DiscountAmount,
    decimal TaxableAmount,
    decimal GstRate,
    decimal CgstRate,
    decimal CgstAmount,
    decimal SgstRate,
    decimal SgstAmount,
    decimal IgstRate,
    decimal IgstAmount,
    decimal CessRate,
    decimal CessAmount,
    decimal TotalAmount
);

public record PurchaseOrderListDto(
    Guid Id,
    Guid TenantId,
    string OrderNumber,
    PurchaseOrderStatus Status,
    Guid BranchId,
    string BranchName,
    Guid WarehouseId,
    string WarehouseName,
    Guid PartyId,
    string SupplierName,
    string? SupplierGSTIN,
    DateTime OrderDate,
    DateTime? ExpectedDeliveryDate,
    decimal TaxableAmount,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal IgstAmount,
    decimal TotalAmount,
    int TotalItemsCount,
    DateTimeOffset CreatedAtUtc
);

public record PurchaseOrderDetailsDto(
    Guid Id,
    Guid TenantId,
    string OrderNumber,
    PurchaseOrderStatus Status,
    Guid BranchId,
    string BranchName,
    Guid WarehouseId,
    string WarehouseName,
    Guid PartyId,
    string SupplierName,
    string? SupplierPhone,
    string? SupplierGSTIN,
    string? SupplierAddress,
    string SupplierStateCode,
    string PlaceOfSupply,
    DateTime OrderDate,
    DateTime? ExpectedDeliveryDate,
    TaxSupplyType TaxSupplyType,
    decimal SubTotal,
    decimal DiscountTotal,
    decimal TaxableAmount,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal IgstAmount,
    decimal CessAmount,
    decimal RoundOff,
    decimal TotalAmount,
    string? Notes,
    string? TermsAndConditions,
    bool IsCancelled,
    string? CancellationReason,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<PurchaseOrderItemDto> Items
);

// --- Goods Receipt Note (GRN) DTOs ---
public record ReceiveGrnItemRequest(
    Guid? PurchaseOrderItemId,
    Guid ItemId,
    string? BatchNumber,
    DateTime? ManufacturingDate,
    DateTime? ExpiryDate,
    decimal ReceivedQuantity,
    decimal AcceptedQuantity,
    decimal RejectedQuantity,
    Guid UomId,
    decimal UnitCost,
    string? RejectionReason = null
);

public record CreateGrnRequest(
    Guid? PurchaseOrderId,
    Guid BranchId,
    Guid WarehouseId,
    Guid PartyId,
    string? DeliveryChallanNumber,
    DateTime? DeliveryChallanDate,
    DateTime ReceivedDate,
    string? ReceivedBy = null,
    string? Remarks = null,
    IReadOnlyList<ReceiveGrnItemRequest>? Items = null
);

public record GrnItemDto(
    Guid Id,
    Guid? PurchaseOrderItemId,
    Guid ItemId,
    string ItemSku,
    string ItemName,
    Guid? BatchId,
    string? BatchNumber,
    DateTime? ManufacturingDate,
    DateTime? ExpiryDate,
    decimal ReceivedQuantity,
    decimal AcceptedQuantity,
    decimal RejectedQuantity,
    Guid UomId,
    string UomCode,
    decimal UnitCost,
    decimal TotalCost,
    string? RejectionReason
);

public record GrnListDto(
    Guid Id,
    Guid TenantId,
    string GrnNumber,
    GrnStatus Status,
    Guid? PurchaseOrderId,
    string? PurchaseOrderNumber,
    Guid BranchId,
    string BranchName,
    Guid WarehouseId,
    string WarehouseName,
    Guid PartyId,
    string SupplierName,
    string? DeliveryChallanNumber,
    DateTime ReceivedDate,
    int TotalItemsCount,
    DateTimeOffset CreatedAtUtc
);

public record GrnDetailsDto(
    Guid Id,
    Guid TenantId,
    string GrnNumber,
    GrnStatus Status,
    Guid? PurchaseOrderId,
    string? PurchaseOrderNumber,
    Guid BranchId,
    string BranchName,
    Guid WarehouseId,
    string WarehouseName,
    Guid PartyId,
    string SupplierName,
    string? DeliveryChallanNumber,
    DateTime? DeliveryChallanDate,
    DateTime ReceivedDate,
    string? ReceivedBy,
    string? Remarks,
    bool IsCancelled,
    string? CancellationReason,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<GrnItemDto> Items
);

// --- Purchase Bill (Vendor Invoice) DTOs ---
public record CreatePurchaseBillItemRequest
{
    public Guid ItemId { get; set; }
    public Guid? BatchId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal Quantity { get; set; } = 1m;
    public Guid UomId { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal Mrp { get; set; }
    public decimal FreeQuantity { get; set; }
    public string? Packing { get; set; }
    public string? HsnCode { get; set; }
    public string? AttributesJson { get; set; } = "{}";
}

public record CreatePurchaseBillRequest
{
    public Guid? PurchaseOrderId { get; set; }
    public Guid? GoodsReceiptNoteId { get; set; }
    public string? VendorInvoiceNumber { get; set; }
    public Guid BranchId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid PartyId { get; set; }
    public DateTime BillDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public PaymentMode PrimaryPaymentMode { get; set; } = PaymentMode.BankTransfer;
    public decimal PaidAmount { get; set; }
    public string? PaymentReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public string? AttributesJson { get; set; } = "{}";
    public List<CreatePurchaseBillItemRequest>? Items { get; set; }
}

public record RecordPurchaseBillPaymentRequest(
    DateTime PaymentDate,
    decimal Amount,
    PaymentMode PaymentMode,
    string? TransactionReference = null,
    string? BankName = null,
    string? Notes = null
);

public record PurchaseBillItemDto(
    Guid Id,
    Guid ItemId,
    string ItemSku,
    string ItemName,
    string? HsnCode,
    Guid? BatchId,
    string? BatchNumber,
    decimal Quantity,
    Guid UomId,
    string UomCode,
    decimal UnitPrice,
    decimal DiscountPercent,
    decimal DiscountAmount,
    decimal TaxableAmount,
    decimal GstRate,
    decimal CgstRate,
    decimal CgstAmount,
    decimal SgstRate,
    decimal SgstAmount,
    decimal IgstRate,
    decimal IgstAmount,
    decimal CessRate,
    decimal CessAmount,
    decimal TotalAmount
);

public record PurchaseBillPaymentDto(
    Guid Id,
    Guid PurchaseBillId,
    DateTime PaymentDate,
    decimal Amount,
    PaymentMode PaymentMode,
    string PaymentModeName,
    string? TransactionReference,
    string? BankName,
    string? Notes,
    DateTimeOffset CreatedAtUtc
);

public record PurchaseBillListDto(
    Guid Id,
    Guid TenantId,
    string BillNumber,
    string? VendorInvoiceNumber,
    PurchaseBillStatus Status,
    Guid BranchId,
    string BranchName,
    Guid PartyId,
    string SupplierName,
    string? SupplierGSTIN,
    DateTime BillDate,
    DateTime? DueDate,
    decimal TaxableAmount,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal IgstAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal BalanceAmount,
    PaymentStatus PaymentStatus,
    PaymentMode PrimaryPaymentMode,
    bool IsCancelled,
    DateTimeOffset CreatedAtUtc
);

public record PurchaseBillDetailsDto(
    Guid Id,
    Guid TenantId,
    string BillNumber,
    string? VendorInvoiceNumber,
    PurchaseBillStatus Status,
    Guid? PurchaseOrderId,
    string? PurchaseOrderNumber,
    Guid? GoodsReceiptNoteId,
    string? GrnNumber,
    Guid BranchId,
    string BranchName,
    Guid WarehouseId,
    string WarehouseName,
    Guid PartyId,
    string SupplierName,
    string? SupplierGSTIN,
    string? SupplierAddress,
    string SupplierStateCode,
    string PlaceOfSupply,
    DateTime BillDate,
    DateTime? DueDate,
    TaxSupplyType TaxSupplyType,
    decimal SubTotal,
    decimal DiscountTotal,
    decimal TaxableAmount,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal IgstAmount,
    decimal CessAmount,
    decimal RoundOff,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal BalanceAmount,
    PaymentStatus PaymentStatus,
    PaymentMode PrimaryPaymentMode,
    string? Notes,
    bool IsCancelled,
    string? CancellationReason,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<PurchaseBillItemDto> Items,
    IReadOnlyList<PurchaseBillPaymentDto> Payments,
    IReadOnlyList<GstTaxSummaryItemDto> TaxSummary
);

// --- Purchase Return (Debit Note) DTOs ---
public record CreatePurchaseReturnItemRequest
{
    public Guid ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string ItemSku { get; set; } = string.Empty;
    public Guid? BatchId { get; set; }
    public string? BatchNumber { get; set; }
    public decimal ReturnQuantity { get; set; } = 1m;
    public decimal UnitPrice { get; set; }
    public decimal GstRate { get; set; }
}

public record CreatePurchaseReturnRequest
{
    public Guid? OriginalPurchaseBillId { get; set; }
    public string? OriginalBillNumber { get; set; }
    public Guid PartyId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public Guid WarehouseId { get; set; }
    public string ReturnReason { get; set; } = "Defective";
    public string? Notes { get; set; }
    public List<CreatePurchaseReturnItemRequest> Items { get; set; } = new();
}

public record PurchaseReturnItemDto(
    Guid Id,
    Guid ItemId,
    string ItemName,
    string ItemSku,
    Guid? BatchId,
    string? BatchNumber,
    decimal ReturnQuantity,
    decimal UnitPrice,
    decimal GstRate,
    decimal TotalAmount
);

public record PurchaseReturnDto(
    Guid Id,
    string DebitNoteNumber,
    DateTimeOffset ReturnDate,
    Guid? OriginalPurchaseBillId,
    string? OriginalBillNumber,
    Guid PartyId,
    string SupplierName,
    Guid BranchId,
    Guid WarehouseId,
    string ReturnReason,
    decimal SubTotal,
    decimal TaxAmount,
    decimal TotalAmount,
    string? Notes,
    bool IsCancelled,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<PurchaseReturnItemDto> Items
);
