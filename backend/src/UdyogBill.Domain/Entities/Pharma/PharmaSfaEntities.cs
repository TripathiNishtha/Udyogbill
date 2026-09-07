using System;
using System.Collections.Generic;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;

namespace UdyogBill.Domain.Entities.Pharma;

#region 1. Territory & Sales Hierarchy

public class SfaDivision : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "DIV-CARDIO", "DIV-DERMA"
    public string Name { get; set; } = string.Empty; // e.g. "Cardio-Diabetic Division"
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<SfaPatch> Patches { get; set; } = new List<SfaPatch>();
    public ICollection<SfaEmployeeProfile> Employees { get; set; } = new List<SfaEmployeeProfile>();
}

public enum SfaTerritoryType
{
    Zone = 1,
    Region = 2,
    Area = 3,
    Headquarter = 4
}

public class SfaTerritory : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "HQ-DEL-SOUTH"
    public string Name { get; set; } = string.Empty; // e.g. "South Delhi Headquarter"
    public SfaTerritoryType Type { get; set; } = SfaTerritoryType.Headquarter;

    public Guid? ParentTerritoryId { get; set; }
    public SfaTerritory? ParentTerritory { get; set; }

    public string? State { get; set; }
    public string? City { get; set; }
    public string? CoveredPincodes { get; set; } // Comma-separated pincodes
    public bool IsActive { get; set; } = true;

    public ICollection<SfaTerritory> SubTerritories { get; set; } = new List<SfaTerritory>();
    public ICollection<SfaPatch> Patches { get; set; } = new List<SfaPatch>();
    public ICollection<SfaDoctor> Doctors { get; set; } = new List<SfaDoctor>();
    public ICollection<SfaChemist> Chemists { get; set; } = new List<SfaChemist>();
}

public class SfaPatch : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "PAT-LKO-01"
    public string Name { get; set; } = string.Empty; // e.g. "Hazratganj & Central"

    public Guid? DivisionId { get; set; }
    public SfaDivision? Division { get; set; }

    public Guid? AreaTerritoryId { get; set; }
    public SfaTerritory? AreaTerritory { get; set; }

    public string? HeadquarterCity { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<SfaBeat> Beats { get; set; } = new List<SfaBeat>();
    public ICollection<SfaDoctor> Doctors { get; set; } = new List<SfaDoctor>();
    public ICollection<SfaChemist> Chemists { get; set; } = new List<SfaChemist>();
}

public class SfaBeat : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "BEAT-MON-01"
    public string Name { get; set; } = string.Empty; // e.g. "Monday Core Clinic Beat"

    public Guid PatchId { get; set; }
    public SfaPatch Patch { get; set; } = null!;

    public DayOfWeek? ScheduledDayOfWeek { get; set; } // Monday, Tuesday, etc.
    public int SequenceOrder { get; set; } = 1;
    public string? RouteDescription { get; set; } // e.g. "Civil Hospital -> Cathedral -> Ganj Plaza"
    public decimal EstimatedDistanceKm { get; set; } = 12m;
    public bool IsActive { get; set; } = true;

    public ICollection<SfaDoctor> Doctors { get; set; } = new List<SfaDoctor>();
    public ICollection<SfaChemist> Chemists { get; set; } = new List<SfaChemist>();
}

public enum SfaDesignationRole
{
    MedicalRepresentative = 1, // MR
    AreaBusinessManager = 2,   // ABM / 1st line manager
    RegionalSalesManager = 3,  // RSM / 2nd line manager
    ZonalSalesManager = 4,     // ZSM / 3rd line manager
    NationalSalesManager = 5   // NSM / Country Head
}

