import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Building2,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  Zap,
  TrendingUp
} from "lucide-react";

export const metadata: Metadata = {
  title: "General Trading, Commission Agent & Merchant Billing Software",
  description: "Cloud GST billing and inventory ERP for commission agents, general trading companies, and multi-product traders. Dalal commission tracking, multi-godown stock transfers, and automated GST reporting.",
  alternates: {
    canonical: "https://udyogbill.com/industries/general-trading",
  },
  openGraph: {
    title: "General Trading & Commission Agent Billing Software | UdyogBill",
    description: "Dalal commission ledger, multi-godown stock, and high-speed B2B trading invoices with UdyogBill.",
    url: "https://udyogbill.com/industries/general-trading",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function GeneralTradingIndustryPage() {
  const painPoints = [
    {
      problem: "Tracking third-party broker and dalal commissions separately for each trade deal",
      solution: "Automatic broker commission calculator generating party-wise commission vouchers",
    },
    {
      problem: "Handling thousands of diverse product SKUs without standard categorization",
      solution: "Hierarchical Category-Brand-Unit master with 1-click Excel bulk import",
    },
    {
      problem: "Complicated inter-state IGST calculations and freight charge additions",
      solution: "Automatic place-of-supply tax engine calculating IGST vs CGST/SGST with freight line items",
    },
  ];

  const features = [
    {
      icon: Users,
      title: "Broker & Dalal Commission Tracking",
      desc: "Assign buying or selling agents to any invoice. Compute percentage-based or flat rate commission vouchers automatically.",
    },
    {
      icon: Building2,
      title: "Multi-Location Branch & Godown Sync",
      desc: "Consolidate stock levels, receivables, and profit margins across central offices and regional godowns in real time.",
    },
    {
      icon: FileSpreadsheet,
      title: "1-Click Universal Excel Data Importer",
      desc: "Migrate decades of inventory items, supplier lists, and opening balances from Vyapar, Busy, Marg, or Excel in under 5 minutes.",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Gross & Net Profit Margin Analysis",
      desc: "Monitor transaction-level gross profit margins immediately on invoice submission to prevent underpriced sales dispatches.",
    },
    {
      icon: Zap,
      title: "Direct WhatsApp Invoicing & Receipts",
      desc: "Send branded PDF bills, delivery receipts, and payment acknowledgment links to your trade partners' WhatsApp automatically.",
    },
    {
      icon: ShieldCheck,
      title: "Bank-Grade Cloud Data Protection",
      desc: "Hosted on resilient Oracle Cloud Infrastructure with automated daily offsite snapshots and role-based staff permissions.",
    },
  ];

  const relatedIndustries = [
    { name: "Wholesale & Stockists", href: "/industries/wholesale" },
    { name: "FMCG Distribution", href: "/industries/fmcg" },
    { name: "Hardware & Building", href: "/industries/hardware" },
    { name: "Retail Stores", href: "/industries/retail" },
  ];

  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* ── Hero Section ── */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-slate-300 bg-slate-100 text-slate-900 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-slate-700" />
                Comprehensive General Trading & Merchant ERP
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-slate-950 tracking-tight leading-[1.2]">
                Power Multi-Product Trading with{" "}
                <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Automated Commission & Ledgers
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                Effortlessly manage diverse inventory catalogs, track dalal commissions, synchronize multi-branch accounts, and maintain impeccable GST compliance with UdyogBill.
              </p>

              <div className="flex gap-3 flex-wrap pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 shadow-sm transition-all"
                >
                  Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20I%20want%20a%20demo%20of%20UdyogBill%20General%20Trading%20Software"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-xs sm:text-sm transition-all shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Live Trading Demo
                </a>
              </div>
            </div>

            {/* Pain Point vs Solution Card */}
            <div className="lg:col-span-5 rounded-2xl p-5 border-2 border-orange-200 bg-orange-50/40">
              <h3 className="font-black text-slate-950 mb-3 text-sm sm:text-base">
                Trading Roadblocks Eliminated:
              </h3>
              <div className="space-y-2.5">
                {painPoints.map((item) => (
                  <div key={item.problem} className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                    <div className="text-[11px] text-red-600 font-bold mb-0.5">⚠️ {item.problem}</div>
                    <div className="text-xs font-semibold text-slate-800 flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                      <span>{item.solution}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Specialized Capabilities ── */}
      <section className="py-4 sm:py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 mb-1.5">
              Built for Diverse Commodity Merchants & Commission Agents
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Versatile accounting tools that flex around your varied vendor contracts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-3.5 p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-orange-200 bg-orange-50 text-orange-600">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950 text-sm sm:text-base mb-1">{f.title}</h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Related Verticals & SEO Links ── */}
      <section className="py-6 sm:pb-8 border-t border-slate-200 bg-slate-50/50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-950">Explore Other Industry Modules:</h4>
              <p className="text-xs text-slate-600">Specialized billing solutions for allied trading sectors.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {relatedIndustries.map((ind) => (
                <Link
                  key={ind.name}
                  href={ind.href}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:border-orange-400 hover:text-orange-600 transition-all shadow-2xs"
                >
                  {ind.name}
                </Link>
              ))}
              <Link
                href="/pricing"
                className="px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-300 text-orange-800 font-bold text-xs hover:bg-orange-100 transition-all"
              >
                View Pricing Plans →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
