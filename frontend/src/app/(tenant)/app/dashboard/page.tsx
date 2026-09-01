"use client";

import { TurboOnboardingWizard } from "@/components/onboarding/turbo-onboarding-wizard";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Boxes,
  Users2,
  CreditCard,
  Plus,
  ShieldCheck,
  ChevronRight,
  Receipt,
  FileText,
  Calendar,
  Filter,
  ChevronDown,
  RefreshCw,
  Copy,
  Check,
  LogOut,
  Sliders,
  Sparkles,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { authService } from "@/services/api-services";
import { ThemeToggle } from "@/components/theme/theme-provider";
import { NetworkStatusBadge } from "@/components/layout/network-status-badge";
import { tenantAppService, BranchDetails } from "@/services/tenant-app-services";
import { salesService } from "@/services/sales-services";
import { partyService } from "@/services/party-services";
import { reportService } from "@/services/report-services";
import { p0ReportService } from "@/services/p0-reports.service";
import {
  industryService,
  ExpiryAlertBatch,
  ScheduleH1RegisterRow,
} from "@/services/industry-services";
import { syncManager } from "@/lib/sync-manager";
import {
  AuthResponse,
  TenantDetails,
  SalesInvoiceList,
  MasterItem,
  PartyList,
  FinancialSummaryReport,
} from "@/types";
import { useAddons } from "@/context/addon-context";

// Widgets & Registry
import {
  DashboardWidgetConfig,
  getApplicableWidgets,
} from "@/components/dashboard/dashboard-widget-registry";
import {
  KpiExecutiveCards,
  KpiCardData,
} from "@/components/dashboard/widgets/kpi-executive-cards";
import {
  OperationalAlertsWidget,
  OperationalAlertsData,
} from "@/components/dashboard/widgets/operational-alerts";
import {
  SalesCollectionAnalyticsWidget,
  DailySalesPoint,
  PaymentModeSlice,
} from "@/components/dashboard/widgets/sales-collection-analytics";
import {
  PharmaExpiryAlertsWidget,
  PharmaScheduleH1Widget,
} from "@/components/dashboard/widgets/pharma-widgets";
import {
  TopDebtorsWidget,
  FastMovingSkusWidget,
  FastMovingSku,
} from "@/components/dashboard/widgets/wholesale-fmcg-widgets";
import { RecentActivityLedgerWidget } from "@/components/dashboard/widgets/recent-activity-ledger";
import { DashboardCustomizerModal } from "@/components/dashboard/dashboard-customizer-modal";

