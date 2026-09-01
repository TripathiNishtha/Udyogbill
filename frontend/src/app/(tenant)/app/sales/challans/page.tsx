"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck,
  Plus,
  ArrowLeft,
  Search,
  CheckCircle,
  FileText,
  Boxes,
  X,
  Printer
} from "lucide-react";
import { logisticsService, DeliveryChallan } from "@/services/logistics-services";
import { partyService } from "@/services/party-services";
import { inventoryService } from "@/services/inventory-services";

const STATUS_NAMES: Record<number, string> = {
  1: "Pending",
  2: "Dispatched",
  3: "InTransit",
  4: "OutForDelivery",
  5: "Delivered",
  6: "Cancelled"
};

export default function DeliveryChallansPage() {
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [selectedCustId, setSelectedCustId] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [transporter, setTransporter] = useState("");
  const [lrNo, setLrNo] = useState("");
  const [packagesCount, setPackagesCount] = useState<number>(1);
  const [lineItems, setLineItems] = useState([
    { itemId: "", itemName: "", itemCode: "", batchNumber: "", quantity: 10 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, custRes, itemRes] = await Promise.all([
        logisticsService.getChallans(),
        partyService.getCustomers({ pageNumber: 1, pageSize: 100 }),
        inventoryService.getItems({ pageNumber: 1, pageSize: 100 })
      ]);

      setChallans(cRes?.items || []);
      setCustomers(custRes?.items || []);
      setItems(itemRes?.items || []);

      if (custRes?.items?.length > 0) setSelectedCustId(custRes.items[0].id);

      if (itemRes?.items?.length > 0) {
        const first = itemRes.items[0];
        setLineItems([
          {
            itemId: first.id,
            itemName: first.name,
            itemCode: first.sku || "ITEM",
            batchNumber: "",
            quantity: 10
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to load challans", err);
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
    newLines[index] = {
      ...newLines[index],
      itemId: item.id,
      itemName: item.name,
      itemCode: item.sku || item.code || "ITEM"
    };
    setLineItems(newLines);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const newLines = [...lineItems];
    newLines[index].quantity = qty;
    setLineItems(newLines);
  };

  const addLine = () => {
    if (items.length === 0) return;
    const first = items[0];
    setLineItems([
      ...lineItems,
      {
        itemId: first.id,
        itemName: first.name,
        itemCode: first.sku || first.code || "ITEM",
        batchNumber: "",
        quantity: 10
      }
    ]);
  };

  const removeLine = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustId) || customers[0];
    if (!cust) {
      alert("Customer is required.");
      return;
    }

    try {
      setSubmitting(true);
      await logisticsService.createChallan({
        challanDate: new Date().toISOString(),
        customerPartyId: cust.id,
        customerName: cust.legalName,
        shippingAddress: cust.billingAddress ? `${cust.billingAddress.addressLine1}, ${cust.billingAddress.city}` : "Market Street",
        vehicleNumber: vehicleNo.trim().toUpperCase() || undefined,
        transporterName: transporter.trim() || undefined,
        transportDocNumber: lrNo.trim() || undefined,
        totalPackages: Number(packagesCount) || 1,
        items: lineItems.map((l) => ({
          itemId: l.itemId,
          itemCode: l.itemCode,
          itemName: l.itemName,
          batchNumber: l.batchNumber || undefined,
          quantity: l.quantity,
          unitName: "PCS",
          packageCount: 1,
          unitWeightKg: 0
        }))
      });

      setIsCreateOpen(false);
      setVehicleNo("");
      setTransporter("");
      setLrNo("");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to create delivery challan.");
    } finally {
      setSubmitting(false);
    }
  };

  const printChallan = (ch: DeliveryChallan) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Delivery Challan - ${ch.challanNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .title { font-size: 20px; font-weight: bold; text-transform: uppercase; color: #1d4ed8; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
            th { background-color: #f3f4f6; text-align: left; }
            .total-row { font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Delivery Challan / Dispatch Note</div>
              <div><b>Challan #:</b> ${ch.challanNumber}</div>
              <div><b>Date:</b> ${new Date(ch.challanDate).toLocaleDateString()}</div>
              <div><b>Status:</b> ${STATUS_NAMES[ch.dispatchStatus] || "Dispatched"}</div>
            </div>
            <div>
              <div><b>Customer / Consignee:</b> ${ch.customerName}</div>
              <div><b>Shipping Address:</b> ${ch.shippingAddress || "N/A"}</div>
              <div><b>Vehicle #:</b> ${ch.vehicleNumber || "N/A"}</div>
              <div><b>Transporter / LR:</b> ${ch.transporterName || "Local"} ${ch.transportDocNumber ? `(${ch.transportDocNumber})` : ""}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item Code</th>
                <th>Item Description</th>
                <th>Batch</th>
                <th>Quantity</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              ${ch.items.map((i, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${i.itemCode}</td>
                  <td>${i.itemName}</td>
                  <td>${i.batchNumber || "-"}</td>
                  <td>${i.quantity}</td>
                  <td>${i.unitName || "PCS"}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="total-row">Total Packages / Boxes:</td>
                <td colspan="2" style="font-weight: bold;">${ch.totalPackages} Boxes</td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top: 40px; display: flex; justify-content: space-between;">
            <div>Prepared By</div>
            <div>Driver / Carrier Signature</div>
            <div>Consignee Acknowledgment</div>
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
          <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Delivery Challans &amp; Dispatch</h1>
            <p className="text-sm text-slate-400">Manage goods dispatch, vehicle tracking, and bill-of-supply delivery notes</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Delivery Challan</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Challan #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Vehicle #</th>
                <th className="py-3.5 px-4">Transporter &amp; LR #</th>
                <th className="py-3.5 px-4 text-center">Packages</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    Loading verified delivery challans from database...
                  </td>
                </tr>
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No delivery challans recorded in database. Click &ldquo;+ Create Delivery Challan&rdquo; to dispatch goods.
                  </td>
                </tr>
              ) : (
                challans.map((ch) => (
                  <tr key={ch.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-blue-400">{ch.challanNumber}</td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">{new Date(ch.challanDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">{ch.customerName}</td>
                    <td className="py-3.5 px-4 text-white font-bold">{ch.vehicleNumber || "-"}</td>
                    <td className="py-3.5 px-4 font-sans text-slate-400">
                      {ch.transporterName || "Local"} {ch.transportDocNumber && `(${ch.transportDocNumber})`}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-white">{ch.totalPackages} Boxes</td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {STATUS_NAMES[ch.dispatchStatus] || "Dispatched"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => printChallan(ch)}
                        title="Print Delivery Challan Voucher"
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
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <Truck className="w-5 h-5 text-blue-400" />
                <span>+ Create Outward Delivery Challan</span>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChallan} className="space-y-4 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="e.g. DL-01-AB-1234"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Total Packages / Boxes</label>
                  <input
                    type="number"
                    min="1"
                    value={packagesCount}
                    onChange={(e) => setPackagesCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-center focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Transporter Name</label>
                  <input
                    type="text"
                    placeholder="e.g. VRL Logistics"
                    value={transporter}
                    onChange={(e) => setTransporter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">LR / Bilty Number</label>
                  <input
                    type="text"
                    placeholder="e.g. LR-99120"
                    value={lrNo}
                    onChange={(e) => setLrNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-indigo-300 font-mono focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Goods Dispatched
                  </span>
                  <button
                    type="button"
                    onClick={addLine}
                    className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold"
                  >
                    + Add Item
                  </button>
                </div>

                {lineItems.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-8">
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

                    <div className="col-span-3">
                      <label className="text-[10px] text-slate-500 block mb-0.5">Qty</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-center text-xs focus:outline-none"
                      />
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30"
                >
                  {submitting ? "Saving..." : "Save & Issue Challan (Persist to DB)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
