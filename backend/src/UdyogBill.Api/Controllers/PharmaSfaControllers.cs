using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Pharma;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin/pharma-sfa")]
public class SuperAdminPharmaSfaController : BaseApiController
{
    private readonly IPharmaSfaService _sfaService;

    public SuperAdminPharmaSfaController(IPharmaSfaService sfaService)
    {
        _sfaService = sfaService;
    }

    [HttpGet("calculate-quote")]
    [ProducesResponseType(typeof(PharmaSubscriptionQuoteDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CalculateQuote(
        [FromQuery] bool isAnnual = true,
        [FromQuery] int mrSeats = 5,
        [FromQuery] int managerSeats = 1,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.CalculatePharmaQuoteAsync(isAnnual, mrSeats, managerSeats, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("activate")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ActivatePharmaAddon(
        [FromBody] ActivatePharmaSfaRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _sfaService.ActivatePharmaSfaAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("deactivate/{tenantId:guid}")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeactivatePharmaAddon(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var result = await _sfaService.DeactivateTenantPharmaSfaForAdminAsync(tenantId, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[Route("api/v1/tenant/sfa")]
public class TenantPharmaSfaController : BaseApiController
{
    private readonly IPharmaSfaService _sfaService;

    public TenantPharmaSfaController(IPharmaSfaService sfaService)
    {
        _sfaService = sfaService;
    }

    #region Licensing & Seat Quotas

    [HttpGet("quota")]
    [ProducesResponseType(typeof(SeatQuotaStatusDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQuotaStatus(CancellationToken cancellationToken)
    {
        var result = await _sfaService.GetSeatQuotaStatusAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("activate")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ActivateTenantSfa(CancellationToken cancellationToken)
    {
        var result = await _sfaService.ActivateTenantPharmaSfaAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("deactivate")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeactivateTenantSfa(CancellationToken cancellationToken)
    {
        var result = await _sfaService.DeactivateTenantPharmaSfaAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("validate-seat")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ValidateSeatAddition([FromQuery] string role, CancellationToken cancellationToken)
    {
        var result = await _sfaService.ValidateSeatAdditionAsync(role, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Masters (Divisions, Territories, Patches, Beats, Employees, Doctors, Chemists, Allocations)

    [HttpGet("divisions")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaDivisionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDivisions(CancellationToken cancellationToken)
    {
        var result = await _sfaService.GetDivisionsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("divisions")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateDivision([FromBody] CreateDivisionRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.CreateDivisionAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("territories")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaTerritoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTerritories(CancellationToken cancellationToken)
    {
        var result = await _sfaService.GetTerritoriesAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("territories")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateTerritory([FromBody] CreateTerritoryRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.CreateTerritoryAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("patches")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaPatchDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPatches(
        [FromQuery] Guid? divisionId = null,
        [FromQuery] Guid? areaTerritoryId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetPatchesAsync(divisionId, areaTerritoryId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("patches")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreatePatch([FromBody] CreatePatchRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.CreatePatchAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("beats")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaBeatDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBeats(
        [FromQuery] Guid? patchId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetBeatsAsync(patchId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("beats")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateBeat([FromBody] CreateBeatRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.CreateBeatAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("employees")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaEmployeeProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEmployees(
        [FromQuery] Guid? divisionId = null,
        [FromQuery] SfaDesignationRole? role = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetEmployeesAsync(divisionId, role, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("employees")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateOrUpdateEmployee([FromBody] CreateOrUpdateEmployeeRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.CreateOrUpdateEmployeeAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("doctors")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaDoctorDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDoctors(
        [FromQuery] Guid? territoryId = null,
        [FromQuery] Guid? patchId = null,
        [FromQuery] Guid? beatId = null,
        [FromQuery] Guid? mrUserId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetDoctorsAsync(territoryId, patchId, beatId, mrUserId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("doctors")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateDoctor([FromBody] CreateDoctorRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.CreateDoctorAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("doctors/reallocate")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> ReallocateDoctor([FromBody] ReallocateDoctorRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.ReallocateDoctorAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("doctors/bulk-import")]
    [ProducesResponseType(typeof(BulkImportResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BulkImportDoctors([FromBody] BulkDoctorImportRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.BulkImportDoctorsAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("doctors/{id:guid}/histories")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaDoctorAllocationHistoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDoctorAllocationHistories(Guid id, CancellationToken cancellationToken)
    {
        var result = await _sfaService.GetDoctorAllocationHistoriesAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("chemists")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaChemistDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetChemists(
        [FromQuery] Guid? territoryId = null,
        [FromQuery] Guid? patchId = null,
        [FromQuery] Guid? beatId = null,
        [FromQuery] Guid? mrUserId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetChemistsAsync(territoryId, patchId, beatId, mrUserId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("chemists")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateChemist([FromBody] CreateChemistRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.CreateChemistAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("chemists/bulk-import")]
    [ProducesResponseType(typeof(BulkImportResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BulkImportChemists([FromBody] BulkChemistImportRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.BulkImportChemistsAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("stockists")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaStockistAllocationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStockistAllocations(
        [FromQuery] Guid? stockistPartyId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetStockistAllocationsAsync(stockistPartyId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("stockists/allocate")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> AllocateStockist([FromBody] AllocateStockistRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.AllocateStockistAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Operations (Tour Plans, DCRs, Sample Ledger, POB Orders)

    [HttpGet("tour-plans")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaTourPlanDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTourPlans(
        [FromQuery] int month,
        [FromQuery] int year,
        [FromQuery] Guid? mrUserId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetTourPlansAsync(month, year, mrUserId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("tour-plans/auto-generate")]
    [ProducesResponseType(typeof(SfaTourPlanDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AutoGenerateTourPlan([FromBody] GenerateTourPlanRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.GenerateMonthlyTourPlanAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("tour-plans/compliance")]
    [ProducesResponseType(typeof(DoctorFrequencyComplianceDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDoctorFrequencyCompliance(
        [FromQuery] Guid mrUserId,
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetDoctorFrequencyComplianceAsync(mrUserId, month, year, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("tour-plans")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> SubmitTourPlan([FromBody] CreateTourPlanRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.SubmitTourPlanAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("tour-plans/{id:guid}/submit")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> SubmitTourPlanForApproval(Guid id, CancellationToken cancellationToken)
    {
        var result = await _sfaService.SubmitTourPlanForApprovalAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("tour-plans/{id:guid}/review")]
    [HttpPost("tour-plans/{id:guid}/review")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> ReviewTourPlan(Guid id, [FromBody] ReviewTourPlanRequest? body, [FromQuery] bool? isApproved, [FromQuery] string? remarks = null, CancellationToken cancellationToken = default)
    {
        bool approved = body?.IsApproved ?? isApproved ?? false;
        string? rem = body?.Remarks ?? remarks;
        var result = await _sfaService.ReviewTourPlanAsync(id, approved, rem, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("dcrs")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaDailyCallReportDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDcrs(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] Guid? mrUserId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetDcrsAsync(fromDate, toDate, mrUserId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("dcrs")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> SubmitDcr([FromBody] SubmitDcrRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.SubmitDcrAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("sample-stock")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaSampleStockDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMrSampleStock([FromQuery] Guid? mrUserId = null, CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetMrSampleStockAsync(mrUserId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("pob-orders")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaPobOrderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPobOrders(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] Guid? mrUserId = null,
        [FromQuery] Guid? customerPartyId = null,
        [FromQuery] Guid? targetStockistPartyId = null,
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetPobOrdersAsync(fromDate, toDate, mrUserId, customerPartyId, targetStockistPartyId, status, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("pob-orders")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreatePobOrder([FromBody] CreatePobOrderRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.CreatePobOrderAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("pob-orders/{id:guid}/convert-to-invoice")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConvertPobToInvoice(Guid id, [FromQuery] Guid warehouseId, CancellationToken cancellationToken)
    {
        var result = await _sfaService.ConvertPobToInvoiceAsync(id, warehouseId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("pob-orders/fulfillment-status")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdatePobFulfillmentStatus([FromBody] UpdatePobFulfillmentStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.UpdatePobFulfillmentStatusAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("pob-orders/route")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RoutePobToStockist([FromBody] RoutePobToStockistRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.RoutePobToStockistAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Reports & Reconciliation

    [HttpGet("reports/sales-attribution")]
    [ProducesResponseType(typeof(IReadOnlyList<MrSalesAttributionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalesAttributions(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? mrUserId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetSalesAttributionsAsync(fromDate, toDate, mrUserId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("reports/reconciliation")]
    [ProducesResponseType(typeof(PharmaReconciliationReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReconciliation(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetReconciliationReportAsync(fromDate, toDate, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("reports/target-achievement")]
    [ProducesResponseType(typeof(IReadOnlyList<MrTargetVsAchievementDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTargetVsAchievement(
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetTargetVsAchievementAsync(month, year, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Sprint 4: Multi-Level Hierarchy, Manager Oversight & Expense Policies

    [HttpGet("hierarchy")]
    [ProducesResponseType(typeof(IReadOnlyList<UserHierarchyDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHierarchies(CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetHierarchiesAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("hierarchy/tree")]
    [ProducesResponseType(typeof(OrgNodeDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrgTree([FromQuery] Guid? rootUserId = null, CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetOrgTreeAsync(rootUserId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("hierarchy")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateOrUpdateHierarchy([FromBody] CreateUserHierarchyRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.CreateOrUpdateHierarchyAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("compliance/team")]
    [ProducesResponseType(typeof(TeamCallComplianceSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTeamCallCompliance(
        [FromQuery] Guid managerUserId,
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetTeamCallComplianceAsync(managerUserId, month, year, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("expense-policies")]
    [ProducesResponseType(typeof(IReadOnlyList<ExpensePolicyDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetExpensePolicies(CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetExpensePoliciesAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("expense-policies/active")]
    [ProducesResponseType(typeof(ExpensePolicyDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActiveExpensePolicy(CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetActiveExpensePolicyAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("expense-policies")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SaveExpensePolicy([FromBody] SaveExpensePolicyRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.SaveExpensePolicyAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("expense-policies/calculate")]
    [ProducesResponseType(typeof(ExpenseEligibilityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CalculateExpenseEligibility([FromBody] CalculateExpenseEligibilityRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.CalculateExpenseEligibilityAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("expense-claims/process")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ProcessExpenseClaimAction([FromBody] ManagerExpenseClaimActionRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.ProcessExpenseClaimActionAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Sprint 5: Trade Schemes, POB Routing & Secondary Reconciliation

    [HttpGet("schemes")]
    [ProducesResponseType(typeof(IReadOnlyList<SfaSchemeMasterDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSchemes(
        [FromQuery] Guid? divisionId = null,
        [FromQuery] Guid? itemId = null,
        [FromQuery] bool activeOnly = true,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetSchemesAsync(divisionId, itemId, activeOnly, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("schemes")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateOrUpdateScheme([FromBody] CreateSchemeRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.CreateOrUpdateSchemeAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("schemes/evaluate")]
    [ProducesResponseType(typeof(CalculatedSchemeResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> EvaluateScheme([FromBody] CalculateSchemeRequest request, CancellationToken cancellationToken)
    {
        var result = await _sfaService.EvaluateSchemeAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("attribution/secondary-reconciliation")]
    [ProducesResponseType(typeof(IReadOnlyList<SecondarySalesReconciliationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSecondarySalesReconciliation(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.GetSecondarySalesReconciliationAsync(fromDate, toDate, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("seed-demo-data")]
    [ProducesResponseType(typeof(SeedDemoDataResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SeedDemoData(CancellationToken cancellationToken = default)
    {
        var result = await _sfaService.SeedDemoDataAsync(cancellationToken);
        return HandleResult(result);
    }

    #endregion
}


