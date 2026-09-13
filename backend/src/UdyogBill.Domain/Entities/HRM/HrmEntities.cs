using System;
using System.Collections.Generic;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Tenants;

namespace UdyogBill.Domain.Entities.HRM;

public enum HrmWorkMode
{
    OfficeStaff = 1,
    FieldStaff = 2,
    Hybrid = 3
}

public enum HrmStationType
{
    LocalHq = 1,
    ExStation = 2,
    OutStation = 3
}

public enum HrmLeaveStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    Cancelled = 4
}

public enum HrmAttendanceStatus
{
    Present = 1,
    HalfDay = 2,
    Absent = 3,
    Holiday = 4,
    OnLeave = 5,
    WeeklyOff = 6
}

public enum HrmExpenseStatus
{
    Draft = 1,
    Submitted = 2,
    ManagerApproved = 3,
    AccountApproved = 4,
    Paid = 5,
    Rejected = 6
}

public enum HrmPayrollStatus
{
    Draft = 1,
    Calculated = 2,
    Finalized = 3,
    Disbursed = 4
}

/// <summary>
/// Master profile for every employee (Field, Office, or Hybrid).
/// </summary>
public class HrmEmployeeProfile : BaseTenantAuditableEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string EmployeeCode { get; set; } = string.Empty; // e.g. "EMP-001" or "MR-2026-101"
    public string Department { get; set; } = "General"; // Sales, Accounts, Warehouse, Administration, Production
    public string Designation { get; set; } = "Executive"; // MR, ABM, RBM, Cashier, Accountant
    public HrmWorkMode WorkMode { get; set; } = HrmWorkMode.OfficeStaff;
    public HrmStationType DefaultStationType { get; set; } = HrmStationType.LocalHq;

    // Reporting Manager in Hierarchy
    public Guid? ReportingManagerUserId { get; set; }
    public User? ReportingManagerUser { get; set; }

    // Station & Headquarters
    public string HeadquarterCity { get; set; } = string.Empty;
    public Guid? SfaDivisionId { get; set; }
    public Guid? SfaTerritoryId { get; set; }

    // KYC & Statutory
    public string PanNumber { get; set; } = string.Empty;
    public string AadhaarNumber { get; set; } = string.Empty;
    public string UanNumber { get; set; } = string.Empty; // PF UAN
    public string EsicNumber { get; set; } = string.Empty; // ESIC IP No

    // Banking for NEFT Payouts
    public string BankName { get; set; } = string.Empty;
    public string BankAccountNumber { get; set; } = string.Empty;
    public string BankIfscCode { get; set; } = string.Empty;
    public string BankBranchName { get; set; } = string.Empty;

    // Office Geofence (if Office or Hybrid)
    public double? OfficeLatitude { get; set; }
    public double? OfficeLongitude { get; set; }
    public int OfficeGeofenceRadiusMeters { get; set; } = 100;
    public string? OfficeWifiSsid { get; set; }

    public DateTime JoiningDate { get; set; } = DateTime.UtcNow.Date;
    public DateTime? ResignationDate { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public HrmSalaryStructure? SalaryStructure { get; set; }
    public ICollection<HrmLeaveBalance> LeaveBalances { get; set; } = new List<HrmLeaveBalance>();
    public ICollection<HrmLeaveApplication> LeaveApplications { get; set; } = new List<HrmLeaveApplication>();
    public ICollection<HrmAttendanceLog> AttendanceLogs { get; set; } = new List<HrmAttendanceLog>();
    public ICollection<HrmExpenseClaim> ExpenseClaims { get; set; } = new List<HrmExpenseClaim>();
    public ICollection<HrmPayslip> Payslips { get; set; } = new List<HrmPayslip>();
}

