"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Layers,
  RotateCcw,
  BookOpen,
  PieChart,
  BarChart3,
  Building2,
  Users2,
  ChevronRight,
  ExternalLink,
  Zap,
} from "lucide-react";

export type ReportCategory =
  | "all"
  | "sales"
  | "purchase"
  | "inventory"
  | "ageing"
  | "gst"
  | "financials";

export interface ReportItem {
  id: string;
  code: string;
  title: string;
  category: ReportCategory;
  categoryName: string;
  description: string;
  href: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  features: string[];
  tags: string[];
}

const ALL_REPORTS: ReportItem[] = [
  // ─── 1. SALES & RETURNS ──────────────────────────────────────────────────
  {
    id: "sales-detailed",
    code: "SALES-REG-01",
    title: "Sales Register (Itemized)",
    category: "sales",
    categoryName: "Sales & Returns",
    description:
      "Itemized transaction-level sales register with HSN codes, GST breakdown, customer types, salesman tracking, and invoice payments.",
    href: "/app/reports/sales?tab=detailed",
    badge: "GST Verified",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: Receipt,
    features: ["Itemized Line Items", "HSN & GST Breakdown", "Doctor/Salesman Info", "CSV / Excel Export"],
    tags: ["sales", "bill", "invoice", "tax invoice", "register", "customer", "gst"],
  },
  {
    id: "sales-summary",
    code: "SALES-SUM-02",
    title: "Sales Summary & Slices",
    category: "sales",
    categoryName: "Sales & Returns",
    description:
      "Multi-dimensional sales aggregation grouped by date, month, customer, branch, warehouse, or payment mode.",
    href: "/app/reports/sales?tab=summary",
    badge: "Multi-Slice",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: TrendingUp,
    features: ["Date / Month Aggregates", "Gross vs Net Sales", "Outstanding Balances", "Payment Modes"],
    tags: ["sales", "summary", "monthly", "gross sales", "net sales", "party sales"],
  },
  {
    id: "credit-notes-register",
    code: "SALE-RET-03",
    title: "Credit Note & Sales Return Register",
    category: "sales",
    categoryName: "Sales & Returns",
    description:
      "Full audit of goods returned, Credit Notes issued, GST reversals, restocked warehouse inventory, and party balance credits.",
    href: "/app/sales/returns",
    badge: "Credit Note Ready",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: RotateCcw,
    features: ["Credit Note #", "Return Reasons", "Stock Restored", "GL Reversal Audit"],
    tags: ["credit note", "sales return", "return register", "cn", "goods return", "refund"],
  },
  {
    id: "pos-counter-sales",
    code: "POS-SLIP-04",
    title: "POS Counter & Cash Memo Register",
    category: "sales",
    categoryName: "Sales & Returns",
    description:
      "Rapid counter billing slips, walk-in cash memos, UPI reconciliation, and shift register totals.",
    href: "/app/reports/sales?tab=summary&mode=pos",
    badge: "High Speed",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: Zap,
    features: ["Walk-in Billing", "Cash & UPI Mode", "Shift Settlement", "Thermal Slips"],
    tags: ["pos", "counter", "cash memo", "retail", "walk-in", "cash sale"],
  },

  // ─── 2. PURCHASES & VENDORS ──────────────────────────────────────────────
  {
    id: "purchase-detailed",
    code: "PUR-REG-05",
    title: "Purchase Register (Itemized)",
    category: "purchase",
    categoryName: "Purchases & Inward",
    description:
      "Comprehensive procurement audit tracking supplier bills, invoice numbers, GST input tax credits (ITC), and payments.",
    href: "/app/reports/purchases?tab=detailed",
    badge: "ITC Verified",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    icon: ShoppingCart,
    features: ["Vendor Bill Reference", "Taxable & GST ITC", "Supplier Status", "CSV / Excel Export"],
    tags: ["purchase", "vendor bill", "procurement", "itc", "input tax credit", "supplier bill"],
  },
  {
    id: "purchase-summary",
    code: "PUR-SUM-06",
    title: "Purchase Summary",
    category: "purchase",
    categoryName: "Purchases & Inward",
    description:
      "Executive procurement aggregates grouped by supplier, branch, warehouse, or calendar periods.",
    href: "/app/reports/purchases?tab=summary",
    badge: "Vendor Grouped",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    icon: FileText,
    features: ["Supplier Grouping", "Total Qty & Value", "Pending Payables", "Period Analysis"],
    tags: ["purchase summary", "supplier purchase", "vendor total", "monthly purchase"],
  },
  {
    id: "supplier-ledger",
    code: "SUPP-LED-07",
    title: "Supplier Ledger & Statement",
    category: "purchase",
    categoryName: "Purchases & Inward",
    description:
      "Vendor running ledger account showing purchase bills, debit notes, cash/bank payments, and closing balances.",
    href: "/app/reports/ledger?partyType=supplier",
    badge: "Vendor Ledger",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    icon: BookOpen,
    features: ["Bills vs Payments", "Running Balance", "Debit Notes", "Account Statement"],
    tags: ["supplier ledger", "vendor ledger", "payable ledger", "supplier statement", "vendor balance"],
  },

  // ─── 3. INVENTORY & STOCK ────────────────────────────────────────────────
  {
    id: "company-stock-sales",
    code: "COMPANY-STK-SALES",
    title: "Company Stock & Sales Statement",
    category: "inventory",
    categoryName: "Inventory & Stock",
    description:
      "Unified Brand/Company-wise statement with Packing, MRP, Purchase & Sale Prices, Units, Period Purchases (Stock In), Current Stock, Valuation, and Period Sales.",
    href: "/app/reports/company-stock-sales",
    badge: "Company Wise",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: Building2,
    features: [
      "Company / Brand Filter",
      "Packing & MRP Columns",
      "Period Stock-In vs Sales",
      "Current Stock Valuation",
    ],
    tags: [
      "company stock",
      "brand statement",
      "stock and sales",
      "company wise",
      "packing",
      "purchase price",
      "sale price",
      "brand wise",
    ],
  },
  {
    id: "stock-balance",
    code: "STK-BAL-08",
    title: "Real-Time Stock Balance",
    category: "inventory",
    categoryName: "Inventory & Stock",
    description:
      "Live warehouse inventory balances with batch/expiry tracking, reserved orders, min-alert thresholds, and stock valuation.",
    href: "/app/reports/stock?tab=balance",
    badge: "Live Balance",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: Boxes,
    features: ["Batch & Expiry", "Critical/Low Status", "Deficit & Reorder", "Multi-Godown"],
    tags: ["stock", "inventory", "stock balance", "current stock", "godown", "warehouse stock"],
  },
  {
    id: "stock-valuation",
    code: "STK-VAL-09",
    title: "Stock Valuation Register",
    category: "inventory",
    categoryName: "Inventory & Stock",
    description:
      "Periodic inventory audit with opening stock, inward receipts, outward issues, adjustments, and weighted cost valuation.",
    href: "/app/reports/stock?tab=valuation",
    badge: "COGS Audited",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: FileSpreadsheet,
    features: ["Opening + In - Out", "Weighted Cost Rate", "Closing Valuation", "FIFO / Avg Cost"],
    tags: ["valuation", "stock value", "inventory value", "closing stock", "cogs"],
  },
  {
    id: "low-stock-alert",
    code: "STK-LOW-10",
    title: "Low Stock & Reorder Levels",
    category: "inventory",
    categoryName: "Inventory & Stock",
    description:
      "Fast identification of items falling below minimum threshold to avoid out-of-stock and sales losses.",
    href: "/app/reports/stock?tab=balance&filter=low",
    badge: "Auto Alert",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    icon: Clock,
    features: ["Min Reorder Level", "Deficit Units", "Auto PO Trigger", "Supplier Mapping"],
    tags: ["low stock", "reorder", "out of stock", "shortage", "reorder level"],
  },

  // ─── 4. RECEIVABLES & PAYABLES (AGEING) ──────────────────────────────────
  {
    id: "debtor-ageing",
    code: "DEBT-AGE-11",
    title: "Debtor Ageing Schedule (A/R)",
    category: "ageing",
    categoryName: "Receivables & Ageing",
    description:
      "Accounts receivable overdue schedule computed against real invoice due dates into standard 9 slabs with credit limit checks.",
    href: "/app/reports/ageing?tab=debtors",
    badge: "Receivables A/R",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    icon: Clock,
    features: ["9 Overdue Slabs (0-30, 31-60...)", "Invoice Due Dates", "Credit Utilization %", "Direct Reminder"],
    tags: ["ageing", "debtors", "receivables", "overdue", "outstanding", "customer due", "ar"],
  },
  {
    id: "creditor-ageing",
    code: "CRED-AGE-12",
    title: "Creditor Ageing Schedule (A/P)",
    category: "ageing",
    categoryName: "Receivables & Ageing",
    description:
      "Accounts payable overdue schedule tracking supplier bills across 9 overdue slabs for cash flow forecasting.",
    href: "/app/reports/ageing?tab=creditors",
    badge: "Payables A/P",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    icon: Clock,
    features: ["Supplier Overdue Slabs", "Vendor Bill Tracking", "Payables Forecast", "Cash Planning"],
    tags: ["creditors", "payables", "supplier due", "vendor outstanding", "ap", "overdue bills"],
  },
  {
    id: "customer-ledger",
    code: "CUST-LED-13",
    title: "Customer Ledger & Statement",
    category: "ageing",
    categoryName: "Receivables & Ageing",
    description:
      "Complete customer account statement with invoices, credit notes, receipts, running balance, and bill-wise settlement.",
    href: "/app/reports/ledger?partyType=customer",
    badge: "Party Ledger",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    icon: BookOpen,
    features: ["Invoices vs Payments", "Running Balance", "Credit Notes", "WhatsApp / PDF Share"],
    tags: ["customer ledger", "party statement", "account ledger", "khata", "statement"],
  },

  // ─── 5. TAXATION & GST COMPLIANCE ────────────────────────────────────────
  {
    id: "ca-pack",
    code: "CA-PACK-14",
    title: "CA Pack (GST & Tax Audit Register)",
    category: "gst",
    categoryName: "GST & Tax Audit",
    description:
      "Standard Chartered Accountant format with Bill No, Party GSTIN, Value of Goods, CGST, SGST, IGST, Total Tax, Invoice Value, HSN, Quantity & Unit.",
    href: "/app/reports/ca-pack",
    badge: "Tax Audit Ready",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    icon: Receipt,
    features: ["Bill-by-Bill Breakdown", "Slab-wise GST Rates", "Export PDF / Excel / CSV", "CA Email / WhatsApp"],
    tags: ["ca pack", "ca report", "tax audit", "gst audit", "hsn summary", "ca register"],
  },
  {
    id: "gstr1-returns",
    code: "GSTR-1-15",
    title: "GSTR-1 Sales Returns",
    category: "gst",
    categoryName: "GST & Tax Audit",
    description:
      "Government portal compliant outward supply tables: B2B, B2CL, B2CS, Credit/Debit Notes, and HSN Summary.",
    href: "/app/reports/gst?tab=gstr1",
    badge: "Govt Compliant",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    icon: FileText,
    features: ["B2B & B2C Tables", "Credit / Debit Reversals", "HSN Table 12", "Direct Portal CSV"],
    tags: ["gstr1", "gstr-1", "gst returns", "b2b", "b2c", "tax filing"],
  },
  {
    id: "gstr3b-returns",
    code: "GSTR-3B-16",
    title: "GSTR-3B Summary & ITC",
    category: "gst",
    categoryName: "GST & Tax Audit",
    description:
      "Monthly tax liability vs Input Tax Credit (ITC) reconciliation for exact net tax payment computation.",
    href: "/app/reports/gst?tab=gstr3b",
    badge: "Net Tax Payable",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    icon: FileSpreadsheet,
    features: ["Output Tax Liability", "Eligible ITC", "Inward Reverse Charge", "Net Cash Tax"],
    tags: ["gstr3b", "gstr-3b", "itc summary", "tax liability", "gst payment"],
  },

  // ─── 6. FINANCIAL STATEMENTS & MIS ───────────────────────────────────────
  {
    id: "true-pnl",
    code: "FIN-PNL-17",
    title: "True Profit & Loss (P&L)",
    category: "financials",
    categoryName: "Financials & MIS",
    description:
      "Mathematically rigorous income statement featuring Net Revenue, true COGS, gross margins, real categorized expense vouchers, and net profit.",
    href: "/app/reports/pnl",
    badge: "Real Margins",
    badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    icon: Sparkles,
    features: ["Net Sales - Returns", "Accurate COGS", "Operating Expenses", "Net Margin %"],
    tags: ["profit", "loss", "pnl", "income statement", "gross profit", "net profit", "margins"],
  },
  {
    id: "executive-summary",
    code: "EXEC-MIS-18",
    title: "Executive Business Summary",
    category: "financials",
    categoryName: "Financials & MIS",
    description:
      "360-degree commercial dashboard with sales vs purchases, collection efficiency, receivables vs payables, and working capital.",
    href: "/app/reports/summary",
    badge: "Executive MIS",
    badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    icon: BarChart3,
    features: ["Sales vs Purchases", "Collection Ratio", "Working Capital", "Branch Comparison"],
    tags: ["mis", "summary", "business summary", "dashboard report", "management report"],
  },
];

