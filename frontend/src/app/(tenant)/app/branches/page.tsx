"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Boxes,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  X,
  Sparkles,
  ShieldAlert,
  Star
} from "lucide-react";
import {
  tenantAppService,
  BranchDetails,
  CreateBranchInput,
  CreateWarehouseInput,
} from "@/services/tenant-app-services";
import { TenantQuotaSummary } from "@/types";

export default function TenantBranchesPage() {
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [quotas, setQuotas] = useState<TenantQuotaSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Create Branch Modal
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchForm, setBranchForm] = useState<CreateBranchInput>({
    branchCode: "",
    branchName: "",
    gstin: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    stateCode: "",
    pincode: "",
    phone: "",
    email: "",
    isHeadOffice: false,
  });

  // Create Warehouse Modal
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [warehouseForm, setWarehouseForm] = useState<CreateWarehouseInput>({
    branchId: "",
    warehouseCode: "",
    warehouseName: "",
    location: "",
    isDefault: false,
  });

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [branchList, quotaData] = await Promise.all([
        tenantAppService.getBranches(),
        tenantAppService.getQuotaSummary(),
      ]);
      setBranches(branchList);
      setQuotas(quotaData);
    } catch (err) {
      console.error("Failed to load branches data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.branchCode || !branchForm.branchName) return;

    try {
      setSubmitting(true);
      await tenantAppService.createBranch(branchForm);
      setIsBranchModalOpen(false);
      setBranchForm({
        branchCode: "",
        branchName: "",
        gstin: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        stateCode: "",
        pincode: "",
        phone: "",
        email: "",
        isHeadOffice: false,
      });
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to create branch.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWarehouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseForm.warehouseCode || !warehouseForm.warehouseName || !selectedBranchId) return;

    try {
      setSubmitting(true);
      await tenantAppService.createWarehouse({
        ...warehouseForm,
        branchId: selectedBranchId,
      });
      setIsWarehouseModalOpen(false);
      setWarehouseForm({
        branchId: "",
        warehouseCode: "",
        warehouseName: "",
        location: "",
        isDefault: false,
      });
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to create warehouse.");
    } finally {
      setSubmitting(false);
    }
  };

  const openAddWarehouse = (branchId: string, branchCode: string) => {
    setSelectedBranchId(branchId);
    setWarehouseForm({
      branchId,
      warehouseCode: `${branchCode}-WH${branches.find((b) => b.id === branchId)?.warehouses.length ? branches.find((b) => b.id === branchId)!.warehouses.length + 1 : 2}`,
      warehouseName: "",
      location: "",
      isDefault: false,
    });
    setIsWarehouseModalOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            <span>Multi-Branch & Warehouse Hierarchy</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Structure your Head Office, regional distribution centres, retail outlets, and storage godowns.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Branch Quota
            </span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {quotas?.currentBranches || branches.length} / {quotas?.maxBranches || 1} Allowed
            </span>
          </div>
          <button
            onClick={() => setIsBranchModalOpen(true)}
            disabled={(quotas?.currentBranches || 0) >= (quotas?.maxBranches || 1)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Branch</span>
          </button>
        </div>
      </div>

      {/* Branches List */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Loading branches and storage godowns...
          </div>
        ) : branches.length > 0 ? (
          branches.map((branch) => (
            <div
              key={branch.id}
              className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-6 shadow-sm"
            >
              {/* Branch Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-850">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-white tracking-tight">
                      {branch.branchName}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-400 font-semibold">
                      {branch.branchCode}
                    </span>
                    {branch.isHeadOffice && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>Head Office</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    {branch.gstin && (
                      <span>
                        GSTIN: <span className="font-mono text-slate-200">{branch.gstin}</span>
                      </span>
                    )}
                    {branch.city && (
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {branch.addressLine1 ? `${branch.addressLine1}, ` : ""}
                          {branch.city}, {branch.state} {branch.pincode}
                        </span>
                      </span>
                    )}
                    {branch.phone && (
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{branch.phone}</span>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openAddWarehouse(branch.id, branch.branchCode)}
                  disabled={(quotas?.currentWarehouses || 0) >= (quotas?.maxWarehouses || 2)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-400" />
                  <span>Add Warehouse</span>
                </button>
              </div>

              {/* Warehouses under Branch */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Boxes className="w-3.5 h-3.5 text-purple-400" />
                    <span>Warehouses & Storage Zones ({branch.warehouses.length})</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {branch.warehouses.map((wh) => (
                    <div
                      key={wh.id}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between space-x-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-white">{wh.warehouseName}</span>
                          {wh.isDefault && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Code: {wh.warehouseCode}
                        </div>
                        {wh.location && (
                          <div className="text-[11px] text-slate-500">
                            Location: {wh.location}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-slate-400 text-xs">
            No branches configured.
          </div>
        )}
      </div>

      {/* Create Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsBranchModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <span>Create New Branch</span>
              </h3>
              <p className="text-xs text-slate-400">
                Register a new store outlet or distribution branch.
              </p>
            </div>

            <form onSubmit={handleBranchSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Branch Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR-SOUTH"
                    value={branchForm.branchCode}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, branchCode: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Branch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. South Regional Hub"
                    value={branchForm.branchName}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, branchName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Branch GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={branchForm.gstin || ""}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, gstin: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Contact Phone (10 Digits)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={branchForm.phone || ""}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Address Line 1</label>
                <input
                  type="text"
                  placeholder="Plot 42, Industrial Area"
                  value={branchForm.addressLine1 || ""}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, addressLine1: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">City</label>
                  <input
                    type="text"
                    placeholder="Bengaluru"
                    value={branchForm.city || ""}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">State</label>
                  <input
                    type="text"
                    placeholder="Karnataka"
                    value={branchForm.state || ""}
                    onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Pincode</label>
                  <input
                    type="text"
                    placeholder="560001"
                    value={branchForm.pincode || ""}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, pincode: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isHeadOffice"
                  checked={branchForm.isHeadOffice}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, isHeadOffice: e.target.checked })
                  }
                  className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isHeadOffice" className="text-xs text-slate-300 cursor-pointer">
                  Set as Head Office Branch
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Save Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Warehouse Modal */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsWarehouseModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Boxes className="w-5 h-5 text-purple-400" />
                <span>Create Warehouse / Godown</span>
              </h3>
              <p className="text-xs text-slate-400">
                Add an inventory location under the selected branch.
              </p>
            </div>

            <form onSubmit={handleWarehouseSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Warehouse Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WH-COLD-01"
                  value={warehouseForm.warehouseCode}
                  onChange={(e) =>
                    setWarehouseForm({ ...warehouseForm, warehouseCode: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Warehouse Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cold Storage Unit 1"
                  value={warehouseForm.warehouseName}
                  onChange={(e) =>
                    setWarehouseForm({ ...warehouseForm, warehouseName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Location / Floor</label>
                <input
                  type="text"
                  placeholder="e.g. Basement Floor, Rack B-12"
                  value={warehouseForm.location || ""}
                  onChange={(e) =>
                    setWarehouseForm({ ...warehouseForm, location: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefaultWh"
                  checked={warehouseForm.isDefault}
                  onChange={(e) =>
                    setWarehouseForm({ ...warehouseForm, isDefault: e.target.checked })
                  }
                  className="rounded bg-slate-900 border-slate-800 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="isDefaultWh" className="text-xs text-slate-300 cursor-pointer">
                  Set as Default Warehouse for this Branch
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Save Warehouse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
