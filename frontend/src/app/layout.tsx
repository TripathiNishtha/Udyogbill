import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://udyogbill.com"),
  title: {
    default: "UdyogBill — Multi-Industry Cloud SaaS Platform | GST Billing & Stock",
    template: "%s | UdyogBill",
  },
  description:
    "Production-grade multi-tenant billing, inventory, GST invoicing, and enterprise business management platform for Indian MSMEs.",
  keywords: [
    "GST billing software",
    "cloud invoicing software India",
    "inventory management software",
    "pharma billing software",
    "retail POS system",
    "MSME accounting software",
    "UdyogBill",
  ],
  authors: [{ name: "DigiOpera Private Limited", url: "https://udyogbill.com" }],
  creator: "UdyogBill",
  publisher: "DigiOpera Private Limited",
  alternates: {
    canonical: "https://udyogbill.com",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://udyogbill.com",
    siteName: "UdyogBill",
    title: "UdyogBill — Multi-Industry Cloud SaaS Platform | GST Billing & Stock",
    description:
      "Har vyapar ka smart saathi. Production-grade GST billing, inventory, party ledger, and multi-branch business management.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "UdyogBill - GST Billing Software for Indian Businesses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UdyogBill — Multi-Industry Cloud SaaS Platform",
    description:
      "Production-grade GST billing, inventory, and enterprise business management platform for Indian businesses.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const globalSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://udyogbill.com/#organization",
        name: "UdyogBill",
        legalName: "DigiOpera Private Limited",
        url: "https://udyogbill.com",
        logo: "https://udyogbill.com/logo.png",
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+919473807622",
          contactType: "customer service",
          areaServed: "IN",
          availableLanguage: ["en", "hi"],
        },
        sameAs: [
          "https://twitter.com/udyogbill",
          "https://www.linkedin.com/company/udyogbill",
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://udyogbill.com/#website",
        url: "https://udyogbill.com",
        name: "UdyogBill",
        publisher: { "@id": "https://udyogbill.com/#organization" },
        inLanguage: "en-IN",
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://udyogbill.com/#software",
        name: "UdyogBill",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Android, iOS",
        url: "https://udyogbill.com",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          description: "Free trial available",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          reviewCount: "500",
          bestRating: "5",
          worstRating: "1",
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalSchema) }}
        />
      </head>
      <body className="antialiased min-h-screen">
        <GoogleAnalytics />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
