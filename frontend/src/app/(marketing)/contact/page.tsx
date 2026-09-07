import type { Metadata } from "next";
import ContactClient from "./contact-client";

export const metadata: Metadata = {
  title: "Contact UdyogBill Support | Phone, WhatsApp & Office Details",
  description: "UdyogBill team se sampark karein. Call: +91 94738 07622, WhatsApp support, ya free demo request form submit karein. We respond within 24 hours.",
  alternates: {
    canonical: "https://udyogbill.com/contact",
  },
  openGraph: {
    title: "Contact UdyogBill Support | Phone, WhatsApp & Demo",
    description: "Get in touch with UdyogBill support team for sales, demo, or technical queries. Call +91 94738 07622.",
    url: "https://udyogbill.com/contact",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
