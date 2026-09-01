"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Building2,
  Receipt,
  ArrowUpDown,
  Calculator,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  p0ReportService,
  SalesRegisterDetailedReport,
  SalesRegisterLineItem
} from "@/services/p0-reports.service";
import { tenantAppService } from "@/services/tenant-app-services";
import { TenantDetails } from "@/types";
import { ReportExportToolbar } from "@/components/reports/report-export-toolbar";

export default function CaPackReportPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState<TenantDetails | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<"this_month" | "last_month" | "this_quarter" | "this_fy" | "custom">("this_month");
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState("");
  const [gstRateFilter, setGstRateFilter] = useState<string>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Data
  const [data, setData] = useState<SalesRegisterDetailedReport | null>(null);

  // Load Profile
  useEffect(() => {
    tenantAppService.getBusinessProfile().then((p) => setProfile(p)).catch(() => {});
  }, []);

  // Quick Preset Change
  const handlePresetChange = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === "this_month") {
      setFromDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setToDate(now.toISOString().slice(0, 10));
    } else if (preset === "last_month") {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(firstDayLastMonth.toISOString().slice(0, 10));
      setToDate(lastDayLastMonth.toISOString().slice(0, 10));
    } else if (preset === "this_quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const firstDayQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      setFromDate(firstDayQuarter.toISOString().slice(0, 10));
      setToDate(now.toISOString().slice(0, 10));
    } else if (preset === "this_fy") {
      const currentYear = now.getFullYear();
      const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
      setFromDate(`${fyStartYear}-04-01`);
      setToDate(now.toISOString().slice(0, 10));
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await p0ReportService.getSalesRegisterDetailed({
        fromDate,
        toDate,
        searchTerm: searchTerm || undefined,
        gstRate: gstRateFilter !== "all" ? Number(gstRateFilter) : undefined,
        pageNumber,
        pageSize,
      });
      setData(res);
    } catch (err: any) {
      console.error("Failed to load CA Pack data", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to retrieve CA Pack report from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate, gstRateFilter, pageNumber, pageSize]);

  const items = data?.items || [];

  // Filter items if search is active locally for instant feedback
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.invoiceNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        (item.customerGstin && item.customerGstin.toLowerCase().includes(q)) ||
        (item.hsnCode && item.hsnCode.toLowerCase().includes(q)) ||
        item.productName.toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  // Aggregate totals
  const totalTaxable = filteredItems.reduce((a, b) => a + (b.taxableAmount || 0), 0);
  const totalCgst = filteredItems.reduce((a, b) => a + (b.cgstAmount || 0), 0);
  const totalSgst = filteredItems.reduce((a, b) => a + (b.sgstAmount || 0), 0);
  const totalIgst = filteredItems.reduce((a, b) => a + (b.igstAmount || 0), 0);
  const totalTax = filteredItems.reduce((a, b) => a + (b.totalTax || 0), 0);
  const totalInvoiceValue = filteredItems.reduce((a, b) => a + (b.netInvoiceValue || 0), 0);
  const totalQty = filteredItems.reduce((a, b) => a + (b.quantity || 0), 0);

  // Headers for Export Toolbar
  const exportHeaders = [
    "Bill No.",
    "Name of Party",
    "GSTN",
    "Invoice Date",
    "Value of Goods",
    "CGST",
    "SGST / UTGST",
    "IGST",
    "Total Tax",
    "Total Invoice Value",
    "HSN Code",
    "Quantity",
    "Unit"
  ];

  // Rows for Export Toolbar
  const exportRows = filteredItems.map((item) => [
    item.invoiceNumber,
    item.customerName,
    item.customerGstin || "Unregistered / B2C",
    new Date(item.invoiceDate).toLocaleDateString("en-IN"),
    `(${item.gstRate}%) ${item.taxableAmount.toFixed(2)}`,
    `(${(item.gstRate / 2).toFixed(1)}%) ${item.cgstAmount.toFixed(2)}`,
    `(${(item.gstRate / 2).toFixed(1)}%) ${item.sgstAmount.toFixed(2)}`,
    item.igstAmount.toFixed(2),
    item.totalTax.toFixed(2),
    item.netInvoiceValue.toFixed(2),
    item.hsnCode || "—",
    item.quantity.toFixed(2),
    item.uomCode || "UNT"
  ]);

  const summaryData = {
    "Total Bills": filteredItems.length,
    "Taxable Value": `₹ ${totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    "Total Tax": `₹ ${totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    "Total Invoice Value": `₹ ${totalInvoiceValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* ─── HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>CA PACK</span>
                <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold rounded-full uppercase tracking-wider">
                  Audit &amp; GST Ready
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                {profile?.businessName || "UdyogBill Enterprise"} — Comprehensive GST &amp; Tax Audit Register for Chartered Accountants
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── KPI METRIC SUMMARY CARDS ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Invoices</span>
          <span className="text-xl font-black text-white mt-1 block">{filteredItems.length}</span>
          <span className="text-[10px] text-slate-500">{data?.distinctInvoicesCount || filteredItems.length} Vouchers</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Value of Goods (Taxable)</span>
          <span className="text-xl font-black text-indigo-400 mt-1 block">₹ {totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-[10px] text-slate-500">Base Goods Turnover</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total CGST</span>
          <span className="text-xl font-black text-emerald-400 mt-1 block">₹ {totalCgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-[10px] text-slate-500">Central Tax</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total SGST / UTGST</span>
          <span className="text-xl font-black text-emerald-400 mt-1 block">₹ {totalSgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-[10px] text-slate-500">State / UT Tax</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Tax (Output)</span>
          <span className="text-xl font-black text-amber-400 mt-1 block">₹ {totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-[10px] text-slate-500">CGST + SGST + IGST</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Invoice Value</span>
          <span className="text-xl font-black text-white mt-1 block">₹ {totalInvoiceValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-[10px] text-indigo-400 font-semibold">Gross Taxable + Tax</span>
        </div>
      </div>

      {/* ─── FILTER CONTROLS ────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4">
        {/* Date Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(
              [
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "this_quarter", label: "This Quarter" },
                { id: "this_fy", label: "Financial Year" },
                { id: "custom", label: "Custom Range" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  datePreset === p.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Reload Data</span>
          </button>
        </div>

        {/* Date pickers and search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 border-t border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Bill No, Party, GSTIN, HSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setDatePreset("custom");
                setFromDate(e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setDatePreset("custom");
                setToDate(e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">GST Rate:</span>
            <select
              value={gstRateFilter}
              onChange={(e) => setGstRateFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All GST Slabs (0%, 5%, 12%, 18%, 28%)</option>
              <option value="0">0% (Nil / Exempt)</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST</option>
              <option value="28">28% GST</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── DATA TABLE (EXACT MATCH OF CA PACK AUDIT FORMAT) ────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Table Title Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              CA Audit Register Data View
            </h2>
            <span className="text-xs text-slate-400">({filteredItems.length} line items)</span>
          </div>

          {/* Universal Export Toolbar (PDF, Excel, CSV, Email, WhatsApp) */}
          <ReportExportToolbar
            title="CA Pack — Comprehensive GST & Audit Register"
            subtitle="Taxable Value, CGST, SGST, IGST, HSN, and Invoice Breakdown"
            fileName="UdyogBill_CA_Pack_Register"
            headers={exportHeaders}
            rows={exportRows}
            summaryData={summaryData}
            businessName={profile?.businessName || "UdyogBill Enterprise"}
            dateRangeText={`${new Date(fromDate).toLocaleDateString("en-IN")} to ${new Date(toDate).toLocaleDateString("en-IN")}`}
          />

          <span className="text-xs text-indigo-400 font-semibold">
            Period: {new Date(fromDate).toLocaleDateString("en-IN")} — {new Date(toDate).toLocaleDateString("en-IN")}
          </span>
        </div>

        {errorMsg && (
          <div className="p-4 m-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-amber-500/10 text-amber-300 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-3 border-r border-slate-800/80">Bill No.</th>
                <th className="py-3.5 px-3 border-r border-slate-800/80 min-w-[180px]">Name of Party</th>
                <th className="py-3.5 px-3 border-r border-slate-800/80 min-w-[140px]">GSTN</th>
                <th className="py-3.5 px-3 border-r border-slate-800/80 whitespace-nowrap">Invoice Date</th>
                <th className="py-3.5 px-3 border-r border-slate-800/80 text-right min-w-[120px]">Value of Goods</th>
                <th className="py-3.5 px-3 border-r border-slate-800/80 text-right min-w-[100px]">CGST</th>
                <th className="py-3.5 px-3 border-r border-slate-800/80 text-right min-w-[100px]">SGST / UTGST</th>
                <th className="py-3.5 px-3 border-r border-slate-800/80 text-right min-w-[90px]">IGST</th>
                <th className="py-3.5 px-3 border-r border-slate-800/80 text-right min-w-[100px]">Total Tax</th>
                <th className="py-3.5 px-3 border-r border-slate-800/80 text-right min-w-[120px]">Total Invoice Value</th>
                <th className="py-3.5 px-3 border-r border-slate-800/80 text-center">HSN code</th>
                <th className="py-3.5 px-3 border-r border-slate-800/80 text-right">Quantity</th>
                <th className="py-3.5 px-3 text-center">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 font-sans">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    <span>Compiling CA Pack Register...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500 font-sans">
                    No sales/tax invoices found in the selected date range.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={`${item.invoiceId}-${item.itemId}-${idx}`}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 border-r border-slate-800/80 font-bold text-indigo-400">
                      <Link href={`/app/sales/invoices/${item.invoiceId}`} className="hover:underline">
                        {item.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-800/80 font-sans font-semibold text-white">
                      <div>{item.customerName}</div>
                      <div className="text-[10px] font-sans font-normal text-slate-400">{item.productName}</div>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-800/80 text-slate-300">
                      {item.customerGstin || <span className="text-slate-500 font-sans italic">Unregistered</span>}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-800/80 text-slate-300 whitespace-nowrap">
                      {new Date(item.invoiceDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-800/80 text-right text-slate-200">
                      <span className="text-slate-500 text-[10px] mr-1">({item.gstRate}%)</span>
                      {item.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-800/80 text-right text-slate-300">
                      {item.cgstAmount > 0 ? (
                        <>
                          <span className="text-slate-500 text-[10px] mr-1">({(item.gstRate / 2).toFixed(1)}%)</span>
                          {item.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </>
                      ) : (
                        "0.00"
                      )}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-800/80 text-right text-slate-300">
                      {item.sgstAmount > 0 ? (
                        <>
                          <span className="text-slate-500 text-[10px] mr-1">({(item.gstRate / 2).toFixed(1)}%)</span>
                          {item.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </>
                      ) : (
                        "0.00"
                      )}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-800/80 text-right text-slate-300">
                      {item.igstAmount > 0 ? (
                        <>
                          <span className="text-slate-500 text-[10px] mr-1">({item.gstRate}%)</span>
                          {item.igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </>
                      ) : (
                        "0.00"
                      )}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-800/80 text-right font-bold text-amber-300">
                      {item.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-800/80 text-right font-black text-white">
                      {item.netInvoiceValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-800/80 text-center text-slate-400">
                      {item.hsnCode || "—"}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-800/80 text-right text-slate-200">
                      {item.quantity.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400 font-sans uppercase text-[10px]">
                      {item.uomCode || "UNT"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="bg-slate-950 text-white font-bold border-t-2 border-slate-700 text-[11px]">
                  <td colSpan={4} className="py-3 px-3 border-r border-slate-800 text-right uppercase tracking-wider">
                    Total Summary:
                  </td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right text-indigo-400 font-mono">
                    ₹ {totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right text-emerald-400 font-mono">
                    ₹ {totalCgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right text-emerald-400 font-mono">
                    ₹ {totalSgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right text-emerald-400 font-mono">
                    ₹ {totalIgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right text-amber-300 font-mono font-black">
                    ₹ {totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right text-white font-mono font-black">
                    ₹ {totalInvoiceValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 border-r border-slate-800 text-center text-slate-500">—</td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right font-mono text-slate-300">
                    {totalQty.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-500">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
