"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle,
  ArrowRight,
  MessageCircle,
  Zap,
  Sparkles,
  HelpCircle,
  PhoneCall,
  Users,
  Building,
  HardDrive,
  FileText,
  Clock,
  Loader2,
} from "lucide-react";
import { planService } from "@/services/api-services";
import { Plan } from "@/types";

const formatBillingCycle = (cycle: number | string | undefined, planCode?: string, planName?: string) => {
  const code = (planCode || "").toUpperCase();
  const name = (planName || "").toLowerCase();

  if (cycle === 24 || code.includes("BIENNIAL") || name.includes("2 year") || name.includes("2 yr") || name.includes("biennial")) {
    return { label: "2 Years (730 Days)", suffix: "/ 2 years", shortSuffix: "/ 2 yrs", cycleName: "2 Years", cycleNum: 24, days: 730 };
  }
  if (cycle === 12 || code.includes("ANNUAL") || code.includes("YEAR") || name.includes("1 year") || name.includes("1 yr") || name.includes("annual") || name.includes("yearly")) {
    return { label: "1 Year (365 Days)", suffix: "/ year", shortSuffix: "/ yr", cycleName: "1 Year", cycleNum: 12, days: 365 };
  }
  if (cycle === 6 || name.includes("semi")) {
    return { label: "6 Months (180 Days)", suffix: "/ 6 months", shortSuffix: "/ 6 mo", cycleName: "6 Months", cycleNum: 6, days: 180 };
  }
  if (cycle === 3 || name.includes("quarter")) {
    return { label: "Quarterly (90 Days)", suffix: "/ quarter", shortSuffix: "/ qtr", cycleName: "Quarterly", cycleNum: 3, days: 90 };
  }
  if (cycle === 99 || name.includes("lifetime")) {
    return { label: "Lifetime Deal", suffix: "(One-time)", shortSuffix: "one-time", cycleName: "Lifetime", cycleNum: 99, days: 3650 };
  }
  return { label: "Monthly (30 Days)", suffix: "/ month", shortSuffix: "/ mo", cycleName: "Monthly", cycleNum: 1, days: 30 };
};

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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoading(true);
        setError(null);
        const data = await planService.getPlans();
        // Only keep active and non-hidden plans as set by SuperAdmin
        const activePlans = (data || []).filter(
          (p) => p.isActive !== false && !(p as any).isHidden
        );
        setPlans(activePlans);
      } catch (err: any) {
        console.error("Failed to load plans:", err);
        setError("Unable to load latest subscription plans. Please refresh or contact support.");
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  return (
    <div className="bg-transparent text-slate-900 space-y-10 sm:space-y-12">
      {/* Header */}
      <section
        className="pt-4 pb-8 sm:pb-10 border-b border-orange-100"
        style={{
          background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200 bg-orange-50 text-orange-900 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            100% Transparent B2B Pricing — Live from SuperAdmin
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 mb-3 tracking-tight">
            Transparent Pricing Plans for{" "}
            <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Every Business
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-700 font-medium max-w-2xl mx-auto mb-2 leading-relaxed">
            Choose the official subscription plan configured for your business growth. Start your unrestricted 14-day free trial — no credit card needed.
          </p>
        </div>
      </section>

      {/* Dynamic Pricing Cards Grid */}
      <section className="py-4 sm:py-6">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              <p className="text-sm font-bold text-slate-600">Loading current subscription plans...</p>
            </div>
          ) : error ? (
            <div className="p-8 rounded-2xl bg-white border border-red-200 text-center max-w-lg mx-auto shadow-sm">
              <p className="text-red-700 font-semibold mb-4 text-sm">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                Retry Loading Plans
              </button>
            </div>
          ) : plans.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center max-w-lg mx-auto shadow-sm space-y-4">
              <p className="text-slate-700 font-medium text-sm">
                No public plans are currently available. Please contact our team for custom pricing.
              </p>
              <a
                href="https://wa.me/919473807622?text=Hi%2C%20I%20would%20like%20to%20know%20about%20UdyogBill%20subscription%20plans"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold py-2.5 px-5 rounded-xl text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4" /> Contact Sales on WhatsApp
              </a>
            </div>
          ) : (
            <div
              className={`grid gap-6 lg:gap-8 items-stretch justify-center ${
                plans.length === 1
                  ? "grid-cols-1 max-w-md mx-auto"
                  : plans.length === 2
                  ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto"
                  : "grid-cols-1 md:grid-cols-3"
              }`}
            >
              {plans.map((plan) => {
                const basePrice = Number(plan.price) || 0;
                const gstAmount = Number((basePrice * 0.18).toFixed(2));
                const totalWithGst = Number((basePrice + gstAmount).toFixed(2));
                const cycleInfo = formatBillingCycle(plan.billingCycle, plan.code, plan.name);

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl flex flex-col justify-between transition-all duration-200 ${
                      plan.isPopular
                        ? "bg-white border-2 border-orange-500 shadow-xl ring-4 ring-orange-500/10 scale-[1.01]"
                        : "bg-white border-2 border-slate-200 hover:border-orange-300 shadow-sm"
                    } p-6 sm:p-8`}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-black shadow-md bg-gradient-to-r from-orange-600 to-amber-600 tracking-wide uppercase">
                        ⭐ Recommended Choice
                      </div>
                    )}

                    <div className="space-y-5">
                      {/* Plan Header */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                            {plan.name}
                          </h2>
                          <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-md border bg-orange-50 text-orange-700 border-orange-200 whitespace-nowrap">
                            {cycleInfo.cycleName}
                          </span>
                        </div>
                        {plan.description && (
                          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                            {plan.description}
                          </p>
                        )}
                      </div>

                      {/* Pricing block */}
                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl sm:text-4xl font-black text-slate-950">
                            ₹{basePrice.toLocaleString("en-IN")}
                          </span>
                          <span className="text-slate-500 font-bold text-xs sm:text-sm">
                            {cycleInfo.suffix} + GST
                          </span>
                        </div>

                        <div className="mt-2.5 p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/80 space-y-1">
                          <div className="text-[11px] text-orange-950 font-semibold flex items-center justify-between">
                            <span>+ 18% GST (₹{gstAmount.toLocaleString("en-IN")}):</span>
                            <span className="font-bold text-slate-800">Additional</span>
                          </div>
                          <div className="text-[11px] text-slate-700 flex items-center justify-between pt-1 border-t border-orange-200/60 font-bold">
                            <span>Total Payable:</span>
                            <span className="text-emerald-700 font-black">
                              ₹{totalWithGst.toLocaleString("en-IN")} {cycleInfo.shortSuffix}
                            </span>
                          </div>
                        </div>

                        {plan.trialDays ? (
                          <div className="text-xs font-bold text-emerald-700 mt-2.5 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Includes {plan.trialDays}-day unrestricted free trial
                          </div>
                        ) : null}
                      </div>

                      {/* Plan Quotas & Capabilities */}
                      <div className="pt-4 border-t border-slate-100 space-y-3 flex-1">
                        <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                          Included Plan Limits & Features:
                        </div>

                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-slate-600 flex items-center gap-2">
                            <Users className="w-4 h-4 text-orange-600 shrink-0" />
                            <span>Staff User Accounts:</span>
                          </span>
                          <span className="font-bold text-slate-950">
                            {plan.maxUsers >= 100 ? "Unlimited" : `${plan.maxUsers} Users`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-slate-600 flex items-center gap-2">
                            <Building className="w-4 h-4 text-orange-600 shrink-0" />
                            <span>Branches & Godowns:</span>
                          </span>
                          <span className="font-bold text-slate-950">
                            {plan.maxBranches} Branch{plan.maxBranches > 1 ? "es" : ""} / {plan.maxWarehouses} Warehouse{plan.maxWarehouses > 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-slate-600 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-orange-600 shrink-0" />
                            <span>Invoices Quota:</span>
                          </span>
                          <span className="font-bold text-slate-950">
                            {plan.maxInvoicesPerMonth >= 100000
                              ? "Unlimited"
                              : `${plan.maxInvoicesPerMonth.toLocaleString("en-IN")} /mo`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-slate-600 flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-orange-600 shrink-0" />
                            <span>Secure Cloud Storage:</span>
                          </span>
                          <span className="font-bold text-slate-950">
                            {plan.maxStorageMb >= 1024
                              ? `${(plan.maxStorageMb / 1024).toFixed(0)} GB`
                              : `${plan.maxStorageMb} MB`}
                          </span>
                        </div>

                        {/* Standard Core Entitlements */}
                        <div className="pt-2 space-y-2">
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                            <span className="text-slate-800 font-medium">
                              Industry Pack Configured (Pharma, Retail, FMCG, etc.)
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                            <span className="text-slate-800 font-medium">
                              GST Invoices, E-Way Bill & B2B E-Invoicing Ready
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                            <span className="text-slate-800 font-medium">
                              Customer & Supplier Khata, Ledger & Thermal Printing
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                            <span className="text-slate-800 font-medium">
                              Direct WhatsApp & Phone Technical Support Included
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action CTA */}
                    <div className="mt-8 pt-4 border-t border-slate-100">
                      <Link
                        href={`/register?plan=${encodeURIComponent(plan.code)}`}
                        className={`block text-center font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-sm hover:shadow-md cursor-pointer ${
                          plan.isPopular
                            ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-500/25"
                            : "bg-white hover:bg-orange-50 text-orange-600 border-2 border-orange-400 hover:border-orange-500 font-extrabold"
                        }`}
                      >
                        Start 14-Day Free Trial <ArrowRight className="inline w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Need Help Choosing Box */}
      <section className="py-4 sm:py-6">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl p-6 sm:p-8 border-2 border-orange-200 bg-orange-50/50 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 mb-2">
                <HelpCircle className="w-4 h-4" /> Need Expert Guidance?
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-950 mb-1.5">
                Have custom multi-branch or enterprise requirements?
              </h3>
              <p className="text-slate-700 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Connect directly with our billing specialists. We will evaluate your branch setup, transaction count, and hardware infrastructure to configure the exact plan you need.
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
              <div
                key={faq.q}
                className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-2xs"
              >
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
