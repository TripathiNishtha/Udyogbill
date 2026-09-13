import { apiClient } from "@/lib/api-client";

export interface HrmEmployeeProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  employeeCode: string;
  department: string;
  designation: string;
  workMode: number; // 1: OfficeStaff, 2: FieldStaff, 3: Hybrid
  workModeName: string;
  defaultStationType: number; // 1: LocalHq, 2: ExStation, 3: OutStation
  stationTypeName: string;
  reportingManagerUserId?: string;
  reportingManagerName?: string;
  headquarterCity: string;
  panNumber: string;
  aadhaarNumber: string;
  uanNumber: string;
  esicNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  bankBranchName: string;
  officeLatitude?: number;
  officeLongitude?: number;
  officeGeofenceRadiusMeters: number;
  officeWifiSsid?: string;
  joiningDate?: string;
  monthlyGrossSalary?: number;
}

export interface HrmLeaveType {
  id: string;
  code: string;
  name: string;
  description: string;
  annualQuotaDays: number;
  isPaid: boolean;
  allowCarryForward: boolean;
  maxCarryForwardDays: number;
  requiresMedicalCertificate: boolean;
  minNoticeDays: number;
  isActive: boolean;
}

export interface HrmLeaveBalance {
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  calendarYear: number;
  totalAllocatedDays: number;
  carriedForwardDays: number;
  usedDays: number;
  pendingApprovalDays: number;
  availableDays: number;
}

export interface HrmLeaveApplication {
  id: string;
  employeeProfileId: string;
  employeeName: string;
  employeeCode: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  isHalfDay: boolean;
  reason: string;
  status: number; // 1: Pending, 2: Approved, 3: Rejected, 4: Cancelled
  statusName: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAtUtc?: string;
  managerRemarks?: string;
  createdAtUtc: string;
}

export interface HrmAttendanceLog {
  id: string;
  employeeProfileId: string;
  employeeName: string;
  employeeCode: string;
  attendanceDate: string;
  punchInTimeUtc?: string;
  punchOutTimeUtc?: string;
  status: number;
  statusName: string;
  workModeAtPunch: number;
  workModeName: string;
  punchInLatitude?: number;
  punchInLongitude?: number;
  isPunchInGeofenceVerified: boolean;
  punchInAddress?: string;
  punchOutLatitude?: number;
  punchOutLongitude?: number;
  punchOutAddress?: string;
  totalWorkHours?: number;
  isLateMark: boolean;
  lateMinutes: number;
  batteryPercentage?: number;
  selfieImageUrl?: string;
  remarks?: string;
}

export interface HrmStationPolicy {
  id: string;
  designation: string;
  stationType: number;
  stationTypeName: string;
  dailyAllowanceRate: number;
  bikeRatePerKm: number;
  carRatePerKm: number;
  hotelStayMaxLimit: number;
  requiresReceiptAboveAmount: boolean;
  receiptThresholdAmount: number;
}

export interface HrmExpenseClaim {
  id: string;
  employeeProfileId: string;
  employeeName: string;
  employeeCode: string;
  claimDate: string;
  category: string;
  stationType: number;
  stationTypeName: string;
  claimedDistanceKm: number;
  claimedAmount: number;
  approvedAmount: number;
  description: string;
  receiptAttachmentUrl?: string;
  sfaDailyCallReportId?: string;
  status: number;
  statusName: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAtUtc?: string;
  managerRemarks?: string;
}

export interface HrmSalaryStructure {
  id: string;
  employeeProfileId: string;
  employeeName: string;
  monthlyGrossSalary: number;
  basicSalary: number;
  houseRentAllowance: number;
  conveyanceAllowance: number;
  specialAllowance: number;
  isPfApplicable: boolean;
  isEsicApplicable: boolean;
  isProfessionalTaxApplicable: boolean;
  estimatedMonthlyTds: number;
  currentOutstandingAdvance: number;
}

export interface HrmPayrollCycle {
  id: string;
  month: number;
  year: number;
  batchTitle: string;
  totalEmployeesProcessed: number;
  totalGrossPayout: number;
  totalNetPayout: number;
  totalPfContribution: number;
  totalEsicContribution: number;
  status: number;
  statusName: string;
  finalizedAtUtc?: string;
  disbursedAtUtc?: string;
}

export interface HrmPayslip {
  id: string;
  payrollCycleId: string;
  employeeProfileId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  bankName: string;
  bankAccountNumber: string;
  panNumber: string;
  uanNumber: string;
  esicNumber: string;
  month: number;
  year: number;
  calendarDaysInMonth: number;
  payableDays: number;
  lossOfPayDays: number;
  basicEarned: number;
  hraEarned: number;
  conveyanceEarned: number;
  specialAllowanceEarned: number;
  salesIncentiveEarned: number;
  reimbursedExpensesEarned: number;
  totalGrossEarnings: number;
  employeePfDeduction: number;
  employeeEsicDeduction: number;
  professionalTaxDeduction: number;
  tdsDeduction: number;
  salaryAdvanceRecovery: number;
  totalDeductions: number;
  netSalaryPayable: number;
}

