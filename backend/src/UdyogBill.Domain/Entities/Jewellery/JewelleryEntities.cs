using System;
using System.Collections.Generic;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;

namespace UdyogBill.Domain.Entities.Jewellery;

/// <summary>
/// Mode of Jewellery: Precious Metal (Gold/Silver/Diamond) vs Fashion & Imitation
/// </summary>
public enum JewelleryType
{
    PreciousMetal = 1,
    DiamondStudded = 2,
    PlainGold = 3,
    SilverArticles = 4,
    ImitationFashion = 5
}

public enum MetalType
{
    Gold = 1,
    Silver = 2,
    Platinum = 3,
    BrassAlloy = 4,
    Copper = 5,
    Other = 6
}

public enum MakingChargeType
{
    PerGram = 1,
    Percentage = 2,
    FlatPerPiece = 3
}

public enum StoneType
{
    Diamond = 1,
    Polki = 2,
    Kundan = 3,
    Ruby = 4,
    Emerald = 5,
    Sapphire = 6,
    Pearl = 7,
    CubicZirconia_CZ = 8,
    SyntheticStone = 9
}

public enum OldGoldStatus
{
    AdjustedAgainstInvoice = 1,
    PaidByCash = 2,
    SentToMeltingRefinery = 3,
    InSafeVault = 4
}

public enum KarigarTransactionType
{
    IssuePureMetal = 1,
    IssueAlloy = 2,
    ReceiveFinishedOrnaments = 3,
    ReceiveScrapDust = 4,
    LabourPayment = 5,
    MeltingWastageSettlement = 6
}

public enum GoldSavingsSchemeStatus
{
    Active = 1,
    Matured = 2,
    RedeemedAgainstPurchase = 3,
    Refunded = 4,
    Defaulted = 5
}

public enum GirviStatus
{
    OpenActive = 1,
    PrincipalRedeemed = 2,
    OrnamentAuctioned = 3
}

/// <summary>
/// Daily Board Metal Rates Master (Recorded per tenant or global board)
/// </summary>
public class DailyMetalRate : BaseTenantAuditableEntity
{
    public DateOnly RateDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    
    // Gold Rates (INR per 10 grams)
    public decimal Gold24K_Per10g { get; set; }
    public decimal Gold22K_Per10g { get; set; }
    public decimal Gold18K_Per10g { get; set; }
    public decimal Gold14K_Per10g { get; set; }

    // Silver Rates (INR per Kilogram & per Gram)
    public decimal Silver999_PerKg { get; set; }
    public decimal Silver925_PerKg { get; set; }

    // Platinum & Palladium
    public decimal Platinum950_Per10g { get; set; }

    // Scrap / Old Gold Buying Rates (INR per 1 gram pure)
    public decimal OldGoldBuyingRate24K_Per1g { get; set; }
    public decimal OldSilverBuyingRate_Per1g { get; set; }

    public bool IsActive { get; set; } = true;
    public string? SourceNote { get; set; } // e.g. "IBJA Mumbai Evening Rate"
}

/// <summary>
/// Extended attributes for an Item when used in the Jewellery industry
/// </summary>
public class JewelleryItemAttribute : BaseTenantAuditableEntity
{
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public JewelleryType JewelleryType { get; set; } = JewelleryType.PreciousMetal;
    public MetalType MetalType { get; set; } = MetalType.Gold;

    // Purity representation: e.g. "22K (916)", "18K (750)", "Silver 925"
    public string PurityKarat { get; set; } = "22K (916)";
    public decimal PurityPercentage { get; set; } = 91.60m; // e.g. 91.60 for 22K

    // Precision Weights in Grams (3 decimal places: 0.001 gm)
    public decimal GrossWeight { get; set; } = 0.000m;
    public decimal StoneWeight { get; set; } = 0.000m;
    public decimal NetWeight { get; set; } = 0.000m;

    // Wastage / Tunch / Melting Allowance
    public decimal WastagePercentage { get; set; } = 0.00m;
    public decimal WastageGrams { get; set; } = 0.000m;

    // Making Charges
    public MakingChargeType MakingChargeType { get; set; } = MakingChargeType.PerGram;
    public decimal MakingChargeRate { get; set; } = 0.00m;

