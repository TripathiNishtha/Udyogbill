"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Landmark,
  ArrowLeft,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw
} from "lucide-react";
import { accountingService, LedgerAccount } from "@/services/accounting-services";

interface BankReconItem {
  id: string;
  voucherDate: string;
  voucherNumber: string;
  referenceNumber: string;
  partyName: string;
  debitAmount: number;
  creditAmount: number;
  bankClearingDate?: string;
  status: "Cleared" | "Uncleared" | "Discrepancy";
}

const DEFAULT_RECON_ITEMS: BankReconItem[] = [
  { id: "br-1", voucherDate: "2026-08-25", voucherNumber: "JV-2026-001", referenceNumber: "CHQ-88912", partyName: "Cash Counter Transfer", debitAmount: 25000, creditAmount: 0, bankClearingDate: "2026-08-26", status: "Cleared" },
  { id: "br-2", voucherDate: "2026-08-28", voucherNumber: "JV-2026-002", referenceNumber: "IMPS-449102", partyName: "Godown Landlord Rent", debitAmount: 0, creditAmount: 35000, bankClearingDate: "2026-08-28", status: "Cleared" },
  { id: "br-3", voucherDate: "2026-08-30", voucherNumber: "PAY-2026-089", referenceNumber: "CHQ-991201", partyName: "Sun Pharma Distributors Ltd", debitAmount: 0, creditAmount: 45000, status: "Uncleared" },
  { id: "br-4", voucherDate: "2026-08-31", voucherNumber: "REC-2026-112", referenceNumber: "NEFT-77182", partyName: "Apollo Pharmacy Retail", debitAmount: 18500, creditAmount: 0, status: "Uncleared" }
];

export default function BankReconciliationPage() {
  const [bankAccounts, setBankAccounts] = useState<LedgerAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [reconItems, setReconItems] = useState<BankReconItem[]>(DEFAULT_RECON_ITEMS);
  const [statementBalance, setStatementBalance] = useState<number>(335000);

  useEffect(() => {
    accountingService.getLedgerAccounts().then((accounts) => {
      const banks = accounts.filter((a) => a.groupId === "grp-2" || a.accountName.toLowerCase().includes("bank"));
      setBankAccounts(banks);
      if (banks.length > 0) setSelectedAccountId(banks[0].id);
    });
  }, []);

  const activeAccount = bankAccounts.find((b) => b.id === selectedAccountId) || bankAccounts[0];
  const bookBalance = activeAccount ? activeAccount.currentBalance : 320000;

  const unclearedDeposits = reconItems
    .filter((i) => i.status === "Uncleared" && i.debitAmount > 0)
    .reduce((sum, i) => sum + i.debitAmount, 0);

  const unclearedCheques = reconItems
    .filter((i) => i.status === "Uncleared" && i.creditAmount > 0)
    .reduce((sum, i) => sum + i.creditAmount, 0);

  const calculatedBankBalance = bookBalance + unclearedCheques - unclearedDeposits;
  const difference = Math.abs(calculatedBankBalance - statementBalance);

  const handleToggleStatus = (id: string) => {
    setReconItems(
      reconItems.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === "Cleared" ? "Uncleared" : "Cleared";
          return {
            ...item,
            status: nextStatus,
            bankClearingDate: nextStatus === "Cleared" ? new Date().toISOString().split("T")[0] : undefined
          };
        }
        return item;
      })
    );
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
            <h1 className="text-xl font-bold text-white tracking-tight">Bank Reconciliation Statement (BRS)</h1>
            <p className="text-sm text-slate-400">Match ledger bank balances with actual bank account statements</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-indigo-400 focus:outline-none"
          >
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.accountName} ({b.accountCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reconciliation Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-sans text-slate-400 block mb-1">Company Ledger Book Balance</span>
          <span className="text-xl font-bold text-white">₹{bookBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-sans text-slate-400 block mb-1">Add: Unpresented Cheques (Issued)</span>
          <span className="text-xl font-bold text-emerald-400">+₹{unclearedCheques.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-[11px] font-sans text-slate-400 block mb-1">Less: Uncredited Deposits</span>
          <span className="text-xl font-bold text-rose-400">-₹{unclearedDeposits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>

        <div className={`p-4 rounded-2xl border ${difference === 0 ? "bg-emerald-950/30 border-emerald-500/40" : "bg-amber-950/30 border-amber-500/40"}`}>
          <span className="text-[11px] font-sans text-slate-300 block mb-1">Actual Bank Statement Balance</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-white">₹{statementBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            {difference === 0 ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            )}
          </div>
        </div>
      </div>

      {/* Transactions Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Bank Ledger Entries &amp; Clearing Verification
          </h3>
          <span className="text-xs text-slate-400">Click on status to mark Cheque Cleared / Uncleared</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Voucher Date</th>
                <th className="py-3.5 px-4">Voucher #</th>
                <th className="py-3.5 px-4">Ref / Cheque #</th>
                <th className="py-3.5 px-4">Party / Details</th>
                <th className="py-3.5 px-4 text-right">Debit (Deposit)</th>
                <th className="py-3.5 px-4 text-right">Credit (Withdrawal)</th>
                <th className="py-3.5 px-4 text-center">Bank Clearing Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {reconItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 text-slate-300 font-sans">{new Date(item.voucherDate).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{item.voucherNumber}</td>
                  <td className="py-3.5 px-4 text-indigo-400">{item.referenceNumber}</td>
                  <td className="py-3.5 px-4 font-sans font-medium text-white">{item.partyName}</td>
                  <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">
                    {item.debitAmount > 0 ? `₹${item.debitAmount.toLocaleString("en-IN")}` : "-"}
                  </td>
                  <td className="py-3.5 px-4 text-right text-rose-400 font-bold">
                    {item.creditAmount > 0 ? `₹${item.creditAmount.toLocaleString("en-IN")}` : "-"}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400">
                    {item.bankClearingDate || <span className="text-amber-400 italic">Pending Bank Clearing</span>}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(item.id)}
                      className={`px-3 py-1 rounded-full font-sans text-xs font-bold border transition ${
                        item.status === "Cleared"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                      }`}
                    >
                      {item.status === "Cleared" ? "✓ Cleared" : "⏳ Uncleared"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
