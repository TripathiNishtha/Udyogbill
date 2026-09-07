"use client";

import React, { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Receipt,
  TrendingUp,
  Download,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  p0ReportService,
  SalesRegisterDetailedReport,
  SalesSummaryReport,
} from "@/services/p0-reports.service";
import { ReportExportToolbar } from "@/components/reports/report-export-toolbar";
import { QuickReportJumpBar } from "@/components/reports/quick-report-jump-bar";

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
};

function SalesReportsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "summary" ? "summary" : "detailed";

  const [activeTab, setActiveTab] = useState<"detailed" | "summary">(initialTab);
  const [viewMode, setViewMode] = useState<"fit" | "full">("fit");
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
  const [groupBy, setGroupBy] = useState("date");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Data
  const [detailedData, setDetailedData] = useState<SalesRegisterDetailedReport | null>(null);
  const [summaryData, setSummaryData] = useState<SalesSummaryReport | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      if (activeTab === "detailed") {
        const res = await p0ReportService.getSalesRegisterDetailed({
          fromDate,
          toDate,
          searchTerm: searchTerm || undefined,
          pageNumber,
          pageSize,
        });
        setDetailedData(res);
      } else {
        const res = await p0ReportService.getSalesSummary({
          fromDate,
          toDate,
          groupBy,
        });
        setSummaryData(res);
      }
    } catch (err: any) {
      console.error("Failed to load sales report", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to retrieve sales report from server.");
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
        await p0ReportService.exportReportCsv("sales-register", {
          fromDate,
          toDate,
          searchTerm: searchTerm || undefined,
        });
      } else {
        await p0ReportService.exportReportCsv("sales-summary", {
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
    ? ["Invoice #", "Date", "Customer", "GSTIN", "Product", "HSN", "Qty", "UOM", "Rate", "Taxable", "GST %", "CGST", "SGST", "IGST", "Total Value", "Status"]
    : ["Group", "Invoice Count", "Qty Sold", "Gross Sales", "Taxable Sales", "Total Tax", "Net Sales"];

  const exportRows = activeTab === "detailed"
    ? (detailedData?.items || []).map((it) => [
        it.invoiceNumber,
        it.invoiceDate ? new Date(it.invoiceDate).toLocaleDateString("en-IN") : "—",
        it.customerName || "—",
        it.customerGstin || "Unregistered",
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
        (it.netInvoiceValue ?? 0).toFixed(2),
        it.paymentStatus || "—"
      ])
    : (summaryData?.rows || []).map((r) => [
        r.groupLabel || "—",
        r.invoiceCount ?? 0,
        r.totalQuantitySold ?? 0,
        (r.grossSales ?? 0).toFixed(2),
        (r.taxableSales ?? 0).toFixed(2),
        (r.taxAmount ?? 0).toFixed(2),
        (r.netSales ?? 0).toFixed(2)
      ]);

  const summaryExportData: Record<string, string | number> = activeTab === "detailed"
    ? {
        "Total Invoices": detailedData?.distinctInvoicesCount || 0,
        "Total Taxable": formatCurrency(detailedData?.totalTaxable),
        "Total Tax": formatCurrency(detailedData?.totalTax),
        "Total Sales Value": formatCurrency(detailedData?.totalNetAmount)
      }
    : {
        "Total Invoices": summaryData?.grandInvoiceCount || 0,
        "Total Taxable": formatCurrency(summaryData?.grandTaxableSales),
        "Total Net Sales": formatCurrency(summaryData?.grandNetSales)
      };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Quick Jump Bar */}
      <QuickReportJumpBar currentReportTitle="Sales & Revenue Register" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-xs">
              <Receipt className="w-6 h-6" />
            </span>
            <span>Sales Register & Revenue Intelligence</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Compliant commercial sales registers with HSN, GST breakdowns, line item auditing, and multi-dimensional slices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Reload Data</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4">
        <button
          onClick={() => {
            setActiveTab("detailed");
            setPageNumber(1);
          }}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "detailed"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Sales Register (Detailed Itemized)</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("summary");
          }}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "summary"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Sales Summary (Grouped Slices)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {activeTab === "detailed" ? (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadData()}
                placeholder="Search invoice, customer, SKU..."
                className="pl-8 pr-4 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Group By:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="date" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Daily (Date)</option>
                <option value="month" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Monthly</option>
                <option value="customer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Customer</option>
                <option value="mode" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Payment Mode</option>
                <option value="branch" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Branch</option>
                <option value="warehouse" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Warehouse</option>
              </select>
            </div>
          )}
        </div>

        <button
          onClick={() => loadData()}
          disabled={loading}
          className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-500/20"
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
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition-all">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Invoices</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {detailedData ? (detailedData.distinctInvoicesCount ?? detailedData.totalInvoicesCount ?? 0) : 0}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">{detailedData?.totalCount ?? 0} Line Items</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition-all">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Qty Sold</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {(detailedData?.totalQuantity ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400/90 font-medium mt-1">Units across orders</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition-all">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Taxable Value</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{formatCurrency(detailedData?.totalTaxable)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Net base price</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition-all">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total GST Tax</div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(detailedData?.totalTax)}</div>
            <div className="text-[11px] text-amber-700 dark:text-amber-400/90 font-medium mt-1">CGST + SGST + IGST</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition-all">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gross Invoiced</div>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {formatCurrency(detailedData?.totalNetInvoiceValue ?? detailedData?.totalNetAmount)}
            </div>
            <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium mt-1">Final billed value</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition-all">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Outstanding A/R</div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(detailedData?.totalOutstanding)}</div>
            <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium mt-1">Unpaid customer balance</div>
          </div>
        </div>
      )}

      {activeTab === "summary" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition-all">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Invoices</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{summaryData?.grandInvoiceCount ?? 0}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Transactions</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition-all">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Units Sold</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {(summaryData?.grandQuantitySold ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400/90 font-medium mt-1">Total items</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition-all">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gross Revenue</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{formatCurrency(summaryData?.grandGrossSales)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Before returns</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition-all">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Net Revenue</div>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(summaryData?.grandNetSales)}</div>
            <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium mt-1">After returns</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition-all">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Collected Cash</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(summaryData?.grandPaidAmount)}</div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400/90 font-medium mt-1">Settled payments</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow transition-all">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Receivables</div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(summaryData?.grandOutstandingAmount)}</div>
            <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium mt-1">Pending collection</div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Table Title Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase">
                {activeTab === "detailed" ? "Sales Register Data View" : "Sales Summary Data View"}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({activeTab === "detailed" ? `${detailedData?.totalCount ?? 0} line items` : `${summaryData?.rows?.length ?? 0} groups`})
              </span>
            </div>

            {/* View Mode Toggle: Fit Screen vs All Columns */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300/60 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("fit")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  viewMode === "fit"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Fit all columns cleanly on screen without horizontal scrolling"
              >
                Fit Screen (No Scroll)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("full")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  viewMode === "full"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Show every single column separately with horizontal scroll"
              >
                All Columns
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Universal Export Toolbar */}
            <ReportExportToolbar
              title={activeTab === "detailed" ? "Sales Register (Detailed Report)" : "Sales Summary Report"}
              fileName={activeTab === "detailed" ? "sales_register_detailed" : "sales_summary"}
              headers={exportHeaders}
              rows={exportRows}
              summaryData={summaryExportData}
              dateRangeText={`${new Date(fromDate).toLocaleDateString("en-IN")} to ${new Date(toDate).toLocaleDateString("en-IN")}`}
            />

            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hidden sm:inline-block">
              Period: {new Date(fromDate).toLocaleDateString("en-IN")} — {new Date(toDate).toLocaleDateString("en-IN")}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Querying real database ledger...</div>
          </div>
        ) : activeTab === "detailed" ? (
          <div>
            {viewMode === "fit" ? (
              /* ── FIT SCREEN VIEW (NO HORIZONTAL SCROLL) ── */
              <div className="w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-700 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-[16%]">Invoice / Date</th>
                      <th className="py-3 px-3 w-[18%]">Customer</th>
                      <th className="py-3 px-3 w-[20%]">Product / SKU</th>
                      <th className="py-3 px-3 text-right w-[11%]">Qty & Rate</th>
                      <th className="py-3 px-3 text-right w-[12%]">Taxable & GST</th>
                      <th className="py-3 px-3 text-right w-[12%]">Total & Due</th>
                      <th className="py-3 px-4 text-center w-[11%]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60 font-sans">
                    {!detailedData || detailedData.items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-500 dark:text-slate-400 font-sans">
                          No sales invoices matching filter criteria for the selected period.
                        </td>
                      </tr>
                    ) : (
                      detailedData.items.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold">
                              {row.invoiceId ? (
                                <Link
                                  href={`/app/sales/invoices/${row.invoiceId}`}
                                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline inline-flex items-center space-x-1 font-mono"
                                  title="Click to View Full Invoice"
                                >
                                  <span>{row.invoiceNumber}</span>
                                  <ExternalLink className="w-3 h-3 opacity-60 hover:opacity-100" />
                                </Link>
                              ) : (
                                <span className="text-slate-900 dark:text-white font-mono">{row.invoiceNumber}</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {row.invoiceDate?.slice(0, 10)}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-900 dark:text-slate-100 truncate" title={row.customerName}>
                              {row.partyId ? (
                                <Link
                                  href={`/app/customers/${row.partyId}`}
                                  className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                                >
                                  {row.customerName}
                                </Link>
                              ) : (
                                row.customerName
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {row.customerGstin || "Unregistered"}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-900 dark:text-slate-200 truncate" title={row.productName}>
                              {row.itemId ? (
                                <Link
                                  href={`/app/inventory/products/${row.itemId}`}
                                  className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                                >
                                  {row.productName}
                                </Link>
                              ) : (
                                row.productName
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center space-x-1.5 truncate">
                              {row.sku && <span>SKU: {row.sku}</span>}
                              {row.batchNumber && <span>• B: {row.batchNumber}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {row.quantity} {row.uomCode}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              @ {formatCurrency(row.rate)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-medium text-slate-900 dark:text-slate-200 font-mono">
                              {formatCurrency(row.taxableAmount)}
                            </div>
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                              +{formatCurrency(row.totalTax)} ({row.gstRate}%)
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-slate-900 dark:text-white font-mono">
                              {formatCurrency(row.netInvoiceValue)}
                            </div>
                            <div className={`text-[11px] font-mono mt-0.5 ${row.outstandingAmount && row.outstandingAmount > 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-emerald-600 dark:text-emerald-400"}`}>
                              Due: {formatCurrency(row.outstandingAmount)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap inline-block ${
                                row.paymentStatus === "FullyPaid" || row.paymentStatus === "Paid"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
                                  : row.paymentStatus === "PartiallyPaid"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30"
                                  : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30"
                              }`}
                            >
                              {row.paymentStatus === "PartiallyPaid" ? "Partially Paid" : row.paymentStatus === "FullyPaid" ? "Paid" : (row.paymentStatus || "Unpaid")}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── ALL COLUMNS EXPANDED VIEW (HORIZONTAL SCROLL) ── */
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[1300px] text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-700 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5 whitespace-nowrap min-w-[130px]">Invoice #</th>
                      <th className="p-3.5 whitespace-nowrap min-w-[95px]">Date</th>
                      <th className="p-3.5 min-w-[160px]">Customer</th>
                      <th className="p-3.5 min-w-[180px]">Product / SKU</th>
                      <th className="p-3.5 min-w-[90px]">Batch</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[80px]">Qty</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[90px]">Rate</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[100px]">Taxable</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[70px]">GST %</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[90px]">Tax</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[105px]">Total</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[105px]">Outstanding</th>
                      <th className="p-3.5 text-center whitespace-nowrap min-w-[125px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60 font-mono">
                    {!detailedData || detailedData.items.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="p-12 text-center text-slate-500 dark:text-slate-400 font-sans">
                          No sales invoices matching filter criteria for the selected period.
                        </td>
                      </tr>
                    ) : (
                      detailedData.items.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-bold whitespace-nowrap">
                            {row.invoiceId ? (
                              <Link
                                href={`/app/sales/invoices/${row.invoiceId}`}
                                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline inline-flex items-center space-x-1 font-mono"
                                title="Click to View & Print Full Invoice"
                              >
                                <span>{row.invoiceNumber}</span>
                                <ExternalLink className="w-3 h-3 opacity-60 hover:opacity-100" />
                              </Link>
                            ) : (
                              <span className="text-slate-900 dark:text-white font-mono">{row.invoiceNumber}</span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.invoiceDate?.slice(0, 10)}</td>
                          <td className="p-3.5 text-slate-900 dark:text-slate-200 font-sans max-w-[180px] truncate" title={row.customerName}>
                            {row.partyId ? (
                              <Link
                                href={`/app/customers/${row.partyId}`}
                                className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                              >
                                {row.customerName}
                              </Link>
                            ) : (
                              row.customerName
                            )}
                          </td>
                          <td className="p-3.5 text-slate-900 dark:text-slate-200 font-sans max-w-[200px] truncate" title={row.productName}>
                            {row.itemId ? (
                              <Link
                                href={`/app/inventory/products/${row.itemId}`}
                                className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                              >
                                {row.productName}
                              </Link>
                            ) : (
                              row.productName
                            )}
                            <span className="block text-[10px] font-mono text-slate-500 dark:text-slate-400">{row.sku}</span>
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.batchNumber || "-"}</td>
                          <td className="p-3.5 text-right text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                            {row.quantity} {row.uomCode}
                          </td>
                          <td className="p-3.5 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatCurrency(row.rate)}</td>
                          <td className="p-3.5 text-right text-slate-900 dark:text-slate-200 whitespace-nowrap">{formatCurrency(row.taxableAmount)}</td>
                          <td className="p-3.5 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.gstRate}%</td>
                          <td className="p-3.5 text-right text-amber-600 dark:text-amber-400 whitespace-nowrap">{formatCurrency(row.totalTax)}</td>
                          <td className="p-3.5 text-right text-slate-900 dark:text-white font-bold whitespace-nowrap">{formatCurrency(row.netInvoiceValue)}</td>
                          <td className="p-3.5 text-right text-rose-600 dark:text-rose-400 whitespace-nowrap">{formatCurrency(row.outstandingAmount)}</td>
                          <td className="p-3.5 text-center font-sans whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap inline-block ${
                                row.paymentStatus === "FullyPaid" || row.paymentStatus === "Paid"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
                                  : row.paymentStatus === "PartiallyPaid"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30"
                                  : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30"
                              }`}
                            >
                              {row.paymentStatus === "PartiallyPaid" ? "Partially Paid" : row.paymentStatus === "FullyPaid" ? "Paid" : (row.paymentStatus || "Unpaid")}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {detailedData && detailedData.totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <div>
                  Page {detailedData.pageNumber} of {detailedData.totalPages} ({detailedData.totalCount} total lines)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={detailedData.pageNumber <= 1}
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-700 disabled:opacity-30 rounded-lg shadow-xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={detailedData.pageNumber >= detailedData.totalPages}
                    onClick={() => setPageNumber((p) => p + 1)}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-700 disabled:opacity-30 rounded-lg shadow-xs"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── SUMMARY TAB ── */
          <div>
            {viewMode === "fit" ? (
              /* Summary Fit Screen View */
              <div className="w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-700 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-[24%]">{`Dimension (${groupBy})`}</th>
                      <th className="py-3 px-3 text-right w-[16%]">Invoices & Qty</th>
                      <th className="py-3 px-3 text-right w-[20%]">Taxable & Tax</th>
                      <th className="py-3 px-3 text-right w-[20%]">Gross & Net Sales</th>
                      <th className="py-3 px-4 text-right w-[20%]">Paid & Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60 font-sans">
                    {!summaryData || summaryData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-500 dark:text-slate-400 font-sans">
                          No summary data found for selected period.
                        </td>
                      </tr>
                    ) : (
                      summaryData.rows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {r.groupLabel}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                              {r.invoiceCount} Invoices
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                              {r.totalQuantitySold.toLocaleString()} units
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-medium text-slate-900 dark:text-slate-200 font-mono">
                              {formatCurrency(r.taxableSales)}
                            </div>
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                              Tax: {formatCurrency(r.taxAmount)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-slate-900 dark:text-white font-mono">
                              {formatCurrency(r.netSales)}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              Gross: {formatCurrency(r.grossSales)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {formatCurrency(r.paidAmount)}
                            </div>
                            <div className={`text-[11px] font-mono mt-0.5 ${r.outstandingAmount && r.outstandingAmount > 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>
                              Due: {formatCurrency(r.outstandingAmount)}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Summary All Columns View */
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[1100px] text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-700 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5 whitespace-nowrap min-w-[140px]">{`Dimension (${groupBy})`}</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[80px]">Invoices</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[90px]">Qty Sold</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[100px]">Gross Sales</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[90px]">Returns</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[105px]">Net Sales</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[100px]">Taxable</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[90px]">Tax</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[90px]">Discount</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[90px]">Paid</th>
                      <th className="p-3.5 text-right whitespace-nowrap min-w-[105px]">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60 font-mono">
                    {!summaryData || summaryData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-12 text-center text-slate-500 dark:text-slate-400 font-sans">
                          No summary data found for selected period.
                        </td>
                      </tr>
                    ) : (
                      summaryData.rows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white font-sans whitespace-nowrap">{r.groupLabel}</td>
                          <td className="p-3.5 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{r.invoiceCount}</td>
                          <td className="p-3.5 text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{r.totalQuantitySold.toLocaleString()}</td>
                          <td className="p-3.5 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap">{formatCurrency(r.grossSales)}</td>
                          <td className="p-3.5 text-right text-rose-600 dark:text-rose-400 whitespace-nowrap">{formatCurrency(r.returnsAmount)}</td>
                          <td className="p-3.5 text-right text-slate-900 dark:text-white font-bold whitespace-nowrap">{formatCurrency(r.netSales)}</td>
                          <td className="p-3.5 text-right text-slate-800 dark:text-slate-300 whitespace-nowrap">{formatCurrency(r.taxableSales)}</td>
                          <td className="p-3.5 text-right text-amber-600 dark:text-amber-400 whitespace-nowrap">{formatCurrency(r.taxAmount)}</td>
                          <td className="p-3.5 text-right text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatCurrency(r.discountAmount)}</td>
                          <td className="p-3.5 text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatCurrency(r.paidAmount)}</td>
                          <td className="p-3.5 text-right text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap">{formatCurrency(r.outstandingAmount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SalesReportsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <SalesReportsContent />
    </Suspense>
  );
}

