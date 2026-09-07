"use client";

import { useEffect, useState } from "react";
import { 
  referralService, 
  TenantReferralSummaryDto, 
  UpdateReferralPayoutSettingsRequest 
} from "@/services/referral-services";
import { 
  Gift, 
  Copy, 
  Check, 
  Share2, 
  Users, 
  CheckCircle2, 
  IndianRupee, 
  Clock, 
  AlertCircle, 
  Building, 
  CreditCard, 
  Loader2,
  ExternalLink,
  ShieldAlert
} from "lucide-react";

export default function TenantReferralsPage() {
  const [summary, setSummary] = useState<TenantReferralSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [payoutForm, setPayoutForm] = useState<UpdateReferralPayoutSettingsRequest>({
    upiId: "",
    bankName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    accountHolderName: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await referralService.getTenantSummary();
      setSummary(data);
      setPayoutForm({
        upiId: data.upiId || "",
        bankName: data.bankName || "",
        bankAccountNumber: data.bankAccountNumber || "",
        bankIfsc: data.bankIfsc || "",
        accountHolderName: data.accountHolderName || "",
      });
    } catch (err: any) {
      console.error("Failed to load referral summary:", err);
      setFeedback({ type: "error", message: "Failed to load your referral program details." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyLink = () => {
    if (!summary?.referralLink) return;
    navigator.clipboard.writeText(summary.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!summary?.referralLink) return;
    const text = encodeURIComponent(
      `Hey! I use UdyogBill for smart billing, inventory, and GST compliance. Register your business store with my referral link and start your 14-day free trial:\n\n${summary.referralLink}\n\nReferral Code: ${summary.referralCode}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleSavePayoutSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      setFeedback(null);
      await referralService.updatePayoutSettings(payoutForm);
      setFeedback({ type: "success", message: "Payout payment details saved successfully!" });
      loadData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.response?.data?.message || "Failed to update payout settings." });
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 md:p-8 text-white border border-indigo-700/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Gift className="w-4 h-4" /> UdyogBill Partner & Referral Program
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Refer Fellow Businesses & Earn ₹{summary?.rewardAmount || 500}
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Share your exclusive permanent referral link with other business owners. When they register and purchase any paid subscription or add-on, your commission reward is automatically credited with next-day direct payout to your UPI/Bank.
          </p>

          {/* Referral Link Action Bar */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm font-mono text-indigo-200 select-all overflow-x-auto">
              <span className="truncate">{summary?.referralLink}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium rounded-xl text-sm transition-all shadow-md shadow-indigo-600/30"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy Link"}</span>
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-medium rounded-xl text-sm transition-all shadow-md shadow-emerald-600/30"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Referred</span>
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">{summary?.totalReferralsCount || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Stores registered via your link</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid Conversions</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-400">{summary?.paidConversionsCount || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Converted to paid plans</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Earned</span>
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <IndianRupee className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">₹{(summary?.totalEarnedAmount || 0).toLocaleString("en-IN")}</div>
          <div className="text-xs text-slate-400 mt-1">Accumulated referral rewards</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Payout</span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-400">₹{(summary?.pendingBalanceAmount || 0).toLocaleString("en-IN")}</div>
          <div className="text-xs text-slate-400 mt-1">Scheduled for next-day disbursement</div>
        </div>
      </div>

      {/* Two Column Layout: Payout Bank Settings & Referral Activity Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payout Details Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Direct Payout Account</h3>
          </div>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Enter your UPI ID or Indian Bank account details. When your referred friends upgrade to paid, the admin transfers your payout directly to this account the next business day.
          </p>

          <form onSubmit={handleSavePayoutSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                UPI ID (Recommended)
              </label>
              <input
                type="text"
                placeholder="yourname@okhdfcbank / yourname@paytm"
                value={payoutForm.upiId || ""}
                onChange={(e) => setPayoutForm({ ...payoutForm, upiId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                Or Direct Bank Transfer (NEFT/IMPS)
              </span>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Account Holder Legal Name</label>
                  <input
                    type="text"
                    placeholder="Full name as in passbook"
                    value={payoutForm.accountHolderName || ""}
                    onChange={(e) => setPayoutForm({ ...payoutForm, accountHolderName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India, HDFC"
                    value={payoutForm.bankName || ""}
                    onChange={(e) => setPayoutForm({ ...payoutForm, bankName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={payoutForm.bankAccountNumber || ""}
                    onChange={(e) => setPayoutForm({ ...payoutForm, bankAccountNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white placeholder-slate-600 text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="SBIN0001234"
                    value={payoutForm.bankIfsc || ""}
                    onChange={(e) => setPayoutForm({ ...payoutForm, bankIfsc: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white placeholder-slate-600 text-sm font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Payout Details</span>}
            </button>
          </form>
        </div>

        {/* Referral Conversions Ledger */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Your Referral Network</h3>
              <p className="text-xs text-slate-400 mt-0.5">Track signups and commission payout status in real time</p>
            </div>
            <span className="text-xs font-mono bg-slate-800 text-indigo-300 px-3 py-1 rounded-full border border-slate-700">
              Code: {summary?.referralCode}
            </span>
          </div>

          {!summary?.referrals || summary.referrals.length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed border-slate-800 rounded-xl">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-slate-300">No Referrals Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Share your referral link on WhatsApp or with fellow retail and wholesale business owners to start earning ₹{summary?.rewardAmount || 500} per subscriber!
              </p>
              <button
                onClick={handleCopyLink}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-medium transition-all"
              >
                <Copy className="w-3.5 h-3.5" /> Copy My Referral Link
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Referred Business</th>
                    <th className="py-3 px-3">Signed Up</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Reward</th>
                    <th className="py-3 px-3">Payout Schedule / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {summary.referrals.map((item) => {
                    const isPaid = item.status === "Paid";
                    const isConverted = item.status === "ConvertedPaid" || item.status === "PayoutDue";

                    return (
                      <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Paid Out
                            </span>
                          ) : isConverted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-medium">
                              <Clock className="w-3 h-3" /> Next-Day Scheduled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[11px] font-medium">
                              Free Trial
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">
                          {item.commissionAmount > 0 ? (
                            <span className="text-emerald-400">₹{item.commissionAmount}</span>
                          ) : (
                            <span className="text-slate-500">Pending plan upgrade</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {isPaid ? (
                            <div>
                              <div className="text-white font-mono text-[11px]">UTR: {item.payoutReference || "DIRECT-UPI"}</div>
                              <div className="text-[10px] text-slate-500">
                                {item.paidAtUtc ? new Date(item.paidAtUtc).toLocaleDateString("en-IN") : "Completed"}
                              </div>
                            </div>
                          ) : item.scheduledPayoutDateUtc ? (
                            <div>
                              <div className="text-amber-400 font-medium">
                                Scheduled: {new Date(item.scheduledPayoutDateUtc).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                              <div className="text-[10px] text-slate-500">Direct credit next business day</div>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
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
      </div>
    </div>
  );
}
