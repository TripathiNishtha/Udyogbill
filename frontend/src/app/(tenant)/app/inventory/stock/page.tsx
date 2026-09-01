"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Warehouse as WarehouseIcon,
  Sliders,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Search,
  X,
  AlertTriangle
} from "lucide-react";
import {
  inventoryService,
  StockAdjustmentInput
} from "@/services/inventory-services";
import { tenantAppService, BranchDetails } from "@/services/tenant-app-services";
import { WarehouseStock, StockMovement, ItemList } from "@/types";

export default function TenantStockExplorerPage() {
  const [activeTab, setActiveTab] = useState<"balances" | "ledger">("balances");
  const [balances, setBalances] = useState<WarehouseStock[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<ItemList[]>([]);
  const [branches, setBranches] = useState<BranchDetails[]>([]);

  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [loading, setLoading] = useState(true);

  // Adjustment Modal
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjForm, setAdjForm] = useState<StockAdjustmentInput>({
    itemId: "",
    warehouseId: "",
    movementType: 5, // PhysicalAdjustment
    quantityChange: 0,
    unitCost: 0,
    referenceDocumentNumber: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stocksRes, movesRes, itemsRes, branchData] = await Promise.all([
        inventoryService.getStockBalances({
          warehouseId: selectedWarehouse || undefined,
        }),
        inventoryService.getStockMovements({
          warehouseId: selectedWarehouse || undefined,
        }),
        inventoryService.getItems({ pageSize: 100 }),
        tenantAppService.getBranches(),
      ]);
      setBalances(stocksRes);
      setMovements(movesRes.items);
      setItems(itemsRes.items);
      setBranches(branchData);

      const allWh = branchData.flatMap((b) => b.warehouses);
      if (allWh.length > 0 && !adjForm.warehouseId) {
        setAdjForm((prev) => ({ ...prev, warehouseId: allWh[0].id }));
      }
      if (itemsRes.items.length > 0 && !adjForm.itemId) {
        setAdjForm((prev) => ({ ...prev, itemId: itemsRes.items[0].id, unitCost: itemsRes.items[0].purchasePrice }));
      }
    } catch (err) {
      console.error("Failed to load inventory stock balances", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedWarehouse]);

  const allWarehouses = branches.flatMap((b) => b.warehouses);

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjForm.itemId || !adjForm.warehouseId || adjForm.quantityChange === 0) {
      alert("Please specify item, warehouse, and non-zero quantity change.");
      return;
    }

    try {
      setSubmitting(true);
      await inventoryService.recordStockAdjustment({
        ...adjForm,
        quantityChange: Number(adjForm.quantityChange),
        unitCost: Number(adjForm.unitCost) || 0,
      });
      setIsAdjModalOpen(false);
      setAdjForm({
        itemId: items[0]?.id || "",
        warehouseId: allWarehouses[0]?.id || "",
        movementType: 5,
        quantityChange: 0,
        unitCost: items[0]?.purchasePrice || 0,
        referenceDocumentNumber: "",
        notes: "",
      });
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to record stock adjustment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <WarehouseIcon className="w-6 h-6 text-indigo-400" />
            <span>Multi-Warehouse Stock Ledger & Explorer</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time physical inventory balances across storage godowns and immutable stock movements ledger.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAdjModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Sliders className="w-4 h-4" />
            <span>Adjust Stock / Audit</span>
          </button>
        </div>
      </div>

      {/* Tabs and Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab("balances")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "balances"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            Stock Balances ({balances.length})
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "ledger"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            Movement Ledger ({movements.length})
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400">Filter Warehouse:</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Storage Locations</option>
            {allWarehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.warehouseName} ({w.warehouseCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab 1: Stock Balances Table */}
      {activeTab === "balances" && (
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/50 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Warehouse / Branch</th>
                <th className="px-5 py-3.5 font-semibold">Batch Number</th>
                <th className="px-5 py-3.5 font-semibold">Expiry Date</th>
                <th className="px-5 py-3.5 font-semibold text-right">Current Stock</th>
                <th className="px-5 py-3.5 font-semibold text-right">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Loading stock balances...
                  </td>
                </tr>
              ) : balances.length > 0 ? (
                balances.map((b, idx) => (
                  <tr key={`${b.warehouseId}-${b.batchId || idx}`} className="hover:bg-slate-900/40">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white">{b.warehouseName}</div>
                      <div className="text-[11px] text-slate-400">
                        {b.branchName} <span className="font-mono text-indigo-400">({b.warehouseCode})</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-indigo-300 font-semibold">
                      {b.batchNumber || "— (Non-Batch)"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-mono">
                      {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-sm text-emerald-400">
                      {b.currentQuantity}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-sm text-white">
                      {b.availableQuantity}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No active stock records in this warehouse.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Movement Ledger Table */}
      {activeTab === "ledger" && (
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/50 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Date & Type</th>
                <th className="px-5 py-3.5 font-semibold">Item & SKU</th>
                <th className="px-5 py-3.5 font-semibold">Warehouse / Batch</th>
                <th className="px-5 py-3.5 font-semibold">Movement Qty</th>
                <th className="px-5 py-3.5 font-semibold">Balance Before $\rightarrow$ After</th>
                <th className="px-5 py-3.5 font-semibold text-right">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading stock movements...
                  </td>
                </tr>
              ) : movements.length > 0 ? (
                movements.map((m) => {
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-900/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-1.5 font-semibold text-white">
                          {isPositive ? (
                            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-rose-400" />
                          )}
                          <span>{m.movementTypeName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(m.createdAtUtc).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white">{m.itemName}</div>
                        <div className="font-mono text-[11px] text-indigo-400">{m.itemSku}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">
                        <div>{m.warehouseName}</div>
                        {m.batchNumber && (
                          <div className="text-[10px] font-mono text-purple-400">
                            Batch: {m.batchNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold">
                        <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">
                        <span>{m.quantityBefore}</span>
                        <span className="mx-1 text-slate-600">→</span>
                        <span className="text-white font-bold">{m.quantityAfter}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-400 italic">
                        {m.notes || "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No stock transaction movements recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsAdjModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <span>Adjust Stock / Physical Audit</span>
              </h3>
              <p className="text-xs text-slate-400">
                Record stock reconciliation, shrinkage adjustments, or damaged write-offs.
              </p>
            </div>

            <form onSubmit={handleAdjustmentSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Select Product *</label>
                <select
                  value={adjForm.itemId}
                  onChange={(e) => {
                    const itm = items.find((i) => i.id === e.target.value);
                    setAdjForm({
                      ...adjForm,
                      itemId: e.target.value,
                      unitCost: itm?.purchasePrice || 0,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Storage Warehouse *</label>
                <select
                  value={adjForm.warehouseId}
                  onChange={(e) => setAdjForm({ ...adjForm, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {allWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseName} ({w.warehouseCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Adjustment Type</label>
                  <select
                    value={adjForm.movementType}
                    onChange={(e) => setAdjForm({ ...adjForm, movementType: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="5">Physical Audit Adjustment</option>
                    <option value="6">Damaged / Broken Stock Loss</option>
                    <option value="7">Expired Write-Off</option>
                    <option value="1">Purchase Inward</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Qty Change (+ or -) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="+10 or -5"
                    value={adjForm.quantityChange || ""}
                    onChange={(e) => setAdjForm({ ...adjForm, quantityChange: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Discovered extra unit during annual stock count"
                  value={adjForm.notes || ""}
                  onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
                >
                  {submitting ? "Applying..." : "Apply Stock Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
