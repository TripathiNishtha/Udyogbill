"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Download,
  Calendar,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertCircle,
  Building2,
  Hash,
} from "lucide-react";
import { reportService } from "@/services/report-services";
import { Gstr1Report, Gstr3bReport } from "@/types";
import { ReportExportToolbar } from "@/components/reports/report-export-toolbar";

export default function GstReturnsPage() {
  const [activeTab, setActiveTab] = useState<"gstr1" | "gstr3b">("gstr1");
  const [loading, setLoading] = useState<boolean>(true);
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [gstr1, setGstr1] = useState<Gstr1Report | null>(null);
  const [gstr3b, setGstr3b] = useState<Gstr3bReport | null>(null);

  const loadGstData = async () => {
    try {
      setLoading(true);
      if (activeTab === "gstr1") {
        const data = await reportService.getGstr1Report(fromDate, toDate);
        setGstr1(data);
      } else {
        const data = await reportService.getGstr3bReport(fromDate, toDate);
        setGstr3b(data);
      }
    } catch (err) {
      console.error("Failed to load GST data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGstData();
  }, [activeTab, fromDate, toDate]);

  const handleExportCsv = async () => {
    try {
      if (activeTab === "gstr1") {
        await reportService.downloadGstr1Csv(fromDate, toDate);
      } else {
        await reportService.downloadGstr3bCsv(fromDate, toDate);
      }
    } catch (err) {
      alert("Failed to export GST CSV");
    }
  };

  const exportHeaders = activeTab === "gstr1"
    ? ["Invoice #", "Date", "Customer / Party", "GSTIN", "Place of Supply", "Taxable Value", "CGST", "SGST", "IGST", "CESS", "Total Tax", "Invoice Value"]
    : ["Supply Category", "Taxable Value", "IGST", "CGST", "SGST / UTGST", "CESS"];

  const exportRows = activeTab === "gstr1"
    ? [
        ...(gstr1?.b2bInvoices || []).map((inv) => [
          inv.invoiceNumber,
          new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
          inv.customerName,
          inv.customerGstin,
          inv.placeOfSupply,
          inv.taxableAmount.toFixed(2),
          inv.cgstAmount.toFixed(2),
          inv.sgstAmount.toFixed(2),
          inv.igstAmount.toFixed(2),
          inv.cessAmount.toFixed(2),
          (inv.cgstAmount + inv.sgstAmount + inv.igstAmount).toFixed(2),
          inv.totalInvoiceValue.toFixed(2),
        ]),
        ...(gstr1?.b2cInvoices || []).map((inv) => [
          inv.invoiceNumber,
          new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
          "B2C Customer",
          "Unregistered",
          inv.placeOfSupply,
          inv.taxableAmount.toFixed(2),
          inv.cgstAmount.toFixed(2),
          inv.sgstAmount.toFixed(2),
          inv.igstAmount.toFixed(2),
          inv.cessAmount.toFixed(2),
          (inv.cgstAmount + inv.sgstAmount + inv.igstAmount).toFixed(2),
          inv.totalInvoiceValue.toFixed(2),
        ]),
      ]
    : [
        [
          "Outward Taxable Supplies (Other than zero/nil)",
          (gstr3b?.outwardTaxableSupplies?.taxableValue || 0).toFixed(2),
          (gstr3b?.outwardTaxableSupplies?.igst || 0).toFixed(2),
          (gstr3b?.outwardTaxableSupplies?.cgst || 0).toFixed(2),
          (gstr3b?.outwardTaxableSupplies?.sgst || 0).toFixed(2),
          (gstr3b?.outwardTaxableSupplies?.cess || 0).toFixed(2),
        ],
        [
          "Eligible ITC (Input Tax Credit) All Other",
          "—",
          (gstr3b?.eligibleItc?.igst || 0).toFixed(2),
          (gstr3b?.eligibleItc?.cgst || 0).toFixed(2),
          (gstr3b?.eligibleItc?.sgst || 0).toFixed(2),
          (gstr3b?.eligibleItc?.cess || 0).toFixed(2),
        ],
      ];

  const summaryExportData = activeTab === "gstr1"
    ? {
        "Total Taxable Value": `₹ ${(gstr1?.totalTaxableValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        "Total Output Tax": `₹ ${(gstr1?.totalTaxValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        "B2B Records": (gstr1?.b2bInvoices || []).length,
        "B2C Records": (gstr1?.b2cInvoices || []).length,
      }
    : {
        "Outward Taxable": `₹ ${(gstr3b?.outwardTaxableSupplies?.taxableValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        "Total Eligible ITC": `₹ ${(gstr3b?.eligibleItc?.totalItc || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-6 h-6" />
            </span>
            <span>GST Returns &amp; Filing (India GST Compliant)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Official monthly/quarterly GST returns with B2B/B2C breakdowns, HSN summaries, and Eligible ITC offset.
          </p>
        </div>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-850">
          <button
            onClick={() => setActiveTab("gstr1")}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "gstr1"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            GSTR-1 (Outward Supplies)
          </button>
          <button
            onClick={() => setActiveTab("gstr3b")}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "gstr3b"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            GSTR-3B (Summary Return)
          </button>
        </div>

        {/* Universal Export Toolbar right in the middle */}
        <ReportExportToolbar
          title={`GST Returns & Filing (${activeTab.toUpperCase()})`}
          fileName={`GST_${activeTab.toUpperCase()}_Return`}
          headers={exportHeaders}
          rows={exportRows}
          summaryData={summaryExportData}
          dateRangeText={`${new Date(fromDate).toLocaleDateString("en-IN")} to ${new Date(toDate).toLocaleDateString("en-IN")}`}
        />

        {/* Date Filter */}
        <div className="flex items-center space-x-2 pr-2">
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
          <button
            onClick={loadGstData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors ml-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-sm">Generating GST Return Data...</p>
        </div>
      ) : activeTab === "gstr1" && gstr1 ? (
        <div className="space-y-6">
          {/* GSTR-1 Header Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
              <div className="text-xs text-slate-400 font-semibold mb-1">TABLE 4: B2B INVOICES</div>
              <div className="text-2xl font-black text-white">
                ₹{gstr1.totalB2BTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
                <span>Count: {gstr1.totalB2BInvoices}</span>
                <span className="text-indigo-400 font-bold">
                  Tax: ₹{gstr1.totalB2BTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
              <div className="text-xs text-slate-400 font-semibold mb-1">TABLE 7: B2C (OTHERS)</div>
              <div className="text-2xl font-black text-white">
                ₹{gstr1.totalB2CTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
                <span>Count: {gstr1.totalB2CInvoices}</span>
                <span className="text-indigo-400 font-bold">
                  Tax: ₹{gstr1.totalB2CTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-indigo-950/40 to-slate-950 border border-indigo-800/40 rounded-2xl shadow-lg">
              <div className="text-xs text-indigo-300 font-semibold mb-1">TOTAL OUTWARD SUPPLIES</div>
              <div className="text-2xl font-black text-emerald-400">
                ₹{gstr1.totalOutwardTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-indigo-300/80 flex items-center justify-between border-t border-indigo-900/40 pt-2">
                <span>All Documents</span>
                <span className="text-white font-bold">
                  Total Tax: ₹{gstr1.totalOutwardTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Rate-wise Summary Table */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Tax Rate Slab Breakdown</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Rate Slab</th>
                    <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
                    <th className="py-3 px-4 text-right">CGST (₹)</th>
                    <th className="py-3 px-4 text-right">SGST (₹)</th>
                    <th className="py-3 px-4 text-right">IGST (₹)</th>
                    <th className="py-3 px-4 text-right">Total Tax (₹)</th>
                    <th className="py-3 px-4 text-right text-white">Total Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {gstr1.rateWiseSummary.map((row) => (
                    <tr key={row.rateSlab} className="hover:bg-slate-850/50">
                      <td className="py-3 px-4 font-bold text-indigo-400">{row.rateSlab}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{row.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{row.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{row.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{row.igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                        ₹{row.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        ₹{row.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 12: HSN Summary */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Hash className="w-5 h-5 text-indigo-400" />
              <span>Table 12: HSN-wise Summary of Outward Supplies</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">HSN Code</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">UOM</th>
                    <th className="py-3 px-4 text-right">Total Qty</th>
                    <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
                    <th className="py-3 px-4 text-right">Rate %</th>
                    <th className="py-3 px-4 text-right">CGST (₹)</th>
                    <th className="py-3 px-4 text-right">SGST (₹)</th>
                    <th className="py-3 px-4 text-right">IGST (₹)</th>
                    <th className="py-3 px-4 text-right text-white">Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {gstr1.hsnSummary.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-850/50">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">{h.hsnCode}</td>
                      <td className="py-3 px-4 text-slate-200">{h.description}</td>
                      <td className="py-3 px-4 font-semibold text-slate-400">{h.uom}</td>
                      <td className="py-3 px-4 text-right font-mono">{h.totalQuantity}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{h.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{h.taxRate}%</td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{h.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{h.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{h.igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        ₹{h.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === "gstr3b" && gstr3b ? (
        <div className="space-y-6">
          {/* Table 3.1 & 4 Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <div className="text-xs text-slate-400 font-bold uppercase">3.1 OUTWARD TAX LIABILITY</div>
              <div className="text-2xl font-black text-rose-400">
                ₹{gstr3b.totalOutputTaxLiability.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span>Taxable Supplies:</span>
                  <span className="font-semibold text-white">
                    ₹{gstr3b.outwardTaxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>CGST: ₹{gstr3b.outwardCgst.toFixed(2)}</span>
                  <span>SGST: ₹{gstr3b.outwardSgst.toFixed(2)}</span>
                  <span>IGST: ₹{gstr3b.outwardIgst.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <div className="text-xs text-slate-400 font-bold uppercase">4. ELIGIBLE ITC (INPUT CREDIT)</div>
              <div className="text-2xl font-black text-emerald-400">
                ₹{gstr3b.totalEligibleItc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span>Inward Taxable:</span>
                  <span className="font-semibold text-white">
                    ₹{gstr3b.inwardTaxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>CGST: ₹{gstr3b.inwardCgst.toFixed(2)}</span>
                  <span>SGST: ₹{gstr3b.inwardSgst.toFixed(2)}</span>
                  <span>IGST: ₹{gstr3b.inwardIgst.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-amber-950/40 to-slate-950 border border-amber-800/40 rounded-2xl space-y-4">
              <div className="text-xs text-amber-300 font-bold uppercase">6.1 NET TAX PAYABLE (IN CASH)</div>
              <div className="text-2xl font-black text-amber-400">
                ₹{gstr3b.totalNetGstPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="space-y-1.5 text-xs text-amber-200/80 border-t border-amber-900/40 pt-3">
                <div className="flex justify-between">
                  <span>Net CGST:</span>
                  <span className="font-semibold text-white">₹{gstr3b.netCgstPayable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net SGST:</span>
                  <span className="font-semibold text-white">₹{gstr3b.netSgstPayable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net IGST:</span>
                  <span className="font-semibold text-white">₹{gstr3b.netIgstPayable.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
