using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

public class LedgerEntryDto
{
    public Guid Id { get; set; }
    public DateTime TransactionDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string EntryType { get; set; } = string.Empty;
    public string? ReferenceDocumentType { get; set; }
    public string? ReferenceDocumentNumber { get; set; }
    public Guid? ReferenceDocumentId { get; set; }
    public string? PartyName { get; set; }
    public Guid? PartyId { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal Balance { get; set; }
    public string? PaymentMode { get; set; }
}

public class LedgerStatementDto
{
    public Guid? PartyId { get; set; }
    public string? PartyName { get; set; }
    public string? PartyGSTIN { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public decimal ClosingBalance { get; set; }
    public List<LedgerEntryDto> Entries { get; set; } = new();
}

public class ExportFileResult
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "text/csv";
    public byte[] FileBytes { get; set; } = Array.Empty<byte>();
}

public class PnLChartPoint
{
    public string Period { get; set; } = string.Empty; // e.g. "Apr 2026", "2026-08-30"
    public decimal Revenue { get; set; }
    public decimal Purchases { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal NetProfit { get; set; }
}

public class PnLReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal TotalSalesRevenue { get; set; }
    public decimal TotalDiscountGiven { get; set; }
    public decimal NetSalesRevenue { get; set; }
    public decimal TotalPurchasesCost { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal GrossMarginPercent { get; set; }
    public decimal OperatingExpenses { get; set; }
    public decimal NetProfit { get; set; }
    public decimal NetMarginPercent { get; set; }
    public List<PnLChartPoint> ChartData { get; set; } = new();
}

public class GstSummaryRowDto
{
    public string RateSlab { get; set; } = string.Empty; // e.g. "5%", "12%", "18%", "28%", "0%"
    public decimal TaxableValue { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal IgstAmount { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalValue { get; set; }
}

public class GstHsnSummaryRowDto
{
    public string HSNCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string UOM { get; set; } = string.Empty;
    public decimal TotalQuantity { get; set; }
    public decimal TaxableValue { get; set; }
    public decimal TaxRate { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal IgstAmount { get; set; }
    public decimal TotalTax { get; set; }
}

public class Gstr1ReportDto
{
    public string TenantName { get; set; } = string.Empty;
    public string GSTIN { get; set; } = string.Empty;
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int TotalB2BInvoices { get; set; }
    public decimal TotalB2BTaxable { get; set; }
    public decimal TotalB2BTax { get; set; }
    public int TotalB2CInvoices { get; set; }
    public decimal TotalB2CTaxable { get; set; }
    public decimal TotalB2CTax { get; set; }
    public decimal TotalOutwardTaxable { get; set; }
    public decimal TotalOutwardTax { get; set; }
    public List<GstSummaryRowDto> RateWiseSummary { get; set; } = new();
    public List<GstHsnSummaryRowDto> HsnSummary { get; set; } = new();
}

public class Gstr3bReportDto
{
    public string TenantName { get; set; } = string.Empty;
    public string GSTIN { get; set; } = string.Empty;
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    // Outward Supplies (Tax Liability)
    public decimal OutwardTaxableValue { get; set; }
    public decimal OutwardIgst { get; set; }
    public decimal OutwardCgst { get; set; }
    public decimal OutwardSgst { get; set; }
    public decimal TotalOutputTaxLiability { get; set; }
    // Inward Supplies (Eligible Input Tax Credit - ITC)
    public decimal InwardTaxableValue { get; set; }
    public decimal InwardIgst { get; set; }
    public decimal InwardCgst { get; set; }
    public decimal InwardSgst { get; set; }
    public decimal TotalEligibleItc { get; set; }
    // Net GST Payable
    public decimal NetIgstPayable { get; set; }
    public decimal NetCgstPayable { get; set; }
    public decimal NetSgstPayable { get; set; }
    public decimal TotalNetGstPayable { get; set; }
}

public class SummaryReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal TotalSales { get; set; }
    public int TotalInvoicesCount { get; set; }
    public decimal TotalCollected { get; set; }
    public decimal TotalPendingReceivables { get; set; }
    public decimal TotalPurchases { get; set; }
    public int TotalPurchaseBillsCount { get; set; }
    public decimal TotalPayables { get; set; }
    public decimal OutputGst { get; set; }
    public decimal InputGstItc { get; set; }
    public decimal NetGstPayable { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal NetProfit { get; set; }
}
