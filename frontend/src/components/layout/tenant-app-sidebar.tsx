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

  // Collapsible state for each section
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadSidebarData();
    }
  }, []);

  const loadSidebarData = async () => {
    try {
      const [branchesData, profileData] = await Promise.all([
        tenantAppService.getBranches(),
        tenantAppService.getBusinessProfile().catch(() => null),
      ]);
      setBranches(branchesData);
      if (profileData) {
        setProfile(profileData);
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
      // Dynamically Injected Active Industry Add-ons
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
          { label: "🎁 Refer & Earn ₹500", href: "/app/referrals", icon: Gift },
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
  }, [activeNavGroups]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
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
        <nav className="flex-1 overflow-y-auto min-h-0 p-2.5 space-y-2 bg-sidebar">
          {filteredGroups.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.id]) && !searchQuery;
            const hasActiveItem = group.items.some(
              (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
            );

            return (
              <div key={group.id} className="space-y-0.5">
                {/* Group Header Button */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground hover:text-sidebar-foreground transition-colors group uppercase"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      group.id === "sales" || group.id === "overview" ? "bg-emerald-500" :
                      group.id === "purchase" ? "bg-amber-500" :
                      group.id === "inventory" ? "bg-purple-500" :
                      group.id === "pharma" ? "bg-rose-500" :
                      group.id === "reports" ? "bg-blue-500" : "bg-slate-400"
                    }`} />
                    <span className={hasActiveItem ? "text-primary font-black" : "text-muted-foreground group-hover:text-sidebar-foreground"}>
                      {group.title}
                    </span>
                  </div>
                  {!searchQuery && (
                    <span className="text-muted-foreground/70 group-hover:text-sidebar-foreground">
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </button>

                {/* Group Items */}
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                      const Icon = item.icon;
                      const iconColor = 
                        group.id === "sales" || group.id === "overview" ? "text-emerald-600 dark:text-emerald-400" :
                        group.id === "purchase" ? "text-amber-600 dark:text-amber-400" :
                        group.id === "inventory" ? "text-purple-600 dark:text-purple-400" :
                        group.id === "pharma" ? "text-rose-600 dark:text-rose-400" :
                        group.id === "reports" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400";

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onCloseMobile}
                          className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium tracking-normal transition-all ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                              : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-hover"
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary-foreground" : iconColor}`} />
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
