import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | UdyogBill",
  description: "Terms and conditions governing the access and use of UdyogBill cloud billing platform.",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 text-slate-800">
      <nav className="text-xs text-slate-500 mb-4">
        <Link href="/" className="hover:text-orange-600">Home</Link> / Terms &amp; Conditions
      </nav>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Terms &amp; Conditions</h1>
      <p className="text-xs text-slate-500 mb-8">Last updated: September 5, 2026</p>

      <div className="prose prose-slate max-w-none text-sm space-y-4">
        <p>These Terms &amp; Conditions (“Terms”) govern your access to and use of <strong>UdyogBill</strong>, a cloud-based business software platform (including billing, inventory, CRM, HRM and related features) offered by <strong>DigiOpera Private Limited</strong> (“DigiOpera”, “we”, “us”, or “our”), having its registered office in India. By registering for an account, accessing, or using UdyogBill, you (“User”, “you”, or “your”) agree to be bound by these Terms.</p>

        <h2 className="text-lg font-bold text-slate-900 pt-4">1. The Service</h2>
        <p>UdyogBill is provided on a subscription or trial basis as described on our website and in your order or plan. Features, limits, and availability may change; we will use reasonable efforts to communicate material changes that affect your use of the Service.</p>

        <h2 className="text-lg font-bold text-slate-900 pt-4">2. Eligibility &amp; Accounts</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>You must be legally able to enter into a contract in your jurisdiction and, if acting for a business, have authority to bind that business.</li>
          <li>You are responsible for the accuracy of registration information and for maintaining the confidentiality of login credentials.</li>
          <li>You must notify us promptly of any unauthorised access or security breach.</li>
        </ul>

        <h2 className="text-lg font-bold text-slate-900 pt-4">3. Acceptable Use</h2>
        <p>You agree not to misuse the Service, including attempting to gain unauthorised access; interfering with other users; uploading malware; using the Service for unlawful purposes; or scraping or reverse engineering except as permitted by law.</p>

        <h2 className="text-lg font-bold text-slate-900 pt-4">4. Your Data &amp; Content</h2>
        <p>You retain ownership of data you submit to UdyogBill. You grant us a licence to host, process, back up, and display such data solely to provide and improve the Service. We never sell your data.</p>

        <h2 className="text-lg font-bold text-slate-900 pt-4">5. Contact</h2>
        <p>For questions regarding these Terms, please contact us at <a href="mailto:support@udyogbill.com" className="text-orange-600 font-semibold">support@udyogbill.com</a>.</p>
      </div>
    </div>
  );
}
