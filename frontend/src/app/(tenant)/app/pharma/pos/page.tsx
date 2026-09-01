"use client";

import { useState, useEffect, useRef } from "react";
import {
  Zap,
  Search,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  User,
  History,
  FlaskConical,
  CreditCard,
  Pill,
  ArrowRight,
  ShieldAlert,
  Layers,
  X
} from "lucide-react";
import {
  pharmaDeepService,
  PharmaBatch,
  DoctorPrescriber,
  ItemSubstitute
} from "@/services/pharma-deep-services";

interface BillItem {
  id: string;
  name: string;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  isScheduleH1: boolean;
  unitType: "Strip" | "Loose";
  tabsPerStrip: number;
  quantity: number;
  stripRate: number;
  unitRate: number;
  amount: number;
}

export default function PharmaPOSPage() {
  const [billItems, setBillItems] = useState<BillItem[]>([
    {
      id: "item-1",
      name: "Augmentin 625 Duo Tablet",
      sku: "AUG-625",
      batchNumber: "AG-9941",
      expiryDate: "09/27",
      isScheduleH1: true,
      unitType: "Strip",
      tabsPerStrip: 10,
      quantity: 2,
      stripRate: 200,
      unitRate: 200,
      amount: 400
    },
    {
      id: "item-2",
      name: "Pan 40 Tablet",
      sku: "PAN-40",
      batchNumber: "PN-8102",
      expiryDate: "10/26",
      isScheduleH1: false,
      unitType: "Loose",
      tabsPerStrip: 15,
      quantity: 5,
      stripRate: 150,
      unitRate: 10, // 150 / 15
      amount: 50
    }
  ]);

  // Customer & Prescriber state
  const [patientPhone, setPatientPhone] = useState("9811002233");
  const [patientName, setPatientName] = useState("Sunil Sharma");
  const [selectedDoctor, setSelectedDoctor] = useState("Dr. Arvind Mehta (DMC-44910)");
  const [doctors, setDoctors] = useState<DoctorPrescriber[]>([]);
  const [batches, setBatches] = useState<PharmaBatch[]>([]);

  // Modals & UI
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [substituteList, setSubstituteList] = useState<ItemSubstitute[]>([]);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search input ref for hotkey focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPrerequisites();

    // Keyboard Shortcuts Listener (F2, F7, F8, F9)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        showNotification("Hotkey F2: Focused Quick Medicine Search");
      } else if (e.key === "F8") {
        e.preventDefault();
        handleOpenSubstituteFinder();
      } else if (e.key === "F9") {
        e.preventDefault();
        handleFinalizeBill();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadPrerequisites = async () => {
    const docList = await pharmaDeepService.getDoctors();
    setDoctors(docList);
    const batchList = await pharmaDeepService.getBatches(undefined, false);
    setBatches(batchList);
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add Item to Bill
  const handleAddBatchToBill = (batch: PharmaBatch) => {
    if (batch.isExpired) {
      alert("BLOCKED: Cannot sell expired pharmaceutical drug!");
      return;
    }

    const tabsPerStrip = 10;
    const newItem: BillItem = {
      id: "b-" + Date.now(),
      name: batch.itemName,
      sku: batch.sku,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDateMonthYear,
      isScheduleH1: batch.itemName.toLowerCase().includes("augmentin") || batch.itemName.toLowerCase().includes("alprazolam"),
      unitType: "Strip",
      tabsPerStrip,
      quantity: 1,
      stripRate: batch.saleRate,
      unitRate: batch.saleRate,
      amount: batch.saleRate
    };

    setBillItems([...billItems, newItem]);
    showNotification(`Added ${batch.itemName} (${batch.batchNumber}) to invoice!`);
  };

  // Switch between Strip and Loose Tablet
  const handleToggleUnit = (index: number, newUnit: "Strip" | "Loose") => {
    const updated = [...billItems];
    const item = updated[index];
    item.unitType = newUnit;

    if (newUnit === "Loose") {
      item.unitRate = Math.round((item.stripRate / item.tabsPerStrip) * 100) / 100;
    } else {
      item.unitRate = item.stripRate;
    }
    item.amount = Math.round(item.quantity * item.unitRate * 100) / 100;
    setBillItems(updated);
  };

  // Update Quantity
  const handleUpdateQty = (index: number, qty: number) => {
    if (qty <= 0) return;
    const updated = [...billItems];
    const item = updated[index];
    item.quantity = qty;
    item.amount = Math.round(qty * item.unitRate * 100) / 100;
    setBillItems(updated);
  };

  // Remove Line
  const handleRemoveItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  // Open Substitute Finder
  const handleOpenSubstituteFinder = async () => {
    const subs = await pharmaDeepService.findSubstitutes("Amoxicillin");
    setSubstituteList(subs);
    setShowSubstituteModal(true);
  };

  // Replace item with substitute
  const handleSelectSubstitute = (sub: ItemSubstitute) => {
    const tabsPerStrip = 10;
    const newItem: BillItem = {
      id: "sub-" + Date.now(),
      name: sub.itemName,
      sku: sub.sku,
      batchNumber: sub.earliestExpiryBatch,
      expiryDate: sub.earliestExpiryDate,
      isScheduleH1: true,
      unitType: "Strip",
      tabsPerStrip,
      quantity: 1,
      stripRate: sub.saleRate,
      unitRate: sub.saleRate,
      amount: sub.saleRate
    };

    setBillItems([...billItems, newItem]);
    setShowSubstituteModal(false);
    showNotification(`Substituted with high-margin ${sub.itemName} (${sub.marginPercent}% margin)!`);
  };

  // 2-Second Repeat Prescription from Patient Phone
  const handleRepeatPrescription = () => {
    const repeatItems: BillItem[] = [
      {
        id: "rep-1",
        name: "Pan 40 Tablet",
        sku: "PAN-40",
        batchNumber: "PN-8102",
        expiryDate: "10/26",
        isScheduleH1: false,
        unitType: "Strip",
        tabsPerStrip: 15,
        quantity: 1,
        stripRate: 150,
        unitRate: 150,
        amount: 150
      },
      {
        id: "rep-2",
        name: "Augmentin 625 Duo Tablet",
        sku: "AUG-625",
        batchNumber: "AG-9941",
        expiryDate: "09/27",
        isScheduleH1: true,
        unitType: "Strip",
        tabsPerStrip: 10,
        quantity: 1,
        stripRate: 200,
        unitRate: 200,
        amount: 200
      }
    ];

    setBillItems(repeatItems);
    setShowRepeatModal(false);
    showNotification("Repeated patient prescription from Dr. Arvind Mehta (24 Aug 2026)!");
  };

  // Finalize Bill
  const handleFinalizeBill = async () => {
    if (billItems.length === 0) {
      alert("Please add at least one medicine to the bill.");
      return;
    }

    const hasScheduleH1 = billItems.some((i) => i.isScheduleH1);
    if (hasScheduleH1 && (!patientName || !selectedDoctor)) {
      alert("SCHEDULE H1 AUDIT REQUIREMENT: Patient Name and Prescriber Doctor Registration Number are mandatory!");
      return;
    }

    // Record Schedule H1 entries automatically
    for (const item of billItems) {
      if (item.isScheduleH1) {
        await pharmaDeepService.recordScheduleH1Entry({
          invoiceId: "inv-" + Date.now(),
          invoiceNumber: `INV-PH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          supplyDate: new Date().toISOString(),
          patientName,
          patientAddressPhone: `${patientPhone} (Delhi)`,
          prescriberDoctorName: selectedDoctor.split("(")[0].trim(),
          prescriberRegNumber: selectedDoctor.includes("(") ? selectedDoctor.split("(")[1].replace(")", "") : "DMC-44910",
          drugName: item.name,
          batchNumber: item.batchNumber,
          quantitySupplied: item.quantity,
          manufacturerName: "Standard Pharma Ltd"
        });
      }
    }

    showNotification("Bill Saved & Schedule H1 Entry Audited! Launching thermal printer...");
    window.print();
  };

  const subTotal = billItems.reduce((acc, item) => acc + item.amount, 0);
  const gstAmount = Math.round(subTotal * 0.12 * 100) / 100; // 12% standard pharma GST
  const grandTotal = Math.round((subTotal + gstAmount) * 100) / 100;
  const hasScheduleH1 = billItems.some((i) => i.isScheduleH1);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* POS Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Chemist Rapid POS Billing
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30">
                FEFO & Strip Math
              </span>
            </h1>
            <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">F2</kbd> Search</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">F8</kbd> Substitute</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">F9</kbd> Save & Print</span>
            </div>
          </div>
        </div>

        {/* Patient & Doctor Selector Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <User className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Patient Phone..."
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none w-28 font-mono"
            />
            <button
              onClick={() => setShowRepeatModal(true)}
              title="Repeat Last Prescription (2 Seconds)"
              className="px-2 py-0.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              <History className="w-3 h-3" /> Repeat
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Stethoscope className="w-4 h-4 text-teal-400" />
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none max-w-[200px]"
            >
              <option value="Dr. Arvind Mehta (DMC-44910)">Dr. Arvind Mehta (DMC-44910)</option>
              <option value="Dr. Shweta Rao (DMC-88219)">Dr. Shweta Rao (DMC-88219)</option>
              <option value="Self / OTC Prescription">Self / OTC Prescription</option>
            </select>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-teal-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-teal-400 z-50 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Main Grid: Medicine Search & Quick Catalog vs Invoice Bill Tray */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Fast Item Catalog with In-Stock Batches */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-teal-400" /> Quick Medicine Search (F2)
              </h2>
              <span className="text-[11px] text-teal-400 font-mono">FEFO Auto-Sorting</span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Type brand name, salt, or scan barcode..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Quick Available Batches Grid */}
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {batches.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleAddBatchToBill(b)}
                  className="p-3 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-xl cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-white group-hover:text-teal-300 transition-colors">
                        {b.itemName}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono bg-slate-800 px-1.5 py-0.2 rounded text-[10px] text-cyan-400">
                          {b.batchNumber}
                        </span>
                        <span>Exp: <strong className="text-slate-200 font-mono">{b.expiryDateMonthYear}</strong></span>
                        <span>•</span>
                        <span>{b.rackLocation || "General"}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400">
                        ₹{b.saleRate}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {b.currentStock} in stock
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Bill Tray with Strip/Loose Toggle & Totals */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Current Prescription Bill</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300">
                  {billItems.length} Items
                </span>
                {hasScheduleH1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Schedule H1 Enforced
                  </span>
                )}
              </div>

              <button
                onClick={handleOpenSubstituteFinder}
                className="px-3 py-1 bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-700/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
              >
                <FlaskConical className="w-3.5 h-3.5" /> Salt Substitute (F8)
              </button>
            </div>

            {/* Bill Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5">Medicine & Batch</th>
                    <th className="py-2.5 text-center">Unit / Packaging</th>
                    <th className="py-2.5 text-center">Qty</th>
                    <th className="py-2.5 text-right">Unit Rate</th>
                    <th className="py-2.5 text-right">Total</th>
                    <th className="py-2.5 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {billItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono bg-slate-800 px-1 py-0.2 rounded text-cyan-400">
                            {item.batchNumber}
                          </span>
                          <span>Exp: {item.expiryDate}</span>
                          {item.isScheduleH1 && (
                            <span className="text-rose-400 font-bold">Schedule H1</span>
                          )}
                        </div>
                      </td>

                      {/* Strip vs Loose Toggle */}
                      <td className="py-3 text-center">
                        <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleUnit(idx, "Strip")}
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                              item.unitType === "Strip"
                                ? "bg-teal-600 text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Strip
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleUnit(idx, "Loose")}
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                              item.unitType === "Loose"
                                ? "bg-amber-600 text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Loose ({item.tabsPerStrip}T)
                          </button>
                        </div>
                      </td>

                      {/* Quantity Input */}
                      <td className="py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQty(idx, parseInt(e.target.value) || 1)}
                          className="w-14 bg-slate-950 border border-slate-700 rounded p-1 text-center text-xs font-bold text-white focus:outline-none focus:border-teal-500"
                        />
                      </td>

                      <td className="py-3 text-right text-slate-300 font-mono">
                        ₹{item.unitRate}
                      </td>

                      <td className="py-3 text-right font-bold text-emerald-400 font-mono">
                        ₹{item.amount}
                      </td>

                      <td className="py-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bill Summary & Finalize Checkout */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Amount:</span>
                  <span className="font-mono">₹{subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Pharma GST (12%):</span>
                  <span className="font-mono">₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                  <span>Grand Total (Net Payable):</span>
                  <span className="font-mono text-emerald-400">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleFinalizeBill}
                  className="col-span-2 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-900/40 active:scale-98 transition-all"
                >
                  <Printer className="w-4 h-4" /> Save & Print Invoice (F9)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Salt Substitute Finder Modal (F8) */}
      {showSubstituteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-teal-400" /> Chemical Salt Substitute Engine (F8)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing in-stock generic bio-equivalents with chemist profit margins.
                </p>
              </div>
              <button onClick={() => setShowSubstituteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {substituteList.map((sub) => (
                <div
                  key={sub.itemId}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-teal-500/40 transition-all"
                >
                  <div>
                    <div className="font-bold text-sm text-white">{sub.itemName}</div>
                    <div className="text-xs text-slate-400">{sub.manufacturer} • Formula: {sub.saltComposition}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Batch: <strong className="text-slate-300 font-mono">{sub.earliestExpiryBatch}</strong> (Exp: {sub.earliestExpiryDate})
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400">{sub.inStockQuantity} In Stock</div>
                      <div className="text-sm font-extrabold text-teal-300">₹{sub.saleRate}</div>
                      <div className="text-[10px] font-bold text-emerald-400">{sub.marginPercent}% Margin</div>
                    </div>

                    <button
                      onClick={() => handleSelectSubstitute(sub)}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow"
                    >
                      Substitute
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Patient 2-Second Repeat Prescription Modal */}
      {showRepeatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <History className="w-5 h-5 text-teal-400" /> Patient Previous Prescription
              </h3>
              <button onClick={() => setShowRepeatModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs text-slate-400">
                Patient: <strong className="text-white">Sunil Sharma</strong> ({patientPhone})
              </div>
              <div className="text-xs text-slate-400">
                Last Visit: <strong className="text-teal-400">24 Aug 2026</strong> by Dr. Arvind Mehta
              </div>
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <div className="text-xs font-semibold text-slate-300">• Pan 40 Tablet (1 Strip)</div>
                <div className="text-xs font-semibold text-slate-300">• Augmentin 625 Duo Tablet (1 Strip)</div>
              </div>
            </div>

            <button
              onClick={handleRepeatPrescription}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4" /> Autofill Entire Prescription in 1-Click
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
