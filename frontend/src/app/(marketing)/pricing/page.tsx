import type { Metadata } from "next";
import PricingClient from "./pricing-client";

export const metadata: Metadata = {
  title: "Simple & Affordable Pricing Plans | UdyogBill",
  description: "UdyogBill ke affordable pricing plans dekho. Starter plan sirf ₹399/month se shuru. GST billing, stock management, aur multi-branch support. 14-day free trial.",
  alternates: {
    canonical: "https://udyogbill.com/pricing",
  },
  openGraph: {
    title: "Simple & Transparent Pricing Plans | UdyogBill",
    description: "Affordable GST billing and inventory plans for small and growing businesses. Starter plan from ₹399/mo.",
    url: "https://udyogbill.com/pricing",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
