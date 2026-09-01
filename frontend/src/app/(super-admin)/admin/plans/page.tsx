"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Plus,
  CheckCircle,
  Users,
  Building,
  HardDrive,
  FileText,
  Sparkles,
  Zap,
  Shield,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  Check
} from "lucide-react";
import { subscriptionService } from "@/services/api-services";
import { superAdminService, CreatePlanInput, UpdatePlanInput } from "@/services/super-admin-services";
import { Plan } from "@/types";

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Plan Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePlanInput>({
    code: "",
    name: "",
    description: "",
    billingCycle: 1, // Monthly
    price: 999,
    setupFee: 0,
    trialDays: 14,
    maxUsers: 5,
    maxBranches: 2,
    maxWarehouses: 3,
    maxInvoicesPerMonth: 1000,
    maxStorageMb: 2048,
    isPopular: false,
    entitledFeatureIds: [],
  });

  // Edit Plan Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdatePlanInput>({
    name: "",
    description: "",
    billingCycle: 1,
    price: 999,
    setupFee: 0,
    trialDays: 14,
    maxUsers: 5,
    maxBranches: 2,
    maxWarehouses: 3,
    maxInvoicesPerMonth: 1000,
    maxStorageMb: 2048,
    isActive: true,
    isPopular: false,
    entitledFeatureIds: [],
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getPlans();
      setPlans(data);
    } catch (err) {
      console.error("Failed to load plans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlanId(plan.id);
    setEditForm({
      name: plan.name,
      description: plan.description || "",
      billingCycle: plan.billingCycle || 1,
      price: plan.price,
      setupFee: plan.setupFee || 0,
      trialDays: plan.trialDays || 14,
      maxUsers: plan.maxUsers || 5,
      maxBranches: plan.maxBranches || 1,
      maxWarehouses: plan.maxWarehouses || 1,
      maxInvoicesPerMonth: plan.maxInvoicesPerMonth || 1000,
      maxStorageMb: plan.maxStorageMb || 1024,
      isActive: plan.isActive !== false,
      isPopular: plan.isPopular || false,
      entitledFeatureIds: (plan as any).entitlements?.map((e: any) => e.featureId) || [],
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Are you sure you want to permanently delete plan '${plan.name}' (${plan.code})?`)) {
      return;
    }
    try {
      setLoading(true);
      await superAdminService.deletePlan(plan.id);
      setActionMsg({ type: "success", text: `Plan '${plan.name}' deleted successfully.` });
      setTimeout(() => setActionMsg(null), 4000);
      loadPlans();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err?.response?.data?.message || "Failed to delete plan." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.code || !createForm.name) return;
    try {
      setSubmitting(true);
      await superAdminService.createPlan(createForm);
      setIsCreateOpen(false);
      setCreateForm({
        code: "",
        name: "",
        description: "",
        billingCycle: 1,
        price: 999,
        setupFee: 0,
        trialDays: 14,
        maxUsers: 5,
        maxBranches: 2,
        maxWarehouses: 3,
        maxInvoicesPerMonth: 1000,
        maxStorageMb: 2048,
        isPopular: false,
        entitledFeatureIds: [],
      });
      setActionMsg({ type: "success", text: "New subscription tier created successfully!" });
      setTimeout(() => setActionMsg(null), 4000);
      loadPlans();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.response?.data?.errorMessage || "Failed to create plan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanId) return;
    try {
      setSubmitting(true);
      await superAdminService.updatePlan(editingPlanId, editForm);
      setIsEditOpen(false);
      setEditingPlanId(null);
      setActionMsg({ type: "success", text: "Subscription tier updated successfully!" });
      setTimeout(() => setActionMsg(null), 4000);
      loadPlans();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.response?.data?.errorMessage || "Failed to update plan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            <span>Monetization & Plan Entitlement Manager</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Define subscription tiers, branch and warehouse quota limits, invoice throttles, and dynamic capability entitlements.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Tier</span>
        </button>
      </div>

      {actionMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2.5 ${
            actionMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
          }`}
        >
          {actionMsg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Plans Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            Loading subscription tiers...
          </div>
        ) : plans.length > 0 ? (
          plans.map((plan) => {
            const basePrice = Number(plan.price) || 0;
            const gstAmount = Number((basePrice * 0.18).toFixed(2));
            const totalWithGst = Number((basePrice + gstAmount).toFixed(2));

            return (
              <div
                key={plan.id}
                className={`p-6 rounded-2xl bg-slate-950/60 border flex flex-col justify-between relative transition-all ${
                  plan.isPopular
                    ? "border-emerald-500/50 shadow-xl shadow-emerald-500/10"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500 text-slate-950 shadow-md">
                    Most Popular Tier
                  </span>
                )}

                <div className="space-y-4">
                  {/* Top Bar: Code & Active Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {plan.code}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        plan.isActive !== false
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {plan.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{plan.description}</p>
                  </div>

                  {/* Price Section with GST Additional Notice */}
                  <div className="pt-2">
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-3xl font-black text-white">
                        ₹{basePrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-slate-400">/ month</span>
                    </div>

                    <div className="mt-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                      <div className="text-[11px] text-amber-400 font-semibold flex items-center gap-1.5">
                        <span>+ 18% GST (₹{gstAmount.toLocaleString("en-IN")}) will be additional</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex justify-between">
                        <span>Total Payable:</span>
                        <span className="font-bold text-emerald-400">₹{totalWithGst.toLocaleString("en-IN")} / mo</span>
                      </div>
                    </div>
                  </div>

                  {/* Quotas */}
                  <div className="pt-3 border-t border-slate-900 space-y-2.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-2">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>User Limit</span>
                      </span>
                      <span className="font-semibold text-white">{plan.maxUsers} Users</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-2">
                        <Building className="w-3.5 h-3.5 text-purple-400" />
                        <span>Branches & Warehouses</span>
                      </span>
                      <span className="font-semibold text-white">
                        {plan.maxBranches} Br / {plan.maxWarehouses} Wh
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-2">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Monthly Invoices</span>
                      </span>
                      <span className="font-semibold text-white">
                        {plan.maxInvoicesPerMonth >= 100000 ? "Unlimited" : `${plan.maxInvoicesPerMonth} /mo`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-2">
                        <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Storage Quota</span>
                      </span>
                      <span className="font-semibold text-white">
                        {plan.maxStorageMb >= 1024 ? `${(plan.maxStorageMb / 1024).toFixed(0)} GB` : `${plan.maxStorageMb} MB`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: Trial Info & Actions */}
                <div className="mt-6 pt-4 border-t border-slate-900 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{plan.trialDays}-day automated trial</span>
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Configured</span>
                    </span>
                  </div>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenEdit(plan)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-indigo-300 hover:text-indigo-200 border border-slate-800 text-xs font-semibold transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Plan</span>
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      className="inline-flex items-center justify-center p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400">
            No monetization plans configured.
          </div>
        )}
      </div>

      {/* Edit Plan Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-indigo-400" />
                <span>Edit Subscription Tier</span>
              </h3>
              <p className="text-xs text-slate-400">
                Update plan pricing, quota limits, and tax details.
              </p>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Price (Without GST) & Live Tax Calculation Box */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Base Price (Without GST) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editForm.price}
                      onChange={(e) =>
                        setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Trial Days</label>
                    <input
                      type="number"
                      value={editForm.trialDays}
                      onChange={(e) =>
                        setEditForm({ ...editForm, trialDays: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Tax Breakdown Notice */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-medium">
                    + 18% GST: ₹{((editForm.price || 0) * 0.18).toFixed(2)} (Additional)
                  </span>
                  <span className="text-slate-300 font-bold">
                    Final Total: <span className="text-emerald-400">₹{((editForm.price || 0) * 1.18).toFixed(2)}</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Note: Super Admin yahan Base Price daalega, checkout par 18% GST automatic add hoga.
                </p>
              </div>

              {/* Quotas */}
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Max Users</label>
                  <input
                    type="number"
                    value={editForm.maxUsers}
                    onChange={(e) =>
                      setEditForm({ ...editForm, maxUsers: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Max Branches</label>
                  <input
                    type="number"
                    value={editForm.maxBranches}
                    onChange={(e) =>
                      setEditForm({ ...editForm, maxBranches: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Warehouses</label>
                  <input
                    type="number"
                    value={editForm.maxWarehouses}
                    onChange={(e) =>
                      setEditForm({ ...editForm, maxWarehouses: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Invoices/Mo</label>
                  <input
                    type="number"
                    value={editForm.maxInvoicesPerMonth}
                    onChange={(e) =>
                      setEditForm({ ...editForm, maxInvoicesPerMonth: parseInt(e.target.value) || 1000 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isPopular}
                    onChange={(e) => setEditForm({ ...editForm, isPopular: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Mark as "Most Popular Tier"</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Plan Active & Visible</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  {submitting ? "Updating Plan..." : "Save Plan Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>Create Subscription Tier</span>
              </h3>
              <p className="text-xs text-slate-400">
                Define pricing (without GST) and operational limits for subscriber accounts.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Plan Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ULTIMATE"
                    value={createForm.code}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ultimate Enterprise"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Description *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="For high-volume multi-branch enterprises..."
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Price & Tax Box */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Price (INR/mo - Without GST) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={createForm.price}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, price: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Trial Days</label>
                    <input
                      type="number"
                      value={createForm.trialDays}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, trialDays: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-medium">
                    + 18% GST: ₹{((createForm.price || 0) * 0.18).toFixed(2)} (Additional)
                  </span>
                  <span className="text-slate-300 font-bold">
                    Final Total: <span className="text-emerald-400">₹{((createForm.price || 0) * 1.18).toFixed(2)}</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Note: Enter price WITHOUT GST. 18% GST will be added during checkout.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Max Users</label>
                  <input
                    type="number"
                    value={createForm.maxUsers}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, maxUsers: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Max Branches</label>
                  <input
                    type="number"
                    value={createForm.maxBranches}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, maxBranches: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Warehouses</label>
                  <input
                    type="number"
                    value={createForm.maxWarehouses}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, maxWarehouses: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Invoices/Mo</label>
                  <input
                    type="number"
                    value={createForm.maxInvoicesPerMonth}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, maxInvoicesPerMonth: parseInt(e.target.value) || 1000 })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Popular Checkbox */}
              <label className="flex items-center space-x-2 text-xs text-white cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={createForm.isPopular}
                  onChange={(e) => setCreateForm({ ...createForm, isPopular: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Mark as "Most Popular Tier"</span>
              </label>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {submitting ? "Saving Tier..." : "Save Subscription Tier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
