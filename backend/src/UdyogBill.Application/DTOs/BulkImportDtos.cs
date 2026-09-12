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
    decimal WholesalePrice = 0m
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
    string? FssaiNumber
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
