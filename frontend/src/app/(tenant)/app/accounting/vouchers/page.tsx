"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Scale,
  Plus,
  ArrowLeft,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  Trash2,
  Calendar,
  Filter,
  FileText,
  ArrowRight,
  ShieldCheck,
  Ban,
  Command,
  HelpCircle
} from "lucide-react";
import {
  accountingService,
  JournalVoucher,
  LedgerAccount,
  JournalVoucherLeg
} from "@/services/accounting-services";
import VoucherSlideOverDrawer from "../components/VoucherSlideOverDrawer";
import LedgerStatementModal from "../components/LedgerStatementModal";
import AccountingOmnibar from "../components/AccountingOmnibar";

export default function JournalVouchersPage() {
  const searchParams = useSearchParams();
  const [vouchers, setVouchers] = useState<JournalVoucher[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");

  // Selected Voucher for Slide-Over Drawer
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [isOmnibarOpen, setIsOmnibarOpen] = useState(false);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<string>("Journal");
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [refNumber, setRefNumber] = useState("");
  const [narration, setNarration] = useState("");
  const [legs, setLegs] = useState<JournalVoucherLeg[]>([
    { accountId: "", accountCode: "", accountName: "", debitAmount: 0, creditAmount: 0, narration: "" },
    { accountId: "", accountCode: "", accountName: "", debitAmount: 0, creditAmount: 0, narration: "" }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [vList, accList] = await Promise.all([
        accountingService.getJournalVouchers({
          voucherType: selectedType === "All" ? undefined : selectedType,
          search: searchTerm || undefined
        }),
        accountingService.getLedgerAccounts()
      ]);
      setVouchers(vList);
      setAccounts(accList);
    } catch (err) {
      console.error("Failed to load vouchers", err);
    } finally {
      setLoading(false);
    }
  }, [selectedType, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open create modal if URL has ?action=new
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setIsCreateOpen(true);
    }
  }, [searchParams]);

  // Global Keyboard Shortcuts (Alt+G, Alt+C, F4, F5, F6, F7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && (e.key === "g" || e.key === "G")) || ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K"))) {
        e.preventDefault();
        setIsOmnibarOpen(true);
      } else if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setIsCreateOpen(true);
      } else if (e.key === "F4") {
        e.preventDefault();
        setVoucherType("Contra");
        setIsCreateOpen(true);
      } else if (e.key === "F5") {
        e.preventDefault();
        setVoucherType("Payment");
        setIsCreateOpen(true);
      } else if (e.key === "F6") {
        e.preventDefault();
        setVoucherType("Receipt");
        setIsCreateOpen(true);
      } else if (e.key === "F7") {
        e.preventDefault();
        setVoucherType("Journal");
        setIsCreateOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        voucherDate: new Date(voucherDate).toISOString(),
        voucherType,
        referenceNumber: refNumber || undefined,
        narration: narration.trim() || `${voucherType} Entry`,
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
      alert(err.response?.data?.error || err.message || "Failed to post voucher.");
    } finally {
      setSubmitting(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <Link
            href="/app/accounting"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Vouchers & Double-Entry Journal
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                All 16+ Voucher Types Standard
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Contra (F4), Payment (F5), Receipt (F6), Journal (F7), Sales (F8), Purchase (F9), Notes with MCA Audit Logs
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          {/* Alt+G Omnibar */}
          <button
            onClick={() => setIsOmnibarOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Alt+G Go To Omnibar"
          >
            <Search className="w-3.5 h-3.5 text-orange-600" />
            <span>Go To (Alt+G)</span>
          </button>

          {/* Create Voucher Button */}
          <button
            onClick={() => {
              setVoucherType("Journal");
              setIsCreateOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition cursor-pointer"
            title="Create double-entry voucher (Alt+C)"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Voucher</span>
            <span className="font-mono text-[10px] opacity-80 bg-emerald-700 px-1 rounded">Alt+C</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
        {/* Voucher Type Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          {["All", "Journal", "Contra", "Payment", "Receipt", "Sales", "Purchase", "CreditNote", "DebitNote"].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                selectedType === type
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {type === "CreditNote" ? "Credit Note" : type === "DebitNote" ? "Debit Note" : type}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search voucher #, ref, narration, party..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="text-xs text-slate-500 font-medium">Loading double-entry journal vouchers...</p>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No vouchers found</p>
              <p className="text-xs text-slate-400 mt-1">Post a manual adjustment voucher or synchronize sales invoices.</p>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-500 transition cursor-pointer"
            >
              + Create Voucher Entry
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Voucher Type</th>
                <th className="py-3 px-4">Voucher Number</th>
                <th className="py-3 px-4">Reference No.</th>
                <th className="py-3 px-4">Narration / Particulars</th>
                <th className="py-3 px-4 text-right">Debit (₹)</th>
                <th className="py-3 px-4 text-right">Credit (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {vouchers.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelectedVoucherId(v.id)}
                  className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition group"
                  title="Click to slide open full Voucher Audit Drawer with double-entry legs"
                >
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                    {new Date(v.voucherDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${getVoucherTypeBadge(v.voucherType)}`}>
                      {v.voucherType}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400 group-hover:underline whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <span>{v.voucherNumber}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition text-emerald-600" />
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {v.referenceNumber || "—"}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate text-[11px]">
                    {v.narration || "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    ₹{Number(v.totalDebit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    ₹{Number(v.totalCredit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {v.isCancelled ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Cancelled
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Posted
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-over Voucher Audit Drawer */}
      <VoucherSlideOverDrawer
        voucherId={selectedVoucherId}
        onClose={() => setSelectedVoucherId(null)}
        onVoucherCancelled={() => loadData()}
        onSelectAccount={(accId) => setSelectedLedgerId(accId)}
      />

      {/* Ledger Monthly Summary & Transaction Statement Modal */}
      <LedgerStatementModal
        accountId={selectedLedgerId}
        onClose={() => setSelectedLedgerId(null)}
        onOpenVoucher={(vId) => setSelectedVoucherId(vId)}
      />

      {/* Alt+G Universal Omnibar */}
      <AccountingOmnibar
        isOpen={isOmnibarOpen}
        onClose={() => setIsOmnibarOpen(false)}
        onSelectLedger={(accId) => setSelectedLedgerId(accId)}
      />

      {/* Create Voucher Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-black text-base">
                <Scale className="w-5 h-5 text-emerald-600" />
                <span>Create Double-Entry Voucher</span>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Voucher Type *
                  </label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white focus:outline-none text-xs font-semibold cursor-pointer"
                  >
                    <option value="Journal">Journal (F7 - Standard Adjustment)</option>
                    <option value="Contra">Contra (F4 - Cash / Bank Transfer)</option>
                    <option value="Payment">Payment (F5 - Expense / Settlement)</option>
                    <option value="Receipt">Receipt (F6 - Inward Settlement)</option>
                    <option value="Sales">Accounting Sales (F8)</option>
                    <option value="Purchase">Accounting Purchase (F9)</option>
                    <option value="CreditNote">Credit Note (Alt+F6)</option>
                    <option value="DebitNote">Debit Note (Alt+F5)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Voucher Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white focus:outline-none text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Reference / Cheque / UTR #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CHQ-88201 / UTR"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-400 font-mono font-bold focus:bg-white focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Legs Table */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Voucher Entries (Debit / Credit Legs)</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                      ⌨ Press Tab to navigate
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLeg}
                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-bold flex items-center space-x-1 cursor-pointer text-xs"
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
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium focus:outline-none cursor-pointer"
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
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-emerald-700 dark:text-emerald-400 font-mono font-bold text-xs text-right focus:outline-none"
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
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-rose-700 dark:text-rose-400 font-mono font-bold text-xs text-right focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          disabled={legs.length <= 2}
                          onClick={() => handleRemoveLeg(idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Real-time Balances Footer */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono font-bold">
                  <div className="flex items-center space-x-2">
                    {isBalanced ? (
                      <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-lg flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Voucher is Balanced</span>
                      </span>
                    ) : (
                      <span className="text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded-lg flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Difference: ₹{Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
                      </span>
                    )}
                  </div>

                  <div className="space-x-3 text-slate-600 dark:text-slate-300">
                    <span>
                      Total Dr: <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold">₹{totalDebit.toFixed(2)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Total Cr: <strong className="text-rose-700 dark:text-rose-400 font-extrabold">₹{totalCredit.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                  Narration / Remarks *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain why this journal adjustment was posted..."
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:bg-white focus:outline-none text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !isBalanced}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer"
                >
                  {submitting ? "Posting Voucher..." : "Post Verified Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
