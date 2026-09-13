using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.Pharma;

namespace UdyogBill.Application.DTOs;

#region Pricing & Licensing DTOs

public record PharmaSubscriptionQuoteDto(
    decimal BasePrice,
    int MrSeats,
    decimal MrSeatRate,
    decimal TotalMrSeatPrice,
    int ManagerSeats,
    decimal ManagerSeatRate,
    decimal TotalManagerSeatPrice,
    decimal SubTotal,
    decimal GstRatePercent,
    decimal GstAmount,
    decimal GrandTotal,
    bool IsAnnual
);

public record ActivatePharmaSfaRequest(
    Guid TenantId,
    bool IsAnnual,
    int MrSeats,
    int ManagerSeats
);

public record SeatQuotaStatusDto(
    bool IsPharmaSfaActive,
    int MaxAllowedMrUsers,
    int CurrentActiveMrUsers,
    bool CanAddMoreMr,
    int MaxAllowedManagerUsers,
    int CurrentActiveManagerUsers,
    bool CanAddMoreManager
);

#endregion

#region Masters DTOs

public record SfaTerritoryDto(
    Guid Id,
    string Code,
    string Name,
    SfaTerritoryType Type,
    Guid? ParentTerritoryId,
    string? ParentTerritoryName,
    string? State,
    string? City,
    string? CoveredPincodes,
    bool IsActive
);

public record CreateTerritoryRequest(
    string Code,
    string Name,
    SfaTerritoryType Type,
    Guid? ParentTerritoryId,
    string? State,
    string? City,
    string? CoveredPincodes
);

public record UpdateTerritoryRequest(
    string Code,
    string Name,
    SfaTerritoryType Type,
    Guid? ParentTerritoryId,
    string? State,
    string? City,
    string? CoveredPincodes,
    bool IsActive = true
);


// --- Divisions, Patches & Beats DTOs ---
public record SfaDivisionDto(
    Guid Id,
    string Code,
    string Name,
    string? Description,
    bool IsActive,
    int TotalEmployeesCount = 0,
    int TotalPatchesCount = 0
);

public record CreateDivisionRequest(
    string Code,
    string Name,
    string? Description
);

public record SfaPatchDto(
    Guid Id,
    string Code,
    string Name,
    Guid? DivisionId,
    string? DivisionName,
    Guid? AreaTerritoryId,
    string? AreaTerritoryName,
    string? HeadquarterCity,
    string? Description,
    bool IsActive,
    int TotalBeatsCount = 0,
    int TotalDoctorsCount = 0,
    int TotalChemistsCount = 0
);

public record CreatePatchRequest(
    string Code,
    string Name,
    Guid? DivisionId,
    Guid? AreaTerritoryId,
    string? HeadquarterCity,
    string? Description
);

public record SfaBeatDto(
    Guid Id,
    string Code,
    string Name,
    Guid PatchId,
    string? PatchName,
    DayOfWeek? ScheduledDayOfWeek,
    int SequenceOrder,
    string? RouteDescription,
    decimal EstimatedDistanceKm,
    bool IsActive,
    int TotalDoctorsCount = 0,
    int TotalChemistsCount = 0
);

public record CreateBeatRequest(
    string Code,
    string Name,
    Guid PatchId,
    DayOfWeek? ScheduledDayOfWeek,
    int SequenceOrder = 1,
    string? RouteDescription = null,
    decimal EstimatedDistanceKm = 12m
);

// --- Employee / Field Force Profile DTOs ---
public record SfaEmployeeProfileDto(
    Guid Id,
    Guid UserId,
    string EmployeeCode,
    string FullName,
    string Email,
    string? Mobile,
    string? Gender,
    SfaDesignationRole DesignationRole,
    string DesignationTitle,
    Guid? DivisionId,
    string? DivisionName,
    Guid? TerritoryId,
    string? TerritoryName,
    Guid? PatchId,
    string? PatchName,
    Guid? ReportingToUserId,
    string? ReportingToName,
    string HeadquarterCity,
    DateTime JoiningDate,
    decimal DailyAllowanceRate,
    decimal MonthlyExpenseLimit,
    decimal MonthlyTargetAmount,
    bool IsActive
);

