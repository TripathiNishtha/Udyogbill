import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

export const metadata: Metadata = {
  title: "UdyogBill — Multi-Industry Cloud SaaS Platform",
  description: "Production-grade multi-tenant billing, inventory, and enterprise business management platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
