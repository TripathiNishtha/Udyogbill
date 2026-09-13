"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  Receipt,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Building2,
  MapPin,
  ShieldCheck,
  Award,
  ChevronRight,
  TrendingUp,
  Download,
  AlertCircle
} from "lucide-react";
import {
  hrmService,
  HrmEmployeeProfile,
  HrmLeaveApplication,
  HrmAttendanceLog,
  HrmExpenseClaim,
  HrmPayrollCycle,
  HrmPayslip,
  HrmStationPolicy
} from "@/services/hrm-service";

export default function UniversalHrmSuitePage() {
  const [activeTab, setActiveTab] = useState<"staff" | "leaves" | "attendance" | "expenses" | "payroll">("staff");
  const [loading, setLoading] = useState(true);

  // Data States
  const [employees, setEmployees] = useState<HrmEmployeeProfile[]>([]);
  const [leaveApps, setLeaveApps] = useState<HrmLeaveApplication[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<HrmAttendanceLog[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<HrmExpenseClaim[]>([]);
  const [payrollCycles, setPayrollCycles] = useState<HrmPayrollCycle[]>([]);
  const [selectedCyclePayslips, setSelectedCyclePayslips] = useState<HrmPayslip[]>([]);
  const [stationPolicies, setStationPolicies] = useState<HrmStationPolicy[]>([]);

  // Filter & Modal States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [payrollMonth, setPayrollMonth] = useState<number>(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState<number>(new Date().getFullYear());
  const [processingPayroll, setProcessingPayroll] = useState(false);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);

  // Review Modals
  const [reviewLeaveModal, setReviewLeaveModal] = useState<HrmLeaveApplication | null>(null);
  const [reviewExpenseModal, setReviewExpenseModal] = useState<HrmExpenseClaim | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [expenseApprovedAmount, setExpenseApprovedAmount] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);

  // Load master data
  const loadData = async () => {
    setLoading(true);
    try {
      const [empList, leaves, attendance, expenses, cycles, policies] = await Promise.all([
        hrmService.getEmployees(),
        hrmService.getLeaveApplications(),
        hrmService.getDailyAttendance(selectedDate),
        hrmService.getExpenseClaims(),
        hrmService.getPayrollCycles(),
        hrmService.getStationPolicies()
      ]);

      setEmployees(empList || []);
      setLeaveApps(leaves || []);
      setAttendanceLogs(attendance || []);
      setExpenseClaims(expenses || []);
      setPayrollCycles(cycles || []);
      setStationPolicies(policies || []);

      if (cycles && cycles.length > 0) {
        const latestCycle = cycles[0];
        setActiveCycleId(latestCycle.id);
        const payslips = await hrmService.getCyclePayslips(latestCycle.id);
        setSelectedCyclePayslips(payslips || []);
      }
    } catch (err) {
      console.error("Failed to load HRM suite data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Handle Leave Review
  const handleReviewLeave = async (isApproved: boolean) => {
    if (!reviewLeaveModal) return;
    setActionLoading(true);
    try {
      await hrmService.reviewLeave(reviewLeaveModal.id, isApproved, reviewRemarks);
      setReviewLeaveModal(null);
      setReviewRemarks("");
      const leaves = await hrmService.getLeaveApplications();
      setLeaveApps(leaves || []);
    } catch (err) {
      console.error("Failed to review leave application:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Expense Review
  const handleReviewExpense = async (isApproved: boolean) => {
    if (!reviewExpenseModal) return;
    setActionLoading(true);
    try {
      await hrmService.reviewExpenseClaim(
        reviewExpenseModal.id,
        isApproved,
        expenseApprovedAmount,
        reviewRemarks
      );
      setReviewExpenseModal(null);
      setReviewRemarks("");
      const expenses = await hrmService.getExpenseClaims();
      setExpenseClaims(expenses || []);
    } catch (err) {
      console.error("Failed to review expense claim:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Run Payroll
  const handleRunPayroll = async () => {
    setProcessingPayroll(true);
    try {
      const cycle = await hrmService.runPayrollBatch(payrollMonth, payrollYear);
      const cycles = await hrmService.getPayrollCycles();
      setPayrollCycles(cycles || []);
      setActiveCycleId(cycle.id);
      const slips = await hrmService.getCyclePayslips(cycle.id);
      setSelectedCyclePayslips(slips || []);
    } catch (err) {
      console.error("Payroll calculation error:", err);
    } finally {
      setProcessingPayroll(false);
    }
  };

  // View Specific Cycle
  const handleSelectCycle = async (cycleId: string) => {
    setActiveCycleId(cycleId);
    try {
      const slips = await hrmService.getCyclePayslips(cycleId);
      setSelectedCyclePayslips(slips || []);
    } catch (err) {
      console.error("Failed to load payslips for cycle:", err);
    }
  };

  // Summary Metrics
  const staffCounts = useMemo(() => {
    const total = employees.length;
    const field = employees.filter((e) => e.workMode === 2).length;
    const office = employees.filter((e) => e.workMode === 1).length;
    const hybrid = employees.filter((e) => e.workMode === 3).length;
    return { total, field, office, hybrid };
  }, [employees]);

  const pendingLeavesCount = useMemo(() => {
    return leaveApps.filter((l) => l.status === 1).length;
  }, [leaveApps]);

  const pendingExpenseAmount = useMemo(() => {
    return expenseClaims
      .filter((c) => c.status === 2)
      .reduce((sum, c) => sum + (c.claimedAmount || 0), 0);
  }, [expenseClaims]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-900/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Enterprise Suite
            </span>
            <span className="text-slate-400 text-xs font-medium">CBO-Grade 100% Industry Universal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">HRM & Field Force Governance</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Unified workforce intelligence: Pharma/FMCG Sales Force, In-Store, Warehouse, & Office Staff with GPS attendance, LMS, CBO DA/TA expenses, and statutory Indian payroll.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/10 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Sync Now
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Active Staff</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{staffCounts.total}</span>
            <span className="text-xs text-slate-500">
              ({staffCounts.field} Field | {staffCounts.office} Office)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Multi-division roster active</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Leaves</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingLeavesCount}</span>
            <span className="text-xs text-slate-500">Applications</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Manager approvals awaiting</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending DA/TA Claims</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/50 rounded-xl text-purple-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              ₹{pendingExpenseAmount.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">DCR & Station linked claims</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today Attendance</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {attendanceLogs.filter((a) => a.status === 1).length}
            </span>
            <span className="text-xs text-slate-500">Punched in</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">GPS Verified & Geofenced</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "staff"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <Users className="w-4 h-4" />
          Staff Roster & Station Info
        </button>

        <button
          onClick={() => setActiveTab("leaves")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "leaves"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Leave Approvals (LMS)
          {pendingLeavesCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-amber-500 text-white font-bold">
              {pendingLeavesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "attendance"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <Clock className="w-4 h-4" />
          Geo-Attendance Grid
        </button>

        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "expenses"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <Receipt className="w-4 h-4" />
          DA/TA Expenses (CBO SOE)
        </button>

        <button
          onClick={() => setActiveTab("payroll")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "payroll"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          1-Click Payroll & Payslips
        </button>
      </div>

      {/* Tab 1: Staff Roster */}
      {activeTab === "staff" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Employee Roster & Statutory KYC</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Universal directory with Headquarter, Station Policy, PAN, Aadhaar, UAN, and Bank NEFT details.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code, name, designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Work Mode</th>
                  <th className="py-3 px-4">Station / HQ</th>
                  <th className="py-3 px-4">Reporting Manager</th>
                  <th className="py-3 px-4">Statutory KYC</th>
                  <th className="py-3 px-4">Bank NEFT</th>
                  <th className="py-3 px-4 text-right">Gross Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees
                  .filter(
                    (e) =>
                      !searchQuery ||
                      e.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      e.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      e.designation?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{emp.fullName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                            {emp.employeeCode}
                          </span>
                          <span>•</span>
                          <span>{emp.designation}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            emp.workMode === 2
                              ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                              : emp.workMode === 1
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                              : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {emp.workModeName || (emp.workMode === 2 ? "Field Force" : "Office Staff")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {emp.headquarterCity || "Head Office"}
                        </div>
                        <div className="text-xs text-slate-500">{emp.stationTypeName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-700 dark:text-slate-300">
                          {emp.reportingManagerName || "HQ Administration"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                        <div>PAN: {emp.panNumber || "—"}</div>
                        <div>UAN: {emp.uanNumber || "—"}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{emp.bankName || "—"}</div>
                        <div className="font-mono">A/C: {emp.bankAccountNumber || "—"}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                        {emp.monthlyGrossSalary ? `₹${emp.monthlyGrossSalary.toLocaleString("en-IN")}` : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Leave Approvals (LMS) */}
      {activeTab === "leaves" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Leave Applications & Approval Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-level manager approvals with automated balance quota debit & LOP sync.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaveApps.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{leave.employeeName}</div>
                      <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{leave.employeeCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {leave.leaveTypeName} ({leave.leaveTypeCode})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                      <div>From: {new Date(leave.fromDate).toLocaleDateString("en-IN")}</div>
                      <div>To: {new Date(leave.toDate).toLocaleDateString("en-IN")}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {leave.totalDays} {leave.isHalfDay ? "(Half Day)" : "Days"}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {leave.reason}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          leave.status === 2
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : leave.status === 3
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                            : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {leave.statusName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {leave.status === 1 ? (
                        <button
                          onClick={() => {
                            setReviewLeaveModal(leave);
                            setReviewRemarks("");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
                        >
                          Review
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Geo-Attendance Grid */}
      {activeTab === "attendance" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Daily Smart Geo-Attendance Log</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                First-call auto-punch for Field Force & 50m geofence/Wi-Fi verification for Office staff.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500 font-medium">Select Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Punch In</th>
                  <th className="py-3 px-4">Punch Out</th>
                  <th className="py-3 px-4">GPS Verification</th>
                  <th className="py-3 px-4">Work Hours</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attendanceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{log.employeeName}</div>
                      <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{log.employeeCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {log.workModeName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {log.punchInTimeUtc ? (
                        <>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {new Date(log.punchInTimeUtc).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          {log.isLateMark && (
                            <span className="text-amber-600 font-semibold text-[10px]">
                              Late ({log.lateMinutes} min)
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {log.punchOutTimeUtc ? (
                        new Date(log.punchOutTimeUtc).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      ) : (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        {log.isPunchInGeofenceVerified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <ShieldCheck className="w-4 h-4" />
                            GPS In-Fence
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <MapPin className="w-4 h-4" />
                            GPS Out-Range
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                        {log.punchInAddress || "Coordinates recorded"}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {log.totalWorkHours ? `${log.totalWorkHours} hrs` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          log.status === 1
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : log.status === 2
                            ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                            : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {log.statusName}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: DA/TA Claims (CBO SOE) */}
      {activeTab === "expenses" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">CBO Statement of Expenses (DA/TA / SOE)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Per-diem Daily Allowance & Fare mileage rate verification linked directly with SFA DCR calls.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Station Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Claimed Distance</th>
                  <th className="py-3 px-4">Claimed Amount</th>
                  <th className="py-3 px-4">Approved Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenseClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{claim.employeeName}</div>
                      <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{claim.employeeCode}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {new Date(claim.claimDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {claim.stationTypeName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{claim.category}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {claim.claimedDistanceKm > 0 ? `${claim.claimedDistanceKm} km` : "—"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      ₹{claim.claimedAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{claim.approvedAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          claim.status === 3 || claim.status === 4 || claim.status === 5
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : claim.status === 6
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                            : "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                        }`}
                      >
                        {claim.statusName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {claim.status === 2 ? (
                        <button
                          onClick={() => {
                            setReviewExpenseModal(claim);
                            setExpenseApprovedAmount(claim.claimedAmount);
                            setReviewRemarks("");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
                        >
                          Settle
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: 1-Click Payroll Batch */}
      {activeTab === "payroll" && (
        <div className="space-y-6">
          {/* Payroll Batch Launcher Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Monthly Statutory Payroll Run (PF, ESIC, PT, LOP & SFA POB Incentives)
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Automated Indian statutory deductions: 12% PF on Basic, 0.75% ESIC under ₹21k, ₹200 Professional Tax, Loss of Pay attendance deductions, and 0.5% SFA POB order incentive credits.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(Number(e.target.value))}
                  className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                >
                  {[
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                  ].map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={payrollYear}
                  onChange={(e) => setPayrollYear(Number(e.target.value))}
                  className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                >
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleRunPayroll}
                  disabled={processingPayroll}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  <DollarSign className="w-4 h-4" />
                  {processingPayroll ? "Calculating..." : "1-Click Calculate Batch"}
                </button>
              </div>
            </div>

            {/* Cycle History Badges */}
            {payrollCycles.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">
                  Processed Cycles:
                </span>
                {payrollCycles.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCycle(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      activeCycleId === c.id
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {c.batchTitle} ({c.statusName})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payslips Roster for Selected Batch */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Batch Payslips & Bank NEFT Payout Register
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Itemized earnings, loss of pay days, statutory deductions, and final net payable.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Payable / LOP Days</th>
                    <th className="py-3 px-4">Basic + HRA</th>
                    <th className="py-3 px-4">POB Incentive</th>
                    <th className="py-3 px-4">DA/TA Reimbursed</th>
                    <th className="py-3 px-4">Gross Earnings</th>
                    <th className="py-3 px-4">Statutory Deductions (PF/ESIC/PT)</th>
                    <th className="py-3 px-4 text-right">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedCyclePayslips.map((slip) => (
                    <tr key={slip.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{slip.employeeName}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {slip.employeeCode} • {slip.bankName} ({slip.bankAccountNumber})
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {slip.payableDays} / {slip.calendarDaysInMonth} Days
                        </div>
                        {slip.lossOfPayDays > 0 && (
                          <div className="text-rose-500 font-semibold text-[10px]">
                            LOP: -{slip.lossOfPayDays} days
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-700 dark:text-slate-300">
                        ₹{(slip.basicEarned + slip.hraEarned).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-emerald-600 font-semibold">
                        {slip.salesIncentiveEarned > 0 ? `+₹${slip.salesIncentiveEarned.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-purple-600 font-semibold">
                        {slip.reimbursedExpensesEarned > 0 ? `+₹${slip.reimbursedExpensesEarned.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        ₹{slip.totalGrossEarnings.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-xs text-rose-600 font-mono">
                        -₹{slip.totalDeductions.toLocaleString("en-IN")}
                        <div className="text-[10px] text-slate-400">
                          PF: ₹{slip.employeePfDeduction} | ESIC: ₹{slip.employeeEsicDeduction} | PT: ₹{slip.professionalTaxDeduction}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-base text-emerald-600 dark:text-emerald-400">
                        ₹{slip.netSalaryPayable.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Review Leave Modal */}
      {reviewLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Review Leave Application</h3>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
              <div>
                <span className="font-semibold">Employee:</span> {reviewLeaveModal.employeeName} (
                {reviewLeaveModal.employeeCode})
              </div>
              <div>
                <span className="font-semibold">Leave Type:</span> {reviewLeaveModal.leaveTypeName}
              </div>
              <div>
                <span className="font-semibold">Duration:</span> {new Date(reviewLeaveModal.fromDate).toLocaleDateString("en-IN")} to{" "}
                {new Date(reviewLeaveModal.toDate).toLocaleDateString("en-IN")} ({reviewLeaveModal.totalDays} Days)
              </div>
              <div>
                <span className="font-semibold">Reason:</span> {reviewLeaveModal.reason}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Manager Remarks
              </label>
              <textarea
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Optional review remarks..."
                rows={3}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReviewLeaveModal(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewLeave(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                Reject
              </button>
              <button
                onClick={() => handleReviewLeave(true)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Expense Modal */}
      {reviewExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Settle DA/TA Expense Claim</h3>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
              <div>
                <span className="font-semibold">Employee:</span> {reviewExpenseModal.employeeName} (
                {reviewExpenseModal.employeeCode})
              </div>
              <div>
                <span className="font-semibold">Date:</span> {new Date(reviewExpenseModal.claimDate).toLocaleDateString("en-IN")}
              </div>
              <div>
                <span className="font-semibold">Station / Type:</span> {reviewExpenseModal.stationTypeName} •{" "}
                {reviewExpenseModal.category}
              </div>
              <div>
                <span className="font-semibold">Claimed Amount:</span> ₹
                {reviewExpenseModal.claimedAmount.toLocaleString("en-IN")}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Approved Payout Amount (₹)
              </label>
              <input
                type="number"
                value={expenseApprovedAmount}
                onChange={(e) => setExpenseApprovedAmount(Number(e.target.value))}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Auditor Remarks
              </label>
              <textarea
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Approval or deduction reason..."
                rows={2}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReviewExpenseModal(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewExpense(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                Reject
              </button>
              <button
                onClick={() => handleReviewExpense(true)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                Pass Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
