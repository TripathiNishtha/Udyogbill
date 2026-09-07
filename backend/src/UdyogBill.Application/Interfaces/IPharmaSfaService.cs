using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Pharma;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IPharmaSfaService
{
    // Pricing, Licensing & Seat Quotas
    Task<Result<PharmaSubscriptionQuoteDto>> CalculatePharmaQuoteAsync(
        bool isAnnual,
        int mrSeats,
        int managerSeats,
        CancellationToken cancellationToken = default);

    Task<Result<bool>> ActivatePharmaSfaAsync(
        ActivatePharmaSfaRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<bool>> DeactivateTenantPharmaSfaForAdminAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<Result<bool>> ActivateTenantPharmaSfaAsync(
        CancellationToken cancellationToken = default);

    Task<Result<bool>> DeactivateTenantPharmaSfaAsync(
        CancellationToken cancellationToken = default);

    Task<Result<SeatQuotaStatusDto>> GetSeatQuotaStatusAsync(
        CancellationToken cancellationToken = default);

    Task<Result<bool>> ValidateSeatAdditionAsync(
        string roleCode,
        CancellationToken cancellationToken = default);

    // Masters: Divisions
    Task<Result<IReadOnlyList<SfaDivisionDto>>> GetDivisionsAsync(CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateDivisionAsync(CreateDivisionRequest request, CancellationToken cancellationToken = default);

    // Masters: Territory, Patches & Beats
    Task<Result<IReadOnlyList<SfaTerritoryDto>>> GetTerritoriesAsync(CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateTerritoryAsync(CreateTerritoryRequest request, CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<SfaPatchDto>>> GetPatchesAsync(Guid? divisionId = null, Guid? areaTerritoryId = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreatePatchAsync(CreatePatchRequest request, CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<SfaBeatDto>>> GetBeatsAsync(Guid? patchId = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateBeatAsync(CreateBeatRequest request, CancellationToken cancellationToken = default);

    // Field Force Employees & MR Management
    Task<Result<IReadOnlyList<SfaEmployeeProfileDto>>> GetEmployeesAsync(Guid? divisionId = null, SfaDesignationRole? role = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateOrUpdateEmployeeAsync(CreateOrUpdateEmployeeRequest request, CancellationToken cancellationToken = default);

    // Masters: Doctors
    Task<Result<IReadOnlyList<SfaDoctorDto>>> GetDoctorsAsync(Guid? territoryId = null, Guid? patchId = null, Guid? beatId = null, Guid? mrUserId = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateDoctorAsync(CreateDoctorRequest request, CancellationToken cancellationToken = default);
    Task<Result<bool>> ReallocateDoctorAsync(ReallocateDoctorRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<SfaDoctorAllocationHistoryDto>>> GetDoctorAllocationHistoriesAsync(Guid doctorId, CancellationToken cancellationToken = default);
    Task<Result<BulkImportResultDto>> BulkImportDoctorsAsync(BulkDoctorImportRequest request, CancellationToken cancellationToken = default);

    // Masters: Chemists
    Task<Result<IReadOnlyList<SfaChemistDto>>> GetChemistsAsync(Guid? territoryId = null, Guid? patchId = null, Guid? beatId = null, Guid? mrUserId = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateChemistAsync(CreateChemistRequest request, CancellationToken cancellationToken = default);
    Task<Result<BulkImportResultDto>> BulkImportChemistsAsync(BulkChemistImportRequest request, CancellationToken cancellationToken = default);

    // Masters: Stockist Allocations (with Effective Dates)
    Task<Result<IReadOnlyList<SfaStockistAllocationDto>>> GetStockistAllocationsAsync(Guid? stockistPartyId = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> AllocateStockistAsync(AllocateStockistRequest request, CancellationToken cancellationToken = default);

    // Operations: Tour Plans (TP) & Frequency Compliance
    Task<Result<IReadOnlyList<SfaTourPlanDto>>> GetTourPlansAsync(int month, int year, Guid? mrUserId = null, CancellationToken cancellationToken = default);
    Task<Result<SfaTourPlanDto>> GenerateMonthlyTourPlanAsync(GenerateTourPlanRequest request, CancellationToken cancellationToken = default);
    Task<Result<DoctorFrequencyComplianceDto>> GetDoctorFrequencyComplianceAsync(Guid mrUserId, int month, int year, CancellationToken cancellationToken = default);
    Task<Result<Guid>> SubmitTourPlanAsync(CreateTourPlanRequest request, CancellationToken cancellationToken = default);
    Task<Result<bool>> SubmitTourPlanForApprovalAsync(Guid tourPlanId, CancellationToken cancellationToken = default);
    Task<Result<bool>> ReviewTourPlanAsync(Guid tourPlanId, bool isApproved, string? remarks, CancellationToken cancellationToken = default);

    // Operations: DCR
    Task<Result<IReadOnlyList<SfaDailyCallReportDto>>> GetDcrsAsync(DateTime? fromDate = null, DateTime? toDate = null, Guid? mrUserId = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> SubmitDcrAsync(SubmitDcrRequest request, CancellationToken cancellationToken = default);

    // Operations: Sample Bag Ledger
    Task<Result<IReadOnlyList<SfaSampleStockDto>>> GetMrSampleStockAsync(Guid? mrUserId = null, CancellationToken cancellationToken = default);

    // Operations: POB Orders
    Task<Result<IReadOnlyList<SfaPobOrderDto>>> GetPobOrdersAsync(DateTime? fromDate = null, DateTime? toDate = null, Guid? mrUserId = null, Guid? customerPartyId = null, Guid? targetStockistPartyId = null, string? status = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreatePobOrderAsync(CreatePobOrderRequest request, CancellationToken cancellationToken = default);
    Task<Result<Guid>> ConvertPobToInvoiceAsync(Guid pobOrderId, Guid warehouseId, CancellationToken cancellationToken = default);
    Task<Result<bool>> UpdatePobFulfillmentStatusAsync(UpdatePobFulfillmentStatusRequest request, CancellationToken cancellationToken = default);
    Task<Result<bool>> RoutePobToStockistAsync(RoutePobToStockistRequest request, CancellationToken cancellationToken = default);

    // Event Attribution & Reconciliation Bridge
    Task<Result<bool>> AttributeSalesInvoiceAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<MrSalesAttributionDto>>> GetSalesAttributionsAsync(DateTime fromDate, DateTime toDate, Guid? mrUserId = null, CancellationToken cancellationToken = default);
    Task<Result<PharmaReconciliationReportDto>> GetReconciliationReportAsync(DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<MrTargetVsAchievementDto>>> GetTargetVsAchievementAsync(int month, int year, CancellationToken cancellationToken = default);

    // Multi-Level Hierarchy & Team Oversight (Sprint 4)
    Task<Result<IReadOnlyList<UserHierarchyDto>>> GetHierarchiesAsync(CancellationToken cancellationToken = default);
    Task<Result<OrgNodeDto>> GetOrgTreeAsync(Guid? rootUserId = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateOrUpdateHierarchyAsync(CreateUserHierarchyRequest request, CancellationToken cancellationToken = default);
    Task<Result<TeamCallComplianceSummaryDto>> GetTeamCallComplianceAsync(Guid managerUserId, int month, int year, CancellationToken cancellationToken = default);

    // Expense Policies & Automated Calculations (Sprint 4)
    Task<Result<IReadOnlyList<ExpensePolicyDto>>> GetExpensePoliciesAsync(CancellationToken cancellationToken = default);
    Task<Result<ExpensePolicyDto>> GetActiveExpensePolicyAsync(CancellationToken cancellationToken = default);
    Task<Result<Guid>> SaveExpensePolicyAsync(SaveExpensePolicyRequest request, CancellationToken cancellationToken = default);
    Task<Result<ExpenseEligibilityResponse>> CalculateExpenseEligibilityAsync(CalculateExpenseEligibilityRequest request, CancellationToken cancellationToken = default);

    // Manager Actions on Claims (Sprint 4)
    Task<Result<bool>> ProcessExpenseClaimActionAsync(ManagerExpenseClaimActionRequest request, CancellationToken cancellationToken = default);

    // Sprint 5: Trade Schemes, Dynamic POB Routing & Secondary Sales Reconciliation
    Task<Result<IReadOnlyList<SfaSchemeMasterDto>>> GetSchemesAsync(Guid? divisionId = null, Guid? itemId = null, bool activeOnly = true, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateOrUpdateSchemeAsync(CreateSchemeRequest request, CancellationToken cancellationToken = default);
    Task<Result<CalculatedSchemeResultDto>> EvaluateSchemeAsync(CalculateSchemeRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<SecondarySalesReconciliationDto>>> GetSecondarySalesReconciliationAsync(DateTime? fromDate = null, DateTime? toDate = null, CancellationToken cancellationToken = default);
    Task<Result<SeedDemoDataResponseDto>> SeedDemoDataAsync(CancellationToken cancellationToken = default);
}


