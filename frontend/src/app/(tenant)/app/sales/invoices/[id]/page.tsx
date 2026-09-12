"use client";

import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  ArrowLeft,
  Printer,
  Building2,
  Users2,
  CheckCircle2,
  XCircle,
  CreditCard,
  Ban,
  QrCode,
  Receipt,
  Layers,
  Edit2,
  MessageCircle,
  Mail,
  Bell,
  Truck,
  Package,
  FileCheck,
  ChevronDown,
  Copy,
  Share2,
  Download,
  MoreHorizontal,
  X,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Shield,
  RefreshCw,
  ExternalLink,
  RotateCcw
} from "lucide-react";
import { salesService } from "@/services/sales-services";
import { tenantAppService } from "@/services/tenant-app-services";
import { barcodeService } from "@/services/barcode-services";
import { printTemplateService, PrintTemplate } from "@/services/print-template-services";
import { SalesInvoiceDetails, TenantDetails, UpiQrPayload, SalesInvoicePayment } from "@/types";
import { printRawHtml } from "@/lib/print-helper";
import { useAddons } from "@/context/addon-context";

// ─── Types ──────────────────────────────────────────────────────────────────
type PrintFormat = "a4" | "compact_a5" | "thermal80" | "thermal58";
type DocumentType = "invoice" | "challan" | "gatepass" | "packingslip" | "proforma" | "receipt";

