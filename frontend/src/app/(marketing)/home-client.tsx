"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Download,
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

export default function HomeClient() {
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

      const res = await fetch("/api/backend/public/leads", {
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
        }),
      });
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
      image: "/img/hero-retail-store.jpg",
      imageAlt: "UdyogBill 5-Second GST Invoicing and POS Counter Billing Software with Barcode Scanning and Dynamic UPI QR Code",
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
      image: "/img/real-wholesale-fmcg-godown.jpg",
      imageAlt: "UdyogBill Real Wholesale Godown Inventory Tracking and Dispatch Slip System",
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
      image: "/img/real-whatsapp-ledger-recovery.jpg",
      imageAlt: "UdyogBill Automated WhatsApp Payment Reminders and Instant 0% MDR UPI Khata Collection",
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
      tagColor: "bg-orange-100 text-orange-800 border-orange-200"
    },
    {
      id: "compliance",
      label: "E-Way & E-Invoice",
      icon: Zap,
      image: "/img/real-ca-accountant-office.jpg",
      imageAlt: "Direct Govt NIC Portal E-Way Bill and B2B E-Invoicing with Signed IRN QR Code",
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
      image: "/img/real-tally-marg-migration.jpg",
      imageAlt: "UdyogBill Seamless Data Migration and Bank Grade Security for Indian Merchants",
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
      image: "/img/real-pharma-chemist-store.jpg",
      imageAlt: "Indian Pharmacy and Chemist Medical Billing Store with Batch FEFO Expiry and Drug License",
      badge: "Form 20B/21B & H1",
      color: "text-rose-600 bg-rose-50 border-rose-200",
      desc: "Form 20B/21B drug license printing, Schedule H1 registers, batch expiry claims, and salt search."
    },
    {
      title: "FMCG & Distribution",
      icon: Truck,
      link: "/industries/fmcg",
      image: "/img/real-wholesale-fmcg-godown.jpg",
      imageAlt: "Indian FMCG Wholesale and Distribution Warehouse Billing Software with Multi-Packaging and Beat Route",
      badge: "Beat & Broker Routes",
      color: "text-amber-600 bg-amber-50 border-amber-200",
      desc: "Beat route ordering, broker commission tracking, scheme discounts, and bulk quantity pricing."
    },
    {
      title: "Retail Stores & Supermarkets",
      icon: Store,
      link: "/industries/retail",
      image: "/img/real-kirana-male-counter.jpg",
      imageAlt: "Retail Supermarket Fast POS Billing Software with Loyalty Points and Instant Thermal Receipt Printing",
      badge: "Rapid POS & Loyalty",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      desc: "High-speed thermal counter billing, barcode scanning, loyalty rewards, and customer ledger."
    },
    {
      title: "Wholesale & Stockists",
      icon: Package,
      link: "/industries/wholesale",
      image: "/img/real-wholesale-fmcg-godown.jpg",
      imageAlt: "Wholesale Stockist Billing and Multi-Godown Transfer Management Software",
      badge: "Multi-Godown & Box Units",
      color: "text-orange-600 bg-orange-50 border-orange-200",
      desc: "Customer credit limit enforcement, carton/box packaging units, and multi-godown stock transfers."
    },
    {
      title: "Garments & Footwear",
      icon: Layers,
      link: "/industries/garments",
      image: "/img/real-garments-clothing-shop.jpg",
      imageAlt: "Indian Garments and Apparel Retail Showroom Billing Software with Size x Color Matrix and Barcode Hangtags",
      badge: "Size & Color Matrix",
      color: "text-purple-600 bg-purple-50 border-purple-200",
      desc: "Matrix tracking by size, color, brand, and design variant with custom barcode sticker printing."
    },
    {
      title: "Electronics & Hardware",
      icon: Smartphone,
      link: "/industries/electronics",
      image: "/img/real-electronics-hardware-store.jpg",
      imageAlt: "Indian Electronics and Hardware Store Billing Software with Serial and IMEI Number Tracking",
      badge: "Serial & IMEI Tracking",
      color: "text-orange-600 bg-orange-50 border-orange-200",
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

  
  const softwareSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "UdyogBill",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, Windows, Android, macOS, Linux",
        "description": "Enterprise cloud GST billing, inventory management, and POS software for Indian retail stores, chemists, distributors, and wholesalers.",
        "image": [
          "https://udyogbill.com/img/hero-retail-store.jpg",
          "https://udyogbill.com/img/banners/banner-hero-pos-billing.svg",
          "https://udyogbill.com/img/banners/banner-tally-marg-migration.svg",
          "https://udyogbill.com/img/banners/banner-nic-eway-einvoice.svg",
          "https://udyogbill.com/img/banners/banner-stock-multi-godown.svg",
          "https://udyogbill.com/img/banners/banner-whatsapp-ledger-payment.svg",
          "https://udyogbill.com/img/banners/banner-pharma-fefo-chemist.svg",
          "https://udyogbill.com/img/banners/banner-fmcg-kirana-pos.svg",
          "https://udyogbill.com/img/banners/banner-garments-apparel-matrix.svg",
          "https://udyogbill.com/img/banners/banner-ca-accountant-audit.svg",
          "https://udyogbill.com/img/banners/banner-festive-growth-trial.svg"
        ],
        "keywords": "GST Billing Software, Cloud POS Billing, Thermal Receipt Printing, Direct NIC E-Way Bill, B2B E-Invoice IRN, Pharma Expiry FEFO Chemist Software, Tally Marg Busy Migration, WhatsApp Khata Ledger",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "INR",
          "description": "14-Day Full Access Free Trial (No Credit Card Required)"
        },
        "featureList": [
          "100% CBIC Compliant GST Invoicing",
          "Direct NIC Govt E-Invoice & E-Way Bill Integration",
          "Thermal POS 2-inch and 3-inch ESC/POS Receipt Printing",
          "Pharma FEFO Batch & Expiry Management",
          "Multi-Warehouse Godown Inventory Tracking",
          "Automated WhatsApp Invoicing & UPI Payment Links",
          "1-Click CA Audit Packs (GSTR-1, GSTR-3B & Excel Export)",
          "1-Click Zero Data Loss Migration from Tally, Marg, Busy, and Vyapar"
        ]
      },
      {
        "@type": "Organization",
        "name": "UdyogBill",
        "legalName": "DigiOpera Private Limited",
        "url": "https://udyogbill.com",
        "logo": "https://udyogbill.com/logo.png",
        "areaServed": [
          "Kanpur",
          "Surat",
          "Delhi NCR",
          "Ahmedabad",
          "Mumbai",
          "Lucknow",
          "Jaipur",
          "Indore",
          "Pune",
          "Patna",
          "India"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+91-9473807622",
          "contactType": "Customer Support & Sales",
          "areaServed": "IN",
          "availableLanguage": ["English", "Hindi"]
        }
      }
    ]
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      {/* ── 1. HERO SECTION: FULL-WIDTH EXPANSIVE EDGE-TO-EDGE ARCHITECTURE ── */}
      <section className="relative overflow-hidden w-full bg-gradient-to-r from-orange-50/90 via-white to-amber-50/40 border-b border-orange-200/60 pt-4 sm:pt-6 pb-10 lg:pb-14">
        {/* Real High-Definition Retail Supermarket Store Photography on Right Side */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-7/12 pointer-events-none select-none overflow-hidden">
          <Image
            src="/img/hero-retail-store.jpg"
            alt="Modern Indian Supermarket and Retail Store with Barcode POS Billing Counter, Neatly Stacked FMCG Shelves, and Thermal Receipt Machine"
            title="UdyogBill GST Billing Software for Modern Indian Retailers, Wholesalers, and Distributors"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover object-center lg:object-right"
          />
          {/* Senior Photoshop Directional Feather Gradient Overlay (Left to Right) */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-transparent w-full lg:w-3/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/50 to-transparent lg:hidden" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/30 pointer-events-none" />
        </div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
          {/* Subtle Floating Real-Time Sales Pill (Placed cleanly on upper right of store image) */}
          <div className="absolute top-2 right-4 sm:right-6 lg:right-10 hidden xl:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-emerald-300 shadow-xl shadow-emerald-500/10 z-20">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
              ₹
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Store Counter
              </div>
              <div className="text-sm font-black text-slate-900 leading-tight">
                ₹1,48,920 <span className="text-emerald-600 text-xs font-bold">(+18.4%)</span>
              </div>
            </div>
          </div>

          {/* Left Content Column (High-Contrast, Clean, Highly Legible on White Gradient) */}
          <div className="relative z-10 w-full lg:w-3/5 py-4 sm:py-6 lg:py-8 text-left space-y-4 sm:space-y-5">
            {/* Dual Verification Pill: National Compliance + Verified Merchant Trust */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-600 text-white text-xs font-black shadow-sm shadow-orange-600/30">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>🇮🇳 Bharat Ka #1 GST &amp; POS Billing Software</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-slate-200/90 shadow-2xs text-xs font-bold text-slate-800">
                <div className="flex text-amber-500 text-[11px] gap-0.5">★★★★★</div>
                <span className="font-black text-slate-950">4.9/5</span>
                <span className="text-slate-500 text-[11px]">(12,500+ Dukaandar &amp; Vyapari)</span>
              </div>
            </div>

            {/* Bold, Clear, Emotionally Resonant Headline */}
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-black text-slate-950 tracking-tight leading-[1.12]">
                Dukaan Ka Har Hisaab{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">
                  Ab 5 Second Me
                </span>
              </h1>
              <p className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800">
                Fast Counter Billing, Real-Time Stock &amp; 1-Click WhatsApp Khata
              </p>
            </div>

            {/* Concise, Relatable Subtext */}
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium max-w-xl">
              Kirana Supermarket, Medical Chemist, Garments Showroom ya Wholesale Godown — counter par continuous barcode scan karein, WhatsApp par 1-click UPI payment link bhejein aur CA ke liye GSTR-1 Excel export karein. Works 100% offline &amp; online!
            </p>

            {/* Instant Business Personalization Strip: "Aapka Kaunsa Vyapar Hai?" */}
            <div className="pt-1">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-orange-600" />
                <span>Aapka Kaunsa Vyapar Hai? (Click for tailored counter setup):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: "Kirana & Supermarket", tag: "Continuous Barcode", href: "/industries/retail" },
                  { name: "Medical & Chemist", tag: "Batch & FEFO Expiry", href: "/industries/pharma" },
                  { name: "Garments & Style", tag: "Size Matrix & Hangtags", href: "/industries/garments" },
                  { name: "Wholesale & FMCG", tag: "Party Rates & E-Way", href: "/industries/wholesale" },
                  { name: "Mobile & Electronics", tag: "Serial / IMEI Track", href: "/industries/electronics" },
                  { name: "Hardware & Paints", tag: "Units & Multi-Godown", href: "/features" },
                ].map((trade, i) => (
                  <Link
                    key={i}
                    href={trade.href}
                    className="px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-orange-50 border border-slate-200/90 hover:border-orange-500 shadow-2xs transition-all text-left group block"
                  >
                    <div className="text-xs font-black text-slate-900 group-hover:text-orange-600 truncate">
                      {trade.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold truncate">
                      {trade.tag}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* High-Affordance Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                href="/register"
                className="px-7 py-4 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-base shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group cursor-pointer text-center"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <a
                href="/downloads/udyogbill-billing.apk"
                download="UdyogBill-Billing.apk"
                className="px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-base shadow-md shadow-slate-900/20 hover:shadow-slate-900/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group cursor-pointer text-center"
                title="Download UdyogBill Store POS & GST Billing Android App"
              >
                <Download className="w-4 h-4 text-orange-400 group-hover:translate-y-0.5 transition-transform" />
                <span>Download Android App</span>
              </a>

              <Link
                href="/contact"
                className="px-5 py-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm border-2 border-slate-200 hover:border-orange-500 transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer text-center"
              >
                <Headphones className="w-4 h-4 text-orange-600" />
                <span>Book Demo</span>
              </Link>
            </div>

            {/* Trust Checkmarks Strip */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-700 font-semibold pt-1">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Takes 60 seconds • No credit card
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Free AnyDesk data migration from Marg/Tally/Busy
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Works 100% offline
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 CORE INDUSTRY CARDS (WITH REAL DISTINCT COMMERCIAL PHOTOGRAPHY EMBEDDED) ── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {/* Card 1: Retailers & Kirana (Uses real-kirana-male-counter.jpg - Distinct!) */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-orange-500 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between overflow-hidden group">
              <div className="relative h-44 w-full overflow-hidden">
                <Image
                  src="/img/real-kirana-male-counter.jpg"
                  alt="Real Indian Kirana Store Checkout Counter with Friendly Male Shopkeeper, Electronic Weighing Scale and Barcode Scanner"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                  <span className="text-base font-black">Retailers &amp; Kirana</span>
                  <span className="text-[11px] font-bold bg-orange-600 px-2.5 py-0.5 rounded-full shadow-xs">&lt; 5s POS</span>
                </div>
              </div>
              <div className="p-5 flex flex-col justify-between flex-1">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Manage rush hour counter sales with continuous barcode scanning, 2&quot;/3&quot; thermal receipt printing, weighing scale sync, and dynamic UPI QR codes.
                </p>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Supermarket • Kirana • FMCG</span>
                  <Link href="/industries/retail" className="text-xs font-black text-orange-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Explore Retail POS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 2: Wholesalers & Distributors (Featured Centerpiece) */}
            <div className="bg-white rounded-2xl border-2 border-orange-400 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between overflow-hidden group relative">
              <div className="relative h-44 w-full overflow-hidden">
                <Image
                  src="/img/real-wholesale-fmcg-godown.jpg"
                  alt="Real Indian Wholesale FMCG Godown and Distribution Warehouse with Inventory Racks and Delivery Truck"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute top-3 right-3 bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                  Most Popular
                </div>
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                  <span className="text-base font-black">Wholesalers &amp; Distributors</span>
                  <span className="text-[11px] font-bold bg-emerald-600 px-2.5 py-0.5 rounded-full shadow-xs">E-Way &amp; IRN</span>
                </div>
              </div>
              <div className="p-5 flex flex-col justify-between flex-1">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Bulk order management, party-wise custom price lists, direct Govt NIC E-Way bills &amp; IRN e-invoicing, and automated WhatsApp payment collection.
                </p>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">FMCG • Hardware • Electronics</span>
                  <Link href="/industries/wholesale" className="text-xs font-black text-orange-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Start Free Trial</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 3: Pharma & Medical Store */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-orange-500 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between overflow-hidden group">
              <div className="relative h-44 w-full overflow-hidden">
                <Image
                  src="/img/real-pharma-chemist-store.jpg"
                  alt="Real Indian Medical Pharmacy Chemist Store with Batch FEFO Expiry and Drug License"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                  <span className="text-base font-black">Medical &amp; Chemist Stores</span>
                  <span className="text-[11px] font-bold bg-blue-600 px-2.5 py-0.5 rounded-full shadow-xs">Batch &amp; FEFO</span>
                </div>
              </div>
              <div className="p-5 flex flex-col justify-between flex-1">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Drug license printing (Form 20B/21B), Schedule H1 registers, batch-wise FEFO expiry tracking, and 1-click GSTR-1 Excel audit exports.
                </p>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Pharma • Cosmetics • Wellness</span>
                  <Link href="/industries/pharma" className="text-xs font-black text-orange-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Explore Pharma POS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
      </section>

      {/* ── 2. METRICS & AUTHORITY BAR (TIGHT FLOW - NO AWKWARD VOIDS) ───────── */}
      <section className="border-y border-slate-200/90 bg-slate-50/70 py-6 relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 text-center">
            {/* Metric 1 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-orange-400 hover:shadow-md transition-all duration-200">
              <div className="text-2xl sm:text-4xl font-black text-orange-600">&lt; 5 Sec</div>
              <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">Counter Billing Speed</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Continuous Barcode POS</div>
            </div>

            {/* Metric 2 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all duration-200">
              <div className="text-2xl sm:text-4xl font-black text-emerald-600">100%</div>
              <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">CBIC GST Compliant</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Automated Tax &amp; E-Invoice</div>
            </div>

            {/* Metric 3: GEO / Regional */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-orange-400 hover:shadow-md transition-all duration-200">
              <div className="text-2xl sm:text-4xl font-black text-slate-950">48+ Cities</div>
              <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">Across 28 Indian States</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Kanpur, Surat, Delhi &amp; Pan-India</div>
            </div>

            {/* Metric 4 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all duration-200">
              <div className="text-2xl sm:text-4xl font-black text-emerald-600">99.9%</div>
              <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">Cloud &amp; Offline Uptime</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Never Stops Without Internet</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. 4-STEP AUTOMATION WORKFLOW (ZINDA & VISUAL) ───────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-7">
          <span className="text-[11px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-orange-100 text-orange-900 border border-orange-300 shadow-2xs">
            ⚡ 5-Second Automated Flow
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight mt-2.5">
            How UdyogBill Automates Your Counter Rush in 4 Steps
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
            From first barcode scan to bank settlement — see how fast your dukaan runs
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
          {/* Step 1 */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 hover:border-orange-500 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-black text-base flex items-center justify-center shadow-sm shadow-orange-600/30 group-hover:scale-105 transition-transform">
                  1
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                  ⚡ 0.8s Scan
                </span>
              </div>
              <h3 className="text-base font-black text-slate-950 group-hover:text-orange-600 transition-colors">
                Continuous Barcode Scan
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                Scan barcode or type name. Price, batch expiry, GST tax slab &amp; godown stock populate instantly.
              </p>
            </div>
            {/* Live Micro-Visual Chip */}
            <div className="mt-4 p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/80 font-mono text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span className="truncate">Basmati Rice 5kg</span>
                <span className="text-orange-600 font-black">₹480</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                <span>✓ Batch: B-402 • Stock: 42</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 hover:border-orange-500 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white font-black text-base flex items-center justify-center shadow-sm shadow-amber-600/30 group-hover:scale-105 transition-transform">
                  2
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  🖨️ 2&quot; &amp; 3&quot; Roll
                </span>
              </div>
              <h3 className="text-base font-black text-slate-950 group-hover:text-orange-600 transition-colors">
                5-Second Thermal Print
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                Hit Enter or F2 to print on 2&quot;/3&quot; thermal roll or A4 laser sheet with your logo and dynamic UPI QR code.
              </p>
            </div>
            {/* Live Micro-Visual Chip */}
            <div className="mt-4 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 font-mono text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span>Thermal ESC/POS</span>
                <span className="text-amber-700 font-black">Ready</span>
              </div>
              <div className="text-[10px] text-slate-600 font-semibold flex items-center gap-1">
                <span>📲 Dynamic UPI QR Embedded</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 hover:border-orange-500 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-sm shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                  3
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  📲 Delivered ✓✓
                </span>
              </div>
              <h3 className="text-base font-black text-slate-950 group-hover:text-orange-600 transition-colors">
                WhatsApp 1-Click Pay Link
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                Bill PDF sends directly to customer&apos;s WhatsApp with 1-click payment link via PhonePe, GPay, or Paytm.
              </p>
            </div>
            {/* Live Micro-Visual Chip */}
            <div className="mt-4 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 font-mono text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span>WhatsApp Pay</span>
                <span className="text-emerald-700 font-black">0% MDR</span>
              </div>
              <div className="text-[10px] text-emerald-800 font-semibold flex items-center gap-1">
                <span>✓ ₹4,250 Auto-Settled in Bank</span>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 hover:border-orange-500 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-base flex items-center justify-center shadow-sm shadow-blue-600/30 group-hover:scale-105 transition-transform">
                  4
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  🏛️ Govt Portal
                </span>
              </div>
              <h3 className="text-base font-black text-slate-950 group-hover:text-orange-600 transition-colors">
                Auto GSTR-1 &amp; E-Way Clear
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                Every invoice automatically updates stock ledger, generates NIC portal IRN, and prepares GSTR-1 for your CA.
              </p>
            </div>
            {/* Live Micro-Visual Chip */}
            <div className="mt-4 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 font-mono text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span>Govt NIC IRN</span>
                <span className="text-blue-700 font-black">Clear ✓</span>
              </div>
              <div className="text-[10px] text-blue-800 font-semibold flex items-center gap-1">
                <span>✓ 1-Click Excel Export for CA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3B. 1-CLICK TALLY & MARG MIGRATION TRUST SHOWCASE (HIGH CONTRAST & 100% VISIBLE) ── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-50/90 via-white to-orange-50/80 border-2 border-amber-300 shadow-xl p-6 sm:p-8 lg:p-10 text-slate-900">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Real Photograph with Data Migration Green Screen */}
            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border-2 border-amber-200 shadow-xl group">
              <div className="relative h-64 sm:h-80 w-full">
                <Image
                  src="/img/real-tally-marg-migration.jpg"
                  alt="Indian Business Owner Relieved After Successful 15-Minute Zero Data Loss Migration from Tally and Marg ERP"
                  title="Zero Data Loss Migration from Tally, Marg, Busy, and Vyapar to UdyogBill"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>100% Data Imported Safely</span>
              </div>
            </div>

            {/* Content & Migration Trust Bullets (100% Crisp Visibility on Light Theme!) */}
            <div className="lg:col-span-6 text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 border border-orange-300 text-orange-900 text-xs font-black shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-orange-600" />
                <span>15-Minute Zero Data Loss Migration Guarantee</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight leading-tight">
                Switching from Tally, Marg, Busy ya Vyapar?{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">
                  Ek Bhi Bill Ka Data Loss Nahi Hoga!
                </span>
              </h2>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
                Our dedicated support engineers connect securely via AnyDesk to import your complete item master, HSN codes, opening stock, and party ledgers in under 15 minutes.
              </p>
              <div className="space-y-2.5 pt-1 text-xs sm:text-sm text-slate-900 font-bold">
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Items, Batches &amp; Multi-Godown Stock matched 100%</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Customer &amp; Supplier Outstanding Khata transferred down to the paisa</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Free AnyDesk Migration Service — Zero technical fee charged</span>
                </div>
              </div>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/contact"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Book Free AnyDesk Migration Call</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="tel:+919473807622"
                  className="px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm border-2 border-slate-200 hover:border-orange-500 transition-all flex items-center gap-2 shadow-2xs"
                >
                  <Phone className="w-4 h-4 text-orange-600" />
                  <span>Call: +91-94738 07622</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. REAL INVOICE FORMAT GALLERY (INTERACTIVE & ZERO DEAD SPACE) ── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="bg-gradient-to-br from-slate-50 via-orange-50/20 to-white rounded-3xl border border-slate-200 p-5 sm:p-8">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-[11px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
              Print Customization
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight mt-2">
              Choose from 8+ High-Definition GST Invoices &amp; Thermal Print Formats
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
              Every format is 100% CBIC Rule 46 compliant and customizes with your logo, UPI QR, and terms
            </p>
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

          {/* Invoice Preview Card - Packed with Interactive Tools (No Empty Space!) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start shadow-xs">
            <div className="lg:col-span-5 text-left space-y-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold border border-orange-300">
                ⭐ {invoiceFormats[selectedInvoice].tag}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-950">
                {invoiceFormats[selectedInvoice].title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                {invoiceFormats[selectedInvoice].desc}
              </p>

              {/* Legal CBIC Rule 46 Specifications */}
              <div className="space-y-2 pt-1 text-xs font-bold text-slate-800">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Customizable company logo, header, footer &amp; terms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Dynamic UPI payment QR code on print for instant scan &amp; pay</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Item-wise discount, HSN/SAC 8-digit breakdown &amp; GST tax slabs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Bank details, IFSC code &amp; digital signature placeholder</span>
                </div>
              </div>

              {/* Printer Hardware Compatibility Badges (Fills the space meaningfully!) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[11px] font-black uppercase text-slate-600">
                  Supported Printers &amp; Hardware:
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-orange-600" />
                    <span>A4 / A5 Laser &amp; Inkjet</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-orange-600" />
                    <span>3-Inch (80mm) Thermal POS</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-orange-600" />
                    <span>2-Inch (58mm) Bluetooth</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-orange-600" />
                    <span>Android Mobile Direct Print</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2.5">
                <Link
                  href={selectedInvoice === 0 ? "/tools/gst-invoice-generator" : "/register"}
                  className="inline-block px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 transition-all"
                >
                  {selectedInvoice === 0 ? "Generate Free GST Invoice Now →" : "Try This Template Free →"}
                </Link>
                <Link
                  href="/register"
                  className="inline-block px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-all"
                >
                  Download Sample PDF
                </Link>
              </div>
            </div>

            {/* Template Visual Preview Box */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-50/70 rounded-2xl p-4 sm:p-6 border border-slate-200">
              <div className={`w-full transition-all duration-300 ${selectedInvoice === 1 ? "max-w-[280px]" : "max-w-[360px] sm:max-w-[440px]"} bg-white rounded-xl shadow-xl border border-slate-200 p-2 sm:p-3`}>
                <img
                  src={invoiceFormats[selectedInvoice].file}
                  alt={`${invoiceFormats[selectedInvoice].title} Sample Format`}
                  className="w-full h-auto rounded transition-transform duration-200 hover:scale-[1.02]"
                  loading="lazy"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-semibold mt-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Real 100% CBIC Rule 46 Compliant Format Generated by UdyogBill</span>
              </p>
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
            Fast Counter Billing, E-Way Bill &amp; Dynamic QR Code POS
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

            {/* Contextual Graphic Banner */}
            <div className="lg:col-span-5">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950">
                <img
                  src={featureTabs[activeTab].image}
                  alt={featureTabs[activeTab].imageAlt || featureTabs[activeTab].label}
                  title={featureTabs[activeTab].label}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-4 pointer-events-none">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((ind) => {
            const Icon = ind.icon;
            return (
              <Link
                key={ind.title}
                href={ind.link}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-orange-500 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden text-left"
              >
                <div>
                  {/* Engaging Industry Image Header with Overlay & Badge */}
                  <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-100">
                    <img
                      src={ind.image}
                      alt={ind.imageAlt || ind.title}
                      title={ind.title}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                    
                    {/* Floating Trade Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-black text-slate-900 shadow-sm border border-white/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        {ind.badge}
                      </span>
                    </div>

                    {/* Floating Icon Badge */}
                    <div className="absolute bottom-3 right-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md bg-white border ${ind.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Card Text Content */}
                  <div className="p-5">
                    <h3 className="text-base sm:text-lg font-black text-slate-950 group-hover:text-orange-600 transition-colors">
                      {ind.title}
                    </h3>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed font-normal">
                      {ind.desc}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-1">
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-orange-600 group-hover:text-orange-700 transition-colors">
                    <span>View Industry Workflow</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                  </div>
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

      {/* ── 8B. CA & TAX CONSULTANT AUDIT EXCELLENCE ────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="bg-gradient-to-br from-white via-orange-50/70 to-amber-50/40 rounded-3xl p-6 sm:p-10 shadow-lg border-2 border-orange-200/90 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl mb-8 relative z-10 text-left">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-100 text-orange-900 text-xs font-bold border border-orange-300 shadow-2xs mb-3">
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <span>Chartered Accountant &amp; Tax Practitioner Friendly</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-950">
              Built for Indian Merchants,{" "}
              <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Loved by Accountants
              </span>
            </h2>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-medium">
              Never waste hours formatting spreadsheets at month-end. UdyogBill delivers 100% CBIC-compliant GST reports, automated tax calculations, and 1-click audit exports.
            </p>
          </div>

          {/* Real Commercial Photograph: CA Command Center (Uncropped, Top-Anchored) */}
          <div className="mb-8 rounded-2xl overflow-hidden border-2 border-orange-200/90 shadow-md relative z-10 bg-slate-900 group">
            <div className="relative h-72 sm:h-[400px] md:h-[460px] lg:h-[520px] w-full">
              <Image
                src="/img/real-ca-accountant-office.jpg"
                alt="Professional Indian Chartered Accountant in Modern Office with GST Audit Files and Financial Reporting Laptop"
                title="CA Audit Command Center & GST Reconciliation by UdyogBill"
                fill
                priority
                className="object-cover object-top sm:object-[center_10%] group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-center justify-between text-white">
                <div>
                  <div className="text-lg font-black">100% Tax Audit Reconciliation Match</div>
                  <div className="text-xs text-slate-300">Section 15(3) CGST Act Compliant • Direct GSTR-1, GSTR-3B &amp; Tally XML</div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified by Indian CAs</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 text-left">
            <div className="bg-white border-2 border-orange-200/80 p-5 rounded-2xl shadow-sm hover:border-orange-400 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-lg mb-3">
                📊
              </div>
              <h3 className="text-sm font-black text-slate-950">1-Click CA Audit Packs</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                Export GSTR-1, GSTR-3B, Sales &amp; Purchase Registers in standardized Excel ready for direct filing.
              </p>
            </div>

            <div className="bg-white border-2 border-emerald-200/80 p-5 rounded-2xl shadow-sm hover:border-emerald-400 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-lg mb-3">
                🔄
              </div>
              <h3 className="text-sm font-black text-slate-950">Tally &amp; Excel Compatible</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                Seamless opening stock, ledger vouchers, and customer balances export with zero column breaks.
              </p>
            </div>

            <div className="bg-white border-2 border-amber-200/80 p-5 rounded-2xl shadow-sm hover:border-amber-400 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black text-lg mb-3">
                ⚖️
              </div>
              <h3 className="text-sm font-black text-slate-950">100% Calculation Match</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                Strict compliance with Section 15(3) CGST Act for pre/post invoice schemes, multi-slab tax &amp; cess.
              </p>
            </div>

            <div className="bg-white border-2 border-sky-200/80 p-5 rounded-2xl shadow-sm hover:border-sky-400 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-black text-lg mb-3">
                🏛️
              </div>
              <h3 className="text-sm font-black text-slate-950">Direct NIC Portal Ready</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                Instant B2B E-Invoicing with QR codes and E-Way bills directly from the software with zero middleman API fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8C. AUTOMATED WHATSAPP PAYMENT RECOVERY & 0% MDR SMART KHATA ── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 spotlight-card">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 shadow-2xl p-6 sm:p-8 lg:p-12 border-2 border-emerald-500/50">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Real Commercial Photograph: Indian Merchant WhatsApp & UPI Collection */}
            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border-2 border-emerald-400/50 shadow-2xl group bg-slate-900">
              <div className="relative h-72 sm:h-96 md:h-[420px] w-full">
                <Image
                  src="/img/real-whatsapp-ledger-recovery.jpg"
                  alt="Smiling Indian Shopkeeper Receiving Instant WhatsApp UPI Payment Notification on Smartphone at Retail Counter"
                  title="Automated WhatsApp Payment Recovery and 0% MDR Smart Ledger by UdyogBill"
                  fill
                  priority
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />
              </div>
              <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-emerald-300/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                <span className="text-white font-black" style={{ color: '#ffffff' }}>Instant 0% MDR Settlement</span>
              </div>
              <div className="absolute bottom-3 left-4 right-4 text-left pointer-events-none">
                <div className="bg-slate-950/90 backdrop-blur-md border border-emerald-500/50 p-3 rounded-xl shadow-xl">
                  <div className="text-sm sm:text-base font-black flex items-center gap-1.5 text-emerald-300" style={{ color: '#6ee7b7' }}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span style={{ color: '#6ee7b7' }}>₹45,280 Auto-Collected via WhatsApp</span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-200 font-semibold mt-0.5" style={{ color: '#e2e8f0' }}>
                    Direct Bank Credit • 0% Cut • Zero Awkward Phone Calls
                  </div>
                </div>
              </div>
            </div>

            {/* Content & Benefits */}
            <div className="lg:col-span-6 text-left space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-xs font-black shadow-sm">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-bold" style={{ color: '#6ee7b7' }}>WhatsApp Smart Ledger &amp; Auto-Collection</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                <span className="text-white block font-black" style={{ color: '#ffffff' }}>
                  Dukaan Ka Udhaar Phansa Hai?
                </span>
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-lime-300 bg-clip-text text-transparent block mt-1.5 font-black">
                  WhatsApp Par Auto-Vasooli Karein 3x Tez!
                </span>
              </h2>

              <p className="text-xs sm:text-sm leading-relaxed font-medium" style={{ color: '#e2e8f0' }}>
                Har mahine ghanton party ko call karne ki jhhijhak khatam. UdyogBill automated polite WhatsApp payment reminders bhejta hai dynamic UPI QR code aur live ledger PDF ke sath. Customer 1-click me kisi bhi UPI app (GPay, PhonePe, Paytm) se seedhe aapke bank account me pay kare bina kisi transaction charge ke!
              </p>

              <div className="space-y-3 pt-1 text-xs sm:text-sm font-medium">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs shadow-xs">
                    ✓
                  </div>
                  <div style={{ color: '#f8fafc' }}>
                    <strong className="text-white font-black" style={{ color: '#ffffff' }}>3x Tez Payment Vasooli:</strong>{" "}
                    <span style={{ color: '#cbd5e1' }}>Average debtor payment cycle 45 dino se ghat kar sirf 14 dino me.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs shadow-xs">
                    ✓
                  </div>
                  <div style={{ color: '#f8fafc' }}>
                    <strong className="text-white font-black" style={{ color: '#ffffff' }}>Dynamic UPI QR Code:</strong>{" "}
                    <span style={{ color: '#cbd5e1' }}>Har WhatsApp reminder me auto-calculated bill amount ka QR code, zero manual calculation error.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs shadow-xs">
                    ✓
                  </div>
                  <div style={{ color: '#f8fafc' }}>
                    <strong className="text-white font-black" style={{ color: '#ffffff' }}>0% MDR &amp; Zero Commission:</strong>{" "}
                    <span style={{ color: '#cbd5e1' }}>Poora paisa 100% aapke bank account (SBI, HDFC, ICICI, PNB) me bina kisi cut ke.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs shadow-xs">
                    ✓
                  </div>
                  <div style={{ color: '#f8fafc' }}>
                    <strong className="text-white font-black" style={{ color: '#ffffff' }}>1-Click Party Ledger PDF:</strong>{" "}
                    <span style={{ color: '#cbd5e1' }}>Complete account statement aur bill vouchers WhatsApp par instantly share karein.</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex flex-wrap items-center gap-3">
                <Link
                  href="/auth/register"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black text-sm shadow-xl transition-all flex items-center gap-2 cursor-pointer border border-emerald-300"
                >
                  <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                  <span className="text-slate-950 font-black">Start Free WhatsApp Khata Trial</span>
                </Link>
                <Link
                  href="/contact"
                  className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-sm border-2 border-white/40 transition-all flex items-center gap-2"
                >
                  <Phone className="w-4 h-4 text-emerald-300" />
                  <span className="text-white font-black" style={{ color: '#ffffff' }}>Schedule Live Demo</span>
                </Link>
              </div>
            </div>
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
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center">
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

      {/* ── 12. BOTTOM TRUST & FESTIVE VYAPAR CONVERSION SHOWCASE ── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pb-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 shadow-2xl p-6 sm:p-10 lg:p-12 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Real Commercial Photograph: Thriving Indian Vyapari Family */}
            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl group">
              <div className="relative h-72 sm:h-88 w-full">
                <Image
                  src="/img/real-vyapari-celebration-cta.jpg"
                  alt="Happy Indian Shopkeeper Family and Business Team Celebrating Thriving Retail Growth with UdyogBill Billing Dashboard"
                  title="14-Day Free Trial of UdyogBill - Join 12,500+ Indian Businesses"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="absolute top-3 left-3 bg-emerald-600/95 backdrop-blur-xs text-white text-xs font-black px-3.5 py-1 rounded-full shadow-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>12,500+ Indian Vyaparis Growing</span>
              </div>
            </div>

            {/* Content & Direct Action */}
            <div className="lg:col-span-6 text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/40 text-white text-xs font-black">
                <Store className="w-4 h-4" />
                <span>Zero Risk • Instant 60-Second Setup</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight" style={{ color: '#ffffff' }}>
                <span className="text-white" style={{ color: '#ffffff' }}>Dukaan Ko Modern Banayein, </span>
                <span className="text-amber-200" style={{ color: '#fde68a' }}>
                  Aaj Hi 14 Dino Ka Free Trial Shuru Karein!
                </span>
              </h2>
              <p className="text-sm leading-relaxed font-medium" style={{ color: '#fff7ed' }}>
                No credit card required. Free AnyDesk setup assistance within 15 minutes. Join retail shopkeepers, chemists, garment showrooms, and wholesalers in 48+ cities across India.
              </p>
              <div className="space-y-2 pt-1 text-xs sm:text-sm text-white font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Free AnyDesk Migration from Tally, Marg, Busy &amp; Vyapar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Unlimited Invoices, Barcode POS &amp; WhatsApp UPI Sharing</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Direct phone &amp; WhatsApp support in Hindi and English</span>
                </div>
              </div>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="px-8 py-4 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-base shadow-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Start 14-Day Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="tel:+919473807622"
                  className="px-5 py-4 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm border border-white/40 transition-all flex items-center gap-2"
                >
                  <Phone className="w-4 h-4 text-amber-200" />
                  <span>Call: +91-94738 07622</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