    // Statutory BIS Hallmarking
    public string? HUID { get; set; } // 6-character alphanumeric code e.g. "HZ8921"
    public string? HallmarkingCenter { get; set; }
    public string? CertificateNumber { get; set; } // GIA, IGI, SGL

    // Imitation / Fashion Jewellery Specific Fields
    public string? ImitationColorFinish { get; set; } // "Rose Gold", "Antique", "Rhodium", "Kundan Meena"
    public int PiecesPerBox { get; set; } = 1;

    public ICollection<DiamondGemstoneDetail> DiamondDetails { get; set; } = new List<DiamondGemstoneDetail>();
}

/// <summary>
/// Details of embedded Diamonds or Gemstones in Studded Jewellery
/// </summary>
public class DiamondGemstoneDetail : BaseTenantAuditableEntity
{
    public Guid JewelleryItemAttributeId { get; set; }
    public JewelleryItemAttribute JewelleryItemAttribute { get; set; } = null!;

    public StoneType StoneType { get; set; } = StoneType.Diamond;
    public string Cut { get; set; } = "Round Brilliant"; // Round, Princess, Oval, Marquise
    public string Clarity { get; set; } = "VVS1"; // VVS1, VS1, SI1, etc.
    public string Color { get; set; } = "F-G"; // D, E, F, G, H, I-J
    
    public int PiecesCount { get; set; } = 1;
    public decimal WeightCarats { get; set; } = 0.0000m; // 4 decimals: 0.0001 ct
    public decimal WeightCents { get; set; } = 0.00m;    // 1 Carat = 100 Cents
    public decimal RatePerCarat { get; set; } = 0.00m;
    public decimal TotalAmount { get; set; } = 0.00m;
    public string? CertNumber { get; set; }
}

/// <summary>
/// Old Gold Exchange / Scrap Buyback Voucher adjusted against invoice or cash
/// </summary>
public class OldGoldExchangeVoucher : BaseTenantAuditableEntity
{
    public string VoucherNumber { get; set; } = string.Empty; // e.g. EXCH-2627-0001
    
    public Guid? PartyId { get; set; }
    public Party? Party { get; set; }

    public Guid? InvoiceId { get; set; }
    public SalesInvoice? Invoice { get; set; }

    public string? CustomerName { get; set; }
    public string? CustomerMobile { get; set; }
    public string? CustomerPanAadhaar { get; set; }

    public string ItemDescription { get; set; } = string.Empty;
    public MetalType MetalType { get; set; } = MetalType.Gold;

    // Weight calculations (0.001 gm)
    public decimal OldGrossWeight { get; set; } = 0.000m;
    public decimal OldDustStoneWeight { get; set; } = 0.000m;
    public decimal OldNetWeight { get; set; } = 0.000m;

    // Purity test result
    public decimal MeltingPurityTunch { get; set; } = 0.00m; // e.g. 88.50%
    public decimal PureWeightEquivalent { get; set; } = 0.000m; // Fine 24K grams
    
    public decimal BuyingRatePerGram { get; set; } = 0.00m;
    public decimal TotalExchangeValuation { get; set; } = 0.00m;

    public string TestingMethod { get; set; } = "Karattometer_XRF"; // XRF, AcidTouchstone, AssayLab
    public OldGoldStatus Status { get; set; } = OldGoldStatus.AdjustedAgainstInvoice;
    public string? Notes { get; set; }
}

/// <summary>
/// Karigar (Artisan / Goldsmith) Account directory for double-entry metal & labour
/// </summary>
public class KarigarAccount : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. KARIGAR-01
    public string Name { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Speciality { get; set; } // Kundan, Casting, Polki, Plain Gold, Chains

    // Metal Balances in Grams (Double-Entry Metal Ledger)
    public decimal PureGoldBalanceGrams { get; set; } = 0.000m; // +ve means Karigar owes gold
    public decimal PureSilverBalanceGrams { get; set; } = 0.000m;
    public decimal LabourBalanceRupees { get; set; } = 0.00m;   // +ve means we owe labour charges

    public bool IsActive { get; set; } = true;
    public ICollection<KarigarTransaction> Transactions { get; set; } = new List<KarigarTransaction>();
}

