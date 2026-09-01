"use client";

import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Receipt,
  FileText,
  Calendar,
  Download,
  Building2,
  RefreshCw,
  Wallet,
  Coins,
} from "lucide-react";
import { reportService } from "@/services/report-services";
import { FinancialSummaryReport } from "@/types";

export default function FinancialSummaryPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<FinancialSummaryReport | null>(null);
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await reportService.getSummaryDashboard(fromDate, toDate);
      setSummary(data);
    } catch (err) {
      console.error("Failed to load summary", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [fromDate, toDate]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <TrendingUp className="w-6 h-6" />
            </span>
            <span>Financial Executive Summary</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time business performance, cashflow, GST liability, and profit analysis.
          </p>
        </div>

        {/* Date Filter & Actions */}
        <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
          <div className="flex items-center space-x-2 px-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            />
            <span className="text-slate-500 text-xs font-semibold">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={loadSummary}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !summary ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-sm">Aggregating real-time financial metrics...</p>
        </div>
      ) : summary ? (
        <>
          {/* Top KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Sales Revenue */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 transition-all shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>TOTAL REVENUE (SALES)</span>
                <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-white">
                ₹{summary.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                <span>Invoices Issued</span>
                <span className="font-bold text-slate-200">{summary.totalInvoicesCount}</span>
              </div>
            </div>

            {/* Total Purchases */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 transition-all shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>TOTAL PURCHASES (COGS)</span>
                <span className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
                  <ArrowDownRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-white">
                ₹{summary.totalPurchases.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                <span>Bills Recorded</span>
                <span className="font-bold text-slate-200">{summary.totalPurchaseBillsCount}</span>
              </div>
            </div>

            {/* Gross / Net Profit */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-950 border border-indigo-800/40 hover:border-indigo-700/60 transition-all shadow-lg">
              <div className="flex items-center justify-between text-indigo-300 text-xs font-semibold mb-2">
                <span>ESTIMATED NET PROFIT</span>
                <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className={`text-2xl font-black ${summary.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                ₹{summary.netProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-indigo-300/80 border-t border-indigo-900/40 pt-2.5">
                <span>Gross Profit Margin</span>
                <span className="font-bold text-white">
                  {summary.totalSales > 0 ? ((summary.grossProfit / summary.totalSales) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Net GST Payable */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/30 to-slate-950 border border-amber-800/40 hover:border-amber-700/60 transition-all shadow-lg">
              <div className="flex items-center justify-between text-amber-300 text-xs font-semibold mb-2">
                <span>NET GST PAYABLE</span>
                <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                  <Coins className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-400">
                ₹{summary.netGstPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-amber-200/70 border-t border-amber-900/40 pt-2.5">
                <span>Output - Eligible ITC</span>
                <span className="font-bold text-white">Cash Liability</span>
              </div>
            </div>
          </div>

          {/* Cashflow & Working Capital Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cash Collections & Receivables */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span>Customer Receivables & Collections</span>
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div>
                    <div className="text-xs text-slate-400">Total Cash Collected</div>
                    <div className="text-lg font-bold text-emerald-400">
                      ₹{summary.totalCollected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Collection Rate</div>
                    <div className="text-sm font-semibold text-white">
                      {summary.totalSales > 0 ? ((summary.totalCollected / summary.totalSales) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div>
                    <div className="text-xs text-slate-400">Pending Customer Receivables (Udhaar)</div>
                    <div className="text-lg font-bold text-rose-400">
                      ₹{summary.totalPendingReceivables.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold rounded-lg">
                      Due from Debtors
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* GST Tax Breakdown */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-indigo-400" />
                  <span>GST Tax Breakdown</span>
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div>
                    <div className="text-xs text-slate-400">Output GST (Collected on Sales)</div>
                    <div className="text-lg font-bold text-white">
                      ₹{summary.outputGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">
                    GSTR-1 Liability
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div>
                    <div className="text-xs text-slate-400">Input Tax Credit (ITC Paid on Purchases)</div>
                    <div className="text-lg font-bold text-emerald-400">
                      ₹{summary.inputGstItc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    Eligible Credit
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
