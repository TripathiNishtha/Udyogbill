"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Factory,
  Plus,
  Play,
  CheckCircle2,
  Trash2,
  Layers,
  ArrowRight,
  Sparkles,
  Building,
  Scale,
} from "lucide-react";
import { inventoryService } from "@/services/inventory-services";
import { tenantAppService, WarehouseDetails } from "@/services/tenant-app-services";
import { industryService, RecipeBom, ProductionRunResult } from "@/services/industry-services";
import { MasterItem } from "@/types";

export default function ManufacturingBomPage() {
  const [boms, setBoms] = useState<RecipeBom[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // New BOM Form State
  const [isNewBomOpen, setIsNewBomOpen] = useState(false);
  const [finishedGoodId, setFinishedGoodId] = useState("");
  const [recipeName, setRecipeName] = useState("");
  const [outputYield, setOutputYield] = useState<number>(1);
  const [ingredients, setIngredients] = useState<{ rawMaterialItemId: string; quantityRequired: number; uomId: string }[]>([]);

  // Production Run State
  const [selectedBomForRun, setSelectedBomForRun] = useState<RecipeBom | null>(null);
  const [targetWarehouseId, setTargetWarehouseId] = useState("");
  const [batchesToProduce, setBatchesToProduce] = useState<number>(10);
  const [batchNumber, setBatchNumber] = useState(`BATCH-PROD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`);
  const [executing, setExecuting] = useState(false);
  const [productionResult, setProductionResult] = useState<ProductionRunResult | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bomsRes, itemsRes, whRes] = await Promise.all([
        industryService.getRecipeBoms(),
        inventoryService.getItems({ pageSize: 100 }),
        tenantAppService.getWarehouses(),
      ]);

      setBoms(bomsRes || []);
      setItems(itemsRes.items || []);
      setWarehouses(whRes || []);

      if (itemsRes.items?.length > 0) setFinishedGoodId(itemsRes.items[0].id);
      if (whRes?.length > 0) setTargetWarehouseId(whRes[0].id);
    } catch (err) {
      console.error("Failed to load manufacturing data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addIngredient = () => {
    if (items.length > 0) {
      setIngredients([
        ...ingredients,
        {
          rawMaterialItemId: items[0].id,
          quantityRequired: 1,
          uomId: items[0].primaryUomId,
        },
      ]);
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSaveBom = async () => {
    if (!finishedGoodId || !recipeName.trim() || ingredients.length === 0) {
      alert("Please fill in recipe name, finished good, and at least one raw material ingredient.");
      return;
    }

    const fgItem = items.find((i) => i.id === finishedGoodId);
    if (!fgItem) return;

    try {
      await industryService.createRecipeBom({
        finishedGoodsItemId: finishedGoodId,
        recipeName,
        outputYieldQuantity: outputYield,
        outputUomId: fgItem.primaryUomId,
        ingredients,
      });

      setIsNewBomOpen(false);
      setRecipeName("");
      setIngredients([]);
      loadData();
    } catch (err) {
      alert("Failed to create recipe BOM.");
    }
  };

  const handleExecuteRun = async () => {
    if (!selectedBomForRun || !targetWarehouseId || !batchNumber.trim() || batchesToProduce <= 0) {
      alert("Please check warehouse, batch number, and production quantity.");
      return;
    }

    try {
      setExecuting(true);
      const res = await industryService.executeProductionRun({
        recipeBomId: selectedBomForRun.id,
        targetWarehouseId,
        batchesToProduce,
        batchNumber,
      });

      setProductionResult(res);
      setSelectedBomForRun(null);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to execute production run.");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Factory className="w-7 h-7 text-amber-400" />
            <span>Recipe & Bill of Materials (BOM)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manufacturing assembly recipes with automated raw material ingredient deduction during batch production runs.
          </p>
        </div>

        <button
          onClick={() => {
            setIsNewBomOpen(true);
            if (ingredients.length === 0 && items.length > 0) {
              setIngredients([{ rawMaterialItemId: items[0].id, quantityRequired: 1, uomId: items[0].primaryUomId }]);
            }
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Recipe BOM</span>
        </button>
      </div>

      {/* Production Success Summary Alert */}
      {productionResult && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-slate-300 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>
                Production Run Completed: {productionResult.quantityProduced} units of {productionResult.finishedGoodsName}
              </span>
            </div>
            <span className="font-mono text-xs text-emerald-400 font-bold">
              Batch #{productionResult.batchNumber} | Total Cost: ₹{productionResult.totalCostOfProduction.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-500/20">
            {productionResult.deductedIngredients.map((d) => (
              <div key={d.itemId} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="font-semibold text-white truncate">{d.itemName}</div>
                <div className="text-[11px] text-rose-400 font-mono">
                  - {d.quantityDeducted} {d.uomName} deducted
                </div>
                <div className="text-[10px] text-slate-400">Remaining: {d.stockRemaining} {d.uomName}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Recipe BOM Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 py-16 text-center text-slate-500 text-xs">
            Loading manufacturing recipe BOM definitions...
          </div>
        ) : boms.length === 0 ? (
          <div className="col-span-2 p-12 text-center rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-500 space-y-3">
            <Factory className="w-10 h-10 mx-auto text-slate-600" />
            <div className="font-bold text-slate-300 text-sm">No Recipe BOMs Defined Yet</div>
            <p className="text-xs max-w-md mx-auto">
              Create a Recipe BOM to define which raw material ingredients are required to produce a finished good.
            </p>
          </div>
        ) : (
          boms.map((bom) => {
            const estCost = bom.ingredients.reduce((acc, ing) => acc + ing.estimatedTotalCost, 0);
            return (
              <div
                key={bom.id}
                className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4 shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-white">{bom.recipeName}</h3>
                    <div className="text-xs text-indigo-400 font-mono mt-0.5">
                      Produces: {bom.outputYieldQuantity} {bom.outputUomName} of {bom.finishedGoodsName} ({bom.finishedGoodsSku})
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedBomForRun(bom)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white text-xs font-semibold transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Production</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-850 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Raw Material Ingredients ({bom.ingredients.length})
                  </div>
                  <div className="divide-y divide-slate-800">
                    {bom.ingredients.map((ing) => (
                      <div key={ing.rawMaterialItemId} className="py-1.5 first:pt-0 flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold">{ing.rawMaterialName}</span>
                        <span className="font-mono text-slate-400">
                          {ing.quantityRequired} {ing.uomName} (~₹{ing.estimatedTotalCost.toFixed(2)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-850">
                  <span className="text-slate-400">Estimated Production Cost per Batch:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">₹{estCost.toFixed(2)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Production Run Modal */}
      {selectedBomForRun && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden space-y-4 p-6">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <Play className="w-4 h-4 text-emerald-400" />
              <span>Execute Production Run: {selectedBomForRun.recipeName}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Target Production Warehouse</label>
                <select
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseName} ({w.branchName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Quantity to Produce ({selectedBomForRun.outputUomName})</label>
                  <input
                    type="number"
                    min="1"
                    value={batchesToProduce}
                    onChange={(e) => setBatchesToProduce(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Batch / Lot Number</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setSelectedBomForRun(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRun}
                disabled={executing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 disabled:opacity-50"
              >
                {executing ? "Processing Run..." : "Execute Run & Deduct Ingredients"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New BOM Modal */}
      {isNewBomOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden space-y-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <Factory className="w-4 h-4 text-indigo-400" />
              <span>Define New Recipe & Bill of Materials</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Finished Goods Catalog Item</label>
                <select
                  value={finishedGoodId}
                  onChange={(e) => setFinishedGoodId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.sku} — {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Recipe Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Standard 1kg Cake Recipe..."
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Output Yield Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={outputYield}
                    onChange={(e) => setOutputYield(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-2 pt-2 border-t border-slate-850">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Raw Material Ingredients</span>
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px]"
                  >
                    + Add Ingredient
                  </button>
                </div>

                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <select
                      value={ing.rawMaterialItemId}
                      onChange={(e) => {
                        const val = e.target.value;
                        const found = items.find((x) => x.id === val);
                        const updated = [...ingredients];
                        updated[idx].rawMaterialItemId = val;
                        if (found) updated[idx].uomId = found.primaryUomId;
                        setIngredients(updated);
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                    >
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.sku} — {i.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      placeholder="Qty"
                      value={ing.quantityRequired}
                      onChange={(e) => {
                        const updated = [...ingredients];
                        updated[idx].quantityRequired = Number(e.target.value);
                        setIngredients(updated);
                      }}
                      className="w-24 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setIsNewBomOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBom}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
              >
                Save Recipe BOM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
