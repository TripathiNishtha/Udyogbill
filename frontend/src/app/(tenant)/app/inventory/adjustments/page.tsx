"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Plus,
  ArrowLeft,
  Search,
  CheckCircle,
  AlertTriangle,
  Scale,
  X
} from "lucide-react";
import { inventoryService } from "@/services/inventory-services";
import { tenantAppService, WarehouseDetails } from "@/services/tenant-app-services";
import { StockMovement } from "@/types";

export default function StockAdjustmentsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDetails[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [selectedWhId, setSelectedWhId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [movementType, setMovementType] = useState<number>(5); // 5: PhysicalAdjustment, 6: DamageLoss, 7: ExpiredWriteOff
  const [qtyChange, setQtyChange] = useState<number>(-1);
  const [adjReason, setAdjReason] = useState("Damaged during godown handling");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [movRes, whList, itemRes] = await Promise.all([
        inventoryService.getStockMovements({ pageNumber: 1, pageSize: 50 }),
        tenantAppService.getWarehouses(),
        inventoryService.getItems({ pageNumber: 1, pageSize: 100 })
      ]);

      setMovements(movRes?.items || []);
      setWarehouses(whList || []);
      setItems(itemRes?.items || []);

      if (whList?.length > 0) setSelectedWhId(whList[0].id);
      if (itemRes?.items?.length > 0) setSelectedItemId(itemRes.items[0].id);
    } catch (err) {
      console.error("Failed to load adjustments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWhId || !selectedItemId) {
      alert("Warehouse and Item are required.");
      return;
    }
    if (qtyChange === 0) {
      alert("Quantity change cannot be zero.");
      return;
    }

    try {
      setSubmitting(true);
      const item = items.find((i) => i.id === selectedItemId);
      await inventoryService.recordStockAdjustment({
        warehouseId: selectedWhId,
        itemId: selectedItemId,
        quantityChange: Number(qtyChange),
        movementType: Number(movementType),
        unitCost: item?.purchasePrice || 0,
        notes: adjReason.trim() || "Stock verification"
      });

      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to record stock adjustment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-600/20 border border-amber-500/30 rounded-xl text-amber-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Stock Audit &amp; Physical Adjustments</h1>
            <p className="text-sm text-slate-400">Reconcile physical stock counts, log variances, write off damaged inventory</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-lg shadow-amber-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Stock Adjustment</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Item</th>
                <th className="py-3.5 px-4">Warehouse</th>
                <th className="py-3.5 px-4">Movement Type</th>
                <th className="py-3.5 px-4 text-center">Before</th>
                <th className="py-3.5 px-4 text-center">Change</th>
                <th className="py-3.5 px-4 text-center">After</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    Loading stock adjustments from database...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No stock adjustments recorded. Click &ldquo;+ Record Stock Adjustment&rdquo; to adjust quantities.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-sans text-slate-400">{new Date(m.createdAtUtc).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="font-semibold text-white block">{m.itemName}</span>
                      <span className="text-slate-500 text-[11px] font-mono">{m.itemSku}</span>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">{m.warehouseName}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {m.movementTypeName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400">{m.quantityBefore}</td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span className={m.quantity < 0 ? "text-rose-400" : "text-emerald-400"}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-white">{m.quantityAfter}</td>
                    <td className="py-3.5 px-4 font-sans text-slate-400 text-xs">{m.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <Scale className="w-5 h-5 text-amber-400" />
                <span>+ Record Stock Adjustment &amp; Variance</span>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Godown / Warehouse *</label>
                <select
                  value={selectedWhId}
                  onChange={(e) => setSelectedWhId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseName} ({w.warehouseCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Item to Adjust *</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Adjustment Type</label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  >
                    <option value={5}>Physical Count Adjustment</option>
                    <option value={6}>Damaged / Broken Loss</option>
                    <option value={7}>Expired Stock Write-Off</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Quantity Change (e.g. -5 or +10) *
                  </label>
                  <input
                    type="number"
                    required
                    value={qtyChange}
                    onChange={(e) => setQtyChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Reason / Notes</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physical inventory count variance reconciliation"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30"
                >
                  {submitting ? "Applying..." : "Apply Stock Adjustment (DB Transaction)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
