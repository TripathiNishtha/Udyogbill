using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

public record BulkProductImportRow(
    string Sku,
    string Name,
    string? CategoryName,
    string? BrandName,
    string? HsnCode,
    string? Barcode,
    string? PrimaryUom,
    decimal TaxRate,
    decimal CessRate,
    decimal PurchasePrice,
    decimal SalePrice,
    decimal Mrp,
    decimal MinimumStockAlert,
    decimal ReorderQuantity,
    decimal OpeningStock,
    string? BatchNumber,
    DateTime? ExpiryDate,
    string? RackLocation,
    string? Description,
    decimal WholesalePrice = 0m,
    string? Packing = null,
    string? DrugComposition = null,
    string? SecondaryUom = null,
    decimal ConversionFactor = 1m,
    bool IsService = false,
    bool TaxInclusive = false
);

public record BulkProductImportRequest(
    Guid? WarehouseId,
    List<BulkProductImportRow> Products,
    bool OverwriteExisting = false
);

public record BulkImportRowError(
    int RowIndex,
    string SkuOrIdentifier,
    string ErrorMessage
);

public record BulkProductImportResult(
    int TotalProcessed,
    int SuccessCount,
    int FailedCount,
    int SkippedCount,
    List<BulkImportRowError> Errors,
    List<string> CreatedItemIds
);

public record BulkPartyImportRow(
    string Code,
    string LegalName,
    string TradeName,
    string PartyType, // "Customer", "Supplier", "Both"
    string? GSTIN,
    string? PAN,
    string? Mobile,
    string? Email,
    string? ContactPerson,
    string? AddressLine1,
    string? City,
    string? State,
    string? StateCode,
    string? Pincode,
    decimal CreditLimit,
    int CreditDays,
    decimal OpeningBalance,
    string OpeningBalanceType, // "Debit", "Credit"
    string? DrugLicenseNumber,
    string? FssaiNumber,
    string? ShippingAddressLine1 = null,
    string? GstRegistrationType = null,
    string? MsmeRegistrationNumber = null,
    string? UpiId = null
);

public record BulkPartyImportRequest(
    List<BulkPartyImportRow> Parties,
    bool OverwriteExisting = false
);

public record BulkPartyImportResult(
    int TotalProcessed,
    int SuccessCount,
    int FailedCount,
    int SkippedCount,
    List<BulkImportRowError> Errors,
    List<string> CreatedPartyIds
);

public record CsvTemplateFileDto(
    string FileName,
    string ContentType,
    byte[] FileBytes
);

public record BulkInvoiceImportRow(
    string InvoiceNumber,
    DateTime InvoiceDate,
    string CustomerName,
    string? CustomerMobile,
    string? CustomerGstin,
    decimal TaxableAmount,
    decimal GstAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    string? PaymentMode,
    string? ItemsSummary,
    decimal FreeQuantity = 0m
);

public record BulkInvoiceImportRequest(
    List<BulkInvoiceImportRow> Invoices,
    Guid? WarehouseId = null,
    Guid? BranchId = null,
    bool OverwriteExisting = false
);

public record BulkInvoiceImportResult(
    int TotalProcessed,
    int SuccessCount,
    int FailedCount,
    int SkippedCount,
    decimal TotalRevenueImported,
    List<BulkImportRowError> Errors,
    List<string> CreatedInvoiceIds
);

public record BulkPurchaseImportRow(
    string PurchaseBillNumber,
    DateTime BillDate,
    string SupplierName,
    string? SupplierMobile,
    string? SupplierGstin,
    decimal TaxableAmount,
    decimal GstAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    string? PaymentMode,
    string? ItemsSummary,
    decimal FreeQuantity = 0m,
    string? Remarks = null
);

public record BulkPurchaseImportRequest(
    List<BulkPurchaseImportRow> Purchases,
    Guid? WarehouseId = null,
    Guid? BranchId = null,
    bool OverwriteExisting = false
);

public record BulkPurchaseImportResult(
    int TotalProcessed,
    int SuccessCount,
    int FailedCount,
    int SkippedCount,
    decimal TotalPurchaseAmount,
    List<BulkImportRowError> Errors,
    List<string> CreatedBillIds
);

public record BulkExpenseImportRow(
    DateTime ExpenseDate,
    string CategoryName,
    decimal Amount,
    decimal TaxAmount,
    decimal TotalAmount,
    string PaymentMode,
    string? PaidTo,
    string? ReferenceNumber,
    bool HasGstInvoice = false,
    string? VendorGstin = null,
    string? Notes = null
);

public record BulkExpenseImportRequest(
    List<BulkExpenseImportRow> Expenses,
    bool OverwriteExisting = false
);

public record BulkExpenseImportResult(
    int TotalProcessed,
    int SuccessCount,
    int FailedCount,
    int SkippedCount,
    decimal TotalExpenseAmount,
    List<BulkImportRowError> Errors,
    List<string> CreatedExpenseIds
);

public record BulkLedgerImportRow(
    string AccountGroup,
    string AccountName,
    string? AccountNumber,
    string? IfscCode,
    decimal OpeningBalance,
    string BalanceType, // "Debit", "Credit"
    string? Remarks = null
);

public record BulkLedgerImportRequest(
    List<BulkLedgerImportRow> Ledgers,
    bool OverwriteExisting = false
);

public record BulkLedgerImportResult(
    int TotalProcessed,
    int SuccessCount,
    int FailedCount,
    int SkippedCount,
    List<BulkImportRowError> Errors,
    List<string> CreatedAccountIds
);

public record BulkSalesReturnImportRow(
    string CreditNoteNumber,
    DateTime ReturnDate,
    string? OriginalInvoiceNumber,
    string CustomerName,
    string? CustomerMobile,
    string? CustomerGstin,
    string ReturnReason,
    decimal TaxableAmount,
    decimal GstAmount,
    decimal TotalAmount,
    string RefundStatus = "Pending",
    string? RefundMode = null,
    string? ItemsSummary = null,
    string? Notes = null
);

public record BulkSalesReturnImportRequest(
    Guid? WarehouseId,
    Guid? BranchId,
    List<BulkSalesReturnImportRow> Returns,
    bool OverwriteExisting = false
);

public record BulkSalesReturnImportResult(
    int TotalProcessed,
    int SuccessCount,
    int FailedCount,
    int SkippedCount,
    decimal TotalReturnAmount,
    List<BulkImportRowError> Errors,
    List<string> CreatedReturnIds
);

public record BulkPurchaseReturnImportRow(
    string DebitNoteNumber,
    DateTime ReturnDate,
    string? OriginalPurchaseBillNumber,
    string SupplierName,
    string? SupplierMobile,
    string? SupplierGstin,
    string ReturnReason,
    decimal TaxableAmount,
    decimal GstAmount,
    decimal TotalAmount,
    string? RefundMode = null,
    string? ItemsSummary = null,
    string? Notes = null
);

public record BulkPurchaseReturnImportRequest(
    Guid? WarehouseId,
    Guid? BranchId,
    List<BulkPurchaseReturnImportRow> Returns,
    bool OverwriteExisting = false
);

public record BulkPurchaseReturnImportResult(
    int TotalProcessed,
    int SuccessCount,
    int FailedCount,
    int SkippedCount,
    decimal TotalReturnAmount,
    List<BulkImportRowError> Errors,
    List<string> CreatedReturnIds
);

