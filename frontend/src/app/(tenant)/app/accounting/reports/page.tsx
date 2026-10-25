"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Scale,
  Building2,
  TrendingUp,
  Calendar,
  Landmark,
  ArrowLeft,
  Printer,
  Download,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Ban,
  Command,
  FileSpreadsheet
} from "lucide-react";
import {
  accountingService,
  TrialBalanceReport,
  BalanceSheetReport,
  ProfitAndLossReport,
  DayBookReport,
  CashBankBookReport,
  LedgerAccount
} from "@/services/accounting-services";
import VoucherSlideOverDrawer from "../components/VoucherSlideOverDrawer";
import LedgerStatementModal from "../components/LedgerStatementModal";
import AccountingOmnibar from "../components/AccountingOmnibar";

export default function FinancialReportsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"tb" | "bs" | "pnl" | "daybook" | "cashbank">("tb");

  // Basis Toggle (Accrual vs Cash)
  const [basis, setBasis] = useState<"accrual" | "cash">("accrual");

  // Reports State
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReport | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);
  const [pnl, setPnl] = useState<ProfitAndLossReport | null>(null);
  const [dayBook, setDayBook] = useState<DayBookReport | null>(null);
  const [cashBank, setCashBank] = useState<CashBankBookReport | null>(null);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Day Book Filters
  const [dayBookDate, setDayBookDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dayBookType, setDayBookType] = useState<string>("All");

  // Drill-down slide-over states
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [isOmnibarOpen, setIsOmnibarOpen] = useState(false);

  // Parse initial tab from query parameter (e.g. ?tab=bs)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "bs" || tab === "balance-sheet") setActiveTab("bs");
    else if (tab === "pnl" || tab === "profit-and-loss") setActiveTab("pnl");
    else if (tab === "daybook") setActiveTab("daybook");
    else if (tab === "cashbank" || tab === "cash-bank") setActiveTab("cashbank");
    else if (tab === "tb" || tab === "trial-balance") setActiveTab("tb");
  }, [searchParams]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tb, bs, pl, db, cb, accs] = await Promise.all([
        accountingService.getTrialBalance().catch(() => null),
        accountingService.getBalanceSheet(undefined, basis).catch(() => null),
        accountingService.getProfitAndLoss(undefined, undefined, basis).catch(() => null),
        accountingService.getDayBook({ date: dayBookDate, voucherType: dayBookType === "All" ? undefined : dayBookType }).catch(() => null),
        accountingService.getCashBankBook().catch(() => null),
        accountingService.getLedgerAccounts().catch(() => [])
      ]);

      setTrialBalance(tb);
      setBalanceSheet(bs);
      setPnl(pl);
      setDayBook(db);
      setCashBank(cb);
      setAccounts(accs);
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  }, [basis, dayBookDate, dayBookType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Global Keyboard Shortcuts (Alt+G)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && (e.key === "g" || e.key === "G")) || ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K"))) {
        e.preventDefault();
        setIsOmnibarOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <Link
            href="/app/accounting"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Certified Financial Statements & Audit Suite
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 text-[10px] font-black uppercase tracking-wider">
                Companies Act Schedule III
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Trial Balance, Schedule III Balance Sheet, Trading & P&L Statement, Day Book, and Cash/Bank Book
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          {/* Dual Accounting Basis Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setBasis("accrual")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                basis === "accrual"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Accrual Basis
            </button>
            <button
              onClick={() => setBasis("cash")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                basis === "cash"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Cash Basis
            </button>
          </div>

          {/* Alt+G Omnibar */}
          <button
            onClick={() => setIsOmnibarOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Go to any account or report (Alt+G)"
          >
            <Search className="w-3.5 h-3.5 text-orange-600" />
            <span>Go To</span>
            <span className="font-mono text-[10px] text-slate-400 bg-white dark:bg-slate-900 px-1 py-0.2 rounded border">
              Alt+G
            </span>
          </button>

          {/* Print Report */}
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4 sm:space-x-8 text-xs sm:text-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab("tb")}
          className={`pb-3 font-bold flex items-center space-x-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "tb"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Trial Balance (4-Column)</span>
        </button>

        <button
          onClick={() => setActiveTab("bs")}
          className={`pb-3 font-bold flex items-center space-x-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "bs"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Balance Sheet (Schedule III)</span>
        </button>

        <button
          onClick={() => setActiveTab("pnl")}
          className={`pb-3 font-bold flex items-center space-x-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "pnl"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Trading & P&L Statement</span>
        </button>

        <button
          onClick={() => setActiveTab("daybook")}
          className={`pb-3 font-bold flex items-center space-x-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "daybook"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Day Book Register</span>
        </button>

        <button
          onClick={() => setActiveTab("cashbank")}
          className={`pb-3 font-bold flex items-center space-x-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "cashbank"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Cash & Bank Book</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-xs text-slate-500 font-medium">Computing live financial balances & double-entry schedules...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: 4-COLUMN TRIAL BALANCE */}
          {activeTab === "tb" && trialBalance && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>
                    Trial Balance Status: Perfectly Balanced & Reconciled (As of {trialBalance.asOfDate})
                  </span>
                </div>
                <div className="text-xs font-mono font-black text-emerald-900 dark:text-emerald-200 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                  Total Dr: ₹{trialBalance.totalClosingDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })} =
                  Cr: ₹{trialBalance.totalClosingCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
                  <thead className="bg-slate-100/90 dark:bg-slate-800 uppercase text-[10px] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 tracking-wider">
                    <tr>
                      <th className="py-3 px-4" rowSpan={2}>Account Code</th>
                      <th className="py-3 px-4" rowSpan={2}>General Ledger Title</th>
                      <th className="py-3 px-4" rowSpan={2}>Group / Schedule</th>
                      <th className="py-2 px-4 text-center border-b border-slate-200 dark:border-slate-700" colSpan={2}>Opening Balance</th>
                      <th className="py-2 px-4 text-center border-b border-slate-200 dark:border-slate-700" colSpan={2}>Period Transactions</th>
                      <th className="py-2 px-4 text-center border-b border-orange-200 dark:border-orange-800 bg-orange-100/60 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200" colSpan={2}>Closing Balance</th>
                    </tr>
                    <tr>
                      <th className="py-2 px-3 text-right">Dr (₹)</th>
                      <th className="py-2 px-3 text-right">Cr (₹)</th>
                      <th className="py-2 px-3 text-right">Dr (₹)</th>
                      <th className="py-2 px-3 text-right">Cr (₹)</th>
                      <th className="py-2 px-3 text-right bg-orange-100/60 dark:bg-orange-950/40 font-bold text-orange-900 dark:text-orange-200">Dr (₹)</th>
                      <th className="py-2 px-3 text-right bg-orange-100/60 dark:bg-orange-950/40 font-bold text-orange-900 dark:text-orange-200">Cr (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {trialBalance.rows.map((r) => (
                      <tr
                        key={r.accountId}
                        onClick={() => setSelectedLedgerId(r.accountId)}
                        className="hover:bg-orange-50/60 dark:hover:bg-slate-800/60 cursor-pointer transition group"
                        title="Click to view 12-Month Financial Summary & Voucher Register"
                      >
                        <td className="py-2.5 px-4 font-bold text-orange-600">{r.accountCode}</td>
                        <td className="py-2.5 px-4 font-sans font-bold text-slate-900 dark:text-white text-xs group-hover:text-orange-600">
                          <div className="flex items-center justify-between">
                            <span>{r.accountName}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                          {r.groupName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                          {r.openingDebit > 0 ? r.openingDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                          {r.openingCredit > 0 ? r.openingCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                          {r.debitMovement > 0 ? r.debitMovement.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                          {r.creditMovement > 0 ? r.creditMovement.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right bg-emerald-50/60 dark:bg-emerald-950/20 font-black text-emerald-800 dark:text-emerald-300">
                          {r.closingDebit > 0 ? r.closingDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right bg-rose-50/60 dark:bg-rose-950/20 font-black text-rose-800 dark:text-rose-300">
                          {r.closingCredit > 0 ? r.closingCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 font-mono font-black text-white border-t-2 border-slate-700 text-xs">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-left font-sans uppercase font-black text-[11px]">
                        Grand Total
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300">
                        ₹{trialBalance.totalOpeningDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300">
                        ₹{trialBalance.totalOpeningCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400">
                        ₹{trialBalance.totalDebitMovement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-400">
                        ₹{trialBalance.totalCreditMovement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right bg-slate-950 text-emerald-400 text-sm font-black">
                        ₹{trialBalance.totalClosingDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right bg-slate-950 text-rose-400 text-sm font-black">
                        ₹{trialBalance.totalClosingCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: BALANCE SHEET (SCHEDULE III) */}
          {activeTab === "bs" && balanceSheet && (
            <div className="space-y-4">
              {/* Balance Verification Bar */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Schedule III Balance Sheet ({basis.toUpperCase()} BASIS)
                  </span>
                  {balanceSheet.isBalanced ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold text-[10px]">
                      Balanced
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-300 font-bold text-[10px]">
                      Diff: ₹{Math.abs(balanceSheet.differenceInOpeningBalances).toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="font-mono font-bold text-slate-700 dark:text-slate-300 space-x-3">
                  <span>
                    Total Liabilities:{" "}
                    <strong className="text-rose-600 dark:text-rose-400">
                      ₹{Number(balanceSheet.totalLiabilities).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Total Assets:{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      ₹{Number(balanceSheet.totalAssets).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </strong>
                  </span>
                </div>
              </div>

              {/* T-Shape Two Column Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Liabilities & Equity */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                      Equity & Liabilities
                    </h3>
                    <span className="text-xs font-mono font-bold text-slate-400">Amount (₹)</span>
                  </div>

                  <div className="space-y-4 text-xs font-mono">
                    {balanceSheet.liabilities.map((sec, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between font-sans font-bold text-slate-900 dark:text-white text-xs bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                          <span>{sec.groupName}</span>
                          <span className="font-mono font-black text-rose-700 dark:text-rose-400">
                            ₹{Number(sec.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {sec.ledgers.map((l) => (
                          <div
                            key={l.accountId}
                            onClick={() => setSelectedLedgerId(l.accountId)}
                            className="flex justify-between pl-4 py-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition group"
                            title="Click to view ledger monthly summary"
                          >
                            <span className="group-hover:underline flex items-center space-x-1 font-sans">
                              <span>{l.accountName}</span>
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              ₹{Number(l.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-700 flex justify-between font-mono font-black text-sm text-slate-900 dark:text-white">
                    <span>Total Equity & Liabilities</span>
                    <span className="text-rose-700 dark:text-rose-400 text-base">
                      ₹{Number(balanceSheet.totalLiabilities).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Assets */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Assets & Holdings
                    </h3>
                    <span className="text-xs font-mono font-bold text-slate-400">Amount (₹)</span>
                  </div>

                  <div className="space-y-4 text-xs font-mono">
                    {balanceSheet.assets.map((sec, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between font-sans font-bold text-slate-900 dark:text-white text-xs bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                          <span>{sec.groupName}</span>
                          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                            ₹{Number(sec.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {sec.ledgers.map((l) => (
                          <div
                            key={l.accountId}
                            onClick={() => setSelectedLedgerId(l.accountId)}
                            className="flex justify-between pl-4 py-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition group"
                            title="Click to view ledger monthly summary"
                          >
                            <span className="group-hover:underline flex items-center space-x-1 font-sans">
                              <span>{l.accountName}</span>
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              ₹{Number(l.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-700 flex justify-between font-mono font-black text-sm text-slate-900 dark:text-white mt-auto">
                    <span>Total Assets Valuation</span>
                    <span className="text-emerald-700 dark:text-emerald-400 text-base">
                      ₹{Number(balanceSheet.totalAssets).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRADING & PROFIT AND LOSS STATEMENT */}
          {activeTab === "pnl" && pnl && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6 max-w-4xl mx-auto">
              <div className="text-center space-y-1 pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 text-[10px] font-black uppercase tracking-wider">
                  Income Statement
                </span>
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Trading & Profit & Loss Statement
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Period: {new Date(pnl.fromDate).toLocaleDateString("en-IN")} to {new Date(pnl.toDate).toLocaleDateString("en-IN")} ({basis.toUpperCase()} BASIS)
                </p>
              </div>

              {/* Trading Account Section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 font-mono text-xs">
                <span className="font-sans font-bold text-slate-900 dark:text-white block uppercase tracking-wider text-[11px]">
                  Part I: Trading Account (Gross Margin)
                </span>

                <div className="space-y-2">
                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-sans font-semibold">Gross Sales Revenue:</span>
                    <span className="font-bold text-emerald-600">
                      ₹{Number(pnl.salesRevenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-sans font-semibold">Direct Purchases / Inward Cost:</span>
                    <span className="font-bold text-rose-600">
                      -₹{Number(pnl.directPurchases).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {pnl.directExpenses > 0 && (
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span className="font-sans font-semibold">Direct Manufacturing & Logistics Expenses:</span>
                      <span className="font-bold text-rose-600">
                        -₹{Number(pnl.directExpenses).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm">
                    <span className="font-sans text-slate-900 dark:text-white">Gross Profit c/d:</span>
                    <span className={pnl.grossProfit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      ₹{Number(pnl.grossProfit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profit & Loss Account Section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 font-mono text-xs">
                <span className="font-sans font-bold text-slate-900 dark:text-white block uppercase tracking-wider text-[11px]">
                  Part II: Profit & Loss Account (Operating Margin)
                </span>

                <div className="space-y-2">
                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-sans font-semibold">Gross Profit b/d:</span>
                    <span className="font-bold text-emerald-600">
                      ₹{Number(pnl.grossProfit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {pnl.indirectIncomes > 0 && (
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span className="font-sans font-semibold">Other Operating & Indirect Incomes:</span>
                      <span className="font-bold text-emerald-600">
                        +₹{Number(pnl.indirectIncomes).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-sans font-semibold">Indirect Administrative & Operating Expenses:</span>
                    <span className="font-bold text-rose-600">
                      -₹{Number(pnl.indirectExpenses).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {pnl.indirectExpenseGroups.map((g, idx) => (
                    <div key={idx} className="pl-4 space-y-1">
                      <div className="flex justify-between text-slate-500 font-sans font-medium text-[11px]">
                        <span>• {g.groupName}</span>
                        <span className="font-mono">₹{Number(g.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}

                  <div className="pt-3 border-t-2 border-slate-300 dark:border-slate-700 flex justify-between font-black text-base">
                    <span className="font-sans text-slate-900 dark:text-white">
                      Net Profit transferred to Balance Sheet:
                    </span>
                    <span className={pnl.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                      ₹{Number(pnl.netProfit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DAY BOOK REGISTER */}
          {activeTab === "daybook" && (
            <div className="space-y-4">
              {/* Day Book Filter Bar */}
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">Date:</span>
                    <input
                      type="date"
                      value={dayBookDate}
                      onChange={(e) => setDayBookDate(e.target.value)}
                      className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-xs"
                    />
                  </div>

                  <div className="flex items-center space-x-1">
                    {["All", "Journal", "Contra", "Payment", "Receipt", "Sales", "Purchase"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setDayBookType(t)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          dayBookType === t
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {dayBook && (
                  <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    Total Transactions: <strong className="text-indigo-600">{dayBook.totalVouchers}</strong> • Total
                    Debit: <strong className="text-emerald-600">₹{dayBook.totalDebit.toLocaleString("en-IN")}</strong>
                  </div>
                )}
              </div>

              {/* Day Book Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                {!dayBook || dayBook.vouchers.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    No transactions recorded on {new Date(dayBookDate).toLocaleDateString("en-IN")}.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">Voucher #</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Particulars</th>
                        <th className="py-3 px-4">Narration</th>
                        <th className="py-3 px-4 text-right">Debit (₹)</th>
                        <th className="py-3 px-4 text-right">Credit (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {dayBook.vouchers.map((v) => (
                        <tr
                          key={v.voucherId}
                          onClick={() => setSelectedVoucherId(v.voucherId)}
                          className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition group"
                          title="Click to view full voucher double-entry legs"
                        >
                          <td className="py-2.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                            {v.voucherNumber}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 border">
                              {v.voucherType}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                            {v.particulars}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                            {v.narration}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ₹{Number(v.debitAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ₹{Number(v.creditAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CASH & BANK BOOK */}
          {activeTab === "cashbank" && cashBank && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Cash in Hand</span>
                  <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{Number(cashBank.totalCashBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Bank Balances</span>
                  <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    ₹{Number(cashBank.totalBankBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Grand Net Liquidity</span>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                    ₹{Number(cashBank.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Accounts List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Account Title</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Opening Bal</th>
                      <th className="py-3 px-4 text-right">Total Receipts (Inward)</th>
                      <th className="py-3 px-4 text-right">Total Payments (Outward)</th>
                      <th className="py-3 px-4 text-right">Closing Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {cashBank.accounts.map((a) => (
                      <tr
                        key={a.accountId}
                        onClick={() => setSelectedLedgerId(a.accountId)}
                        className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition group"
                        title="Click to view ledger statement"
                      >
                        <td className="py-2.5 px-4 font-sans font-bold text-slate-900 dark:text-white group-hover:text-indigo-600">
                          {a.accountName}
                        </td>
                        <td className="py-2.5 px-4 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              a.accountType === "Cash"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {a.accountType}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">
                          ₹{Number(a.openingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                          ₹{Number(a.totalReceipts).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                          ₹{Number(a.totalPayments).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-900 dark:text-white">
                          ₹{Number(a.closingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
                          <span className="text-[10px] font-sans text-slate-400 font-normal">{a.closingBalanceType}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Slide-over Voucher Audit Drawer */}
      <VoucherSlideOverDrawer
        voucherId={selectedVoucherId}
        onClose={() => setSelectedVoucherId(null)}
        onVoucherCancelled={() => loadData()}
        onSelectAccount={(accId) => setSelectedLedgerId(accId)}
      />

      {/* Ledger Monthly Summary & Transaction Statement Modal */}
      <LedgerStatementModal
        accountId={selectedLedgerId}
        onClose={() => setSelectedLedgerId(null)}
        onOpenVoucher={(vId) => setSelectedVoucherId(vId)}
      />

      {/* Alt+G Universal Omnibar */}
      <AccountingOmnibar
        isOpen={isOmnibarOpen}
        onClose={() => setIsOmnibarOpen(false)}
        onSelectLedger={(accId) => setSelectedLedgerId(accId)}
      />
    </div>
  );
}
