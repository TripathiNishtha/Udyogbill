import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  FileText,
  Package,
  Users,
  BarChart3,
  Building2,
  Smartphone,
  Shield,
  Printer,
  Zap,
  TrendingUp,
  Clock,
  Tag,
  RefreshCw,
  MapPin,
  QrCode,
  Sparkles,
  Check
} from "lucide-react";

export const metadata: Metadata = {
  title: "Cloud GST Billing & Inventory Management Features",
  description: "Explore UdyogBill enterprise-grade features: High-Speed GST Invoicing, Live Multi-Warehouse Stock, Party Ledgers, Barcode POS, Multi-Branch Control, and 100+ Financial Reports.",
  alternates: {
    canonical: "https://udyogbill.com/features",
  },
  openGraph: {
    title: "Cloud GST Billing & Inventory Management Features | UdyogBill",
    description: "High-Speed GST Invoicing, Live Inventory, Party Ledger, POS Counter, Multi-Branch, and Barcode Billing.",
    url: "https://udyogbill.com/features",
    siteName: "UdyogBill",
    type: "website",
  },
};

const featureCategories = [
  {
    title: "GST Invoicing & Counter Billing",
    desc: "Speed up checkout counters and guarantee 100% CBIC and GST compliance.",
    color: "#ea580c",
    features: [
      {
        icon: FileText,
        name: "GST Tax Invoices & Bills of Supply",
        desc: "Automated CGST, SGST, IGST, and Cess computation. Supports B2B, B2C, export, and reverse-charge invoicing with zero math errors."
      },
      {
        icon: Printer,
        name: "Multi-Format Printing & WhatsApp Dispatch",
        desc: "Instant high-speed 2\" and 3\" thermal receipt printing, A4/A5 laser prints, and 1-click encrypted PDF invoice sharing via WhatsApp."
      },
      {
        icon: Tag,
        name: "Quotations, Estimates & Delivery Challans",
        desc: "Generate formal price estimates and logistics dispatch challans with vehicle tracking. Convert estimates to tax invoices with one click."
      },
      {
        icon: RefreshCw,
        name: "Credit / Debit Notes & Sales Returns",
        desc: "Process customer product returns effortlessly with automated credit note reconciliation directly into your GST ledger."
      }
    ]
  },
  {
    title: "Inventory Control & Warehousing",
    desc: "Never run out of high-velocity stock or lose money to expired goods.",
    color: "#f97316",
    features: [
      {
        icon: Package,
        name: "Real-Time Stock Valuation",
        desc: "Continuous stock count updates on every sale and purchase. Supports FIFO, LIFO, and weighted average valuation models."
      },
      {
        icon: QrCode,
        name: "Barcode Generation & Scanner Support",
        desc: "Direct integration with all 1D/2D laser handheld scanners. Design and print custom barcode and QR code stickers in bulk."
      },
      {
        icon: MapPin,
        name: "Multi-Godown & Inter-Branch Transfers",
        desc: "Track stock movements between central warehouses and retail counters with complete gate pass and transit verification."
      },
      {
        icon: TrendingUp,
        name: "Automated Low-Stock & Reorder Triggers",
        desc: "Receive intelligent notifications when items hit minimum safety thresholds to maintain uninterrupted retail supply."
      }
    ]
  },
  {
    title: "Party Ledger, Khata & Receivables",
    desc: "Recover outstanding payments faster with automated collection workflows.",
    color: "#2563eb",
    features: [
      {
        icon: Users,
        name: "Customer & Supplier Ledgers (Khata)",
        desc: "Complete transaction histories, debit/credit balances, and running statements exportable to PDF and Excel in real time."
      },
      {
        icon: Clock,
        name: "Receivables Ageing Analysis",
        desc: "Identify overdue payments categorized by 0-30, 31-60, and 90+ day buckets to protect cash flow and minimize bad debts."
      },
      {
        icon: RefreshCw,
        name: "Automated WhatsApp Payment Links",
        desc: "Send polite automated payment reminder notifications with integrated UPI QR codes directly to your clients' WhatsApp."
      },
      {
        icon: Shield,
        name: "Credit Limit Enforcement",
        desc: "Define custom credit ceilings and credit periods per party. Prevent staff from creating new bills once limits are breached."
      }
    ]
  },
  {
    title: "Taxation, Audit & Financial Reports",
    desc: "Make audit season frictionless for you and your Chartered Accountant.",
    color: "#7c3aed",
    features: [
      {
        icon: BarChart3,
        name: "Comprehensive Sales & Margin Reports",
        desc: "Analyze revenue by item, category, salesperson, counter, and payment mode with granular gross profit margin breakdowns."
      },
      {
        icon: TrendingUp,
        name: "Automated Profit & Loss Statement",
        desc: "Instant P&L calculations reflecting cost of goods sold (COGS), operating expenses, and net profit margins."
      },
      {
        icon: FileText,
        name: "GSTR-1, GSTR-3B & GSTR-9 Ready Data",
        desc: "One-click export of GST return files formatted according to government portal specifications for instant CA filing."
      },
      {
        icon: Package,
        name: "Batch & Expiry Dump Audits",
        desc: "Comprehensive near-expiry reports allowing pharma and FMCG businesses to return near-dated inventory before expiry."
      }
    ]
  },
  {
    title: "Enterprise Multi-Branch & Security",
    desc: "Centralized oversight for multi-counter and multi-location businesses.",
    color: "#059669",
    features: [
      {
        icon: Building2,
        name: "Centralized Multi-Branch Control",
        desc: "Monitor consolidated live sales, revenue metrics, and inventory health across all company branches from one screen."
      },
      {
        icon: Users,
        name: "Granular Role-Based Permissions (RBAC)",
        desc: "Assign distinct privileges for cashiers, stock managers, and accountants. Conceal wholesale purchase rates and profit margins."
      },
      {
        icon: Smartphone,
        name: "Any-Device Browser & Cloud Access",
        desc: "Manage your business securely from desktop, laptop, tablet, or mobile phone via any modern browser with zero software installation."
      },
      {
        icon: Shield,
        name: "Continuous Cloud Encryption & Backups",
        desc: "Bank-grade 256-bit SSL encryption hosted on Oracle Cloud Infrastructure with automated daily offsite snapshots."
      }
    ]
  }
];