public class SfaEmployeeProfile : BaseTenantAuditableEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string EmployeeCode { get; set; } = string.Empty; // e.g. "EMP-MR-008"
    public SfaDesignationRole DesignationRole { get; set; } = SfaDesignationRole.MedicalRepresentative;
    public string DesignationTitle { get; set; } = "Medical Representative";

    public Guid? DivisionId { get; set; }
    public SfaDivision? Division { get; set; }

    public Guid? TerritoryId { get; set; }
    public SfaTerritory? Territory { get; set; }

    public Guid? PatchId { get; set; }
    public SfaPatch? Patch { get; set; }

    public Guid? ReportingToUserId { get; set; }
    public User? ReportingToUser { get; set; }

    public Guid? ReportingAbmUserId { get; set; }
    public User? ReportingAbmUser { get; set; }

    public Guid? ReportingRsmUserId { get; set; }
    public User? ReportingRsmUser { get; set; }

    public Guid? ReportingZsmUserId { get; set; }
    public User? ReportingZsmUser { get; set; }

    public string? DeviceId { get; set; }
    public string? AppVersion { get; set; }

    public string HeadquarterCity { get; set; } = string.Empty;
    public DateTime JoiningDate { get; set; } = DateTime.UtcNow;
    public decimal DailyAllowanceRate { get; set; } = 350m; // DA per day in field
    public decimal MonthlyExpenseLimit { get; set; } = 15000m;
    public decimal MonthlyTargetAmount { get; set; } = 250000m;

    public string? Mobile { get; set; }
    public string? Email { get; set; }
    public string? Gender { get; set; }
    public string? EmergencyContact { get; set; }

    public bool IsActive { get; set; } = true;
}

#endregion

#region 2. Doctors, Chemists & Historical Stockist Allocations