public record CreateOrUpdateEmployeeRequest(
    Guid? Id,
    string EmployeeCode,
    string FullName,
    string Email,
    string? Password,
    string? Mobile,
    string? Gender,
    SfaDesignationRole DesignationRole,
    string DesignationTitle,
    Guid? DivisionId,
    Guid? TerritoryId,
    Guid? PatchId,
    Guid? ReportingToUserId,
    string HeadquarterCity,
    DateTime? JoiningDate,
    decimal DailyAllowanceRate = 350m,
    decimal MonthlyExpenseLimit = 15000m,
    decimal MonthlyTargetAmount = 250000m,
    bool IsActive = true
);

public record ReallocateDoctorRequest(
    Guid DoctorId,
    Guid NewMrUserId,
    DateTime EffectiveDate,
    string Reason
);

public record SfaDoctorAllocationHistoryDto(
    Guid Id,
    Guid DoctorId,
    string DoctorName,
    Guid? FromMrUserId,
    string? FromMrName,
    Guid ToMrUserId,
    string ToMrName,
    DateTime EffectiveDate,
    string Reason,
    DateTime CreatedAtUtc
);

public record SfaDoctorDto(
    Guid Id,
    string Code,
    string Name,
    string Specialty,
    string Qualification,
    string RegistrationNumber,
    string ClinicHospitalName,
    string Address,
    string City,
    string? State,
    string? Pincode,
    string Mobile,
    string? Email,
    Guid? DivisionId,
    string? DivisionName,
    Guid? TerritoryId,
    string? TerritoryName,
    Guid? PatchId,
    string? PatchName,
    Guid? BeatId,
    string? BeatName,
    Guid? AssignedMrUserId,
    string? AssignedMrName,
    string Classification,
    string? SubSpecialty,
    string? Priority,
    int VisitFrequencyPerMonth,
    string? PreferredVisitDay,
    string? PreferredVisitTime,
    decimal EstimatedMonthlyPotential,
    double? Latitude,
    double? Longitude,
    double GeofenceRadiusMeters,
    bool IsActive
);

public record CreateDoctorRequest(
    string Code,
    string Name,
    string Specialty,
    string Qualification,
    string RegistrationNumber,
    string ClinicHospitalName,
    string Address,
    string City,
    string? State,
    string? Pincode,
    string Mobile,
    string? Email,
    Guid? DivisionId,
    Guid? TerritoryId,
    Guid? PatchId,
    Guid? BeatId,
    Guid? AssignedMrUserId,
    string Classification = "Core",
    string? SubSpecialty = null,
    string? Priority = "High",
    int VisitFrequencyPerMonth = 2,
    string? PreferredVisitDay = null,
    string? PreferredVisitTime = null,
    decimal EstimatedMonthlyPotential = 50000m,
    double? Latitude = null,
    double? Longitude = null,
    double GeofenceRadiusMeters = 200
);

public record SfaChemistDto(
    Guid Id,
    string Code,
    string ShopName,
    string ContactPerson,
    string DrugLicenseNumber,
    string? GSTIN,
    string Mobile,
    string? Email,
    string Address,
    string City,
    string? State,
    string? Pincode,
    double? Latitude,
    double? Longitude,
    double GeofenceRadiusMeters,
    Guid? TerritoryId,
    string? TerritoryName,
    Guid? PatchId,
    string? PatchName,
    Guid? BeatId,
    string? BeatName,
    Guid? AssignedMrUserId,
    string? AssignedMrName,
    Guid? PreferredStockistPartyId,
    string? PreferredStockistName,
    string? PreferredVisitDay,
    string PotentialCategory,
    bool IsActive
);

public record CreateChemistRequest(
    string Code,
    string ShopName,
    string ContactPerson,
    string DrugLicenseNumber,
    string? GSTIN,
    string Mobile,
    string? Email,
    string Address,
    string City,
    string? State,
    string? Pincode,
    Guid? TerritoryId,
    Guid? PatchId,
    Guid? BeatId,
    Guid? AssignedMrUserId,
    Guid? PreferredStockistPartyId,
    string? PreferredVisitDay = null,
    string PotentialCategory = "B",
    double? Latitude = null,
    double? Longitude = null,
    double GeofenceRadiusMeters = 200
);

// --- Bulk Import DTOs ---
public record BulkDoctorImportItemDto(
    string? Code,
    string Name,
    string? Specialty,
    string? SubSpecialty,
    string? Qualification,
    string? RegistrationNumber,
    string? ClinicHospitalName,
    string? Address,
    string? City,
    string? State,
    string? Pincode,
    string Mobile,
    string? Email,
    string? Classification, // Core (A), SuperCore (A+), Standard (B), Basic (C)
    int? VisitFrequencyPerMonth,
    string? PreferredVisitDay,
    string? PreferredVisitTime,
    decimal? EstimatedMonthlyPotential,
    string? DivisionCodeOrName,
    string? PatchCodeOrName,
    string? BeatCodeOrName,
    string? AssignedMrEmployeeCodeOrName,
    double? Latitude,
    double? Longitude,
    double? GeofenceRadiusMeters
);

