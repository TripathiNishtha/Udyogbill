"use client";

import React, { useState, useEffect, useRef } from "react";
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
  KeyRound,
  Lock,
  X,
  Check,
  Loader2,
  BookOpen,
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
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Change Password / Profile Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phoneNumber: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadHeaderData();
    }
  }, []);

  const openChangePasswordModal = () => {
    setShowUserMenu(false);
    const user = authService.getCurrentUser();
    setProfileForm({
      fullName: (user as any)?.fullName || (user as any)?.name || "",
      phoneNumber: (user as any)?.phoneNumber || (user as any)?.phone || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setProfileMsg("");
    setProfileError("");
    setIsPasswordModalOpen(true);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileMsg("");

    if (profileForm.newPassword) {
      if (profileForm.newPassword.length < 6) {
        setProfileError("New password must be at least 6 characters long.");
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        setProfileError("Passwords do not match / पासवर्ड मेल नहीं खा रहे हैं।");
        return;
      }
      if (!profileForm.currentPassword) {
        setProfileError("Current password is required to set a new password.");
        return;
      }
    }

    try {
      setSavingProfile(true);
      await tenantAppService.updateMyProfile({
        fullName: profileForm.fullName,
        phoneNumber: profileForm.phoneNumber,
        currentPassword: profileForm.currentPassword || undefined,
        newPassword: profileForm.newPassword || undefined,
      });

      const user = authService.getCurrentUser();
      if (user) {
        user.fullName = profileForm.fullName;
        (user as any).phoneNumber = profileForm.phoneNumber;
        localStorage.setItem("udyogbill_user", JSON.stringify(user));
        setCurrentUser({ ...user });
      }

      setProfileMsg("प्रोफाइल व पासवर्ड सफलतापूर्वक अपडेट हो गया! (Updated successfully)");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setProfileMsg("");
      }, 1500);
    } catch (err: any) {
      setProfileError(
        err?.response?.data?.errorMessage ||
        err?.response?.data?.message ||
        "Failed to update profile / पासवर्ड अपडेट करने में त्रुटि।"
      );
    } finally {
      setSavingProfile(false);
    }
  };

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
    <header className="shrink-0 h-14 bg-navbar border-b border-border px-2.5 sm:px-4 flex items-center justify-between z-30 transition-colors shadow-xs">
      {/* Left: UdyogBill Logo & Store Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
          className={`p-1.5 rounded-lg transition-colors cursor-pointer border shrink-0 ${
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
          <div className="bg-white rounded-lg sm:rounded-xl px-2 sm:px-2.5 py-0.5 sm:py-1 shadow-xs border border-border/60 flex items-center justify-center transition-all duration-300 group-hover:shadow-sm shrink-0">
            <img
              src="/udyogbill-brand-logo.png"
              alt="UdyogBill"
              className="h-7 sm:h-8 w-auto max-h-7 sm:max-h-8 max-w-[85px] sm:max-w-[125px] md:max-w-none object-contain"
            />
          </div>
        </Link>

        {/* Store / Business Info (Shifted to the Right of UdyogBill Logo) */}
        <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-border/70 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 flex items-center justify-center font-black text-xs shrink-0">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight truncate max-w-[95px] xs:max-w-[140px] sm:max-w-[200px] md:max-w-[260px]">
                {profile?.tradeName || profile?.businessName || "UdyogBill Store"}
              </span>
              <Badge variant="neutral" size="sm" className="hidden sm:inline-flex text-[10px] py-0 font-medium shrink-0">
                {activeBranchName}
              </Badge>
            </div>
            {profile?.gstin && (
              <span className="text-[10px] sm:text-[11px] text-foreground/80 font-mono font-semibold -mt-0.5 hidden md:block">
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
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Quick + Sale Bill CTA */}
        <Link href="/app/sales/invoices?new=1">
          <Button
            size="sm"
            className="inline-flex text-xs font-bold gap-1 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700/30 px-2 sm:px-3 py-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">Sale Bill</span>
            <span className="xs:hidden">Bill</span>
            <span className="text-[10px] opacity-85 font-mono hidden lg:inline bg-emerald-700/60 px-1 py-0.2 rounded">(F2)</span>
          </Button>
        </Link>

        {/* User Manual Help CTA */}
        <Link href="/app/help">
          <Button
            size="sm"
            variant="outline"
            className="hidden sm:inline-flex text-xs font-bold gap-1 shadow-xs border-border px-2 sm:px-2.5 py-1 text-muted-foreground hover:text-foreground"
            title="Open Software User Manual & Help Center"
          >
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="hidden md:inline">User Manual</span>
            <span className="md:hidden">Help</span>
          </Button>
        </Link>

        {/* Network status */}
        <div className="hidden sm:block">
          <NetworkStatusBadge />
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-elevated text-foreground transition-colors border border-transparent hover:border-border cursor-pointer"
            title="User Profile & Account"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold ring-2 ring-border shadow-xs">
              {((currentUser as any)?.fullName || (currentUser as any)?.name)?.[0]?.toUpperCase() || "U"}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground hidden sm:block transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`} />
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 mt-2 w-60 rounded-xl bg-surface border border-border shadow-2xl py-1.5 z-50 text-foreground animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3.5 py-2.5 border-b border-border/80">
                <p className="text-xs font-bold truncate text-foreground">
                  {(currentUser as any)?.fullName || (currentUser as any)?.name || "Subscriber"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{currentUser?.email}</p>
                {((currentUser as any)?.role || (currentUser as any)?.roles?.[0]) && (
                  <span className="inline-block mt-1 text-[10px] font-semibold text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded">
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

              {/* Change Password / Profile Settings Button */}
              <button
                type="button"
                onClick={openChangePasswordModal}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs hover:bg-surface-elevated text-foreground transition-colors text-left cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                <span>Change Password / पासवर्ड बदलें</span>
              </button>

              <div className="border-t border-border/80 my-1" />

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-danger hover:bg-danger/10 transition-colors text-left font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out / लॉगआउट</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Profile & Change Password Modal Dialog ─────────────────────────── */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl relative text-foreground">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-surface-elevated cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-500" />
                <span>Change Password & Profile / पासवर्ड व प्रोफाइल</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update your name, contact phone number, and account password.
              </p>
            </div>

            {profileMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{profileMsg}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <X className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Full Name / पूरा नाम <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Your Name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Phone Number (10 Digits) / मोबाइल नंबर
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={profileForm.phoneNumber}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="pt-2 border-t border-border/80 space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span>Change Password / पासवर्ड बदलें</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Current Password / वर्तमान पासवर्ड
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={profileForm.currentPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Required only if you want to change your password
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    New Password (min 6 characters) / नया पासवर्ड
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Confirm New Password / नया पासवर्ड दोबारा दर्ज करें
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={profileForm.confirmPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors cursor-pointer"
                >
                  Cancel / रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingProfile ? "Saving..." : "Save Changes / सहेजें"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
