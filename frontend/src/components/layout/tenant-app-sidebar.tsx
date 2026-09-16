"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  FileSpreadsheet,
  Users2,
  Building2,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Settings2,
  FileText,
  Receipt,
  Shirt,
  ShieldAlert,
  Activity,
  ShieldCheck,
  Sparkles,
  Factory,
  Landmark,
  Gift,
  MessageSquare,
  Truck,
  Printer,
  Database,
  Search,
  ShoppingCart,
  TrendingUp,
  FolderClosed,
  FolderSync,
  RotateCcw,
  Scale,
  TrendingDown,
  Award,
  Clock,
  FileCheck2,
  X
} from "lucide-react";
import { authService } from "@/services/api-services";
import { tenantAppService, BranchDetails } from "@/services/tenant-app-services";
import { referralService } from "@/services/referral-services";
import { AuthResponse, TenantDetails } from "@/types";
import { NetworkStatusBadge } from "./network-status-badge";
import { ThemeToggle } from "@/components/theme/theme-provider";

import { useAddons } from "@/context/addon-context";

interface NavGroup {
  id: string;
  title: string;
  icon: any;
  items: {
    label: string;
    href: string;
    icon: any;
  }[];
}

const getGroupConfig = (id: string) => {
  switch (id) {
    case "overview":
      return {
        badgeBg: "bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        treeBorder: "border-emerald-300/80 dark:border-emerald-700/60",
        activeRing: "ring-emerald-500/40",
        countBg: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200",
      };
    case "sales":
      return {
        badgeBg: "bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/50 dark:hover:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800/80",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        iconBg: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
        treeBorder: "border-emerald-300 dark:border-emerald-700/60",
        activeRing: "ring-emerald-500/50",
        countBg: "bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200",
      };
    case "banking":
      return {
        badgeBg: "bg-sky-50 hover:bg-sky-100/80 dark:bg-sky-950/50 dark:hover:bg-sky-950/70 text-sky-950 dark:text-sky-200 border-sky-300 dark:border-sky-800/80",
        iconColor: "text-sky-600 dark:text-sky-400",
        iconBg: "bg-sky-500/20 text-sky-700 dark:text-sky-300",
        treeBorder: "border-sky-300 dark:border-sky-700/60",
        activeRing: "ring-sky-500/50",
        countBg: "bg-sky-200/80 dark:bg-sky-900 text-sky-900 dark:text-sky-200",
      };
    case "purchase":
      return {
        badgeBg: "bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/50 dark:hover:bg-amber-950/70 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800/80",
        iconColor: "text-amber-600 dark:text-amber-400",
        iconBg: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
        treeBorder: "border-amber-300 dark:border-amber-700/60",
        activeRing: "ring-amber-500/50",
        countBg: "bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200",
      };
    case "inventory":
      return {
        badgeBg: "bg-purple-50 hover:bg-purple-100/80 dark:bg-purple-950/50 dark:hover:bg-purple-950/70 text-purple-950 dark:text-purple-200 border-purple-300 dark:border-purple-800/80",
        iconColor: "text-purple-600 dark:text-purple-400",
        iconBg: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
        treeBorder: "border-purple-300 dark:border-purple-700/60",
        activeRing: "ring-purple-500/50",
        countBg: "bg-purple-200/80 dark:bg-purple-900 text-purple-900 dark:text-purple-200",
      };
    case "pharma":
    case "pharma-sfa":
      return {
        badgeBg: "bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/50 dark:hover:bg-rose-950/70 text-rose-950 dark:text-rose-200 border-rose-300 dark:border-rose-800/80",
        iconColor: "text-rose-600 dark:text-rose-400",
        iconBg: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
        treeBorder: "border-rose-300 dark:border-rose-700/60",
        activeRing: "ring-rose-500/50",
        countBg: "bg-rose-200/80 dark:bg-rose-900 text-rose-900 dark:text-rose-200",
      };
    case "reports":
      return {
        badgeBg: "bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/50 dark:hover:bg-blue-950/70 text-blue-950 dark:text-blue-200 border-blue-300 dark:border-blue-800/80",
        iconColor: "text-blue-600 dark:text-blue-400",
        iconBg: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
        treeBorder: "border-blue-300 dark:border-blue-700/60",
        activeRing: "ring-blue-500/50",
        countBg: "bg-blue-200/80 dark:bg-blue-900 text-blue-900 dark:text-blue-200",
      };
    case "settings":
      return {
        badgeBg: "bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700",
        iconColor: "text-slate-600 dark:text-slate-400",
        iconBg: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
        treeBorder: "border-slate-300 dark:border-slate-700",
        activeRing: "ring-slate-400/50",
        countBg: "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200",
      };
    default:
      return {
        badgeBg: "bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/50 dark:hover:bg-indigo-950/70 text-indigo-950 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800/80",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        iconBg: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
        treeBorder: "border-indigo-300 dark:border-indigo-700/60",
        activeRing: "ring-indigo-500/50",
        countBg: "bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200",
      };
  }
};

