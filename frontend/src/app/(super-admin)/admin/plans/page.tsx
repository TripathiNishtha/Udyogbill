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
import { superAdminService, CreatePlanInput, UpdatePlanInput, PlatformCommercialConfig, UpdateCommercialConfigInput } from "@/services/super-admin-services";
import { Plan } from "@/types";

const formatBillingCycle = (cycle: number | string | undefined, planCode?: string, planName?: string) => {
  const code = (planCode || "").toUpperCase();
  const name = (planName || "").toLowerCase();

  if (cycle === 24 || code.includes("BIENNIAL") || name.includes("2 year") || name.includes("2 yr") || name.includes("biennial")) {
    return { label: "2 Years (730 Days)", suffix: "/ 2 years", shortSuffix: "/ 2 yrs", cycleName: "2 Years", cycleNum: 24, days: 730 };
  }
  if (cycle === 12 || code.includes("ANNUAL") || code.includes("YEAR") || name.includes("1 year") || name.includes("1 yr") || name.includes("annual") || name.includes("yearly")) {
    return { label: "1 Year (365 Days)", suffix: "/ year", shortSuffix: "/ yr", cycleName: "1 Year", cycleNum: 12, days: 365 };
  }
  if (cycle === 6 || name.includes("semi")) {
    return { label: "6 Months (180 Days)", suffix: "/ 6 months", shortSuffix: "/ 6 mo", cycleName: "6 Months", cycleNum: 6, days: 180 };
  }
  if (cycle === 3 || name.includes("quarter")) {
    return { label: "Quarterly (90 Days)", suffix: "/ quarter", shortSuffix: "/ qtr", cycleName: "Quarterly", cycleNum: 3, days: 90 };
  }
  if (cycle === 99 || name.includes("lifetime")) {
    return { label: "Lifetime Deal", suffix: "(One-time)", shortSuffix: "one-time", cycleName: "Lifetime", cycleNum: 99, days: 3650 };
  }
  return { label: "Monthly (30 Days)", suffix: "/ month", shortSuffix: "/ mo", cycleName: "Monthly", cycleNum: 1, days: 30 };
};

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Canonical Commercial Configuration State
  const [commercialConfig, setCommercialConfig] = useState<PlatformCommercialConfig | null>(null);
  const [commercialLoading, setCommercialLoading] = useState(false);
  const [commercialSaving, setCommercialSaving] = useState(false);
  const [commercialForm, setCommercialForm] = useState<UpdateCommercialConfigInput>({
    coreAnnualPrice: 3999,
    coreBiennialPrice: 6999,
    singleUserAnnualPrice: 799,
    fiveUserPackAnnualPrice: 2999,
    aiProAnnualPrice: 1499,
    aiProMonthlyQuota: 500,
    defaultIncludedUsers: 2,
    gstRatePercent: 18,
    commercialNotes: ""
  });

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
    isHidden: false,
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
    isHidden: false,
    entitledFeatureIds: [],
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadCommercialConfig = async () => {
    try {
      setCommercialLoading(true);
      const data = await superAdminService.getCommercialConfig();
      if (data) {
        setCommercialConfig(data);
        setCommercialForm({
          coreAnnualPrice: Number(data.coreAnnualPrice),
          coreBiennialPrice: Number(data.coreBiennialPrice),
          singleUserAnnualPrice: Number(data.singleUserAnnualPrice),
          fiveUserPackAnnualPrice: Number(data.fiveUserPackAnnualPrice),
          aiProAnnualPrice: Number(data.aiProAnnualPrice),
          aiProMonthlyQuota: Number(data.aiProMonthlyScanLimit),
          defaultIncludedUsers: Number(data.includedUsers),
          gstRatePercent: Number(data.gstRatePercent),
          commercialNotes: data.notes || ""
        });
      }
    } catch (err) {
      console.error("Failed to load commercial config", err);
    } finally {
      setCommercialLoading(false);
    }
  };

  const handleCommercialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCommercialSaving(true);
      await superAdminService.updateCommercialConfig(commercialForm);
      setActionMsg({ type: "success", text: "Canonical commercial pricing updated live in database!" });
      setTimeout(() => setActionMsg(null), 4000);
      await loadCommercialConfig();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err?.response?.data?.message || "Failed to update commercial pricing." });
    } finally {
      setCommercialSaving(false);
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await superAdminService.getPlans();
      setPlans(data);
    } catch (err) {
      console.error("Failed to load plans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommercialConfig();
    loadPlans();
  }, []);

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlanId(plan.id);
    const resolvedCycle = formatBillingCycle(plan.billingCycle, plan.code, plan.name).cycleNum;
    setEditForm({
      name: plan.name,
      description: plan.description || "",
      billingCycle: plan.billingCycle && plan.billingCycle !== 1 ? plan.billingCycle : resolvedCycle,
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
      isHidden: (plan as any).isHidden || false,
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
        isHidden: false,
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            <span>Monetization &amp; Plan Entitlement Manager</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Define subscription tiers, branch and warehouse quota limits, invoice throttles, and dynamic capability entitlements.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Tier</span>
        </button>
      </div>

      {actionMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2.5 ${
            actionMsg.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {actionMsg.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Canonical Platform Commercial Pricing Configuration */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-6 lg:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Live Commercial Pricing Control (Database Backed)
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              UdyogBill Core SaaS Commercial Engine
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Single core subscription. All 7 industry modules (Pharma, FMCG, Electronics, Garments, Hardware, Services, Retail) are included free with registration. SuperAdmin dynamically controls add-ons and core rates.
            </p>
          </div>
          {commercialConfig && (
            <div className="text-right text-xs text-slate-500">
              <span className="block font-medium text-slate-700">Status: <span className="text-emerald-600 font-semibold">Active &amp; Live</span></span>
              {commercialConfig.updatedAtUtc && (
                <span>Last saved: {new Date(commercialConfig.updatedAtUtc).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleCommercialSubmit} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Core 1-Year */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Core 1-Year</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Primary</span>
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium">Base Price (excl. GST)</label>
                <div className="mt-1 relative rounded-lg">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={commercialForm.coreAnnualPrice}
                    onChange={(e) => setCommercialForm({ ...commercialForm, coreAnnualPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span>+ {commercialForm.gstRatePercent}% GST:</span>
                  <span className="text-slate-800 font-medium">₹{(commercialForm.coreAnnualPrice * (commercialForm.gstRatePercent / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-slate-200">
                  <span>Total Payable:</span>
                  <span>₹{(commercialForm.coreAnnualPrice * (1 + commercialForm.gstRatePercent / 100)).toFixed(2)}</span>
                </div>
              </div>
              <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Includes <strong>{commercialForm.defaultIncludedUsers} users</strong></span>
              </div>
            </div>

            {/* Card 2: Core 2-Year Bundle */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Core 2-Year Bundle</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">High Value</span>
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium">Base Price (excl. GST)</label>
                <div className="mt-1 relative rounded-lg">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={commercialForm.coreBiennialPrice}
                    onChange={(e) => setCommercialForm({ ...commercialForm, coreBiennialPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span>+ {commercialForm.gstRatePercent}% GST:</span>
                  <span className="text-slate-800 font-medium">₹{(commercialForm.coreBiennialPrice * (commercialForm.gstRatePercent / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-800 pt-1 border-t border-slate-200">
                  <span>Total Payable:</span>
                  <span>₹{(commercialForm.coreBiennialPrice * (1 + commercialForm.gstRatePercent / 100)).toFixed(2)}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>24-month validity lock</span>
              </div>
            </div>

            {/* Card 3: User Add-ons */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">User Add-Ons</span>
                <Users className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium">Extra Single User / yr</label>
                <div className="mt-1 relative rounded-lg">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={commercialForm.singleUserAnnualPrice}
                    onChange={(e) => setCommercialForm({ ...commercialForm, singleUserAnnualPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium">5-User Pack / yr</label>
                <div className="mt-1 relative rounded-lg">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={commercialForm.fiveUserPackAnnualPrice}
                    onChange={(e) => setCommercialForm({ ...commercialForm, fiveUserPackAnnualPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>
              <div className="text-[11px] text-orange-800">
                Bulk discount: ₹{((commercialForm.singleUserAnnualPrice * 5) - commercialForm.fiveUserPackAnnualPrice).toFixed(0)} savings vs 5 single seats.
              </div>
            </div>

            {/* Card 4: AI Pro Add-on */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">AI Pro Scanner</span>
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium">AI Pro Price / yr</label>
                <div className="mt-1 relative rounded-lg">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={commercialForm.aiProAnnualPrice}
                    onChange={(e) => setCommercialForm({ ...commercialForm, aiProAnnualPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium">Monthly Scan Limit</label>
                <input
                  type="number"
                  min="1"
                  value={commercialForm.aiProMonthlyQuota}
                  onChange={(e) => setCommercialForm({ ...commercialForm, aiProMonthlyQuota: parseInt(e.target.value) || 500 })}
                  className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div className="text-[11px] text-purple-800">
                Invoice OCR + Auto Purchase Entry quota
              </div>
            </div>
          </div>

          {/* Row 2: Secondary Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-200">
            <div>
              <label className="text-xs text-slate-600 font-semibold">Default Included Users in Core</label>
              <input
                type="number"
                min="1"
                max="50"
                value={commercialForm.defaultIncludedUsers}
                onChange={(e) => setCommercialForm({ ...commercialForm, defaultIncludedUsers: parseInt(e.target.value) || 2 })}
                className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 font-semibold">GST Rate (%)</label>
              <input
                type="number"
                min="0"
                max="28"
                step="0.01"
                value={commercialForm.gstRatePercent}
                onChange={(e) => setCommercialForm({ ...commercialForm, gstRatePercent: parseFloat(e.target.value) || 18 })}
                className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 font-semibold">Internal Commercial Notes</label>
              <input
                type="text"
                placeholder="e.g. FY26 Promotion Pricing"
                value={commercialForm.commercialNotes || ""}
                onChange={(e) => setCommercialForm({ ...commercialForm, commercialNotes: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={commercialSaving || commercialLoading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>{commercialSaving ? "Saving Live Changes..." : "Save Commercial Pricing Changes"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Plans Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            Loading subscription tiers...
          </div>
        ) : plans.length > 0 ? (
          plans.map((plan) => {
            const basePrice = Number(plan.price) || 0;
            const gstAmount = Number((basePrice * 0.18).toFixed(2));
            const totalWithGst = Number((basePrice + gstAmount).toFixed(2));
            const cycleInfo = formatBillingCycle(plan.billingCycle, plan.code, plan.name);

            return (
              <div
                key={plan.id}
                className={`p-6 rounded-3xl bg-white border flex flex-col justify-between relative transition-all shadow-sm hover:shadow-md ${
                  plan.isPopular
                    ? "border-emerald-400 ring-2 ring-emerald-400/20"
                    : "border-slate-200 hover:border-orange-300"
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-600 text-white shadow-sm">
                    Most Popular Tier
                  </span>
                )}

                <div className="space-y-4">
                  {/* Top Bar: Code & Active Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                      {plan.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {plan.isHidden ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          🔒 Hidden
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                          🌐 Public
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          plan.isActive !== false
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {plan.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">{plan.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                        {cycleInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{plan.description}</p>
                  </div>

                  {/* Price Section with GST Additional Notice */}
                  <div className="pt-2">
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-3xl font-black text-slate-900">
                        ₹{basePrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-slate-500">{cycleInfo.suffix}</span>
                    </div>

                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1">
                      <div className="text-[11px] text-amber-900 font-semibold flex items-center gap-1.5">
                        <span>+ 18% GST (₹{gstAmount.toLocaleString("en-IN")}) will be additional</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between">
                        <span>Total Payable:</span>
                        <span className="font-bold text-emerald-700">₹{totalWithGst.toLocaleString("en-IN")} {cycleInfo.shortSuffix}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quotas */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center space-x-2">
                        <Users className="w-3.5 h-3.5 text-orange-600" />
                        <span>User Limit</span>
                      </span>
                      <span className="font-semibold text-slate-900">{plan.maxUsers} Users</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center space-x-2">
                        <Building className="w-3.5 h-3.5 text-purple-600" />
                        <span>Branches &amp; Warehouses</span>
                      </span>
                      <span className="font-semibold text-slate-900">
                        {plan.maxBranches} Br / {plan.maxWarehouses} Wh
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center space-x-2">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Monthly Invoices</span>
                      </span>
                      <span className="font-semibold text-slate-900">
                        {plan.maxInvoicesPerMonth >= 100000 ? "Unlimited" : `${plan.maxInvoicesPerMonth} /mo`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center space-x-2">
                        <HardDrive className="w-3.5 h-3.5 text-orange-600" />
                        <span>Storage Quota</span>
                      </span>
                      <span className="font-semibold text-slate-900">
                        {plan.maxStorageMb >= 1024 ? `${(plan.maxStorageMb / 1024).toFixed(0)} GB` : `${plan.maxStorageMb} MB`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: Trial Info & Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{plan.trialDays}-day automated trial</span>
                    <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Configured</span>
                    </span>
                  </div>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenEdit(plan)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-orange-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Plan</span>
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      className="inline-flex items-center justify-center p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition-all cursor-pointer"
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
          <div className="col-span-full py-16 text-center text-slate-500">
            No monetization plans configured.
          </div>
        )}
      </div>

      {/* Edit Plan Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-orange-600" />
                <span>Edit Subscription Tier</span>
              </h3>
              <p className="text-xs text-slate-500">
                Update plan pricing, quota limits, and tax details.
              </p>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Billing Cycle *</label>
                  <select
                    value={editForm.billingCycle}
                    onChange={(e) => setEditForm({ ...editForm, billingCycle: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                  >
                    <option value={1}>Monthly (30 Days Validity)</option>
                    <option value={3}>Quarterly (90 Days Validity)</option>
                    <option value={6}>Semi-Annually (180 Days Validity)</option>
                    <option value={12}>1 Year / Annual (365 Days Validity)</option>
                    <option value={24}>2 Years / Biennial (730 Days Validity)</option>
                    <option value={99}>Lifetime Deal</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                />
              </div>

              {/* Price (Without GST) & Live Tax Calculation Box */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-amber-950">
                      Base Price ({formatBillingCycle(editForm.billingCycle).label} - Without GST) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editForm.price}
                      onChange={(e) =>
                        setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-amber-950">Trial Days</label>
                    <input
                      type="number"
                      value={editForm.trialDays}
                      onChange={(e) =>
                        setEditForm({ ...editForm, trialDays: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                    />
                  </div>
                </div>

                {/* Tax Breakdown Notice */}
                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs">
                  <span className="text-amber-800 font-semibold">
                    + 18% GST: ₹{((editForm.price || 0) * 0.18).toFixed(2)} (Additional)
                  </span>
                  <span className="text-slate-700 font-bold">
                    Final Total: <span className="text-emerald-700">₹{((editForm.price || 0) * 1.18).toFixed(2)} {formatBillingCycle(editForm.billingCycle).shortSuffix}</span>
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/80">
                  Note: Super Admin yahan Base Price daalega, checkout par 18% GST automatic add hoga.
                </p>
              </div>

              {/* Quotas */}
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Max Users</label>
                  <input
                    type="number"
                    value={editForm.maxUsers}
                    onChange={(e) =>
                      setEditForm({ ...editForm, maxUsers: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Max Branches</label>
                  <input
                    type="number"
                    value={editForm.maxBranches}
                    onChange={(e) =>
                      setEditForm({ ...editForm, maxBranches: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Warehouses</label>
                  <input
                    type="number"
                    value={editForm.maxWarehouses}
                    onChange={(e) =>
                      setEditForm({ ...editForm, maxWarehouses: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Invoices/Mo</label>
                  <input
                    type="number"
                    value={editForm.maxInvoicesPerMonth}
                    onChange={(e) =>
                      setEditForm({ ...editForm, maxInvoicesPerMonth: parseInt(e.target.value) || 1000 })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isPopular}
                      onChange={(e) => setEditForm({ ...editForm, isPopular: e.target.checked })}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span>Mark as "Most Popular Tier"</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span>Plan Active Status</span>
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <label className="flex items-center space-x-2 text-xs text-amber-900 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isHidden}
                      onChange={(e) => setEditForm({ ...editForm, isHidden: e.target.checked })}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span>🔒 Hide from Tenants / Public Store (SuperAdmin Only Private Tier)</span>
                  </label>
                  <p className="text-[11px] text-amber-800/80 mt-1 pl-5">
                    When hidden, tenants cannot see or self-subscribe to this plan in their billing portal. Only SuperAdmin can view and assign it.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20 transition-all disabled:opacity-50"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>Create Subscription Tier</span>
              </h3>
              <p className="text-xs text-slate-500">
                Define pricing (without GST) and operational limits for subscriber accounts.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Plan Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ULTIMATE"
                    value={createForm.code}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ultimate Enterprise"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Billing Cycle *</label>
                  <select
                    value={createForm.billingCycle}
                    onChange={(e) => setCreateForm({ ...createForm, billingCycle: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value={1}>Monthly (30 Days)</option>
                    <option value={3}>Quarterly (90 Days)</option>
                    <option value={6}>Semi-Annually (180 Days)</option>
                    <option value={12}>1 Year / Annual (365 Days)</option>
                    <option value={24}>2 Years / Biennial (730 Days)</option>
                    <option value={99}>Lifetime Deal</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="For high-volume multi-branch enterprises..."
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Price & Tax Box */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-amber-950">
                      Price ({formatBillingCycle(createForm.billingCycle).label} - Without GST) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={createForm.price}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, price: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-amber-950">Trial Days</label>
                    <input
                      type="number"
                      value={createForm.trialDays}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, trialDays: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs">
                  <span className="text-amber-800 font-semibold">
                    + 18% GST: ₹{((createForm.price || 0) * 0.18).toFixed(2)} (Additional)
                  </span>
                  <span className="text-slate-700 font-bold">
                    Final Total: <span className="text-emerald-700">₹{((createForm.price || 0) * 1.18).toFixed(2)} {formatBillingCycle(createForm.billingCycle).shortSuffix}</span>
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/80">
                  Note: Enter price WITHOUT GST. 18% GST will be added during checkout.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Max Users</label>
                  <input
                    type="number"
                    value={createForm.maxUsers}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, maxUsers: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Max Branches</label>
                  <input
                    type="number"
                    value={createForm.maxBranches}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, maxBranches: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Warehouses</label>
                  <input
                    type="number"
                    value={createForm.maxWarehouses}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, maxWarehouses: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Invoices/Mo</label>
                  <input
                    type="number"
                    value={createForm.maxInvoicesPerMonth}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, maxInvoicesPerMonth: parseInt(e.target.value) || 1000 })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="flex items-center space-x-2 text-xs text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.isPopular}
                    onChange={(e) => setCreateForm({ ...createForm, isPopular: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Mark as "Most Popular Tier"</span>
                </label>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <label className="flex items-center space-x-2 text-xs text-amber-900 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.isHidden}
                      onChange={(e) => setCreateForm({ ...createForm, isHidden: e.target.checked })}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span>🔒 Hide from Tenants / Public Store (SuperAdmin Only Private Tier)</span>
                  </label>
                  <p className="text-[11px] text-amber-800/80 mt-1 pl-5">
                    When hidden, tenants cannot see or self-subscribe to this plan. Only SuperAdmin can view and assign it.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
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
