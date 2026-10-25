"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Landmark,
  Scale,
  FileSpreadsheet,
  Receipt,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Lock,
  CheckCircle2,
  PieChart,
  BookOpen,
  Plus,
  RefreshCw,
  AlertTriangle,
  Database,
  X,
  Loader2
} from "lucide-react";
import {
  accountingService,
  MigratedBillsSyncPreview,
  SyncMigratedBillsResult
} from "@/services/accounting-services";

export default function AccountingHubPage() {
  const [isAddonActive, setIsAddonActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeLedgers: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    isBalanced: true
  });

  // Sync Modal State
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncPreviewLoading, setSyncPreviewLoading] = useState(false);
  const [syncPreview, setSyncPreview] = useState<MigratedBillsSyncPreview | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncMigratedBillsResult | null>(null);
  const [syncSales, setSyncSales] = useState(true);
  const [syncPurchases, setSyncPurchases] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [status, accounts, tb, preview] = await Promise.all([
        accountingService.isAddonEnabled(),
        accountingService.getLedgerAccounts().catch(() => []),
        accountingService.getTrialBalance().catch(() => ({ isBalanced: true })),
        accountingService.getMigratedBillsSyncPreview().catch(() => null)
      ]);

      setIsAddonActive(status);
      if (preview) setSyncPreview(preview);

      const active = accounts.filter((a) => a.isActive).length;
      const assets = accounts
        .filter((a) => a.category === "Asset")
        .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
      const liabilities = accounts
        .filter((a) => a.category === "Liability")
        .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);

      setStats({
        activeLedgers: active,
        totalAssets: assets,
        totalLiabilities: liabilities,
        isBalanced: tb.isBalanced
      });
    } catch (err) {
      console.warn("Error loading accounting hub data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenSyncModal = async () => {
    setShowSyncModal(true);
    setSyncResult(null);
    setSyncPreviewLoading(true);
    try {
      const preview = await accountingService.getMigratedBillsSyncPreview();
      setSyncPreview(preview);
    } catch (err) {
      console.error("Failed to load sync preview", err);
    } finally {
      setSyncPreviewLoading(false);
    }
  };

  const handleExecuteSync = async () => {
    if (!syncSales && !syncPurchases) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await accountingService.syncMigratedBills({
        syncSales,
        syncPurchases
      });
      setSyncResult(result);
      // Reload stats and preview
      await loadData();
    } catch (err: any) {
      alert("Failed to sync historical bills: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleForDemo = async () => {
    const nextStatus = !isAddonActive;
    await accountingService.setAddonStatus(nextStatus);
    setIsAddonActive(nextStatus);
  };

  if (loading) {
    return <div className="p-8 text-slate-400">Loading Financial Engine...</div>;
  }

  // If Add-on is locked by SuperAdmin
  if (!isAddonActive) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="w-16 h-16 bg-orange-600/20 border border-orange-500/30 rounded-2xl flex items-center justify-center mx-auto text-orange-400">
            <Lock className="w-8 h-8" />
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              Enterprise Add-on Module
            </span>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Advanced Dual-Entry Financial Accounting
            </h1>
            <p className="text-sm text-slate-400">
              Upgrade your plan to unlock complete 5-Tier Chart of Accounts, Journal Vouchers, Multi-leg Contra entries, Bank Reconciliation (BRS), Trial Balance, and Live Balance Sheet.
            </p>
          </div>

          {/* Feature Grid Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-4">
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>5-Tier Chart of Accounts</span>
              </div>
              <p className="text-xs text-slate-400">
                Categorize Assets, Liabilities, Equity, Revenues and Operating Expenses with parent-child ledger hierarchy.
              </p>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Journal & Contra Vouchers</span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-leg double entry with automatic Debit = Credit balancing enforcement and bank transfer contra logs.
              </p>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Trial Balance & Balance Sheet</span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time 4-column trial balance, profit & loss statement, and certified financial balance sheet.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleToggleForDemo}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-600/30 flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Enable Add-on for this Tenant (SuperAdmin Simulation)</span>
            </button>
            <Link
              href="/app/dashboard"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If Add-on is active
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-600 shadow-2xs">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Financial Accounting Hub</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ACTIVE ADD-ON
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Dual-entry general ledger, chart of accounts, journal vouchers, and live statutory balance sheet
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenSyncModal}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center space-x-2 border border-slate-700/80 transition-all shadow-xs cursor-pointer"
            title="Sync historical sales and purchase bills to the General Ledger"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sync Migrated Bills</span>
          </button>

          <Link
            href="/app/accounting/vouchers"
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm shadow-orange-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Journal / Contra Voucher</span>
          </Link>
        </div>
      </div>

      {/* Historical Data Reconciliation Notice */}
      {syncPreview && (syncPreview.unpostedSalesCount > 0 || syncPreview.unpostedPurchasesCount > 0) && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-500 rounded-xl mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-400 flex items-center space-x-2">
                <span>Unposted Historical Data Detected</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-extrabold uppercase">Action Recommended</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Found <span className="font-bold text-white">{syncPreview.unpostedSalesCount} sales invoices</span> (₹{syncPreview.unpostedSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}) and <span className="font-bold text-white">{syncPreview.unpostedPurchasesCount} purchase bills</span> that have not been posted to the General Ledger. Sync them now so your Trial Balance matches your Billing Dashboard.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenSyncModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync to Ledger Now</span>
          </button>
        </div>
      )}

      {/* Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Chart of Accounts */}
        <Link
          href="/app/accounting/coa"
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500 hover:shadow-md rounded-2xl group transition flex flex-col justify-between space-y-4 shadow-xs cursor-pointer"
        >
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 text-orange-600 w-fit rounded-xl border border-orange-200 group-hover:scale-105 transition shadow-2xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition">
              Chart of Accounts (COA)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              5-Tier hierarchical master: Assets, Liabilities, Equity, Revenue, and Expense account groups.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-orange-600 group-hover:translate-x-1 transition space-x-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Manage COA</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 2. Journal & Contra Vouchers */}
        <Link
          href="/app/accounting/vouchers"
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-md rounded-2xl group transition flex flex-col justify-between space-y-4 shadow-xs cursor-pointer"
        >
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 w-fit rounded-xl border border-emerald-200 group-hover:scale-105 transition shadow-2xs">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
              Journal &amp; Contra Vouchers
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Record bank transfers, depreciation, accruals, and manual double-entry ledger adjustments.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition space-x-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Open Vouchers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 3. Bank Reconciliation (BRS) */}
        <Link
          href="/app/accounting/reconciliation"
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500 hover:shadow-md rounded-2xl group transition flex flex-col justify-between space-y-4 shadow-xs cursor-pointer"
        >
          <div className="space-y-3">
            <div className="p-3 bg-sky-50 text-sky-600 w-fit rounded-xl border border-sky-200 group-hover:scale-105 transition shadow-2xs">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 transition">
              Bank Reconciliation (BRS)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Match bank statement line items with recorded vouchers and reconcile un-cleared cheques.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-sky-600 group-hover:translate-x-1 transition space-x-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Reconcile Accounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 4. Financial Statements (Trial Balance, BS, P&L) */}
        <Link
          href="/app/accounting/reports"
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:shadow-md rounded-2xl group transition flex flex-col justify-between space-y-4 shadow-xs cursor-pointer"
        >
          <div className="space-y-3">
            <div className="p-3 bg-purple-50 text-purple-600 w-fit rounded-xl border border-purple-200 group-hover:scale-105 transition shadow-2xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition">
              Financial Statements
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              4-Column Trial Balance, certified Balance Sheet, and detailed Profit &amp; Loss account.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-purple-600 group-hover:translate-x-1 transition space-x-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>View Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Accounting Quick Stats Overview */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Ledger Accounting Health &amp; Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Total Active Ledgers</span>
            <span className="text-xl font-mono font-bold text-slate-900 dark:text-white">{stats.activeLedgers} Accounts</span>
          </div>
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block mb-1">Total Assets Valuation</span>
            <span className="text-xl font-mono font-bold text-emerald-700 dark:text-emerald-400">
              ₹{stats.totalAssets.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-4 bg-rose-50/70 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800/40">
            <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 block mb-1">Total Outstanding Liabilities</span>
            <span className="text-xl font-mono font-bold text-rose-700 dark:text-rose-400">
              ₹{stats.totalLiabilities.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-4 bg-sky-50/70 dark:bg-sky-950/20 rounded-xl border border-sky-200 dark:border-sky-800/40">
            <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300 block mb-1">Trial Balance Status</span>
            <span className={`text-xs font-extrabold flex items-center space-x-1.5 mt-2 ${stats.isBalanced ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
              <CheckCircle2 className="w-4 h-4" />
              <span>{stats.isBalanced ? "PERFECTLY BALANCED" : "RECONCILING"}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 1-Click Migrated Bills Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden space-y-0 text-left">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Sync Migrated Bills to General Ledger</h3>
                  <p className="text-xs text-slate-400">Post historical invoices and bills to double-entry accounts</p>
                </div>
              </div>
              <button
                onClick={() => !isSyncing && setShowSyncModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {syncPreviewLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  <p className="text-xs font-medium">Scanning for unposted sales and purchase bills...</p>
                </div>
              ) : (
                <>
                  {syncResult ? (
                    <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl space-y-2">
                      <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Sync Completed Successfully!</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {syncResult.message}
                      </p>
                      <div className="pt-2 text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                        <span>• Synced Sales: <strong className="text-white">{syncResult.syncedSalesCount} (₹{syncResult.syncedSalesAmount.toLocaleString("en-IN")})</strong></span>
                        <span>• Synced Purchases: <strong className="text-white">{syncResult.syncedPurchasesCount} (₹{syncResult.syncedPurchasesAmount.toLocaleString("en-IN")})</strong></span>
                        {syncResult.syncedPaymentsCount > 0 && (
                          <span>• Synced Receipts: <strong className="text-white">{syncResult.syncedPaymentsCount}</strong></span>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium block">Unposted Sales Invoices</span>
                      <span className="text-lg font-bold text-white font-mono block">
                        {syncPreview?.unpostedSalesCount ?? 0} Bills
                      </span>
                      <span className="text-[11px] text-emerald-400 font-mono">
                        ₹{(syncPreview?.unpostedSalesAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium block">Unposted Purchase Bills</span>
                      <span className="text-lg font-bold text-white font-mono block">
                        {syncPreview?.unpostedPurchasesCount ?? 0} Bills
                      </span>
                      <span className="text-[11px] text-purple-400 font-mono">
                        ₹{(syncPreview?.unpostedPurchasesAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Selection Checkboxes */}
                  <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Sync Selections
                    </span>

                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={syncSales}
                        onChange={(e) => setSyncSales(e.target.checked)}
                        disabled={isSyncing}
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-slate-900 border-slate-700"
                      />
                      <span className="text-xs text-slate-300 font-medium">
                        Post Unposted Sales Invoices &amp; Linked Payments
                      </span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={syncPurchases}
                        onChange={(e) => setSyncPurchases(e.target.checked)}
                        disabled={isSyncing}
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-slate-900 border-slate-700"
                      />
                      <span className="text-xs text-slate-300 font-medium">
                        Post Unposted Purchase Bills &amp; Supplier Payables
                      </span>
                    </label>
                  </div>

                  {/* Safety & Multi-industry Guarantee */}
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-slate-400 space-y-1 leading-relaxed">
                    <p className="font-semibold text-blue-400">🛡️ Idempotent &amp; Multi-Industry Safe</p>
                    <p>
                      This operation generates standard double-entry journal vouchers (<code className="text-slate-300">JV-INV-*</code>, <code className="text-slate-300">JV-BILL-*</code>) across all business verticals. Any bill already posted is safely skipped to prevent duplicates.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Already Synced: {syncPreview?.alreadySyncedCount ?? 0} Vouchers
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  {syncResult ? "Close" : "Cancel"}
                </button>

                {!syncResult && (
                  <button
                    type="button"
                    onClick={handleExecuteSync}
                    disabled={isSyncing || (!syncSales && !syncPurchases) || ((syncPreview?.unpostedSalesCount ?? 0) === 0 && (syncPreview?.unpostedPurchasesCount ?? 0) === 0)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm shadow-emerald-600/30 transition cursor-pointer"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Syncing to Ledger...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Start 1-Click Sync</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