export const hrmService = {
  // 1. Employee Profiles
  async getEmployees(): Promise<HrmEmployeeProfile[]> {
    const res = await apiClient.get<HrmEmployeeProfile[]>("/tenant/hrm/employees");
    return res.data;
  },

  async saveEmployee(data: Partial<HrmEmployeeProfile>): Promise<string> {
    const res = await apiClient.post<string>("/tenant/hrm/employees", data);
    return res.data;
  },

  // 2. Leave Management (LMS)
  async getLeaveTypes(): Promise<HrmLeaveType[]> {
    const res = await apiClient.get<HrmLeaveType[]>("/tenant/hrm/leaves/types");
    return res.data;
  },

  async saveLeaveType(data: Partial<HrmLeaveType>): Promise<string> {
    const res = await apiClient.post<string>("/tenant/hrm/leaves/types", data);
    return res.data;
  },

  async getEmployeeLeaveBalances(employeeProfileId: string, year?: number): Promise<HrmLeaveBalance[]> {
    const res = await apiClient.get<HrmLeaveBalance[]>(
      `/tenant/hrm/leaves/balances/${employeeProfileId}?year=${year || new Date().getFullYear()}`
    );
    return res.data;
  },

  async getLeaveApplications(params?: {
    employeeProfileId?: string;
    status?: number;
    month?: number;
    year?: number;
  }): Promise<HrmLeaveApplication[]> {
    const res = await apiClient.get<HrmLeaveApplication[]>("/tenant/hrm/leaves/applications", { params });
    return res.data;
  },

  async applyLeave(data: {
    employeeProfileId: string;
    leaveTypeId: string;
    fromDate: string;
    toDate: string;
    isHalfDay: boolean;
    reason: string;
  }): Promise<string> {
    const res = await apiClient.post<string>("/tenant/hrm/leaves/apply", data);
    return res.data;
  },

  async reviewLeave(applicationId: string, isApproved: boolean, remarks?: string): Promise<boolean> {
    const res = await apiClient.post<boolean>(`/tenant/hrm/leaves/applications/${applicationId}/review`, {
      isApproved,
      remarks,
    });
    return res.data;
  },

  // 3. Smart Geo-Attendance
  async getDailyAttendance(date?: string): Promise<HrmAttendanceLog[]> {
    const res = await apiClient.get<HrmAttendanceLog[]>("/tenant/hrm/attendance/daily", {
      params: { date: date || new Date().toISOString().split("T")[0] },
    });
    return res.data;
  },

  async punchAttendance(data: {
    employeeProfileId: string;
    latitude: number;
    longitude: number;
    address?: string;
    batteryPercentage?: number;
    selfieImageUrl?: string;
    associatedDcrId?: string;
    remarks?: string;
  }): Promise<HrmAttendanceLog> {
    const res = await apiClient.post<HrmAttendanceLog>("/tenant/hrm/attendance/punch", data);
    return res.data;
  },

  // 4. Station DA/TA Policies & Expenses
  async getStationPolicies(): Promise<HrmStationPolicy[]> {
    const res = await apiClient.get<HrmStationPolicy[]>("/tenant/hrm/expenses/policies");
    return res.data;
  },

  async saveStationPolicy(data: Partial<HrmStationPolicy>): Promise<string> {
    const res = await apiClient.post<string>("/tenant/hrm/expenses/policies", data);
    return res.data;
  },

  async getExpenseClaims(params?: {
    employeeProfileId?: string;
    month?: number;
    year?: number;
    status?: number;
  }): Promise<HrmExpenseClaim[]> {
    const res = await apiClient.get<HrmExpenseClaim[]>("/tenant/hrm/expenses/claims", { params });
    return res.data;
  },

  async submitExpenseClaim(data: {
    employeeProfileId: string;
    claimDate: string;
    category: string;
    stationType: number;
    claimedDistanceKm: number;
    claimedAmount: number;
    description: string;
    receiptAttachmentUrl?: string;
    sfaDailyCallReportId?: string;
  }): Promise<string> {
    const res = await apiClient.post<string>("/tenant/hrm/expenses/claims", data);
    return res.data;
  },

  async reviewExpenseClaim(
    claimId: string,
    isApproved: boolean,
    approvedAmount: number,
    remarks?: string
  ): Promise<boolean> {
    const res = await apiClient.post<boolean>(`/tenant/hrm/expenses/claims/${claimId}/review`, {
      isApproved,
      approvedAmount,
      remarks,
    });
    return res.data;
  },

  // 5. Payroll & Salary
  async getSalaryStructure(employeeProfileId: string): Promise<HrmSalaryStructure> {
    const res = await apiClient.get<HrmSalaryStructure>(`/tenant/hrm/payroll/salary-structure/${employeeProfileId}`);
    return res.data;
  },

  async saveSalaryStructure(data: Partial<HrmSalaryStructure>): Promise<string> {
    const res = await apiClient.post<string>("/tenant/hrm/payroll/salary-structure", data);
    return res.data;
  },

  async getPayrollCycles(): Promise<HrmPayrollCycle[]> {
    const res = await apiClient.get<HrmPayrollCycle[]>("/tenant/hrm/payroll/cycles");
    return res.data;
  },

  async runPayrollBatch(month: number, year: number, batchTitle?: string): Promise<HrmPayrollCycle> {
    const res = await apiClient.post<HrmPayrollCycle>("/tenant/hrm/payroll/cycles/run", {
      month,
      year,
      batchTitle,
    });
    return res.data;
  },

  async finalizePayrollCycle(cycleId: string): Promise<boolean> {
    const res = await apiClient.post<boolean>(`/tenant/hrm/payroll/cycles/${cycleId}/finalize`);
    return res.data;
  },

  async getCyclePayslips(cycleId: string): Promise<HrmPayslip[]> {
    const res = await apiClient.get<HrmPayslip[]>(`/tenant/hrm/payroll/cycles/${cycleId}/payslips`);
    return res.data;
  },
};