export function TenantAppSidebar({
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}: {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { activeNavGroups } = useAddons();
  const [currentUser, setCurrentUser] = useState<AuthResponse["user"] | null>(null);
  const [profile, setProfile] = useState<TenantDetails | null>(null);
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [referralRewardAmount, setReferralRewardAmount] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("referral_reward_amount");
      if (cached) return Number(cached);
    }
    return null;
  });

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadSidebarData();
    }
  }, []);

  const loadSidebarData = async () => {
    try {
      const [branchesData, profileData, referralSummary] = await Promise.all([
        tenantAppService.getBranches(),
        tenantAppService.getBusinessProfile().catch(() => null),
        referralService.getTenantSummary().catch(() => null),
      ]);
      setBranches(branchesData);
      if (profileData) {
        setProfile(profileData);
      }
      if (referralSummary?.rewardAmount) {
        setReferralRewardAmount(referralSummary.rewardAmount);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("referral_reward_amount", String(referralSummary.rewardAmount));
        }
      }
      if (branchesData.length > 0) {
        const ho = branchesData.find((b) => b.isHeadOffice);
        setSelectedBranch(ho ? ho.id : branchesData[0].id);
      }
    } catch {
      // Fallback
    }
  };

  const navGroups: NavGroup[] = useMemo(() => {
    return [
      {
        id: "overview",
        title: "Overview",
        icon: LayoutDashboard,
        items: [
          { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
        ]
      },
      {
        id: "sales",
        title: "Order-to-Cash (Sales)",
        icon: ShoppingCart,
        items: [
          { label: "Point of Sale (POS)", href: "/app/pos", icon: ShoppingCart },
          { label: "Tax Invoices", href: "/app/sales/invoices", icon: Receipt },
          { label: "Delivery Challans", href: "/app/sales/challans", icon: Truck },
          { label: "Sales Returns", href: "/app/sales/returns", icon: RotateCcw },
          { label: "Quotations & Estimates", href: "/app/sales/quotations", icon: FileSpreadsheet },
          { label: "Customers (Debtors)", href: "/app/parties/customers", icon: Users2 },
          { label: "Brokers & Agents", href: "/app/parties/brokers", icon: Users2 },
          { label: "Loyalty & Promos", href: "/app/loyalty", icon: Gift },
        ]
      },
      {
        id: "banking",
        title: "Banking & Cheques",
        icon: Landmark,
        items: [
          { label: "Bank Accounts & Cash", href: "/app/banking/accounts", icon: Landmark },
          { label: "Cheque & PDC Register", href: "/app/banking/cheques", icon: FileCheck2 },
        ]
      },
      {
        id: "purchase",
        title: "Procure-to-Pay (Purchases)",
        icon: Receipt,
        items: [
          { label: "Vendor Purchase Bills", href: "/app/purchase/bills", icon: Receipt },
          { label: "AI Invoice Scanner", href: "/app/purchase/bills?scan=ai", icon: Sparkles },
          { label: "Purchase Returns", href: "/app/purchase/returns", icon: RotateCcw },
          { label: "Purchase Orders (PO)", href: "/app/purchase/orders", icon: Boxes },
          { label: "Goods Receipt (GRN)", href: "/app/purchase/grn", icon: FileText },
          { label: "Suppliers (Creditors)", href: "/app/parties/suppliers", icon: Building2 },
        ]
      },
      {
        id: "inventory",
        title: "Catalog & Stock",
        icon: Boxes,
        items: [
          { label: "Product Catalog", href: "/app/inventory/items", icon: Boxes },
          { label: "Live Stock Ledger", href: "/app/inventory/stock", icon: FileSpreadsheet },
          { label: "Categories & Brands", href: "/app/inventory/categories", icon: BookOpen },
        ]
      },
      // Dynamically Injected Active Industry Add-ons (e.g. Pharma Core, Pharma SFA, HRM, etc. only when active)
      ...activeNavGroups,
      {
        id: "reports",
        title: "Reports & Intelligence",
        icon: FileSpreadsheet,
        items: [
          { label: "Master Report Center", href: "/app/reports", icon: LayoutDashboard },
          { label: "CA Pack (Audit & Tax)", href: "/app/reports/ca-pack", icon: FileCheck2 },
          { label: "Sales Register", href: "/app/reports/sales", icon: Receipt },
          { label: "Purchase Register", href: "/app/reports/purchases", icon: ShoppingCart },
          { label: "Stock Balance & Valuation", href: "/app/reports/stock", icon: Boxes },
          { label: "True Profit & Loss (P&L)", href: "/app/reports/pnl", icon: Sparkles },
          { label: "GST Returns & Filing", href: "/app/reports/gst", icon: FileText },
        ]
      },
      {
        id: "settings",
        title: "Settings & System",
        icon: Settings2,
        items: [
          { 
            label: `🎁 Refer & Earn ₹${referralRewardAmount ?? 1000}`, 
            href: "/app/referrals", 
            icon: Gift 
          },
          { label: "⚡ 1-Click Data Migration", href: "/app/settings/migration/universal", icon: Database },
          { label: "Plan & Add-ons", href: "/app/settings/addons", icon: Sparkles },
          { label: "Subscription & Invoices", href: "/app/settings/billing", icon: Receipt },
          { label: "Business Settings", href: "/app/settings", icon: Settings2 },
          { label: "Invoice Settings", href: "/app/settings/templates", icon: Printer },
          { label: "Branches & Warehouses", href: "/app/branches", icon: Building2 },
          { label: "Staff & RBAC", href: "/app/staff", icon: ShieldCheck },
          { label: "Backups & System Health", href: "/app/settings/backup", icon: ShieldCheck },
          { label: "Audit & Activity Logs", href: "/app/audit", icon: ShieldAlert },
          { label: "📖 User Manual & Help", href: "/app/help", icon: BookOpen },
        ]
      }
    ];
  }, [activeNavGroups, referralRewardAmount]);

  // Accordion state: which section is currently expanded (null if all closed)
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  // Auto-open group matching active pathname on route change
  useEffect(() => {
    if (!pathname) return;
    const matchingGroup = navGroups.find((g) =>
      g.items.some((item) => pathname === item.href || pathname?.startsWith(item.href + "/"))
    );
    if (matchingGroup) {
      setOpenGroupId(matchingGroup.id);
    }
  }, [pathname, navGroups]);

  const toggleGroup = (groupId: string) => {
    // If currently open group is clicked again, toggle it closed (accordion style)
    // If a different group is clicked, open that one and close the previous one
    setOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

  // Filter groups if search query exists
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return navGroups;
    const q = searchQuery.toLowerCase();
    return navGroups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            g.title.toLowerCase().includes(q)
        )
      }))
      .filter((g) => g.items.length > 0);
  }, [searchQuery, navGroups]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`bg-sidebar border-sidebar-border flex flex-col justify-between shrink-0 h-full select-none transition-all duration-300 ease-in-out z-50 ${
          isOpenMobile
            ? "fixed inset-y-0 left-0 w-64 translate-x-0 shadow-2xl border-r"
            : isCollapsed
            ? "w-0 -translate-x-full overflow-hidden border-none pointer-events-none lg:w-0"
            : "w-64 border-r fixed inset-y-0 left-0 -translate-x-full lg:static lg:translate-x-0"
        }`}
      >
        {/* Brand Header / Quick Menu Search */}
        <div className="shrink-0 p-3 border-b border-sidebar-border bg-sidebar z-10 space-y-2.5">
          {/* Mobile drawer header (only when sidebar is opened on mobile) */}
          <div className="flex items-center justify-between gap-2 lg:hidden">
            <div className="bg-white rounded-xl px-2.5 py-1 shadow-xs border border-border/40 flex items-center justify-center">
              <img
                src="/udyogbill-brand-logo.png"
                alt="UdyogBill"
                className="h-7 w-auto object-contain"
              />
            </div>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Quick Menu Search & Desktop Hide/Collapse Button */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu (e.g. GST, PO)..."
                className="w-full pl-8 pr-6 py-1.5 bg-sidebar-accent/60 border border-sidebar-border rounded-lg text-xs text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-sidebar-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Hide Sidebar (Ctrl+B)"
                className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent border border-sidebar-border transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Groups (Categorized & Scrollable) */}
        <nav className="flex-1 overflow-y-auto min-h-0 p-2.5 space-y-3 bg-sidebar">
          {filteredGroups.map((group) => {
            // In search mode, keep all matching groups open. Otherwise, open ONLY the currently selected group.
            const isCollapsed = searchQuery ? false : openGroupId !== group.id;
            const hasActiveItem = group.items.some(
              (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
            );
            const cfg = getGroupConfig(group.id);
            const GroupIcon = group.icon || LayoutDashboard;

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Header Banner Button */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isCollapsed}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all duration-150 cursor-pointer group ${
                    cfg.badgeBg
                  } ${
                    hasActiveItem ? `ring-2 ${cfg.activeRing} font-extrabold shadow-2xs` : ""
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 shadow-2xs ${cfg.iconBg}`}>
                      <GroupIcon className="w-3.5 h-3.5 shrink-0" />
                    </span>
                    <span className="text-[11px] font-bold tracking-wider uppercase truncate">
                      {group.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${cfg.countBg}`}>
                      {group.items.length}
                    </span>
                    {!searchQuery && (
                      <span className="text-current/60 group-hover:text-current transition-transform">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </button>

                {/* Group Items with Tree Guide Line */}
                {!isCollapsed && (
                  <div className={`ml-3.5 pl-2.5 my-1 border-l-2 ${cfg.treeBorder} space-y-0.5`}>
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onCloseMobile}
                          className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium tracking-normal transition-all ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                              : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/70"
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary-foreground" : cfg.iconColor}`} />
                          <span className="truncate flex-1">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredGroups.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No menu options match &quot;{searchQuery}&quot;
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
