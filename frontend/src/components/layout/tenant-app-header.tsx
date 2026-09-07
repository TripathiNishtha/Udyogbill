"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Plus,
  Search,
  Building2,
  ChevronDown,
  LogOut,
  User,
  ShieldCheck,
  Settings2,
  ExternalLink,
} from "lucide-react";
import { authService } from "@/services/api-services";
import { tenantAppService, BranchDetails } from "@/services/tenant-app-services";
import { AuthResponse, TenantDetails } from "@/types";
import { ThemeToggle } from "@/components/theme/theme-provider";
import { NetworkStatusBadge } from "./network-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TenantAppHeaderProps {
  onToggleMobileMenu: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function TenantAppHeader({
  onToggleMobileMenu,
  isSidebarCollapsed = false,
  onToggleSidebar,
}: TenantAppHeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthResponse["user"] | null>(null);
  const [profile, setProfile] = useState<TenantDetails | null>(null);
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadHeaderData();
    }
  }, []);

  const loadHeaderData = async () => {
    try {
      const [branchesData, profileData] = await Promise.all([
        tenantAppService.getBranches(),
        tenantAppService.getBusinessProfile().catch(() => null),
      ]);
      setBranches(branchesData);
      if (profileData) setProfile(profileData);
      if (branchesData.length > 0) {
        const ho = branchesData.find((b) => b.isHeadOffice);
        setSelectedBranch(ho ? ho.id : branchesData[0].id);
      }
    } catch {
      // Ignore fallback
    }
  };

  const handleLogout = () => {
    authService.logout();
    router.push("/login");
  };

  const activeBranchName =
    branches.find((b) => b.id === selectedBranch)?.branchName || "Main Branch";

  return (
    <header className="shrink-0 h-14 bg-navbar border-b border-border px-4 flex items-center justify-between z-30 transition-colors shadow-xs">
      {/* Left: UdyogBill Logo & Store Info */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Sidebar Toggle (Desktop: Show/Hide, Mobile: Drawer) */}
        <button
          type="button"
          onClick={() => {
            if (window.innerWidth < 1024) {
              onToggleMobileMenu();
            } else if (onToggleSidebar) {
              onToggleSidebar();
            }
          }}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
            isSidebarCollapsed
              ? "bg-primary/15 text-primary border-primary/40 hover:bg-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated border-transparent"
          }`}
          title={isSidebarCollapsed ? "Show Sidebar (Ctrl+B)" : "Hide Sidebar (Ctrl+B)"}
          aria-label="Toggle Sidebar Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* UdyogBill Brand Logo (Top-Left of Screen) */}
        <Link
          href="/app/dashboard"
          className="flex items-center group shrink-0"
          title="UdyogBill"
        >
          <div className="bg-white rounded-xl px-3 py-1 shadow-xs border border-border/60 flex items-center justify-center transition-all duration-300 group-hover:shadow-sm">
            <img
              src="/udyogbill-brand-logo.png"
              alt="UdyogBill"
              className="h-8.5 sm:h-9 w-auto object-contain"
            />
          </div>
        </Link>

        {/* Store / Business Info (Shifted to the Right of UdyogBill Logo) */}
        <div className="flex items-center gap-2 pl-3 border-l border-border/70 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 flex items-center justify-center font-black text-xs shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-foreground tracking-tight line-clamp-1 max-w-[130px] sm:max-w-[200px] md:max-w-[260px]">
                {profile?.tradeName || profile?.businessName || "UdyogBill Store"}
              </span>
              <Badge variant="neutral" size="sm" className="hidden sm:inline-flex text-[10px] py-0 font-medium">
                {activeBranchName}
              </Badge>
            </div>
            {profile?.gstin && (
              <span className="text-[11px] text-foreground/80 font-mono font-semibold -mt-0.5 hidden md:block">
                GSTIN: {profile.gstin}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Global Search Bar / Shortcut hint (Desktop) */}
      <div className="hidden md:flex items-center flex-1 max-w-xs mx-6">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            readOnly
            onClick={() => {
              // Trigger shortcuts or focus
              const ev = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
              window.dispatchEvent(ev);
            }}
            placeholder="Search bills, items, parties... (Ctrl+K)"
            className="w-full pl-8 pr-12 py-1.5 bg-surface text-xs text-foreground placeholder:text-muted-foreground/70 rounded-lg border border-border hover:border-emerald-500/50 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer shadow-xs"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-surface-elevated text-muted-foreground border border-border px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Quick Actions, Network, Theme, Profile */}
      <div className="flex items-center gap-2.5">
        {/* Quick + Sale Bill CTA */}
        <Link href="/app/sales/invoices">
          <Button
            size="sm"
            className="hidden sm:inline-flex text-xs font-bold gap-1 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700/30"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Sale Bill</span>
            <span className="text-[10px] opacity-85 font-mono hidden lg:inline bg-emerald-700/60 px-1 py-0.2 rounded">(F2)</span>
          </Button>
        </Link>

        {/* Network status */}
        <div className="hidden sm:block">
          <NetworkStatusBadge />
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-elevated text-foreground transition-colors border border-transparent hover:border-border"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold ring-2 ring-border">
              {((currentUser as any)?.fullName || (currentUser as any)?.name)?.[0]?.toUpperCase() || "U"}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-xl bg-surface border border-border shadow-xl py-1.5 z-50 text-foreground"
              onMouseLeave={() => setShowUserMenu(false)}
            >
              <div className="px-3.5 py-2 border-b border-border/80">
                <p className="text-xs font-bold truncate text-foreground">
                  {(currentUser as any)?.fullName || (currentUser as any)?.name || "Subscriber"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{currentUser?.email}</p>
                {((currentUser as any)?.role || (currentUser as any)?.roles?.[0]) && (
                  <span className="inline-block mt-1 text-[10px] font-semibold text-primary uppercase">
                    Role: {(currentUser as any)?.role || (currentUser as any)?.roles?.[0]}
                  </span>
                )}
              </div>

              <Link
                href="/app/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs hover:bg-surface-elevated text-foreground transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Store Settings</span>
              </Link>

              <Link
                href="/app/settings/addons"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs hover:bg-surface-elevated text-foreground transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Plan &amp; Add-ons</span>
              </Link>

              <div className="border-t border-border/80 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-danger hover:bg-danger/10 transition-colors text-left font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
