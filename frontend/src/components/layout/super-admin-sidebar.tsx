"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Layers,
  CreditCard,
  ShieldAlert,
  Sparkles,
  Users,
  Mail,
  Megaphone,
  FileText,
  Tag,
  PhoneCall,
  TrendingUp,
  Globe,
  Gift,
  Server,
  BarChart3,
  Smartphone,
  X,
} from "lucide-react";

export function SuperAdminSidebar({
  isOpenMobile = false,
  onCloseMobile,
}: {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();

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
    {
      label: "Website Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
    },
    {
      label: "Mobile App Control",
      href: "/admin/mobile-app",
      icon: Smartphone,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`bg-white text-slate-800 flex flex-col h-full border-r border-slate-200 shrink-0 shadow-sm transition-transform duration-300 ease-in-out z-50 ${
          isOpenMobile
            ? "fixed inset-y-0 left-0 w-72 translate-x-0 shadow-2xl"
            : "fixed inset-y-0 left-0 w-72 -translate-x-full lg:static lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
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

          {/* Close button on mobile */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
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
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
