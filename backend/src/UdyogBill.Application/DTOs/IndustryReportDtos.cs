using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

#region 1. Hardware, Sanitary & Paint Industry Reports

public record ThekedarProjectLedgerRowDto(
    Guid InvoiceId,
    string InvoiceNumber,
    DateTime InvoiceDate,
    Guid? PartyId,
    string ContractorName,
    string? ContractorPhone,
    string SiteName,
    int ItemsCount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal BalanceAmount,
    string PaymentStatus,
    string? VehicleNumber,
    string? Notes
);

public record ThekedarProjectLedgerReportDto(
    List<ThekedarProjectLedgerRowDto> Rows,
    int TotalSitesCount,
    decimal TotalBilledAmount,
    decimal TotalReceivedAmount,
    decimal TotalOutstandingAmount,
    int TotalCount,
    int PageNumber,
    int PageSize
);

public record PainterCommissionRowDto(
    Guid InvoiceId,
    string InvoiceNumber,
    DateTime InvoiceDate,
    string CustomerName,
    string PainterName,
    string? PainterPhone,
    decimal TaxableAmount,
    decimal CommissionPercent,
    decimal CommissionEarned,
    string PayoutStatus
);

public record PainterCommissionReportDto(
    List<PainterCommissionRowDto> Rows,
    int TotalPaintersCount,
    decimal TotalReferredSales,
    decimal TotalCommissionEarned,
    decimal TotalCommissionPending,
    int TotalCount,
    int PageNumber,
    int PageSize
);

public record DualUnitReconciliationRowDto(
    Guid ItemId,
    string ItemName,
    string Sku,
    string PrimaryUom,
    string SecondaryUom,
    decimal ConversionFactor,
    decimal PrimaryStockQty,
    decimal CalculatedSecondaryStockQty,
    decimal PhysicalCountPrimaryQty,
    decimal VarianceQty,
    decimal StockValue
);

public record DualUnitReconciliationReportDto(
    List<DualUnitReconciliationRowDto> Rows,
    int TotalItemsTracked,
    int MultiUnitItemsCount,
    int ItemsWithVarianceCount,
    int TotalCount,
    int PageNumber,
    int PageSize
);

public record PaintTintingAuditRowDto(
    Guid InvoiceId,
    string InvoiceNumber,
    DateTime InvoiceDate,
    string BasePaintName,
    string BasePaintSku,
    decimal BaseLitersSold,
    string ShadeCodeOrName,
    decimal ColorantConsumedOunces,
    decimal ColorantCostEstimate,
    decimal TotalBilledAmount
);

public record PaintTintingAuditReportDto(
    List<PaintTintingAuditRowDto> Rows,
    int TotalTintedBillsCount,
    decimal TotalBaseLitersTinted,
    decimal TotalColorantOuncesConsumed,
    decimal TotalColorantCostEstimate,
    int TotalCount,
    int PageNumber,
    int PageSize
);

#endregion

#region 2. Auto Spare Parts Industry Reports

public record MechanicReferralRowDto(
    Guid InvoiceId,
    string InvoiceNumber,
    DateTime InvoiceDate,
    string CustomerName,
    string? VehicleNumber,
    string MechanicName,
    string? MechanicPhone,
    decimal PartsTotalAmount,
    decimal CommissionPercent,
    decimal CommissionEarned,
    string SettlementStatus
);

public record MechanicReferralReportDto(
    List<MechanicReferralRowDto> Rows,
    int TotalMechanicsCount,
    decimal TotalPartsReferredSales,
    decimal TotalCommissionPayable,
    int TotalCount,
    int PageNumber,
    int PageSize
);

public record VehicleFitmentVelocityRowDto(
    string VehicleType,
    string Make,
    string Model,
    Guid ItemId,
    string PartName,
    string PartSku,
    string? OemPartNumber,
    decimal QuantitySold,
    decimal TotalRevenue,
    decimal CurrentStock,
    string? RackLocation
);

public record VehicleFitmentVelocityReportDto(
    List<VehicleFitmentVelocityRowDto> Rows,
    int TotalVehicleModelsTracked,
    int TotalPartsSoldUnits,
    decimal TotalFitmentRevenue,
    int TotalCount,
    int PageNumber,
    int PageSize
);

public record AutopartsDeadstockRowDto(
    Guid ItemId,
    string PartName,
    string PartSku,
    string? CategoryName,
    decimal CurrentStock,
    decimal PurchaseRate,
    decimal LockedCapitalValue,
    DateTime? LastSoldDate,
    int DaysSinceLastSale,
    string? RackLocation
);

public record AutopartsDeadstockReportDto(
    List<AutopartsDeadstockRowDto> Rows,
    int TotalDeadstockItemsCount,
    decimal TotalLockedCapitalValue,
    int TotalCount,
    int PageNumber,
    int PageSize
);

public record BatteryScrapExchangeRowDto(
    Guid InvoiceId,
    string InvoiceNumber,
    DateTime InvoiceDate,
    string CustomerName,
    string NewBatteryPurchased,
    string OldBatteryExchanged,
    decimal OldBatteryScrapAllowance,
    decimal ScrapWeightKg,
    decimal NetPayableReceived
);