public class SfaDoctor : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "DOC-1021"
    public string Name { get; set; } = string.Empty; // e.g. "Dr. Rajat Verma"
    public string Specialty { get; set; } = string.Empty; // e.g. "Cardiologist", "Diabetologist"
    public string Qualification { get; set; } = string.Empty; // "MBBS, MD"
    public string RegistrationNumber { get; set; } = string.Empty; // MCI / SMC Reg No
    public string ClinicHospitalName { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public string Mobile { get; set; } = string.Empty;
    public string? Email { get; set; }

    public Guid? DivisionId { get; set; }
    public SfaDivision? Division { get; set; }

    public Guid? TerritoryId { get; set; }
    public SfaTerritory? Territory { get; set; }

    public Guid? PatchId { get; set; }
    public SfaPatch? Patch { get; set; }

    public Guid? BeatId { get; set; }
    public SfaBeat? Beat { get; set; }

    public Guid? AssignedMrUserId { get; set; }
    public User? AssignedMrUser { get; set; }

    public string Classification { get; set; } = "Core"; // "SuperCore (A+)", "Core (A)", "Standard (B)", "Basic (C)"
    public string? SubSpecialty { get; set; }
    public string? Priority { get; set; } = "High";
    public int VisitFrequencyPerMonth { get; set; } = 2; // e.g. 4 for A, 2 for B
    public string? PreferredVisitDay { get; set; } // "Monday", "Thursday"
    public string? PreferredVisitTime { get; set; } // "02:00 PM - 04:00 PM"
    public decimal EstimatedMonthlyPotential { get; set; } = 50000m;

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double GeofenceRadiusMeters { get; set; } = 200;

    public DateTime? DateOfBirth { get; set; }
    public DateTime? WeddingAnniversary { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<SfaDoctorAllocationHistory> AllocationHistories { get; set; } = new List<SfaDoctorAllocationHistory>();
}

public class SfaChemist : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "CHM-3012"
    public string ShopName { get; set; } = string.Empty;
    public string ContactPerson { get; set; } = string.Empty;
    public string DrugLicenseNumber { get; set; } = string.Empty;
    public string? GSTIN { get; set; }
    public string Mobile { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? State { get; set; }
    public string? Pincode { get; set; }

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double GeofenceRadiusMeters { get; set; } = 200;

    public Guid? TerritoryId { get; set; }
    public SfaTerritory? Territory { get; set; }

    public Guid? PatchId { get; set; }
    public SfaPatch? Patch { get; set; }

    public Guid? BeatId { get; set; }
    public SfaBeat? Beat { get; set; }

    public Guid? AssignedMrUserId { get; set; }
    public User? AssignedMrUser { get; set; }

    public Guid? PreferredStockistPartyId { get; set; }
    public Party? PreferredStockistParty { get; set; }

    public string? PreferredVisitDay { get; set; }
    public string PotentialCategory { get; set; } = "B"; // A, B, C
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Immutable audit log of doctor reallocations with effective dates.
/// Guarantees past DCR calls and historical sales attribution are never altered when MR changes.
/// </summary>
public class SfaDoctorAllocationHistory : BaseTenantAuditableEntity
{
    public Guid DoctorId { get; set; }
    public SfaDoctor Doctor { get; set; } = null!;

    public Guid? FromMrUserId { get; set; }
    public User? FromMrUser { get; set; }

    public Guid ToMrUserId { get; set; }
    public User ToMrUser { get; set; } = null!;

    public DateTime EffectiveDate { get; set; } = DateTime.UtcNow;
    public string Reason { get; set; } = string.Empty;
    public Guid? ApprovedByUserId { get; set; }
    public User? ApprovedByUser { get; set; }
}

/// <summary>
/// Historical Stockist-to-MR Allocation with Effective Dates.
/// Guarantees historical sales attribution never mutates when MR changes.
/// </summary>
public class SfaStockistAllocation : BaseTenantAuditableEntity
{
    public Guid StockistPartyId { get; set; }
    public Party StockistParty { get; set; } = null!;

    public Guid MrUserId { get; set; }
    public User MrUser { get; set; } = null!;

    public Guid? TerritoryId { get; set; }
    public SfaTerritory? Territory { get; set; }

    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; } // Null means currently active

    public string AllocationType { get; set; } = "Primary"; // "Primary", "Secondary"
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
}

#endregion

#region 3. Tour Plans (TP) & Daily Call Reports (DCR)

public enum SfaPlanStatus
{
    Draft = 0,
    Submitted = 1,
    Approved = 2,
    Rejected = 3,
    Revised = 4
}

public class SfaTourPlan : BaseTenantAuditableEntity
{
    public Guid MrUserId { get; set; }
    public User MrUser { get; set; } = null!;

    public int Month { get; set; } // 1-12
    public int Year { get; set; }  // e.g. 2026
    public SfaPlanStatus Status { get; set; } = SfaPlanStatus.Draft;

    public Guid? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? ManagerRemarks { get; set; }

    public ICollection<SfaTourPlanItem> Items { get; set; } = new List<SfaTourPlanItem>();
}

public class SfaTourPlanItem : BaseTenantAuditableEntity
{
    public Guid TourPlanId { get; set; }
    public SfaTourPlan TourPlan { get; set; } = null!;

    public DateTime PlanDate { get; set; }
    public string ActivityType { get; set; } = "FieldWork"; // FieldWork, Sunday, Holiday, Leave, Meeting, Conference
    public string RouteOrBeatName { get; set; } = string.Empty;

    public Guid? TerritoryId { get; set; }
    public SfaTerritory? Territory { get; set; }

    public Guid? PatchId { get; set; }
    public SfaPatch? Patch { get; set; }

    public Guid? BeatId { get; set; }
    public SfaBeat? Beat { get; set; }

    public int PlannedDoctorCalls { get; set; } = 10;
    public int PlannedChemistCalls { get; set; } = 5;
    public int PlannedStockistCalls { get; set; } = 1;

    public string? TargetDoctorIdsJson { get; set; } // JSON array of Doctor Guids
    public string? Remarks { get; set; }
}

public class SfaDailyCallReport : BaseTenantAuditableEntity
{
    public string DcrNumber { get; set; } = string.Empty; // e.g. "DCR-2026-09-001"
    public DateTime DcrDate { get; set; }
    public Guid MrUserId { get; set; }
    public User MrUser { get; set; } = null!;

    public Guid? TourPlanItemId { get; set; }
    public SfaTourPlanItem? TourPlanItem { get; set; }

    public string AttendanceStatus { get; set; } = "Present"; // Present, Leave, HalfDay, Holiday
    public string WorkType { get; set; } = "FieldWork"; // FieldWork, Camp, Meeting, Transit, JointWorking
    public Guid? AccompaniedByUserId { get; set; } // Manager user id if joint working
    public User? AccompaniedByUser { get; set; }

    public Guid? TerritoryId { get; set; }
    public SfaTerritory? Territory { get; set; }
    public string RouteOrArea { get; set; } = string.Empty;

    public DateTime? DayStartTimeUtc { get; set; }
    public DateTime? DayEndTimeUtc { get; set; }
    public double? StartLatitude { get; set; }
    public double? StartLongitude { get; set; }
    public double? EndLatitude { get; set; }
    public double? EndLongitude { get; set; }

    public int TotalDoctorsVisited { get; set; }
    public int TotalChemistsVisited { get; set; }
    public int TotalStockistsVisited { get; set; }
    public decimal TotalPobBookedAmount { get; set; }
    public decimal PlannedDistanceKm { get; set; }
    public decimal ActualGpsDistanceKm { get; set; }
    public decimal RouteVariancePercent => PlannedDistanceKm > 0 
        ? Math.Round(((ActualGpsDistanceKm - PlannedDistanceKm) / PlannedDistanceKm) * 100, 2) 
        : 0;
    public bool IsVarianceFlagged { get; set; }

    public SfaPlanStatus Status { get; set; } = SfaPlanStatus.Submitted;
    public Guid? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? ManagerRemarks { get; set; }

    public ICollection<SfaDcrDoctorVisit> DoctorVisits { get; set; } = new List<SfaDcrDoctorVisit>();
    public ICollection<SfaDcrChemistVisit> ChemistVisits { get; set; } = new List<SfaDcrChemistVisit>();
    public ICollection<SfaDcrStockistVisit> StockistVisits { get; set; } = new List<SfaDcrStockistVisit>();
}

public class SfaDcrDoctorVisit : BaseTenantAuditableEntity
{
    public Guid DailyCallReportId { get; set; }
    public SfaDailyCallReport DailyCallReport { get; set; } = null!;

    public Guid DoctorId { get; set; }
    public SfaDoctor Doctor { get; set; } = null!;

    public DateTime VisitTimeUtc { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsGpsVerified { get; set; }

    public string? ProductsDetailedJson { get; set; } // JSON array of detailed SKU names
    public string? SamplesGivenJson { get; set; }    // JSON: [{"sku":"PCM-650", "qty":2, "batch":"B201"}]
    public string? GiftsGivenJson { get; set; }      // JSON: [{"gift":"Pen Stand", "qty":1}]
    public string? DoctorFeedback { get; set; }
    public DateTime? NextVisitDate { get; set; }
}

public class SfaDcrChemistVisit : BaseTenantAuditableEntity
{
    public Guid DailyCallReportId { get; set; }
    public SfaDailyCallReport DailyCallReport { get; set; } = null!;

    public Guid ChemistId { get; set; }
    public SfaChemist Chemist { get; set; } = null!;

    public DateTime VisitTimeUtc { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsGpsVerified { get; set; }

    public bool PobOrderBooked { get; set; }
    public decimal PobOrderAmount { get; set; }
    public string? Feedback { get; set; }
}

public class SfaDcrStockistVisit : BaseTenantAuditableEntity
{
    public Guid DailyCallReportId { get; set; }
    public SfaDailyCallReport DailyCallReport { get; set; } = null!;

    public Guid StockistPartyId { get; set; }
    public Party StockistParty { get; set; } = null!;

    public DateTime VisitTimeUtc { get; set; }
    public decimal PaymentCollectedAmount { get; set; }
    public string? ChequeOrUpiRef { get; set; }
    public string? OutstandingReviewRemarks { get; set; }
}

#endregion

#region 4. Samples Ledger, POB Orders & Sales Attribution

public class SfaSampleStock : BaseTenantAuditableEntity
{
    public Guid MrUserId { get; set; }
    public User MrUser { get; set; } = null!;

    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public string BatchNumber { get; set; } = string.Empty;
    public string ExpiryMonthYear { get; set; } = string.Empty;

    public decimal QuantityAllocated { get; set; } // Total received from HQ
    public decimal QuantityDistributed { get; set; } // Total given to doctors
    public decimal CurrentStockInBag => Math.Max(0, QuantityAllocated - QuantityDistributed);
}

public class SfaSampleChallan : BaseTenantAuditableEntity
{
    public string ChallanNumber { get; set; } = string.Empty; // e.g. "SMP-2026-0089"
    public Guid MrUserId { get; set; }
    public User MrUser { get; set; } = null!;

    public DateTime DispatchedDate { get; set; }
    public DateTime? AcknowledgedDate { get; set; }
    public string Status { get; set; } = "Dispatched"; // Dispatched, Acknowledged, Discrepancy
    public string? Remarks { get; set; }

    public ICollection<SfaSampleChallanItem> Items { get; set; } = new List<SfaSampleChallanItem>();
}

public class SfaSampleChallanItem : BaseTenantAuditableEntity
{
    public Guid SampleChallanId { get; set; }
    public SfaSampleChallan SampleChallan { get; set; } = null!;

    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public string BatchNumber { get; set; } = string.Empty;
    public string ExpiryMonthYear { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
}

public class SfaPobOrder : BaseTenantAuditableEntity
{
    public string OrderNumber { get; set; } = string.Empty; // e.g. "POB-2026-0044"
    public Guid MrUserId { get; set; }
    public User MrUser { get; set; } = null!;

    public Guid CustomerPartyId { get; set; } // Chemist or Retailer
    public Party CustomerParty { get; set; } = null!;

    public Guid? TargetStockistPartyId { get; set; } // Wholesaler executing the order
    public Party? TargetStockistParty { get; set; }

    public DateTime OrderDate { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal GrandTotal { get; set; }

    public string Status { get; set; } = "PendingApproval"; // PendingApproval, Approved, ConvertedToInvoice, Cancelled
    public string StockistFulfillmentStatus { get; set; } = "NotRouted"; // NotRouted, RoutedToStockist, StockistAccepted, StockistDispatched, Fulfilled, StockistRejected
    public string? StockistRemarks { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }
    public Guid? ConvertedSalesInvoiceId { get; set; }
    public SalesInvoice? ConvertedSalesInvoice { get; set; }

    public string? ClientOfflineId { get; set; } // UUID for offline sync idempotency
    public string? Remarks { get; set; }

    public ICollection<SfaPobOrderItem> Items { get; set; } = new List<SfaPobOrderItem>();
}

public class SfaPobOrderItem : BaseTenantAuditableEntity
{
    public Guid PobOrderId { get; set; }
    public SfaPobOrder PobOrder { get; set; } = null!;

    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public decimal Quantity { get; set; }
    public decimal FreeQuantity { get; set; } // Scheme: e.g. 10+1 free
    public Guid? AppliedSchemeId { get; set; }
    public string? AppliedSchemeName { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal TaxRatePercent { get; set; }
    public decimal TotalAmount { get; set; }
}

/// <summary>
/// Event-driven Historical Sales Attribution Bridge.
/// Connects core UdyogBill SalesInvoice to MR & Stockist without touching core billing logic.
/// </summary>
public class SfaSalesAttribution : BaseTenantAuditableEntity
{
    public Guid SalesInvoiceId { get; set; }
    public SalesInvoice SalesInvoice { get; set; } = null!;

    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }

    public Guid StockistPartyId { get; set; }
    public Party StockistParty { get; set; } = null!;

    public Guid MrUserId { get; set; }
    public User MrUser { get; set; } = null!;

    public Guid? ManagerUserId { get; set; }
    public User? ManagerUser { get; set; }

    public Guid? TerritoryId { get; set; }
    public SfaTerritory? Territory { get; set; }

    public decimal InvoiceTotalAmount { get; set; }
    public decimal TaxableAmount { get; set; }

    public DateTime AttributedAtUtc { get; set; } = DateTime.UtcNow;
    public string AttributionMethod { get; set; } = "HistoricalStockistMapping";
}

#endregion

#region 5. Targets & Field Expense Claims

public class SfaMrTarget : BaseTenantAuditableEntity
{
    public Guid MrUserId { get; set; }
    public User MrUser { get; set; } = null!;

    public int Month { get; set; } // 1-12
    public int Year { get; set; }  // e.g. 2026

    public decimal TargetSalesAmount { get; set; }
    public decimal AchievedSalesAmount { get; set; }

    public int TargetDoctorCalls { get; set; } = 200;
    public int AchievedDoctorCalls { get; set; }

    public int TargetChemistCalls { get; set; } = 100;
    public int AchievedChemistCalls { get; set; }

    public decimal AchievementPercent => TargetSalesAmount > 0 
        ? Math.Round((AchievedSalesAmount / TargetSalesAmount) * 100, 2) 
        : 0;
}

public class SfaExpenseClaim : BaseTenantAuditableEntity
{
    public string ClaimNumber { get; set; } = string.Empty; // e.g. "EXP-2026-09-012"
    public Guid MrUserId { get; set; }
    public User MrUser { get; set; } = null!;

    public int Month { get; set; }
    public int Year { get; set; }
    public decimal TotalClaimAmount { get; set; }
    public decimal ApprovedAmount { get; set; }

    public string Status { get; set; } = "Submitted"; // Submitted, ManagerApproved, AccountsVerified, Paid, Rejected
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public string? Remarks { get; set; }

    public Guid? AccountsVerifiedByUserId { get; set; }
    public DateTime? AccountsVerifiedAtUtc { get; set; }
    public string? PaymentMode { get; set; } // DirectBankTransfer, Cheque, UPI, Cash
    public string? PaymentReferenceNumber { get; set; }
    public DateTime? DisbursedAtUtc { get; set; }

    public ICollection<SfaExpenseClaimItem> Items { get; set; } = new List<SfaExpenseClaimItem>();
}

public class SfaExpenseClaimItem : BaseTenantAuditableEntity
{
    public Guid ExpenseClaimId { get; set; }
    public SfaExpenseClaim ExpenseClaim { get; set; } = null!;

    public DateTime ExpenseDate { get; set; }
    public string ExpenseType { get; set; } = "DailyAllowance"; // DailyAllowance, TravelFare, HotelStay, Fuel, Other
    public string WorkType { get; set; } = "HQ"; // HQ, ExHQ, Outstation
    public decimal DailyAllowanceAmount { get; set; }
    public decimal TravelAllowanceAmount { get; set; }
    public decimal Amount { get; set; }
    public decimal KmsTravelled { get; set; }
    public string? FromLocation { get; set; }
    public string? ToLocation { get; set; }
    public string? ReceiptAttachmentUrl { get; set; }
    public string? Notes { get; set; }
}

public class SfaExpensePolicy : BaseTenantAuditableEntity
{
    public string PolicyName { get; set; } = "Standard Pharma Field Policy";
    public decimal HqDailyAllowance { get; set; } = 250m;
    public decimal ExHqDailyAllowance { get; set; } = 350m;
    public decimal OutstationDailyAllowance { get; set; } = 600m;
    public decimal RatePerKmTwoWheeler { get; set; } = 3.50m;
    public decimal RatePerKmFourWheeler { get; set; } = 7.00m;
    public decimal HotelAllowancePerNight { get; set; } = 1200m;
    public decimal MaxMonthlyExpenseLimit { get; set; } = 25000m;
    public bool IsActive { get; set; } = true;
}

public class SfaUserHierarchy : BaseTenantAuditableEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Designation { get; set; } = "MR"; // MR, ABM, RSM, ZSM, Admin
    public string? HeadquartersTown { get; set; }

    public Guid? ReportsToUserId { get; set; }
    public User? ReportsToUser { get; set; }

    public Guid? AbmUserId { get; set; }
    public User? AbmUser { get; set; }

    public Guid? RsmUserId { get; set; }
    public User? RsmUser { get; set; }

    public Guid? ZsmUserId { get; set; }
    public User? ZsmUser { get; set; }

    public Guid? TerritoryId { get; set; }
    public SfaTerritory? Territory { get; set; }

    public bool IsActive { get; set; } = true;
}

public enum SfaSchemeType
{
    FreeGoods = 1,          // e.g. Buy 10 get 1 free
    PercentageDiscount = 2, // e.g. 5% trade discount on slab
    FlatDiscount = 3        // e.g. flat discount per case
}

public class SfaSchemeMaster : BaseTenantAuditableEntity
{
    public string SchemeCode { get; set; } = string.Empty; // e.g. "SCH-PCM-10+1"
    public string SchemeName { get; set; } = string.Empty; // e.g. "Monsoon Booster Scheme"

    public Guid? DivisionId { get; set; }
    public SfaDivision? Division { get; set; }

    public Guid? ItemId { get; set; } // Null if applies to all items in division
    public Item? Item { get; set; }

    public SfaSchemeType SchemeType { get; set; } = SfaSchemeType.FreeGoods;
    public DateTime ValidFromUtc { get; set; }
    public DateTime ValidToUtc { get; set; }
    public decimal MinimumOrderQuantity { get; set; } = 1;
    public decimal? MinimumOrderValue { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }

    public ICollection<SfaSchemeSlab> Slabs { get; set; } = new List<SfaSchemeSlab>();
}

public class SfaSchemeSlab : BaseTenantAuditableEntity
{
    public Guid SchemeMasterId { get; set; }
    public SfaSchemeMaster SchemeMaster { get; set; } = null!;

    public decimal MinQuantity { get; set; }
    public decimal? MaxQuantity { get; set; }
    public decimal FreeQuantity { get; set; } // e.g. 1 free unit
    public decimal DiscountPercent { get; set; } // e.g. 5% discount
    public decimal FlatDiscountAmount { get; set; }

    public Guid? FreeItemId { get; set; } // If free item is different product, null means same item
    public Item? FreeItem { get; set; }
}

#endregion