public record BulkDoctorImportRequest(
    List<BulkDoctorImportItemDto> Items,
    bool OverwriteExisting = false
);

public record BulkChemistImportItemDto(
    string? Code,
    string ShopName,
    string? ContactPerson,
    string? DrugLicenseNumber,
    string? GSTIN,
    string Mobile,
    string? Email,
    string? Address,
    string? City,
    string? State,
    string? Pincode,
    string? PotentialCategory,
    string? PreferredVisitDay,
    string? PreferredStockistNameOrCode,
    string? PatchCodeOrName,
    string? BeatCodeOrName,
    string? AssignedMrEmployeeCodeOrName,
    double? Latitude,
    double? Longitude,
    double? GeofenceRadiusMeters
);

public record BulkChemistImportRequest(
    List<BulkChemistImportItemDto> Items,
    bool OverwriteExisting = false
);

public record BulkImportResultDto(
    int TotalProcessed,
    int InsertedCount,
    int UpdatedCount,
    int SkippedCount,
    List<string> Errors,
    List<string> Warnings
);

public record SfaStockistAllocationDto(
    Guid Id,
    Guid StockistPartyId,
    string StockistName,
    string? StockistGstin,
    Guid MrUserId,
    string MrName,
    Guid? TerritoryId,
    string? TerritoryName,
    DateTime EffectiveFrom,
    DateTime? EffectiveTo,
    string AllocationType,
    bool IsActive,
    string? Notes
);

public record AllocateStockistRequest(
    Guid StockistPartyId,
    Guid MrUserId,
    Guid? TerritoryId,
    DateTime EffectiveFrom,
    string AllocationType = "Primary",
    string? Notes = null
);

#endregion

#region Operations DTOs (TP, DCR, Samples, POB)

public record SfaTourPlanDto(
    Guid Id,
    Guid MrUserId,
    string MrName,
    int Month,
    int Year,
    SfaPlanStatus Status,
    string? ManagerRemarks,
    List<SfaTourPlanItemDto> Items
);

public record SfaTourPlanItemDto(
    Guid Id,
    DateTime PlanDate,
    string ActivityType, // FieldWork, Sunday, Holiday, Leave, Meeting, Conference
    string RouteOrBeatName,
    Guid? TerritoryId,
    string? TerritoryName,
    Guid? PatchId,
    string? PatchName,
    Guid? BeatId,
    string? BeatName,
    int PlannedDoctorCalls,
    int PlannedChemistCalls,
    int PlannedStockistCalls,
    string? TargetDoctorIdsJson,
    List<string>? TargetDoctorNames,
    string? Remarks
);

public record GenerateTourPlanRequest(
    Guid MrUserId,
    int Month,
    int Year,
    List<DateTime>? CustomHolidays
);

public record CreateTourPlanRequest(
    int Month,
    int Year,
    List<CreateTourPlanItemRequest> Items
);

public record CreateTourPlanItemRequest(
    DateTime PlanDate,
    string ActivityType,
    string RouteOrBeatName,
    Guid? TerritoryId,
    Guid? PatchId,
    Guid? BeatId,
    int PlannedDoctorCalls,
    int PlannedChemistCalls,
    int PlannedStockistCalls,
    string? TargetDoctorIdsJson,
    string? Remarks
);

public record ReviewTourPlanRequest(
    bool IsApproved,
    string? Remarks
);

public record DoctorFrequencyComplianceDto(
    int TotalAssignedDoctors,
    int SuperCoreCount,    // A+
    int CoreCount,         // A
    int StandardCount,     // B
    int BasicCount,        // C
    int TotalTargetCalls,  // (A+ * 4) + (A * 2) + (B * 1) + (C * 1)
    int TotalPlannedCalls,
    int TotalExecutedCalls,
    decimal CoveragePercent,
    List<DoctorComplianceItemDto> DoctorBreakdown
);

public record DoctorComplianceItemDto(
    Guid DoctorId,
    string DoctorCode,
    string DoctorName,
    string Specialty,
    string Classification,
    string? PatchName,
    string? BeatName,
    int TargetMonthlyCalls,
    int PlannedCalls,
    int ExecutedCalls,
    bool IsCompliant
);

