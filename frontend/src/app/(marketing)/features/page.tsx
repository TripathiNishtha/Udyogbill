import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, FileText, Package, Users, BarChart3, Building2, Smartphone, Shield, Printer, Zap, TrendingUp, Clock, Tag, RefreshCw, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "GST Billing & Stock Management Features | UdyogBill",
  description: "UdyogBill ke powerful features: Fast GST Invoicing, Live Inventory, Party Ledger, POS Counter, Multi-Branch, Barcode Billing, aur 100+ Financial Reports.",
  alternates: {
    canonical: "https://udyogbill.com/features",
  },
  openGraph: {
    title: "GST Billing & Stock Management Features | UdyogBill",
    description: "Fast GST Invoicing, Live Inventory, Party Ledger, POS Counter, Multi-Branch, and Barcode Billing.",
    url: "https://udyogbill.com/features",
    siteName: "UdyogBill",
    type: "website",
  },
};

const featureCategories = [
  {
    title: "Billing & Invoicing",
    color: "#f97316",
    features: [
      { icon: FileText, name: "GST Invoice", desc: "B2B, B2C, export invoices. Auto tax calculation. Professional templates. WhatsApp pe bhejo." },
      { icon: Printer, name: "Print & Share", desc: "Thermal print, A4 print, PDF download, email, WhatsApp — jaise chahein bhejo." },
      { icon: Tag, name: "Quotation & Challan", desc: "Quotation banao, challan generate karo, delivery note aur gate pass bhi." },
      { icon: RefreshCw, name: "Sales Returns", desc: "Customer returns handle karo. Credit note auto-generate. Accounts mein reflect." },
    ]
  },
  {
    title: "Stock & Inventory",
    color: "#16a34a",
    features: [
      { icon: Package, name: "Real-Time Stock", desc: "Har item ki current quantity instantly dikhti hai. Kabhi confusion nahi." },
      { icon: Zap, name: "Barcode Support", desc: "Barcode scan se billing. Fast, accurate, error-free. Barcode print bhi karo." },
      { icon: MapPin, name: "Stock Transfers", desc: "Ek branch se doosri branch mein stock transfer karo. Full tracking." },
      { icon: TrendingUp, name: "Reorder Alerts", desc: "Stock low hone par alert aata hai. Kabhi out-of-stock nahi hoge." },
    ]
  },
  {
    title: "Parties & Accounts",
    color: "#3b82f6",
    features: [
      { icon: Users, name: "Party Ledger", desc: "Customer aur supplier ka poora hisaab. Outstanding, payment history sab clear." },
      { icon: Clock, name: "Ageing Report", desc: "Kitne dino se kitna outstanding hai — ek report mein sab dikha." },
      { icon: RefreshCw, name: "Payment Tracking", desc: "Payment receive karo, partial payments bhi track karo." },
      { icon: Shield, name: "Credit Limit", desc: "Har customer ka credit limit set karo. Limit se zyada bill nahi jaata." },
    ]
  },
  {
    title: "Reports & Analytics",
    color: "#8b5cf6",
    features: [
      { icon: BarChart3, name: "Sales Reports", desc: "Daily, monthly, yearly sales. Item-wise, party-wise, category-wise sab." },
      { icon: TrendingUp, name: "P&L Statement", desc: "Profit & Loss ek click mein. Gross profit, net profit clearly dikhta hai." },
      { icon: FileText, name: "GST Reports", desc: "GSTR-1, GSTR-3B data ready milta hai. CA ko easy format mein de sakte hain." },
      { icon: Package, name: "Stock Reports", desc: "Current stock, movement history, valuation — sab ek jagah." },
    ]
  },
  {
    title: "Business Management",
    color: "#ec4899",
    features: [
      { icon: Building2, name: "Multi-Branch", desc: "Ek account mein multiple branches. Centralized dashboard se sab dekho." },
      { icon: Users, name: "User Permissions", desc: "Staff ko limited access. Salesperson sirf bill banaye, manager sab dekhe." },
      { icon: Smartphone, name: "Mobile Access", desc: "Phone se bhi sab karo. Browser pe chalega — alag app nahi chahiye." },
      { icon: Shield, name: "Data Backup", desc: "Daily automatic backup. Kabhi bhi data retrieve kar sakte ho." },
    ]
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-white text-slate-900">
      {/* Hero */}
      <section className="py-16 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f8fafc 50%, #f0fdf4 100%)" }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200 bg-orange-50 text-orange-800 shadow-2xs">
            20+ Powerful Modules & Smart Features
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 mb-4 tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
            Sab Kuch Jo Aapke{" "}
            <span style={{ color: "#ea580c" }}>Business Ko Chahiye</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-700 font-medium max-w-2xl mx-auto mb-8 leading-relaxed">
            UdyogBill ek complete business operating system hai jo billing se leke reports tak, live inventory se leke GST E-Invoicing tak — sabko ek jagah aasaani se handle karta hai.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-white font-bold px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all"
              style={{ background: "#ea580c" }}
            >
              Free Trial Shuru Karo <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://wa.me/919473807622?text=Mujhe%20UdyogBill%20ke%20features%20ka%20live%20demo%20dekhna%20hai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl text-slate-800 bg-white border-2 border-slate-300 hover:bg-slate-50 transition-all"
            >
              📞 Live Demo Book Karein
            </a>
          </div>
        </div>
      </section>

      {/* Feature Categories */}
      {featureCategories.map((cat) => (
        <section key={cat.title} className="py-14 border-b border-slate-200">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-2.5 h-8 rounded-full" style={{ background: cat.color }} />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950" style={{ fontFamily: "Poppins, sans-serif" }}>
                {cat.title}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {cat.features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.name}
                    className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border"
                        style={{
                          background: `${cat.color}15`,
                          borderColor: `${cat.color}30`,
                        }}
                      >
                        <Icon className="w-6 h-6" style={{ color: cat.color }} />
                      </div>
                      <h3 className="font-bold text-slate-950 mb-2 text-base" style={{ fontFamily: "Poppins, sans-serif" }}>
                        {f.name}
                      </h3>
                      <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-16 text-center bg-slate-950 text-white">
        <div className="max-w-2xl mx-auto px-6">
          <div className="inline-block px-3.5 py-1 rounded-full text-xs font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 mb-4">
            Zero Credit Card Required
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
            In Sab Features Ko Try Karo — 14 Din Bilkul Free!
          </h2>
          <p className="text-slate-300 text-base mb-8 leading-relaxed">
            Sirf 2 minute mein register karein aur apni dukan ko modern digital counter banayein.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-4 rounded-xl text-base shadow-lg transition-all"
            >
              Free Trial Shuru Karo <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
