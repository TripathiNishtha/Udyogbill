"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  ArrowLeft,
  Search,
  CheckCircle,
  Calendar,
  Building2,
  Clock,
  ShieldCheck,
  X,
  Save,
  AlertCircle
} from "lucide-react";
import {
  pharmaSfaService,
  SfaStockistAllocation,
  SfaTerritory
} from "@/services/pharma-sfa-services";
import { partyService } from "@/services/party-services";
import { pharmaDeepService, MedicalRepresentative } from "@/services/pharma-deep-services";

export default function StockistAllocationsPage() {
  const [allocations, setAllocations] = useState<SfaStockistAllocation[]>([]);
  const [territories, setTerritories] = useState<SfaTerritory[]>([]);
  const [stockists, setStockists] = useState<any[]>([]);
  const [mrs, setMrs] = useState<MedicalRepresentative[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStockistId, setSelectedStockistId] = useState("");
  const [selectedMrId, setSelectedMrId] = useState("");
  const [selectedTerritoryId, setSelectedTerritoryId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [allocationType, setAllocationType] = useState("Primary");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allocRes, terrRes, partyRes, mrRes] = await Promise.allSettled([
        pharmaSfaService.getStockistAllocations(),
        pharmaSfaService.getTerritories(),
        partyService.getParties({ partyType: 2, pageSize: 200 }),
        pharmaDeepService.getMedicalReps()
      ]);

      if (allocRes.status === "fulfilled") setAllocations(allocRes.value);
      if (terrRes.status === "fulfilled") setTerritories(terrRes.value);
      if (partyRes.status === "fulfilled") setStockists(partyRes.value?.items || []);
      if (mrRes.status === "fulfilled") setMrs(mrRes.value);
    } catch (err) {
      console.error("Failed to load allocation data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockistId || !selectedMrId) return;

    try {
      setSaving(true);
      await pharmaSfaService.allocateStockist({
        stockistPartyId: selectedStockistId,
        mrUserId: selectedMrId,
        territoryId: selectedTerritoryId || undefined,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        allocationType,
        notes
      });

      setIsModalOpen(false);
      setStatusMsg("Stockist successfully mapped with historical effective date!");
      setTimeout(() => setStatusMsg(null), 5000);
      loadData();
    } catch (err: any) {
      console.error("Allocation failed", err);
      alert(err?.response?.data?.message || "Failed to allocate stockist.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/app/pharma/sfa"
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Section 15 • Historical Sales Integrity
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Stockist-to-MR Allocation Management</h1>
            <p className="text-sm text-gray-500">
              Configure primary and secondary MR territories for stockists with effective start dates.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            if (stockists.length > 0) setSelectedStockistId(stockists[0].id);
            if (mrs.length > 0) setSelectedMrId(mrs[0].id);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Map Stockist to MR
        </button>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          {statusMsg}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1">
        <div className="font-semibold flex items-center gap-1.5 text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Zero-Impact Historical Sales Attribution Rule:
        </div>
        <p>
          When reassigning a stockist from one MR to another, historical sales invoices retain their original MR attribution based on the invoice transaction date. Future sales automatically credit to the newly assigned MR starting from the configured effective date.
        </p>
      </div>

      {/* Allocations Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Active & Historical Stockist Territory Mappings</h2>
          <span className="text-xs text-gray-500">{allocations.length} mappings recorded</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading stockist allocations...</div>
        ) : allocations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <div className="text-base font-medium text-gray-900">No Stockist Allocations Configured</div>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
              Click &quot;Map Stockist to MR&quot; above to link wholesale stockists to medical representatives.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 text-xs font-semibold uppercase">
                  <th className="p-3">Stockist Party</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">Assigned MR</th>
                  <th className="p-3">Territory</th>
                  <th className="p-3">Effective From</th>
                  <th className="p-3">Effective To</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/80 transition">
                    <td className="p-3 font-medium text-gray-900">{a.stockistName}</td>
                    <td className="p-3 font-mono text-xs text-gray-600">{a.stockistGstin || "—"}</td>
                    <td className="p-3 font-medium text-emerald-700">{a.mrName}</td>
                    <td className="p-3 text-gray-600">{a.territoryName || "General Headquarter"}</td>
                    <td className="p-3 text-gray-600">
                      {new Date(a.effectiveFrom).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="p-3 text-gray-600">
                      {a.effectiveTo ? (
                        new Date(a.effectiveTo).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      ) : (
                        <span className="font-semibold text-emerald-600">Current (Active)</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        !a.effectiveTo ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                      }`}>
                        {!a.effectiveTo ? "Active Primary" : "Historical Record"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Allocation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">Allocate Stockist to MR</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAllocation} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Stockist / Wholesaler *</label>
                <select
                  value={selectedStockistId}
                  onChange={(e) => setSelectedStockistId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm"
                >
                  <option value="">-- Choose Stockist --</option>
                  {stockists.map((s) => (
                    <option key={s.id} value={s.id}>{s.legalName} ({s.gstin || "No GST"})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Medical Representative (MR) *</label>
                <select
                  value={selectedMrId}
                  onChange={(e) => setSelectedMrId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm"
                >
                  <option value="">-- Choose MR --</option>
                  {mrs.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.territory || "MR"})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Territory / Headquarter</label>
                <select
                  value={selectedTerritoryId}
                  onChange={(e) => setSelectedTerritoryId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm"
                >
                  <option value="">-- Optional Territory --</option>
                  {territories.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Effective Start Date *</label>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Allocation Type</label>
                  <select
                    value={allocationType}
                    onChange={(e) => setAllocationType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm"
                  >
                    <option value="Primary">Primary MR</option>
                    <option value="Secondary">Secondary MR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Audit Notes / Reason</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Territory expansion, replacement for outgoing rep"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
                >
                  {saving ? "Saving..." : "Confirm & Save Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