const CATEGORIES: { id: ReportCategory; label: string; count: number }[] = [
  { id: "all", label: "All Reports", count: ALL_REPORTS.length },
  { id: "sales", label: "Sales & Returns", count: ALL_REPORTS.filter((r) => r.category === "sales").length },
  { id: "purchase", label: "Purchases & Inward", count: ALL_REPORTS.filter((r) => r.category === "purchase").length },
  { id: "inventory", label: "Inventory & Stock", count: ALL_REPORTS.filter((r) => r.category === "inventory").length },
  { id: "ageing", label: "Receivables & Ageing", count: ALL_REPORTS.filter((r) => r.category === "ageing").length },
  { id: "gst", label: "GST & Tax Audit", count: ALL_REPORTS.filter((r) => r.category === "gst").length },
  { id: "financials", label: "Financials & MIS", count: ALL_REPORTS.filter((r) => r.category === "financials").length },
];

export default function ReportsHubPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>("all");
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Filter reports by category and search term
  const filteredReports = useMemo(() => {
    return ALL_REPORTS.filter((report) => {
      const matchCategory = selectedCategory === "all" || report.category === selectedCategory;
      if (!matchCategory) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase().trim();
      return (
        report.title.toLowerCase().includes(term) ||
        report.code.toLowerCase().includes(term) ||
        report.description.toLowerCase().includes(term) ||
        report.categoryName.toLowerCase().includes(term) ||
        report.tags.some((t) => t.includes(term))
      );
    });
  }, [selectedCategory, search]);

  // Reports available for the report dropdown
  const availableReportsForDropdown = useMemo(() => {
    if (selectedCategory === "all") return ALL_REPORTS;
    return ALL_REPORTS.filter((r) => r.category === selectedCategory);
  }, [selectedCategory]);

  const handleQuickJump = (reportId: string) => {
    setSelectedReportId(reportId);
    if (!reportId) return;
    const target = ALL_REPORTS.find((r) => r.id === reportId);
    if (target) {
      router.push(target.href);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Enterprise Report Command Center
              </h1>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Data Engine
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              100% authoritative transactional reporting with zero-shortcuts, instant multi-slice drilldowns, and GST compliance.
            </p>
          </div>
        </div>

        {/* Global Instant Search */}
        <div className="relative w-full md:w-80 lg:w-96 shrink-0">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report (e.g. Sales, GST, Ageing, Profit)..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-all shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── SAMNE-SAMNE DUAL DROPDOWN COMMAND BAR ── */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
              Instant Report Navigator (Samne-Samne Quick Selector)
            </span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Showing <b className="text-foreground">{filteredReports.length}</b> of {ALL_REPORTS.length} Verified Reports
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Dropdown 1: Category Selector */}
          <div className="lg:col-span-5 space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              1. Select Report Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value as ReportCategory);
                setSelectedReportId("");
              }}
              className="w-full py-2.5 px-3 bg-surface-elevated border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary font-medium transition cursor-pointer shadow-xs"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label} ({cat.count} Reports)
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 2: Direct Report Selector */}
          <div className="lg:col-span-5 space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              2. Select Specific Report to Open
            </label>
            <select
              value={selectedReportId}
              onChange={(e) => handleQuickJump(e.target.value)}
              className="w-full py-2.5 px-3 bg-surface-elevated border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary font-medium transition cursor-pointer shadow-xs"
            >
              <option value="">-- Choose Report to Open Directly --</option>
              {availableReportsForDropdown.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.code}] {r.title}
                </option>
              ))}
            </select>
          </div>

          {/* Action Button */}
          <div className="lg:col-span-2 flex items-end">
            <button
              onClick={() => selectedReportId && handleQuickJump(selectedReportId)}
              disabled={!selectedReportId}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm ${
                selectedReportId
                  ? "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                  : "bg-surface-elevated text-muted-foreground border border-border cursor-not-allowed opacity-60"
              }`}
            >
              <span>Open Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Pills / Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-border no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedReportId("");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-surface-elevated text-muted-foreground hover:text-foreground border border-border hover:bg-surface"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Enterprise Governance & Real Engine Status Bar ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-surface to-purple-500/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Enterprise Reporting Engine Online
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct connection to authoritative Sales, Purchase, Inventory Ledger, GST Tax Engine, and Double-Entry Journal Vouchers.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-foreground bg-surface px-2.5 py-1 rounded-lg border border-border">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tenant Isolated</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-foreground bg-surface px-2.5 py-1 rounded-lg border border-border">
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>RFC-4180 CSV / Excel Ready</span>
          </div>
        </div>
      </div>

      {/* ── Grid of Reports ── */}
      {filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-2xl space-y-3">
          <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">No reports matching your criteria</h3>
          <p className="text-xs text-muted-foreground">
            Try adjusting your search query or reset the category filter to view all available reports.
          </p>
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSearch("");
            }}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReports.map((report) => {
            const Icon = report.icon;
            return (
              <Link
                key={report.id}
                href={report.href}
                className="group p-5 rounded-2xl bg-surface border border-border hover:border-primary/50 hover:bg-surface-elevated transition-all duration-200 flex flex-col justify-between hover:shadow-xl hover:shadow-primary/5 relative overflow-hidden"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-surface-elevated text-primary border border-border group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-muted-foreground font-mono">
                        {report.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${report.badgeColor}`}
                      >
                        {report.badge}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {report.categoryName}
                    </div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors mt-0.5">
                      {report.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 line-clamp-2">
                      {report.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {report.features.map((feat) => (
                      <span
                        key={feat}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-foreground border border-border"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs font-bold text-primary group-hover:underline">
                  <span>Open Report</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
