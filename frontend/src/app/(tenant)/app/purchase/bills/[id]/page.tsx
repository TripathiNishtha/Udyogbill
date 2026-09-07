"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  Receipt,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  Ban
} from "lucide-react";
import { purchaseService } from "@/services/purchase-services";
import { PurchaseBillDetails } from "@/types";

export default function PurchaseBillPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [bill, setBill] = useState<PurchaseBillDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    purchaseService
      .getPurchaseBillById(resolvedParams.id)
      .then((data) => setBill(data))
      .catch((err) => console.error("Failed to load bill:", err))
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-2"></div>
          <div className="text-slate-400 text-sm">Loading purchase bill...</div>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-bold text-white mb-2">Purchase Bill Not Found</h2>
        <Link href="/app/purchase/bills" className="text-indigo-400 hover:underline text-sm">
          ← Back to Purchase Bills
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between no-print">
        <Link
          href="/app/purchase/bills"
          className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Purchase Bills</span>
        </Link>

        <button
          onClick={() => window.print()}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-600/20"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {/* Printable GST Purchase Bill (A4) */}
      <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-200 print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start pb-6 border-b border-slate-300">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">VENDOR PURCHASE BILL</h1>
            <div className="text-xs font-semibold text-emerald-700 uppercase mt-0.5 tracking-wider">
              {bill.taxSupplyType === 1 ? "Intra-State Supply (CGST + SGST)" : "Inter-State Supply (IGST)"}
            </div>
            <div className="mt-2 text-xs text-slate-600">
              <span className="font-semibold">Receiving Branch:</span> {bill.branchName}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xl font-black font-mono text-slate-900">{bill.billNumber}</div>
            <div className="text-xs text-slate-600 mt-1">
              <span className="font-semibold">Bill Date:</span> {new Date(bill.billDate).toLocaleDateString()}
            </div>
            {bill.vendorInvoiceNumber && (
              <div className="text-xs font-mono text-slate-700">
                <span className="font-semibold">Vendor Inv #:</span> {bill.vendorInvoiceNumber}
              </div>
            )}
            {bill.dueDate && (
              <div className="text-xs text-rose-700 font-semibold">
                Due Date: {new Date(bill.dueDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Vendor & Delivery Info */}
        <div className="grid grid-cols-2 gap-8 py-6 border-b border-slate-300 text-xs">
          <div>
            <div className="font-bold text-slate-500 uppercase tracking-wider mb-1">SUPPLIER / VENDOR DETAILS</div>
            <div className="text-sm font-bold text-slate-900">{bill.supplierName}</div>
            {bill.supplierAddress && <div className="text-slate-600 mt-0.5">{bill.supplierAddress}</div>}
            {bill.supplierGSTIN && (
              <div className="text-slate-800 font-mono font-semibold mt-1">
                GSTIN: {bill.supplierGSTIN} (State: {bill.supplierStateCode})
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="font-bold text-slate-500 uppercase tracking-wider mb-1">DELIVERED TO (WAREHOUSE)</div>
            <div className="text-sm font-bold text-slate-900">{bill.warehouseName}</div>
            <div className="text-slate-600 mt-0.5">Place of Supply: {bill.placeOfSupply}</div>
            {bill.grnNumber && <div className="text-emerald-700 font-mono font-semibold mt-1">Linked GRN: {bill.grnNumber}</div>}
          </div>
        </div>

        {/* Items Table */}
        <div className="py-6 border-b border-slate-300">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-800 uppercase tracking-wider">
                <th className="py-2">#</th>
                <th className="py-2">Item Description</th>
                <th className="py-2">HSN</th>
                <th className="py-2">Batch</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Unit Rate</th>
                <th className="py-2 text-right">Taxable</th>
                <th className="py-2 text-right">GST</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {bill.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-2.5 text-slate-500">{idx + 1}</td>
                  <td className="py-2.5 font-sans font-semibold text-slate-900">{item.itemName}</td>
                  <td className="py-2.5">{item.hsnCode || "-"}</td>
                  <td className="py-2.5">{item.batchNumber || "-"}</td>
                  <td className="py-2.5 text-center font-bold">{item.quantity} {item.uomCode}</td>
                  <td className="py-2.5 text-right">₹{item.unitPrice.toFixed(2)}</td>
                  <td className="py-2.5 text-right">₹{item.taxableAmount.toFixed(2)}</td>
                  <td className="py-2.5 text-right">{item.gstRate}%</td>
                  <td className="py-2.5 text-right font-bold text-slate-900">₹{item.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* GST Tax Summary & Financials */}
        <div className="grid grid-cols-12 gap-6 py-6 border-b border-slate-300">
          <div className="col-span-7 space-y-3">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">GST Tax Distribution</div>
            <table className="w-full text-[11px] text-left border border-slate-200">
              <thead className="bg-slate-100 font-semibold">
                <tr>
                  <th className="p-1.5">HSN</th>
                  <th className="p-1.5 text-right">Taxable</th>
                  <th className="p-1.5 text-right">Rate</th>
                  <th className="p-1.5 text-right">CGST</th>
                  <th className="p-1.5 text-right">SGST</th>
                  <th className="p-1.5 text-right">IGST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {bill.taxSummary.map((ts, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5">{ts.hsnCode}</td>
                    <td className="p-1.5 text-right">₹{ts.taxableValue.toFixed(2)}</td>
                    <td className="p-1.5 text-right">{ts.gstRate}%</td>
                    <td className="p-1.5 text-right">₹{ts.cgstAmount.toFixed(2)}</td>
                    <td className="p-1.5 text-right">₹{ts.sgstAmount.toFixed(2)}</td>
                    <td className="p-1.5 text-right">₹{ts.igstAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="col-span-5 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Sub-Total</span>
              <span>₹{bill.subTotal.toFixed(2)}</span>
            </div>
            {bill.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span>-₹{bill.discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Total Tax (GST)</span>
              <span>₹{(bill.cgstAmount + bill.sgstAmount + bill.igstAmount).toFixed(2)}</span>
            </div>
            {bill.roundOff !== 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Round Off</span>
                <span>{bill.roundOff > 0 ? `+₹${bill.roundOff.toFixed(2)}` : `-₹${Math.abs(bill.roundOff).toFixed(2)}`}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t-2 border-slate-900">
              <span>Grand Total</span>
              <span>₹{bill.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold pt-1">
              <span>Amount Paid</span>
              <span>₹{bill.paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-rose-700 font-bold">
              <span>Balance Payable</span>
              <span>₹{bill.balanceAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payments History */}
        {bill.payments.length > 0 && (
          <div className="py-4 border-b border-slate-300 text-xs">
            <div className="font-bold text-slate-600 uppercase tracking-wider mb-2">Disbursement / Payment History</div>
            <div className="space-y-1 font-mono">
              {bill.payments.map((p) => (
                <div key={p.id} className="flex justify-between text-slate-700">
                  <span>
                    {new Date(p.paymentDate).toLocaleDateString()} - {p.paymentModeName} {p.transactionReference ? `(Ref: ${p.transactionReference})` : ""}
                  </span>
                  <span className="font-bold text-emerald-700">₹{p.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-8 flex justify-between items-end text-xs text-slate-500">
          <div>
            <div>Recorded in UdyogBill</div>
            <div>Computer generated purchase voucher.</div>
          </div>
          <div className="text-right">
            <div className="w-40 border-b border-slate-400 pb-8 mb-1"></div>
            <div className="font-semibold text-slate-700">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
