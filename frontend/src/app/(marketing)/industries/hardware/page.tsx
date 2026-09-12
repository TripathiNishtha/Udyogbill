import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Wrench,
  Scale,
  Building,
  Users,
  FileText,
  Calculator
} from "lucide-react";

export const metadata: Metadata = {
  title: "Hardware, Sanitary & Building Material Billing Software | Decimal & Weight UOM",
  description: "GST billing software for hardware stores, sanitaryware, plywood, and building material suppliers. Supports decimal billing (Sq.Ft, MT, Bags), TMT saria weight formulas, and contractor credit ledgers.",
  alternates: {
    canonical: "https://udyogbill.com/industries/hardware",
  },
  openGraph: {
    title: "Hardware & Building Material Billing Software | UdyogBill",
    description: "Decimal UOM calculation, TMT saria weight formulas, and contractor ledger management with UdyogBill.",
    url: "https://udyogbill.com/industries/hardware",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function HardwareIndustryPage() {
  const painPoints = [
    {
      problem: "Complex multi-unit conversions (e.g. Feet to Sq.Meters, MT to Quintals/KGs, Box to Sq.Ft tiles)",
      solution: "Automatic dual-unit fractional calculator converting measurement units on the fly",
    },
    {
      problem: "Manual rod piece to kilogram conversion for TMT saria leading to billing errors",
      solution: "Built-in steel saria weight formulas computing total tonnage from rod lengths and gauges",
    },
    {
      problem: "Unorganized credit given to plumbers, carpenters, and construction contractors",
      solution: "Contractor commission khata tracking project-wise balance, site delivery receipts, and commissions",
    },
  ];

  const features = [
    {
      icon: Scale,
      title: "Decimal & Multi-UOM Billing",
      desc: "Bill building materials in exact fractional quantities (e.g. 14.75 Sq.Ft, 2.350 Metric Tons, 45.5 Liters) with zero rounding loss.",
    },
    {
      icon: Calculator,
      title: "TMT Saria & Pipe Weight Formulas",
      desc: "Select rebar diameter (8mm, 10mm, 12mm, 16mm, 20mm, 25mm, 32mm) and number of rods. UdyogBill calculates the exact billing weight automatically.",
    },
    {
      icon: Users,
      title: "Mistri & Contractor Commission Khata",
      desc: "Track commission percentages owed to local plumbers, electricians, and contractors. Generate running balance statements in one click.",
    },
    {
      icon: Building,
      title: "Site-Wise Delivery & Gate Passes",
      desc: "Assign separate delivery addresses and site names for construction projects under a single builder or party ledger.",
    },
    {
      icon: Wrench,
      title: "Paint Tinting & Shade Code Tracking",
      desc: "Record exact paint base, color tint codes, and mixing formulas on the invoice to guarantee exact color matching for customer reorders.",
    },
    {
      icon: FileText,
      title: "Consolidated Transport Challans",
      desc: "Issue vehicle-specific dispatch challans for cement, aggregates, and bricks with driver contact details and loading timestamps.",
    },
  ];

  const relatedIndustries = [
    { name: "Wholesale & Stockists", href: "/industries/wholesale" },
    { name: "Electronics & Mobile", href: "/industries/electronics" },
    { name: "General Trading", href: "/industries/general-trading" },
    { name: "Retail & Hardware", href: "/industries/retail" },
  ];

  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* ── Hero Section ── */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-200 bg-amber-50 text-amber-900 shadow-2xs">
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                Robust Hardware, Sanitary & Building Material ERP
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-slate-950 tracking-tight leading-[1.2]">
                Simplify Multi-Unit Measurements with{" "}
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Hardware & Saria Billing
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                Handle complex unit measurements (Sq.Ft, Metric Ton, Bags), compute TMT saria weights automatically, and manage contractor ledgers with precision using UdyogBill.
              </p>

              <div className="flex gap-3 flex-wrap pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 shadow-sm transition-all"
                >
                  Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20I%20want%20a%20demo%20of%20UdyogBill%20Hardware%20Billing%20Software"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-xs sm:text-sm transition-all shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Live Hardware Demo
                </a>
              </div>
            </div>

            {/* Pain Point vs Solution Card */}
            <div className="lg:col-span-5 rounded-2xl p-5 border-2 border-orange-200 bg-orange-50/40">
              <h3 className="font-black text-slate-950 mb-3 text-sm sm:text-base">
                Hardware Retail Obstacles Resolved:
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
              Engineered for Hardware Merchants, Timber & Sanitary Stores
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Accurate fractional accounting for every dimension, gauge, and weight unit.
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
