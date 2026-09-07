"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Search,
  Check,
  X,
  FileText,
  AlertCircle,
  Briefcase,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import {
  pharmaSfaService,
  SfaDailyCallReport,
  SfaTourPlan,
  SeatQuotaStatus
} from "@/services/pharma-sfa-services";

export default function PharmaSfaDashboardPage() {
  const [activeTab, setActiveTab] = useState<"dcrs" | "tourplans">("dcrs");
  const [dcrs, setDcrs] = useState<SfaDailyCallReport[]>([]);
  const [tourPlans, setTourPlans] = useState<SfaTourPlan[]>([]);
  const [quota, setQuota] = useState<SeatQuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // TP Review Modal
  const [selectedTp, setSelectedTp] = useState<SfaTourPlan | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const [dcrList, tpList, quotaRes] = await Promise.allSettled([
        pharmaSfaService.getDcrs(),
        pharmaSfaService.getTourPlans(now.getMonth() + 1, now.getFullYear()),
        pharmaSfaService.getQuotaStatus()
      ]);

      if (dcrList.status === "fulfilled") setDcrs(dcrList.value);
      if (tpList.status === "fulfilled") setTourPlans(tpList.value);
      if (quotaRes.status === "fulfilled") setQuota(quotaRes.value);
    } catch (err) {
      console.error("Failed to load SFA dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewTp = async (isApproved: boolean) => {
    if (!selectedTp) return;
    try {
      setActionLoading(true);
      await pharmaSfaService.reviewTourPlan(selectedTp.id, isApproved, reviewRemarks);
      setSelectedTp(null);
      setReviewRemarks("");
      loadData();
    } catch (err) {
      console.error("Review failed", err);
    } finally {
      setActionLoading(false);
    }
  };

  const totalDoctors = dcrs.reduce((acc, d) => acc + (d.totalDoctorsVisited || 0), 0);
  const totalChemists = dcrs.reduce((acc, d) => acc + (d.totalChemistsVisited || 0), 0);
  const totalPob = dcrs.reduce((acc, d) => acc + (d.totalPobBookedAmount || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            CBO Pharma SFA Field Intelligence
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Field Force Operations & DCR Hub</h1>
          <p className="text-sm text-gray-500">Live field attendance, daily call reports, tour plan approvals, and POB capture.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/pharma/sfa/tour-plans"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            Tour Plans & Compliance Hub
          </Link>
          <Link
            href="/app/pharma/stockist-allocations"
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition"
          >
            Stockist-MR Mapping
          </Link>
          <Link
            href="/app/pharma/attribution"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            Sales Attribution & Reconciliation
          </Link>
        </div>
      </div>

      {/* Seat Quota & MR License Alert Banner */}
      {quota && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              MR
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Pharma SFA Active • Billable Seats Allocated: {quota.maxAllowedMrUsers} MRs
              </div>
              <div className="text-xs text-gray-600">
                Currently Active: <strong className="text-emerald-700">{quota.currentActiveMrUsers} MRs</strong> • Available Capacity: {Math.max(0, quota.maxAllowedMrUsers - quota.currentActiveMrUsers)} seats remaining.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!quota.canAddMoreMr && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Seat Limit Reached
              </span>
            )}
            <Link
              href="/app/settings/subscription"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm"
            >
              Add MR Seats
            </Link>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase">Field Reports Filed</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{dcrs.length}</div>
          <div className="text-xs text-emerald-600 mt-1 font-medium">DCRs received this cycle</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase">Doctor Calls Completed</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{totalDoctors}</div>
          <div className="text-xs text-gray-500 mt-1">Prescription detailing calls</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase">Chemist Visits</div>
          <div className="text-2xl font-bold text-teal-600 mt-1">{totalChemists}</div>
          <div className="text-xs text-gray-500 mt-1">Retail availability audits</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase">Total Field POB Booked</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">₹{totalPob.toLocaleString()}</div>
          <div className="text-xs text-blue-500 mt-1">Pending order conversion</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-4">
        <button
          onClick={() => setActiveTab("dcrs")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "dcrs"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Daily Call Reports ({dcrs.length})
        </button>
        <button
          onClick={() => setActiveTab("tourplans")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "tourplans"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Monthly Tour Plans ({tourPlans.length})
        </button>
      </div>

      {/* Tab 1: DCR List */}
      {activeTab === "dcrs" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Field Activity & Geotagged DCRs</h2>
            <button
              onClick={loadData}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading field reports...</div>
          ) : dcrs.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-base font-medium text-gray-900">No DCRs Submitted Yet</div>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                Medical representatives submit DCRs directly from the native mobile app after completing visits.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 text-xs font-semibold uppercase">
                    <th className="p-3">DCR #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">MR Name</th>
                    <th className="p-3">Route / Beat</th>
                    <th className="p-3 text-center">Doctor Calls</th>
                    <th className="p-3 text-center">Chemist Visits</th>
                    <th className="p-3 text-right">POB Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dcrs.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-mono text-xs font-bold text-gray-800">{d.dcrNumber}</td>
                      <td className="p-3 text-gray-600">
                        {new Date(d.dcrDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-3 font-medium text-gray-900">{d.mrName}</td>
                      <td className="p-3 text-gray-600">{d.routeOrArea || "Local Beat"}</td>
                      <td className="p-3 text-center font-bold text-emerald-600">{d.totalDoctorsVisited}</td>
                      <td className="p-3 text-center font-bold text-teal-600">{d.totalChemistsVisited}</td>
                      <td className="p-3 text-right font-bold text-gray-900">
                        {d.totalPobBookedAmount > 0 ? `₹${d.totalPobBookedAmount.toLocaleString()}` : "—"}
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Submitted
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Tour Plan (TP) Approvals */}
      {activeTab === "tourplans" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Monthly Tour Plans Pending Manager Approval</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading tour plans...</div>
          ) : tourPlans.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-base font-medium text-gray-900">No Tour Plans for Current Month</div>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                When MRs draft and submit monthly beats from mobile, manager approvals will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 text-xs font-semibold uppercase">
                    <th className="p-3">MR Name</th>
                    <th className="p-3">Month / Year</th>
                    <th className="p-3 text-center">Planned Days</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tourPlans.map((tp) => (
                    <tr key={tp.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-medium text-gray-900">{tp.mrName}</td>
                      <td className="p-3 text-gray-600">{tp.month}/{tp.year}</td>
                      <td className="p-3 text-center font-bold text-gray-800">{tp.items.length} days</td>
                      <td className="p-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tp.status === 2 ? "bg-emerald-100 text-emerald-800" :
                          tp.status === 3 ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {tp.status === 2 ? "Approved" : tp.status === 3 ? "Rejected" : "Submitted"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {tp.status === 1 && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setSelectedTp(tp); setReviewRemarks("Approved as planned."); }}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-medium transition"
                            >
                              Review & Approve
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tour Plan Review Modal */}
      {selectedTp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">Review Tour Plan: {selectedTp.mrName}</h3>
              <button onClick={() => setSelectedTp(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-gray-600">
              Month: <strong>{selectedTp.month}/{selectedTp.year}</strong> ({selectedTp.items.length} planned days)
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Manager Remarks / Revision Notes</label>
              <textarea
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Add comments or instructions for the MR..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => handleReviewTp(false)}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-sm font-medium transition"
              >
                Reject / Require Revision
              </button>
              <button
                type="button"
                onClick={() => handleReviewTp(true)}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
              >
                Approve Tour Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
