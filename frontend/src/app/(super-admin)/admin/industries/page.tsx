"use client";

import { useEffect, useState } from "react";
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle,
  Sliders,
  Sparkles,
  Package,
  Trash2,
  X,
  Search,
  Check
} from "lucide-react";
import { catalogService } from "@/services/api-services";
import { superAdminService, CreateIndustryInput } from "@/services/super-admin-services";
import { Industry } from "@/types";

export default function SuperAdminIndustriesPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create Industry Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateIndustryInput>({
    code: "",
    name: "",
    description: "",
    icon: "layers",
    displayOrder: 1,
    defaultConfigJson: "{}",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadIndustries = async () => {
    try {
      setLoading(true);
      const data = await catalogService.getIndustries();
      setIndustries(data);
    } catch (err) {
      console.error("Failed to load industries", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIndustries();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.code || !createForm.name) return;
    try {
      setSubmitting(true);
      await superAdminService.createIndustry(createForm);
      setIsCreateOpen(false);
      setCreateForm({
        code: "",
        name: "",
        description: "",
        icon: "layers",
        displayOrder: 1,
        defaultConfigJson: "{}",
      });
      loadIndustries();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to create industry.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIndustries = industries.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Layers className="w-6 h-6 text-purple-400" />
            <span>Dynamic Industry Capability Engine</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Configure dynamic vertical templates, attach module capability flags, and define industry-specific billing behaviors at runtime.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Industry</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search industry verticals by title, code or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {filteredIndustries.length} of {industries.length} Verticals Active
        </span>
      </div>

      {/* Industries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            Loading dynamic industry matrix...
          </div>
        ) : filteredIndustries.length > 0 ? (
          filteredIndustries.map((ind) => (
            <div
              key={ind.id}
              className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {ind.code}
                  </span>
                  <span className="flex items-center space-x-1 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Dynamic Ready</span>
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">{ind.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {ind.description}
                </p>
              </div>

              {/* Module & Feature Pill Highlights */}
              <div className="pt-3 border-t border-slate-900/80 space-y-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Attached Core Modules ({ind.modules?.length || 6})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(ind.modules && ind.modules.length > 0
                    ? ind.modules.slice(0, 4).map((m) => m.name)
                    : ["Sales", "Purchase", "Inventory", "GST", "Accounts"]
                  ).map((modName, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-slate-300 font-medium"
                    >
                      {modName}
                    </span>
                  ))}
                  {(ind.modules?.length || 0) > 4 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400">
                      +{(ind.modules?.length || 0) - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400">
            No industry verticals found.
          </div>
        )}
      </div>

      {/* Create Industry Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>Create New Industry Vertical</span>
              </h3>
              <p className="text-xs text-slate-400">
                Register a new commercial category for tenant onboarding.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Industry Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OPTICAL"
                    value={createForm.code}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Vertical Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Optical & Eye Care"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Description *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Specialized workflows, lens prescription records, frame variant matrices..."
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Icon Identifier</label>
                  <input
                    type="text"
                    placeholder="glasses"
                    value={createForm.icon}
                    onChange={(e) => setCreateForm({ ...createForm, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Display Order</label>
                  <input
                    type="number"
                    value={createForm.displayOrder}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, displayOrder: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Save Industry Vertical"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
