"use client";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle, ArrowRight, MessageCircle, Zap, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Starter",
    monthlyPrice: 499,
    yearlyPrice: 399,
    desc: "Chhote business aur naye dukaandaron ke liye perfect",
    accentColor: "#2563eb",
    badge: "Basic Vyapar",
    features: [
      "1 User, 1 Branch Access",
      "Unlimited GST Invoices & Bills",
      "Real-Time Stock & Inventory",
      "Customer & Supplier Khata (Ledger)",
      "Daily Sales & Profit Reports",
      "Instant PDF & Thermal Print (2\" / 3\")",
      "Standard WhatsApp & Email Support",
      "5GB Automated Cloud Backup",
    ],
    notIncluded: ["Multi-Branch Sync", "POS Barcode Scanning", "Role-Based Staff Access", "Dedicated Account Manager"],
    cta: "Free Trial Shuru Karo",
    popular: false,
  },
  {
    name: "Professional",
    monthlyPrice: 999,
    yearlyPrice: 799,
    desc: "Tezi se badhte wholesale aur retail vyapar ke liye best",
    accentColor: "#ea580c",
    badge: "Most Popular • 14 Din Trial",
    features: [
      "5 Users, 3 Branches Management",
      "Sabhi Starter Features Shamil",
      "Superfast POS Counter Billing",
      "1D & 2D Barcode Scanner Support",
      "Inter-Branch Stock Transfer Tracking",
      "Purchase Orders, GRN & Vendor Bills",
      "GSTR-1, GSTR-3B & Tax Audit Reports",
      "Direct WhatsApp Invoicing & Reminders",
      "Priority Phone & Remote Support",
      "20GB High-Speed Cloud Storage",
    ],
    notIncluded: [],
    cta: "14 Din Ka Free Trial Lein",
    popular: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    yearlyPrice: null,
    desc: "Badi chain stores, pharma distributors aur multi-warehouses",
    accentColor: "#16a34a",
    badge: "Custom Scale",
    features: [
      "Unlimited Users, Unlimited Branches",
      "Sabhi Professional Features Shamil",
      "Pharma Batch, Expiry & Salt Tracking",
      "Custom Bill Formats & ERP Integrations",
      "Secure REST API & Webhook Access",
      "Dedicated Senior Support Manager",
      "Complete Staff Onboarding & Training",
      "Unlimited Scalable Cloud Storage",
      "99.9% Uptime SLA Guarantee",
    ],
    notIncluded: [],
    cta: "Enterprise Team Se Baat Karein",
    popular: false,
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const yearly = billingCycle === "yearly";

  return (
    <div className="bg-white text-slate-900">
      {/* Header */}
      <section className="py-16 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f8fafc 50%, #f0fdf4 100%)" }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200 bg-orange-50 text-orange-800 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            100% Transparent Pricing — Koi Chhupa Kharcha Nahi
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 mb-4 tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
            Har Vyapar Ke Budget Mein Fit —{" "}
            <span style={{ color: "#ea580c" }}>Bilkul Saaf Hisaab</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-700 font-medium max-w-2xl mx-auto mb-8 leading-relaxed">
            Apni zaroorat ke anusaar plan chuniye. Bina kisi credit card ke 14 din ka free trial shuru karein.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-white p-1.5 rounded-2xl border-2 border-slate-200 shadow-sm">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                billingCycle === "yearly"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Yearly (2 Mahine Free!)
              <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl flex flex-col transition-all duration-200 ${
                  plan.popular
                    ? "bg-white border-2 border-orange-500 shadow-xl ring-4 ring-orange-500/10 scale-[1.02]"
                    : "bg-white border-2 border-slate-200 hover:border-slate-300 shadow-md"
                } p-7`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-extrabold shadow-md bg-gradient-to-r from-orange-600 to-amber-600 tracking-wide uppercase">
                    🔥 Most Popular Choice
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-extrabold text-slate-950" style={{ fontFamily: "Poppins, sans-serif" }}>
                      {plan.name}
                    </h2>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-md border"
                      style={{
                        backgroundColor: `${plan.accentColor}10`,
                        color: plan.accentColor,
                        borderColor: `${plan.accentColor}30`,
                      }}
                    >
                      {plan.badge}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed min-h-[40px]">{plan.desc}</p>

                  <div className="mt-5 pt-5 border-t border-slate-100">
                    {plan.monthlyPrice ? (
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-4xl sm:text-5xl font-black text-slate-950" style={{ fontFamily: "Poppins, sans-serif" }}>
                            ₹{yearly ? plan.yearlyPrice : plan.monthlyPrice}
                          </span>
                          <span className="text-slate-500 font-semibold text-sm">/mahina + GST</span>
                        </div>
                        {yearly ? (
                          <div className="text-xs font-bold text-emerald-700 mt-1.5 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5" /> Billed annually • ₹{((plan.monthlyPrice - plan.yearlyPrice) * 12)} saalana bachat!
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 font-medium mt-1.5">Monthly billing • Kabhi bhi cancel karein</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="text-3xl sm:text-4xl font-black text-slate-950" style={{ fontFamily: "Poppins, sans-serif" }}>
                          Custom Quote
                        </span>
                        <div className="text-xs font-bold text-slate-600 mt-1">Aapke branch count aur scale ke anusaar</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-8 flex-1">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">Plan Features:</div>
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                      <span className="text-sm font-semibold text-slate-800 leading-snug">{f}</span>
                    </div>
                  ))}
                  {plan.notIncluded && plan.notIncluded.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-slate-100 space-y-2 opacity-60">
                      {plan.notIncluded.map((nf) => (
                        <div key={nf} className="flex items-start gap-2.5 text-xs text-slate-500">
                          <span className="w-4 text-center font-bold text-slate-400">—</span>
                          <span>{nf}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action CTA */}
                <div className="mt-auto pt-4">
                  {plan.monthlyPrice ? (
                    <Link
                      href="/register"
                      className={`block text-center font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-sm hover:shadow-md ${
                        plan.popular
                          ? "bg-orange-600 hover:bg-orange-700 text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      {plan.cta} <ArrowRight className="inline w-4 h-4 ml-1" />
                    </Link>
                  ) : (
                    <a
                      href="https://wa.me/919473807622?text=Enterprise%20plan%20ke%20baare%20mein%20baat%20karni%20hai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 font-bold py-3.5 px-4 rounded-xl text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4" /> WhatsApp Pe Baat Karein
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Need Help Box */}
          <div className="mt-16 rounded-2xl p-8 border-2 border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-950 mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                Samajh nahi aa raha kaun sa plan sahi rahega? 🤔
              </h3>
              <p className="text-slate-700 text-sm max-w-2xl leading-relaxed">
                Koi chinta nahi — hamari GST & POS technical team se direct baat karein. Hum aapke business volume aur branches ke hisaab se sahi plan recommend karenge.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap shrink-0">
              <a
                href="https://wa.me/919473807622?text=Mujhe%20sahi%20plan%20choose%20karne%20mein%20help%20chahiye"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl text-white text-sm bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all"
              >
                <MessageCircle className="w-4 h-4" /> Free WhatsApp Salah
              </a>
              <a
                href="tel:+919473807622"
                className="inline-flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 text-sm transition-all"
              >
                📞 +91 94738 07622
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