export default function FeaturesPage() {
  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* ── Header ── */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200 bg-orange-50 text-orange-900 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            Complete Operating System for Indian MSMEs
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 mb-3 tracking-tight">
            Engineered to Run Every Aspect of{" "}
            <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Your Business
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-700 font-medium max-w-2xl mx-auto mb-6 leading-relaxed">
            From lightning-fast barcode billing to multi-branch inventory, automated GST compliance, and party ledgers — everything you need in one unified platform.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all"
            >
              Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://wa.me/919473807622?text=Hi%2C%20I%20would%20like%20a%20guided%20product%20demonstration%20of%20UdyogBill"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 text-xs sm:text-sm transition-all shadow-2xs"
            >
              Schedule Live Screen Demo
            </a>
          </div>
        </div>
      </section>

      {/* ── Feature Categories ── */}
      <div className="space-y-8 sm:space-y-10">
        {featureCategories.map((cat) => (
          <section key={cat.title} className="py-2">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-6 rounded-full" style={{ background: cat.color }} />
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                    {cat.title}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 sm:ml-4">{cat.desc}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {cat.features.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.name}
                      className="bg-white rounded-2xl p-5 border-2 border-slate-200 hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 border"
                          style={{
                            background: `${cat.color}10`,
                            borderColor: `${cat.color}25`,
                          }}
                        >
                          <Icon className="w-5 h-5" style={{ color: cat.color }} />
                        </div>
                        <h3 className="font-black text-slate-950 mb-1.5 text-sm sm:text-base leading-snug">
                          {f.name}
                        </h3>
                        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* ── Bottom Conversion Banner ── */}
      <section className="py-6 sm:pb-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="rounded-2xl p-8 sm:p-10 border-2 border-orange-200 bg-orange-50/50 text-center relative overflow-hidden">
            <div className="max-w-2xl mx-auto">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold text-orange-900 bg-orange-100 border border-orange-300 mb-3">
                Zero Credit Card Required • Instant 2-Minute Activation
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 mb-3">
                Experience All Enterprise Features Free for 14 Days
              </h2>
              <p className="text-slate-700 text-xs sm:text-sm mb-6 leading-relaxed">
                Join thousands of forward-thinking retailers, distributors, and wholesalers upgrading their business operations with UdyogBill.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-7 py-3 rounded-xl text-sm shadow-md transition-all"
                >
                  Start Your Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
