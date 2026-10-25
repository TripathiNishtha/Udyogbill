"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  BookOpen,
  FolderTree,
  FileText,
  Scale,
  Calendar,
  Landmark,
  PieChart,
  ArrowRight,
  Sparkles,
  Command,
  X
} from "lucide-react";
import { accountingService, AccountGroup, LedgerAccount } from "@/services/accounting-services";

interface AccountingOmnibarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLedger?: (accountId: string) => void;
  onSelectGroup?: (groupId: string) => void;
}

interface SearchItem {
  id: string;
  type: "report" | "ledger" | "group" | "action";
  title: string;
  subtitle: string;
  badge?: string;
  href?: string;
  accountId?: string;
  groupId?: string;
}

export default function AccountingOmnibar({
  isOpen,
  onClose,
  onSelectLedger,
  onSelectGroup
}: AccountingOmnibarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(0);
      return;
    }

    let isMounted = true;
    setLoading(true);

    Promise.all([
      accountingService.getAccountGroups().catch(() => []),
      accountingService.getLedgerAccounts().catch(() => [])
    ])
      .then(([g, a]) => {
        if (isMounted) {
          setGroups(g);
          setAccounts(a);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
  }, [isOpen]);

  const defaultReports: SearchItem[] = [
    {
      id: "rep-bs",
      type: "report",
      title: "Balance Sheet (Schedule III)",
      subtitle: "Liabilities, Assets, Equity & Net Working Capital",
      badge: "Statement",
      href: "/app/accounting/reports?tab=balance-sheet"
    },
    {
      id: "rep-pnl",
      type: "report",
      title: "Profit & Loss Account (P&L)",
      subtitle: "Trading Account, Gross Profit, Indirect Expenses & Net Margin",
      badge: "Statement",
      href: "/app/accounting/reports?tab=pnl"
    },
    {
      id: "rep-tb",
      type: "report",
      title: "Trial Balance (4-Column)",
      subtitle: "Opening, Inward/Outward movements, and Closing balances",
      badge: "Audit",
      href: "/app/accounting/reports?tab=trial-balance"
    },
    {
      id: "rep-daybook",
      type: "report",
      title: "Day Book Register",
      subtitle: "Chronological daily journal of all transactions and vouchers",
      badge: "Daily",
      href: "/app/accounting/reports?tab=daybook"
    },
    {
      id: "rep-cashbank",
      type: "report",
      title: "Cash & Bank Summary Book",
      subtitle: "Cash in hand, current accounts, overdrafts, and receipts",
      badge: "Liquidity",
      href: "/app/accounting/reports?tab=cash-bank"
    },
    {
      id: "act-new-vch",
      type: "action",
      title: "+ Create New Voucher Entry",
      subtitle: "Contra (F4), Payment (F5), Receipt (F6), Journal (F7)",
      badge: "Voucher",
      href: "/app/accounting/vouchers?action=new"
    },
    {
      id: "act-coa-tree",
      type: "action",
      title: "Chart of Accounts (Master Tree)",
      subtitle: "28 Canonical Groups & General Ledger Account Hierarchy",
      badge: "Master",
      href: "/app/accounting/coa"
    }
  ];

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return defaultReports;

    const filteredReports = defaultReports.filter(
      (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)
    );

    const filteredLedgers: SearchItem[] = accounts
      .filter((a) => a.accountName.toLowerCase().includes(q) || a.accountCode.toLowerCase().includes(q))
      .slice(0, 8)
      .map((a) => ({
        id: `acc-${a.id}`,
        type: "ledger",
        title: a.accountName,
        subtitle: `${a.accountCode} • Group: ${a.groupName} • Bal: ₹${Number(a.currentBalance || 0).toLocaleString("en-IN")}`,
        badge: a.category,
        accountId: a.id
      }));

    const filteredGroups: SearchItem[] = groups
      .filter((g) => g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q))
      .slice(0, 5)
      .map((g) => ({
        id: `grp-${g.id}`,
        type: "group",
        title: g.name,
        subtitle: `${g.code} • ${g.category} Group (${g.nature})`,
        badge: "Group",
        groupId: g.id
      }));

    return [...filteredReports, ...filteredLedgers, ...filteredGroups];
  }, [query, accounts, groups]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  const handleSelect = (item: SearchItem) => {
    onClose();
    if (item.accountId && onSelectLedger) {
      onSelectLedger(item.accountId);
    } else if (item.groupId && onSelectGroup) {
      onSelectGroup(item.groupId);
    } else if (item.href) {
      router.push(item.href);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % searchResults.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelect(searchResults[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, searchResults, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-xs flex items-start justify-center pt-20 p-4 transition-opacity">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-3 bg-slate-50/50 dark:bg-slate-950/40">
          <Search className="w-5 h-5 text-orange-600 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Go To: Type account name, group, voucher #, or report (Alt+G)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-mono font-bold">
            <Command className="w-3 h-3" />
            <span>ESC</span>
          </span>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              No matching ledger, group, or financial report found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? "bg-orange-50 dark:bg-orange-950/40 text-orange-950 dark:text-orange-100"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        item.type === "report"
                          ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                          : item.type === "ledger"
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                          : item.type === "group"
                          ? "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400"
                          : "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
                      }`}
                    >
                      {item.type === "report" && <Scale className="w-4 h-4" />}
                      {item.type === "ledger" && <BookOpen className="w-4 h-4" />}
                      {item.type === "group" && <FolderTree className="w-4 h-4" />}
                      {item.type === "action" && <Sparkles className="w-4 h-4" />}
                    </div>

                    <div className="truncate text-xs">
                      <div className="font-bold flex items-center space-x-2">
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition ${
                      isSelected ? "text-orange-600 translate-x-1" : "text-slate-300 dark:text-slate-600"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center space-x-3">
            <span>
              Use <strong className="font-mono text-slate-600 dark:text-slate-300">↑↓</strong> to navigate
            </span>
            <span>
              <strong className="font-mono text-slate-600 dark:text-slate-300">Enter</strong> to select
            </span>
          </div>
          <span>
            Shortcut: <strong className="font-mono text-slate-600 dark:text-slate-300">Alt + G</strong> anywhere
          </span>
        </div>
      </div>
    </div>
  );
}
