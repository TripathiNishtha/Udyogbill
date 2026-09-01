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
  Landmark
} from "lucide-react";
import { superAdminService } from "@/services/super-admin-services";
import { tenantService } from "@/services/api-services";

const ICON_MAP: Record<string, any> = {
  ADDON_PHARMA: Pill,
  ADDON_GARMENTS: Shirt,
  ADDON_MANUFACTURING: Factory,
  ADDON_FMCG: Boxes,
  ADDON_ACCOUNTING: Landmark,
};

export default function SuperAdminAddonsPage() {
  const [addons, setAddons] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Addon Modal
  const [editingAddon, setEditingAddon] = useState<any | null>(null);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState<number>(0);
  const [editAnnualPrice, setEditAnnualPrice] = useState<number>(0);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editDescription, setEditDescription] = useState<string>("");
  const [savingPrice, setSavingPrice] = useState(false);

  // Manual Grant Modal
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedAddonCode, setSelectedAddonCode] = useState<string>("ADDON_PHARMA");
  const [grantDurationDays, setGrantDurationDays] = useState<number>(30);
  const [grantReason, setGrantReason] = useState<string>("Offline Payment / Special Promo");
  const [granting, setGranting] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const addonsData = await superAdminService.getAddons();
      setAddons(addonsData || []);

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
        description: editDescription,
      });
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

  const handleManualGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !selectedAddonCode) return;
    try {
      setGranting(true);
      await superAdminService.manualGrantAddon(selectedTenantId, {
        addonCode: selectedAddonCode,
        durationDays: grantDurationDays,
        reason: grantReason,
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <span>Industry Add-on Pricing & Entitlements</span>
          </h1>
          <p className="text-sm text-slate-400">
            Set subscription prices for industry packs and manually assign add-ons to subscribers.
          </p>
        </div>
        <button
          onClick={() => setIsGrantOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Manual Add-on Grant</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 text-sm ${
            message.type === "success"
              ? "bg-emerald-950/50 border-emerald-800 text-emerald-300"
              : "bg-rose-950/50 border-rose-800 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Add-ons List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-white text-base">Active Add-on Catalog</h2>
          <span className="text-xs text-slate-400">
            Base Core Billing remains free/included; Add-ons incur subscription fees.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {addons.map((addon) => {
                const Icon = ICON_MAP[addon.code] || Sparkles;
                const mPrice = Number(addon.price) || 0;
                const aPrice = addon.annualPrice ? Number(addon.annualPrice) : Math.round(mPrice * 10);
                return (
                  <tr key={addon.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{addon.name}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 max-w-sm">
                            {addon.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{addon.code}</td>
                    <td className="py-3.5 px-4">
                      <div className="text-sm font-bold text-emerald-400">₹{mPrice} <span className="text-[10px] text-slate-500 font-normal">/ mo</span></div>
                      <div className="text-[10px] text-amber-400/90 font-medium">+18% GST (₹{(mPrice * 0.18).toFixed(2)})</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-sm font-bold text-indigo-400">₹{aPrice} <span className="text-[10px] text-slate-500 font-normal">/ yr</span></div>
                      <div className="text-[10px] text-amber-400/90 font-medium">+18% GST (₹{(aPrice * 0.18).toFixed(2)})</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 border border-slate-800 text-slate-300">
                        Monthly & Yearly
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          addon.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {addon.isActive ? "Available" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEdit(addon)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Price</span>
                      </button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <Edit2 className="w-4 h-4 text-indigo-400" />
                  <span>Configure Monthly & Yearly Pricing</span>
                </h3>
                <button onClick={() => setEditingAddon(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdatePrice} className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white">{editingAddon.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">{editingAddon.code}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Monthly Price Field */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                      <span>Monthly Price *</span>
                      <span className="text-[10px] text-slate-400 font-normal">Excl. GST</span>
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
                        className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800">
                      <div className="flex justify-between">
                        <span>+ 18% GST:</span>
                        <span className="text-amber-400">₹{mGst}</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-400">
                        <span>Total Payable:</span>
                        <span>₹{mTotal} / mo</span>
                      </div>
                    </div>
                  </div>

                  {/* Yearly Price Field */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">
                        <span>Yearly Price *</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditAnnualPrice(Math.round(editMonthlyPrice * 10))}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline"
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
                        className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800">
                      <div className="flex justify-between">
                        <span>+ 18% GST:</span>
                        <span className="text-amber-400">₹{aGst}</span>
                      </div>
                      <div className="flex justify-between font-bold text-indigo-400">
                        <span>Total Payable:</span>
                        <span>₹{aTotal} / yr</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300/90 leading-relaxed">
                  💡 <strong>Notice:</strong> Super Admin yahan Base Price (Without GST) set karega. Subscriber ko checkout par 18% GST additional jud kar grand total dikhai dega.
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Catalog Description</label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="editIsActive" className="text-xs text-slate-300 font-medium">
                    Active in Marketplace (Subscribers can purchase Monthly or Yearly)
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingAddon(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPrice}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 shadow-md shadow-indigo-600/30"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Manual Add-on Grant (Admin Override)</span>
              </h3>
              <button onClick={() => setIsGrantOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualGrant} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Select Subscriber / Tenant</label>
                <select
                  required
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.businessName} ({t.code} - {t.adminEmail})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Select Industry Add-on</label>
                <select
                  required
                  value={selectedAddonCode}
                  onChange={(e) => setSelectedAddonCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {addons.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name} (Regular ₹{a.price}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Validity Duration (Days)</label>
                  <select
                    value={grantDurationDays}
                    onChange={(e) => setGrantDurationDays(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={15}>15 Days (Trial)</option>
                    <option value={30}>30 Days (1 Month)</option>
                    <option value={90}>90 Days (3 Months)</option>
                    <option value={180}>180 Days (6 Months)</option>
                    <option value={365}>365 Days (1 Year)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Reason / Reference</label>
                  <input
                    type="text"
                    required
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    placeholder="e.g. Bank wire ref #9981"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                Granting this add-on will immediately activate all features for the tenant, extend validity, and record a formal Audit Grant Invoice in their billing history.
              </p>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGrantOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={granting}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
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
