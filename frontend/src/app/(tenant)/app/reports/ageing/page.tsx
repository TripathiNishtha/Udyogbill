"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  Download,
  Calendar,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  p0ReportService,
  DebtorAgeingReport,
  CreditorAgeingReport,
} from "@/services/p0-reports.service";

export default function AgeingSchedulesPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "creditors" ? "creditors" : "debtors";

  const [activeTab, setActiveTab] = useState<"debtors" | "creditors">(initialTab);
  const [viewMode, setViewMode] = useState<"summary" | "invoices">("summary");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [asOfDate, setAsOfDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Data
  const [debtorData, setDebtorData] = useState<DebtorAgeingReport | null>(null);
  const [creditorData, setCreditorData] = useState<CreditorAgeingReport | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      if (activeTab === "debtors") {
        const res = await p0ReportService.getDebtorAgeing({ toDate: asOfDate });
        setDebtorData(res);
      } else {
        const res = await p0ReportService.getCreditorAgeing({ toDate: asOfDate });
        setCreditorData(res);
      }
    } catch (err: any) {
      console.error("Failed to load ageing report", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to retrieve ageing schedule from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, asOfDate]);

  const handleExportCsv = async () => {
    try {
      if (activeTab === "debtors") {
        await p0ReportService.exportReportCsv("debtor-ageing", { toDate: asOfDate });
      } else {
        await p0ReportService.exportReportCsv("creditor-ageing", { toDate: asOfDate });
      }
    } catch (err) {
      console.error("CSV Export failed", err);
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Link href="/app/reports" className="hover:text-white transition-colors">
          Report Center
        </Link>
        <span>/</span>
        <span className="text-slate-200">Ageing Schedules</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <Clock className="w-6 h-6" />
            </span>
            <span>Accounts Receivable & Payable Ageing</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Overdue aging computed against actual invoice due dates across standard 9 calendar slabs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export RFC-4180 CSV</span>
          </button>
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 gap-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("debtors")}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === "debtors"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            <span>Debtor Ageing Schedule (A/R)</span>
          </button>
          <button
            onClick={() => setActiveTab("creditors")}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === "creditors"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            <span>Creditor Ageing Schedule (A/P)</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 pb-2">
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode("summary")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                viewMode === "summary" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Summary By Party
            </button>
            <button
              onClick={() => setViewMode("invoices")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                viewMode === "invoices" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Invoice Itemized
            </button>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>As Of Date:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            />
          </div>

          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <span>Apply Filters</span>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => loadData()}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Slabs Overview Scorecards */}
      {activeTab === "debtors" && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Receivable</div>
            <div className="text-xl font-black text-white mt-1">{formatCurrency(debtorData?.grandTotalReceivable)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{debtorData?.customerSummaries?.length ?? 0} Debtors</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Not Due Yet</div>
            <div className="text-xl font-black text-emerald-400 mt-1">{formatCurrency(debtorData?.grandNotDue)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Within credit days</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Overdue</div>
            <div className="text-xl font-black text-rose-400 mt-1">{formatCurrency(debtorData?.grandOverdue)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Immediate collection needed</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">1 - 30 Days</div>
            <div className="text-xl font-black text-amber-400 mt-1">
              {formatCurrency((debtorData?.totalDays1To15 ?? 0) + (debtorData?.totalDays16To30 ?? 0))}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Recent default</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">31 - 90 Days</div>
            <div className="text-xl font-black text-amber-500 mt-1">
              {formatCurrency((debtorData?.totalDays31To45 ?? 0) + (debtorData?.totalDays46To60 ?? 0) + (debtorData?.totalDays61To90 ?? 0))}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Moderate aging</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">90+ Days Critical</div>
            <div className="text-xl font-black text-rose-500 mt-1">
              {formatCurrency((debtorData?.totalDays91To180 ?? 0) + (debtorData?.totalDays181To365 ?? 0) + (debtorData?.totalDays365Plus ?? 0))}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">High risk of bad debt</div>
          </div>
        </div>
      )}

      {activeTab === "creditors" && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Payable</div>
            <div className="text-xl font-black text-white mt-1">{formatCurrency(creditorData?.grandTotalPayable)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{creditorData?.supplierSummaries?.length ?? 0} Creditors</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Not Due Yet</div>
            <div className="text-xl font-black text-emerald-400 mt-1">{formatCurrency(creditorData?.grandNotDue)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Credit period active</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Overdue</div>
            <div className="text-xl font-black text-rose-400 mt-1">{formatCurrency(creditorData?.grandOverdue)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Payment delayed</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">1 - 30 Days</div>
            <div className="text-xl font-black text-amber-400 mt-1">
              {formatCurrency((creditorData?.totalDays1To15 ?? 0) + (creditorData?.totalDays16To30 ?? 0))}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Upcoming payments</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">31 - 90 Days</div>
            <div className="text-xl font-black text-amber-500 mt-1">
              {formatCurrency((creditorData?.totalDays31To45 ?? 0) + (creditorData?.totalDays46To60 ?? 0) + (creditorData?.totalDays61To90 ?? 0))}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Overdue 1-3 months</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">90+ Days Overdue</div>
            <div className="text-xl font-black text-rose-500 mt-1">
              {formatCurrency((creditorData?.totalDays91To180 ?? 0) + (creditorData?.totalDays181To365 ?? 0) + (creditorData?.totalDays365Plus ?? 0))}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Supplier credit hold risk</div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            <div className="text-sm font-semibold text-slate-400">Computing real overdue aging slabs...</div>
          </div>
        ) : activeTab === "debtors" ? (
          viewMode === "summary" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-right">Credit Limit</th>
                    <th className="p-3 text-right">Total O/S</th>
                    <th className="p-3 text-right text-emerald-400">Not Due</th>
                    <th className="p-3 text-right">1-15 D</th>
                    <th className="p-3 text-right">16-30 D</th>
                    <th className="p-3 text-right">31-45 D</th>
                    <th className="p-3 text-right">46-60 D</th>
                    <th className="p-3 text-right">61-90 D</th>
                    <th className="p-3 text-right text-amber-400">91-180 D</th>
                    <th className="p-3 text-right text-rose-400">181-365 D</th>
                    <th className="p-3 text-right text-rose-500">365+ D</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {!debtorData || debtorData.customerSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-12 text-center text-slate-500 font-sans">
                        No outstanding debtor balances as of {asOfDate}.
                      </td>
                    </tr>
                  ) : (
                    debtorData.customerSummaries.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-sans">
                          <div className="font-bold text-white max-w-[180px] truncate" title={c.customerName}>
                            {c.customerName}
                          </div>
                          {c.phone && <div className="text-[10px] text-slate-500 font-mono">{c.phone}</div>}
                        </td>
                        <td className="p-3 text-right text-slate-400">{formatCurrency(c.creditLimit)}</td>
                        <td className="p-3 text-right font-bold text-white">{formatCurrency(c.totalReceivable)}</td>
                        <td className="p-3 text-right text-emerald-400">{formatCurrency(c.notDueAmount)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(c.days1To15)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(c.days16To30)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(c.days31To45)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(c.days46To60)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(c.days61To90)}</td>
                        <td className="p-3 text-right text-amber-400">{formatCurrency(c.days91To180)}</td>
                        <td className="p-3 text-right text-rose-400">{formatCurrency(c.days181To365)}</td>
                        <td className="p-3 text-right text-rose-500 font-bold">{formatCurrency(c.days365Plus)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Inv Date</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-right">Total Inv</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Outstanding</th>
                    <th className="p-3 text-right">Overdue</th>
                    <th className="p-3">Ageing Slab</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {!debtorData || debtorData.invoiceRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500 font-sans">
                        No outstanding invoices found as of {asOfDate}.
                      </td>
                    </tr>
                  ) : (
                    debtorData.invoiceRows.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-sans font-bold text-white max-w-[160px] truncate">{inv.customerName}</td>
                        <td className="p-3 text-slate-300">{inv.invoiceNumber}</td>
                        <td className="p-3 text-slate-400">{inv.invoiceDate?.slice(0, 10)}</td>
                        <td className="p-3 text-slate-400">{inv.dueDate?.slice(0, 10)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(inv.totalInvoiceAmount)}</td>
                        <td className="p-3 text-right text-emerald-400">{formatCurrency(inv.paidAmount)}</td>
                        <td className="p-3 text-right font-bold text-rose-400">{formatCurrency(inv.outstandingAmount)}</td>
                        <td className="p-3 text-right text-amber-400 font-bold">{inv.daysOverdue} Days</td>
                        <td className="p-3 font-sans">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inv.ageingBucket === "NotDue"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : inv.daysOverdue > 90
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {inv.ageingBucket}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : (
          viewMode === "summary" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Supplier</th>
                    <th className="p-3 text-right">Total Payable</th>
                    <th className="p-3 text-right text-emerald-400">Not Due</th>
                    <th className="p-3 text-right">1-15 D</th>
                    <th className="p-3 text-right">16-30 D</th>
                    <th className="p-3 text-right">31-45 D</th>
                    <th className="p-3 text-right">46-60 D</th>
                    <th className="p-3 text-right">61-90 D</th>
                    <th className="p-3 text-right text-amber-400">91-180 D</th>
                    <th className="p-3 text-right text-rose-400">181-365 D</th>
                    <th className="p-3 text-right text-rose-500">365+ D</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {!creditorData || creditorData.supplierSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-slate-500 font-sans">
                        No outstanding creditor payables as of {asOfDate}.
                      </td>
                    </tr>
                  ) : (
                    creditorData.supplierSummaries.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-sans">
                          <div className="font-bold text-white max-w-[180px] truncate" title={s.supplierName}>
                            {s.supplierName}
                          </div>
                          {s.phone && <div className="text-[10px] text-slate-500 font-mono">{s.phone}</div>}
                        </td>
                        <td className="p-3 text-right font-bold text-white">{formatCurrency(s.totalPayable)}</td>
                        <td className="p-3 text-right text-emerald-400">{formatCurrency(s.notDueAmount)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(s.days1To15)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(s.days16To30)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(s.days31To45)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(s.days46To60)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(s.days61To90)}</td>
                        <td className="p-3 text-right text-amber-400">{formatCurrency(s.days91To180)}</td>
                        <td className="p-3 text-right text-rose-400">{formatCurrency(s.days181To365)}</td>
                        <td className="p-3 text-right text-rose-500 font-bold">{formatCurrency(s.days365Plus)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Supplier</th>
                    <th className="p-3">Bill #</th>
                    <th className="p-3">Supplier Inv #</th>
                    <th className="p-3">Bill Date</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-right">Total Bill</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Outstanding</th>
                    <th className="p-3 text-right">Overdue</th>
                    <th className="p-3">Ageing Slab</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {!creditorData || creditorData.billRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-500 font-sans">
                        No outstanding bills found as of {asOfDate}.
                      </td>
                    </tr>
                  ) : (
                    creditorData.billRows.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-sans font-bold text-white max-w-[160px] truncate">{b.supplierName}</td>
                        <td className="p-3 text-slate-300">{b.billNumber}</td>
                        <td className="p-3 text-slate-400">{b.vendorInvoiceNumber || "-"}</td>
                        <td className="p-3 text-slate-400">{b.billDate?.slice(0, 10)}</td>
                        <td className="p-3 text-slate-400">{b.dueDate?.slice(0, 10)}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(b.totalBillAmount)}</td>
                        <td className="p-3 text-right text-emerald-400">{formatCurrency(b.paidAmount)}</td>
                        <td className="p-3 text-right font-bold text-rose-400">{formatCurrency(b.outstandingAmount)}</td>
                        <td className="p-3 text-right text-amber-400 font-bold">{b.daysOverdue} Days</td>
                        <td className="p-3 font-sans">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              b.ageingBucket === "NotDue"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : b.daysOverdue > 90
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {b.ageingBucket}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
