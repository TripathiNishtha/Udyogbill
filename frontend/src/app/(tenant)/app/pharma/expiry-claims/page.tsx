"use client";

import { useState, useEffect } from "react";
import {
  RotateCcw,
  AlertTriangle,
  Clock,
  Building2,
  CheckCircle2,
  FileText,
  DollarSign,
  Layers,
  ArrowRight,
  Printer,
  X
} from "lucide-react";
import { pharmaDeepService, PharmaBatch, ExpiryClaim } from "@/services/pharma-deep-services";

export default function PharmaExpiryClaimsPage() {
  const [batches, setBatches] = useState<PharmaBatch[]>([]);
  const [claims, setClaims] = useState<ExpiryClaim[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [supplierName, setSupplierName] = useState("Sun Pharma Distributors Ltd");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"Radar" | "ClaimHistory">("Radar");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const allBatches = await pharmaDeepService.getBatches(undefined, true);
    // Batches expiring in < 90 days or already expired, and not already quarantined
    const nearExpiry = allBatches.filter((b) => (b.isExpired || b.isNearExpiry) && !b.isQuarantined);
    setBatches(nearExpiry);

    const claimHistory = await pharmaDeepService.getExpiryClaims();
    setClaims(claimHistory);
    setLoading(false);
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleSelectBatch = (id: string) => {
    if (selectedBatchIds.includes(id)) {
      setSelectedBatchIds(selectedBatchIds.filter((bId) => bId !== id));
    } else {
      setSelectedBatchIds([...selectedBatchIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedBatchIds.length === batches.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(batches.map((b) => b.id));
    }
  };

  const handleGenerateClaim = async () => {
    const chosenBatches = batches.filter((b) => selectedBatchIds.includes(b.id));
    if (chosenBatches.length === 0) {
      alert("Please select at least one expired or near-expiry batch to claim.");
      return;
    }

    const newClaim = await pharmaDeepService.createExpiryClaim(supplierName, chosenBatches);
    setSelectedBatchIds([]);
    showNotification(`Generated Return Claim ${newClaim.claimNumber} for ₹${newClaim.totalClaimAmount}! Selected stock quarantined.`);
    loadData();
    setActiveTab("ClaimHistory");
  };

  const totalAtRiskValue = batches.reduce((acc, b) => acc + b.currentStock * b.purchaseRate, 0);
  const totalSelectedValue = batches
    .filter((b) => selectedBatchIds.includes(b.id))
    .reduce((acc, b) => acc + b.currentStock * b.purchaseRate, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-950/40 via-amber-950/20 to-transparent p-6 rounded-2xl border border-rose-800/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Expiry Dumping & Return Radar
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Supplier Debit Claims
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Near-Expiry & Breakage Return Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Identify slow-moving and near-expiry drugs, lock them in quarantine, and generate official Return Claim Debit Notes to wholesalers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("Radar")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "Radar"
                ? "bg-rose-600 text-white shadow-lg shadow-rose-900/40"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Expiry Radar ({batches.length})
          </button>
          <button
            onClick={() => setActiveTab("ClaimHistory")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "ClaimHistory"
                ? "bg-rose-600 text-white shadow-lg shadow-rose-900/40"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Claim Memos ({claims.length})
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-rose-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-rose-400 z-50 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {activeTab === "Radar" ? (
        <div className="space-y-6">
          {/* Risk Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Total Capital at Expiry Risk</div>
                <div className="text-xl font-bold text-rose-400">₹{totalAtRiskValue.toLocaleString("en-IN")}</div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Items Expiring in &lt; 90 Days</div>
                <div className="text-xl font-bold text-amber-400">{batches.length} Batches</div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Selected Claim Amount</div>
                <div className="text-xl font-bold text-emerald-400">₹{totalSelectedValue.toLocaleString("en-IN")}</div>
              </div>
            </div>
          </div>

          {/* Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" /> Wholesaler / Distributor:
              </label>
              <select
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="Sun Pharma Distributors Ltd">Sun Pharma Distributors Ltd</option>
                <option value="Alkem Healthcare Agency">Alkem Healthcare Agency</option>
                <option value="Mankind C&F Depot">Mankind C&F Depot</option>
                <option value="Torrent Wholesale Agency">Torrent Wholesale Agency</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                {selectedBatchIds.length === batches.length ? "Deselect All" : "Select All"}
              </button>
              <button
                disabled={selectedBatchIds.length === 0}
                onClick={handleGenerateClaim}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Generate Return Debit Claim ({selectedBatchIds.length})
              </button>
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold">
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={batches.length > 0 && selectedBatchIds.length === batches.length}
                        onChange={handleSelectAll}
                        className="rounded border-slate-700"
                      />
                    </th>
                    <th className="p-3.5">Medicine Name / SKU</th>
                    <th className="p-3.5">Batch No.</th>
                    <th className="p-3.5">Expiry (MM/YY)</th>
                    <th className="p-3.5 text-right">In-Stock</th>
                    <th className="p-3.5 text-right">P.Rate</th>
                    <th className="p-3.5 text-right">Claimable Value</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        Zero expired or near-expiry batches found! Your inventory is healthy.
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => {
                      const isSelected = selectedBatchIds.includes(b.id);
                      return (
                        <tr
                          key={b.id}
                          onClick={() => toggleSelectBatch(b.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-rose-950/30 hover:bg-rose-950/40" : "hover:bg-slate-800/30"
                          }`}
                        >
                          <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectBatch(b.id)}
                              className="rounded border-slate-700"
                            />
                          </td>
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
                            <span className="font-mono font-bold text-rose-400">{b.expiryDateMonthYear}</span>
                            <span className="text-[10px] text-slate-500 block">
                              {b.daysToExpiry > 0 ? `${b.daysToExpiry} days left` : "Expired"}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-bold text-white">{b.currentStock}</td>
                          <td className="p-3.5 text-right font-medium text-slate-400">₹{b.purchaseRate}</td>
                          <td className="p-3.5 text-right font-bold text-rose-400">
                            ₹{(b.currentStock * b.purchaseRate).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3.5 text-center">
                            {b.isExpired ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Expired
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                &lt; 90 Days
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Claim Memos History Tab */
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold">
                    <th className="p-3.5">Claim Memo #</th>
                    <th className="p-3.5">Distributor / Supplier</th>
                    <th className="p-3.5">Claim Date</th>
                    <th className="p-3.5 text-right">Items Count</th>
                    <th className="p-3.5 text-right">Claim Amount</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {claims.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No return claims generated yet.
                      </td>
                    </tr>
                  ) : (
                    claims.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-cyan-400">{c.claimNumber}</td>
                        <td className="p-3.5 font-semibold text-slate-200">{c.supplierName}</td>
                        <td className="p-3.5 text-slate-400">
                          {new Date(c.claimDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="p-3.5 text-right font-medium text-slate-300">{c.items.length}</td>
                        <td className="p-3.5 text-right font-bold text-emerald-400">
                          ₹{c.totalClaimAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => window.print()}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 mx-auto border border-slate-700"
                          >
                            <Printer className="w-3 h-3" /> Print Note
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
