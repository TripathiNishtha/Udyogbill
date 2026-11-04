using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.Sales;

namespace UdyogBill.Application.DTOs;

public record SalesOrderListDto(
    Guid Id,
    string OrderNumber,
    DateTime OrderDate,
    DateTime? DeliveryDueDate,
    SalesOrderStatus Status,
    string StatusText,
    Guid BranchId,
    string BranchName,
    Guid? PartyId,
    string CustomerName,
    string? CustomerPhone,
    string? CustomerGSTIN,
    decimal TotalAmount,
    decimal AdvancePaidAmount,
    Guid? ConvertedInvoiceId,
    string? ConvertedInvoiceNumber,
    Guid? ConvertedChallanId,
    string? ConvertedChallanNumber,
    DateTime? ConvertedAtUtc,
    int ItemCount,
    DateTimeOffset CreatedAtUtc
);

public record SalesOrderItemDto(
    Guid Id,
    Guid ItemId,
    string ItemName,
    string? HsnCode,
    Guid? VariantId,
    string? VariantName,
    decimal Quantity,
    Guid? UomId,
    string? UomCode,
    decimal UnitPrice,
    decimal DiscountPercent,
    decimal DiscountAmount,
    decimal TaxableAmount,
    decimal GstRate,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal IgstAmount,
    decimal CessAmount,
    decimal TotalAmount,
    string? BatchNumber,
    string AttributesJson
);

public record SalesOrderDetailsDto(
    Guid Id,
    string OrderNumber,
    SalesOrderStatus Status,
    string StatusText,
    Guid BranchId,
    string BranchName,
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
    DateTime OrderDate,
    DateTime? DeliveryDueDate,
    TaxSupplyType TaxSupplyType,
    decimal SubTotal,
    decimal ItemDiscountTotal,
    decimal OrderDiscountPercent,
    decimal OrderDiscountAmount,
    decimal TaxableAmount,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal IgstAmount,
    decimal CessAmount,
    decimal RoundOff,
    decimal TotalAmount,
    decimal AdvancePaidAmount,
    Guid? QuotationId,
    string? QuotationNumber,
    Guid? ConvertedInvoiceId,
    string? ConvertedInvoiceNumber,
    Guid? ConvertedChallanId,
    string? ConvertedChallanNumber,
    DateTime? ConvertedAtUtc,
    string? PoNumber,
    DateTime? PoDate,
    string? Notes,
    string? TermsAndConditions,
    string AttributesJson,
    bool IsCancelled,
    string? CancellationReason,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<SalesOrderItemDto> Items
);

public record CreateSalesOrderItemRequest(
    Guid ItemId,
    Guid? VariantId,
    string? ItemName,
    string? HsnCode,
    decimal Quantity,
    Guid? UomId,
    string? UomCode,
    decimal UnitPrice,
    decimal DiscountPercent,
    decimal DiscountAmount,
    decimal GstRate,
    string? BatchNumber,
    string? AttributesJson
);

public record CreateSalesOrderRequest
{
    public Guid? Id { get; set; }
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
    public string BillingStateCode { get; set; } = string.Empty;
    public string ShippingStateCode { get; set; } = string.Empty;
    public string PlaceOfSupply { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime? DeliveryDueDate { get; set; }
    public decimal OrderDiscountPercent { get; set; }
    public decimal OrderDiscountAmount { get; set; }
    public decimal AdvancePaidAmount { get; set; }
    public Guid? QuotationId { get; set; }
    public string? PoNumber { get; set; }
    public DateTime? PoDate { get; set; }
    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }
    public string? AttributesJson { get; set; } = "{}";
    public List<CreateSalesOrderItemRequest> Items { get; set; } = new();
}

public record ConvertSalesOrderRequest(
    DateTime? TransactionDate,
    Guid? WarehouseId,
    PaymentMode? PrimaryPaymentMode,
    decimal? PaidAmount,
    string? PaymentReferenceNumber,
    string? VehicleNumber,
    Guid? TransporterId,
    string? Notes
);
