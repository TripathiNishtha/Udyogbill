"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Scale,
  Plus,
  ArrowLeft,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  Trash2
} from "lucide-react";
import {
  accountingService,
  JournalVoucher,
  LedgerAccount,
  JournalVoucherLeg
} from "@/services/accounting-services";

export default function JournalVouchersPage() {
  const [vouchers, setVouchers] = useState<JournalVoucher[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<JournalVoucher["voucherType"]>("Journal");
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [refNumber, setRefNumber] = useState("");
  const [narration, setNarration] = useState("");
  const [legs, setLegs] = useState<JournalVoucherLeg[]>([
    { accountId: "", accountCode: "", accountName: "", debitAmount: 0, creditAmount: 0, narration: "" },
    { accountId: "", accountCode: "", accountName: "", debitAmount: 0, creditAmount: 0, narration: "" }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vList, accList] = await Promise.all([
        accountingService.getJournalVouchers(),
        accountingService.getLedgerAccounts()
      ]);
      setVouchers(vList);
      setAccounts(accList);
    } catch (err) {
      console.error("Failed to load vouchers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddLeg = () => {
    setLegs([
      ...legs,
      { accountId: "", accountCode: "", accountName: "", debitAmount: 0, creditAmount: 0, narration: "" }
    ]);
  };

  const handleRemoveLeg = (index: number) => {
    if (legs.length <= 2) return;
    setLegs(legs.filter((_, i) => i !== index));
  };

  const handleLegAccountChange = (index: number, accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    const newLegs = [...legs];
    newLegs[index] = {
      ...newLegs[index],
      accountId: acc.id,
      accountCode: acc.accountCode,
      accountName: acc.accountName
    };
    setLegs(newLegs);
  };

  const handleLegAmountChange = (index: number, field: "debitAmount" | "creditAmount", value: number) => {
    const newLegs = [...legs];
    newLegs[index][field] = value;
    if (field === "debitAmount" && value > 0) {
      newLegs[index].creditAmount = 0;
    } else if (field === "creditAmount" && value > 0) {
      newLegs[index].debitAmount = 0;
    }
    setLegs(newLegs);
  };

  const totalDebit = legs.reduce((sum, l) => sum + (Number(l.debitAmount) || 0), 0);
  const totalCredit = legs.reduce((sum, l) => sum + (Number(l.creditAmount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert("Double-entry error: Total Debit must equal Total Credit before posting!");
      return;
    }
    for (const leg of legs) {
      if (!leg.accountId) {
        alert("Please select a valid ledger account for all lines.");
        return;
      }
    }

    try {
      setSubmitting(true);
      await accountingService.createJournalVoucher({
        voucherDate,
        voucherType,
        referenceNumber: refNumber || undefined,
        totalDebit,
        totalCredit,
        narration: narration.trim() || "Journal adjustment",
        legs
      });

      setIsCreateOpen(false);
      setNarration("");
      setRefNumber("");
      setLegs([
        { accountId: "", accountCode: "", accountName: "", debitAmount: 0, creditAmount: 0, narration: "" },
        { accountId: "", accountCode: "", accountName: "", debitAmount: 0, creditAmount: 0, narration: "" }
      ]);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to post voucher.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <Link
            href="/app/accounting"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Journal & Contra Vouchers</h1>
            <p className="text-sm text-slate-400">Post verified double-entry transactions and bank transfers</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Post New Voucher</span>
        </button>
      </div>

      {/* Vouchers Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Voucher #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Debit Account(s)</th>
                <th className="py-3.5 px-4">Credit Account(s)</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4">Narration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading Vouchers...
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No journal vouchers recorded yet.
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => {
                  const debits = v.legs.filter((l) => l.debitAmount > 0);
                  const credits = v.legs.filter((l) => l.creditAmount > 0);
                  return (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">{v.voucherNumber}</td>
                      <td className="py-3.5 px-4 text-slate-300">{new Date(v.voucherDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {v.voucherType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400 font-medium text-xs">
                        {debits.map((d, i) => (
                          <div key={i}>
                            {d.accountName} (₹{d.debitAmount.toLocaleString("en-IN")})
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 text-rose-400 font-medium text-xs">
                        {credits.map((c, i) => (
                          <div key={i}>
                            {c.accountName} (₹{c.creditAmount.toLocaleString("en-IN")})
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        ₹{v.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 max-w-xs truncate">{v.narration}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Screen / Large Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <Scale className="w-5 h-5 text-emerald-400" />
                <span>+ Create Double-Entry General Ledger Voucher</span>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Voucher Type *</label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs font-semibold"
                  >
                    <option value="Journal">Journal (Standard Adjustment)</option>
                    <option value="Contra">Contra (Cash &lt;-&gt; Bank Transfer)</option>
                    <option value="Payment">Payment Voucher</option>
                    <option value="Receipt">Receipt Voucher</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Voucher Date *</label>
                  <input
                    type="date"
                    required
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Reference / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. CHQ-88201 / UTR"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Legs Table */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Voucher Entries (Debit / Credit Legs)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLeg}
                    className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Line</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {legs.map((leg, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select
                          required
                          value={leg.accountId}
                          onChange={(e) => handleLegAccountChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:outline-none"
                        >
                          <option value="">-- Select Ledger Account --</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.accountCode} - {a.accountName} ({a.category})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Debit (₹)"
                          value={leg.debitAmount || ""}
                          onChange={(e) => handleLegAmountChange(idx, "debitAmount", parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-mono font-bold text-xs text-right focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Credit (₹)"
                          value={leg.creditAmount || ""}
                          onChange={(e) => handleLegAmountChange(idx, "creditAmount", parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-rose-400 font-mono font-bold text-xs text-right focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          disabled={legs.length <= 2}
                          onClick={() => handleRemoveLeg(idx)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Real-time Balances Footer */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono font-bold">
                  <div className="flex items-center space-x-2">
                    {isBalanced ? (
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Voucher is Balanced</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>Difference: ₹{Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
                      </span>
                    )}
                  </div>

                  <div className="space-x-4">
                    <span className="text-slate-400">
                      Total Dr: <span className="text-emerald-400">₹{totalDebit.toFixed(2)}</span>
                    </span>
                    <span className="text-slate-400">
                      Total Cr: <span className="text-rose-400">₹{totalCredit.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Narration / Remarks *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain why this journal adjustment was posted..."
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !isBalanced}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  {submitting ? "Posting..." : "Post Verified Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
