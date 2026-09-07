using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

#region 1. Common Query & Filter Requests

public record P0ReportFilterRequest(
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? FinancialYear = null,
    Guid? BranchId = null,
    Guid? WarehouseId = null,
    Guid? PartyId = null,
    string? CustomerType = null,
    Guid? ItemId = null,
    Guid? CategoryId = null,
    Guid? BrandId = null,
    Guid? SalesmanUserId = null,
    int? InvoiceStatus = null,
    int? PaymentStatus = null,
    int? PaymentMode = null,
    decimal? GstRate = null,
    string? StateCode = null,
    string? SearchTerm = null,
    string? GroupBy = null, // "date", "customer", "product", "category", "brand", "salesman", "branch", "warehouse", "mode"
    string? SortBy = null,
    bool SortDescending = true,
    int PageNumber = 1,
    int PageSize = 50
);

#endregion

#region 2. Sales Register Detailed DTOs

public record SalesRegisterLineItemDto(
    Guid InvoiceId,
    string InvoiceNumber,
    DateTime InvoiceDate,
    Guid? PartyId,
    string CustomerName,
    string? CustomerGstin,
    string CustomerType,
    Guid? SalesmanUserId,
    string? SalesmanName,
    Guid ItemId,
    string ProductName,
    string Sku,
    string? Barcode,
    string? HsnCode,
    string? BatchNumber,
    DateTime? ExpiryDate,
    decimal Quantity,
    string UomCode,
    decimal Rate,
    decimal GrossAmount,
    decimal DiscountAmount,
    decimal TaxableAmount,
    decimal GstRate,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal IgstAmount,
    decimal CessAmount,
    decimal TotalTax,
    decimal NetInvoiceValue,
    decimal PaidAmount,
    decimal OutstandingAmount,
    string PaymentStatus,
    string PrimaryPaymentMode,
    Guid BranchId,
    string BranchName,
    Guid WarehouseId,
    string WarehouseName,
    string BillingStateCode
);

public record SalesRegisterDetailedReportDto(
    IReadOnlyList<SalesRegisterLineItemDto> Items,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages,
    decimal TotalQuantity,
    decimal TotalGross,
    decimal TotalDiscount,
    decimal TotalTaxable,
    decimal TotalCgst,
    decimal TotalSgst,
    decimal TotalIgst,
    decimal TotalCess,
    decimal TotalTax,
    decimal TotalNetAmount,
    decimal TotalPaid,
    decimal TotalOutstanding,
    int TotalInvoicesCount
);

#endregion

#region 3. Sales Summary DTOs

public record SalesSummaryGroupRowDto(
    string GroupKey,
    string GroupLabel,
    int InvoiceCount,
    decimal TotalQuantitySold,
    decimal GrossSales,
    decimal ReturnsAmount,
    decimal NetSales,
    decimal TaxableSales,
    decimal TaxAmount,
    decimal DiscountAmount,
    decimal PaidAmount,
    decimal OutstandingAmount
);

public record SalesSummaryReportDto(
    IReadOnlyList<SalesSummaryGroupRowDto> Rows,
    decimal GrandGrossSales,
    decimal GrandReturnsAmount,
    decimal GrandNetSales,
    decimal GrandTaxableSales,
    decimal GrandTaxAmount,
    decimal GrandDiscountAmount,
    decimal GrandPaidAmount,
    decimal GrandOutstandingAmount,
    int GrandInvoiceCount,
    decimal GrandQuantitySold
);

#endregion

#region 4. Purchase Register Detailed DTOs

public record PurchaseRegisterLineItemDto(
    Guid BillId,
    string BillNumber,
    string? SupplierBillNumber,
    DateTime BillDate,
    Guid PartyId,
    string SupplierName,
    string? SupplierGstin,
    Guid ItemId,
    string ProductName,
    string Sku,
    string? HsnCode,
    string? BatchNumber,
    decimal Quantity,
    string UomCode,
    decimal PurchaseRate,
    decimal GrossAmount,
    decimal DiscountAmount,
    decimal TaxableAmount,
    decimal GstRate,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal IgstAmount,
    decimal CessAmount,
    decimal TotalTax,
    decimal NetBillValue,
    decimal PaidAmount,
    decimal OutstandingAmount,
    string PaymentStatus,
    Guid BranchId,
    string BranchName,
    Guid WarehouseId,
    string WarehouseName
);