export default function TenantDashboardPage() {
  const [currentUser, setCurrentUser] = useState<AuthResponse["user"] | null>(null);
  const [profile, setProfile] = useState<TenantDetails | null>(null);
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { isAddonActive } = useAddons();
  const hasPharmaAddon = isAddonActive("pharma");

  // Filters
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "quarter" | "year">("month");
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");
  const [copiedGstin, setCopiedGstin] = useState(false);

  // Real Database Data
  const [summaryReport, setSummaryReport] = useState<FinancialSummaryReport | null>(null);
  const [invoices, setInvoices] = useState<SalesInvoiceList[]>([]);
  const [customers, setCustomers] = useState<PartyList[]>([]);
  const [dailySalesPoints, setDailySalesPoints] = useState<DailySalesPoint[]>([]);
  const [paymentModeSlices, setPaymentModeSlices] = useState<PaymentModeSlice[]>([]);
  const [stockValuationTotal, setStockValuationTotal] = useState<number>(0);
  const [stockItemCount, setStockItemCount] = useState<number>(0);
  const [stockLowAlertCount, setStockLowAlertCount] = useState<number>(0);
  const [stockNegativeCount, setStockNegativeCount] = useState<number>(0);
  const [stockItems, setStockItems] = useState<MasterItem[]>([]);
  const [overdueReceivableTotal, setOverdueReceivableTotal] = useState<number>(0);
  const [overdueReceivableCount, setOverdueReceivableCount] = useState<number>(0);
  const [overduePayableTotal, setOverduePayableTotal] = useState<number>(0);
  const [overduePayableCount, setOverduePayableCount] = useState<number>(0);

  // Industry-Specific Data
  const [pharmaExpiryBatches, setPharmaExpiryBatches] = useState<ExpiryAlertBatch[]>([]);
  const [pharmaH1Records, setPharmaH1Records] = useState<ScheduleH1RegisterRow[]>([]);
  const [fastMovingSkus, setFastMovingSkus] = useState<FastMovingSku[]>([]);

  // Widget Layout & Customization
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Profile & Password Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phoneNumber: "",
    currentPassword: "",
    newPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const openProfileModal = () => {
    const user = authService.getCurrentUser();
    setProfileForm({
      fullName: user?.fullName || "",
      phoneNumber: user?.phoneNumber || "",
      currentPassword: "",
      newPassword: "",
    });
    setProfileMsg("");
    setIsProfileModalOpen(true);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await tenantAppService.updateMyProfile({
        fullName: profileForm.fullName,
        phoneNumber: profileForm.phoneNumber,
        currentPassword: profileForm.currentPassword || undefined,
        newPassword: profileForm.newPassword || undefined,
      });

      const user = authService.getCurrentUser();
      if (user) {
        user.fullName = profileForm.fullName;
        user.phoneNumber = profileForm.phoneNumber;
        localStorage.setItem("udyogbill_user", JSON.stringify(user));
        setCurrentUser(user);
      }

      setProfileMsg(isHi ? "प्रोफाइल व पासवर्ड सफलतापूर्वक अपडेट हो गया!" : "Profile & password updated successfully!");
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setProfileMsg("");
      }, 1500);
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Global Keyboard Shortcuts (Alt+N, Alt+E, Alt+P, Alt+C, Alt+I, Alt+X)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "n") {
          e.preventDefault();
          window.location.href = "/app/sales/invoices";
        } else if (key === "e") {
          e.preventDefault();
          window.location.href = "/app/sales/quotations";
        } else if (key === "p") {
          e.preventDefault();
          window.location.href = "/app/purchase/orders";
        } else if (key === "c") {
          e.preventDefault();
          window.location.href = "/app/parties/customers";
        } else if (key === "i") {
          e.preventDefault();
          window.location.href = "/app/inventory/items";
        } else if (key === "x") {
          e.preventDefault();
          window.location.href = "/app/expenses";
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const [visibleWidgetIds, setVisibleWidgetIds] = useState<string[]>([]);
  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);

  // 1. Initial User & Language Setup
  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
    const savedLang = localStorage.getItem("udyogbill_lang") as "en" | "hi";
    if (savedLang === "en" || savedLang === "hi") {
      setLang(savedLang);
    }
  }, []);

  // Compute effective date range based on timeFilter
  const dateRange = useMemo(() => {
    const now = new Date();
    let from = new Date();

    if (timeFilter === "today") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeFilter === "week") {
      from.setDate(now.getDate() - 7);
    } else if (timeFilter === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeFilter === "quarter") {
      from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    } else if (timeFilter === "year") {
      from = new Date(now.getFullYear(), 0, 1);
    }

    return {
      fromDate: from.toISOString().slice(0, 10),
      toDate: now.toISOString().slice(0, 10),
    };
  }, [timeFilter]);

  // 2. Load Real Database Ledger & Analytics
  const loadDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);
      const branchId = selectedBranchFilter === "all" ? undefined : selectedBranchFilter;
      const { fromDate, toDate } = dateRange;

      // Parallel Data Fetching of Real Database Endpoints
      const [
        profData,
        branchData,
        summaryRes,
        invRes,
        custRes,
        salesSummaryDaily,
        salesSummaryMode,
        salesSummaryProduct,
        stockBalanceRes,
        debtorAgeingRes,
        creditorAgeingRes,
      ] = await Promise.all([
        tenantAppService.getBusinessProfile().catch(() => null),
        tenantAppService.getBranches().catch(() => []),
        reportService.getSummaryDashboard(fromDate, toDate, branchId).catch(() => null),
        salesService.getInvoices({ pageSize: 50, branchId }).catch(() => ({ items: [], totalCount: 0 })),
        partyService.getCustomers({ pageSize: 50 }).catch(() => ({ items: [], totalCount: 0 })),
        p0ReportService.getSalesSummary({ fromDate, toDate, groupBy: "date", branchId }).catch(() => null),
        p0ReportService.getSalesSummary({ fromDate, toDate, groupBy: "mode", branchId }).catch(() => null),
        p0ReportService.getSalesSummary({ fromDate, toDate, groupBy: "product", branchId }).catch(() => null),
        p0ReportService.getRealTimeStockBalance({ pageSize: 50 }).catch(() => null),
        p0ReportService.getDebtorAgeing({ toDate }).catch(() => null),
        p0ReportService.getCreditorAgeing({ toDate }).catch(() => null),
      ]);

      if (profData) setProfile(profData);
      if (branchData) setBranches(branchData);
      if (summaryRes) setSummaryReport(summaryRes);
      if (invRes) setInvoices(invRes.items || []);
      if (custRes) setCustomers(custRes.items || []);

      // Real Daily Sales Trend
      if (salesSummaryDaily?.rows) {
        const points: DailySalesPoint[] = salesSummaryDaily.rows.map((r) => ({
          date: r.groupKey,
          label: r.groupKey.length > 5 ? r.groupKey.slice(5) : r.groupKey,
          sales: r.grossSales || 0,
          collected: r.paidAmount || 0,
          invoicesCount: r.invoiceCount || 0,
        }));
        setDailySalesPoints(points);
      } else {
        setDailySalesPoints([]);
      }

      // Real Payment Mode Distribution
      if (salesSummaryMode?.rows && salesSummaryMode.grandGrossSales > 0) {
        const total = salesSummaryMode.grandGrossSales;
        const colorMap: Record<string, { colorClass: string; barColor: string }> = {
          cash: { colorClass: "bg-emerald-400", barColor: "bg-emerald-500" },
          upi: { colorClass: "bg-indigo-400", barColor: "bg-indigo-500" },
          banktransfer: { colorClass: "bg-blue-400", barColor: "bg-blue-500" },
          bank: { colorClass: "bg-blue-400", barColor: "bg-blue-500" },
          credit: { colorClass: "bg-amber-400", barColor: "bg-amber-500" },
        };

        const slices: PaymentModeSlice[] = salesSummaryMode.rows.map((r) => {
          const key = (r.groupKey || "cash").toLowerCase().replace(/[\s_-]/g, "");
          const conf = colorMap[key] || { colorClass: "bg-purple-400", barColor: "bg-purple-500" };
          const pct = Math.round(((r.grossSales || 0) / total) * 100);

          return {
            modeKey: r.groupKey,
            modeLabel: r.groupLabel || r.groupKey,
            amount: r.grossSales || 0,
            percentage: pct,
            count: r.invoiceCount || 0,
            colorClass: conf.colorClass,
            barColor: conf.barColor,
          };
        });
        setPaymentModeSlices(slices);
      } else if (invRes?.items && invRes.items.length > 0) {
        // Fallback aggregation from invoices if mode summary is empty
        const modeTotals: Record<string, number> = {};
        let totalVal = 0;
        invRes.items.forEach((inv) => {
          const mode = inv.paymentStatus === 3 ? "Paid" : inv.paymentStatus === 2 ? "Partially Paid" : "Credit (Due)";
          modeTotals[mode] = (modeTotals[mode] || 0) + (inv.totalAmount || 0);
          totalVal += inv.totalAmount || 0;
        });

        const slices: PaymentModeSlice[] = Object.entries(modeTotals).map(([label, amt]) => ({
          modeKey: label,
          modeLabel: label,
          amount: amt,
          percentage: totalVal > 0 ? Math.round((amt / totalVal) * 100) : 0,
          count: 0,
          colorClass: label === "Paid" ? "bg-emerald-400" : label.includes("Partial") ? "bg-amber-400" : "bg-rose-400",
          barColor: label === "Paid" ? "bg-emerald-500" : label.includes("Partial") ? "bg-amber-500" : "bg-rose-500",
        }));
        setPaymentModeSlices(slices);
      } else {
        setPaymentModeSlices([]);
      }

      // Real Inventory Balance & Valuation
      if (stockBalanceRes) {
        setStockValuationTotal(stockBalanceRes.totalStockValue || 0);
        setStockItemCount(stockBalanceRes.totalCount || 0);
        setStockLowAlertCount(stockBalanceRes.totalLowStockCount || 0);
        setStockNegativeCount(stockBalanceRes.totalNegativeStockCount || 0);
        if (stockBalanceRes.items) {
          const mappedItems: MasterItem[] = stockBalanceRes.items.map((i) => ({
            id: i.itemId,
            sku: i.sku,
            name: i.productName,
            currentStock: i.currentStock,
            totalStock: i.currentStock,
            purchasePrice: i.costRate,
            sellingPrice: i.costRate * 1.25,
            minimumStockAlert: 5,
            isActive: true,
          } as any));
          setStockItems(mappedItems);
        }
      }

      // Real Overdue Receivables
      if (debtorAgeingRes) {
        setOverdueReceivableTotal(debtorAgeingRes.grandOverdue || 0);
        const overdueInvs = (debtorAgeingRes.invoiceRows || []).filter((i) => (i.daysOverdue || 0) > 0);
        setOverdueReceivableCount(overdueInvs.length);
      }

      // Real Overdue Payables
      if (creditorAgeingRes) {
        setOverduePayableTotal(creditorAgeingRes.grandOverdue || 0);
        const overdueBills = (creditorAgeingRes.billRows || []).filter((b) => (b.daysOverdue || 0) > 0);
        setOverduePayableCount(overdueBills.length);
      }

      // Fast Moving SKUs from real product sales summary
      if (salesSummaryProduct?.rows && salesSummaryProduct.rows.length > 0) {
        const fastItems: FastMovingSku[] = [...salesSummaryProduct.rows]
          .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
          .slice(0, 5)
          .map((r) => ({
            sku: r.groupKey,
            name: r.groupLabel || r.groupKey,
            category: "General",
            quantitySold: r.totalQuantitySold || 0,
            totalRevenue: r.grossSales || 0,
            uom: "Units",
          }));
        setFastMovingSkus(fastItems);
      } else {
        setFastMovingSkus([]);
      }

      // Load Industry-Specific Data
      const indCode = (profData?.industryCode || "GENERAL_TRADING").toUpperCase();
      if (hasPharmaAddon || indCode === "PHARMA") {
        const [expiryAlerts, h1Rows] = await Promise.all([
          industryService.getExpiryAlerts({ daysThreshold: 60 }).catch(() => []),
          industryService.getScheduleH1Register({ fromDate, toDate }).catch(() => []),
        ]);
        setPharmaExpiryBatches(expiryAlerts || []);
        setPharmaH1Records(h1Rows || []);
      } else {
        setPharmaExpiryBatches([]);
        setPharmaH1Records([]);
      }
    } catch (err) {
      console.error("Dashboard failed to load database metrics", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, selectedBranchFilter, hasPharmaAddon]);

  // Initial load on mount and when filters change
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // 3. Initialize & Sync Configurable Widget Registry
  const applicableWidgets = useMemo(() => {
    return getApplicableWidgets(profile?.industryCode, hasPharmaAddon);
  }, [profile?.industryCode, hasPharmaAddon]);

  useEffect(() => {
    if (!profile?.id) return;
    const storageKey = `udyogbill_dashboard_layout_${profile.id}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.visible && parsed.order) {
          setVisibleWidgetIds(parsed.visible);
          setWidgetOrder(parsed.order);
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved dashboard layout", e);
      }
    }

    // Default configuration from registry
    const defaultVisible = applicableWidgets.filter((w) => w.defaultVisible).map((w) => w.id);
    const defaultOrder = applicableWidgets.map((w) => w.id);
    setVisibleWidgetIds(defaultVisible);
    setWidgetOrder(defaultOrder);
  }, [profile?.id, applicableWidgets]);

  const handleSaveLayout = (newVisible: string[], newOrder: string[]) => {
    setVisibleWidgetIds(newVisible);
    setWidgetOrder(newOrder);
    if (profile?.id) {
      const storageKey = `udyogbill_dashboard_layout_${profile.id}`;
      localStorage.setItem(storageKey, JSON.stringify({ visible: newVisible, order: newOrder }));
    }
  };

  const handleResetLayout = () => {
    const defaultVisible = applicableWidgets.filter((w) => w.defaultVisible).map((w) => w.id);
    const defaultOrder = applicableWidgets.map((w) => w.id);
    setVisibleWidgetIds(defaultVisible);
    setWidgetOrder(defaultOrder);
    if (profile?.id) {
      const storageKey = `udyogbill_dashboard_layout_${profile.id}`;
      localStorage.removeItem(storageKey);
    }
  };

  // 4. Aggregate Real KPI Data
  const kpiData: KpiCardData = useMemo(() => {
    const sales = summaryReport?.totalSales ?? invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
    const invCount = summaryReport?.totalInvoicesCount ?? invoices.length;
    const collected = summaryReport?.totalCollected ?? invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
    const receivables = summaryReport?.totalPendingReceivables ?? invoices.reduce((acc, inv) => acc + (inv.balanceAmount || 0), 0);
    const payables = summaryReport?.totalPayables ?? 0;
    const purchaseCount = summaryReport?.totalPurchaseBillsCount ?? 0;
    const grossProfit = summaryReport?.grossProfit ?? (sales > 0 ? sales * 0.25 : 0);
    const grossMargin = sales > 0 ? Math.round((grossProfit / sales) * 100) : 0;

    const periodLabels: Record<string, string> = {
      today: "Today",
      week: "Last 7 Days",
      month: "This Month",
      quarter: "This Quarter",
      year: "Full Financial Year",
    };

    return {
      totalSales: sales,
      totalInvoicesCount: invCount,
      totalCollected: collected,
      totalReceivables: receivables,
      debtorCount: customers.filter((c) => (c.currentOutstandingBalance || 0) > 0).length,
      totalPayables: payables,
      purchaseCount,
      totalInventoryValue: stockValuationTotal,
      inventoryItemCount: stockItemCount,
      lowStockCount: stockLowAlertCount,
      grossProfitAmount: grossProfit,
      grossMarginPercent: grossMargin,
      periodLabel: periodLabels[timeFilter] || "This Period",
    };
  }, [summaryReport, invoices, customers, stockValuationTotal, stockItemCount, stockLowAlertCount, timeFilter]);

  // 5. Aggregate Operational Alerts Data
  const operationalAlertsData: OperationalAlertsData = useMemo(() => {
    return {
      lowStockCount: stockLowAlertCount,
      negativeStockCount: stockNegativeCount,
      expiringBatchesCount: pharmaExpiryBatches.length,
      overdueReceivableAmount: overdueReceivableTotal,
      overdueReceivableCount: overdueReceivableCount,
      overduePayableAmount: overduePayableTotal,
      overduePayableCount: overduePayableCount,
      unpaidInvoicesCount: invoices.filter((i) => i.paymentStatus !== 3).length,
      offlinePendingCount: 0,
    };
  }, [
    stockLowAlertCount,
    stockNegativeCount,
    pharmaExpiryBatches,
    overdueReceivableTotal,
    overdueReceivableCount,
    overduePayableTotal,
    overduePayableCount,
    invoices,
  ]);

  const handleCopyGstin = () => {
    if (profile?.gstin) {
      navigator.clipboard.writeText(profile.gstin);
      setCopiedGstin(true);
      setTimeout(() => setCopiedGstin(false), 2000);
    }
  };

  const isHi = lang === "hi";

  // Widget Renderer Engine
  const renderWidgetById = (widgetId: string) => {
    switch (widgetId) {
      case "kpi-summary":
        return <KpiExecutiveCards key={widgetId} data={kpiData} isHi={isHi} />;

      case "operational-alerts":
        return <OperationalAlertsWidget key={widgetId} data={operationalAlertsData} isHi={isHi} />;

      case "pharma-expiry-alerts":
        return <PharmaExpiryAlertsWidget key={widgetId} batches={pharmaExpiryBatches} isHi={isHi} />;

      case "pharma-schedule-h1":
        return <PharmaScheduleH1Widget key={widgetId} records={pharmaH1Records} isHi={isHi} />;

      case "sales-collection-analytics":
        return (
          <SalesCollectionAnalyticsWidget
            key={widgetId}
            trendData={dailySalesPoints}
            paymentModes={paymentModeSlices}
            isHi={isHi}
          />
        );

      case "top-debtors-exposure":
        return <TopDebtorsWidget key={widgetId} debtors={customers} isHi={isHi} />;

      case "fast-moving-skus":
        return <FastMovingSkusWidget key={widgetId} items={fastMovingSkus} isHi={isHi} />;

      case "recent-activity-ledger":
        return <RecentActivityLedgerWidget key={widgetId} invoices={invoices} items={stockItems} isHi={isHi} />;

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <div className="font-semibold text-sm text-slate-200">
          {isHi ? "UdyogBill एंटरप्राइज ERP डैशबोर्ड लोड हो रहा है..." : "Loading UdyogBill Enterprise Commercial ERP..."}
        </div>
        <p className="text-slate-500 text-xs">
          {isHi ? "वास्तविक लेजर और खाता बही से मेट्रिक्स संकलित किए जा रहे हैं" : "Aggregating live ledger entries, tax balances, and real-time inventory"}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-3 w-full max-w-[1800px] mx-auto space-y-2.5">
      {/* ─── Sleek Balanced Executive Command Center ─────────── */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 px-4 shadow-md space-y-2.5">
        {/* Row 1: Company Profile on Left <---> User Profile & Sign Out on Right */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-2.5">
          {/* Left: Highlighted Store Brand + Tenant Code + Branch Selector */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0 overflow-hidden">
              {(profile?.logoUrl || currentUser?.logoUrl) ? (
                <img
                  src={profile?.logoUrl || currentUser?.logoUrl}
                  alt={profile?.businessName || currentUser?.businessName || "Logo"}
                  className="w-full h-full object-contain rounded-lg bg-white"
                />
              ) : (
                <div className="w-full h-full rounded-lg bg-indigo-950 flex items-center justify-center text-indigo-300 font-black text-xs uppercase">
                  {(profile?.businessName || currentUser?.businessName || "UB").slice(0, 2)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {profile?.businessName || currentUser?.businessName || "Apex Pharma Care"}
                </h1>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{profile?.code || currentUser?.tenantCode || "TNT-PHARMA-1001"}</span>
                </span>
              </div>
            </div>

            <div className="hidden sm:block h-5 w-px bg-slate-800 mx-0.5"></div>

            {/* Branch Switcher */}
            <div className="hidden sm:flex items-center space-x-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer pr-1 text-xs"
              >
                <option value="all" className="bg-slate-900 text-white">
                  {isHi ? "सभी शाखाएं" : "All Branches"}
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.branchName} ({b.branchCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Sync Badge, Theme, Language, Profile & Sign Out (Exact layout requested by user) */}
          <div className="flex items-center space-x-2 shrink-0 ml-auto">
            <NetworkStatusBadge />

            <ThemeToggle />

            {/* Language Toggle */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => {
                  setLang("en");
                  localStorage.setItem("udyogbill_lang", "en");
                }}
                className={`px-2 py-0.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                  lang === "en" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => {
                  setLang("hi");
                  localStorage.setItem("udyogbill_lang", "hi");
                }}
                className={`px-2 py-0.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                  lang === "hi" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                हिं
              </button>
            </div>

            {/* 10-Min Quick Onboarding Wizard Trigger */}
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              title={isHi ? "10-मिनट क्विक ऑनबोर्डिंग व डेटा इम्पोर्ट" : "10-Minute Quick Onboarding & Data Migrator"}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">{isHi ? "⚡ क्विक सेटअप" : "⚡ 10-Min Setup"}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              title={isHi ? "रिफ्रेश करें" : "Refresh Dashboard Data"}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
            </button>

            {/* Profile & Password Icon Button */}
            <button
              onClick={openProfileModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/70 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              title={isHi ? "प्रोफाइल व पासवर्ड बदलें" : "Manage Profile & Password"}
            >
              <Users2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate max-w-[85px]">
                {currentUser?.fullName?.split(" ")[0] || "Demo"}
              </span>
            </button>

            {/* Prominent Red Sign Out Button */}
            <button
              onClick={() => authService.logout()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/70 border border-rose-800/50 text-rose-300 hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              title={isHi ? "लॉगआउट करें" : "Sign out of your account"}
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>{isHi ? "लॉगआउट" : "Sign Out"}</span>
            </button>
          </div>
        </div>

        {/* Row 2: 1-Click Time Range Filter Pills (Positioned underneath on the row below) */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
            <span className="font-semibold text-slate-300">{isHi ? "अवधि चुनें:" : "Financial Period:"}</span>
            <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs">
              {[
                { id: "today", labelEn: "Today", labelHi: "आज" },
                { id: "week", labelEn: "7 Days", labelHi: "7 दिन" },
                { id: "month", labelEn: "This Month", labelHi: "इस माह" },
                { id: "year", labelEn: "Full Year", labelHi: "पूरा वर्ष" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTimeFilter(p.id as any)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    timeFilter === p.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {isHi ? p.labelHi : p.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span>{isHi ? "वर्तमान चक्र:" : "Active Cycle:"}</span>
            <span className="font-bold text-slate-200 font-mono">
              {kpiData.periodLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Fast-Action Command Ribbon: 1-Click Execution (~38px) ──────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Link
          href="/app/sales/invoices"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:shadow-xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-white truncate">
              {isHi ? "+ नया GST बिल" : "+ Create Invoice"}
            </div>
          </div>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 ml-1.5 shrink-0 hidden xl:inline">
            Alt+N
          </kbd>
        </Link>

        <Link
          href="/app/sales/quotations"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:shadow-xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-white truncate">
              {isHi ? "+ कोटेशन बनाएं" : "+ New Estimate"}
            </div>
          </div>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 ml-1.5 shrink-0 hidden xl:inline">
            Alt+E
          </kbd>
        </Link>

        <Link
          href="/app/purchase/orders"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
              <Boxes className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-white truncate">
              {isHi ? "+ खरीद ऑर्डर" : "+ Purchase Order"}
            </div>
          </div>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 ml-1.5 shrink-0 hidden xl:inline">
            Alt+P
          </kbd>
        </Link>

        <Link
          href="/app/parties/customers"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
              <Users2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-white truncate">
              {isHi ? "+ नया ग्राहक" : "+ Add Customer"}
            </div>
          </div>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 ml-1.5 shrink-0 hidden xl:inline">
            Alt+C
          </kbd>
        </Link>

        <Link
          href="/app/inventory/items"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:shadow-xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="p-1 rounded-md bg-purple-50 dark:bg-purple-600/15 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
              <Boxes className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-white truncate">
              {isHi ? "+ नया प्रोडक्ट" : "+ Add Product"}
            </div>
          </div>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 ml-1.5 shrink-0 hidden xl:inline">
            Alt+I
          </kbd>
        </Link>

        <Link
          href="/app/expenses"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500 hover:shadow-xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="p-1 rounded-md bg-rose-50 dark:bg-rose-600/15 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-white truncate">
              {isHi ? "+ खर्चा जोड़ें" : "+ Record Expense"}
            </div>
          </div>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 ml-1.5 shrink-0 hidden xl:inline">
            Alt+X
          </kbd>
        </Link>
      </div>

      {/* ─── Dynamic Industry-Aware Configurable Widget Engine ───────────────── */}
      <div className="space-y-2.5">
        {widgetOrder
          .filter((wId) => visibleWidgetIds.includes(wId))
          .map((wId) => {
            return (
              <div key={wId} className="w-full">
                {renderWidgetById(wId)}
              </div>
            );
          })}
      </div>

      {/* ─── Layout Customizer Modal ────────────────────────────────────────── */}
      <DashboardCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        availableWidgets={applicableWidgets}
        currentVisibleWidgetIds={visibleWidgetIds}
        widgetOrder={widgetOrder}
        onSave={handleSaveLayout}
        onReset={handleResetLayout}
        isHi={isHi}
      />

      {/* ─── Profile & Password Settings Modal ─────────────────────────────── */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Users2 className="w-5 h-5 text-indigo-400" />
                <span>{isHi ? "प्रोफाइल व सुरक्षा सेटिंग्स" : "Profile & Security Settings"}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {isHi ? "अपना नाम, मोबाइल नंबर और लॉगिन पासवर्ड बदलें।" : "Update your profile name, contact number, and login password."}
              </p>
            </div>

            {profileMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{profileMsg}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  {isHi ? "पूरा नाम *" : "Full Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  {isHi ? "मोबाइल नंबर" : "Phone Number"}
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={profileForm.phoneNumber}
                  onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {isHi ? "पासवर्ड बदलें (वैकल्पिक)" : "Change Password (Optional)"}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHi ? "वर्तमान पासवर्ड" : "Current Password"}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={profileForm.currentPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {isHi ? "नया पासवर्ड (कम से कम 6 अक्षर)" : "New Password (min 6 characters)"}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  {isHi ? "रद्द करें" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? (isHi ? "सहेज रहे हैं..." : "Saving...") : (isHi ? "बदलाव सहेजें" : "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 10-Minute Turbo Onboarding & Migrator Wizard Modal ──────────── */}
      <TurboOnboardingWizard
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCompleted={() => {
          loadDashboardData();
        }}
        isHi={isHi}
      />
    </div>
  );
}