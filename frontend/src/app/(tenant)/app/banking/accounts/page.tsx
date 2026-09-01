"use client";

import { useEffect, useState } from "react";
import {
  Landmark,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  QrCode,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users2,
  Receipt,
} from "lucide-react";
import { bankingService, BankAccount, BankingCashFlowSummary, CashDrawerSession } from "@/services/banking-services";
import { partyService } from "@/services/party-services";
import { PartyList } from "@/types";

export default function BankingAccountsPage() {
  const [summary, setSummary] = useState<BankingCashFlowSummary | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [parties, setParties] = useState<PartyList[]>([]);
  const [drawerSession, setDrawerSession] = useState<CashDrawerSession | null>(null);
  const [loading, setLoading] = useState(true);

  // New Account Modal
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [isDefault, setIsDefault] = useState(false);

  // Inward Receipt Modal
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptPartyId, setReceiptPartyId] = useState("");
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptMode, setReceiptMode] = useState<number>(4); // Bank Transfer
  const [receiptBankAccountId, setReceiptBankAccountId] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");

  // Cash Drawer Modal
  const [isDrawerOpenModal, setIsDrawerOpenModal] = useState(false);
  const [isDrawerCloseModal, setIsDrawerCloseModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState<number>(2000);
  const [actualClosingCash, setActualClosingCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState("");

  const [notification, setNotification] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, accsRes, partRes] = await Promise.all([
        bankingService.getCashFlowSummary().catch(() => null),
        bankingService.getAccounts().catch(() => []),
        partyService.getParties({ pageSize: 100 }).catch(() => ({ items: [] })),
      ]);

      setSummary(sumRes);
      setAccounts(accsRes || []);
      setParties(partRes.items || []);

      if (accsRes?.length > 0) setReceiptBankAccountId(accsRes[0].id);
      if (partRes.items?.length > 0) setReceiptPartyId(partRes.items[0].id);

      try {
        const session = await bankingService.getCurrentDrawerSession();
        setDrawerSession(session);
      } catch {
        setDrawerSession(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      alert("Please enter account name.");
      return;
    }

    try {
      await bankingService.createAccount({
        accountName,
        bankName,
        accountNumber,
        ifscCode,
        branchName,
        upiId,
        openingBalance,
        isDefault,
      });

      setIsAddAccountOpen(false);
      setAccountName("");
      setBankName("");
      setAccountNumber("");
      setIfscCode("");
      setUpiId("");
      setOpeningBalance(0);
      setNotification("Bank account created successfully!");
      loadData();
    } catch {
      alert("Failed to create bank account.");
    }
  };

  const handleRecordReceipt = async () => {
    if (!receiptPartyId || receiptAmount <= 0) {
      alert("Please select party and valid amount.");
      return;
    }

    try {
      const res = await bankingService.recordCustomerReceipt({
        partyId: receiptPartyId,
        paymentDate: new Date().toISOString().slice(0, 10),
        amount: receiptAmount,
        paymentMode: receiptMode,
        bankAccountId: receiptBankAccountId || undefined,
        referenceNumber: receiptRef,
        notes: receiptNotes,
      });

      setIsReceiptOpen(false);
      setReceiptAmount(0);
      setReceiptRef("");
      setReceiptNotes("");
      setNotification(`Recorded payment receipt ${res.voucherNumber} for ₹${res.amount}!`);
      loadData();
    } catch {
      alert("Failed to record payment receipt.");
    }
  };

  const handleOpenDrawer = async () => {
    try {
      const session = await bankingService.openDrawerSession({
        openingFloat,
        notes: "Shift opening float",
      });
      setDrawerSession(session);
      setIsDrawerOpenModal(false);
      setNotification("Cash drawer shift opened successfully!");
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to open cash drawer.");
    }
  };

  const handleCloseDrawer = async () => {
    try {
      const session = await bankingService.closeDrawerSession({
        actualClosingCash,
        closingNotes,
      });
      setDrawerSession(null);
      setIsDrawerCloseModal(false);
      setNotification(`Shift closed! Expected: ₹${session.expectedClosingCash}, Actual: ₹${session.actualClosingCash}`);
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to close cash drawer.");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Landmark className="w-7 h-7 text-indigo-400" />
            <span>Banking, Cash & Multi-Mode Payments</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Bank account reconciliations, UPI payment routes, direct customer receipts, and POS cash drawer floats.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsReceiptOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Inward Receipt Voucher</span>
          </button>

          <button
            onClick={() => setIsAddAccountOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bank Account</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Cash Flow KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Liquid Funds</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            ₹{(summary?.totalLiquidFunds || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Bank + Cash In Hand</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Bank Balance</span>
            <Landmark className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            ₹{(summary?.totalBankBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across all bank accounts</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Inflow This Month</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            ₹{(summary?.inflowThisMonth || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Customer payment receipts</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Outflow & Expenses</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
            ₹{(summary?.outflowThisMonth || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Vendor payments + Expenses</div>
        </div>
      </div>

      {/* Main Grid: Bank Accounts & POS Cash Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Bank Account Cards */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Connected Bank Accounts & Payment Channels ({accounts.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3 relative overflow-hidden shadow-xl"
              >
                {acc.isDefault && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Primary / Default
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-indigo-400">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{acc.accountName}</h3>
                    <div className="text-xs text-slate-400">{acc.bankName || "Commercial Bank"}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 font-mono pt-2 border-t border-slate-850">
                  {acc.accountNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">A/c No:</span>
                      <span className="text-white">•••• {acc.accountNumber.slice(-4)}</span>
                    </div>
                  )}
                  {acc.ifscCode && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">IFSC:</span>
                      <span className="text-indigo-300">{acc.ifscCode}</span>
                    </div>
                  )}
                  {acc.upiId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">UPI ID:</span>
                      <span className="text-emerald-400">{acc.upiId}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Current Balance:</span>
                  <span className="font-mono font-bold text-base text-emerald-400">
                    ₹{acc.currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: POS Cash Drawer Reconciliation */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            POS Cash Drawer Float
          </h2>

          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 shadow-xl">
            {drawerSession ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400">Shift Active</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Opened {new Date(drawerSession.openedAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div className="space-y-2 text-xs divide-y divide-slate-850">
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-400">Opening Float:</span>
                    <span className="font-mono text-white font-semibold">₹{drawerSession.openingFloat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-slate-400">Cash Sales:</span>
                    <span className="font-mono text-emerald-400 font-semibold">+₹{drawerSession.cashSalesTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-slate-400">Cash Receipts:</span>
                    <span className="font-mono text-emerald-400 font-semibold">+₹{drawerSession.cashReceiptsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-slate-400">Cash Payouts / Expenses:</span>
                    <span className="font-mono text-rose-400 font-semibold">-₹{drawerSession.cashPayoutsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-white font-bold">
                    <span>Expected in Drawer:</span>
                    <span className="font-mono text-emerald-400 text-sm">₹{drawerSession.expectedClosingCash.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActualClosingCash(drawerSession.expectedClosingCash);
                    setIsDrawerCloseModal(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all"
                >
                  Close Shift & Count Cash
                </button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <Wallet className="w-10 h-10 mx-auto text-slate-600" />
                <div className="text-xs text-slate-400">
                  No active cash drawer session for your counter.
                </div>
                <button
                  onClick={() => setIsDrawerOpenModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all"
                >
                  Open Shift with Cash Float
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inward Receipt Modal */}
      {isReceiptOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden space-y-4 p-6">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              <span>Record Inward Customer Payment Receipt</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Customer / Debtor Party</label>
                <select
                  value={receiptPartyId}
                  onChange={(e) => setReceiptPartyId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                >
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.legalName} ({p.code}) — Balance: ₹{p.currentOutstandingBalance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Receipt Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm font-bold text-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Payment Mode</label>
                  <select
                    value={receiptMode}
                    onChange={(e) => setReceiptMode(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  >
                    <option value={1}>Cash</option>
                    <option value={2}>UPI</option>
                    <option value={3}>Card</option>
                    <option value={4}>Bank Transfer / NEFT / IMPS</option>
                    <option value={5}>Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Deposit To Bank Account</label>
                <select
                  value={receiptBankAccountId}
                  onChange={(e) => setReceiptBankAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                >
                  <option value="">None / Direct Petty Cash</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({a.bankName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Reference / UTR No.</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-982181"
                    value={receiptRef}
                    onChange={(e) => setReceiptRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Part invoice settlement"
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setIsReceiptOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordReceipt}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30"
              >
                Record Receipt & Credit Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden space-y-4 p-6">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <Landmark className="w-4 h-4 text-indigo-400" />
              <span>Add New Bank Account / Channel</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Account Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Current A/c"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 50200012345678"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC0000123"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">UPI ID</label>
                  <input
                    type="text"
                    placeholder="e.g. company@hdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setIsAddAccountOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
              >
                Save Bank Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Drawer Modal */}
      {isDrawerOpenModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-indigo-400" />
              <span>Open POS Cash Drawer Shift</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Opening Cash Float (₹)</label>
                <input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-base font-bold text-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setIsDrawerOpenModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleOpenDrawer}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
              >
                Open Cash Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Drawer Modal */}
      {isDrawerCloseModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-rose-400" />
              <span>End Shift & Cash Count Reconciliation</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Actual Physical Cash Counted (₹)</label>
                <input
                  type="number"
                  value={actualClosingCash}
                  onChange={(e) => setActualClosingCash(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-base font-bold text-amber-400"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Closing Notes</label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setIsDrawerCloseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseDrawer}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30"
              >
                Finalize & Close Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