public record SfaDailyCallReportDto(
    Guid Id,
    string DcrNumber,
    DateTime DcrDate,
    Guid MrUserId,
    string MrName,
    string AttendanceStatus,
    string WorkType,
    string RouteOrArea,
    int TotalDoctorsVisited,
    int TotalChemistsVisited,
    int TotalStockistsVisited,
    decimal TotalPobBookedAmount,
    SfaPlanStatus Status,
    string? ManagerRemarks
);

public record SubmitDcrRequest(
    DateTime DcrDate,
    string AttendanceStatus,
    string WorkType,
    Guid? AccompaniedByUserId,
    Guid? TerritoryId,
    string RouteOrArea,
    DateTime? DayStartTimeUtc,
    DateTime? DayEndTimeUtc,
    double? StartLatitude,
    double? StartLongitude,
    double? EndLatitude,
    double? EndLongitude,
    List<SubmitDoctorVisitRequest> DoctorVisits,
    List<SubmitChemistVisitRequest> ChemistVisits,
    List<SubmitStockistVisitRequest> StockistVisits
);

public record SubmitDoctorVisitRequest(
    Guid DoctorId,
    DateTime VisitTimeUtc,
    double? Latitude,
    double? Longitude,
    string? ProductsDetailedJson,
    string? SamplesGivenJson,
    string? GiftsGivenJson,
    string? DoctorFeedback,
    DateTime? NextVisitDate,
    double? DistanceFromClinicMeters = null,
    bool? IsWithinGeofence = true,
    string? OutOfRangeReason = null,
    bool? IsMockLocationDetected = false,
    DateTime? InTime = null,
    DateTime? OutTime = null
);

public record SubmitChemistVisitRequest(
    Guid ChemistId,
    DateTime VisitTimeUtc,
    double? Latitude,
    double? Longitude,
    bool PobOrderBooked,
    decimal PobOrderAmount,
    string? Feedback,
    double? DistanceFromShopMeters = null,
    bool? IsWithinGeofence = true,
    string? OutOfRangeReason = null,
    bool? IsMockLocationDetected = false,
    DateTime? InTime = null,
    DateTime? OutTime = null
);

public record SubmitStockistVisitRequest(
    Guid StockistPartyId,
    DateTime VisitTimeUtc,
    decimal PaymentCollectedAmount,
    string? ChequeOrUpiRef,
    string? OutstandingReviewRemarks
);

public record SfaSampleStockDto(
    Guid Id,
    Guid ItemId,
    string ItemName,
    string BatchNumber,
    string ExpiryMonthYear,
    decimal QuantityAllocated,
    decimal QuantityDistributed,
    decimal CurrentStockInBag,
    Guid? MrUserId = null,
    string? MrName = null
);

public record SfaPobOrderDto(
    Guid Id,
    string OrderNumber,
    DateTime OrderDate,
    Guid MrUserId,
    string MrName,
    Guid CustomerPartyId,
    string CustomerName,
    Guid? TargetStockistPartyId,
    string? TargetStockistName,
    decimal SubTotal,
    decimal TaxAmount,
    decimal GrandTotal,
    string Status,
    Guid? ConvertedSalesInvoiceId,
    List<SfaPobOrderItemDto> Items,
    string StockistFulfillmentStatus = "NotRouted",
    string? StockistRemarks = null,
    DateTime? ExpectedDeliveryDate = null,
    string? Remarks = null
);

public record SfaPobOrderItemDto(
    Guid Id,
    Guid ItemId,
    string ItemName,
    decimal Quantity,
    decimal FreeQuantity,
    decimal UnitPrice,
    decimal DiscountPercent,
    decimal TaxRatePercent,
    decimal TotalAmount,
    Guid? AppliedSchemeId = null,
    string? AppliedSchemeName = null,
    string? ItemCode = null
);

public record CreatePobOrderRequest(
    Guid CustomerPartyId,
    Guid? TargetStockistPartyId,
    DateTime OrderDate,
    string? ClientOfflineId,
    string? Remarks,
    List<CreatePobOrderItemRequest> Items
);

public record CreatePobOrderItemRequest(
    Guid ItemId,
    decimal Quantity,
    decimal FreeQuantity,
    decimal UnitPrice,
    decimal DiscountPercent,
    decimal TaxRatePercent,
    Guid? AppliedSchemeId = null,
    string? AppliedSchemeName = null
);

#endregion

#region Analytics & Reconciliation DTOs

