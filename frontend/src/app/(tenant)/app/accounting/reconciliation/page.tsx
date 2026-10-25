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
  RefreshCw,
  Lock,
  Unlock,
  ShieldCheck,
  Calendar
} from "lucide-react";
import { accountingService, LedgerAccount, PeriodLock } from "@/services/accounting-services";

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

export default function BankReconciliationPage() {
  const [bankAccounts, setBankAccounts] = useState<LedgerAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [reconItems, setReconItems] = useState<BankReconItem[]>([]);
  const [statementBalance, setStatementBalance] = useState<number>(0);

  // Period Lock State
  const [periodLock, setPeriodLock] = useState<PeriodLock | null>(null);
  const [lockDate, setLockDate] = useState<string>("");
  const [lockReason, setLockReason] = useState<string>("Year-End Financial Books Closed & Audited");
  const [savingLock, setSavingLock] = useState<boolean>(false);

  const loadData = () => {
    Promise.all([
      accountingService.getLedgerAccounts(),
      accountingService.getJournalVouchers(),
      accountingService.getPeriodLock()
    ])
      .then(([accounts, allVouchers, pLock]) => {
        if (pLock && pLock.isLocked && pLock.lockDate) {
          setPeriodLock(pLock);
          setLockDate(pLock.lockDate.split("T")[0]);
          setLockReason(pLock.reason || "");
        } else {
          setPeriodLock(null);
        }

        const banks = accounts.filter(
          (a) =>
            a.accountCode === "ACC-BANK" ||
            a.accountName.toLowerCase().includes("bank") ||
            a.groupName.toLowerCase().includes("bank")
        );
        setBankAccounts(banks);
        const firstBank = banks[0];
        if (firstBank) {
          setSelectedAccountId(firstBank.id);
          setStatementBalance(Number(firstBank.currentBalance) || 0);

          const bankVouchers = allVouchers
            .filter((v) => v.legs.some((l) => l.accountId === firstBank.id))
            .map((v) => {
              const bankLeg = v.legs.find((l) => l.accountId === firstBank.id);
              const otherLeg = v.legs.find((l) => l.accountId !== firstBank.id);
              return {
                id: v.id,
                voucherDate: v.voucherDate.split("T")[0],
                voucherNumber: v.voucherNumber,
                referenceNumber: v.referenceNumber || "—",
                partyName: otherLeg?.accountName || v.narration || "Bank Transaction",
                debitAmount: bankLeg?.debitAmount || 0,
                creditAmount: bankLeg?.creditAmount || 0,
                status: "Uncleared" as const
              };
            });
          setReconItems(bankVouchers);
        } else {
          setReconItems([]);
          setStatementBalance(0);
        }
      })
      .catch(() => {
        setBankAccounts([]);
        setReconItems([]);
        setStatementBalance(0);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePeriodLock = async (enable: boolean) => {
    if (enable && !lockDate) {
      alert("Please select a valid lock date.");
      return;
    }

    try {
      setSavingLock(true);
      const res = await accountingService.setPeriodLock(
        enable ? new Date(lockDate).toISOString() : new Date().toISOString(),
        enable,
        lockReason.trim() || "Financial Books Closed"
      );
      setPeriodLock(res.isLocked ? res : null);
      alert(
        enable
          ? `Accounting period locked up to ${new Date(lockDate).toLocaleDateString("en-IN")}. Modifications to prior vouchers are now prohibited.`
          : "Period lock removed successfully."
      );
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to update period lock.");
    } finally {
      setSavingLock(false);
    }
  };

  const activeAccount = bankAccounts.find((b) => b.id === selectedAccountId) || bankAccounts[0];
  const bookBalance = activeAccount ? Number(activeAccount.currentBalance) : 0;

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
                Bank Reconciliation (BRS) & Period Locking
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 text-[10px] font-black uppercase tracking-wider">
                Statutory Controls
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Reconcile uncleared cheques, deposits, bank passbook balances, and lock fiscal accounting periods
            </p>
          </div>
        </div>
      </div>

      {/* Period Locking Control Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div
              className={`p-2 rounded-xl ${
                periodLock?.isLocked
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
              }`}
            >
              {periodLock?.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Accounting Period Lock Date</span>
                {periodLock?.isLocked ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-300">
                    LOCKED UP TO {new Date(periodLock.lockDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-300">
                    OPEN (NO LOCK)
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Prevent retroactive voucher creation, backdated edits, or cancellations prior to the lock date.
              </p>
            </div>
          </div>

          {periodLock?.isLocked && (
            <button
              onClick={() => handleSavePeriodLock(false)}
              disabled={savingLock}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              {savingLock ? "Unlocking..." : "Remove Period Lock"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
              Lock Books Up To Date:
            </label>
            <input
              type="date"
              value={lockDate}
              onChange={(e) => setLockDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-xs"
            />
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
              Audit / Statutory Lock Reason:
            </label>
            <input
              type="text"
              placeholder="e.g. FY 2025-26 Tax Audit Finalized"
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => handleSavePeriodLock(true)}
              disabled={savingLock || !lockDate}
              className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm shadow-rose-600/30 flex items-center justify-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{savingLock ? "Applying Lock..." : "Apply Period Lock"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Selection and Balances Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Select Bank Account:
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            >
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.accountName} ({b.accountCode})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Company Book Balance</span>
            <span className="text-base font-black font-mono text-slate-900 dark:text-white">
              ₹{bookBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800">
            <span className="text-[10px] text-sky-700 dark:text-sky-400 font-bold uppercase block">
              Calculated Bank Balance
            </span>
            <span className="text-base font-black font-mono text-sky-700 dark:text-sky-300">
              ₹{calculatedBankBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="text-[10px] text-slate-400 font-bold uppercase block">Passbook / Statement Balance</label>
            <input
              type="number"
              value={statementBalance || ""}
              onChange={(e) => setStatementBalance(parseFloat(e.target.value) || 0)}
              className="w-full mt-0.5 bg-transparent font-mono font-black text-base text-slate-900 dark:text-white focus:outline-none"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Reconciliation Status Alert */}
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
            difference < 1
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>
              {difference < 1
                ? "Bank Statement & Books are 100% Reconciled"
                : `Reconciliation Difference: ₹${difference.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
            </span>
          </div>
          <span className="font-mono text-[11px]">
            Uncleared Deposits: ₹{unclearedDeposits.toLocaleString("en-IN")} • Uncleared Cheques: ₹{unclearedCheques.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Recon Items Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Voucher #</th>
              <th className="py-3 px-4">Reference</th>
              <th className="py-3 px-4">Party / Details</th>
              <th className="py-3 px-4 text-right">Debit (Deposit)</th>
              <th className="py-3 px-4 text-right">Credit (Withdrawal)</th>
              <th className="py-3 px-4 text-center">Clearing Date</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
            {reconItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      No Uncleared Bank Vouchers Pending
                    </p>
                    <p className="text-[11px] text-slate-400">All bank transactions are verified and cleared.</p>
                  </div>
                </td>
              </tr>
            ) : (
              reconItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 text-slate-500 font-sans">
                    {new Date(item.voucherDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-mono">{item.voucherNumber}</td>
                  <td className="py-3 px-4 text-orange-600 font-mono font-bold">{item.referenceNumber}</td>
                  <td className="py-3 px-4 font-sans font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs">{item.partyName}</td>
                  <td className="py-3 px-4 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                    {item.debitAmount > 0 ? `₹${item.debitAmount.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-700 dark:text-rose-400 font-bold">
                    {item.creditAmount > 0 ? `₹${item.creditAmount.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500 font-sans">
                    {item.bankClearingDate || <span className="text-amber-600 italic">Pending Bank Clearing</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(item.id)}
                      className={`px-3 py-1 rounded-full font-sans text-xs font-bold border transition cursor-pointer ${
                        item.status === "Cleared"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200"
                          : "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                      }`}
                    >
                      {item.status === "Cleared" ? "✓ Cleared" : "⏳ Uncleared"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
