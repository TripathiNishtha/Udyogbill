import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Package,
  ShieldCheck,
  Truck,
  Building2,
  Clock,
  FileSpreadsheet
} from "lucide-react";

export const metadata: Metadata = {
  title: "Wholesale & Stockist GST Billing Software India",
  description: "Enterprise billing and inventory ERP for wholesale traders, distributors, and stockists. Multi-godown stock transfers, party credit limits, overdue ageing reports, and bulk WhatsApp invoicing.",
  alternates: {
    canonical: "https://udyogbill.com/industries/wholesale",
  },
  openGraph: {
    title: "Wholesale & Stockist GST Billing Software India | UdyogBill",
    description: "Manage multi-warehouse stock, enforce party credit limits, and accelerate payment collections with UdyogBill Wholesale ERP.",
    url: "https://udyogbill.com/industries/wholesale",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function WholesaleIndustryPage() {
  const painPoints = [
    {
      problem: "Customers exceeding credit limits causing dangerous cash-flow crunches",
      solution: "Hard credit limit and overdue days lock stopping new bills until dues are settled",
    },
    {
      problem: "Loss of visibility into stock scattered across multiple godowns and warehouses",
      solution: "Real-time multi-godown inventory visibility with tracked internal transfer gate passes",
    },
    {
      problem: "Slow B2B invoice generation with hundreds of line items and complex tax rates",
      solution: "High-speed keyboard-only bulk invoice entry with auto-reconciled GST calculations",
    },
  ];

  const features = [
    {
      icon: Building2,
      title: "Multi-Godown Stock Transfers",
      desc: "Track inventory across central warehouses and regional stock points with full transit verification and gate-pass generation.",
    },
    {
      icon: ShieldCheck,
      title: "Automated Credit Limit Enforcement",
      desc: "Define custom credit amounts and allowed credit days per party. Prevent staff from dispatching goods to defaulting accounts.",
    },
    {
      icon: Clock,
      title: "Granular Receivables Ageing Matrix",
      desc: "Analyze outstanding debts segmented by 0-30, 31-60, and 90+ day buckets to prioritize collection calls and minimize bad debts.",
    },
    {
      icon: Truck,
      title: "1-Click E-Way Bill & Dispatch Challans",
      desc: "Generate official logistics dispatch challans and CBIC E-Way bills directly from sales orders with vehicle registration tracking.",
    },
    {
      icon: FileSpreadsheet,
      title: "Universal Excel & Tally Data Export",
      desc: "Export sales ledgers, item masters, and GST reports in standard Excel/JSON formats for seamless monthly Chartered Accountant audits.",
    },
    {
      icon: Package,
      title: "Volume Pricing & Quantity Slabs",
      desc: "Set automatic tiered pricing rules (e.g. 50+ units, 200+ units, master distributor tier) that populate automatically during billing.",
    },
  ];

  const relatedIndustries = [
    { name: "FMCG Distribution", href: "/industries/fmcg" },
    { name: "Pharma Wholesalers", href: "/industries/pharma" },
    { name: "Hardware & Building", href: "/industries/hardware" },
    { name: "General Trading", href: "/industries/general-trading" },
  ];

  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* ── Hero Section ── */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-200 bg-blue-50 text-blue-900 shadow-2xs">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                Enterprise Wholesale & Stockist Operating ERP
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-slate-950 tracking-tight leading-[1.2]">
                Scale Your Wholesale Empire with{" "}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Centralized Inventory & Credit Control
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                Take complete command of multi-godown stock movements, enforce party credit limits, generate instantaneous bulk B2B tax invoices, and accelerate cash recovery with UdyogBill.
              </p>

              <div className="flex gap-3 flex-wrap pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 shadow-sm transition-all"
                >
                  Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20I%20want%20a%20demo%20of%20UdyogBill%20Wholesale%20Billing%20Software"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-xs sm:text-sm transition-all shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Live Wholesale Demo
                </a>
              </div>
            </div>

            {/* Pain Point vs Solution Card */}
            <div className="lg:col-span-5 rounded-2xl p-5 border-2 border-orange-200 bg-orange-50/40">
              <h3 className="font-black text-slate-950 mb-3 text-sm sm:text-base">
                Wholesale Obstacles Eliminated:
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
              Built for Heavy Transaction Volumes & Multi-Godown Networks
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Maintain seamless ledger transparency across all your business partners and warehouses.
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
