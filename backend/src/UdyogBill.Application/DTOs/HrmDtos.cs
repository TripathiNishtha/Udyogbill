using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.HRM;

namespace UdyogBill.Application.DTOs;

#region 1. Employee Profile DTOs

public record HrmEmployeeProfileDto(
    Guid Id,
    Guid UserId,
    string FullName,
    string Email,
    string PhoneNumber,
    string EmployeeCode,
    string Department,
    string Designation,
    HrmWorkMode WorkMode,
    HrmStationType DefaultStationType,
    Guid? ReportingManagerUserId,
    string? ReportingManagerName,
    string HeadquarterCity,
    Guid? SfaDivisionId,
    Guid? SfaTerritoryId,
    string PanNumber,
    string AadhaarNumber,
    string UanNumber,
    string EsicNumber,
    string BankName,
    string BankAccountNumber,
    string BankIfscCode,
    string BankBranchName,
    double? OfficeLatitude,
    double? OfficeLongitude,
    int OfficeGeofenceRadiusMeters,
    string? OfficeWifiSsid,
    DateTime JoiningDate,
    bool IsActive
);

public record CreateOrUpdateHrmEmployeeRequest(
    Guid? ProfileId,
    Guid UserId,
    string EmployeeCode,
    string Department,
    string Designation,
    HrmWorkMode WorkMode,
    HrmStationType DefaultStationType,
    Guid? ReportingManagerUserId,
    string HeadquarterCity,
    Guid? SfaDivisionId,
    Guid? SfaTerritoryId,
    string PanNumber,
    string AadhaarNumber,
    string UanNumber,
    string EsicNumber,
    string BankName,
    string BankAccountNumber,
    string BankIfscCode,
    string BankBranchName,
    double? OfficeLatitude,
    double? OfficeLongitude,
    int OfficeGeofenceRadiusMeters,
    string? OfficeWifiSsid,
    DateTime? JoiningDate
);

#endregion

#region 2. Leave Management (LMS) DTOs

public record HrmLeaveTypeDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    decimal AnnualQuotaDays,
    bool IsPaid,
    bool AllowCarryForward,
    decimal MaxCarryForwardDays,
    bool RequiresMedicalCertificate,
    int MinNoticeDays,
    bool IsActive
);

public record SaveHrmLeaveTypeRequest(
    Guid? Id,
    string Code,
    string Name,
    string Description,
    decimal AnnualQuotaDays,
    bool IsPaid,
    bool AllowCarryForward,
    decimal MaxCarryForwardDays,
    bool RequiresMedicalCertificate,
    int MinNoticeDays,
    bool IsActive
);

public record HrmLeaveBalanceDto(
    Guid LeaveTypeId,
    string LeaveTypeCode,
    string LeaveTypeName,
    int CalendarYear,
    decimal TotalAllocatedDays,
    decimal CarriedForwardDays,
    decimal UsedDays,
    decimal PendingApprovalDays,
    decimal AvailableDays
);

public record HrmLeaveApplicationDto(
    Guid Id,
    Guid EmployeeProfileId,
    string EmployeeName,
    string EmployeeCode,
    Guid LeaveTypeId,
    string LeaveTypeCode,
    string LeaveTypeName,
    DateTime FromDate,
    DateTime ToDate,
    decimal TotalDays,
    bool IsHalfDay,
    string Reason,
    HrmLeaveStatus Status,
    string StatusName,
    Guid? ReviewedByUserId,
    string? ReviewedByName,
    DateTime? ReviewedAtUtc,
    string? ManagerRemarks,
    DateTimeOffset CreatedAtUtc
);

public record ApplyHrmLeaveRequest(
    Guid EmployeeProfileId,
    Guid LeaveTypeId,
    DateTime FromDate,
    DateTime ToDate,
    bool IsHalfDay,
    string Reason
);

public record ReviewHrmLeaveRequest(
    Guid ApplicationId,
    bool IsApproved,
    string? Remarks
);

#endregion

#region 3. Attendance & GPS Geofence DTOs

public record HrmAttendanceLogDto(
    Guid Id,
    Guid EmployeeProfileId,
    string EmployeeName,
    string EmployeeCode,
    DateTime AttendanceDate,
    DateTime? PunchInTimeUtc,
    DateTime? PunchOutTimeUtc,
    HrmAttendanceStatus Status,
    string StatusName,
    HrmWorkMode WorkModeAtPunch,
    double? PunchInLatitude,
    double? PunchInLongitude,
    bool IsPunchInGeofenceVerified,
    string? PunchInAddress,
    double? PunchOutLatitude,
    double? PunchOutLongitude,
    string? PunchOutAddress,
    int BatteryPercentage,
    string? SelfieImageUrl,
    double TotalWorkHours,
    int LateMinutes,
    bool IsLateMark,
    Guid? AssociatedDcrId,
    string? Remarks
);

public record PunchAttendanceRequest(
    Guid EmployeeProfileId,
    bool IsPunchIn, // true = In, false = Out
    double Latitude,
    double Longitude,
    string? Address,
    int BatteryPercentage,
    string? SelfieImageUrl,
    string? WifiSsid,
    Guid? AssociatedDcrId,
    string? Remarks
);

