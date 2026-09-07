"use client";
import { useState } from "react";
import { Phone, MessageCircle, Mail, MapPin, ArrowRight, CheckCircle, Loader2, Clock, ShieldCheck } from "lucide-react";
import { getAttributionData, detectIndustryCode } from "@/lib/attribution";
import { trackLeadConversion } from "@/components/analytics/google-analytics";

export default function ContactPage() {
  const [form, setForm] = useState({ name:"", businessName:"", mobile:"", email:"", city:"", businessType:"", message:"" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Naam zaroori hai";
    if (!form.businessName.trim()) e.businessName = "Business ka naam zaroori hai";
    if (!/^\d{10}$/.test(form.mobile)) e.mobile = "10 digit valid mobile number daalo";
    if (!form.email.includes("@")) e.email = "Sahi email daalo";
    if (!form.city.trim()) e.city = "Sheher zaroori hai";
    if (!form.businessType) e.businessType = "Business type chunna zaroori hai";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    const attr = getAttributionData();
    const industry = detectIndustryCode(window.location.pathname, form.businessType);
    try {
      await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050") + "/api/v1/public/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source: "contact-page",
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
      });

      // Fire GA4 conversion event
      trackLeadConversion({
        city: form.city,
        industryCode: industry,
        source: "contact-page",
      });
    } catch {}
    setLoading(false);
    setSubmitted(true);
  };

  const contactInfo = [
    { icon: Phone, label: "Customer Support & Demo Phone", value: "+91 94738 07622", href: "tel:+919473807622", color: "#ea580c" },
    { icon: MessageCircle, label: "Direct WhatsApp Support", value: "+91 94738 07622", href: "https://wa.me/919473807622?text=Hi%2C%20UdyogBill%20ke%20baare%20mein%20jaanna%20chahta%20hoon", color: "#16a34a" },
    { icon: Mail, label: "Official Helpdesk Email", value: "support@udyogbill.com", href: "mailto:support@udyogbill.com", color: "#2563eb" },
    { icon: MapPin, label: "Head Office Location", value: "Sector 67, Gurugram, Haryana 122101, India", href: "#", color: "#7c3aed" },
  ];

  return (
    <div className="bg-white text-slate-900">
      <section className="py-16 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f8fafc 50%, #f0fdf4 100%)" }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200 bg-orange-50 text-orange-800 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            Direct Team Support — 24 Ghante Callback
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 mb-4 tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
            Baat Karte Hain — <span style={{ color: "#ea580c" }}>Hum Hain Yahan</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-700 font-medium max-w-2xl mx-auto leading-relaxed">
            Koi bhi sawaal ho, free software demo chahiye ho, ya custom feature ki baat karni ho — hamari technical support team har kadam par aapke sath hai.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* Left Info */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-extrabold text-slate-950 mb-6" style={{ fontFamily: "Poppins, sans-serif" }}>
                Hamaari Contact Details
              </h2>
              <div className="space-y-4 mb-8">
                {contactInfo.map((c) => {
                  const Icon = c.icon;
                  return (
                    <a
                      key={c.label}
                      href={c.href}
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="flex items-start gap-4 p-4 rounded-2xl border-2 border-slate-200 hover:border-orange-500 hover:shadow-md transition-all bg-white group"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
                        style={{ background: `${c.color}15`, borderColor: `${c.color}30` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: c.color }} />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{c.label}</div>
                        <div className="text-slate-950 font-bold text-base mt-0.5 group-hover:text-orange-600 transition-colors">
                          {c.value}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>

              <div className="rounded-2xl p-6 border-2 border-slate-200 bg-slate-50">
                <h3 className="font-extrabold text-slate-950 mb-3 flex items-center gap-2 text-base" style={{ fontFamily: "Poppins, sans-serif" }}>
                  <Clock className="w-4 h-4 text-orange-600" /> Support Timings & SLA
                </h3>
                <ul className="space-y-2.5 text-sm text-slate-700 font-medium">
                  <li className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span>📞 Phone Support:</span>
                    <strong className="text-slate-900">10:00 AM – 7:00 PM (Mon-Sat)</strong>
                  </li>
                  <li className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span>💬 WhatsApp Helpdesk:</span>
                    <strong className="text-slate-900">9:00 AM – 9:00 PM (Rozana)</strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>✉️ Email Response:</span>
                    <strong className="text-slate-900">Within 24 Hours</strong>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="text-center py-16 px-6 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-100 border-2 border-emerald-300">
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-950 mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                    Shukriya! Aapki Request Mil Gayi 🙏
                  </h2>
                  <p className="text-slate-700 mb-6 font-medium max-w-md mx-auto leading-relaxed">
                    Hamari product team agle 24 ghante ke andar aapse call ya WhatsApp par contact karegi.
                  </p>
                  <a
                    href="https://wa.me/919473807622?text=Hi%2C%20maine%20contact%20form%20bhara%20hai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white px-7 py-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all"
                  >
                    <MessageCircle className="w-5 h-5" /> Instant WhatsApp Connect
                  </a>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-8">
                  <h2 className="text-2xl font-extrabold text-slate-950 mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                    Direct Request Bhejein 📝
                  </h2>
                  <p className="text-slate-600 text-sm mb-6">Apni details bharein, hamari team live demo setup karegi.</p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Aapka Naam *</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Ramesh Gupta"
                          className={`w-full border-2 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none ${
                            errors.name ? "border-red-500 bg-red-50/50" : "border-slate-300 focus:border-orange-500"
                          }`}
                        />
                        {errors.name && <p className="text-red-600 text-xs font-semibold mt-1">{errors.name}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Business ka Naam *</label>
                        <input
                          type="text"
                          value={form.businessName}
                          onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                          placeholder="Gupta Traders"
                          className={`w-full border-2 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none ${
                            errors.businessName ? "border-red-500 bg-red-50/50" : "border-slate-300 focus:border-orange-500"
                          }`}
                        />
                        {errors.businessName && <p className="text-red-600 text-xs font-semibold mt-1">{errors.businessName}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Mobile Number (10 Digits) *</label>
                        <input
                          type="tel"
                          maxLength={10}
                          value={form.mobile}
                          onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                          placeholder="9473807622"
                          className={`w-full border-2 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none ${
                            errors.mobile ? "border-red-500 bg-red-50/50" : "border-slate-300 focus:border-orange-500"
                          }`}
                        />
                        {errors.mobile && <p className="text-red-600 text-xs font-semibold mt-1">{errors.mobile}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Email Address *</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="aap@vyapar.com"
                          className={`w-full border-2 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none ${
                            errors.email ? "border-red-500 bg-red-50/50" : "border-slate-300 focus:border-orange-500"
                          }`}
                        />
                        {errors.email && <p className="text-red-600 text-xs font-semibold mt-1">{errors.email}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Sheher / City *</label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                          placeholder="Lucknow / Delhi"
                          className={`w-full border-2 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none ${
                            errors.city ? "border-red-500 bg-red-50/50" : "border-slate-300 focus:border-orange-500"
                          }`}
                        />
                        {errors.city && <p className="text-red-600 text-xs font-semibold mt-1">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Business Type *</label>
                        <select
                          value={form.businessType}
                          onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
                          className={`w-full border-2 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium bg-white focus:outline-none ${
                            errors.businessType ? "border-red-500 bg-red-50/50" : "border-slate-300 focus:border-orange-500"
                          }`}
                        >
                          <option value="">Select Category...</option>
                          {[
                            "Pharma Distributor",
                            "FMCG Distributor",
                            "Garment Shop",
                            "Wholesale Business",
                            "Retail Shop",
                            "Bakery",
                            "Manufacturing",
                            "Other",
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
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Aapka Sawaal ya Message</label>
                      <textarea
                        rows={3}
                        value={form.message}
                        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                        placeholder="Demo chahiye, koi specific sawaal, ya use case batao..."
                        className="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:border-orange-500 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-base bg-orange-600 hover:bg-orange-700 disabled:opacity-75"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                      {loading ? "Bhej rahe hain..." : "Free Demo Request Bhejo"}
                    </button>
                    <p className="text-center text-xs text-slate-500 font-medium">
                      🔒 100% Private & Safe • 24 Ghante Mein Callback Guarantee
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

