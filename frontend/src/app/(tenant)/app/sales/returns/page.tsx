"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Plus,
  ArrowLeft,
  Search,
  CheckCircle,
  FileText,
  Boxes,
  X,
  Printer
} from "lucide-react";
import { salesService, SalesReturnDto } from "@/services/sales-services";
import { partyService } from "@/services/party-services";
import { inventoryService } from "@/services/inventory-services";
import { tenantAppService } from "@/services/tenant-app-services";
import { printRawHtml, parseAppError, AppErrorDetails } from "@/lib/print-helper";
import { printTemplateService } from "@/services/print-template-services";
import { TenantDetails } from "@/types";

export default function SalesReturnsPage() {
  const [returns, setReturns] = useState<SalesReturnDto[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [profile, setProfile] = useState<TenantDetails | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReturnForPrint, setSelectedReturnForPrint] = useState<SalesReturnDto | null>(null);
  const [actionError, setActionError] = useState<AppErrorDetails | null>(null);

  // Form State
  const [selectedCustId, setSelectedCustId] = useState("");
  const [origInvNum, setOrigInvNum] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [returnReason, setReturnReason] = useState("CustomerReturn");
  const [restock, setRestock] = useState(true);
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState([
    { itemId: "", itemName: "", itemSku: "", batchNumber: "", returnQuantity: 1, rate: 100, gstRate: 18, amount: 118 }
  ]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [rRes, custRes, itemRes, whList, brList, profRes] = await Promise.all([
        salesService.getSalesReturns({ pageNumber: 1, pageSize: 50 }),
        partyService.getCustomers({ pageNumber: 1, pageSize: 100 }),
        inventoryService.getItems({ pageNumber: 1, pageSize: 100 }),
        tenantAppService.getWarehouses(),
        tenantAppService.getBranches(),
        tenantAppService.getBusinessProfile().catch(() => null)
      ]);

      setReturns(rRes?.items || []);
      setCustomers(custRes?.items || []);
      setItems(itemRes?.items || []);
      setWarehouses(whList || []);
      setBranches(brList || []);
      setProfile(profRes);

      if (custRes?.items?.length > 0) setSelectedCustId(custRes.items[0].id);
      if (brList?.length > 0) setSelectedBranchId(brList[0].id);
      if (whList?.length > 0) setSelectedWarehouseId(whList[0].id);

      if (itemRes?.items?.length > 0) {
        const first = itemRes.items[0];
        const rate = first.sellingPrice || 100;
        const gst = first.taxRate || 18;
        setLineItems([
          {
            itemId: first.id,
            itemName: first.name,
            itemSku: first.sku || "",
            batchNumber: "",
            returnQuantity: 1,
            rate: rate,
            gstRate: gst,
            amount: 1 * rate * (1 + gst / 100)
          }
        ]);
      }
    } catch (err: any) {
      console.error("Failed to load sales returns", err);
      setLoadError(err?.response?.data?.message || err?.message || "Failed to load sales returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleItemSelect = (index: number, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const newLines = [...lineItems];
    const rate = item.sellingPrice || 100;
    const gstRate = item.taxRate || 18;
    const qty = newLines[index].returnQuantity || 1;
    newLines[index] = {
      ...newLines[index],
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku || "",
      rate,
      gstRate,
      amount: qty * rate * (1 + gstRate / 100)
    };
    setLineItems(newLines);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const newLines = [...lineItems];
    newLines[index].returnQuantity = qty;
    newLines[index].amount = qty * newLines[index].rate * (1 + newLines[index].gstRate / 100);
    setLineItems(newLines);
  };

  const handleRateChange = (index: number, rate: number) => {
    const newLines = [...lineItems];
    newLines[index].rate = rate;
    newLines[index].amount = newLines[index].returnQuantity * rate * (1 + newLines[index].gstRate / 100);
    setLineItems(newLines);
  };

  const addLine = () => {
    if (items.length === 0) return;
    const first = items[0];
    const rate = first.sellingPrice || 100;
    const gst = first.taxRate || 18;
    setLineItems([
      ...lineItems,
      {
        itemId: first.id,
        itemName: first.name,
        itemSku: first.sku || "",
        batchNumber: "",
        returnQuantity: 1,
        rate,
        gstRate: gst,
        amount: 1 * rate * (1 + gst / 100)
      }
    ]);
  };

  const removeLine = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const totalTaxable = lineItems.reduce((sum, l) => sum + l.returnQuantity * l.rate, 0);
  const totalGst = lineItems.reduce((sum, l) => sum + (l.returnQuantity * l.rate * l.gstRate) / 100, 0);
  const grandTotal = totalTaxable + totalGst;

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origInvNum.trim()) {
      alert("Original Invoice # is required.");
      return;
    }
    const cust = customers.find((c) => c.id === selectedCustId) || customers[0];
    if (!cust) {
      alert("Customer is required.");
      return;
    }

    const branchId = selectedBranchId || branches[0]?.id || "00000000-0000-0000-0000-000000000000";
    const warehouseId = selectedWarehouseId || warehouses[0]?.id || "00000000-0000-0000-0000-000000000000";

    const validLines = lineItems.filter((l) => l.itemId && l.itemId !== "00000000-0000-0000-0000-000000000000");
    if (validLines.length === 0) {
      if (items.length > 0) {
        // Fallback to first available item if user didn't change dropdown
        validLines.push({
          itemId: items[0].id,
          itemName: items[0].name,
          itemSku: items[0].sku || "",
          batchNumber: "",
          returnQuantity: lineItems[0]?.returnQuantity || 1,
          rate: lineItems[0]?.rate || items[0].sellingPrice || 100,
          gstRate: lineItems[0]?.gstRate || items[0].taxRate || 18,
          amount: 100
        });
      } else {
        alert("Please select at least one valid item to return.");
        return;
      }
    }

    try {
      setSubmitting(true);
      await salesService.createSalesReturn({
        originalInvoiceNumber: origInvNum.trim(),
        partyId: cust.id,
        customerName: cust.legalName,
        branchId,
        warehouseId,
        returnReason,
        restockToWarehouse: restock,
        notes,
        items: validLines.map((l) => ({
          itemId: l.itemId,
          itemName: l.itemName,
          itemSku: l.itemSku,
          batchNumber: l.batchNumber || undefined,
          returnQuantity: l.returnQuantity,
          unitPrice: l.rate,
          gstRate: l.gstRate
        }))
      });

      setIsCreateOpen(false);
      setOrigInvNum("");
      setNotes("");
      loadData();
    } catch (err: any) {
      const parsed = parseAppError(err, "Credit Note / Customer Return Creation");
      setActionError(parsed);
    } finally {
      setSubmitting(false);
    }
  };

  const printCreditNote = async (ret: SalesReturnDto, format: "A4" | "thermal80" = "A4") => {
    if (format === "A4") {
      try {
        const preview = await printTemplateService.renderPreview({
          documentId: ret.id,
          documentType: 9 // Credit Note
        });
        printRawHtml(preview.renderedHtml, `Credit_Note_${ret.creditNoteNumber}`, "A4 portrait", "6mm");
        return;
      } catch (err) {
        console.warn("Statutory Credit Note print preview failed, using standard fallback:", err);
      }
    }

    const sellerName = profile?.tradeName || profile?.businessName || "UDYOGBILL";
    const sellerAddress = profile?.addressLine1 ? `${profile.addressLine1}${profile.addressLine2 ? `, ${profile.addressLine2}` : ""}, ${profile.city || ""}, ${profile.state || ""} - ${profile.pincode || ""}` : "";
    const sellerGstin = profile?.gstin || "";

    if (format === "thermal80") {
      const itemsThermal = ret.items.map((i, idx) => `
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
          <span>${idx + 1}. ${i.itemName} x ${i.returnQuantity}</span>
          <span style="font-family:monospace; font-weight:bold;">₹${i.totalAmount.toFixed(2)}</span>
        </div>
      `).join("");

      const thermalHtml = `
        <div style="font-family:monospace; width:72mm; margin:0 auto; padding:4mm; font-size:11px; line-height:1.3; color:#000;">
          <div style="text-align:center; font-weight:900; font-size:14px; text-transform:uppercase;">${sellerName}</div>
          ${sellerGstin ? `<div style="text-align:center; font-size:10px;">GSTIN: ${sellerGstin}</div>` : ""}
          <div style="text-align:center; margin:4px 0; border-top:1px dashed #000; border-bottom:1px dashed #000; padding:2px 0; font-weight:bold;">
            *** CREDIT NOTE / RETURN ***
          </div>
          <div style="font-size:10px; margin-bottom:4px;">
            <div><b>CN No:</b> ${ret.creditNoteNumber}</div>
            <div><b>Date:</b> ${new Date(ret.returnDate).toLocaleString("en-IN")}</div>
            <div><b>Customer:</b> ${ret.customerName}</div>
            <div><b>Ref Inv:</b> ${ret.originalInvoiceNumber || "Direct"}</div>
          </div>
          <div style="border-top:1px dashed #000; margin:4px 0;"></div>
          ${itemsThermal}
          <div style="border-top:1px dashed #000; margin:4px 0;"></div>
          <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px;">
            <span>TOTAL CREDIT:</span>
            <span>₹${ret.totalAmount.toFixed(2)}</span>
          </div>
          <div style="text-align:center; margin-top:8px; font-size:9px;">
            Returned items credited to customer ledger.<br/>Thank You!
          </div>
        </div>
      `;
      printRawHtml(thermalHtml, `CN_${ret.creditNoteNumber}`, "thermal80", "2mm");
      return;
    }

    const rowsHtml = ret.items.map((i, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1; font-size: 11px;">
        <td style="padding: 6px 8px; text-align: center; border-right: 1px solid #cbd5e1;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-weight: 700; border-right: 1px solid #cbd5e1; color: #0f172a;">
          ${i.itemName} ${i.itemSku ? `<span style="font-size:9px; color:#64748b;">(${i.itemSku})</span>` : ""}
        </td>
        <td style="padding: 6px 8px; text-align: center; border-right: 1px solid #cbd5e1; font-family: monospace;">${i.batchNumber || "—"}</td>
        <td style="padding: 6px 8px; text-align: right; border-right: 1px solid #cbd5e1; font-weight: 700;">${i.returnQuantity}</td>
        <td style="padding: 6px 8px; text-align: right; border-right: 1px solid #cbd5e1; font-family: monospace;">₹${i.unitPrice.toFixed(2)}</td>
        <td style="padding: 6px 8px; text-align: right; border-right: 1px solid #cbd5e1; font-family: monospace;">${i.gstRate}%</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">₹${i.totalAmount.toFixed(2)}</td>
      </tr>
    `).join("");

    const html = `
      <div style="font-family:Arial,sans-serif; width:100%; min-height:140mm; display:flex; flex-direction:column; justify-content:space-between; border:2px solid #0284c7; background:#ffffff; color:#0f172a; padding:18px 22px; box-sizing:border-box;">
        <div style="flex-shrink:0;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0284c7; padding-bottom:10px; margin-bottom:10px;">
            <div>
              <div style="font-size:22px; font-weight:900; color:#0f172a; text-transform:uppercase;">${sellerName}</div>
              ${sellerAddress ? `<div style="font-size:11px; color:#475569; margin-top:2px;">${sellerAddress}</div>` : ""}
              ${sellerGstin ? `<div style="font-size:11px; font-weight:bold; margin-top:3px; color:#0369a1;">GSTIN: ${sellerGstin}</div>` : ""}
            </div>
            <div style="text-align:right;">
              <div style="background:#0284c7; color:#fff; font-size:14px; font-weight:900; padding:5px 16px; border-radius:6px; letter-spacing:0.5px;">GST CREDIT NOTE</div>
              <div style="font-size:11px; font-weight:bold; margin-top:4px;">Credit Note #: ${ret.creditNoteNumber}</div>
              <div style="font-size:10px; color:#475569;">Date: ${new Date(ret.returnDate).toLocaleDateString("en-IN")}</div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:10px; font-size:11px; background:#f0f9ff; padding:10px 12px; border:1px solid #bae6fd; border-radius:6px; margin-bottom:12px;">
            <div>
              <div style="font-size:9.5px; text-transform:uppercase; color:#0369a1; font-weight:bold;">Issued To (Customer):</div>
              <div style="font-size:13px; font-weight:bold; color:#0f172a; margin-top:2px;">${ret.customerName}</div>
              ${ret.notes ? `<div style="color:#475569; margin-top:2px;"><b>Narration:</b> ${ret.notes}</div>` : ""}
            </div>
            <div style="text-align:right;">
              <div><b>Original Invoice Ref:</b> ${ret.originalInvoiceNumber || "Direct Return"}</div>
              <div><b>Return Reason:</b> ${ret.returnReason}</div>
              <div><b>Stock Restocked:</b> ${ret.restockToWarehouse ? "Yes (Inventory Restored)" : "No (Scrapped/Adjusted)"}</div>
            </div>
          </div>
        </div>

        <div style="flex:1; display:flex; flex-direction:column; margin-bottom:14px;">
          <table style="width:100%; border-collapse:collapse; font-size:11px; border-bottom:1.5px solid #0284c7;">
            <thead style="background:#f0f9ff; color:#0369a1;">
              <tr style="text-transform:uppercase; font-size:10px; border-bottom:1.5px solid #bae6fd;">
                <th style="padding:6px 6px; width:28px; border-right:1px solid #bae6fd;">#</th>
                <th style="padding:6px 8px; text-align:left; border-right:1px solid #bae6fd;">Item Returned</th>
                <th style="padding:6px 6px; width:80px; text-align:center; border-right:1px solid #bae6fd;">Batch</th>
                <th style="padding:6px 6px; width:60px; text-align:right; border-right:1px solid #bae6fd;">Qty</th>
                <th style="padding:6px 6px; width:75px; text-align:right; border-right:1px solid #bae6fd;">Rate</th>
                <th style="padding:6px 6px; width:60px; text-align:right; border-right:1px solid #bae6fd;">GST %</th>
                <th style="padding:6px 8px; width:90px; text-align:right;">Credit (₹)</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>

        <div style="flex-shrink:0; margin-top:auto; padding-top:10px; border-top:1.5px solid #0284c7;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:10px; color:#64748b; max-width:400px;">
              <b>Declaration:</b> This Credit Note confirms that the goods mentioned have been returned and the party ledger has been credited accordingly.
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px; color:#64748b;">Subtotal (Taxable): ₹${ret.subTotal.toFixed(2)} | GST Tax: ₹${ret.taxAmount.toFixed(2)}</div>
              <div style="font-size:18px; font-weight:900; color:#0284c7; font-family:monospace; margin-top:3px;">
                TOTAL CREDIT: ₹${ret.totalAmount.toFixed(2)}
              </div>
              <div style="font-size:9.5px; color:#64748b; margin-top:4px;">Authorized Signatory (${sellerName})</div>
            </div>
          </div>
        </div>
      </div>
    `;

    printRawHtml(html, `Credit_Note_${ret.creditNoteNumber}`, "A4 portrait", "6mm");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Sales Returns &amp; Credit Notes</h1>
            <p className="text-sm text-slate-400">Real-time PostgreSQL transactions: physical stock restock &amp; customer ledger credit</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Issue Customer Credit Note</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Credit Note #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Orig. Invoice #</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4 text-center">Restocked</th>
                <th className="py-3.5 px-4 text-right">Taxable</th>
                <th className="py-3.5 px-4 text-right">Credit Total</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                    Loading verified credit notes from database...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-rose-400 font-sans">
                    <div className="space-y-2">
                      <p>Error loading credit notes: {loadError}</p>
                      <button
                        onClick={() => loadData()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                    No sales returns found in database. Click &ldquo;+ Issue Customer Credit Note&rdquo; to process your first return.
                  </td>
                </tr>
              ) : (
                returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-indigo-400">{ret.creditNoteNumber}</td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">{new Date(ret.returnDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">{ret.customerName}</td>
                    <td className="py-3.5 px-4 text-slate-400">{ret.originalInvoiceNumber || "-"}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {ret.returnReason}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      {ret.restockToWarehouse ? (
                        <span className="text-emerald-400 font-semibold">✓ Restocked</span>
                      ) : (
                        <span className="text-rose-400">Scrapped</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">₹{ret.subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">
                      ₹{ret.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => printCreditNote(ret, "A4")}
                          title="Print A4 Credit Note"
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition inline-flex items-center space-x-1 border border-slate-700 font-sans text-[11px] font-bold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>A4</span>
                        </button>
                        <button
                          onClick={() => printCreditNote(ret, "thermal80")}
                          title="Print 80mm Thermal Slip"
                          className="px-2 py-1 rounded-lg bg-teal-900/60 hover:bg-teal-800 text-teal-300 hover:text-white transition inline-flex items-center space-x-1 border border-teal-700/50 font-sans text-[11px] font-bold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>POS</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <RotateCcw className="w-5 h-5 text-indigo-400" />
                <span>+ Issue Customer Return Credit Note</span>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Customer *</label>
                  <select
                    value={selectedCustId}
                    onChange={(e) => setSelectedCustId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Original Invoice # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2627-00001"
                    value={origInvNum}
                    onChange={(e) => setOrigInvNum(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Return Reason</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  >
                    <option value="CustomerReturn">Customer Cancelled / Return</option>
                    <option value="Defective">Defective / Damaged</option>
                    <option value="Expired">Expired</option>
                    <option value="WrongItem">Wrong Item Delivered</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Restock to Warehouse</label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.warehouseName} ({w.warehouseCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Restock Action</label>
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="restockCheck"
                      checked={restock}
                      onChange={(e) => setRestock(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800"
                    />
                    <label htmlFor="restockCheck" className="text-slate-300">
                      Physically re-inward stock
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="Optional return notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Items to Return &amp; Credit
                  </span>
                  <button
                    type="button"
                    onClick={addLine}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-semibold"
                  >
                    + Add Item
                  </button>
                </div>

                {lineItems.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <label className="text-[10px] text-slate-500 block mb-0.5">Item</label>
                      <select
                        value={line.itemId}
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:outline-none"
                      >
                        <option value="">-- Choose Item --</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.sku || "No SKU"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-500 block mb-0.5">Qty</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={line.returnQuantity}
                        onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-center text-xs focus:outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-500 block mb-0.5">Rate (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={line.rate}
                        onChange={(e) => handleRateChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-right text-xs focus:outline-none"
                      />
                    </div>

                    <div className="col-span-2 text-right">
                      <label className="text-[10px] text-slate-500 block mb-0.5">Total</label>
                      <span className="font-mono font-bold text-indigo-400 text-xs inline-block pt-1">
                        ₹{line.amount.toFixed(2)}
                      </span>
                    </div>

                    <div className="col-span-1 text-center pt-3">
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        disabled={lineItems.length === 1}
                        className="text-slate-500 hover:text-rose-400 disabled:opacity-30"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-slate-800 flex justify-between font-mono font-bold text-xs text-white">
                  <span>Grand Total Credit Note:</span>
                  <span className="text-indigo-400">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30"
                >
                  {submitting ? "Processing..." : "Issue Credit Note (Persist to DB)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PHASE 20A: Action Error & User Feedback Modal ────────────────── */}
      {actionError && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-start space-x-3 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800">
                    {actionError.category}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {actionError.transactionStatus === "ROLLED_BACK" ? "ROLLED BACK (NOT SAVED)" : "NOT COMMITTED"}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1">{actionError.title}</h3>
              </div>
              <button onClick={() => setActionError(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">1. What Failed</span>
                <p className="text-slate-200">{actionError.whatFailed}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">2. Why It Failed</span>
                <p className="text-slate-300 leading-relaxed">{actionError.whyItFailed}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">3. What You Should Do Next</span>
                <p className="text-slate-300 leading-relaxed">{actionError.whatToDoNext}</p>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono">
                <span className="text-slate-500">Error ID: <strong className="text-slate-300">{actionError.correlationId}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(actionError.correlationId);
                    alert(`Copied Error ID: ${actionError.correlationId}`);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition"
                >
                  Copy ID
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
              >
                Understood / Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