public record PurchaseRegisterDetailedReportDto(
    IReadOnlyList<PurchaseRegisterLineItemDto> Items,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages,
    decimal TotalQuantity,
    decimal TotalGross,
    decimal TotalDiscount,
    decimal TotalTaxable,
    decimal TotalCgst,
    decimal TotalSgst,
    decimal TotalIgst,
    decimal TotalCess,
    decimal TotalTax,
    decimal TotalNetAmount,
    decimal TotalPaid,
    decimal TotalOutstanding,
    int TotalBillsCount
);

#endregion

#region 5. Purchase Summary DTOs

public record PurchaseSummaryGroupRowDto(
    string GroupKey,
    string GroupLabel,
    int BillCount,
    decimal TotalQuantityPurchased,
    decimal GrossPurchase,
    decimal ReturnsAmount,
    decimal NetPurchase,
    decimal TaxablePurchase,
    decimal TaxAmount,
    decimal DiscountAmount,
    decimal PaidAmount,
    decimal OutstandingAmount
);

public record PurchaseSummaryReportDto(
    IReadOnlyList<PurchaseSummaryGroupRowDto> Rows,
    decimal GrandGrossPurchase,
    decimal GrandReturnsAmount,
    decimal GrandNetPurchase,
    decimal GrandTaxablePurchase,
    decimal GrandTaxAmount,
    decimal GrandDiscountAmount,
    decimal GrandPaidAmount,
    decimal GrandOutstandingAmount,
    int GrandBillCount,
    decimal GrandQuantityPurchased
);

#endregion

#region 6. Real-Time Stock Balance DTOs

public record RealTimeStockBalanceItemDto(
    Guid ItemId,
    string Sku,
    string ProductName,
    string CategoryName,
    string BrandName,
    Guid WarehouseId,
    string WarehouseName,
    Guid? BatchId,
    string? BatchNumber,
    DateTime? ExpiryDate,
    decimal CurrentStock,
    decimal AvailableStock,
    decimal ReservedStock,
    decimal MinimumAlertStock,
    decimal ReorderQuantity,
    decimal DeficitQuantity,
    decimal CostRate,
    decimal StockValue,
    string StockStatus // "Available", "Low", "Critical", "Zero", "Negative", "Overstock"
);

public record RealTimeStockBalanceReportDto(
    IReadOnlyList<RealTimeStockBalanceItemDto> Items,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages,
    decimal TotalCurrentStock,
    decimal TotalStockValue,
    int TotalLowStockCount,
    int TotalZeroStockCount,
    int TotalNegativeStockCount
);

#endregion

#region 7. Stock Valuation DTOs

public record StockValuationItemDto(
    Guid ItemId,
    string Sku,
    string ProductName,
    string CategoryName,
    string BrandName,
    Guid WarehouseId,
    string WarehouseName,
    Guid? BatchId,
    string? BatchNumber,
    decimal OpeningQuantity,
    decimal InwardQuantity,
    decimal OutwardQuantity,
    decimal AdjustmentQuantity,
    decimal ClosingQuantity,
    decimal CostRate,
    decimal StockValue,
    string ValuationMethod // "PurchaseCost", "WeightedAverage"
);

public record StockValuationReportDto(
    IReadOnlyList<StockValuationItemDto> Items,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages,
    decimal GrandOpeningQuantity,
    decimal GrandInwardQuantity,
    decimal GrandOutwardQuantity,
    decimal GrandAdjustmentQuantity,
    decimal GrandClosingQuantity,
    decimal GrandStockValue
);

#endregion

#region 8. Debtor (Receivable) Ageing Schedule DTOs

public record DebtorAgeingInvoiceRowDto(
    Guid PartyId,
    string CustomerName,
    string? Phone,
    Guid InvoiceId,
    string InvoiceNumber,
    DateTime InvoiceDate,
    DateTime DueDate,
    decimal InvoiceAmount,
    decimal PaidAmount,
    decimal OutstandingAmount,
    int DaysOverdue,
    string AgeingBucket, // "NotDue", "1-15", "16-30", "31-45", "46-60", "61-90", "91-180", "181-365", "365+"
    decimal CreditLimit,
    decimal CreditUtilizationPercent
);

public record DebtorAgeingCustomerSummaryDto(
    Guid PartyId,
    string CustomerName,
    string? Phone,
    decimal CreditLimit,
    decimal TotalReceivable,
    decimal NotDueAmount,
    decimal Days1To15,
    decimal Days16To30,
    decimal Days31To45,
    decimal Days46To60,
    decimal Days61To90,
    decimal Days91To180,
    decimal Days181To365,
    decimal Days365Plus
);

