using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.HRM;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IHrmService
{
    #region 1. Employee Profile & Hierarchy

    Task<Result<IReadOnlyList<HrmEmployeeProfileDto>>> GetEmployeeProfilesAsync(
        HrmWorkMode? workMode = null,
        string? department = null,
        CancellationToken cancellationToken = default);

    Task<Result<HrmEmployeeProfileDto>> GetEmployeeProfileByIdAsync(
        Guid profileId,
        CancellationToken cancellationToken = default);

    Task<Result<HrmEmployeeProfileDto>> GetEmployeeProfileByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<Result<Guid>> CreateOrUpdateEmployeeProfileAsync(
        CreateOrUpdateHrmEmployeeRequest request,
        CancellationToken cancellationToken = default);

    #endregion

    #region 2. Leave Management System (LMS)

    Task<Result<IReadOnlyList<HrmLeaveTypeDto>>> GetLeaveTypesAsync(
        bool activeOnly = true,
        CancellationToken cancellationToken = default);

    Task<Result<Guid>> SaveLeaveTypeAsync(
        SaveHrmLeaveTypeRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<HrmLeaveBalanceDto>>> GetEmployeeLeaveBalancesAsync(
        Guid employeeProfileId,
        int year,
        CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<HrmLeaveApplicationDto>>> GetLeaveApplicationsAsync(
        Guid? employeeProfileId = null,
        HrmLeaveStatus? status = null,
        int? month = null,
        int? year = null,
        CancellationToken cancellationToken = default);

    Task<Result<Guid>> ApplyLeaveAsync(
        ApplyHrmLeaveRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<bool>> ReviewLeaveApplicationAsync(
        ReviewHrmLeaveRequest request,
        Guid reviewerUserId,
        CancellationToken cancellationToken = default);

    #endregion

    #region 3. Attendance & GPS Geofencing

    Task<Result<HrmAttendanceLogDto>> PunchAttendanceAsync(
        PunchAttendanceRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<HrmAttendanceLogDto>>> GetDailyAttendanceLogsAsync(
        DateTime date,
        HrmWorkMode? workMode = null,
        CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<HrmAttendanceLogDto>>> GetEmployeeMonthlyAttendanceAsync(
        Guid employeeProfileId,
        int month,
        int year,
        CancellationToken cancellationToken = default);

    Task<Result<HrmAttendanceSummaryDto>> GetMonthlyAttendanceSummaryAsync(
        Guid employeeProfileId,
        int month,
        int year,
        CancellationToken cancellationToken = default);

    #endregion

    #region 4. CBO-Standard DA/TA & Statement of Expenses (SOE)

    Task<Result<IReadOnlyList<HrmStationPolicyDto>>> GetStationPoliciesAsync(
        CancellationToken cancellationToken = default);

    Task<Result<Guid>> SaveStationPolicyAsync(
        SaveHrmStationPolicyRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<Guid>> SubmitExpenseClaimAsync(
        SubmitHrmExpenseClaimRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<HrmExpenseClaimDto>>> GetExpenseClaimsAsync(
        Guid? employeeProfileId = null,
        int? month = null,
        int? year = null,
        HrmExpenseStatus? status = null,
        CancellationToken cancellationToken = default);

    Task<Result<bool>> ReviewExpenseClaimAsync(
        ReviewHrmExpenseClaimRequest request,
        Guid reviewerUserId,
        CancellationToken cancellationToken = default);

    Task<Result<HrmExpenseMonthlySummaryDto>> GetMonthlyExpenseSummaryAsync(
        Guid employeeProfileId,
        int month,
        int year,
        CancellationToken cancellationToken = default);

    #endregion

    #region 5. Indian Statutory Payroll & Payslips

    Task<Result<HrmSalaryStructureDto>> GetSalaryStructureAsync(
        Guid employeeProfileId,
        CancellationToken cancellationToken = default);

    Task<Result<Guid>> SaveSalaryStructureAsync(
        SaveHrmSalaryStructureRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<HrmPayrollCycleDto>> RunPayrollBatchAsync(
        RunPayrollCycleRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<HrmPayrollCycleDto>>> GetPayrollCyclesAsync(
        CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<HrmPayslipDto>>> GetPayslipsAsync(
        Guid payrollCycleId,
        CancellationToken cancellationToken = default);

    Task<Result<HrmPayslipDto>> GetEmployeePayslipAsync(
        Guid employeeProfileId,
        int month,
        int year,
        CancellationToken cancellationToken = default);

    #endregion
}
