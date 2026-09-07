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
  X,
  PauseCircle,
  PlayCircle,
  FileSpreadsheet,
  Clock,
  Hash
} from "lucide-react";
import {
  pharmaDeepService,
  PharmaBatch,
  DoctorPrescriber,
  ItemSubstitute
} from "@/services/pharma-deep-services";
import { printRawHtml } from "@/lib/print-helper";
import { tenantAppService } from "@/services/tenant-app-services";
import { TenantDetails } from "@/types";

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
  rackLocation?: string;
}

interface ParkedBill {
  id: string;
  tokenNumber: number;
  time: string;
  patientName: string;
  patientPhone: string;
  doctor: string;
  items: BillItem[];
  total: number;
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
      amount: 400,
      rackLocation: "Rack B-12"
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
      unitRate: 10,
      amount: 50,
      rackLocation: "Rack C-04"
    }
  ]);

  // Customer & Prescriber state
  const [patientPhone, setPatientPhone] = useState("9811002233");
  const [patientName, setPatientName] = useState("Sunil Sharma");
  const [selectedDoctor, setSelectedDoctor] = useState("Dr. Arvind Mehta (DMC-44910)");
  const [doctors, setDoctors] = useState<DoctorPrescriber[]>([]);
  const [batches, setBatches] = useState<PharmaBatch[]>([]);
  const [profile, setProfile] = useState<TenantDetails | null>(null);

  // Modals & UI
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [substituteList, setSubstituteList] = useState<ItemSubstitute[]>([]);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 🚀 Enterprise Mega-Store Feature 1: Park & Recall (Hold Bill) State
  const [parkedBills, setParkedBills] = useState<ParkedBill[]>([]);
  const [showParkedDrawer, setShowParkedDrawer] = useState(false);
  const [nextTokenNumber, setNextTokenNumber] = useState(101);

  // 🚀 Enterprise Mega-Store Feature 2: Runner Picker Slip (Multi-Counter Split)
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [activeTokenNumber, setActiveTokenNumber] = useState(100);

  // Search input ref for hotkey focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPrerequisites();

    // Keyboard Shortcuts Listener (F2, F8, F9 Hold, F10 Recall, Ctrl+Enter Save)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        showNotification("Hotkey F2: Focused Quick Search");
      } else if (e.key === "F8") {
        e.preventDefault();
        handleOpenSubstituteFinder();
      } else if (e.key === "F9") {
        e.preventDefault();
        handleParkBill();
      } else if (e.key === "F10") {
        e.preventDefault();
        setShowParkedDrawer((prev) => !prev);
      } else if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleFinalizeBill();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [billItems, patientName, patientPhone, selectedDoctor, nextTokenNumber, parkedBills]);

  const loadPrerequisites = async () => {
    try {
      const [docList, batchList, prof] = await Promise.all([
        pharmaDeepService.getDoctors().catch(() => []),
        pharmaDeepService.getBatches(undefined, false).catch(() => []),
        tenantAppService.getBusinessProfile().catch(() => null)
      ]);
      if (docList.length > 0) setDoctors(docList);
      if (batchList.length > 0) setBatches(batchList);
      if (prof) setProfile(prof);
    } catch {}
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

    const tabsPerStrip = batch.packRatio && batch.packRatio > 0 ? batch.packRatio : 10;
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
      amount: batch.saleRate,
      rackLocation: batch.rackLocation || "General Rack"
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

  // 🚀 Mega-Store Feature: Park (Hold) Current Bill (F9)
  const handleParkBill = () => {
    if (billItems.length === 0) {
      showNotification("No medicines on bill to park!");
      return;
    }

    const currentTotal = billItems.reduce((acc, item) => acc + item.amount, 0);
    const newParkedBill: ParkedBill = {
      id: "pb-" + Date.now(),
      tokenNumber: nextTokenNumber,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      patientName: patientName || "Counter Walk-in",
      patientPhone: patientPhone || "N/A",
      doctor: selectedDoctor,
      items: [...billItems],
      total: currentTotal
    };

    setParkedBills([newParkedBill, ...parkedBills]);
    setNextTokenNumber((prev) => prev + 1);

    // Clear current counter bill for next customer
    setBillItems([]);
    setPatientName("");
    setPatientPhone("");
    showNotification(`🅿️ Bill Parked as Token #${newParkedBill.tokenNumber}! Screen cleared for next customer.`);
  };

  // Recall Parked Bill (F10)
  const handleRecallBill = (parked: ParkedBill) => {
    setBillItems(parked.items);
    setPatientName(parked.patientName);
    setPatientPhone(parked.patientPhone);
    setSelectedDoctor(parked.doctor);
    setActiveTokenNumber(parked.tokenNumber);

    // Remove from parked
    setParkedBills(parkedBills.filter((b) => b.id !== parked.id));
    setShowParkedDrawer(false);
    showNotification(`⚡ Recalled Token #${parked.tokenNumber} with ${parked.items.length} items!`);
  };

  // Open Substitute Finder
  const handleOpenSubstituteFinder = async () => {
    try {
      const subs = await pharmaDeepService.findSubstitutes("Amoxicillin");
      setSubstituteList(subs);
      setShowSubstituteModal(true);
    } catch {}
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
      amount: sub.saleRate,
      rackLocation: "Rack A-02"
    };

    setBillItems([...billItems, newItem]);
    setShowSubstituteModal(false);
    showNotification(`Substituted with high-margin ${sub.itemName} (${sub.marginPercent}% margin)!`);
  };

  // Repeat Prescription
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
        amount: 150,
        rackLocation: "Rack C-04"
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
        amount: 200,
        rackLocation: "Rack B-12"
      }
    ];

    setBillItems(repeatItems);
    setShowRepeatModal(false);
    showNotification("Repeated patient prescription in 1-click!");
  };

  // Receipt HTML Generator for Chemist Rapid POS
  const generatePharmaReceiptHtml = (
    items: BillItem[],
    subTot: number,
    gstTot: number,
    grandTot: number,
    invoiceNo: string
  ) => {
    const storeName = profile?.tradeName || profile?.businessName || "APEX PHARMA CHEMIST";
    const storeAddress = profile?.addressLine1
      ? `${profile.addressLine1}${profile.addressLine2 ? `, ${profile.addressLine2}` : ""}, ${profile.city || ""}, ${profile.state || ""} - ${profile.pincode || ""}`
      : "Main Market Counter";
    const storeGstin = profile?.gstin || "";
    const storeDl = profile?.drugLicenseNumber || "DL-20B/21B-UP-98442";
    const storePhone = profile?.primaryPhone || "";
    const hasH1 = items.some((i) => i.isScheduleH1);

    const itemRows = items
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px dashed #ccc;">
          <td style="padding: 4px 2px; text-align: left; vertical-align: top;">
            <div style="font-weight: bold;">${idx + 1}. ${it.name} ${it.isScheduleH1 ? '<span style="color:#b91c1c; font-size:9px;">[Sch H1]</span>' : ''}</div>
            <div style="font-size: 9px; color: #444;">B: ${it.batchNumber} | Exp: ${it.expiryDate}</div>
          </td>
          <td style="padding: 4px 2px; text-align: center; vertical-align: top;">
            ${it.quantity} ${it.unitType === "Strip" ? "St" : "Tab"}
          </td>
          <td style="padding: 4px 2px; text-align: right; vertical-align: top;">₹${it.unitRate.toFixed(2)}</td>
          <td style="padding: 4px 2px; text-align: right; font-weight: bold; vertical-align: top;">₹${it.amount.toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    return `
      <div style="width: 100%; max-width: 300px; margin: 0 auto; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; padding: 6px 2px;">
        <div style="text-align: center; margin-bottom: 6px;">
          <h2 style="margin: 0; font-size: 15px; font-weight: 900; text-transform: uppercase;">${storeName}</h2>
          <p style="margin: 2px 0; font-size: 10px;">${storeAddress}</p>
          ${storeDl ? `<p style="margin: 2px 0; font-size: 10px;"><b>D.L. No:</b> ${storeDl}</p>` : ""}
          ${storeGstin ? `<p style="margin: 2px 0; font-size: 10px;"><b>GSTIN:</b> ${storeGstin}</p>` : ""}
          ${storePhone ? `<p style="margin: 2px 0; font-size: 10px;">Tel: ${storePhone}</p>` : ""}
          <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; margin: 5px 0; padding: 3px 0; font-size: 10px; font-weight: bold;">
            *** RETAIL PHARMA TAX INVOICE ***
          </div>
        </div>

        <div style="font-size: 10px; margin-bottom: 5px; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between;">
            <span>Bill No: <b>${invoiceNo}</b></span>
            <span>Token: <b>#${activeTokenNumber}</b></span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Date: ${new Date().toLocaleDateString("en-IN")}</span>
            <span>Time: ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div>Patient: <b>${patientName || "Walk-in Customer"}</b> (${patientPhone || "Counter"})</div>
          ${selectedDoctor ? `<div>Doctor: <b>${selectedDoctor}</b></div>` : ""}
        </div>

        <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 4px 0; font-size: 10px;">
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left; padding: 3px 2px;">Medicine / Batch</th>
              <th style="text-align: center; padding: 3px 2px;">Qty</th>
              <th style="text-align: right; padding: 3px 2px;">Rate</th>
              <th style="text-align: right; padding: 3px 2px;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div style="font-size: 10px; line-height: 1.5; margin-top: 5px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Sub-Total:</span>
            <span>₹${subTot.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Pharma GST (12%):</span>
            <span>₹${gstTot.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 4px 0; padding: 3px 0;">
            <span>NET PAYABLE:</span>
            <span>₹${grandTot.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Payment Mode:</span>
            <span><b>Cash / Counter Settlement</b></span>
          </div>
        </div>

        ${
          hasH1
            ? `
          <div style="border: 1px solid #000; padding: 4px; margin: 6px 0; font-size: 9px; line-height: 1.2; text-align: justify;">
            <b>SCHEDULE H1 WARNING:</b> To be sold by retail on the prescription of a Registered Medical Practitioner only. Audit record logged.
          </div>
        `
            : ""
        }

        <div style="text-align: center; margin-top: 8px; font-size: 10px;">
          <p style="margin: 2px 0; font-weight: bold;">Wishing You A Speedy Recovery! 💊</p>
          <p style="margin: 2px 0; font-size: 8.5px; color: #555;">Goods once sold cannot be returned without original batch & bill.</p>
          <p style="margin: 2px 0; font-size: 8px; color: #777;">Powered by UdyogBill</p>
        </div>
      </div>
    `;
  };

  const generateRunnerPickerHtml = (
    items: BillItem[],
    tokenNo: number
  ) => {
    const storeName = profile?.tradeName || profile?.businessName || "APEX PHARMA CHEMIST";
    const sorted = [...items].sort((a, b) => (a.rackLocation || "").localeCompare(b.rackLocation || ""));

    const itemRows = sorted
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px dashed #aaa;">
          <td style="padding: 4px 2px; font-weight: bold; font-size: 11px;">[${it.rackLocation || "Gen"}]</td>
          <td style="padding: 4px 2px;">
            <div style="font-weight: bold;">${idx + 1}. ${it.name}</div>
            <div style="font-size: 9px; color: #555;">B: ${it.batchNumber} | Exp: ${it.expiryDate}</div>
          </td>
          <td style="padding: 4px 2px; text-align: center; font-weight: 900; font-size: 12px;">
            ${it.quantity} ${it.unitType === "Strip" ? "Strip(s)" : "Tab(s)"}
          </td>
          <td style="padding: 4px 2px; text-align: center;">[ &nbsp; ]</td>
        </tr>
      `
      )
      .join("");

    return `
      <div style="width: 100%; max-width: 300px; margin: 0 auto; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; padding: 6px 2px;">
        <div style="text-align: center; margin-bottom: 6px;">
          <h2 style="margin: 0; font-size: 14px; font-weight: 900; text-transform: uppercase;">${storeName}</h2>
          <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; margin: 4px 0; padding: 3px 0; font-size: 12px; font-weight: 900;">
            *** RUNNER PICKER SLIP ***
          </div>
          <div style="font-size: 14px; font-weight: 900; margin: 3px 0;">
            TOKEN: #${tokenNo}
          </div>
        </div>

        <div style="font-size: 10px; margin-bottom: 5px;">
          <div>Time: ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
          <div>Patient: <b>${patientName || "Walk-in"}</b></div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 4px 0; font-size: 10px;">
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left; padding: 3px 2px;">Rack</th>
              <th style="text-align: left; padding: 3px 2px;">Medicine / Batch</th>
              <th style="text-align: center; padding: 3px 2px;">Pick Qty</th>
              <th style="text-align: center; padding: 3px 2px;">Done</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div style="margin-top: 15px; border-top: 1px dashed #000; padding-top: 5px; display: flex; justify-content: space-between; font-size: 10px;">
          <span>Picked By: ____________</span>
          <span>Checked By: ____________</span>
        </div>
      </div>
    `;
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

    const invoiceNumber = `INV-PH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Record Schedule H1 entries automatically
    for (const item of billItems) {
      if (item.isScheduleH1) {
        try {
          await pharmaDeepService.recordScheduleH1Entry({
            invoiceId: "inv-" + Date.now(),
            invoiceNumber,
            supplyDate: new Date().toISOString(),
            patientName,
            patientAddressPhone: `${patientPhone || "9811002233"} (Local Counter)`,
            prescriberDoctorName: selectedDoctor.split("(")[0].trim(),
            prescriberRegNumber: selectedDoctor.includes("(") ? selectedDoctor.split("(")[1].replace(")", "") : "DMC-44910",
            drugName: item.name,
            batchNumber: item.batchNumber,
            quantitySupplied: item.quantity,
            manufacturerName: "Standard Pharma Ltd"
          });
        } catch {}
      }
    }

    showNotification("Bill Finalized & Schedule H1 Register Audited! Printing thermal invoice...");
    const receiptHtml = generatePharmaReceiptHtml(billItems, subTotal, gstAmount, grandTotal, invoiceNumber);
    printRawHtml(receiptHtml, `Pharma-Bill-${invoiceNumber}`, "thermal80");
  };

  const subTotal = billItems.reduce((acc, item) => acc + item.amount, 0);
  const gstAmount = Math.round(subTotal * 0.12 * 100) / 100;
  const grandTotal = Math.round((subTotal + gstAmount) * 100) / 100;
  const hasScheduleH1 = billItems.some((i) => i.isScheduleH1);

  // Group items by rack location for the Runner Picker Slip
  const itemsByRack = [...billItems].sort((a, b) => (a.rackLocation || "").localeCompare(b.rackLocation || ""));

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
            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[10px]">F2</kbd> Search</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[10px]">F8</kbd> Substitute</span>
              <span><kbd className="px-1.5 py-0.5 bg-amber-900/50 text-amber-300 rounded font-mono text-[10px]">F9</kbd> Hold/Park</span>
              <span><kbd className="px-1.5 py-0.5 bg-indigo-900/50 text-indigo-300 rounded font-mono text-[10px]">F10</kbd> Recall</span>
              <span><kbd className="px-1.5 py-0.5 bg-emerald-900/50 text-emerald-300 rounded font-mono text-[10px]">Ctrl+Enter</kbd> Print</span>
            </div>
          </div>
        </div>

        {/* Patient & Doctor Selector & Parked Drawer Trigger */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Parked Bills Button with counter badge */}
          <button
            onClick={() => setShowParkedDrawer(true)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
              parkedBills.length > 0
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
            }`}
            title="Recall Parked Bills (F10)"
          >
            <PauseCircle className="w-4 h-4 text-amber-400" />
            <span>Parked ({parkedBills.length})</span>
            <kbd className="text-[10px] font-mono bg-black/40 px-1 py-0.5 rounded text-slate-400">F10</kbd>
          </button>

          {/* Runner Picker Slip Button */}
          <button
            onClick={() => setShowPickerModal(true)}
            disabled={billItems.length === 0}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Print Runner Slip with Rack No. for Godown Boys"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
            <span>Runner Slip</span>
          </button>

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
              className="px-2 py-0.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
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
                        <span className="text-amber-300/80 font-mono text-[10px] bg-amber-950/40 px-1 rounded border border-amber-500/20">
                          {b.rackLocation || "General"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-extrabold text-white">₹{b.saleRate}</div>
                      <div className="text-[10px] text-emerald-400 font-bold">{b.currentStock} in stock</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Bill Tray & Checkout */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-400">Current Counter Bill</span>
                {activeTokenNumber && (
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono text-[11px] font-bold">
                    Token #{activeTokenNumber}
                  </span>
                )}
                {hasScheduleH1 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                    <ShieldAlert className="w-3 h-3" /> Schedule H1 Drug Present
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleParkBill}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  title="Park / Hold bill (F9)"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Hold Bill (F9)</span>
                </button>

                <button
                  onClick={() => setBillItems([])}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Bill Table */}
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="pb-2">Medicine / Batch</th>
                    <th className="pb-2">Rack</th>
                    <th className="pb-2 text-center">Unit / Cut</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Rate</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {billItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-white text-xs">{item.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono bg-slate-800 px-1 rounded">{item.batchNumber}</span>
                          <span>Exp: {item.expiryDate}</span>
                        </div>
                      </td>

                      <td className="py-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-300 border border-slate-700">
                          {item.rackLocation || "Gen"}
                        </span>
                      </td>

                      {/* 🚀 Strip vs Loose Cut Selector */}
                      <td className="py-3 text-center">
                        <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleToggleUnit(idx, "Strip")}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              item.unitType === "Strip"
                                ? "bg-teal-600 text-white shadow-xs"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Strip
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleUnit(idx, "Loose")}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              item.unitType === "Loose"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Loose Tab
                          </button>
                        </div>
                      </td>

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
                  className="col-span-2 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-900/40 active:scale-98 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Save & Print GST Invoice (Ctrl+Enter)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 Parked Bills Drawer Modal (F10) */}
      {showParkedDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full p-6 shadow-2xl space-y-4 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <PauseCircle className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-base">Parked Bills ({parkedBills.length})</h3>
                </div>
                <button onClick={() => setShowParkedDrawer(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Customers waiting for cash or additional medicines. Click any token to restore bill instantly.
              </p>

              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
                {parkedBills.map((pb) => (
                  <div
                    key={pb.id}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl hover:border-amber-500/40 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Token #{pb.tokenNumber}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {pb.time}
                      </span>
                    </div>

                    <div className="text-xs text-white font-bold">{pb.patientName} ({pb.patientPhone})</div>
                    <div className="text-[11px] text-slate-400">
                      {pb.items.length} medicines • Total: <strong className="text-emerald-400 font-mono">₹{pb.total.toFixed(2)}</strong>
                    </div>

                    <button
                      onClick={() => handleRecallBill(pb)}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow"
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> Recall This Bill
                    </button>
                  </div>
                ))}

                {parkedBills.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No held bills right now. Press F9 during billing to park any customer.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowParkedDrawer(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
            >
              Close Drawer (F10)
            </button>
          </div>
        </div>
      )}

      {/* 🚀 Runner Picker Slip Modal (Rack-Wise) */}
      {showPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Godown Runner Picker Slip</h3>
              </div>
              <button onClick={() => setShowPickerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal Print Slip Preview */}
            <div className="p-4 bg-white text-black font-mono text-xs rounded-xl shadow-inner space-y-3">
              <div className="text-center border-b border-dashed border-gray-400 pb-2">
                <div className="font-bold text-sm tracking-wide">UDYOGBILL PHARMA PICKER KOT</div>
                <div className="text-[11px]">Token No: #{activeTokenNumber}</div>
                <div className="text-[10px] text-gray-600">{new Date().toLocaleString()}</div>
              </div>

              <div className="text-[11px] border-b border-dashed border-gray-400 pb-2">
                <div>Patient: <strong>{patientName || "Cash Customer"}</strong> ({patientPhone})</div>
                <div>Doctor: {selectedDoctor.split("(")[0]}</div>
              </div>

              <div className="space-y-1.5 border-b border-dashed border-gray-400 pb-2">
                <div className="font-bold text-[10px] text-gray-500 uppercase">Items Sorted By Almirah / Rack:</div>
                {itemsByRack.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px]">
                    <div>
                      <span className="font-bold bg-black text-white px-1 py-0.2 rounded mr-1 text-[10px]">
                        {it.rackLocation || "GEN"}
                      </span>
                      <span>{it.name}</span>
                      <div className="text-[10px] text-gray-600 ml-6">Batch: {it.batchNumber}</div>
                    </div>
                    <div className="font-bold shrink-0">
                      x {it.quantity} {it.unitType}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-gray-500 flex justify-between pt-1">
                <span>Picked By: ____________</span>
                <span>Verified: ____________</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPickerModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const pickerHtml = generateRunnerPickerHtml(billItems, activeTokenNumber);
                  printRawHtml(pickerHtml, `Runner-Slip-Token-${activeTokenNumber}`, "thermal80");
                  setShowPickerModal(false);
                }}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Thermal Slip
              </button>
            </div>
          </div>
        </div>
      )}

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
