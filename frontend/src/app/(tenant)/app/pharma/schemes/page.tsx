"use client";

import React, { useEffect, useState } from "react";
import {
  Tag,
  Plus,
  Search,
  Sparkles,
  Calendar,
  CheckCircle2,
  Gift,
  Percent,
  Layers,
  Calculator,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import {
  pharmaSfaService,
  SfaSchemeMaster,
  CreateSchemeRequest,
  CalculatedSchemeResult,
  SfaDivision
} from "@/services/pharma-sfa-services";

export default function PharmaTradeSchemesPage() {
  const [schemes, setSchemes] = useState<SfaSchemeMaster[]>([]);
  const [divisions, setDivisions] = useState<SfaDivision[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [newScheme, setNewScheme] = useState<CreateSchemeRequest>({
    schemeCode: "",
    schemeName: "",
    divisionId: undefined,
    itemId: undefined,
    schemeType: 1, // 1: FreeGoods, 2: PercentageDiscount, 3: FlatDiscount
    validFromUtc: new Date().toISOString().split("T")[0],
    validToUtc: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    minimumOrderQuantity: 10,
    minimumOrderValue: undefined,
    description: "",
    slabs: [
      { minQuantity: 10, maxQuantity: 19, freeQuantity: 1, discountPercent: 0, flatDiscountAmount: 0 },
      { minQuantity: 20, maxQuantity: 49, freeQuantity: 3, discountPercent: 0, flatDiscountAmount: 0 },
      { minQuantity: 50, maxQuantity: undefined, freeQuantity: 8, discountPercent: 0, flatDiscountAmount: 0 }
    ]
  });

  // Simulator
  const [calcSkuId, setCalcSkuId] = useState("");
  const [calcQty, setCalcQty] = useState(25);
  const [calcResult, setCalcResult] = useState<CalculatedSchemeResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [schData, divData] = await Promise.all([
        pharmaSfaService.getSchemes({ activeOnly: false }),
        pharmaSfaService.getDivisions()
      ]);
      setSchemes(schData);
      setDivisions(divData);
    } catch (err) {
      console.error("Failed to load schemes data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!calcSkuId && schemes.length === 0) return;
    try {
      setCalculating(true);
      const targetItemId = calcSkuId || schemes[0]?.itemId || "00000000-0000-0000-0000-000000000000";
      const res = await pharmaSfaService.evaluateScheme({
        itemId: targetItemId,
        quantity: Number(calcQty) || 1
      });
      setCalcResult(res);
    } catch (err) {
      console.error("Scheme simulation error", err);
    } finally {
      setCalculating(false);
    }
  };

  const handleAddSlab = () => {
    setNewScheme(prev => ({
      ...prev,
      slabs: [
        ...prev.slabs,
        { minQuantity: 10, maxQuantity: undefined, freeQuantity: 1, discountPercent: 0, flatDiscountAmount: 0 }
      ]
    }));
  };

  const handleRemoveSlab = (idx: number) => {
    setNewScheme(prev => ({
      ...prev,
      slabs: prev.slabs.filter((_, i) => i !== idx)
    }));
  };

  const handleUpdateSlab = (idx: number, field: string, value: any) => {
    setNewScheme(prev => {
      const nextSlabs = [...prev.slabs];
      nextSlabs[idx] = { ...nextSlabs[idx], [field]: value };
      return { ...prev, slabs: nextSlabs };
    });
  };

  const handleCreateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!newScheme.schemeName.trim()) {
      setFormError("Scheme Name is required.");
      return;
    }

    try {
      setSubmitting(true);
      await pharmaSfaService.createOrUpdateScheme(newScheme);
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to save scheme.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSchemes = schemes.filter(s => {
    const matchesSearch =
      s.schemeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.schemeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.itemName && s.itemName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDivision =
      selectedDivision === "all" || s.divisionId === selectedDivision;
    return matchesSearch && matchesDivision;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Pharma Trade Schemes & Slabs Hub
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure Bonus / Free Goods (10+1, 20+3) and Slab-based Trade Discounts for POB secondary order booking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            title="Refresh Schemes"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            New Trade Scheme
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Schemes</span>
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {schemes.filter(s => s.isActive).length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Ready for field POB booking</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Free Goods Schemes</span>
            <Gift className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {schemes.filter(s => s.schemeType === 1).length}
          </div>
          <div className="text-xs text-emerald-600/80 mt-1">10+1, 20+3 bonus tiers</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Discount Schemes</span>
            <Percent className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {schemes.filter(s => s.schemeType === 2).length}
          </div>
          <div className="text-xs text-amber-600/80 mt-1">Volume percentage trade cuts</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Division Schemes</span>
            <Layers className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {schemes.filter(s => s.divisionId).length}
          </div>
          <div className="text-xs text-purple-600/80 mt-1">Division-wide umbrella schemes</div>
        </div>
      </div>

      {/* Simulator Section */}
      <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/30 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-indigo-950 dark:text-indigo-200">
          <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3>🧪 Real-Time Scheme Calculation Simulator</h3>
        </div>
        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
          Simulate what bonus free quantities or discounts MRs & Chemists get when booking orders in the field.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Select Scheme / Product</label>
            <select
              value={calcSkuId}
              onChange={e => setCalcSkuId(e.target.value)}
              className="mt-1 w-full text-sm border rounded-lg p-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            >
              <option value="">-- Choose Active Scheme --</option>
              {schemes.map(s => (
                <option key={s.id} value={s.itemId || s.id}>
                  {s.schemeName} ({s.itemName || "All Division SKUs"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Order Quantity</label>
            <input
              type="number"
              min={1}
              value={calcQty}
              onChange={e => setCalcQty(Number(e.target.value))}
              className="mt-1 w-full text-sm border rounded-lg p-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              placeholder="e.g. 25"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSimulate}
              disabled={calculating}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              {calculating ? "Evaluating..." : "Calculate Bonus Slabs"}
            </button>
          </div>

          {calcResult && (
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-medium">Applied: {calcResult.schemeName}</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  Order: {calcResult.originalQuantity} units
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  +{calcResult.freeQuantity} Free Units
                </span>
                {calcResult.discountPercent > 0 && (
                  <div className="text-xs text-amber-600 font-medium mt-1">
                    {calcResult.discountPercent}% Discount
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search scheme name, code or SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-transparent border-gray-300 dark:border-gray-700"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedDivision}
            onChange={e => setSelectedDivision(e.target.value)}
            className="text-sm border rounded-lg p-2 bg-transparent border-gray-300 dark:border-gray-700"
          >
            <option value="all">All Divisions</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Schemes Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-semibold">Scheme Code & Name</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Division / SKU Scope</th>
                <th className="p-4 font-semibold">Slab Structure</th>
                <th className="p-4 font-semibold">Validity</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Loading commercial schemes...
                  </td>
                </tr>
              ) : filteredSchemes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No trade schemes found. Click <strong>"New Trade Scheme"</strong> to configure your first 10+1 or volume discount scheme.
                  </td>
                </tr>
              ) : (
                filteredSchemes.map(scheme => (
                  <tr key={scheme.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/50">
                    <td className="p-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {scheme.schemeName}
                      </div>
                      <div className="text-xs font-mono text-gray-500 mt-0.5">
                        {scheme.schemeCode}
                      </div>
                    </td>

                    <td className="p-4">
                      {scheme.schemeType === 1 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <Gift className="w-3.5 h-3.5" /> Free Goods
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Percent className="w-3.5 h-3.5" /> Trade Discount
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="text-gray-900 dark:text-gray-100 font-medium">
                        {scheme.itemName || "All Division Molecules"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {scheme.divisionName || "All Divisions"}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {scheme.slabs && scheme.slabs.length > 0 ? (
                          scheme.slabs.map((sl, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 font-mono"
                            >
                              {sl.minQuantity}{sl.maxQuantity ? `-${sl.maxQuantity}` : "+"} :{" "}
                              {scheme.schemeType === 1
                                ? `+${sl.freeQuantity} Free`
                                : `${sl.discountPercent}% Off`}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">Min {scheme.minimumOrderQuantity} Qty</span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          {new Date(scheme.validFromUtc).toLocaleDateString()} -{" "}
                          {new Date(scheme.validToUtc).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      {scheme.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" /> Live in Field
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-400">Archived</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Scheme Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Create New Commercial Trade Scheme
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateScheme} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Scheme Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monsoon Booster 10+1"
                    value={newScheme.schemeName}
                    onChange={e => setNewScheme({ ...newScheme, schemeName: e.target.value })}
                    className="mt-1 w-full text-sm border rounded-lg p-2.5 bg-transparent border-gray-300 dark:border-gray-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Scheme Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={newScheme.schemeCode}
                    onChange={e => setNewScheme({ ...newScheme, schemeCode: e.target.value })}
                    className="mt-1 w-full text-sm border rounded-lg p-2.5 bg-transparent border-gray-300 dark:border-gray-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Division Target
                  </label>
                  <select
                    value={newScheme.divisionId || ""}
                    onChange={e =>
                      setNewScheme({
                        ...newScheme,
                        divisionId: e.target.value ? e.target.value : undefined
                      })
                    }
                    className="mt-1 w-full text-sm border rounded-lg p-2.5 bg-transparent border-gray-300 dark:border-gray-700"
                  >
                    <option value="">All Divisions</option>
                    {divisions.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Scheme Type
                  </label>
                  <select
                    value={newScheme.schemeType}
                    onChange={e => setNewScheme({ ...newScheme, schemeType: Number(e.target.value) })}
                    className="mt-1 w-full text-sm border rounded-lg p-2.5 bg-transparent border-gray-300 dark:border-gray-700"
                  >
                    <option value={1}>Free Goods (e.g. 10+1 Free)</option>
                    <option value={2}>Percentage Trade Discount (e.g. 5% Off)</option>
                    <option value={3}>Flat Cash / Unit Discount</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Valid From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newScheme.validFromUtc}
                    onChange={e => setNewScheme({ ...newScheme, validFromUtc: e.target.value })}
                    className="mt-1 w-full text-sm border rounded-lg p-2.5 bg-transparent border-gray-300 dark:border-gray-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Valid Till Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newScheme.validToUtc}
                    onChange={e => setNewScheme({ ...newScheme, validToUtc: e.target.value })}
                    className="mt-1 w-full text-sm border rounded-lg p-2.5 bg-transparent border-gray-300 dark:border-gray-700"
                  />
                </div>
              </div>

              {/* Slabs Builder */}
              <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-xl space-y-3 bg-gray-50/50 dark:bg-gray-850">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Quantity Slabs & Bonus Breakdown
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSlab}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Slab
                  </button>
                </div>

                {newScheme.slabs.map((slab, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-3">
                      <label className="text-[10px] text-gray-500">Min Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={slab.minQuantity}
                        onChange={e => handleUpdateSlab(idx, "minQuantity", Number(e.target.value))}
                        className="w-full border rounded p-1.5 bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] text-gray-500">Max Qty (Blank=No limit)</label>
                      <input
                        type="number"
                        placeholder="No limit"
                        value={slab.maxQuantity || ""}
                        onChange={e =>
                          handleUpdateSlab(
                            idx,
                            "maxQuantity",
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        className="w-full border rounded p-1.5 bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] text-gray-500">
                        {newScheme.schemeType === 1 ? "Free Bonus Units" : "Discount %"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={
                          newScheme.schemeType === 1 ? slab.freeQuantity : slab.discountPercent
                        }
                        onChange={e =>
                          handleUpdateSlab(
                            idx,
                            newScheme.schemeType === 1 ? "freeQuantity" : "discountPercent",
                            Number(e.target.value)
                          )
                        }
                        className="w-full border rounded p-1.5 bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="col-span-3 flex justify-end pt-4">
                      {newScheme.slabs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlab(idx)}
                          className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  {submitting ? "Saving Scheme..." : "Publish Scheme to Field"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
