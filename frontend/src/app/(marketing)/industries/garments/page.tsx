import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Layers,
  Barcode,
  Tag,
  Percent,
  Sparkles,
  ShoppingBag
} from "lucide-react";

export const metadata: Metadata = {
  title: "Garments, Apparel & Footwear POS Billing Software | Size & Color Matrix",
  description: "Specialized retail and wholesale garment billing software. Matrix tracking by size, color, brand, design code, barcode sticker printing, and end-of-season sales.",
  alternates: {
    canonical: "https://udyogbill.com/industries/garments",
  },
  openGraph: {
    title: "Garments & Apparel POS Billing Software | UdyogBill",
    description: "Manage multi-variant apparel stock with size-color-fit grids, barcode tag generation, and fast counter checkout.",
    url: "https://udyogbill.com/industries/garments",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function GarmentsIndustryPage() {
  const painPoints = [
    {
      problem: "Creating separate item entries for every size, color, and fit variant",
      solution: "Unified Parent Item Master with multi-dimensional Size-Color-Variant matrix",
    },
    {
      problem: "Difficulty printing custom apparel price tags and barcode swing stickers",
      solution: "Direct 1-click thermal barcode label printing with MRP, brand, and size info",
    },
    {
      problem: "Manual stock clearing during End-of-Season Sales (EOSS) causing margin losses",
      solution: "Automated seasonal discount matrices, flat combo sales, and bundle pricing",
    },
  ];

  const features = [
    {
      icon: Layers,
      title: "Size-Color-Fit Matrix Grid",
      desc: "Add shirts, trousers, or footwear once, and define multiple sizes (e.g. S, M, L, XL, 32, 34) and colors with real-time stock balances per variant.",
    },
    {
      icon: Barcode,
      title: "Custom Barcode Swing Tag Printing",
      desc: "Print professional garment hang tags, price stickers, and barcode labels supporting both thermal roll printers and standard sticker sheets.",
    },
    {
      icon: Percent,
      title: "End-of-Season Sale (EOSS) Promotions",
      desc: "Launch time-sensitive clearance sales effortlessly (e.g. Buy 2 Get 1 Free, Flat 40% Off on select brands) with automated register application.",
    },
    {
      icon: ShoppingBag,
      title: "Rapid Counter POS with Alteration Slips",
      desc: "Issue fast thermal receipts with customer tailoring and alteration instructions printed directly on the delivery voucher.",
    },
    {
      icon: Tag,
      title: "Brand-Wise & Category Margin Tracking",
      desc: "Analyze profitability across different clothing labels, ethnic wear, western collections, and winter assortments.",
    },
    {
      icon: CheckCircle,
      title: "Customer Purchase History & Style Preferences",
      desc: "Capture customer phone numbers to review past sizes, preferred brands, and notify them via WhatsApp when new seasonal collections arrive.",
    },
  ];

  const relatedIndustries = [
    { name: "Retail Stores", href: "/industries/retail" },
    { name: "Electronics & Mobile", href: "/industries/electronics" },
    { name: "Wholesale & Stockists", href: "/industries/wholesale" },
    { name: "General Trading", href: "/industries/general-trading" },
  ];

  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* ── Hero Section ── */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-purple-200 bg-purple-50 text-purple-900 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                Modern Apparel, Footwear & Boutique POS ERP
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-slate-950 tracking-tight leading-[1.2]">
                Master Apparel Retailing with{" "}
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Size-Color Matrix & Fast Barcoding
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                Eliminate catalog clutter with unified size and color matrix tracking, print custom barcode swing tags, launch high-impact clearance sales, and delight shoppers with UdyogBill.
              </p>

              <div className="flex gap-3 flex-wrap pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 shadow-sm transition-all"
                >
                  Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20I%20want%20a%20demo%20of%20UdyogBill%20Garments%20Billing%20Software"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-xs sm:text-sm transition-all shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Live Garments Demo
                </a>
              </div>
            </div>

            {/* Pain Point vs Solution Card */}
            <div className="lg:col-span-5 rounded-2xl p-5 border-2 border-orange-200 bg-orange-50/40">
              <h3 className="font-black text-slate-950 mb-3 text-sm sm:text-base">
                Apparel Retailing Headaches Solved:
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
              Engineered for Boutiques, Showrooms & Wholesalers
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Complete inventory control across seasons, styles, fabrics, and fit variants.
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
