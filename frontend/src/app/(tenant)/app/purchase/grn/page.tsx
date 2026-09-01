"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Eye,
  X,
  CheckCircle,
  Truck,
  Boxes,
  Calendar,
  Layers
} from "lucide-react";
import { purchaseService } from "@/services/purchase-services";
import { inventoryService } from "@/services/inventory-services";
import { partyService } from "@/services/party-services";
import { tenantAppService, BranchDetails, WarehouseDetails } from "@/services/tenant-app-services";
import {
  GrnList,
  GrnDetails,
  CreateGrnRequest,
  ReceiveGrnItemRequest,
  PartyDto,
  MasterItem,
  PurchaseOrderList
} from "@/types";

export default function GoodsReceiptNotesPage() {
  const [grns, setGrns] = useState<GrnList[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Metadata
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDetails[]>([]);
  const [suppliers, setSuppliers] = useState<PartyDto[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [confirmedPOs, setConfirmedPOs] = useState<PurchaseOrderList[]>([]);

  // Drawer & Modal State
  const [selectedGrn, setSelectedGrn] = useState<GrnDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedPoId, setSelectedPoId] = useState<string | undefined>(undefined);
  const [challanNumber, setChallanNumber] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [receivedBy, setReceivedBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [grnItems, setGrnItems] = useState<
    Array<{
      purchaseOrderItemId?: string;
      itemId: string;
      itemName: string;
      sku: string;
      batchNumber: string;
      manufacturingDate?: string;
      expiryDate?: string;
      receivedQuantity: number;
      acceptedQuantity: number;
      rejectedQuantity: number;
      uomId: string;
      uomCode: string;
      unitCost: number;
    }>
  >([]);

  const loadGrns = async () => {
    try {
      setLoading(true);
      const res = await purchaseService.getGoodsReceiptNotes({
        pageNumber: page,
        pageSize: 15,
        searchTerm: searchTerm || undefined
      });
      setGrns(res?.items || []);
      setTotalCount(res?.totalCount || 0);
    } catch (err) {
      console.error("Failed to load GRNs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrns();
  }, [page]);

  useEffect(() => {
    Promise.all([
      tenantAppService.getBranches(),
      partyService.getSuppliers({ pageNumber: 1, pageSize: 100 }),
      inventoryService.getItems({ pageNumber: 1, pageSize: 100 }),
      purchaseService.getPurchaseOrders({ pageNumber: 1, pageSize: 50, status: 2 })
    ]).then(([branchData, supplierData, itemData, poData]) => {
      setBranches(branchData);
      if (branchData.length > 0) {
        setSelectedBranchId(branchData[0].id);
        tenantAppService.getWarehouses(branchData[0].id).then((wh) => {
          setWarehouses(wh);
          if (wh.length > 0) setSelectedWarehouseId(wh[0].id);
        });
      }
      setSuppliers(supplierData.items);
      setItems(itemData.items);
      setConfirmedPOs(poData.items);
    });
  }, []);

  const handleBranchChange = async (branchId: string) => {
    setSelectedBranchId(branchId);
    const wh = await tenantAppService.getWarehouses(branchId);
    setWarehouses(wh);
    if (wh.length > 0) setSelectedWarehouseId(wh[0].id);
  };

  const handlePoSelect = async (poId: string) => {
    setSelectedPoId(poId || undefined);
    if (!poId) return;

    try {
      const poDetails = await purchaseService.getPurchaseOrderById(poId);
      setSelectedPartyId(poDetails.partyId);
      setSelectedBranchId(poDetails.branchId);
      setSelectedWarehouseId(poDetails.warehouseId);

      // Pre-fill PO items
      const prefillItems = poDetails.items.map((pi) => ({
        purchaseOrderItemId: pi.id,
        itemId: pi.itemId,
        itemName: pi.itemName,
        sku: pi.itemSku,
        batchNumber: `BATCH-${new Date().getFullYear()}-01`,
        manufacturingDate: new Date().toISOString().split("T")[0],
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split("T")[0],
        receivedQuantity: pi.remainingQuantity > 0 ? pi.remainingQuantity : pi.orderQuantity,
        acceptedQuantity: pi.remainingQuantity > 0 ? pi.remainingQuantity : pi.orderQuantity,
        rejectedQuantity: 0,
        uomId: pi.uomId,
        uomCode: pi.uomCode,
        unitCost: pi.unitPrice
      }));
      setGrnItems(prefillItems);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = (itemId: string) => {
    const itm = items.find((i) => i.id === itemId);
    if (!itm) return;
    setGrnItems([
      ...grnItems,
      {
        itemId: itm.id,
        itemName: itm.name,
        sku: itm.sku,
        batchNumber: `BATCH-${new Date().getFullYear()}-01`,
        manufacturingDate: new Date().toISOString().split("T")[0],
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split("T")[0],
        receivedQuantity: 10,
        acceptedQuantity: 10,
        rejectedQuantity: 0,
        uomId: itm.primaryUomId,
        uomCode: itm.primaryUomCode,
        unitCost: itm.purchasePrice || 80
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setGrnItems(grnItems.filter((_, idx) => idx !== index));
  };

  const handleCreateGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId || grnItems.length === 0) {
      alert("Please select a supplier and add at least one received item.");
      return;
    }

    try {
      setSubmitting(true);
      const req: CreateGrnRequest = {
        purchaseOrderId: selectedPoId,
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        partyId: selectedPartyId,
        deliveryChallanNumber: challanNumber || undefined,
        receivedDate: new Date(receivedDate).toISOString(),
        receivedBy: receivedBy || undefined,
        remarks: remarks || undefined,
        items: grnItems.map((i) => ({
          purchaseOrderItemId: i.purchaseOrderItemId,
          itemId: i.itemId,
          batchNumber: i.batchNumber,
          manufacturingDate: i.manufacturingDate ? new Date(i.manufacturingDate).toISOString() : undefined,
          expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString() : undefined,
          receivedQuantity: i.receivedQuantity,
          acceptedQuantity: i.acceptedQuantity,
          rejectedQuantity: i.rejectedQuantity,
          uomId: i.uomId,
          unitCost: i.unitCost
        }))
      };

      await purchaseService.createGrn(req);
      setIsCreateOpen(false);
      setGrnItems([]);
      setChallanNumber("");
      setRemarks("");
      loadGrns();
    } catch (err: any) {
      alert(err.response?.data?.errorMessage || "Failed to create GRN");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewGrn = async (id: string) => {
    try {
      const details = await purchaseService.getGrnById(id);
      setSelectedGrn(details);
      setIsDetailsOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Goods Receipt Notes (GRN)</h1>
              <p className="text-sm text-slate-400">Receive stock shipments, generate batches, and increment warehouse inventory</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20 transition duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>Receive Goods (New GRN)</span>
        </button>
      </div>

      {/* Filters */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Search GRN #, challan #, supplier name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadGrns()}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">GRN Number</th>
                <th className="py-3.5 px-4">Received Date</th>
                <th className="py-3.5 px-4">Linked PO</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Warehouse</th>
                <th className="py-3.5 px-4">Delivery Challan</th>
                <th className="py-3.5 px-4">Items Count</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                    <div>Loading goods receipts...</div>
                  </td>
                </tr>
              ) : grns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    No goods receipt notes found.
                  </td>
                </tr>
              ) : (
                grns.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-white">{g.grnNumber}</td>
                    <td className="py-3.5 px-4">{new Date(g.receivedDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-mono text-indigo-400">{g.purchaseOrderNumber || "Direct (No PO)"}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{g.supplierName}</td>
                    <td className="py-3.5 px-4">{g.warehouseName}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{g.deliveryChallanNumber || "N/A"}</td>
                    <td className="py-3.5 px-4 font-mono">{g.totalItemsCount} items</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                        Verified
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleViewGrn(g.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create GRN Drawer */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-white font-bold text-lg">
                  <Truck className="w-5 h-5 text-indigo-400" />
                  <span>Receive Shipment (Goods Receipt Note)</span>
                </div>
                <button onClick={() => setIsCreateOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="mt-6 space-y-4">
                {/* PO link picker */}
                <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl">
                  <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block mb-1.5">
                    Link Purchase Order (Optional)
                  </label>
                  <select
                    value={selectedPoId || ""}
                    onChange={(e) => handlePoSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Direct Receipt (No PO Reference) --</option>
                    {confirmedPOs.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.orderNumber} - {po.supplierName} (₹{po.totalAmount})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Branch</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branchName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Destination Warehouse</label>
                    <select
                      value={selectedWarehouseId}
                      onChange={(e) => setSelectedWarehouseId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.warehouseName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Supplier *</label>
                    <select
                      value={selectedPartyId}
                      onChange={(e) => setSelectedPartyId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.legalName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Delivery Challan #</label>
                    <input
                      type="text"
                      placeholder="DC-102938"
                      value={challanNumber}
                      onChange={(e) => setChallanNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Received Date</label>
                    <input
                      type="date"
                      value={receivedDate}
                      onChange={(e) => setReceivedDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Received By (Staff)</label>
                    <input
                      type="text"
                      placeholder="Warehouse Officer"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Items & Batch tracking */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Received Items & Batches</label>
                    {!selectedPoId && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddItem(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-indigo-400 focus:outline-none"
                      >
                        <option value="">+ Add Product Manually</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.sku})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {grnItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                      No items in shipment. Select a PO or add products manually.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {grnItems.map((item, idx) => (
                        <div key={idx} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-bold text-white text-sm">{item.itemName}</span>
                              <span className="ml-2 font-mono text-slate-400">({item.sku})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded text-rose-400 hover:bg-rose-950/40"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-900">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Batch Number</label>
                              <input
                                type="text"
                                value={item.batchNumber}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGrnItems(grnItems.map((it, i) => (i === idx ? { ...it, batchNumber: val } : it)));
                                }}
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white font-mono"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Expiry Date</label>
                              <input
                                type="date"
                                value={item.expiryDate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGrnItems(grnItems.map((it, i) => (i === idx ? { ...it, expiryDate: val } : it)));
                                }}
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Accepted Qty ({item.uomCode})</label>
                              <input
                                type="number"
                                min="1"
                                value={item.acceptedQuantity}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setGrnItems(
                                    grnItems.map((it, i) =>
                                      i === idx ? { ...it, acceptedQuantity: val, receivedQuantity: val + it.rejectedQuantity } : it
                                    )
                                  );
                                }}
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-emerald-400 font-bold"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Unit Cost (₹)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitCost}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setGrnItems(grnItems.map((it, i) => (i === idx ? { ...it, unitCost: val } : it)));
                                }}
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right text-white font-mono"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Total Valuation</label>
                              <div className="py-1 px-2 bg-slate-900 rounded font-mono text-right text-white font-medium">
                                ₹{(item.acceptedQuantity * item.unitCost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateGrn}
                disabled={submitting || grnItems.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                {submitting ? "Verifying & Adding Stock..." : "Confirm GRN (Intake Stock)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRN Details Drawer */}
      {isDetailsOpen && selectedGrn && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-lg font-bold text-white">{selectedGrn.grnNumber}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Verified Stock Inward
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Date: {new Date(selectedGrn.receivedDate).toLocaleDateString()}</div>
                </div>
                <button onClick={() => setIsDetailsOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-xs text-slate-400 uppercase font-semibold">Vendor / Supplier</div>
                <div className="font-bold text-white text-sm">{selectedGrn.supplierName}</div>
                {selectedGrn.purchaseOrderNumber && (
                  <div className="text-xs text-indigo-400 font-mono">Linked PO: {selectedGrn.purchaseOrderNumber}</div>
                )}
                {selectedGrn.deliveryChallanNumber && (
                  <div className="text-xs text-slate-400 font-mono">Challan: {selectedGrn.deliveryChallanNumber}</div>
                )}
              </div>

              {/* Items */}
              <div className="mt-6">
                <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2">Stock Received</h3>
                <div className="space-y-2">
                  {selectedGrn.items.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-sm">
                      <div>
                        <div className="font-semibold text-white">{item.itemName}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          Batch: {item.batchNumber || "Default"} | Exp: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "N/A"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">+{item.acceptedQuantity} {item.uomCode}</div>
                        <div className="text-xs text-slate-400">Cost: ₹{item.unitCost}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
