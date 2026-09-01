"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  ArrowLeft,
  CheckCircle,
  FolderTree,
  X
} from "lucide-react";
import { accountingService, AccountGroup, LedgerAccount } from "@/services/accounting-services";

export default function ChartOfAccountsPage() {
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [accName, setAccName] = useState("");
  const [accCode, setAccCode] = useState("");
  const [accGroupId, setAccGroupId] = useState("");
  const [openingBal, setOpeningBal] = useState<number>(0);
  const [balanceType, setBalanceType] = useState<"Debit" | "Credit">("Debit");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [g, a] = await Promise.all([
        accountingService.getAccountGroups(),
        accountingService.getLedgerAccounts()
      ]);
      setGroups(g);
      setAccounts(a);
      if (g.length > 0) setAccGroupId(g[0].id);
    } catch (err) {
      console.error("Failed to load COA", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    try {
      setSubmitting(true);
      const grp = groups.find((g) => g.id === accGroupId) || groups[0];
      const autoCode = accCode.trim() || `${grp.code.substring(0, 2)}${Math.floor(10 + Math.random() * 90)}`;

      await accountingService.createLedgerAccount({
        accountCode: autoCode,
        accountName: accName.trim(),
        groupId: grp.id,
        groupName: grp.name,
        category: grp.category,
        openingBalance: Number(openingBal) || 0,
        balanceType,
        isSystemAccount: false,
        isActive: true
      });

      setIsCreateOpen(false);
      setAccName("");
      setAccCode("");
      setOpeningBal(0);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.groupName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === "All" || acc.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Asset":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "Liability":
        return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "Equity":
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "Revenue":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "Expense":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-slate-400 bg-slate-800";
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
            <h1 className="text-xl font-bold text-white tracking-tight">Chart of Accounts (COA)</h1>
            <p className="text-sm text-slate-400">Master general ledger hierarchy and opening balances</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Ledger Account</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search account name, code, group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex flex-wrap gap-2">
          {["All", "Asset", "Liability", "Equity", "Revenue", "Expense"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                selectedCategory === cat
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Account Code</th>
                <th className="py-3.5 px-4">Ledger Account Name</th>
                <th className="py-3.5 px-4">Primary Group</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Opening Balance</th>
                <th className="py-3.5 px-4 text-right">Current Balance</th>
                <th className="py-3.5 px-4 text-center">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading Chart of Accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No ledger accounts found matching your query.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{acc.accountCode}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{acc.accountName}</div>
                      {acc.isSystemAccount && (
                        <span className="text-[10px] text-slate-400 uppercase font-mono">System Control A/c</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{acc.groupName}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getCategoryColor(acc.category)}`}>
                        {acc.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      ₹{acc.openingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      ₹{acc.currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs font-bold text-slate-400">
                      {acc.balanceType}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>+ Create New General Ledger Account</span>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Account Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Axis Bank Current A/c"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Account Group *</label>
                  <select
                    value={accGroupId}
                    onChange={(e) => setAccGroupId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} - {g.name} ({g.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Custom Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="1103"
                    value={accCode}
                    onChange={(e) => setAccCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-indigo-300 font-mono focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={openingBal || ""}
                    onChange={(e) => setOpeningBal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Balance Nature</label>
                  <select
                    value={balanceType}
                    onChange={(e) => setBalanceType(e.target.value as "Debit" | "Credit")}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none text-xs font-mono"
                  >
                    <option value="Debit">Debit (Asset / Expense)</option>
                    <option value="Credit">Credit (Liability / Equity / Income)</option>
                  </select>
                </div>
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
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30"
                >
                  {submitting ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
