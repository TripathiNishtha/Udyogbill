"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  ArrowLeft,
  CheckCircle,
  FolderTree,
  X,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowUpRight,
  Landmark,
  Building2,
  Percent,
  HelpCircle,
  ShieldCheck,
  Command,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import {
  accountingService,
  AccountGroup,
  AccountGroupTreeNode,
  LedgerAccount
} from "@/services/accounting-services";
import VoucherSlideOverDrawer from "../components/VoucherSlideOverDrawer";
import LedgerStatementModal from "../components/LedgerStatementModal";
import AccountingOmnibar from "../components/AccountingOmnibar";

export default function ChartOfAccountsPage() {
  const [treeGroups, setTreeGroups] = useState<AccountGroupTreeNode[]>([]);
  const [flatGroups, setFlatGroups] = useState<AccountGroup[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Expanded Tree Node IDs
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Slide-over & Modal States
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [isOmnibarOpen, setIsOmnibarOpen] = useState(false);

  // Create Ledger Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [accName, setAccName] = useState("");
  const [accCode, setAccCode] = useState("");
  const [accGroupId, setAccGroupId] = useState("");
  const [accCategory, setAccCategory] = useState("Asset");
  const [openingBal, setOpeningBal] = useState<number>(0);
  const [balanceType, setBalanceType] = useState<"Debit" | "Credit">("Debit");
  const [description, setDescription] = useState("");
  const [isBillWise, setIsBillWise] = useState(false);
  const [isCostCentres, setIsCostCentres] = useState(false);
  const [defaultTaxRate, setDefaultTaxRate] = useState<number | undefined>(undefined);
  const [gstin, setGstin] = useState("");
  const [state, setState] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccNumber, setBankAccNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tree, flat, accs] = await Promise.all([
        accountingService.getAccountGroupsTree(),
        accountingService.getAccountGroups(),
        accountingService.getLedgerAccounts()
      ]);
      setTreeGroups(tree);
      setFlatGroups(flat);
      setAccounts(accs);

      // Auto-expand top level nodes
      const initialExp: Record<string, boolean> = {};
      tree.forEach((node) => {
        initialExp[node.id] = true;
        node.subGroups.forEach((sub) => {
          initialExp[sub.id] = true;
        });
      });
      setExpandedNodes(initialExp);

      if (flat.length > 0 && !accGroupId) {
        setAccGroupId(flat[0].id);
      }
    } catch (err) {
      console.error("Failed to load COA data", err);
    } finally {
      setLoading(false);
    }
  }, [accGroupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Global Keyboard Shortcuts (Alt+G, Alt+C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && (e.key === "g" || e.key === "G")) || ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K"))) {
        e.preventDefault();
        setIsOmnibarOpen(true);
      } else if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setIsCreateOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleExpandAll = () => {
    const allExp: Record<string, boolean> = {};
    const recurse = (nodes: AccountGroupTreeNode[]) => {
      nodes.forEach((n) => {
        allExp[n.id] = true;
        if (n.subGroups.length > 0) recurse(n.subGroups);
      });
    };
    recurse(treeGroups);
    setExpandedNodes(allExp);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  const openCreateForGroup = (groupId: string) => {
    const g = flatGroups.find((x) => x.id === groupId);
    setAccGroupId(groupId);
    if (g) {
      setAccCategory(g.category);
      setBalanceType(g.nature as "Debit" | "Credit");
    }
    setIsCreateOpen(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    try {
      setSubmitting(true);
      const grp = flatGroups.find((g) => g.id === accGroupId) || flatGroups[0];
      const autoCode = accCode.trim() || `${grp.code.replace("GRP-", "").substring(0, 3)}-${Math.floor(100 + Math.random() * 900)}`;

      await accountingService.createLedgerAccount({
        accountCode: autoCode,
        accountName: accName.trim(),
        groupId: grp.id,
        category: grp.category,
        openingBalance: Number(openingBal) || 0,
        balanceType,
        description: description.trim() || undefined,
        isBillWiseApplicable: isBillWise,
        isCostCentresApplicable: isCostCentres,
        defaultTaxRate: defaultTaxRate ? Number(defaultTaxRate) : undefined,
        gstin: gstin.trim() || undefined,
        state: state.trim() || undefined,
        panNumber: panNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        bankAccountNumber: bankAccNumber.trim() || undefined,
        bankIfscCode: bankIfsc.trim() || undefined,
        bankBranch: bankBranch.trim() || undefined
      });

      setIsCreateOpen(false);
      resetCreateForm();
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setAccName("");
    setAccCode("");
    setOpeningBal(0);
    setDescription("");
    setIsBillWise(false);
    setIsCostCentres(false);
    setDefaultTaxRate(undefined);
    setGstin("");
    setState("");
    setPanNumber("");
    setBankName("");
    setBankAccNumber("");
    setBankIfsc("");
    setBankBranch("");
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesSearch =
        acc.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.groupName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCategory === "All" || acc.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [accounts, searchTerm, selectedCategory]);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "Asset":
        return "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800";
      case "Liability":
        return "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800";
      case "Equity":
        return "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800";
      case "Revenue":
        return "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800";
      case "Expense":
        return "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800";
      default:
        return "text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
    }
  };

  const renderTreeNode = (node: AccountGroupTreeNode, depth: number = 0) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.subGroups.length > 0 || node.ledgers.length > 0;

    return (
      <div key={node.id} className="text-xs select-none">
        {/* Group Header Row */}
        <div
          className={`group flex items-center justify-between py-2.5 px-3 rounded-xl border transition ${
            depth === 0
              ? "bg-slate-100/90 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 font-bold text-slate-900 dark:text-white mb-1 shadow-2xs"
              : "bg-slate-50/70 dark:bg-slate-900/60 border-slate-150 dark:border-slate-800/60 font-semibold text-slate-800 dark:text-slate-200 mb-1 hover:bg-slate-100/70"
          }`}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <div className="flex items-center space-x-2 truncate">
            <button
              onClick={() => toggleNode(node.id)}
              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )
              ) : (
                <div className="w-4 h-4" />
              )}
            </button>

            <FolderTree
              className={`w-4 h-4 shrink-0 ${depth === 0 ? "text-orange-600" : "text-slate-400"}`}
            />

            <span className="truncate">{node.name}</span>

            <span className="font-mono text-[10px] text-slate-400 font-normal">({node.code})</span>

            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider border ${getCategoryBadge(node.category)}`}>
              {node.category}
            </span>

            <span className="text-[10px] text-slate-400 font-mono">
              [{node.ledgerCount} accounts]
            </span>
          </div>

          <div className="flex items-center space-x-4 shrink-0">
            {/* Rolled-up Balance */}
            <div className="text-right font-mono text-[11px]">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                ₹{Number(node.netBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-sans font-normal text-slate-400 ml-1">
                {node.balanceType}
              </span>
            </div>

            {/* Quick Add Ledger in Group */}
            <button
              onClick={() => openCreateForGroup(node.id)}
              className="opacity-0 group-hover:opacity-100 transition p-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
              title={`Create ledger account under ${node.name}`}
            >
              <Plus className="w-3 h-3" />
              <span>Add Ledger</span>
            </button>
          </div>
        </div>

        {/* Children Render */}
        {isExpanded && (
          <div className="space-y-1">
            {/* Sub-groups */}
            {node.subGroups.map((sub) => renderTreeNode(sub, depth + 1))}

            {/* Direct Ledgers under this Group */}
            {node.ledgers.map((acc) => (
              <div
                key={acc.id}
                onClick={() => setSelectedLedgerId(acc.id)}
                className="group flex items-center justify-between py-2 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                style={{ marginLeft: `${(depth + 1) * 20}px` }}
                title="Click to view 12-Month Financial Summary & Voucher Register"
              >
                <div className="flex items-center space-x-2 truncate">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  </div>
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                    {acc.accountName}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 font-semibold">
                    {acc.accountCode}
                  </span>
                  {acc.isBillWiseApplicable && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                      Bill-Wise
                    </span>
                  )}
                  {acc.bankAccountNumber && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center space-x-1">
                      <Landmark className="w-2.5 h-2.5" />
                      <span>{acc.bankName || "Bank"}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="font-mono font-bold text-[11px] text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    ₹{Number(acc.currentBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {acc.balanceType}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
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
                Chart of Accounts (COA)
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-600 text-[10px] font-black uppercase tracking-wider">
                28 Canonical Groups Standard
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Companies Act Schedule III & Tally Prime Gold Master Hierarchy with 360° Infinite Linking
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          {/* Alt+G Omnibar Button */}
          <button
            onClick={() => setIsOmnibarOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Go to any account, group or report (Alt+G)"
          >
            <Search className="w-3.5 h-3.5 text-orange-600" />
            <span>Go To</span>
            <span className="font-mono text-[10px] text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.2 rounded border">
              Alt+G
            </span>
          </button>

          {/* Sync Migrated Bills */}
          <Link
            href="/app/accounting"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Sync historical bills"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
            <span>Sync Bills</span>
          </Link>

          {/* Create Ledger Account */}
          <button
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
            title="Shortcut: Alt+C"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Ledger</span>
            <span className="font-mono text-[10px] opacity-80 bg-orange-700 px-1 rounded">Alt+C</span>
          </button>
        </div>
      </div>

      {/* Control Bar: View Toggle, Filters, Search, Expand/Collapse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
        <div className="flex items-center space-x-3 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 font-bold">
            <button
              onClick={() => setViewMode("tree")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === "tree"
                  ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Hierarchical Tree</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flat Master Table</span>
            </button>
          </div>

          {viewMode === "tree" && (
            <div className="flex items-center space-x-1">
              <button
                onClick={handleExpandAll}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex items-center space-x-1 overflow-x-auto">
            {["All", "Asset", "Liability", "Equity", "Revenue", "Expense"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search account, code, or group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-medium"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <p className="text-xs text-slate-500 font-medium">Assembling 28-Group Chart of Accounts Hierarchy...</p>
        </div>
      ) : viewMode === "tree" ? (
        /* Tree View */
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Primary & Secondary Account Group Hierarchy</span>
            <span>Net Rolled-up Balance (₹)</span>
          </div>

          <div className="space-y-2 pt-2">
            {treeGroups
              .filter((g) => selectedCategory === "All" || g.category === selectedCategory)
              .map((root) => renderTreeNode(root, 0))}
          </div>
        </div>
      ) : (
        /* Flat Master Table View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Account Code</th>
                <th className="py-3 px-4">Ledger Account Title</th>
                <th className="py-3 px-4">Account Group</th>
                <th className="py-3 px-4 text-center">Category</th>
                <th className="py-3 px-4 text-right">Current Balance (₹)</th>
                <th className="py-3 px-4 text-center">Nature</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No accounts found matching your query.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    onClick={() => setSelectedLedgerId(acc.id)}
                    className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition group"
                    title="Click to view 12-Month Financial Summary & Voucher Register"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                      {acc.accountCode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center space-x-1.5">
                        <span>{acc.accountName}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      {acc.description && (
                        <p className="text-[11px] text-slate-400 truncate max-w-sm">{acc.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                      {acc.groupName}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadge(acc.category)}`}>
                        {acc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      ₹{Number(acc.currentBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] font-bold text-slate-500">
                      {acc.balanceType}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

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
        onSelectGroup={(grpId) => {
          setExpandedNodes((prev) => ({ ...prev, [grpId]: true }));
        }}
      />

      {/* Create Ledger Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-black text-base">
                <BookOpen className="w-5 h-5 text-orange-600" />
                <span>Create General Ledger Account</span>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              {/* Account Name */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                  Account Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank Current A/c, Vikas Trading Co, Staff Salaries"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:bg-white focus:outline-none focus:border-orange-500 text-xs"
                />
              </div>

              {/* Group & Code Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Under Group (28 Canonical Hierarchy) *
                  </label>
                  <select
                    value={accGroupId}
                    onChange={(e) => {
                      const gid = e.target.value;
                      setAccGroupId(gid);
                      const g = flatGroups.find((x) => x.id === gid);
                      if (g) {
                        setAccCategory(g.category);
                        setBalanceType(g.nature as "Debit" | "Credit");
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white focus:outline-none text-xs font-medium cursor-pointer"
                  >
                    {flatGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code} • {g.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Custom Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ACC-HDFC-01"
                    value={accCode}
                    onChange={(e) => setAccCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-orange-600 font-mono font-bold focus:bg-white focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Opening Balance */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={openingBal || ""}
                    onChange={(e) => setOpeningBal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Balance Nature
                  </label>
                  <select
                    value={balanceType}
                    onChange={(e) => setBalanceType(e.target.value as "Debit" | "Credit")}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none text-xs font-mono font-medium cursor-pointer"
                  >
                    <option value="Debit">Debit (Dr - Asset / Expense)</option>
                    <option value="Credit">Credit (Cr - Liability / Equity / Income)</option>
                  </select>
                </div>
              </div>

              {/* Tally Enterprise Flags: Bill-by-bill & Cost Centres */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBillWise}
                    onChange={(e) => setIsBillWise(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 border-slate-300 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Maintain Bill-by-Bill
                    </span>
                    <span className="text-[10px] text-slate-400">Track agst ref & payment clearance</span>
                  </div>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCostCentres}
                    onChange={(e) => setIsCostCentres(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 border-slate-300 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Cost Centres Applicable
                    </span>
                    <span className="text-[10px] text-slate-400">Department / project allocation</span>
                  </div>
                </label>
              </div>

              {/* Bank Details Accordion (if bank group or selected) */}
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Banking & Party Details (Optional)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Bank Name (e.g. ICICI Bank)"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={bankAccNumber}
                      onChange={(e) => setBankAccNumber(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="IFSC Code"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Party GSTIN"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <input
                  type="text"
                  placeholder="Notes / Description (Optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              {/* Submit Buttons */}
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
                  disabled={submitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving Master..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