public record BatteryScrapExchangeReportDto(
    List<BatteryScrapExchangeRowDto> Rows,
    int TotalExchangesCount,
    decimal TotalScrapAllowanceGiven,
    decimal TotalScrapWeightKg,
    int TotalCount,
    int PageNumber,
    int PageSize
);

#endregion

#region 3. Pharma & Chemist Industry Reports

public record DoctorPrescriptionSalesRowDto(
    Guid? DoctorId,
    string DoctorName,
    string? Qualification,
    string? Specialization,
    string? ClinicHospitalName,
    int PrescriptionsCount,
    decimal TotalMedicineSales,
    string? TopCompositionPrescribed,
    decimal CommissionPercent,
    decimal CommissionPayable
);

public record DoctorPrescriptionSalesReportDto(
    List<DoctorPrescriptionSalesRowDto> Rows,
    int TotalDoctorsActive,
    int TotalPrescriptionsFilled,
    decimal TotalPrescriptionSalesValue,
    decimal TotalDoctorCommissionPayable,
    int TotalCount,
    int PageNumber,
    int PageSize
);

public record NearExpiryClaimRowDto(
    Guid BatchId,
    Guid ItemId,
    string MedicineName,
    string Sku,
    string BatchNumber,
    DateTime ExpiryDate,
    int DaysRemaining,
    Guid? DistributorPartyId,
    string DistributorName,
    decimal StockQty,
    decimal PurchaseRate,
    decimal ClaimableAmount,
    string? RackLocation
);

public record NearExpiryClaimsReportDto(
    List<NearExpiryClaimRowDto> Rows,
    int TotalBatchesNearExpiry,
    decimal TotalClaimableDebitValue,
    int TotalDistributorsCount,
    int TotalCount,
    int PageNumber,
    int PageSize
);

public record ScheduleH1AuditRowDto(
    Guid InvoiceId,
    string InvoiceNumber,
    DateTime InvoiceDate,
    string PatientName,
    string? PatientAddress,
    string? PatientPhone,
    string DoctorName,
    string? DoctorRegistrationNumber,
    string MedicineName,
    string BatchNumber,
    decimal QuantityDispensed,
    string ScheduleType
);

public record ScheduleH1AuditReportDto(
    List<ScheduleH1AuditRowDto> Rows,
    int TotalPrescriptionsAudited,
    decimal TotalScheduleUnitsDispensed,
    int TotalCount,
    int PageNumber,
    int PageSize
);

public record LooseStripBreakageRowDto(
    Guid ItemId,
    string MedicineName,
    string Sku,
    string BatchNumber,
    decimal LooseTabletsSold,
    decimal FullStripsCutCount,
    decimal EstimatedBreakageQty,
    decimal BreakageLossAmount
);

public record LooseStripBreakageReportDto(
    List<LooseStripBreakageRowDto> Rows,
    int TotalMedicinesCut,
    decimal TotalBreakageLossAmount,
    int TotalCount,
    int PageNumber,
    int PageSize
);

#endregion

#region 4. Jewellery & Bullion Industry Reports

public record KarigarWastageRowDto(
    DateTime TransactionDate,
    string KarigarName,
    string MetalType,
    decimal IssuedWeightGrams,
    int PurityKarat,
    string? ReceivedItemDescription,
    decimal ReceivedWeightGrams,
    decimal WastageLossGrams,
    decimal WastagePercent,
    decimal MakingChargesPaid
);

public record KarigarWastageReportDto(
    List<KarigarWastageRowDto> Rows,
    decimal TotalGoldIssuedGrams,
    decimal TotalJewelleryReceivedGrams,
    decimal TotalWastageLossGrams,
    decimal TotalMakingChargesPaid,
    int TotalCount,
    int PageNumber,
    int PageSize
);

public record JewelleryM2mValuationRowDto(
    string Karatage,
    decimal TotalWeightGrams,
    decimal BookPurchaseRatePerGram,
    decimal BookStockValue,
    decimal TodayBoardRatePerGram,
    decimal CurrentMarketValue,
    decimal UnrealizedM2mGainLoss
);

public record JewelleryM2mValuationReportDto(
    List<JewelleryM2mValuationRowDto> Rows,
    decimal TotalGoldStockGrams,
    decimal TotalBookStockValue,
    decimal TotalCurrentMarketValue,
    decimal NetUnrealizedM2mGainLoss,
    DateTime RateAsOfDate
);

public record KaratagePurityStockRowDto(
    string KaratageName,
    int KaratPurityNumber,
    decimal GrossWeightGrams,
    decimal StoneWeightGrams,
    decimal NetGoldWeightGrams,
    decimal PureFineGoldWeightGrams,
    int ItemsCount
);

public record KaratagePurityStockReportDto(
    List<KaratagePurityStockRowDto> Rows,
    decimal TotalGrossWeightGrams,
    decimal TotalNetGoldWeightGrams,
    decimal TotalFineGoldGrams,
    int TotalJewelleryPiecesCount
);

#endregion
