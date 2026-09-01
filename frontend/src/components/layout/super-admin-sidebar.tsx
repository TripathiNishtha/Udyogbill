"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Layers,
  CreditCard,
  ShieldAlert,
  LogOut,
  Sparkles,
  Server,
  Users,
  Mail,
  Megaphone,
  FileText,
  Tag
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-provider";

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      label: "Platform Overview",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Company Profile",
      href: "/admin/company-profile",
      icon: FileText,
    },
    {
      label: "Tenants & Subscribers",
      href: "/admin/tenants",
      icon: Building2,
    },
    {
      label: "Dynamic Industries",
      href: "/admin/industries",
      icon: Layers,
    },
    {
      label: "Plans & Entitlements",
      href: "/admin/plans",
      icon: CreditCard,
    },
    {
      label: "Add-on Pricing",
      href: "/admin/addons",
      icon: Sparkles,
    },
    {
      label: "Coupons & Discounts",
      href: "/admin/coupons",
      icon: Tag,
    },
    {
      label: "Payment Gateway",
      href: "/admin/gateways",
      icon: Server,
    },
    {
      label: "Email & SMTP",
      href: "/admin/email-settings",
      icon: Mail,
    },
    {
      label: "Broadcast Mailer",
      href: "/admin/broadcast",
      icon: Megaphone,
    },
    {
      label: "Audit & Security Logs",
      href: "/admin/audit",
      icon: ShieldAlert,
    },
  ];

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("udyog_access_token");
      localStorage.removeItem("udyog_refresh_token");
      localStorage.removeItem("udyog_user");
    }
    router.push("/login");
  };

  return (
    <aside className="w-72 bg-slate-950 text-slate-100 flex flex-col h-full border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-850 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight text-white">
              Udyog<span className="text-indigo-400">Bill</span>
            </h1>
            <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-widest">
              Super Admin Hub
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 py-6 space-y-1">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Platform Governance
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Theme & System Telemetry Badge */}
      <div className="p-4 mx-4 mb-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Appearance Theme</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-slate-400 flex items-center space-x-1.5">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>Core Engine</span>
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Online
          </span>
        </div>
      </div>

      {/* User / Logout Footer */}
      <div className="p-4 border-t border-slate-850 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-xs font-bold text-indigo-300">
            SA
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Super Admin</p>
            <p className="text-[10px] text-slate-400">admin@udyogbill.com</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
