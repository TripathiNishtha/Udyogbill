"use client";

import { useState, useEffect } from "react";
import {
  FlaskConical,
  Search,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Pill,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Building2,
  Layers
} from "lucide-react";
import { pharmaDeepService, SaltMaster, ItemSubstitute } from "@/services/pharma-deep-services";

export default function PharmaSubstitutesPage() {
  const [salts, setSalts] = useState<SaltMaster[]>([]);
  const [selectedSalt, setSelectedSalt] = useState<SaltMaster | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [substitutes, setSubstitutes] = useState<ItemSubstitute[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSalts();
  }, []);

  const loadSalts = async (search?: string) => {
    const data = await pharmaDeepService.getSalts(search);
    setSalts(data);
    if (data.length > 0 && !selectedSalt) {
      handleSelectSalt(data[0]);
    }
  };

  const handleSelectSalt = async (salt: SaltMaster) => {
    setSelectedSalt(salt);
    setLoading(true);
    const subs = await pharmaDeepService.findSubstitutes(salt.saltName);
    setSubstitutes(subs);
    setLoading(false);
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-950/40 via-emerald-950/20 to-transparent p-6 rounded-2xl border border-teal-800/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1">
              <FlaskConical className="w-3 h-3" /> Generic Composition Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Hotkey: F8
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Generic Salt & Substitute Finder
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Find therapeutically identical generic alternatives with stock availability and highest chemist profit margins when prescribed drugs are out-of-stock.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-teal-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-teal-400 z-50 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Main Grid: Salt Selector vs Substitute Recommendation Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Salt Master Catalog */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-400" /> Active Salt Formulations
              </h2>
              <span className="text-xs text-slate-500">{salts.length} Registered</span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Salt Name / Formula..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  loadSalts(e.target.value);
                }}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {salts.map((s) => {
                const isSelected = selectedSalt?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSalt(s)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-teal-950/40 border-teal-500/50 shadow-md shadow-teal-950/50"
                        : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm text-slate-200">
                        {s.saltName}
                      </div>
                      {s.isHabitForming && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 whitespace-nowrap">
                          Sched H1 / Narcotic
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-teal-400/90 mt-1 font-mono">
                      {s.therapeuticCategory}
                    </div>
                    {s.sideEffectsAlert && (
                      <div className="text-[11px] text-amber-400/80 mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{s.sideEffectsAlert}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: In-Stock Substitutes with Margin & Price Comparison */}
        <div className="lg:col-span-8 space-y-4">
          {selectedSalt ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                <div>
                  <span className="text-xs text-slate-400">Showing In-Stock Substitutes For</span>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedSalt.saltName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedSalt.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Best Margin First
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 animate-pulse">
                  Querying in-stock generic chemical equivalents...
                </div>
              ) : substitutes.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Pill className="w-8 h-8 mx-auto text-slate-600" />
                  <p>No other brands mapped for this salt composition.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {substitutes.map((sub, idx) => {
                    const isTopMargin = idx === 0 || sub.marginPercent > 30;
                    return (
                      <div
                        key={sub.itemId}
                        className={`p-4 rounded-xl border transition-all ${
                          isTopMargin
                            ? "bg-slate-950/60 border-emerald-500/40 shadow-sm"
                            : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-bold text-white">
                                {sub.itemName}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">
                                {sub.sku}
                              </span>
                              {isTopMargin && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" /> High Chemist Margin
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-400 flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                {sub.manufacturer}
                              </span>
                              <span>•</span>
                              <span className="text-teal-400 font-mono">
                                Formula: {sub.saltComposition}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 flex items-center gap-3 pt-1">
                              <span>Earliest Expiry: <strong className="text-slate-300 font-mono">{sub.earliestExpiryDate}</strong> (Batch: {sub.earliestExpiryBatch})</span>
                              <span>•</span>
                              <span>{sub.storageCondition}</span>
                            </div>
                          </div>

                          {/* Pricing & Stock Card */}
                          <div className="flex items-center gap-4 bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
                            <div className="text-right space-y-0.5">
                              <div className="text-xs text-slate-500">In-Stock</div>
                              <div className="text-sm font-bold text-emerald-400">
                                {sub.inStockQuantity} Units
                              </div>
                            </div>

                            <div className="h-8 w-px bg-slate-800" />

                            <div className="text-right space-y-0.5">
                              <div className="text-xs text-slate-500">MRP / Rate</div>
                              <div className="text-sm font-bold text-slate-200">
                                <span className="line-through text-xs text-slate-500 mr-1">₹{sub.mrp}</span>
                                ₹{sub.saleRate}
                              </div>
                            </div>

                            <div className="h-8 w-px bg-slate-800" />

                            <div className="text-right space-y-0.5">
                              <div className="text-xs text-emerald-400 font-semibold">Margin</div>
                              <div className="text-sm font-extrabold text-emerald-300">
                                {sub.marginPercent}%
                              </div>
                            </div>

                            <button
                              onClick={() => showNotification(`Added ${sub.itemName} (₹${sub.saleRate}) to Counter Bill buffer!`)}
                              className="ml-2 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-md active:scale-95"
                            >
                              Bill This <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
              Select a salt formulation from the left directory to inspect equivalent generic substitutes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
