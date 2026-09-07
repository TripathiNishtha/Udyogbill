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
  ShieldAlert,
  ShieldCheck,
  Compass,
  Navigation,
  Sliders,
  Sparkles,
  Plus,
  LocateFixed
} from "lucide-react";
import {
  pharmaSfaService,
  SfaDailyCallReport,
  SfaTourPlan,
  SeatQuotaStatus,
  SfaGeofenceConfig,
  SfaDoctor
} from "@/services/pharma-sfa-services";

export default function PharmaSfaDashboardPage() {
  const [activeTab, setActiveTab] = useState<"dcrs" | "tourplans">("dcrs");
  const [dcrs, setDcrs] = useState<SfaDailyCallReport[]>([]);
  const [tourPlans, setTourPlans] = useState<SfaTourPlan[]>([]);
  const [quota, setQuota] = useState<SeatQuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Geofence Admin Controls State
  const [geofenceConfig, setGeofenceConfig] = useState<SfaGeofenceConfig | null>(null);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [geofenceForm, setGeofenceForm] = useState<SfaGeofenceConfig>({
    isGeofencingEnabled: false,
    geofenceRadiusMeters: 150,
    allowOutOfRangeWithReason: true
  });
  const [savingGeofence, setSavingGeofence] = useState(false);
  const [geofenceToast, setGeofenceToast] = useState<string | null>(null);

  // TP Review Modal
  const [selectedTp, setSelectedTp] = useState<SfaTourPlan | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // DCR Call Punch Modal State (MR Field Reporting with GPS)
  const [showDcrModal, setShowDcrModal] = useState(false);
  const [doctorsList, setDoctorsList] = useState<SfaDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [currentGps, setCurrentGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [doctorFeedback, setDoctorFeedback] = useState("");
  const [outOfRangeReason, setOutOfRangeReason] = useState("");
  const [submittingDcr, setSubmittingDcr] = useState(false);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const [dcrList, tpList, quotaRes, geoRes, docRes] = await Promise.allSettled([
        pharmaSfaService.getDcrs(),
        pharmaSfaService.getTourPlans(now.getMonth() + 1, now.getFullYear()),
        pharmaSfaService.getQuotaStatus(),
        pharmaSfaService.getGeofenceConfig(),
        pharmaSfaService.getDoctors()
      ]);

      if (dcrList.status === "fulfilled") setDcrs(dcrList.value);
      if (tpList.status === "fulfilled") setTourPlans(tpList.value);
      if (quotaRes.status === "fulfilled") setQuota(quotaRes.value);
      if (geoRes.status === "fulfilled" && geoRes.value) {
        setGeofenceConfig(geoRes.value);
        setGeofenceForm(geoRes.value);
      }
      if (docRes.status === "fulfilled") setDoctorsList(docRes.value);
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

  const handleSaveGeofence = async () => {
    try {
      setSavingGeofence(true);
      await pharmaSfaService.updateGeofenceConfig(geofenceForm);
      setGeofenceConfig(geofenceForm);
      setShowGeofenceModal(false);
      setGeofenceToast(
        geofenceForm.isGeofencingEnabled
          ? `GPS Geofencing Active! Allowed Range: ${geofenceForm.geofenceRadiusMeters} meters.`
          : "GPS Geofencing has been Disabled. MRs can report freely."
      );
      setTimeout(() => setGeofenceToast(null), 5000);
    } catch (err) {
      console.error("Failed to save geofence config", err);
      alert("Failed to save geofence settings.");
    } finally {
      setSavingGeofence(false);
    }
  };

  const handleCaptureGps = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser or device.");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentGps({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(`Location Error: ${err.message}. Please enable location permissions in your browser.`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmitVisitDcr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      alert("Please select a Doctor for this call.");
      return;
    }
    const doc = doctorsList.find((d) => d.id === selectedDoctorId);
    if (!doc) return;

    if (geofenceConfig?.isGeofencingEnabled && doc.latitude && doc.longitude && currentGps) {
      const dist = calculateDistance(doc.latitude, doc.longitude, currentGps.lat, currentGps.lon);
      const allowed =
        doc.geofenceRadiusMeters && doc.geofenceRadiusMeters > 0
          ? doc.geofenceRadiusMeters
          : geofenceConfig?.geofenceRadiusMeters ?? 150;
      if (dist > allowed) {
        if (!geofenceConfig.allowOutOfRangeWithReason) {
          alert(`Visit blocked: You are ${dist}m away from Dr. ${doc.name}'s clinic. Admin has set a strict geofence radius of ${allowed}m.`);
          return;
        }
        if (!outOfRangeReason.trim()) {
          alert(`You are outside clinic range (${dist}m vs ${allowed}m permitted). Please provide an Out-of-Range reason to proceed.`);
          return;
        }
      }
    }

    try {
      setSubmittingDcr(true);
      await pharmaSfaService.submitDcr({
        dcrDate: new Date().toISOString(),
        attendanceStatus: "Present",
        workType: "FieldWork",
        routeOrArea: doc.patchName || doc.city || "Field Territory",
        startLatitude: currentGps?.lat,
        startLongitude: currentGps?.lon,
        doctorVisits: [
          {
            doctorId: doc.id,
            visitTimeUtc: new Date().toISOString(),
            latitude: currentGps?.lat,
            longitude: currentGps?.lon,
            doctorFeedback: doctorFeedback,
            outOfRangeReason: outOfRangeReason || undefined
          }
        ],
        chemistVisits: [],
        stockistVisits: []
      });
      setShowDcrModal(false);
      setSelectedDoctorId("");
      setDoctorFeedback("");
      setOutOfRangeReason("");
      setCurrentGps(null);
      setGeofenceToast("Doctor Visit Call recorded & verified successfully!");
      setTimeout(() => setGeofenceToast(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to submit DCR");
    } finally {
      setSubmittingDcr(false);
    }
  };

  const totalDoctors = dcrs.reduce((acc, d) => acc + (d.totalDoctorsVisited || 0), 0);
  const totalChemists = dcrs.reduce((acc, d) => acc + (d.totalChemistsVisited || 0), 0);
  const totalPob = dcrs.reduce((acc, d) => acc + (d.totalPobBookedAmount || 0), 0);

  const selectedDoctor = doctorsList.find((d) => d.id === selectedDoctorId);
  const currentDistanceMeters =
    selectedDoctor?.latitude && selectedDoctor?.longitude && currentGps
      ? calculateDistance(selectedDoctor.latitude, selectedDoctor.longitude, currentGps.lat, currentGps.lon)
      : null;
  const currentAllowedRadius: number =
    selectedDoctor && selectedDoctor.geofenceRadiusMeters && selectedDoctor.geofenceRadiusMeters > 0
      ? selectedDoctor.geofenceRadiusMeters
      : geofenceConfig?.geofenceRadiusMeters ?? 150;
  const isOutOfRange = currentDistanceMeters !== null && currentDistanceMeters > currentAllowedRadius;

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

        <div className="flex flex-wrap items-center gap-2">
          {/* Admin Geofencing Rules Button */}
          <button
            onClick={() => setShowGeofenceModal(true)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition flex items-center gap-2 shadow-sm ${
              geofenceConfig?.isGeofencingEnabled
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Sliders className="w-4 h-4 text-emerald-700" />
            <span>Geofence Rules</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                geofenceConfig?.isGeofencingEnabled
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {geofenceConfig?.isGeofencingEnabled
                ? `ON (${geofenceConfig.geofenceRadiusMeters}m)`
                : "OFF"}
            </span>
          </button>

          {/* Quick Doctor Call Punch Button */}
          <button
            onClick={() => {
              setShowDcrModal(true);
              handleCaptureGps();
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-1.5"
          >
            <LocateFixed className="w-4 h-4" />
            Punch Doctor Call (DCR)
          </button>

          <Link
            href="/app/pharma/sfa/tour-plans"
            className="px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4 text-emerald-700" />
            Tour Plans
          </Link>
          <Link
            href="/app/pharma/stockist-allocations"
            className="px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition"
          >
            Stockist Mapping
          </Link>
          <Link
            href="/app/pharma/attribution"
            className="px-3.5 py-2 border border-emerald-600/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium transition"
          >
            Sales Attribution
          </Link>
        </div>
      </div>

      {/* Geofence / DCR Action Toast Notification */}
      {geofenceToast && (
        <div className="bg-emerald-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-300" />
            <span className="font-medium">{geofenceToast}</span>
          </div>
          <button onClick={() => setGeofenceToast(null)} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {/* Admin Geofencing & Anti-Fraud Control Modal */}
      {showGeofenceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">GPS Geofencing & Fraud Compliance</h3>
                  <p className="text-xs text-gray-500">Admin control for MR visit radius validation</p>
                </div>
              </div>
              <button
                onClick={() => setShowGeofenceModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Master Toggle */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900">Enforce GPS Geofencing</div>
                <div className="text-xs text-gray-600 mt-0.5">
                  When enabled, MRs can only punch calls within doctor/chemist clinic range.
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setGeofenceForm({
                    ...geofenceForm,
                    isGeofencingEnabled: !geofenceForm.isGeofencingEnabled
                  })
                }
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  geofenceForm.isGeofencingEnabled ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    geofenceForm.isGeofencingEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {geofenceForm.isGeofencingEnabled && (
              <div className="space-y-4 pt-1 animate-in fade-in">
                {/* Range Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Default Permitted Radius
                  </label>
                  <div className="grid grid-cols-5 gap-2 mb-2.5">
                    {[50, 100, 150, 200, 500].map((radius) => (
                      <button
                        key={radius}
                        type="button"
                        onClick={() => setGeofenceForm({ ...geofenceForm, geofenceRadiusMeters: radius })}
                        className={`py-2 text-xs font-bold rounded-lg border transition ${
                          geofenceForm.geofenceRadiusMeters === radius
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {radius}m
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Custom radius:</span>
                    <input
                      type="number"
                      min={20}
                      max={5000}
                      value={geofenceForm.geofenceRadiusMeters}
                      onChange={(e) =>
                        setGeofenceForm({
                          ...geofenceForm,
                          geofenceRadiusMeters: parseInt(e.target.value) || 100
                        })
                      }
                      className="w-24 px-2.5 py-1.5 border border-gray-300 rounded-md text-sm font-semibold text-center focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <span className="text-xs text-gray-500">meters from clinic</span>
                  </div>
                </div>

                {/* Exception Handling / Out of Range Rule */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="allowReason"
                      checked={geofenceForm.allowOutOfRangeWithReason}
                      onChange={(e) =>
                        setGeofenceForm({
                          ...geofenceForm,
                          allowOutOfRangeWithReason: e.target.checked
                        })
                      }
                      className="mt-0.5 h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <label htmlFor="allowReason" className="text-xs text-gray-800 font-medium leading-relaxed">
                      <strong>Allow call submission outside range with mandatory justification</strong>
                      <span className="block text-gray-600 mt-0.5">
                        (e.g., Doctor met at nursing home/café, emergency call, or clinic moved). Flags call for manager audit.
                      </span>
                    </label>
                  </div>
                  {!geofenceForm.allowOutOfRangeWithReason && (
                    <div className="text-[11px] font-semibold text-rose-700 flex items-center gap-1 mt-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Zero-Tolerance Mode: Any call punched outside {geofenceForm.geofenceRadiusMeters}m is strictly blocked.
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg">
                  💡 <strong>CBO Auto-Lock Feature:</strong> When an MR visits an unregistered clinic for the 1st time, its GPS coordinates are automatically locked upon submitting the first call.
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowGeofenceModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGeofence}
                disabled={savingGeofence}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-1.5"
              >
                {savingGeofence ? "Saving..." : "Save & Enforce Rules"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Punch Doctor Call (DCR) Modal with Live GPS Verification */}
      {showDcrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Punch Doctor Call (DCR)</h3>
                  <p className="text-xs text-gray-500">Live GPS Verified Doctor Detailing Call</p>
                </div>
              </div>
              <button onClick={() => setShowDcrModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVisitDcr} className="space-y-4">
              {/* Live GPS Capture Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Device GPS Location
                  </span>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={gpsLoading}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    {gpsLoading ? "Acquiring GPS..." : "Refresh GPS"}
                  </button>
                </div>

                {gpsError ? (
                  <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">{gpsError}</div>
                ) : currentGps ? (
                  <div className="text-xs text-gray-600 font-mono flex items-center justify-between">
                    <span>
                      Lat: <strong>{currentGps.lat.toFixed(5)}</strong>, Lon: <strong>{currentGps.lon.toFixed(5)}</strong>
                    </span>
                    <span className="text-[11px] font-sans font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ GPS Locked
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Click Refresh to capture your GPS coordinates.</div>
                )}
              </div>

              {/* Select Doctor */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Select Doctor to Detail
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">-- Choose Doctor from Master List --</option>
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.name} ({doc.specialty || "General"}) — {doc.city || doc.patchName || "Local"}
                      {doc.latitude && doc.longitude ? " [GPS Locked]" : " [New: GPS will lock]"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Geofence Distance Audit Card */}
              {selectedDoctor && (
                <div className="border rounded-xl p-3.5 space-y-2 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Clinic Verification:</span>
                    {selectedDoctor.latitude && selectedDoctor.longitude ? (
                      <span className="text-xs text-gray-500 font-mono">
                        Target: {selectedDoctor.latitude.toFixed(4)}, {selectedDoctor.longitude.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 font-medium">No prior GPS (First visit auto-lock)</span>
                    )}
                  </div>

                  {geofenceConfig?.isGeofencingEnabled && selectedDoctor.latitude && selectedDoctor.longitude && (
                    <div className="pt-1">
                      {currentDistanceMeters !== null ? (
                        <div
                          className={`p-2.5 rounded-lg text-xs font-medium border flex items-center justify-between ${
                            isOutOfRange
                              ? "bg-rose-50 border-rose-200 text-rose-800"
                              : "bg-emerald-50 border-emerald-200 text-emerald-800"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isOutOfRange ? (
                              <ShieldAlert className="w-4 h-4 text-rose-600" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            )}
                            <span>
                              Distance to Clinic: <strong>{currentDistanceMeters}m</strong> (Allowed:{" "}
                              {currentAllowedRadius}m)
                            </span>
                          </div>
                          <span className="font-bold text-[11px] uppercase">
                            {isOutOfRange ? "Out of Range" : "In Range"}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-600">Please capture GPS above to verify distance.</div>
                      )}
                    </div>
                  )}

                  {/* Out of range reason if needed */}
                  {geofenceConfig?.isGeofencingEnabled && isOutOfRange && (
                    <div className="space-y-1.5 pt-1">
                      {geofenceConfig.allowOutOfRangeWithReason ? (
                        <div>
                          <label className="block text-xs font-bold text-rose-700 mb-1">
                            ⚠️ Mandatory Justification for Out-of-Range Call:
                          </label>
                          <input
                            type="text"
                            required
                            value={outOfRangeReason}
                            onChange={(e) => setOutOfRangeReason(e.target.value)}
                            placeholder="e.g. Doctor met at surgical ICU, Clinic under renovation..."
                            className="w-full border border-rose-300 rounded-lg p-2 text-xs bg-white focus:ring-rose-500 focus:border-rose-500"
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-rose-700 font-bold bg-rose-100 p-2 rounded-lg">
                          ⛔ Geofence Violation: Call submission is strictly blocked outside {currentAllowedRadius}m.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Call Feedback Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Doctor Discussion & Samples/Detailing
                </label>
                <textarea
                  value={doctorFeedback}
                  onChange={(e) => setDoctorFeedback(e.target.value)}
                  rows={3}
                  placeholder="Detailing key brands, visual aid presentation, feedback received..."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowDcrModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submittingDcr ||
                    !selectedDoctorId ||
                    (geofenceConfig?.isGeofencingEnabled && isOutOfRange && !geofenceConfig.allowOutOfRangeWithReason)
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-1.5"
                >
                  {submittingDcr ? "Submitting Call..." : "Submit Verified DCR Call"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