public record MrSalesAttributionDto(
    Guid Id,
    Guid SalesInvoiceId,
    string InvoiceNumber,
    DateTime InvoiceDate,
    Guid StockistPartyId,
    string StockistName,
    Guid MrUserId,
    string MrName,
    decimal InvoiceTotalAmount,
    decimal TaxableAmount,
    DateTime AttributedAtUtc,
    string AttributionMethod
);

public record PharmaReconciliationReportDto(
    DateTime FromDate,
    DateTime ToDate,
    decimal TotalCoreInvoiceSales,
    decimal TotalStockistSales,
    decimal TotalMrAttributedSales,
    decimal DiscrepancyAmount,
    bool IsReconciled,
    int TotalInvoicesCount,
    int AttributedInvoicesCount,
    int UnattributedInvoicesCount
);

public record MrTargetVsAchievementDto(
    Guid MrUserId,
    string MrName,
    int Month,
    int Year,
    decimal TargetSalesAmount,
    decimal AchievedSalesAmount,
    decimal SalesAchievementPercent,
    int TargetDoctorCalls,
    int AchievedDoctorCalls,
    decimal DoctorCallsAchievementPercent
);

#endregion

#region Sprint 4: Multi-Level Hierarchy, Manager Approvals & Expense Policies

public record CreateUserHierarchyRequest(
    Guid UserId,
    string Designation,
    string? HeadquartersTown,
    Guid? ReportsToUserId,
    Guid? AbmUserId,
    Guid? RsmUserId,
    Guid? ZsmUserId,
    Guid? TerritoryId
);

public record UpdateUserHierarchyRequest(
    string Designation,
    string? HeadquartersTown,
    Guid? ReportsToUserId,
    Guid? AbmUserId,
    Guid? RsmUserId,
    Guid? ZsmUserId,
    Guid? TerritoryId,
    bool IsActive
);

public record UserHierarchyDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string UserEmail,
    string Designation,
    string? HeadquartersTown,
    Guid? ReportsToUserId,
    string? ReportsToUserName,
    Guid? AbmUserId,
    string? AbmUserName,
    Guid? RsmUserId,
    string? RsmUserName,
    Guid? ZsmUserId,
    string? ZsmUserName,
    Guid? TerritoryId,
    string? TerritoryName,
    bool IsActive,
    int SubordinateCount
);

public record OrgNodeDto(
    Guid UserId,
    string Name,
    string Designation,
    string? HeadquartersTown,
    string? Email,
    string? Mobile,
    int TeamSize,
    List<OrgNodeDto> Subordinates
);

public record ManagerTourPlanActionRequest(
    Guid PlanId,
    string Action, // "Approve", "Reject", "RequestModification"
    string? RejectionReason
);

public record ManagerExpenseClaimActionRequest(
    Guid ClaimId,
    string Action, // "Approve", "Reject", "VerifyAccounts", "Disburse"
    decimal? ApprovedAmount,
    string? Remarks,
    string? PaymentMode,
    string? PaymentReferenceNumber
);

public record ReassignDoctorRequest(
    Guid DoctorId,
    Guid NewMrUserId,
    string? Reason
);

public record DoctorAllocationHistoryDto(
    Guid Id,
    Guid DoctorId,
    string DoctorName,
    Guid? PreviousMrUserId,
    string? PreviousMrName,
    Guid NewMrUserId,
    string NewMrName,
    Guid AllocatedByUserId,
    string AllocatedByName,
    DateTimeOffset AllocatedAtUtc,
    string? Reason
);

public record ExpensePolicyDto(
    Guid Id,
    string PolicyName,
    decimal HqDailyAllowance,
    decimal ExHqDailyAllowance,
    decimal OutstationDailyAllowance,
    decimal RatePerKmTwoWheeler,
    decimal RatePerKmFourWheeler,
    decimal HotelAllowancePerNight,
    decimal MaxMonthlyExpenseLimit,
    bool IsActive
);

public record SaveExpensePolicyRequest(
    string PolicyName,
    decimal HqDailyAllowance,
    decimal ExHqDailyAllowance,
    decimal OutstationDailyAllowance,
    decimal RatePerKmTwoWheeler,
    decimal RatePerKmFourWheeler,
    decimal HotelAllowancePerNight,
    decimal MaxMonthlyExpenseLimit,
    bool IsActive
);

public record CalculateExpenseEligibilityRequest(
    string WorkType,
    string VehicleType,
    decimal DistanceKm,
    int HotelNights
);

public record ExpenseEligibilityResponse(
    decimal DailyAllowance,
    decimal TravelAllowance,
    decimal HotelAllowance,
    decimal TotalEligibleAmount
);

