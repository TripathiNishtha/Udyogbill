"use client";

import { useEffect, useState } from "react";
import { 
  referralService, 
  SuperAdminReferralAnalyticsDto, 
  ReferralProgramConfigDto,
  SuperAdminReferralConversionDto
} from "@/services/referral-services";
import { 
  Gift, 
  Users, 
  CheckCircle2, 
  IndianRupee, 
  Clock, 
  Sliders, 
  Send, 
  Loader2, 
  Check, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Search,
  Building,
  RefreshCw
} from "lucide-react";

export default function SuperAdminReferralsPage() {
  const [analytics, setAnalytics] = useState<SuperAdminReferralAnalyticsDto | null>(null);
  const [config, setConfig] = useState<ReferralProgramConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Payout Modal State
  const [selectedConversion, setSelectedConversion] = useState<SuperAdminReferralConversionDto | null>(null);
  const [payoutForm, setPayoutForm] = useState({
    payoutMode: "UPI",
    payoutReference: "",
    adminNotes: "",
  });
  const [processingPayout, setProcessingPayout] = useState(false);

  // Config Form State
  const [configForm, setConfigForm] = useState({
    isEnabled: true,
    rewardType: 1, // 1 = FixedAmount, 2 = Percentage
    defaultRewardAmount: 500,
    payoutScheduleDays: 1,
    minimumPayoutThreshold: 500,
    termsAndConditions: "",
  });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [analyticsData, configData] = await Promise.all([
        referralService.getAdminAnalytics(),
        referralService.getAdminConfig(),
      ]);
      setAnalytics(analyticsData);
      setConfig(configData);
      setConfigForm({
        isEnabled: configData.isEnabled,
        rewardType: configData.rewardType,
        defaultRewardAmount: configData.defaultRewardAmount,
        payoutScheduleDays: configData.payoutScheduleDays,
        minimumPayoutThreshold: configData.minimumPayoutThreshold,
        termsAndConditions: configData.termsAndConditions || "",
      });
    } catch (err: any) {
      console.error("Failed to load admin referrals data:", err);
      setFeedback({ type: "error", message: "Failed to load referral administration records." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      setFeedback(null);
      const updated = await referralService.updateAdminConfig(configForm);
      setConfig(updated);
      setFeedback({ type: "success", message: "Referral program reward settings updated successfully!" });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.response?.data?.message || "Failed to update referral configuration." });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleOpenPayoutModal = (c: SuperAdminReferralConversionDto) => {
    setSelectedConversion(c);
    setPayoutForm({
      payoutMode: c.referrerUpi ? "UPI" : "Bank Transfer",
      payoutReference: `UTR-${Date.now().toString().slice(-8)}`,
      adminNotes: `Disbursed for ${c.refereeStoreName} subscription`,
    });
  };

  const handleExecutePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversion) return;
    try {
      setProcessingPayout(true);
      setFeedback(null);
      await referralService.processPayout(selectedConversion.id, payoutForm);
      setFeedback({ type: "success", message: `₹${selectedConversion.commissionRewardAmount} payout recorded successfully!` });
      setSelectedConversion(null);
      await loadAll();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.response?.data?.message || "Failed to process payout." });
    } finally {
      setProcessingPayout(false);
    }
  };

  const filteredConversions = (analytics?.conversions || []).filter((c) => {
    const matchesSearch =
      c.referrerStoreName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.refereeStoreName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.referralCodeUsed.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "due") return c.status === 2 || c.status === 3; // ConvertedPaid or PayoutDue
    if (statusFilter === "paid") return c.status === 4;
    if (statusFilter === "trial") return c.status === 1;

    return true;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Gift className="w-4 h-4" /> Affiliate & Referral Management
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Tenant Referral Network & Payouts</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure partner rewards, view who referred whom, track paid subscription conversions, and disburse payouts.
          </p>
        </div>

        <button
          onClick={loadAll}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Signups</span>
          <div className="mt-2 text-2xl font-bold text-white">{analytics?.totalReferralsRegistered || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Referred registrations</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid Subscribers</span>
          <div className="mt-2 text-2xl font-bold text-emerald-400">{analytics?.totalPaidConversions || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Converted to paid plans</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Commission</span>
          <div className="mt-2 text-2xl font-bold text-white">₹{(analytics?.totalCommissionsAccrued || 0).toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total reward accrued</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Disbursed</span>
          <div className="mt-2 text-2xl font-bold text-indigo-400">₹{(analytics?.totalCommissionsPaidOut || 0).toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-slate-500 mt-1">Paid to referrers</div>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 bg-amber-500/5 rounded-xl p-5">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pending Payouts</span>
          <div className="mt-2 text-2xl font-bold text-amber-400">₹{(analytics?.pendingPayoutsAmount || 0).toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-amber-300/80 mt-1">Due for next-day release</div>
        </div>
      </div>

      {/* Program Configuration Panel (SuperAdmin Edit & Fix Amount) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">Global Referral Reward Rules & Pricing</h2>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Set the referral reward amount that referrers earn when their invited business purchases a subscription.
        </p>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Program Status
            </label>
            <select
              value={configForm.isEnabled ? "true" : "false"}
              onChange={(e) => setConfigForm({ ...configForm, isEnabled: e.target.value === "true" })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="true">Active & Rewarding</option>
              <option value="false">Paused / Disabled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Reward Type
            </label>
            <select
              value={configForm.rewardType}
              onChange={(e) => setConfigForm({ ...configForm, rewardType: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value={1}>Fixed Amount (₹ INR)</option>
              <option value={2}>Percentage of Order (%)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Default Reward ({configForm.rewardType === 1 ? "₹ Flat" : "% Cut"})
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                required
                value={configForm.defaultRewardAmount}
                onChange={(e) => setConfigForm({ ...configForm, defaultRewardAmount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 font-bold">
                {configForm.rewardType === 1 ? "₹ INR" : "%"}
              </span>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={savingConfig}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Save Referral Pricing</span>
            </button>
          </div>
        </form>
      </div>

      {/* Top Referrers Leaderboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1">Top Referrers & Store Earnings</h2>
        <p className="text-xs text-slate-400 mb-4">List of active store owners promoting UdyogBill</p>

        {!analytics?.topReferrers || analytics.topReferrers.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">No registered referrers found yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Referrer Store</th>
                  <th className="py-3 px-3">Referral Code</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Payout Destination</th>
                  <th className="py-3 px-3 text-center">Invited</th>
                  <th className="py-3 px-3 text-center">Paid</th>
                  <th className="py-3 px-3 text-right">Earned</th>
                  <th className="py-3 px-3 text-right">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analytics.topReferrers.map((r) => (
                  <tr key={r.tenantId} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-white">
                      <div>{r.storeName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{r.storeCode}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-indigo-300">{r.referralCode}</td>
                    <td className="py-3 px-3 text-slate-400">
                      <div>{r.adminEmail}</div>
                      <div className="text-[11px] text-slate-500">{r.primaryPhone}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {r.upiId ? (
                        <span className="text-emerald-400 font-semibold">{r.upiId}</span>
                      ) : r.bankAccountNumber ? (
                        <span className="text-slate-300">A/C: {r.bankAccountNumber} ({r.bankIfsc})</span>
                      ) : (
                        <span className="text-slate-600 italic">Not configured</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-white">{r.totalReferrals}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">{r.paidConversions}</td>
                    <td className="py-3 px-3 text-right font-semibold text-white">₹{r.totalEarned.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 text-right font-bold text-amber-400">
                      {r.pendingBalance > 0 ? `₹${r.pendingBalance.toLocaleString("en-IN")}` : "₹0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Referral Conversions & Payout Action Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Referral Conversions & Payout Processing</h2>
            <p className="text-xs text-slate-400 mt-0.5">Approve, disburse, and enter UTR / Payment references for next-day payouts</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search referrer, referee, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="due">Due for Payout</option>
              <option value="paid">Completed Payouts</option>
              <option value="trial">Free Trial</option>
            </select>
          </div>
        </div>

        {filteredConversions.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
            No referral conversion records match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Referrer Partner</th>
                  <th className="py-3 px-3">Referred New Store</th>
                  <th className="py-3 px-3">Registration</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Plan Price</th>
                  <th className="py-3 px-3">Reward</th>
                  <th className="py-3 px-3">Scheduled Date</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredConversions.map((item) => {
                  const isPaid = item.status === 4;
                  const isDue = item.status === 2 || item.status === 3;

                  return (
                    <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{item.referrerStoreName}</div>
                        <div className="text-[11px] text-indigo-400 font-mono">Code: {item.referralCodeUsed}</div>
                        {item.referrerUpi && (
                          <div className="text-[10px] text-emerald-400 font-mono">UPI: {item.referrerUpi}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-white">
                        <div>{item.refereeStoreName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.refereeStoreCode}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(item.registrationDateUtc).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-3">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Paid Out
                          </span>
                        ) : isDue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-semibold">
                            <Clock className="w-3 h-3" /> Payout Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[11px] font-medium">
                            Free Trial
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-white">
                        {item.subscriptionAmount && item.subscriptionAmount > 0 ? `₹${item.subscriptionAmount}` : "-"}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400 text-sm">
                        {item.commissionRewardAmount > 0 ? `₹${item.commissionRewardAmount}` : "-"}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {item.scheduledPayoutDateUtc ? (
                          <div>
                            <div className="text-amber-400 font-medium">
                              {new Date(item.scheduledPayoutDateUtc).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            {item.paidAtUtc && (
                              <div className="text-[10px] text-slate-500 font-mono">Ref: {item.payoutReference}</div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isDue ? (
                          <button
                            onClick={() => handleOpenPayoutModal(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                          >
                            <Send className="w-3 h-3" /> Process Payout
                          </button>
                        ) : isPaid ? (
                          <span className="text-[11px] font-mono text-emerald-400/80">UTR: {item.payoutReference}</span>
                        ) : (
                          <span className="text-[11px] text-slate-600">Awaiting Upgrade</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Processing Modal */}
      {selectedConversion && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-5 h-5" /> Mark Referral Payout as Disbursed
              </div>
              <button
                onClick={() => setSelectedConversion(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Referrer Store:</span>
                <span className="text-white font-medium">{selectedConversion.referrerStoreName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Referred Store:</span>
                <span className="text-white font-medium">{selectedConversion.refereeStoreName}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-800">
                <span className="text-slate-300">Reward Commission:</span>
                <span className="text-emerald-400">₹{selectedConversion.commissionRewardAmount}</span>
              </div>
              <div className="pt-1 text-[11px]">
                <span className="text-slate-400">Beneficiary UPI: </span>
                <span className="font-mono text-indigo-300">{selectedConversion.referrerUpi || "Not set"}</span>
              </div>
              {selectedConversion.referrerBank && (
                <div className="text-[11px]">
                  <span className="text-slate-400">Bank Details: </span>
                  <span className="text-slate-300">{selectedConversion.referrerBank}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleExecutePayout} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Payout Channel / Mode
                </label>
                <select
                  value={payoutForm.payoutMode}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payoutMode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="UPI">UPI Transfer (Google Pay / PhonePe / Paytm)</option>
                  <option value="IMPS">IMPS / NEFT Bank Transfer</option>
                  <option value="Wallet">Account Credit / Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  UTR / Transaction Reference (Mandatory)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-402910481029"
                  value={payoutForm.payoutReference}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payoutReference: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Admin Internal Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via HDFC Corporate Netbanking"
                  value={payoutForm.adminNotes}
                  onChange={(e) => setPayoutForm({ ...payoutForm, adminNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedConversion(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayout}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  {processingPayout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Confirm Payout</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
