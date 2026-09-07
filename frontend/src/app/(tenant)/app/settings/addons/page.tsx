"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  CreditCard,
  Building2,
  FileText,
  Clock,
  Layers,
  Check,
  Activity,
  UserCheck,
  MapPin,
  Lock,
  RefreshCw
} from "lucide-react";
import { tenantAppService } from "@/services/tenant-app-services";
import { superAdminService, PlatformCommercialConfig } from "@/services/super-admin-services";
import { useAddons } from "@/context/addon-context";

export default function PlanAndAddonsPage() {
  const { refreshConfig } = useAddons();
  const [activePackData, setActivePackData] = useState<any | null>(null);
  const [commercialConfig, setCommercialConfig] = useState<PlatformCommercialConfig | null>(null);
  const [subStatus, setSubStatus] = useState<any | null>(null);
  const [sfaQuota, setSfaQuota] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activatingAi, setActivatingAi] = useState(false);
  const [activatingSfa, setActivatingSfa] = useState(false);
  const [deactivatingSfa, setDeactivatingSfa] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [packRes, subRes, commRes, quotaRes] = await Promise.all([
        tenantAppService.getActiveIndustryPack().catch(() => null),
        tenantAppService.getSubscriptionStatus().catch(() => null),
        superAdminService.getCommercialConfig().catch(() => null),
        tenantAppService.getPharmaSfaQuota().catch(() => null)
      ]);
      setActivePackData(packRes);
      setSubStatus(subRes);
      setCommercialConfig(commRes);
      setSfaQuota(quotaRes);
    } catch (err) {
      console.error("Failed to load plan and addons data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleActivateAi = async () => {
    try {
      setActivatingAi(true);
      const res = await tenantAppService.activateAiAddon();
      setActionMsg({
        type: "success",
        text: res?.message || "AI Pro Add-on activated successfully! 500 scans/month quota unlocked."
      });
      setTimeout(() => setActionMsg(null), 5000);
      await loadData();
    } catch (err: any) {
      setActionMsg({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to activate AI Pro Add-on."
      });
    } finally {
      setActivatingAi(false);
    }
  };

  const handleActivateSfa = async () => {
    try {
      setActivatingSfa(true);
      const res = await tenantAppService.activatePharmaSfa();
      if (res?.isSuccess) {
        setActionMsg({
          type: "success",
          text: "Pharma SFA & Field Force Add-on activated! 15 MR Seats & 5 Manager Seats unlocked."
        });
        await refreshConfig();
        await loadData();
      } else {
        setActionMsg({
          type: "error",
          text: res?.message || "Failed to activate Pharma SFA Add-on."
        });
      }
      setTimeout(() => setActionMsg(null), 5000);
    } catch (err: any) {
      setActionMsg({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to activate Pharma SFA Add-on."
      });
    } finally {
      setActivatingSfa(false);
    }
  };

  const handleDeactivateSfa = async () => {
    if (!confirm("Are you sure you want to deactivate Pharma SFA? Field force features and menu will be hidden.")) return;
    try {
      setDeactivatingSfa(true);
      const res = await tenantAppService.deactivatePharmaSfa();
      if (res?.isSuccess) {
        setActionMsg({
          type: "success",
          text: "Pharma SFA Add-on has been deactivated."
        });
        await refreshConfig();
        await loadData();
      } else {
        setActionMsg({
          type: "error",
          text: res?.message || "Failed to deactivate Pharma SFA Add-on."
        });
      }
      setTimeout(() => setActionMsg(null), 5000);
    } catch (err: any) {
      setActionMsg({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to deactivate Pharma SFA Add-on."
      });
    } finally {
      setDeactivatingSfa(false);
    }
  };

  const gstRate = commercialConfig?.gstRatePercent || 18;
  const singleUserPrice = commercialConfig?.singleUserAnnualPrice || 799;
  const fiveUserPrice = commercialConfig?.fiveUserPackAnnualPrice || 2999;
  const aiPrice = commercialConfig?.aiProAnnualPrice || 1499;

  const descriptor = activePackData?.descriptor || {
    displayName: "General Trading & Retail",
    code: activePackData?.industryTypeCode || "OTHER",
    description: "Standard retail & wholesale trading with multi-rate GST and stock ledger"
  };

  const maxAllowedUsers = activePackData?.maxAllowedUsers || 2;
  const currentActiveUsers = activePackData?.currentActiveUsers || 1;
  const isAiActive = activePackData?.isAiAddonActive || false;
  const scansLimit = activePackData?.aiScansLimit || 500;
  const scansUsed = activePackData?.aiScansUsed || 0;
  const scansRemaining = activePackData?.scansRemaining ?? (scansLimit - scansUsed);

  const isPharmaTenant =
    (activePackData?.industryTypeCode || "").toUpperCase() === "PHARMA" ||
    (activePackData?.activeIndustryModule || "").toUpperCase() === "PHARMA";
  const isSfaActive = !!activePackData?.isPharmaSfaActive;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Zero Separate Module Fees • All Industries Included
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Layers className="w-6 h-6 text-emerald-400" />
            <span>My Plan & Capacity Add-ons</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Your core subscription includes 2 user seats and your entire Industry Pack. Expand staff capacity or unlock AI automation below.
          </p>
        </div>
        <Link
          href="/app/settings/billing"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all self-start sm:self-auto"
        >
          <CreditCard className="w-4 h-4 text-slate-400" />
          <span>Billing History & Invoices</span>
        </Link>
      </div>

      {actionMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2.5 ${
            actionMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
          }`}
        >
          {actionMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Primary Card: Active Core Subscription & Industry Pack */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Core Plan Active
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Industry Pack: {descriptor.displayName}
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                ₹0 Separate Module Fee (Included)
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              UdyogBill Core Plan — {descriptor.displayName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
              {descriptor.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6 shrink-0">
            <div>
              <div className="text-xs text-slate-400 font-medium">Staff User Capacity</div>
              <div className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{currentActiveUsers} / {maxAllowedUsers} Seats Used</span>
              </div>
              <div className="w-36 bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (currentActiveUsers / maxAllowedUsers) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights of Active Industry Pack */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Core GST Invoicing Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>2 Included User Seats</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Full Inventory & Stock Ledger</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>GST Reports & E-Way Bill</span>
          </div>
        </div>
      </div>

      {/* Available Paid Add-Ons (The ONLY 2 Official Add-ons) */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white tracking-tight">Available Expansion Add-Ons</h3>
          <p className="text-xs text-slate-400">
            Expand staff access or unlock automated invoice scanning. Industry modules are never charged separately.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Add-on 1: Staff User Add-ons */}
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-5 hover:border-slate-700 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Capacity Expansion
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Staff User Add-On Packs</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Add more cashiers, billers, and staff members to your UdyogBill account with role-based access control.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">+1 Single Extra User</div>
                    <div className="text-[11px] text-slate-400">₹{singleUserPrice}/year + {gstRate}% GST</div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-sky-400">₹{(singleUserPrice * (1 + gstRate / 100)).toFixed(0)}</span>
                    <span className="text-[10px] text-slate-500 block">incl. GST/yr</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-sky-500/30 flex items-center justify-between relative overflow-hidden">
                  <span className="absolute top-0 right-0 px-2 py-0.2 text-[9px] font-bold bg-sky-500 text-white rounded-bl">
                    SAVE ₹{((singleUserPrice * 5) - fiveUserPrice).toFixed(0)}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-white">+5 Users Pack (Bulk Value)</div>
                    <div className="text-[11px] text-slate-400">₹{fiveUserPrice}/year + {gstRate}% GST</div>
                  </div>
                  <div className="text-right pt-2">
                    <span className="text-sm font-bold text-sky-400">₹{(fiveUserPrice * (1 + gstRate / 100)).toFixed(0)}</span>
                    <span className="text-[10px] text-slate-500 block">incl. GST/yr</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <Link
                href="/app/staff"
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <span>Manage Users & Capacity</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Add-on 2: AI Pro Purchase Bill Scanner */}
          <div className={`p-6 rounded-2xl bg-slate-950/60 border flex flex-col justify-between space-y-5 transition-all ${
            isAiActive ? "border-purple-500/50 shadow-lg shadow-purple-500/10" : "border-slate-800 hover:border-slate-700"
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                {isAiActive ? (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active & Enrolled
                  </span>
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    AI Automation
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>AI Pro Purchase Bill Scanner</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">PRO</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Snap purchase bill photos or upload PDF invoices. AI OCR automatically extracts items, batches, HSN codes, rates, and GST in 5 seconds.
                </p>
              </div>

              {isAiActive ? (
                <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Monthly Scan Quota:</span>
                    <span className="font-bold text-purple-300">{scansRemaining} / {scansLimit} remaining</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${Math.max(5, (scansRemaining / scansLimit) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 text-right">Quota resets monthly</div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">500 Invoices / Month Quota</div>
                    <div className="text-[11px] text-slate-400">₹{aiPrice}/year + {gstRate}% GST</div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-purple-400">₹{(aiPrice * (1 + gstRate / 100)).toFixed(0)}</span>
                    <span className="text-[10px] text-slate-500 block">incl. GST/yr</span>
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Mobile camera photo snap + PDF upload</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Auto-matches vendors and stock items</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              {isAiActive ? (
                <Link
                  href="/app/purchase/bills"
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open AI Invoice Scanner</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleActivateAi}
                  disabled={activatingAi}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/25"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{activatingAi ? "Activating AI Add-on..." : `Activate AI Pro (₹${aiPrice}/yr)`}</span>
                </button>
              )}
            </div>
          </div>

          {/* Add-on 3: Pharma SFA & Field Force Suite (Exclusive Pharma Add-on) */}
          <div
            className={`p-6 rounded-2xl bg-slate-950/60 border flex flex-col justify-between space-y-5 transition-all ${
              isSfaActive
                ? "border-teal-500/50 shadow-lg shadow-teal-500/10"
                : isPharmaTenant
                ? "border-teal-500/30 hover:border-teal-500/50"
                : "border-slate-800/60 opacity-60"
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Activity className="w-5 h-5" />
                </div>
                {isSfaActive ? (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active & Subscribed
                  </span>
                ) : isPharmaTenant ? (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    Pharma Add-on (Optional)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Pharma Only
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Pharma SFA & Field Force</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">ADD-ON</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  For Pharma companies, PCD franchises, & C&F agencies. MR field force, calling beats, doctor directory, stockist allocation, trade schemes, tour plans, and DCR.
                </p>
              </div>

              {isSfaActive ? (
                <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-500/20 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                      MR Seats Quota:
                    </span>
                    <span className="font-bold text-teal-300">
                      {sfaQuota?.currentActiveMrUsers ?? 0} / {sfaQuota?.maxAllowedMrUsers ?? 15} Seats
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-teal-500 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(5, ((sfaQuota?.currentActiveMrUsers ?? 0) / (sfaQuota?.maxAllowedMrUsers ?? 15)) * 100))}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-teal-900/50">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-teal-400" />
                      Manager Seats:
                    </span>
                    <span className="font-bold text-teal-300">
                      {sfaQuota?.currentActiveManagerUsers ?? 0} / {sfaQuota?.maxAllowedManagerUsers ?? 5} Seats
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="text-xs font-semibold text-white">15 MR + 5 Manager Seats</div>
                    <span className="text-xs font-bold text-teal-400">Included in Add-on</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Dedicated field-force roster, doctors & chemists directory, MTP, and POB orders.
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>HQ, Division & Calling Beats hierarchy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Doctors, Prescribers & Chemist Stockists</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Commercial Trade Schemes, Slabs & Free Goods</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>MTP Tour Plans & POB Orders to Invoice</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              {isSfaActive ? (
                <>
                  <Link
                    href="/app/pharma/field-force"
                    className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Open Field Force & MR Roster</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleDeactivateSfa}
                    disabled={deactivatingSfa}
                    className="w-full py-1.5 px-3 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-[11px] font-medium transition-all cursor-pointer text-center"
                  >
                    {deactivatingSfa ? "Deactivating..." : "Deactivate SFA Add-On"}
                  </button>
                </>
              ) : isPharmaTenant ? (
                <button
                  type="button"
                  onClick={handleActivateSfa}
                  disabled={activatingSfa}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-600/25"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{activatingSfa ? "Activating SFA Add-on..." : "Subscribe to Pharma SFA Add-on"}</span>
                </button>
              ) : (
                <div className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-medium flex items-center justify-center gap-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Requires Pharma Core Plan</span>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>

      {/* Commercial Policy Guarantee Note */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-300">UdyogBill Transparent Commercial Policy: </strong>
          Industry packs (Pharma, FMCG, Electronics, Garments, Hardware, Service Sector, Retail) are <span className="text-emerald-400 font-semibold">100% included in your core plan</span> and are never charged as separate monthly add-ons. You only pay for additional staff capacity or optional AI document scanning.
        </div>
      </div>
    </div>
  );
}
