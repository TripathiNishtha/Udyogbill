import type { Metadata } from "next";
import ContactClient from "./contact-client";

export const metadata: Metadata = {
  title: "Contact UdyogBill Support & Enterprise Sales | Call, WhatsApp & Office",
  description: "Get in touch with UdyogBill technical support and sales advisory. Call +91 94738 07622, connect via WhatsApp, or submit an inquiry for custom product demonstrations.",
  alternates: {
    canonical: "https://udyogbill.com/contact",
  },
  openGraph: {
    title: "Contact UdyogBill Support & Enterprise Sales",
    description: "Get in touch with the UdyogBill engineering and sales team for product demos, onboarding, or API queries.",
    url: "https://udyogbill.com/contact",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
