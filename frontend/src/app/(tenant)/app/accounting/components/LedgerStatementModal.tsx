"use client";

import { useEffect, useState } from "react";
import {
  X,
  BookOpen,
  Calendar,
  ArrowRight,
  Printer,
  ChevronDown,
  Filter,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import {
  accountingService,
  LedgerStatementReport,
  LedgerMonthlySummary
} from "@/services/accounting-services";

interface LedgerStatementModalProps {
  accountId: string | null;
  onClose: () => void;
  onOpenVoucher: (voucherId: string) => void;
}

export default function LedgerStatementModal({
  accountId,
  onClose,
  onOpenVoucher
}: LedgerStatementModalProps) {
  const [statement, setStatement] = useState<LedgerStatementReport | null>(null);
  const [monthly, setMonthly] = useState<LedgerMonthlySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"register" | "monthly">("register");

  // Date Filters
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  useEffect(() => {
    if (!accountId) {
      setStatement(null);
      setMonthly(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    Promise.all([
      accountingService.getLedgerStatement(accountId, fromDate || undefined, toDate || undefined),
      accountingService.getLedgerMonthlySummary(accountId)
    ])
      .then(([stmtData, monthlyData]) => {
        if (isMounted) {
          setStatement(stmtData);
          setMonthly(monthlyData);
        }
      })
      .catch((err) => console.error("Failed to load ledger details", err))
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
  }, [accountId, fromDate, toDate, onClose]);

  if (!accountId) return null;

  const handleApplyQuickFilter = (preset: "this_month" | "this_quarter" | "this_fy" | "all") => {
    const now = new Date();
    if (preset === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      setFromDate(start);
      setToDate(end);
    } else if (preset === "this_quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1).toISOString().split("T")[0];
      const end = new Date(now.getFullYear(), qMonth + 3, 0).toISOString().split("T")[0];
      setFromDate(start);
      setToDate(end);
    } else if (preset === "this_fy") {
      const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setFromDate(`${fyStart}-04-01`);
      setToDate(`${fyStart + 1}-03-31`);
    } else {
      setFromDate("");
      setToDate("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-opacity">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-800">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {statement?.accountName || "Ledger Statement"}
                </h2>
                {statement && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px] font-bold">
                    {statement.accountCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Group: <strong className="text-slate-700 dark:text-slate-300">{statement?.groupName}</strong> • Category:{" "}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{statement?.category}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setViewMode("register")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "register"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Daily Register
              </button>
              <button
                onClick={() => setViewMode("monthly")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "monthly"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Monthly Summary
              </button>
            </div>

            <button
              onClick={() => window.print()}
              title="Print Ledger"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200 dark:border-slate-700"
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

        {/* Date Filter & Balances Bar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="font-bold text-slate-400 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Period:</span>
            </span>
            <button
              onClick={() => handleApplyQuickFilter("this_month")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              This Month
            </button>
            <button
              onClick={() => handleApplyQuickFilter("this_quarter")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              This Quarter
            </button>
            <button
              onClick={() => handleApplyQuickFilter("this_fy")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              FY 2026-27
            </button>
            <button
              onClick={() => handleApplyQuickFilter("all")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              All Time
            </button>
          </div>

          {statement && (
            <div className="flex items-center space-x-4 font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Opening Bal</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  ₹{Number(statement.openingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
                  <span className="text-[10px] font-sans text-slate-400">{statement.balanceType}</span>
                </span>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
                <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Total Debit</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  ₹{Number(statement.totalDebit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
                <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Total Credit</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  ₹{Number(statement.totalCredit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
                <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Closing Bal</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  ₹{Number(statement.closingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
                  <span className="text-[10px] font-sans text-slate-400">{statement.closingBalanceType}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-xs text-slate-500 font-medium">Computing live ledger balance & voucher register...</p>
            </div>
          ) : viewMode === "monthly" && monthly ? (
            /* Monthly Summary View */
            <div className="space-y-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-4">Fiscal Month</th>
                      <th className="py-2.5 px-4 text-center">Vouchers</th>
                      <th className="py-2.5 px-4 text-right">Debit (Inward)</th>
                      <th className="py-2.5 px-4 text-right">Credit (Outward)</th>
                      <th className="py-2.5 px-4 text-right">Net Movement</th>
                      <th className="py-2.5 px-4 text-right">Closing Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium font-mono text-[11px]">
                    {monthly.months.map((m) => (
                      <tr key={m.monthIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-4 font-sans font-bold text-slate-800 dark:text-slate-200">
                          {m.monthName} {m.year}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {m.voucherCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                              {m.voucherCount} vch
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300">
                          {m.debitAmount > 0 ? `₹${Number(m.debitAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300">
                          {m.creditAmount > 0 ? `₹${Number(m.creditAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-800 dark:text-slate-200">
                          ₹{Number(m.netMovement).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-indigo-600 dark:text-indigo-400">
                          ₹{Number(m.closingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
                          <span className="text-[9px] font-sans text-slate-400 font-normal">{m.closingBalanceType}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-950/70 border-t-2 border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white">
                      <td colSpan={2} className="py-2.5 px-4 uppercase text-[11px] font-sans font-black">
                        Total Movement
                      </td>
                      <td className="py-2.5 px-4 text-right text-indigo-600 dark:text-indigo-400">
                        ₹{Number(monthly.totalDebit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-right text-purple-600 dark:text-purple-400">
                        ₹{Number(monthly.totalCredit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-right">—</td>
                      <td className="py-2.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                        ₹{Number(monthly.closingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
                        <span className="text-[9px] font-sans text-slate-400 font-normal">{monthly.closingBalanceType}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : statement && statement.lines.length > 0 ? (
            /* Daily Register View */
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Particulars / Narration</th>
                    <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                    <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                    <th className="py-2.5 px-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {statement.lines.map((l, idx) => (
                    <tr
                      key={idx}
                      onClick={() => onOpenVoucher(l.voucherId)}
                      className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition group"
                      title="Click to view full voucher double-entry legs"
                    >
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(l.voucherDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          {l.voucherType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                        <div className="flex items-center space-x-1">
                          <span>{l.voucherNumber}</span>
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] max-w-xs truncate">
                        {l.narration || (l.referenceNumber ? `Ref: ${l.referenceNumber}` : "—")}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {l.debitAmount > 0 ? `₹${Number(l.debitAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {l.creditAmount > 0 ? `₹${Number(l.creditAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        ₹{Number(l.runningBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
                        <span className="text-[9px] font-sans text-slate-400 font-normal">{l.runningBalanceType}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-bold text-slate-500">No voucher transactions recorded for this period.</p>
              <p className="text-[11px] text-slate-400">
                Opening Balance: ₹{Number(statement?.openingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            Tip: Click any transaction row to open the non-disruptive Voucher Audit Drawer.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
