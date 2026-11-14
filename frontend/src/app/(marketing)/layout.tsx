"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  X,
  Menu,
  MessageCircle,
  Phone,
  ArrowRight,
  CheckCircle,
  Loader2,
  ChevronDown,
  ShieldCheck,
  Building2,
  Sparkles,
  Headphones,
  Check,
  Download,
  Zap,
  Briefcase,
  BookOpen,
  MapPin,
  FileText,
  Package,
  Users,
  Receipt,
  ShoppingCart,
  HelpCircle,
  Lock,
} from "lucide-react";
import { initAttribution, getAttributionData, detectIndustryCode } from "@/lib/attribution";
import { trackLeadConversion } from "@/components/analytics/google-analytics";
import { Smart3dLeadPopup } from "@/components/common/smart-3d-lead-popup";

function ContactPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    mobile: "",
    email: "",
    city: "",
    businessType: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.name.trim() && !form.businessName.trim()) {
      e.name = "Please enter your name or shop name";
    }
    if (!/^\d{10}$/.test(form.mobile.trim())) {
      e.mobile = "Please enter a valid 10-digit mobile number";
    }
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
      const res = await fetch("/api/backend/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source: "contact-popup",
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

      if (!res.ok) {
        console.error("Demo modal lead submission returned error status:", res.status);
      }

      // Track conversion event in GA4
      trackLeadConversion({
        city: form.city,
        industryCode: industry,
        source: "contact-popup",
      });
    } catch (err) {
      console.error("Demo modal lead submission network error:", err);
    }
    setLoading(false);
    setSubmitted(true);
  };

  const businessTypes = [
    "Pharma Distributor / Chemist",
    "FMCG & Food Distribution",
    "Retail Supermarket / Grocery",
    "Garments & Apparel Store",
    "Wholesale & Bulk Trading",
    "Electronics & Mobile Store",
    "Hardware & Electricals",
    "Manufacturing & Assembly",
    "Services & General Trade",
    "Other Business Category",
  ];

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-orange-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 p-6 rounded-t-2xl text-white relative shadow-sm">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>1-on-1 Guided Product Walkthrough</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Schedule a Free Live Demo</h2>
          <p className="text-orange-50 text-xs mt-1 leading-relaxed">
            See how UdyogBill streamlines your billing, inventory, and GST compliance. Our specialist will contact you within 2 hours.
          </p>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Thank You! Request Received.</h3>
              <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                Our product specialist will reach out to you on <strong>{form.mobile}</strong> shortly to schedule your personalized live demo.
              </p>
            </div>
            <div className="pt-2">
              <a
                href="https://wa.me/919473807622?text=Hi%2C%20I%20have%20requested%20a%20demo%20for%20UdyogBill"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat Instantly on WhatsApp</span>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Your Name / Business Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, businessName: e.target.value }))}
                placeholder="e.g. Rajesh Kumar / Rajesh Medical Store"
                className={`w-full border rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors ${
                  errors.name ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                }`}
              />
              {errors.name && <p className="text-rose-500 text-[11px] mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  10-Digit Mobile Number *
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={form.mobile}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  placeholder="9876543210"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors ${
                    errors.mobile ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {errors.mobile && <p className="text-rose-500 text-[11px] mt-1">{errors.mobile}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City (Optional)
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Lucknow, Jaipur"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Industry / Business Category (Optional)
              </label>
              <select
                value={form.businessType}
                onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              >
                <option value="">Select Industry (e.g. Retail, Pharma, Wholesale)...</option>
                {businessTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-extrabold py-3 rounded-xl transition-all shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-60 text-sm mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>Schedule Live Demo Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Direct WhatsApp Quick Connect Alternative */}
            <div className="pt-2 text-center">
              <span className="text-[11px] text-slate-500 block mb-2 font-medium">Prefer an instant reply without waiting?</span>
              <a
                href="https://wa.me/919473807622?text=Hi%2C%20I%20want%20to%20see%20a%20live%20demo%20of%20UdyogBill"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Chat Directly on WhatsApp: +91 94738 07622</span>
              </a>
            </div>

            <p className="text-center text-[11px] text-slate-500 pt-1">
              🔒 100% Privacy Protected • Zero Sales Spam • 1-on-1 Product Walkthrough
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const navLinks = [
  { label: "Features", href: "/features" },
  {
    label: "Industries",
    href: "/industries",
    hasDropdown: true,
    children: [
      { label: "Pharma & Chemists", desc: "Batch expiry, Form 20B/21B & Schedule H1", href: "/industries/pharma", icon: "💊" },
      { label: "FMCG & Grocery Wholesalers", desc: "Beat routing, delivery challans & broker tracking", href: "/industries/fmcg", icon: "🛒" },
      { label: "Retail Supermarkets", desc: "Fast thermal barcode POS & loyalty management", href: "/industries/retail", icon: "🏪" },
      { label: "Wholesale & Stockists", desc: "Bulk rate slabs, credit control & party ledger", href: "/industries/wholesale", icon: "📦" },
      { label: "Garments & Footwear", desc: "Color, size matrix, barcode labels & styles", href: "/industries/garments", icon: "👕" },
      { label: "Electronics & Mobile Shops", desc: "Serial number, IMEI tracking & warranty cards", href: "/industries/electronics", icon: "📱" },
      { label: "Hardware & Building Supplies", desc: "Unit conversions, brass/kg rates & godowns", href: "/industries/hardware", icon: "🔩" },
      { label: "Explore All 11 Industries →", desc: "Customized solutions for every Indian trade", href: "/industries", icon: "✨" },
    ],
  },
  { label: "Pricing", href: "/pricing" },
  { label: "Free Templates", href: "/templates" },
  { label: "Blog & Guides", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function Navbar({ onDemoClick }: { onDemoClick: () => void }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIndustriesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 print:hidden ${
        scrolled
          ? "bg-[#fff7ed]/98 backdrop-blur-md shadow-md border-b border-orange-200/80"
          : "bg-[#fff7ed]/98 backdrop-blur-xs border-b border-orange-200/60"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-2.5 flex items-center justify-between">
        {/* Brand Logo & Trust Tag */}
        <div className="flex items-center gap-3.5">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <img
              src="/logo.png"
              alt="UdyogBill - Multi-Industry Cloud GST Billing & Inventory Software"
              className="h-11 sm:h-12 w-auto object-contain transition-transform group-hover:scale-102 drop-shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            />
          </Link>
          <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/70 border border-orange-300/80 text-[11px] font-extrabold text-orange-800 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span>GST &amp; E-Invoice Ready</span>
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((item) => {
            if (item.hasDropdown) {
              return (
                <div key={item.label} className="relative" ref={dropdownRef}>
                  <Link
                    href="/industries"
                    onClick={(e) => { e.preventDefault(); setIndustriesOpen(!industriesOpen); }}
                    onMouseEnter={() => setIndustriesOpen(true)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                      pathname.startsWith("/industries")
                        ? "text-orange-600 bg-orange-50 font-bold"
                        : "text-slate-700 hover:text-orange-600 hover:bg-orange-50/50"
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        industriesOpen ? "rotate-180 text-orange-600" : "text-slate-400"
                      }`}
                    />
                  </Link>

                  {/* Mega Dropdown */}
                  {industriesOpen && (
                    <div
                      onMouseLeave={() => setIndustriesOpen(false)}
                      className="absolute left-0 top-full mt-1 w-96 rounded-2xl bg-white border border-slate-200 shadow-xl p-2.5 grid grid-cols-1 gap-1 animate-in fade-in zoom-in-95 duration-150"
                    >
                      {item.children?.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setIndustriesOpen(false)}
                          className="p-2.5 rounded-xl hover:bg-orange-50/60 transition-colors group flex items-start gap-2.5"
                        >
                          <span className="text-base leading-none pt-0.5">{sub.icon}</span>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-orange-600 transition-colors">
                              {sub.label}
                            </span>
                            <span className="text-[11px] text-slate-500 mt-0.5">
                              {sub.desc}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? "text-orange-600 bg-orange-50 font-bold"
                    : "text-slate-700 hover:text-orange-600 hover:bg-orange-50/50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons: Clean Hierarchy (Download App -> Start Free Trial -> Sign In) */}
        <div className="hidden md:flex items-center gap-2.5">
          <a
            href="/downloads/udyogbill-billing.apk"
            download="UdyogBill-Billing.apk"
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-300 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs group cursor-pointer"
            title="Download UdyogBill Store POS & GST Billing Android App"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 group-hover:-translate-y-0.5 transition-transform" />
            <span>Download App</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </a>

          <Link
            href="/register"
            className="text-xs font-bold text-slate-800 hover:text-orange-600 bg-white hover:bg-orange-50/80 border border-slate-300 hover:border-orange-400 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Start Free Trial</span>
          </Link>

          <Link
            href="/login"
            className="text-xs font-extrabold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 px-4 py-1.5 rounded-xl shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 transition-all flex items-center gap-1.5 group cursor-pointer"
          >
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Mobile Header (Download App CTA & Hamburger Toggle) */}
        <div className="flex items-center gap-2 lg:hidden">
          <a
            href="/downloads/udyogbill-billing.apk"
            download="UdyogBill-Billing.apk"
            className="text-xs font-black text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm shadow-orange-500/25"
            title="Download UdyogBill Billing App for Android"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Download App</span>
          </a>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3 shadow-xl max-h-[85vh] overflow-y-auto">
          <div className="space-y-1">
            <Link
              href="/features"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-xs font-bold text-slate-800 hover:bg-orange-50"
            >
              Features &amp; Modules
            </Link>
            <Link
              href="/industries"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-xs font-bold text-slate-800 hover:bg-orange-50"
            >
              Industry Solutions
            </Link>
            <div className="pl-3 py-1 grid grid-cols-2 gap-1 text-[11px] text-slate-600">
              <Link href="/industries/pharma" onClick={() => setMenuOpen(false)} className="py-1 hover:text-orange-600">
                💊 Pharma / Medical
              </Link>
              <Link href="/industries/fmcg" onClick={() => setMenuOpen(false)} className="py-1 hover:text-orange-600">
                🛒 FMCG &amp; Wholesale
              </Link>
              <Link href="/industries/retail" onClick={() => setMenuOpen(false)} className="py-1 hover:text-orange-600">
                🏪 Retail Supermarket
              </Link>
              <Link href="/industries/garments" onClick={() => setMenuOpen(false)} className="py-1 hover:text-orange-600">
                👕 Garments &amp; Fashion
              </Link>
            </div>
            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-xs font-bold text-slate-800 hover:bg-orange-50"
            >
              Pricing Plans
            </Link>
            <Link
              href="/blog"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-xs font-bold text-slate-800 hover:bg-orange-50"
            >
              Blog &amp; Knowledge Base
            </Link>
            <Link
              href="/about"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-xs font-bold text-slate-800 hover:bg-orange-50"
            >
              About Company
            </Link>
            <Link
              href="/contact"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-xs font-bold text-slate-800 hover:bg-orange-50"
            >
              Contact Support
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <a
              href="/downloads/udyogbill-billing.apk"
              download="UdyogBill-Billing.apk"
              onClick={() => setMenuOpen(false)}
              className="w-full py-2.5 text-xs font-extrabold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl flex items-center justify-center gap-2 shadow-2xs"
            >
              <Download className="w-4 h-4 text-orange-600" />
              <span>Download Billing App</span>
            </a>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="text-center py-2.5 text-xs font-bold text-slate-800 border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Sign In to Account
            </Link>
            <button
              onClick={() => {
                setMenuOpen(false);
                onDemoClick();
              }}
              className="w-full py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Book Free Product Demo</span>
            </button>
            <Link
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="text-center py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-1.5"
            >
              <span>Start 7-Day Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer({ onDemoClick }: { onDemoClick: () => void }) {
  return (
    <footer className="bg-[#fff7ed] text-slate-800 border-t border-orange-200/90 pt-16 pb-10 print:hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-12">
        {/* Main 5-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Col 1: Brand, Mission & Trust Badges */}
          <div className="space-y-4 lg:col-span-1">
            <Link href="/" className="inline-block">
              <img
                src="/logo.png"
                alt="UdyogBill"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              India&apos;s modern cloud GST billing, inventory management, and business operating platform designed for retail, wholesale, pharma, and growing businesses.
            </p>
            <div className="pt-2 space-y-2 text-[11px]">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>256-Bit Bank-Grade SSL Encryption</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-300 text-orange-950 font-bold">
                <Check className="w-4 h-4 text-orange-600 shrink-0" />
                <span>100% GST &amp; E-Invoicing Compliant</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-300 text-orange-950 font-bold">
                <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
                <span>99.9% High Availability Cloud SLA</span>
              </div>
            </div>
          </div>

          {/* Col 2: Core Capabilities & Modules */}
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </span>
              <span>Core Capabilities</span>
            </h4>
            <ul className="space-y-2 text-xs">
              {[
                ["GST Invoicing & Billing", "/features", "🧾"],
                ["Real-Time Stock & Inventory", "/features", "📦"],
                ["Party Ledger & WhatsApp Reminders", "/features", "👥"],
                ["Fast Thermal Barcode POS", "/features", "🛒"],
                ["Multi-Branch & Staff Permissions", "/features", "🏢"],
                ["Automated E-Way Bill & E-Invoice", "/features", "⚡"],
                ["Comprehensive P&L & Balance Sheet", "/features", "📊"],
              ].map(([title, link, icon]) => (
                <li key={title}>
                  <Link href={link} className="hover:text-orange-600 transition-colors text-slate-700 font-medium flex items-center gap-2 group">
                    <span className="text-xs group-hover:scale-110 transition-transform">{icon}</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">{title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Industry Solutions */}
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Briefcase className="w-3.5 h-3.5" />
              </span>
              <span>Industry Verticals</span>
            </h4>
            <ul className="space-y-2 text-xs">
              {[
                ["Pharma & Chemists (DL)", "/industries/pharma", "💊"],
                ["FMCG & Food Distribution", "/industries/fmcg", "🚚"],
                ["Retail Stores & Supermarkets", "/industries/retail", "🏪"],
                ["Wholesale Trading & Stockists", "/industries/wholesale", "📦"],
                ["Garments, Footwear & Apparel", "/industries/garments", "👕"],
                ["Electronics, Mobile & Hardware", "/industries/electronics", "📱"],
                ["View All 11 Industries →", "/industries", "✨"],
              ].map(([title, link, icon]) => (
                <li key={title}>
                  <Link href={link} className="hover:text-orange-600 transition-colors text-slate-700 font-medium flex items-center gap-2 group">
                    <span className="text-xs group-hover:scale-110 transition-transform">{icon}</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">{title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Resources & Learning */}
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-3.5 h-3.5" />
              </span>
              <span>Resources &amp; Support</span>
            </h4>
            <ul className="space-y-2 text-xs">
              {[
                ["Transparent Pricing Plans", "/pricing", "🏷️"],
                ["Free GST Invoice Generator", "/tools/gst-invoice-generator", "🧾"],
                ["Pharma PTR / Margin Calculator", "/tools/pharma-margin-calculator", "💊"],
                ["Software Comparisons (Marg, Vyapar)", "/compare", "⚖️"],
                ["Knowledge Base & Blog", "/blog", "📚"],
                ["GST Guides & HSN Code List", "/blog", "🔍"],
                ["Free Data Migration Guide", "/features", "🚀"],
                ["Book 1-on-1 Guided Demo", "/contact", "💻"],
                ["Customer Support Portal", "/contact", "🎧"],
              ].map(([title, link, icon]) => (
                <li key={title}>
                  <Link href={link} className="hover:text-orange-600 transition-colors text-slate-700 font-medium flex items-center gap-2 group">
                    <span className="text-xs group-hover:scale-110 transition-transform">{icon}</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">{title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 5: Company & Direct Help */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </span>
              <span>Company &amp; Contact</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-600 shrink-0" />
                <a href="tel:+919473807622" className="hover:text-orange-600 transition-colors font-mono font-bold text-slate-900 text-sm">
                  +91 94738 07622
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20I%20have%20an%20inquiry%20regarding%20UdyogBill"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-800 text-emerald-700 font-bold transition-colors"
                >
                  WhatsApp Business Help
                </a>
              </li>
              <li className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                <span>🕒</span>
                <span>Mon - Sat, 9:30 AM to 7:00 PM IST</span>
              </li>
              <li className="text-xs text-slate-800 font-semibold flex items-center gap-1.5">
                <span>✉️</span>
                <span>support@udyogbill.com</span>
              </li>
            </ul>

            <button
              onClick={onDemoClick}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Headphones className="w-4 h-4" />
              <span>Book a Product Demo</span>
            </button>
          </div>
        </div>

        {/* Native Android Mobile Apps Banner */}
        <div className="bg-gradient-to-br from-orange-50 via-white to-amber-50/50 border border-orange-200/90 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 transition-all shadow-xs mb-8">
          <div className="max-w-xl text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 border border-orange-300 px-3 py-1 rounded-full text-xs font-bold mb-2">
              📱 100% Native Android Architecture
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-950">
              Download UdyogBill Mobile Billing App
            </h3>
            <p className="text-xs text-slate-700 mt-1.5 leading-relaxed font-medium">
              Fast, offline-ready retail POS billing, barcode scanning, thermal printing, and GST invoice generation directly on your Android phone.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3.5">
            {/* Store Billing APK */}
            <a
              href="/downloads/udyogbill-billing.apk"
              download="UdyogBill-Billing.apk"
              className="flex items-center gap-3 bg-white border-2 border-orange-200 hover:border-orange-500 px-6 py-3.5 rounded-xl transition-all group shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-lg border border-orange-200">
                🧾
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Store POS &amp; Billing</div>
                <div className="text-xs font-extrabold text-slate-950 group-hover:text-orange-600 transition-colors">Download Billing App</div>
                <div className="text-[10px] text-emerald-700 font-bold">Android Direct Package</div>
              </div>
            </a>
          </div>
        </div>

        {/* Free B2B Business Tools & Comparisons Row */}
        <div className="border-t border-orange-200/80 pt-6 pb-2">
          <div className="bg-orange-100/40 border border-orange-200/90 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-extrabold uppercase tracking-wide">Free B2B Tools</span>
                <h4 className="text-sm font-extrabold text-slate-900">Free Business Calculators &amp; Compliance Utilities</h4>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">100% Free online tools for Indian MSMEs, Wholesalers &amp; Accountants. No login required.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 text-xs font-bold">
              <Link
                href="/tools/gst-invoice-generator"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-orange-50 text-slate-800 hover:text-orange-700 border border-orange-200/70 shadow-2xs hover:shadow-xs transition-all group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">🧾</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">GST Invoice Generator</span>
                  <span className="text-[10px] text-slate-500 font-normal">Print &amp; Download PDF Invoices</span>
                </div>
              </Link>

              <Link
                href="/tools/pharma-margin-calculator"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-emerald-200/70 shadow-2xs hover:shadow-xs transition-all group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">💊</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Pharma PTR / PTS Calculator</span>
                  <span className="text-[10px] text-slate-500 font-normal">Deal Schemes (10+1) &amp; Margins</span>
                </div>
              </Link>

              <Link
                href="/tools/eway-bill-distance-calculator"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-800 hover:text-amber-800 border border-amber-200/70 shadow-2xs hover:shadow-xs transition-all group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">🚚</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">E-Way Bill Validity Calculator</span>
                  <span className="text-[10px] text-slate-500 font-normal">Distance Expiry &amp; Rule 138(10)</span>
                </div>
              </Link>

              <Link
                href="/tools/gst-late-fee-calculator"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-800 hover:text-rose-800 border border-rose-200/70 shadow-2xs hover:shadow-xs transition-all group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">⏱️</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">GST Late Fee &amp; Interest (Sec 50)</span>
                  <span className="text-[10px] text-slate-500 font-normal">GSTR-3B &amp; 18% p.a. Penalties</span>
                </div>
              </Link>

              <Link
                href="/tools/fmcg-distributor-margin-calculator"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-sky-50 text-slate-800 hover:text-sky-800 border border-sky-200/70 shadow-2xs hover:shadow-xs transition-all group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">📈</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">FMCG Distributor ROI Calculator</span>
                  <span className="text-[10px] text-slate-500 font-normal">Credit Days &amp; Capital Interest</span>
                </div>
              </Link>

              <Link
                href="/tools/paint-margin-density-calculator"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-violet-50 text-slate-800 hover:text-violet-800 border border-violet-200/70 shadow-2xs hover:shadow-xs transition-all group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">🎨</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Paint Tinting &amp; Density Calc</span>
                  <span className="text-[10px] text-slate-500 font-normal">Liter to KG &amp; Machine Colorant</span>
                </div>
              </Link>

              <Link
                href="/tools/tds-194q-calculator"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-teal-50 text-slate-800 hover:text-teal-800 border border-teal-200/70 shadow-2xs hover:shadow-xs transition-all group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">📋</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">TDS Sec 194Q &amp; TCS 206C(1H)</span>
                  <span className="text-[10px] text-slate-500 font-normal">₹50 Lakh Turnover Thresholds</span>
                </div>
              </Link>

              <Link
                href="/tools/garment-markup-calculator"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-pink-50 text-slate-800 hover:text-pink-800 border border-pink-200/70 shadow-2xs hover:shadow-xs transition-all group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">👕</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Garment Set Markup Calculator</span>
                  <span className="text-[10px] text-slate-500 font-normal">Size Ratio &amp; Dead Stock Risk</span>
                </div>
              </Link>
            </div>

            <div className="pt-2.5 border-t border-orange-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-800">
                <span className="font-bold flex items-center gap-1 text-slate-900">
                  <span>📁 Free Excel Invoice Formats (.xlsx):</span>
                </span>
                <Link href="/templates" className="text-orange-700 hover:text-orange-900 font-semibold hover:underline">All Templates</Link>
                <span className="text-slate-300">•</span>
                <Link href="/templates/gst-invoice-format-excel" className="text-orange-700 hover:text-orange-900 font-semibold hover:underline">GST Invoice</Link>
                <span className="text-slate-300">•</span>
                <Link href="/templates/pharma-medical-store-bill-format" className="text-orange-700 hover:text-orange-900 font-semibold hover:underline">Pharma Chemist Bill</Link>
                <span className="text-slate-300">•</span>
                <Link href="/templates/retail-kirana-bill-book-format" className="text-orange-700 hover:text-orange-900 font-semibold hover:underline">Kirana Cash Memo</Link>
                <span className="text-slate-300">•</span>
                <Link href="/templates/garment-shop-bill-format-excel" className="text-orange-700 hover:text-orange-900 font-semibold hover:underline">Garment Apparel</Link>
                <span className="text-slate-300">•</span>
                <Link href="/templates/transport-delivery-challan-format" className="text-orange-700 hover:text-orange-900 font-semibold hover:underline">Delivery Challan</Link>
                <span className="text-slate-300">•</span>
                <Link href="/templates/proforma-invoice-format-word" className="text-orange-700 hover:text-orange-900 font-semibold hover:underline">Proforma Quote</Link>
              </div>
            </div>

            <div className="pt-2 border-t border-orange-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Looking for software alternatives?</span>
              <Link
                href="/compare"
                className="text-orange-700 hover:text-orange-800 font-bold hover:underline flex items-center gap-1"
              >
                <span>Compare UdyogBill vs Marg ERP, Vyapar, Busy &amp; TallyPrime →</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Local SEO Cities Grid */}
        <div className="border-t border-slate-200 pt-6 pb-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-3.5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </span>
            <span>Serving Businesses Across Indian Trading Hubs &amp; Industrial Cities:</span>
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-slate-700 font-medium">
            {[
              ["Delhi NCR", "/city/delhi"],
              ["Mumbai", "/city/mumbai"],
              ["Bengaluru", "/city/bengaluru"],
              ["Lucknow", "/city/lucknow"],
              ["Kanpur", "/city/kanpur"],
              ["Varanasi", "/city/varanasi"],
              ["Jaipur", "/city/jaipur"],
              ["Ahmedabad", "/city/ahmedabad"],
              ["Indore", "/city/indore"],
              ["Patna", "/city/patna"],
              ["Surat", "/city/surat"],
              ["Pune", "/city/pune"],
              ["Agra", "/city/agra"],
              ["Ludhiana", "/city/ludhiana"],
              ["Chandigarh", "/city/chandigarh"],
              ["Meerut", "/city/meerut"],
              ["Rajkot", "/city/rajkot"],
              ["Vadodara", "/city/vadodara"],
              ["Bhopal", "/city/bhopal"],
              ["Ghaziabad", "/city/ghaziabad"],
              ["Hyderabad", "/city/hyderabad"],
              ["Kolkata", "/city/kolkata"],
              ["Chennai", "/city/chennai"],
              ["Coimbatore", "/city/coimbatore"],
              ["Nagpur", "/city/nagpur"],
              ["Raipur", "/city/raipur"],
              ["Ranchi", "/city/ranchi"],
              ["Bhubaneswar", "/city/bhubaneswar"],
              ["Kochi", "/city/kochi"],
              ["Visakhapatnam", "/city/visakhapatnam"],
              ["Jodhpur", "/city/jodhpur"],
              ["Amritsar", "/city/amritsar"],
              ["Gorakhpur", "/city/gorakhpur"],
              ["Gwalior", "/city/gwalior"],
              ["Jabalpur", "/city/jabalpur"],
              ["Prayagraj", "/city/prayagraj"],
              ["Bareilly", "/city/bareilly"],
              ["Aligarh", "/city/aligarh"],
              ["Moradabad", "/city/moradabad"],
              ["Jalandhar", "/city/jalandhar"],
              ["Vijayawada", "/city/vijayawada"],
              ["Madurai", "/city/madurai"],
              ["Nashik", "/city/nashik"],
              ["Aurangabad", "/city/aurangabad"],
              ["Dehradun", "/city/dehradun"],
              ["Jamshedpur", "/city/jamshedpur"],
              ["Guwahati", "/city/guwahati"],
              ["Dhanbad", "/city/dhanbad"],
              ["Mirzapur", "/city/mirzapur"],
              ["Jammu", "/city/jammu"],
            ].map(([cityName, link], index) => (
              <span key={cityName} className="inline-flex items-center gap-2">
                {index > 0 && <span className="text-orange-400 font-bold">•</span>}
                <Link href={link} className="hover:text-orange-600 transition-colors">
                  {cityName}
                </Link>
              </span>
            ))}
          </div>
        </div>

        {/* Legal & Copyright Bar */}
        <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-medium">
          <p>© 2026 UdyogBill — A Product of DigiOpera Private Limited. All Rights Reserved. | हर व्यापार का स्मार्ट साथी</p>
          <div className="flex gap-4 font-semibold">
            <Link href="/privacy" className="text-slate-700 hover:text-orange-600 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-slate-700 hover:text-orange-600 transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-slate-700 hover:text-orange-600 transition-colors">
              Support &amp; Grievance
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FloatingButtons({ onDemoClick }: { onDemoClick: () => void }) {
  return (
    <div
      className="fixed bottom-6 right-4 sm:right-6 flex flex-col items-end gap-2.5 print:hidden"
      style={{ zIndex: 999999, pointerEvents: "auto" }}
    >
      <a
        href="tel:+919473807622"
        className="h-10 px-3.5 rounded-full flex items-center gap-2 shadow-lg transition-all hover:scale-105 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs"
        title="Call Technical Support (+91 94738 07622)"
      >
        <Phone className="w-3.5 h-3.5 text-white" />
        <span className="hidden sm:inline">Call Expert: +91 94738 07622</span>
      </a>

      <a
        href="https://wa.me/919473807622?text=Hi%2C%20I%20want%20to%20know%20more%20about%20UdyogBill%20Software"
        target="_blank"
        rel="noopener noreferrer"
        className="h-12 px-4 rounded-full flex items-center gap-2 shadow-2xl transition-all hover:scale-105 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm border-2 border-white/60"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="w-5 h-5 text-white shrink-0" />
        <span>Chat on WhatsApp</span>
        <span className="w-2 h-2 rounded-full bg-white animate-ping ml-0.5" />
      </a>
    </div>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    initAttribution();
    const themeClasses = [
      "dark",
      "theme-dark",
      "theme-light",
      "theme-vibrant",
      "theme-navy",
      "theme-emerald",
      "theme-amber",
    ];
    document.documentElement.classList.remove(...themeClasses);
    document.body.classList.remove(...themeClasses);
    document.documentElement.classList.add("marketing-active");
    document.body.classList.add("marketing-active");

    return () => {
      document.documentElement.classList.remove("marketing-active");
      document.body.classList.remove("marketing-active");
    };
  }, []);

  return (
    <div className="marketing-site-wrapper min-h-screen flex flex-col bg-[#fff7ed] text-slate-900 font-sans selection:bg-orange-500 selection:text-white print:bg-white print:min-h-0 print:m-0 print:p-0">
      <Navbar onDemoClick={() => setPopupOpen(true)} />
      <main className="flex-1 pt-14 sm:pt-16 pb-12 bg-[#fff7ed] text-slate-900 print:p-0 print:m-0 print:bg-white">{children}</main>
      <Footer onDemoClick={() => setPopupOpen(true)} />
      <FloatingButtons onDemoClick={() => setPopupOpen(true)} />
      <div className="print:hidden">
        <ContactPopup open={popupOpen} onClose={() => setPopupOpen(false)} />
        <Smart3dLeadPopup />
      </div>
    </div>
  );
}
