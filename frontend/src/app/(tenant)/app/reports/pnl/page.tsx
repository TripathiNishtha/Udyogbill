"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Download,
  Calendar,
  RefreshCw,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { p0ReportService, TruePnLReport } from "@/services/p0-reports.service";
import { ReportExportToolbar } from "@/components/reports/report-export-toolbar";
import { QuickReportJumpBar } from "@/components/reports/quick-report-jump-bar";

export default function ProfitAndLossPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [pnl, setPnl] = useState<TruePnLReport | null>(null);

  const loadPnL = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await p0ReportService.getTruePnL({ fromDate, toDate });
      setPnl(data);
    } catch (err: any) {
      console.error("Failed to load True P&L", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to calculate P&L from ledger entries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPnL();
  }, [fromDate, toDate]);

  const handleExportCsv = async () => {
    try {
      await p0ReportService.exportReportCsv("true-pnl", { fromDate, toDate });
    } catch (err) {
      console.error("CSV Export failed", err);
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val);
  };
  const exportHeaders = ["Financial Head", "Classification", "Amount (INR)", "Notes"];
  const exportRows = [
    ["Gross Sales Turnover", "Revenue", (pnl?.grossSalesRevenue || 0).toFixed(2), "Total billed outward sales"],
    ["Sales Returns & Deductions", "Contra-Revenue", `-${(pnl?.salesReturnAmount || 0).toFixed(2)}`, "Credit notes & returns"],
    ["Net Operational Revenue", "Revenue (Net)", (pnl?.netSalesRevenue || 0).toFixed(2), "Gross Sales - Returns"],
    ["Opening Inventory", "Cost of Goods Sold", (pnl?.openingStockValuation || 0).toFixed(2), "Beginning stock valuation"],
    ["Gross Purchases", "Cost of Goods Sold", (pnl?.netPurchasesAmount || 0).toFixed(2), "Inward procurement"],
    ["Closing Inventory", "Cost of Goods Sold", `-${(pnl?.closingStockValuation || 0).toFixed(2)}`, "Ending stock valuation"],
    ["Total COGS (Cost of Goods Sold)", "COGS", (pnl?.totalCostOfGoodsSold || 0).toFixed(2), "Opening + Purchases - Closing"],
    ["Gross Profit / Margin", "Gross Profit", (pnl?.grossProfitAmount || 0).toFixed(2), `${((pnl?.grossProfitMarginPercent || 0)).toFixed(2)}% of Net Revenue`],
    ["Indirect / Operating Expenses", "Overheads", (pnl?.totalOperatingExpenses || 0).toFixed(2), "Salaries, rent, utilities, administration"],
    ["Net Operating Profit", "Net Profit", (pnl?.netProfitAmount || 0).toFixed(2), `${((pnl?.netProfitMarginPercent || 0)).toFixed(2)}% Net Margin`]
  ];

  const summaryExportData = {
    "Net Revenue": formatCurrency(pnl?.netSalesRevenue),
    "Cost of Goods Sold (COGS)": formatCurrency(pnl?.totalCostOfGoodsSold),
    "Gross Profit": formatCurrency(pnl?.grossProfitAmount),
    "Operating Expenses": formatCurrency(pnl?.totalOperatingExpenses),
    "Net Accounting Profit": formatCurrency(pnl?.netProfitAmount)
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Quick Jump Bar */}
      <QuickReportJumpBar currentReportTitle="True Profit & Loss (P&L)" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-6 h-6" />
            </span>
            <span>True Profit &amp; Loss (P&amp;L) Statement</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Certified accounting computation: Net Revenue &minus; True COGS (Opening + Purchases &minus; Closing) &minus; Actual Operating Expenses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadPnL()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Refresh P&L Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Reload Data</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={loadPnL}
          disabled={loading}
          className="flex items-center space-x-2 px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Applying...</span>
            </>
          ) : (
            <span>Apply Filters</span>
          )}
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadPnL}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !pnl ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3 rounded-2xl bg-slate-900 border border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-sm font-semibold">Calculating true profit & loss from ledger entries...</p>
        </div>
      ) : pnl ? (
        <div className="space-y-6">
          {/* Top Margins Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Net Sales Revenue</div>
              <div className="text-2xl font-black text-white mt-1">
                {formatCurrency(pnl.netSalesRevenue)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Gross {formatCurrency(pnl.grossSalesRevenue)} &minus; Returns {formatCurrency(pnl.salesReturnAmount)}
              </div>
            </div>

            <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">True COGS</div>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {formatCurrency(pnl.totalCostOfGoodsSold)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">Opening + Net Purchases &minus; Closing</div>
            </div>

            <div className="p-5 bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl shadow-lg">
              <div className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider">Gross Profit</div>
              <div className={`text-2xl font-black mt-1 ${pnl.grossProfitAmount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatCurrency(pnl.grossProfitAmount)}
              </div>
              <div className="mt-1 text-[11px] text-indigo-300/80 font-bold">
                Margin: {pnl.grossProfitMarginPercent}%
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-2xl shadow-lg">
              <div className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider">Net Profit</div>
              <div className={`text-2xl font-black mt-1 ${pnl.netProfitAmount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatCurrency(pnl.netProfitAmount)}
              </div>
              <div className="mt-1 text-[11px] text-emerald-300/80 font-bold">
                Net Margin: {pnl.netProfitMarginPercent}%
              </div>
            </div>
          </div>

          {/* Detailed Statement Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Waterfall Financial Statement */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl divide-y divide-slate-800">
              <div className="p-4 bg-slate-950/80 font-bold text-xs text-white uppercase tracking-wider flex flex-wrap items-center justify-between gap-3">
                <span>Income Statement Breakdown</span>

                {/* Universal Export Toolbar */}
                <ReportExportToolbar
                  title="True Profit & Loss (P&L) Statement"
                  fileName="pnl_income_statement"
                  headers={exportHeaders}
                  rows={exportRows}
                  summaryData={summaryExportData}
                  dateRangeText={`${new Date(fromDate).toLocaleDateString("en-IN")} to ${new Date(toDate).toLocaleDateString("en-IN")}`}
                />

                <span className="font-mono text-indigo-400 lowercase text-[11px]">
                  Period: {new Date(fromDate).toLocaleDateString("en-IN")} — {new Date(toDate).toLocaleDateString("en-IN")}
                </span>
              </div>

              {/* 1. Revenue */}
              <div className="p-4 space-y-2 text-xs">
                <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>1. Net Sales Revenue</span>
                  <span className="text-emerald-400 font-mono font-bold">{formatCurrency(pnl.netSalesRevenue)}</span>
                </div>
                <div className="pl-4 space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Gross Invoiced Sales</span>
                    <span className="font-mono text-white">{formatCurrency(pnl.grossSalesRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Less: Sales Returns / Credit Notes</span>
                    <span className="font-mono text-rose-400">&minus; {formatCurrency(pnl.salesReturnAmount)}</span>
                  </div>
                </div>
              </div>

              {/* 2. COGS */}
              <div className="p-4 space-y-2 text-xs bg-slate-950/20">
                <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>2. Cost of Goods Sold (COGS)</span>
                  <span className="text-rose-400 font-mono font-bold">&minus; {formatCurrency(pnl.totalCostOfGoodsSold)}</span>
                </div>
                <div className="pl-4 space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Opening Inventory Valuation</span>
                    <span className="font-mono text-white">{formatCurrency(pnl.openingStockValuation)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Add: Net Purchases (Procurement)</span>
                    <span className="font-mono text-white">+{formatCurrency(pnl.netPurchasesAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Less: Closing Inventory Valuation</span>
                    <span className="font-mono text-emerald-400">&minus; {formatCurrency(pnl.closingStockValuation)}</span>
                  </div>
                </div>
              </div>

              {/* Gross Profit Banner */}
              <div className="p-4 bg-indigo-950/30 flex justify-between items-center text-xs font-black border-y border-indigo-500/20">
                <span className="text-indigo-300 uppercase tracking-wider">Gross Operating Profit</span>
                <span className={`font-mono text-sm ${pnl.grossProfitAmount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatCurrency(pnl.grossProfitAmount)}
                </span>
              </div>

              {/* 3. Operating Expenses */}
              <div className="p-4 space-y-2 text-xs">
                <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>3. Total Operating Expenses</span>
                  <span className="text-rose-400 font-mono font-bold">&minus; {formatCurrency(pnl.totalOperatingExpenses)}</span>
                </div>
                <div className="pl-4 space-y-1 text-slate-400">
                  {!pnl.operatingExpenses || pnl.operatingExpenses.length === 0 ? (
                    <div className="text-slate-500 italic">No expense vouchers recorded for this period.</div>
                  ) : (
                    pnl.operatingExpenses.map((exp) => (
                      <div key={exp.categoryId} className="flex justify-between">
                        <span>{exp.categoryName}</span>
                        <span className="font-mono text-white">
                          {formatCurrency(exp.amount)} ({exp.percentageOfRevenue}%)
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Net Profit Final */}
              <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 flex justify-between items-center text-sm font-black border-t-2 border-slate-700">
                <span className="text-white uppercase tracking-wider">Final Net Profit</span>
                <span className={`font-mono text-xl ${pnl.netProfitAmount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatCurrency(pnl.netProfitAmount)}
                </span>
              </div>
            </div>

            {/* Right 1 Col: Operating Expenses Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                <span>Operating Expenses Breakdown</span>
              </h3>
              <p className="text-xs text-slate-400">
                Categorized overhead derived from registered business expense vouchers.
              </p>

              <div className="space-y-3 pt-2">
                {!pnl.operatingExpenses || pnl.operatingExpenses.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                    No operating expenses filed.
                  </div>
                ) : (
                  pnl.operatingExpenses.map((exp) => (
                    <div key={exp.categoryId} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-200">
                        <span>{exp.categoryName}</span>
                        <span className="font-mono text-rose-400">{formatCurrency(exp.amount)}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, exp.percentageOfRevenue * 2)}%` }}
                        ></div>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono text-right">
                        {exp.percentageOfRevenue}% of revenue
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
