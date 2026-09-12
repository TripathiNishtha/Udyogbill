"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Server, LogOut, ShieldCheck, Menu } from "lucide-react";
import { authService } from "@/services/api-services";
import { ThemeToggle } from "@/components/theme/theme-provider";

export function SuperAdminHeader({
  onOpenMobile,
}: {
  onOpenMobile?: () => void;
}) {
  const router = useRouter();

  const handleLogout = () => {
    authService.logout();
    router.push("/login");
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-20 shrink-0 shadow-xs">
      {/* Left: Mobile Hamburger + Breadcrumb / Scope title */}
      <div className="flex items-center space-x-2">
        {onOpenMobile && (
          <button
            type="button"
            onClick={onOpenMobile}
            className="lg:hidden p-1.5 -ml-1 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">Super Admin Control Plane</span>
          <span className="sm:hidden">Super Admin</span>
        </div>
      </div>

      {/* Right Hero Section: Theme, Core Engine & Logout */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Appearance Theme Switcher */}
        <ThemeToggle />

        {/* Core Engine Status Badge */}
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Server className="w-3.5 h-3.5 text-emerald-600" />
          <span>Core Engine:</span>
          <span className="font-bold text-emerald-700">Online</span>
        </div>

        {/* Admin Profile Details */}
        <div className="hidden md:flex items-center space-x-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            SA
          </div>
          <div className="text-left leading-tight">
            <p className="text-xs font-bold text-slate-900">Super Admin</p>
            <p className="text-[10.5px] text-slate-500 font-medium">admin@udyogbill.com</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Sign Out of Super Admin"
          className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition-all cursor-pointer shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
