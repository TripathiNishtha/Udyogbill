"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  Clock,
  Boxes,
  Sparkles,
  Building2,
  ArrowUpRight,
} from "lucide-react";

export interface KpiCardData {
  totalSales: number;
  totalInvoicesCount: number;
  totalCollected: number;
  totalReceivables: number;
  debtorCount: number;
  totalPayables: number;
  purchaseCount: number;
  totalInventoryValue: number;
  inventoryItemCount: number;
  lowStockCount: number;
  grossProfitAmount: number;
  grossMarginPercent: number;
  periodLabel: string;
}

interface Props {
  data: KpiCardData;
  isHi?: boolean;
}

export function KpiExecutiveCards({ data, isHi = false }: Props) {
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val);
  };

  const collectionPercent =
    data.totalSales > 0 ? Math.min(100, Math.round((data.totalCollected / data.totalSales) * 100)) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
      {/* 1. Total Sales Revenue */}
      <Link
        href="/app/reports/sales"
        className="bg-surface border border-emerald-500/30 hover:border-emerald-500 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between hover:shadow-md transition-all shadow-2xs cursor-pointer group min-h-[105px] sm:min-h-[110px] border-t-3 border-t-emerald-600"
        title={isHi ? "बिक्री रजिस्टर देखें" : "View Sales Register"}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
              {isHi ? "कुल बिक्री" : "Sales Revenue"}
            </span>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-600 transition-colors shrink-0" />
        </div>
        <div className="my-1 sm:my-1.5 min-w-0">
          <div className="text-base sm:text-xl xl:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
            {formatCurrency(data.totalSales)}
          </div>
          <div className="text-[10px] font-semibold text-muted-foreground mt-0.5 truncate">
            {data.totalInvoicesCount} {isHi ? "बिल जारी" : "invoices issued"}
          </div>
        </div>
        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground font-medium truncate">{data.periodLabel}</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 font-bold shrink-0">
            {isHi ? "लेजर" : "Ledger"}
          </span>
        </div>
      </Link>

      {/* 2. Realized Cash Collection */}
      <Link
        href="/app/reports/sales?tab=summary"
        className="bg-surface border border-blue-500/30 hover:border-blue-500 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between hover:shadow-md transition-all shadow-2xs cursor-pointer group min-h-[105px] sm:min-h-[110px] border-t-3 border-t-blue-600"
        title={isHi ? "पेमेंट सारांश देखें" : "View Payment Summary"}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/50 shrink-0">
              <Wallet className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
              {isHi ? "प्राप्त वसूली" : "Realized Collection"}
            </span>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-600 transition-colors shrink-0" />
        </div>
        <div className="my-1 sm:my-1.5 min-w-0">
          <div className="text-base sm:text-xl xl:text-2xl font-black font-mono text-blue-600 dark:text-blue-400 tracking-tight truncate">
            {formatCurrency(data.totalCollected)}
          </div>
          <div className="text-[10px] font-semibold text-muted-foreground mt-0.5 truncate">
            {collectionPercent}% {isHi ? "बिक्री वसूल" : "of billed sales"}
          </div>
        </div>
        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground font-medium truncate">Cash + Bank</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 font-bold shrink-0">
            Settled
          </span>
        </div>
      </Link>

      {/* 3. Accounts Receivable (Market Dues) */}
      <Link
        href="/app/reports/ageing?tab=debtors"
        className="bg-surface border border-amber-500/30 hover:border-amber-500 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between hover:shadow-md transition-all shadow-2xs cursor-pointer group min-h-[105px] sm:min-h-[110px] border-t-3 border-t-amber-500"
        title={isHi ? "उधारी एजिंग देखें" : "View Debtor Ageing"}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/50 shrink-0">
              <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
              {isHi ? "उधारी (देनदारियां)" : "Receivables (A/R)"}
            </span>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-amber-600 transition-colors shrink-0" />
        </div>
        <div className="my-1 sm:my-1.5 min-w-0">
          <div className="text-base sm:text-xl xl:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 tracking-tight truncate">
            {formatCurrency(data.totalReceivables)}
          </div>
          <div className="text-[10px] font-semibold text-muted-foreground mt-0.5 truncate">
            {isHi ? "ग्राहकों से बकाया" : "Pending from customers"}
          </div>
        </div>
        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground font-medium truncate">{data.debtorCount} {isHi ? "खाते" : "accounts"}</span>
          <span className={`px-1.5 py-0.5 rounded font-bold border shrink-0 ${
            data.totalReceivables > 0
              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/60"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60"
          }`}>
            {data.totalReceivables > 0 ? (isHi ? "लंबित" : "Pending") : (isHi ? "शून्य" : "Nil")}
          </span>
        </div>
      </Link>

      {/* 4. Accounts Payable (Vendor Procurement) */}
      <Link
        href="/app/reports/ageing?tab=creditors"
        className="bg-surface border border-rose-500/30 hover:border-rose-500 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between hover:shadow-md transition-all shadow-2xs cursor-pointer group min-h-[105px] sm:min-h-[110px] border-t-3 border-t-rose-500"
        title={isHi ? "लेनदार एजिंग देखें" : "View Creditor Ageing"}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/50 shrink-0">
              <Building2 className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
              {isHi ? "लेनदारियां (देय)" : "Payables (A/P)"}
            </span>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-rose-600 transition-colors shrink-0" />
        </div>
        <div className="my-1 sm:my-1.5 min-w-0">
          <div className="text-base sm:text-xl xl:text-2xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight truncate">
            {formatCurrency(data.totalPayables)}
          </div>
          <div className="text-[10px] font-semibold text-muted-foreground mt-0.5 truncate">
            {data.purchaseCount} {isHi ? "सप्लायर बिल" : "supplier bills"}
          </div>
        </div>
        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground font-medium truncate">{isHi ? "सप्लायर्स देय" : "Vendor Dues"}</span>
          <span className={`px-1.5 py-0.5 rounded font-bold border shrink-0 ${
            data.totalPayables > 0
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/60"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60"
          }`}>
            {data.totalPayables > 0 ? (isHi ? "देय" : "Pending") : (isHi ? "पूर्ण" : "Cleared")}
          </span>
        </div>
      </Link>

      {/* 5. Inventory Stock Valuation */}
      <Link
        href="/app/reports/stock?tab=balance"
        className="bg-surface border border-purple-500/30 hover:border-purple-500 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between hover:shadow-md transition-all shadow-2xs cursor-pointer group min-h-[105px] sm:min-h-[110px] border-t-3 border-t-purple-500"
        title={isHi ? "स्टॉक मूल्यांकन रिपोर्ट देखें" : "View Stock Valuation"}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/50 shrink-0">
              <Boxes className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
              {isHi ? "स्टॉक मूल्यांकन" : "Inventory Valuation"}
            </span>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-purple-600 transition-colors shrink-0" />
        </div>
        <div className="my-1 sm:my-1.5 min-w-0">
          <div className="text-base sm:text-xl xl:text-2xl font-black font-mono text-purple-600 dark:text-purple-400 tracking-tight truncate">
            {formatCurrency(data.totalInventoryValue)}
          </div>
          <div className="text-[10px] font-semibold text-muted-foreground mt-0.5 truncate">
            {data.inventoryItemCount} {isHi ? "सक्रिय SKUs" : "active master SKUs"}
          </div>
        </div>
        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground font-medium truncate">{isHi ? "कम स्टॉक:" : "Low Stock:"}</span>
          <span className={`px-1.5 py-0.5 rounded font-bold border shrink-0 ${
            data.lowStockCount > 0
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/60"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60"
          }`}>
            {data.lowStockCount > 0 ? `${data.lowStockCount} ${isHi ? "अलर्ट" : "alerts"}` : (isHi ? "पर्याप्त" : "Healthy")}
          </span>
        </div>
      </Link>

      {/* 6. Gross Operating Profit */}
      <Link
        href="/app/reports/pnl"
        className="bg-surface border border-teal-500/30 hover:border-teal-500 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between hover:shadow-md transition-all shadow-2xs cursor-pointer group min-h-[105px] sm:min-h-[110px] border-t-3 border-t-teal-500"
        title={isHi ? "लाभ-हानि खाता देखें" : "View True P&L"}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-200/70 dark:border-teal-800/50 shrink-0">
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
              {isHi ? "सकल लाभ" : "Gross Profit"}
            </span>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-teal-600 transition-colors shrink-0" />
        </div>
        <div className="my-1 sm:my-1.5 min-w-0">
          <div
            className={`text-base sm:text-xl xl:text-2xl font-black font-mono tracking-tight truncate ${
              data.grossProfitAmount >= 0 ? "text-teal-600 dark:text-teal-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatCurrency(data.grossProfitAmount)}
          </div>
          <div className="text-[10px] font-semibold text-muted-foreground mt-0.5 truncate">
            {data.grossMarginPercent}% {isHi ? "सकल मार्जिन" : "gross margin"}
          </div>
        </div>
        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground font-medium truncate">Sales &minus; COGS</span>
          <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 font-bold shrink-0">
            {data.grossMarginPercent}% Margin
          </span>
        </div>
      </Link>
    </div>
  );
}
