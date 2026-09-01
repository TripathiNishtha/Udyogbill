"use client";

import { useEffect, useState } from "react";
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
  Plus
} from "lucide-react";
import { accountingService } from "@/services/accounting-services";

export default function AccountingHubPage() {
  const [isAddonActive, setIsAddonActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountingService.isAddonEnabled().then((status) => {
      setIsAddonActive(status);
      setLoading(false);
    });
  }, []);

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
          <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
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
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
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
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Financial Accounting Hub</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE ADD-ON
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Dual-entry general ledger, chart of accounts, journal vouchers, and live statutory balance sheet
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/app/accounting/vouchers"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Journal / Contra Voucher</span>
          </Link>
        </div>
      </div>

      {/* Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Chart of Accounts */}
        <Link
          href="/app/accounting/coa"
          className="p-6 bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl group transition flex flex-col justify-between space-y-4 shadow-xl"
        >
          <div className="space-y-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 w-fit rounded-xl border border-blue-500/20 group-hover:scale-110 transition">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
              Chart of Accounts (COA)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              5-Tier hierarchical master: Assets, Liabilities, Equity, Revenue, and Expense account groups.
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition space-x-1">
            <span>Manage COA</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 2. Journal & Contra Vouchers */}
        <Link
          href="/app/accounting/vouchers"
          className="p-6 bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl group transition flex flex-col justify-between space-y-4 shadow-xl"
        >
          <div className="space-y-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 w-fit rounded-xl border border-emerald-500/20 group-hover:scale-110 transition">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
              Journal & Contra Vouchers
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Record bank transfers, depreciation, accruals, and manual double-entry ledger adjustments.
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition space-x-1">
            <span>Open Vouchers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 3. Bank Reconciliation (BRS) */}
        <Link
          href="/app/accounting/reconciliation"
          className="p-6 bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl group transition flex flex-col justify-between space-y-4 shadow-xl"
        >
          <div className="space-y-3">
            <div className="p-3 bg-amber-500/10 text-amber-400 w-fit rounded-xl border border-amber-500/20 group-hover:scale-110 transition">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition">
              Bank Reconciliation (BRS)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Match bank statement line items with recorded vouchers and reconcile un-cleared cheques.
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition space-x-1">
            <span>Reconcile Accounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 4. Financial Statements (Trial Balance, BS, P&L) */}
        <Link
          href="/app/accounting/reports"
          className="p-6 bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 rounded-2xl group transition flex flex-col justify-between space-y-4 shadow-xl"
        >
          <div className="space-y-3">
            <div className="p-3 bg-purple-500/10 text-purple-400 w-fit rounded-xl border border-purple-500/20 group-hover:scale-110 transition">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition">
              Financial Statements
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              4-Column Trial Balance, certified Balance Sheet, and detailed Profit & Loss account.
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition space-x-1">
            <span>View Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Accounting Quick Stats Overview */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Ledger Accounting Health & Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Total Active Ledgers</span>
            <span className="text-xl font-mono font-bold text-white">16 Accounts</span>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Total Assets Valuation</span>
            <span className="text-xl font-mono font-bold text-emerald-400">₹16,77,500.00</span>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Total Outstanding Liabilities</span>
            <span className="text-xl font-mono font-bold text-rose-400">₹2,64,000.00</span>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Trial Balance Status</span>
            <span className="text-sm font-bold text-emerald-400 flex items-center space-x-1 mt-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>PERFECTLY BALANCED</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
