using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

// ==========================================
// 1. UNIVERSAL REPORTS DTOs
// ==========================================

// 1.1 Full Balance Sheet
public class BalanceSheetDto
{
    public DateTime AsOfDate { get; set; }
    public decimal TotalAssets { get; set; }
    public decimal TotalLiabilities { get; set; }
    public decimal TotalEquity { get; set; }
    public decimal NetWorkingCapital { get; set; }
    public decimal CurrentPeriodNetProfit { get; set; }
    public bool IsBalanced => Math.Abs(TotalAssets - (TotalLiabilities + TotalEquity)) < 1.0m;

    public List<BalanceSheetSectionDto> AssetsSections { get; set; } = new();
    public List<BalanceSheetSectionDto> LiabilitiesSections { get; set; } = new();
}

public class BalanceSheetSectionDto
{
    public string SectionName { get; set; } = string.Empty; // e.g., "Current Assets", "Fixed Assets"
    public decimal SectionTotal { get; set; }
    public List<BalanceSheetLineItemDto> Items { get; set; } = new();
}

public class BalanceSheetLineItemDto
{
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Note { get; set; }
}

// 1.2 Bank Book & BRS
public class BankReconciliationReportDto
{
    public Guid BankAccountId { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal BookBalance { get; set; }
    public decimal ClearedBalance { get; set; }
    public decimal UnclearedDeposits { get; set; }
    public decimal UnclearedCheques { get; set; }
    public decimal EstimatedBankBalance => BookBalance + UnclearedCheques - UnclearedDeposits;
    public List<BankReconciliationEntryDto> Entries { get; set; } = new();
}

public class BankReconciliationEntryDto
{
    public Guid Id { get; set; }
    public DateTime TransactionDate { get; set; }
    public DateTime? ClearedDate { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public string Particulars { get; set; } = string.Empty;
    public string PartyName { get; set; } = string.Empty;
    public decimal Debit { get; set; }  // Deposit
    public decimal Credit { get; set; } // Withdrawal
    public bool IsCleared { get; set; }
    public string InstrumentType { get; set; } = string.Empty; // Cheque, NEFT, UPI, Cash
}

// 1.3 Bill & Item-Wise Gross Profit Margin
public class GrossProfitMarginReportDto
{
    public decimal TotalSalesRevenue { get; set; }
    public decimal TotalCogs { get; set; }
    public decimal TotalGrossProfit { get; set; }
    public decimal AverageMarginPercent => TotalSalesRevenue > 0 ? Math.Round((TotalGrossProfit / TotalSalesRevenue) * 100, 2) : 0;
    public int TotalItemsSold { get; set; }
    public List<GrossProfitRowDto> Rows { get; set; } = new();
}

public class GrossProfitRowDto
{
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string ItemSku { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public decimal QuantitySold { get; set; }
    public decimal SalePricePerUnit { get; set; }
    public decimal TotalSaleValue { get; set; }
    public decimal PurchaseCostPerUnit { get; set; }
    public decimal TotalCostOfGoodsSold { get; set; }
    public decimal GrossProfitAmount { get; set; }
    public decimal MarginPercent { get; set; }
    public string ProfitStatus { get; set; } = "High"; // High (>25%), Normal (10-25%), Low (<10%), Loss (<0%)
}

// 1.4 Fast, Slow & Non-Moving Stock Velocity
public class StockVelocityReportDto
{
    public int FastMovingCount { get; set; }
    public int SlowMovingCount { get; set; }
    public int DeadstockCount { get; set; }
    public decimal LockedDeadstockValuation { get; set; }
    public List<StockVelocityRowDto> Items { get; set; } = new();
}

public class StockVelocityRowDto
{
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public decimal CurrentStock { get; set; }
    public decimal PurchaseCost { get; set; }
    public decimal TotalInventoryValue => CurrentStock * PurchaseCost;
    public decimal SalesQtyLast30Days { get; set; }
    public decimal SalesQtyLast90Days { get; set; }
    public int DaysSinceLastSale { get; set; }
    public decimal StockTurnoverRatio { get; set; }
    public string MovementClassification { get; set; } = "Fast"; // Fast, Slow, Non-Moving, Deadstock (>180D)
}

// 1.5 Breakage, Damage & Stock Scrap Audit
public class StockWastageAuditReportDto
{
    public decimal TotalDamageQuantity { get; set; }
    public decimal TotalFinancialLoss { get; set; }
    public int TotalIncidentCount { get; set; }
    public List<StockWastageRowDto> Incidents { get; set; } = new();
}

public class StockWastageRowDto
{
    public Guid Id { get; set; }
    public DateTime IncidentDate { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string ItemCode { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public decimal DamagedQuantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal UnitCost { get; set; }
    public decimal TotalLossAmount { get; set; }
    public string DamageReason { get; set; } = string.Empty; // Handling, Transit, Leakage, Expired, Lab Testing
    public string GodownWarehouse { get; set; } = string.Empty;
    public string ReportedBy { get; set; } = string.Empty;
    public string ReferenceNumber { get; set; } = string.Empty;
}

// 1.6 Negative Stock Variance Register
public class NegativeStockReportDto
{
    public int NegativeItemCount { get; set; }
    public decimal TotalDeficitUnits { get; set; }
    public decimal EstimatedReplenishmentCost { get; set; }
    public List<NegativeStockRowDto> NegativeItems { get; set; } = new();
}

public class NegativeStockRowDto
{
    public Guid ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public decimal NegativeStockQuantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal EstimatedPurchaseCost { get; set; }
    public decimal TotalDeficitValue => Math.Abs(NegativeStockQuantity) * EstimatedPurchaseCost;
    public DateTime? LastSaleDate { get; set; }
    public string LastSaleInvoiceNumber { get; set; } = string.Empty;
    public string RecommendedAction { get; set; } = "Inward Purchase Bill Pending";
}

// 1.7 E-Way Bill & E-Invoice Audit Register
public class EWayEInvoiceRegisterReportDto
{
    public int TotalEWayBills { get; set; }
    public int TotalEInvoices { get; set; }
    public decimal TotalRegulatedValue { get; set; }
    public List<EWayEInvoiceRowDto> Records { get; set; } = new();
}

public class EWayEInvoiceRowDto
{
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerGstin { get; set; } = string.Empty;
    public decimal InvoiceValue { get; set; }
    public string? EWayBillNumber { get; set; }
    public DateTime? EWayBillDate { get; set; }
    public DateTime? EWayBillValidUpto { get; set; }
    public string? VehicleNumber { get; set; }
    public string? TransporterName { get; set; }
    public string? EInvoiceIrn { get; set; }
    public string? EInvoiceAckNo { get; set; }
    public DateTime? EInvoiceAckDate { get; set; }
    public string Status { get; set; } = "Active"; // Active, Cancelled, Expired
}


// ==========================================
// 2. PHARMA & FMCG SPECIFIC REPORTS DTOs
// ==========================================

// 2.1 Narcotics / NDPS Form 3C/3D Statutory Register
public class NdpsRegisterReportDto
{
    public int ControlledItemCount { get; set; }
    public decimal TotalDispensedQuantity { get; set; }
    public List<NdpsRegisterRowDto> Entries { get; set; } = new();
}

public class NdpsRegisterRowDto
{
    public DateTime EntryDate { get; set; }
    public string DrugName { get; set; } = string.Empty;
    public string Composition { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public decimal OpeningBalance { get; set; }
    public decimal QuantityReceived { get; set; }
    public string InwardSupplierBillNo { get; set; } = string.Empty;
    public decimal QuantityDispensed { get; set; }
    public string OutwardInvoiceNumber { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string PatientAddress { get; set; } = string.Empty;
    public string PrescribingDoctor { get; set; } = string.Empty;
    public string DoctorRegistrationNo { get; set; } = string.Empty;
    public decimal ClosingBalance { get; set; }
    public string PharmacistSignatureStatus { get; set; } = "Verified";
}

// 2.2 TB Drug Statutory Register (Nikshay / Schedule H2)
public class TbDrugRegisterReportDto
{
    public int TotalTbPatientsReported { get; set; }
    public decimal TotalDosageUnitsDispensed { get; set; }
    public List<TbDrugRegisterRowDto> Records { get; set; } = new();
}

public class TbDrugRegisterRowDto
{
    public DateTime DispensedDate { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Age { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string FullAddress { get; set; } = string.Empty;
    public string PrescribingDoctor { get; set; } = string.Empty;
    public string DoctorRegNo { get; set; } = string.Empty;
    public string HospitalClinicName { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public decimal QuantityDispensed { get; set; }
    public int CourseDurationDays { get; set; }
}

// 2.3 Salt & Molecule Stock Finder
public class SaltStockFinderReportDto
{
    public int TotalMolecules { get; set; }
    public int TotalStockedAlternatives { get; set; }
    public List<SaltMoleculeGroupDto> Molecules { get; set; } = new();
}

public class SaltMoleculeGroupDto
{
    public Guid SaltId { get; set; }
    public string MoleculeName { get; set; } = string.Empty; // e.g. "Paracetamol 650mg"
    public string TherapeuticCategory { get; set; } = string.Empty; // e.g. "Analgesic / Antipyretic"
    public int AlternativeCount => Brands.Count;
    public decimal TotalAvailableStock { get; set; }
    public List<SaltAlternativeBrandDto> Brands { get; set; } = new();
}

public class SaltAlternativeBrandDto
{
    public Guid ItemId { get; set; }
    public string BrandName { get; set; } = string.Empty; // e.g. "Dolo 650", "Calpol 650", "Pacimol 650"
    public string Manufacturer { get; set; } = string.Empty;
    public string Packaging { get; set; } = string.Empty; // 10 Tablets / 15 Tablets
    public decimal CurrentStock { get; set; }
    public decimal Mrp { get; set; }
    public decimal PurchaseRate { get; set; }
    public decimal SalePrice { get; set; }
    public decimal MarginPercent => SalePrice > 0 ? Math.Round(((SalePrice - PurchaseRate) / SalePrice) * 100, 1) : 0;
    public string RackLocation { get; set; } = string.Empty;
}

// 2.4 Expired Stock Quarantine & Scrap Register
public class ExpiredQuarantineReportDto
{
    public int ExpiredBatchCount { get; set; }
    public decimal TotalExpiredUnits { get; set; }
    public decimal TotalClaimableDebitValue { get; set; }
    public List<ExpiredQuarantineBatchDto> Batches { get; set; } = new();
}

public class ExpiredQuarantineBatchDto
{
    public Guid BatchId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public int DaysExpired { get; set; }
    public decimal QuarantinedQuantity { get; set; }
    public decimal PurchaseRate { get; set; }
    public decimal TotalLossValue => QuarantinedQuantity * PurchaseRate;
    public string SupplierName { get; set; } = string.Empty;
    public string QuarantineLocation { get; set; } = "Godown B - Expiry Dump Rack";
    public string ReturnClaimStatus { get; set; } = "Pending Debit Note"; // Pending, Claimed, Scrap Approved
}

// 2.5 Substitute Sale & Margin Shift Analysis
public class SubstituteMarginReportDto
{
    public int TotalSubstitutedTransactions { get; set; }
    public decimal TotalOriginalRevenue { get; set; }
    public decimal TotalRealizedRevenue { get; set; }
    public decimal NetIncrementalMarginEarned { get; set; }
    public List<SubstituteMarginRowDto> Rows { get; set; } = new();
}

public class SubstituteMarginRowDto
{
    public DateTime TransactionDate { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string PrescribedMolecule { get; set; } = string.Empty;
    public string PrescribedBrandName { get; set; } = string.Empty;
    public decimal PrescribedBrandMarginPct { get; set; }
    public string DispensedBrandName { get; set; } = string.Empty; // e.g. PCD / Generic Alternative
    public decimal DispensedBrandMarginPct { get; set; }
    public decimal QuantitySold { get; set; }
    public decimal ExtraProfitEarned { get; set; }
    public string CustomerChemistName { get; set; } = string.Empty;
}

// 2.6 Trade Scheme Claims & 10+1 Difference Register
public class TradeSchemeClaimsReportDto
{
    public int TotalClaimEligibleBills { get; set; }
    public decimal TotalFreeGoodsValue { get; set; }
    public decimal PendingWholesalerCreditNotes { get; set; }
    public List<TradeSchemeClaimRowDto> Claims { get; set; } = new();
}

public class TradeSchemeClaimRowDto
{
    public Guid BillId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string PurchaseBillNumber { get; set; } = string.Empty;
    public DateTime BillDate { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string SchemeType { get; set; } = "10+1 Free"; // 10+1, 10+2, Half Rate, Special Rebate
    public decimal PaidQuantity { get; set; }
    public decimal FreeSchemeQuantity { get; set; }
    public decimal RatePerUnit { get; set; }
    public decimal SchemeValueDisbursed => FreeSchemeQuantity * RatePerUnit;
    public string ClaimStatus { get; set; } = "Credit Note Pending"; // Pending, Claim Received, Settled
    public string? CreditNoteNumber { get; set; }
}

// 1.8 Serial Number Inventory Aging Report (Electronics & Appliances)
public class SerialAgingReportDto
{
    public int TotalSerialCount { get; set; }
    public int CriticalAgingCount { get; set; } // > 90 days
    public decimal TotalCapitalAtRisk { get; set; }
    public List<SerialAgingRowDto> Rows { get; set; } = new();
}

public class SerialAgingRowDto
{
    public string SerialNumber { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string ItemSku { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public DateTime InwardDate { get; set; }
    public int DaysInStock { get; set; }
    public decimal PurchaseCost { get; set; }
    public decimal Mrp { get; set; }
    public string Status { get; set; } = "InStock";
}

