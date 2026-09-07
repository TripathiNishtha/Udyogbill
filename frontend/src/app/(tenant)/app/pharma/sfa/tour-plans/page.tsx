"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Building2,
  Stethoscope,
  Store,
  RefreshCw,
  Filter,
  Check,
  X,
  FileSpreadsheet,
  Info,
  CalendarDays
} from "lucide-react";
import {
  pharmaSfaService,
  SfaTourPlan,
  SfaTourPlanItem,
  DoctorFrequencyCompliance,
  SfaEmployeeProfile
} from "@/services/pharma-sfa-services";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getRoleLabel(role?: any) {
  if (role === 1 || role === "MedicalRepresentative") return "MR";
  if (role === 2 || role === "AreaBusinessManager") return "ABM";
  if (role === 3 || role === "RegionalSalesManager") return "RSM";
  if (role === 4 || role === "ZonalSalesManager") return "ZSM";
  return "MR";
}

export default function TourPlansPage() {
  const [currentDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [mrs, setMrs] = useState<SfaEmployeeProfile[]>([]);
  const [selectedMrId, setSelectedMrId] = useState<string>("");

  const [tourPlan, setTourPlan] = useState<SfaTourPlan | null>(null);
  const [compliance, setCompliance] = useState<DoctorFrequencyCompliance | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedule" | "compliance">("schedule");

  // Feedback states
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Auto Generate Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genMrId, setGenMrId] = useState("");
  const [holidayInput, setHolidayInput] = useState("");
  const [customHolidays, setCustomHolidays] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  // Approval / Review Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewing, setReviewing] = useState(false);

  // Load MR staff list
  useEffect(() => {
    async function loadMrs() {
      try {
        const roster = await pharmaSfaService.getEmployees();
        setMrs(roster);
        if (roster.length > 0 && !selectedMrId) {
          setSelectedMrId(roster[0].userId);
          setGenMrId(roster[0].userId);
        }
      } catch (err) {
        console.error("Failed to load MR roster", err);
      }
    }
    loadMrs();
  }, []);

  // Load Tour Plan and Compliance when Month/Year/MR changes
  const loadPlanData = async (mrId: string, month: number, year: number) => {
    if (!mrId) return;
    setLoading(true);
    setFeedback(null);
    try {
      const [plans, comp] = await Promise.allSettled([
        pharmaSfaService.getTourPlans(month, year, mrId),
        pharmaSfaService.getDoctorFrequencyCompliance(mrId, month, year)
      ]);

      if (plans.status === "fulfilled" && plans.value.length > 0) {
        setTourPlan(plans.value[0]);
      } else {
        setTourPlan(null);
      }

      if (comp.status === "fulfilled") {
        setCompliance(comp.value);
      } else {
        setCompliance(null);
      }
    } catch (err) {
      console.error("Error loading tour plan", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMrId) {
      loadPlanData(selectedMrId, selectedMonth, selectedYear);
    }
  }, [selectedMrId, selectedMonth, selectedYear]);

  // Handle Auto Generate
  const handleAutoGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genMrId) return;
    try {
      setGenerating(true);
      const generated = await pharmaSfaService.autoGenerateTourPlan(
        genMrId,
        selectedMonth,
        selectedYear,
        customHolidays
      );
      setTourPlan(generated);
      setSelectedMrId(genMrId);
      setIsGenerateModalOpen(false);
      setFeedback({
        type: "success",
        message: "Successfully auto-generated 30-day tour plan with beat cycles!"
      });
      loadPlanData(genMrId, selectedMonth, selectedYear);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.response?.data?.error || err.message || "Failed to auto-generate tour plan."
      });
    } finally {
      setGenerating(false);
    }
  };

  // Handle Submit for Approval
  const handleSubmitForApproval = async () => {
    if (!tourPlan) return;
    startTransition(async () => {
      try {
        await pharmaSfaService.submitTourPlanForApproval(tourPlan.id);
        setFeedback({
          type: "success",
          message: "Tour plan submitted for Manager / SuperAdmin approval!"
        });
        loadPlanData(selectedMrId, selectedMonth, selectedYear);
      } catch (err: any) {
        setFeedback({
          type: "error",
          message: err?.response?.data?.error || err.message || "Failed to submit tour plan."
        });
      }
    });
  };

  // Handle Review (Approve/Reject)
  const handleExecuteReview = async () => {
    if (!tourPlan) return;
    try {
      setReviewing(true);
      await pharmaSfaService.reviewTourPlan(
        tourPlan.id,
        reviewAction === "approve",
        reviewRemarks
      );
      setIsReviewModalOpen(false);
      setReviewRemarks("");
      setFeedback({
        type: "success",
        message: "Tour Plan review updated successfully!"
      });
      loadPlanData(selectedMrId, selectedMonth, selectedYear);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.response?.data?.error || err.message || "Failed to submit review."
      });
    } finally {
      setReviewing(false);
    }
  };

  const addHoliday = () => {
    if (holidayInput.trim() && !customHolidays.includes(holidayInput.trim())) {
      setCustomHolidays([...customHolidays, holidayInput.trim()]);
      setHolidayInput("");
    }
  };

  const removeHoliday = (date: string) => {
    setCustomHolidays(customHolidays.filter(d => d !== date));
  };

  // Status Badge Helper
  const renderStatusBadge = (status: number) => {
    switch (status) {
      case 2:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved & Locked
          </span>
        );
      case 1:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> Pending Manager Approval
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" /> Rejected / Needs Revision
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300">
            <AlertTriangle className="w-3.5 h-3.5" /> Draft
          </span>
        );
    }
  };

  // Calculations
  const workingDays = tourPlan?.items.filter(i => i.activityType === "FieldWork").length || 0;
  const totalDoctorCalls = tourPlan?.items.reduce((s, i) => s + (i.plannedDoctorCalls || 0), 0) || 0;
  const totalChemistCalls = tourPlan?.items.reduce((s, i) => s + (i.plannedChemistCalls || 0), 0) || 0;
  const totalStockistCalls = tourPlan?.items.reduce((s, i) => s + (i.plannedStockistCalls || 0), 0) || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            CBO Pharma SFA Sprint 2
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Monthly Tour Plan (MTP) & Doctor Compliance</h1>
          <p className="text-sm text-gray-500">
            Automated beat-to-calendar route allocation, doctor frequency coverage matrix, and manager approval workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/pharma/sfa"
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition"
          >
            ← Back to SFA Hub
          </Link>

          <button
            onClick={() => {
              setGenMrId(selectedMrId);
              setIsGenerateModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-sm font-medium transition shadow flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Auto-Generate MTP
          </button>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* MR Selector */}
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-gray-500" />
            <select
              value={selectedMrId}
              onChange={e => setSelectedMrId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              {mrs.map(mr => (
                <option key={mr.userId} value={mr.userId}>
                  {mr.fullName || mr.employeeCode} ({getRoleLabel(mr.designationRole)})
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-500" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              {MONTHS.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              {[2025, 2026, 2027].map(yr => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadPlanData(selectedMrId, selectedMonth, selectedYear)}
            disabled={loading}
            className="p-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Plan Status and Workflow Actions */}
        {tourPlan && (
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {renderStatusBadge(tourPlan.status)}

            {/* Submit for Approval (Draft or Rejected) */}
            {(tourPlan.status === 0 || tourPlan.status === 3) && (
              <button
                onClick={handleSubmitForApproval}
                disabled={isPending}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                Submit For Approval
              </button>
            )}

            {/* Manager Review Action */}
            <button
              onClick={() => {
                setReviewAction("approve");
                setIsReviewModalOpen(true);
              }}
              className="px-3 py-1.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Manager Review
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Working Days</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {workingDays}{" "}
            <span className="text-xs font-normal text-gray-500">
              / {tourPlan ? tourPlan.items.length : 0} days
            </span>
          </p>
          <p className="text-xs text-emerald-700 mt-1">Excludes Sundays & Holidays</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Planned Doctor Calls</span>
            <Stethoscope className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totalDoctorCalls}</p>
          <p className="text-xs text-blue-700 mt-1">
            Target: {compliance?.totalTargetCalls || 0} calls
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Chemist & Stockist Calls</span>
            <Store className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {totalChemistCalls}{" "}
            <span className="text-xs font-normal text-gray-500">
              Ch / {totalStockistCalls} Stk
            </span>
          </p>
          <p className="text-xs text-purple-700 mt-1">POB & Liquidation Touchpoints</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Frequency Coverage</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {compliance?.coveragePercent || 0}%
          </p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                (compliance?.coveragePercent || 0) >= 80 ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(compliance?.coveragePercent || 0, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "schedule"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Monthly Schedule & Beat Allocation ({tourPlan?.items.length || 0} Days)
          </button>
          <button
            onClick={() => setActiveTab("compliance")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "compliance"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Doctor Calling Frequency Compliance Matrix ({compliance?.totalAssignedDoctors || 0} Doctors)
          </button>
        </nav>
      </div>

      {/* Tab 1: 30-Day Grid Schedule */}
      {activeTab === "schedule" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {!tourPlan ? (
            <div className="p-12 text-center space-y-4">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  No Tour Plan Found for {MONTHS[selectedMonth - 1]} {selectedYear}
                </h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                  You can click "Auto-Generate MTP" to build a full month schedule automatically
                  based on this MR's assigned beats and weekly off cycles.
                </p>
              </div>
              <button
                onClick={() => {
                  setGenMrId(selectedMrId);
                  setIsGenerateModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Auto-Generate Tour Plan Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {tourPlan.managerRemarks && (
                <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Manager Remarks:</strong> {tourPlan.managerRemarks}
                  </span>
                </div>
              )}

              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold">Date & Day</th>
                    <th className="py-3 px-4 text-left font-semibold">Activity Type</th>
                    <th className="py-3 px-4 text-left font-semibold">Route / Assigned Beat</th>
                    <th className="py-3 px-4 text-center font-semibold">Dr Calls</th>
                    <th className="py-3 px-4 text-center font-semibold">Ch Calls</th>
                    <th className="py-3 px-4 text-center font-semibold">Stk Calls</th>
                    <th className="py-3 px-4 text-left font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tourPlan.items.map((item, idx) => {
                    const dateObj = new Date(item.planDate);
                    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                    const dateStr = dateObj.toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "short"
                    });
                    const isSunday = item.activityType === "Sunday";
                    const isHoliday = item.activityType === "Holiday";

                    return (
                      <tr
                        key={item.id || idx}
                        className={`hover:bg-gray-50/80 transition ${
                          isSunday
                            ? "bg-gray-50/60 text-gray-400"
                            : isHoliday
                            ? "bg-blue-50/30 text-blue-900"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{dateStr}</span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                isSunday
                                  ? "bg-gray-200 text-gray-700"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {dayName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isSunday
                                ? "bg-gray-100 text-gray-600"
                                : isHoliday
                                ? "bg-blue-100 text-blue-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {item.activityType}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{item.routeOrBeatName}</div>
                          {item.patchName && (
                            <div className="text-xs text-gray-500">Patch: {item.patchName}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-semibold ${
                              item.plannedDoctorCalls > 0
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-400"
                            }`}
                          >
                            {item.plannedDoctorCalls}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-semibold ${
                              item.plannedChemistCalls > 0
                                ? "bg-purple-50 text-purple-700"
                                : "text-gray-400"
                            }`}
                          >
                            {item.plannedChemistCalls}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-semibold ${
                              item.plannedStockistCalls > 0
                                ? "bg-amber-50 text-amber-700"
                                : "text-gray-400"
                            }`}
                          >
                            {item.plannedStockistCalls}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {item.remarks || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Doctor Frequency Compliance Matrix */}
      {activeTab === "compliance" && (
        <div className="space-y-4">
          {/* Classification Breakdown Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-4 rounded-xl">
              <div className="text-xs font-semibold text-indigo-700 uppercase">Super Core (A+)</div>
              <p className="text-2xl font-bold text-indigo-950 mt-1">
                {compliance?.superCoreCount || 0} Doctors
              </p>
              <p className="text-xs text-indigo-800 mt-1">Required: 4 visits / month</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-700 uppercase">Core (A)</div>
              <p className="text-2xl font-bold text-blue-950 mt-1">
                {compliance?.coreCount || 0} Doctors
              </p>
              <p className="text-xs text-blue-800 mt-1">Required: 2 visits / month</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-xl">
              <div className="text-xs font-semibold text-emerald-700 uppercase">Standard (B)</div>
              <p className="text-2xl font-bold text-emerald-950 mt-1">
                {compliance?.standardCount || 0} Doctors
              </p>
              <p className="text-xs text-emerald-800 mt-1">Required: 1 visit / month</p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 p-4 rounded-xl">
              <div className="text-xs font-semibold text-gray-700 uppercase">Coverage Rating</div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {compliance?.coveragePercent || 0}%
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {compliance?.totalPlannedCalls || 0} / {compliance?.totalTargetCalls || 0} Calls
              </p>
            </div>
          </div>

          {/* Compliance List Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  Doctor-wise Target Frequency vs Planned & Actual Calls
                </h3>
                <p className="text-xs text-gray-500">
                  Detect gaps in calling frequency for key prescribers in {MONTHS[selectedMonth - 1]}.
                </p>
              </div>
            </div>

            {!compliance || compliance.doctorBreakdown.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No doctors assigned to this MR yet. Register doctors or allocate beats first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold">Doctor Name</th>
                      <th className="py-3 px-4 text-left font-semibold">Specialty</th>
                      <th className="py-3 px-4 text-left font-semibold">Classification</th>
                      <th className="py-3 px-4 text-left font-semibold">Beat / Patch</th>
                      <th className="py-3 px-4 text-center font-semibold">Monthly Target</th>
                      <th className="py-3 px-4 text-center font-semibold">Planned in MTP</th>
                      <th className="py-3 px-4 text-center font-semibold">Executed (DCR)</th>
                      <th className="py-3 px-4 text-center font-semibold">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {compliance.doctorBreakdown.map(doc => (
                      <tr key={doc.doctorId} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {doc.doctorName}
                          <span className="block text-xs text-gray-400">{doc.doctorCode}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{doc.specialty || "General"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              doc.classification.includes("Super")
                                ? "bg-purple-100 text-purple-800"
                                : doc.classification.includes("Core")
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {doc.classification}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600">
                          {doc.beatName || doc.patchName || "Unassigned"}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-gray-700">
                          {doc.targetMonthlyCalls}x
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">
                          <span
                            className={
                              doc.plannedCalls >= doc.targetMonthlyCalls
                                ? "text-emerald-700"
                                : "text-amber-600"
                            }
                          >
                            {doc.plannedCalls}x
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-blue-700">
                          {doc.executedCalls}x
                        </td>
                        <td className="py-3 px-4 text-center">
                          {doc.isCompliant ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Met
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> Gap ({doc.targetMonthlyCalls - doc.plannedCalls})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Auto-Generate Tour Plan */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">Auto-Generate Monthly Tour Plan</h3>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAutoGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Field Executive (MR)
                </label>
                <select
                  value={genMrId}
                  onChange={e => setGenMrId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {mrs.map(mr => (
                    <option key={mr.userId} value={mr.userId}>
                      {mr.fullName || mr.employeeCode} ({getRoleLabel(mr.designationRole)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white font-medium"
                  >
                    {MONTHS.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white font-medium"
                  >
                    {[2025, 2026, 2027].map(yr => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Holidays Section */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  Custom Declared Holidays (Excludes from Field Work)
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={holidayInput}
                    onChange={e => setHolidayInput(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={addHoliday}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                  >
                    + Add
                  </button>
                </div>

                {customHolidays.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {customHolidays.map(date => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200"
                      >
                        {date}
                        <button
                          type="button"
                          onClick={() => removeHoliday(date)}
                          className="hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Automatic Smart Allocation Rules:
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-emerald-800">
                  <li>Sundays are automatically tagged as <strong>Weekly Off</strong>.</li>
                  <li>Declared holidays will be excluded from call targets.</li>
                  <li>Rotates through all assigned beats Monday through Saturday sequentially.</li>
                  <li>Pre-calculates doctor call targets based on classified prescribers.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Monthly Plan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Manager Review */}
      {isReviewModalOpen && tourPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">Manager Tour Plan Review</h3>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Review Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewAction("approve")}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition ${
                      reviewAction === "approve"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Approve Plan
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewAction("reject")}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition ${
                      reviewAction === "reject"
                        ? "bg-rose-50 border-rose-500 text-rose-800"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Send for Revision
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Manager Remarks / Instructions
                </label>
                <textarea
                  rows={3}
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                  placeholder="e.g. Approved. Focus on Hazratganj Hospital Beat in 2nd week for new antibiotic launch."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteReview}
                  disabled={reviewing}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition flex items-center gap-2 shadow ${
                    reviewAction === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {reviewing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : reviewAction === "approve" ? (
                    "Confirm Approval"
                  ) : (
                    "Reject & Notify MR"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
