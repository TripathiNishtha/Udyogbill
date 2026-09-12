import type { Metadata } from "next";
import PricingClient from "./pricing-client";

export const metadata: Metadata = {
  title: "Transparent & Affordable Pricing Plans | UdyogBill",
  description: "Explore UdyogBill transparent pricing plans starting at just ₹399/month. Includes GST billing, real-time inventory, multi-branch control, and 14-day unrestricted free trial.",
  alternates: {
    canonical: "https://udyogbill.com/pricing",
  },
  openGraph: {
    title: "Transparent & Affordable Pricing Plans | UdyogBill",
    description: "Cloud GST billing, inventory, and accounting software built for Indian MSMEs. Start your 14-day free trial today.",
    url: "https://udyogbill.com/pricing",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
