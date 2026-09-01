"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  ArrowLeft,
  Printer,
  Download,
  CheckCircle,
  TrendingUp,
  Scale,
  Building2,
  PieChart
} from "lucide-react";
import {
  accountingService,
  TrialBalanceReport,
  BalanceSheetReport,
  ProfitAndLossReport
} from "@/services/accounting-services";

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState<"tb" | "bs" | "pnl">("tb");
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReport | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);
  const [pnl, setPnl] = useState<ProfitAndLossReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      const [tb, bs, pl] = await Promise.all([
        accountingService.getTrialBalance(),
        accountingService.getBalanceSheet(),
        accountingService.getProfitAndLoss()
      ]);
      setTrialBalance(tb);
      setBalanceSheet(bs);
      setPnl(pl);
      setLoading(false);
    };
    loadReports();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <Link
            href="/app/accounting"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Certified Financial Statements</h1>
            <p className="text-sm text-slate-400">4-Column Trial Balance, Live Balance Sheet, and P&L Account</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6">
        <button
          onClick={() => setActiveTab("tb")}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === "tb"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>4-Column Trial Balance</span>
        </button>

        <button
          onClick={() => setActiveTab("bs")}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === "bs"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Balance Sheet (Certified)</span>
        </button>

        <button
          onClick={() => setActiveTab("pnl")}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === "pnl"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Profit & Loss Account</span>
        </button>
      </div>

      {/* TAB 1: TRIAL BALANCE */}
      {activeTab === "tb" && trialBalance && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>Trial Balance Status: Perfectly Balanced & Reconciled (As of {trialBalance.asOfDate})</span>
            </div>
            <div className="text-xs font-mono font-bold text-white">
              Total Closing Dr: ₹{trialBalance.totalClosingDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })} =
              Cr: ₹{trialBalance.totalClosingCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/90 uppercase text-[11px] text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4" rowSpan={2}>Code</th>
                    <th className="py-3 px-4" rowSpan={2}>Account Particulars</th>
                    <th className="py-3 px-4" rowSpan={2}>Group / Category</th>
                    <th className="py-2 px-4 text-center border-b border-slate-800" colSpan={2}>Opening Balance</th>
                    <th className="py-2 px-4 text-center border-b border-slate-800" colSpan={2}>Period Transactions</th>
                    <th className="py-2 px-4 text-center border-b border-slate-800 bg-indigo-950/30" colSpan={2}>Closing Balance</th>
                  </tr>
                  <tr>
                    <th className="py-2 px-3 text-right">Dr (₹)</th>
                    <th className="py-2 px-3 text-right">Cr (₹)</th>
                    <th className="py-2 px-3 text-right">Dr (₹)</th>
                    <th className="py-2 px-3 text-right">Cr (₹)</th>
                    <th className="py-2 px-3 text-right bg-indigo-950/30 font-bold text-indigo-300">Dr (₹)</th>
                    <th className="py-2 px-3 text-right bg-indigo-950/30 font-bold text-indigo-300">Cr (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {trialBalance.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-4 font-bold text-indigo-400">{r.accountCode}</td>
                      <td className="py-2.5 px-4 font-sans font-medium text-white">{r.accountName}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-400">{r.groupName}</td>
                      <td className="py-2.5 px-3 text-right">{r.openingDebit > 0 ? r.openingDebit.toLocaleString("en-IN") : "-"}</td>
                      <td className="py-2.5 px-3 text-right">{r.openingCredit > 0 ? r.openingCredit.toLocaleString("en-IN") : "-"}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400">{r.debitMovement > 0 ? r.debitMovement.toLocaleString("en-IN") : "-"}</td>
                      <td className="py-2.5 px-3 text-right text-rose-400">{r.creditMovement > 0 ? r.creditMovement.toLocaleString("en-IN") : "-"}</td>
                      <td className="py-2.5 px-3 text-right bg-indigo-950/20 font-bold text-emerald-300">{r.closingDebit > 0 ? r.closingDebit.toLocaleString("en-IN") : "-"}</td>
                      <td className="py-2.5 px-3 text-right bg-indigo-950/20 font-bold text-rose-300">{r.closingCredit > 0 ? r.closingCredit.toLocaleString("en-IN") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-950 font-mono font-black text-white border-t-2 border-slate-700">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-left font-sans uppercase">Total Summary (Balancing)</td>
                    <td className="py-3 px-3 text-right">₹{trialBalance.totalOpeningDebit.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-right">₹{trialBalance.totalOpeningCredit.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-right text-emerald-400">₹{trialBalance.totalDebitMovement.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-right text-rose-400">₹{trialBalance.totalCreditMovement.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-right bg-indigo-950/40 text-emerald-400 text-sm">₹{trialBalance.totalClosingDebit.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-right bg-indigo-950/40 text-rose-400 text-sm">₹{trialBalance.totalClosingCredit.toLocaleString("en-IN")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BALANCE SHEET */}
      {activeTab === "bs" && balanceSheet && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Liabilities & Equity */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-rose-400 border-b border-slate-800 pb-2 uppercase tracking-wider">
              Liabilities & Equity
            </h3>
            <div className="space-y-4 text-xs font-mono">
              <div className="space-y-2">
                <span className="font-sans font-bold text-slate-300 block">Capital & Equity:</span>
                {balanceSheet.equity[0]?.accounts.map((acc, i) => (
                  <div key={i} className="flex justify-between pl-4 text-slate-400">
                    <span>{acc.accountName}</span>
                    <span className="text-white">₹{acc.balance.toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div className="flex justify-between pl-4 text-emerald-400 font-bold pt-1">
                  <span>Current Period Net Profit (P&amp;L)</span>
                  <span>+₹{balanceSheet.currentPeriodProfit.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800/60">
                <span className="font-sans font-bold text-slate-300 block">Current Liabilities & Duties:</span>
                {balanceSheet.liabilities[0]?.accounts.map((acc, i) => (
                  <div key={i} className="flex justify-between pl-4 text-slate-400">
                    <span>{acc.accountName}</span>
                    <span className="text-white">₹{acc.balance.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t-2 border-slate-700 flex justify-between font-mono font-black text-sm text-white">
              <span>Total Liabilities &amp; Capital</span>
              <span className="text-rose-400">₹{balanceSheet.totalLiabilitiesAndEquity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Assets */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-emerald-400 border-b border-slate-800 pb-2 uppercase tracking-wider">
              Assets & Holdings
            </h3>
            <div className="space-y-4 text-xs font-mono">
              <div className="space-y-2">
                <span className="font-sans font-bold text-slate-300 block">Current & Fixed Assets:</span>
                {balanceSheet.assets[0]?.accounts.map((acc, i) => (
                  <div key={i} className="flex justify-between pl-4 text-slate-400">
                    <span>{acc.accountName}</span>
                    <span className="text-white">₹{acc.balance.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t-2 border-slate-700 flex justify-between font-mono font-black text-sm text-white mt-auto">
              <span>Total Assets Valuation</span>
              <span className="text-emerald-400">₹{balanceSheet.totalAssets.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROFIT & LOSS */}
      {activeTab === "pnl" && pnl && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 max-w-4xl mx-auto">
          <div className="text-center space-y-1 pb-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">Profit &amp; Loss Statement</h2>
            <p className="text-xs text-slate-400 font-mono">Period: {pnl.fromPeriod} to {pnl.toPeriod}</p>
          </div>

          <div className="space-y-4 text-xs font-mono">
            {/* Revenue */}
            <div className="space-y-2">
              <div className="flex justify-between font-sans font-bold text-sm text-blue-400">
                <span>1. Operating Sales Revenue</span>
                <span>₹{pnl.totalRevenue.toLocaleString("en-IN")}</span>
              </div>
              {pnl.revenues[0]?.accounts.map((a, i) => (
                <div key={i} className="flex justify-between pl-4 text-slate-400">
                  <span>{a.accountName}</span>
                  <span className="text-white">₹{a.balance.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>

            {/* COGS */}
            <div className="flex justify-between font-sans font-bold text-xs text-slate-300 pt-2 border-t border-slate-800">
              <span>Less: Cost of Goods Sold (Purchase &amp; Direct Stock Cost)</span>
              <span className="text-rose-400 font-mono">-₹{pnl.costOfGoodsSold.toLocaleString("en-IN")}</span>
            </div>

            {/* Gross Profit */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between font-black text-sm text-emerald-400">
              <span>Gross Profit (Margin: {pnl.grossMarginPercent.toFixed(1)}%)</span>
              <span>₹{pnl.grossProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Indirect Expenses */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between font-sans font-bold text-xs text-amber-400">
                <span>Less: Operating &amp; Administrative Expenses</span>
                <span className="text-rose-400 font-mono">-₹{pnl.totalExpenses.toLocaleString("en-IN")}</span>
              </div>
              {pnl.expenses[0]?.accounts.map((a, i) => (
                <div key={i} className="flex justify-between pl-4 text-slate-400">
                  <span>{a.accountName}</span>
                  <span className="text-white">₹{a.balance.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>

            {/* Net Profit */}
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex justify-between font-black text-base text-white">
              <span>Net Profit (Net Margin: {pnl.netMarginPercent.toFixed(1)}%)</span>
              <span className="text-emerald-400">₹{pnl.netProfitOrLoss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
