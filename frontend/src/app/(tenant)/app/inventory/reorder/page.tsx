"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingDown,
  ShoppingCart,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  Boxes,
  Zap,
  ArrowRight
} from "lucide-react";
import { inventoryService } from "@/services/inventory-services";
import { LowStockItem } from "@/types";

export default function AutoReorderPage() {
  const [alerts, setAlerts] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getLowStockAlerts();
      setAlerts(data || []);
    } catch (err) {
      console.error("Failed to load low stock alerts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalSuggestedQty = alerts.reduce((sum, a) => sum + (a.reorderQuantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-rose-600/20 border border-rose-500/30 rounded-xl text-rose-400">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Re-order Alerts &amp; Min Stock Engine</h1>
            <p className="text-sm text-slate-400">Live PostgreSQL inventory monitoring: items whose physical warehouse balance has breached minimum alert thresholds</p>
          </div>
        </div>

        <Link
          href="/app/purchase/orders/create"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/20 transition"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>+ Create Purchase Order</span>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Critical Depleted SKUs</span>
          <span className="text-2xl font-mono font-bold text-rose-400">
            {loading ? "..." : `${alerts.length} Items Below Threshold`}
          </span>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Total Recommended Reorder Units</span>
          <span className="text-2xl font-mono font-bold text-white">
            {loading ? "..." : `${totalSuggestedQty.toLocaleString("en-IN")} Units`}
          </span>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Database Monitoring Status</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-400">Active Real-Time Tracking</span>
          </div>
        </div>
      </div>

      {/* Reorder Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Item SKU &amp; Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-center">Current Warehouse Stock</th>
                <th className="py-3.5 px-4 text-center">Min Alert Level</th>
                <th className="py-3.5 px-4 text-center">Suggested PO Qty</th>
                <th className="py-3.5 px-4 text-center">Urgency</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    Scanning database stock balances against minimum reorder limits...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-emerald-400 font-sans">
                    ✓ All inventory stocks are healthy. No items are currently below minimum alert levels.
                  </td>
                </tr>
              ) : (
                alerts.map((item) => (
                  <tr key={item.itemId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-white block">{item.name}</span>
                      <span className="text-slate-500 text-[11px] font-mono">{item.sku}</span>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">{item.categoryName || "General"}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-rose-400">
                      {item.currentStock} {item.primaryUomCode}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 font-sans">
                      {item.minimumStockAlert} {item.primaryUomCode}
                    </td>
                    <td className="py-3.5 px-4 text-center text-indigo-300 font-bold">
                      {item.reorderQuantity} {item.primaryUomCode}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {item.currentStock <= 0 ? "Out of Stock" : "Low Stock"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <Link
                        href={`/app/purchase/orders/create?itemId=${item.itemId}&qty=${item.reorderQuantity}`}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs inline-flex items-center space-x-1 shadow"
                      >
                        <span>Order Now</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
