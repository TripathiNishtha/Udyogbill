import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Building2,
  CheckCircle2,
  Pill,
  Truck,
  Smartphone,
  Layers,
  Wrench,
  Briefcase,
  Store,
  Cake,
  Package,
  ShieldCheck,
  Zap,
  HelpCircle
} from "lucide-react";

export const metadata: Metadata = {
  title: "Industry-Specific GST Billing Software | Pharma, FMCG, Retail, Garments | UdyogBill",
  description: "Explore UdyogBill specialized cloud billing software engineered for Pharma, FMCG, Supermarkets, Garments, Hardware, Bakeries, Wholesale & Services with zero configuration friction.",
  alternates: {
    canonical: "https://udyogbill.com/industries",
  },
  openGraph: {
    title: "Industry-Specific GST Billing Software | UdyogBill",
    description: "Customized cloud billing, inventory, and GST compliance software tailored for Indian retail, wholesale, and distribution verticals.",
    url: "https://udyogbill.com/industries",
    siteName: "UdyogBill",
    type: "website",
  },
};

const officialIndustries = [
  {
    code: "PHARMA",
    icon: Pill,
    title: "Pharma & Healthcare",
    desc: "Automated batch numbers, expiry dump tracking, Schedule H1 registers, and Form 20B/21B drug license printing for chemists & distributors.",
    href: "/industries/pharma",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    features: ["Batch Expiry Dump & Claims", "Schedule H1 Narcotic Register", "Doctor & Chemist Ledgers", "Pharma Schemes & Bonus Slabs"],
  },
  {
    code: "FMCG",
    icon: Truck,
    title: "FMCG & Food Distribution",
    desc: "Carton-to-piece automatic conversion, distributor trade schemes, beat route ordering, and bulk pricing slabs.",
    href: "/industries/fmcg",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    features: ["Case-Pack Auto Conversion", "Trade Schemes & Slabs", "Beat Route Salesman App", "Distributor Rate Cards"],
  },
  {
    code: "RETAIL",
    icon: Store,
    title: "Retail Stores & Supermarkets",
    desc: "Touch-friendly high-speed POS, 1D/2D laser barcode scanning, loyalty reward points, and daily cashier cash-drawer reconciliation.",
    href: "/industries/retail",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    features: ["15-Second POS Checkout", "Barcode Scanner Gun Support", "Customer Loyalty Points", "Daily Shift Cash Register"],
  },
  {
    code: "WHOLESALE",
    icon: Package,
    title: "Wholesale & Stockists",
    desc: "Multi-godown stock transfers, party credit limit ceilings, overdue receivables ageing, and instant WhatsApp invoice dispatch.",
    href: "/industries/wholesale",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    features: ["Multi-Godown Transfers", "Party Credit Limits", "Receivables Ageing Matrix", "Bulk Dispatch Challans"],
  },
  {
    code: "GARMENTS",
    icon: Layers,
    title: "Garments & Apparel",
    desc: "Size, color, brand, and design variant matrix with custom barcode sticker printing and seasonal promotional discounts.",
    href: "/industries/garments",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    features: ["Size-Color-Fit Matrix", "Barcode Tag Label Printing", "Style Catalog Management", "End-of-Season Promos"],
  },
  {
    code: "ELECTRONICS",
    icon: Smartphone,
    title: "Electronics & Mobile Retail",
    desc: "Dual IMEI & unique serial tracking, automated warranty cards, repair workshop job sheets, and multi-mode split payments.",
    href: "/industries/electronics",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    features: ["Dual IMEI & Serial Tracking", "Warranty Cards & Lookup", "Repair Workshop Job Cards", "Finance / EMI Split Payment"],
  },
  {
    code: "HARDWARE",
    icon: Wrench,
    title: "Hardware, Sanitary & Building Materials",
    desc: "Decimal & multi-UOM billing (Sq.Ft, Metric Ton, Bags), TMT saria weight formulas, and contractor credit ledgers.",
    href: "/industries/hardware",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    features: ["Decimal & Multi-UOM", "TMT Saria Weight Formula", "Paint Tinting Code Tracking", "Mistri / Contractor Ledger"],
  },
  {
    code: "BAKERY",
    icon: Cake,
    title: "Bakery & Confectionery",
    desc: "Raw ingredient consumption (BOM), daily production batch tracking, table orders, and perishable shelf-life alerts.",
    href: "/industries/bakery",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    features: ["Bill of Materials (BOM)", "Shelf-Life Expiry Tracking", "Advance Cake Order Booking", "Quick Thermal Token Print"],
  },
  {
    code: "SERVICE_SECTOR",
    icon: Briefcase,
    title: "Service Sector & Consulting",
    desc: "SAC code management, TDS receivable tracking (194J/194C), recurring retainer billing, and 1-click quotation conversion.",
    href: "/industries/services",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    features: ["SAC Code Master", "TDS 194J & 194C Tracking", "Recurring Retainer Invoices", "Quotation to Invoice in 1-Click"],
  },
  {
    code: "GENERAL_TRADING",
    icon: Building2,
    title: "General Trading & Commission Agents",
    desc: "Broker commission ledgers, multi-branch consolidated reporting, and universal Excel data import.",
    href: "/industries/general-trading",
    badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
    features: ["Broker Commission Tracking", "Centralized Branch Reporting", "Universal Excel Data Import", "256-Bit Cloud Security"],
  },
];

