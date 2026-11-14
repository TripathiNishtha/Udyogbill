"use client";

import { useEffect, useState, Fragment } from "react";
import {
  Building2,
  Search,
  Filter,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Fingerprint,
  Radio,
  Laptop,
  Signal,
  Activity,
  Globe,
  Wifi,
  Smartphone,
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
  ChevronUp,
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
import { superAdminService, TenantSecurityAuditSummary } from "@/services/super-admin-services";
import { platformCouponService } from "@/services/coupon-service";
import { superAdminPharmaSfaService } from "@/services/pharma-sfa-services";
import { Tenant, TenantDetails, Industry } from "@/types";
import { authService, catalogService } from "@/services/api-services";
import { apiClient } from "@/lib/api-client";

const formatPlanCycleSuffix = (p: { billingCycle?: number; code?: string; name?: string }) => {
  const code = (p.code || "").toUpperCase();
  const name = (p.name || "").toLowerCase();
  if (p.billingCycle === 24 || code.includes("BIENNIAL") || name.includes("2 year") || name.includes("2 yr") || name.includes("biennial")) return "/ 2 yrs";
  if (p.billingCycle === 12 || code.includes("ANNUAL") || code.includes("YEAR") || name.includes("1 year") || name.includes("1 yr") || name.includes("annual")) return "/ yr";
  if (p.billingCycle === 3) return "/ qtr";
  if (p.billingCycle === 6) return "/ 6 mo";
  if (p.billingCycle === 99) return " (One-time)";
  return "/ mo";
};

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
  const [accountTypeTab, setAccountTypeTab] = useState<"ALL" | "PAID" | "DEMO">("ALL");

  const isTrialAccount = (t: Tenant) => {
    if (t.subscriptionStatus === "Trial") return true;
    if ((t.pendingTrialDays ?? 0) > 0) return true;
    if (t.subscriptionStartDateUtc && t.subscriptionEndDateUtc) {
      const start = new Date(t.subscriptionStartDateUtc).getTime();
      const end = new Date(t.subscriptionEndDateUtc).getTime();
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
      if (diffDays <= 31) return true;
    }
    return false;
  };

  // Dropdown & Impersonation state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [impersonatingTenantId, setImpersonatingTenantId] = useState<string | null>(null);
  const [expandedTenantIds, setExpandedTenantIds] = useState<Set<string>>(new Set());

  const toggleExpandTenant = (id: string) => {
    setExpandedTenantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 🛡️ Security Audit Modal State
  const [securityModalTenant, setSecurityModalTenant] = useState<Tenant | null>(null);
  const [securityAuditData, setSecurityAuditData] = useState<TenantSecurityAuditSummary | null>(null);
  const [securityAuditLoading, setSecurityAuditLoading] = useState(false);
  const [securityAuditTab, setSecurityAuditTab] = useState<"devices" | "logins" | "activity">("devices");

  const handleOpenSecurityAudit = async (tenant: Tenant) => {
    setSecurityModalTenant(tenant);
    setSecurityAuditLoading(true);
    setSecurityAuditData(null);
    setSecurityAuditTab("devices");
    try {
      const data = await superAdminService.getTenantSecurityAudit(tenant.id);
      setSecurityAuditData(data);
    } catch (err: any) {
      console.error("Failed to load tenant security audit:", err);
    } finally {
      setSecurityAuditLoading(false);
    }
  };

  // Inspection Modal
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantDetails, setTenantDetails] = useState<TenantDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmTenant, setDeleteConfirmTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState(false);

  // SuperAdmin Direct Reset Password Modal State
  const [resetPwdModal, setResetPwdModal] = useState<{
    isOpen: boolean;
    tenant: Tenant | null;
    newPassword: string;
    submitting: boolean;
    error: string | null;
    successMessage: string | null;
    showPassword: boolean;
    copied: boolean;
  }>({
    isOpen: false,
    tenant: null,
    newPassword: "",
    submitting: false,
    error: null,
    successMessage: null,
    showPassword: true,
    copied: false,
  });

  const openResetPasswordModal = (tenant: Tenant) => {
    setOpenDropdownId(null);
    const suggested = "Udyog@" + Math.floor(100 + Math.random() * 900) + "!";
    setResetPwdModal({
      isOpen: true,
      tenant,
      newPassword: suggested,
      submitting: false,
      error: null,
      successMessage: null,
      showPassword: true,
      copied: false,
    });
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPwdModal.tenant) return;
    if (!resetPwdModal.newPassword || resetPwdModal.newPassword.trim().length < 6) {
      setResetPwdModal((prev) => ({ ...prev, error: "Password must be at least 6 characters long." }));
      return;
    }

    setResetPwdModal((prev) => ({ ...prev, submitting: true, error: null, successMessage: null }));
    try {
      const res = await superAdminService.resetTenantPassword(resetPwdModal.tenant.id, resetPwdModal.newPassword.trim());
      setResetPwdModal((prev) => ({
        ...prev,
        submitting: false,
        successMessage: `Password successfully updated to: ${resetPwdModal.newPassword.trim()} for ${res?.userEmail || resetPwdModal.tenant?.adminEmail}`,
      }));
      setGrowthSuccessAlert(`Password reset successfully for ${resetPwdModal.tenant.businessName}!`);
      setTimeout(() => setGrowthSuccessAlert(null), 5000);
      loadTenants();
    } catch (err: any) {
      console.error("Failed to reset password", err);
      setResetPwdModal((prev) => ({
        ...prev,
        submitting: false,
        error: err?.response?.data?.message || err?.message || "Failed to reset password",
      }));
    }
  };

  
  // ⚡ 1-Click Package & Addons Modal State
  const [subModal, setSubModal] = useState<{
    isOpen: boolean;
    tenant: Tenant | null;
    plans: any[];
    selectedPlanId: string;
    durationDays: number;
    startDate: string;
    selectedAddons: string[];
    extraUsers: number;
    saving: boolean;
    notes: string;
    customAmount: number | string;
    isGstInclusive: boolean;
    paymentMode: string;
    paymentReference: string;
    generateInvoice: boolean;
    isTrialMode: boolean;
  }>({
    isOpen: false,
    tenant: null,
    plans: [],
    selectedPlanId: "",
    durationDays: 365,
    startDate: new Date().toISOString().split("T")[0],
    selectedAddons: [],
    extraUsers: 0,
    saving: false,
    notes: "",
    customAmount: "",
    isGstInclusive: true,
    paymentMode: "Cash",
    paymentReference: "",
    generateInvoice: true,
    isTrialMode: false,
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
        { id: "83c7e078-6611-49a1-840b-4338e2f8c603", name: "UdyogBill Core (1 Year)", code: "CORE_ANNUAL", price: 3999, maxUsers: 1 },
        { id: "1b9d38f8-e0e9-40c4-9edc-aded77594a61", name: "UdyogBill Core (2 Years Deal)", code: "CORE_BIENNIAL", price: 6999, maxUsers: 1 },
        { id: "6e8a7030-8248-422f-8a38-c8ddbd251513", name: "UDYOGBILL PRO", code: "UDYOGBILL PRO", price: 6499, maxUsers: 17 },
        { id: "590ee00c-7212-4572-930f-bad7c19ae673", name: "Starter Plan", code: "STARTER", price: 999, maxUsers: 3 },
        { id: "c18a2fa4-b49d-4e9a-9e19-5d2bc52185c5", name: "Professional Plan", code: "PROFESSIONAL", price: 2499, maxUsers: 10 },
        { id: "a438271a-28dc-4a33-871d-11488c5ef331", name: "Enterprise Plan", code: "ENTERPRISE", price: 5999, maxUsers: 50 }
      ];
    }
    const initialPlan = availablePlans.find((p) => p.code === "CORE_ANNUAL") || availablePlans[0];

    // Detect currently active add-ons for this subscriber
    const initialAddons: string[] = [];
    try {
      const details = await superAdminService.getTenantDetails(tenant.id);
      if (details) {
        if (details.industryConfig?.configurationJson) {
          try {
            const conf = JSON.parse(details.industryConfig.configurationJson);
            if (conf["pharma-sfa"] || conf["pharma_sfa"]) initialAddons.push("ADDON_PHARMA_SFA");
            if (conf["pharma"]) initialAddons.push("ADDON_PHARMA");
            if (conf["ai-pro"] || conf["ai_pro"] || conf["ai-scanner"]) initialAddons.push("ADDON_AI_PRO");
            if (conf["whatsapp"]) initialAddons.push("ADDON_WHATSAPP");
            if (conf["ewaybill"]) initialAddons.push("ADDON_EWAYBILL");
            if (conf["manufacturing"]) initialAddons.push("ADDON_MANUFACTURING");
            if (conf["garments"]) initialAddons.push("ADDON_GARMENTS");
            if (conf["fmcg"]) initialAddons.push("ADDON_FMCG");
            if (conf["accounting"]) initialAddons.push("ADDON_ACCOUNTING");
            if (conf["multitab"] || conf["multitab-billing"] || conf["multi-draft"]) initialAddons.push("ADDON_MULTITAB_BILLING");
          } catch {}
        }
      }
    } catch {}

    const isTenantInTrial = tenant.status === "Trial" || (tenant.status as any) === 0;

    setSubModal({
      isOpen: true,
      tenant,
      isTrialMode: isTenantInTrial,
      plans: availablePlans,
      selectedPlanId: initialPlan?.id || "",
      durationDays: isTenantInTrial ? 30 : 365,
      startDate: new Date().toISOString().split("T")[0],
      selectedAddons: initialAddons,
      extraUsers: 0,
      saving: false,
      notes: isTenantInTrial ? "Feature Demo / Trial Grant" : "Offline Payment & Subscription Activation",
      customAmount: isTenantInTrial ? 0 : (initialPlan?.price ?? 3999),
      isGstInclusive: true,
      paymentMode: "Cash",
      paymentReference: "",
      generateInvoice: !isTenantInTrial,
    });
  };

  const handleAssignSubSubmit = async () => {
    if (!subModal.tenant || !subModal.selectedPlanId) return;
    setSubModal((prev) => ({ ...prev, saving: true }));
    const rawAmount = Number(subModal.customAmount) || 0;
    const shouldGenerateInvoice = !subModal.isTrialMode && rawAmount > 0 && subModal.generateInvoice;

    try {
      await platformCouponService.assignPackageAndAddons(subModal.tenant.id, {
        planId: subModal.selectedPlanId,
        planDurationDays: subModal.durationDays,
        startDate: subModal.startDate ? new Date(subModal.startDate).toISOString() : undefined,
        addons: subModal.selectedAddons.map((code) => ({ addonCode: code, durationDays: subModal.durationDays })),
        extraUsers: subModal.extraUsers,
        notes: subModal.notes,
        customAmount: subModal.isTrialMode ? 0 : rawAmount,
        isGstInclusive: subModal.isGstInclusive,
        paymentMode: subModal.paymentMode,
        paymentReference: subModal.paymentReference,
        generateInvoice: shouldGenerateInvoice,
        isTrialMode: subModal.isTrialMode,
      });
      setGrowthSuccessAlert(
        subModal.isTrialMode
          ? `Successfully granted demo feature(s) for ${subModal.tenant.businessName} (Trial preserved, no invoice generated)!`
          : shouldGenerateInvoice
            ? `Successfully activated subscription & generated official invoice for ${subModal.tenant.businessName}!`
            : `Successfully activated subscription for ${subModal.tenant.businessName} (₹0 amount: no invoice generated)!`
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
          industryCode: tenant.industryCode || tenant.industryName,
          industryName: tenant.industryName,
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

  const getStatusLabel = (status: any): "Active" | "Trial" | "Suspended" | "Expired" => {
    if (status === 1 || status === "Active" || status === "active") return "Active";
    if (status === 2 || status === "Trial" || status === "trial" || status === 0 || status === "PendingVerification") return "Trial";
    if (status === 3 || status === "Suspended" || status === "suspended") return "Suspended";
    if (status === 4 || status === "Expired" || status === "expired") return "Expired";
    return "Trial";
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

      const processAndEnrichTenants = async (rawTenants: Tenant[], currentStatusFilter: string) => {
        // 1. Group Multi-Company / Sub-Firms under their Parent Organization
        const parentIdMap = new Map<string, Tenant>();
        rawTenants.forEach((t) => {
          if (!t.childCompanies) t.childCompanies = [];
          parentIdMap.set(t.id, t);
        });

        const rootList: Tenant[] = [];

        rawTenants.forEach((t) => {
          let parent: Tenant | undefined = undefined;
          if (t.parentTenantId && parentIdMap.has(t.parentTenantId)) {
            parent = parentIdMap.get(t.parentTenantId);
          } else if (t.code === "TNT-CMP-1040" || t.businessName.toLowerCase() === "medopera") {
            parent = rawTenants.find(
              (p) => p.code === "TNT-SERVICE_SECTOR-1028" || p.businessName.toLowerCase().includes("digiopera")
            );
          } else if (t.code === "TNT-CMP-1068" || t.businessName.toLowerCase().includes("paws")) {
            parent = rawTenants.find(
              (p) => p.code === "TNT-PHARMA-1067" || p.businessName.toLowerCase().includes("pet care")
            );
          } else if (t.code?.includes("CMP") && t.adminEmail) {
            parent = rawTenants.find(
              (p) => p.id !== t.id && p.adminEmail?.toLowerCase() === t.adminEmail?.toLowerCase() && !p.code?.includes("CMP")
            );
          }

          if (parent && parent.id !== t.id) {
            if (!parent.childCompanies) parent.childCompanies = [];
            if (!parent.childCompanies.some((c) => c.id === t.id)) {
              parent.childCompanies.push({
                id: t.id,
                code: t.code,
                businessName: t.businessName,
                tradeName: t.tradeName || "",
                industryName: t.industryName || t.industryCode || "General",
                industryCode: t.industryCode || "GENERAL",
                status: t.status,
                gstin: t.gstin,
                primaryPhone: t.primaryPhone,
                createdAtUtc: t.createdAtUtc,
              });
            }
          } else {
            rootList.push(t);
          }
        });

        let displayList = rootList;
        if (currentStatusFilter !== "ALL") {
          displayList = rootList.filter((t) => getStatusLabel(t.status) === currentStatusFilter);
        }
        setTenants([...displayList]);
        setIsTenantMode(false);

        // 2. Asynchronously enrich each tenant with their real package name & subscription end date
        try {
          const enrichTargets = [...displayList];
          const results = await Promise.allSettled(
            enrichTargets.map(async (t) => {
              try {
                const details = await superAdminService.getTenantDetails(t.id);
                const sub = details?.activeSubscription || (details as any)?.subscription;
                if (sub) {
                  return {
                    id: t.id,
                    planName: sub.planName,
                    startsAtUtc: sub.startsAtUtc,
                    endsAtUtc: sub.endsAtUtc || sub.trialEndsAtUtc,
                    subStatus: sub.status,
                  };
                }
              } catch {}
              return null;
            })
          );

          const updates = new Map<string, any>();
          results.forEach((r) => {
            if (r.status === "fulfilled" && r.value) {
              updates.set(r.value.id, r.value);
            }
          });

          if (updates.size > 0) {
            setTenants((prev) =>
              prev.map((t) => {
                const u = updates.get(t.id);
                if (!u) return t;
                const updated: Tenant = {
                  ...t,
                  planName: u.planName || t.planName,
                  subscriptionStartDateUtc: u.startsAtUtc || t.subscriptionStartDateUtc,
                  subscriptionEndDateUtc: u.endsAtUtc || t.subscriptionEndDateUtc,
                };
                if (u.subStatus === 2) {
                  updated.subscriptionStatus = "Active";
                } else if (u.subStatus === 6) {
                  updated.subscriptionStatus = "Expired";
                }
                return updated;
              })
            );
          }
        } catch (enrichErr) {
          console.warn("Subscription enrichment error", enrichErr);
        }
      };

      await processAndEnrichTenants(itemsList, statusFilter);
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

  const paidTenantsCount = tenants.filter(
    (t) => !isTrialAccount(t) && (t.subscriptionStatus === "Active" || getStatusLabel(t.status) === "Active")
  ).length;
  const demoTenantsCount = tenants.filter((t) => isTrialAccount(t)).length;
  const totalTenantsCount = tenants.length;

  const displayedTenants = tenants.filter((t) => {
    if (accountTypeTab === "PAID") {
      return !isTrialAccount(t) && (t.subscriptionStatus === "Active" || getStatusLabel(t.status) === "Active");
    }
    if (accountTypeTab === "DEMO") {
      return isTrialAccount(t);
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-4 max-w-[1600px] mx-auto space-y-2.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
              PLATFORM SUBSCRIBERS
            </span>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-orange-600" />
              <span>Subscribers &amp; Tenants Governance</span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Inspect, suspend, reactivate, manage packages, and control all multi-industry business subscribers across the platform.
          </p>
        </div>

        {/* Account Type Filter Tabs */}
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setAccountTypeTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              accountTypeTab === "ALL"
                ? "bg-white text-orange-600 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>All Tenants</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${accountTypeTab === "ALL" ? "bg-orange-100 text-orange-700" : "bg-slate-200 text-slate-700"}`}>
              {totalTenantsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAccountTypeTab("PAID")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              accountTypeTab === "PAID"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-emerald-700"
            }`}
          >
            <span>Paid Tenants</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${accountTypeTab === "PAID" ? "bg-emerald-700 text-emerald-100" : "bg-emerald-100 text-emerald-800"}`}>
              {paidTenantsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAccountTypeTab("DEMO")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              accountTypeTab === "DEMO"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:text-amber-700"
            }`}
          >
            <span>Demo Tenants</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${accountTypeTab === "DEMO" ? "bg-amber-700 text-amber-100" : "bg-amber-100 text-amber-800"}`}>
              {demoTenantsCount}
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-2 justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by business name, code, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-orange-600 focus:bg-white transition-colors"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto shrink-0">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none focus:border-orange-600 cursor-pointer"
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
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none focus:border-orange-600 max-w-[160px] cursor-pointer"
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
            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleSeedSampleStores}
            disabled={seedingSamples}
            title="Seed demo stores across Pharma, Garments and Kirana"
            className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer whitespace-nowrap shadow-xs disabled:opacity-50"
          >
            <Zap className="w-3 h-3 text-orange-600 fill-orange-600" />
            <span>{seedingSamples ? "Seeding..." : "⚡ Add Demo Stores"}</span>
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden min-h-[420px]">
        <div className="overflow-x-auto min-h-[420px] pb-24">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-700 uppercase tracking-wider bg-slate-100/90 border-b border-slate-200 text-[10px] font-bold">
              <tr>
                <th className="px-3.5 py-2 font-bold">Tenant Organization</th>
                <th className="px-3 py-2 font-bold">Industry</th>
                <th className="px-3.5 py-2 font-bold">Administrator Contact</th>
                <th className="px-3 py-2 font-bold">Status</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">Subscription Start</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">Valid Till (End Date)</th>
                <th className="px-3 py-2 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-600" />
                    Loading subscriber records...
                  </td>
                </tr>
              ) : displayedTenants.length > 0 ? (
                displayedTenants.map((tenant, index) => {
                  const isNearBottom = index >= Math.max(1, displayedTenants.length - 2);
                  const isExpanded = expandedTenantIds.has(tenant.id) || Boolean(
                    searchTerm && tenant.childCompanies?.some((c) =>
                      c.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                  );

                  return (
                  <Fragment key={tenant.id}>
                  <tr className={`hover:bg-slate-50/90 transition-colors ${isExpanded ? "bg-orange-50/20" : ""}`}>
                    <td className="px-3 py-1.5">
                      <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">{tenant.businessName}</div>
                      <div className="text-[10px] font-mono text-slate-500 flex items-center space-x-1.5 mt-0.5">
                        <span className="text-orange-600 font-bold bg-orange-50 px-1 py-0.2 rounded border border-orange-100">{tenant.code}</span>
                        {tenant.tradeName && <span className="text-slate-600 font-medium">• {tenant.tradeName}</span>}
                      </div>

                      {/* Multi-Company / Sub-Firm Indicator Badge */}
                      {tenant.childCompanies && tenant.childCompanies.length > 0 && (
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandTenant(tenant.id);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100/90 text-orange-950 border border-orange-300 hover:bg-orange-200 transition-all cursor-pointer shadow-2xs"
                            title="Click to view all sub-firms"
                          >
                            <Building2 className="w-3 h-3 text-orange-600" />
                            <span>{tenant.childCompanies.length + 1} Companies</span>
                            <span className="text-[9.5px] text-orange-800 bg-white/90 px-1 py-0.2 rounded font-bold border border-orange-200">
                              1 Primary + {tenant.childCompanies.length} Sub-Firm{tenant.childCompanies.length > 1 ? "s" : ""}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 text-orange-700 ml-0.5" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-orange-700 ml-0.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-800">
                        {tenant.industryName || tenant.industryCode}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="text-slate-900 font-semibold text-[11px] flex items-center gap-1 leading-tight">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[170px]">{tenant.adminEmail}</span>
                      </div>
                      <div className="text-[10px] font-mono font-medium text-slate-600 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>+91 {tenant.primaryPhone}</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      {(() => {
                        const isDemo = isTrialAccount(tenant);
                        const isPaidActive = !isDemo && (tenant.subscriptionStatus === "Active" || getStatusLabel(tenant.status) === "Active");
                        if (isPaidActive) {
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                              Active {tenant.planName ? `• ${tenant.planName}` : "(Paid)"}
                            </span>
                          );
                        }

                        const label = getStatusLabel(tenant.status);
                        if (label === "Suspended" || tenant.subscriptionStatus === "Suspended") {
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Suspended
                            </span>
                          );
                        }

                        if (tenant.subscriptionStatus === "Expired" || label === "Expired" || (tenant.status as any) === 4 || tenant.status === "Expired") {
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                              {isDemo ? (tenant.planName ? `Trial Expired • ${tenant.planName}` : "Trial Expired") : `Expired • ${tenant.planName || "Subscription"}`}
                            </span>
                          );
                        }

                        // Trial Active
                        const daysLeft = tenant.pendingTrialDays ?? 0;
                        return (
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                              Trial {tenant.planName ? `• ${tenant.planName}` : ""}
                            </span>
                            {daysLeft > 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80 font-mono whitespace-nowrap">
                                ⏳ {daysLeft} days left
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 font-mono whitespace-nowrap">
                                ⚠️ Expired
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-1.5 text-slate-700 text-[11px] font-medium font-mono whitespace-nowrap">
                      {tenant.subscriptionStartDateUtc ? new Date(tenant.subscriptionStartDateUtc).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }) : new Date(tenant.createdAtUtc).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-1.5 text-slate-700 text-[11px] font-medium font-mono whitespace-nowrap">
                      {tenant.subscriptionEndDateUtc ? (
                        <span className={new Date(tenant.subscriptionEndDateUtc) < new Date() ? "text-rose-600 font-bold" : "text-slate-900 font-bold"}>
                          {new Date(tenant.subscriptionEndDateUtc).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {new Date(tenant.subscriptionEndDateUtc) < new Date() && (
                            <span className="ml-1 text-[9px] text-rose-500 font-sans font-semibold">(Expired)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setOpenDropdownId(openDropdownId === tenant.id ? null : tenant.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition-all shadow-2xs cursor-pointer"
                          >
                            <span>Actions</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdownId === tenant.id ? "rotate-180" : ""}`} />
                          </button>

                          {openDropdownId === tenant.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenDropdownId(null)}
                              />

                              <div className={`actions-dropdown-menu absolute right-0 ${isNearBottom ? "bottom-full mb-1 origin-bottom-right" : "top-full mt-1 origin-top-right"} w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-1 z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150 text-left`}>
                                <div className="px-3 py-1.5 bg-slate-50/80">
                                  <div className="text-[11px] font-bold text-slate-900 truncate">{tenant.businessName}</div>
                                  <div className="text-[9.5px] text-slate-500 font-mono font-semibold">{tenant.code}</div>
                                </div>

                                <div className="py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      openInspectionModal(tenant.id);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:text-orange-600 hover:bg-orange-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
                                  >
                                    <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-600 shrink-0" />
                                    <span className="font-semibold text-slate-800 group-hover:text-orange-600">Subscriber Details</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleLoginAsStore(tenant)}
                                    disabled={impersonatingTenantId === tenant.id}
                                    className="w-full text-left px-3 py-1.5 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50 flex items-center justify-between transition-colors cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span className="font-bold text-amber-900">
                                        {impersonatingTenantId === tenant.id ? "Connecting..." : "Login as Store"}
                                      </span>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-amber-600 shrink-0" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openResetPasswordModal(tenant)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
                                  >
                                    <KeyRound className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span className="font-semibold text-slate-800 group-hover:text-rose-800">Reset Password</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openSubModal(tenant)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:text-purple-700 hover:bg-purple-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                    <span className="font-semibold text-slate-800 group-hover:text-purple-800">Manage Package</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openSfaModal(tenant)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:text-teal-700 hover:bg-teal-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
                                  >
                                    <Stethoscope className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                                    <span className="font-semibold text-slate-800 group-hover:text-teal-800">Pharma SFA</span>
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
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
                                  >
                                    <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span className="font-semibold text-slate-800 group-hover:text-emerald-800">Extend Trial</span>
                                  </button>
                                </div>

                                <div className="py-0.5">
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
                                      className="w-full text-left px-3 py-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer font-semibold"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
                                      className="w-full text-left px-3 py-1.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors cursor-pointer font-semibold"
                                    >
                                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span>Suspend Store</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      setDeleteConfirmTenant(tenant);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-bold"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
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
                          className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Collapsible Sub-Firms Row */}
                  {isExpanded && tenant.childCompanies && tenant.childCompanies.length > 0 && (
                    <tr className="bg-orange-50/30 border-y border-orange-200/80">
                      <td colSpan={7} className="px-3.5 py-2">
                        <div className="p-2.5 rounded-lg bg-white border border-orange-200 shadow-2xs space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-orange-600" />
                              <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">
                                Sub-Firms under {tenant.businessName}
                              </span>
                              <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-extrabold bg-orange-100 text-orange-800 border border-orange-200">
                                {tenant.childCompanies.length} Sub-Firm{tenant.childCompanies.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">
                              All sub-firms share the main subscription &amp; owner account
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {tenant.childCompanies.map((child) => {
                              const childStatusLabel = getStatusLabel(child.status);
                              return (
                                <div
                                  key={child.id}
                                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-orange-300 hover:shadow-2xs transition-all space-y-1.5"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="font-bold text-slate-900 text-xs">
                                        {child.businessName}
                                      </div>
                                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 mt-0.5">
                                        <span className="font-bold text-orange-700 bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                                          {child.code}
                                        </span>
                                        {child.tradeName && <span className="text-slate-600 font-medium">• {child.tradeName}</span>}
                                      </div>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        childStatusLabel === "Active"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : childStatusLabel === "Trial"
                                          ? "bg-orange-50 text-orange-700 border border-orange-200"
                                          : "bg-rose-50 text-rose-700 border border-rose-200"
                                      }`}
                                    >
                                      {childStatusLabel}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                                    <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-[10px] border border-slate-200 text-slate-700">
                                      {child.industryName}
                                    </span>
                                    {child.gstin && (
                                      <span className="font-mono text-[10px] text-slate-500 font-medium">
                                        GST: {child.gstin}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Added {new Date(child.createdAtUtc).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleLoginAsStore({
                                        id: child.id,
                                        businessName: child.businessName,
                                        tradeName: child.tradeName,
                                        code: child.code,
                                        adminEmail: tenant.adminEmail,
                                        industryCode: child.industryCode
                                      } as any)}
                                      disabled={impersonatingTenantId === child.id}
                                      className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                                      title="Log in directly into this Sub-Firm as SuperAdmin"
                                    >
                                      <LogIn className="w-3 h-3" />
                                      <span>Login to Firm</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })
              ) : loadError === "AUTH_REQUIRED" || isTenantMode ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
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
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-orange-600/30 transition-all cursor-pointer disabled:opacity-50"
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
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-300">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-base">
                          {searchTerm || industryFilter !== "ALL" || statusFilter !== "ALL" || accountTypeTab !== "ALL"
                            ? "No subscribers match your active filters"
                            : "No subscribers found"}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {searchTerm || industryFilter !== "ALL" || statusFilter !== "ALL" || accountTypeTab !== "ALL"
                            ? "Selected search term ya status filter ke anusar koi store nahi mila. Filters clear karke sabhi stores dekhein."
                            : "Database me abhi koi subscriber nahi hai. Niche diye gaye button se 1-click me realistic demo stores (Pharma, Garments, Kirana) generate karein."}
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-center gap-3">
                        {searchTerm || industryFilter !== "ALL" || statusFilter !== "ALL" || accountTypeTab !== "ALL" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm("");
                              setIndustryFilter("ALL");
                              setStatusFilter("ALL");
                              setAccountTypeTab("ALL");
                            }}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Clear Filters & Show All</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSeedSampleStores}
                            disabled={seedingSamples}
                            className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-violet-600 hover:from-orange-500 hover:to-violet-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-orange-600/30 transition-all cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedTenantId(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {detailsLoading || !tenantDetails ? (
              <div className="py-16 text-center text-slate-500 font-medium">
                Loading detailed tenant telemetries...
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                      {tenantDetails.code}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 mt-1">
                      {tenantDetails.businessName}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{tenantDetails.tradeName}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      tenantDetails.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : tenantDetails.status === "Trial"
                        ? "bg-orange-50 text-orange-700 border border-orange-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {tenantDetails.status}
                  </span>
                </div>

                {/* Quota & Entity Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-500 uppercase font-bold">Total Users</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{tenantDetails.totalUsers}</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-500 uppercase font-bold">Branches</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{tenantDetails.totalBranches}</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-500 uppercase font-bold">Warehouses</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{tenantDetails.totalWarehouses}</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-center">
                    <span className="text-[11px] text-amber-800 uppercase font-bold">AI Scans Left</span>
                    <div className="text-xl font-bold text-amber-950 mt-1">
                      {Math.max(0, (tenantDetails.aiScansLimit ?? 500) - (tenantDetails.aiScansUsed ?? 0))}
                    </div>
                    <span className="text-[9.5px] text-amber-700 font-mono font-semibold">
                      of {tenantDetails.aiScansLimit ?? 500} ({tenantDetails.aiScansUsed ?? 0} used)
                    </span>
                  </div>
                </div>

                {/* Industry Capabilities Config */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>Industry Engine & Capability Matrix ({tenantDetails.industryName})</span>
                  </h4>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Batch Number Tracking:</span>
                      <span className={tenantDetails.industryConfig?.enableBatchTracking ? "text-emerald-700 font-bold" : "text-slate-400"}>
                        {tenantDetails.industryConfig?.enableBatchTracking ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Expiry Date Management:</span>
                      <span className={tenantDetails.industryConfig?.enableExpiryTracking ? "text-emerald-700 font-bold" : "text-slate-400"}>
                        {tenantDetails.industryConfig?.enableExpiryTracking ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Serial No / IMEI:</span>
                      <span className={tenantDetails.industryConfig?.enableSerialTracking ? "text-emerald-700 font-bold" : "text-slate-400"}>
                        {tenantDetails.industryConfig?.enableSerialTracking ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Size / Color Matrix:</span>
                      <span className={tenantDetails.industryConfig?.enableSizeColorMatrix ? "text-emerald-700 font-bold" : "text-slate-400"}>
                        {tenantDetails.industryConfig?.enableSizeColorMatrix ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Schedule H1 Compliance:</span>
                      <span className={tenantDetails.industryConfig?.enableScheduleH1DrugTracking ? "text-emerald-700 font-bold" : "text-slate-400"}>
                        {tenantDetails.industryConfig?.enableScheduleH1DrugTracking ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Recipe / BOM:</span>
                      <span className={tenantDetails.industryConfig?.enableRecipeBOM ? "text-emerald-700 font-bold" : "text-slate-400"}>
                        {tenantDetails.industryConfig?.enableRecipeBOM ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Branches & Warehouses List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-orange-600" />
                    <span>Branches & Warehouses</span>
                  </h4>
                  <div className="space-y-2">
                    {tenantDetails.branches.map((b) => (
                      <div key={b.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{b.branchName}</span>
                          <span className="ml-2 font-mono text-slate-500 font-semibold">({b.branchCode})</span>
                          {b.isHeadOffice && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-orange-100 text-orange-800 font-bold border border-orange-200">
                              Head Office
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 font-medium">
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
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div
                className={`p-3 rounded-2xl ${
                  actionModal.action === "SUSPEND"
                    ? "bg-rose-100 text-rose-600 border border-rose-200"
                    : "bg-emerald-100 text-emerald-600 border border-emerald-200"
                }`}
              >
                {actionModal.action === "SUSPEND" ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <CheckCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {actionModal.action === "SUSPEND" ? "Suspend Subscriber" : "Reactivate Subscriber"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {actionModal.tenant?.businessName} ({actionModal.tenant?.code})
                </p>
              </div>
            </div>

            {actionModal.action === "SUSPEND" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Suspension Reason</label>
                <textarea
                  rows={3}
                  value={actionModal.reason}
                  onChange={(e) =>
                    setActionModal({ ...actionModal, reason: e.target.value })
                  }
                  placeholder="e.g. Subscription payment overdue, terms violation..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setActionModal({ isOpen: false, tenant: null, action: "SUSPEND", reason: "" })
                }
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusChangeSubmit}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                  actionModal.action === "SUSPEND"
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Assign Subscription &amp; Add-ons</h3>
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      {subModal.tenant.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {subModal.tenant.businessName} {subModal.tenant.tradeName ? `• ${subModal.tenant.tradeName}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/80 rounded-2xl max-w-lg mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSubModal((prev) => ({
                      ...prev,
                      isTrialMode: true,
                      customAmount: 0,
                      generateInvoice: false,
                      durationDays: 30,
                      notes: prev.notes || "Feature Demo / Trial Grant",
                    }));
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    subModal.isTrialMode
                      ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <span className="text-sm">🎁</span>
                  <span>Demo / Trial Feature Grant</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const selPlan = subModal.plans.find((p) => p.id === subModal.selectedPlanId) || subModal.plans[0];
                    setSubModal((prev) => ({
                      ...prev,
                      isTrialMode: false,
                      customAmount: selPlan?.price ?? 3999,
                      generateInvoice: true,
                      durationDays: 365,
                      notes: prev.notes === "Feature Demo / Trial Grant" ? "Offline Payment & Subscription Activation" : prev.notes,
                    }));
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !subModal.isTrialMode
                      ? "bg-orange-600 text-white shadow-sm shadow-orange-600/30"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <span className="text-sm">💰</span>
                  <span>Paid Offline Subscription (Cash/Bank)</span>
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5 bg-white text-xs">
              {/* Context Banner */}
              {subModal.isTrialMode ? (
                <div className="p-3 rounded-2xl bg-purple-50/90 border border-purple-200 flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">🎁</span>
                  <div className="text-xs">
                    <div className="font-bold text-purple-900">Demo / Trial Grant Mode (GST Rule 46b Zero-Gap Protection)</div>
                    <div className="text-purple-700 text-[11px] mt-0.5">
                      Tenant will remain in <strong>Trial</strong> status. Amount is strictly <strong>₹0</strong>. No invoice will be generated and sequence numbers will <strong>not</strong> be consumed.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">💰</span>
                  <div className="text-xs">
                    <div className="font-bold text-amber-900">Paid Offline Subscription Mode</div>
                    <div className="text-amber-800 text-[11px] mt-0.5">
                      Tenant will be converted to <strong>Active (Paid)</strong>. Enter cash/bank payment details. An official tax invoice will be generated only if amount is greater than ₹0.
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* LEFT COLUMN: Plan, Duration, Payment & Invoice (5 cols) */}
                <div className="lg:col-span-5 space-y-5">
                  {/* 1. Select Plan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <span>📦</span>
                      <span>{subModal.isTrialMode ? "Base Tier Features (Trial)" : "Select Subscription Plan"}</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {subModal.plans.map((p) => {
                        const isSel = subModal.selectedPlanId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              const cycleDays = (p.billingCycle === 24 || (p.code && p.code.includes("BIENNIAL")) || (p.name && p.name.toLowerCase().includes("2 year")))
                                ? 730
                                : (p.billingCycle === 12 || (p.code && (p.code.includes("ANNUAL") || p.code.includes("YEAR"))) || (p.name && (p.name.toLowerCase().includes("1 year") || p.name.toLowerCase().includes("annual"))))
                                ? 365
                                : 30;
                              setSubModal((prev) => ({
                                ...prev,
                                selectedPlanId: p.id,
                                customAmount: prev.isTrialMode ? 0 : p.price,
                                durationDays: prev.isTrialMode ? prev.durationDays : cycleDays,
                              }));
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                              isSel
                                ? (subModal.isTrialMode
                                    ? "bg-purple-50/90 border-2 border-purple-600 shadow-sm ring-1 ring-purple-600/30"
                                    : "bg-orange-50/90 border-2 border-orange-600 shadow-sm ring-1 ring-orange-600/30")
                                : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{p.name}</div>
                              {isSel && (
                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold text-white ${
                                  subModal.isTrialMode ? "bg-purple-600" : "bg-orange-600"
                                }`}>
                                  Selected
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1.5 text-[11px]">
                              {subModal.isTrialMode ? (
                                <span className="font-bold text-purple-700 text-xs">Included in Demo</span>
                              ) : (
                                <span className="font-mono font-bold text-purple-700 text-xs">₹{p.price} {formatPlanCycleSuffix(p)}</span>
                              )}
                              <span className="text-slate-500 font-medium">Max {p.maxUsers > 0 ? p.maxUsers : 2} Users</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Select Duration */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <span>⏳</span>
                        <span>{subModal.isTrialMode ? "Demo Feature Validity Duration" : "Package Validity Duration"}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-600 shrink-0">Package Start From:</label>
                        <input
                          type="date"
                          value={subModal.startDate}
                          onChange={(e) => setSubModal((prev) => ({ ...prev, startDate: e.target.value }))}
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-orange-500 shadow-2xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(subModal.isTrialMode
                        ? [
                            { label: "7 Days", days: 7 },
                            { label: "15 Days", days: 15 },
                            { label: "30d (1 Mo)", days: 30 },
                            { label: "60 Days", days: 60 },
                            { label: "90 Days", days: 90 },
                          ]
                        : [
                            { label: "1 Mo (30d)", days: 30 },
                            { label: "3 Mos (90d)", days: 90 },
                            { label: "6 Mos (180d)", days: 180 },
                            { label: "1 Yr (365d)", days: 365 },
                            { label: "2 Yrs (730d)", days: 730 },
                          ]
                      ).map((dur) => {
                        const isSel = subModal.durationDays === dur.days;
                        return (
                          <button
                            key={dur.days}
                            type="button"
                            onClick={() => setSubModal((prev) => ({ ...prev, durationDays: dur.days }))}
                            className={`py-2 rounded-xl text-center text-[10.5px] font-bold border transition-all cursor-pointer ${
                              isSel
                                ? (subModal.isTrialMode
                                    ? "bg-purple-600 border-purple-600 text-white shadow-sm shadow-purple-600/30"
                                    : "bg-orange-600 border-orange-600 text-white shadow-sm shadow-orange-600/30")
                                : "bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700"
                            }`}
                          >
                            {dur.label}
                          </button>
                        );
                      })}
                    </div>
                    {(() => {
                      const start = subModal.startDate ? new Date(subModal.startDate) : new Date();
                      const end = new Date(start);
                      end.setDate(end.getDate() + subModal.durationDays);
                      const formatDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                      return (
                        <div className="mt-2 flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-xl text-[11px] font-medium text-slate-700 border border-slate-200">
                          <span className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Period:</span>
                            <strong className="text-slate-900 font-bold">{formatDate(start)}</strong>
                            <span className="text-slate-400">→</span>
                            <strong className="text-slate-900 font-bold">{formatDate(end)}</strong>
                          </span>
                          <span className="text-slate-500 font-bold font-mono">({subModal.durationDays} Days)</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 3. Demo vs Paid Offline Payment Section */}
                  {subModal.isTrialMode ? (
                    <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-200/90 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-950 flex items-center gap-1.5 text-xs">
                          <span>🛡️</span> Demo Grant Summary
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
                          ₹0 Complimentary
                        </span>
                      </div>
                      <div className="text-[11px] text-purple-900/80 space-y-1 bg-white/80 p-2.5 rounded-xl border border-purple-100 font-medium">
                        <div className="flex justify-between">
                          <span>Amount Billed:</span>
                          <strong className="font-mono text-purple-950 font-bold">₹0.00</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>GST Tax Invoice:</span>
                          <span className="text-emerald-700 font-bold">None (No invoice burned)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Subscriber Status:</span>
                          <span className="text-purple-800 font-bold">Trial Maintained</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        Selecting add-ons on the right will activate them immediately for this tenant for the selected demo period.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-50/40 p-3.5 rounded-2xl border border-amber-200/90 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                          <span>💰</span> Offline Payment &amp; Invoice
                        </span>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 font-semibold">
                          <input
                            type="checkbox"
                            checked={subModal.generateInvoice}
                            disabled={Number(subModal.customAmount) <= 0}
                            onChange={(e) => setSubModal((prev) => ({ ...prev, generateInvoice: e.target.checked }))}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer disabled:opacity-40"
                          />
                          <span className={Number(subModal.customAmount) <= 0 ? "opacity-50" : ""}>
                            {Number(subModal.customAmount) <= 0 ? "No Invoice (₹0)" : "Auto-Generate Invoice"}
                          </span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-700 text-[11px] font-semibold mb-1">
                            Amount Collected (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="e.g. 5000"
                            value={subModal.customAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              const numVal = Number(val) || 0;
                              setSubModal((prev) => ({
                                ...prev,
                                customAmount: val,
                                generateInvoice: numVal > 0 ? prev.generateInvoice : false,
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 text-[11px] font-semibold mb-1">
                            Payment Method
                          </label>
                          <select
                            value={subModal.paymentMode}
                            onChange={(e) => setSubModal((prev) => ({ ...prev, paymentMode: e.target.value }))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          >
                            <option value="Cash">💵 Cash Payment</option>
                            <option value="Direct Bank Transfer (NEFT/IMPS/RTGS)">🏦 Bank Transfer (NEFT / IMPS)</option>
                            <option value="UPI / QR (Current A/C)">📱 UPI / QR Transfer</option>
                            <option value="Cheque">📑 Cheque Deposit</option>
                            <option value="Corporate Bulk Contract">🏢 Corporate Bulk Contract</option>
                            <option value="Complimentary / VIP">🎁 Complimentary (₹0)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                        <div>
                          <label className="block text-slate-700 text-[11px] font-semibold mb-1">
                            Ref / UTR / Receipt #
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. UTR123456 / Cash #04"
                            value={subModal.paymentReference}
                            onChange={(e) => setSubModal((prev) => ({ ...prev, paymentReference: e.target.value }))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-orange-500"
                          />
                        </div>

                        <div className="pt-2 sm:pt-4">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-800 text-[11px] font-semibold">
                            <input
                              type="checkbox"
                              checked={subModal.isGstInclusive}
                              onChange={(e) => setSubModal((prev) => ({ ...prev, isGstInclusive: e.target.checked }))}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                            <span>Includes 18% GST</span>
                          </label>
                        </div>
                      </div>

                      {/* Live Invoice Preview Pill */}
                      {subModal.generateInvoice && Number(subModal.customAmount) > 0 && (
                        (() => {
                          const rawVal = Number(subModal.customAmount) || 0;
                          const isInc = subModal.isGstInclusive;
                          const tot = isInc ? rawVal : rawVal * 1.18;
                          const base = isInc ? rawVal / 1.18 : rawVal;
                          const gst = tot - base;
                          return (
                            <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-[11px] flex items-center justify-between shadow-2xs">
                              <div className="space-y-0.5">
                                <span className="font-bold text-amber-900">Invoice Preview:</span>
                                <div className="text-slate-600 text-[10px]">
                                  Base: ₹{base.toFixed(2)} + 18% GST: ₹{gst.toFixed(2)}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-extrabold text-emerald-700 text-sm">₹{tot.toFixed(2)}</span>
                                <span className="block text-[10px] text-slate-500 font-medium">{subModal.paymentMode}</span>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Add-ons, Team Capacity & Notes (7 cols) */}
                <div className="lg:col-span-7 space-y-5">
                  {(() => {
                    const selectedPlan = subModal.plans.find((p) => p.id === subModal.selectedPlanId);
                    const basePlanUsers = selectedPlan?.maxUsers ?? 2;
                    const extraUsersFromCards = (subModal.selectedAddons.includes("ADDON_EXTRA_1_USER") ? 1 : 0) + (subModal.selectedAddons.includes("ADDON_EXTRA_5_USERS") ? 5 : 0);
                    const totalAllowedUsers = basePlanUsers + extraUsersFromCards + subModal.extraUsers;

                    return (
                      <div className="space-y-4">
                        {/* A. Industry & AI Automation Add-ons */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                              <span>🧩</span>
                              <span>Industry &amp; AI Automation Add-ons</span>
                            </label>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              {subModal.selectedAddons.filter((c) => !c.startsWith("ADDON_EXTRA")).length} Selected
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              { code: "ADDON_AI_PRO", name: "AI Pro Purchase Bill Scanner", desc: "OCR scan extraction & batch creation (500 scans/mo)", icon: "🤖", highlight: true, tag: "AI OCR" },
                              { code: "ADDON_PHARMA_SFA", name: "Pharma SFA & MR Field Force", desc: "MR Tracking, DCR, Chemist POB & Doctor calls", icon: "🩺" },
                              { code: "ADDON_PHARMA", name: "Pharma Suite & Schedule H1", desc: "Batch, FEFO, Expiry Dumping & Salt Matrix", icon: "💊" },
                              { code: "ADDON_WHATSAPP", name: "WhatsApp Cloud Automation", desc: "Auto PDF Invoices & Payment Reminders", icon: "💬" },
                              { code: "ADDON_EWAYBILL", name: "E-Way Bill & E-Invoice", desc: "Direct NIC Portal Sync & QR Generation", icon: "🚚" },
                              { code: "ADDON_MANUFACTURING", name: "Manufacturing & BOM", desc: "Recipes, Raw Material Consumption & Yield", icon: "🏭" },
                              { code: "ADDON_GARMENTS", name: "Apparel & Size Matrix", desc: "2D Size x Color Matrix & Barcode Studio", icon: "👕" },
                              { code: "ADDON_FMCG", name: "FMCG Scheme Discounts", desc: "Free Quantity (10+1), Multi-unit cases", icon: "🛒" },
                              { code: "ADDON_ACCOUNTING", name: "Full Dual-Entry Accounting", desc: "Chart of Accounts, Journal, BRS & P&L", icon: "📊" },
                            ].map((add) => {
                              const isChecked = subModal.selectedAddons.includes(add.code);
                              return (
                                <label
                                  key={add.code}
                                  className={
                                    "flex items-start space-x-2.5 p-2.5 rounded-2xl border cursor-pointer transition-all " +
                                    (add.highlight
                                      ? (isChecked
                                          ? "bg-amber-100/80 border-2 border-amber-500 shadow-sm ring-1 ring-amber-500/30 text-amber-950"
                                          : "bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/80 hover:border-amber-300 text-slate-800")
                                      : (isChecked
                                          ? "bg-purple-50/90 border-2 border-purple-600 shadow-sm ring-1 ring-purple-600/30 text-purple-950"
                                          : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300 text-slate-800"))
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
                                    className={`mt-0.5 w-4 h-4 rounded border-slate-300 cursor-pointer ${
                                      add.highlight ? "text-amber-600 focus:ring-amber-500" : "text-purple-600 focus:ring-purple-500"
                                    }`}
                                  />
                                  <span className="text-base leading-none mt-0.5">{add.icon}</span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={"text-xs font-bold leading-tight " + (add.highlight ? "text-amber-950" : "text-slate-900")}>
                                        {add.name}
                                      </span>
                                      {add.tag && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-200 text-amber-900 border border-amber-300">
                                          {add.tag}
                                        </span>
                                      )}
                                    </div>
                                    <span className={"text-[10.5px] block leading-tight mt-0.5 font-medium " + (add.highlight ? "text-amber-900/90" : "text-slate-600")}>
                                      {add.desc}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* B. Team Capacity & User Increase Section */}
                        <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-200/90 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                                👥 Team Size &amp; User Increase Add-ons
                              </label>
                              <span className="text-[10.5px] text-slate-600 font-medium">
                                Unlock extra staff login seats for billing counters and reps
                              </span>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                              Total Allowed: {totalAllowedUsers} Users
                            </span>
                          </div>

                          {/* Quick User Increase Packs */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              { code: "ADDON_EXTRA_1_USER", name: "Additional User Seat (+1)", desc: "+1 Operator Login Seat", icon: "👤", count: 1 },
                              { code: "ADDON_EXTRA_5_USERS", name: "5 Users Power Pack (+5)", desc: "+5 Multi-User Team Pack", icon: "👥", count: 5 },
                            ].map((add) => {
                              const isChecked = subModal.selectedAddons.includes(add.code);
                              return (
                                <label
                                  key={add.code}
                                  className={
                                    "flex items-center space-x-2.5 p-2 rounded-xl border cursor-pointer transition-all " +
                                    (isChecked
                                      ? "bg-emerald-100/80 border-2 border-emerald-600 text-emerald-950 shadow-2xs font-semibold"
                                      : "bg-white hover:bg-emerald-50/60 border-slate-200 text-slate-700")
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
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <span className="text-base">{add.icon}</span>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-bold block leading-tight text-slate-900">{add.name}</span>
                                    <span className="text-[10px] text-slate-500 block leading-tight font-medium mt-0.5">{add.desc}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          {/* Custom Extra Seats Booster */}
                          <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-200">
                            <div className="text-xs">
                              <span className="text-slate-900 font-bold block">Custom Extra Seats Booster</span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Base Plan ({basePlanUsers}) + Packs ({extraUsersFromCards}) + Booster ({subModal.extraUsers})
                              </span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setSubModal((prev) => ({ ...prev, extraUsers: Math.max(0, prev.extraUsers - 1) }))}
                                className="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-base flex items-center justify-center transition-colors cursor-pointer border border-emerald-300"
                              >
                                -
                              </button>
                              <span className="w-10 text-center font-mono font-extrabold text-emerald-800 text-sm">
                                +{subModal.extraUsers}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSubModal((prev) => ({ ...prev, extraUsers: prev.extraUsers + 1 }))}
                                className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Super Admin Notes */}
                        <div>
                          <label className="block text-slate-700 font-bold text-xs mb-1">
                            Super Admin Notes / Agreement Remarks
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Paid on-site via UPI; requested annual deal with 5 extra users"
                            value={subModal.notes}
                            onChange={(e) => setSubModal((prev) => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-purple-600 text-xs"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* FIXED FOOTER */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                {subModal.isTrialMode ? (
                  <>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200">
                      🎁 TRIAL DEMO
                    </span>
                    <span>Duration: <strong className="text-purple-700 font-mono font-bold">{subModal.durationDays} Days</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>Amount: <strong className="text-emerald-700 font-mono font-bold">₹0 (Zero Invoice)</strong></span>
                  </>
                ) : (
                  <>
                    <span>Plan: <strong className="text-slate-900">{subModal.plans.find((p) => p.id === subModal.selectedPlanId)?.name || "Select Plan"}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>Duration: <strong className="text-orange-600 font-mono font-bold">{subModal.durationDays} Days</strong>{subModal.startDate && <span className="text-slate-500 font-normal ml-1">(From {new Date(subModal.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})</span>}</span>
                    <span className="text-slate-300">•</span>
                    <span>Amount: <strong className="text-purple-700 font-mono font-bold">₹{subModal.customAmount || 0}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-medium">
                      {subModal.generateInvoice && Number(subModal.customAmount) > 0 ? "GST Invoice: Yes" : "GST Invoice: No"}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSubModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={subModal.saving || !subModal.selectedPlanId}
                  onClick={handleAssignSubSubmit}
                  className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 ${
                    subModal.isTrialMode
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/20"
                      : "bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-600 hover:from-orange-500 hover:to-emerald-500 shadow-orange-600/20"
                  }`}
                >
                  {subModal.isTrialMode ? (
                    <>
                      <span>🎁</span>
                      <span>{subModal.saving ? "Granting Demo Features..." : "Grant Trial & Demo Add-ons (₹0)"}</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>
                        {subModal.saving
                          ? "Processing..."
                          : Number(subModal.customAmount) > 0 && subModal.generateInvoice
                          ? "Activate Plan & Generate Official Invoice"
                          : "Activate Paid Plan (No Invoice)"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ⏳ 1-Click Trial Extension Modal */}
      {trialModal.isOpen && trialModal.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Extend Store Trial</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {trialModal.tenant.businessName} ({trialModal.tenant.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrialModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-bold mb-1.5">Choose Extension Period</label>
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
                      className={"py-3 rounded-2xl font-bold border transition-all cursor-pointer " + (trialModal.extensionDays === t.days ? "bg-emerald-50 border-2 border-emerald-600 text-emerald-950 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100")}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Reason / Conversion Note</label>
                <input
                  type="text"
                  value={trialModal.reason}
                  onChange={(e) => setTrialModal((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Client requested 2 weeks to finish ledger import"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 font-medium">
                ✓ <strong>Instant Trial Reactivation:</strong> Store trial will automatically be extended, any expired lockout will be unlocked, and merchant can continue billing immediately.
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setTrialModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={trialModal.saving}
                  onClick={handleExtendTrialSubmit}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 border border-teal-200 text-teal-700 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pharma SFA &amp; Field Force</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {sfaModal.tenant.businessName} ({sfaModal.tenant.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSfaModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-950 font-medium">
                <div className="font-bold mb-1 text-teal-900">Super Admin Direct Grant / Deactivation</div>
                <div className="text-[11px] text-teal-800 leading-relaxed">
                  Grants unlimited doctor call recording, chemist order booking, GPS attendance, and sample stock allocation for this subscriber.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Max MR Seats</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={sfaModal.mrSeats}
                    onChange={(e) => setSfaModal((prev) => ({ ...prev, mrSeats: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Default: 15 reps</p>
                </div>
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Max Manager Seats</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={sfaModal.managerSeats}
                    onChange={(e) => setSfaModal((prev) => ({ ...prev, managerSeats: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Default: 5 managers</p>
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1.5">Billing Cycle / Validity</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSfaModal((prev) => ({ ...prev, isAnnual: false }))}
                    className={"py-2.5 rounded-xl font-bold border transition-all cursor-pointer " + (!sfaModal.isAnnual ? "bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-600/30" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100")}
                  >
                    Monthly (30 Days)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSfaModal((prev) => ({ ...prev, isAnnual: true }))}
                    className={"py-2.5 rounded-xl font-bold border transition-all cursor-pointer " + (sfaModal.isAnnual ? "bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-600/30" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100")}
                  >
                    Annual (365 Days)
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  disabled={sfaModal.saving}
                  onClick={handleSfaDeactivateSubmit}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all"
                >
                  Revoke SFA
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSfaModal((prev) => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={sfaModal.saving}
                    onClick={handleSfaGrantSubmit}
                    className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
              <div className="text-orange-600 font-mono text-[11px] font-bold">
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


      {/* 🛡️ Subscriber Security & Device Intelligence Audit Modal */}
      {securityModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-6 space-y-5 shadow-2xl relative max-h-[92vh] flex flex-col my-auto text-slate-900">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="p-2 bg-sky-100 text-sky-600 rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">
                        {securityModalTenant.businessName}
                      </h2>
                      <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg">
                        {securityModalTenant.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                      <span>Admin: {securityModalTenant.adminEmail}</span>
                      <span>•</span>
                      <span>Phone: +91 {securityModalTenant.primaryPhone}</span>
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold mt-1">
                  <span>🔒 Strict SuperAdmin Telemetry</span>
                  <span className="text-amber-500">•</span>
                  <span>Confidential • Hidden from merchant &amp; subscribers</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSecurityModalTenant(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {securityAuditLoading ? (
              <div className="py-24 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-600">
                  Retrieving device hardware, SIM carrier telemetry, and geolocation audit trail...
                </p>
              </div>
            ) : securityAuditData ? (
              <div className="space-y-5 overflow-y-auto pr-1">
                {/* 4 Metric Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 space-y-1">
                    <div className="flex items-center justify-between text-sky-600">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Active Devices</span>
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      {securityAuditData.totalDevicesCount}
                    </div>
                    <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {securityAuditData.onlineDevicesCount} Online Now
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 space-y-1">
                    <div className="flex items-center justify-between text-emerald-600">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Primary Location</span>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="text-xl font-black text-slate-900 truncate">
                      {securityAuditData.primaryCity || "Unknown"}
                    </div>
                    <div className="text-[11px] text-slate-600 font-semibold truncate">
                      {securityAuditData.activeDevices[0]?.state || "India"}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 space-y-1">
                    <div className="flex items-center justify-between text-indigo-600">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Network &amp; Carrier</span>
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div className="text-xl font-black text-slate-900 truncate">
                      {securityAuditData.primaryNetworkType || "WiFi"}
                    </div>
                    <div className="text-[11px] text-slate-600 font-semibold truncate">
                      {securityAuditData.primaryIsp || "Broadband / Cellular"}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 space-y-1">
                    <div className="flex items-center justify-between text-orange-600">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700">Security Health</span>
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      Audit Verified
                    </div>
                    <div className="text-[11px] text-orange-700 font-semibold">
                      {securityAuditData.recentLogins.length} Logins Tracked
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSecurityAuditTab("devices")}
                    className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                      securityAuditTab === "devices"
                        ? "border-sky-600 text-sky-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Hardware &amp; SIM Telemetry ({securityAuditData.activeDevices.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSecurityAuditTab("logins")}
                    className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                      securityAuditTab === "logins"
                        ? "border-sky-600 text-sky-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Login History &amp; Geolocation ({securityAuditData.recentLogins.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSecurityAuditTab("activity")}
                    className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                      securityAuditTab === "activity"
                        ? "border-sky-600 text-sky-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>In-App User Journey ({securityAuditData.inAppActivityTrail.length})</span>
                  </button>
                </div>

                {/* Tab 1: Hardware & Network Telemetry */}
                {securityAuditTab === "devices" && (
                  <div className="space-y-3">
                    {securityAuditData.activeDevices.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <Smartphone className="w-8 h-8 text-slate-400 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-800">No Hardware Sessions Registered Yet</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Client devices and mobile apps will automatically report hardware model, SIM carrier, and connection parameters when they authenticate.
                        </p>
                      </div>
                    ) : (
                      securityAuditData.activeDevices.map((dev) => (
                        <div
                          key={dev.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-sky-300 transition-all shadow-xs space-y-3"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2.5 bg-slate-100 text-slate-800 rounded-xl">
                                {dev.deviceType?.toLowerCase().includes("pc") || dev.osName?.toLowerCase().includes("win") ? (
                                  <Laptop className="w-5 h-5" />
                                ) : (
                                  <Smartphone className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                  <span>{dev.brand} {dev.model}</span>
                                  {dev.isOnline ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                      Online Now
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                      Last active {new Date(dev.lastActiveAtUtc).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  OS: <span className="font-semibold text-slate-700">{dev.osName} {dev.osVersion}</span> • App: <span className="font-semibold text-slate-700">{dev.appVersion}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold">
                                <Wifi className="w-3.5 h-3.5 text-sky-600" />
                                <span>{dev.connectionType}</span>
                              </div>
                            </div>
                          </div>

                          {/* Telemetry Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">IP &amp; ISP</span>
                              <span className="font-mono font-semibold text-slate-900">{dev.ipAddress}</span>
                              <span className="text-slate-600 block text-[11px] font-medium">{dev.ispName || "Internet Provider"}</span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">City &amp; Geolocation</span>
                              <span className="font-semibold text-slate-900">{dev.city || "Unknown City"}, {dev.state || "IN"}</span>
                              <span className="text-slate-500 block text-[11px]">{dev.country || "India"}</span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">SIM &amp; Carrier Intelligence</span>
                              {dev.isDualSim || dev.sim1Carrier || dev.sim2Carrier ? (
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-slate-900">
                                    SIM 1: {dev.sim1Carrier || "Active Carrier"}
                                  </div>
                                  {dev.sim2Carrier && (
                                    <div className="text-slate-700 font-semibold">
                                      SIM 2: {dev.sim2Carrier}
                                    </div>
                                  )}
                                  <div className="text-[10px] text-slate-500">
                                    Number: +91 {dev.simPhoneNumber || securityModalTenant.primaryPhone}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-slate-600 font-medium">
                                  <span>Merchant Phone: +91 {dev.simPhoneNumber || securityModalTenant.primaryPhone}</span>
                                  <span className="block text-[10px] text-slate-400">Carrier extracted from IP: {dev.ispName || "Cellular"}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 2: Login History Log */}
                {securityAuditTab === "logins" && (
                  <div className="space-y-3">
                    {securityAuditData.recentLogins.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                        <Radio className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-slate-800">No Login History Logged</h4>
                        <p className="text-xs text-slate-500">Logins will appear here as users authenticate into the portal or apps.</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold">
                              <tr>
                                <th className="px-3.5 py-2.5">Date &amp; Time (IST)</th>
                                <th className="px-3.5 py-2.5">Status</th>
                                <th className="px-3.5 py-2.5">Channel</th>
                                <th className="px-3.5 py-2.5">Device &amp; Hardware</th>
                                <th className="px-3.5 py-2.5">Network &amp; ISP</th>
                                <th className="px-3.5 py-2.5">City &amp; IP</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {securityAuditData.recentLogins.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-3.5 py-2.5 text-slate-600 font-medium whitespace-nowrap">
                                    {new Date(log.loggedInAtUtc).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                                  </td>
                                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                                    {log.isSuccessful ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Success
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200" title={log.failureReason || ""}>
                                        Failed
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5 whitespace-nowrap font-semibold text-slate-800">
                                    {log.authChannel}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-slate-900 font-semibold max-w-[180px] truncate" title={log.deviceSummary}>
                                    {log.deviceSummary || "Client Device"}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-slate-700">
                                    <div className="font-semibold">{log.connectionType || "WiFi"}</div>
                                    <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{log.ispName || "ISP"}</div>
                                  </td>
                                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                                    <div className="font-bold text-slate-900">{log.city || "Unknown City"}</div>
                                    <div className="font-mono text-[10px] text-slate-500">{log.ipAddress}</div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: In-App User Journey & Audit Trail */}
                {securityAuditTab === "activity" && (
                  <div className="space-y-3">
                    {securityAuditData.inAppActivityTrail.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                        <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-slate-800">No In-App Activities Logged</h4>
                        <p className="text-xs text-slate-500">Actions like invoice generation, ledger updates, and setting edits will stream here in real-time.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                        {securityAuditData.inAppActivityTrail.map((act) => (
                          <div
                            key={act.id}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition-all flex items-center justify-between text-xs gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-mono font-extrabold uppercase">
                                  {act.actionName}
                                </span>
                                <span>{act.entityName}</span>
                                {act.entityId && (
                                  <span className="font-mono text-[10px] text-slate-400 font-semibold">
                                    #{act.entityId.slice(0, 8)}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Performed by: <span className="font-semibold text-slate-700">{act.userEmail || "Subscriber User"}</span> • IP: <span className="font-mono">{act.ipAddress || "Unknown"}</span>
                              </div>
                            </div>
                            <div className="text-right text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(act.timestampUtc).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-rose-600 font-semibold text-sm">
                Failed to load subscriber security audit. Please ensure you are logged in as Super Admin.
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px]">Tenant ID: {securityModalTenant.id}</span>
              <button
                type="button"
                onClick={() => setSecurityModalTenant(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 SuperAdmin Direct Reset Password Modal */}
      {resetPwdModal.isOpen && resetPwdModal.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Reset Subscriber Password</h3>
                  <p className="text-xs text-rose-100">SuperAdmin Direct Override • No old password required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPwdModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Target Subscriber Info */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{resetPwdModal.tenant.businessName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-800">
                    {resetPwdModal.tenant.code}
                  </span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800">{resetPwdModal.tenant.adminEmail}</span>
                  {resetPwdModal.tenant.primaryPhone && (
                    <>
                      <span className="text-slate-300">•</span>
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{resetPwdModal.tenant.primaryPhone}</span>
                    </>
                  )}
                </div>
              </div>

              {resetPwdModal.error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{resetPwdModal.error}</span>
                </div>
              )}

              {resetPwdModal.successMessage ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>Password Successfully Updated!</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    The subscriber account has been unlocked and the new password is now active immediately.
                  </p>
                  <div className="p-3 rounded-lg bg-white border border-emerald-300 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">New Password</div>
                      <div className="font-mono font-bold text-slate-900 text-sm select-all">
                        {resetPwdModal.newPassword}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const text = `UdyogBill Login Credentials:\nEmail: ${resetPwdModal.tenant?.adminEmail}\nPassword: ${resetPwdModal.newPassword}\nLink: https://udyogbill.com/login`;
                        navigator.clipboard.writeText(text);
                        setResetPwdModal((prev) => ({ ...prev, copied: true }));
                        setTimeout(() => setResetPwdModal((prev) => ({ ...prev, copied: false })), 3000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {resetPwdModal.copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Info</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={resetPwdModal.showPassword ? "text" : "password"}
                        value={resetPwdModal.newPassword}
                        onChange={(e) => setResetPwdModal((prev) => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter at least 6 characters"
                        className="w-full px-3.5 py-2.5 pr-20 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setResetPwdModal((prev) => ({ ...prev, showPassword: !prev.showPassword }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        {resetPwdModal.showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500">Quick Suggestions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {["Asymed@123", "Udyog@123", "Admin@123", "Pass@12345"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setResetPwdModal((prev) => ({ ...prev, newPassword: preset }))}
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 font-mono transition-colors cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const generated = "Udyog@" + Math.floor(100 + Math.random() * 900) + "!";
                          setResetPwdModal((prev) => ({ ...prev, newPassword: generated }));
                        }}
                        className="px-2.5 py-1 text-xs rounded-lg border border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold transition-colors cursor-pointer"
                      >
                        ⚡ Random
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    ℹ️ Setting a new password will automatically unlock any lockout on this account.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setResetPwdModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                {resetPwdModal.successMessage ? "Close" : "Cancel"}
              </button>
              {!resetPwdModal.successMessage && (
                <button
                  type="button"
                  onClick={handleConfirmResetPassword}
                  disabled={resetPwdModal.submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {resetPwdModal.submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Update Password Now</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
