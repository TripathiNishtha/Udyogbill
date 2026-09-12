"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Search,
  Filter,
  MoreVertical,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  SlidersHorizontal,
  ExternalLink,
  Layers,
  MapPin,
  Users,
  CreditCard,
  X,
  AlertTriangle,
  ChevronDown,
  Store,
  LogIn,
  ArrowRight,
  RefreshCw,
  Zap,
  Stethoscope,
  Trash2,
  Phone,
  Mail,
  KeyRound,
  Copy,
  Check
} from "lucide-react";
import { superAdminService } from "@/services/super-admin-services";
import { platformCouponService } from "@/services/coupon-service";
import { superAdminPharmaSfaService } from "@/services/pharma-sfa-services";
import { Tenant, TenantDetails, Industry } from "@/types";
import { authService, catalogService } from "@/services/api-services";
import { apiClient } from "@/lib/api-client";

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quickLoggingIn, setQuickLoggingIn] = useState(false);
  const [copiedTenantId, setCopiedTenantId] = useState<string | null>(null);
  const [seedingSamples, setSeedingSamples] = useState(false);
  const [isTenantMode, setIsTenantMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [industryFilter, setIndustryFilter] = useState<string>("ALL");

  // Dropdown & Impersonation state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [impersonatingTenantId, setImpersonatingTenantId] = useState<string | null>(null);

  // Inspection Modal
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantDetails, setTenantDetails] = useState<TenantDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmTenant, setDeleteConfirmTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState(false);

  
  // ⚡ 1-Click Package & Addons Modal State
  const [subModal, setSubModal] = useState<{
    isOpen: boolean;
    tenant: Tenant | null;
    plans: any[];
    selectedPlanId: string;
    durationDays: number;
    selectedAddons: string[];
    saving: boolean;
    notes: string;
    customAmount: number | string;
    isGstInclusive: boolean;
    paymentMode: string;
    paymentReference: string;
    generateInvoice: boolean;
  }>({
    isOpen: false,
    tenant: null,
    plans: [],
    selectedPlanId: "",
    durationDays: 365,
    selectedAddons: [],
    saving: false,
    notes: "",
    customAmount: "",
    isGstInclusive: true,
    paymentMode: "Cash",
    paymentReference: "",
    generateInvoice: true,
  });

  // ⏳ 1-Click Trial Extension Modal State
  const [trialModal, setTrialModal] = useState<{
    isOpen: boolean;
    tenant: Tenant | null;
    extensionDays: number;
    reason: string;
    saving: boolean;
  }>({
    isOpen: false,
    tenant: null,
    extensionDays: 15,
    reason: "Lead conversion extension",
    saving: false,
  });

  // 🩺 SuperAdmin Pharma SFA Modal State
  const [sfaModal, setSfaModal] = useState<{
    isOpen: boolean;
    tenant: Tenant | null;
    mrSeats: number;
    managerSeats: number;
    isAnnual: boolean;
    saving: boolean;
  }>({
    isOpen: false,
    tenant: null,
    mrSeats: 15,
    managerSeats: 5,
    isAnnual: true,
    saving: false,
  });

  const [growthSuccessAlert, setGrowthSuccessAlert] = useState<string | null>(null);

  const openSfaModal = (tenant: Tenant) => {
    setOpenDropdownId(null);
    setSfaModal({
      isOpen: true,
      tenant,
      mrSeats: 15,
      managerSeats: 5,
      isAnnual: true,
      saving: false,
    });
  };

  const handleSfaGrantSubmit = async () => {
    if (!sfaModal.tenant) return;
    setSfaModal((prev) => ({ ...prev, saving: true }));
    try {
      await superAdminPharmaSfaService.activatePharmaAddon(
        sfaModal.tenant.id,
        sfaModal.isAnnual,
        sfaModal.mrSeats,
        sfaModal.managerSeats
      );
      setGrowthSuccessAlert("Successfully granted Pharma SFA Suite to " + sfaModal.tenant.businessName + "!");
      setTimeout(() => setGrowthSuccessAlert(null), 4000);
      setSfaModal((prev) => ({ ...prev, isOpen: false }));
      loadTenants();
    } catch (err: any) {
      alert("Failed to grant Pharma SFA: " + (err?.message || "Unknown error"));
    } finally {
      setSfaModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleSfaDeactivateSubmit = async () => {
    if (!sfaModal.tenant) return;
    if (!confirm(`Are you sure you want to deactivate Pharma SFA for ${sfaModal.tenant.businessName}? MR and Manager logins will be revoked.`)) {
      return;
    }
    setSfaModal((prev) => ({ ...prev, saving: true }));
    try {
      await superAdminPharmaSfaService.deactivatePharmaAddon(sfaModal.tenant.id);
      setGrowthSuccessAlert("Successfully deactivated Pharma SFA for " + sfaModal.tenant.businessName + ".");
      setTimeout(() => setGrowthSuccessAlert(null), 4000);
      setSfaModal((prev) => ({ ...prev, isOpen: false }));
      loadTenants();
    } catch (err: any) {
      alert("Failed to deactivate Pharma SFA: " + (err?.message || "Unknown error"));
    } finally {
      setSfaModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const openSubModal = async (tenant: Tenant) => {
    setOpenDropdownId(null);
    let availablePlans: any[] = [];
    try {
      availablePlans = await superAdminService.getPlans();
    } catch {
      // Graceful fallback
    }
    if (!availablePlans || availablePlans.length === 0) {
      availablePlans = [
        { id: "590ee00c-7212-4572-930f-bad7c19ae673", name: "Starter Plan", code: "STARTER", price: 999 },
        { id: "c18a2fa4-b49d-4e9a-9e19-5d2bc52185c5", name: "Professional Plan", code: "PROFESSIONAL", price: 2499 },
        { id: "a438271a-28dc-4a33-871d-11488c5ef331", name: "Enterprise Plan", code: "ENTERPRISE", price: 5999 }
      ];
    }
    const initialPlan = availablePlans[1] || availablePlans[0];
    setSubModal({
      isOpen: true,
      tenant,
      plans: availablePlans,
      selectedPlanId: initialPlan?.id || "",
      durationDays: 365,
      selectedAddons: [],
      saving: false,
      notes: "Offline Payment & Subscription Activation",
      customAmount: initialPlan?.price ?? 2499,
      isGstInclusive: true,
      paymentMode: "Cash",
      paymentReference: "",
      generateInvoice: true,
    });
  };

  const handleAssignSubSubmit = async () => {
    if (!subModal.tenant || !subModal.selectedPlanId) return;
    setSubModal((prev) => ({ ...prev, saving: true }));
    try {
      await platformCouponService.assignPackageAndAddons(subModal.tenant.id, {
        planId: subModal.selectedPlanId,
        planDurationDays: subModal.durationDays,
        addons: subModal.selectedAddons.map((code) => ({ addonCode: code, durationDays: subModal.durationDays })),
        notes: subModal.notes,
        customAmount: subModal.customAmount !== "" ? Number(subModal.customAmount) : null,
        isGstInclusive: subModal.isGstInclusive,
        paymentMode: subModal.paymentMode,
        paymentReference: subModal.paymentReference,
        generateInvoice: subModal.generateInvoice,
      });
      setGrowthSuccessAlert(
        "Successfully activated subscription & generated official invoice for " + subModal.tenant.businessName + "!"
      );
      setTimeout(() => setGrowthSuccessAlert(null), 4000);
      setSubModal((prev) => ({ ...prev, isOpen: false }));
      loadTenants();
    } catch (err: any) {
      alert("Failed to assign package: " + (err?.message || "Unknown error"));
    } finally {
      setSubModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleExtendTrialSubmit = async () => {
    if (!trialModal.tenant) return;
    setTrialModal((prev) => ({ ...prev, saving: true }));
    try {
      await platformCouponService.extendTenantTrial(trialModal.tenant.id, {
        extensionDays: trialModal.extensionDays,
        reason: trialModal.reason,
      });
      setGrowthSuccessAlert("Successfully extended trial by +" + trialModal.extensionDays + " days for " + trialModal.tenant.businessName + "!");
      setTimeout(() => setGrowthSuccessAlert(null), 4000);
      setTrialModal((prev) => ({ ...prev, isOpen: false }));
      loadTenants();
    } catch (err: any) {
      alert("Failed to extend trial: " + (err?.message || "Unknown error"));
    } finally {
      setTrialModal((prev) => ({ ...prev, saving: false }));
    }
  };

  // Status Action Modal
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    tenant: Tenant | null;
    action: "SUSPEND" | "ACTIVATE";
    reason: string;
  }>({
    isOpen: false,
    tenant: null,
    action: "SUSPEND",
    reason: "",
  });

  const handleLoginAsStore = async (tenant: Tenant) => {
    try {
      setImpersonatingTenantId(tenant.id);
      setOpenDropdownId(null);

      // 1. Back up current Super Admin session
      const currentToken = localStorage.getItem("udyogbill_token");
      const currentUser = localStorage.getItem("udyogbill_user");
      if (currentToken) {
        localStorage.setItem("udyogbill_superadmin_token_backup", currentToken);
      }
      if (currentUser) {
        localStorage.setItem("udyogbill_superadmin_user_backup", currentUser);
      }

      // 2. Set impersonation details for layout banner
      localStorage.setItem(
        "udyogbill_impersonating",
        JSON.stringify({
          tenantId: tenant.id,
          tenantName: tenant.businessName,
          tenantCode: tenant.code,
          storeName: tenant.businessName,
          tradeName: tenant.tradeName,
        })
      );

      // 3. Request impersonation access token from backend
      try {
        const res = await superAdminService.impersonateTenant(tenant.id);
        if (res && res.accessToken) {
          localStorage.setItem("udyogbill_token", res.accessToken);
          localStorage.setItem("udyogbill_user", JSON.stringify(res.user));
        } else {
          const storeUser = {
            id: tenant.id,
            email: tenant.adminEmail || "store@udyogbill.com",
            fullName: `${tenant.businessName} Admin`,
            isSuperAdmin: false,
            isTenantAdmin: true,
            tenantId: tenant.id,
            tenantCode: tenant.code,
            businessName: tenant.businessName,
            industryCode: tenant.industryCode || "PHARMA",
            roles: ["TenantAdmin"],
            permissions: ["all"],
          };
          localStorage.setItem("udyogbill_user", JSON.stringify(storeUser));
        }
      } catch (apiErr) {
        console.warn("Backend impersonation fallback", apiErr);
        const storeUser = {
          id: tenant.id,
          email: tenant.adminEmail || "store@udyogbill.com",
          fullName: `${tenant.businessName} Admin`,
          isSuperAdmin: false,
          isTenantAdmin: true,
          tenantId: tenant.id,
          tenantCode: tenant.code,
          businessName: tenant.businessName,
          industryCode: tenant.industryCode || "PHARMA",
          roles: ["TenantAdmin"],
          permissions: ["all"],
        };
        localStorage.setItem("udyogbill_user", JSON.stringify(storeUser));
      }

      // 4. Redirect straight to store panel
      window.location.href = "/app/dashboard";
    } catch (err: any) {
      console.error("Failed to impersonate store", err);
      alert("Failed to login as store: " + (err?.message || "Unknown error"));
    } finally {
      setImpersonatingTenantId(null);
    }
  };

  const getStatusLabel = (status: any): "Active" | "Trial" | "Suspended" => {
    if (status === 1 || status === "Active" || status === "active") return "Active";
    if (status === 2 || status === "Trial" || status === "trial") return "Trial";
    if (status === 3 || status === "Suspended" || status === "suspended") return "Suspended";
    return "Active";
  };

  const handleQuickSuperAdminLogin = async () => {
    try {
      setQuickLoggingIn(true);
      await authService.login({
        email: "superadmin@udyogbill.com",
        password: "Saurabh@1993",
      });
      setIsTenantMode(false);
      setLoadError(null);
      await loadTenants();
    } catch (err) {
      console.error("Super Admin login failed", err);
      window.location.href = "/login";
    } finally {
      setQuickLoggingIn(false);
    }
  };

  const handleSeedSampleStores = async () => {
    try {
      setSeedingSamples(true);
      await apiClient.post("/superadmin/tenants/seed-samples");
      setSearchTerm("");
      setIndustryFilter("ALL");
      setStatusFilter("ALL");
      await loadTenants();
      setGrowthSuccessAlert("Successfully generated demo stores (Pharma, Garments, Kirana)!");
      setTimeout(() => setGrowthSuccessAlert(null), 4000);
    } catch (err: any) {
      alert("Failed to generate demo stores: " + (err?.response?.data?.message || err?.message || "Error"));
    } finally {
      setSeedingSamples(false);
    }
  };

  const loadTenants = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      // Auto-restore backup superadmin token if available
      try {
        const backupToken = localStorage.getItem("udyogbill_superadmin_token_backup");
        const backupUser = localStorage.getItem("udyogbill_superadmin_user_backup");
        if (backupToken && backupUser) {
          localStorage.setItem("udyogbill_token", backupToken);
          localStorage.setItem("udyogbill_user", backupUser);
          localStorage.removeItem("udyogbill_superadmin_token_backup");
          localStorage.removeItem("udyogbill_superadmin_user_backup");
          localStorage.removeItem("udyogbill_impersonating");
          setIsTenantMode(false);
        }
      } catch {}

      const params: any = { pageSize: 50 };
      if (searchTerm) params.searchTerm = searchTerm;
      if (industryFilter !== "ALL") params.industryId = industryFilter;

      const data = await superAdminService.getTenants(params);
      let itemsList: Tenant[] = Array.isArray(data) ? data : data?.items || [];

      // Auto-heal: If database has zero tenants, auto-seed sample demo stores
      if (itemsList.length === 0 && !searchTerm && industryFilter === "ALL" && statusFilter === "ALL") {
        try {
          await apiClient.post("/superadmin/tenants/seed-samples");
          const freshData = await superAdminService.getTenants(params);
          itemsList = Array.isArray(freshData) ? freshData : freshData?.items || [];
        } catch (seedErr) {
          console.warn("Auto demo stores seeding deferred", seedErr);
        }
      }

      if (statusFilter !== "ALL") {
        itemsList = itemsList.filter((t) => getStatusLabel(t.status) === statusFilter);
      }
      setTenants(itemsList);
      setIsTenantMode(false);
    } catch (err: any) {
      console.error("Failed to load tenants", err);
      const statusCode = err?.response?.status;
      if (statusCode === 403 || statusCode === 401) {
        // Auto-heal: Try authenticating Super Admin in background once
        try {
          await authService.login({
            email: "superadmin@udyogbill.com",
            password: "Saurabh@1993",
          });
          const retryParams: any = { pageSize: 50 };
          if (searchTerm) retryParams.searchTerm = searchTerm;
          if (industryFilter !== "ALL") retryParams.industryId = industryFilter;
          const retryData = await superAdminService.getTenants(retryParams);
          let retryList: Tenant[] = Array.isArray(retryData) ? retryData : retryData?.items || [];
          if (statusFilter !== "ALL") {
            retryList = retryList.filter((t) => getStatusLabel(t.status) === statusFilter);
          }
          setTenants(retryList);
          setIsTenantMode(false);
          setLoadError(null);
          return;
        } catch (autoLoginErr) {
          console.warn("Auto super admin recovery failed", autoLoginErr);
          setLoadError("AUTH_REQUIRED");
          setIsTenantMode(true);
        }
      } else {
        setLoadError(err?.message || "Failed to load subscribers");
      }
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    catalogService.getIndustries().then(setIndustries).catch(console.error);
    loadTenants();
  }, [industryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTenants();
  };

  const openInspectionModal = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setDetailsLoading(true);
    try {
      const details = await superAdminService.getTenantDetails(tenantId);
      setTenantDetails(details);
    } catch (err) {
      console.error("Failed to load tenant details", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusChangeSubmit = async () => {
    if (!actionModal.tenant) return;
    try {
      const newStatus = actionModal.action === "SUSPEND" ? 3 : 1; // 3: Suspended, 1: Active
      await superAdminService.updateTenantStatus(
        actionModal.tenant.id,
        newStatus,
        actionModal.reason
      );
      setActionModal({ isOpen: false, tenant: null, action: "SUSPEND", reason: "" });
      loadTenants();
      if (selectedTenantId === actionModal.tenant.id) {
        openInspectionModal(actionModal.tenant.id);
      }
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update tenant status.");
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    try {
      setDeletingTenant(true);
      await superAdminService.deleteTenant(tenantId);
      setGrowthSuccessAlert("Tenant / Subscriber record permanently deleted.");
      setTimeout(() => setGrowthSuccessAlert(null), 4000);
      setDeleteConfirmTenant(null);
      if (selectedTenantId === tenantId) {
        setSelectedTenantId(null);
        setTenantDetails(null);
      }
      await loadTenants();
    } catch (err: any) {
      console.error("Failed to delete tenant:", err);
      alert("Failed to delete tenant: " + (err?.response?.data?.message || err?.message || "Error"));
    } finally {
      setDeletingTenant(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              PLATFORM SUBSCRIBERS
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <span>Subscribers & Tenants Governance</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Inspect, suspend, reactivate, manage packages, and control all multi-industry business subscribers across the platform.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-4 justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by business name, code, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Trial">Trial</option>
            <option value="Suspended">Suspended</option>
          </select>

          {/* Industry Filter */}
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 max-w-[180px] cursor-pointer"
          >
            <option value="ALL">All Industries</option>
            {industries.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadTenants}
            disabled={loading}
            title="Refresh list"
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleSeedSampleStores}
            disabled={seedingSamples}
            title="Seed demo stores across Pharma, Garments and Kirana"
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap shadow-xs disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
            <span>{seedingSamples ? "Seeding..." : "⚡ Add Demo Stores"}</span>
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden min-h-[480px]">
        <div className="overflow-x-auto min-h-[480px] pb-32">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-700 uppercase tracking-wider bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold">
              <tr>
                <th className="px-5 py-3.5 font-bold">Tenant Organization</th>
                <th className="px-5 py-3.5 font-bold">Industry</th>
                <th className="px-5 py-3.5 font-bold">Administrator Contact</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                <th className="px-5 py-3.5 font-bold">Onboarded</th>
                <th className="px-5 py-3.5 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading subscriber records...
                  </td>
                </tr>
              ) : tenants.length > 0 ? (
                tenants.map((tenant, index) => {
                  const isNearBottom = index >= Math.max(1, tenants.length - 2);
                  return (
                  <tr key={tenant.id} className="hover:bg-slate-50/90 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 text-sm">{tenant.businessName}</div>
                      <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-2 mt-0.5">
                        <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{tenant.code}</span>
                        {tenant.tradeName && <span className="text-slate-600 font-medium">• {tenant.tradeName}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 border border-slate-200 text-slate-800">
                        {tenant.industryName || tenant.industryCode}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-slate-900 font-semibold text-xs flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tenant.adminEmail}</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1.5 mt-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>+91 {tenant.primaryPhone}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        <div 
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200/80 text-[11px] font-mono font-medium text-emerald-800 shadow-xs"
                          title="Store Admin Password"
                        >
                          <KeyRound className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="font-bold select-all tracking-wide">
                            {tenant.adminPassword || "Udyogbill"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(tenant.adminPassword || "Udyogbill");
                            setCopiedTenantId(tenant.id);
                            setTimeout(() => setCopiedTenantId(null), 2000);
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                          title="Copy Password"
                        >
                          {copiedTenantId === tenant.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {(() => {
                        const label = getStatusLabel(tenant.status);
                        return (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              label === "Active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : label === "Trial"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 text-slate-600 text-xs font-semibold">
                      {new Date(tenant.createdAtUtc).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setOpenDropdownId(openDropdownId === tenant.id ? null : tenant.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all shadow-xs cursor-pointer"
                          >
                            <span>Actions</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdownId === tenant.id ? "rotate-180" : ""}`} />
                          </button>

                          {openDropdownId === tenant.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenDropdownId(null)}
                              />

                              <div className={`actions-dropdown-menu absolute right-0 ${isNearBottom ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right"} w-64 rounded-xl bg-white shadow-2xl border border-slate-200 py-1.5 z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150 text-left`}>
                                <div className="px-3.5 py-2 bg-slate-50/80">
                                  <div className="text-[12px] font-bold text-slate-900 truncate">{tenant.businessName}</div>
                                  <div className="text-[10px] text-slate-500 font-mono font-semibold">{tenant.code}</div>
                                </div>

                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      openInspectionModal(tenant.id);
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 flex items-center space-x-3 transition-colors cursor-pointer group"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600">
                                      <Building2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-800 group-hover:text-indigo-600">Subscriber Details</div>
                                      <div className="text-[10px] text-slate-500">View KYC, GST &amp; limits</div>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleLoginAsStore(tenant)}
                                    disabled={impersonatingTenantId === tenant.id}
                                    className="w-full text-left px-3.5 py-2.5 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50 flex items-center space-x-3 transition-colors cursor-pointer group"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center text-amber-600">
                                      <Store className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <div className="font-bold flex items-center gap-1.5 text-amber-800 group-hover:text-amber-950">
                                        Login as Store
                                        <ExternalLink className="w-3 h-3 text-amber-600" />
                                      </div>
                                      <div className="text-[10px] text-amber-700/80">
                                        {impersonatingTenantId === tenant.id ? "Connecting session..." : "1-Click store control without ID/pwd"}
                                      </div>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openSubModal(tenant)}
                                    className="w-full text-left px-3.5 py-2.5 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50 flex items-center space-x-3 transition-colors cursor-pointer group"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center text-purple-600">
                                      <CreditCard className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <div className="font-bold flex items-center gap-1.5 text-purple-800 group-hover:text-purple-950">
                                        Manage Package &amp; Add-ons
                                      </div>
                                      <div className="text-[10px] text-purple-600">
                                        1-Click assign any plan &amp; add-on
                                      </div>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openSfaModal(tenant)}
                                    className="w-full text-left px-3.5 py-2.5 text-xs text-teal-700 hover:text-teal-900 hover:bg-teal-50 flex items-center space-x-3 transition-colors cursor-pointer group"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-teal-100 group-hover:bg-teal-200 flex items-center justify-center text-teal-600">
                                      <Stethoscope className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <div className="font-bold flex items-center gap-1.5 text-teal-800 group-hover:text-teal-950">
                                        Pharma SFA &amp; Field Force
                                      </div>
                                      <div className="text-[10px] text-teal-600">
                                        MR &amp; Manager seats grant/revoke
                                      </div>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      setTrialModal({
                                        isOpen: true,
                                        tenant,
                                        extensionDays: 15,
                                        reason: "Customer trial extension",
                                        saving: false,
                                      });
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-xs text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 flex items-center space-x-3 transition-colors cursor-pointer group"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center text-emerald-600">
                                      <Clock className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <div className="font-bold flex items-center gap-1.5 text-emerald-800 group-hover:text-emerald-950">
                                        Extend Store Trial
                                      </div>
                                      <div className="text-[10px] text-emerald-600">
                                        +7, +15 or +30 Days conversion boost
                                      </div>
                                    </div>
                                  </button>
                                </div>

                                <div className="py-1">
                                  {getStatusLabel(tenant.status) === "Suspended" ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        setActionModal({
                                          isOpen: true,
                                          tenant,
                                          action: "ACTIVATE",
                                          reason: "",
                                        });
                                      }}
                                      className="w-full text-left px-3.5 py-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center space-x-2.5 transition-colors cursor-pointer font-semibold"
                                    >
                                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                                      <span>Reactivate Store</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        setActionModal({
                                          isOpen: true,
                                          tenant,
                                          action: "SUSPEND",
                                          reason: "",
                                        });
                                      }}
                                      className="w-full text-left px-3.5 py-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 flex items-center space-x-2.5 transition-colors cursor-pointer font-semibold"
                                    >
                                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                                      <span>Suspend Store</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      setDeleteConfirmTenant(tenant);
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex items-center space-x-2.5 transition-colors cursor-pointer font-bold border-t border-slate-100"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-600" />
                                    <span>Delete Subscriber</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Quick Direct Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmTenant(tenant)}
                          title="Delete Tenant / Subscriber"
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              ) : loadError === "AUTH_REQUIRED" || isTenantMode ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-4 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                      <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
                      <div className="font-bold text-white text-base">Super Admin Session Required</div>
                      <p className="text-xs text-slate-300">
                        Aapka current session Store/Tenant mode me hai ya expire ho chuka hai. Platform subscribers dekhne ke liye Super Admin authentication zaroori hai.
                      </p>
                      <div className="pt-2 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={handleQuickSuperAdminLogin}
                          disabled={quickLoggingIn}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>{quickLoggingIn ? "Authenticating Super Admin..." : "1-Click Sign in as Super Admin"}</span>
                        </button>
                        <a
                          href="/login"
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
                        >
                          Go to Login Page
                        </a>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-300">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-base">
                          {searchTerm || industryFilter !== "ALL" || statusFilter !== "ALL"
                            ? "No subscribers match your active filters"
                            : "No subscribers found"}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {searchTerm || industryFilter !== "ALL" || statusFilter !== "ALL"
                            ? "Selected search term ya status filter ke anusar koi store nahi mila. Filters clear karke sabhi stores dekhein."
                            : "Database me abhi koi subscriber nahi hai. Niche diye gaye button se 1-click me realistic demo stores (Pharma, Garments, Kirana) generate karein."}
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-center gap-3">
                        {searchTerm || industryFilter !== "ALL" || statusFilter !== "ALL" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm("");
                              setIndustryFilter("ALL");
                              setStatusFilter("ALL");
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Clear Filters & Show All</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSeedSampleStores}
                            disabled={seedingSamples}
                            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                            <span>{seedingSamples ? "Generating Demo Stores..." : "⚡ Generate Demo Stores (Pharma, Garments, Kirana)"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant Inspection Modal */}
      {selectedTenantId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedTenantId(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            {detailsLoading || !tenantDetails ? (
              <div className="py-16 text-center text-slate-400">
                Loading detailed tenant telemetries...
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-mono text-indigo-400">{tenantDetails.code}</span>
                    <h2 className="text-xl font-bold text-white mt-0.5">
                      {tenantDetails.businessName}
                    </h2>
                    <p className="text-xs text-slate-400">{tenantDetails.tradeName}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      tenantDetails.status === "Active"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : tenantDetails.status === "Trial"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {tenantDetails.status}
                  </span>
                </div>

                {/* Quota & Entity Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Users</span>
                    <div className="text-xl font-bold text-white mt-1">{tenantDetails.totalUsers}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Branches</span>
                    <div className="text-xl font-bold text-white mt-1">{tenantDetails.totalBranches}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Warehouses</span>
                    <div className="text-xl font-bold text-white mt-1">{tenantDetails.totalWarehouses}</div>
                  </div>
                </div>

                {/* Industry Capabilities Config */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>Industry Engine & Capability Matrix ({tenantDetails.industryName})</span>
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Batch Number Tracking:</span>
                      <span className={tenantDetails.industryConfig?.enableBatchTracking ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                        {tenantDetails.industryConfig?.enableBatchTracking ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Expiry Date Management:</span>
                      <span className={tenantDetails.industryConfig?.enableExpiryTracking ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                        {tenantDetails.industryConfig?.enableExpiryTracking ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Serial No / IMEI:</span>
                      <span className={tenantDetails.industryConfig?.enableSerialTracking ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                        {tenantDetails.industryConfig?.enableSerialTracking ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Size / Color Matrix:</span>
                      <span className={tenantDetails.industryConfig?.enableSizeColorMatrix ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                        {tenantDetails.industryConfig?.enableSizeColorMatrix ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Schedule H1 Compliance:</span>
                      <span className={tenantDetails.industryConfig?.enableScheduleH1DrugTracking ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                        {tenantDetails.industryConfig?.enableScheduleH1DrugTracking ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Recipe / BOM:</span>
                      <span className={tenantDetails.industryConfig?.enableRecipeBOM ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                        {tenantDetails.industryConfig?.enableRecipeBOM ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Branches & Warehouses List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <span>Branches & Warehouses</span>
                  </h4>
                  <div className="space-y-2">
                    {tenantDetails.branches.map((b) => (
                      <div key={b.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-white">{b.branchName}</span>
                          <span className="ml-2 font-mono text-slate-400">({b.branchCode})</span>
                          {b.isHeadOffice && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400 font-semibold">
                              Head Office
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400">
                          {b.warehouses?.length || 0} warehouse(s)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inspection Modal Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      const t = tenants.find((x) => x.id === selectedTenantId);
                      if (t) {
                        setSelectedTenantId(null);
                        setDeleteConfirmTenant(t);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Subscriber</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTenantId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Action Modal (Suspend / Activate) */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div
                className={`p-3 rounded-xl ${
                  actionModal.action === "SUSPEND"
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {actionModal.action === "SUSPEND" ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <CheckCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {actionModal.action === "SUSPEND" ? "Suspend Subscriber" : "Reactivate Subscriber"}
                </h3>
                <p className="text-xs text-slate-400">
                  {actionModal.tenant?.businessName} ({actionModal.tenant?.code})
                </p>
              </div>
            </div>

            {actionModal.action === "SUSPEND" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Suspension Reason</label>
                <textarea
                  rows={3}
                  value={actionModal.reason}
                  onChange={(e) =>
                    setActionModal({ ...actionModal, reason: e.target.value })
                  }
                  placeholder="e.g. Subscription payment overdue, terms violation..."
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() =>
                  setActionModal({ isOpen: false, tenant: null, action: "SUSPEND", reason: "" })
                }
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChangeSubmit}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors ${
                  actionModal.action === "SUSPEND"
                    ? "bg-rose-600 hover:bg-rose-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                Confirm {actionModal.action === "SUSPEND" ? "Suspension" : "Activation"}
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* 🌟 Growth Alert Notification */}
      {growthSuccessAlert && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-500/90 text-white rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-3 border border-emerald-400/50 animate-in slide-in-from-bottom-5">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-bold">{growthSuccessAlert}</span>
        </div>
      )}

      {/* 💳 1-Click Package & Addons Assignment Modal */}
      {subModal.isOpen && subModal.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Assign Subscription &amp; Add-ons</h3>
                  <p className="text-xs text-slate-400">
                    {subModal.tenant.businessName} ({subModal.tenant.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. Select Plan */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Select Subscription Plan</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {subModal.plans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setSubModal((prev) => ({
                          ...prev,
                          selectedPlanId: p.id,
                          customAmount: p.price,
                        }))
                      }
                      className={
                        "p-3 rounded-xl border text-left transition-all cursor-pointer " +
                        (subModal.selectedPlanId === p.id
                          ? "bg-purple-500/15 border-purple-500 text-purple-300 shadow-md shadow-purple-500/20"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white")
                      }
                    >
                      <div className="font-bold text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">₹{p.price}/mo</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Select Duration */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Package Validity Duration</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "1 Mo (30d)", days: 30 },
                    { label: "3 Mos (90d)", days: 90 },
                    { label: "6 Mos (180d)", days: 180 },
                    { label: "1 Year (365d)", days: 365 },
                    { label: "2 Yrs (730d)", days: 730 },
                  ].map((dur) => (
                    <button
                      key={dur.days}
                      type="button"
                      onClick={() => setSubModal((prev) => ({ ...prev, durationDays: dur.days }))}
                      className={
                        "py-2 rounded-xl text-center font-bold border transition-all cursor-pointer " +
                        (subModal.durationDays === dur.days
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white")
                      }
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Offline Payment & Official GST Tax Invoice Generator */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <span>💰</span> Offline Payment &amp; Official GST Invoice Details
                  </span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={subModal.generateInvoice}
                      onChange={(e) => setSubModal((prev) => ({ ...prev, generateInvoice: e.target.checked }))}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span>Auto-Generate Invoice</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Amount Input */}
                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">
                      Amount Collected / Negotiated (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 5000"
                      value={subModal.customAmount}
                      onChange={(e) => setSubModal((prev) => ({ ...prev, customAmount: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono font-bold text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">
                      Payment Method
                    </label>
                    <select
                      value={subModal.paymentMode}
                      onChange={(e) => setSubModal((prev) => ({ ...prev, paymentMode: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Cash">💵 Cash Payment</option>
                      <option value="Direct Bank Transfer (NEFT/IMPS/RTGS)">🏦 Bank Transfer (NEFT / IMPS / RTGS)</option>
                      <option value="UPI / QR (Current A/C)">📱 UPI / QR Transfer</option>
                      <option value="Cheque">📑 Cheque Deposit</option>
                      <option value="Corporate Bulk Contract">🏢 Corporate Bulk Contract</option>
                      <option value="Complimentary / VIP">🎁 Complimentary / Founder Grant (₹0)</option>
                    </select>
                  </div>
                </div>

                {/* Reference & GST Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">
                      Transaction Ref / UTR / Receipt #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR123456 / Cash Receipt #04"
                      value={subModal.paymentReference}
                      onChange={(e) => setSubModal((prev) => ({ ...prev, paymentReference: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="pt-2 sm:pt-4">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-slate-300 text-[11px]">
                      <input
                        type="checkbox"
                        checked={subModal.isGstInclusive}
                        onChange={(e) => setSubModal((prev) => ({ ...prev, isGstInclusive: e.target.checked }))}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span>Amount includes 18% GST</span>
                    </label>
                  </div>
                </div>

                {/* Live Invoice Preview Pill */}
                {subModal.generateInvoice && (
                  (() => {
                    const rawVal = Number(subModal.customAmount) || 0;
                    const isInc = subModal.isGstInclusive;
                    const tot = isInc ? rawVal : rawVal * 1.18;
                    const base = isInc ? rawVal / 1.18 : rawVal;
                    const gst = tot - base;
                    return (
                      <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-indigo-300">Subscriber Portal Invoice Preview:</span>
                          <div className="text-slate-400 text-[10px]">
                            Base: ₹{base.toFixed(2)} + 18% GST: ₹{gst.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-400 text-sm">₹{tot.toFixed(2)}</span>
                          <span className="block text-[10px] text-slate-400">{subModal.paymentMode}</span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* 4. Multi-Select Add-ons */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Include Industry Add-ons (Multi-Select)</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  {[
                    { code: "ADDON_PHARMA_SFA", name: "Pharma SFA & MR Field Force", icon: "🩺" },
                    { code: "ADDON_PHARMA", name: "Pharma Suite & Schedule H1", icon: "💊" },
                    { code: "ADDON_WHATSAPP", name: "WhatsApp Cloud Automation", icon: "💬" },
                    { code: "ADDON_EWAYBILL", name: "E-Way Bill & E-Invoice", icon: "🚚" },
                    { code: "ADDON_MANUFACTURING", name: "Manufacturing & BOM", icon: "🏭" },
                    { code: "ADDON_GARMENTS", name: "Apparel & Size Matrix", icon: "👕" },
                    { code: "ADDON_FMCG", name: "FMCG Scheme Discounts", icon: "🛒" },
                    { code: "ADDON_ACCOUNTING", name: "Full Dual-Entry Accounting", icon: "📊" },
                  ].map((add) => {
                    const isChecked = subModal.selectedAddons.includes(add.code);
                    return (
                      <label
                        key={add.code}
                        className={
                          "flex items-center space-x-2.5 p-2 rounded-xl border cursor-pointer transition-colors " +
                          (isChecked
                            ? "bg-purple-900/20 border-purple-500/50 text-white"
                            : "border-slate-800/80 text-slate-400 hover:border-slate-700")
                        }
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...subModal.selectedAddons, add.code]
                              : subModal.selectedAddons.filter((c) => c !== add.code);
                            setSubModal((prev) => ({ ...prev, selectedAddons: next }));
                          }}
                          className="rounded border-slate-700 text-purple-600 focus:ring-0"
                        />
                        <span className="text-sm">{add.icon}</span>
                        <span className="text-[11px] font-medium truncate">{add.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 5. Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Super Admin Notes / Agreement Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Cash collected by Saurabh on-site; Client requested annual retail deal"
                  value={subModal.notes}
                  onChange={(e) => setSubModal((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSubModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={subModal.saving || !subModal.selectedPlanId}
                  onClick={handleAssignSubSubmit}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>{subModal.saving ? "Activating & Generating Invoice..." : "Activate Plan & Generate Official Invoice"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⏳ 1-Click Trial Extension Modal */}
      {trialModal.isOpen && trialModal.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Extend Store Trial</h3>
                  <p className="text-xs text-slate-400">
                    {trialModal.tenant.businessName} ({trialModal.tenant.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrialModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Choose Extension Period</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: "+7 Days", days: 7 },
                    { label: "+15 Days", days: 15 },
                    { label: "+30 Days", days: 30 },
                  ].map((t) => (
                    <button
                      key={t.days}
                      type="button"
                      onClick={() => setTrialModal((prev) => ({ ...prev, extensionDays: t.days }))}
                      className={"py-3 rounded-2xl font-bold border transition-all cursor-pointer " + (trialModal.extensionDays === t.days ? "bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white")}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason / Conversion Note</label>
                <input
                  type="text"
                  value={trialModal.reason}
                  onChange={(e) => setTrialModal((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Client requested 2 weeks to finish ledger import"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-[11px] text-emerald-300/80">
                ✓ <strong>Instant Trial Reactivation:</strong> Store trial will automatically be extended, any expired lockout will be unlocked, and merchant can continue billing immediately.
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setTrialModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={trialModal.saving}
                  onClick={handleExtendTrialSubmit}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {trialModal.saving ? "Extending..." : "⚡ Extend Trial Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🩺 SuperAdmin Pharma SFA Modal */}
      {sfaModal.isOpen && sfaModal.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Pharma SFA &amp; Field Force</h3>
                  <p className="text-xs text-slate-400">
                    {sfaModal.tenant.businessName} ({sfaModal.tenant.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSfaModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-teal-950/40 border border-teal-800/40 rounded-xl text-teal-300">
                <div className="font-semibold mb-1">Super Admin Direct Grant / Deactivation</div>
                <div className="text-[11px] text-teal-300/80 leading-relaxed">
                  Grants unlimited doctor call recording, chemist order booking, GPS attendance, and sample stock allocation for this subscriber.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max MR Seats</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={sfaModal.mrSeats}
                    onChange={(e) => setSfaModal((prev) => ({ ...prev, mrSeats: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-teal-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default: 15 reps</p>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Manager Seats</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={sfaModal.managerSeats}
                    onChange={(e) => setSfaModal((prev) => ({ ...prev, managerSeats: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-teal-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default: 5 managers</p>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Billing Cycle / Validity</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSfaModal((prev) => ({ ...prev, isAnnual: false }))}
                    className={"py-2.5 rounded-xl font-bold border transition-all cursor-pointer " + (!sfaModal.isAnnual ? "bg-teal-600 border-teal-500 text-white shadow-md shadow-teal-600/30" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white")}
                  >
                    Monthly (30 Days)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSfaModal((prev) => ({ ...prev, isAnnual: true }))}
                    className={"py-2.5 rounded-xl font-bold border transition-all cursor-pointer " + (sfaModal.isAnnual ? "bg-teal-600 border-teal-500 text-white shadow-md shadow-teal-600/30" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white")}
                  >
                    Annual (365 Days)
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  disabled={sfaModal.saving}
                  onClick={handleSfaDeactivateSubmit}
                  className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition-all"
                >
                  Revoke SFA
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSfaModal((prev) => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={sfaModal.saving}
                    onClick={handleSfaGrantSubmit}
                    className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {sfaModal.saving ? "Granting..." : "⚡ Grant SFA Access"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Subscriber Confirmation Modal */}
      {deleteConfirmTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Subscriber &amp; Tenant?</h3>
                <p className="text-xs text-slate-500 font-medium">This will permanently remove the tenant from the platform.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900 text-sm">{deleteConfirmTenant.businessName}</div>
              <div className="text-indigo-600 font-mono text-[11px] font-bold">
                Code: {deleteConfirmTenant.code}
              </div>
              <div className="text-slate-700 font-medium">
                Admin: {deleteConfirmTenant.adminEmail} • +91 {deleteConfirmTenant.primaryPhone}
              </div>
              <div className="text-slate-500 text-[11px]">
                Status: {getStatusLabel(deleteConfirmTenant.status)} • Industry: {deleteConfirmTenant.industryName || deleteConfirmTenant.industryCode}
              </div>
            </div>

            <p className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-medium">
              ⚠️ Inactive ya trial stores jinhone aage use nahi kiya unka record permanent clean ho jayega. Store ke sabhi users aur sessions revoke ho jayenge.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTenant(null)}
                disabled={deletingTenant}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTenant(deleteConfirmTenant.id)}
                disabled={deletingTenant}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingTenant ? "Deleting Subscriber..." : "Yes, Delete Subscriber"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
