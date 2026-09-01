"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Printer,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Ban,
  Building2,
  Calendar,
  CreditCard,
  Send,
  ArrowRight
} from "lucide-react";
import { quotationService } from "@/services/quotation-services";
import { QuotationDetails } from "@/types";

export default function QuotationViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [quotation, setQuotation] = useState<QuotationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (id) {
      loadQuotation(id);
    }
  }, [id]);

  const loadQuotation = async (qId: string) => {
    setLoading(true);
    try {
      const data = await quotationService.getQuotationById(qId);
      setQuotation(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load quotation.");
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quotation) return;
    if (!confirm(`Convert Quotation #${quotation.quotationNumber} directly to a Tax Invoice?`)) return;
    try {
      setConverting(true);
      const invoiceId = await quotationService.convertQuotationToInvoice(quotation.id, {
        warehouseId: "",
        invoiceDate: new Date().toISOString(),
        primaryPaymentMode: 1,
        paidAmount: 0,
        notes: `Converted from Quotation ${quotation.quotationNumber}`,
      });
      router.push(`/app/sales/invoices/${invoiceId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to convert quotation to invoice.");
      setConverting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">Loading quotation estimate...</p>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto">
        <Ban className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Quotation Not Found</h2>
        <p className="text-xs text-slate-400 mb-4">{error || "The requested quotation could not be loaded."}</p>
        <Link
          href="/app/sales/quotations"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Quotations</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Bar - Hidden on print */}
      <div className="print:hidden flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <Link
            href="/app/sales/quotations"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-white">Quotation #{quotation.quotationNumber}</h1>
            <p className="text-xs text-slate-400">
              Customer: <span className="text-slate-200 font-semibold">{quotation.customerName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {quotation.status === 5 && quotation.convertedInvoiceId && (
            <Link
              href={`/app/sales/invoices/${quotation.convertedInvoiceId}`}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-semibold"
            >
              <span>View Invoice #{quotation.convertedInvoiceNumber}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {quotation.status !== 5 && (
            <button
              onClick={handleConvertToInvoice}
              disabled={converting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{converting ? "Converting..." : "Convert to Tax Invoice"}</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Quotation</span>
          </button>
        </div>
      </div>

      {/* Printable Quotation Document Container */}
      <div className="bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-12 print:p-0 print:border-none print:shadow-none font-sans">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div>
            <div className="text-2xl font-black text-indigo-700 tracking-tight">UDYOGBILL</div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-widest mt-0.5">
              {quotation.branchName}
            </div>
            <div className="text-xs text-slate-600 mt-1 max-w-sm">
              {quotation.branchAddress || "Corporate Branch"}
            </div>
            {quotation.branchGstin && (
              <div className="text-xs font-semibold text-slate-700 mt-1">
                GSTIN: <span className="font-mono text-slate-900">{quotation.branchGstin}</span>
              </div>
            )}
            <div className="text-xs text-slate-600">
              State: {quotation.branchStateCode} | Supply: {quotation.placeOfSupply || "Standard"}
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-sm uppercase tracking-wider rounded-lg mb-2">
              Quotation / Proforma Estimate
            </div>
            <div className="text-sm font-bold text-slate-900">
              Estimate #: <span className="font-mono">{quotation.quotationNumber}</span>
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Date:{" "}
              <span className="font-semibold text-slate-800">
                {new Date(quotation.quotationDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                })}
              </span>
            </div>
            {quotation.validUntilDate && (
              <div className="text-xs text-slate-600">
                Valid Until:{" "}
                <span className="font-semibold text-slate-800">
                  {new Date(quotation.validUntilDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Customer & Billing Details */}
        <div className="grid grid-cols-2 gap-8 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Quotation Issued To
            </div>
            <div className="font-bold text-slate-900 text-sm">{quotation.customerName}</div>
            {quotation.customerPhone && (
              <div className="text-slate-600 mt-0.5">Phone: {quotation.customerPhone}</div>
            )}
            {quotation.customerEmail && (
              <div className="text-slate-600">Email: {quotation.customerEmail}</div>
            )}
            {quotation.customerGSTIN && (
              <div className="font-semibold text-slate-800 mt-1">
                GSTIN: <span className="font-mono">{quotation.customerGSTIN}</span>
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Billing Address
            </div>
            <div className="text-slate-700 leading-relaxed">
              {quotation.billingAddress || "Direct Over Counter Walk-in"}
            </div>
            <div className="text-slate-600 mt-1">
              Place of Supply: <span className="font-semibold">{quotation.placeOfSupply || "Standard"}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 overflow-hidden border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 w-8 text-center">#</th>
                <th className="p-3">Product / Service Description</th>
                <th className="p-3 text-center">HSN</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Rate (₹)</th>
                <th className="p-3 text-right">Disc %</th>
                <th className="p-3 text-right">Taxable (₹)</th>
                <th className="p-3 text-center">GST</th>
                <th className="p-3 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {quotation.items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="p-3 text-center font-medium text-slate-500">{idx + 1}</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{item.itemName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">SKU: {item.itemSku}</div>
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600">{item.hsnCode || "—"}</td>
                  <td className="p-3 text-right font-medium">
                    {item.quantity} {item.uomCode}
                  </td>
                  <td className="p-3 text-right font-mono">
                    ₹{item.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right text-slate-600">{item.discountPercent}%</td>
                  <td className="p-3 text-right font-mono">
                    ₹{item.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-semibold text-slate-700">{item.gstRate}%</span>
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 font-mono">
                    ₹{item.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* GST Tax Summary & Grand Total */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start mb-6">
          {/* Tax Summary Table */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              GST Tax Breakdown
            </div>
            <table className="w-full text-left text-[11px]">
              <thead className="text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-1">HSN</th>
                  <th className="py-1 text-right">Taxable</th>
                  <th className="py-1 text-right">CGST</th>
                  <th className="py-1 text-right">SGST</th>
                  <th className="py-1 text-right">IGST</th>
                  <th className="py-1 text-right">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 text-slate-700 font-mono">
                {quotation.taxSummary.map((ts, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5">{ts.hsnCode}</td>
                    <td className="py-1.5 text-right">₹{ts.taxableValue.toFixed(2)}</td>
                    <td className="py-1.5 text-right">₹{ts.cgstAmount.toFixed(2)}</td>
                    <td className="py-1.5 text-right">₹{ts.sgstAmount.toFixed(2)}</td>
                    <td className="py-1.5 text-right">₹{ts.igstAmount.toFixed(2)}</td>
                    <td className="py-1.5 text-right font-bold text-slate-900">₹{ts.totalTax.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Calculation Card */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross Subtotal:</span>
              <span className="font-mono text-slate-900">
                ₹{quotation.subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {quotation.quotationDiscountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Quotation Discount ({quotation.quotationDiscountPercent}%):</span>
                <span className="font-mono">
                  -₹{quotation.quotationDiscountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-mono text-slate-900">
                ₹{quotation.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {quotation.cgstAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Central GST (CGST):</span>
                <span className="font-mono">
                  ₹{quotation.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {quotation.sgstAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>State GST (SGST):</span>
                <span className="font-mono">
                  ₹{quotation.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {quotation.igstAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Integrated GST (IGST):</span>
                <span className="font-mono">
                  ₹{quotation.igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {quotation.roundOff !== 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Round Off:</span>
                <span className="font-mono">₹{quotation.roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-300">
              <span>Estimated Total (INR):</span>
              <span className="text-indigo-700 font-mono text-base">
                ₹{quotation.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Terms and Signatures */}
        <div className="border-t border-slate-200 pt-6 grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="font-bold text-slate-700 mb-1">Terms & Conditions:</div>
            <div className="text-slate-600 text-[11px] leading-relaxed">
              {quotation.notes ||
                "1. Quotation valid for 15 days from the date of issuance.\n2. Goods once sold will not be taken back.\n3. Subject to jurisdiction of local courts."}
            </div>
          </div>

          <div className="text-right flex flex-col justify-end items-end">
            <div className="h-12"></div>
            <div className="border-t border-slate-300 pt-1 w-48 text-center">
              <div className="font-bold text-slate-800">Authorized Signatory</div>
              <div className="text-[10px] text-slate-500">{quotation.branchName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
