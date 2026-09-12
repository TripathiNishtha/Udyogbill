"use client";
import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle,
  ArrowRight,
  MessageCircle,
  Zap,
  Sparkles,
  HelpCircle,
  PhoneCall,
} from "lucide-react";

const plans = [
  {
    name: "Starter",
    monthlyPrice: 499,
    yearlyPrice: 399,
    desc: "Engineered for single-counter retailers, independent chemists, and emerging traders.",
    accentColor: "#f97316",
    badge: "Solo Business",
    features: [
      "1 Staff User, 1 Operating Branch",
      "Unlimited GST Tax Invoices & Bills",
      "Real-Time Stock & Inventory Tracking",
      "Customer & Supplier Khata (Ledger)",
      "Daily Sales, Purchase & P&L Reports",
      "Instant PDF & Thermal Print (2\" / 3\")",
      "Standard WhatsApp & Email Support",
      "Automated Daily Cloud Backups",
    ],
    notIncluded: [
      "Multi-Branch Centralized Sync",
      "POS Barcode Gun Scanning",
      "Role-Based Staff Access Matrix",
      "Dedicated Enterprise Account Manager"
    ],
    cta: "Start 14-Day Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    monthlyPrice: 999,
    yearlyPrice: 799,
    desc: "The complete operating system for high-volume retail stores, supermarkets, and wholesale stockists.",
    accentColor: "#ea580c",
    badge: "Most Popular • 14-Day Free Trial",
    features: [
      "5 Staff Users, Up to 3 Branch Locations",
      "All Starter Plan Features Included",
      "High-Speed Thermal POS Counter Billing",
      "1D & 2D Barcode Scanner Gun Support",
      "Inter-Branch Stock Transfer Tracking",
      "Purchase Orders, GRN & Vendor Bills",
      "GSTR-1, GSTR-3B & Tax Audit Export (Excel/JSON)",
      "Direct WhatsApp Invoicing & Payment Reminders",
      "Priority Phone & Remote Screen-Share Support",
      "20GB High-Speed Cloud Storage",
    ],
    notIncluded: [],
    cta: "Claim 14-Day Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    yearlyPrice: null,
    desc: "Custom architecture for pharma distributors, retail chains, and multi-state warehouse networks.",
    accentColor: "#059669",
    badge: "Custom Scale",
    features: [
      "Unlimited Staff Users, Unlimited Branches",
      "All Professional Plan Features Included",
      "Pharma Batch, Expiry Claims & Salt Search",
      "Custom Bill Formats & ERP Integrations",
      "High-Performance REST API & Webhook Access",
      "Dedicated Senior Account Onboarding Manager",
      "Full On-Site / Remote Staff Training Program",
      "Unlimited Scalable Cloud Infrastructure",
      "99.9% Uptime Service Level Agreement (SLA)",
    ],
    notIncluded: [],
    cta: "Talk to Enterprise Specialist",
    popular: false,
  },
];

const featureMatrix = [
  {
    category: "Billing & Invoicing",
    items: [
      { name: "Unlimited GST Invoices", starter: true, pro: true, ent: true },
      { name: "Custom Invoice Branding & Logos", starter: true, pro: true, ent: true },
      { name: "Thermal Receipt Printing (2\" & 3\")", starter: true, pro: true, ent: true },
      { name: "Quotation & Delivery Challans", starter: true, pro: true, ent: true },
      { name: "E-Way Bill & B2B E-Invoicing", starter: false, pro: true, ent: true },
      { name: "WhatsApp Direct Invoice Dispatch", starter: false, pro: true, ent: true },
    ],
  },
  {
    category: "Inventory & Hardware",
    items: [
      { name: "Real-Time Stock Tracking", starter: true, pro: true, ent: true },
      { name: "Low Stock & Reorder Alerts", starter: true, pro: true, ent: true },
      { name: "Barcode Scanner Gun Integration", starter: false, pro: true, ent: true },
      { name: "Batch & Expiry Date Management", starter: false, pro: "Add-on", ent: true },
      { name: "Multi-Godown Stock Transfers", starter: false, pro: true, ent: true },
      { name: "Electronic Weighing Scale Integration", starter: false, pro: true, ent: true },
    ],
  },
  {
    category: "Security, Roles & Support",
    items: [
      { name: "Cloud Backup & 256-Bit SSL", starter: true, pro: true, ent: true },
      { name: "Role-Based Staff Access (RBAC)", starter: false, pro: true, ent: true },
      { name: "Multi-Branch Centralized Reporting", starter: false, pro: true, ent: true },
      { name: "Phone & WhatsApp Technical Support", starter: "Standard", pro: "Priority", ent: "Dedicated VIP" },
      { name: "Onboarding & Assisted Data Migration", starter: "Self-Serve", pro: "Guided", ent: "Dedicated Expert" },
    ],
  },
];

