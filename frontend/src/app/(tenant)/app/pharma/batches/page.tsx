"use client";

import { useState, useEffect } from "react";
import {
  Layers,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  MapPin,
  Barcode,
  Clock,
  ShieldCheck,
  Filter,
  X
} from "lucide-react";
import { pharmaDeepService, PharmaBatch } from "@/services/pharma-deep-services";

export default function PharmaBatchesPage() {
  const [batches, setBatches] = useState<PharmaBatch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"All" | "Valid" | "NearExpiry" | "Expired">("All");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    itemName: "",
    sku: "",
    batchNumber: "",
    expiryDateMonthYear: "",
    mrp: "",
    purchaseRate: "",
    saleRate: "",
    ptr: "",
    pts: "",
    currentStock: "",
    rackLocation: "",
    barcode: ""
  });

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setLoading(true);
    const data = await pharmaDeepService.getBatches(undefined, true);
    setBatches(data);
    setLoading(false);
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName || !formData.batchNumber || !formData.expiryDateMonthYear) {
      alert("Please fill in Medicine Name, Batch Number, and Expiry Date (MM/YY)");
      return;
    }

    await pharmaDeepService.saveBatch({
      itemName: formData.itemName,
      sku: formData.sku || formData.itemName.substring(0, 4).toUpperCase(),
      batchNumber: formData.batchNumber,
      expiryDateMonthYear: formData.expiryDateMonthYear,
      mrp: Number(formData.mrp) || 0,
      purchaseRate: Number(formData.purchaseRate) || 0,
      saleRate: Number(formData.saleRate) || 0,
      ptr: Number(formData.ptr) || 0,
      pts: Number(formData.pts) || 0,
      currentStock: Number(formData.currentStock) || 0,
      rackLocation: formData.rackLocation,
      barcode: formData.barcode
    });

    setShowModal(false);
    showNotification("Batch registered successfully into FEFO stock ledger!");
    loadBatches();
    setFormData({
      itemName: "",
      sku: "",
      batchNumber: "",
      expiryDateMonthYear: "",
      mrp: "",
      purchaseRate: "",
      saleRate: "",
      ptr: "",
      pts: "",
      currentStock: "",
      rackLocation: "",
      barcode: ""
    });
  };

  // Filter batches
  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.rackLocation && b.rackLocation.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMode === "Valid") return !b.isExpired && !b.isNearExpiry;
    if (filterMode === "NearExpiry") return b.isNearExpiry && !b.isExpired;
    if (filterMode === "Expired") return b.isExpired;
    return true;
  });

  const totalBatches = batches.length;
  const expiredCount = batches.filter((b) => b.isExpired).length;
  const nearExpiryCount = batches.filter((b) => b.isNearExpiry && !b.isExpired).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-transparent p-6 rounded-2xl border border-cyan-800/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
              <Layers className="w-3 h-3" /> FEFO Inventory Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              First-Expiry First-Out
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Pharmaceutical Multi-Batch & Pricing Register
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage multi-tier pharmaceutical rates (MRP, Sale Rate, PTR, PTS), shelf rack coordinates, and automated FEFO sales routing.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-all active:scale-95 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Medicine Batch
        </button>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-cyan-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-cyan-400 z-50 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Total Active Batches</div>
            <div className="text-xl font-bold text-white">{totalBatches}</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Near Expiry (&lt; 90 Days)</div>
            <div className="text-xl font-bold text-amber-400">{nearExpiryCount}</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Expired Batches (Locked)</div>
            <div className="text-xl font-bold text-rose-400">{expiredCount}</div>
          </div>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Drug, Batch No, Rack Location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(["All", "Valid", "NearExpiry", "Expired"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterMode === mode
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-900/40"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {mode === "All" && `All (${totalBatches})`}
              {mode === "Valid" && `FEFO Valid (${totalBatches - nearExpiryCount - expiredCount})`}
              {mode === "NearExpiry" && `Near Expiry (${nearExpiryCount})`}
              {mode === "Expired" && `Expired (${expiredCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold">
                <th className="p-3.5">Medicine Name / SKU</th>
                <th className="p-3.5">Batch No.</th>
                <th className="p-3.5">Expiry (MM/YY)</th>
                <th className="p-3.5 text-right">In-Stock</th>
                <th className="p-3.5 text-right">MRP</th>
                <th className="p-3.5 text-right">P.Rate</th>
                <th className="p-3.5 text-right">PTR</th>
                <th className="p-3.5 text-right">PTS</th>
                <th className="p-3.5 text-right">Sale Rate</th>
                <th className="p-3.5">Rack Bin</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500 animate-pulse">
                    Loading pharmaceutical batch register...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500">
                    No batches match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-200">{b.itemName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{b.sku}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-800 text-cyan-400 font-mono font-semibold rounded border border-slate-700">
                        {b.batchNumber}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-medium text-slate-300">
                        {b.expiryDateMonthYear}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {b.daysToExpiry > 0 ? `${b.daysToExpiry} days left` : "Expired"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <span className="font-bold text-emerald-400">{b.currentStock}</span>
                      {b.quarantinedStock > 0 && (
                        <span className="text-[10px] text-amber-500 block">
                          +{b.quarantinedStock} Hold
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-medium text-slate-400">₹{b.mrp}</td>
                    <td className="p-3.5 text-right font-medium text-slate-400">₹{b.purchaseRate}</td>
                    <td className="p-3.5 text-right font-medium text-blue-400">₹{b.ptr}</td>
                    <td className="p-3.5 text-right font-medium text-indigo-400">₹{b.pts}</td>
                    <td className="p-3.5 text-right font-bold text-slate-200">₹{b.saleRate}</td>
                    <td className="p-3.5">
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {b.rackLocation || "General"}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {b.isExpired ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Expired (Locked)
                        </span>
                      ) : b.isNearExpiry ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Near Expiry
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          FEFO Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Batch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" /> Add Medicine Batch
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Medicine / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol 650 Tablet"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BAT-2026-99"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Expiry Date (MM/YY) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10/28"
                    value={formData.expiryDateMonthYear}
                    onChange={(e) => setFormData({ ...formData, expiryDateMonthYear: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="120"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Purchase Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="75"
                    value={formData.purchaseRate}
                    onChange={(e) => setFormData({ ...formData, purchaseRate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Sale Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="100"
                    value={formData.saleRate}
                    onChange={(e) => setFormData({ ...formData, saleRate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    PTR (Retailer ₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="88"
                    value={formData.ptr}
                    onChange={(e) => setFormData({ ...formData, ptr: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    PTS (Stockist ₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="80"
                    value={formData.pts}
                    onChange={(e) => setFormData({ ...formData, pts: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Opening Stock Qty
                  </label>
                  <input
                    type="number"
                    placeholder="50"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Rack / Shelf Bin
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rack A-02"
                    value={formData.rackLocation}
                    onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Barcode (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="890123..."
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow-lg"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
