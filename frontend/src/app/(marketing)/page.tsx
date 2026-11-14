import type { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  title: {
    absolute: "Best GST Billing Software in India (2026) | UdyogBill",
  },
  description:
    "India's fastest GST billing software by UdyogBill. 5-sec counter billing, E-Invoicing, E-Way bills & UPI QR code receipts. Free trial!",
  keywords: [
    "best gst billing software india",
    "gst billing software",
    "counter billing software",
    "retail billing software",
    "qr code billing",
    "e-way bill software",
    "gst invoices",
    "pharma billing software chemist",
    "fmcg billing app for shopkeepers",
    "udyogbill"
  ],
  alternates: {
    canonical: "https://udyogbill.com",
  },
  openGraph: {
    title: "Best GST Billing Software in India (2026) | UdyogBill",
    description:
      "India's fastest GST billing software by UdyogBill. 5-sec counter billing, E-Invoicing, E-Way bills & UPI QR code receipts. Free trial!",
    url: "https://udyogbill.com",
    siteName: "UdyogBill",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://udyogbill.com/img/hero-retail-store.jpg",
        width: 1376,
        height: 768,
        alt: "UdyogBill - Best GST Billing Software India for Retailers and Wholesalers",
      },
      {
        url: "https://udyogbill.com/img/banners/banner-hero-pos-billing.svg",
        width: 1200,
        height: 800,
        alt: "UdyogBill POS Counter & Thermal Billing System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Best GST Billing Software in India (2026) | UdyogBill",
    description:
      "India's fastest GST billing software by UdyogBill. 5-sec counter billing, E-Invoicing, E-Way bills & UPI QR code receipts. Free trial!",
    images: ["https://udyogbill.com/img/hero-retail-store.jpg"],
  },
};

const homeFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What makes UdyogBill the best GST billing software for Indian small businesses?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "UdyogBill is purpose-built for Indian retail and wholesale trades with 5-second counter billing, automatic GST calculations (CGST/SGST/IGST), direct WhatsApp invoice sharing, multi-batch FEFO inventory tracking, and seamless synchronization between Windows PC and Android mobile app."
      }
    },
    {
      "@type": "Question",
      name: "Can I generate E-Invoices (IRN) and E-Way Bills directly from UdyogBill?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. UdyogBill integrates directly with the official NIC portal. You can generate government-compliant E-Invoices with QR codes and instant E-Way Bills for consignments over ₹50,000 in a single click without visiting external government websites."
      }
    },
    {
      "@type": "Question",
      name: "Does UdyogBill support hardware like barcode scanners, thermal receipt printers, and electronic weighing scales?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. UdyogBill offers plug-and-play compatibility with all standard USB and Bluetooth barcode scanners, 2-inch (58mm) and 3-inch (80mm) thermal printers, standard A4/A5 laser/inkjet printers, and electronic RS-232/USB weighing scales for grocery and FMCG trade."
      }
    },
    {
      "@type": "Question",
      name: "Is UdyogBill suitable for medical stores and pharmacy wholesale distributors?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. UdyogBill features dedicated pharma ERP capabilities including Batch & Expiry tracking, First-Expiry-First-Out (FEFO) automated selection, Schedule H1 and NDPS audit registers, Form 20B/21B drug license compliance, and 3-way supplier expiry claim reconciliation."
      }
    },
    {
      "@type": "Question",
      name: "Can I access my business data on both Mobile App and Desktop PC simultaneously?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. UdyogBill provides enterprise-grade real-time cloud synchronization. Store owners can bill at the counter on a desktop PC while managers check live sales, collect payments, and view inventory balances on the Android mobile app from anywhere."
      }
    },
    {
      "@type": "Question",
      name: "Is there a free trial available for UdyogBill?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You can start with an unrestricted 14-day free trial with zero setup fees and no credit card required. Full onboarding and support are included."
      }
    }
  ]
};

const homeSoftwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "UdyogBill",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Windows, Android, Web Browser, iOS",
  url: "https://udyogbill.com",
  image: "https://udyogbill.com/img/banners/banner-hero-pos-billing.svg",
  screenshot: [
    "https://udyogbill.com/img/banners/banner-hero-pos-billing.svg",
    "https://udyogbill.com/img/banners/banner-tally-marg-migration.svg",
    "https://udyogbill.com/img/banners/banner-nic-eway-einvoice.svg",
    "https://udyogbill.com/img/banners/banner-stock-multi-godown.svg",
    "https://udyogbill.com/img/banners/banner-whatsapp-ledger-payment.svg",
    "https://udyogbill.com/img/banners/banner-pharma-fefo-chemist.svg",
    "https://udyogbill.com/img/banners/banner-fmcg-kirana-pos.svg",
    "https://udyogbill.com/img/banners/banner-garments-apparel-matrix.svg",
    "https://udyogbill.com/img/banners/banner-ca-accountant-audit.svg"
  ],
  description: "Fast GST billing software by UdyogBill. 5-sec counter billing, E-Invoicing, E-Way bills & UPI QR code receipts for retail & wholesale.",
  featureList: [
    "5-Second Fast Counter Billing & Barcode POS",
    "100% GST Compliance, E-Way Bills & E-Invoicing",
    "Dynamic UPI QR Code on Invoices & WhatsApp Sharing",
    "Multi-Godown Stock & Batch Expiry Tracking"
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "12500",
    bestRating: "5",
    worstRating: "1"
  },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    lowPrice: "0",
    highPrice: "4999",
    offerCount: "4"
  }
};

const homeOrganizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "UdyogBill",
  legalName: "DigiOpera Private Limited",
  url: "https://udyogbill.com",
  logo: "https://udyogbill.com/logo.png",
  sameAs: [
    "https://www.linkedin.com/company/udyogbill",
    "https://twitter.com/udyogbill"
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-9473807622",
    contactType: "customer support",
    areaServed: "IN",
    availableLanguage: ["English", "Hindi"]
  }
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSoftwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeOrganizationSchema) }}
      />
      <HomeClient />
    </>
  );
}
