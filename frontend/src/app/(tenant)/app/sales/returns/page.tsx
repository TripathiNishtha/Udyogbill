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

export default function SalesReturnsPage() {
  const [returns, setReturns] = useState<SalesReturnDto[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReturnForPrint, setSelectedReturnForPrint] = useState<SalesReturnDto | null>(null);

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
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rRes, custRes, itemRes, whList, brList] = await Promise.all([
        salesService.getSalesReturns({ pageNumber: 1, pageSize: 50 }),
        partyService.getCustomers({ pageNumber: 1, pageSize: 100 }),
        inventoryService.getItems({ pageNumber: 1, pageSize: 100 }),
        tenantAppService.getWarehouses(),
        tenantAppService.getBranches()
      ]);

      setReturns(rRes?.items || []);
      setCustomers(custRes?.items || []);
      setItems(itemRes?.items || []);
      setWarehouses(whList || []);
      setBranches(brList || []);

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
    } catch (err) {
      console.error("Failed to load sales returns", err);
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

    const branchId = selectedBranchId || branches[0]?.id;
    const warehouseId = selectedWarehouseId || warehouses[0]?.id;

    if (!branchId || !warehouseId) {
      alert("Branch and Warehouse are required.");
      return;
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
        items: lineItems.map((l) => ({
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
      alert(err.response?.data?.message || err.message || "Failed to create credit note.");
    } finally {
      setSubmitting(false);
    }
  };

  const printCreditNote = (ret: SalesReturnDto) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Credit Note - ${ret.creditNoteNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .title { font-size: 20px; font-weight: bold; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
            th { background-color: #f3f4f6; text-align: left; }
            .total-row { font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">GST Credit Note</div>
              <div><b>Credit Note #:</b> ${ret.creditNoteNumber}</div>
              <div><b>Date:</b> ${new Date(ret.returnDate).toLocaleDateString()}</div>
            </div>
            <div>
              <div><b>Customer:</b> ${ret.customerName}</div>
              <div><b>Original Invoice #:</b> ${ret.originalInvoiceNumber || "N/A"}</div>
              <div><b>Reason:</b> ${ret.returnReason}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item Details</th>
                <th>SKU</th>
                <th>Batch</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>GST %</th>
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${ret.items.map((i, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${i.itemName}</td>
                  <td>${i.itemSku || "-"}</td>
                  <td>${i.batchNumber || "-"}</td>
                  <td>${i.returnQuantity}</td>
                  <td>₹${i.unitPrice.toFixed(2)}</td>
                  <td>${i.gstRate}%</td>
                  <td>₹${i.totalAmount.toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="7" class="total-row">Sub-Total (Taxable):</td>
                <td>₹${ret.subTotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="7" class="total-row">GST Tax Amount:</td>
                <td>₹${ret.taxAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="7" class="total-row" style="font-size: 14px;">Total Credit Value:</td>
                <td style="font-size: 14px; font-weight: bold;">₹${ret.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top: 30px; display: flex; justify-content: space-between;">
            <div>Customer Signature</div>
            <div>Authorized Signatory</div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
                      <button
                        onClick={() => printCreditNote(ret)}
                        title="Print Credit Note Voucher"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition inline-flex items-center space-x-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="font-sans text-[11px]">Print</span>
                      </button>
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
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.sku})
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
    </div>
  );
}
