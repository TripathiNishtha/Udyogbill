"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  FileText,
  Calendar,
  User,
  ShieldCheck,
  Printer,
  ExternalLink,
  Ban,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { accountingService, JournalVoucher } from "@/services/accounting-services";

interface VoucherSlideOverDrawerProps {
  voucherId: string | null;
  onClose: () => void;
  onVoucherCancelled?: () => void;
  onSelectAccount?: (accountId: string) => void;
}

export default function VoucherSlideOverDrawer({
  voucherId,
  onClose,
  onVoucherCancelled,
  onSelectAccount
}: VoucherSlideOverDrawerProps) {
  const [voucher, setVoucher] = useState<JournalVoucher | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cancellation State
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!voucherId) {
      setVoucher(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setShowCancelPrompt(false);
    setCancelReason("");

    accountingService
      .getVoucherById(voucherId)
      .then((data) => {
        if (isMounted) setVoucher(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.response?.data?.error || "Failed to load voucher details.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [voucherId, onClose]);

  if (!voucherId) return null;

  const handleExecuteCancel = async () => {
    if (!voucher) return;
    if (!cancelReason.trim()) {
      alert("Please provide a reason for cancelling this voucher.");
      return;
    }

    try {
      setCancelling(true);
      await accountingService.cancelVoucher(voucher.id, cancelReason.trim());
      setShowCancelPrompt(false);
      // Reload voucher details
      const updated = await accountingService.getVoucherById(voucher.id);
      setVoucher(updated);
      onVoucherCancelled?.();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to cancel voucher.");
    } finally {
      setCancelling(false);
    }
  };

  const getVoucherTypeBadge = (type: string) => {
    switch (type.toUpperCase()) {
      case "CONTRA":
        return "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800";
      case "PAYMENT":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "RECEIPT":
        return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "SALES":
        return "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "PURCHASE":
        return "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "CREDITNOTE":
      case "CREDIT_NOTE":
        return "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800";
      case "DEBITNOTE":
      case "DEBIT_NOTE":
        return "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800";
      default:
        return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-950/60 text-orange-600 rounded-xl border border-orange-200 dark:border-orange-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {voucher?.voucherNumber || "Voucher Audit"}
                </h2>
                {voucher && (
                  <span
                    className={`px-2.5 py-0.5 text-[11px] font-black uppercase rounded-md border tracking-wider ${getVoucherTypeBadge(
                      voucher.voucherType
                    )}`}
                  >
                    {voucher.voucherType}
                  </span>
                )}
                {voucher?.isCancelled && (
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-rose-100 text-rose-700 border border-rose-300">
                    CANCELLED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Double-Entry Audit & Ledger Linking
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => window.print()}
              title="Print Voucher"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <p className="text-xs text-slate-500 font-medium">Fetching voucher audit trail...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : voucher ? (
            <>
              {/* Cancellation Banner */}
              {voucher.isCancelled && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                    <Ban className="w-4 h-4" />
                    <span>Voucher Cancelled by {voucher.cancelledByName || "Accountant"}</span>
                  </div>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">
                    Reason: <em>&ldquo;{voucher.cancelledReason || "No reason specified"}&rdquo;</em>
                  </p>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Voucher Date</span>
                  <div className="flex items-center space-x-1 font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(voucher.voucherDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Reference No.</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                    {voucher.referenceNumber || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Created By</span>
                  <div className="flex items-center space-x-1 font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{voucher.createdByName || "System"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Audit Status</span>
                  <div className="flex items-center space-x-1 font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>MCA Compliant</span>
                  </div>
                </div>
              </div>

              {/* 360° Source Document Link */}
              {voucher.referenceNumber && (
                <div className="p-3.5 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-2xl flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[11px] font-bold text-orange-900 dark:text-orange-300 block">
                      Linked Source Transaction
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      Ref: <strong className="font-mono text-slate-900 dark:text-slate-100">{voucher.referenceNumber}</strong>
                    </span>
                  </div>

                  <Link
                    href={`/app/sales?search=${encodeURIComponent(voucher.referenceNumber)}`}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs transition"
                  >
                    <span>View Bill</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* Narration */}
              {voucher.narration && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Narration</span>
                  <p className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 italic leading-relaxed">
                    &ldquo;{voucher.narration}&rdquo;
                  </p>
                </div>
              )}

              {/* Double-Entry Legs Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Double-Entry Legs ({voucher.legs.length})
                  </span>
                  <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-500">
                    <span>Balance Check:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Dr = Cr Balanced</span>
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">General Ledger Account</th>
                        <th className="py-2.5 px-3">Particulars / Ref</th>
                        <th className="py-2.5 px-3 text-right">Debit (Dr)</th>
                        <th className="py-2.5 px-3 text-right">Credit (Cr)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {voucher.legs.map((leg, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => {
                                onSelectAccount?.(leg.accountId);
                                onClose();
                              }}
                              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer text-left"
                            >
                              <span>{leg.accountName}</span>
                              <ArrowRight className="w-3 h-3 opacity-60" />
                            </button>
                            <span className="text-[10px] font-mono text-slate-400 block">{leg.accountCode}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {leg.narration || leg.billRefNumber ? (
                              <div>
                                {leg.billRefNumber && (
                                  <span className="font-mono text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-800 inline-block mb-0.5">
                                    {leg.billRefType || "Ref"}: {leg.billRefNumber}
                                  </span>
                                )}
                                <span className="block truncate max-w-[180px]">{leg.narration}</span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {leg.debitAmount > 0 ? `₹${Number(leg.debitAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {leg.creditAmount > 0 ? `₹${Number(leg.creditAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-slate-950/70 border-t-2 border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white">
                        <td colSpan={2} className="py-2.5 px-3 uppercase text-[11px] font-sans font-black">
                          Total
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                          ₹{Number(voucher.totalDebit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                          ₹{Number(voucher.totalCredit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* MCA Audit Stamp */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center space-x-2 text-[11px] text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Recorded on {new Date(voucher.createdAt).toLocaleString("en-IN")} • Edit Log Tamper-Proof Audit
                  Trail Active
                </span>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        {voucher && !voucher.isCancelled && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col space-y-3">
            {showCancelPrompt ? (
              <div className="space-y-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
                <label className="text-xs font-bold text-rose-800 dark:text-rose-300 block">
                  Reason for Voucher Cancellation (Required for MCA Audit Trail):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wrong party selected, double posted, etc."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-rose-300 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowCancelPrompt(false)}
                    disabled={cancelling}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Keep Voucher
                  </button>
                  <button
                    onClick={handleExecuteCancel}
                    disabled={cancelling || !cancelReason.trim()}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {cancelling ? "Reversing..." : "Confirm Cancellation"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowCancelPrompt(true)}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-bold transition cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Voucher</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  Close (Esc)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
