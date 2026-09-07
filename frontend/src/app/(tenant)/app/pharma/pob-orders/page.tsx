"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  ArrowLeft,
  Search,
  CheckCircle,
  FileCheck,
  Building2,
  Clock,
  ArrowRight,
  ExternalLink,
  Tag,
  Truck,
  Send,
  AlertCircle,
  Gift,
  RefreshCw
} from "lucide-react";
import {
  pharmaSfaService,
  SfaPobOrder,
  SfaStockistAllocation
} from "@/services/pharma-sfa-services";
import { tenantAppService } from "@/services/tenant-app-services";

export default function PobOrdersPage() {
  const [orders, setOrders] = useState<SfaPobOrder[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stockists, setStockists] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status & Route Modals
  const [routingOrder, setRoutingOrder] = useState<SfaPobOrder | null>(null);
  const [selectedStockistId, setSelectedStockistId] = useState("");
  const [routeRemarks, setRouteRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [statusOrder, setStatusOrder] = useState<SfaPobOrder | null>(null);
  const [newStatus, setNewStatus] = useState("StockistAccepted");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [orderList, whList, stkList] = await Promise.allSettled([
        pharmaSfaService.getPobOrders(),
        tenantAppService.getWarehouses(),
        pharmaSfaService.getStockistAllocations()
      ]);

      if (orderList.status === "fulfilled") setOrders(orderList.value);
      if (whList.status === "fulfilled") {
        const whs = whList.value || [];
        setWarehouses(whs);
        if (whs.length > 0) setSelectedWarehouseId(whs[0].id);
      }
      if (stkList.status === "fulfilled") {
        setStockists(stkList.value || []);
      }
    } catch (err) {
      console.error("Failed to load POB orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConvertToInvoice = async (orderId: string) => {
    if (!selectedWarehouseId) {
      alert("Please select a fulfillment warehouse first.");
      return;
    }

    try {
      setConvertingId(orderId);
      const invoiceId = await pharmaSfaService.convertPobToInvoice(orderId, selectedWarehouseId);
      setSuccessMsg(`Order successfully converted into GST Sales Invoice (ID: ${invoiceId})!`);
      setTimeout(() => setSuccessMsg(null), 6000);
      loadData();
    } catch (err: any) {
      console.error("Conversion failed", err);
      alert(err?.response?.data?.message || "Failed to convert POB order.");
    } finally {
      setConvertingId(null);
    }
  };

  const handleRouteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routingOrder || !selectedStockistId) return;

    try {
      setActionLoading(true);
      await pharmaSfaService.routePobToStockist({
        pobOrderId: routingOrder.id,
        targetStockistPartyId: selectedStockistId,
        remarks: routeRemarks
      });
      setSuccessMsg(`Order ${routingOrder.orderNumber} successfully routed to stockist!`);
      setTimeout(() => setSuccessMsg(null), 6000);
      setRoutingOrder(null);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to route order.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusOrder) return;

    try {
      setActionLoading(true);
      await pharmaSfaService.updatePobFulfillmentStatus({
        pobOrderId: statusOrder.id,
        fulfillmentStatus: newStatus,
        stockistRemarks: statusRemarks,
        expectedDeliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined
      });
      setSuccessMsg(`Fulfillment status for ${statusOrder.orderNumber} updated to ${newStatus}!`);
      setTimeout(() => setSuccessMsg(null), 6000);
      setStatusOrder(null);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update fulfillment status.");
    } finally {
      setActionLoading(false);
    }
  };

  const getFulfillmentBadge = (status: string) => {
    switch (status) {
      case "RoutedToStockist":
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Routed to Stockist</span>;
      case "StockistAccepted":
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Stockist Accepted</span>;
      case "StockistDispatched":
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Dispatched in Transit</span>;
      case "Fulfilled":
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Fulfilled & Delivered</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">Pending Routing</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/app/pharma/sfa"
            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Sprint 5 • Dynamic Schemes & Stockist Routing
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              Field POB Orders & Stockist Fulfillment
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review secondary orders booked by MRs with active trade schemes (10+1 free goods) and route to preferred stockists.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/pharma/schemes"
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
          >
            <Tag className="w-4 h-4" /> Manage Trade Schemes
          </Link>

          {warehouses.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-medium">Warehouse:</span>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-xs font-medium text-gray-800 dark:text-gray-200"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.warehouseName}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadData}
            className="p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Field POB Orders Booked</h2>
          <span className="text-xs text-gray-500">{orders.length} orders total</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading field orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <div className="text-base font-medium text-gray-900 dark:text-white">No POB Orders Captured Yet</div>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
              Field representatives capture chemist POB orders through the mobile app during daily clinic and chemist visits.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase">
                  <th className="p-3">Order #</th>
                  <th className="p-3">Order Date</th>
                  <th className="p-3">Chemist & Booked By</th>
                  <th className="p-3">Items & Schemes Applied</th>
                  <th className="p-3">Stockist & Routing</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3">Fulfillment</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {orders.map((o) => {
                  const totalFreeQty = o.items?.reduce((acc, i) => acc + (i.freeQuantity || 0), 0) || 0;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-750/80 transition">
                      <td className="p-3 font-mono text-xs font-bold text-gray-900 dark:text-white">
                        {o.orderNumber}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-300 text-xs">
                        {new Date(o.orderDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">{o.customerName}</div>
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">MR: {o.mrName}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                          {o.items?.length || 0} line items
                        </div>
                        {totalFreeQty > 0 && (
                          <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <Gift className="w-3 h-3" /> +{totalFreeQty} Free Bonus Units
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">
                          {o.targetStockistName || "Direct Company Supply"}
                        </div>
                        <div className="mt-1">{getFulfillmentBadge(o.stockistFulfillmentStatus)}</div>
                      </td>
                      <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                        ₹{o.grandTotal.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            setStatusOrder(o);
                            setNewStatus(o.stockistFulfillmentStatus || "StockistAccepted");
                          }}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" /> Update Status
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!o.targetStockistPartyId && (
                            <button
                              onClick={() => {
                                setRoutingOrder(o);
                                setSelectedStockistId(stockists[0]?.stockistPartyId || "");
                              }}
                              className="px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold transition"
                            >
                              Route Stockist
                            </button>
                          )}
                          {o.status !== "ConvertedToSalesInvoice" ? (
                            <button
                              onClick={() => handleConvertToInvoice(o.id)}
                              disabled={convertingId === o.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              {convertingId === o.id ? "Converting..." : "GST Invoice"}
                            </button>
                          ) : (
                            <Link
                              href={`/app/sales/invoices`}
                              className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline font-medium"
                            >
                              Invoiced <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Route to Stockist Modal */}
      {routingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Route POB Order to Stockist
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Order: {routingOrder.orderNumber} (Chemist: {routingOrder.customerName})
            </p>

            <form onSubmit={handleRouteOrder} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Select Executing Stockist *
                </label>
                <select
                  required
                  value={selectedStockistId}
                  onChange={(e) => setSelectedStockistId(e.target.value)}
                  className="mt-1 w-full text-sm border rounded-lg p-2.5 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                >
                  <option value="">-- Choose Stockist --</option>
                  {stockists.map((stk) => (
                    <option key={stk.id || stk.stockistPartyId} value={stk.stockistPartyId}>
                      {stk.stockistName} {stk.stockistGstin ? `(${stk.stockistGstin})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Dispatch Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Urgent delivery needed for Monday"
                  value={routeRemarks}
                  onChange={(e) => setRouteRemarks(e.target.value)}
                  className="mt-1 w-full text-sm border rounded-lg p-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoutingOrder(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
                >
                  {actionLoading ? "Routing..." : "Confirm Stockist Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Fulfillment Status Modal */}
      {statusOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Update Stockist Fulfillment Status
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Order {statusOrder.orderNumber} • ₹{statusOrder.grandTotal.toLocaleString()}
            </p>

            <form onSubmit={handleUpdateStatus} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  New Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="mt-1 w-full text-sm border rounded-lg p-2.5 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                >
                  <option value="RoutedToStockist">Routed to Stockist</option>
                  <option value="StockistAccepted">Stockist Accepted Order</option>
                  <option value="StockistDispatched">Stockist Dispatched (In Transit)</option>
                  <option value="Fulfilled">Fulfilled & Supplied</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Expected / Actual Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="mt-1 w-full text-sm border rounded-lg p-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Stockist / Courier Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched via Express Courier"
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  className="mt-1 w-full text-sm border rounded-lg p-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusOrder(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  {actionLoading ? "Updating..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
