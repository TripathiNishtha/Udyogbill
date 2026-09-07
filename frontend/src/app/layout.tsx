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
        url: "/logo.png",
        width: 600,
        height: 200,
        alt: "UdyogBill - Multi-Industry Cloud Billing Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UdyogBill — Multi-Industry Cloud SaaS Platform",
    description:
      "Production-grade GST billing, inventory, and enterprise business management platform for Indian businesses.",
    images: ["/logo.png"],
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
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "google9876543210abcdef",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <GoogleAnalytics />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
