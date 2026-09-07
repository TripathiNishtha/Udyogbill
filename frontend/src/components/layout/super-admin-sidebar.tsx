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
  Tag,
  PhoneCall,
  TrendingUp,
  Globe,
  Gift,
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
      label: "Referrals & Affiliates",
      href: "/admin/referrals",
      icon: Gift,
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
      label: "Growth Command Center",
      href: "/admin/growth",
      icon: TrendingUp,
    },
    {
      label: "Organic Leads CRM",
      href: "/admin/growth/leads",
      icon: PhoneCall,
    },
    {
      label: "AI SEO & Keyword Studio",
      href: "/admin/growth/ai-studio",
      icon: Sparkles,
    },
    {
      label: "SEO Pages & Matrix",
      href: "/admin/growth/seo",
      icon: Globe,
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
    <aside className="w-72 bg-white text-slate-800 flex flex-col h-full border-r border-slate-200 shrink-0 shadow-sm">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight text-slate-900">
              Udyog<span className="text-indigo-600">Bill</span>
            </h1>
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              Super Admin Hub
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Platform Governance
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* System Telemetry Badge */}
      <div className="p-4 mx-4 mb-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-600 font-semibold">Appearance Theme</span>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
            ☀️ Light Theme Active
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <span className="text-slate-600 font-medium flex items-center space-x-1.5">
            <Server className="w-3.5 h-3.5 text-emerald-600" />
            <span>Core Engine</span>
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Online
          </span>
        </div>
      </div>

      {/* User / Logout Footer */}
      <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-300 flex items-center justify-center text-xs font-bold text-indigo-700">
            SA
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Super Admin</p>
            <p className="text-[10px] text-slate-500 font-medium">admin@udyogbill.com</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