// ─── Small confirmation modal ────────────────────────────────────────────────
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  requireReason,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  requireReason?: boolean;
}) {
  const [reason, setReason] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-amber-500/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <p className="text-xs text-slate-400 mt-1">{message}</p>
          </div>
        </div>
        {requireReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason (required)..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 min-h-[80px] resize-none"
          />
        )}
        <div className="flex items-center space-x-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(requireReason ? reason : undefined)}
            disabled={requireReason && !reason.trim()}
            className={`flex-1 px-4 py-2 rounded-xl text-white text-xs font-bold transition-colors disabled:opacity-40 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Record Payment Modal ───────────────────────────────────────────────────
function RecordPaymentModal({
  open,
  invoice,
  submitting,
  form,
  setForm,
  onSubmit,
  onClose,
}: {
  open: boolean;
  invoice: SalesInvoiceDetails;
  submitting: boolean;
  form: {
    amount: number;
    paymentMode: number;
    paymentDate: string;
    transactionReference: string;
    notes: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Record Invoice Payment</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invoice Summary Card */}
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Invoice Ref:</span>
            <span className="font-mono text-white font-semibold">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Customer:</span>
            <span className="text-white font-semibold">{invoice.customerName}</span>
          </div>
          <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold">
            <span className="text-rose-400">Outstanding Balance:</span>
            <span className="font-mono text-rose-400">₹{invoice.balanceAmount.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Amount Receiving (₹) *</label>
            <input
              type="number"
              step="0.01"
              max={invoice.balanceAmount}
              required
              value={form.amount || ""}
              onChange={(e) => setForm((prev: any) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Payment Mode *</label>
              <select
                value={form.paymentMode}
                onChange={(e) => setForm((prev: any) => ({ ...prev, paymentMode: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="1">Cash</option>
                <option value="2">UPI / QR</option>
                <option value="3">Bank Transfer (NEFT/IMPS)</option>
                <option value="4">Cheque / DD</option>
                <option value="5">Debit / Credit Card</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={form.paymentDate}
                onChange={(e) => setForm((prev: any) => ({ ...prev, paymentDate: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Transaction Ref / UTR / Cheque No</label>
            <input
              type="text"
              placeholder="e.g. UTR12345678 or CHQ-00213"
              value={form.transactionReference}
              onChange={(e) => setForm((prev: any) => ({ ...prev, transactionReference: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Notes / Narration</label>
            <input
              type="text"
              placeholder="e.g. Part payment received via GooglePay"
              value={form.notes}
              onChange={(e) => setForm((prev: any) => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || form.amount <= 0}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-600/25 disabled:opacity-40"
            >
              {submitting ? "Recording..." : "Confirm & Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Issue Credit Note / Sales Return Modal ─────────────────────────────────
function IssueCreditNoteModal({
  open,
  invoice,
  submitting,
  returnReason,
  setReturnReason,
  restock,
  setRestock,
  notes,
  setNotes,
  items,
  setItems,
  onSubmit,
  onClose,
}: {
  open: boolean;
  invoice: SalesInvoiceDetails;
  submitting: boolean;
  returnReason: string;
  setReturnReason: (r: string) => void;
  restock: boolean;
  setRestock: (r: boolean) => void;
  notes: string;
  setNotes: (n: string) => void;
  items: Array<{
    itemId: string;
    itemName: string;
    itemSku: string;
    batchNumber?: string;
    maxQuantity: number;
    returnQuantity: number;
    unitPrice: number;
    gstRate: number;
    selected: boolean;
  }>;
  setItems: React.Dispatch<React.SetStateAction<any[]>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const totalReturnTaxable = items
    .filter((it) => it.selected && it.returnQuantity > 0)
    .reduce((sum, it) => sum + it.returnQuantity * it.unitPrice, 0);

  const totalReturnGst = items
    .filter((it) => it.selected && it.returnQuantity > 0)
    .reduce((sum, it) => sum + (it.returnQuantity * it.unitPrice * it.gstRate) / 100, 0);

  const totalCreditAmount = totalReturnTaxable + totalReturnGst;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl p-6 space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Issue GST Credit Note / Sales Return</h3>
              <p className="text-[11px] text-slate-400">Against Tax Invoice #{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer & Invoice Summary */}
        <div className="grid grid-cols-3 gap-2.5 bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Customer:</span>
            <strong className="text-white truncate block">{invoice.customerName}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Invoice Total:</span>
            <strong className="text-white font-mono">₹{invoice.totalAmount.toFixed(2)}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Credit Value:</span>
            <strong className="text-cyan-400 font-mono text-sm">₹{totalCreditAmount.toFixed(2)}</strong>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          {/* Reason & Restock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Return / Credit Reason *</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="GoodsReturned">Goods Returned by Customer</option>
                <option value="DamagedInTransit">Defective / Damaged Goods</option>
                <option value="PriceAdjustment">Post-Sale Price Difference / Discount</option>
                <option value="QuantityDifference">Shortage / Quantity Correction</option>
                <option value="OrderCancelled">Order Cancelled After Dispatch</option>
                <option value="Other">Other Adjustment</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="restock_check"
                checked={restock}
                onChange={(e) => setRestock(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700 focus:ring-cyan-500 cursor-pointer"
              />
              <label htmlFor="restock_check" className="text-slate-300 font-medium cursor-pointer">
                Restore returned items back into Warehouse Stock
              </label>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">
              Select Invoice Items &amp; Return Quantities:
            </label>
            <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={items.every((it) => it.selected)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setItems((prev) => prev.map((it) => ({ ...it, selected: checked })));
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="p-2">Item</th>
                    <th className="p-2 text-right">Inv Qty</th>
                    <th className="p-2 text-center w-24">Return Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                  {items.map((it, idx) => (
                    <tr key={idx} className={it.selected ? "bg-cyan-950/20" : ""}>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={it.selected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setItems((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, selected: checked } : item))
                            );
                          }}
                          className="rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-2">
                        <div className="font-semibold text-white truncate max-w-[180px]">{it.itemName}</div>
                        <div className="text-[9.5px] text-slate-500 font-mono">
                          {it.batchNumber ? `Batch: ${it.batchNumber}` : it.itemSku || "—"}
                        </div>
                      </td>
                      <td className="p-2 text-right font-mono text-slate-300">{it.maxQuantity}</td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={it.maxQuantity}
                          step="any"
                          value={it.returnQuantity}
                          disabled={!it.selected}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(it.maxQuantity, parseFloat(e.target.value) || 0));
                            setItems((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, returnQuantity: val } : item))
                            );
                          }}
                          className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-center disabled:opacity-30 focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                      <td className="p-2 text-right font-mono text-slate-300">₹{it.unitPrice.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono font-bold text-cyan-400">
                        ₹{(it.selected ? it.returnQuantity * it.unitPrice * (1 + it.gstRate / 100) : 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Narration / Credit Note Remarks</label>
            <input
              type="text"
              placeholder="e.g. Sales return received against Invoice and credit note issued to ledger"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || totalCreditAmount <= 0}
              className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-lg shadow-cyan-600/25 disabled:opacity-40"
            >
              {submitting ? "Issuing Credit Note..." : `Issue Credit Note (₹${totalCreditAmount.toFixed(2)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Toast notification ──────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "success" | "error" | "info" }) {
  const bg = type === "success" ? "bg-emerald-600" : type === "error" ? "bg-rose-600" : "bg-indigo-600";
  return (
    <div className={`fixed bottom-6 right-6 z-[60] flex items-center space-x-2 px-4 py-3 rounded-2xl shadow-2xl text-white text-xs font-semibold ${bg} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
      {type === "success" && <CheckCircle className="w-4 h-4" />}
      {type === "error" && <XCircle className="w-4 h-4" />}
      <span>{msg}</span>
    </div>
  );
}

// ─── Delivery Challan Document ───────────────────────────────────────────────
function generateDeliveryChallanHtml(invoice: SalesInvoiceDetails, profile: TenantDetails | null) {
  const sellerName = profile?.tradeName || profile?.businessName || invoice.branchName || "UDYOGBILL";
  const sellerAddress = profile?.addressLine1 ? `${profile.addressLine1}${profile.addressLine2 ? `, ${profile.addressLine2}` : ""}, ${profile.city || ""}, ${profile.state || ""} - ${profile.pincode || ""}` : (invoice.branchAddress || "");
  const sellerGstin = invoice.branchGstin || profile?.gstin || "";

  const itemsHtml = invoice.items.map((item, i) => `
    <tr style="border-bottom:1px solid #cbd5e1; font-size:10.5px;">
      <td style="padding:5px 6px; text-align:center; border-right:1px solid #cbd5e1;">${i + 1}</td>
      <td style="padding:5px 6px; border-right:1px solid #cbd5e1;"><b style="color:#0f172a;">${item.itemName}</b> ${item.itemSku ? `<span style="font-size:9px; color:#64748b;">(${item.itemSku})</span>` : ""}</td>
      <td style="padding:5px 6px; text-align:center; border-right:1px solid #cbd5e1; font-family:monospace;">${item.hsnCode || "—"}</td>
      <td style="padding:5px 6px; text-align:center; border-right:1px solid #cbd5e1; font-family:monospace;">${item.batchNumber || "—"}</td>
      <td style="padding:5px 6px; text-align:right; font-weight:700; border-right:1px solid #cbd5e1;">${item.quantity} ${item.uomCode}</td>
      <td style="padding:5px 6px; text-align:center; color:#64748b;">__________</td>
    </tr>`).join("");

  return `
    <div style="font-family:Arial,sans-serif; width:100%; min-height:138mm; display:flex; flex-direction:column; justify-content:space-between; border:2px solid #0f172a; background:#ffffff; color:#0f172a; padding:12px 16px; box-sizing:border-box;">
      <!-- Header -->
      <div style="flex-shrink:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0f172a; padding-bottom:6px; margin-bottom:6px;">
          <div>
            <h1 style="margin:0; font-size:19px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">${sellerName}</h1>
            <p style="margin:2px 0; font-size:10.5px; color:#334155;">${sellerAddress}</p>
            ${sellerGstin ? `<p style="margin:1px 0; font-size:10px; color:#334155;"><b>GSTIN:</b> ${sellerGstin}</p>` : ""}
          </div>
          <div style="text-align:right;">
            <div style="border:2px solid #0f172a; display:inline-block; padding:3px 14px; background:#f8fafc; font-size:13px; font-weight:900; letter-spacing:0.5px;">DELIVERY CHALLAN</div>
            <div style="font-size:9px; color:#64748b; margin-top:2px;">(CGST Rule 55 - Non-Tax Supply Movement)</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:11px; margin-bottom:6px; border-bottom:1px solid #0f172a; padding-bottom:6px;">
          <div>
            <div><b>Challan No:</b> <span style="font-weight:700; font-family:monospace; font-size:12px;">DC-${invoice.invoiceNumber}</span></div>
            <div><b>Ref Invoice:</b> ${invoice.invoiceNumber} | <b>Date:</b> ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</div>
          </div>
          <div>
            <div><b>Deliver To:</b> <strong style="font-size:12px; color:#0f172a;">${invoice.customerName}</strong></div>
            <div style="font-size:10px; color:#475569;">${invoice.shippingAddress || invoice.billingAddress || ""}</div>
          </div>
        </div>
      </div>

      <!-- Line Items Table (All items show dynamically) -->
      <div style="flex:1; display:flex; flex-direction:column; margin-bottom:12px;">
        <table style="width:100%; border-collapse:collapse; font-size:10.5px; border-bottom:1.5px solid #0f172a;">
          <thead style="background:#f1f5f9;">
            <tr style="text-transform:uppercase; font-size:9.5px; border-bottom:1.5px solid #0f172a;">
              <th style="padding:5px 6px; border-right:1px solid #cbd5e1; width:28px;">#</th>
              <th style="padding:5px 6px; border-right:1px solid #cbd5e1; text-align:left;">Item / Description</th>
              <th style="padding:5px 6px; border-right:1px solid #cbd5e1; width:70px; text-align:center;">HSN</th>
              <th style="padding:5px 6px; border-right:1px solid #cbd5e1; width:70px; text-align:center;">Batch</th>
              <th style="padding:5px 6px; border-right:1px solid #cbd5e1; width:80px; text-align:right;">Qty Sent</th>
              <th style="padding:5px 6px; width:75px; text-align:center;">Verified Qty</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <!-- Footer Signatures -->
      <div style="flex-shrink:0; margin-top:auto; padding-top:12px;">
        <div style="display:flex; justify-content:space-between; font-size:10.5px;">
          <div style="text-align:center; width:220px; border-top:1.5px solid #0f172a; padding-top:4px;">
            <strong>Receiver's Signature &amp; Stamp</strong>
          </div>
          <div style="text-align:center; width:220px; border-top:1.5px solid #0f172a; padding-top:4px;">
            For <strong>${sellerName}</strong><br/><span style="font-size:9.5px; color:#475569;">Authorized Signatory</span>
          </div>
        </div>
      </div>
    </div>`;
}

function generateGatePassHtml(invoice: SalesInvoiceDetails, profile: TenantDetails | null) {
  const sellerName = profile?.tradeName || profile?.businessName || invoice.branchName || "UDYOGBILL";
  const sellerAddress = profile?.addressLine1 ? `${profile.addressLine1}, ${profile.city || ""}` : (invoice.branchAddress || "");

  const itemsHtml = invoice.items.map((item, i) => `
    <tr style="border-bottom:1px solid #fecaca; font-size:10.5px;">
      <td style="padding:5px 6px; text-align:center; border-right:1px solid #fca5a5;">${i + 1}</td>
      <td style="padding:5px 6px; font-weight:600; border-right:1px solid #fca5a5;">${item.itemName}</td>
      <td style="padding:5px 6px; text-align:center; font-weight:700; border-right:1px solid #fca5a5;">${item.quantity} ${item.uomCode}</td>
      <td style="padding:5px 6px; font-family:monospace; color:#334155;">${item.itemSku || "—"}</td>
    </tr>`).join("");

  return `
    <div style="font-family:Arial,sans-serif; width:100%; min-height:138mm; display:flex; flex-direction:column; justify-content:space-between; border:2px solid #dc2626; background:#ffffff; color:#0f172a; padding:12px 16px; box-sizing:border-box;">
      <div style="flex-shrink:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #dc2626; padding-bottom:6px; margin-bottom:6px;">
          <div>
            <h1 style="margin:0; font-size:19px; font-weight:900; color:#0f172a; text-transform:uppercase;">${sellerName}</h1>
            <p style="margin:2px 0; font-size:10.5px; color:#475569;">${sellerAddress}</p>
          </div>
          <div style="text-align:right;">
            <div style="background:#fee2e2; border:2px solid #dc2626; color:#991b1b; padding:3px 14px; font-size:13px; font-weight:900; letter-spacing:1px;">GATE PASS (OUTWARD)</div>
            <div style="font-size:9px; color:#dc2626; margin-top:2px;">Security Clearance Pass</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:11px; margin-bottom:6px; border-bottom:1px solid #fca5a5; padding-bottom:6px;">
          <div>
            <div><b>Gate Pass #:</b> <span style="font-family:monospace; font-weight:700; font-size:12px;">GP-${invoice.invoiceNumber}</span></div>
            <div><b>Invoice Ref:</b> ${invoice.invoiceNumber} | <b>Date:</b> ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</div>
            <div><b>Consignee:</b> <strong>${invoice.customerName}</strong></div>
          </div>
          <div>
            <div><b>Vehicle No:</b> ____________________</div>
            <div><b>Driver Name:</b> ____________________</div>
            <div><b>Dispatch Time:</b> ____________________</div>
          </div>
        </div>
      </div>

      <div style="flex:1; display:flex; flex-direction:column; margin-bottom:12px;">
        <table style="width:100%; border-collapse:collapse; font-size:10.5px; border-bottom:1.5px solid #dc2626;">
          <thead style="background:#fee2e2; color:#991b1b;">
            <tr style="text-transform:uppercase; font-size:9.5px; border-bottom:1.5px solid #fca5a5;">
              <th style="padding:5px 6px; border-right:1px solid #fca5a5; width:28px;">#</th>
              <th style="padding:5px 6px; border-right:1px solid #fca5a5; text-align:left;">Material Description</th>
              <th style="padding:5px 6px; border-right:1px solid #fca5a5; width:90px; text-align:center;">Quantity</th>
              <th style="padding:5px 6px; width:90px; text-align:center;">SKU / Code</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
      </div>

      <div style="flex-shrink:0; margin-top:auto; padding-top:12px;">
        <div style="display:flex; justify-content:space-between; font-size:10.5px;">
          <div style="text-align:center; width:160px; border-top:1.5px solid #dc2626; padding-top:4px;">
            Driver's Signature
          </div>
          <div style="text-align:center; width:160px; border-top:1.5px solid #dc2626; padding-top:4px;">
            Security Officer Stamp
          </div>
          <div style="text-align:center; width:160px; border-top:1.5px solid #dc2626; padding-top:4px;">
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>`;
}

function generatePackingSlipHtml(invoice: SalesInvoiceDetails, profile: TenantDetails | null) {
  const sellerName = profile?.tradeName || profile?.businessName || invoice.branchName || "UDYOGBILL";
  const totalQty = invoice.items.reduce((acc, it) => acc + it.quantity, 0);

  const itemsHtml = invoice.items.map((item, i) => `
    <tr style="border-bottom:1px solid #e2e8f0; font-size:10.5px;">
      <td style="padding:5px 6px; text-align:center; border-right:1px solid #e2e8f0;">${i + 1}</td>
      <td style="padding:5px 6px; border-right:1px solid #e2e8f0;"><b style="color:#0f172a;">${item.itemName}</b></td>
      <td style="padding:5px 6px; text-align:center; border-right:1px solid #e2e8f0; font-family:monospace;">${item.batchNumber || "—"}</td>
      <td style="padding:5px 6px; text-align:center; border-right:1px solid #e2e8f0;">${item.itemSku || "—"}</td>
      <td style="padding:5px 6px; text-align:right; font-weight:700; border-right:1px solid #e2e8f0;">${item.quantity} ${item.uomCode}</td>
      <td style="padding:5px 6px; text-align:center; color:#059669; font-weight:bold;">[  ]</td>
    </tr>`).join("");

  return `
    <div style="font-family:Arial,sans-serif; width:100%; min-height:138mm; display:flex; flex-direction:column; justify-content:space-between; border:2px solid #0f172a; background:#ffffff; color:#0f172a; padding:12px 16px; box-sizing:border-box;">
      <div style="flex-shrink:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0f172a; padding-bottom:6px; margin-bottom:6px;">
          <div>
            <h1 style="margin:0; font-size:19px; font-weight:900; color:#0f172a; text-transform:uppercase;">${sellerName}</h1>
            <p style="margin:2px 0; font-size:10.5px; color:#475569;">Warehouse Box Packing Verification Slip</p>
          </div>
          <div style="text-align:right;">
            <div style="border:2px solid #0f172a; display:inline-block; padding:3px 14px; background:#f8fafc; font-size:13px; font-weight:900;">PACKING SLIP</div>
            <div style="font-size:9.5px; font-weight:bold; margin-top:2px;">Total Items: ${invoice.items.length} | Qty: ${totalQty}</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:11px; margin-bottom:6px; border-bottom:1px solid #0f172a; padding-bottom:6px;">
          <div>
            <div><b>Invoice #:</b> <span style="font-family:monospace; font-weight:700; font-size:12px;">${invoice.invoiceNumber}</span> | <b>Date:</b> ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</div>
            <div><b>Customer:</b> <strong style="font-size:12px;">${invoice.customerName}</strong></div>
          </div>
          <div>
            <div><b>Box Count:</b> [ ____ Boxes ] | <b>Weight:</b> [ ____ KG ]</div>
            <div><b>Packing Inspector:</b> ____________________</div>
          </div>
        </div>
      </div>

      <div style="flex:1; display:flex; flex-direction:column; margin-bottom:12px;">
        <table style="width:100%; border-collapse:collapse; font-size:10.5px; border-bottom:1.5px solid #0f172a;">
          <thead style="background:#f1f5f9;">
            <tr style="text-transform:uppercase; font-size:9.5px; border-bottom:1.5px solid #cbd5e1;">
              <th style="padding:5px 6px; border-right:1px solid #cbd5e1; width:28px;">#</th>
              <th style="padding:5px 6px; border-right:1px solid #cbd5e1; text-align:left;">Item Name</th>
              <th style="padding:5px 6px; border-right:1px solid #cbd5e1; width:75px; text-align:center;">Batch</th>
              <th style="padding:5px 6px; border-right:1px solid #cbd5e1; width:75px; text-align:center;">SKU</th>
              <th style="padding:5px 6px; border-right:1px solid #cbd5e1; width:80px; text-align:right;">Quantity</th>
              <th style="padding:5px 6px; width:50px; text-align:center;">Check</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
      </div>

      <div style="flex-shrink:0; margin-top:auto; padding-top:12px;">
        <div style="display:flex; justify-content:space-between; font-size:10.5px;">
          <div style="text-align:center; width:220px; border-top:1.5px solid #0f172a; padding-top:4px;">
            Packed By (Sign &amp; Stamp)
          </div>
          <div style="text-align:center; width:220px; border-top:1.5px solid #0f172a; padding-top:4px;">
            Verified By (Dispatch Manager)
          </div>
        </div>
      </div>
    </div>`;
}

function generatePaymentReceiptVoucherHtml(
  invoice: SalesInvoiceDetails,
  payment: SalesInvoicePayment,
  profile: TenantDetails | null
) {
  const sellerName = profile?.tradeName || profile?.businessName || invoice.branchName || "UDYOGBILL";
  const sellerAddress = profile?.addressLine1 ? `${profile.addressLine1}, ${profile.city || ""}` : (invoice.branchAddress || "");

  return `
    <div style="font-family:Arial,sans-serif; width:100%; min-height:138mm; display:flex; flex-direction:column; justify-content:space-between; border:2px solid #059669; background:#ffffff; color:#0f172a; padding:12px 16px; box-sizing:border-box;">
      <div style="flex-shrink:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #059669; padding-bottom:6px; margin-bottom:8px;">
          <div>
            <h1 style="margin:0; font-size:19px; font-weight:900; color:#0f172a; text-transform:uppercase;">${sellerName}</h1>
            <p style="margin:2px 0; font-size:10.5px; color:#475569;">${sellerAddress}</p>
          </div>
          <div style="text-align:right;">
            <div style="background:#ecfdf5; border:2px solid #059669; color:#065f46; padding:3px 14px; font-size:13px; font-weight:900;">PAYMENT RECEIPT VOUCHER</div>
            <div style="font-size:9px; color:#059669; margin-top:2px;">Official Money Receipt</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:11px; margin-bottom:10px; background:#f8fafc; padding:8px 10px; border-radius:6px; border:1px solid #e2e8f0;">
          <div>
            <div><b>Receipt Voucher #:</b> <span style="font-family:monospace; font-weight:700; font-size:12px;">RCP-${payment.id.slice(0, 8).toUpperCase()}</span></div>
            <div><b>Payment Date:</b> ${new Date(payment.paymentDate).toLocaleDateString("en-IN")}</div>
            <div><b>Received From:</b> <strong style="font-size:13px; color:#0f172a;">${invoice.customerName}</strong></div>
          </div>
          <div>
            <div><b>Against Invoice #:</b> <span style="font-family:monospace; font-weight:700;">${invoice.invoiceNumber}</span></div>
            <div><b>Payment Mode:</b> <strong style="color:#059669;">${payment.paymentModeName || "Cash / UPI"}</strong></div>
            ${payment.transactionReference ? `<div><b>UTR / Ref No:</b> ${payment.transactionReference}</div>` : ""}
          </div>
        </div>
      </div>

      <div style="flex:1; display:flex; align-items:center; margin-bottom:12px;">
        <div style="width:100%; background:#ecfdf5; border:2px solid #059669; border-radius:8px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="font-size:11px; font-weight:bold; color:#065f46; text-transform:uppercase;">Amount Received:</span>
            <div style="font-size:24px; font-weight:900; color:#059669; font-family:monospace; margin-top:2px;">₹${payment.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </div>
          <div style="text-align:right; font-size:11.5px;">
            <div>Invoice Total: ₹${invoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <div style="margin-top:2px;">Balance Due: <strong style="color:${invoice.balanceAmount > 0 ? "#e11d48" : "#059669"}; font-size:13px;">₹${invoice.balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
          </div>
        </div>
      </div>

      <div style="flex-shrink:0; margin-top:auto; padding-top:12px;">
        <div style="display:flex; justify-content:space-between; font-size:10.5px;">
          <div style="font-size:9.5px; color:#64748b; max-width:350px;">
            This is an official computer-generated receipt voucher. Thank you for your prompt payment!
          </div>
          <div style="text-align:center; width:220px; border-top:1.5px solid #059669; padding-top:4px;">
            For <strong>${sellerName}</strong><br/><span style="font-size:9.5px; color:#64748b;">Authorized Cashier / Accountant</span>
          </div>
        </div>
      </div>
    </div>`;
}

function generateCashMemoA5Html(
  invoice: SalesInvoiceDetails,
  profile: TenantDetails | null,
  upiQr: UpiQrPayload | null
): string {
  const sellerName = profile?.tradeName || profile?.businessName || invoice.branchName || "UDYOGBILL";
  const sellerAddress = profile?.addressLine1 ? `${profile.addressLine1}${profile.addressLine2 ? `, ${profile.addressLine2}` : ""}, ${profile.city || ""}, ${profile.state || ""} - ${profile.pincode || ""}` : (invoice.branchAddress || "");
  const sellerGstin = invoice.branchGstin || profile?.gstin || "";
  const totalGst = invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount;

  const rowsHtml = invoice.items.map((item, idx) => {
    let expStr = "—";
    if (item.expiryDate) {
      const d = new Date(item.expiryDate);
      expStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
    }

    return `
      <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10px;">
        <td style="padding: 4px 6px; text-align: center; border-right: 1px solid #cbd5e1;">${idx + 1}</td>
        <td style="padding: 4px 6px; font-weight: 700; border-right: 1px solid #cbd5e1; color: #0f172a;">
          ${item.itemName}
        </td>
        <td style="padding: 4px 6px; text-align: center; border-right: 1px solid #cbd5e1; font-family: monospace;">${item.hsnCode || "—"}</td>
        <td style="padding: 4px 6px; text-align: center; border-right: 1px solid #cbd5e1; font-family: monospace; font-weight: 600;">${item.batchNumber || "—"}</td>
        <td style="padding: 4px 6px; text-align: center; border-right: 1px solid #cbd5e1; font-family: monospace;">${expStr}</td>
        <td style="padding: 4px 6px; text-align: right; border-right: 1px solid #cbd5e1; font-weight: 700;">${item.quantity} ${item.uomCode || ""}</td>
        <td style="padding: 4px 6px; text-align: right; border-right: 1px solid #cbd5e1; font-family: monospace;">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 4px 6px; text-align: right; border-right: 1px solid #cbd5e1; font-family: monospace;">${item.discountPercent > 0 ? `${item.discountPercent}%` : "—"}</td>
        <td style="padding: 4px 6px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">₹${item.totalAmount.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  const cancelledBanner = invoice.isCancelled
    ? `<div style="background-color:#fee2e2; border:2px solid #ef4444; border-radius:4px; padding:6px 10px; margin-bottom:6px; text-align:center; color:#991b1b;">
        <div style="font-size:12px; font-weight:900; letter-spacing:1px;">&#10006; CANCELLED / VOID MEMO</div>
        <div style="font-size:9px; font-weight:bold; color:#b91c1c;">${invoice.cancellationReason ? `Reason: ${invoice.cancellationReason}` : "Invoice has been voided"}</div>
      </div>`
    : "";

  const creditNoteBanner = !invoice.isCancelled && invoice.hasCreditNote
    ? `<div style="background-color:#fef3c7; border:2px solid #f59e0b; border-radius:4px; padding:6px 10px; margin-bottom:6px; text-align:center; color:#92400e;">
        <div style="font-size:11.5px; font-weight:900;">&#9888; CREDIT NOTE ISSUED / GOODS RETURNED</div>
        <div style="font-size:9px; font-weight:bold; color:#78350f;">CN #: ${invoice.creditNoteNumber || ""} &bull; Return Total: ₹${(invoice.creditNoteAmount || 0).toFixed(2)}</div>
      </div>`
    : "";

  const watermarkHtml = invoice.isCancelled
    ? `<div style="position:absolute; top:40%; left:50%; transform:translate(-50%, -50%) rotate(-30deg); font-size:48px; font-weight:900; color:rgba(239, 68, 68, 0.20); border:4px solid rgba(239, 68, 68, 0.25); padding:8px 30px; border-radius:8px; pointer-events:none; z-index:9999; text-transform:uppercase;">CANCELLED</div>`
    : invoice.hasCreditNote
    ? `<div style="position:absolute; top:40%; left:50%; transform:translate(-50%, -50%) rotate(-30deg); font-size:36px; font-weight:900; color:rgba(217, 119, 6, 0.20); border:4px solid rgba(217, 119, 6, 0.25); padding:6px 20px; border-radius:8px; pointer-events:none; z-index:9999; text-transform:uppercase;">CREDIT NOTE</div>`
    : "";

  return `
    <div style="position:relative; font-family:Arial,sans-serif; width:100%; min-height:138mm; display:flex; flex-direction:column; justify-content:space-between; border:2px solid #0f172a; background:#ffffff; color:#0f172a; padding:12px 16px; box-sizing:border-box;">
      ${watermarkHtml}
      <div style="flex-shrink:0;">
        ${cancelledBanner}
        ${creditNoteBanner}
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-bottom:6px;">
          <div>
            <div style="font-size:18px; font-weight:900; color:#0f172a; text-transform:uppercase;">${sellerName}</div>
            <div style="font-size:10px; color:#475569;">${sellerAddress}</div>
            ${sellerGstin ? `<div style="font-size:9.5px; font-weight:bold;">GSTIN: ${sellerGstin}</div>` : ""}
          </div>
          <div style="text-align:right;">
            <div style="background:#0f172a; color:#fff; font-size:13px; font-weight:900; padding:3px 12px; border-radius:3px;">RETAIL CASH MEMO</div>
            <div style="font-size:10px; font-weight:bold; margin-top:2px;">Memo #: ${invoice.invoiceNumber}</div>
            <div style="font-size:9.5px; color:#475569;">Date: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:10.5px; background:#f8fafc; padding:4px 8px; border:1px solid #cbd5e1; border-radius:4px; margin-bottom:6px;">
          <div>Customer: <strong>${invoice.customerName}</strong> ${invoice.customerPhone ? `| Ph: ${invoice.customerPhone}` : ""}</div>
          <div>Payment: <strong>Cash / UPI</strong></div>
        </div>
      </div>

      <div style="flex:1; display:flex; flex-direction:column; margin-bottom:12px;">
        <table style="width:100%; border-collapse:collapse; font-size:10px; border-bottom:1.5px solid #0f172a;">
          <thead style="background:#f1f5f9;">
            <tr style="text-transform:uppercase; font-size:9px; border-bottom:1.5px solid #0f172a;">
              <th style="padding:4px; width:24px; border-right:1px solid #cbd5e1;">#</th>
              <th style="padding:4px; text-align:left; border-right:1px solid #cbd5e1;">Item Name</th>
              <th style="padding:4px; width:55px; text-align:center; border-right:1px solid #cbd5e1;">HSN</th>
              <th style="padding:4px; width:60px; text-align:center; border-right:1px solid #cbd5e1;">Batch</th>
              <th style="padding:4px; width:45px; text-align:center; border-right:1px solid #cbd5e1;">Exp</th>
              <th style="padding:4px; width:55px; text-align:right; border-right:1px solid #cbd5e1;">Qty</th>
              <th style="padding:4px; width:60px; text-align:right; border-right:1px solid #cbd5e1;">Rate</th>
              <th style="padding:4px; width:45px; text-align:right; border-right:1px solid #cbd5e1;">Disc%</th>
              <th style="padding:4px; width:75px; text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>

      <div style="flex-shrink:0; margin-top:auto; padding-top:6px; border-top:1.5px solid #0f172a;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:9px; color:#64748b;">
            Taxable: ₹${invoice.taxableAmount.toFixed(2)} | GST: ₹${totalGst.toFixed(2)}<br/>
            Thank you for your visit! Goods once sold are not returnable.
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px; font-weight:900; color:#0f172a; font-family:monospace;">
              NET PAYABLE: ₹${invoice.totalAmount.toFixed(2)}
            </div>
            <div style="font-size:8.5px; color:#64748b; margin-top:1px;">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>`;
}

function generateProformaInvoiceHtml(
  invoice: SalesInvoiceDetails,
  profile: TenantDetails | null,
  upiQr: UpiQrPayload | null
): string {
  const sellerName = profile?.tradeName || profile?.businessName || invoice.branchName || "UDYOGBILL";
  const sellerAddress = profile?.addressLine1 ? `${profile.addressLine1}${profile.addressLine2 ? `, ${profile.addressLine2}` : ""}, ${profile.city || ""}, ${profile.state || ""} - ${profile.pincode || ""}` : (invoice.branchAddress || "");
  const sellerGstin = invoice.branchGstin || profile?.gstin || "";
  const totalGst = invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount;

  const rowsHtml = invoice.items.map((item, idx) => {
    let expStr = "—";
    if (item.expiryDate) {
      const d = new Date(item.expiryDate);
      expStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
    }

    return `
      <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10px;">
        <td style="padding: 5px 6px; text-align: center; border-right: 1px solid #cbd5e1;">${idx + 1}</td>
        <td style="padding: 5px 6px; font-weight: 700; border-right: 1px solid #cbd5e1; color: #0f172a;">
          ${item.itemName} ${item.itemSku ? `<span style="font-size:8.5px; color:#64748b;">(${item.itemSku})</span>` : ""}
        </td>
        <td style="padding: 5px 6px; text-align: center; border-right: 1px solid #cbd5e1; font-family: monospace;">${item.hsnCode || "—"}</td>
        <td style="padding: 5px 6px; text-align: center; border-right: 1px solid #cbd5e1; font-family: monospace;">${item.batchNumber || "—"}</td>
        <td style="padding: 5px 6px; text-align: right; border-right: 1px solid #cbd5e1; font-weight: 700;">${item.quantity} ${item.uomCode || ""}</td>
        <td style="padding: 5px 6px; text-align: right; border-right: 1px solid #cbd5e1; font-family: monospace;">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 5px 6px; text-align: right; border-right: 1px solid #cbd5e1; font-family: monospace;">${item.discountPercent > 0 ? `${item.discountPercent}%` : "—"}</td>
        <td style="padding: 5px 6px; text-align: right; border-right: 1px solid #cbd5e1; font-family: monospace;">₹${item.taxableAmount.toFixed(2)}</td>
        <td style="padding: 5px 6px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">₹${item.totalAmount.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  return `
    <div style="font-family:Arial,sans-serif; width:100%; min-height:140mm; display:flex; flex-direction:column; justify-content:space-between; border:2px solid #7c3aed; background:#ffffff; color:#0f172a; padding:14px 18px; box-sizing:border-box;">
      <div style="flex-shrink:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #7c3aed; padding-bottom:6px; margin-bottom:8px;">
          <div>
            <div style="font-size:20px; font-weight:900; color:#0f172a; text-transform:uppercase;">${sellerName}</div>
            <div style="font-size:10.5px; color:#475569;">${sellerAddress}</div>
            ${sellerGstin ? `<div style="font-size:10px; font-weight:bold; margin-top:2px;">GSTIN: ${sellerGstin}</div>` : ""}
          </div>
          <div style="text-align:right;">
            <div style="background:#7c3aed; color:#fff; font-size:13px; font-weight:900; padding:4px 14px; border-radius:4px; letter-spacing:0.5px;">PROFORMA INVOICE</div>
            <div style="font-size:10.5px; font-weight:bold; margin-top:3px;">PI Ref: PI-${invoice.invoiceNumber}</div>
            <div style="font-size:9.5px; color:#475569;">Date: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:11px; background:#f5f3ff; padding:8px 10px; border:1px solid #ddd6fe; border-radius:6px; margin-bottom:8px;">
          <div>
            <div style="font-size:9px; text-transform:uppercase; color:#6d28d9; font-weight:bold;">Proforma Billed To:</div>
            <div style="font-size:12px; font-weight:bold; color:#0f172a;">${invoice.customerName}</div>
            ${invoice.customerPhone ? `<div style="color:#475569;">Phone: ${invoice.customerPhone}</div>` : ""}
            ${invoice.customerGSTIN ? `<div><b>GSTIN:</b> ${invoice.customerGSTIN}</div>` : ""}
          </div>
          <div style="text-align:right;">
            <div><b>Original Invoice Ref:</b> ${invoice.invoiceNumber}</div>
            <div><b>Terms:</b> Advance / Confirmed Order</div>
            <div><b>Valid Until:</b> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "15 Days from Date"}</div>
          </div>
        </div>
      </div>

      <div style="flex:1; display:flex; flex-direction:column; margin-bottom:12px;">
        <table style="width:100%; border-collapse:collapse; font-size:10px; border-bottom:1.5px solid #7c3aed;">
          <thead style="background:#f5f3ff; color:#6d28d9;">
            <tr style="text-transform:uppercase; font-size:9px; border-bottom:1.5px solid #ddd6fe;">
              <th style="padding:5px 4px; width:24px; border-right:1px solid #ddd6fe;">#</th>
              <th style="padding:5px 6px; text-align:left; border-right:1px solid #ddd6fe;">Item Description</th>
              <th style="padding:5px 4px; width:55px; text-align:center; border-right:1px solid #ddd6fe;">HSN</th>
              <th style="padding:5px 4px; width:60px; text-align:center; border-right:1px solid #ddd6fe;">Batch</th>
              <th style="padding:5px 4px; width:55px; text-align:right; border-right:1px solid #ddd6fe;">Qty</th>
              <th style="padding:5px 4px; width:60px; text-align:right; border-right:1px solid #ddd6fe;">Rate</th>
              <th style="padding:5px 4px; width:45px; text-align:right; border-right:1px solid #ddd6fe;">Disc%</th>
              <th style="padding:5px 4px; width:65px; text-align:right; border-right:1px solid #ddd6fe;">Taxable</th>
              <th style="padding:5px 6px; width:75px; text-align:right;">Total (₹)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>

      <div style="flex-shrink:0; margin-top:auto; padding-top:8px; border-top:1.5px solid #7c3aed;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:9.5px; color:#64748b; max-width:380px;">
            <b>Note:</b> This is a Proforma Invoice, not a Tax Invoice. Supplies will be dispatched upon confirmation/payment.<br/>
            ${profile?.bankAccountNumber ? `<b>Bank:</b> ${profile.bankName || ""} | <b>A/c:</b> ${profile.bankAccountNumber} | <b>IFSC:</b> ${profile.bankIfsc || ""}` : ""}
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px; color:#64748b;">Subtotal: ₹${invoice.taxableAmount.toFixed(2)} | GST: ₹${totalGst.toFixed(2)}</div>
            <div style="font-size:18px; font-weight:900; color:#7c3aed; font-family:monospace; margin-top:2px;">
              PROFORMA TOTAL: ₹${invoice.totalAmount.toFixed(2)}
            </div>
            <div style="font-size:8.5px; color:#64748b; margin-top:2px;">Authorized Signatory (${sellerName})</div>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SalesInvoiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;
  const router = useRouter();
  const { isAddonActive } = useAddons();
  const hasPharma = isAddonActive("pharma");
  const hasManufacturing = isAddonActive("manufacturing");
  const hasGarments = isAddonActive("garments");

  const [invoice, setInvoice] = useState<SalesInvoiceDetails | null>(null);
  const [profile, setProfile] = useState<TenantDetails | null>(null);
  const [upiQr, setUpiQr] = useState<UpiQrPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [printFormat, setPrintFormat] = useState<PrintFormat>("a4");
  const [activeDoc, setActiveDoc] = useState<DocumentType>("invoice");

  // Load persistent default template preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("udyogbill_default_print_format") as PrintFormat;
      if (saved && ["a4", "compact_a5", "thermal80", "thermal58"].includes(saved)) {
        setPrintFormat(saved);
      }
    }
  }, []);

  const handleFormatChange = (fmt: PrintFormat) => {
    setPrintFormat(fmt);
    if (typeof window !== "undefined") {
      localStorage.setItem("udyogbill_default_print_format", fmt);
    }
  };

  // Modal & toast state
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<SalesInvoicePayment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMode: 1,
    paymentDate: new Date().toISOString().split("T")[0],
    transactionReference: "",
    notes: "",
  });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [dynamicInvoiceHtml, setDynamicInvoiceHtml] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [availableTemplates, setAvailableTemplates] = useState<PrintTemplate[]>([]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Credit Note Modal State
  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false);
  const [issuingCreditNote, setIssuingCreditNote] = useState(false);
  const [creditReturnReason, setCreditReturnReason] = useState("GoodsReturned");
  const [creditRestock, setCreditRestock] = useState(true);
  const [creditNotes, setCreditNotes] = useState("");
  const [creditItems, setCreditItems] = useState<any[]>([]);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    if (paymentForm.amount <= 0) {
      showToast("Amount must be greater than zero.", "error");
      return;
    }
    try {
      setRecordingPayment(true);
      await salesService.recordPayment(invoice.id, {
        invoiceId: invoice.id,
        amount: paymentForm.amount,
        paymentMode: paymentForm.paymentMode,
        paymentDate: new Date(paymentForm.paymentDate).toISOString(),
        transactionReference: paymentForm.transactionReference.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      });
      showToast("Payment recorded successfully!", "success");
      setRecordPaymentModalOpen(false);
      await loadData();
      setActiveDoc("receipt");
    } catch (err: any) {
      showToast(err?.response?.data?.errorMessage || err?.response?.data?.message || err.message || "Failed to record payment.", "error");
    } finally {
      setRecordingPayment(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [inv, prof, upi, tpls] = await Promise.all([
        salesService.getInvoiceById(invoiceId),
        tenantAppService.getBusinessProfile(),
        barcodeService.getInvoiceUpiQr(invoiceId).catch(() => null),
        printTemplateService.getTemplates().catch(() => []),
      ]);
      setInvoice(inv);
      setProfile(prof);
      setUpiQr(upi);
      setAvailableTemplates(tpls || []);

      const preview = await printTemplateService.renderPreview({
        invoiceId,
        documentType: printFormat === "compact_a5" ? 2 : 1,
      }).catch(() => null);

      if (preview?.renderedHtml) {
        setDynamicInvoiceHtml(preview.renderedHtml);
      }
    } catch (err) {
      console.error("Failed to load invoice details", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = async (tplId: string) => {
    setSelectedTemplateId(tplId);
    if (!invoiceId) return;
    try {
      const preview = await printTemplateService.renderPreview({
        invoiceId,
        templateId: tplId || undefined,
        documentType: printFormat === "compact_a5" ? 2 : 1,
      });
      if (preview?.renderedHtml) {
        setDynamicInvoiceHtml(preview.renderedHtml);
      }
    } catch (e) {
      console.error("Failed to switch template", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [invoiceId]);

  // Close more-menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Action Handlers ─────────────────────────────────────────────────────
  const handlePrintCashMemoA5 = async () => {
    if (!invoice) return;
    try {
      const preview = await printTemplateService.renderPreview({
        invoiceId: invoice.id,
        templateId: selectedTemplateId || undefined,
        documentType: 2 // Cash Memo
      });
      printRawHtml(preview.renderedHtml, `Cash_Memo_${invoice.invoiceNumber}`, "A5 landscape", "4mm");
    } catch {
      const html = generateCashMemoA5Html(invoice, profile, upiQr);
      printRawHtml(html, `Cash_Memo_${invoice.invoiceNumber}`, "A5 landscape", "4mm");
    }
  };

  const handlePrint = async () => {
    if (!invoice) return;
    let html = "";
    if (activeDoc === "challan") {
      html = generateDeliveryChallanHtml(invoice, profile);
      printRawHtml(html, `Delivery Challan — ${invoice.invoiceNumber}`, "A5 landscape", "4mm");
    } else if (activeDoc === "gatepass") {
      html = generateGatePassHtml(invoice, profile);
      printRawHtml(html, `Gate Pass — ${invoice.invoiceNumber}`, "A5 landscape", "4mm");
    } else if (activeDoc === "packingslip") {
      html = generatePackingSlipHtml(invoice, profile);
      printRawHtml(html, `Packing Slip — ${invoice.invoiceNumber}`, "A5 landscape", "4mm");
    } else if (activeDoc === "receipt") {
      const pmt = selectedPaymentForReceipt || (invoice.payments && invoice.payments.length > 0 ? invoice.payments[invoice.payments.length - 1] : null);
      if (pmt) {
        html = generatePaymentReceiptVoucherHtml(invoice, pmt, profile);
        printRawHtml(html, `Payment Receipt — ${invoice.invoiceNumber}`, "A5 landscape", "4mm");
      } else {
        showToast("No payment record available to print.", "error");
      }
    } else if (activeDoc === "proforma") {
      html = generateProformaInvoiceHtml(invoice, profile, upiQr);
      printRawHtml(html, `Proforma_Invoice_${invoice.invoiceNumber}`, "A4 portrait", "6mm");
    } else if (printFormat === "compact_a5") {
      await handlePrintCashMemoA5();
    } else {
      try {
        const preview = await printTemplateService.renderPreview({
          invoiceId: invoice.id,
          templateId: selectedTemplateId || undefined,
          documentType: 1 // Tax Invoice
        });
        printRawHtml(preview.renderedHtml, `Invoice_${invoice.invoiceNumber}`, "A4 portrait", "6mm");
      } catch {
        window.print();
      }
    }
  };

  const handleOpenCreditNoteModal = () => {
    if (!invoice) return;
    const initialItems = invoice.items.map((it) => ({
      itemId: it.itemId,
      itemName: it.itemName,
      itemSku: it.itemSku || "",
      batchId: it.batchId || undefined,
      batchNumber: it.batchNumber || "",
      maxQuantity: it.quantity,
      returnQuantity: it.quantity,
      unitPrice: it.unitPrice,
      gstRate: it.gstRate || (it.taxableAmount > 0 ? ((it.cgstAmount + it.sgstAmount + it.igstAmount) / it.taxableAmount) * 100 : 0),
      selected: true,
    }));
    setCreditItems(initialItems);
    setCreditReturnReason("GoodsReturned");
    setCreditRestock(true);
    setCreditNotes(`Credit note against Tax Invoice #${invoice.invoiceNumber}`);
    setCreditNoteModalOpen(true);
  };

  const handleCreditNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    const selectedLines = creditItems.filter((it) => it.selected && it.returnQuantity > 0);
    if (selectedLines.length === 0) {
      showToast("Select at least one item with return quantity > 0.", "error");
      return;
    }

    try {
      setIssuingCreditNote(true);
      await salesService.createSalesReturn({
        originalSalesInvoiceId: invoice.id,
        originalInvoiceNumber: invoice.invoiceNumber,
        partyId: invoice.partyId || "00000000-0000-0000-0000-000000000000",
        customerName: invoice.customerName || "Walk-in Customer",
        branchId: invoice.branchId || "00000000-0000-0000-0000-000000000000",
        warehouseId: invoice.warehouseId || "00000000-0000-0000-0000-000000000000",
        returnReason: creditReturnReason,
        restockToWarehouse: creditRestock,
        notes: creditNotes,
        items: selectedLines.map((l) => ({
          itemId: l.itemId,
          itemName: l.itemName,
          itemSku: l.itemSku,
          batchId: l.batchId,
          batchNumber: l.batchNumber || undefined,
          returnQuantity: l.returnQuantity,
          unitPrice: l.unitPrice,
          gstRate: l.gstRate,
        })),
      });

      showToast("Credit Note & Sales Return issued successfully! Opening Credit Note register...", "success");
      setCreditNoteModalOpen(false);
      setTimeout(() => {
        router.push("/app/sales/returns");
      }, 700);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || err?.response?.data?.message || err?.response?.data?.title || err.message || "Failed to issue credit note.";
      alert(`Credit Note Issue Error: ${msg}`);
      showToast(msg, "error");
    } finally {
      setIssuingCreditNote(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!invoice) return;
    const merchantName = profile?.tradeName || profile?.businessName || "UdyogBill";
    const upiId = (profile as any)?.upiId || profile?.bankAccountNumber ? `${(profile as any)?.upiId || "merchant@upi"}` : "";
    const upiDeepLink = upiId
      ? `\n\n*Click to Pay via UPI (GPay/PhonePe):*\nupi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${invoice.balanceAmount > 0 ? invoice.balanceAmount.toFixed(2) : invoice.totalAmount.toFixed(2)}&tn=Inv_${invoice.invoiceNumber}`
      : "";

    const msg = encodeURIComponent(
      `Dear ${invoice.customerName},\n\nYour Tax Invoice *${invoice.invoiceNumber}* for ₹${invoice.totalAmount.toFixed(2)} has been issued by ${merchantName}.\n\nBalance Due: *₹${invoice.balanceAmount.toFixed(2)}*\nDue Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "Immediate"}${upiDeepLink}\n\nThank you for your business!\n\n— ${merchantName}`
    );
    const phone = invoice.customerPhone?.replace(/\D/g, "") || "";
    const url = phone
      ? `https://wa.me/91${phone}?text=${msg}`
      : `https://web.whatsapp.com/send?text=${msg}`;
    window.open(url, "_blank");
  };

  const handleSendEmail = () => {
    if (!invoice) return;
    const subject = encodeURIComponent(`Tax Invoice ${invoice.invoiceNumber} — ${profile?.businessName}`);
    const body = encodeURIComponent(
      `Dear ${invoice.customerName},\n\nPlease find your Tax Invoice ${invoice.invoiceNumber} for ₹${invoice.totalAmount.toFixed(2)}.\n\nAmount Paid: ₹${invoice.paidAmount.toFixed(2)}\nBalance Due: ₹${invoice.balanceAmount.toFixed(2)}\n\nThank you for your business.\n\n${profile?.businessName}`
    );
    const email = invoice.customerEmail || "";
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handlePaymentReminder = () => {
    if (!invoice) return;
    const merchantName = profile?.tradeName || profile?.businessName || "UdyogBill";
    const upiId = (profile as any)?.upiId || profile?.bankAccountNumber ? `${(profile as any)?.upiId || "merchant@upi"}` : "";
    const upiDeepLink = upiId
      ? `\n\n*Pay Now via UPI (GPay/PhonePe):*\nupi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${invoice.balanceAmount.toFixed(2)}&tn=Reminder_${invoice.invoiceNumber}`
      : "";

    const msg = encodeURIComponent(
      `Dear ${invoice.customerName},\n\n*PAYMENT REMINDER*\n\nThis is a friendly reminder for your outstanding invoice:\n\nInvoice: *${invoice.invoiceNumber}*\nTotal Amount: ₹${invoice.totalAmount.toFixed(2)}\n*Balance Due: ₹${invoice.balanceAmount.toFixed(2)}*\nDue Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "Please pay immediately"}${upiDeepLink}\n\nPlease arrange payment at the earliest.\n\n— ${merchantName}`
    );
    const phone = invoice.customerPhone?.replace(/\D/g, "") || "";
    const url = phone
      ? `https://wa.me/91${phone}?text=${msg}`
      : `https://web.whatsapp.com/send?text=${msg}`;
    window.open(url, "_blank");
  };

  const handleCopyInvoiceLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Invoice link copied to clipboard!", "success");
  };

  const handleCancelInvoice = async (reason?: string) => {
    if (!reason?.trim()) return;
    try {
      setCancelling(true);
      await salesService.cancelInvoice(invoiceId, reason);
      showToast("Invoice cancelled successfully.", "success");
      setCancelModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.errorMessage || "Failed to cancel invoice.", "error");
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadChallan = () => {
    if (!invoice) return;
    const html = generateDeliveryChallanHtml(invoice, profile);
    const blob = new Blob([`<!DOCTYPE html><html><head><title>Delivery Challan</title></head><body>${html}</body></html>`], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DeliveryChallan-${invoice.invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Delivery Challan downloaded!", "success");
  };

  if (loading || !invoice) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center text-slate-400 text-xs">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Loading Tax Invoice #{invoiceId}...
      </div>
    );
  }

  const isIntraState = invoice.taxSupplyType === 1;
  const isCancelled = invoice.isCancelled;
  const isFullyPaid = invoice.paymentStatus === 3;
  const hasBalance = invoice.balanceAmount > 0;

  return (
    <>
      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Cancel modal */}
      <ConfirmModal
        open={cancelModal}
        title="Cancel This Invoice?"
        message={`Invoice ${invoice.invoiceNumber} will be permanently cancelled. This action cannot be undone and will reverse stock/ledger entries.`}
        confirmLabel={cancelling ? "Cancelling..." : "Yes, Cancel Invoice"}
        confirmClass="bg-rose-600 hover:bg-rose-500"
        onConfirm={handleCancelInvoice}
        onCancel={() => setCancelModal(false)}
        requireReason
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={recordPaymentModalOpen}
        invoice={invoice}
        submitting={recordingPayment}
        form={paymentForm}
        setForm={setPaymentForm}
        onSubmit={handleRecordPaymentSubmit}
        onClose={() => setRecordPaymentModalOpen(false)}
      />

      {/* Issue Credit Note / Sales Return Modal */}
      <IssueCreditNoteModal
        open={creditNoteModalOpen}
        invoice={invoice}
        submitting={issuingCreditNote}
        returnReason={creditReturnReason}
        setReturnReason={setCreditReturnReason}
        restock={creditRestock}
        setRestock={setCreditRestock}
        notes={creditNotes}
        setNotes={setCreditNotes}
        items={creditItems}
        setItems={setCreditItems}
        onSubmit={handleCreditNoteSubmit}
        onClose={() => setCreditNoteModalOpen(false)}
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        {/* ── Back + Status strip ── */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href="/app/sales/invoices"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Invoices</span>
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-mono">{invoice.invoiceNumber}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              isCancelled
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : isFullyPaid
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : invoice.paymentStatus === 2
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}>
              {isCancelled ? "CANCELLED" : isFullyPaid ? "FULLY PAID" : invoice.paymentStatus === 2 ? "PARTIALLY PAID" : "UNPAID"}
            </span>
          </div>
        </div>

        {/* Cancelled Banner Card */}
        {isCancelled && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start space-x-3 text-rose-300">
            <Ban className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-bold text-rose-400 uppercase tracking-wide">
                This Invoice Has Been Cancelled / Voided
              </div>
              <p className="text-xs text-rose-300/80">
                Cancellation Reason: <span className="font-semibold text-rose-200">{invoice.cancellationReason || "Voided"}</span>
                {invoice.cancelledAtUtc && (
                  <span> &bull; Cancelled on: {new Date(invoice.cancelledAtUtc).toLocaleString("en-IN")}</span>
                )}
              </p>
              <div className="text-[11px] text-rose-400/70 font-mono">
                Inventory has been restored and reversal voucher entries have been posted to General Ledger.
              </div>
            </div>
          </div>
        )}

        {/* Credit Note Issued / Sale Return Card */}
        {invoice.hasCreditNote && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-300">
            <div className="flex items-start space-x-3">
              <RotateCcw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-amber-400 uppercase tracking-wide flex items-center space-x-2">
                  <span>Sale Return Processed &bull; Credit Note Issued</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {invoice.creditNoteNumber}
                  </span>
                </div>
                <p className="text-xs text-amber-200/80">
                  Credit Note Return Total: <span className="font-bold text-amber-300 font-mono">₹{(invoice.creditNoteAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  {invoice.creditNoteDate && (
                    <span> &bull; Return Date: {new Date(invoice.creditNoteDate).toLocaleDateString("en-IN")}</span>
                  )}
                </p>
              </div>
            </div>
            <Link
              href="/app/sales/returns"
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 whitespace-nowrap transition flex items-center space-x-1.5"
            >
              <span>View Credit Notes</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PRIMARY ACTION TOOLBAR — The Heart of the Billing Software
        ══════════════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════
            PRIMARY ACTION TOOLBAR — The Heart of the Billing Software
        ══════════════════════════════════════════════════════════════ */}
        <div className="print:hidden bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xl space-y-4">
          {/* Row 1: Document type tabs + Print format */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Document Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 flex-1 overflow-x-auto gap-1 shadow-inner">
              {[
                { id: "invoice", label: "Tax Invoice", icon: Receipt, visible: true },
                { id: "proforma", label: "Proforma Invoice", icon: FileText, visible: true },
                { id: "challan", label: "Delivery Challan", icon: Truck, visible: hasManufacturing },
                { id: "gatepass", label: "Gate Pass", icon: Shield, visible: hasManufacturing },
                { id: "packingslip", label: "Packing Slip", icon: Package, visible: hasManufacturing },
                { id: "receipt", label: "Payment Receipt", icon: CreditCard, visible: true },
              ]
                .filter((d) => d.visible)
                .map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveDoc(id as DocumentType)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeDoc === id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Print Format — only relevant for invoice */}
            {activeDoc === "invoice" && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1 shadow-inner">
                {[
                  { id: "a4", label: "A4" },
                  { id: "compact_a5", label: "A5" },
                  { id: "thermal80", label: "80mm" },
                  { id: "thermal58", label: "58mm" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleFormatChange(id as PrintFormat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      printFormat === id
                        ? "bg-slate-900 dark:bg-slate-700 text-white shadow-sm font-black"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Template Selector — switch between Tally Prime, Marg, Sovereign Green, etc. */}
            {activeDoc === "invoice" && availableTemplates.length > 0 && (
              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Design:</span>
                <select
                  value={selectedTemplateId || availableTemplates.find(t => t.isDefault)?.id || ""}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-900 dark:text-white outline-none cursor-pointer pr-1"
                >
                  {availableTemplates.map((t) => (
                    <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium">
                      {t.templateName} {t.isDefault ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Row 2: All action buttons with Full HD Contrast */}
          <div className="flex flex-wrap gap-2">
            {/* 1. PRINT */}
            <button
              onClick={handlePrint}
              style={{ color: "#ffffff" }}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span className="text-white">
                {activeDoc === "invoice"
                  ? `Print Invoice (${printFormat === "a4" ? "A4" : printFormat === "compact_a5" ? "A5" : printFormat === "thermal80" ? "80mm" : "58mm"})`
                  : activeDoc === "challan"
                  ? "Print Delivery Challan"
                  : activeDoc === "gatepass"
                  ? "Print Gate Pass"
                  : activeDoc === "packingslip"
                  ? "Print Packing Slip"
                  : "Print Money Receipt Voucher"}
              </span>
            </button>

            {/* 1.1 PRINT CASH MEMO (A5) */}
            {activeDoc === "invoice" && (
              <button
                onClick={handlePrintCashMemoA5}
                style={{ color: "#ffffff" }}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
                title="Print Retail Cash Memo in A5 Format"
              >
                <Printer className="w-4 h-4 text-white" />
                <span className="text-white">Print Cash Memo (A5)</span>
              </button>
            )}

            {/* 1.5 RECORD PAYMENT */}
            {hasBalance && !isCancelled && (
              <button
                onClick={() => {
                  setPaymentForm({
                    amount: invoice.balanceAmount,
                    paymentMode: 1,
                    paymentDate: new Date().toISOString().split("T")[0],
                    transactionReference: "",
                    notes: `Payment against Inv #${invoice.invoiceNumber}`,
                  });
                  setRecordPaymentModalOpen(true);
                }}
                style={{ color: "#ffffff" }}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-white" />
                <span className="text-white">+ Record Payment</span>
              </button>
            )}

            {/* 2. SEND ON WHATSAPP */}
            <button
              onClick={handleSendWhatsApp}
              style={{ color: "#ffffff" }}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span className="text-white">WhatsApp</span>
            </button>

            {/* 3. SEND EMAIL */}
            <button
              onClick={handleSendEmail}
              style={{ color: "#ffffff" }}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4 text-white" />
              <span className="text-white">Email Invoice</span>
            </button>

            {/* 4. PAYMENT REMINDER */}
            {hasBalance && !isCancelled && (
              <button
                onClick={handlePaymentReminder}
                style={{ color: "#ffffff" }}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
              >
                <Bell className="w-4 h-4 text-white" />
                <span className="text-white">Payment Reminder</span>
              </button>
            )}

            {/* 5. DOWNLOAD CHALLAN */}
            <button
              onClick={handleDownloadChallan}
              style={{ color: "#ffffff" }}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-600 shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-white" />
              <span className="text-white">Download Challan</span>
            </button>

            {/* 6. COPY LINK */}
            <button
              onClick={handleCopyInvoiceLink}
              style={{ color: "#ffffff" }}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-600 shadow-md transition-all cursor-pointer"
            >
              <Copy className="w-4 h-4 text-white" />
              <span className="text-white">Copy Link</span>
            </button>

            {/* 7. CANCEL INVOICE (Direct action button) */}
            {!isCancelled && (
              <button
                onClick={() => setCancelModal(true)}
                style={{ color: "#ffffff" }}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-black shadow-lg shadow-rose-700/30 transition-all cursor-pointer"
                title="Cancel this invoice and reverse stock"
              >
                <Ban className="w-4 h-4 text-white" />
                <span className="text-white">Cancel Invoice</span>
              </button>
            )}

            {/* 7.5 ISSUE CREDIT NOTE / SALES RETURN */}
            {!isCancelled && (
              <button
                onClick={handleOpenCreditNoteModal}
                style={{ color: "#ffffff" }}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-black shadow-lg shadow-cyan-700/30 transition-all cursor-pointer"
                title="Issue Credit Note / Sales Return against this invoice"
              >
                <RotateCcw className="w-4 h-4 text-white" />
                <span className="text-white">Credit Note</span>
              </button>
            )}

            {/* 8. MORE (⋯) dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setMoreMenuOpen((v) => !v)}
                style={{ color: "#ffffff" }}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-600 shadow-md transition-all cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4 text-white" />
                <span className="text-white">More</span>
                <ChevronDown className="w-3.5 h-3.5 text-white" />
              </button>

              {moreMenuOpen && (
                <div className="absolute right-0 top-full mt-2 z-40 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-1.5 min-w-[220px] space-y-0.5">
                  {/* Edit Invoice */}
                  {!isCancelled && (
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        router.push(`/app/sales/invoices?editId=${invoice.id}`);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-indigo-400" />
                      <span>Edit Invoice</span>
                    </button>
                  )}

                  {/* Record Payment */}
                  {!isCancelled && hasBalance && (
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setPaymentForm({
                          amount: invoice.balanceAmount,
                          paymentMode: 1,
                          paymentDate: new Date().toISOString().split("T")[0],
                          transactionReference: "",
                          notes: `Payment against Inv #${invoice.invoiceNumber}`,
                        });
                        setRecordPaymentModalOpen(true);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span>Record Payment</span>
                    </button>
                  )}

                  {/* Proforma Invoice */}
                  <button
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setActiveDoc("proforma");
                      showToast("Proforma invoice generated & view activated!", "success");
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Generate Proforma</span>
                  </button>

                  {/* Sales Return / Credit Note */}
                  {!isCancelled ? (
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        handleOpenCreditNoteModal();
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 text-cyan-400" />
                      <span>Sales Return (Credit Note)</span>
                    </button>
                  ) : (
                    <div className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed">
                      <RotateCcw className="w-4 h-4 text-slate-600" />
                      <span>Sales Return (Invoice Cancelled)</span>
                    </div>
                  )}

                  {/* Send SMS */}
                  <button
                    onClick={() => {
                      setMoreMenuOpen(false);
                      const phone = invoice.customerPhone?.replace(/\D/g, "") || "";
                      if (!phone) {
                        showToast("Customer mobile number not found.", "error");
                        return;
                      }
                      const smsText = encodeURIComponent(
                        `Inv #${invoice.invoiceNumber} for Rs.${invoice.totalAmount.toFixed(2)} issued by ${profile?.businessName || "UdyogBill"}. Due: Rs.${invoice.balanceAmount.toFixed(2)}.`
                      );
                      window.open(`sms:${phone}?body=${smsText}`, "_self");
                      showToast(`SMS link triggered for ${phone}`, "success");
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-orange-400" />
                    <span>Send via SMS</span>
                  </button>

                  {/* Refresh */}
                  <button
                    onClick={() => { setMoreMenuOpen(false); loadData(); showToast("Invoice data refreshed", "info"); }}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                    <span>Refresh Invoice</span>
                  </button>

                  {/* Divider */}
                  <div className="border-t border-slate-800 my-1"></div>

                  {/* Cancel Invoice */}
                  {!isCancelled ? (
                    <button
                      onClick={() => { setMoreMenuOpen(false); setCancelModal(true); }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Cancel Invoice</span>
                    </button>
                  ) : (
                    <div className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500/60 cursor-not-allowed">
                      <Ban className="w-4 h-4 text-rose-500/40" />
                      <span>Invoice Already Cancelled</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            DOCUMENT RENDERERS
        ══════════════════════════════════════════════════════════════ */}

        {/* Delivery Challan, Gate Pass, Packing Slip, Proforma Invoice — live preview */}
        {activeDoc !== "invoice" && activeDoc !== "receipt" && (
          <div className="rounded-2xl bg-slate-700 p-6 shadow-xl">
            <div
              className="bg-white text-slate-900 w-full shadow-lg rounded-sm overflow-hidden"
              dangerouslySetInnerHTML={{
                __html:
                  activeDoc === "proforma"
                    ? generateProformaInvoiceHtml(invoice, profile, upiQr)
                    : activeDoc === "challan"
                    ? generateDeliveryChallanHtml(invoice, profile)
                    : activeDoc === "gatepass"
                    ? generateGatePassHtml(invoice, profile)
                    : generatePackingSlipHtml(invoice, profile),
              }}
            />
          </div>
        )}

        {/* ─── Payment Receipt Voucher (Live Preview) ──────────────────────────── */}
        {activeDoc === "receipt" && (
          <div className="space-y-4">
            {invoice.payments && invoice.payments.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold">Select Payment Receipt:</span>
                {invoice.payments.map((p, idx) => (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => setSelectedPaymentForReceipt(p)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                      (selectedPaymentForReceipt?.id === p.id || (!selectedPaymentForReceipt && idx === invoice.payments.length - 1))
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    Receipt #{idx + 1} — ₹{p.amount.toFixed(2)} ({p.paymentModeName || "Cash"})
                  </button>
                ))}
              </div>
            )}

            {invoice.payments && invoice.payments.length > 0 ? (
              <div className="rounded-2xl bg-slate-700 p-6 shadow-xl">
                <div
                  className="bg-white w-full shadow-lg rounded-sm overflow-hidden"
                  dangerouslySetInnerHTML={{
                    __html: generatePaymentReceiptVoucherHtml(
                      invoice,
                      selectedPaymentForReceipt || invoice.payments[invoice.payments.length - 1],
                      profile
                    ),
                  }}
                />
              </div>
            ) : (
              <div className="rounded-3xl bg-slate-950/60 border border-slate-800 p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">No Payments Recorded Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    No payment transactions found for this invoice. Record a payment to print an official Money Receipt Voucher.
                  </p>
                </div>
                {hasBalance && !isCancelled && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentForm({
                        amount: invoice.balanceAmount,
                        paymentMode: 1,
                        paymentDate: new Date().toISOString().split("T")[0],
                        transactionReference: "",
                        notes: `Payment against Inv #${invoice.invoiceNumber}`,
                      });
                      setRecordPaymentModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>+ Record Payment Now</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Dynamic Active Template Invoice Renderer ───────────────────────────── */}
        {activeDoc === "invoice" && dynamicInvoiceHtml ? (
          <div className="bg-white text-slate-900 rounded-none sm:rounded-xl p-3 sm:p-6 shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 font-sans text-xs max-w-5xl mx-auto overflow-x-auto">
            <style jsx global>{`
              @media print {
                @page {
                  size: ${printFormat === "compact_a5" ? "A5 landscape" : "A4 portrait"};
                  margin: 5mm;
                }
                html, body {
                  background: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print\\:hidden, nav, aside, header, button {
                  display: none !important;
                }
              }
            `}</style>
            <div dangerouslySetInnerHTML={{ __html: dynamicInvoiceHtml }} />
          </div>
        ) : activeDoc === "invoice" && printFormat === "compact_a5" ? (
          <div className="bg-white text-slate-900 rounded-none sm:rounded-xl p-3 sm:p-6 shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 font-sans text-xs max-w-5xl mx-auto overflow-x-auto">
            <div dangerouslySetInnerHTML={{ __html: generateCashMemoA5Html(invoice, profile, upiQr) }} />
          </div>
        ) : activeDoc === "invoice" && printFormat === "a4" && (() => {
          const invoiceQrString = `GSTIN:${invoice.branchGstin || profile?.gstin || "07ABPCS0239Q1ZN"}|INV:${invoice.invoiceNumber}|DT:${invoice.invoiceDate ? invoice.invoiceDate.split("T")[0] : ""}|VAL:${invoice.totalAmount.toFixed(2)}|TAX:${invoice.taxableAmount.toFixed(2)}|GST:${(invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount).toFixed(2)}|BUYER:${invoice.customerName || "CASH"}`;
          const upiId = profile?.upiId?.trim() || "";
          const hasUpi = upiId.length > 0;
          const upiPaymentUri = hasUpi
            ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(profile?.businessName || "Merchant")}&am=${invoice.totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent("Inv-" + invoice.invoiceNumber)}`
            : "";
          const bankName = profile?.bankName || "";
          const bankAccountName = profile?.businessName || "";
          const bankAccountNumber = profile?.bankAccountNumber || "";
          const bankIfsc = profile?.bankIfsc || "";
          const bankBranch = profile?.bankBranch || "";
          const hasBank = bankAccountNumber.length > 0;

          // Convert amount to words
          const amountInWords = (() => {
            const num = Math.floor(Math.abs(invoice.totalAmount));
            if (num === 0) return "Zero Only";
            const a = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
            const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
            const inWords = (val: number): string => {
              let str = "";
              if (val >= 10000000) { str += inWords(Math.floor(val / 10000000)) + "Crore "; val %= 10000000; }
              if (val >= 100000) { str += inWords(Math.floor(val / 100000)) + "Lakh "; val %= 100000; }
              if (val >= 1000) { str += inWords(Math.floor(val / 1000)) + "Thousand "; val %= 1000; }
              if (val >= 100) { str += inWords(Math.floor(val / 100)) + "Hundred "; val %= 100; }
              if (val > 0) {
                if (val < 20) { str += a[val]; }
                else { str += b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : " "); }
              }
              return str;
            };
            return inWords(num).trim() + " Only";
          })();

          // Minimum 12 rows to comfortably fill the full A4 portrait page
          const emptyRowsCount = Math.max(0, 12 - invoice.items.length);

          return (
            <div id="invoice-print-area" className="bg-white text-slate-900 rounded-none sm:rounded-xl p-4 sm:p-8 shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 font-sans text-xs max-w-4xl mx-auto">
              {/* Strict Clean Print Override */}
              <style jsx global>{`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 5mm 6mm 5mm 6mm;
                  }
                  html, body {
                    background: #ffffff !important;
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    min-height: 100% !important;
                    height: 100% !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  body, #__next, main, div, aside, nav, header {
                    background: #ffffff !important;
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    box-shadow: none !important;
                  }
                  .print\\:hidden, nav, aside, header, button, [role="navigation"] {
                    display: none !important;
                  }
                  #invoice-print-area {
                    width: 100% !important;
                    max-width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: #ffffff !important;
                    background-color: #ffffff !important;
                    min-height: 100% !important;
                    overflow: visible !important;
                  }
                  /* Disable all scrollbars or overflow arrows on print */
                  * {
                    overflow: visible !important;
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                  }
                  *::-webkit-scrollbar {
                    display: none !important;
                  }
                }
              `}</style>

              <div className="space-y-3.5 relative">
                {/* Print Watermark */}
                {isCancelled && (
                  <div className="absolute top-[42%] left-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] text-red-500/20 text-6xl font-black border-4 border-red-500/30 px-8 py-3 rounded-2xl pointer-events-none uppercase tracking-widest z-50 select-none">
                    CANCELLED
                  </div>
                )}
                {!isCancelled && invoice.hasCreditNote && (
                  <div className="absolute top-[42%] left-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] text-amber-600/20 text-5xl font-black border-4 border-amber-600/30 px-6 py-2 rounded-2xl pointer-events-none uppercase tracking-wider z-50 select-none">
                    CREDIT NOTE ISSUED
                  </div>
                )}

                {/* Print Alert Banners */}
                {isCancelled && (
                  <div className="bg-red-50 border-2 border-red-500 rounded p-2.5 text-center text-red-800">
                    <div className="text-sm font-black uppercase tracking-wider text-red-700">
                      &#10006; CANCELLED / VOID INVOICE
                    </div>
                    <div className="text-[11px] font-semibold text-red-600 mt-0.5">
                      This invoice was CANCELLED {invoice.cancelledAtUtc ? `on ${new Date(invoice.cancelledAtUtc).toLocaleDateString("en-IN")}` : ""}. Reason: {invoice.cancellationReason || "Voided"}
                    </div>
                    <div className="text-[9.5px] font-bold text-red-500 uppercase mt-0.5">
                      Not valid for payment, accounting or Input Tax Credit (ITC)
                    </div>
                  </div>
                )}

                {invoice.hasCreditNote && (
                  <div className="bg-amber-50 border-2 border-amber-500 rounded p-2.5 text-center text-amber-900">
                    <div className="text-sm font-black uppercase tracking-wider text-amber-700">
                      &#9888; CREDIT NOTE ISSUED / SALE RETURN PROCESSED
                    </div>
                    <div className="text-[11px] font-bold text-amber-800 mt-0.5">
                      Credit Note No: <span className="font-mono font-black text-amber-900">{invoice.creditNoteNumber}</span>
                      &nbsp;&bull;&nbsp; Return Total: <span className="font-bold text-amber-900">₹{(invoice.creditNoteAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      {invoice.creditNoteDate && <span>&nbsp;&bull;&nbsp; Return Date: {new Date(invoice.creditNoteDate).toLocaleDateString("en-IN")}</span>}
                    </div>
                    <div className="text-[9.5px] font-medium text-amber-700 mt-0.5">
                      Goods/services against this invoice have been returned. Refer to Credit Note for net ledger adjustment.
                    </div>
                  </div>
                )}

                {/* 1. Header Box with Orange Border & Senior Designer Breathing Space */}
                <div className="border-2 border-[#d9531e] rounded-md p-4 flex flex-row justify-between items-center gap-4 bg-white shadow-xs">
                  {/* Left: Company Logo + Details */}
                  <div className="flex items-center space-x-3.5">
                    {profile?.logoUrl ? (
                      <img
                        src={profile.logoUrl}
                        alt="Logo"
                        className="w-16 h-16 object-contain shrink-0 rounded-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 border border-slate-200 rounded-md p-1.5 flex items-center justify-center shrink-0 bg-slate-50">
                        <svg className="w-10 h-10 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v12M6 12h12" />
                        </svg>
                      </div>
                    )}
                    <div className="space-y-1">
                      <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                        {profile?.businessName || profile?.tradeName || "BUSINESS NAME"}
                      </h1>
                      {(invoice.branchAddress || profile?.branches?.[0]?.addressLine1 || profile?.addressLine1) && (
                        <p className="text-[11px] text-slate-700 leading-snug">
                          {invoice.branchAddress || profile?.branches?.[0]?.addressLine1 || profile?.addressLine1}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-slate-800 font-medium">
                        {profile?.primaryPhone && <span><b>Mobile:</b> {profile.primaryPhone}</span>}
                        {(invoice.branchGstin || profile?.gstin) && (
                          <>
                            {profile?.primaryPhone && <span>|</span>}
                            <span><b>GSTIN:</b> <span className="font-mono font-bold text-slate-900">{invoice.branchGstin || profile?.gstin}</span></span>
                          </>
                        )}
                        {(profile as any)?.drugLicenseNumber && (
                          <>
                            <span>|</span>
                            <span><b>DL No:</b> <span className="font-mono text-slate-900">{(profile as any).drugLicenseNumber}</span></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Orange Tax Invoice Pill + Invoice Metadata + Verification QR */}
                  <div className="flex items-center space-x-3.5 text-right shrink-0">
                    <div className="space-y-1.5">
                      <div className="inline-block px-5 py-1.5 bg-[#c2410c] text-white font-black text-xs uppercase tracking-wider rounded-sm shadow-sm">
                        Tax Invoice
                      </div>
                      <div className="text-[11px] text-slate-800 space-y-0.5 leading-snug">
                        <p>
                          <b>Invoice No:</b> <span className="font-mono font-black text-slate-900">{invoice.invoiceNumber}</span>
                        </p>
                        <p>
                          <b>Date:</b> {new Date(invoice.invoiceDate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} 18:50
                        </p>
                        <p>
                          <b>Due Date:</b> {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : new Date(invoice.invoiceDate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} 18:50
                        </p>
                      </div>
                    </div>
                    {/* Header Real Invoice QR Code */}
                    <div className="w-16 h-16 bg-white border border-slate-300 rounded p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=${encodeURIComponent(invoiceQrString)}`}
                        alt="Invoice Verification QR"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Bill To & Ship To 2-Column Box */}
                <div className="grid grid-cols-2 border border-slate-400 text-xs">
                  <div className="p-2.5 border-r border-slate-400 space-y-0.5">
                    <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">
                      BILL TO (RECIPIENT)
                    </div>
                    <div className="font-bold text-slate-900 text-xs">{invoice.customerName}</div>
                    <div className="text-slate-700 text-[10.5px] leading-tight">
                      {invoice.billingAddress || "SHOP NO. 2 WATER WORK WAZIRABAD, DELHI, DELHI, INDIA"}
                    </div>
                    {invoice.customerPhone && (
                      <div className="text-slate-800 text-[10.5px]">
                        <b>Mobile:</b> {invoice.customerPhone}
                      </div>
                    )}
                    {invoice.customerGSTIN && (
                      <div className="text-slate-900 font-mono text-[10.5px]">
                        <b>GST:</b> {invoice.customerGSTIN}
                      </div>
                    )}
                    {hasPharma && (invoice as any)?.customerDlNumber && (
                      <div className="text-slate-900 font-mono text-[10.5px]">
                        <b>DL NUM:</b> {(invoice as any).customerDlNumber}
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 space-y-0.5">
                    <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">
                      SHIP TO / DISPATCH
                    </div>
                    <div className="text-slate-700 text-[10.5px] leading-tight">
                      {invoice.shippingAddress || invoice.billingAddress || "Same as Billing Address"}
                    </div>
                    <div className="text-[10.5px] text-slate-700 pt-2">
                      <b>Place of Supply:</b> {invoice.placeOfSupply} (State Code: {invoice.shippingStateCode || invoice.billingStateCode})
                    </div>
                  </div>
                </div>

                {/* 3. Product Line Items Grid Table — Smart Industry Specific */}
                <div className="border border-slate-400 overflow-hidden">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead className="bg-[#e2e8f0] text-slate-900 font-bold border-b border-slate-400">
                      {hasPharma ? (
                        /* Dedicated Chemist / Pharma Grid */
                        <tr>
                          <th className="py-1 px-1 border-r border-slate-400 w-6 text-center">S.</th>
                          <th className="py-1 px-1.5 border-r border-slate-400 min-w-[140px]">Medicine / Item</th>
                          <th className="py-1 px-1 border-r border-slate-400 w-12 text-center">Packing</th>
                          <th className="py-1 px-1 border-r border-slate-400 w-14 text-center">HSN/SAC</th>
                          <th className="py-1 px-1 border-r border-slate-400 w-14 text-center">Batch</th>
                          <th className="py-1 px-1 border-r border-slate-400 w-12 text-center">Expiry</th>
                          <th className="py-1 px-1 border-r border-slate-400 w-10 text-right">Qty</th>
                          <th className="py-1 px-1 border-r border-slate-400 w-9 text-right">Free</th>
                          <th className="py-1 px-1 border-r border-slate-400 w-12 text-right">MRP</th>
                          <th className="py-1 px-1 border-r border-slate-400 w-9 text-center">Unit</th>
                          <th className="py-1 px-1 border-r border-slate-400 w-12 text-right">Rate</th>
                          <th className="py-1 px-1 border-r border-slate-400 w-10 text-right">Disc</th>
                          <th className="py-1 px-1.5 border-r border-slate-400 w-14 text-right">Taxable</th>
                          <th className="py-1 px-1 border-r border-slate-400 w-11 text-right">GST %</th>
                          <th className="py-1 px-1.5 w-16 text-right">Amount</th>
                        </tr>
                      ) : (
                        /* Ultra-Clean GimBooks / Vyapar Universal Retail & Kirana Grid */
                        <tr>
                          <th className="py-1.5 px-2 border-r border-slate-400 w-8 text-center">#</th>
                          <th className="py-1.5 px-3 border-r border-slate-400 min-w-[200px]">Item Description</th>
                          <th className="py-1.5 px-2 border-r border-slate-400 w-20 text-center">HSN/SAC</th>
                          <th className="py-1.5 px-2 border-r border-slate-400 w-16 text-right">Qty</th>
                          <th className="py-1.5 px-2 border-r border-slate-400 w-14 text-center">Unit</th>
                          <th className="py-1.5 px-2 border-r border-slate-400 w-20 text-right">Rate (₹)</th>
                          <th className="py-1.5 px-2 border-r border-slate-400 w-16 text-right">Disc (₹)</th>
                          <th className="py-1.5 px-3 border-r border-slate-400 w-24 text-right">Taxable (₹)</th>
                          <th className="py-1.5 px-2 border-r border-slate-400 w-16 text-right">GST %</th>
                          <th className="py-1.5 px-3 w-28 text-right font-black">Total (₹)</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="text-slate-900 font-sans">
                      {invoice.items.map((item, idx) => {
                        let itemAttrs: any = {};
                        try {
                          itemAttrs = JSON.parse(item.attributesJson || "{}");
                        } catch {}

                        let expStr = itemAttrs.expiryFormatted || "";
                        if (!expStr && item.expiryDate) {
                          const d = new Date(item.expiryDate);
                          expStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
                        }

                        const packingStr = itemAttrs.packing || "—";
                        const freeQty = itemAttrs.freeQuantity || 0;

                        if (hasPharma) {
                          return (
                            <tr key={item.id} className="border-b border-slate-400 hover:bg-slate-50">
                              <td className="py-1 px-1 border-r border-slate-400 text-center font-mono">{idx + 1}</td>
                              <td className="py-1 px-1.5 border-r border-slate-400 font-bold uppercase text-[9.5px]">
                                {item.itemName}
                              </td>
                              <td className="py-1 px-1 border-r border-slate-400 text-center font-mono">{packingStr}</td>
                              <td className="py-1 px-1 border-r border-slate-400 text-center font-mono">{item.hsnCode || "—"}</td>
                              <td className="py-1 px-1 border-r border-slate-400 text-center font-mono font-semibold text-slate-900">
                                {item.batchNumber || "—"}
                              </td>
                              <td className="py-1 px-1 border-r border-slate-400 text-center font-mono">{expStr || "—"}</td>
                              <td className="py-1 px-1 border-r border-slate-400 text-right font-mono font-bold">
                                {item.quantity.toFixed(2)}
                              </td>
                              <td className="py-1 px-1 border-r border-slate-400 text-right font-mono text-emerald-700">
                                {freeQty > 0 ? freeQty.toFixed(2) : "—"}
                              </td>
                              <td className="py-1 px-1 border-r border-slate-400 text-right font-mono">
                                {(item.mrp || 0).toFixed(2)}
                              </td>
                              <td className="py-1 px-1 border-r border-slate-400 text-center font-mono text-[9px]">
                                {item.uomCode || "Unit"}
                              </td>
                              <td className="py-1 px-1 border-r border-slate-400 text-right font-mono font-semibold">
                                {item.unitPrice.toFixed(2)}
                              </td>
                              <td className="py-1 px-1 border-r border-slate-400 text-right font-mono text-slate-600">
                                {item.discountAmount > 0 ? item.discountAmount.toFixed(2) : "0.00"}
                              </td>
                              <td className="py-1 px-1.5 border-r border-slate-400 text-right font-mono font-bold text-slate-900">
                                {item.taxableAmount.toFixed(2)}
                              </td>
                              <td className="py-1 px-1 border-r border-slate-400 text-right font-mono">
                                {item.gstRate.toFixed(2)}%
                              </td>
                              <td className="py-1 px-1.5 text-right font-mono font-black text-slate-900">
                                {item.totalAmount.toFixed(2)}
                              </td>
                            </tr>
                          );
                        }

                        // Clean Retail / Kirana Row
                        return (
                          <tr key={item.id} className="border-b border-slate-400 hover:bg-slate-50 text-[11px]">
                            <td className="py-1.5 px-2 border-r border-slate-400 text-center font-mono">{idx + 1}</td>
                            <td className="py-1.5 px-3 border-r border-slate-400 font-bold uppercase text-[11px] text-slate-900">
                              {item.itemName}
                              {item.itemSku && (
                                <span className="block text-[9.5px] font-mono text-slate-500 font-normal">
                                  SKU: {item.itemSku}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-400 text-center font-mono text-slate-700">
                              {item.hsnCode || "—"}
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-400 text-right font-mono font-bold text-slate-900">
                              {item.quantity.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-400 text-center font-mono text-[10px] text-slate-600 uppercase">
                              {item.uomCode || "Pcs"}
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-400 text-right font-mono font-semibold">
                              {item.unitPrice.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-400 text-right font-mono text-slate-600">
                              {item.discountAmount > 0 ? item.discountAmount.toFixed(2) : "0.00"}
                            </td>
                            <td className="py-1.5 px-3 border-r border-slate-400 text-right font-mono font-bold text-slate-900">
                              {item.taxableAmount.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-400 text-right font-mono text-slate-700 font-semibold">
                              {item.gstRate.toFixed(1)}%
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-black text-slate-900 text-[12px]">
                              ₹{item.totalAmount.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Blank rows WITHOUT horizontal lines, ONLY vertical lines running top to bottom */}
                      {Array.from({ length: emptyRowsCount }).map((_, emptyIdx) => (
                        <tr key={`empty-${emptyIdx}`}>
                          {hasPharma ? (
                            <>
                              <td className="py-2.5 px-1 border-r border-slate-400 text-center">&nbsp;</td>
                              <td className="py-2.5 px-1.5 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1.5 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-1.5">&nbsp;</td>
                            </>
                          ) : (
                            <>
                              <td className="py-2.5 px-2 border-r border-slate-400 text-center">&nbsp;</td>
                              <td className="py-2.5 px-3 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-2 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-2 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-2 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-2 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-2 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-3 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-2 border-r border-slate-400">&nbsp;</td>
                              <td className="py-2.5 px-3">&nbsp;</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 4. Bank Details + QR Code + Summary Table (Exact 3-Column Split) */}
                <div className="grid grid-cols-12 border border-slate-400">
                  {/* Left: Bank Details */}
                  <div className={`${hasUpi ? "col-span-5 border-r border-slate-400" : "col-span-7 border-r border-slate-400"} p-2.5 space-y-0.5 text-[10.5px]`}>
                    <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                      Bank Details:
                    </div>
                    {hasBank ? (
                      <>
                        {bankName && <div><b>Bank:</b> {bankName}</div>}
                        {bankAccountName && <div><b>Account Name:</b> {bankAccountName}</div>}
                        <div className="font-mono"><b>Account No:</b> {bankAccountNumber}</div>
                        {bankIfsc && <div className="font-mono"><b>IFSC:</b> {bankIfsc}</div>}
                        {bankBranch && <div><b>Branch:</b> {bankBranch}</div>}
                      </>
                    ) : (
                      <div className="text-slate-400 italic py-2">
                        Bank details not configured in Settings.
                      </div>
                    )}
                  </div>

                  {/* Middle: UPI QR Code (Only if configured in Settings) */}
                  {hasUpi && (
                    <div className="col-span-3 p-2 flex flex-col items-center justify-center border-r border-slate-400 bg-white">
                      <div className="border border-slate-300 rounded p-1 bg-white">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(upiPaymentUri)}`}
                          alt="Scan to Pay QR"
                          className="w-16 h-16 object-contain mx-auto"
                        />
                      </div>
                      <div className="text-[8.5px] font-bold text-slate-800 mt-1 whitespace-nowrap">
                        Scan to Pay (₹{invoice.totalAmount.toFixed(2)})
                      </div>
                    </div>
                  )}

                  {/* Right: Totals Matrix + Amount in Words */}
                  <div className={`${hasUpi ? "col-span-4" : "col-span-5"} p-2 space-y-0.5 font-mono text-[11px]`}>
                    <div className="flex justify-between py-0.5 border-b border-slate-200">
                      <span className="font-semibold text-slate-700">Subtotal:</span>
                      <span className="font-bold text-slate-900">₹ {invoice.subTotal.toFixed(2)}</span>
                    </div>
                    {isIntraState ? (
                      <>
                        <div className="flex justify-between py-0.5 border-b border-slate-200">
                          <span className="text-slate-600">CGST</span>
                          <span className="text-slate-900">(+) ₹ {invoice.cgstAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-slate-200">
                          <span className="text-slate-600">SGST / UTGST</span>
                          <span className="text-slate-900">(+) ₹ {invoice.sgstAmount.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between py-0.5 border-b border-slate-200">
                        <span className="text-slate-600">IGST</span>
                        <span className="text-slate-900">(+) ₹ {invoice.igstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-0.5 border-b border-slate-200 font-bold">
                      <span className="text-slate-800">Total GST</span>
                      <span className="text-slate-900">(+) ₹ {(invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-200">
                      <span className="text-slate-600">Round Off:</span>
                      <span className="text-slate-900">₹ {invoice.roundOff.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 bg-slate-50 px-1.5 rounded font-black text-xs text-slate-900 border border-slate-300 mt-0.5">
                      <span>Total:</span>
                      <span>₹ {invoice.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="text-[9.5px] text-slate-700 italic text-right pt-1 font-sans">
                      ({amountInWords})
                    </div>
                  </div>
                </div>

                {/* 5. GST / HSN SUMMARY Table */}
                <div className="space-y-1">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[10.5px]">
                    GST / HSN SUMMARY
                  </div>
                  <table className="w-full text-left text-[10px] border border-slate-400 border-collapse">
                    <thead className="bg-[#e2e8f0] text-slate-900 font-bold border-b border-slate-400">
                      <tr>
                        <th className="py-1 px-1.5 border-r border-slate-400">HSN/SAC</th>
                        <th className="py-1 px-1.5 border-r border-slate-400 text-right">Taxable</th>
                        <th className="py-1 px-1.5 border-r border-slate-400 text-right">CGST %</th>
                        <th className="py-1 px-1.5 border-r border-slate-400 text-right">CGST Amt</th>
                        <th className="py-1 px-1.5 border-r border-slate-400 text-right">SGST %</th>
                        <th className="py-1 px-1.5 border-r border-slate-400 text-right">SGST Amt</th>
                        <th className="py-1 px-1.5 text-right">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 font-mono text-slate-800">
                      {invoice.taxSummary && invoice.taxSummary.length > 0 ? (
                        invoice.taxSummary.map((ts, idx) => (
                          <tr key={idx}>
                            <td className="py-1 px-1.5 border-r border-slate-400 font-bold">{ts.hsnCode}</td>
                            <td className="py-1 px-1.5 border-r border-slate-400 text-right">{ts.taxableValue.toFixed(2)}</td>
                            <td className="py-1 px-1.5 border-r border-slate-400 text-right">{isIntraState ? `${(ts.gstRate / 2).toFixed(2)}%` : "0%"}</td>
                            <td className="py-1 px-1.5 border-r border-slate-400 text-right">{ts.cgstAmount.toFixed(2)}</td>
                            <td className="py-1 px-1.5 border-r border-slate-400 text-right">{isIntraState ? `${(ts.gstRate / 2).toFixed(2)}%` : "0%"}</td>
                            <td className="py-1 px-1.5 border-r border-slate-400 text-right">{ts.sgstAmount.toFixed(2)}</td>
                            <td className="py-1 px-1.5 text-right font-bold text-slate-900">{ts.totalTax.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-1 px-1.5 border-r border-slate-400 font-bold">30049099</td>
                          <td className="py-1 px-1.5 border-r border-slate-400 text-right">{invoice.taxableAmount.toFixed(2)}</td>
                          <td className="py-1 px-1.5 border-r border-slate-400 text-right">{isIntraState ? "2.50%" : "0%"}</td>
                          <td className="py-1 px-1.5 border-r border-slate-400 text-right">{invoice.cgstAmount.toFixed(2)}</td>
                          <td className="py-1 px-1.5 border-r border-slate-400 text-right">{isIntraState ? "2.50%" : "0%"}</td>
                          <td className="py-1 px-1.5 border-r border-slate-400 text-right">{invoice.sgstAmount.toFixed(2)}</td>
                          <td className="py-1 px-1.5 text-right font-bold text-slate-900">{(invoice.cgstAmount + invoice.sgstAmount).toFixed(2)}</td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-bold border-t border-slate-400">
                        <td className="py-1 px-1.5 border-r border-slate-400 uppercase">TOTAL</td>
                        <td className="py-1 px-1.5 border-r border-slate-400 text-right">{invoice.taxableAmount.toFixed(2)}</td>
                        <td className="py-1 px-1.5 border-r border-slate-400"></td>
                        <td className="py-1 px-1.5 border-r border-slate-400 text-right">{invoice.cgstAmount.toFixed(2)}</td>
                        <td className="py-1 px-1.5 border-r border-slate-400"></td>
                        <td className="py-1 px-1.5 border-r border-slate-400 text-right">{invoice.sgstAmount.toFixed(2)}</td>
                        <td className="py-1 px-1.5 text-right text-slate-900">{(invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 6. Terms and Conditions Box */}
                <div className="border border-slate-400 p-2.5 text-[10px] text-slate-800 space-y-1">
                  <div className="font-bold text-slate-900 text-[10.5px]">Terms and Conditions:</div>
                  <ul className="list-disc pl-4 space-y-0.5 leading-tight">
                    <li><b>Payment:</b> Due within 45 days. <b>18% p.a.</b> interest applies to overdue amounts.</li>
                    <li><b>Claims:</b> Report shortages or damages within <b>24 hours</b> of delivery.</li>
                    <li><b>Returns:</b> Goods sold are non-returnable except for manufacturing defects or recalls.</li>
                    <li><b>Storage:</b> No liability for quality loss due to improper storage after delivery.</li>
                    <li><b>Regulatory:</b> Sold under <b>Drugs & Cosmetics Act</b>; verify Batch/Expiry upon receipt.</li>
                    <li><b>Jurisdiction:</b> Subject to courts in DELHI / Local jurisdiction only.</li>
                  </ul>
                </div>

                {/* 7. Bottom Footer Note with Dotted Border */}
                <div className="border-t border-dotted border-slate-400 pt-1.5 space-y-1 text-[9.5px] text-slate-600">
                  <div className="flex justify-between items-center">
                    <div>This is a computer generated invoice and does not require signature.</div>
                    <div className="font-bold text-slate-800">Authorised Signatory</div>
                  </div>
                  <div className="flex justify-between items-center font-mono text-[9px] text-slate-500">
                    <div>https://www.udyogbill.com/sells</div>
                    <div>1/1</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── Thermal 80mm / 58mm ──────────────────────────────────────── */}
        {activeDoc === "invoice" && (printFormat === "thermal80" || printFormat === "thermal58") && (
          <div
            className={`bg-white text-black p-4 rounded-xl shadow-xl mx-auto border border-slate-300 font-mono text-[11px] print:border-none print:shadow-none print:p-0 ${
              printFormat === "thermal80" ? "max-w-[320px]" : "max-w-[240px] text-[10px]"
            }`}
          >
            {/* Header */}
            <div className="text-center space-y-1 border-b border-dashed border-black pb-3 mb-3">
              <div className="font-extrabold text-sm uppercase">{profile?.businessName || "UDYOGBILL"}</div>
              <div className="text-[10px]">{invoice.branchName}</div>
              <div className="text-[9px]">{invoice.branchAddress}</div>
              {invoice.branchGstin && <div className="text-[9px]">GSTIN: {invoice.branchGstin}</div>}
              <div className="font-bold text-xs uppercase pt-1">*** RETAIL RECEIPT ***</div>
            </div>

            {/* Meta Info */}
            <div className="space-y-0.5 border-b border-dashed border-black pb-2 mb-2 text-[10px]">
              <div className="flex justify-between">
                <span>Inv #: {invoice.invoiceNumber}</span>
                <span>
                  {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
                </span>
              </div>
              <div>Cust: {invoice.customerName}</div>
              {invoice.customerPhone && <div>Ph: {invoice.customerPhone}</div>}
            </div>

            {/* Items */}
            <div className="border-b border-dashed border-black pb-2 mb-2">
              <div className="flex justify-between font-bold border-b border-black pb-1 mb-1 text-[10px]">
                <span>Item</span>
                <span>Qty x Rate</span>
                <span>Amt</span>
              </div>
              {invoice.items.map((item) => (
                <div key={item.id} className="py-0.5">
                  <div className="font-semibold truncate">{item.itemName}</div>
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>
                      {item.quantity} {item.uomCode} @ ₹{item.unitPrice.toFixed(0)}
                    </span>
                    <span className="font-bold text-black">₹{item.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 border-b border-dashed border-black pb-2 mb-2 text-[10px]">
              <div className="flex justify-between">
                <span>Taxable Value:</span>
                <span>₹{invoice.taxableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total GST:</span>
                <span>₹{(invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount).toFixed(2)}</span>
              </div>
              {invoice.roundOff !== 0 && (
                <div className="flex justify-between">
                  <span>Round Off:</span>
                  <span>₹{invoice.roundOff.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-black">
                <span>NET TOTAL:</span>
                <span>₹{invoice.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Paid:</span>
                <span>₹{invoice.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Balance Due:</span>
                <span>₹{invoice.balanceAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Thermal UPI QR Code */}
            {upiQr && invoice.balanceAmount > 0 && (
              <div className="text-center border-b border-dashed border-black pb-3 mb-3">
                <div className="w-24 h-24 border border-black mx-auto my-1 flex items-center justify-center p-1">
                  <QrCode className="w-20 h-20 text-black" />
                </div>
                <div className="text-[9px] font-bold">Scan to Pay ₹{invoice.balanceAmount.toFixed(2)}</div>
                <div className="text-[8px]">{upiQr.payeeVpa}</div>
              </div>
            )}

            {/* Thank You Note */}
            <div className="text-center text-[9px] space-y-1 pt-1">
              <div className="font-bold">THANK YOU FOR YOUR VISIT!</div>
              <div>Goods once sold will not be returned.</div>
              <div className="text-[8px] text-slate-600">Powered by UdyogBill</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