/// <summary>
/// Tenant-wide Leave Policy Master (CL, SL, PL, Comp-Off, LWP, RH).
/// </summary>
public class HrmLeaveType : BaseTenantAuditableEntity
{
    public string Code { get; set; } = "CL"; // CL, SL, PL, RH, COMP_OFF, LWP
    public string Name { get; set; } = "Casual Leave";
    public string Description { get; set; } = string.Empty;
    public decimal AnnualQuotaDays { get; set; } = 12;
    public bool IsPaid { get; set; } = true;
    public bool AllowCarryForward { get; set; } = false;
    public decimal MaxCarryForwardDays { get; set; } = 0;
    public bool RequiresMedicalCertificate { get; set; } = false;
    public int MinNoticeDays { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Real-time quota balance for an employee in a calendar year.
/// </summary>
public class HrmLeaveBalance : BaseTenantAuditableEntity
{
    public Guid EmployeeProfileId { get; set; }
    public HrmEmployeeProfile EmployeeProfile { get; set; } = null!;

    public Guid LeaveTypeId { get; set; }
    public HrmLeaveType LeaveType { get; set; } = null!;

    public int CalendarYear { get; set; } = DateTime.UtcNow.Year;
    public decimal TotalAllocatedDays { get; set; }
    public decimal CarriedForwardDays { get; set; }
    public decimal UsedDays { get; set; }
    public decimal PendingApprovalDays { get; set; }

    public decimal AvailableDays => (TotalAllocatedDays + CarriedForwardDays) - (UsedDays + PendingApprovalDays);
}

/// <summary>
/// Leave Application with Manager Approval Workflow.
/// </summary>
public class HrmLeaveApplication : BaseTenantAuditableEntity
{
    public Guid EmployeeProfileId { get; set; }
    public HrmEmployeeProfile EmployeeProfile { get; set; } = null!;

    public Guid LeaveTypeId { get; set; }
    public HrmLeaveType LeaveType { get; set; } = null!;

    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal TotalDays { get; set; }
    public bool IsHalfDay { get; set; } = false;
    public string Reason { get; set; } = string.Empty;

    public HrmLeaveStatus Status { get; set; } = HrmLeaveStatus.Pending;

    public Guid? ReviewedByUserId { get; set; }
    public User? ReviewedByUser { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? ManagerRemarks { get; set; }
}

/// <summary>
/// Unified Daily Attendance log with GPS verification & Office Geofence.
/// </summary>
public class HrmAttendanceLog : BaseTenantAuditableEntity
{
    public Guid EmployeeProfileId { get; set; }
    public HrmEmployeeProfile EmployeeProfile { get; set; } = null!;

    public DateTime AttendanceDate { get; set; }
    public DateTime? PunchInTimeUtc { get; set; }
    public DateTime? PunchOutTimeUtc { get; set; }

    public HrmAttendanceStatus Status { get; set; } = HrmAttendanceStatus.Present;
    public HrmWorkMode WorkModeAtPunch { get; set; }

    // Geo-Verification
    public double? PunchInLatitude { get; set; }
    public double? PunchInLongitude { get; set; }
    public bool IsPunchInGeofenceVerified { get; set; }
    public string? PunchInAddress { get; set; }

    public double? PunchOutLatitude { get; set; }
    public double? PunchOutLongitude { get; set; }
    public string? PunchOutAddress { get; set; }

    public int BatteryPercentage { get; set; } = 100;
    public string? SelfieImageUrl { get; set; }

    // Derived Metrics
    public double TotalWorkHours { get; set; }
    public int LateMinutes { get; set; }
    public bool IsLateMark { get; set; }

    public Guid? AssociatedDcrId { get; set; } // If FieldStaff auto-linked to SfaDailyCallReport
    public string? Remarks { get; set; }
}

/// <summary>
/// CBO-grade Daily Allowance (DA) and Travel Allowance (TA) policy by Station & Designation.
/// </summary>
public class HrmStationPolicy : BaseTenantAuditableEntity
{
    public string Designation { get; set; } = "MR"; // MR, ABM, RBM, Executive
    public HrmStationType StationType { get; set; } = HrmStationType.LocalHq;

    public decimal DailyAllowanceRate { get; set; } = 220; // e.g. Local HQ: 220, Ex: 420, OS: 850
    public decimal BikeRatePerKm { get; set; } = 3.50m;
    public decimal CarRatePerKm { get; set; } = 8.00m;
    public decimal HotelStayMaxLimit { get; set; } = 0; // For OutStation
    public bool RequiresReceiptAboveAmount { get; set; } = true;
    public decimal ReceiptThresholdAmount { get; set; } = 500;
}

/// <summary>
/// Statement of Expenses (SOE) Claim Line Item.
/// </summary>
public class HrmExpenseClaim : BaseTenantAuditableEntity
{
    public Guid EmployeeProfileId { get; set; }
    public HrmEmployeeProfile EmployeeProfile { get; set; } = null!;

    public DateTime ClaimDate { get; set; }
    public string Category { get; set; } = "DA"; // DA, TA_Bike, TA_Car, Bus_Fare, Hotel, Postage, Misc
    public HrmStationType StationType { get; set; } = HrmStationType.LocalHq;

    public decimal ClaimedDistanceKm { get; set; }
    public decimal ClaimedAmount { get; set; }
    public decimal ApprovedAmount { get; set; }

    public string Description { get; set; } = string.Empty;
    public string? ReceiptAttachmentUrl { get; set; }

    public Guid? SfaDailyCallReportId { get; set; } // Auto-validated against DCR route
    public HrmExpenseStatus Status { get; set; } = HrmExpenseStatus.Submitted;

    public Guid? ApprovedByUserId { get; set; }
    public User? ApprovedByUser { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public string? ApprovalRemarks { get; set; }
}

/// <summary>
/// Indian CTC & Salary Breakdown per employee.
/// </summary>
public class HrmSalaryStructure : BaseTenantAuditableEntity
{
    public Guid EmployeeProfileId { get; set; }
    public HrmEmployeeProfile EmployeeProfile { get; set; } = null!;

    public decimal MonthlyGrossSalary { get; set; } = 25000;
    public decimal BasicSalary { get; set; } = 12500; // ~50%
    public decimal HouseRentAllowance { get; set; } = 5000; // ~20%
    public decimal ConveyanceAllowance { get; set; } = 2500;
    public decimal SpecialAllowance { get; set; } = 5000;

    // Statutory Toggles
    public bool IsPfApplicable { get; set; } = true;
    public bool IsEsicApplicable { get; set; } = true;
    public bool IsProfessionalTaxApplicable { get; set; } = true;

    public decimal EstimatedMonthlyTds { get; set; } = 0;
    public decimal CurrentOutstandingAdvance { get; set; } = 0;
}

/// <summary>
/// Monthly Payroll Cycle batch.
/// </summary>
public class HrmPayrollCycle : BaseTenantAuditableEntity
{
    public int Month { get; set; } // 1 - 12
    public int Year { get; set; } // e.g. 2026
    public string BatchTitle { get; set; } = string.Empty; // "September 2026 Payroll"

    public int TotalEmployeesProcessed { get; set; }
    public decimal TotalGrossPayout { get; set; }
    public decimal TotalNetPayout { get; set; }
    public decimal TotalPfContribution { get; set; }
    public decimal TotalEsicContribution { get; set; }

    public HrmPayrollStatus Status { get; set; } = HrmPayrollStatus.Draft;
    public DateTime? FinalizedAtUtc { get; set; }
    public DateTime? DisbursedAtUtc { get; set; }
}

/// <summary>
/// Individual processed employee monthly payslip.
/// </summary>
public class HrmPayslip : BaseTenantAuditableEntity
{
    public Guid PayrollCycleId { get; set; }
    public HrmPayrollCycle PayrollCycle { get; set; } = null!;

    public Guid EmployeeProfileId { get; set; }
    public HrmEmployeeProfile EmployeeProfile { get; set; } = null!;

    public int Month { get; set; }
    public int Year { get; set; }

    // Attendance Breakdown
    public int CalendarDaysInMonth { get; set; } = 30;
    public decimal PayableDays { get; set; } = 30;
    public decimal LossOfPayDays { get; set; } = 0;

    // Earnings
    public decimal BasicEarned { get; set; }
    public decimal HraEarned { get; set; }
    public decimal ConveyanceEarned { get; set; }
    public decimal SpecialAllowanceEarned { get; set; }
    public decimal SalesIncentiveEarned { get; set; } // Integrated from POB/Secondary sales
    public decimal ReimbursedExpensesEarned { get; set; } // Approved DA/TA
    public decimal TotalGrossEarnings => BasicEarned + HraEarned + ConveyanceEarned + SpecialAllowanceEarned + SalesIncentiveEarned + ReimbursedExpensesEarned;

    // Deductions
    public decimal EmployeePfDeduction { get; set; } // 12%
    public decimal EmployeeEsicDeduction { get; set; } // 0.75%
    public decimal ProfessionalTaxDeduction { get; set; }
    public decimal TdsDeduction { get; set; }
    public decimal SalaryAdvanceRecovery { get; set; }
    public decimal TotalDeductions => EmployeePfDeduction + EmployeeEsicDeduction + ProfessionalTaxDeduction + TdsDeduction + SalaryAdvanceRecovery;

    // Net Payout
    public decimal NetSalaryPayable => TotalGrossEarnings - TotalDeductions;

    public bool IsDisbursed { get; set; } = false;
    public DateTime? DisbursedAtUtc { get; set; }
    public string? PaymentReferenceTransactionId { get; set; }
}