public record DebtorAgeingReportDto(
    IReadOnlyList<DebtorAgeingInvoiceRowDto> Invoices,
    IReadOnlyList<DebtorAgeingCustomerSummaryDto> CustomerSummaries,
    decimal GrandTotalReceivable,
    decimal GrandNotDue,
    decimal GrandOverdue,
    decimal TotalDays1To15,
    decimal TotalDays16To30,
    decimal TotalDays31To45,
    decimal TotalDays46To60,
    decimal TotalDays61To90,
    decimal TotalDays91To180,
    decimal TotalDays181To365,
    decimal TotalDays365Plus
);

#endregion

#region 9. Creditor (Payable) Ageing Schedule DTOs

public record CreditorAgeingBillRowDto(
    Guid PartyId,
    string SupplierName,
    string? Phone,
    Guid BillId,
    string BillNumber,
    string? SupplierBillNumber,
    DateTime BillDate,
    DateTime DueDate,
    decimal BillAmount,
    decimal PaidAmount,
    decimal OutstandingAmount,
    int DaysOverdue,
    string AgeingBucket
);

public record CreditorAgeingSupplierSummaryDto(
    Guid PartyId,
    string SupplierName,
    string? Phone,
    decimal TotalPayable,
    decimal NotDueAmount,
    decimal Days1To15,
    decimal Days16To30,
    decimal Days31To45,
    decimal Days46To60,
    decimal Days61To90,
    decimal Days91To180,
    decimal Days181To365,
    decimal Days365Plus
);

public record CreditorAgeingReportDto(
    IReadOnlyList<CreditorAgeingBillRowDto> Bills,
    IReadOnlyList<CreditorAgeingSupplierSummaryDto> SupplierSummaries,
    decimal GrandTotalPayable,
    decimal GrandNotDue,
    decimal GrandOverdue,
    decimal TotalDays1To15,
    decimal TotalDays16To30,
    decimal TotalDays31To45,
    decimal TotalDays46To60,
    decimal TotalDays61To90,
    decimal TotalDays91To180,
    decimal TotalDays181To365,
    decimal TotalDays365Plus
);

#endregion

#region 10. True Profit & Loss (P&L) DTOs

public record PnLExpenseCategoryBreakdownDto(
    Guid CategoryId,
    string CategoryName,
    decimal Amount,
    decimal PercentageOfRevenue
);

public record TruePnLReportDto(
    DateTime FromDateUtc,
    DateTime ToDateUtc,
    string? FinancialYear,
    // Revenue
    decimal GrossSalesRevenue,
    decimal SalesReturnAmount,
    decimal NetSalesRevenue,
    // COGS
    decimal OpeningStockValuation,
    decimal GrossPurchasesAmount,
    decimal PurchaseReturnAmount,
    decimal NetPurchasesAmount,
    decimal ClosingStockValuation,
    decimal TotalCostOfGoodsSold,
    // Gross Profit
    decimal GrossProfitAmount,
    decimal GrossProfitMarginPercent,
    // Operating Expenses
    IReadOnlyList<PnLExpenseCategoryBreakdownDto> OperatingExpenses,
    decimal TotalOperatingExpenses,
    // Other Incomes
    decimal OtherIncomesAmount,
    // Net Profit
    decimal NetProfitAmount,
    decimal NetProfitMarginPercent
);

#endregion

#region 11. Company / Brand Stock & Sales Statement DTOs

public record CompanyStockSalesItemDto(
    Guid ItemId,
    string ItemSku,
    string ItemName,
    Guid? BrandId,
    string CompanyName,
    string Packing,
    decimal Mrp,
    decimal PurchasePrice,
    decimal SalePrice,
    string PurchaseUnit,
    string SaleUnit,
    decimal StockInQuantity,
    decimal CurrentStock,
    decimal CurrentStockValue,
    decimal SoldQuantity,
    decimal SaleValue
);

public record CompanyStockSalesReportDto(
    IReadOnlyList<CompanyStockSalesItemDto> Items,
    decimal GrandStockInQty,
    decimal GrandCurrentStock,
    decimal GrandStockValue,
    decimal GrandSoldQty,
    decimal GrandSaleValue,
    int TotalItemsCount,
    DateTime FromDate,
    DateTime ToDate,
    string? FilterCompanyName
);

#endregion
