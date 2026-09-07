import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | UdyogBill",
  description: "Privacy policy explaining how UdyogBill collects, protects and handles personal and business data.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 text-slate-800">
      <nav className="text-xs text-slate-500 mb-4">
        <Link href="/" className="hover:text-orange-600">Home</Link> / Privacy Policy
      </nav>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-xs text-slate-500 mb-8">Last updated: September 5, 2026</p>

      <div className="prose prose-slate max-w-none text-sm space-y-4">
        <p><strong>DigiOpera Private Limited</strong> (“DigiOpera”, “we”, “us”, or “our”) operates <strong>UdyogBill</strong>, a cloud-based business software platform for users in India and elsewhere. This Privacy Policy explains how we collect, use, disclose, and safeguard personal information when you visit our website, register an account, or use our services.</p>

        <h2 className="text-lg font-bold text-slate-900 pt-4">1. Information We Collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account &amp; Business Data:</strong> Name, email, phone, company name, billing address, GSTIN or tax identifiers you choose to provide.</li>
          <li><strong>Operational Data:</strong> Invoices, products, customers, suppliers, and items you store in UdyogBill to run your business.</li>
          <li><strong>Technical &amp; Usage Data:</strong> IP address, device/browser type, log files, cookies needed to operate and secure the Service.</li>
        </ul>

        <h2 className="text-lg font-bold text-slate-900 pt-4">2. How We Protect Your Data</h2>
        <p>We implement enterprise-grade technical and organisational measures designed to protect your data. All data is encrypted in transit and stored securely on cloud servers with automated backups.</p>

        <h2 className="text-lg font-bold text-slate-900 pt-4">3. We Do Not Sell Your Data</h2>
        <p>We do not sell, rent, or trade your personal or business data to third parties. Your financial figures, customers, and invoice records belong exclusively to you.</p>

        <h2 className="text-lg font-bold text-slate-900 pt-4">4. Contact Information</h2>
        <p>For privacy-related requests or questions, reach us at <a href="mailto:support@udyogbill.com" className="text-orange-600 font-semibold">support@udyogbill.com</a>.</p>
      </div>
    </div>
  );
}
