"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Boxes,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Calendar,
} from "lucide-react";
import {
  p0ReportService,
  RealTimeStockBalanceReport,
  StockValuationReport,
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

function StockReportsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "valuation" ? "valuation" : "balance";

  const [activeTab, setActiveTab] = useState<"balance" | "valuation">(initialTab);
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
  const [stockFilter, setStockFilter] = useState("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Data
  const [balanceData, setBalanceData] = useState<RealTimeStockBalanceReport | null>(null);
  const [valuationData, setValuationData] = useState<StockValuationReport | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      if (activeTab === "balance") {
        const res = await p0ReportService.getRealTimeStockBalance({
          searchTerm: searchTerm || undefined,
          groupBy: stockFilter === "low" ? "low" : undefined,
          pageNumber,
          pageSize,
        });
        setBalanceData(res);
      } else {
        const res = await p0ReportService.getStockValuation({
          fromDate,
          toDate,
          searchTerm: searchTerm || undefined,
          pageNumber,
          pageSize,
        });
        setValuationData(res);
      }
    } catch (err: any) {
      console.error("Failed to load inventory report", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to retrieve inventory report from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, fromDate, toDate, stockFilter, pageNumber, pageSize]);

  const handleExportCsv = async () => {
    try {
      if (activeTab === "balance") {
        await p0ReportService.exportReportCsv("stock-balance", {
          searchTerm: searchTerm || undefined,
        });
      } else {
        await p0ReportService.exportReportCsv("stock-valuation", {
          fromDate,
          toDate,
          searchTerm: searchTerm || undefined,
        });
      }
    } catch (err) {
      console.error("CSV Export failed", err);
    }
  };

  const exportHeaders = activeTab === "balance"
    ? ["Product Name", "SKU", "Category", "Warehouse", "Batch #", "Expiry", "Current Qty", "Available Qty", "Reserved Qty", "Cost Rate", "Stock Value", "Status"]
    : ["SKU", "Item Name", "Warehouse", "Opening Qty", "Inward (+)", "Outward (-)", "Adjustments", "Closing Qty", "Cost Rate", "Closing Value"];

  const exportRows = activeTab === "balance"
    ? (balanceData?.items || []).map((it) => [
        it.productName || "—",
        it.sku || "—",
        it.categoryName || "—",
        it.warehouseName || "—",
        it.batchNumber || "—",
        it.expiryDate ? new Date(it.expiryDate).toLocaleDateString("en-IN") : "—",
        it.currentStock ?? 0,
        it.availableStock ?? 0,
        it.reservedStock ?? 0,
        (it.costRate ?? 0).toFixed(2),
        (it.stockValue ?? 0).toFixed(2),
        it.stockStatus || "—"
      ])
    : (valuationData?.items || []).map((it) => [
        it.sku || "—",
        it.productName || "—",
        it.warehouseName || "—",
        it.openingQuantity ?? 0,
        it.inwardQuantity ?? 0,
        it.outwardQuantity ?? 0,
        it.adjustmentQuantity ?? 0,
        it.closingQuantity ?? 0,
        (it.costRate ?? 0).toFixed(2),
        (it.stockValue ?? 0).toFixed(2)
      ]);

  const summaryExportData: Record<string, string | number> = activeTab === "balance"
    ? {
        "Total Stock SKUs": balanceData?.totalCount || 0,
        "Total Current Stock": balanceData?.totalCurrentStock || 0,
        "Total Valuation Value": formatCurrency(balanceData?.totalStockValue),
      }
    : {
        "Total Audited SKUs": valuationData?.totalCount || 0,
        "Total Inward": valuationData?.grandInwardQuantity || 0,
        "Total Outward": valuationData?.grandOutwardQuantity || 0,
        "Closing Inventory Valuation": formatCurrency(valuationData?.grandStockValue),
      };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Quick Jump Bar */}
      <QuickReportJumpBar currentReportTitle="Stock Balance & Valuation" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/20">
              <Boxes className="w-6 h-6" />
            </span>
            <span>Real-Time Stock Balance & Valuation</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Live inventory quantities, batch/expiry alerts, movement reconciliations, and weighted purchase valuation.
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
            setActiveTab("balance");
            setPageNumber(1);
          }}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "balance"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Real-Time Stock Balance</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("valuation");
            setPageNumber(1);
          }}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "valuation"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Stock Valuation (Opening + In - Out)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === "valuation" && (
            <>
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
            </>
          )}

          {activeTab === "balance" && (
            <div className="flex items-center space-x-2 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Stock Status:</span>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="bg-transparent text-white focus:outline-none"
              >
                <option value="all" className="bg-slate-900">All Items</option>
                <option value="low" className="bg-slate-900">Low / Critical / Out of Stock</option>
              </select>
            </div>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
              placeholder="Search product, SKU, batch..."
              className="pl-8 pr-4 py-1.5 bg-slate-850 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <button
          onClick={() => loadData()}
          disabled={loading}
          className="flex items-center space-x-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20"
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
      {activeTab === "balance" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Stock Qty</div>
            <div className="text-xl font-black text-white mt-1">{(balanceData?.totalCurrentStock ?? 0).toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{balanceData?.totalCount ?? 0} active records</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Valuation</div>
            <div className="text-xl font-black text-amber-400 mt-1">{formatCurrency(balanceData?.totalStockValue)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Asset book value</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Low / Critical</div>
            <div className="text-xl font-black text-rose-400 mt-1">{balanceData?.totalLowStockCount ?? 0}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Below alert threshold</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Zero Stock</div>
            <div className="text-xl font-black text-slate-400 mt-1">{balanceData?.totalZeroStockCount ?? 0}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Out of stock</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Negative Stock</div>
            <div className="text-xl font-black text-rose-500 mt-1">{balanceData?.totalNegativeStockCount ?? 0}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Audit discrepancy</div>
          </div>
        </div>
      )}

      {activeTab === "valuation" && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Opening Qty</div>
            <div className="text-xl font-black text-white mt-1">{(valuationData?.grandOpeningQuantity ?? 0).toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Start of period</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Inward Receipts</div>
            <div className="text-xl font-black text-emerald-400 mt-1">+{(valuationData?.grandInwardQuantity ?? 0).toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Purchases + Transfers</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outward Issues</div>
            <div className="text-xl font-black text-rose-400 mt-1">-{(valuationData?.grandOutwardQuantity ?? 0).toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Sales + Dispatches</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Adjustments</div>
            <div className="text-xl font-black text-slate-300 mt-1">{(valuationData?.grandAdjustmentQuantity ?? 0).toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Physical audits</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Closing Qty</div>
            <div className="text-xl font-black text-indigo-400 mt-1">{(valuationData?.grandClosingQuantity ?? 0).toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">End balance</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Closing Valuation</div>
            <div className="text-xl font-black text-amber-400 mt-1">{formatCurrency(valuationData?.grandStockValue)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Weighted cost</div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {/* Table Title Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              {activeTab === "balance" ? "Real-Time Stock Balance Data View" : "Periodic Stock Valuation Data View"}
            </h2>
            <span className="text-xs text-slate-400">
              ({activeTab === "balance" ? `${balanceData?.items?.length ?? 0} SKUs` : `${valuationData?.items?.length ?? 0} SKUs`})
            </span>
          </div>

          {/* Universal Export Toolbar */}
          <ReportExportToolbar
            title={activeTab === "balance" ? "Real-Time Stock Balance Report" : "Periodic Stock Valuation Report"}
            fileName={activeTab === "balance" ? "stock_balance_report" : "stock_valuation_report"}
            headers={exportHeaders}
            rows={exportRows}
            summaryData={summaryExportData}
            dateRangeText={activeTab === "valuation" ? `${new Date(fromDate).toLocaleDateString("en-IN")} to ${new Date(toDate).toLocaleDateString("en-IN")}` : "Live Real-Time"}
          />

          <span className="text-xs text-amber-400 font-semibold">
            {activeTab === "valuation"
              ? `Period: ${new Date(fromDate).toLocaleDateString("en-IN")} — ${new Date(toDate).toLocaleDateString("en-IN")}`
              : `Audited: ${new Date().toLocaleDateString("en-IN")}`}
          </span>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            <div className="text-sm font-semibold text-slate-400">Auditing live inventory warehouses...</div>
          </div>
        ) : activeTab === "balance" ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Warehouse</th>
                    <th className="p-3">Batch #</th>
                    <th className="p-3">Expiry</th>
                    <th className="p-3 text-right">Current</th>
                    <th className="p-3 text-right">Available</th>
                    <th className="p-3 text-right">Reserved</th>
                    <th className="p-3 text-right">Cost Rate</th>
                    <th className="p-3 text-right">Stock Value</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {!balanceData || balanceData.items.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-12 text-center text-slate-500 font-sans">
                        No inventory records matching criteria.
                      </td>
                    </tr>
                  ) : (
                    balanceData.items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-white whitespace-nowrap">{row.sku}</td>
                        <td className="p-3 text-slate-200 font-sans max-w-[180px] truncate" title={row.productName}>
                          {row.productName}
                        </td>
                        <td className="p-3 text-slate-400 font-sans">{row.categoryName}</td>
                        <td className="p-3 text-slate-400 font-sans">{row.warehouseName}</td>
                        <td className="p-3 text-slate-300">{row.batchNumber || "-"}</td>
                        <td className="p-3 text-slate-400">{row.expiryDate ? row.expiryDate.slice(0, 10) : "-"}</td>
                        <td className="p-3 text-right text-white font-bold">{row.currentStock}</td>
                        <td className="p-3 text-right text-emerald-400">{row.availableStock}</td>
                        <td className="p-3 text-right text-slate-400">{row.reservedStock}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(row.costRate)}</td>
                        <td className="p-3 text-right text-amber-400 font-bold">{formatCurrency(row.stockValue)}</td>
                        <td className="p-3 font-sans">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              row.stockStatus === "Available"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : row.stockStatus === "Critical"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                                : row.stockStatus === "Low"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : row.stockStatus === "Zero"
                                ? "bg-slate-800 text-slate-400 border border-slate-700"
                                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}
                          >
                            {row.stockStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {balanceData && balanceData.totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Page {balanceData.pageNumber} of {balanceData.totalPages} ({balanceData.totalCount} items)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={balanceData.pageNumber <= 1}
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={balanceData.pageNumber >= balanceData.totalPages}
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
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Warehouse</th>
                    <th className="p-3 text-right">Opening Qty</th>
                    <th className="p-3 text-right">Inward (+)</th>
                    <th className="p-3 text-right">Outward (-)</th>
                    <th className="p-3 text-right">Adjustments</th>
                    <th className="p-3 text-right">Closing Qty</th>
                    <th className="p-3 text-right">Cost Rate</th>
                    <th className="p-3 text-right">Closing Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {!valuationData || valuationData.items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-500 font-sans">
                        No movement data found for valuation window.
                      </td>
                    </tr>
                  ) : (
                    valuationData.items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-white whitespace-nowrap">{row.sku}</td>
                        <td className="p-3 text-slate-200 font-sans max-w-[180px] truncate" title={row.productName}>
                          {row.productName}
                        </td>
                        <td className="p-3 text-slate-400 font-sans">{row.warehouseName}</td>
                        <td className="p-3 text-right text-slate-300">{row.openingQuantity}</td>
                        <td className="p-3 text-right text-emerald-400">+{row.inwardQuantity}</td>
                        <td className="p-3 text-right text-rose-400">-{row.outwardQuantity}</td>
                        <td className="p-3 text-right text-slate-400">{row.adjustmentQuantity}</td>
                        <td className="p-3 text-right text-white font-bold">{row.closingQuantity}</td>
                        <td className="p-3 text-right text-slate-300">{formatCurrency(row.costRate)}</td>
                        <td className="p-3 text-right text-amber-400 font-bold">{formatCurrency(row.stockValue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {valuationData && valuationData.totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Page {valuationData.pageNumber} of {valuationData.totalPages} ({valuationData.totalCount} items)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={valuationData.pageNumber <= 1}
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={valuationData.pageNumber >= valuationData.totalPages}
                    onClick={() => setPageNumber((p) => p + 1)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StockReportsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <StockReportsContent />
    </Suspense>
  );
}
