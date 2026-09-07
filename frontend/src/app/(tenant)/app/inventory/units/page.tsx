"use client";

import { useEffect, useState } from "react";
import { Receipt, Plus, ArrowRightLeft, X } from "lucide-react";
import { inventoryService } from "@/services/inventory-services";
import { UnitOfMeasure, UnitConversion } from "@/types";

export default function TenantUnitsPage() {
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [loading, setLoading] = useState(true);

  // Unit Modal
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({ code: "", name: "", symbol: "", decimalPlaces: 0 });

  // Conversion Modal
  const [isConvModalOpen, setIsConvModalOpen] = useState(false);
  const [convForm, setConvForm] = useState({ fromUomId: "", toUomId: "", conversionFactor: 1 });

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [uoms, convs] = await Promise.all([
        inventoryService.getUnits(),
        inventoryService.getConversions(),
      ]);
      setUnits(uoms);
      setConversions(convs);

      if (uoms.length >= 2) {
        setConvForm({ fromUomId: uoms[0].id, toUomId: uoms[1].id, conversionFactor: 10 });
      }
    } catch (err) {
      console.error("Failed to load units", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.code || !unitForm.name) return;
    try {
      setSubmitting(true);
      await inventoryService.createUnit({
        code: unitForm.code,
        name: unitForm.name,
        symbol: unitForm.symbol || unitForm.code.toLowerCase(),
        decimalPlaces: Number(unitForm.decimalPlaces) || 0,
      });
      setIsUnitModalOpen(false);
      setUnitForm({ code: "", name: "", symbol: "", decimalPlaces: 0 });
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to create unit.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convForm.fromUomId || !convForm.toUomId || convForm.fromUomId === convForm.toUomId) {
      alert("Please choose two different units.");
      return;
    }
    try {
      setSubmitting(true);
      await inventoryService.createConversion({
        fromUomId: convForm.fromUomId,
        toUomId: convForm.toUomId,
        conversionFactor: Number(convForm.conversionFactor) || 1,
      });
      setIsConvModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to create conversion.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <Receipt className="w-6 h-6 text-indigo-400" />
          <span>Units of Measure (UOM) & Multi-Unit Conversions</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Manage standard measurement units and automatic conversion multipliers (e.g. 1 Box = 10 Strips = 100 Tablets).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Units of Measure */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Standard Measurement Units ({units.length})</h2>
            <button
              onClick={() => setIsUnitModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Unit</span>
            </button>
          </div>

          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-semibold">Code / Symbol</th>
                  <th className="px-5 py-3 font-semibold">Unit Name</th>
                  <th className="px-5 py-3 font-semibold text-right">Decimals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      Loading units...
                    </td>
                  </tr>
                ) : units.length > 0 ? (
                  units.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/40">
                      <td className="px-5 py-3">
                        <span className="font-mono text-indigo-400 font-bold">{u.code}</span>
                        <span className="text-[11px] text-slate-400 ml-1.5">({u.symbol})</span>
                      </td>
                      <td className="px-5 py-3 font-medium text-white">{u.name}</td>
                      <td className="px-5 py-3 text-right font-mono text-slate-300">
                        {u.decimalPlaces}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      No units configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Multi-Unit Conversions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Conversion Multipliers ({conversions.length})</h2>
            <button
              onClick={() => setIsConvModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Multiplier</span>
            </button>
          </div>

          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-semibold">Conversion Rule</th>
                  <th className="px-5 py-3 font-semibold text-right">Multiplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {loading ? (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-slate-400">
                      Loading conversions...
                    </td>
                  </tr>
                ) : conversions.length > 0 ? (
                  conversions.map((conv) => (
                    <tr key={conv.id} className="hover:bg-slate-900/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center space-x-2 text-white font-medium">
                          <span>1 {conv.fromUomName} ({conv.fromUomCode})</span>
                          <span className="text-indigo-400">=</span>
                          <span className="text-emerald-400 font-bold font-mono">
                            {conv.conversionFactor} {conv.toUomName} ({conv.toUomCode})
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-indigo-400">
                        {conv.conversionFactor}x
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-slate-400">
                      No conversion rules configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Unit Modal */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsUnitModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Unit of Measure</h3>
            <form onSubmit={handleCreateUnit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Unit Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BOX, STRIP, KG, PCS"
                  value={unitForm.code}
                  onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Box / Carton"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Symbol</label>
                  <input
                    type="text"
                    placeholder="e.g. bx"
                    value={unitForm.symbol}
                    onChange={(e) => setUnitForm({ ...unitForm, symbol: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Decimal Places</label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={unitForm.decimalPlaces}
                    onChange={(e) => setUnitForm({ ...unitForm, decimalPlaces: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
                >
                  {submitting ? "Saving..." : "Save Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conversion Modal */}
      {isConvModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsConvModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Multi-Unit Conversion</h3>
            <form onSubmit={handleCreateConversion} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">From Unit (1 Primary)</label>
                <select
                  value={convForm.fromUomId}
                  onChange={(e) => setConvForm({ ...convForm, fromUomId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">To Unit (Secondary Sub-unit)</label>
                <select
                  value={convForm.toUomId}
                  onChange={(e) => setConvForm({ ...convForm, toUomId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Conversion Factor (Multiplier)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  placeholder="e.g. 10 (1 Box = 10 Strips)"
                  value={convForm.conversionFactor}
                  onChange={(e) => setConvForm({ ...convForm, conversionFactor: parseFloat(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConvModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  {submitting ? "Saving..." : "Save Multiplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
