import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Cake,
  Clock,
  Printer,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";

export const metadata: Metadata = {
  title: "Bakery, Sweet Shop & Cafe Billing Software | Recipe BOM & Expiry",
  description: "POS billing and production inventory software for bakeries, sweet shops, and confectionery counters. Track raw ingredient recipe BOM, shelf-life expiry, and advance custom cake orders.",
  alternates: {
    canonical: "https://udyogbill.com/industries/bakery",
  },
  openGraph: {
    title: "Bakery & Sweet Shop Billing Software | UdyogBill",
    description: "Recipe Bill of Materials (BOM), perishable shelf-life tracking, and advance cake booking with UdyogBill.",
    url: "https://udyogbill.com/industries/bakery",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function BakeryIndustryPage() {
  const painPoints = [
    {
      problem: "Perishable baked goods expiring unnoticed on display shelves",
      solution: "Real-time shelf-life tracking with automated discount triggers for day-old items",
    },
    {
      problem: "Messy handwritten advance custom cake orders with forgotten delivery dates",
      solution: "Digital advance booking diary with customer reference images, weight, flavor, and delivery alerts",
    },
    {
      problem: "Inability to compute exact cost per piece for cakes, breads, and pastries",
      solution: "Recipe Bill of Materials (BOM) automatically deducting flour, sugar, butter, and packaging stock",
    },
  ];

  const features = [
    {
      icon: Layers,
      title: "Recipe Bill of Materials (BOM)",
      desc: "Define ingredient formulas for each cake, loaf, or sweet. When a batch is produced, raw ingredients are deducted automatically from inventory.",
    },
    {
      icon: Calendar,
      title: "Advance Custom Cake Booking",
      desc: "Capture advance token payments, custom photo cake uploads, custom message scripts, and scheduled delivery times with automated WhatsApp receipts.",
    },
    {
      icon: Clock,
      title: "Perishable Shelf-Life Tracking",
      desc: "Track batch production hours and expiry dates. Generate near-expiry alerts so cashiers can clear fresh bakery items before spoilage.",
    },
    {
      icon: Printer,
      title: "High-Speed Kitchen & Counter Tokens",
      desc: "Print compact 2-inch and 3-inch thermal receipts for walk-in counter customers and instant preparation tokens for the baking team.",
    },
    {
      icon: Cake,
      title: "Table Orders & Fast Takeaway POS",
      desc: "Manage dine-in table orders, counter takeaways, and online delivery aggregators from one intuitive touch-screen POS interface.",
    },
    {
      icon: CheckCircle,
      title: "FSSAI Statutory License Display",
      desc: "Automatically print your mandatory 14-digit FSSAI registration number and best-before consumption guidelines on all sales receipts.",
    },
  ];

  const relatedIndustries = [
    { name: "Retail & Supermarket", href: "/industries/retail" },
    { name: "FMCG Distribution", href: "/industries/fmcg" },
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-rose-200 bg-rose-50 text-rose-900 shadow-2xs">
                <Cake className="w-3.5 h-3.5 text-rose-600" />
                Artisanal Bakery & Sweet Shop Operating POS
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-slate-950 tracking-tight leading-[1.2]">
                Deliver Sweet Perfection with{" "}
                <span className="bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">
                  Smart Bakery POS & Recipe BOM
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                Automate recipe raw ingredient consumption, manage advance custom cake deliveries, track perishable shelf-life, and speed up counter billing with UdyogBill.
              </p>

              <div className="flex gap-3 flex-wrap pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 shadow-sm transition-all"
                >
                  Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20I%20want%20a%20demo%20of%20UdyogBill%20Bakery%20Billing%20Software"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-xs sm:text-sm transition-all shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Live Bakery Demo
                </a>
              </div>
            </div>

            {/* Pain Point vs Solution Card */}
            <div className="lg:col-span-5 rounded-2xl p-5 border-2 border-orange-200 bg-orange-50/40">
              <h3 className="font-black text-slate-950 mb-3 text-sm sm:text-base">
                Bakery Operational Challenges Solved:
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
              Designed for Patisseries, Sweet Shops & Cafes
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Complete recipe-to-counter tracking that keeps spoilage near zero.
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
              <p className="text-xs text-slate-600">Specialized billing solutions for food and retail sectors.</p>
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
