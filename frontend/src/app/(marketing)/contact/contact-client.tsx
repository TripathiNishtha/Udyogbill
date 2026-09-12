"use client";
import { useState } from "react";
import {
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  ArrowRight,
  CheckCircle,
  Loader2,
  Clock,
  ShieldCheck,
  Building2,
  Sparkles,
  Headphones
} from "lucide-react";
import { getAttributionData, detectIndustryCode } from "@/lib/attribution";
import { trackLeadConversion } from "@/components/analytics/google-analytics";

export default function ContactClient() {
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    mobile: "",
    email: "",
    city: "",
    businessType: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.businessName.trim()) e.businessName = "Business / Company name is required";
    if (!/^\d{10}$/.test(form.mobile.trim())) e.mobile = "Please enter a valid 10-digit mobile number";
    if (form.email.trim() && !form.email.includes("@")) e.email = "Please enter a valid email address";
    if (!form.city.trim()) e.city = "City name is required";
    if (!form.businessType) e.businessType = "Please select your industry category";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    const attr = getAttributionData();
    const industry = detectIndustryCode(window.location.pathname, form.businessType);

    try {
      await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "https://udyogbill.com") + "/api/v1/public/leads",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            businessName: form.businessName.trim(),
            mobile: form.mobile.trim(),
            email: form.email.trim(),
            city: form.city.trim(),
            businessType: form.businessType,
            message: form.message.trim(),
            source: "contact_page",
            industryCode: industry,
            utmSource: attr.utmSource,
            utmMedium: attr.utmMedium,
            utmCampaign: attr.utmCampaign,
            landingPage: attr.landingPage || window.location.pathname,
            citySlug: attr.citySlug,
            referrerUrl: attr.referrerUrl,
            searchKeyword: attr.searchKeyword,
            deviceType: attr.deviceType,
          }),
        }
      );

      // Fire GA4 conversion event
      trackLeadConversion({
        city: form.city,
        industryCode: industry,
        source: "contact-page",
      });
    } catch {
      // Continue to submitted state even if network glitch occurs
    }
    setLoading(false);
    setSubmitted(true);
  };

  const contactInfo = [
    {
      icon: Phone,
      label: "Customer Support & Sales Hotline",
      value: "+91 94738 07622",
      href: "tel:+919473807622",
      color: "#ea580c"
    },
    {
      icon: MessageCircle,
      label: "Official WhatsApp Helpdesk",
      value: "+91 94738 07622",
      href: "https://wa.me/919473807622?text=Hi%20UdyogBill%2C%20I%20would%20like%20to%20inquire%20about%20your%20software",
      color: "#16a34a"
    },
    {
      icon: Mail,
      label: "Official Support & Advisory Email",
      value: "support@udyogbill.com",
      href: "mailto:support@udyogbill.com",
      color: "#2563eb"
    },
    {
      icon: MapPin,
      label: "Corporate Office Address",
      value: "Sector 67, Gurugram, Haryana 122101, India",
      href: "#",
      color: "#7c3aed"
    },
  ];

  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* ── Header ── */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200 bg-orange-50 text-orange-900 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            Dedicated Technical & Advisory Support
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 mb-3 tracking-tight">
            We Are Here to Accelerate{" "}
            <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Your Business
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-700 font-medium max-w-2xl mx-auto leading-relaxed">
            Have questions regarding GST compliance, hardware printer integration, or enterprise multi-branch deployments? Our product specialists are ready to assist you.
          </p>
        </div>
      </section>

      {/* ── Content Grid ── */}
      <section className="py-4 sm:py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">
            {/* Left Contact Directory */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 mb-2">
                  Official Communication Channels
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mb-5">
                  Reach out directly through any of our verified enterprise touchpoints.
                </p>
              </div>

              <div className="space-y-3">
                {contactInfo.map((c) => {
                  const Icon = c.icon;
                  return (
                    <a
                      key={c.label}
                      href={c.href}
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="flex items-start gap-3.5 p-4 rounded-2xl border-2 border-slate-200 hover:border-orange-400 hover:shadow-sm transition-all bg-white group"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
                        style={{ background: `${c.color}10`, borderColor: `${c.color}25` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: c.color }} />
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 font-black uppercase tracking-wider">{c.label}</div>
                        <div className="text-slate-950 font-bold text-sm sm:text-base mt-0.5 group-hover:text-orange-600 transition-colors">
                          {c.value}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* Service Level Agreement */}
              <div className="rounded-2xl p-5 border-2 border-slate-200 bg-slate-50">
                <h3 className="font-black text-slate-950 mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Clock className="w-4 h-4 text-orange-600" /> Support Hours & Response SLA
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-semibold text-slate-600">Phone Support:</span>
                    <strong className="text-slate-950">9:30 AM – 7:00 PM (Mon – Sat)</strong>
                  </li>
                  <li className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-semibold text-slate-600">WhatsApp Helpdesk:</span>
                    <strong className="text-slate-950">9:00 AM – 9:00 PM (All 7 Days)</strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">Email Response:</span>
                    <strong className="text-slate-950">Guaranteed Within 2 Hours</strong>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Contact Form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="text-center py-16 px-6 bg-orange-50/40 border-2 border-orange-200 rounded-2xl">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-100 border-2 border-emerald-300">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-950 mb-2">
                    Inquiry Received Successfully!
                  </h2>
                  <p className="text-slate-700 mb-6 text-sm max-w-md mx-auto leading-relaxed">
                    Thank you for contacting UdyogBill. Our technical onboarding team will call you or connect on WhatsApp within 15 minutes.
                  </p>
                  <a
                    href="https://wa.me/919473807622?text=Hi%2C%20I%20just%20submitted%20a%20demo%20inquiry%20on%20UdyogBill"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
                  >
                    <MessageCircle className="w-4 h-4" /> Connect Immediately on WhatsApp
                  </a>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6 sm:p-8">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 mb-1.5">
                    Request a Live Product Walkthrough
                  </h2>
                  <p className="text-slate-600 text-xs sm:text-sm mb-6">
                    Fill out the form below to receive a personalized screen-share demo customized to your industry workflows.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="e.g. Ramesh Sharma"
                          className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none ${
                            errors.name ? "border-red-500 bg-red-50/50" : "border-slate-300 focus:border-orange-500"
                          }`}
                        />
                        {errors.name && <p className="text-red-600 text-xs font-semibold mt-1">{errors.name}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Business / Firm Name *
                        </label>
                        <input
                          type="text"
                          value={form.businessName}
                          onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                          placeholder="e.g. Sharma Enterprises"
                          className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none ${
                            errors.businessName ? "border-red-500 bg-red-50/50" : "border-slate-300 focus:border-orange-500"
                          }`}
                        />
                        {errors.businessName && <p className="text-red-600 text-xs font-semibold mt-1">{errors.businessName}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Mobile Number (10 Digits) *
                        </label>
                        <input
                          type="tel"
                          maxLength={10}
                          value={form.mobile}
                          onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                          placeholder="9876543210"
                          className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none ${
                            errors.mobile ? "border-red-500 bg-red-50/50" : "border-slate-300 focus:border-orange-500"
                          }`}
                        />
                        {errors.mobile && <p className="text-red-600 text-xs font-semibold mt-1">{errors.mobile}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="contact@business.com"
                          className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none ${
                            errors.email ? "border-red-500 bg-red-50/50" : "border-slate-300 focus:border-orange-500"
                          }`}
                        />
                        {errors.email && <p className="text-red-600 text-xs font-semibold mt-1">{errors.email}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          City / Operating Location *
                        </label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                          placeholder="e.g. Lucknow / Delhi"
                          className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none ${
                            errors.city ? "border-red-500 bg-red-50/50" : "border-slate-300 focus:border-orange-500"
                          }`}
                        />
                        {errors.city && <p className="text-red-600 text-xs font-semibold mt-1">{errors.city}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Industry Vertical *
                        </label>
                        <select
                          value={form.businessType}
                          onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
                          className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium bg-white focus:outline-none ${
                            errors.businessType ? "border-red-500 bg-red-50/50" : "border-slate-300 focus:border-orange-500"
                          }`}
                        >
                          <option value="">Select Industry Segment...</option>
                          {[
                            "Pharma & Chemist Store",
                            "FMCG & Distribution",
                            "Retail Store & Supermarket",
                            "Wholesale & Stockist",
                            "Garments & Apparel",
                            "Electronics & Hardware",
                            "Bakery & Confectionery",
                            "Manufacturing & Trading",
                            "Other Business",
                          ].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        {errors.businessType && <p className="text-red-600 text-xs font-semibold mt-1">{errors.businessType}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Specific Requirements / Questions
                      </label>
                      <textarea
                        rows={3}
                        value={form.message}
                        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                        placeholder="Tell us about your branch count, current software (e.g. Marg/Vyapar), or custom needs..."
                        className="w-full border-2 border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-orange-500 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm bg-orange-600 hover:bg-orange-700 disabled:opacity-75 cursor-pointer"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      {loading ? "Submitting Inquiry..." : "Schedule Free Live Demo"}
                    </button>

                    <p className="text-center text-xs text-slate-500 font-medium">
                      🔒 100% Confidential • Zero Spam Guarantee • 15-Minute Response SLA
                    </p>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
