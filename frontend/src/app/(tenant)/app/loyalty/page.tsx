"use client";

import { useEffect, useState } from "react";
import {
  Gift,
  Ticket,
  Wallet,
  Settings2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Coins,
  Sparkles,
  Users,
  Percent,
  Tag,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  loyaltyService,
  LoyaltyConfig,
  CustomerLoyaltyAccount,
  PromotionalCoupon,
  CouponValidationResult,
} from "@/services/loyalty-services";

export default function LoyaltyAndPromotionsPage() {
  const [activeTab, setActiveTab] = useState<"wallets" | "coupons" | "config">("wallets");

  // State
  const [accounts, setAccounts] = useState<CustomerLoyaltyAccount[]>([]);
  const [coupons, setCoupons] = useState<PromotionalCoupon[]>([]);
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState("");

  // Store Credit Modal
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedPartyName, setSelectedPartyName] = useState("");
  const [creditAmount, setCreditAmount] = useState<number>(500);
  const [creditNotes, setCreditNotes] = useState("");

  // Create Coupon Modal
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponDesc, setCouponDesc] = useState("");
  const [discountType, setDiscountType] = useState<number>(1); // 1 = Percentage, 2 = FlatAmount
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrder, setMinOrder] = useState<number>(500);
  const [maxDiscount, setMaxDiscount] = useState<number>(200);

  // Live Coupon Tester
  const [testCode, setTestCode] = useState("WELCOME10");
  const [testCartAmount, setTestCartAmount] = useState<number>(1200);
  const [testResult, setTestResult] = useState<CouponValidationResult | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accRes, coupRes, cfgRes] = await Promise.all([
        loyaltyService.getAccounts().catch(() => []),
        loyaltyService.getCoupons().catch(() => []),
        loyaltyService.getConfig().catch(() => null),
      ]);

      setAccounts(accRes || []);
      setCoupons(coupRes || []);
      setConfig(cfgRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddStoreCredit = async () => {
    if (!selectedPartyId || creditAmount <= 0) return;
    try {
      await loyaltyService.addStoreCredit(selectedPartyId, {
        amount: creditAmount,
        notes: creditNotes,
      });
      setIsCreditModalOpen(false);
      setCreditNotes("");
      setNotification(`Successfully added ₹${creditAmount} store credit to ${selectedPartyName}!`);
      loadData();
    } catch {
      alert("Failed to add store credit.");
    }
  };

  const handleCreateCoupon = async () => {
    if (!couponCode.trim() || discountValue <= 0) {
      alert("Please enter a valid coupon code and discount value.");
      return;
    }
    try {
      await loyaltyService.createCoupon({
        code: couponCode,
        description: couponDesc,
        discountType,
        discountValue,
        minimumOrderAmount: minOrder,
        maximumDiscountAmount: discountType === 1 ? maxDiscount : undefined,
      });
      setIsCouponModalOpen(false);
      setCouponCode("");
      setCouponDesc("");
      setNotification(`Coupon code ${couponCode.toUpperCase()} created successfully!`);
      loadData();
    } catch {
      alert("Failed to create coupon. Make sure the code is unique.");
    }
  };

  const handleTestCoupon = async () => {
    if (!testCode.trim() || testCartAmount <= 0) return;
    try {
      const res = await loyaltyService.validateCoupon({
        couponCode: testCode,
        cartTotalAmount: testCartAmount,
      });
      setTestResult(res);
    } catch {
      alert("Validation failed.");
    }
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    try {
      const updated = await loyaltyService.updateConfig(config);
      setConfig(updated);
      setNotification("Loyalty program rules and point earn/redeem settings updated!");
    } catch {
      alert("Failed to update loyalty settings.");
    }
  };

  const filteredAccounts = accounts.filter(
    (a) =>
      a.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.partyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPointsDistributed = accounts.reduce((sum, a) => sum + a.availablePoints, 0);
  const totalStoreCredits = accounts.reduce((sum, a) => sum + a.storeCreditBalance, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Gift className="w-7 h-7 text-amber-400" />
            <span>Customer Loyalty, Store Credits & Promotions Engine</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Reward repeat customers, issue instant store credits for returns, and deploy promotional discount coupons.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {activeTab === "coupons" && (
            <button
              onClick={() => setIsCouponModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon Code</span>
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Reward Members</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {accounts.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Registered customer accounts</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Outstanding Reward Points</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {totalPointsDistributed.toLocaleString("en-IN")} pts
          </div>
          <div className="text-[11px] text-slate-500 mt-1">₹{totalPointsDistributed.toLocaleString("en-IN")} redemption value</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Store Credit Reserves</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            ₹{totalStoreCredits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Advance wallet & return balances</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Coupons</span>
            <Ticket className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
            {coupons.filter((c) => c.isActive).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Campaign promo codes</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("wallets")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === "wallets"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Customer Wallets & Rewards</span>
        </button>
        <button
          onClick={() => setActiveTab("coupons")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === "coupons"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Promotional Coupons</span>
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === "config"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>Program Rules & Rates</span>
        </button>
      </div>

      {/* Tab 1: Customer Wallets & Rewards */}
      {activeTab === "wallets" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer name, code, or referral code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
                <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Customer Details</th>
                    <th className="py-3.5 px-4">Referral Code</th>
                    <th className="py-3.5 px-4 text-right">Reward Points</th>
                    <th className="py-3.5 px-4 text-right">Store Credit Wallet</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        Loading customer loyalty accounts...
                      </td>
                    </tr>
                  ) : filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No customer loyalty records found.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{acc.partyName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {acc.partyCode} {acc.primaryPhone && `• ${acc.primaryPhone}`}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                            {acc.referralCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                          {acc.availablePoints} pts
                          <div className="text-[10px] font-normal text-slate-500">
                            Earned: {acc.totalPointsEarned}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                          ₹{acc.storeCreditBalance.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedPartyId(acc.partyId);
                              setSelectedPartyName(acc.partyName);
                              setIsCreditModalOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 font-semibold text-[11px]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Credit</span>
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

      {/* Tab 2: Promotional Coupons */}
      {activeTab === "coupons" && (
        <div className="space-y-6">
          {/* Live Coupon Sandbox Simulator */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 shadow-xl">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Interactive POS Coupon Validation Sandbox</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Simulate cart checkout with promo codes to verify minimum order thresholds and discount caps.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div>
                <label className="text-slate-300 text-xs block mb-1">Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. WELCOME10"
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-slate-300 text-xs block mb-1">Cart Total Amount (₹)</label>
                <input
                  type="number"
                  value={testCartAmount}
                  onChange={(e) => setTestCartAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleTestCoupon}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/30"
                >
                  Test Validate Coupon
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
                  testResult.isValid
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                }`}
              >
                <div>
                  <div className="font-bold">
                    {testResult.isValid
                      ? `Valid Coupon! Applied ₹${testResult.discountAmount.toFixed(2)} Discount`
                      : `Invalid: ${testResult.errorMessage}`}
                  </div>
                  {testResult.isValid && (
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      Original: ₹{testCartAmount} ➔ Final Payable: ₹{testResult.finalCartAmount.toFixed(2)}
                    </div>
                  )}
                </div>
                {testResult.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
              </div>
            )}
          </div>

          {/* Coupons Table */}
          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
                <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Coupon Code & Description</th>
                    <th className="py-3.5 px-4">Discount Value</th>
                    <th className="py-3.5 px-4 text-right">Min Order</th>
                    <th className="py-3.5 px-4 text-right">Max Cap</th>
                    <th className="py-3.5 px-4 text-center">Usage Count</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-amber-400">{c.code}</div>
                        <div className="text-[10px] text-slate-500 font-sans">{c.description || "Promotional code"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white">
                          {c.discountType === 1 ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT OFF`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {c.minimumOrderAmount > 0 ? `₹${c.minimumOrderAmount}` : "None"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {c.maximumDiscountAmount ? `₹${c.maximumDiscountAmount}` : "No Limit"}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {c.currentUsageCount} / {c.totalUsageLimit}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            c.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Program Configuration */}
      {activeTab === "config" && config && (
        <form onSubmit={handleUpdateConfig} className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-6 max-w-2xl">
          <h3 className="font-bold text-base text-white flex items-center space-x-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <span>Loyalty Point Accrual & Redemption Parameters</span>
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-300 block mb-1">Points Earn Ratio (₹ Spend)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={config.pointsEarnSpendAmount}
                  onChange={(e) => setConfig({ ...config, pointsEarnSpendAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-500">e.g. Spend ₹100</span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Points Earned per Step</label>
              <input
                type="number"
                value={config.pointsEarnedPerUnit}
                onChange={(e) => setConfig({ ...config, pointsEarnedPerUnit: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
              />
              <span className="text-[10px] text-slate-500">e.g. 1 Point per ₹100</span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Point Redemption Value (₹ per Point)</label>
              <input
                type="number"
                step="0.1"
                value={config.pointRedemptionValue}
                onChange={(e) => setConfig({ ...config, pointRedemptionValue: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
              />
              <span className="text-[10px] text-slate-500">e.g. 1 Pt = ₹1 Discount</span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Max % of Invoice Payable via Points</label>
              <input
                type="number"
                value={config.maxRedeemPercentPerBill}
                onChange={(e) => setConfig({ ...config, maxRedeemPercentPerBill: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
              />
              <span className="text-[10px] text-slate-500">e.g. Max 50% discount</span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Welcome Signup Bonus (Points)</label>
              <input
                type="number"
                value={config.signupBonusPoints}
                onChange={(e) => setConfig({ ...config, signupBonusPoints: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Referral Bonus (Referrer / Referee)</label>
              <input
                type="number"
                value={config.referrerBonusPoints}
                onChange={(e) => setConfig({ ...config, referrerBonusPoints: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
            <input
              type="checkbox"
              id="isActive"
              checked={config.isActive}
              onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-slate-900 border-slate-700"
            />
            <label htmlFor="isActive" className="text-xs text-slate-300 font-semibold cursor-pointer">
              Enable Customer Loyalty Point Accrual & Checkout Redemptions
            </label>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/30"
          >
            Save Loyalty Program Rules
          </button>
        </form>
      )}

      {/* Add Store Credit Modal */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Issue Store Credit to {selectedPartyName}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Store Credit Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Deposit Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Returned item refund / Pre-paid advance wallet"
                  value={creditNotes}
                  onChange={(e) => setCreditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setIsCreditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStoreCredit}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30"
              >
                Issue ₹{creditAmount} Store Credit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Tag className="w-4 h-4 text-amber-400" />
              <span>Create New Promotional Coupon Code</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    placeholder="e.g. DIWALI20"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  >
                    <option value={1}>Percentage (%) Discount</option>
                    <option value={2}>Flat Amount (₹) Off</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Campaign Description</label>
                <input
                  type="text"
                  placeholder="e.g. 20% off for festive shoppers"
                  value={couponDesc}
                  onChange={(e) => setCouponDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">
                    {discountType === 1 ? "Discount %" : "Discount Amount (₹)"}
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    value={minOrder}
                    onChange={(e) => setMinOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCoupon}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30"
              >
                Create Coupon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
