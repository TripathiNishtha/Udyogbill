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
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border-2 border-orange-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 border border-orange-300 text-orange-900 text-xs font-bold uppercase tracking-wider mb-2">
            <Gift className="w-4 h-4 text-orange-600" /> Affiliate &amp; Referral Management
          </div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Tenant Referral Network &amp; Payouts</h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Configure partner rewards, view who referred whom, track paid subscription conversions, and disburse payouts.
          </p>
        </div>

        <button
          onClick={loadAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 shadow-2xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-300 text-emerald-800"
              : "bg-rose-50 border border-rose-300 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border-2 border-slate-200 hover:border-orange-300 rounded-2xl p-5 shadow-sm transition-all">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Signups</span>
          <div className="mt-2 text-3xl font-black text-slate-950">{analytics?.totalReferralsRegistered || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Referred registrations</div>
        </div>

        <div className="bg-white border-2 border-emerald-200/90 rounded-2xl p-5 shadow-sm transition-all">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Paid Subscribers</span>
          <div className="mt-2 text-3xl font-black text-emerald-600">{analytics?.totalPaidConversions || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Converted to paid plans</div>
        </div>

        <div className="bg-white border-2 border-slate-200 hover:border-orange-300 rounded-2xl p-5 shadow-sm transition-all">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Commission</span>
          <div className="mt-2 text-3xl font-black text-slate-950">₹{(analytics?.totalCommissionsAccrued || 0).toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Total reward accrued</div>
        </div>

        <div className="bg-white border-2 border-orange-200 rounded-2xl p-5 shadow-sm transition-all">
          <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Total Disbursed</span>
          <div className="mt-2 text-3xl font-black text-orange-600">₹{(analytics?.totalCommissionsPaidOut || 0).toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Paid to referrers</div>
        </div>

        <div className="bg-amber-50/60 border-2 border-amber-300 rounded-2xl p-5 shadow-sm transition-all">
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Pending Payouts</span>
          <div className="mt-2 text-3xl font-black text-amber-600">₹{(analytics?.pendingPayoutsAmount || 0).toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-amber-700 mt-1 font-semibold">Due for next-day release</div>
        </div>
      </div>

      {/* Program Configuration Panel */}
      <div className="bg-white border-2 border-orange-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-black text-slate-950">Global Referral Reward Rules &amp; Pricing</h2>
        </div>
        <p className="text-xs text-slate-600 mb-6 font-medium">
          Set the referral reward amount that referrers earn when their invited business purchases a subscription.
        </p>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Program Status
            </label>
            <select
              value={configForm.isEnabled ? "true" : "false"}
              onChange={(e) => setConfigForm({ ...configForm, isEnabled: e.target.value === "true" })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="true">Active &amp; Rewarding</option>
              <option value="false">Paused / Disabled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Reward Type
            </label>
            <select
              value={configForm.rewardType}
              onChange={(e) => setConfigForm({ ...configForm, rewardType: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
            >
              <option value={1}>Fixed Amount (₹ INR)</option>
              <option value={2}>Percentage of Order (%)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-black focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
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
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Save Referral Pricing</span>
            </button>
          </div>
        </form>
      </div>

      {/* Top Referrers Leaderboard */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-950 mb-1">Top Referrers &amp; Store Earnings</h2>
        <p className="text-xs text-slate-600 mb-4 font-medium">List of active store owners promoting UdyogBill</p>

        {!analytics?.topReferrers || analytics.topReferrers.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs font-medium">No registered referrers found yet.</div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-800 uppercase tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-3.5">Referrer Store</th>
                  <th className="py-3 px-3.5">Referral Code</th>
                  <th className="py-3 px-3.5">Contact</th>
                  <th className="py-3 px-3.5">Payout Destination</th>
                  <th className="py-3 px-3.5 text-center">Invited</th>
                  <th className="py-3 px-3.5 text-center">Paid</th>
                  <th className="py-3 px-3.5 text-right">Earned</th>
                  <th className="py-3 px-3.5 text-right">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.topReferrers.map((r) => (
                  <tr key={r.tenantId} className="hover:bg-orange-50/40 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      <div>{r.storeName}</div>
                      <div className="text-[11px] text-slate-500 font-mono font-normal">{r.storeCode}</div>
                    </td>
                    <td className="py-3 px-3.5 font-mono font-black text-orange-600">{r.referralCode}</td>
                    <td className="py-3 px-3.5 text-slate-600 font-medium">
                      <div>{r.adminEmail}</div>
                      <div className="text-[11px] text-slate-500">{r.primaryPhone}</div>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px]">
                      {r.upiId ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{r.upiId}</span>
                      ) : r.bankAccountNumber ? (
                        <span className="text-slate-800 font-semibold">A/C: {r.bankAccountNumber} ({r.bankIfsc})</span>
                      ) : (
                        <span className="text-slate-400 italic">Not configured</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-slate-900">{r.totalReferrals}</td>
                    <td className="py-3 px-3.5 text-center font-bold text-emerald-700">{r.paidConversions}</td>
                    <td className="py-3 px-3.5 text-right font-black text-slate-900">₹{r.totalEarned.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3.5 text-right font-black text-amber-600">
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
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Referral Conversions &amp; Payout Processing</h2>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">Approve, disburse, and enter UTR / Payment references for next-day payouts</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search referrer, referee, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Statuses</option>
              <option value="due">Due for Payout</option>
              <option value="paid">Completed Payouts</option>
              <option value="trial">Free Trial</option>
            </select>
          </div>
        </div>

        {filteredConversions.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-300 rounded-xl font-medium">
            No referral conversion records match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-800 uppercase tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-3.5">Referrer Partner</th>
                  <th className="py-3 px-3.5">Referred New Store</th>
                  <th className="py-3 px-3.5">Registration</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Plan Price</th>
                  <th className="py-3 px-3.5">Reward</th>
                  <th className="py-3 px-3.5">Scheduled Date</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConversions.map((item) => {
                  const isPaid = item.status === 4;
                  const isDue = item.status === 2 || item.status === 3;

                  return (
                    <tr key={item.id} className="hover:bg-orange-50/40 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">{item.referrerStoreName}</div>
                        <div className="text-[11px] text-orange-600 font-mono font-semibold">Code: {item.referralCodeUsed}</div>
                        {item.referrerUpi && (
                          <div className="text-[10px] text-emerald-700 font-mono font-medium">UPI: {item.referrerUpi}</div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">
                        <div>{item.refereeStoreName}</div>
                        <div className="text-[11px] text-slate-500 font-mono font-normal">{item.refereeStoreCode}</div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 font-medium">
                        {new Date(item.registrationDateUtc).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-3.5">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid Out
                          </span>
                        ) : isDue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" /> Payout Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-medium">
                            Free Trial
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">
                        {item.subscriptionAmount && item.subscriptionAmount > 0 ? `₹${item.subscriptionAmount}` : "-"}
                      </td>
                      <td className="py-3 px-3.5 font-black text-emerald-700 text-sm">
                        {item.commissionRewardAmount > 0 ? `₹${item.commissionRewardAmount}` : "-"}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 font-medium">
                        {item.scheduledPayoutDateUtc ? (
                          <div>
                            <div className="text-amber-700 font-bold">
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
                      <td className="py-3 px-3.5 text-right">
                        {isDue ? (
                          <button
                            onClick={() => handleOpenPayoutModal(item)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                          >
                            <Send className="w-3 h-3" /> Process Payout
                          </button>
                        ) : isPaid ? (
                          <span className="text-[11px] font-mono text-emerald-700 font-bold">UTR: {item.payoutReference}</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Awaiting Upgrade</span>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-orange-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-700 font-black">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Mark Referral Payout as Disbursed
              </div>
              <button
                onClick={() => setSelectedConversion(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-orange-50/50 rounded-2xl border border-orange-200/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Referrer Store:</span>
                <span className="text-slate-950 font-bold">{selectedConversion.referrerStoreName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Referred Store:</span>
                <span className="text-slate-950 font-bold">{selectedConversion.refereeStoreName}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-2 border-t border-orange-200/60">
                <span className="text-slate-700">Reward Commission:</span>
                <span className="text-emerald-700">₹{selectedConversion.commissionRewardAmount}</span>
              </div>
              <div className="pt-1 text-[11px]">
                <span className="text-slate-600">Beneficiary UPI: </span>
                <span className="font-mono text-orange-600 font-bold">{selectedConversion.referrerUpi || "Not set"}</span>
              </div>
              {selectedConversion.referrerBank && (
                <div className="text-[11px]">
                  <span className="text-slate-600">Bank Details: </span>
                  <span className="text-slate-800 font-medium">{selectedConversion.referrerBank}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleExecutePayout} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Payout Channel / Mode
                </label>
                <select
                  value={payoutForm.payoutMode}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payoutMode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:border-orange-500"
                >
                  <option value="UPI">UPI Transfer (Google Pay / PhonePe / Paytm)</option>
                  <option value="IMPS">IMPS / NEFT Bank Transfer</option>
                  <option value="Wallet">Account Credit / Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  UTR / Transaction Reference (Mandatory)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-402910481029"
                  value={payoutForm.payoutReference}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payoutReference: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Admin Internal Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via Corporate Netbanking"
                  value={payoutForm.adminNotes}
                  onChange={(e) => setPayoutForm({ ...payoutForm, adminNotes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedConversion(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayout}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
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
