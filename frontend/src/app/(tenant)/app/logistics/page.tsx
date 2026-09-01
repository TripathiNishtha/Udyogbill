"use client";

import { useEffect, useState } from "react";
import {
  Truck,
  FileSpreadsheet,
  FileCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Navigation,
  ShieldCheck,
  User,
  Phone,
  Package,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  QrCode,
  FileText,
} from "lucide-react";
import {
  logisticsService,
  DeliveryChallan,
  Transporter,
  EWayBillResult,
} from "@/services/logistics-services";

export default function LogisticsHubPage() {
  const [activeTab, setActiveTab] = useState<"challans" | "ewaybills" | "transporters">("challans");

  // State
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState("");

  // Transporter Modal
  const [isTransporterModalOpen, setIsTransporterModalOpen] = useState(false);
  const [trpCode, setTrpCode] = useState("");
  const [trpName, setTrpName] = useState("");
  const [trpGstin, setTrpGstin] = useState("");
  const [trpContact, setTrpContact] = useState("");
  const [trpMobile, setTrpMobile] = useState("");
  const [trpVehicle, setTrpVehicle] = useState("");

  // E-Way Bill Modal
  const [isEwbModalOpen, setIsEwbModalOpen] = useState(false);
  const [selectedChallanId, setSelectedChallanId] = useState("");
  const [ewbVehicleNo, setEwbVehicleNo] = useState("MH-04-TR-9988");
  const [ewbDistance, setEwbDistance] = useState<number>(120);
  const [generatedEwb, setGeneratedEwb] = useState<EWayBillResult | null>(null);

  // Status Updater Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetChallan, setTargetChallan] = useState<DeliveryChallan | null>(null);
  const [newStatus, setNewStatus] = useState<number>(2); // Dispatched
  const [statusNotes, setStatusNotes] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [chRes, trRes] = await Promise.all([
        logisticsService.getChallans().catch(() => ({ items: [], totalCount: 0 })),
        logisticsService.getTransporters().catch(() => []),
      ]);

      setChallans(chRes.items || []);
      setTransporters(trRes || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTransporter = async () => {
    if (!trpName.trim() || !trpCode.trim()) {
      alert("Please provide transporter code and legal name.");
      return;
    }
    try {
      await logisticsService.createTransporter({
        transporterId: trpCode,
        legalName: trpName,
        transporterGstin: trpGstin,
        contactPerson: trpContact,
        mobile: trpMobile,
        defaultVehicleNumber: trpVehicle,
      });

      setIsTransporterModalOpen(false);
      setTrpCode("");
      setTrpName("");
      setNotification(`Transporter ${trpName} registered successfully!`);
      loadData();
    } catch {
      alert("Failed to register transporter.");
    }
  };

  const handleGenerateEWayBill = async () => {
    if (!selectedChallanId) return;
    try {
      const res = await logisticsService.generateEWayBill({
        deliveryChallanId: selectedChallanId,
        vehicleNumber: ewbVehicleNo,
        distanceKm: ewbDistance,
      });

      setGeneratedEwb(res);
      setNotification(`E-Way Bill #${res.eWayBillNumber} generated successfully!`);
      loadData();
    } catch {
      alert("Failed to generate E-Way Bill.");
    }
  };

  const handleUpdateStatus = async () => {
    if (!targetChallan) return;
    try {
      await logisticsService.updateDispatchStatus(targetChallan.id, {
        newStatus,
        notes: statusNotes,
      });

      setIsStatusModalOpen(false);
      setStatusNotes("");
      setNotification(`Dispatch status updated for Challan #${targetChallan.challanNumber}!`);
      loadData();
    } catch {
      alert("Failed to update status.");
    }
  };

  const getStatusBadge = (st: number) => {
    switch (st) {
      case 1:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">Pending Dispatch</span>;
      case 2:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Dispatched</span>;
      case 3:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">In Transit</span>;
      case 4:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Out for Delivery</span>;
      case 5:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Delivered</span>;
      case 6:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Cancelled</span>;
      default:
        return null;
    }
  };

  const filteredChallans = challans.filter(
    (c) =>
      c.challanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.vehicleNumber && c.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Truck className="w-7 h-7 text-indigo-400" />
            <span>Logistics, Dispatch & GST E-Way Bill Engine</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage delivery challans, vehicle dispatch lifecycles, and generate statutory 12-digit Indian GST E-Way Bills.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {activeTab === "transporters" && (
            <button
              onClick={() => setIsTransporterModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transporter</span>
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Delivery Challans</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {challans.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Dispatched consignment notes</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active E-Way Bills</span>
            <QrCode className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {challans.filter((c) => c.eWayBillNumber).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">12-Digit GST Validated</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>In Transit & Out for Delivery</span>
            <Navigation className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {challans.filter((c) => c.dispatchStatus === 2 || c.dispatchStatus === 3 || c.dispatchStatus === 4).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active fleet dispatches</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Registered Transporters</span>
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-2">
            {transporters.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Carrier logistics partners</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("challans")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === "challans"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Delivery Challans & Dispatch Queue</span>
        </button>
        <button
          onClick={() => setActiveTab("ewaybills")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === "ewaybills"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>E-Way Bill Generation Studio</span>
        </button>
        <button
          onClick={() => setActiveTab("transporters")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === "transporters"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Transporter Master & Fleet</span>
        </button>
      </div>

      {/* Tab 1: Challans */}
      {activeTab === "challans" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Challan No, Customer, or Vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
                <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Challan No & Date</th>
                    <th className="py-3.5 px-4">Customer & Destination</th>
                    <th className="py-3.5 px-4">Vehicle & Transporter</th>
                    <th className="py-3.5 px-4">E-Way Bill</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Loading delivery challans...
                      </td>
                    </tr>
                  ) : filteredChallans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No delivery challans found. Convert an invoice or click "Generate E-Way Bill".
                      </td>
                    </tr>
                  ) : (
                    filteredChallans.map((ch) => (
                      <tr key={ch.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-white">{ch.challanNumber}</div>
                          <div className="text-[10px] text-slate-500">{new Date(ch.challanDate).toLocaleDateString()}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{ch.customerName}</div>
                          <div className="text-[10px] text-slate-400">{ch.shippingCity || "Mumbai"}, {ch.shippingState || "MH"}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-indigo-400 font-bold">{ch.vehicleNumber || "Not Assigned"}</div>
                          <div className="text-[10px] text-slate-500">{ch.transporterName || "Direct Fleet"}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {ch.eWayBillNumber ? (
                            <span className="text-emerald-400 font-bold">{ch.eWayBillNumber}</span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedChallanId(ch.id);
                                if (ch.vehicleNumber) setEwbVehicleNo(ch.vehicleNumber);
                                setIsEwbModalOpen(true);
                              }}
                              className="text-[10px] text-amber-400 underline hover:text-amber-300"
                            >
                              + Generate EWB
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(ch.dispatchStatus)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setTargetChallan(ch);
                              setNewStatus(ch.dispatchStatus < 5 ? ch.dispatchStatus + 1 : 5);
                              setIsStatusModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px]"
                          >
                            Update Status
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: E-Way Bill Studio */}
      {activeTab === "ewaybills" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Statutory GST E-Way Bill Generator</span>
            </h3>
            <p className="text-xs text-slate-400">
              Generate 12-digit Indian GST E-Way Bills compliant with the National Informatics Centre (NIC) portal.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-slate-300 text-xs block mb-1">Select Delivery Challan / Invoice</label>
                <select
                  value={selectedChallanId}
                  onChange={(e) => setSelectedChallanId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="">-- Choose Consignment --</option>
                  {challans.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.challanNumber} - {c.customerName} ({c.vehicleNumber || "No Vehicle"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 text-xs block mb-1">Vehicle Registration Number</label>
                <input
                  type="text"
                  value={ewbVehicleNo}
                  onChange={(e) => setEwbVehicleNo(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase"
                  placeholder="e.g. MH-04-TR-9988"
                />
              </div>

              <div>
                <label className="text-slate-300 text-xs block mb-1">Approx Distance (KM)</label>
                <input
                  type="number"
                  value={ewbDistance}
                  onChange={(e) => setEwbDistance(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleGenerateEWayBill}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30"
              >
                Generate 12-Digit E-Way Bill
              </button>
            </div>
          </div>

          {generatedEwb && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-white text-sm">
                    E-Way Bill Generated: <span className="font-mono text-emerald-400">{generatedEwb.eWayBillNumber}</span>
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Valid Until: {new Date(generatedEwb.validUntilUtc).toLocaleString()}
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto">
                <pre>{generatedEwb.nicJsonPayload}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Transporters */}
      {activeTab === "transporters" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {transporters.map((trp) => (
            <div key={trp.id} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-sm">{trp.legalName}</div>
                <span className="font-mono text-[10px] text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                  {trp.transporterId}
                </span>
              </div>

              {trp.transporterGstin && (
                <div className="text-xs text-slate-400 font-mono">
                  GSTIN: <span className="text-slate-200">{trp.transporterGstin}</span>
                </div>
              )}

              <div className="space-y-1 text-xs text-slate-400">
                {trp.contactPerson && <div>Contact: <span className="text-white">{trp.contactPerson}</span></div>}
                {trp.mobile && <div>Phone: <span className="text-white font-mono">{trp.mobile}</span></div>}
                {trp.defaultVehicleNumber && (
                  <div className="text-amber-400 font-mono font-bold pt-1">
                    Fleet: {trp.defaultVehicleNumber}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transporter Modal */}
      {isTransporterModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Truck className="w-4 h-4 text-indigo-400" />
              <span>Register New Transporter / Carrier</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Transporter ID</label>
                  <input
                    type="text"
                    placeholder="e.g. TRP-GATI-01"
                    value={trpCode}
                    onChange={(e) => setTrpCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Transporter GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAACG1234F1Z9"
                    value={trpGstin}
                    onChange={(e) => setTrpGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Transporter Legal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Gati KWE Express Cargo"
                  value={trpName}
                  onChange={(e) => setTrpName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Anand Kumar"
                    value={trpContact}
                    onChange={(e) => setTrpContact(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Mobile / Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +919820011223"
                    value={trpMobile}
                    onChange={(e) => setTrpMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Default Fleet Vehicle Number</label>
                <input
                  type="text"
                  placeholder="e.g. MH-02-CD-5678"
                  value={trpVehicle}
                  onChange={(e) => setTrpVehicle(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono uppercase"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setIsTransporterModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTransporter}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
              >
                Save Transporter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {isStatusModalOpen && targetChallan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Navigation className="w-4 h-4 text-indigo-400" />
              <span>Update Dispatch Lifecycle: {targetChallan.challanNumber}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">New Dispatch Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                >
                  <option value={1}>Pending Dispatch</option>
                  <option value={2}>Dispatched</option>
                  <option value={3}>In Transit</option>
                  <option value={4}>Out For Delivery</option>
                  <option value={5}>Delivered (POD Received)</option>
                  <option value={6}>Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Status Note / Checkpoint Location</label>
                <input
                  type="text"
                  placeholder="e.g. Crossed toll plaza / Received by security"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
