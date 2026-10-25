"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useAddons } from "@/context/addon-context";
import { Lock, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";

export default function AccountingModuleLayout({ children }: { children: ReactNode }) {
  const { isAddonActive, loading } = useAddons();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If the subscriber has NOT purchased/enrolled in the Dual-Entry Accounting add-on:
  if (!isAddonActive("accounting")) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in">
        <div className="p-8 sm:p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
            <Lock className="w-8 h-8" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-full text-[11px] font-black uppercase tracking-wider">
              Add-on Module Restricted
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Dual-Entry Accounting Module Required
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Yeh feature kewal un subscribers ke liye available hai jinhone <strong>Dual-Entry Accounting Add-on</strong> activate ya purchase kiya hua hai.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:white">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>5-Tier COA & General Ledger</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Assets, Liabilities, Equity, Revenues and Operating Expenses hierarchy.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:white">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Journal & Contra Vouchers</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Multi-leg double entry with automatic Debit = Credit balancing.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:white">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Trial Balance & Balance Sheet</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Certified 4-column TB, live P&L, and balance sheet statements.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app/plans"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explore Plans & Add-ons</span>
            </Link>
            <Link
              href="/app/dashboard"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center space-x-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
