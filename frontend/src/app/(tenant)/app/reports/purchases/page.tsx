"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  TrendingUp,
  Download,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  p0ReportService,
  PurchaseRegisterDetailedReport,
  PurchaseSummaryReport,
} from "@/services/p0-reports.service";
import { ReportExportToolbar } from "@/components/reports/report-export-toolbar";

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
};

function PurchaseReportsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "summary" ? "summary" : "detailed";

  const [activeTab, setActiveTab] = useState<"detailed" | "summary">(initialTab);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState("");
  const [groupBy, setGroupBy] = useState("supplier");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Data
  const [detailedData, setDetailedData] = useState<PurchaseRegisterDetailedReport | null>(null);
  const [summaryData, setSummaryData] = useState<PurchaseSummaryReport | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      if (activeTab === "detailed") {
        const res = await p0ReportService.getPurchaseRegisterDetailed({
          fromDate,
          toDate,
          searchTerm: searchTerm || undefined,
          pageNumber,
          pageSize,
        });
        setDetailedData(res);
      } else {
        const res = await p0ReportService.getPurchaseSummary({
          fromDate,
          toDate,
          groupBy,
        });
        setSummaryData(res);
      }
    } catch (err: any) {
      console.error("Failed to load purchase report", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to retrieve purchase report from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, fromDate, toDate, groupBy, pageNumber, pageSize]);

  const handleExportCsv = async () => {
    try {
      if (activeTab === "detailed") {
        await p0ReportService.exportReportCsv("purchase-register", {
          fromDate,
          toDate,
          searchTerm: searchTerm || undefined,
        });
      } else {
        await p0ReportService.exportReportCsv("purchase-summary", {
          fromDate,
          toDate,
          groupBy,
        });
      }
    } catch (err) {
      console.error("CSV Export failed", err);
    }
  };

  const exportHeaders = activeTab === "detailed"
    ? ["Bill #", "Supplier Bill #", "Date", "Supplier", "GSTIN", "Product", "HSN", "Qty", "UOM", "Rate", "Taxable", "GST %", "CGST", "SGST", "IGST", "Total Value", "Status"]
    : ["Group", "Bill Count", "Qty Purchased", "Gross Purchases", "Taxable Purchases", "Total Tax", "Net Purchases"];

  const exportRows = activeTab === "detailed"
    ? (detailedData?.items || []).map((it) => [
        it.billNumber,
        it.supplierBillNumber || "—",
        it.billDate ? new Date(it.billDate).toLocaleDateString("en-IN") : "—",
        it.supplierName || "—",
        it.supplierGstin || "Unregistered",
        it.productName || "—",
        it.hsnCode || "—",
        it.quantity ?? 0,
        it.uomCode || "—",
        (it.rate ?? 0).toFixed(2),
        (it.taxableAmount ?? 0).toFixed(2),
        `${it.gstRate ?? 0}%`,
        (it.cgstAmount ?? 0).toFixed(2),
        (it.sgstAmount ?? 0).toFixed(2),
        (it.igstAmount ?? 0).toFixed(2),
        (it.netBillValue ?? 0).toFixed(2),
        it.paymentStatus || "—"
      ])
    : (summaryData?.rows || []).map((r) => [
        r.groupLabel || "—",
        r.billCount ?? 0,
        r.totalQuantityPurchased ?? 0,
        (r.grossPurchases ?? 0).toFixed(2),
        (r.taxablePurchases ?? 0).toFixed(2),
        (r.totalTax ?? 0).toFixed(2),
        (r.netPurchases ?? 0).toFixed(2)
      ]);

  const summaryExportData = activeTab === "detailed"
    ? {
        "Total Bills": detailedData?.distinctBillsCount || 0,
        "Total Taxable": formatCurrency(detailedData?.totalTaxable),
        "Total Tax (ITC)": formatCurrency(detailedData?.totalTax),
        "Total Purchase Value": formatCurrency(detailedData?.totalNetAmount)
      }
    : {
        "Total Bills": summaryData?.overallSummary?.totalBills || 0,
        "Total Taxable": formatCurrency(summaryData?.overallSummary?.totalTaxablePurchases),
        "Total Net Purchases": formatCurrency(summaryData?.overallSummary?.totalNetPurchases)
      };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Link href="/app/reports" className="hover:text-white transition-colors">
          Report Center
        </Link>
        <span>/</span>
        <span className="text-slate-200">Procurement & Purchases</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <ShoppingCart className="w-6 h-6" />
            </span>
            <span>Purchase Register & Procurement Summary</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Supplier bills, tax invoices, GST input tax credits (ITC), and vendor payment status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Reload Data</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => {
            setActiveTab("detailed");
            setPageNumber(1);
          }}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "detailed"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Purchase Register (Detailed Itemized)</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("summary");
          }}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "summary"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Purchase Summary (Grouped Slices)</span>
        </button>
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

          {activeTab === "detailed" ? (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadData()}
                placeholder="Search bill #, supplier, SKU..."
                className="pl-8 pr-4 py-1.5 bg-slate-850 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Group By:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="bg-transparent text-white focus:outline-none"
              >
                <option value="supplier" className="bg-slate-900">Supplier</option>
                <option value="date" className="bg-slate-900">Daily (Date)</option>
                <option value="month" className="bg-slate-900">Monthly</option>
                <option value="branch" className="bg-slate-900">Branch</option>
                <option value="warehouse" className="bg-slate-900">Warehouse</option>
              </select>
            </div>
          )}
        </div>

        <button
          onClick={() => loadData()}
          disabled={loading}
          className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
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
            onClick={() => loadData()}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Scorecards */}
      {activeTab === "detailed" && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Bills</div>
            <div className="text-xl font-black text-white mt-1">
              {detailedData ? (detailedData.distinctBillsCount ?? detailedData.totalBillsCount ?? 0) : 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{detailedData?.totalCount ?? 0} Line Items</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Qty Purchased</div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {(detailedData?.totalQuantity ?? 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Units received</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Taxable Value</div>
            <div className="text-xl font-black text-white mt-1">{formatCurrency(detailedData?.totalTaxable)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Net procurement cost</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">GST ITC Claimable</div>
            <div className="text-xl font-black text-amber-400 mt-1">{formatCurrency(detailedData?.totalTax)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">CGST+SGST+IGST</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gross Billed</div>
            <div className="text-xl font-black text-indigo-400 mt-1">
              {formatCurrency(detailedData?.totalNetBillValue ?? detailedData?.totalNetAmount)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Total invoice amount</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outstanding A/P</div>
            <div className="text-xl font-black text-rose-400 mt-1">{formatCurrency(detailedData?.totalOutstanding)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Payable to suppliers</div>
          </div>
        </div>
      )}

      {activeTab === "summary" && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Bills</div>
            <div className="text-xl font-black text-white mt-1">{summaryData?.grandBillCount ?? 0}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Invoices</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Qty Purchased</div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {(summaryData?.grandQuantityPurchased ?? 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Units</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gross Procurement</div>
            <div className="text-xl font-black text-white mt-1">{formatCurrency(summaryData?.grandGrossPurchase)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Before returns</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Net Procurement</div>
            <div className="text-xl font-black text-indigo-400 mt-1">{formatCurrency(summaryData?.grandNetPurchase)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Net purchase value</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Disbursed Paid</div>
            <div className="text-xl font-black text-emerald-400 mt-1">{formatCurrency(summaryData?.grandPaidAmount)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Paid to suppliers</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Payables</div>
            <div className="text-xl font-black text-rose-400 mt-1">{formatCurrency(summaryData?.grandOutstandingAmount)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Unpaid balances</div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {/* Table Title Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              {activeTab === "detailed" ? "Purchase Register Data View" : "Purchase Summary Data View"}
            </h2>
            <span className="text-xs text-slate-400">
              ({activeTab === "detailed" ? `${detailedData?.totalCount ?? 0} line items` : `${summaryData?.rows?.length ?? 0} groups`})
            </span>
          </div>

          {/* Universal Export Toolbar */}
          <ReportExportToolbar
            title={activeTab === "detailed" ? "Purchase Register (Detailed Report)" : "Purchase Summary Report"}
            fileName={activeTab === "detailed" ? "purchase_register_detailed" : "purchase_summary"}
            headers={exportHeaders}
            rows={exportRows}
            summaryData={summaryExportData}
            dateRangeText={`${new Date(fromDate).toLocaleDateString("en-IN")} to ${new Date(toDate).toLocaleDateString("en-IN")}`}
          />

          <span className="text-xs text-indigo-400 font-semibold">
            Period: {new Date(fromDate).toLocaleDateString("en-IN")} — {new Date(toDate).toLocaleDateString("en-IN")}
          </span>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            <div className="text-sm font-semibold text-slate-400">Querying procurement database...</div>
          </div>
        ) : activeTab === "detailed" ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Bill #</th>
                    <th className="p-3">Supplier Inv #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3">Item / SKU</th>
                    <th className="p-3">Batch</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Taxable</th>
                    <th className="p-3 text-right">GST %</th>
                    <th className="p-3 text-right">ITC Tax</th>
                    <th className="p-3 text-right">Total Bill</th>
                    <th className="p-3 text-right">Outstanding</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {!detailedData || detailedData.items.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-12 text-center text-slate-500 font-sans">
                        No purchase bills matching filter criteria for the selected period.
                      </td>
                    </tr>
                  ) : (
                    detailedData.items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-white whitespace-nowrap">{row.billNumber}</td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">{row.supplierBillNumber || "-"}</td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">{row.billDate?.slice(0, 10)}</td>
                        <td className="p-3 text-slate-200 font-sans max-w-[160px] truncate" title={row.supplierName}>
                          {row.supplierName}
                        </td>
                        <td className="p-3 text-slate-300 font-sans max-w-[180px] truncate" title={row.productName}>
                          {row.productName}
                          <span className="block text-[10px] font-mono text-slate-500">{row.sku}</span>
                        </td>
                        <td className="p-3 text-slate-400">{row.batchNumber || "-"}</td>
                        <td className="p-3 text-right text-emerald-400 font-bold">
                          {row.quantity} {row.uomCode}
                        </td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(row.purchaseRate)}</td>
                        <td className="p-3 text-right text-slate-200">{formatCurrency(row.taxableAmount)}</td>
                        <td className="p-3 text-right text-slate-400">{row.gstRate}%</td>
                        <td className="p-3 text-right text-amber-400">{formatCurrency(row.totalTax)}</td>
                        <td className="p-3 text-right text-white font-bold">{formatCurrency(row.netBillValue)}</td>
                        <td className="p-3 text-right text-rose-400">{formatCurrency(row.outstandingAmount)}</td>
                        <td className="p-3 font-sans">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              row.paymentStatus === "Paid"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : row.paymentStatus === "PartiallyPaid"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {row.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {detailedData && detailedData.totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Page {detailedData.pageNumber} of {detailedData.totalPages} ({detailedData.totalCount} total lines)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={detailedData.pageNumber <= 1}
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={detailedData.pageNumber >= detailedData.totalPages}
                    onClick={() => setPageNumber((p) => p + 1)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Dimension ({groupBy})</th>
                  <th className="p-3 text-right">Bills</th>
                  <th className="p-3 text-right">Qty Purchased</th>
                  <th className="p-3 text-right">Gross Purchase</th>
                  <th className="p-3 text-right">Returns</th>
                  <th className="p-3 text-right">Net Purchase</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-right">Tax (ITC)</th>
                  <th className="p-3 text-right">Discount</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {!summaryData || summaryData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center text-slate-500 font-sans">
                      No summary data found for selected period.
                    </td>
                  </tr>
                ) : (
                  summaryData.rows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-white font-sans">{r.groupLabel}</td>
                      <td className="p-3 text-right text-slate-300">{r.billCount}</td>
                      <td className="p-3 text-right text-emerald-400">{r.totalQuantityPurchased.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-200">{formatCurrency(r.grossPurchase)}</td>
                      <td className="p-3 text-right text-rose-400">{formatCurrency(r.returnsAmount)}</td>
                      <td className="p-3 text-right text-white font-bold">{formatCurrency(r.netPurchase)}</td>
                      <td className="p-3 text-right text-slate-300">{formatCurrency(r.taxablePurchase)}</td>
                      <td className="p-3 text-right text-amber-400">{formatCurrency(r.taxAmount)}</td>
                      <td className="p-3 text-right text-slate-400">{formatCurrency(r.discountAmount)}</td>
                      <td className="p-3 text-right text-emerald-400">{formatCurrency(r.paidAmount)}</td>
                      <td className="p-3 text-right text-rose-400 font-bold">{formatCurrency(r.outstandingAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PurchaseReportsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <PurchaseReportsContent />
    </Suspense>
  );
}
