"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Plus,
  ArrowLeft,
  Search,
  CheckCircle,
  Truck,
  Building2,
  ArrowRight,
  X,
  Printer
} from "lucide-react";
import { inventoryService, StockTransferDto } from "@/services/inventory-services";
import { tenantAppService, WarehouseDetails } from "@/services/tenant-app-services";

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<StockTransferDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDetails[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [sourceWhId, setSourceWhId] = useState("");
  const [destWhId, setDestWhId] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [lineItems, setLineItems] = useState([
    { itemId: "", itemName: "", itemSku: "", batchNumber: "", transferQuantity: 10 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, whList, itemRes] = await Promise.all([
        inventoryService.getStockTransfers({ pageNumber: 1, pageSize: 50 }),
        tenantAppService.getWarehouses(),
        inventoryService.getItems({ pageNumber: 1, pageSize: 100 })
      ]);

      setTransfers(tRes?.items || []);
      setWarehouses(whList || []);
      setItems(itemRes?.items || []);

      if (whList?.length >= 2) {
        setSourceWhId(whList[0].id);
        setDestWhId(whList[1].id);
      } else if (whList?.length === 1) {
        setSourceWhId(whList[0].id);
      }

      if (itemRes?.items?.length > 0) {
        const first = itemRes.items[0];
        setLineItems([
          {
            itemId: first.id,
            itemName: first.name,
            itemSku: first.sku || "",
            batchNumber: "",
            transferQuantity: 10
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to load stock transfers", err);
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
      itemSku: item.sku || ""
    };
    setLineItems(newLines);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const newLines = [...lineItems];
    newLines[index].transferQuantity = qty;
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
        itemSku: first.sku || "",
        batchNumber: "",
        transferQuantity: 10
      }
    ]);
  };

  const removeLine = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceWhId || !destWhId) {
      alert("Please select both source and destination warehouses.");
      return;
    }
    if (sourceWhId === destWhId) {
      alert("Source and Destination warehouses must be different.");
      return;
    }

    try {
      setSubmitting(true);
      await inventoryService.createStockTransfer({
        sourceWarehouseId: sourceWhId,
        destinationWarehouseId: destWhId,
        vehicleNumber: vehicleNo.trim().toUpperCase() || undefined,
        driverName: driverName.trim() || undefined,
        notes: transferNotes.trim() || undefined,
        items: lineItems.map((l) => ({
          itemId: l.itemId,
          itemName: l.itemName,
          itemSku: l.itemSku,
          batchNumber: l.batchNumber || undefined,
          transferQuantity: l.transferQuantity
        }))
      });

      setIsCreateOpen(false);
      setTransferNotes("");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to create transfer note.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReceived = async (id: string) => {
    if (!confirm("Are you sure you want to receive and inward this transfer to destination warehouse?")) return;
    try {
      await inventoryService.receiveStockTransfer(id, "Received at destination warehouse.");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to receive transfer.");
    }
  };

  const printTransferNote = (stn: StockTransferDto) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Stock Transfer Note - ${stn.transferNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .title { font-size: 20px; font-weight: bold; text-transform: uppercase; color: #3730a3; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
            th { background-color: #f3f4f6; text-align: left; }
            .total-row { font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Stock Transfer Note (STN)</div>
              <div><b>STN #:</b> ${stn.transferNumber}</div>
              <div><b>Date:</b> ${new Date(stn.transferDate).toLocaleDateString()}</div>
              <div><b>Status:</b> ${stn.status}</div>
            </div>
            <div>
              <div><b>Source Warehouse:</b> ${stn.sourceWarehouseName}</div>
              <div><b>Destination Warehouse:</b> ${stn.destinationWarehouseName}</div>
              <div><b>Vehicle:</b> ${stn.vehicleNumber || "N/A"}</div>
              <div><b>Driver:</b> ${stn.driverName || "N/A"}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item Name</th>
                <th>SKU</th>
                <th>Batch</th>
                <th>Dispatched Qty</th>
                <th>Received Qty</th>
              </tr>
            </thead>
            <tbody>
              ${stn.items.map((i, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${i.itemName}</td>
                  <td>${i.itemSku || "-"}</td>
                  <td>${i.batchNumber || "-"}</td>
                  <td>${i.transferQuantity}</td>
                  <td>${i.receivedQuantity ?? "-"}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="total-row">Total Units Dispatched:</td>
                <td colspan="2" style="font-weight: bold;">${stn.items.reduce((s, i) => s + i.transferQuantity, 0)} Units</td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top: 40px; display: flex; justify-content: space-between;">
            <div>Dispatch Officer Signature</div>
            <div>Driver Signature</div>
            <div>Receiving In-charge Signature</div>
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
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Inter-Branch Stock Transfer (STN)</h1>
            <p className="text-sm text-slate-400">Move inventory between godowns with real PostgreSQL transaction inward/outward</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Stock Transfer Note</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Transfer #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Source Warehouse</th>
                <th className="py-3.5 px-4">Destination Warehouse</th>
                <th className="py-3.5 px-4">Vehicle &amp; Driver</th>
                <th className="py-3.5 px-4 text-center">Items Transferred</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    Loading stock transfers from database...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No stock transfers recorded. Click &ldquo;+ Create Stock Transfer Note&rdquo; to dispatch stock.
                  </td>
                </tr>
              ) : (
                transfers.map((stn) => (
                  <tr key={stn.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-indigo-400">{stn.transferNumber}</td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">{new Date(stn.transferDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-sans font-medium text-white">{stn.sourceWarehouseName}</td>
                    <td className="py-3.5 px-4 font-sans font-medium text-emerald-400">{stn.destinationWarehouseName}</td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">
                      {stn.vehicleNumber || "-"} {stn.driverName && `(${stn.driverName})`}
                    </td>
                    <td className="py-3.5 px-4 text-center text-white font-bold">
                      {stn.items.reduce((s, i) => s + i.transferQuantity, 0)} Units
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          stn.status.toLowerCase() === "received"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {stn.status.toLowerCase() === "received" ? "✓ Received" : "🚚 Dispatched"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans space-x-2">
                      {stn.status.toLowerCase() !== "received" ? (
                        <button
                          onClick={() => handleMarkReceived(stn.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow"
                        >
                          Receive Stock
                        </button>
                      ) : (
                        <span className="text-slate-500 text-xs font-mono">Completed</span>
                      )}
                      <button
                        onClick={() => printTransferNote(stn)}
                        title="Print STN Voucher"
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition inline-flex items-center"
                      >
                        <Printer className="w-3.5 h-3.5" />
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
                <Boxes className="w-5 h-5 text-indigo-400" />
                <span>+ Create Inter-Branch Stock Transfer Note</span>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Source Godown / Origin *</label>
                  <select
                    value={sourceWhId}
                    onChange={(e) => setSourceWhId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Destination Branch *</label>
                  <select
                    value={destWhId}
                    onChange={(e) => setDestWhId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-semibold focus:outline-none text-xs"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="e.g. DL-01-AB-4491"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Driver / Carrier Name</label>
                  <input
                    type="text"
                    placeholder="Driver Name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Items to Transfer
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
                        value={line.transferQuantity}
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

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Transfer Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Urgent stock replenishment"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                />
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
                  {submitting ? "Dispatching..." : "Dispatch Stock Transfer (Deduct Source)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
