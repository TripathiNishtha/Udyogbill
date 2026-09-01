"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  Search,
  CheckCircle,
  FileSpreadsheet,
  Trash2,
  Zap,
  Boxes
} from "lucide-react";
import { pharmaDeepService, ExpiryDumpingBatch } from "@/services/pharma-deep-services";

export default function ExpiryDumpingPage() {
  const [batches, setBatches] = useState<ExpiryDumpingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<"All" | "30Days" | "60Days" | "Expired">("All");

  useEffect(() => {
    pharmaDeepService.getNearExpiryBatches().then((data) => {
      setBatches(data);
      setLoading(false);
    });
  }, []);

  const totalNearExpiryValue = batches.reduce((sum, b) => sum + b.totalStockValue, 0);

  const filteredBatches = batches.filter((b) => {
    if (selectedFilter === "30Days") return b.daysToExpiry <= 30 && b.daysToExpiry >= 0;
    if (selectedFilter === "60Days") return b.daysToExpiry <= 60 && b.daysToExpiry >= 0;
    if (selectedFilter === "Expired") return b.daysToExpiry < 0;
    return true;
  });

  const handleGenerateSupplierReturns = () => {
    alert("Generated 2 Return to Supplier Challans for Near-Expiry & Expired Stock!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-rose-600/20 border border-rose-500/30 rounded-xl text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Near-Expiry &amp; Breakage Return Engine</h1>
            <p className="text-sm text-slate-400">Scan expiring medicine batches and generate automated vendor return challans</p>
          </div>
        </div>

        <button
          onClick={handleGenerateSupplierReturns}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-lg shadow-rose-600/20 transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>1-Click Generate Supplier Return Challans</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-xs font-sans text-slate-400 block mb-1">Near-Expiry / Expired Batches</span>
          <span className="text-2xl font-bold text-rose-400">{batches.length} Batches Flagged</span>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-xs font-sans text-slate-400 block mb-1">Total Expiring Units</span>
          <span className="text-2xl font-bold text-white">
            {batches.reduce((s, b) => s + b.currentStock, 0)} Units
          </span>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-xs font-sans text-slate-400 block mb-1">Total Claimable Supplier Value</span>
          <span className="text-2xl font-bold text-emerald-400">
            ₹{totalNearExpiryValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: "All", label: "All Flagged Batches" },
          { id: "30Days", label: "Expiring in <30 Days" },
          { id: "60Days", label: "Expiring in <60 Days" },
          { id: "Expired", label: "Already Expired" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
              selectedFilter === tab.id
                ? "bg-rose-600 border-rose-500 text-white"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Medicine SKU &amp; Name</th>
                <th className="py-3.5 px-4">Batch Number</th>
                <th className="py-3.5 px-4 text-center">Expiry (MM/YY)</th>
                <th className="py-3.5 px-4 text-center">Days Remaining</th>
                <th className="py-3.5 px-4 text-center">Current Stock</th>
                <th className="py-3.5 px-4">Supplier (Vendor)</th>
                <th className="py-3.5 px-4 text-right">Purchase Rate</th>
                <th className="py-3.5 px-4 text-right">Return Claim Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filteredBatches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-sans font-semibold text-white">{b.itemName}</div>
                    <span className="text-indigo-400">{b.sku}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-amber-400">{b.batchNumber}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-rose-400">{b.expiryDate}</td>
                  <td className="py-3.5 px-4 text-center">
                    {b.daysToExpiry < 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                        EXPIRED ({Math.abs(b.daysToExpiry)}d ago)
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold">{b.daysToExpiry} days</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-white">{b.currentStock} Units</td>
                  <td className="py-3.5 px-4 font-sans text-slate-300">{b.supplierName}</td>
                  <td className="py-3.5 px-4 text-right">₹{b.purchaseRate.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                    ₹{b.totalStockValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
