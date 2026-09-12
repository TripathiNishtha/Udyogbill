"use client";

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
  X,
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
import { Badge, Button } from "@/components/ui";

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
import { PharmaDashboardWidgets } from "@/components/dashboard/pharma-dashboard-widgets";
import { OnboardingTour, LaunchTourButton, TourStep } from "@/components/onboarding/onboarding-tour";
import { FloatingWhatsAppWidget } from "@/components/common/floating-whatsapp-widget";

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
  const [isTourOpen, setIsTourOpen] = useState(false);

  const dashboardTourSteps: TourStep[] = useMemo(
    () => [
      {
        targetId: "tour-create-invoice-btn",
        titleHi: "👉 Pehla Bill Banayein (Create Invoice)",
        titleEn: "Step 1: Create your very first bill",
        descHi: "UdyogBill me billing karna behad saral hai. Yahan click karke apna pehla GST ya retail bill test karein.",
        descEn: "Click here to open the smart invoice generator and test your first bill in seconds.",
        actionLabelHi: "Pehla Bill Banayein",
        actionLabelEn: "Create Invoice",
        onAction: () => {
          window.location.href = "/app/sales/invoices?action=new&tour=1";
        },
      },
    ],
    []
  );

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
      <div className="p-16 text-center text-muted-foreground text-xs flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <div className="font-semibold text-sm text-foreground">
          {isHi ? "UdyogBill डैशबोर्ड लोड हो रहा है..." : "Loading UdyogBill..."}
        </div>
        <p className="text-muted-foreground text-xs">
          {isHi ? "वास्तविक लेजर और खाता बही से मेट्रिक्स संकलित किए जा रहे हैं" : "Aggregating live ledger entries, tax balances, and real-time inventory"}
        </p>
      </div>
    );
  }

  return (
    <div className="px-2.5 sm:px-4 md:px-6 py-3 sm:py-4 w-full max-w-[1800px] mx-auto space-y-3 sm:space-y-4 overflow-x-hidden">
      {/* ─── Executive Command Header & Period Control ─────────── */}
      <div className="bg-surface border border-border rounded-xl p-3 sm:p-3.5 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Left: Greeting & Quick Branch Context */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base md:text-lg font-black text-foreground tracking-tight truncate max-w-[200px] xs:max-w-[280px] sm:max-w-none">
                  {profile?.tradeName || profile?.businessName || currentUser?.businessName || "Executive Dashboard"}
                </h1>
                <Badge variant="primary" size="sm" className="font-mono text-[10px] shrink-0">
                  {profile?.code || currentUser?.tenantCode || "LIVE ERP"}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 hidden xs:block">
                {isHi ? "व्यापार अवलोकन और वास्तविक समय वित्तीय विश्लेषण" : "Business Overview & Real-Time Financial Intelligence"}
              </p>
            </div>
          </div>

          {/* Right: Period Filter Pills + Language + Customize + Refresh */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            {/* Period selector */}
            <div className="flex items-center bg-surface-elevated/60 p-0.5 rounded-lg border border-border text-[11px] sm:text-xs">
              {[
                { id: "today", labelEn: "Today", labelHi: "आज" },
                { id: "week", labelEn: "7D", labelHi: "7दिन" },
                { id: "month", labelEn: "Month", labelHi: "माह" },
                { id: "year", labelEn: "Year", labelHi: "वर्ष" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTimeFilter(p.id as any)}
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md font-bold text-[11px] sm:text-xs transition-all cursor-pointer ${
                    timeFilter === p.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isHi ? p.labelHi : p.labelEn}
                </button>
              ))}
            </div>

            {/* Language Toggle */}
            <div className="flex items-center bg-surface-elevated/60 p-0.5 rounded-lg border border-border text-[11px] sm:text-xs">
              <button
                onClick={() => {
                  setLang("en");
                  localStorage.setItem("udyogbill_lang", "en");
                }}
                className={`px-1.5 sm:px-2 py-0.5 rounded-md font-bold text-[11px] sm:text-xs transition-all cursor-pointer ${
                  lang === "en" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => {
                  setLang("hi");
                  localStorage.setItem("udyogbill_lang", "hi");
                }}
                className={`px-1.5 sm:px-2 py-0.5 rounded-md font-bold text-[11px] sm:text-xs transition-all cursor-pointer ${
                  lang === "hi" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                हिं
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              title={isHi ? "रिफ्रेश करें" : "Refresh Dashboard Data"}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            </button>

            {/* Tour & Guide button */}
            <div className="hidden sm:inline-flex">
              <LaunchTourButton onClick={() => setIsTourOpen(true)} />
            </div>

            {/* Customize Layout button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomizerOpen(true)}
              icon={<Sliders className="w-3.5 h-3.5 text-muted-foreground" />}
              className="text-xs hidden sm:inline-flex"
            >
              <span>{isHi ? "कस्टमाइज़" : "Customize"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 1. Fast-Action Command Ribbon: 1-Click Execution (~38px) ───────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <Link
          id="tour-create-invoice-btn"
          href="/app/sales/invoices?action=new&tour=1"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-xs border border-emerald-600 transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="p-1 rounded-md bg-white/20 text-white shrink-0">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <div className="text-xs font-bold text-white truncate">
              {isHi ? "नया GST बिल" : "Create Invoice"}
            </div>
          </div>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-800/70 text-emerald-100 border border-emerald-500/50 ml-1.5 shrink-0 hidden xl:inline">
            Alt+N
          </kbd>
        </Link>

        <Link
          href="/app/sales/quotations"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface border border-blue-200 dark:border-blue-900/40 hover:border-blue-400 hover:bg-blue-50/40 shadow-2xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-semibold text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-300 truncate">
              {isHi ? "कोटेशन बनाएं" : "New Estimate"}
            </div>
          </div>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-elevated text-muted-foreground border border-border/40 ml-1.5 shrink-0 hidden xl:inline">
            Alt+E
          </kbd>
        </Link>

        <Link
          href="/app/purchase/orders"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface border border-amber-200 dark:border-amber-900/40 hover:border-amber-400 hover:bg-amber-50/40 shadow-2xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 shrink-0 group-hover:scale-105 transition-transform">
              <Boxes className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-semibold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-300 truncate">
              {isHi ? "खरीद ऑर्डर" : "Purchase Order"}
            </div>
          </div>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-elevated text-muted-foreground border border-border/40 ml-1.5 shrink-0 hidden xl:inline">
            Alt+P
          </kbd>
        </Link>

        <Link
          href="/app/parties/customers"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface border border-indigo-200 dark:border-indigo-900/40 hover:border-indigo-400 hover:bg-indigo-50/40 shadow-2xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 shrink-0 group-hover:scale-105 transition-transform">
              <Users2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-semibold text-foreground group-hover:text-indigo-700 dark:group-hover:text-indigo-300 truncate">
              {isHi ? "नया ग्राहक" : "Add Customer"}
            </div>
          </div>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-elevated text-muted-foreground border border-border/40 ml-1.5 shrink-0 hidden xl:inline">
            Alt+C
          </kbd>
        </Link>

        <Link
          href="/app/inventory/items"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface border border-purple-200 dark:border-purple-900/40 hover:border-purple-400 hover:bg-purple-50/40 shadow-2xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="p-1 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/60 shrink-0 group-hover:scale-105 transition-transform">
              <Boxes className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-semibold text-foreground group-hover:text-purple-700 dark:group-hover:text-purple-300 truncate">
              {isHi ? "नया प्रोडक्ट" : "Add Product"}
            </div>
          </div>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-elevated text-muted-foreground border border-border/40 ml-1.5 shrink-0 hidden xl:inline">
            Alt+I
          </kbd>
        </Link>

        <Link
          href="/app/expenses"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface border border-rose-200 dark:border-rose-900/40 hover:border-rose-400 hover:bg-rose-50/40 shadow-2xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="p-1 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 shrink-0 group-hover:scale-105 transition-transform">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-semibold text-foreground group-hover:text-rose-700 dark:group-hover:text-rose-300 truncate">
              {isHi ? "खर्चा जोड़ें" : "Record Expense"}
            </div>
          </div>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-elevated text-muted-foreground border border-border/40 ml-1.5 shrink-0 hidden xl:inline">
            Alt+X
          </kbd>
        </Link>
      </div>

      {/* ─── 2. Primary Financial & Ledger Executive KPIs (3-Second Rule) ──── */}
      {visibleWidgetIds.includes("kpi-summary") && (
        <div className="w-full">
          {renderWidgetById("kpi-summary")}
        </div>
      )}

      {/* ─── 3. Pharma Executive Intelligence Widget (Attached when Pharma addon is active) ── */}
      {hasPharmaAddon && <PharmaDashboardWidgets />}

      {/* ─── 4. Dynamic Industry-Aware Configurable Widget Engine ─────────────── */}
      <div className="space-y-2.5">
        {widgetOrder
          .filter((wId) => wId !== "kpi-summary" && visibleWidgetIds.includes(wId))
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
                  {isHi ? "मोबाइल नंबर (10 अंक)" : "Phone Number (10 Digits)"}
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={profileForm.phoneNumber}
                  onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
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

      {/* Interactive Onboarding Spotlight Tour */}
      <OnboardingTour
        steps={dashboardTourSteps}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        tourKey="udyogbill_dashboard_tour"
      />

      {/* Floating WhatsApp Live Help Widget */}
      <FloatingWhatsAppWidget />
    </div>
  );
}