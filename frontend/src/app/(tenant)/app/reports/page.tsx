"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Receipt,
  ShoppingCart,
  Boxes,
  Clock,
  Sparkles,
  Search,
  ArrowRight,
  TrendingUp,
  FileText,
  ShieldCheck,
  Download,
  Filter,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface ReportCardProps {
  title: string;
  code: string;
  description: string;
  href: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  features: string[];
}

const REPORT_MODULES: ReportCardProps[] = [
  {
    title: "CA Pack (GST & Tax Audit Register)",
    code: "CA-PACK-00",
    description: "Standard CA format with Bill No, Party GSTN, Value of Goods, CGST, SGST, IGST, Total Tax, Invoice Value, HSN, Quantity & Unit.",
    href: "/app/reports/ca-pack",
    badge: "CA & Tax Ready",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    icon: Receipt,
    features: ["Bill-by-Bill Breakdown", "Slab-wise GST Rates", "Export PDF / Excel / CSV", "Send Email & WhatsApp"],
  },
  {
    title: "Sales Register (Detailed)",
    code: "SALES-REG-01",
    description: "Itemized transaction-level sales register with HSN codes, GST breakdown, customer types, salesman tracking, and invoice payments.",
    href: "/app/reports/sales?tab=detailed",
    badge: "Phase P0 Critical",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: Receipt,
    features: ["Itemized Lines", "GST Tax Breakdown", "Salesman & Doctor Info", "CSV Export"],
  },
  {
    title: "Sales Summary",
    code: "SALES-SUM-02",
    description: "Multi-dimensional sales aggregation grouped by date, month, customer, branch, warehouse, or payment mode.",
    href: "/app/reports/sales?tab=summary",
    badge: "Phase P0 Critical",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: TrendingUp,
    features: ["Date / Month Slices", "Gross vs Net Sales", "Outstanding Balances", "CSV Export"],
  },
  {
    title: "Purchase Register (Detailed)",
    code: "PUR-REG-03",
    description: "Comprehensive procurement audit tracking supplier bills, invoice numbers, GST input tax credits (ITC), and payments.",
    href: "/app/reports/purchases?tab=detailed",
    badge: "Phase P0 Critical",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: ShoppingCart,
    features: ["Vendor Bill Reference", "Taxable & GST ITC", "Supplier Status", "CSV Export"],
  },
  {
    title: "Purchase Summary",
    code: "PUR-SUM-04",
    description: "Executive procurement aggregates grouped by supplier, branch, warehouse, or calendar periods.",
    href: "/app/reports/purchases?tab=summary",
    badge: "Phase P0 Critical",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: FileText,
    features: ["Supplier Grouping", "Total Qty & Value", "Pending Payables", "CSV Export"],
  },
  {
    title: "Real-Time Stock Balance",
    code: "STK-BAL-05",
    description: "Live warehouse inventory balances with batch/expiry tracking, reserved orders, min-alert thresholds, and stock valuation.",
    href: "/app/reports/stock?tab=balance",
    badge: "Phase P0 Critical",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: Boxes,
    features: ["Batch & Expiry", "Critical/Low Status", "Deficit & Reorder", "CSV Export"],
  },
  {
    title: "Stock Valuation",
    code: "STK-VAL-06",
    description: "Periodic inventory audit with opening stock, inward receipts, outward issues, adjustments, and weighted cost valuation.",
    href: "/app/reports/stock?tab=valuation",
    badge: "Phase P0 Critical",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: FileSpreadsheet,
    features: ["Opening + In - Out", "Weighted Cost Rate", "Closing Valuation", "CSV Export"],
  },
  {
    title: "Debtor Ageing Schedule (A/R)",
    code: "DEBT-AGE-07",
    description: "Accounts receivable overdue schedule computed against real invoice due dates into standard 9 slabs with credit limit checks.",
    href: "/app/reports/ageing?tab=debtors",
    badge: "Phase P0 Critical",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    icon: Clock,
    features: ["9 Overdue Slabs", "Invoice Due Dates", "Credit Utilization %", "CSV Export"],
  },
  {
    title: "Creditor Ageing Schedule (A/P)",
    code: "CRED-AGE-08",
    description: "Accounts payable overdue schedule tracking supplier bills across 9 overdue slabs for cash flow forecasting.",
    href: "/app/reports/ageing?tab=creditors",
    badge: "Phase P0 Critical",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    icon: Clock,
    features: ["Supplier Overdue Slabs", "Vendor Bill Tracking", "Payables Forecast", "CSV Export"],
  },
  {
    title: "True Profit & Loss (P&L)",
    code: "FIN-PNL-09",
    description: "Mathematically rigorous income statement featuring Net Revenue, true COGS, gross margins, real categorized expense vouchers, and net profit.",
    href: "/app/reports/pnl",
    badge: "Phase P0 Critical",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: Sparkles,
    features: ["True COGS Formula", "Real Operating Expenses", "Gross & Net Margins", "CSV Export"],
  },
];

export default function ReportsHubPage() {
  const [search, setSearch] = useState("");

  const filtered = REPORT_MODULES.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Master Report Center
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Production-grade commercial intelligence powered by real transactional data.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative w-64 md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports or codes..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Phase P0 Status Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/40 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Phase P0 Report Suite Online
            </span>
            <p className="text-xs text-slate-400 mt-0.5">
              All 9 foundation reports are connected to real PostgreSQL database queries and RFC 4180 CSV export.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs font-medium text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Multi-Tenant Isolated & Verified</span>
        </div>
      </div>

      {/* Grid of 9 P0 Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.code}
              href={report.href}
              className="group p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all duration-200 flex flex-col justify-between hover:shadow-xl hover:shadow-indigo-500/5"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700 group-hover:bg-indigo-600/20 group-hover:border-indigo-500/30 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${report.badgeColor}`}
                  >
                    {report.badge}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-mono font-bold text-slate-500 uppercase">
                    {report.code}
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors mt-0.5">
                    {report.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2">
                    {report.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {report.features.map((feat) => (
                    <span
                      key={feat}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-750"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                <span>Launch Report View</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