export default function IndustriesHubPage() {
  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* ── Hero Section ── */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200 bg-orange-50 text-orange-900 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            Specialized ERP & Billing Modules for Indian Commerce
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 mb-3 tracking-tight">
            Tailored Billing Solutions Built for{" "}
            <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Your Specific Industry
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-700 font-medium max-w-2xl mx-auto mb-6 leading-relaxed">
            UdyogBill is not a one-size-fits-all software. Every vertical has dedicated data fields, compliance registers, and taxation rules engineered specifically for your business model.
          </p>
        </div>
      </section>

      {/* ── Industry Cards Grid ── */}
      <section className="py-4 sm:py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {officialIndustries.map((ind) => {
              const Icon = ind.icon;
              return (
                <div
                  key={ind.href}
                  className="bg-white rounded-2xl border-2 border-slate-200 hover:border-orange-300 hover:shadow-md transition-all p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-orange-200 bg-orange-50 text-orange-600">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black border uppercase ${ind.badgeColor}`}>
                        {ind.code}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-950 mb-2">
                      {ind.title}
                    </h2>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4 min-h-[48px]">{ind.desc}</p>
                    <ul className="space-y-1.5 mb-6">
                      {ind.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={ind.href}
                    className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 transition-all shadow-2xs"
                  >
                    <span>Explore Specialized Features</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Internal Linking & City SEO Grid ── */}
      <section className="py-6 sm:pb-8 border-t border-slate-200 bg-slate-50/50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-center max-w-3xl mx-auto mb-6">
            <h3 className="text-lg sm:text-xl font-black text-slate-950 mb-2">
              Serving Commercial Hubs Across India
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Trusted by MSMEs, retailers, and distributors in major trading cities.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto text-xs">
            {[
              { name: "Lucknow", slug: "lucknow" },
              { name: "Kanpur", slug: "kanpur" },
              { name: "Varanasi", slug: "varanasi" },
              { name: "Agra", slug: "agra" },
              { name: "Prayagraj", slug: "prayagraj" },
              { name: "Gorakhpur", slug: "gorakhpur" },
              { name: "Noida", slug: "noida" },
              { name: "Ghaziabad", slug: "ghaziabad" },
              { name: "Meerut", slug: "meerut" },
              { name: "Bareilly", slug: "bareilly" },
              { name: "Aligarh", slug: "aligarh" },
              { name: "Moradabad", slug: "moradabad" },
            ].map((city) => (
              <Link
                key={city.slug}
                href={`/city/${city.slug}`}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:border-orange-400 hover:text-orange-600 transition-all"
              >
                GST Billing in {city.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
