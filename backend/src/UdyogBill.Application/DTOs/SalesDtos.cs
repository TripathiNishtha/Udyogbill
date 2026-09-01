using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Shared;

namespace UdyogBill.Application.DTOs;

public record CreateSalesInvoiceItemRequest
{
    public Guid ItemId { get; set; }
    public Guid? BatchId { get; set; }
    public decimal Quantity { get; set; } = 1m;
    public Guid UomId { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal Mrp { get; set; }
    public decimal FreeQuantity { get; set; }
    public string? Packing { get; set; }
    public string? HsnCode { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? AttributesJson { get; set; } = "{}";
}

public record CreateSalesInvoiceRequest
{
    public InvoiceType InvoiceType { get; set; } = InvoiceType.TaxInvoice;
    public Guid BranchId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid? PartyId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerGSTIN { get; set; }
    public string? CustomerPAN { get; set; }
    public string? BillingAddress { get; set; }
    public string? ShippingAddress { get; set; }
    public string BillingStateCode { get; set; } = "27";
    public string ShippingStateCode { get; set; } = "27";
    public string PlaceOfSupply { get; set; } = "Maharashtra";
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public decimal InvoiceDiscountPercent { get; set; }
    public PaymentMode PrimaryPaymentMode { get; set; } = PaymentMode.Cash;
    public decimal PaidAmount { get; set; }
    public string? PaymentReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }
    public string? AttributesJson { get; set; } = "{}";

    // B2B Logistics & Transport
    public string? TransporterName { get; set; }
    public string? TransporterId { get; set; }
    public string? VehicleNumber { get; set; }
    public string? LrNumber { get; set; }
    public DateTime? LrDate { get; set; }
    public string? EWayBillNumber { get; set; }
    public DateTime? EWayBillDate { get; set; }
    public string? PoNumber { get; set; }
    public DateTime? PoDate { get; set; }
    public bool IsReverseCharge { get; set; } = false;

    public List<CreateSalesInvoiceItemRequest>? Items { get; set; }
}

public record RecordInvoicePaymentRequest(
    Guid InvoiceId,
    DateTime PaymentDate,
    decimal Amount,
    PaymentMode PaymentMode,
    string? TransactionReference = null,
    string? Notes = null
);

public record CancelInvoiceRequest(
    string CancellationReason
);

public record SalesInvoiceListDto(
    Guid Id,
    Guid TenantId,
    string InvoiceNumber,
    InvoiceType InvoiceType,
    InvoiceStatus Status,
    Guid BranchId,
    string BranchName,
    Guid? PartyId,
    string CustomerName,
    string? CustomerPhone,
    string? CustomerGSTIN,
    DateTime InvoiceDate,
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

public record SalesInvoiceItemDto(
    Guid Id,
    Guid InvoiceId,
    Guid ItemId,
    string ItemSku,
    string ItemName,
    string? HsnCode,
    string? Barcode,
    Guid? BatchId,
    string? BatchNumber,
    DateTime? ExpiryDate,
    decimal Quantity,
    Guid UomId,
    string UomCode,
    decimal UnitPrice,
    decimal Mrp,
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
    decimal TotalAmount,
    string AttributesJson
);

public record SalesInvoicePaymentDto(
    Guid Id,
    Guid InvoiceId,
    DateTime PaymentDate,
    decimal Amount,
    PaymentMode PaymentMode,
    string PaymentModeName,
    string? TransactionReference,
    string? Notes,
    DateTimeOffset CreatedAtUtc
);

public record GstTaxSummaryItemDto(
    string HsnCode,
    decimal TaxableValue,
    decimal GstRate,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal IgstAmount,
    decimal TotalTax
);

public record SalesInvoiceDetailsDto(
    Guid Id,
    Guid TenantId,
    string InvoiceNumber,
    InvoiceType InvoiceType,
    InvoiceStatus Status,
    Guid BranchId,
    string BranchName,
    string BranchGstin,
    string BranchAddress,
    string BranchStateCode,
    Guid WarehouseId,
    string WarehouseName,
    Guid? PartyId,
    string CustomerName,
    string? CustomerPhone,
    string? CustomerEmail,
    string? CustomerGSTIN,
    string? CustomerPAN,
    string? BillingAddress,
    string? ShippingAddress,
    string BillingStateCode,
    string ShippingStateCode,
    string PlaceOfSupply,
    DateTime InvoiceDate,
    DateTime? DueDate,
    TaxSupplyType TaxSupplyType,
    decimal SubTotal,
    decimal ItemDiscountTotal,
    decimal InvoiceDiscountPercent,
    decimal InvoiceDiscountAmount,
    decimal TaxableAmount,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal IgstAmount,
    decimal CessAmount,
    decimal RoundOff,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal BalanceAmount,
    PaymentMode PrimaryPaymentMode,
    PaymentStatus PaymentStatus,
    string? PaymentReferenceNumber,
    string? Notes,
    string? TermsAndConditions,
    string AttributesJson,
    string? TransporterName,
    string? TransporterId,
    string? VehicleNumber,
    string? LrNumber,
    DateTime? LrDate,
    string? EWayBillNumber,
    DateTime? EWayBillDate,
    string? PoNumber,
    DateTime? PoDate,
    bool IsReverseCharge,
    bool IsCancelled,
    string? CancellationReason,
    DateTime? CancelledAtUtc,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<SalesInvoiceItemDto> Items,
    IReadOnlyList<SalesInvoicePaymentDto> Payments,
    IReadOnlyList<GstTaxSummaryItemDto> TaxSummary
);

public record CreateSalesReturnItemRequest
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

public record CreateSalesReturnRequest
{
    public Guid? OriginalSalesInvoiceId { get; set; }
    public string? OriginalInvoiceNumber { get; set; }
    public Guid PartyId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public Guid WarehouseId { get; set; }
    public string ReturnReason { get; set; } = "CustomerReturn";
    public bool RestockToWarehouse { get; set; } = true;
    public string? Notes { get; set; }
    public List<CreateSalesReturnItemRequest> Items { get; set; } = new();
}

public record SalesReturnItemDto(
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

public record SalesReturnDto(
    Guid Id,
    string CreditNoteNumber,
    DateTimeOffset ReturnDate,
    Guid? OriginalSalesInvoiceId,
    string? OriginalInvoiceNumber,
    Guid PartyId,
    string CustomerName,
    Guid BranchId,
    Guid WarehouseId,
    string ReturnReason,
    bool RestockToWarehouse,
    decimal SubTotal,
    decimal TaxAmount,
    decimal TotalAmount,
    string? Notes,
    bool IsCancelled,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<SalesReturnItemDto> Items
);
