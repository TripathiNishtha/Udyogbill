"use client";

import React, { useState, useEffect, useCallback } from "react";
import { superAdminService } from "@/services/super-admin-services";
import {
  Users,
  Smartphone,
  Target,
  MapPin,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Award,
  ChevronRight,
  Clock,
  Layers,
  ArrowUpRight,
  Package,
  Calendar,
  Building,
  Check,
  Eye,
  Info,
  Trash2,
  Edit2,
} from "lucide-react";

export default function SalesForceAdminPage() {
  const [activeTab, setActiveTab] = useState<
    "quotas" | "devices" | "reps" | "visits" | "disputes" | "catalog"
  >("quotas");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter States
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<number>(0);

  // Data States
  const [quotas, setQuotas] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [reps, setReps] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modals
  const [showAddRepModal, setShowAddRepModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAllocateQuotaModal, setShowAllocateQuotaModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Add Rep Form State
  const [newRepForm, setNewRepForm] = useState({
    fullName: "",
    mobileNumber: "",
    email: "",
    password: "",
    city: "Kanpur",
    roleTier: 1, // 1 = FSE
    reportingToId: "",
    monthlyTarget: 200000,
  });

  // Assign Dispute Subscription Form State
  const [assignForm, setAssignForm] = useState({
    subscriptionId: "",
    tenantId: "",
    assignedRepId: "",
    revenueAmount: 4999.0,
    isRenewal: false,
    reasonNotes: "",
  });

  // Allocate Quota Form State
  const [quotaForm, setQuotaForm] = useState({
    repId: "",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    individualTarget: 200000.0,
    teamRollupTarget: 0.0,
  });

  // Add Product Form State
  const [productForm, setProductForm] = useState({
    productCode: "",
    name: "",
    category: "BILLING_SOFTWARE",
    pricingModel: 1, // AnnualSubscription
    basePrice: 4999.0,
    minPrice: 3999.0,
    maxPrice: 14999.0,
    defaultRepIncentivePct: 10.0,
    isActive: true,
    displayOrder: 1,
  });

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // ========================================================
  // Fetchers
  // ========================================================

  const loadQuotas = useCallback(async () => {
    try {
      setLoading(true);
      const data = await superAdminService.getSalesQuotas(
        selectedMonth,
        selectedYear,
        selectedCity || undefined
      );
      setQuotas(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to load sales targets", true);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedCity]);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await superAdminService.getHardwareDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to load registered devices", true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReps = useCallback(async () => {
    try {
      setLoading(true);
      const data = await superAdminService.getSalesReps(
        selectedTier > 0 ? selectedTier : undefined,
        selectedCity || undefined
      );
      setReps(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to load sales team", true);
    } finally {
      setLoading(false);
    }
  }, [selectedTier, selectedCity]);

  const loadVisits = useCallback(async () => {
    try {
      setLoading(true);
      const data = await superAdminService.getFieldShopVisits({
        city: selectedCity || undefined,
        pageNumber: 1,
        pageSize: 50,
      });
      setVisits(data?.items || []);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to load shop visits", true);
    } finally {
      setLoading(false);
    }
  }, [selectedCity]);

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const data = await superAdminService.getSalesProductCatalog();
      setCatalog(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to load product catalog", true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await superAdminService.getAttributionAuditLogs(1, 50);
      setAuditLogs(data?.items || []);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to load attribution logs", true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "quotas") loadQuotas();
    else if (activeTab === "devices") loadDevices();
    else if (activeTab === "reps") loadReps();
    else if (activeTab === "visits") loadVisits();
    else if (activeTab === "catalog") loadCatalog();
    else if (activeTab === "disputes") {
      loadAuditLogs();
      loadReps();
    }
  }, [activeTab, loadQuotas, loadDevices, loadReps, loadVisits, loadCatalog, loadAuditLogs]);

  // ========================================================
  // Action Handlers
  // ========================================================

  const handleApproveDevice = async (deviceId: string, repId: string) => {
    if (!repId) {
      showToast("Please select a sales representative to bind this phone to.", true);
      return;
    }
    try {
      await superAdminService.approveHardwareDevice(deviceId, repId);
      showToast("Device approved & locked to sales rep successfully!");
      loadDevices();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to approve device", true);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    const reason = prompt("Enter reason for revoking/locking this device:") || "Super Admin manual lockout";
    try {
      await superAdminService.revokeHardwareDevice(deviceId, reason);
      showToast("Device revoked and hard-locked from logging in.");
      loadDevices();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to revoke device", true);
    }
  };

  const handleCreateRep = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        fullName: newRepForm.fullName.trim(),
        mobile: newRepForm.mobileNumber.trim(),
        mobileNumber: newRepForm.mobileNumber.trim(),
        email: newRepForm.email?.trim() || null,
        password: newRepForm.password || "Sales@123",
        city: newRepForm.city?.trim() || "Kanpur",
        region: "North",
        zone: "UP Central",
        roleTier: Number(newRepForm.roleTier) || 1,
        monthlyTarget: Number(newRepForm.monthlyTarget) || 200000,
        reportingToId: newRepForm.reportingToId ? newRepForm.reportingToId : null,
      };
      await superAdminService.createSalesRep(payload);
      showToast(`Sales representative ${newRepForm.fullName} registered successfully with ₹${payload.monthlyTarget.toLocaleString("en-IN")}/mo target!`);
      setShowAddRepModal(false);
      setNewRepForm({
        fullName: "",
        mobileNumber: "",
        email: "",
        password: "",
        city: "Kanpur",
        roleTier: 1,
        reportingToId: "",
        monthlyTarget: 200000,
      });
      loadReps();
      loadQuotas();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to create sales representative", true);
    }
  };

  const handleUpdateTarget = async (repId: string, currentTarget: number, repName: string) => {
    const input = prompt(
      `Enter new monthly target for ${repName} (in ₹):`,
      String(currentTarget || 200000)
    );
    if (!input) return;
    const newTarget = Number(input);
    if (isNaN(newTarget) || newTarget <= 0) {
      showToast("Please enter a valid target amount.", true);
      return;
    }
    try {
      await superAdminService.updateRepMonthlyTarget(repId, newTarget);
      showToast(`Target for ${repName} updated to ₹${newTarget.toLocaleString("en-IN")}/month!`);
      loadReps();
      loadQuotas();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update target", true);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete / deactivate product "${name}"?`)) return;
    try {
      await superAdminService.deleteSalesProduct(id);
      showToast(`Product "${name}" deleted / deactivated successfully!`);
      loadCatalog();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete product", true);
    }
  };

  const handleAssignDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.subscriptionId || !assignForm.tenantId || !assignForm.assignedRepId) {
      showToast("Subscription ID, Tenant ID, and Assigned Sales Rep are mandatory.", true);
      return;
    }
    try {
      await superAdminService.assignSubscriptionToRep(assignForm);
      showToast("Subscription successfully assigned and revenue credited to sales rep!");
      setShowAssignModal(false);
      setAssignForm({
        subscriptionId: "",
        tenantId: "",
        assignedRepId: "",
        revenueAmount: 4999.0,
        isRenewal: false,
        reasonNotes: "",
      });
      loadAuditLogs();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Attribution transfer failed", true);
    }
  };

  const handleAllocateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await superAdminService.allocateSalesQuota({
        ...quotaForm,
        individualTarget: Number(quotaForm.individualTarget),
        teamRollupTarget: Number(quotaForm.teamRollupTarget),
      });
      showToast("Sales quota allocated successfully!");
      setShowAllocateQuotaModal(false);
      loadQuotas();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Quota allocation failed", true);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await superAdminService.createSalesProduct({
        ...productForm,
        basePrice: Number(productForm.basePrice),
        minPrice: productForm.minPrice ? Number(productForm.minPrice) : null,
        maxPrice: productForm.maxPrice ? Number(productForm.maxPrice) : null,
        defaultRepIncentivePct: Number(productForm.defaultRepIncentivePct),
      });
      showToast("New product catalog item added successfully!");
      setShowAddProductModal(false);
      loadCatalog();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Product creation failed", true);
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await superAdminService.downloadSalesReviewCsv(
        selectedCity || undefined,
        selectedMonth,
        selectedYear
      );
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `UdyogBill_Sales_Review_${selectedCity || "All"}_${selectedYear}_${String(
          selectedMonth
        ).padStart(2, "0")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      showToast("Failed to download Excel/CSV export.", true);
    }
  };

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 1:
        return { label: "FSE (Field Sales Exec)", quota: "₹2,00,000", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case 2:
        return { label: "ASM (Area Sales Mgr)", quota: "₹9,00,000", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case 3:
        return { label: "RSM (Regional Sales Mgr)", quota: "₹38,00,000", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case 4:
        return { label: "ZSM (Zonal Sales Mgr)", quota: "₹1.52 Crore", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case 5:
        return { label: "NSM (National Sales Mgr)", quota: "₹6.08 Crore", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case 6:
        return { label: "GM / Super Admin", quota: "All India Enterprise", color: "bg-rose-50 text-rose-700 border-rose-200" };
      default:
        return { label: "FSE", quota: "₹2,00,000", color: "bg-slate-50 text-slate-700 border-slate-200" };
    }
  };

  // Quota totals for overview
  const totalTarget = quotas.reduce((acc, q) => acc + (q.totalTarget || 0), 0);
  const totalAchieved = quotas.reduce((acc, q) => acc + (q.achievedRevenue || 0), 0);
  const totalNewSales = quotas.reduce((acc, q) => acc + (q.newSalesCount || 0), 0);
  const totalRenewals = quotas.reduce((acc, q) => acc + (q.renewalsClosedCount || 0), 0);
  const overallAchievedPct = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Internal Sales Force Automation (SFA)
              </h1>
              <p className="text-sm text-slate-500">
                Direct Field Army Management • Single-User Device Lock • Quota Rollups & Review Sheets
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & 1-Click Excel */}
        <div className="flex items-center flex-wrap gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-xs font-medium border rounded-md px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs font-medium border rounded-md px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition shadow-sm"
            title="Download formatted weekly review Excel/CSV sheet for executive review meetings"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            1-Click Review Excel
          </button>

          <button
            onClick={() => {
              if (activeTab === "quotas") loadQuotas();
              else if (activeTab === "devices") loadDevices();
              else if (activeTab === "reps") loadReps();
              else if (activeTab === "visits") loadVisits();
              else if (activeTab === "disputes") loadAuditLogs();
            }}
            className="p-2 border rounded-md hover:bg-slate-50 text-slate-600 transition"
            title="Refresh current tab"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-1 overflow-x-auto pb-px">
        {[
          { key: "quotas", label: "Targets & Review", icon: Target },
          { key: "devices", label: "Device Locks & Approval Queue", icon: Smartphone },
          { key: "reps", label: "Sales Hierarchy (6-Tier)", icon: Users },
          { key: "visits", label: "Field Shop Visits & Anti-Fraud", icon: MapPin },
          { key: "disputes", label: "Direct Signups Dispute Resolver", icon: ShieldCheck },
          { key: "catalog", label: "Multi-Product Master", icon: Package },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                isActive
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.key === "devices" && devices.filter((d) => d.status === 1).length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                  {devices.filter((d) => d.status === 1).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: TARGETS & REVIEW COCKPIT */}
      {/* ========================================================= */}
      {activeTab === "quotas" && (
        <div className="space-y-6">
          {/* Executive Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Monthly Quota</span>
                <Target className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                ₹{totalTarget.toLocaleString("en-IN")}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Sum of all team allocations</p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Closed Revenue</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                ₹{totalAchieved.toLocaleString("en-IN")}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {overallAchievedPct}% achieved • Gap: ₹
                {Math.max(0, totalTarget - totalAchieved).toLocaleString("en-IN")}
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Fresh Subscriptions</span>
                <ArrowUpRight className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-2">{totalNewSales}</div>
              <p className="text-[11px] text-slate-400 mt-1">New onboarded retail stores</p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Renewals Collected</span>
                <RefreshCw className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-purple-600 mt-2">{totalRenewals}</div>
              <p className="text-[11px] text-slate-400 mt-1">Retained recurring ARR</p>
            </div>
          </div>

          {/* Quotas Table with Progress & Run Rate */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-slate-900">
                  Sales Quota & Pipeline Run Rate
                </h2>
                <span className="text-xs text-slate-500">
                  ({quotas.length} Reps tracked)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter by city..."
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="text-xs border rounded-md px-3 py-1.5 bg-white text-slate-700"
                />
                <button
                  onClick={() => setShowAllocateQuotaModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Allocate Quota
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/75 border-b text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Rep Details</th>
                    <th className="p-3">Role Tier</th>
                    <th className="p-3">City</th>
                    <th className="p-3">Monthly Target</th>
                    <th className="p-3">Revenue Closed</th>
                    <th className="p-3">Breakdown (New / Renew)</th>
                    <th className="p-3">Gap Amount</th>
                    <th className="p-3">Achievement</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {quotas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400">
                        No sales quota records found for this period. Click &quot;Allocate Quota&quot; to assign targets.
                      </td>
                    </tr>
                  ) : (
                    quotas.map((q) => {
                      const tier = getTierLabel(q.roleTier);
                      const isLagging = q.achievedPct < 50;
                      const isBorderline = q.achievedPct >= 50 && q.achievedPct < 80;
                      return (
                        <tr key={q.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-medium text-slate-900">
                            <div>{q.repName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {q.repCode}
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${tier.color}`}
                            >
                              {tier.label.split(" ")[0]}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-600">{q.city}</td>
                          <td className="p-3 font-semibold text-slate-900">
                            ₹{q.totalTarget?.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 font-bold text-emerald-600">
                            ₹{q.achievedRevenue?.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-[11px]">
                            <span className="text-blue-600 font-semibold">
                              {q.newSalesCount} Fresh
                            </span>{" "}
                            •{" "}
                            <span className="text-purple-600 font-semibold">
                              {q.renewalsClosedCount} Renewals
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-rose-600">
                            ₹{q.gapAmount?.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 min-w-[140px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isLagging
                                      ? "bg-rose-500"
                                      : isBorderline
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(100, Math.max(0, q.achievedPct))}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
                                {q.achievedPct}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isLagging
                                  ? "bg-rose-100 text-rose-800"
                                  : isBorderline
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {isLagging
                                ? "Lagging"
                                : isBorderline
                                ? "Borderline"
                                : "On Track"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DEVICE LOCKS & APPROVAL QUEUE */}
      {/* ========================================================= */}
      {activeTab === "devices" && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-900">
                Hardware Device Binding Policy (Auto First-Time Approval):
              </span>
              <p className="mt-0.5 text-emerald-800 leading-relaxed">
                • <strong>Pehli Baar Login (Zero Waiting):</strong> Jab koi ladka first time login karega, toh Super Admin approval ki koi zaroorat nahi hai. First time jis mobile me login karega wo device auto-approve aur lock ho jayega.<br />
                • <strong>Mobile Change / New Phone Login:</strong> Agar ladka apna phone badal kar kisi doosre phone me login karega, tab security ke liye Super Admin approval zaroori hoga. Kisi doosre ladke ke phone me login karna hard-blocked hai.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900">
                Registered Hardware Devices &amp; IMEI Lock Status ({devices.length})
              </h2>
              <div className="text-xs text-slate-500">
                Pending Approval:{" "}
                <span className="font-bold text-amber-600">
                  {devices.filter((d) => d.status === 1).length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/75 border-b text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Device Identity</th>
                    <th className="p-3">Hardware Signature / IMEI</th>
                    <th className="p-3">OS &amp; Platform</th>
                    <th className="p-3">Assigned Sales Rep</th>
                    <th className="p-3">Registered At</th>
                    <th className="p-3">Lock Status</th>
                    <th className="p-3 text-right">Super Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No mobile devices have attempted registration yet.
                      </td>
                    </tr>
                  ) : (
                    devices.map((d) => {
                      const isPending = d.status === 1;
                      const isActive = d.status === 2;
                      const isRevoked = d.status === 3;
                      const isSuspicious = d.status === 4;

                      return (
                        <tr key={d.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-semibold text-slate-900">
                            <div>{d.deviceModel || "Unknown Smartphone"}</div>
                            <div className="text-[10px] text-slate-400">{d.deviceBrand}</div>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-600">
                            {d.deviceFingerprint}
                          </td>
                          <td className="p-3 text-slate-600">{d.osVersion}</td>
                          <td className="p-3">
                            {d.repName ? (
                              <div>
                                <span className="font-semibold text-slate-900">{d.repName}</span>
                                <div className="text-[10px] text-indigo-600 font-mono">
                                  {d.repCode}
                                </div>
                              </div>
                            ) : (
                              <span className="text-amber-600 font-medium italic">
                                Unassigned Rep
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-500">
                            {new Date(d.createdAtUtc).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="p-3">
                            {isPending && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Pending Approval
                              </span>
                            )}
                            {isActive && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                                <Check className="w-3 h-3" /> Bound &amp; Active
                              </span>
                            )}
                            {isRevoked && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                Revoked / Locked
                              </span>
                            )}
                            {isSuspicious && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                Tamper Flagged
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {isPending && (
                              <div className="flex items-center justify-end gap-2">
                                <select
                                  id={`select-rep-${d.id}`}
                                  defaultValue={d.repId || ""}
                                  className="text-[11px] border rounded px-2 py-1 bg-white"
                                >
                                  <option value="">Select Rep to Bind</option>
                                  {reps.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.fullName} ({r.city})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => {
                                    const selectElem = document.getElementById(
                                      `select-rep-${d.id}`
                                    ) as HTMLSelectElement;
                                    handleApproveDevice(d.id, selectElem?.value || d.repId);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                                >
                                  Approve &amp; Lock
                                </button>
                              </div>
                            )}
                            {isActive && (
                              <button
                                onClick={() => handleRevokeDevice(d.id)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition"
                              >
                                Revoke Lock
                              </button>
                            )}
                            {isRevoked && (
                              <button
                                onClick={() => handleApproveDevice(d.id, d.repId)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition"
                              >
                                Re-Authorize
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SALES HIERARCHY (6-TIER) */}
      {/* ========================================================= */}
      {activeTab === "reps" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(Number(e.target.value))}
                className="text-xs border rounded-md px-3 py-2 bg-white text-slate-700"
              >
                <option value={0}>All Role Tiers</option>
                <option value={1}>FSE (Field Sales Executive)</option>
                <option value={2}>ASM (Area Sales Manager)</option>
                <option value={3}>RSM (Regional Sales Manager)</option>
                <option value={4}>ZSM (Zonal Sales Manager)</option>
                <option value={5}>NSM (National Sales Manager)</option>
                <option value={6}>GM / Super Admin</option>
              </select>

              <input
                type="text"
                placeholder="Filter by city..."
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="text-xs border rounded-md px-3 py-2 bg-white text-slate-700"
              />
            </div>

            <button
              onClick={() => setShowAddRepModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Sales Representative
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reps.length === 0 ? (
              <div className="col-span-3 p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">
                No sales representatives found in this filter. Click &quot;Add Sales Representative&quot; to onboard.
              </div>
            ) : (
              reps.map((r) => {
                const tier = getTierLabel(r.roleTier);
                return (
                  <div
                    key={r.id}
                    className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 transition space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{r.fullName}</div>
                        <div className="text-xs font-mono text-indigo-600 font-semibold">
                          Code: {r.repCode}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tier.color}`}
                      >
                        {tier.label.split(" ")[0]}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-600 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">City / Territory:</span>
                        <span className="font-semibold text-slate-800">{r.city}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Mobile Phone:</span>
                        <span className="font-medium text-slate-800">{r.mobile || r.mobileNumber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Assigned Target:</span>
                        <span className="font-bold text-emerald-700">
                          ₹{(r.monthlyTarget || 200000).toLocaleString("en-IN")}/mo
                        </span>
                      </div>
                      {r.reportingManagerName && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Reports To:</span>
                          <span className="font-medium text-slate-700">
                            {r.reportingManagerName}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleUpdateTarget(r.id, r.monthlyTarget || 200000, r.fullName)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit Target
                      </button>
                      <span className="text-[10px] text-slate-400">
                        {r.subordinatesCount > 0 ? `${r.subordinatesCount} Subordinates` : "Direct FSE"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: FIELD SHOP VISITS & ANTI-FRAUD RADAR */}
      {/* ========================================================= */}
      {activeTab === "visits" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Live Shop Visit Audit Feed ({visits.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Mock Location Detection • VPN Guard • Watermarked GPS Geo-Coords
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/75 border-b text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Shop &amp; Owner</th>
                    <th className="p-3">Sales Rep</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Current Software</th>
                    <th className="p-3">GPS &amp; Location Proof</th>
                    <th className="p-3">Anti-Fraud Guard</th>
                    <th className="p-3">Outcome</th>
                    <th className="p-3">Next Followup</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {visits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        No field visits recorded yet. Reps submit visits via field app.
                      </td>
                    </tr>
                  ) : (
                    visits.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-semibold text-slate-900">
                          <div>{v.shopName}</div>
                          <div className="text-[11px] text-slate-500 font-normal">
                            {v.ownerName} • {v.ownerMobile}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{v.repName}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-600">{v.shopCategory}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {v.currentSoftware || "None / Paper"}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] font-mono text-slate-500">
                          <div>
                            {v.latitude?.toFixed(4)}, {v.longitude?.toFixed(4)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Acc: ±{Math.round(v.gpsAccuracyMeters || 0)}m
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {v.isMockLocationDetected ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> Mock GPS
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                                Genuine GPS
                              </span>
                            )}
                            {v.isVpnDetected && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 w-fit">
                                VPN Detected
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{v.interestLevel}</td>
                        <td className="p-3 text-slate-500">
                          {v.nextFollowupDate
                            ? new Date(v.nextFollowupDate).toLocaleDateString("en-IN")
                            : "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: DIRECT SIGNUPS DISPUTE RESOLVER */}
      {/* ========================================================= */}
      {activeTab === "disputes" && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start justify-between gap-4">
            <div>
              <span className="font-bold">Manual Subscription Assignment &amp; Dispute Resolution:</span>
              <p className="mt-0.5 text-emerald-800 leading-relaxed">
                If a customer visits the store through a field rep&apos;s demo but later registers online directly
                without typing the rep&apos;s referral code, you can manually credit that subscription and revenue
                to the sales representative. The rep&apos;s quota will be credited automatically.
              </p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition whitespace-nowrap shadow-sm"
            >
              Transfer / Assign Subscription
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900">
                Attribution Audit Log ({auditLogs.length} Records)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/75 border-b text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Assigned Sales Rep</th>
                    <th className="p-3">Tenant Account</th>
                    <th className="p-3">Credited Revenue</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Attribution Method</th>
                    <th className="p-3">Proof / Reason Notes</th>
                    <th className="p-3">Assigned At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No manual subscription attributions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-semibold text-slate-900">
                          <div>{log.repName}</div>
                          <div className="text-[10px] text-indigo-600 font-mono">
                            {log.repCode} ({log.repCity})
                          </div>
                        </td>
                        <td className="p-3 font-medium text-slate-800">{log.tenantName}</td>
                        <td className="p-3 font-bold text-emerald-600">
                          ₹{log.revenueAmount?.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.isRenewal
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {log.isRenewal ? "Renewal" : "Fresh Sale"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-600">
                          {log.attributionMethod}
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">
                          {log.proofDocumentNotes || "N/A"}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {new Date(log.createdAtUtc).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: MULTI-PRODUCT MASTER */}
      {/* ========================================================= */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Company Multi-Product Portfolio</h2>
              <p className="text-xs text-slate-500">
                FSEs pitch Billing Software, SaaS E-Commerce, Custom Projects &amp; POS Hardware
              </p>
            </div>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Product Catalog Item
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {catalog.map((prod) => (
              <div
                key={prod.id}
                className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <span className="p-2 bg-slate-50 text-slate-700 rounded-lg">
                    <Package className="w-5 h-5 text-indigo-600" />
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {prod.category}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{prod.name}</h3>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Code: {prod.productCode}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Base Price:</span>
                    <span className="font-bold text-slate-900">
                      ₹{prod.basePrice?.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Rep Incentive:</span>
                    <span className="font-semibold text-emerald-600">
                      {prod.defaultRepIncentivePct}%
                    </span>
                  </div>
                  {prod.minPrice && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Price Band:</span>
                      <span className="text-slate-600 text-[11px]">
                        ₹{prod.minPrice?.toLocaleString("en-IN")} - ₹
                        {prod.maxPrice?.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      prod.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {prod.isActive ? "Active in Pitch" : "Deactivated"}
                  </span>
                  <button
                    onClick={() => handleDeleteProduct(prod.id, prod.name)}
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition flex items-center gap-1 text-[11px] font-semibold border border-rose-200 hover:border-rose-300"
                    title="Delete / Deactivate Product"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD SALES REPRESENTATIVE */}
      {/* ========================================================= */}
      {showAddRepModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add Sales Representative</h3>
              <button
                onClick={() => setShowAddRepModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRep} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newRepForm.fullName}
                  onChange={(e) => setNewRepForm({ ...newRepForm, fullName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={newRepForm.mobileNumber}
                    onChange={(e) => setNewRepForm({ ...newRepForm, mobileNumber: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">City / Headquarter</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kanpur"
                    value={newRepForm.city}
                    onChange={(e) => setNewRepForm({ ...newRepForm, city: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role Hierarchy Tier</label>
                  <select
                    value={newRepForm.roleTier}
                    onChange={(e) => {
                      const tier = Number(e.target.value);
                      const defaultTarget = tier === 1 ? 200000 : tier === 2 ? 900000 : tier === 3 ? 3800000 : 15200000;
                      setNewRepForm({ ...newRepForm, roleTier: tier, monthlyTarget: defaultTarget });
                    }}
                    className="w-full border rounded px-3 py-2 bg-white"
                  >
                    <option value={1}>FSE (Field Sales Executive)</option>
                    <option value={2}>ASM (Area Sales Manager)</option>
                    <option value={3}>RSM (Regional Sales Manager)</option>
                    <option value={4}>ZSM (Zonal Sales Manager)</option>
                    <option value={5}>NSM (National Sales Manager)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Login Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={newRepForm.password}
                    onChange={(e) => setNewRepForm({ ...newRepForm, password: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Individual Monthly Target (₹)
                  <span className="text-slate-400 font-normal ml-1">
                    (New/Experienced ladke ke hisaab se custom target set karein)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    min="10000"
                    step="5000"
                    value={newRepForm.monthlyTarget}
                    onChange={(e) =>
                      setNewRepForm({ ...newRepForm, monthlyTarget: Number(e.target.value) })
                    }
                    className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold text-xs"
                    placeholder="e.g. 200000"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 New Ladka: ₹50,000 - ₹1,00,000 | 1 Saal Purana / Senior: ₹2,50,000 - ₹5,00,000
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reporting Manager (Optional)
                </label>
                <select
                  value={newRepForm.reportingToId}
                  onChange={(e) => setNewRepForm({ ...newRepForm, reportingToId: e.target.value })}
                  className="w-full border rounded px-3 py-2 bg-white"
                >
                  <option value="">No Manager / Reports to Super Admin</option>
                  {reps
                    .filter((r) => r.roleTier > 1)
                    .map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.fullName} ({getTierLabel(mgr.roleTier).label.split(" ")[0]} - {mgr.city})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddRepModal(false)}
                  className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                >
                  Register Rep
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ASSIGN SUBSCRIPTION DISPUTE */}
      {/* ========================================================= */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Transfer / Assign Subscription</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignDispute} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Subscription UUID</label>
                <input
                  type="text"
                  required
                  placeholder="Paste Subscription ID"
                  value={assignForm.subscriptionId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, subscriptionId: e.target.value.trim() })
                  }
                  className="w-full border rounded px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tenant ID</label>
                <input
                  type="text"
                  required
                  placeholder="Paste Tenant ID"
                  value={assignForm.tenantId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, tenantId: e.target.value.trim() })
                  }
                  className="w-full border rounded px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Credit to Sales Rep</label>
                <select
                  required
                  value={assignForm.assignedRepId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, assignedRepId: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 bg-white"
                >
                  <option value="">Select Sales Rep</option>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} ({r.repCode} - {r.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Revenue Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={assignForm.revenueAmount}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, revenueAmount: Number(e.target.value) })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sale Type</label>
                  <select
                    value={assignForm.isRenewal ? "renewal" : "fresh"}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, isRenewal: e.target.value === "renewal" })
                    }
                    className="w-full border rounded px-3 py-2 bg-white"
                  >
                    <option value="fresh">Fresh New Sale</option>
                    <option value="renewal">Annual Renewal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason / Proof Notes</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Customer showed store visit demo log by Rahul on 24th Oct"
                  value={assignForm.reasonNotes}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, reasonNotes: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ALLOCATE QUOTA */}
      {/* ========================================================= */}
      {showAllocateQuotaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Allocate Monthly Quota</h3>
              <button
                onClick={() => setShowAllocateQuotaModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAllocateQuota} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Sales Representative</label>
                <select
                  required
                  value={quotaForm.repId}
                  onChange={(e) => setQuotaForm({ ...quotaForm, repId: e.target.value })}
                  className="w-full border rounded px-3 py-2 bg-white"
                >
                  <option value="">Select Rep</option>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} ({r.repCode} - {r.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Month</label>
                  <select
                    value={quotaForm.month}
                    onChange={(e) => setQuotaForm({ ...quotaForm, month: Number(e.target.value) })}
                    className="w-full border rounded px-3 py-2 bg-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Year</label>
                  <input
                    type="number"
                    value={quotaForm.year}
                    onChange={(e) => setQuotaForm({ ...quotaForm, year: Number(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Individual Direct Target (₹)
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={quotaForm.individualTarget}
                  onChange={(e) =>
                    setQuotaForm({ ...quotaForm, individualTarget: Number(e.target.value) })
                  }
                  className="w-full border rounded px-3 py-2 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Team Rollup Target (₹ - Managers Only)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={quotaForm.teamRollupTarget}
                  onChange={(e) =>
                    setQuotaForm({ ...quotaForm, teamRollupTarget: Number(e.target.value) })
                  }
                  className="w-full border rounded px-3 py-2 font-semibold text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAllocateQuotaModal(false)}
                  className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                >
                  Save Quota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD PRODUCT CATALOG */}
      {/* ========================================================= */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add Company Product Item</h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Product Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UB-SAAS-PRO"
                  value={productForm.productCode}
                  onChange={(e) =>
                    setProductForm({ ...productForm, productCode: e.target.value.toUpperCase() })
                  }
                  className="w-full border rounded px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UdyogBill Multi-Branch Retail ERP"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full border rounded px-3 py-2 bg-white"
                  >
                    <option value="BILLING_SOFTWARE">Billing Software</option>
                    <option value="ECOMMERCE">SaaS E-Commerce</option>
                    <option value="CUSTOM_PROJECT">Custom Software Project</option>
                    <option value="HARDWARE">POS Hardware</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Pricing Model</label>
                  <select
                    value={productForm.pricingModel}
                    onChange={(e) =>
                      setProductForm({ ...productForm, pricingModel: Number(e.target.value) })
                    }
                    className="w-full border rounded px-3 py-2 bg-white"
                  >
                    <option value={1}>Annual Subscription</option>
                    <option value={2}>One-Time Project</option>
                    <option value={3}>Hardware Unit</option>
                    <option value={4}>Monthly Addon</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={productForm.basePrice}
                    onChange={(e) =>
                      setProductForm({ ...productForm, basePrice: Number(e.target.value) })
                    }
                    className="w-full border rounded px-3 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Rep Incentive (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={productForm.defaultRepIncentivePct}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        defaultRepIncentivePct: Number(e.target.value),
                      })
                    }
                    className="w-full border rounded px-3 py-2 font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
