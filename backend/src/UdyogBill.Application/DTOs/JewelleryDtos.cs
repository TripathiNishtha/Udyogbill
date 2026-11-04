using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.Jewellery;

namespace UdyogBill.Application.DTOs;

// --- 1. Daily Metal Rate DTOs ---
public record DailyMetalRateDto(
    Guid Id,
    DateOnly RateDate,
    decimal Gold24K_Per10g,
    decimal Gold22K_Per10g,
    decimal Gold18K_Per10g,
    decimal Gold14K_Per10g,
    decimal Silver999_PerKg,
    decimal Silver925_PerKg,
    decimal Platinum950_Per10g,
    decimal OldGoldBuyingRate24K_Per1g,
    decimal OldSilverBuyingRate_Per1g,
    bool IsActive,
    string? SourceNote
);

public record SetDailyMetalRateRequest(
    DateOnly? RateDate,
    decimal Gold24K_Per10g,
    decimal Gold22K_Per10g,
    decimal Gold18K_Per10g,
    decimal Gold14K_Per10g,
    decimal Silver999_PerKg,
    decimal Silver925_PerKg,
    decimal Platinum950_Per10g,
    decimal OldGoldBuyingRate24K_Per1g,
    decimal OldSilverBuyingRate_Per1g,
    string? SourceNote
);

// --- 2. Jewellery Item Attributes DTOs ---
public record DiamondDetailDto(
    Guid Id,
    StoneType StoneType,
    string Cut,
    string Clarity,
    string Color,
    int PiecesCount,
    decimal WeightCarats,
    decimal WeightCents,
    decimal RatePerCarat,
    decimal TotalAmount,
    string? CertNumber
);

public record SaveDiamondDetailRequest(
    StoneType StoneType,
    string Cut,
    string Clarity,
    string Color,
    int PiecesCount,
    decimal WeightCarats,
    decimal RatePerCarat,
    string? CertNumber
);

public record JewelleryItemAttributeDto(
    Guid Id,
    Guid ItemId,
    JewelleryType JewelleryType,
    MetalType MetalType,
    string PurityKarat,
    decimal PurityPercentage,
    decimal GrossWeight,
    decimal StoneWeight,
    decimal NetWeight,
    decimal WastagePercentage,
    decimal WastageGrams,
    MakingChargeType MakingChargeType,
    decimal MakingChargeRate,
    string? HUID,
    string? HallmarkingCenter,
    string? CertificateNumber,
    string? ImitationColorFinish,
    int PiecesPerBox,
    IReadOnlyList<DiamondDetailDto> Diamonds
);

public record SaveJewelleryItemAttributeRequest(
    Guid ItemId,
    JewelleryType JewelleryType,
    MetalType MetalType,
    string PurityKarat,
    decimal PurityPercentage,
    decimal GrossWeight,
    decimal StoneWeight,
    decimal WastagePercentage,
    MakingChargeType MakingChargeType,
    decimal MakingChargeRate,
    string? HUID,
    string? HallmarkingCenter,
    string? CertificateNumber,
    string? ImitationColorFinish,
    int PiecesPerBox,
    List<SaveDiamondDetailRequest>? Diamonds
);

// --- 3. 0% Error Calculation Engine DTOs ---
public record CalculateJewelleryPriceRequest(
    JewelleryType JewelleryType,
    MetalType MetalType,
    string PurityKarat,
    decimal PurityPercentage,
    decimal GrossWeight,
    decimal StoneWeight,
    decimal WastagePercentage,
    MakingChargeType MakingChargeType,
    decimal MakingChargeRate,
    decimal? OverrideMetalRatePer10g,
    decimal? DiamondTotalAmount,
    decimal Quantity = 1
);

public record CalculateJewelleryPriceResponse(
    decimal GrossWeight,
    decimal StoneWeight,
    decimal NetWeight,
    decimal WastageGrams,
    decimal BillableWeight,
    decimal AppliedMetalRatePer10g,
    decimal MetalValue,
    decimal MakingCharges,
    decimal DiamondTotalAmount,
    decimal FineGold24KEquivalent,
    decimal TaxableAmount,
    decimal GstRatePercent,
    decimal GstAmount,
    decimal GrandTotal
);

// --- 4. Old Gold Exchange / Scrap Buyback DTOs ---
public record CalculateOldGoldExchangeRequest(
    MetalType MetalType,
    decimal OldGrossWeight,
    decimal OldDustStoneWeight,
    decimal MeltingPurityTunch,
    decimal? OverrideBuyingRatePerGram
);

public record CalculateOldGoldExchangeResponse(
    decimal OldGrossWeight,
    decimal OldDustStoneWeight,
    decimal OldNetWeight,
    decimal MeltingPurityTunch,
    decimal PureWeightEquivalent,
    decimal AppliedBuyingRatePerGram,
    decimal TotalExchangeValuation
);

public record OldGoldExchangeVoucherDto(
    Guid Id,
    string VoucherNumber,
    Guid? PartyId,
    Guid? InvoiceId,
    string? CustomerName,
    string? CustomerMobile,
    string? CustomerPanAadhaar,
    string ItemDescription,
    MetalType MetalType,
    decimal OldGrossWeight,
    decimal OldDustStoneWeight,
    decimal OldNetWeight,
    decimal MeltingPurityTunch,
    decimal PureWeightEquivalent,
    decimal BuyingRatePerGram,
    decimal TotalExchangeValuation,
    string TestingMethod,
    OldGoldStatus Status,
    string? Notes,
    DateTimeOffset CreatedAtUtc
);

