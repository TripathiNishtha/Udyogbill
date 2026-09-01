"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Receipt,
  ShoppingCart,
  Wallet,
  Boxes,
  Printer,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import { SalesInvoiceList, MasterItem } from "@/types";

interface Props {
  invoices: SalesInvoiceList[];
  items: MasterItem[];
  isHi?: boolean;
}

export function RecentActivityLedgerWidget({ invoices, items, isHi = false }: Props) {
  const [activeTab, setActiveTab] = useState<"sales" | "collections" | "inventory">("sales");

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val);
  };

  const paidInvoices = invoices.filter((inv) => (inv.paidAmount || 0) > 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-indigo-400" />
            <span>{isHi ? "हाल की व्यावसायिक गतिविधियां" : "Recent Business Activity & Ledger Transactions"}</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isHi ? "दुकान और शाखाओं से दर्ज नवीनतम बिल, वसूली और स्टॉक स्थिति" : "Real-time ledger audit across sales counters, receipts, and warehouse stock"}
          </p>
        </div>

        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-3 py-1 rounded font-semibold text-xs transition-colors flex items-center space-x-1.5 ${
              activeTab === "sales" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{isHi ? "बिक्री बिल" : "Sales Invoices"}</span>
          </button>
          <button
            onClick={() => setActiveTab("collections")}
            className={`px-3 py-1 rounded font-semibold text-xs transition-colors flex items-center space-x-1.5 ${
              activeTab === "collections" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>{isHi ? "प्राप्त वसूली" : "Collections"}</span>
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-3 py-1 rounded font-semibold text-xs transition-colors flex items-center space-x-1.5 ${
              activeTab === "inventory" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>{isHi ? "स्टॉक स्थिति" : "Stock Audit"}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Sales Invoices */}
      {activeTab === "sales" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-2.5">{isHi ? "इनवॉइस #" : "Invoice #"}</th>
                <th className="p-2.5">{isHi ? "दिनांक" : "Date"}</th>
                <th className="p-2.5">{isHi ? "ग्राहक का नाम" : "Customer Name"}</th>
                <th className="p-2.5 text-right">{isHi ? "कुल राशि" : "Invoice Amount"}</th>
                <th className="p-2.5 text-right">{isHi ? "वसूल" : "Paid"}</th>
                <th className="p-2.5 text-right">{isHi ? "बाकी" : "Balance"}</th>
                <th className="p-2.5 text-center">{isHi ? "स्थिति" : "Payment Status"}</th>
                <th className="p-2.5 text-right">{isHi ? "कार्य" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {invoices.slice(0, 6).map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-2.5 font-bold text-white whitespace-nowrap">{inv.invoiceNumber}</td>
                  <td className="p-2.5 text-slate-400 whitespace-nowrap">{inv.invoiceDate?.slice(0, 10)}</td>
                  <td className="p-2.5 font-sans font-medium text-slate-200 max-w-[170px] truncate" title={inv.customerName}>
                    {inv.customerName}
                  </td>
                  <td className="p-2.5 text-right font-bold text-white">{formatCurrency(inv.totalAmount)}</td>
                  <td className="p-2.5 text-right text-emerald-400">{formatCurrency(inv.paidAmount)}</td>
                  <td className="p-2.5 text-right text-rose-400">{formatCurrency(inv.balanceAmount)}</td>
                  <td className="p-2.5 text-center font-sans">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        inv.paymentStatus === 3
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : inv.paymentStatus === 2
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {inv.paymentStatus === 3 ? "Fully Paid" : inv.paymentStatus === 2 ? "Partially Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-sans">
                    <div className="inline-flex items-center space-x-1.5 justify-end">
                      <Link
                        href={`/app/sales/invoices/${inv.id}`}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-750"
                        title={isHi ? "बिल देखें" : "View Invoice"}
                      >
                        <Eye className="w-3 h-3 text-slate-400" />
                      </Link>
                      <button
                        onClick={() => {
                          const msg = encodeURIComponent(`Tax Invoice ${inv.invoiceNumber} for ₹${inv.totalAmount} issued to ${inv.customerName}. Payment Status: ${inv.paymentStatus === 3 ? "Fully Paid" : "Balance Due: ₹" + inv.balanceAmount}. Thank you for your business!`);
                          window.open(`https://wa.me/?text=${msg}`, "_blank");
                        }}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 text-xs font-semibold transition-colors border border-emerald-800/40 cursor-pointer"
                        title={isHi ? "व्हाट्सएप पर शेयर करें" : "Share on WhatsApp"}
                      >
                        <span className="text-[11px]">📲</span>
                      </button>
                      <Link
                        href={`/app/sales/invoices/${inv.id}`}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors border border-slate-750"
                        title={isHi ? "प्रिंट करें" : "Print Tax Invoice"}
                      >
                        <Printer className="w-3 h-3" />
                        <span className="hidden xl:inline">{isHi ? "प्रिंट" : "Print"}</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                    {isHi ? "अभी तक कोई बिल जारी नहीं किया गया है।" : "No sales invoices issued in this period."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Collections Feed */}
      {activeTab === "collections" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-2.5">Invoice #</th>
                <th className="p-2.5">Customer</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5 text-right">Settled (Paid)</th>
                <th className="p-2.5 text-right">Remaining Balance</th>
                <th className="p-2.5">Realization Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {paidInvoices.slice(0, 6).map((inv) => {
                const pct = inv.totalAmount > 0 ? Math.round((inv.paidAmount / inv.totalAmount) * 100) : 100;
                return (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5 font-bold text-white whitespace-nowrap">{inv.invoiceNumber}</td>
                    <td className="p-2.5 font-sans font-medium text-slate-200 max-w-[170px] truncate" title={inv.customerName}>
                      {inv.customerName}
                    </td>
                    <td className="p-2.5 text-slate-400 whitespace-nowrap">{inv.invoiceDate?.slice(0, 10)}</td>
                    <td className="p-2.5 text-right font-bold text-emerald-400">{formatCurrency(inv.paidAmount)}</td>
                    <td className="p-2.5 text-right text-rose-400">{formatCurrency(inv.balanceAmount)}</td>
                    <td className="p-2.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="text-[10px] text-slate-400">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paidInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    {isHi ? "अभी तक कोई भुगतान वसूली दर्ज नहीं हुई है।" : "No cash or digital collections recorded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Inventory Stock Audit */}
      {activeTab === "inventory" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-2.5">SKU</th>
                <th className="p-2.5">Product Name</th>
                <th className="p-2.5 text-right">Purchase Cost</th>
                <th className="p-2.5 text-right">Selling Price</th>
                <th className="p-2.5 text-right">Current Stock</th>
                <th className="p-2.5">Stock Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {items.slice(0, 6).map((itm) => {
                const stock = itm.totalStock ?? itm.currentStock ?? 0;
                const isLow = stock <= (itm.minimumStockAlert || 5);
                const isZero = stock === 0;

                return (
                  <tr key={itm.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5 font-bold text-white whitespace-nowrap">{itm.sku}</td>
                    <td className="p-2.5 font-sans font-medium text-slate-200 max-w-[180px] truncate" title={itm.name}>
                      {itm.name}
                    </td>
                    <td className="p-2.5 text-right text-slate-300">{formatCurrency(itm.purchasePrice)}</td>
                    <td className="p-2.5 text-right font-bold text-white">{formatCurrency(itm.sellingPrice)}</td>
                    <td className="p-2.5 text-right font-bold text-white">{stock}</td>
                    <td className="p-2.5 font-sans">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isZero
                            ? "bg-slate-800 text-slate-400 border-slate-700"
                            : isLow
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {isZero ? "Zero Stock" : isLow ? "Low Stock" : "In Stock"}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    {isHi ? "कोई इन्वेंटरी आइटम नहीं मिला।" : "No inventory master items created yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
