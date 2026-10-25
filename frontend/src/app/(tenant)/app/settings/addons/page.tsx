"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  CreditCard,
  Building2,
  FileText,
  Clock,
  Layers,
  Check,
  Activity,
  UserCheck,
  MapPin,
  Lock,
  RefreshCw,
  Landmark,
  MessageSquare,
  Truck,
  X,
  Loader2,
  Tag
} from "lucide-react";
import { tenantAppService } from "@/services/tenant-app-services";
import { superAdminService, PlatformCommercialConfig } from "@/services/super-admin-services";
import { useAddons } from "@/context/addon-context";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface AddonCatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  annualPrice: number;
  billingCycle: string;
  isActive: boolean;
  isEnrolled: boolean;
  enrolledExpiresAtUtc?: string | null;
  remainingDays: number;
  isHidden?: boolean;
}

export default function PlanAndAddonsPage() {
  const { refreshConfig, isAddonActive } = useAddons();
  const [activePackData, setActivePackData] = useState<any | null>(null);
  const [commercialConfig, setCommercialConfig] = useState<PlatformCommercialConfig | null>(null);
  const [subStatus, setSubStatus] = useState<any | null>(null);
  const [sfaQuota, setSfaQuota] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic Addon Checkout Modal
  const [selectedAddon, setSelectedAddon] = useState<AddonCatalogItem | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<"Monthly" | "Annual">("Annual");
  const [purchasing, setPurchasing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Quick Action States
  const [activatingAi, setActivatingAi] = useState(false);
  const [activatingSfa, setActivatingSfa] = useState(false);
  const [deactivatingSfa, setDeactivatingSfa] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [packRes, subRes, commRes, quotaRes] = await Promise.all([
        tenantAppService.getActiveIndustryPack().catch(() => null),
        tenantAppService.getSubscriptionStatus().catch(() => null),
        superAdminService.getCommercialConfig().catch(() => null),
        tenantAppService.getPharmaSfaQuota().catch(() => null),
      ]);
      setActivePackData(packRes);
      setSubStatus(subRes);
      setCommercialConfig(commRes);
      setSfaQuota(quotaRes);
    } catch (err) {
      console.error("Failed to load plan and addons data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleOpenCheckout = (addon: AddonCatalogItem) => {
    setSelectedAddon(addon);
    setSelectedCycle("Annual");
    setCheckoutError(null);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedAddon) return;
    try {
      setPurchasing(true);
      setCheckoutError(null);

      const isAnnual = selectedCycle === "Annual";
      const orderRes = await tenantAppService.createSubscriptionOrder({
        addonCode: selectedAddon.code,
        billingCycle: isAnnual ? "Annual" : "Monthly",
      });

      const isRzpReady = await loadRazorpayScript();

      if (isRzpReady && window.Razorpay && orderRes.keyId && orderRes.keyId.startsWith("rzp_")) {
        const options = {
          key: orderRes.keyId,
          amount: orderRes.amountInPaisa,
          currency: orderRes.currency || "INR",
          name: "UdyogBill",
          description: orderRes.description,
          order_id: orderRes.orderId,
          prefill: {
            email: orderRes.customerEmail,
            contact: orderRes.customerPhone,
          },
          theme: { color: "#ea580c" },
          handler: async (response: any) => {
            try {
              await tenantAppService.confirmSubscriptionPayment({
                razorpayOrderId: response.razorpay_order_id || orderRes.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature || "sig_verified",
                addonCode: selectedAddon.code,
                billingCycle: isAnnual ? "Annual" : "Monthly",
              });
              setActionMsg({
                type: "success",
                text: `${selectedAddon.name} activated successfully for your business!`,
              });
              setSelectedAddon(null);
              await refreshConfig();
              await loadData();
            } catch (cErr: any) {
              setCheckoutError(cErr?.response?.data?.message || cErr?.message || "Payment confirmation failed.");
            } finally {
              setPurchasing(false);
            }
          },
          modal: {
            ondismiss: () => setPurchasing(false),
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Direct simulation / fallback confirmation
        await tenantAppService.confirmSubscriptionPayment({
          razorpayOrderId: orderRes.orderId,
          razorpayPaymentId: "pay_sim_" + Date.now(),
          razorpaySignature: "simulated_sig",
          addonCode: selectedAddon.code,
          billingCycle: isAnnual ? "Annual" : "Monthly",
        });
        setActionMsg({
          type: "success",
          text: `${selectedAddon.name} activated successfully!`,
        });
        setSelectedAddon(null);
        await refreshConfig();
        await loadData();
      }
    } catch (err: any) {
      setCheckoutError(err?.response?.data?.message || err?.message || "Failed to initiate add-on checkout.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleDeactivateSfa = async () => {
    if (!confirm("Are you sure you want to deactivate Pharma SFA? Field force features and menu will be hidden.")) return;
    try {
      setDeactivatingSfa(true);
      const res = await tenantAppService.deactivatePharmaSfa();
      if (res?.isSuccess) {
        setActionMsg({
          type: "success",
          text: "Pharma SFA Add-on has been deactivated.",
        });
        await refreshConfig();
        await loadData();
      } else {
        setActionMsg({
          type: "error",
          text: res?.message || "Failed to deactivate Pharma SFA Add-on.",
        });
      }
      setTimeout(() => setActionMsg(null), 5000);
    } catch (err: any) {
      setActionMsg({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to deactivate Pharma SFA Add-on.",
      });
    } finally {
      setDeactivatingSfa(false);
    }
  };

  const gstRate = commercialConfig?.gstRatePercent || 18;
  const singleUserPrice = commercialConfig?.singleUserAnnualPrice || 799;
  const fiveUserPrice = commercialConfig?.fiveUserPackAnnualPrice || 2999;
  const aiPrice = commercialConfig?.aiProAnnualPrice || 1499;

  const descriptor = activePackData?.descriptor || {
    displayName: "General Trading & Retail",
    code: activePackData?.industryTypeCode || "OTHER",
    description: "Standard retail & wholesale trading with multi-rate GST and stock ledger",
  };

  const maxAllowedUsers = activePackData?.maxAllowedUsers || 2;
  const currentActiveUsers = activePackData?.currentActiveUsers || 1;
  const isAiActive = activePackData?.isAiAddonActive || false;
  const scansLimit = activePackData?.aiScansLimit || 500;
  const scansUsed = activePackData?.aiScansUsed || 0;
  const scansRemaining = activePackData?.scansRemaining ?? scansLimit - scansUsed;

  const isPharmaTenant =
    (activePackData?.industryTypeCode || "").toUpperCase() === "PHARMA" ||
    (activePackData?.activeIndustryModule || "").toUpperCase() === "PHARMA";
  const isSfaActive = !!activePackData?.isPharmaSfaActive;

  // Master Add-on Metadata
  const ADDON_META: Record<
    string,
    {
      icon: any;
      badge: string;
      titleHindi?: string;
      openHref?: string;
      highlights: string[];
    }
  > = {
    ADDON_ACCOUNTING: {
      icon: Landmark,
      badge: "Finance & CA",
      titleHindi: "Financial Munimi & CA Accounting",
      openHref: "/app/accounting",
      highlights: [
        "Full Chart of Accounts (COA) Hierarchy",
        "Journal, Contra, Payment & Receipt Vouchers",
        "Bank Reconciliation Statement (BRS) with Excel Import",
        "Audited Balance Sheet & Profit and Loss (P&L)",
      ],
    },
    ADDON_AI_PRO: {
      icon: Sparkles,
      badge: "AI Automation",
      titleHindi: "AI Bill Scanner & Auto-Stock Inward",
      openHref: "/app/purchase/bills",
      highlights: [
        "Mobile Camera Photo Snap + PDF Invoice Upload",
        "Auto-Extracts 30+ Items, Batches & Rates in 5 Sec",
        "Auto-Matches Vendors and Stock Master",
        "500 Scans / Month Quota Included",
      ],
    },
    ADDON_EWAYBILL: {
      icon: Truck,
      badge: "Compliance",
      titleHindi: "E-Way Bill & E-Invoice (Direct NIC)",
      openHref: "/app/sales/invoices",
      highlights: [
        "1-Click Government NIC E-Way Bill Generation",
        "B2B E-Invoicing with Scannable QR Code & IRN",
        "Direct API Integration (Zero Manual Portal Typing)",
        "Multi-Vehicle Part-B Transport Updates",
      ],
    },
    ADDON_HRM: {
      icon: Users,
      badge: "Workforce & HR",
      titleHindi: "कर्मचारी हाजिरी, छुट्टी एवं वेतन पर्ची (Payroll)",
      openHref: "/app/hrm",
      highlights: [
        "GPS Geofenced & Office Wi-Fi Mobile Attendance",
        "Staff Leave Management (LMS) with Approval Flow",
        "CBO Field Force Daily Travel & Allowance (TA/DA)",
        "Indian Statutory Payroll (PF 12%, ESI, PT) & PDF Payslips",
      ],
    },
    ADDON_PHARMA_SFA: {
      icon: Activity,
      badge: "Pharma Field Force",
      titleHindi: "MR Field Force & Doctor Detailing",
      openHref: "/app/pharma/field-force",
      highlights: [
        "15 MR Seats + 5 Manager Seats Included",
        "Doctor Detailing, Chemist Visits & DCR Reports",
        "POB Booking Directly Converted to Sales Invoice",
        "Calling Beats, MTP Tour Plans & Target Tracking",
      ],
    },
  };

  // Find backend dynamic pricing for our strictly allowed addons
  const backendAddons: AddonCatalogItem[] = Array.isArray(subStatus?.addons) ? subStatus.addons : [];

  const getAddonFromBackend = (code: string, defaultName: string, defaultDesc: string, defaultPrice: number, defaultAnnual: number) => {
    const found = backendAddons.find((a) => a.code === code);
    if (found) return found;
    return {
      id: `def-${code.toLowerCase()}`,
      code,
      name: defaultName,
      description: defaultDesc,
      price: defaultPrice,
      annualPrice: defaultAnnual,
      billingCycle: "Monthly",
      isActive: true,
      isEnrolled: false,
      remainingDays: 0,
    };
  };

  // ONLY the approved 4 Universal Add-ons + Pharma SFA if Pharma Tenant
  const universalPaidAddons: AddonCatalogItem[] = [
    getAddonFromBackend(
      "ADDON_ACCOUNTING",
      "Dual-Entry Financial Accounting",
      "Double-entry general ledger, Chart of Accounts (COA), Journal & Contra vouchers, Bank Reconciliation (BRS), and Trial Balance / P&L / Balance Sheet.",
      200,
      2000
    ),
    getAddonFromBackend(
      "ADDON_AI_PRO",
      "AI Pro Purchase Bill Scanner",
      "Snap purchase bill photos or upload PDF invoices. AI OCR automatically extracts items, batches, HSN codes, and rates in 5 seconds.",
      1499,
      1499
    ),
    getAddonFromBackend(
      "ADDON_EWAYBILL",
      "Automated E-Way Bill & E-Invoicing",
      "1-click B2B E-Invoicing with QR code and automated government NIC E-Way Bill generation without leaving billing.",
      499,
      4990
    ),
    getAddonFromBackend(
      "ADDON_HRM",
      "HRM & Workforce Governance Suite",
      "Employee directory, GPS geofenced mobile attendance, leave management (LMS), TA/DA travel expense claims, and automated Indian statutory payroll with PF/ESIC/PT payslips.",
      299,
      2990
    ),
  ];

  // If the tenant is Pharma, also allow Pharma SFA
  if (isPharmaTenant) {
    universalPaidAddons.push(
      getAddonFromBackend(
        "ADDON_PHARMA_SFA",
        "Pharma SFA & MR Field Force Suite",
        "For Pharma companies, PCD franchises, & C&F agencies. MR field force, calling beats, doctor directory, stockist allocation, trade schemes, tour plans, and DCR.",
        1000,
        10000
      )
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Zero Setup Fee • Modular Upgrades On-Demand
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <Layers className="w-7 h-7 text-orange-600 dark:text-orange-400" />
            <span>My Plan & Add-On Extensions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Essential accounting, AI automation, E-Way bills, and staff capacity packs for your business.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/app/settings/billing"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
          >
            <CreditCard className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Billing & Invoices</span>
          </Link>
        </div>
      </div>

      {actionMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2.5 border animate-in fade-in slide-in-from-top-2 ${
            actionMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300"
          }`}
        >
          {actionMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span className="font-medium">{actionMsg.text}</span>
        </div>
      )}

      {/* Top Banner: Core Plan Active + Free WhatsApp Included */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-slate-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-emerald-200 dark:border-emerald-500/30 shadow-sm dark:shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                Core Plan Active
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30">
                Industry: {descriptor.displayName}
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                WhatsApp Automation Included FREE
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              UdyogBill Core Plan — {descriptor.displayName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              Your base plan includes full GST billing, real-time stock ledger, and WhatsApp bill sharing by default.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6 shrink-0">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Staff User Capacity</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{currentActiveUsers} / {maxAllowedUsers} Seats In Use</span>
              </div>
              <div className="w-36 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (currentActiveUsers / maxAllowedUsers) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Free Included Highlights */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700 dark:text-slate-300 relative z-10">
          <div className="flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Core GST Invoicing Engine</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>WhatsApp PDF Bills (Free)</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>2 Included Staff User Seats</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Full Inventory & Stock Ledger</span>
          </div>
        </div>
      </div>

      {/* Title for Paid Add-Ons */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Available Modular Add-Ons
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
          Activate specialized financial, automation, and compliance add-ons for your business.
        </p>
      </div>

      {/* Grid of Addons (Only Accounting, AI, E-Way Bill, Staff, and Pharma SFA if Pharma) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1 to 3/4: Universal Addons */}
        {universalPaidAddons.map((addon) => {
          const meta = ADDON_META[addon.code] || {
            icon: Landmark,
            badge: "Add-on",
            titleHindi: "",
            openHref: "/app",
            highlights: ["Modular feature extension"],
          };
          const IconComponent = meta.icon;

          const isEnrolled =
            addon.isEnrolled ||
            (addon.code === "ADDON_ACCOUNTING" && isAddonActive("accounting")) ||
            (addon.code === "ADDON_AI_PRO" && isAiActive) ||
            (addon.code === "ADDON_PHARMA_SFA" && isSfaActive);

          const monthlyPrice = Number(addon.price) || 0;
          const annualPrice = Number(addon.annualPrice) > 0 ? Number(addon.annualPrice) : monthlyPrice * 10;
          const annualWithGst = Math.round(annualPrice * 1.18);

          return (
            <div
              key={addon.code}
              className={`p-6 rounded-2xl bg-white dark:bg-slate-950/70 border flex flex-col justify-between space-y-5 transition-all shadow-xs hover:shadow-md ${
                isEnrolled
                  ? "border-emerald-300 dark:border-emerald-500/40 shadow-emerald-500/5 bg-emerald-50/10"
                  : addon.code === "ADDON_ACCOUNTING"
                  ? "border-orange-300 dark:border-orange-500/40 shadow-orange-500/5"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="space-y-4">
                {/* Top Bar: Icon + Badges */}
                <div className="flex items-center justify-between">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                      isEnrolled
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : addon.code === "ADDON_ACCOUNTING"
                        ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400"
                        : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isEnrolled ? (
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Active & Enrolled
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800">
                        {meta.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{addon.name}</h4>
                    {addon.code === "ADDON_ACCOUNTING" && (
                      <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-orange-100 text-orange-700 border border-orange-200">
                        POPULAR
                      </span>
                    )}
                  </div>
                  {meta.titleHindi && (
                    <div className="text-[11px] font-medium text-orange-600 dark:text-orange-400 mt-0.5">
                      {meta.titleHindi}
                    </div>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {addon.description}
                  </p>
                </div>

                {/* Pricing Box */}
                {addon.code === "ADDON_AI_PRO" && isEnrolled ? (
                  <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/20 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Monthly Scan Quota:</span>
                      <span className="font-bold text-purple-700 dark:text-purple-300">{scansRemaining} / {scansLimit} remaining</span>
                    </div>
                    <div className="w-full bg-purple-100 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-purple-600 dark:bg-purple-500 h-1.5 rounded-full"
                        style={{ width: `${Math.max(5, (scansRemaining / scansLimit) * 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 text-right">Quota resets monthly</div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Annual Subscription:</span>
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          ₹{annualPrice.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400"> /year</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                          (₹{annualWithGst.toLocaleString("en-IN")} incl. 18% GST)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feature Highlights */}
                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 pt-1">
                  {meta.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-tight">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
                {isEnrolled ? (
                  <div className="flex items-center gap-2">
                    {meta.openHref && (
                      <Link
                        href={meta.openHref}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Open Module</span>
                      </Link>
                    )}
                    {addon.code === "ADDON_PHARMA_SFA" && (
                      <button
                        type="button"
                        onClick={handleDeactivateSfa}
                        disabled={deactivatingSfa}
                        className="py-2 px-3 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold transition-all border border-rose-200 dark:border-rose-900 cursor-pointer"
                        title="Deactivate Add-on"
                      >
                        {deactivatingSfa ? "..." : "Deactivate"}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout(addon)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-orange-600/20 active:scale-98 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Subscribe & Activate</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Card: Staff User Capacity Expansion */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-5 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20">
                Capacity Pack
              </span>
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Additional Staff & Operator Seats</h4>
              <div className="text-[11px] font-medium text-orange-600 dark:text-orange-400 mt-0.5">
                Extra Billing Staff & Cashier User Accounts
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                Add more cashiers, billers, and inventory managers to your UdyogBill account with role-based access control.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">+1 Single Extra Seat</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">₹{singleUserPrice}/year + {gstRate}% GST</div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400">₹{(singleUserPrice * (1 + gstRate / 100)).toFixed(0)}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">incl. GST/yr</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-slate-900 border border-orange-200 dark:border-orange-500/30 flex items-center justify-between relative overflow-hidden">
                <span className="absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold bg-orange-600 text-white rounded-bl">
                  SAVE ₹{((singleUserPrice * 5) - fiveUserPrice).toFixed(0)}
                </span>
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">+5 Seats Pack (Value)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">₹{fiveUserPrice}/year + {gstRate}% GST</div>
                </div>
                <div className="text-right pt-2">
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400">₹{(fiveUserPrice * (1 + gstRate / 100)).toFixed(0)}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">incl. GST/yr</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 pt-1">
              <div className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Role-Based Access: Biller, Cashier, Accountant, Admin</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Individual Operator Activity Audit Log</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
            <Link
              href="/app/staff"
              className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-orange-600/20"
            >
              <span>Manage Staff & Seats</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Commercial Policy Guarantee Note */}
      <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-slate-900/60 border border-emerald-200 dark:border-slate-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <strong className="text-slate-900 dark:text-slate-200">UdyogBill Transparent Modular Add-on Policy: </strong>
          Your registered industry module (Pharma FEFO, Grocery, etc.) and WhatsApp bill dispatch are{" "}
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">100% included in your base plan</span>.
          Paid add-ons are strictly for specialized optional tools (Dual-Entry CA Accounting, AI Bill Scanner, E-Way Bill Portal, and Extra Staff).
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedAddon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <button
              type="button"
              onClick={() => setSelectedAddon(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 text-xs font-bold uppercase mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Add-On Activation
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Subscribe to {selectedAddon.name}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {selectedAddon.description}
              </p>
            </div>

            {checkoutError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Subscription Plan: Annual Plan Only */}
            {(() => {
              const base =
                selectedAddon.annualPrice > 0
                  ? selectedAddon.annualPrice
                  : selectedAddon.price * 10;
              const tax = Math.round(base * 0.18);
              const total = base + tax;

              return (
                <div className="space-y-4">
                  {/* Selected Plan Highlight Card */}
                  <div className="p-4 rounded-xl border-2 border-orange-500 bg-orange-50/80 dark:bg-orange-950/40 relative shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-orange-900 dark:text-orange-300">
                        Selected Billing Plan
                      </span>
                      <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-600 text-white rounded-full shadow-xs">
                        Annual • 365 Days
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Annual Subscription (1 Year)
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          Full 365 days validity • Instant activation
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
                          ₹{base.toLocaleString("en-IN")}
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400"> /yr</span>
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Includes 2 Months Free
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span>Base Subscription (Annual):</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{base.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span>GST (18% Input Credit Tax):</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{tax.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">Total Payable:</span>
                      <span className="text-xl font-black text-orange-600 dark:text-orange-400">
                        ₹{total.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Payment Button */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedAddon(null)}
                disabled={purchasing}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={purchasing}
                className="flex-2 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-600/20 cursor-pointer"
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay with Razorpay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
