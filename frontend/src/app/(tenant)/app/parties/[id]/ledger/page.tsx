"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Calendar,
  CreditCard,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  X,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { partyService, RecordPaymentInput } from "@/services/party-services";
import { PartyStatement, PartyDetails } from "@/types";

export default function PartyLedgerStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;

  const [statement, setStatement] = useState<PartyStatement | null>(null);
  const [party, setParty] = useState<PartyDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Date filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payForm, setPayForm] = useState<RecordPaymentInput>({
    partyId: partyId,
    transactionDate: new Date().toISOString().split("T")[0],
    amount: 0,
    paymentMode: "UPI",
    referenceNumber: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stmt, pty] = await Promise.all([
        partyService.getStatement(partyId, fromDate, toDate),
        partyService.getCustomerById(partyId).catch(() => partyService.getSupplierById(partyId)),
      ]);
      setStatement(stmt);
      setParty(pty);
    } catch (err) {
      console.error("Failed to load party statement", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [partyId]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payForm.amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    try {
      setSubmitting(true);
      await partyService.recordPayment({
        ...payForm,
        partyId,
        amount: Number(payForm.amount),
      });
      setIsPayModalOpen(false);
      setPayForm({
        partyId,
        transactionDate: new Date().toISOString().split("T")[0],
        amount: 0,
        paymentMode: "UPI",
        referenceNumber: "",
        notes: "",
      });
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const isCustomer = party?.partyType === 1 || party?.partyType === 3;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Back and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={isCustomer ? "/app/parties/customers" : "/app/parties/suppliers"}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {isCustomer ? "Customers" : "Suppliers"} Directory</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            <span>Statement of Account & Ledger</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPayModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            <span>{isCustomer ? "Receive Payment (Receipt)" : "Make Payment (Voucher)"}</span>
          </button>
        </div>
      </div>

      {/* Party Profile Banner */}
      {party && (
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-white">{party.legalName}</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {party.code}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              {party.gstin && (
                <span className="font-mono">
                  GSTIN: <strong className="text-slate-300">{party.gstin}</strong> ({party.stateCode})
                </span>
              )}
              {party.mobile && (
                <span className="flex items-center space-x-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>{party.mobile}</span>
                </span>
              )}
              {party.creditLimit > 0 && (
                <span>
                  Credit Limit: <strong>₹{party.creditLimit.toLocaleString()}</strong> ({party.creditPeriodDays} Days)
                </span>
              )}
            </div>
          </div>

          <div className="text-right font-mono">
            <div className="text-xs text-slate-400">Current Net Position</div>
            <div
              className={`text-xl font-bold ${
                party.currentOutstandingBalance > 0
                  ? "text-amber-400"
                  : party.currentOutstandingBalance < 0
                  ? "text-emerald-400"
                  : "text-slate-500"
              }`}
            >
              ₹{Math.abs(party.currentOutstandingBalance).toFixed(2)}
              <span className="text-xs ml-1">
                {party.currentOutstandingBalance >= 0 ? "Dr (Receivable)" : "Cr (Payable)"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Date Filter & Metric Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Date Filter Box */}
        <form
          onSubmit={handleFilterSubmit}
          className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 flex flex-col justify-between"
        >
          <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Statement Period</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 block">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Apply Date Filter
          </button>
        </form>

        {/* Metric 1: Opening Balance */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Opening Balance (As of {fromDate})</div>
          <div className="text-xl font-bold font-mono text-white">
            ₹{statement ? Math.abs(statement.openingBalance).toFixed(2) : "0.00"}
            <span className="text-xs font-normal text-slate-400 ml-1">
              {statement && statement.openingBalance >= 0 ? "Dr" : "Cr"}
            </span>
          </div>
        </div>

        {/* Metric 2: Period Invoices / Debits */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Total Debits (+)</div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            ₹{statement ? statement.totalDebit.toFixed(2) : "0.00"}
          </div>
        </div>

        {/* Metric 3: Period Payments / Credits */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Total Credits (-)</div>
          <div className="text-xl font-bold font-mono text-rose-400">
            ₹{statement ? statement.totalCredit.toFixed(2) : "0.00"}
          </div>
        </div>
      </div>

      {/* Statement Table */}
      <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/50 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Date & Type</th>
                <th className="px-5 py-3.5 font-semibold">Reference / Document</th>
                <th className="px-5 py-3.5 font-semibold">Payment Mode & Description</th>
                <th className="px-5 py-3.5 font-semibold text-right">Debit (₹)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Credit (₹)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Running Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading ledger statement...
                  </td>
                </tr>
              ) : statement && statement.entries.length > 0 ? (
                statement.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white">
                        {new Date(entry.transactionDate).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-indigo-400 font-semibold">{entry.entryTypeName}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      <div>{entry.referenceDocumentNumber || "—"}</div>
                      <div className="text-[10px] text-slate-500">{entry.referenceDocumentType || "Manual"}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      <div>{entry.description || "—"}</div>
                      {entry.paymentMode && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {entry.paymentMode}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-400">
                      {entry.debitAmount > 0 ? `₹${entry.debitAmount.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-rose-400">
                      {entry.creditAmount > 0 ? `₹${entry.creditAmount.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-white">
                      ₹{Math.abs(entry.runningBalance).toFixed(2)}
                      <span className="text-[10px] text-slate-400 ml-1">
                        {entry.runningBalance >= 0 ? "Dr" : "Cr"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No ledger transactions recorded in this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsPayModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <span>{isCustomer ? "Receive Customer Payment" : "Record Supplier Payment"}</span>
              </h3>
              <p className="text-xs text-slate-400">
                Party: <strong className="text-white">{party?.legalName}</strong>
              </p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Payment Date</label>
                <input
                  type="date"
                  required
                  value={payForm.transactionDate}
                  onChange={(e) => setPayForm({ ...payForm, transactionDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={payForm.amount || ""}
                  onChange={(e) => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Payment Mode</label>
                <select
                  value={payForm.paymentMode}
                  onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BankTransfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque / Demand Draft</option>
                  <option value="CreditCard">Credit / Debit Card</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Transaction Reference No</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-9988771122 or Cheque No"
                  value={payForm.referenceNumber || ""}
                  onChange={(e) => setPayForm({ ...payForm, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Part payment against monthly invoice"
                  value={payForm.notes || ""}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
                >
                  {submitting ? "Processing..." : "Record Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
