import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.29.127", "192.168.29.127:3000", "localhost", "127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: process.env.BACKEND_PROXY_TARGET || "https://udyogbill.com/api/v1/:path*",
      },
    ];
  },
  async redirects() {
    return [
      // 1. Pharmacy cannibalization consolidation to Master Pillar
      {
        source: "/blog/pharmacy-billing-software-guide-india",
        destination: "/blog/pharmacy-billing-software-india",
        permanent: true,
      },
      {
        source: "/blog/starting-new-medical-store-pharmacy-billing-software-udyogbill",
        destination: "/blog/pharmacy-billing-software-india",
        permanent: true,
      },
      {
        source: "/blog/grow-medical-store-with-udyogbill-pharmacy-software",
        destination: "/blog/pharmacy-billing-software-india",
        permanent: true,
      },
      // 2. Garment shop cannibalization consolidation
      {
        source: "/blog/garment-shop-billing-software-india",
        destination: "/blog/complete-guide-garment-shop-billing-inventory-software-india",
        permanent: true,
      },
      {
        source: "/blog/garment-shop-billing-software-kapde-ki-dukaan-ke-liye-size-barcode-aur-gst-billing",
        destination: "/blog/complete-guide-garment-shop-billing-inventory-software-india",
        permanent: true,
      },
      // 3. Hardware shop cannibalization consolidation
      {
        source: "/blog/hardware-shop-billing-software-india",
        destination: "/blog/hardware-shop-billing-and-inventory-software-complete-guide",
        permanent: true,
      },
      {
        source: "/blog/hardware-shop-billing-software-nuts-bolts-pipes-aur-tools-ke-liye-stock-gst-guide",
        destination: "/blog/hardware-shop-billing-and-inventory-software-complete-guide",
        permanent: true,
      },
      // 4. Small business billing cannibalization
      {
        source: "/blog/best-billing-software-small-business-india-guide-2026",
        destination: "/blog/best-billing-software-small-business-india-2026",
        permanent: true,
      },
      {
        source: "/blog/small-business-invoicing-compliance-guide",
        destination: "/blog/best-billing-software-small-business-india-2026",
        permanent: true,
      },
      // 5. Retail billing duplicate ultimate guides
      {
        source: "/blog/ultimate-retail-billing-software-guide",
        destination: "/blog/ultimate-guide-retail-billing-software-udyogbill",
        permanent: true,
      },
      // 6. Mobile shop billing duplicate
      {
        source: "/blog/mobile-shop-billing-software-electronics-accessories-aur-gst-invoice-guide-india",
        destination: "/blog/mobile-shop-billing-software-india",
        permanent: true,
      },
      // 7. Fix GSC 30 Reported 404 Errors (Permanent 301 Redirects)
      { source: "/city", destination: "/contact", permanent: true },
      { source: "/city/noida", destination: "/contact", permanent: true },
      { source: "/gst-billing-software", destination: "/", permanent: true },
      { source: "/retail-billing-software", destination: "/industries/retail", permanent: true },
      { source: "/pharmacy-billing-software", destination: "/industries/pharma", permanent: true },
      { source: "/wholesale-billing-software", destination: "/industries/wholesale", permanent: true },
      { source: "/inventory-management-software-india", destination: "/features", permanent: true },
      { source: "/gst-invoice-format", destination: "/templates", permanent: true },
      { source: "/industries/electrical", destination: "/industries/hardware", permanent: true },
      { source: "/industries/automobile", destination: "/industries/hardware", permanent: true },
      { source: "/industries/manufacturing", destination: "/industries/wholesale", permanent: true },
      { source: "/compare/udyogbill-vs-zoho-books", destination: "/compare", permanent: true },
      { source: "/blog/gst-billing-software-small-business-india", destination: "/blog/best-gst-billing-software-small-business-india", permanent: true },
      // Categories with ampersand/mismatched slug normalization
      { source: "/blog/category/retail", destination: "/blog/category/retail-billing", permanent: true },
      { source: "/blog/category/hardware-&-paints", destination: "/blog/category/hardware-paints", permanent: true },
      { source: "/blog/category/hardware-%26-paints", destination: "/blog/category/hardware-paints", permanent: true },
      { source: "/blog/category/pos-&-operations", destination: "/blog/category/pos-operations", permanent: true },
      { source: "/blog/category/pos-%26-operations", destination: "/blog/category/pos-operations", permanent: true },
      { source: "/blog/category/credit-&-notes", destination: "/blog/category/credit-notes", permanent: true },
      { source: "/blog/category/credit-%26-notes", destination: "/blog/category/credit-notes", permanent: true },
      { source: "/blog/category/wholesale-&-distribution", destination: "/blog/category/wholesale-distribution", permanent: true },
      { source: "/blog/category/wholesale-%26-distribution", destination: "/blog/category/wholesale-distribution", permanent: true },
      { source: "/blog/category/crm-&-growth", destination: "/blog/category/crm-growth", permanent: true },
      { source: "/blog/category/crm-%26-growth", destination: "/blog/category/crm-growth", permanent: true },
      { source: "/blog/category/auto-parts-&-spares", destination: "/blog/category/auto-parts", permanent: true },
      { source: "/blog/category/auto-parts-%26-spares", destination: "/blog/category/auto-parts", permanent: true },
      { source: "/blog/category/pharma-&-chemist", destination: "/blog/category/pharmacy", permanent: true },
      { source: "/blog/category/pharma-%26-chemist", destination: "/blog/category/pharmacy", permanent: true },
      { source: "/blog/category/jewellery-&-bullion-billing", destination: "/blog/category/jewellery-billing", permanent: true },
      { source: "/blog/category/jewellery-%26-bullion-billing", destination: "/blog/category/jewellery-billing", permanent: true },
      // Legacy /public/ route normalization
      { source: "/public", destination: "/", permanent: true },
      { source: "/public/pricing", destination: "/pricing", permanent: true },
      { source: "/public/business/register", destination: "/register", permanent: true },
      { source: "/public/blog/:slug*", destination: "/blog/:slug*", permanent: true },
    ];
  },
};

export default nextConfig;