public record HrmAttendanceSummaryDto(
    int TotalDaysInMonth,
    int PresentDays,
    int HalfDays,
    int LeavesTaken,
    int AbsentDays,
    int Holidays,
    int LateMarks,
    double TotalHoursWorked
);

#endregion

#region 4. CBO-Standard DA/TA & Expense SOE DTOs

public record HrmStationPolicyDto(
    Guid Id,
    string Designation,
    HrmStationType StationType,
    decimal DailyAllowanceRate,
    decimal BikeRatePerKm,
    decimal CarRatePerKm,
    decimal HotelStayMaxLimit,
    bool RequiresReceiptAboveAmount,
    decimal ReceiptThresholdAmount
);

public record SaveHrmStationPolicyRequest(
    Guid? Id,
    string Designation,
    HrmStationType StationType,
    decimal DailyAllowanceRate,
    decimal BikeRatePerKm,
    decimal CarRatePerKm,
    decimal HotelStayMaxLimit,
    bool RequiresReceiptAboveAmount,
    decimal ReceiptThresholdAmount
);

public record HrmExpenseClaimDto(
    Guid Id,
    Guid EmployeeProfileId,
    string EmployeeName,
    DateTime ClaimDate,
    string Category,
    HrmStationType StationType,
    decimal ClaimedDistanceKm,
    decimal ClaimedAmount,
    decimal ApprovedAmount,
    string Description,
    string? ReceiptAttachmentUrl,
    Guid? SfaDailyCallReportId,
    HrmExpenseStatus Status,
    string StatusName,
    Guid? ApprovedByUserId,
    string? ApprovedByName,
    DateTime? ApprovedAtUtc,
    string? ApprovalRemarks
);

public record SubmitHrmExpenseClaimRequest(
    Guid EmployeeProfileId,
    DateTime ClaimDate,
    string Category,
    HrmStationType StationType,
    decimal ClaimedDistanceKm,
    decimal ClaimedAmount,
    string Description,
    string? ReceiptAttachmentUrl,
    Guid? SfaDailyCallReportId
);

public record ReviewHrmExpenseClaimRequest(
    Guid ClaimId,
    bool IsApproved,
    decimal ApprovedAmount,
    string? Remarks
);

public record HrmExpenseMonthlySummaryDto(
    int Month,
    int Year,
    decimal TotalClaimed,
    decimal TotalApproved,
    int TotalBillsSubmitted,
    int PendingApprovalCount,
    IReadOnlyList<HrmExpenseClaimDto> Claims
);

#endregion

#region 5. Indian Statutory Payroll & Payslip DTOs

public record HrmSalaryStructureDto(
    Guid Id,
    Guid EmployeeProfileId,
    decimal MonthlyGrossSalary,
    decimal BasicSalary,
    decimal HouseRentAllowance,
    decimal ConveyanceAllowance,
    decimal SpecialAllowance,
    bool IsPfApplicable,
    bool IsEsicApplicable,
    bool IsProfessionalTaxApplicable,
    decimal EstimatedMonthlyTds,
    decimal CurrentOutstandingAdvance
);

public record SaveHrmSalaryStructureRequest(
    Guid EmployeeProfileId,
    decimal MonthlyGrossSalary,
    decimal BasicSalary,
    decimal HouseRentAllowance,
    decimal ConveyanceAllowance,
    decimal SpecialAllowance,
    bool IsPfApplicable,
    bool IsEsicApplicable,
    bool IsProfessionalTaxApplicable,
    decimal EstimatedMonthlyTds,
    decimal CurrentOutstandingAdvance
);

public record HrmPayrollCycleDto(
    Guid Id,
    int Month,
    int Year,
    string BatchTitle,
    int TotalEmployeesProcessed,
    decimal TotalGrossPayout,
    decimal TotalNetPayout,
    decimal TotalPfContribution,
    decimal TotalEsicContribution,
    HrmPayrollStatus Status,
    string StatusName,
    DateTime? FinalizedAtUtc,
    DateTime? DisbursedAtUtc
);

public record RunPayrollCycleRequest(
    int Month,
    int Year,
    string? BatchTitle
);

public record HrmPayslipDto(
    Guid Id,
    Guid PayrollCycleId,
    Guid EmployeeProfileId,
    string EmployeeName,
    string EmployeeCode,
    string Designation,
    string Department,
    string BankName,
    string BankAccountNumber,
    string BankIfscCode,
    string PanNumber,
    string UanNumber,
    int Month,
    int Year,
    int CalendarDaysInMonth,
    decimal PayableDays,
    decimal LossOfPayDays,
    decimal BasicEarned,
    decimal HraEarned,
    decimal ConveyanceEarned,
    decimal SpecialAllowanceEarned,
    decimal SalesIncentiveEarned,
    decimal ReimbursedExpensesEarned,
    decimal TotalGrossEarnings,
    decimal EmployeePfDeduction,
    decimal EmployeeEsicDeduction,
    decimal ProfessionalTaxDeduction,
    decimal TdsDeduction,
    decimal SalaryAdvanceRecovery,
    decimal TotalDeductions,
    decimal NetSalaryPayable,
    bool IsDisbursed,
    DateTime? DisbursedAtUtc,
    string? PaymentReferenceTransactionId
);

#endregion
