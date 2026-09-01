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

export function TenantAppSidebar() {
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
          { label: "Loyalty & Promos", href: "/app/loyalty", icon: Gift },
        ]
      },
      {
        id: "purchase",
        title: "Procure-to-Pay (Purchases)",
        icon: Receipt,
        items: [
          { label: "Vendor Purchase Bills", href: "/app/purchase/bills", icon: Receipt },
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
          { label: "Industry Add-on Store", href: "/app/settings/addons", icon: Sparkles },
          { label: "Subscription & Invoices", href: "/app/settings/billing", icon: Receipt },
          { label: "Business Settings", href: "/app/settings", icon: Settings2 },
          { label: "Invoice Settings", href: "/app/settings/templates", icon: Printer },
          { label: "Branches & Warehouses", href: "/app/branches", icon: Building2 },
          { label: "Staff & RBAC", href: "/app/staff", icon: ShieldCheck },
          { label: "Backups & System Health", href: "/app/settings/backup", icon: ShieldCheck },
          { label: "Audit & Activity Logs", href: "/app/audit", icon: ShieldAlert },
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
  }, [searchQuery]);

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-850 flex flex-col justify-between shrink-0 h-full overflow-hidden select-none">
      {/* Brand Header: Official UdyogBill Full HD Brand */}
      <div className="shrink-0 p-3 border-b border-slate-800/80 bg-slate-950/95 z-10 space-y-2.5">
        <Link href="/app/dashboard" className="block group" title="UdyogBill Enterprise Commercial ERP">
          <div className="bg-white rounded-xl py-2 px-3 shadow-md border border-slate-200/40 flex items-center justify-center transition-all group-hover:shadow-lg group-hover:scale-[1.01]">
            <img
              src="/udyogbill-brand-logo.png"
              alt="UdyogBill - हर व्यापारी का स्मार्ट साथी"
              className="w-full max-w-[190px] h-10 object-contain drop-shadow-xs filter brightness-100"
            />
          </div>
        </Link>

        {/* Quick Menu Search */}
        <div className="relative">
          <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu (e.g. GST, PO)..."
            className="w-full pl-7 pr-6 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Groups (Categorized & Scrollable) */}
      <nav className="flex-1 overflow-y-auto min-h-0 p-2 space-y-2 bg-slate-950">
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
                className="w-full flex items-center justify-between px-2 py-0.5 text-[10px] font-black tracking-wider text-slate-400 hover:text-slate-200 transition-colors group uppercase"
              >
                <div className="flex items-center space-x-1.5">
                  <span className={hasActiveItem ? "text-amber-400 dark:text-indigo-400" : "text-slate-500 group-hover:text-slate-400"}>
                    {group.title}
                  </span>
                </div>
                {!searchQuery && (
                  <span className="text-slate-600 group-hover:text-slate-400">
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
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-normal transition-all ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-xs font-bold"
                            : "text-slate-300 hover:text-white hover:bg-slate-900/70"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-amber-500/90 dark:text-slate-400"}`} />
                        <span className="truncate flex-1">{item.label}</span>
                        {item.href === "/app/settings/addons" && (
                          <span className="ml-auto px-1.5 py-0.2 text-[8px] font-bold tracking-wider uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Packs
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-500">
            No menu options match &quot;{searchQuery}&quot;
          </div>
        )}
      </nav>
    </aside>
  );
}
