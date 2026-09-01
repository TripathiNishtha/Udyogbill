using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Enums;

namespace UdyogBill.Application.DTOs;

public class OfflineSalesInvoiceItemSyncDto
{
    public Guid? ItemId { get; set; }
    public string ItemSku { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? HsnCode { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TaxRatePercent { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
}

public class OfflineSalesInvoiceSyncDto
{
    public Guid ClientOfflineId { get; set; }
    public string OfflineInvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDateUtc { get; set; } = DateTime.UtcNow;
    public Guid? PartyId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerGSTIN { get; set; }
    public string? CustomerPhone { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public PaymentMode PaymentMode { get; set; } = PaymentMode.Cash;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.FullyPaid;
    public string? Notes { get; set; }
    public List<OfflineSalesInvoiceItemSyncDto> Items { get; set; } = new();
}

public class OfflinePaymentSyncDto
{
    public Guid ClientOfflineId { get; set; }
    public Guid? SalesInvoiceId { get; set; }
    public Guid? PartyId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMode PaymentMode { get; set; }
    public string? ReferenceNumber { get; set; }
    public DateTime PaymentDateUtc { get; set; } = DateTime.UtcNow;
}

public class OfflineCustomerSyncDto
{
    public Guid ClientOfflineId { get; set; }
    public string LegalName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? GSTIN { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
}

public class SyncPushRequest
{
    public List<OfflineSalesInvoiceSyncDto> Invoices { get; set; } = new();
    public List<OfflinePaymentSyncDto> Payments { get; set; } = new();
    public List<OfflineCustomerSyncDto> Customers { get; set; } = new();
}

public class SyncedRecordDto
{
    public Guid ClientOfflineId { get; set; }
    public Guid ServerId { get; set; }
    public string ServerAssignedNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "SYNCED";
    public string? Message { get; set; }
}

public class SyncPushResultDto
{
    public List<SyncedRecordDto> SyncedInvoices { get; set; } = new();
    public List<SyncedRecordDto> SyncedPayments { get; set; } = new();
    public List<SyncedRecordDto> SyncedCustomers { get; set; } = new();
    public int TotalSyncedCount => SyncedInvoices.Count + SyncedPayments.Count + SyncedCustomers.Count;
    public DateTime SyncedAtUtc { get; set; } = DateTime.UtcNow;
}

public class SyncPullRequest
{
    public DateTime? LastSyncTimestampUtc { get; set; }
}

public class CatalogItemSyncDto
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string? HsnCode { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal Mrp { get; set; }
    public decimal TaxRatePercent { get; set; }
    public decimal CurrentStock { get; set; }
    public string? UnitName { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public class CustomerPartySyncDto
{
    public Guid Id { get; set; }
    public string LegalName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? GSTIN { get; set; }
    public decimal CurrentBalance { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public class SyncPullResultDto
{
    public List<CatalogItemSyncDto> UpdatedItems { get; set; } = new();
    public List<CustomerPartySyncDto> UpdatedCustomers { get; set; } = new();
    public DateTime ServerTimestampUtc { get; set; } = DateTime.UtcNow;
}

public class SyncStatusDto
{
    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;
    public int TotalCatalogItems { get; set; }
    public int TotalCustomers { get; set; }
    public int TotalInvoices { get; set; }
    public bool IsHealthy { get; set; } = true;
}
