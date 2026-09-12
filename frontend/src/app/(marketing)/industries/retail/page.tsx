import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Store,
  QrCode,
  Users,
  CreditCard,
  Tag,
  BarChart3,
  HelpCircle
} from "lucide-react";

export const metadata: Metadata = {
  title: "Best Retail Shop & Supermarket POS Billing Software",
  description: "Touch POS and barcode billing software for retail shops, supermarkets, and department stores in India. High-speed 15-second billing, loyalty points, and cash drawer management.",
  alternates: {
    canonical: "https://udyogbill.com/industries/retail",
  },
  openGraph: {
    title: "Best Retail Shop & Supermarket POS Billing Software | UdyogBill",
    description: "High-speed barcode checkout, customer loyalty rewards, split payments, and daily shift cash-drawer closing for Indian retail shops.",
    url: "https://udyogbill.com/industries/retail",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function RetailIndustryPage() {
  const painPoints = [
    {
      problem: "Long customer queues at checkout counters during peak rush hours",
      solution: "15-second rapid barcode scanning with keyboard shortcut POS billing",
    },
    {
      problem: "No systematic way to retain repeat customers and run loyalty programs",
      solution: "Automated cashback points earned on every purchase redeemable at next visit",
    },
    {
      problem: "End-of-day cashier discrepancies between cash drawer, UPI, and card sales",
      solution: "Automated shift-closing reports cross-verifying tender modes with zero cash leakage",
    },
  ];

  const features = [
    {
      icon: Store,
      title: "Touch & Keyboard Optimized POS",
      desc: "Designed for high-stress retail counters. Search items by barcode, product name, or shortcode without touching the mouse.",
    },
    {
      icon: QrCode,
      title: "Universal Barcode Scanner Gun Support",
      desc: "Instant plug-and-play compatibility with all 1D & 2D wireless and USB handheld barcode scanners (Honeywell, TVS, Zebra, NGX).",
    },
    {
      icon: Users,
      title: "Customer Loyalty & Reward Points",
      desc: "Build a loyal customer base. Automatically award loyalty points per rupee spent and allow effortless redemption during checkout.",
    },
    {
      icon: CreditCard,
      title: "Multi-Tender Split Payment Modes",
      desc: "Accept split payments seamlessly across Cash, UPI QR code, Debit/Credit Card, and Store Credit Ledger within a single bill.",
    },
    {
      icon: Tag,
      title: "Automated Promotional Offers & Bundles",
      desc: "Configure Buy-1-Get-1 (BOGO), combo discounts, flat percentage sales, and festival coupons with automated expiry dates.",
    },
    {
      icon: BarChart3,
      title: "Fast-Moving & Dead Stock Analytics",
      desc: "Identify top-revenue items and slow-moving shelf stock to optimize purchase orders and eliminate working capital traps.",
    },
  ];

  const relatedIndustries = [
    { name: "Garments & Apparel", href: "/industries/garments" },
    { name: "Electronics & Mobile", href: "/industries/electronics" },
    { name: "Bakery & Confectionery", href: "/industries/bakery" },
    { name: "FMCG & Grocery", href: "/industries/fmcg" },
  ];

  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* ── Hero Section ── */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-200 bg-emerald-50 text-emerald-900 shadow-2xs">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                Lightning-Fast Retail POS & Inventory Engine
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-slate-950 tracking-tight leading-[1.2]">
                Accelerate Checkout Queues with{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Smart Retail POS Billing
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                Empower your cashiers with high-speed barcode scanning, automated customer loyalty points, thermal receipt printing, and error-free shift cash reconciliation with UdyogBill.
              </p>

              <div className="flex gap-3 flex-wrap pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 shadow-sm transition-all"
                >
                  Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20I%20want%20a%20demo%20of%20UdyogBill%20Retail%20POS%20Software"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-xs sm:text-sm transition-all shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Live Retail POS Demo
                </a>
              </div>
            </div>

            {/* Pain Point vs Solution Card */}
            <div className="lg:col-span-5 rounded-2xl p-5 border-2 border-orange-200 bg-orange-50/40">
              <h3 className="font-black text-slate-950 mb-3 text-sm sm:text-base">
                Retail Counter Friction Solved:
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
              Built for High-Footfall Retail Counters & Supermarkets
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Reduce transaction times and give your walk-in shoppers an elevated counter experience.
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
              <p className="text-xs text-slate-600">Specialized billing solutions for other retail verticals.</p>
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
