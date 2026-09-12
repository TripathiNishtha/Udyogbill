"use client";

import { useEffect, useState } from "react";
import {
  Users2,
  Percent,
  Receipt,
  Search,
  Plus,
  ArrowDownRight,
  Landmark,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  WalletCards,
  ChevronRight
} from "lucide-react";
import { brokerService, BrokerItem, BrokerCommissionEntry, BrokerSummary } from "@/services/party-services";
import { bankingService, BankAccount } from "@/services/banking-services";

export default function BrokersPage() {
  const [activeTab, setActiveTab] = useState<"brokers" | "commissions">("brokers");
  const [brokers, setBrokers] = useState<BrokerItem[]>([]);
  const [summaries, setSummaries] = useState<BrokerSummary[]>([]);
  const [commissions, setCommissions] = useState<BrokerCommissionEntry[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create Broker Modal
  const [isAddBrokerOpen, setIsAddBrokerOpen] = useState(false);
  const [brokerCode, setBrokerCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [commissionBasis, setCommissionBasis] = useState<number>(1); // % of Taxable
  const [defaultRate, setDefaultRate] = useState<number>(2.0);
  const [tdsPercent, setTdsPercent] = useState<number>(5.0); // 194H
  const [notes, setNotes] = useState("");

  // Payout Modal
  const [selectedBroker, setSelectedBroker] = useState<BrokerItem | null>(null);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState("BankTransfer");
  const [payoutBankAccountId, setPayoutBankAccountId] = useState("");
  const [payoutRef, setPayoutRef] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");

  const [notification, setNotification] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [brkRes, sumRes, commRes, accRes] = await Promise.all([
        brokerService.getBrokers({ searchTerm: searchTerm || undefined, pageSize: 50 }).catch(() => ({ items: [], totalCount: 0 })),
        brokerService.getSummaries().catch(() => []),
        brokerService.getCommissions({ pageSize: 50 }).catch(() => ({ items: [], totalCount: 0 })),
        bankingService.getAccounts().catch(() => [])
      ]);

      setBrokers(brkRes.items || []);
      setSummaries(sumRes || []);
      setCommissions(commRes.items || []);
      setAccounts(accRes || []);

      if (accRes.length > 0 && !payoutBankAccountId) {
        setPayoutBankAccountId(accRes[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerCode || !fullName) {
      alert("Broker code and full name are required.");
      return;
    }

    try {
      await brokerService.createBroker({
        brokerCode,
        fullName,
        mobile,
        email,
        address,
        pan,
        gstin,
        commissionBasis,
        defaultCommissionRate: defaultRate,
        tdsPercent,
        notes
      });
      setIsAddBrokerOpen(false);
      setBrokerCode("");
      setFullName("");
      setMobile("");
      setNotification("Broker master registered successfully.");
      setTimeout(() => setNotification(""), 4000);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to create broker.");
    }
  };

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBroker || payoutAmount <= 0) return;

    try {
      await brokerService.payCommission({
        brokerId: selectedBroker.id,
        amount: payoutAmount,
        paymentMode,
        bankAccountId: payoutBankAccountId || undefined,
        referenceNumber: payoutRef,
        notes: payoutNotes
      });
      setIsPayoutOpen(false);
      setSelectedBroker(null);
      setPayoutAmount(0);
      setNotification(`Payout of ₹${payoutAmount} to ${selectedBroker.fullName} recorded.`);
      setTimeout(() => setNotification(""), 4000);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Payout failed.");
    }
  };

  const totalOutstandingCommissions = brokers.reduce((acc, b) => acc + b.currentPayableBalance, 0);
  const totalAccruedAll = summaries.reduce((acc, s) => acc + s.totalAccrued, 0);
  const totalPaidAll = summaries.reduce((acc, s) => acc + s.totalPaid, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users2 className="w-7 h-7 text-indigo-600" />
            Brokers & Commission Agents
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mandis, FMCG & Wholesale Brokerage Master, Automatic Invoice Accruals, TDS (Sec 194H), and Payouts
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
            onClick={() => setIsAddBrokerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Broker / Agent
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
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Payable Commission</span>
            <WalletCards className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-amber-600 dark:text-amber-400">₹{totalOutstandingCommissions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-500 mt-1">Pending payout across {brokers.length} brokers</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Accrued (All-time)</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">₹{totalAccruedAll.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-500 mt-1">Earned via invoices brokered</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Settled / Paid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">₹{totalPaidAll.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-500 mt-1">Disbursed to date</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("brokers")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === "brokers"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Brokers Master ({brokers.length})
        </button>
        <button
          onClick={() => setActiveTab("commissions")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === "commissions"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Commission Log & Ledger ({commissions.length})
        </button>
      </div>

      {/* Tab Content: Brokers Master */}
      {activeTab === "brokers" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search broker by name, code, mobile, or PAN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Broker Code & Name</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Commission Rules</th>
                    <th className="p-3">TDS (194H)</th>
                    <th className="p-3">Current Payable</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">Loading brokers...</td>
                    </tr>
                  ) : brokers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">No brokers registered yet.</td>
                    </tr>
                  ) : (
                    brokers.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{b.fullName}</div>
                          <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{b.brokerCode}</div>
                        </td>
                        <td className="p-3 text-xs">
                          <div>{b.mobile || "—"}</div>
                          <div className="text-slate-400">{b.email || ""}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {b.defaultCommissionRate}%
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {b.commissionBasis === 1 ? "% of Taxable" : b.commissionBasis === 2 ? "% of Total Bill" : "Per Unit"}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {b.tdsPercent}% TDS
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            ₹{b.currentPayableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600"}`}>
                            {b.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedBroker(b);
                              setPayoutAmount(b.currentPayableBalance > 0 ? b.currentPayableBalance : 0);
                              setIsPayoutOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 transition"
                          >
                            Disburse Payout
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Commissions Log */}
      {activeTab === "commissions" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Broker</th>
                  <th className="p-3">Invoice / Document</th>
                  <th className="p-3">Customer / Trader</th>
                  <th className="p-3">Taxable Base</th>
                  <th className="p-3">Gross Comm.</th>
                  <th className="p-3">TDS (194H)</th>
                  <th className="p-3">Net Payable</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">No commission entries recorded yet.</td>
                  </tr>
                ) : (
                  commissions.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                        {new Date(e.transactionDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{e.brokerName}</td>
                      <td className="p-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                        {e.salesInvoiceNumber || e.paymentReference || "—"}
                      </td>
                      <td className="p-3 text-xs">{e.partyName || "—"}</td>
                      <td className="p-3 text-xs">₹{e.baseAmount.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-xs">₹{e.grossCommissionAmount.toLocaleString("en-IN")} ({e.commissionRate}%)</td>
                      <td className="p-3 text-xs text-rose-600">-₹{e.tdsAmount.toLocaleString("en-IN")}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        ₹{e.netCommissionPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          e.status === 1 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" :
                          e.status === 3 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" :
                          e.status === 4 ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {e.status === 1 ? "Accrued" : e.status === 3 ? "Paid" : e.status === 4 ? "Adjusted on Return" : "Approved"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Broker */}
      {isAddBrokerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users2 className="w-5 h-5 text-indigo-600" />
                Register New Broker / Commission Agent
              </h3>
              <button onClick={() => setIsAddBrokerOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateBroker} className="p-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Broker Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BRK-001"
                    value={brokerCode}
                    onChange={(e) => setBrokerCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra & Sons"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Mobile</label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="broker@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">PAN (for TDS 194H)</label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="15-digit GSTIN"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Commission Basis</label>
                  <select
                    value={commissionBasis}
                    onChange={(e) => setCommissionBasis(Number(e.target.value))}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                  >
                    <option value="1">% of Taxable</option>
                    <option value="2">% of Total Bill</option>
                    <option value="3">Fixed / Unit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Default Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultRate}
                    onChange={(e) => setDefaultRate(Number(e.target.value))}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">TDS Rate (Sec 194H)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tdsPercent}
                    onChange={(e) => setTdsPercent(Number(e.target.value))}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddBrokerOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Save Broker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Payout Disbursal */}
      {isPayoutOpen && selectedBroker && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <WalletCards className="w-5 h-5 text-indigo-600" />
              Disburse Commission to {selectedBroker.fullName}
            </h3>
            <p className="text-xs text-slate-500">
              Current outstanding payable: <b className="text-amber-600">₹{selectedBroker.currentPayableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b>
            </p>

            <form onSubmit={handlePayout} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Disbursal Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="BankTransfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              {paymentMode !== "Cash" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">From Bank Account</label>
                  <select
                    value={payoutBankAccountId}
                    onChange={(e) => setPayoutBankAccountId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.accountName} - Bal: ₹{acc.currentBalance.toLocaleString("en-IN")}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Transaction Ref / Cheque No</label>
                <input
                  type="text"
                  placeholder="e.g. UTR / Cheque #00123"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayoutOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