/// <summary>
/// Metal issue, return, wastage & labour payment transaction log for a Karigar
/// </summary>
public class KarigarTransaction : BaseTenantAuditableEntity
{
    public Guid KarigarId { get; set; }
    public KarigarAccount Karigar { get; set; } = null!;

    public KarigarTransactionType TransactionType { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty; // Issue voucher / Job slip

    public decimal IssuePureMetalGrams { get; set; } = 0.000m;
    public decimal ReceivedGrossWeight { get; set; } = 0.000m;
    public decimal ReceivedNetWeight { get; set; } = 0.000m;
    public decimal ReceivedPurityPct { get; set; } = 0.00m;
    public decimal ReceivedFineWeight { get; set; } = 0.000m;

    public decimal AllowedWastageWeight { get; set; } = 0.000m;
    public decimal MetalShortageWeight { get; set; } = 0.000m;

    public decimal LabourCharges { get; set; } = 0.00m;
    public decimal LabourAmountPaid { get; set; } = 0.00m;

    public string? Description { get; set; }
}

/// <summary>
/// Gold Savings Scheme (Swarna Nidhi / Kitty / 11+1 Monthly Chits)
/// </summary>
public class GoldSavingsScheme : BaseTenantAuditableEntity
{
    public string SchemeCode { get; set; } = string.Empty; // e.g. KITTY-2627-001
    
    public Guid? CustomerId { get; set; }
    public Party? Customer { get; set; }

    public string CustomerName { get; set; } = string.Empty;
    public string CustomerMobile { get; set; } = string.Empty;
    
    public decimal MonthlyAmount { get; set; } = 0.00m;
    public int TotalMonths { get; set; } = 11;
    public decimal JewellerBonusContribution { get; set; } = 0.00m; // 12th month bonus contribution
    
    public DateOnly StartDate { get; set; }
    public DateOnly MaturityDate { get; set; }

    public decimal TotalDeposited { get; set; } = 0.00m;
    public int InstallmentsPaid { get; set; } = 0;

    public GoldSavingsSchemeStatus Status { get; set; } = GoldSavingsSchemeStatus.Active;
    
    public Guid? RedeemedInvoiceId { get; set; }
    public SalesInvoice? RedeemedInvoice { get; set; }

    public ICollection<GoldSavingsInstallment> Installments { get; set; } = new List<GoldSavingsInstallment>();
}

/// <summary>
/// Installment receipt under a Gold Savings Scheme
/// </summary>
public class GoldSavingsInstallment : BaseTenantAuditableEntity
{
    public Guid SchemeId { get; set; }
    public GoldSavingsScheme Scheme { get; set; } = null!;

    public int InstallmentNumber { get; set; }
    public DateOnly PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMode { get; set; } = "UPI"; // Cash, UPI, Card, Bank
    public string? ReferenceNumber { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
}

/// <summary>
/// Girvi Loan / Gold Loan / Pawnbroking Ledger
/// </summary>
public class GirviLoan : BaseTenantAuditableEntity
{
    public string GirviNumber { get; set; } = string.Empty; // e.g. GRV-2627-001
    
    public Guid? CustomerId { get; set; }
    public Party? Customer { get; set; }

    public string CustomerName { get; set; } = string.Empty;
    public string CustomerMobile { get; set; } = string.Empty;
    public string? CustomerAddress { get; set; }
    public string? CustomerAadhaarPan { get; set; }

    public string PledgedOrnamentsDescription { get; set; } = string.Empty;
    public int TotalPledgedItemsCount { get; set; } = 1;
    public decimal GrossWeight { get; set; } = 0.000m;
    public decimal NetWeight { get; set; } = 0.000m;
    public decimal EstimatedMarketValuation { get; set; } = 0.00m;

    public decimal PrincipalAmount { get; set; } = 0.00m;
    public decimal MonthlyInterestRatePct { get; set; } = 1.50m; // Standard 1.5% to 2.5% per month
    
    public DateOnly LoanDate { get; set; }
    public DateOnly DueDate { get; set; }
    public DateOnly? RedeemedDate { get; set; }

    public decimal TotalInterestCollected { get; set; } = 0.00m;
    public decimal TotalPrincipalReturned { get; set; } = 0.00m;

    public GirviStatus Status { get; set; } = GirviStatus.OpenActive;
    public string? SafeVaultLockerNumber { get; set; }
    public string? Notes { get; set; }
}
