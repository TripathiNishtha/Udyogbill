"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Edit2,
  CheckCircle,
  AlertCircle,
  Plus,
  Building2,
  Clock,
  ShieldCheck,
  X,
  CreditCard,
  Save,
  Pill,
  Shirt,
  Factory,
  Boxes,
  Landmark,
  Users,
  Sliders,
  Calculator,
  UserCheck,
  ShieldAlert,
  Zap,
  Check
} from "lucide-react";
import { superAdminService, PlatformCommercialConfig } from "@/services/super-admin-services";
import { tenantService } from "@/services/api-services";
import { superAdminPharmaSfaService } from "@/services/pharma-sfa-services";

const ICON_MAP: Record<string, any> = {
  ADDON_PHARMA: Pill,
  ADDON_PHARMA_SFA: Users,
  ADDON_GARMENTS: Shirt,
  ADDON_MANUFACTURING: Factory,
  ADDON_FMCG: Boxes,
  ADDON_ACCOUNTING: Landmark,
};

export default function SuperAdminAddonsPage() {
  const [addons, setAddons] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Commercial Config (Per-Seat Pricing for SFA)
  const [commercialConfig, setCommercialConfig] = useState<PlatformCommercialConfig | null>(null);
  const [sfaAnnualBase, setSfaAnnualBase] = useState<number>(19999);
  const [sfaMonthlyBase, setSfaMonthlyBase] = useState<number>(1999);
  const [mrAnnualSeat, setMrAnnualSeat] = useState<number>(4999);
  const [mrMonthlySeat, setMrMonthlySeat] = useState<number>(499);
  const [mgrAnnualSeat, setMgrAnnualSeat] = useState<number>(6999);
  const [mgrMonthlySeat, setMgrMonthlySeat] = useState<number>(699);
  const [savingSfaConfig, setSavingSfaConfig] = useState<boolean>(false);

  // SFA Live Simulator
  const [simMrCount, setSimMrCount] = useState<number>(5);
  const [simMgrCount, setSimMgrCount] = useState<number>(1);
  const [simIsAnnual, setSimIsAnnual] = useState<boolean>(true);

  // Edit Addon Modal
  const [editingAddon, setEditingAddon] = useState<any | null>(null);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState<number>(0);
  const [editAnnualPrice, setEditAnnualPrice] = useState<number>(0);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editIsHidden, setEditIsHidden] = useState<boolean>(false);
  const [editDescription, setEditDescription] = useState<string>("");
  const [savingPrice, setSavingPrice] = useState(false);

  // Manual Grant Modal
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedAddonCode, setSelectedAddonCode] = useState<string>("ADDON_PHARMA_SFA");
  const [grantDurationDays, setGrantDurationDays] = useState<number>(365);
  const [grantReason, setGrantReason] = useState<string>("SuperAdmin Enterprise License Grant");
  const [grantMrSeats, setGrantMrSeats] = useState<number>(15);
  const [grantManagerSeats, setGrantManagerSeats] = useState<number>(5);
  const [tenantSearch, setTenantSearch] = useState<string>("");
  const [granting, setGranting] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const addonsData = await superAdminService.getAddons();
      setAddons(addonsData || []);

      try {
        const config = await superAdminService.getCommercialConfig();
        if (config) {
          setCommercialConfig(config);
          setSfaAnnualBase(config.pharmaSfaAnnualBasePrice ?? 19999);
          setSfaMonthlyBase(config.pharmaSfaMonthlyBasePrice ?? 1999);
          setMrAnnualSeat(config.mrSeatAnnualPrice ?? 4999);
          setMrMonthlySeat(config.mrSeatMonthlyPrice ?? 499);
          setMgrAnnualSeat(config.managerSeatAnnualPrice ?? 6999);
          setMgrMonthlySeat(config.managerSeatMonthlyPrice ?? 699);
        }
      } catch (cErr) {
        console.warn("Could not load commercial config", cErr);
      }

      try {
        const tenantsRes = await tenantService.getAllTenants(1, 100);
        setTenants(tenantsRes?.items || []);
        if (tenantsRes?.items?.length > 0) {
          setSelectedTenantId(tenantsRes.items[0].id);
        }
      } catch (tErr) {
        console.warn("Could not load tenants list", tErr);
      }
    } catch (err: any) {
      console.error("Failed to load addons", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEdit = (addon: any) => {
    setEditingAddon(addon);
    const mPrice = Number(addon.price) || 0;
    setEditMonthlyPrice(mPrice);
    setEditAnnualPrice(addon.annualPrice ? Number(addon.annualPrice) : Math.round(mPrice * 10));
    setEditIsActive(addon.isActive);
    setEditIsHidden(addon.isHidden ?? false);
    setEditDescription(addon.description || "");
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddon) return;
    try {
      setSavingPrice(true);
      await superAdminService.updateAddonPrice(editingAddon.code, {
        price: editMonthlyPrice,
        annualPrice: editAnnualPrice,
        isActive: editIsActive,
        isHidden: editIsHidden,
        description: editDescription,
      });

      // Keep commercial config in sync if editing SFA
      if (editingAddon.code === "ADDON_PHARMA_SFA" && commercialConfig) {
        await superAdminService.updateCommercialConfig({
          coreAnnualPrice: commercialConfig.coreAnnualPrice ?? 4999,
          coreBiennialPrice: commercialConfig.coreBiennialPrice ?? 8999,
          singleUserAnnualPrice: commercialConfig.singleUserAnnualPrice ?? 999,
          fiveUserPackAnnualPrice: commercialConfig.fiveUserPackAnnualPrice ?? 3999,
          aiProAnnualPrice: commercialConfig.aiProAnnualPrice ?? 2999,
          aiProMonthlyQuota: commercialConfig.aiProMonthlyScanLimit ?? 50,
          defaultIncludedUsers: commercialConfig.includedUsers ?? 2,
          gstRatePercent: commercialConfig.gstRatePercent ?? 18,
          pharmaSfaAnnualBasePrice: editAnnualPrice,
          pharmaSfaMonthlyBasePrice: editMonthlyPrice,
          mrSeatAnnualPrice: mrAnnualSeat,
          mrSeatMonthlyPrice: mrMonthlySeat,
          managerSeatAnnualPrice: mgrAnnualSeat,
          managerSeatMonthlyPrice: mgrMonthlySeat,
        });
      }

      setMessage({ type: "success", text: `Pricing for ${editingAddon.name} (Monthly & Yearly) updated successfully!` });
      setEditingAddon(null);
      loadData();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update pricing." });
    } finally {
      setSavingPrice(false);
    }
  };

  const handleSaveSfaSeatPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSfaConfig(true);
      await superAdminService.updateCommercialConfig({
        coreAnnualPrice: commercialConfig?.coreAnnualPrice ?? 4999,
        coreBiennialPrice: commercialConfig?.coreBiennialPrice ?? 8999,
        singleUserAnnualPrice: commercialConfig?.singleUserAnnualPrice ?? 999,
        fiveUserPackAnnualPrice: commercialConfig?.fiveUserPackAnnualPrice ?? 3999,
        aiProAnnualPrice: commercialConfig?.aiProAnnualPrice ?? 2999,
        aiProMonthlyQuota: commercialConfig?.aiProMonthlyScanLimit ?? 50,
        defaultIncludedUsers: commercialConfig?.includedUsers ?? 2,
        gstRatePercent: commercialConfig?.gstRatePercent ?? 18,
        commercialNotes: commercialConfig?.notes ?? "SFA Seat rates updated by SuperAdmin",
        pharmaSfaAnnualBasePrice: sfaAnnualBase,
        pharmaSfaMonthlyBasePrice: sfaMonthlyBase,
        mrSeatAnnualPrice: mrAnnualSeat,
        mrSeatMonthlyPrice: mrMonthlySeat,
        managerSeatAnnualPrice: mgrAnnualSeat,
        managerSeatMonthlyPrice: mgrMonthlySeat,
      });

      // Also ensure ADDON_PHARMA_SFA base price matches in catalog
      await superAdminService.updateAddonPrice("ADDON_PHARMA_SFA", {
        price: sfaMonthlyBase,
        annualPrice: sfaAnnualBase,
        isActive: true,
        description: "Medical Representative Field Force, Daily Call Reports (DCR), Chemist POB, Doctor Detailing, Sample Bag & 3-Way Parity."
      });

      setMessage({ type: "success", text: "Pharma SFA Base & Per-User Seat rates updated and synchronized successfully!" });
      loadData();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update Pharma SFA seat pricing." });
    } finally {
      setSavingSfaConfig(false);
    }
  };

  const handleManualGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !selectedAddonCode) return;
    try {
      setGranting(true);

      if (selectedAddonCode === "ADDON_PHARMA_SFA") {
        await superAdminPharmaSfaService.activatePharmaAddon(
          selectedTenantId,
          grantDurationDays >= 365,
          grantMrSeats,
          grantManagerSeats
        );
      }

      await superAdminService.manualGrantAddon(selectedTenantId, {
        addonCode: selectedAddonCode,
        durationDays: grantDurationDays,
        reason: selectedAddonCode === "ADDON_PHARMA_SFA" 
          ? `${grantReason} (MR: ${grantMrSeats}, Mgr: ${grantManagerSeats})` 
          : grantReason,
      });

      setMessage({
        type: "success",
        text: `Add-on ${selectedAddonCode} successfully granted for ${grantDurationDays} days!`,
      });
      setIsGrantOpen(false);
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to grant add-on." });
    } finally {
      setGranting(false);
    }
  };

  // Simulator calculations
  const simBase = simIsAnnual ? sfaAnnualBase : sfaMonthlyBase;
  const simMrUnit = simIsAnnual ? mrAnnualSeat : mrMonthlySeat;
  const simMgrUnit = simIsAnnual ? mgrAnnualSeat : mgrMonthlySeat;
  const simMrTotal = simMrCount * simMrUnit;
  const simMgrTotal = simMgrCount * simMgrUnit;
  const simSubtotal = simBase + simMrTotal + simMgrTotal;
  const simGst = simSubtotal * 0.18;
  const simGrandTotal = simSubtotal + simGst;

  const filteredTenants = tenants.filter((t) => {
    if (!tenantSearch.trim()) return true;
    const q = tenantSearch.toLowerCase();
    return (
      (t.businessName || "").toLowerCase().includes(q) ||
      (t.code || "").toLowerCase().includes(q) ||
      (t.adminEmail || "").toLowerCase().includes(q) ||
      (t.tradeName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <span>Industry Add-on Pricing &amp; Entitlements</span>
          </h1>
          <p className="text-sm text-slate-500">
            Set subscription prices for industry packs, configure per-user MR seat rates, and assign add-ons to subscribers.
          </p>
        </div>
        <button
          onClick={() => setIsGrantOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Manual Add-on Grant</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 text-sm ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Pharma SFA Dedicated Per-Seat Monetization Section */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Pharma SFA &amp; MR Field Force — Per-Seat Pricing Engine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Seat Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              SuperAdmin control for Base SFA Add-on pack price + Dynamic Per-User Seat rates for Medical Representatives (MR) and Area Managers.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Zero Core Impact Engine</span>
          </div>
        </div>

        <form onSubmit={handleSaveSfaSeatPricing} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Rate Configuration Cards */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Set Commercial License Rates (Excl. 18% GST)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* SFA Base Pack */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">SFA Base Pack</span>
                  <span className="text-[10px] text-slate-500 font-mono">ADDON_PHARMA_SFA</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Monthly (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={sfaMonthlyBase}
                      onChange={(e) => setSfaMonthlyBase(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Yearly (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={sfaAnnualBase}
                      onChange={(e) => setSfaAnnualBase(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Per MR User Seat */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700">Per MR Seat Rate</span>
                  <span className="text-[10px] text-slate-500">Field Force</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">₹ / MR / Month</label>
                    <input
                      type="number"
                      min="0"
                      value={mrMonthlySeat}
                      onChange={(e) => setMrMonthlySeat(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-700 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">₹ / MR / Year</label>
                    <input
                      type="number"
                      min="0"
                      value={mrAnnualSeat}
                      onChange={(e) => setMrAnnualSeat(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-700 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Per Manager Seat */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700">Per Mgr Seat Rate</span>
                  <span className="text-[10px] text-slate-500">ASM / RSM</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">₹ / Mgr / Month</label>
                    <input
                      type="number"
                      min="0"
                      value={mgrMonthlySeat}
                      onChange={(e) => setMgrMonthlySeat(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-indigo-700 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">₹ / Mgr / Year</label>
                    <input
                      type="number"
                      min="0"
                      value={mgrAnnualSeat}
                      onChange={(e) => setMgrAnnualSeat(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-indigo-700 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                These rates automatically drive tenant checkout quotes &amp; enforce MR user creation limits.
              </span>
              <button
                type="submit"
                disabled={savingSfaConfig}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingSfaConfig ? "Saving SFA Rates..." : "Save SFA Seat Pricing Engine"}</span>
              </button>
            </div>
          </div>

          {/* Live Simulator & Quota Breakdown */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <span>Live Revenue &amp; Quote Simulator</span>
              </span>
              <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => setSimIsAnnual(false)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    !simIsAnnual ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setSimIsAnnual(true)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    simIsAnnual ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Annual (Yearly)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-1">MR Field Seats (₹{simMrUnit}/ea)</label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={simMrCount}
                  onChange={(e) => setSimMrCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-1">Manager Seats (₹{simMgrUnit}/ea)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={simMgrCount}
                  onChange={(e) => setSimMgrCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-xs pt-2 border-t border-slate-200 font-medium">
              <div className="flex justify-between text-slate-600">
                <span>Base SFA License:</span>
                <span className="text-slate-900 font-mono font-semibold">₹{simBase.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>MR Seats ({simMrCount} × ₹{simMrUnit}):</span>
                <span className="text-emerald-700 font-mono font-semibold">+₹{simMrTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Manager Seats ({simMgrCount} × ₹{simMgrUnit}):</span>
                <span className="text-indigo-700 font-mono font-semibold">+₹{simMgrTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Net Price):</span>
                <span className="text-slate-900 font-mono font-bold">₹{simSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-amber-700 text-[11px]">
                <span>GST @ 18%:</span>
                <span className="font-mono font-semibold">+₹{simGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                <span>Total Tenant Pays:</span>
                <span className="text-emerald-700 font-mono text-base font-black">₹{Math.round(simGrandTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Add-ons List Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Active Add-on Catalog</h2>
            <p className="text-xs text-slate-500">
              Base Core Billing remains free/included; Industry Add-ons incur subscription fees.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                setSelectedAddonCode("ADDON_PHARMA_SFA");
                setIsGrantOpen(true);
              }}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-teal-600/20 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Grant SFA to Subscriber</span>
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
              {addons.length} Active Modules
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Add-on Name</th>
                <th className="py-3.5 px-4">System Code</th>
                <th className="py-3.5 px-4">Monthly Price (₹)</th>
                <th className="py-3.5 px-4">Yearly Price (₹)</th>
                <th className="py-3.5 px-4">Billing Cycles</th>
                <th className="py-3.5 px-4">Catalog Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {addons.map((addon) => {
                const Icon = ICON_MAP[addon.code] || Sparkles;
                const mPrice = Number(addon.price) || 0;
                const aPrice = addon.annualPrice ? Number(addon.annualPrice) : Math.round(mPrice * 10);
                const isSfa = addon.code === "ADDON_PHARMA_SFA";

                return (
                  <tr key={addon.id || addon.code} className={`hover:bg-slate-50/80 transition-colors ${isSfa ? "bg-indigo-50/30" : ""}`}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                          isSfa 
                            ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                            : "bg-indigo-50 border-indigo-100 text-indigo-600"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                            <span>{addon.name}</span>
                            {isSfa && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                                Per-Seat Quota
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 max-w-sm">
                            {addon.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{addon.code}</td>
                    <td className="py-3.5 px-4">
                      <div className="text-sm font-bold text-emerald-700">₹{mPrice} <span className="text-[10px] text-slate-500 font-normal">/ mo</span></div>
                      <div className="text-[10px] text-amber-700 font-medium">+18% GST (₹{(mPrice * 0.18).toFixed(2)})</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-sm font-bold text-indigo-700">₹{aPrice} <span className="text-[10px] text-slate-500 font-normal">/ yr</span></div>
                      <div className="text-[10px] text-amber-700 font-medium">+18% GST (₹{(aPrice * 0.18).toFixed(2)})</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                        Monthly &amp; Yearly
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${
                            addon.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {addon.isActive ? "Available" : "Disabled"}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${
                            addon.isHidden
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-sky-50 text-sky-700 border border-sky-200"
                          }`}
                        >
                          {addon.isHidden ? "🔒 Hidden (Private)" : "🌐 Public Store"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAddonCode(addon.code);
                            setIsGrantOpen(true);
                          }}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSfa
                              ? "bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200"
                              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                          }`}
                          title={`Grant ${addon.name} to any subscriber`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Grant to Subscriber</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(addon)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Price</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Price Modal */}
      {editingAddon && (() => {
        const mGst = Number((editMonthlyPrice * 0.18).toFixed(2));
        const mTotal = Number((editMonthlyPrice + mGst).toFixed(2));
        const aGst = Number((editAnnualPrice * 0.18).toFixed(2));
        const aTotal = Number((editAnnualPrice + aGst).toFixed(2));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                  <Edit2 className="w-4 h-4 text-indigo-600" />
                  <span>Configure Monthly &amp; Yearly Pricing</span>
                </h3>
                <button onClick={() => setEditingAddon(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdatePrice} className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{editingAddon.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{editingAddon.code}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Monthly Price Field */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Monthly Price *</span>
                      <span className="text-[10px] text-slate-500 font-normal">Excl. GST</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={editMonthlyPrice}
                        onChange={(e) => setEditMonthlyPrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="text-[10px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-200">
                      <div className="flex justify-between">
                        <span>+ 18% GST:</span>
                        <span className="text-amber-700 font-medium">₹{mGst}</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-700">
                        <span>Total Payable:</span>
                        <span>₹{mTotal} / mo</span>
                      </div>
                    </div>
                  </div>

                  {/* Yearly Price Field */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        <span>Yearly Price *</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditAnnualPrice(Math.round(editMonthlyPrice * 10))}
                        className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold underline cursor-pointer"
                        title="Auto-fill with 10 months price (2 months free)"
                      >
                        Auto (10 mo)
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={editAnnualPrice}
                        onChange={(e) => setEditAnnualPrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="text-[10px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-200">
                      <div className="flex justify-between">
                        <span>+ 18% GST:</span>
                        <span className="text-amber-700 font-medium">₹{aGst}</span>
                      </div>
                      <div className="flex justify-between font-bold text-indigo-700">
                        <span>Total Payable:</span>
                        <span>₹{aTotal} / yr</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  💡 <strong>Notice:</strong> Super Admin yahan Base Price (Without GST) set karega. Subscriber ko checkout par 18% GST additional jud kar grand total dikhai dega.
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Catalog Description</label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="editIsActive" className="text-xs text-slate-700 font-medium cursor-pointer">
                    Active in Catalog (Module is functional and available)
                  </label>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <input
                    type="checkbox"
                    id="editIsHidden"
                    checked={editIsHidden}
                    onChange={(e) => setEditIsHidden(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="editIsHidden" className="text-xs text-amber-900 font-bold block cursor-pointer">
                      Hide from Tenants / Public Store (SuperAdmin Exclusive Grant)
                    </label>
                    <span className="text-[11px] text-amber-800/90 block mt-0.5 leading-relaxed">
                      Jab yeh option chalu hoga toh yeh add-on subscriber store me kisi ko nahi dikhega. Kewal SuperAdmin yahan se manually kisi subscriber ko assign kar sakega aur unki proper GST invoice banegi.
                    </span>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingAddon(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPrice}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingPrice ? "Saving..." : "Save Monthly & Yearly Prices"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Manual Grant Modal */}
      {isGrantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Manual Add-on Grant (Admin Override)</span>
              </h3>
              <button onClick={() => setIsGrantOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualGrant} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Select Subscriber / Tenant</label>
                  <span className="text-[10px] text-slate-500">Showing {filteredTenants.length} of {tenants.length}</span>
                </div>
                <input
                  type="text"
                  placeholder="Filter subscriber by name, code, email..."
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <select
                  required
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  {filteredTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.businessName} ({t.code} • {t.industryCode || t.industryName || "Other"} • {t.adminEmail})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Select Industry Add-on</label>
                <select
                  required
                  value={selectedAddonCode}
                  onChange={(e) => setSelectedAddonCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  {addons.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name} ({a.code}){a.isHidden ? " — [HIDDEN / PRIVATE]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAddonCode === "ADDON_PHARMA_SFA" && (
                <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-teal-900">
                    <Users className="w-4 h-4 text-teal-700" />
                    <span>Pharma SFA &amp; Field Force Quota Allocation</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-teal-900 block mb-1">Max MR Seats Allowed</label>
                      <input
                        type="number"
                        min="1"
                        value={grantMrSeats}
                        onChange={(e) => setGrantMrSeats(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 bg-white border border-teal-300 rounded-lg text-xs font-bold text-teal-900 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-teal-900 block mb-1">Max Manager Seats Allowed</label>
                      <input
                        type="number"
                        min="0"
                        value={grantManagerSeats}
                        onChange={(e) => setGrantManagerSeats(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-1.5 bg-white border border-teal-300 rounded-lg text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-teal-900 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-teal-200">
                    ✨ SuperAdmin Override: Unlocks MR Staffing Roster, Doctor &amp; Chemist Calling Beats, Trade Schemes &amp; Free Goods, Tour Plans, POB Orders, and DCR Field Tracking directly for this subscriber.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Validity Duration (Days)</label>
                  <select
                    value={grantDurationDays}
                    onChange={(e) => setGrantDurationDays(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={15}>15 Days (Trial)</option>
                    <option value={30}>30 Days (1 Month)</option>
                    <option value={90}>90 Days (3 Months)</option>
                    <option value={180}>180 Days (6 Months)</option>
                    <option value={365}>365 Days (1 Year)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Reason / Reference</label>
                  <input
                    type="text"
                    required
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    placeholder="e.g. Bank wire ref #9981"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-[11px] text-indigo-900 leading-relaxed flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Official Indian GST Invoice:</strong> Add-on grant hote hi system automatically proper GST Tax Invoice (with CGST/SGST/IGST breakdown &amp; legal sequential invoice number) create karega. Yeh invoice tenant ko unke <em>Settings &gt; Billing &amp; Invoices</em> portal me turant dikhegi jahan se wo ise download aur print kar sakege.
                </span>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGrantOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={granting}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{granting ? "Granting..." : "Grant Add-on Now"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