const pricingFaqs = [
  {
    q: "Is there any setup fee or hidden charge?",
    a: "No. What you see is exactly what you pay. There are zero onboarding fees, zero activation charges, and no hidden maintenance costs.",
  },
  {
    q: "Do I need to enter credit card details for the 14-day free trial?",
    a: "No credit card or payment information is required. You can sign up with just your mobile number and start creating GST invoices immediately.",
  },
  {
    q: "Can I upgrade or downgrade my subscription anytime?",
    a: "Yes, you can easily switch plans or add extra user licenses directly from your account settings at pro-rated pricing.",
  },
  {
    q: "How does data migration from Vyapar, Marg, or Excel work?",
    a: "UdyogBill features a 1-click Universal Excel Data Importer. If you need assistance, our support team will migrate your items, parties, and opening stock free of charge.",
  },
];

export default function PricingClient() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const yearly = billingCycle === "yearly";

  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* Header */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200 bg-orange-50 text-orange-900 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            100% Transparent B2B Pricing — Zero Hidden Surcharges
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 mb-3 tracking-tight">
            Predictable Pricing for Every{" "}
            <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Growing Business
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-700 font-medium max-w-2xl mx-auto mb-6 leading-relaxed">
            Select the plan tailored to your business scale. Experience unrestricted access with our 14-day free trial — no credit card needed.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="inline-flex items-center gap-3 bg-white p-1.5 rounded-2xl border-2 border-slate-200 shadow-sm">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-orange-500 text-white shadow-xs"
                  : "text-slate-600 hover:text-orange-600"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                billingCycle === "yearly"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Annual Billing
              <span className="bg-emerald-500 text-white text-[11px] px-2 py-0.5 rounded-full font-black">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="py-4 sm:py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl flex flex-col transition-all duration-200 ${
                  plan.popular
                    ? "bg-white border-2 border-orange-500 shadow-xl ring-4 ring-orange-500/10 scale-[1.01]"
                    : "bg-white border-2 border-slate-200 hover:border-slate-300 shadow-sm"
                } p-6 sm:p-7`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-black shadow-md bg-gradient-to-r from-orange-600 to-amber-600 tracking-wide uppercase">
                    ⭐ Recommended Choice
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                      {plan.name}
                    </h2>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-md border"
                      style={{
                        backgroundColor: `${plan.accentColor}12`,
                        color: plan.accentColor,
                        borderColor: `${plan.accentColor}30`,
                      }}
                    >
                      {plan.badge}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed min-h-[38px]">{plan.desc}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    {plan.monthlyPrice ? (
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl sm:text-4xl font-black text-slate-950">
                            ₹{yearly ? plan.yearlyPrice : plan.monthlyPrice}
                          </span>
                          <span className="text-slate-500 font-bold text-xs sm:text-sm">/month + GST</span>
                        </div>
                        {yearly ? (
                          <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5" /> Billed annually • ₹{(plan.monthlyPrice - plan.yearlyPrice) * 12}/yr savings
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 font-medium mt-1">Flexible month-to-month billing</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="text-2xl sm:text-3xl font-black text-slate-950">
                          Custom Pricing
                        </span>
                        <div className="text-xs font-bold text-slate-600 mt-1">Tailored to branch count and user volume</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2.5 mb-6 flex-1">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Included Capabilities:</div>
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">{f}</span>
                    </div>
                  ))}
                  {plan.notIncluded && plan.notIncluded.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-slate-100 space-y-1.5 opacity-60">
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
                <div className="mt-auto pt-2">
                  {plan.monthlyPrice ? (
                    <Link
                      href="/register"
                      className={`block text-center font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-sm hover:shadow-md ${
                        plan.popular
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-500/25"
                          : "bg-white hover:bg-orange-50 text-orange-600 border-2 border-orange-400 hover:border-orange-500 font-extrabold"
                      }`}
                    >
                      {plan.cta} <ArrowRight className="inline w-4 h-4 ml-1" />
                    </Link>
                  ) : (
                    <a
                      href="https://wa.me/919473807622?text=Hi%2C%20I%20would%20like%20to%20discuss%20the%20UdyogBill%20Enterprise%20Plan"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4" /> Discuss Enterprise Architecture
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Matrix */}
      <section className="py-4 sm:py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-center max-w-3xl mx-auto mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 mb-2">
              Comprehensive Feature Comparison Matrix
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Detailed technical breakdown of capabilities across all UdyogBill subscription tiers.
            </p>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-900 text-xs font-black uppercase tracking-wider">
                    <th className="py-3.5 px-5 w-2/5">Capabilities</th>
                    <th className="py-3.5 px-4 text-center w-1/5">Starter</th>
                    <th className="py-3.5 px-4 text-center w-1/5 text-orange-700 bg-orange-50/50">Professional</th>
                    <th className="py-3.5 px-4 text-center w-1/5">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
                  {featureMatrix.map((section) => (
                    <tbody key={section.category} className="divide-y divide-slate-100">
                      <tr className="bg-slate-100/60 font-black text-slate-900 text-xs uppercase tracking-wider">
                        <td colSpan={4} className="py-2.5 px-5 text-orange-950 font-bold">
                          {section.category}
                        </td>
                      </tr>
                      {section.items.map((row) => (
                        <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-5 font-semibold text-slate-800">{row.name}</td>
                          <td className="py-3 px-4 text-center">
                            {typeof row.starter === "boolean" ? (
                              row.starter ? (
                                <CheckCircle className="w-4 h-4 mx-auto text-emerald-600" />
                              ) : (
                                <span className="text-slate-300 font-bold">—</span>
                              )
                            ) : (
                              <span className="font-bold text-slate-700 text-xs">{row.starter}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center bg-orange-50/20">
                            {typeof row.pro === "boolean" ? (
                              row.pro ? (
                                <CheckCircle className="w-4 h-4 mx-auto text-orange-600" />
                              ) : (
                                <span className="text-slate-300 font-bold">—</span>
                              )
                            ) : (
                              <span className="font-bold text-orange-800 text-xs">{row.pro}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {typeof row.ent === "boolean" ? (
                              row.ent ? (
                                <CheckCircle className="w-4 h-4 mx-auto text-emerald-600" />
                              ) : (
                                <span className="text-slate-300 font-bold">—</span>
                              )
                            ) : (
                              <span className="font-bold text-slate-900 text-xs">{row.ent}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Need Help Choosing Box */}
      <section className="py-4 sm:py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="rounded-2xl p-6 sm:p-8 border-2 border-orange-200 bg-orange-50/40 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 mb-2">
                <HelpCircle className="w-4 h-4" /> Need Expert Guidance?
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-950 mb-1.5">
                Unsure which plan matches your operational volume?
              </h3>
              <p className="text-slate-700 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Connect directly with our billing specialists. We will evaluate your branch setup, transaction count, and hardware infrastructure to recommend the optimal tier.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap shrink-0">
              <a
                href="https://wa.me/919473807622?text=Hi%2C%20I%20need%20assistance%20choosing%20the%20right%20UdyogBill%20plan%20for%20my%20business"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
              >
                <MessageCircle className="w-4 h-4" /> Free WhatsApp Consultation
              </a>
              <a
                href="tel:+919473807622"
                className="inline-flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 text-xs sm:text-sm transition-all shadow-2xs"
              >
                <PhoneCall className="w-4 h-4 text-orange-600" /> +91 94738 07622
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing FAQ Accordion */}
      <section className="py-4 sm:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 mb-1.5">
              Frequently Asked Pricing Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Transparent answers to help you make an informed decision.
            </p>
          </div>

          <div className="space-y-3">
            {pricingFaqs.map((faq) => (
              <div key={faq.q} className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1.5 flex items-start gap-2">
                  <span className="text-orange-600 font-black">Q.</span>
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-5">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
