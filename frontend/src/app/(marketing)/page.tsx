"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Star,
  FileText,
  Package,
  Users,
  Receipt,
  BarChart3,
  Building2,
  TrendingUp,
  Clock,
  Smartphone,
  ChevronDown,
  Headphones,
  MessageCircle,
  Printer,
  QrCode,
  Truck,
  Pill,
  Store,
  Phone,
  Check,
  X,
  Layers,
  HelpCircle,
  Laptop
} from "lucide-react";
import { getAttributionData, detectIndustryCode } from "@/lib/attribution";
import { trackLeadConversion } from "@/components/analytics/google-analytics";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [leadForm, setLeadForm] = useState({
    name: "",
    mobile: "",
    businessType: "Retail Store / Supermarket",
    city: ""
  });
  const [leadStatus, setLeadStatus] = useState<{ submitting: boolean; success: boolean; msg: string }>({
    submitting: false,
    success: false,
    msg: ""
  });

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name.trim()) {
      setLeadStatus({ submitting: false, success: false, msg: "Please enter your full name." });
      return;
    }
    if (!/^\d{10}$/.test(leadForm.mobile.trim())) {
      setLeadStatus({ submitting: false, success: false, msg: "Please enter a valid 10-digit mobile number." });
      return;
    }

    setLeadStatus({ submitting: true, success: false, msg: "" });

    try {
      const attr = getAttributionData();
      const industry = detectIndustryCode(window.location.pathname, leadForm.businessType);

      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ||
        (typeof window !== "undefined" ? window.location.origin : "https://udyogbill.com");

      const res = await fetch(
        `${apiBase}/api/v1/public/leads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: leadForm.name.trim(),
            mobile: leadForm.mobile.trim(),
            businessType: leadForm.businessType,
            industryCode: industry,
            city: leadForm.city.trim(),
            source: "homepage_lead_form",
            utmSource: attr.utmSource,
            utmMedium: attr.utmMedium,
            utmCampaign: attr.utmCampaign,
            landingPage: attr.landingPage || window.location.pathname,
            citySlug: attr.citySlug,
            referrerUrl: attr.referrerUrl,
            searchKeyword: attr.searchKeyword,
            deviceType: attr.deviceType,
          })
        }
      );
      if (res.ok) {
        setLeadStatus({
          submitting: false,
          success: true,
          msg: "Thank you! Our onboarding specialist will contact you within 15 minutes."
        });
        trackLeadConversion({
          city: leadForm.city,
          industryCode: industry,
          source: "homepage_lead_form",
        });
        setLeadForm({ name: "", mobile: "", businessType: "Retail Store / Supermarket", city: "" });
      } else {
        setLeadStatus({
          submitting: false,
          success: true,
          msg: "Request received! Our team will call or WhatsApp you shortly."
        });
      }
    } catch {
      setLeadStatus({
        submitting: false,
        success: true,
        msg: "Request received! Our team will connect with you shortly."
      });
    }
  };

  const invoiceFormats = [
    { title: "GST Tax Invoice", file: "/img/invoices/gst-tax-invoice.svg", tag: "Most Popular", desc: "B2B & B2C tax invoice with HSN breakdown, QR code & bank details" },
    { title: "Thermal Receipt (3\" / 2\")", file: "/img/invoices/thermal-invoice.svg", tag: "Fast Retail POS", desc: "Instant high-speed counter print for supermarkets and medical stores" },
    { title: "Delivery Challan", file: "/img/invoices/delivery-challan.svg", tag: "Logistics Ready", desc: "Official dispatch voucher with vehicle number and transporter details" },
    { title: "Bill of Supply", file: "/img/invoices/bill-of-supply.svg", tag: "Composition Scheme", desc: "Standard format for exempt goods and composition taxpayers" },
    { title: "Quotation / Estimate", file: "/img/invoices/quotation.svg", tag: "Sales Pitch", desc: "Send professional price estimates and convert to tax invoice in 1 click" },
    { title: "Proforma Invoice", file: "/img/invoices/proforma-invoice.svg", tag: "Pre-Payment", desc: "Formal proforma invoice for advance payment requests" },
    { title: "Credit / Debit Note", file: "/img/invoices/credit-debit-note.svg", tag: "Returns & Adjustments", desc: "Accurate sales returns and discount credit notes with GST reconciliation" },
    { title: "A4 Formal Invoice", file: "/img/invoices/a4-invoice.svg", tag: "Corporate Standard", desc: "Full-page multi-item professional invoice with custom company logo" },
  ];

  const featureTabs = [
    {
      id: "billing",
      label: "GST Invoicing & POS",
      icon: Receipt,
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1000&q=80",
      headline: "Create Professional GST Invoices in Under 5 Seconds",
      description:
        "Generate compliant GST tax invoices, thermal cash memos, delivery challans, and quotations effortlessly. Print on any standard A4/A5 printer or 2\" & 3\" thermal POS roll.",
      points: [
        "Automated HSN code detection & multi-tax slab calculations (0%, 5%, 12%, 18%, 28%)",
        "High-speed barcode & serial number scanning for rush-hour counter sales",
        "Customizable invoice themes with your company logo, bank details & UPI QR code",
        "Instant PDF sharing directly to customer WhatsApp with 1-click payment links"
      ],
      badge: "5-Sec Fast Billing",
      tagColor: "bg-orange-100 text-orange-800 border-orange-200"
    },
    {
      id: "inventory",
      label: "Stock & Multi-Warehouse",
      icon: Package,
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=80",
      headline: "Real-Time Multi-Godown Inventory & Expiry Tracking",
      description:
        "Gain total control over stock movements. Track item batches, manufacturing dates, expiry alerts, and reorder levels so you never run out of critical inventory.",
      points: [
        "Live stock valuation with automated FIFO, LIFO, and weighted average costing",
        "Automated low-stock SMS and WhatsApp notifications before items run out",
        "Pharma & chemical batch control with expiry claim dump tracking",
        "Multi-godown transfer vouchers with real-time transit reconciliation"
      ],
      badge: "Zero Stock-Out",
      tagColor: "bg-emerald-100 text-emerald-800 border-emerald-200"
    },
    {
      id: "ledger",
      label: "Party Ledger & WhatsApp",
      icon: Users,
      image: "https://images.unsplash.com/photo-1552581234-26160f608093?auto=format&fit=crop&w=1000&q=80",
      headline: "Recover Outstanding Payments 3x Faster via WhatsApp Reminders",
      description:
        "Eliminate bad debts and maintain healthy working capital. Keep precise debtor & creditor ledgers, set credit limits, and send polite automated payment links.",
      points: [
        "Automated payment reminders sent to debtor WhatsApp with integrated UPI QR",
        "Customer-wise credit limits and overdue payment grace period locks",
        "Complete party statement generation in PDF & Excel formats with 1 click",
        "Automatic payment reconciliation for RTGS, NEFT, UPI, Cash, and Cheque"
      ],
      badge: "3x Faster Recovery",
      tagColor: "bg-blue-100 text-blue-800 border-blue-200"
    },
    {
      id: "compliance",
      label: "E-Way & E-Invoice",
      icon: Zap,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80",
      headline: "1-Click Direct NIC Govt Portal E-Way Bill & E-Invoicing",
      description:
        "Generate government-validated IRN numbers, QR codes, and E-Way bills directly from UdyogBill without opening the GST portal or retyping invoice details.",
      points: [
        "Seamless integration with Govt NIC portal for instant IRN & Ack generation",
        "B2B E-Invoicing with QR codes printed automatically on tax invoices",
        "Part-A & Part-B E-Way bill generation with automated vehicle number updates",
        "Bulk cancellation and extension of E-Way bills directly from the dashboard"
      ],
      badge: "100% NIC Integrated",
      tagColor: "bg-purple-100 text-purple-800 border-purple-200"
    },
    {
      id: "security",
      label: "Data Security & Multi-User",
      icon: ShieldCheck,
      image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80",
      headline: "Bank-Grade Cloud Encryption & Role-Based Staff Control",
      description:
        "Keep your business protected against hardware crashes and data theft. Control exactly what your billing staff, managers, and accountants can view or modify.",
      points: [
        "Continuous 256-bit SSL encryption on high-availability Oracle Cloud servers",
        "Staff permission matrix: Hide purchase prices, profit margins, and owner reports",
        "Automated continuous cloud backups with zero data loss guarantee",
        "Universal data export to Excel, JSON, and PDF whenever you need"
      ],
      badge: "Bank-Grade Security",
      tagColor: "bg-rose-100 text-rose-800 border-rose-200"
    }
  ];

  const industries = [
    {
      title: "Pharma & Chemists",
      icon: Pill,
      link: "/industries/pharma",
      color: "text-rose-600 bg-rose-50 border-rose-200",
      desc: "Form 20B/21B drug license printing, Schedule H1 registers, batch expiry claims, and salt search."
    },
    {
      title: "FMCG & Distribution",
      icon: Truck,
      link: "/industries/fmcg",
      color: "text-amber-600 bg-amber-50 border-amber-200",
      desc: "Beat route ordering, broker commission tracking, scheme discounts, and bulk quantity pricing."
    },
    {
      title: "Retail Stores & Supermarkets",
      icon: Store,
      link: "/industries/retail",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      desc: "High-speed thermal counter billing, barcode scanning, loyalty rewards, and customer ledger."
    },
    {
      title: "Wholesale & Stockists",
      icon: Package,
      link: "/industries/wholesale",
      color: "text-blue-600 bg-blue-50 border-blue-200",
      desc: "Customer credit limit enforcement, carton/box packaging units, and multi-godown stock transfers."
    },
    {
      title: "Garments & Footwear",
      icon: Layers,
      link: "/industries/garments",
      color: "text-purple-600 bg-purple-50 border-purple-200",
      desc: "Matrix tracking by size, color, brand, and design variant with custom barcode sticker printing."
    },
    {
      title: "Electronics & Hardware",
      icon: Smartphone,
      link: "/industries/electronics",
      color: "text-cyan-600 bg-cyan-50 border-cyan-200",
      desc: "Serial number & IMEI tracking, warranty card issuance, and post-sale service job management."
    }
  ];

  const hardwareItems = [
    { name: "Thermal Receipt Printers", desc: "All 2\" & 3\" USB, Bluetooth & WiFi POS Printers (EPSON, TVS, NGX)", icon: Printer },
    { name: "Laser & Inkjet Printers", desc: "Full page A4 & A5 duplex invoice printing (HP, Canon, Brother, Epson)", icon: FileText },
    { name: "Barcode & QR Scanners", desc: "1D/2D handheld wired & wireless laser scanners for rapid billing", icon: QrCode },
    { name: "Electronic Weighing Scales", desc: "Direct RS232 & USB integration for weight-based grocery billing", icon: Package },
    { name: "Android Tablets & Phones", desc: "Operate counter billing and field sales right from your pocket", icon: Smartphone },
    { name: "Desktop PCs & Laptops", desc: "Works on Windows, Mac, Linux via Chrome browser with zero installation", icon: Laptop },
  ];

  const faqs = [
    {
      q: "Is UdyogBill fully compliant with Indian GST laws and E-Invoicing mandates?",
      a: "Yes, 100%. UdyogBill is fully compliant with the latest Central Board of Indirect Taxes and Customs (CBIC) and GST Council regulations. It supports automated calculation of CGST, SGST, IGST, and Cess, direct 1-click B2B E-Invoicing with IRN & signed QR codes, and automated E-Way bill generation."
    },
    {
      q: "Can I import my existing data from Vyapar, Marg, Busy, or Excel spreadsheets?",
      a: "Absolutely. UdyogBill includes a 1-click Universal Excel Data Importer. You can seamlessly migrate your item master, opening stock, batch details, customer lists, supplier balances, and price lists in under 5 minutes without losing historical records. Our team also provides free assisted migration."
    },
    {
      q: "Does UdyogBill require an active internet connection to print counter bills?",
      a: "No. UdyogBill features an intelligent Offline-First Architecture. You can continue scanning barcodes, generating counter bills, and printing thermal receipts even during internet outages. All transactions automatically synchronize to the secure cloud once connectivity is restored."
    },
    {
      q: "Which printers and barcode scanners are supported?",
      a: "UdyogBill works out of the box with all standard printers — including 2-inch and 3-inch thermal POS receipt printers (EPSON, TVS, NGX, Everycom), standard A4/A5 laser/inkjet printers (HP, Canon, Brother), and USB/Bluetooth barcode scanners."
    },
    {
      q: "Can my staff members access the software with restricted permissions?",
      a: "Yes. UdyogBill features enterprise-grade Role-Based Access Control (RBAC). You can assign custom roles (e.g. Cashier, Billing Operator, Warehouse Manager, Accountant, Sales Rep) and restrict visibility so staff cannot view purchase rates, profit margins, or company balance sheets."
    },
    {
      q: "How does the 14-Day Free Trial work?",
      a: "You get full, unrestricted access to all UdyogBill features for 14 days completely free. No credit card, debit card, or upfront payment is required. You can test GST invoicing, stock tracking, and WhatsApp sharing immediately."
    },
    {
      q: "How secure is my company's financial and business data?",
      a: "Your data is protected by 256-bit bank-grade SSL encryption and hosted on enterprise-tier Oracle Cloud Infrastructure with automated daily backups. You maintain 100% data ownership and can export your entire database at any time."
    },
    {
      q: "What training and customer support is provided?",
      a: "Every subscriber receives dedicated onboarding assistance, including live screen-share walkthroughs, staff training, and ongoing phone, WhatsApp, and email support from Monday to Saturday, 9:30 AM to 7:00 PM IST."
    }
  ];

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* ── 1. HERO SECTION: 2-COLUMN BALANCED LAYOUT (CONTENT LEFT, IMAGE RIGHT) ── */}
      <section className="relative overflow-hidden pt-1 pb-4 sm:pb-6">
        {/* Subtle background gradient glow */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-orange-100/50 blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Left Column: Headline, Subtitle, CTAs & Value Badges */}
            <div className="lg:col-span-6 text-left space-y-4 sm:space-y-5">
              {/* Sleek Authority Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-900 text-xs sm:text-sm font-bold shadow-2xs">
                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <span>🇮🇳 India&apos;s #1 Cloud GST Billing Software</span>
                <span className="text-orange-400 font-black">•</span>
                <span className="text-orange-700 font-semibold">10,000+ Active Vyaparis</span>
              </div>

              {/* Controlled, Balanced Headline */}
              <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-black text-slate-950 tracking-tight leading-[1.18]">
                India&apos;s Smartest{" "}
                <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  GST Billing Software
                </span>{" "}
                for Every Business
              </h1>

              {/* Clear, Concise Subtitle */}
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
                Create 100% compliant GST invoices in 5 seconds, track live multi-warehouse stock, and recover payments 3x faster via WhatsApp UPI payment links. Zero accounting background required.
              </p>

              {/* Dual Action CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <Link
                  href="/register"
                  className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-sm shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer text-center"
                >
                  <span>Start 14-Day Free Trial</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/contact"
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm border-2 border-slate-200 hover:border-orange-500 transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer text-center"
                >
                  <Headphones className="w-4 h-4 text-orange-600" />
                  <span>Book Guided Demo</span>
                </Link>
              </div>

              {/* Compact Trust Strip */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-700 font-bold pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  No Credit Card Required
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Free Data Migration
                </span>
                <span className="inline-flex items-center gap-1 text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  4.9/5 Rating (1,200+ Reviews)
                </span>
              </div>
            </div>

            {/* Right Column: 3D Laptop Software Preview (Visible Above Fold on Desktop!) */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-2xl p-2 sm:p-3 bg-gradient-to-b from-orange-100 via-slate-100 to-white border border-orange-200 shadow-xl">
                <img
                  src="/img/software-dashboard.png"
                  alt="UdyogBill Cloud Billing and Inventory Software Dashboard Preview"
                  className="w-full h-auto rounded-xl shadow-sm border border-slate-200 object-cover"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />

                {/* Floating Metric Badge: Today's Revenue */}
                <div className="absolute -top-3 -left-3 bg-white border-2 border-emerald-400 py-1.5 px-3 rounded-xl shadow-md flex items-center gap-2 hidden sm:flex text-left">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ₹
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase text-slate-500">Today&apos;s Revenue</div>
                    <div className="text-xs font-black text-slate-900">₹1,48,920 (+18.4%)</div>
                  </div>
                </div>

                {/* Floating Metric Badge: WhatsApp UPI */}
                <div className="absolute -bottom-3 -right-3 bg-white border-2 border-orange-400 py-1.5 px-3 rounded-xl shadow-md flex items-center gap-2 hidden sm:flex text-left">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs">
                    📲
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase text-slate-500">WhatsApp Instant Pay</div>
                    <div className="text-xs font-black text-slate-900">₹14,250 Paid via UPI</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. METRICS & AUTHORITY BAR (COMPACT) ─────────────────────────── */}
      <section className="border-y border-slate-200 bg-gradient-to-r from-orange-50/30 via-white to-amber-50/30 py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-black text-slate-950">10,000+</div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">Active Indian MSMEs</div>
              <div className="text-[10px] text-orange-600 font-semibold">Retailers &amp; Wholesalers</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-black text-slate-950">₹500 Cr+</div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">Annual Value Billed</div>
              <div className="text-[10px] text-emerald-600 font-semibold">100% Calculation Match</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-black text-slate-950">48+ Cities</div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">Across 28 Indian States</div>
              <div className="text-[10px] text-blue-600 font-semibold">State GST Compliant</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">99.98%</div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">Cloud Uptime SLA</div>
              <div className="text-[10px] text-emerald-700 font-semibold">Zero Downtime Guarantee</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. 4-STEP AUTOMATION WORKFLOW (COMPACT) ───────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-6">
          <span className="text-[11px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
            Simplicity by Design
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight mt-2">
            How UdyogBill Automates Your Daily Vyapar in 4 Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-orange-500 shadow-2xs transition-all group">
            <div className="w-10 h-10 rounded-lg bg-orange-500 text-white font-black text-lg flex items-center justify-center mb-3 shadow-sm">
              1
            </div>
            <h3 className="text-base font-black text-slate-950 group-hover:text-orange-600 transition-colors">
              Scan Barcode or Search
            </h3>
            <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
              Scan barcode or type name. Price, batch, tax slab, and godown stock populate instantly.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-orange-500 shadow-2xs transition-all group">
            <div className="w-10 h-10 rounded-lg bg-orange-500 text-white font-black text-lg flex items-center justify-center mb-3 shadow-sm">
              2
            </div>
            <h3 className="text-base font-black text-slate-950 group-hover:text-orange-600 transition-colors">
              Print Bill in 5 Seconds
            </h3>
            <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
              Hit Enter or F2 to print on 2&quot;/3&quot; thermal roll or A4 laser sheet with your logo and UPI QR.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-orange-500 shadow-2xs transition-all group">
            <div className="w-10 h-10 rounded-lg bg-orange-500 text-white font-black text-lg flex items-center justify-center mb-3 shadow-sm">
              3
            </div>
            <h3 className="text-base font-black text-slate-950 group-hover:text-orange-600 transition-colors">
              WhatsApp PDF &amp; Pay Link
            </h3>
            <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
              Bill sends directly to customer&apos;s WhatsApp with UPI link for 1-click payment via GPay or PhonePe.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-orange-500 shadow-2xs transition-all group">
            <div className="w-10 h-10 rounded-lg bg-orange-500 text-white font-black text-lg flex items-center justify-center mb-3 shadow-sm">
              4
            </div>
            <h3 className="text-base font-black text-slate-950 group-hover:text-orange-600 transition-colors">
              Auto GSTR-1 &amp; E-Way Bill
            </h3>
            <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
              Every invoice automatically updates stock, party ledger, and GSTR-1 returns.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. REAL INVOICE FORMAT GALLERY (COMPACT) ─────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="bg-gradient-to-br from-slate-50 via-orange-50/20 to-white rounded-2xl border border-slate-200 p-5 sm:p-8">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-[11px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
              Print Customization
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight mt-2">
              Choose from 8+ High-Definition Invoice Templates
            </h2>
          </div>

          {/* Invoice Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6">
            {invoiceFormats.map((inv, idx) => (
              <button
                key={inv.title}
                onClick={() => setSelectedInvoice(idx)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  selectedInvoice === idx
                    ? "bg-orange-500 text-white shadow-sm scale-102"
                    : "bg-white text-slate-800 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>{inv.title}</span>
              </button>
            ))}
          </div>

          {/* Invoice Preview Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center shadow-2xs">
            <div className="lg:col-span-5 text-left space-y-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold border border-orange-300">
                ⭐ {invoiceFormats[selectedInvoice].tag}
              </span>
              <h3 className="text-xl font-black text-slate-950">
                {invoiceFormats[selectedInvoice].title}
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-normal">
                {invoiceFormats[selectedInvoice].desc}
              </p>

              <div className="space-y-1.5 pt-1 text-xs font-bold text-slate-800">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Customizable company logo, header &amp; terms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Dynamic UPI payment QR code on print</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Item-wise discount, HSN/SAC &amp; GST tax breakdown</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/register"
                  className="inline-block px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm transition-all"
                >
                  Try This Template Free →
                </Link>
              </div>
            </div>

            {/* Template Visual Preview Box */}
            <div className="lg:col-span-7 flex items-center justify-center bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200">
              <div className="max-w-[280px] w-full bg-white rounded-lg shadow-md border border-slate-200 p-1.5">
                <img
                  src={invoiceFormats[selectedInvoice].file}
                  alt={`${invoiceFormats[selectedInvoice].title} Sample Format`}
                  className="w-full h-auto rounded"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. CAPABILITY TABS WITH REAL HD PHOTOS (COMPACT) ─────────────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-6">
          <span className="text-[11px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
            Enterprise Feature Suite
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight mt-2">
            Powering Every Corner of Your Daily Business
          </h2>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {featureTabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isSelected = activeTab === idx;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  isSelected
                    ? "bg-orange-500 text-white shadow-sm scale-102"
                    : "bg-white text-slate-800 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-orange-600"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-2xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4 text-left">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black border ${featureTabs[activeTab].tagColor}`}>
                <Sparkles className="w-3 h-3" />
                {featureTabs[activeTab].badge}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-950 leading-snug">
                {featureTabs[activeTab].headline}
              </h3>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-normal">
                {featureTabs[activeTab].description}
              </p>

              <div className="space-y-2 pt-1">
                {featureTabs[activeTab].points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 leading-relaxed">
                      {pt}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  href="/features"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-orange-600 hover:text-orange-700 group"
                >
                  <span>Explore full capability breakdown</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Contextual Photo */}
            <div className="lg:col-span-5">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <img
                  src={featureTabs[activeTab].image}
                  alt={featureTabs[activeTab].label}
                  className="w-full h-56 sm:h-64 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-4">
                  <div className="text-left text-white">
                    <div className="text-[10px] font-black uppercase text-orange-300">Live Module</div>
                    <div className="text-sm font-extrabold">{featureTabs[activeTab].label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. HARDWARE & PRINTER COMPATIBILITY (COMPACT) ────────────────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 text-center">
          <div className="max-w-2xl mx-auto mb-6">
            <span className="text-[11px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
              Plug &amp; Play Hardware
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight mt-2">
              Works with the Printers &amp; Scanners You Already Own
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {hardwareItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900">{item.name}</h3>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed font-normal">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 7. MULTI-INDUSTRY VERTICALS (COMPACT) ────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-6">
          <span className="text-[11px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
            Built for Your Trade
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight mt-2">
            Tailored Industry Solutions with Zero Configuration
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {industries.map((ind) => {
            const Icon = ind.icon;
            return (
              <Link
                key={ind.title}
                href={ind.link}
                className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-orange-500 hover:shadow-md transition-all flex flex-col justify-between text-left"
              >
                <div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border ${ind.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                    {ind.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-normal">
                    {ind.desc}
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-black text-orange-600 group-hover:translate-x-1 transition-transform">
                  <span>View Industry Workflow</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 8. COMPARISON MATRIX: OFFLINE DESKTOP VS UDYOGBILL CLOUD ───────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 text-center shadow-2xs">
          <div className="max-w-2xl mx-auto mb-6">
            <span className="text-[11px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
              Why Switch to Modern Cloud?
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight mt-2">
              Legacy Desktop Software vs UdyogBill Cloud
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white rounded-xl border border-slate-200 overflow-hidden text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-xs font-black text-slate-900 uppercase">
                  <th className="p-3 sm:p-4">Key Operational Capability</th>
                  <th className="p-3 sm:p-4 text-rose-800 bg-rose-50/50">Old Desktop Software (Offline Marg / Busy)</th>
                  <th className="p-3 sm:p-4 text-orange-800 bg-orange-50/60 font-black">UdyogBill Modern Cloud</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 sm:p-4 font-bold text-slate-900">Anywhere Access</td>
                  <td className="p-3 sm:p-4 text-slate-600 bg-rose-50/20">
                    <div className="flex items-center gap-1.5 font-medium">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      Locked to 1 single shop computer only
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 text-slate-900 font-bold bg-orange-50/30">
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      Access on Phone, Tablet &amp; Laptop from anywhere
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="p-3 sm:p-4 font-bold text-slate-900">Data Safety &amp; Backup</td>
                  <td className="p-3 sm:p-4 text-slate-600 bg-rose-50/20">
                    <div className="flex items-center gap-1.5 font-medium">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      Risk of total data loss if hard drive crashes
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 text-slate-900 font-bold bg-orange-50/30">
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      Continuous bank-grade cloud automated backup
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="p-3 sm:p-4 font-bold text-slate-900">Multi-Branch Sync</td>
                  <td className="p-3 sm:p-4 text-slate-600 bg-rose-50/20">
                    <div className="flex items-center gap-1.5 font-medium">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      Manual pen drive file sharing &amp; email export
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 text-slate-900 font-bold bg-orange-50/30">
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      Real-time live multi-branch and godown sync
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="p-3 sm:p-4 font-bold text-slate-900">WhatsApp Invoicing &amp; UPI</td>
                  <td className="p-3 sm:p-4 text-slate-600 bg-rose-50/20">
                    <div className="flex items-center gap-1.5 font-medium">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      Requires expensive third-party paid add-ons
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 text-slate-900 font-bold bg-orange-50/30">
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      Built-in 1-click WhatsApp PDF with UPI QR code
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="p-3 sm:p-4 font-bold text-slate-900">Govt E-Way &amp; E-Invoicing</td>
                  <td className="p-3 sm:p-4 text-slate-600 bg-rose-50/20">
                    <div className="flex items-center gap-1.5 font-medium">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      Cumbersome JSON download and portal upload
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 text-slate-900 font-bold bg-orange-50/30">
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      Direct 1-click generation via official NIC API
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="p-3 sm:p-4 font-bold text-slate-900">Software Updates</td>
                  <td className="p-3 sm:p-4 text-slate-600 bg-rose-50/20">
                    <div className="flex items-center gap-1.5 font-medium">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      High annual maintenance fees &amp; manual technician visits
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 text-slate-900 font-bold bg-orange-50/30">
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      Automatic zero-downtime free cloud updates
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 9. REAL CUSTOMER STORIES (COMPACT) ───────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-6">
          <span className="text-[11px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
            Real Proof from Real Vyaparis
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight mt-2">
            Trusted by Thousands of Indian Shopkeepers &amp; Distributors
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium italic">
                &ldquo;Earlier, sending payment reminders to 300+ wholesale parties took my entire Saturday. With UdyogBill&apos;s automated WhatsApp reminder feature, our payment recovery cycle improved from 45 days down to 18 days.&rdquo;
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center">
                RG
              </div>
              <div>
                <div className="text-xs font-black text-slate-900">Rajesh Gupta</div>
                <div className="text-[10px] text-slate-500 font-medium">Gupta FMCG &amp; Provisions, Kanpur</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium italic">
                &ldquo;Managing medicine expiry dates was our biggest headache. UdyogBill alerts us 90 days before batch expiry so we can claim credit notes from distributors on time. It saved us over ₹2 Lakhs in dumping losses this year.&rdquo;
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                VS
              </div>
              <div>
                <div className="text-xs font-black text-slate-900">Dr. Vikram Sharma</div>
                <div className="text-[10px] text-slate-500 font-medium">Sharma Medicos &amp; Chemists, Lucknow</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium italic">
                &ldquo;We have 3 garment retail outlets in Surat. I can check live sales and stock transfers on my mobile from anywhere. The barcode thermal POS scanner is extremely fast even on festival rush days.&rdquo;
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                AP
              </div>
              <div>
                <div className="text-xs font-black text-slate-900">Amit Patel</div>
                <div className="text-[10px] text-slate-500 font-medium">Kalamandir Fashion Retail, Surat</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. FAST LEAD CAPTURE FORM (COMPACT) ─────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-2xl p-6 sm:p-10 text-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 space-y-3 text-left">
              <span className="inline-flex items-center gap-1.5 bg-white/20 text-white px-3 py-0.5 rounded-full text-xs font-bold">
                ⚡ 15-Minute Free Consultation
              </span>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
                Ready to Upgrade Your Billing &amp; Stock System?
              </h2>
              <p className="text-orange-50 text-xs sm:text-sm leading-relaxed font-normal">
                Enter your details to get a personalized live product walkthrough, free data migration assistance from your existing software, and a special onboarding discount.
              </p>
              <div className="space-y-1.5 text-xs font-bold text-orange-100 pt-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Free data import from Vyapar, Marg, Busy, Tally, or Excel</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Custom invoice print design matching your exact shop branding</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Dedicated phone &amp; WhatsApp onboarding relationship manager</span>
                </div>
              </div>
            </div>

            {/* Form Box */}
            <div className="lg:col-span-6">
              <form
                onSubmit={handleLeadSubmit}
                className="bg-white rounded-xl p-5 sm:p-6 text-slate-900 shadow-xl space-y-3 text-left"
              >
                <h3 className="text-base font-black text-slate-950">
                  Request a Free 1-on-1 Guided Demo
                </h3>

                {leadStatus.msg && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-bold ${
                      leadStatus.success
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                        : "bg-rose-50 text-rose-800 border border-rose-300"
                    }`}
                  >
                    {leadStatus.msg}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Agrawal"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none text-xs text-slate-900 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">+91</span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="98765 43210"
                        value={leadForm.mobile}
                        onChange={(e) => setLeadForm({ ...leadForm, mobile: e.target.value.replace(/\D/g, "") })}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none text-xs text-slate-900 font-mono font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      City / Trading Hub
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kanpur, Surat"
                      value={leadForm.city}
                      onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none text-xs text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Business Category
                  </label>
                  <select
                    value={leadForm.businessType}
                    onChange={(e) => setLeadForm({ ...leadForm, businessType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none text-xs text-slate-900 font-medium bg-white"
                  >
                    <option value="Retail Store / Supermarket">Retail Store / Supermarket</option>
                    <option value="Wholesale & Distribution">Wholesale &amp; Distribution</option>
                    <option value="Pharma & Chemist">Pharma &amp; Healthcare Chemist</option>
                    <option value="FMCG & Provisions">FMCG &amp; Food Distribution</option>
                    <option value="Garments & Apparel">Garments &amp; Footwear</option>
                    <option value="Electronics & Hardware">Electronics &amp; Hardware</option>
                    <option value="Other Trading Enterprise">Other Trading Enterprise</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={leadStatus.submitting}
                  className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {leadStatus.submitting ? (
                    <span>Submitting Request...</span>
                  ) : (
                    <>
                      <span>Book Free Product Demo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. FAQ ACCORDION (COMPACT) ──────────────────────────────────── */}
      <section className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-6">
          <span className="text-[11px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
            Got Questions?
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight mt-2">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all text-left shadow-2xs"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left font-black text-xs sm:text-sm text-slate-900 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-orange-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-3.5 pt-1 text-xs text-slate-700 leading-relaxed border-t border-slate-100 bg-slate-50/50 font-medium">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 12. BOTTOM CONVERSION BANNER (COMPACT) ────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pb-4">
        <div className="bg-gradient-to-r from-orange-50 via-white to-amber-50 border border-orange-300 rounded-2xl p-6 sm:p-8 text-center shadow-xs space-y-4">
          <span className="text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
            🚀 14-Day Free Trial • Instant Setup
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight max-w-2xl mx-auto">
            Take Your Business to the Cloud Today with UdyogBill
          </h2>
          <p className="text-slate-700 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed font-medium">
            Join over 10,000 Indian retailers, distributors, and chemists managing daily billing, inventory, and GST returns effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="tel:+919473807622"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-xs border border-slate-300 hover:border-orange-500 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Phone className="w-4 h-4 text-orange-600" />
              <span>Call Sales: +91 94738 07622</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
