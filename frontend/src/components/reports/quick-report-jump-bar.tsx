"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Layers, ArrowRight, LayoutDashboard, ChevronRight } from "lucide-react";

export interface QuickJumpOption {
  category: string;
  reports: { name: string; href: string }[];
}

const REPORT_CATEGORIES: QuickJumpOption[] = [
  {
    category: "Sales & Returns",
    reports: [
      { name: "Sales Register (Itemized)", href: "/app/reports/sales?tab=detailed" },
      { name: "Sales Summary (Multi-Slice)", href: "/app/reports/sales?tab=summary" },
      { name: "Credit Notes & Returns Register", href: "/app/sales/returns" },
    ],
  },
  {
    category: "Purchases & Vendors",
    reports: [
      { name: "Purchase Register (Itemized)", href: "/app/reports/purchases?tab=detailed" },
      { name: "Purchase Summary", href: "/app/reports/purchases?tab=summary" },
      { name: "Supplier Ledger & Statement", href: "/app/reports/ledger?partyType=supplier" },
    ],
  },
  {
    category: "Inventory & Stock",
    reports: [
      { name: "Company Stock & Sales Statement", href: "/app/reports/company-stock-sales" },
      { name: "Real-Time Stock Balance", href: "/app/reports/stock?tab=balance" },
      { name: "Stock Valuation (COGS)", href: "/app/reports/stock?tab=valuation" },
      { name: "Low Stock & Reorder Levels", href: "/app/reports/stock?tab=balance&filter=low" },
    ],
  },
  {
    category: "Receivables & Payables (Ageing)",
    reports: [
      { name: "Debtor Ageing Schedule (A/R)", href: "/app/reports/ageing?tab=debtors" },
      { name: "Creditor Ageing Schedule (A/P)", href: "/app/reports/ageing?tab=creditors" },
      { name: "Customer Ledger & Statement", href: "/app/reports/ledger?partyType=customer" },
    ],
  },
  {
    category: "Taxation & GST",
    reports: [
      { name: "CA Pack (Tax Audit Register)", href: "/app/reports/ca-pack" },
      { name: "GSTR-1 Outward Sales", href: "/app/reports/gst?tab=gstr1" },
      { name: "GSTR-3B Summary & ITC", href: "/app/reports/gst?tab=gstr3b" },
    ],
  },
  {
    category: "Financials & MIS",
    reports: [
      { name: "True Profit & Loss (P&L)", href: "/app/reports/pnl" },
      { name: "Executive Business Summary", href: "/app/reports/summary" },
    ],
  },
];

export function QuickReportJumpBar({
  currentReportTitle,
  className = "",
}: {
  currentReportTitle?: string;
  className?: string;
}) {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [selectedHref, setSelectedHref] = useState<string>("");

  const displayedReports =
    selectedCat === "all"
      ? REPORT_CATEGORIES.flatMap((c) => c.reports)
      : REPORT_CATEGORIES.find((c) => c.category === selectedCat)?.reports || [];

  const handleJump = (href: string) => {
    setSelectedHref(href);
    if (href) {
      router.push(href);
    }
  };

  return (
    <div
      className={`bg-surface/80 backdrop-blur-sm border border-border rounded-xl p-2.5 sm:p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-xs ${className}`}
    >
      <div className="flex items-center space-x-2 text-muted-foreground shrink-0">
        <Link
          href="/app/reports"
          className="flex items-center space-x-1.5 text-primary hover:underline font-bold"
          title="Return to Master Report Hub"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Reports Hub</span>
        </Link>
        {currentReportTitle && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="font-semibold text-foreground truncate max-w-[200px]">
              {currentReportTitle}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        <div className="flex items-center space-x-1.5 text-muted-foreground font-semibold shrink-0">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">Quick Jump:</span>
        </div>

        {/* Category Dropdown */}
        <select
          value={selectedCat}
          onChange={(e) => {
            setSelectedCat(e.target.value);
            setSelectedHref("");
          }}
          className="py-1 px-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary font-medium cursor-pointer shadow-2xs"
        >
          <option value="all">All Categories</option>
          {REPORT_CATEGORIES.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category}
            </option>
          ))}
        </select>

        {/* Report Dropdown */}
        <select
          value={selectedHref}
          onChange={(e) => handleJump(e.target.value)}
          className="py-1 px-2.5 bg-surface-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary font-medium cursor-pointer max-w-[240px] shadow-2xs"
        >
          <option value="">-- Jump to another report --</option>
          {displayedReports.map((r) => (
            <option key={r.href} value={r.href}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
