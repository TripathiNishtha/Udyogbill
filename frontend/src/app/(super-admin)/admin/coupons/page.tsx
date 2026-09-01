"use client";

import { useEffect, useState } from "react";
import {
  Tag,
  Plus,
  Percent,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  Search,
  Sparkles,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { platformCouponService, PlatformCoupon } from "@/services/coupon-service";

export default function SuperAdminCouponsPage() {
  const [coupons, setCoupons] = useState<PlatformCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: 1 as 1 | 2, // 1 = %, 2 = Flat ₹
    discountValue: 20,
    minOrderAmount: 0,
    maxDiscountAmount: 1000,
    maxRedemptions: 500,
    validUntilDays: 30,
  });

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await platformCouponService.getAllCoupons();
      setCoupons(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);
    try {
      const now = new Date();
      const validUntil = new Date(now.getTime() + formData.validUntilDays * 24 * 60 * 60 * 1000);

      await platformCouponService.createCoupon({
        code: formData.code.trim().toUpperCase(),
        description: formData.description,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minOrderAmount: formData.minOrderAmount > 0 ? Number(formData.minOrderAmount) : null,
        maxDiscountAmount: formData.discountType === 1 && formData.maxDiscountAmount > 0 ? Number(formData.maxDiscountAmount) : null,
        maxRedemptions: formData.maxRedemptions > 0 ? Number(formData.maxRedemptions) : null,
        validUntilUtc: validUntil.toISOString(),
      });

      setSuccessMsg(`Coupon ${formData.code.toUpperCase()} created successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setIsCreateOpen(false);
      setFormData({
        code: "",
        description: "",
        discountType: 1,
        discountValue: 20,
        minOrderAmount: 0,
        maxDiscountAmount: 1000,
        maxRedemptions: 500,
        validUntilDays: 30,
      });
      loadCoupons();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon ${code}?`)) return;
    try {
      await platformCouponService.deleteCoupon(id);
      setCoupons(coupons.filter((c) => c.id !== id));
      setSuccessMsg(`Coupon ${code} deleted.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete coupon");
    }
  };

  const filteredCoupons = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Coupons &amp; Discount Management</h1>
              <p className="text-xs text-slate-400">Create percentage or flat cash promo codes for subscription plans and add-ons.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Coupon</span>
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Total Coupons</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">{coupons.length}</span>
            <Tag className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Active &amp; Redeemable</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-400">{coupons.filter((c) => c.isActive).length}</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Total Redemptions</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-400">{coupons.reduce((acc, c) => acc + (c.timesRedeemed || 0), 0)}</span>
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Marketing Engine</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-200">Checkout Discounts</span>
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search coupon code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">Showing {filteredCoupons.length} coupons</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Coupon Code</th>
                <th className="px-4 py-3">Discount Value</th>
                <th className="px-4 py-3">Order Requirement</th>
                <th className="px-4 py-3">Validity</th>
                <th className="px-4 py-3">Redemptions</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 font-mono">Loading coupons...</td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No coupons found. Click "Create New Coupon" to make your first promo code.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((c) => {
                  const isExpired = c.validUntilUtc && new Date(c.validUntilUtc) < new Date();
                  return (
                    <tr key={c.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-black rounded-lg text-xs tracking-wider">
                            {c.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(c.code)}
                            className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                            title="Copy code"
                          >
                            {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-xs truncate">{c.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1.5">
                          {c.discountType === 1 ? (
                            <span className="font-extrabold text-emerald-400 text-sm">{c.discountValue}% OFF</span>
                          ) : (
                            <span className="font-extrabold text-indigo-400 text-sm">₹{c.discountValue} FLAT OFF</span>
                          )}
                        </div>
                        {c.discountType === 1 && c.maxDiscountAmount && (
                          <span className="text-[10px] text-slate-400">Up to ₹{c.maxDiscountAmount} max</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.minOrderAmount ? (
                          <span className="text-slate-300 font-mono">Min ₹{c.minOrderAmount}</span>
                        ) : (
                          <span className="text-slate-500">No minimum</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.validUntilUtc ? (
                          <div className="text-[11px] font-mono">
                            <span className={isExpired ? "text-rose-400 line-through" : "text-slate-300"}>
                              {new Date(c.validUntilUtc).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            {isExpired && <p className="text-[10px] text-rose-400 font-sans font-semibold">Expired</p>}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono">Never expires</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-white font-mono">{c.timesRedeemed}</span>
                        <span className="text-slate-500 text-[10px]"> / {c.maxRedemptions ? c.maxRedemptions : "∞"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.isActive && !isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(c.id, c.code)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete coupon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Coupon Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Coupon</h3>
                  <p className="text-xs text-slate-400">Configure discounts for checkout orders</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LAUNCH50, FLAT500, DIWALI25"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold tracking-wider focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Public Description / Marketing Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50% Launch Discount on all Annual Plans & Add-ons"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Discount Type Selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discountType: 1 })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${formData.discountType === 1 ? "bg-amber-500/15 border-amber-500 text-amber-300" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"}`}
                >
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <Percent className="w-3.5 h-3.5" />
                    <span>Percentage (%)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Deducts a percentage from order</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discountType: 2 })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${formData.discountType === 2 ? "bg-indigo-500/15 border-indigo-500 text-indigo-300" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"}`}
                >
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <span className="font-mono font-bold">₹</span>
                    <span>Flat Cash (₹)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Deducts fixed rupee amount</p>
                </button>
              </div>

              {/* Value & Caps */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {formData.discountType === 1 ? "Discount Percentage (%)" : "Flat Discount (₹)"}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={formData.discountType === 1 ? 100 : 50000}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                {formData.discountType === 1 ? (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Max Cap Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1000 (0 = no cap)"
                      value={formData.maxDiscountAmount}
                      onChange={(e) => setFormData({ ...formData, maxDiscountAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Min Order Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 999 (0 = any amount)"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Limits & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Total Uses Allowed (Limit)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxRedemptions}
                    onChange={(e) => setFormData({ ...formData, maxRedemptions: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valid For (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={formData.validUntilDays}
                    onChange={(e) => setFormData({ ...formData, validUntilDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !formData.code}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {creating ? "Creating..." : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
