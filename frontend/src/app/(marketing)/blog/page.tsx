import type { Metadata } from "next";
import BlogIndexClient from "./blog-client";

export const metadata: Metadata = {
  title: "GST Billing, Inventory & Business Guides | UdyogBill Blog",
  description: "GST billing, stock management, retail POS, pharma expiry claims aur business growth par 280+ practical guides Indian shopkeepers aur distributors ke liye.",
  alternates: {
    canonical: "https://udyogbill.com/blog",
  },
  openGraph: {
    title: "GST Billing, Inventory & Business Guides | UdyogBill Blog",
    description: "280+ practical guides on GST invoices, retail billing, pharma registers, and MSME growth.",
    url: "https://udyogbill.com/blog",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function BlogIndexPage() {
  return <BlogIndexClient />;
}
