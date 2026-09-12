"use client";

import { useEffect, useState } from "react";
import {
  FileCheck2,
  AlertOctagon,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Plus,
  Building2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Landmark,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { chequeService, ChequeItem, bankingService, BankAccount } from "@/services/banking-services";
import { partyService } from "@/services/party-services";
import { PartyList } from "@/types";

export default function ChequeRegisterPage() {
  const [cheques, setCheques] = useState<ChequeItem[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [parties, setParties] = useState<PartyList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDirection, setFilterDirection] = useState<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<number | undefined>(undefined);

  // New Cheque Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [direction, setDirection] = useState<number>(1); // Incoming
  const [partyId, setPartyId] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");

  // Action Modals (Deposit, Clear, Bounce)
  const [selectedCheque, setSelectedCheque] = useState<ChequeItem | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositBankAccountId, setDepositBankAccountId] = useState("");
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split("T")[0]);

  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearingDate, setClearingDate] = useState(new Date().toISOString().split("T")[0]);

  const [isBounceOpen, setIsBounceOpen] = useState(false);
  const [bouncedDate, setBouncedDate] = useState(new Date().toISOString().split("T")[0]);
  const [bounceReason, setBounceReason] = useState("Insufficient Funds");
  const [bounceCharges, setBounceCharges] = useState<number>(590); // standard ₹500 + GST
  const [billChargesToParty, setBillChargesToParty] = useState(true);

  const [notification, setNotification] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [chequesRes, accsRes, partRes] = await Promise.all([
        chequeService.getCheques({
          direction: filterDirection,
          status: filterStatus,
          searchTerm: searchTerm || undefined,
          pageSize: 50
        }).catch(() => ({ items: [], totalCount: 0 })),
        bankingService.getAccounts().catch(() => []),
        partyService.getParties({ pageSize: 100 }).catch(() => ({ items: [] }))
      ]);

      setCheques(chequesRes.items || []);
      setAccounts(accsRes || []);
      setParties(partRes.items || []);

      if (accsRes?.length > 0 && !depositBankAccountId) {
        setDepositBankAccountId(accsRes[0].id);
      }
      if (partRes.items?.length > 0 && !partyId) {
        setPartyId(partRes.items[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterDirection, filterStatus]);

  const handleCreateCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId || !chequeNumber || !bankName || amount <= 0) {
      alert("Please fill all required cheque details.");
      return;
    }

    const selectedParty = parties.find(p => p.id === partyId);
    try {
      await chequeService.recordCheque({
        direction,
        partyId,
        partyName: selectedParty?.legalName || "Party",
        chequeNumber,
        bankName,
        branchName,
        amount,
        chequeDate,
        remarks
      });
      setIsAddOpen(false);
      setChequeNumber("");
      setAmount(0);
      setRemarks("");
      setNotification("Cheque / PDC registered successfully.");
      setTimeout(() => setNotification(""), 4000);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to record cheque.");
    }
  };

  const handleDeposit = async () => {
    if (!selectedCheque || !depositBankAccountId) return;
    try {
      await chequeService.depositCheque(selectedCheque.id, {
        bankAccountId: depositBankAccountId,
        depositDate
      });
      setIsDepositOpen(false);
      setSelectedCheque(null);
      setNotification(`Cheque #${selectedCheque.chequeNumber} marked as Deposited.`);
      setTimeout(() => setNotification(""), 4000);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Deposit failed.");
    }
  };

  const handleClear = async () => {
    if (!selectedCheque) return;
    try {
      await chequeService.clearCheque(selectedCheque.id, {
        clearingDate
      });
      setIsClearOpen(false);
      setSelectedCheque(null);
      setNotification(`Cheque #${selectedCheque.chequeNumber} Cleared! Bank balance & customer ledger updated.`);
      setTimeout(() => setNotification(""), 4000);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Clearing failed.");
    }
  };

  const handleBounce = async () => {
    if (!selectedCheque || !bounceReason) return;
    try {
      await chequeService.bounceCheque(selectedCheque.id, {
        bouncedDate,
        bounceReason,
        bounceCharges,
        billChargesToParty
      });
      setIsBounceOpen(false);
      setSelectedCheque(null);
      setNotification(`Cheque #${selectedCheque.chequeNumber} marked as Bounced. Ledger reversal & penalty billed.`);
      setTimeout(() => setNotification(""), 4000);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Dishonour/Bounce operation failed.");
    }
  };

  // Status Helpers
  const getStatusBadge = (st: number) => {
    switch (st) {
      case 1:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><Clock className="w-3 h-3" /> In Hand / PDC</span>;
      case 2:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"><Landmark className="w-3 h-3" /> Deposited</span>;
      case 3:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Cleared</span>;
      case 4:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"><ShieldAlert className="w-3 h-3" /> Bounced</span>;
      case 6:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"><XCircle className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">Status {st}</span>;
    }
  };

  const totalInHand = cheques.filter(c => c.status === 1).reduce((acc, c) => acc + c.amount, 0);
  const totalDeposited = cheques.filter(c => c.status === 2).reduce((acc, c) => acc + c.amount, 0);
  const totalBounced = cheques.filter(c => c.status === 4).reduce((acc, c) => acc + c.amount, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-7 h-7 text-indigo-600" />
            Cheque & PDC Register
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Lifecycle management for Post-Dated Cheques, Bank Deposits, Realizations, and Dishonour / Bounce Reversals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Register Cheque / PDC
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4" /> {notification}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">In-Hand / PDC Balance</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">₹{totalInHand.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-500 mt-1">{cheques.filter(c => c.status === 1).length} cheques awaiting banking date</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Deposited (Uncleared)</span>
            <Landmark className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">₹{totalDeposited.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-500 mt-1">{cheques.filter(c => c.status === 2).length} cheques in clearing transit</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bounced / Dishonoured</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-rose-600 dark:text-rose-400">₹{totalBounced.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-500 mt-1">{cheques.filter(c => c.status === 4).length} cheques bounced</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Cheque No, Bank, Party Name, or Bill No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadData()}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterDirection ?? ""}
          onChange={(e) => setFilterDirection(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
        >
          <option value="">All Directions</option>
          <option value="1">Incoming (Customer Receipts)</option>
          <option value="2">Outgoing (Vendor Payments)</option>
        </select>
        <select
          value={filterStatus ?? ""}
          onChange={(e) => setFilterStatus(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
        >
          <option value="">All Statuses</option>
          <option value="1">In-Hand / PDC</option>
          <option value="2">Deposited</option>
          <option value="3">Cleared</option>
          <option value="4">Bounced</option>
          <option value="6">Cancelled</option>
        </select>
      </div>

      {/* Cheques Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Cheque Details</th>
                <th className="p-3">Party</th>
                <th className="p-3">Dates</th>
                <th className="p-3">Direction</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Bank Account</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Loading cheque register...
                  </td>
                </tr>
              ) : cheques.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No cheques found for current filters.
                  </td>
                </tr>
              ) : (
                cheques.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">#{c.chequeNumber}</div>
                      <div className="text-xs text-slate-500">{c.bankName} {c.branchName ? `(${c.branchName})` : ""}</div>
                      {c.referenceDocumentNumber && (
                        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">Ref: {c.referenceDocumentNumber}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{c.partyName}</div>
                      {c.remarks && <div className="text-xs text-slate-400 truncate max-w-xs">{c.remarks}</div>}
                    </td>
                    <td className="p-3 text-xs">
                      <div><span className="text-slate-400">Cheque Date:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(c.chequeDate).toLocaleDateString("en-IN")}</span></div>
                      {c.clearingDate && (
                        <div className="text-emerald-600"><span className="text-slate-400">Cleared:</span> {new Date(c.clearingDate).toLocaleDateString("en-IN")}</div>
                      )}
                      {c.bouncedDate && (
                        <div className="text-rose-600"><span className="text-slate-400">Bounced:</span> {new Date(c.bouncedDate).toLocaleDateString("en-IN")}</div>
                      )}
                    </td>
                    <td className="p-3">
                      {c.direction === 1 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          <ArrowDownLeft className="w-3.5 h-3.5" /> Incoming
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Outgoing
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white">₹{c.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td className="p-3">
                      {getStatusBadge(c.status)}
                      {c.bounceReason && (
                        <div className="text-[11px] text-rose-600 mt-1 font-medium">Reason: {c.bounceReason}</div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                      {c.bankAccountName ? (
                        <div className="flex items-center gap-1 font-medium">
                          <Landmark className="w-3.5 h-3.5 text-slate-400" />
                          {c.bankAccountName}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.status === 1 && (
                          <button
                            onClick={() => {
                              setSelectedCheque(c);
                              setIsDepositOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 transition"
                          >
                            Deposit
                          </button>
                        )}
                        {(c.status === 1 || c.status === 2) && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedCheque(c);
                                setIsClearOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition"
                            >
                              Clear
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCheque(c);
                                setIsBounceOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300 transition"
                            >
                              Bounce
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register Cheque */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-indigo-600" />
                Register Cheque / Post-Dated Cheque (PDC)
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateCheque} className="p-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Direction</label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                  >
                    <option value="1">Incoming (From Customer)</option>
                    <option value="2">Outgoing (To Vendor)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Party</label>
                  <select
                    value={partyId}
                    onChange={(e) => setPartyId(e.target.value)}
                    required
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                  >
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>{p.legalName} ({p.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cheque Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 000142"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, SBI"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="e.g. MG Road Branch"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cheque Date (PDC Maturity Date) *</label>
                <input
                  type="date"
                  required
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Remarks / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Towards Invoice INV-2627-00042"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Save to Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Deposit Cheque */}
      {isDepositOpen && selectedCheque && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-blue-600" />
              Deposit Cheque #{selectedCheque.chequeNumber}
            </h3>
            <p className="text-xs text-slate-500">
              Depositing cheque of <b>₹{selectedCheque.amount.toLocaleString("en-IN")}</b> from <b>{selectedCheque.partyName}</b>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Deposit into Bank Account</label>
              <select
                value={depositBankAccountId}
                onChange={(e) => setDepositBankAccountId(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.accountName} ({acc.bankName || "Bank"}) - Bal: ₹{acc.currentBalance.toLocaleString("en-IN")}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Deposit Date</label>
              <input
                type="date"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDepositOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeposit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Confirm Deposit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clear Cheque */}
      {isClearOpen && selectedCheque && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Clear & Realize Cheque #{selectedCheque.chequeNumber}
            </h3>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
              Confirming clearance will credit <b>₹{selectedCheque.amount.toLocaleString("en-IN")}</b> to bank balance and reduce outstanding balance on <b>{selectedCheque.partyName}</b>&apos;s ledger.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Clearing / Realization Date</label>
              <input
                type="date"
                value={clearingDate}
                onChange={(e) => setClearingDate(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsClearOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Post Clearance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bounce / Dishonour Cheque */}
      {isBounceOpen && selectedCheque && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              Dishonour / Bounce Cheque #{selectedCheque.chequeNumber}
            </h3>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300">
              Bouncing will reverse any payment credit on <b>{selectedCheque.partyName}</b>&apos;s ledger and optionally bill bank dishonour penalties.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Reason for Dishonour</label>
              <select
                value={bounceReason}
                onChange={(e) => setBounceReason(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="Insufficient Funds">Funds Insufficient</option>
                <option value="Signature Mismatch">Signature Differs</option>
                <option value="Stop Payment Issued">Payment Stopped by Drawer</option>
                <option value="Post Dated / Stale Cheque">Cheque Post-Dated / Stale</option>
                <option value="Account Blocked / Frozen">Account Blocked / Frozen</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Bounce Date</label>
                <input
                  type="date"
                  value={bouncedDate}
                  onChange={(e) => setBouncedDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Penalty Charges (₹)</label>
                <input
                  type="number"
                  value={bounceCharges}
                  onChange={(e) => setBounceCharges(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={billChargesToParty}
                onChange={(e) => setBillChargesToParty(e.target.checked)}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              Bill ₹{bounceCharges} bounce charges to customer via Debit Note
            </label>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsBounceOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBounce}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Confirm Bounce & Reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