public record CreateOldGoldExchangeRequest(
    Guid? PartyId,
    Guid? InvoiceId,
    string? CustomerName,
    string? CustomerMobile,
    string? CustomerPanAadhaar,
    string ItemDescription,
    MetalType MetalType,
    decimal OldGrossWeight,
    decimal OldDustStoneWeight,
    decimal MeltingPurityTunch,
    decimal? OverrideBuyingRatePerGram,
    string TestingMethod = "Karattometer_XRF",
    OldGoldStatus Status = OldGoldStatus.AdjustedAgainstInvoice,
    string? Notes = null
);

// --- 5. Karigar Artisan Ledger DTOs ---
public record KarigarAccountDto(
    Guid Id,
    string Code,
    string Name,
    string Mobile,
    string? Address,
    string? City,
    string? Speciality,
    decimal PureGoldBalanceGrams,
    decimal PureSilverBalanceGrams,
    decimal LabourBalanceRupees,
    bool IsActive
);

public record CreateKarigarAccountRequest(
    string Name,
    string Mobile,
    string? Address,
    string? City,
    string? Speciality
);

public record KarigarTransactionDto(
    Guid Id,
    Guid KarigarId,
    KarigarTransactionType TransactionType,
    string ReferenceNumber,
    decimal IssuePureMetalGrams,
    decimal ReceivedGrossWeight,
    decimal ReceivedNetWeight,
    decimal ReceivedPurityPct,
    decimal ReceivedFineWeight,
    decimal AllowedWastageWeight,
    decimal MetalShortageWeight,
    decimal LabourCharges,
    decimal LabourAmountPaid,
    string? Description,
    DateTimeOffset CreatedAtUtc
);

public record CreateKarigarTransactionRequest(
    Guid KarigarId,
    KarigarTransactionType TransactionType,
    string ReferenceNumber,
    decimal IssuePureMetalGrams = 0,
    decimal ReceivedGrossWeight = 0,
    decimal ReceivedNetWeight = 0,
    decimal ReceivedPurityPct = 0,
    decimal AllowedWastageWeight = 0,
    decimal LabourCharges = 0,
    decimal LabourAmountPaid = 0,
    string? Description = null
);

// --- 6. Gold Savings Scheme (Kitty / 11+1) DTOs ---
public record GoldSavingsSchemeDto(
    Guid Id,
    string SchemeCode,
    Guid? CustomerId,
    string CustomerName,
    string CustomerMobile,
    decimal MonthlyAmount,
    int TotalMonths,
    decimal JewellerBonusContribution,
    DateOnly StartDate,
    DateOnly MaturityDate,
    decimal TotalDeposited,
    int InstallmentsPaid,
    GoldSavingsSchemeStatus Status,
    Guid? RedeemedInvoiceId,
    IReadOnlyList<GoldSavingsInstallmentDto> Installments
);

public record GoldSavingsInstallmentDto(
    Guid Id,
    int InstallmentNumber,
    DateOnly PaymentDate,
    decimal Amount,
    string PaymentMode,
    string? ReferenceNumber,
    string ReceiptNumber
);

public record CreateGoldSavingsSchemeRequest(
    Guid? CustomerId,
    string CustomerName,
    string CustomerMobile,
    decimal MonthlyAmount,
    int TotalMonths = 11,
    decimal? JewellerBonusContribution = null,
    DateOnly? StartDate = null
);

public record AddSchemeInstallmentRequest(
    decimal Amount,
    string PaymentMode = "UPI",
    string? ReferenceNumber = null
);

public record RedeemSchemeRequest(
    Guid InvoiceId
);

// --- 7. Girvi Loan / Gold Loan DTOs ---
public record GirviLoanDto(
    Guid Id,
    string GirviNumber,
    Guid? CustomerId,
    string CustomerName,
    string CustomerMobile,
    string? CustomerAddress,
    string? CustomerAadhaarPan,
    string PledgedOrnamentsDescription,
    int TotalPledgedItemsCount,
    decimal GrossWeight,
    decimal NetWeight,
    decimal EstimatedMarketValuation,
    decimal PrincipalAmount,
    decimal MonthlyInterestRatePct,
    DateOnly LoanDate,
    DateOnly DueDate,
    DateOnly? RedeemedDate,
    decimal TotalInterestCollected,
    decimal TotalPrincipalReturned,
    GirviStatus Status,
    string? SafeVaultLockerNumber,
    string? Notes
);

public record CreateGirviLoanRequest(
    Guid? CustomerId,
    string CustomerName,
    string CustomerMobile,
    string? CustomerAddress,
    string? CustomerAadhaarPan,
    string PledgedOrnamentsDescription,
    int TotalPledgedItemsCount,
    decimal GrossWeight,
    decimal NetWeight,
    decimal PrincipalAmount,
    decimal MonthlyInterestRatePct = 1.50m,
    int LoanDurationMonths = 12,
    string? SafeVaultLockerNumber = null,
    string? Notes = null
);

public record RedeemGirviLoanRequest(
    decimal PrincipalPaid,
    decimal InterestPaid,
    string PaymentMode = "Cash",
    string? Notes = null
);
