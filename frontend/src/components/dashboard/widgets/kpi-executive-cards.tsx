"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  Clock,
  Boxes,
  PieChart,
  ArrowUpRight,
  Receipt,
  Building2,
  Sparkles,
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
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
      {/* 1. Total Sales Revenue */}
      <Link
        href="/app/reports/sales"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-indigo-500 hover:shadow-md transition-all shadow-xs cursor-pointer group min-h-[105px] sm:min-h-[110px]"
        title={isHi ? "बिक्री रजिस्टर देखें" : "View Sales Register"}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {isHi ? "कुल बिक्री" : "Sales Revenue"}
          </span>
          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
        </div>
        <div className="my-1">
          <div className="text-lg sm:text-xl font-black font-mono text-slate-950 dark:text-white tracking-tight">
            {formatCurrency(data.totalSales)}
          </div>
          <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {data.totalInvoicesCount} {isHi ? "बिल जारी" : "invoices issued"}
          </div>
        </div>
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
          <span className="text-slate-600 dark:text-slate-400 font-medium">{data.periodLabel}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
            <Receipt className="w-3 h-3" />
            <span>{isHi ? "लेजर" : "Ledger"}</span>
          </span>
        </div>
      </Link>

      {/* 2. Realized Cash Collection */}
      <Link
        href="/app/reports/sales?tab=summary"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-indigo-500 hover:shadow-md transition-all shadow-xs cursor-pointer group min-h-[105px] sm:min-h-[110px]"
        title={isHi ? "पेमेंट सारांश देखें" : "View Payment Summary"}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {isHi ? "प्राप्त वसूली" : "Realized Collection"}
          </span>
          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
        </div>
        <div className="my-1">
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(data.totalCollected)}
          </div>
          <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {collectionPercent}% {isHi ? "बिक्री वसूल" : "of billed sales"}
          </div>
        </div>
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
          <span className="text-slate-600 dark:text-slate-400 font-medium">Cash + UPI + Bank</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
            <Wallet className="w-3 h-3" />
            <span>Settled</span>
          </span>
        </div>
      </Link>

      {/* 3. Accounts Receivable (Market Dues) */}
      <Link
        href="/app/reports/ageing?tab=debtors"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-indigo-500 hover:shadow-md transition-all shadow-xs cursor-pointer group min-h-[105px] sm:min-h-[110px]"
        title={isHi ? "उधारी एजिंग देखें" : "View Debtor Ageing"}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {isHi ? "देनदारियां (उधारी)" : "Receivables (A/R)"}
          </span>
          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
        </div>
        <div className="my-1">
          <div className="text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400 tracking-tight">
            {formatCurrency(data.totalReceivables)}
          </div>
          <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {isHi ? "ग्राहकों से बकाया" : "Pending from customers"}
          </div>
        </div>
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
          <span className="text-slate-600 dark:text-slate-400 font-medium">{data.debtorCount} {isHi ? "खाते" : "accounts"}</span>
          <span className={data.totalReceivables > 0 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
            {data.totalReceivables > 0 ? (isHi ? "लंबित" : "Pending") : (isHi ? "शून्य" : "Nil")}
          </span>
        </div>
      </Link>

      {/* 4. Accounts Payable (Vendor Procurement) */}
      <Link
        href="/app/reports/ageing?tab=creditors"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-indigo-500 hover:shadow-md transition-all shadow-xs cursor-pointer group min-h-[105px] sm:min-h-[110px]"
        title={isHi ? "लेनदार एजिंग देखें" : "View Creditor Ageing"}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {isHi ? "लेनदारियां (देय)" : "Payables (A/P)"}
          </span>
          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
        </div>
        <div className="my-1">
          <div className="text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight">
            {formatCurrency(data.totalPayables)}
          </div>
          <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {data.purchaseCount} {isHi ? "सप्लायर बिल" : "supplier bills"}
          </div>
        </div>
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
          <span className="text-slate-600 dark:text-slate-400 font-medium">{isHi ? "सप्लायर्स देय" : "Vendor Dues"}</span>
          <span className={data.totalPayables > 0 ? "text-rose-600 dark:text-rose-400 font-bold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
            {data.totalPayables > 0 ? (isHi ? "देय" : "Pending") : (isHi ? "पूर्ण" : "Cleared")}
          </span>
        </div>
      </Link>

      {/* 5. Inventory Stock Valuation */}
      <Link
        href="/app/reports/stock?tab=balance"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-indigo-500 hover:shadow-md transition-all shadow-xs cursor-pointer group min-h-[105px] sm:min-h-[110px]"
        title={isHi ? "स्टॉक मूल्यांकन रिपोर्ट देखें" : "View Stock Valuation"}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {isHi ? "स्टॉक मूल्यांकन" : "Inventory Valuation"}
          </span>
          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
        </div>
        <div className="my-1">
          <div className="text-lg sm:text-xl font-black font-mono text-indigo-600 dark:text-indigo-300 tracking-tight">
            {formatCurrency(data.totalInventoryValue)}
          </div>
          <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {data.inventoryItemCount} {isHi ? "सक्रिय SKUs" : "active master SKUs"}
          </div>
        </div>
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
          <span className="text-slate-600 dark:text-slate-400 font-medium">{isHi ? "कम स्टॉक:" : "Low Stock:"}</span>
          <span className={data.lowStockCount > 0 ? "text-rose-600 dark:text-rose-400 font-bold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
            {data.lowStockCount > 0 ? `${data.lowStockCount} ${isHi ? "अलर्ट" : "alerts"}` : (isHi ? "पर्याप्त" : "Healthy")}
          </span>
        </div>
      </Link>

      {/* 6. Gross Operating Profit */}
      <Link
        href="/app/reports/pnl"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-indigo-500 hover:shadow-md transition-all shadow-xs cursor-pointer group min-h-[105px] sm:min-h-[110px]"
        title={isHi ? "लाभ-हानि खाता देखें" : "View True P&L"}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {isHi ? "सकल लाभ (Margin)" : "Gross Profit"}
          </span>
          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
        </div>
        <div className="my-1">
          <div
            className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
              data.grossProfitAmount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatCurrency(data.grossProfitAmount)}
          </div>
          <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {data.grossMarginPercent}% {isHi ? "सकल मार्जिन" : "gross margin"}
          </div>
        </div>
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
          <span className="text-slate-600 dark:text-slate-400 font-medium">Sales &minus; COGS</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>Margin</span>
          </span>
        </div>
      </Link>
    </div>
  );
}
