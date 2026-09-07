"use client";

import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Eye,
  X,
  CheckCircle,
  Clock,
  Ban,
  FileSpreadsheet,
  Building2,
  Calendar,
  IndianRupee,
  Layers,
  Printer
} from "lucide-react";
import { purchaseService } from "@/services/purchase-services";
import { inventoryService } from "@/services/inventory-services";
import { partyService } from "@/services/party-services";
import { tenantAppService, BranchDetails, WarehouseDetails } from "@/services/tenant-app-services";
import { printRawHtml } from "@/lib/print-helper";
import { printTemplateService } from "@/services/print-template-services";
import {
  PurchaseOrderList,
  PurchaseOrderDetails,
  CreatePurchaseOrderRequest,
  CreatePurchaseOrderItemRequest,
  PartyDto,
  MasterItem
} from "@/types";

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrderList[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);

  // Reference state
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDetails[]>([]);
  const [suppliers, setSuppliers] = useState<PartyDto[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);

  // Drawer & Modal State
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<
    Array<{
      itemId: string;
      itemName: string;
      sku: string;
      quantity: number;
      uomId: string;
      uomCode: string;
      unitPrice: number;
      discountPercent: number;
      taxRate: number;
    }>
  >([]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await purchaseService.getPurchaseOrders({
        pageNumber: page,
        pageSize: 15,
        searchTerm: searchTerm || undefined,
        status: statusFilter
      });
      setOrders(res?.items || []);
      setTotalCount(res?.totalCount || 0);
    } catch (err) {
      console.error("Failed to load POs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  useEffect(() => {
    // Load metadata
    Promise.all([
      tenantAppService.getBranches(),
      partyService.getSuppliers({ pageNumber: 1, pageSize: 100 }), // Suppliers
      inventoryService.getItems({ pageNumber: 1, pageSize: 100 })
    ]).then(([branchData, supplierData, itemData]) => {
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
    });
  }, []);

  const handleBranchChange = async (branchId: string) => {
    setSelectedBranchId(branchId);
    const wh = await tenantAppService.getWarehouses(branchId);
    setWarehouses(wh);
    if (wh.length > 0) setSelectedWarehouseId(wh[0].id);
  };

  const handleAddItem = (itemId: string) => {
    const itm = items.find((i) => i.id === itemId);
    if (!itm) return;
    setOrderItems([
      ...orderItems,
      {
        itemId: itm.id,
        itemName: itm.name,
        sku: itm.sku,
        quantity: 10,
        uomId: itm.primaryUomId,
        uomCode: itm.primaryUomCode,
        unitPrice: itm.purchasePrice || 100,
        discountPercent: 0,
        taxRate: itm.taxRate || 18
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId || orderItems.length === 0) {
      alert("Please select a supplier and add at least one line item.");
      return;
    }

    try {
      setSubmitting(true);
      const req: CreatePurchaseOrderRequest = {
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        partyId: selectedPartyId,
        orderDate: new Date(orderDate).toISOString(),
        expectedDeliveryDate: expectedDate ? new Date(expectedDate).toISOString() : undefined,
        notes,
        items: orderItems.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          uomId: i.uomId,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent
        }))
      };

      await purchaseService.createPurchaseOrder(req);
      setIsCreateOpen(false);
      setOrderItems([]);
      setNotes("");
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.errorMessage || "Failed to create Purchase Order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewOrder = async (id: string) => {
    try {
      const details = await purchaseService.getPurchaseOrderById(id);
      setSelectedOrder(details);
      setIsDetailsOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const [printingId, setPrintingId] = useState<string | null>(null);

  const handlePrintPo = async (orderId: string, orderNumber: string) => {
    try {
      setPrintingId(orderId);
      const preview = await printTemplateService.renderPreview({
        documentId: orderId,
        documentType: 5 // Purchase Order
      });
      printRawHtml(preview.renderedHtml, `Purchase_Order_${orderNumber}`, "A4 portrait", "6mm");
    } catch (err) {
      console.error("Print PO error:", err);
      alert("Failed to render Purchase Order print preview.");
    } finally {
      setPrintingId(null);
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">Draft</span>;
      case 2:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-800">Confirmed</span>;
      case 3:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">Partial Received</span>;
      case 4:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">Completed</span>;
      case 5:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800">Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Purchase Orders (PO)</h1>
              <p className="text-sm text-slate-400">Manage procurement orders, expected deliveries, and vendor terms</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20 transition duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>Issue Purchase Order</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search PO #, supplier name, GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadOrders()}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="sm:col-span-4 flex space-x-2">
          <select
            value={statusFilter ?? ""}
            onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="2">Confirmed</option>
            <option value="3">Partially Received</option>
            <option value="4">Completed</option>
            <option value="5">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">PO Number</th>
                <th className="py-3.5 px-4">Order Date</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Delivery Warehouse</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                    <div>Loading purchase orders...</div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-white">{po.orderNumber}</td>
                    <td className="py-3.5 px-4">{new Date(po.orderDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{po.supplierName}</div>
                      {po.supplierGSTIN && <div className="text-xs text-slate-400 font-mono">{po.supplierGSTIN}</div>}
                    </td>
                    <td className="py-3.5 px-4">{po.warehouseName}</td>
                    <td className="py-3.5 px-4 font-mono">{po.totalItemsCount} items</td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-white">₹{po.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(po.status)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleViewOrder(po.id)}
                          title="View Details"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintPo(po.id, po.orderNumber)}
                          disabled={printingId === po.id}
                          title="Print Purchase Order (A4)"
                          className="p-1.5 rounded-lg bg-teal-950/70 hover:bg-teal-900 border border-teal-800/60 text-teal-400 hover:text-teal-300 transition"
                        >
                          <Printer className="w-4 h-4" />
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

      {/* Create Purchase Order Drawer/Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-3xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-white font-bold text-lg">
                  <ShoppingCart className="w-5 h-5 text-indigo-400" />
                  <span>New Purchase Order (PO)</span>
                </div>
                <button onClick={() => setIsCreateOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Branch</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branchName} ({b.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Receiving Warehouse</label>
                    <select
                      value={selectedWarehouseId}
                      onChange={(e) => setSelectedWarehouseId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.warehouseName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Supplier (Creditor) *</label>
                    <select
                      value={selectedPartyId}
                      onChange={(e) => setSelectedPartyId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.legalName} {s.gstin ? `(${s.gstin})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Order Date *</label>
                    <input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Line Items Picker */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Line Items</label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddItem(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-indigo-400 focus:outline-none"
                    >
                      <option value="">+ Add Product</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.sku}) - MRP ₹{i.mrp}
                        </option>
                      ))}
                    </select>
                  </div>

                  {orderItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                      No items added to this PO. Select items above.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orderItems.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-12 gap-2 items-center text-xs">
                          <div className="col-span-4">
                            <div className="font-semibold text-white truncate">{item.itemName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const q = Number(e.target.value);
                                setOrderItems(orderItems.map((it, i) => (i === idx ? { ...it, quantity: q } : it)));
                              }}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-white"
                            />
                            <span className="text-[10px] text-slate-400 text-center block mt-0.5">{item.uomCode}</span>
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const p = Number(e.target.value);
                                setOrderItems(orderItems.map((it, i) => (i === idx ? { ...it, unitPrice: p } : it)));
                              }}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right text-white"
                            />
                            <span className="text-[10px] text-slate-400 block text-right mt-0.5">Rate / {item.uomCode}</span>
                          </div>
                          <div className="col-span-2 text-right font-mono font-medium text-white">
                            ₹{(item.quantity * item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Order Remarks / Terms</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Delivery within 7 business days..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  ></textarea>
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
                onClick={handleCreateOrder}
                disabled={submitting || orderItems.length === 0}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {submitting ? "Confirming..." : "Confirm PO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Order Details Drawer */}
      {isDetailsOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-lg font-bold text-white">{selectedOrder.orderNumber}</span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Order Date: {new Date(selectedOrder.orderDate).toLocaleDateString()}</div>
                </div>
                <button onClick={() => setIsDetailsOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Supplier Info */}
              <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-xs text-slate-400 uppercase font-semibold">Vendor / Supplier</div>
                <div className="font-bold text-white text-sm">{selectedOrder.supplierName}</div>
                {selectedOrder.supplierGSTIN && <div className="text-xs text-slate-400 font-mono">GSTIN: {selectedOrder.supplierGSTIN}</div>}
                {selectedOrder.supplierAddress && <div className="text-xs text-slate-400">{selectedOrder.supplierAddress}</div>}
              </div>

              {/* Items List */}
              <div className="mt-6">
                <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2">Ordered Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-sm">
                      <div>
                        <div className="font-semibold text-white">{item.itemName}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          Ordered: {item.orderQuantity} {item.uomCode} | Recv: {item.receivedQuantity} {item.uomCode}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-medium text-white">₹{item.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-slate-400">@ ₹{item.unitPrice} + {item.gstRate}% GST</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="mt-6 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Taxable Amount</span>
                  <span className="font-mono">₹{selectedOrder.taxableAmount.toFixed(2)}</span>
                </div>
                {selectedOrder.cgstAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>CGST + SGST</span>
                    <span className="font-mono">₹{(selectedOrder.cgstAmount + selectedOrder.sgstAmount).toFixed(2)}</span>
                  </div>
                )}
                {selectedOrder.igstAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>IGST</span>
                    <span className="font-mono">₹{selectedOrder.igstAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-slate-800">
                  <span>Grand Total</span>
                  <span className="font-mono text-indigo-400">₹{selectedOrder.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => handlePrintPo(selectedOrder.id, selectedOrder.orderNumber)}
                disabled={printingId === selectedOrder.id}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm flex items-center space-x-2 shadow-lg shadow-teal-600/30 transition disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>{printingId === selectedOrder.id ? "Rendering PO..." : "Print Purchase Order (A4)"}</span>
              </button>
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
