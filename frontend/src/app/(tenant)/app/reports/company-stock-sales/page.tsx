"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Package,
  Calendar,
  Search,
  RefreshCw,
  TrendingUp,
  Boxes,
  IndianRupee,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  p0ReportService,
  CompanyStockSalesReport,
  CompanyStockSalesItem,
} from "@/services/p0-reports.service";
import { inventoryService, Brand } from "@/services/inventory-services";
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

const formatQty = (val?: number) => {
  if (val === undefined || val === null) return "0";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(val);
};

function CompanyStockSalesContent() {
  const searchParams = useSearchParams();

  // Initial Date Range: 1st of current month to today
  const getInitialMonthStart = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  };

  const getToday = () => {
    return new Date().toISOString().slice(0, 10);
  };

  const [fromDate, setFromDate] = useState<string>(
    searchParams.get("from") || getInitialMonthStart()
  );
  const [toDate, setToDate] = useState<string>(
    searchParams.get("to") || getToday()
  );
  const [selectedBrandId, setSelectedBrandId] = useState<string>(
    searchParams.get("brandId") || ""
  );
  const [searchTerm, setSearchTerm] = useState<string>(
    searchParams.get("search") || ""
  );

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState<boolean>(true);
  const [reportData, setReportData] = useState<CompanyStockSalesReport | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Date Range Helpers
  const handleDatePreset = (preset: "this-month" | "last-month" | "quarter" | "fy" | "last30") => {
    const today = new Date();
    if (preset === "this-month") {
      setFromDate(getInitialMonthStart());
      setToDate(getToday());
    } else if (preset === "last-month") {
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      setFromDate(prevMonth.toISOString().slice(0, 10));
      setToDate(prevMonthEnd.toISOString().slice(0, 10));
    } else if (preset === "last30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(d.toISOString().slice(0, 10));
      setToDate(getToday());
    } else if (preset === "quarter") {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const qStart = new Date(today.getFullYear(), currentQuarter * 3, 1);
      setFromDate(qStart.toISOString().slice(0, 10));
      setToDate(getToday());
    } else if (preset === "fy") {
      const isPostMarch = today.getMonth() >= 3;
      const startYear = isPostMarch ? today.getFullYear() : today.getFullYear() - 1;
      setFromDate(`${startYear}-04-01`);
      setToDate(getToday());
    }
  };

  // Load Brands
  useEffect(() => {
    async function loadBrands() {
      try {
        setLoadingBrands(true);
        const data = await inventoryService.getBrands();
        setBrands(data || []);
      } catch (err) {
        console.error("Failed to load brands", err);
      } finally {
        setLoadingBrands(false);
      }
    }
    loadBrands();
  }, []);

  // Load Report Data
  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await p0ReportService.getCompanyStockSalesReport({
        brandId: selectedBrandId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        searchTerm: searchTerm || undefined,
      });
      setReportData(data);
    } catch (err: any) {
      console.error("Failed to load company stock & sales report", err);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load company stock & sales statement from server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate, selectedBrandId]);

  // Export Toolbar Data Mapping
  const exportHeaders = [
    "Product Name",
    "SKU",
    "Company / Brand",
    "Packing",
    "MRP (₹)",
    "Purchase Price (₹)",
    "Sale Price (₹)",
    "Pur. Unit",
    "Sale Unit",
    "Stock In (Period)",
    "Current Stock",
    "Stock Value (₹)",
    "Sold Qty (Period)",
    "Sale Value (₹)",
  ];

  const exportRows = (reportData?.items || []).map((item) => [
    item.itemName,
    item.itemSku,
    item.companyName,
    item.packing || "-",
    item.mrp,
    item.purchasePrice,
    item.salePrice,
    item.purchaseUnit,
    item.saleUnit,
    item.stockInQuantity,
    item.currentStock,
    item.currentStockValue,
    item.soldQuantity,
    item.saleValue,
  ]);

  const exportSummaryData = reportData
    ? {
        "Total SKUs": reportData.totalItemsCount,
        "Period Stock In Qty": formatQty(reportData.grandStockInQty),
        "Total Current Stock": formatQty(reportData.grandCurrentStock),
        "Total Stock Valuation": formatCurrency(reportData.grandStockValue),
        "Period Sold Qty": formatQty(reportData.grandSoldQty),
        "Total Period Sale Value": formatCurrency(reportData.grandSaleValue),
      }
    : undefined;

  const activeCompanyName =
    selectedBrandId && brands.length > 0
      ? brands.find((b) => b.id === selectedBrandId)?.name || "Selected Company"
      : "All Companies / Brands";

  return (
    <div className="space-y-6">
      {/* ─── QUICK REPORT JUMP BAR ─────────────────────────────────────── */}
      <QuickReportJumpBar
        currentReportTitle={`Company Stock & Sales (${activeCompanyName})`}
      />

      {/* ─── PAGE HEADER & TOOLBAR ────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              COMPANY-STK-SALES
            </span>
            <span className="text-xs text-muted-foreground">
              Period: {fromDate} to {toDate}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Company Stock & Sales Statement
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Complete company-wise stock and sales statement: Packing, MRP, Purchase & Sale rates, Current Stock, Period Stock In, and Sales value.
          </p>
        </div>

        {/* Export Toolbar */}
        <ReportExportToolbar
          title="Company Stock & Sales Statement"
          subtitle={`Company: ${activeCompanyName} | Period: ${fromDate} to ${toDate}`}
          fileName={`Company_Stock_Sales_${activeCompanyName.replace(/\s+/g, "_")}`}
          headers={exportHeaders}
          rows={exportRows}
          summaryData={exportSummaryData}
          dateRangeText={`${fromDate} to ${toDate}`}
        />
      </div>

      {/* ─── FILTERS BAR ──────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Company / Brand Filter */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Company / Brand
            </label>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary font-medium"
            >
              <option value="">All Companies / Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.manufacturerName ? `(${b.manufacturerName})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Search Product / SKU */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              Search Product / SKU
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Product name, SKU, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadData();
                }}
                className="w-full text-sm bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Quick Date Range Buttons & Apply Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
          <div className="flex items-center space-x-1.5 text-muted-foreground">
            <span className="font-semibold text-foreground">Quick Periods:</span>
            <button
              onClick={() => handleDatePreset("this-month")}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors font-medium cursor-pointer"
            >
              This Month
            </button>
            <button
              onClick={() => handleDatePreset("last-month")}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors font-medium cursor-pointer"
            >
              Last Month
            </button>
            <button
              onClick={() => handleDatePreset("last30")}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors font-medium cursor-pointer"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleDatePreset("quarter")}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors font-medium cursor-pointer"
            >
              Current Quarter
            </button>
            <button
              onClick={() => handleDatePreset("fy")}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors font-medium cursor-pointer"
            >
              Financial Year (FY)
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Refreshing..." : "Apply & Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ─── ERROR ALERT ──────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center space-x-3 text-destructive text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* ─── KPI SUMMARY TILES ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Products */}
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Total SKUs</span>
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1">
            {reportData?.totalItemsCount ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {activeCompanyName}
          </div>
        </div>

        {/* Stock In (Purchases in Range) */}
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Stock In (Period)</span>
            <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {formatQty(reportData?.grandStockInQty)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Same-month purchases
          </div>
        </div>

        {/* Current Stock */}
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Current Stock</span>
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatQty(reportData?.grandCurrentStock)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Present Godown Balance
          </div>
        </div>

        {/* Current Stock Valuation */}
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Stock Valuation</span>
            <IndianRupee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1 truncate">
            {formatCurrency(reportData?.grandStockValue)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            At Purchase Price
          </div>
        </div>

        {/* Period Sold Qty */}
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Sold Qty (Period)</span>
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {formatQty(reportData?.grandSoldQty)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Total units sold
          </div>
        </div>

        {/* Period Sale Value */}
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Period Sale Value</span>
            <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1 truncate">
            {formatCurrency(reportData?.grandSaleValue)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Gross Billing Amount
          </div>
        </div>
      </div>

      {/* ─── DATA TABLE ──────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-foreground">
              Statement Items
            </span>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-2.5 py-0.5 rounded-full font-bold font-mono">
              {reportData?.items?.length ?? 0} Records
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Prices and values shown in INR (₹). Grand totals calculated at bottom.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-muted/60 text-slate-700 dark:text-muted-foreground font-bold uppercase tracking-wider border-b border-border sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 min-w-[200px]">Product Name & SKU</th>
                <th className="py-3 px-3 min-w-[130px]">Company / Brand</th>
                <th className="py-3 px-3 text-center min-w-[90px]">Packing</th>
                <th className="py-3 px-3 text-right min-w-[90px]">MRP (₹)</th>
                <th className="py-3 px-3 text-right min-w-[100px]">Pur. Price (₹)</th>
                <th className="py-3 px-3 text-right min-w-[100px]">Sale Price (₹)</th>
                <th className="py-3 px-3 text-center min-w-[80px]">Pur. Unit</th>
                <th className="py-3 px-3 text-center min-w-[80px]">Sale Unit</th>
                <th className="py-3 px-3 text-right min-w-[110px] bg-blue-50 dark:bg-blue-500/5 text-blue-700 dark:text-blue-400 font-bold">
                  Stock In (Period)
                </th>
                <th className="py-3 px-3 text-right min-w-[110px] bg-emerald-50 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 font-bold">
                  Current Stock
                </th>
                <th className="py-3 px-3 text-right min-w-[120px] bg-amber-50 dark:bg-amber-500/5 text-amber-700 dark:text-amber-400 font-bold">
                  Stock Value (₹)
                </th>
                <th className="py-3 px-3 text-right min-w-[110px] bg-purple-50 dark:bg-purple-500/5 text-purple-700 dark:text-purple-400 font-bold">
                  Sold Qty (Period)
                </th>
                <th className="py-3 px-3 text-right min-w-[130px] bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-black">
                  Sale Value (₹)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-muted-foreground">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                    <p className="text-sm font-medium">Generating Company Stock & Sales Statement...</p>
                    <p className="text-xs text-muted-foreground mt-1">Aggregating inventory balances, purchase bills, and sales registers</p>
                  </td>
                </tr>
              ) : reportData?.items && reportData.items.length > 0 ? (
                reportData.items.map((row, idx) => (
                  <tr
                    key={row.itemId}
                    className="hover:bg-muted/40 transition-colors font-medium"
                  >
                    <td className="py-2.5 px-3 text-center text-muted-foreground font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-foreground text-sm">
                        {row.itemName}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        SKU: {row.itemSku}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-secondary text-secondary-foreground">
                        {row.companyName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {row.packing && row.packing !== "-" ? (
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                          {row.packing}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                      {formatCurrency(row.mrp)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                      {formatCurrency(row.purchasePrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-foreground font-semibold">
                      {formatCurrency(row.salePrice)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-secondary/70 text-[11px]">
                        {row.purchaseUnit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-secondary/70 text-[11px]">
                        {row.saleUnit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/5">
                      {formatQty(row.stockInQuantity)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold bg-emerald-50/50 dark:bg-emerald-500/5 ${
                        row.currentStock <= 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {formatQty(row.currentStock)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-500/5">
                      {formatCurrency(row.currentStockValue)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-500/5">
                      {formatQty(row.soldQuantity)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-500/10">
                      {formatCurrency(row.saleValue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="font-semibold text-foreground">No Products Found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try selecting a different company or clearing the search term filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>

            {/* ─── GRAND TOTALS FOOTER ───────────────────────────────── */}
            {reportData && reportData.items.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-muted/90 font-bold border-t-2 border-primary/40 sticky bottom-0 z-10 shadow-sm">
                <tr className="text-foreground">
                  <td colSpan={4} className="py-3 px-4 uppercase text-xs tracking-wider font-extrabold text-foreground">
                    GRAND TOTAL ({reportData.totalItemsCount} Products)
                  </td>
                  <td className="py-3 px-3 text-right text-muted-foreground">-</td>
                  <td className="py-3 px-3 text-right text-muted-foreground">-</td>
                  <td className="py-3 px-3 text-right text-muted-foreground">-</td>
                  <td className="py-3 px-3 text-center text-muted-foreground">-</td>
                  <td className="py-3 px-3 text-center text-muted-foreground">-</td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-black text-blue-700 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-500/10">
                    {formatQty(reportData.grandStockInQty)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-500/10">
                    {formatQty(reportData.grandCurrentStock)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-black text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-500/10">
                    {formatCurrency(reportData.grandStockValue)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-black text-purple-700 dark:text-purple-400 bg-purple-100/70 dark:bg-purple-500/10">
                    {formatQty(reportData.grandSoldQty)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-500/20">
                    {formatCurrency(reportData.grandSaleValue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CompanyStockSalesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <CompanyStockSalesContent />
    </Suspense>
  );
}
