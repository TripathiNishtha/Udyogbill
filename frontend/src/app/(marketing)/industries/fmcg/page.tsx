import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Truck,
  ShieldCheck,
  Package,
  MapPin,
  Percent,
  HelpCircle
} from "lucide-react";

export const metadata: Metadata = {
  title: "FMCG & Grocery Distributor Billing Software | Case-to-Piece POS",
  description: "Cloud GST billing software engineered for FMCG distributors and wholesale grocery merchants. Automated case-pack conversion, trade schemes, beat route ordering, and bulk pricing.",
  alternates: {
    canonical: "https://udyogbill.com/industries/fmcg",
  },
  openGraph: {
    title: "FMCG & Grocery Distributor Billing Software | UdyogBill",
    description: "Automated carton-to-piece conversions, distributor trade schemes, beat route order taking, and bulk invoicing for FMCG businesses.",
    url: "https://udyogbill.com/industries/fmcg",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function FMCGIndustryPage() {
  const painPoints = [
    {
      problem: "Manual carton-to-piece math errors leading to inventory discrepancies",
      solution: "Automatic packaging unit conversion (e.g. 1 Carton = 24 Pieces) at purchase & sale",
    },
    {
      problem: "Dispute over brand trade schemes, cash discounts, and target bonuses",
      solution: "Pre-configured manufacturer discount slabs applied automatically on invoice generation",
    },
    {
      problem: "Inefficient salesman beat routing and delayed delivery collections",
      solution: "Route-wise party order collection and delivery challan printing organized by market beat",
    },
  ];

  const features = [
    {
      icon: Package,
      title: "Automatic Case-Pack Conversion",
      desc: "Purchase goods in master cartons, boxes, or crates, and sell them in pieces, pouches, or strips with instant fractional stock tracking.",
    },
    {
      icon: Percent,
      title: "Trade Schemes & Volume Slabs",
      desc: "Configure manufacturer trade schemes, quantity-based discounts (e.g. Buy 5 Cases Get 2 Pouches Free), and distributor margin matrices.",
    },
    {
      icon: MapPin,
      title: "Beat Route & Salesman Dispatch",
      desc: "Assign retail stores to specific delivery beats. Print consolidated loading sheets and delivery challans for drivers in seconds.",
    },
    {
      icon: ShieldCheck,
      title: "Strict MRP Compliance & Price Lists",
      desc: "Maintain multi-tier price lists (Wholesale, Super Stockist, Retail). Ensure invoiced prices never exceed statutory maximum retail prices.",
    },
    {
      icon: Truck,
      title: "Speedy E-Way Bill Generation",
      desc: "Generate government-compliant E-Way bills directly from sales dispatches with automated distance estimation and vehicle details.",
    },
    {
      icon: CheckCircle,
      title: "Retailer Credit & Outstanding Ledger",
      desc: "Enforce credit periods on kirana stores and supermarkets. Send polite automated payment reminder statements directly via WhatsApp.",
    },
  ];

  const relatedIndustries = [
    { name: "Pharma Distribution", href: "/industries/pharma" },
    { name: "Retail & Supermarket", href: "/industries/retail" },
    { name: "Wholesale & Stockists", href: "/industries/wholesale" },
    { name: "Bakery & Confectionery", href: "/industries/bakery" },
  ];

  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* ── Hero Section ── */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-200 bg-amber-50 text-amber-900 shadow-2xs">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                High-Velocity FMCG & Grocery Distribution ERP
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-slate-950 tracking-tight leading-[1.2]">
                Powering Fast-Paced Growth for{" "}
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  FMCG Distributors & Wholesalers
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                Automate case-to-piece packaging conversions, manage complex manufacturer trade schemes, organize salesman beat routes, and maintain accurate retailer ledgers with UdyogBill.
              </p>

              <div className="flex gap-3 flex-wrap pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 shadow-sm transition-all"
                >
                  Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20I%20want%20a%20demo%20of%20UdyogBill%20FMCG%20Billing%20Software"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-xs sm:text-sm transition-all shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Live FMCG Demo
                </a>
              </div>
            </div>

            {/* Pain Point vs Solution Card */}
            <div className="lg:col-span-5 rounded-2xl p-5 border-2 border-orange-200 bg-orange-50/40">
              <h3 className="font-black text-slate-950 mb-3 text-sm sm:text-base">
                Operational Bottlenecks Solved:
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
              Engineered for High-Frequency Distribution Operations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Process hundreds of daily retail store orders without computational delays or stock mismatches.
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
              <p className="text-xs text-slate-600">Specialized billing solutions for allied business categories.</p>
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
                href="/features"
                className="px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-300 text-orange-800 font-bold text-xs hover:bg-orange-100 transition-all"
              >
                All ERP Features →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
