using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.HRM;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/hrm")]
public class TenantHrmController : BaseApiController
{
    private readonly IHrmService _hrmService;

    public TenantHrmController(IHrmService hrmService)
    {
        _hrmService = hrmService;
    }

    private Guid CurrentUserId
    {
        get
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? User.FindFirstValue("uid");
            return Guid.TryParse(idClaim, out var guid) ? guid : Guid.Empty;
        }
    }

    #region 1. Employee Profiles & Hierarchy

    [HttpGet("employees")]
    [ProducesResponseType(typeof(IReadOnlyList<HrmEmployeeProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEmployees(
        [FromQuery] HrmWorkMode? workMode = null,
        [FromQuery] string? department = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetEmployeeProfilesAsync(workMode, department, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("employees/{id:guid}")]
    [ProducesResponseType(typeof(HrmEmployeeProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEmployeeById(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetEmployeeProfileByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("employees/me")]
    [ProducesResponseType(typeof(HrmEmployeeProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyProfile(CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetEmployeeProfileByUserIdAsync(CurrentUserId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("employees")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateOrUpdateEmployee(
        [FromBody] CreateOrUpdateHrmEmployeeRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.CreateOrUpdateEmployeeProfileAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region 2. Leave Management System (LMS)

    [HttpGet("leaves/types")]
    [ProducesResponseType(typeof(IReadOnlyList<HrmLeaveTypeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLeaveTypes(
        [FromQuery] bool activeOnly = true,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetLeaveTypesAsync(activeOnly, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("leaves/types")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveLeaveType(
        [FromBody] SaveHrmLeaveTypeRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.SaveLeaveTypeAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("leaves/balances/{employeeProfileId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<HrmLeaveBalanceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEmployeeLeaveBalances(
        Guid employeeProfileId,
        [FromQuery] int? year = null,
        CancellationToken cancellationToken = default)
    {
        int targetYear = year ?? DateTime.UtcNow.Year;
        var result = await _hrmService.GetEmployeeLeaveBalancesAsync(employeeProfileId, targetYear, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("leaves/applications")]
    [ProducesResponseType(typeof(IReadOnlyList<HrmLeaveApplicationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLeaveApplications(
        [FromQuery] Guid? employeeProfileId = null,
        [FromQuery] HrmLeaveStatus? status = null,
        [FromQuery] int? month = null,
        [FromQuery] int? year = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetLeaveApplicationsAsync(employeeProfileId, status, month, year, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("leaves/apply")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> ApplyLeave(
        [FromBody] ApplyHrmLeaveRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.ApplyLeaveAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("leaves/review")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> ReviewLeave(
        [FromBody] ReviewHrmLeaveRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.ReviewLeaveApplicationAsync(request, CurrentUserId, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region 3. Attendance & GPS Geofencing

    [HttpPost("attendance/punch")]
    [ProducesResponseType(typeof(HrmAttendanceLogDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> PunchAttendance(
        [FromBody] PunchAttendanceRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.PunchAttendanceAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("attendance/daily")]
    [ProducesResponseType(typeof(IReadOnlyList<HrmAttendanceLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDailyAttendance(
        [FromQuery] DateTime? date = null,
        [FromQuery] HrmWorkMode? workMode = null,
        CancellationToken cancellationToken = default)
    {
        var targetDate = date ?? DateTime.UtcNow.Date;
        var result = await _hrmService.GetDailyAttendanceLogsAsync(targetDate, workMode, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("attendance/monthly/{employeeProfileId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<HrmAttendanceLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMonthlyAttendance(
        Guid employeeProfileId,
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetEmployeeMonthlyAttendanceAsync(employeeProfileId, month, year, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("attendance/summary/{employeeProfileId:guid}")]
    [ProducesResponseType(typeof(HrmAttendanceSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAttendanceSummary(
        Guid employeeProfileId,
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetMonthlyAttendanceSummaryAsync(employeeProfileId, month, year, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region 4. CBO-Standard DA/TA & Statement of Expenses (SOE)

    [HttpGet("expenses/policies")]
    [ProducesResponseType(typeof(IReadOnlyList<HrmStationPolicyDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStationPolicies(CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetStationPoliciesAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("expenses/policies")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveStationPolicy(
        [FromBody] SaveHrmStationPolicyRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.SaveStationPolicyAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("expenses/claims")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> SubmitExpenseClaim(
        [FromBody] SubmitHrmExpenseClaimRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.SubmitExpenseClaimAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("expenses/claims")]
    [ProducesResponseType(typeof(IReadOnlyList<HrmExpenseClaimDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetExpenseClaims(
        [FromQuery] Guid? employeeProfileId = null,
        [FromQuery] int? month = null,
        [FromQuery] int? year = null,
        [FromQuery] HrmExpenseStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetExpenseClaimsAsync(employeeProfileId, month, year, status, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("expenses/claims/review")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> ReviewExpenseClaim(
        [FromBody] ReviewHrmExpenseClaimRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.ReviewExpenseClaimAsync(request, CurrentUserId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("expenses/summary/{employeeProfileId:guid}")]
    [ProducesResponseType(typeof(HrmExpenseMonthlySummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetExpenseSummary(
        Guid employeeProfileId,
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetMonthlyExpenseSummaryAsync(employeeProfileId, month, year, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region 5. Indian Statutory Payroll & Payslips

    [HttpGet("payroll/salary-structure/{employeeProfileId:guid}")]
    [ProducesResponseType(typeof(HrmSalaryStructureDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalaryStructure(
        Guid employeeProfileId,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetSalaryStructureAsync(employeeProfileId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("payroll/salary-structure")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveSalaryStructure(
        [FromBody] SaveHrmSalaryStructureRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.SaveSalaryStructureAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("payroll/batch")]
    [ProducesResponseType(typeof(HrmPayrollCycleDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RunPayrollBatch(
        [FromBody] RunPayrollCycleRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.RunPayrollBatchAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("payroll/cycles")]
    [ProducesResponseType(typeof(IReadOnlyList<HrmPayrollCycleDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPayrollCycles(CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetPayrollCyclesAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("payroll/payslips/{cycleId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<HrmPayslipDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPayslips(Guid cycleId, CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetPayslipsAsync(cycleId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("payroll/payslip")]
    [ProducesResponseType(typeof(HrmPayslipDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEmployeePayslip(
        [FromQuery] Guid employeeProfileId,
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken = default)
    {
        var result = await _hrmService.GetEmployeePayslipAsync(employeeProfileId, month, year, cancellationToken);
        return HandleResult(result);
    }

    #endregion
}
