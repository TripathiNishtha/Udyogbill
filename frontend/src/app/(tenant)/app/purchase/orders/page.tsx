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
      freeQuantity: number;
      uomId: string;
      uomCode: string;
      unitPrice: number;
      discountPercent: number;
      schemeDiscountPercent: number;
      cashDiscountPercent: number;
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
        freeQuantity: 0,
        uomId: itm.primaryUomId,
        uomCode: itm.primaryUomCode,
        unitPrice: itm.purchasePrice || 100,
        discountPercent: 0,
        schemeDiscountPercent: 0,
        cashDiscountPercent: 0,
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
          freeQuantity: i.freeQuantity,
          uomId: i.uomId,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent,
          schemeDiscountPercent: i.schemeDiscountPercent,
          cashDiscountPercent: i.cashDiscountPercent
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
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-muted text-muted-foreground border border-border">Draft</span>;
      case 2:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Confirmed</span>;
      case 3:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Partial Received</span>;
      case 4:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Completed</span>;
      case 5:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Purchase Orders (PO)</h1>
              <p className="text-sm text-muted-foreground">Manage procurement orders, expected deliveries, and vendor terms</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/20 transition duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Issue Purchase Order</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search PO #, supplier name, GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadOrders()}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>

        <div className="sm:col-span-4 flex space-x-2">
          <select
            value={statusFilter ?? ""}
            onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
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
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-surface-muted text-xs uppercase text-muted-foreground font-bold border-b border-border tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-bold text-foreground">PO Number</th>
                <th className="py-3.5 px-4 font-bold text-foreground">Order Date</th>
                <th className="py-3.5 px-4 font-bold text-foreground">Supplier</th>
                <th className="py-3.5 px-4 font-bold text-foreground">Delivery Warehouse</th>
                <th className="py-3.5 px-4 font-bold text-foreground">Items</th>
                <th className="py-3.5 px-4 text-right font-bold text-foreground">Total Amount</th>
                <th className="py-3.5 px-4 text-center font-bold text-foreground">Status</th>
                <th className="py-3.5 px-4 text-center font-bold text-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                    <div>Loading purchase orders...</div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id} className="hover:bg-surface-muted/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{po.orderNumber}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{new Date(po.orderDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{po.supplierName}</div>
                      {po.supplierGSTIN && <div className="text-xs text-muted-foreground font-mono">{po.supplierGSTIN}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-foreground">{po.warehouseName}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">{po.totalItemsCount} items</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">₹{po.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(po.status)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleViewOrder(po.id)}
                          title="View Details"
                          className="p-1.5 rounded-lg bg-surface-muted hover:bg-surface-elevated border border-border text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintPo(po.id, po.orderNumber)}
                          disabled={printingId === po.id}
                          title="Print Purchase Order (A4)"
                          className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-600 dark:text-teal-400 transition cursor-pointer"
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

      {/* Create Purchase Order Modal (Centered, Modern, Spacious) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border bg-surface-muted/60 backdrop-blur-sm flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground tracking-wide">Create Purchase Order (PO)</h2>
                  <p className="text-xs text-muted-foreground">Issue official procurement order to registered suppliers with free qty & scheme discounts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-muted transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <form className="space-y-6">
                {/* Branch & Warehouse & Supplier Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-muted/60 border border-border">
                  <div>
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1.5">Branch</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branchName} ({b.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1.5">Receiving Warehouse</label>
                    <select
                      value={selectedWarehouseId}
                      onChange={(e) => setSelectedWarehouseId(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.warehouseName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1.5">Supplier (Creditor) *</label>
                    <select
                      value={selectedPartyId}
                      onChange={(e) => setSelectedPartyId(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-indigo-500 font-medium"
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
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1.5">Order Date *</label>
                    <input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                {/* Line Items Section */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Purchase Order Items</h3>
                      <p className="text-[11px] text-muted-foreground">Add products to this purchase order. All rates are auto-calculated.</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground hidden sm:inline">Select Product:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddItem(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                      >
                        <option value="">+ Add Product to PO...</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.sku}) - MRP ₹{i.mrp}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {orderItems.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl bg-surface-muted/40 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-muted-foreground mx-auto">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-semibold text-foreground">No items added to this PO yet</div>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Click the <span className="text-indigo-600 dark:text-indigo-400 font-semibold">+ Add Product to PO</span> dropdown above to select goods from your inventory.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden bg-surface">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface-muted text-muted-foreground text-[10px] uppercase font-bold tracking-wider border-b border-border">
                            <tr>
                              <th className="px-3 py-2.5 min-w-[160px] text-foreground font-bold">Product / Item</th>
                              <th className="px-2 py-2.5 w-24 text-center text-foreground font-bold">Order Qty</th>
                              <th className="px-2 py-2.5 w-20 text-center text-emerald-600 dark:text-emerald-400 font-bold">+ Free Qty</th>
                              <th className="px-2 py-2.5 w-28 text-right text-foreground font-bold">Unit Rate ₹</th>
                              <th className="px-2 py-2.5 w-20 text-center text-amber-600 dark:text-amber-400 font-bold">Disc %</th>
                              <th className="px-2 py-2.5 w-20 text-center text-indigo-600 dark:text-indigo-400 font-bold">Sch %</th>
                              <th className="px-2 py-2.5 w-24 text-center text-foreground font-bold">GST %</th>
                              <th className="px-3 py-2.5 w-28 text-right text-foreground font-bold">Net Amount</th>
                              <th className="px-2 py-2.5 w-10 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {orderItems.map((item, idx) => {
                              const gross = item.quantity * item.unitPrice;
                              const totalDiscPct = item.discountPercent + item.schemeDiscountPercent + item.cashDiscountPercent;
                              const lineNet = gross - (gross * (totalDiscPct / 100));
                              return (
                                <tr key={idx} className="hover:bg-surface-muted/60 transition">
                                  <td className="px-3 py-2.5">
                                    <div className="font-semibold text-foreground truncate max-w-[220px]">{item.itemName}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">{item.sku}</div>
                                  </td>
                                  <td className="px-2 py-2.5">
                                    <div className="flex items-center space-x-1">
                                      <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const q = Number(e.target.value);
                                          setOrderItems(orderItems.map((it, i) => (i === idx ? { ...it, quantity: q } : it)));
                                        }}
                                        className="w-16 px-1.5 py-1 bg-surface border border-border rounded-lg text-center text-foreground font-semibold focus:outline-none focus:border-indigo-500"
                                      />
                                      <span className="text-[10px] text-muted-foreground font-mono">{item.uomCode}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-2.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.freeQuantity}
                                      onChange={(e) => {
                                        const fq = Number(e.target.value);
                                        setOrderItems(orderItems.map((it, i) => (i === idx ? { ...it, freeQuantity: fq } : it)));
                                      }}
                                      className="w-16 px-1.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                                    />
                                  </td>
                                  <td className="px-2 py-2.5 text-right">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.unitPrice}
                                      onChange={(e) => {
                                        const p = Number(e.target.value);
                                        setOrderItems(orderItems.map((it, i) => (i === idx ? { ...it, unitPrice: p } : it)));
                                      }}
                                      className="w-24 px-1.5 py-1 bg-surface border border-border rounded-lg text-right text-foreground font-mono font-semibold focus:outline-none focus:border-indigo-500"
                                    />
                                  </td>
                                  <td className="px-2 py-2.5 text-center">
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      max="100"
                                      value={item.discountPercent}
                                      onChange={(e) => {
                                        const d = Number(e.target.value);
                                        setOrderItems(orderItems.map((it, i) => (i === idx ? { ...it, discountPercent: d } : it)));
                                      }}
                                      className="w-14 px-1 py-1 bg-surface border border-border rounded-lg text-center text-amber-600 dark:text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                                    />
                                  </td>
                                  <td className="px-2 py-2.5 text-center">
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      max="100"
                                      value={item.schemeDiscountPercent}
                                      onChange={(e) => {
                                        const sc = Number(e.target.value);
                                        setOrderItems(orderItems.map((it, i) => (i === idx ? { ...it, schemeDiscountPercent: sc } : it)));
                                      }}
                                      className="w-14 px-1 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-center text-indigo-600 dark:text-indigo-400 font-bold focus:outline-none focus:border-indigo-500"
                                    />
                                  </td>
                                  <td className="px-2 py-2.5 text-center font-mono font-semibold text-foreground">
                                    {item.taxRate}%
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                                    ₹{lineNet.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-2 py-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(idx)}
                                      className="p-1 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
                                      title="Remove item"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* PO Summary Strip */}
                      <div className="px-4 py-3 bg-surface-muted border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
                        <div className="flex items-center space-x-4 text-muted-foreground">
                          <span>Total Line Items: <strong className="text-foreground font-bold">{orderItems.length}</strong></span>
                          <span>Total Units: <strong className="text-foreground font-bold">{orderItems.reduce((acc, cur) => acc + cur.quantity, 0)}</strong></span>
                          <span>Free Units: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{orderItems.reduce((acc, cur) => acc + (cur.freeQuantity || 0), 0)}</strong></span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-muted-foreground font-medium">Estimated PO Value:</span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-base">
                            ₹{orderItems.reduce((acc, cur) => {
                              const gross = cur.quantity * cur.unitPrice;
                              const disc = gross * ((cur.discountPercent + cur.schemeDiscountPercent + cur.cashDiscountPercent) / 100);
                              return acc + (gross - disc);
                            }, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div>
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1.5">Order Remarks / Delivery Terms</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Delivery within 7 business days, pack in corrugated cartons..."
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-indigo-500 font-medium"
                  ></textarea>
                </div>
              </form>
            </div>

            {/* Modal Footer with Safe Margin */}
            <div className="px-6 py-4 border-t border-border bg-surface flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-muted-foreground">
                Purchase Order status will be set to <span className="text-indigo-600 dark:text-indigo-400 font-bold">Placed</span>.
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-surface-muted hover:bg-surface border border-border text-foreground rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={submitting || orderItems.length === 0}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? "Confirming..." : "Confirm Purchase Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Order Details Modal (Centered, Clean, Modern) */}
      {isDetailsOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-surface-muted/60 backdrop-blur-sm flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-base font-bold text-foreground">{selectedOrder.orderNumber}</span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="text-xs text-muted-foreground">Order Date: {new Date(selectedOrder.orderDate).toLocaleDateString()}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-muted transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Supplier Info */}
              <div className="p-4 bg-surface-muted/60 rounded-xl border border-border space-y-1">
                <div className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Vendor / Supplier</div>
                <div className="font-bold text-foreground text-sm">{selectedOrder.supplierName}</div>
                {selectedOrder.supplierGSTIN && <div className="text-xs text-muted-foreground font-mono">GSTIN: {selectedOrder.supplierGSTIN}</div>}
                {selectedOrder.supplierAddress && <div className="text-xs text-muted-foreground">{selectedOrder.supplierAddress}</div>}
              </div>

              {/* Items List */}
              <div>
                <h3 className="text-xs uppercase font-bold text-foreground tracking-wider mb-2">Ordered Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="p-3 bg-surface border border-border rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-semibold text-foreground text-sm">{item.itemName}</div>
                        <div className="text-xs text-muted-foreground font-mono flex flex-wrap items-center gap-2 mt-1">
                          <span>Ordered: <strong className="text-foreground">{item.orderQuantity} {item.uomCode}</strong></span>
                          {item.freeQuantity && item.freeQuantity > 0 ? (
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded text-[10px]">
                              +{item.freeQuantity} Free
                            </span>
                          ) : null}
                          <span>| Recv: {item.receivedQuantity} {item.uomCode}</span>
                          {item.discountPercent > 0 || (item.schemeDiscountPercent && item.schemeDiscountPercent > 0) ? (
                            <span className="text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
                              (Disc: {item.discountPercent}%{item.schemeDiscountPercent ? ` + ${item.schemeDiscountPercent}% Sch` : ""})
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-foreground text-sm">₹{item.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">@ ₹{item.unitPrice} + {item.gstRate}% GST</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-4 bg-surface-muted/60 rounded-xl border border-border space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground font-medium">
                  <span>Taxable Amount</span>
                  <span className="font-mono text-foreground font-semibold">₹{selectedOrder.taxableAmount.toFixed(2)}</span>
                </div>
                {selectedOrder.cgstAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground font-medium">
                    <span>CGST + SGST</span>
                    <span className="font-mono text-foreground font-semibold">₹{(selectedOrder.cgstAmount + selectedOrder.sgstAmount).toFixed(2)}</span>
                  </div>
                )}
                {selectedOrder.igstAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground font-medium">
                    <span>IGST</span>
                    <span className="font-mono text-foreground font-semibold">₹{selectedOrder.igstAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-foreground font-bold text-sm pt-2 border-t border-border">
                  <span>Grand Total</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 text-base font-bold">₹{selectedOrder.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-surface flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => handlePrintPo(selectedOrder.id, selectedOrder.orderNumber)}
                disabled={printingId === selectedOrder.id}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 shadow-md shadow-teal-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{printingId === selectedOrder.id ? "Rendering PO..." : "Print Purchase Order (A4)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="px-5 py-2 bg-surface-muted hover:bg-surface border border-border text-foreground font-semibold rounded-xl text-xs transition cursor-pointer"
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