public record TeamCallComplianceSummaryDto(
    Guid ManagerUserId,
    string ManagerName,
    int TotalTeamMembers,
    int TotalScheduledCalls,
    int TotalCompletedCalls,
    decimal TeamCallComplianceRate,
    List<MrCallComplianceItemDto> MrBreakdown
);

public record MrCallComplianceItemDto(
    Guid MrUserId,
    string MrName,
    string Designation,
    string? HeadquartersTown,
    int ScheduledCalls,
    int CompletedCalls,
    decimal ComplianceRate,
    decimal TotalKmsTraveled,
    decimal TotalExpensesClaimed,
    decimal TotalExpensesApproved
);

#endregion

#region Sprint 5: Commercial Scheme Engine, Dynamic POB Routing & Secondary Sales

public record SfaSchemeSlabDto(
    Guid Id,
    Guid SchemeMasterId,
    decimal MinQuantity,
    decimal? MaxQuantity,
    decimal FreeQuantity,
    decimal DiscountPercent,
    decimal FlatDiscountAmount,
    Guid? FreeItemId,
    string? FreeItemName
);

public record SfaSchemeMasterDto(
    Guid Id,
    string SchemeCode,
    string SchemeName,
    Guid? DivisionId,
    string? DivisionName,
    Guid? ItemId,
    string? ItemName,
    int SchemeType, // 1=FreeGoods, 2=PercentageDiscount, 3=FlatDiscount
    string SchemeTypeName,
    DateTime ValidFromUtc,
    DateTime ValidToUtc,
    decimal MinimumOrderQuantity,
    decimal? MinimumOrderValue,
    bool IsActive,
    string? Description,
    List<SfaSchemeSlabDto> Slabs
);

public record CreateSchemeSlabRequest(
    decimal MinQuantity,
    decimal? MaxQuantity,
    decimal FreeQuantity,
    decimal DiscountPercent,
    decimal FlatDiscountAmount,
    Guid? FreeItemId
);

public record CreateSchemeRequest(
    string SchemeCode,
    string SchemeName,
    Guid? DivisionId,
    Guid? ItemId,
    int SchemeType,
    DateTime ValidFromUtc,
    DateTime ValidToUtc,
    decimal MinimumOrderQuantity,
    decimal? MinimumOrderValue,
    string? Description,
    List<CreateSchemeSlabRequest> Slabs
);

public record CalculateSchemeRequest(
    Guid ItemId,
    decimal Quantity,
    Guid? DivisionId
);

public record CalculatedSchemeResultDto(
    Guid? SchemeId,
    string? SchemeCode,
    string? SchemeName,
    int SchemeType,
    decimal FreeQuantity,
    decimal DiscountPercent,
    decimal FlatDiscountAmount,
    Guid? FreeItemId,
    string? FreeItemName,
    decimal OriginalQuantity,
    decimal EffectivePriceMultiplier
);
public record UpdatePobFulfillmentStatusRequest(
    Guid PobOrderId,
    string FulfillmentStatus,
    string? StockistRemarks,
    DateTime? ExpectedDeliveryDate
);

public record RoutePobToStockistRequest(
    Guid PobOrderId,
    Guid TargetStockistPartyId,
    string? Remarks
);

public record SecondarySalesReconciliationDto(
    Guid StockistPartyId,
    string StockistName,
    string? StockistGstin,
    string? TerritoryName,
    decimal TotalPrimarySalesAmount,
    int TotalPrimaryInvoicesCount,
    decimal TotalSecondaryPobAmount,
    int TotalSecondaryOrdersCount,
    decimal SecondaryToPrimaryRatioPercent,
    decimal EstimatedStockHoldingValue,
    string StockTurnoverHealth // Fast, Healthy, Stagnant / AtRisk
);

public record SeedDemoDataResponseDto(
    int DoctorsCreated,
    int EmployeesCreated,
    int BeatsCreated,
    int SchemesCreated,
    int ChemistsCreated,
    int StockistsCreated,
    int SamplesCreated,
    int PobOrdersCreated,
    string Message
);

#endregion

#region 6. Admin Geofencing & Location Compliance

public record SfaGeofenceConfigDto(
    bool IsGeofencingEnabled,
    int GeofenceRadiusMeters,
    bool AllowOutOfRangeWithReason
);

public record UpdateEntityLocationRequest(
    double Latitude,
    double Longitude,
    double? GeofenceRadiusMeters = null
);

#endregion


