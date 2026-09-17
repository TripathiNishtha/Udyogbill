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
  AlertTriangle,
  Shirt,
  Coins,
  TrendingUp
} from "lucide-react";
import {
  inventoryService,
  StockAdjustmentInput
} from "@/services/inventory-services";
import { tenantAppService, BranchDetails } from "@/services/tenant-app-services";
import { WarehouseStock, StockMovement, ItemList } from "@/types";
import { useAddons } from "@/context/addon-context";

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

  const { activePack, industryCode, isAddonActive } = useAddons();
  const resolvedIndustry = (
    industryCode ||
    activePack?.activeIndustryModule ||
    activePack?.industryTypeCode ||
    ""
  ).toUpperCase();
  const isGarments =
    resolvedIndustry === "GARMENTS" ||
    isAddonActive("garments") ||
    balances.some((b) => Boolean(b.size || b.color));

  // Garments Summary Metrics (Unit-wise & Value-wise)
  const totalCurrentStockUnits = balances.reduce((sum, b) => sum + (Number(b.currentQuantity) || 0), 0);
  const totalCurrentStockValue = balances.reduce(
    (sum, b) => sum + (Number(b.currentStockValue) || ((Number(b.currentQuantity) || 0) * (Number(b.unitPrice) || 0))),
    0
  );
  const totalSoldStockUnits = balances.reduce((sum, b) => sum + (Number(b.soldQuantity) || 0), 0);
  const totalSoldStockValue = balances.reduce(
    (sum, b) => sum + (Number(b.soldStockValue) || ((Number(b.soldQuantity) || 0) * (Number(b.unitPrice) || 0))),
    0
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center space-x-2.5">
            <WarehouseIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            <span>Multi-Warehouse Stock Ledger &amp; Explorer</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time physical inventory balances across storage godowns and immutable stock movements ledger.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAdjModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4 stroke-[2.5]" />
            <span>Adjust Stock / Audit</span>
          </button>
        </div>
      </div>

      {/* Garments Quick Stock & Sales Summary Cards */}
      {isGarments && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shirt className="w-4 h-4 text-orange-500" />
              <span>Current Stock (Units)</span>
            </div>
            <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {totalCurrentStockUnits.toLocaleString("en-IN")} <span className="text-xs font-medium text-muted-foreground">Pcs</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span>Current Stock Value</span>
            </div>
            <div className="text-xl font-black font-mono text-foreground mt-1">
              ₹{totalCurrentStockValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-rose-500" />
              <span>Sale Stock (Units)</span>
            </div>
            <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
              {totalSoldStockUnits.toLocaleString("en-IN")} <span className="text-xs font-medium text-muted-foreground">Pcs</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-rose-500" />
              <span>Sale Stock Value</span>
            </div>
            <div className="text-xl font-black font-mono text-foreground mt-1">
              ₹{totalSoldStockValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Tabs and Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-surface border border-border shadow-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab("balances")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "balances"
                ? "bg-orange-600 text-white shadow-xs"
                : "bg-surface-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Stock Balances ({balances.length})
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "ledger"
                ? "bg-orange-600 text-white shadow-xs"
                : "bg-surface-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Movement Ledger ({movements.length})
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs text-muted-foreground font-semibold">Filter Warehouse:</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-orange-500 font-medium cursor-pointer"
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
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground uppercase tracking-wider bg-surface-muted border-b border-border font-bold">
              <tr>
                <th className="px-5 py-3.5 font-bold text-foreground">Warehouse / Branch</th>
                <th className="px-5 py-3.5 font-bold text-foreground">Variant (Size / Colour)</th>
                {!isGarments && <th className="px-5 py-3.5 font-bold text-foreground">Batch Number</th>}
                {!isGarments && <th className="px-5 py-3.5 font-bold text-foreground">Expiry Date</th>}
                <th className="px-5 py-3.5 font-bold text-foreground text-right">
                  {isGarments ? "Current Stock (Unit & Value)" : "Current Stock"}
                </th>
                {isGarments && (
                  <th className="px-5 py-3.5 font-bold text-rose-600 dark:text-rose-400 text-right">
                    Sale Stock (Unit & Value)
                  </th>
                )}
                <th className="px-5 py-3.5 font-bold text-foreground text-right">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={isGarments ? 5 : 6} className="py-12 text-center text-muted-foreground">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mb-1"></div>
                    <div>Loading stock balances...</div>
                  </td>
                </tr>
              ) : balances.length > 0 ? (
                balances.map((b, idx) => {
                  const effectiveUnitVal = Number(b.unitPrice) || Number(b.mrp) || Number(b.purchasePrice) || 0;
                  const curVal = Number(b.currentStockValue) || (Number(b.currentQuantity) * effectiveUnitVal);
                  const soldQty = Number(b.soldQuantity) || 0;
                  const soldVal = Number(b.soldStockValue) || (soldQty * effectiveUnitVal);
                  const uomLabel = b.primaryUomSymbol || "Pcs";

                  return (
                    <tr key={`${b.warehouseId}-${b.variantId || b.batchId || idx}`} className="hover:bg-surface-muted/60 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-foreground">{b.warehouseName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {b.branchName} <span className="font-mono text-orange-600 dark:text-orange-400 font-semibold">({b.warehouseCode})</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {(b.size || b.color) ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {b.size && (
                              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800">
                                Size: {b.size}
                              </span>
                            )}
                            {b.color && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-border">
                                Colour: {b.color}
                              </span>
                            )}
                            {b.variantSku && (
                              <span className="text-[10px] font-mono text-muted-foreground block w-full mt-0.5">
                                {b.variantSku}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">— (Standard)</span>
                        )}
                      </td>

                      {!isGarments && (
                        <td className="px-5 py-3.5 font-mono text-orange-600 dark:text-orange-400 font-bold">
                          {b.batchNumber || "— (Non-Batch)"}
                        </td>
                      )}
                      {!isGarments && (
                        <td className="px-5 py-3.5 text-muted-foreground font-mono font-medium">
                          {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "—"}
                        </td>
                      )}

                      {/* Current Stock (Unit-wise & Value-wise) */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {b.currentQuantity} {isGarments ? uomLabel : ""}
                        </div>
                        {isGarments && (
                          <div className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                            Value: ₹{curVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>

                      {/* Sale Stock (Unit-wise & Value-wise for Garments) */}
                      {isGarments && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                            {soldQty} {uomLabel}
                          </div>
                          <div className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                            Value: ₹{soldVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                      )}

                      {/* Available Stock */}
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-sm text-foreground">
                        {b.availableQuantity} {isGarments ? uomLabel : ""}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isGarments ? 5 : 6} className="py-12 text-center text-muted-foreground">
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
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground uppercase tracking-wider bg-surface-muted border-b border-border font-bold">
              <tr>
                <th className="px-5 py-3.5 font-bold text-foreground">Date &amp; Type</th>
                <th className="px-5 py-3.5 font-bold text-foreground">Item &amp; SKU / Variant</th>
                <th className="px-5 py-3.5 font-bold text-foreground">Warehouse / Batch</th>
                <th className="px-5 py-3.5 font-bold text-foreground">Movement Qty</th>
                <th className="px-5 py-3.5 font-bold text-foreground">Balance Before &rarr; After</th>
                <th className="px-5 py-3.5 font-bold text-foreground text-right">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mb-1"></div>
                    <div>Loading stock movements...</div>
                  </td>
                </tr>
              ) : movements.length > 0 ? (
                movements.map((m) => {
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-surface-muted/60 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-1.5 font-bold text-foreground">
                          {isPositive ? (
                            <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          )}
                          <span>{m.movementTypeName}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(m.createdAtUtc).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-foreground">{m.itemName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="font-mono text-[11px] text-orange-600 dark:text-orange-400 font-bold">{m.itemSku}</span>
                          {(m.size || m.color) && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] border border-rose-200 dark:border-rose-800">
                              {[m.size ? `Size: ${m.size}` : '', m.color ? `Col: ${m.color}` : ''].filter(Boolean).join(' | ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-foreground">
                        <div>{m.warehouseName}</div>
                        {m.batchNumber && (
                          <div className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                            Batch: {m.batchNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold">
                        <span className={isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-muted-foreground">
                        <span>{m.quantityBefore}</span>
                        <span className="mx-1 text-muted-foreground/60">&rarr;</span>
                        <span className="text-foreground font-bold">{m.quantityAfter}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground italic">
                        {m.notes || "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsAdjModalOpen(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-foreground flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <span>Adjust Stock / Physical Audit</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Record stock reconciliation, shrinkage adjustments, or damaged write-offs.
              </p>
            </div>

            <form onSubmit={handleAdjustmentSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Select Product *</label>
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
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-orange-500 font-medium cursor-pointer"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Storage Warehouse *</label>
                <select
                  value={adjForm.warehouseId}
                  onChange={(e) => setAdjForm({ ...adjForm, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-orange-500 font-medium cursor-pointer"
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
                  <label className="text-xs font-semibold text-foreground">Adjustment Type</label>
                  <select
                    value={adjForm.movementType}
                    onChange={(e) => setAdjForm({ ...adjForm, movementType: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground font-medium cursor-pointer"
                  >
                    <option value="5">Physical Audit Adjustment</option>
                    <option value="6">Damaged / Broken Stock Loss</option>
                    <option value="7">Expired Write-Off</option>
                    <option value="1">Purchase Inward</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Qty Change (+ or -) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="+10 or -5"
                    value={adjForm.quantityChange || ""}
                    onChange={(e) => setAdjForm({ ...adjForm, quantityChange: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground font-mono focus:outline-none focus:border-orange-500 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Discovered extra unit during annual stock count"
                  value={adjForm.notes || ""}
                  onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-surface-muted text-xs font-semibold text-foreground hover:bg-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 shadow-md shadow-orange-600/20 cursor-pointer"
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
