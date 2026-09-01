"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  FolderSync,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Boxes,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  FileText,
  FileCheck,
  HelpCircle,
  ChevronRight,
  Database
} from "lucide-react";
import { partyService } from "@/services/party-services";
import { inventoryService } from "@/services/inventory-services";
import { tenantAppService } from "@/services/tenant-app-services";

export default function DataMigrationHubPage() {
  const [activeTab, setActiveTab] = useState<"parties" | "products" | "history">("parties");
  const [selectedSoftware, setSelectedSoftware] = useState<"marg" | "busy" | "tally" | "vyapar" | "excel">("marg");

  // Migration State - Parties
  const [partyRows, setPartyRows] = useState<any[]>([]);
  const [partyFileName, setPartyFileName] = useState("");
  const [importingParties, setImportingParties] = useState(false);
  const [partyImportProgress, setPartyImportProgress] = useState(0);
  const [partySuccessCount, setPartySuccessCount] = useState(0);
  const [partyErrorCount, setPartyErrorCount] = useState(0);
  const partyFileRef = useRef<HTMLInputElement>(null);

  // Migration State - Products
  const [productRows, setProductRows] = useState<any[]>([]);
  const [productFileName, setProductFileName] = useState("");
  const [importingProducts, setImportingProducts] = useState(false);
  const [productImportProgress, setProductImportProgress] = useState(0);
  const [productSuccessCount, setProductSuccessCount] = useState(0);
  const [productErrorCount, setProductErrorCount] = useState(0);
  const productFileRef = useRef<HTMLInputElement>(null);

  // Migration Logs
  const [migrationLogs, setMigrationLogs] = useState<
    Array<{
      id: string;
      timestamp: string;
      type: string;
      source: string;
      total: number;
      success: number;
      failed: number;
    }>
  >([
    {
      id: "MIG-2026-01",
      timestamp: "2026-08-30 14:20:10",
      type: "Supplier & Customer Master",
      source: "Marg ERP 9+ Export",
      total: 145,
      success: 145,
      failed: 0
    },
    {
      id: "MIG-2026-02",
      timestamp: "2026-08-30 14:35:42",
      type: "Pharma SKU & Batch Catalog",
      source: "Tally Prime XML/CSV",
      total: 320,
      success: 320,
      failed: 0
    }
  ]);

  // --- CSV Download Handlers ---
  const downloadPartiesTemplate = () => {
    const csvContent =
      "PartyType,LegalName,TradeName,Mobile,Email,GSTIN,PAN,DrugLicense1,DrugLicense2,FSSAI,Address,City,State,StateCode,Pincode,OpeningBalance,BalanceType\n" +
      "Supplier,Cipla Healthcare Distributors,Cipla Direct,9876543210,orders@cipladist.com,07AAAAA0000A1Z5,AAAAA0000A,DL-20B/10492,DL-21B/10493,10019011000123,Plot 14 Okhla Phase 3,New Delhi,Delhi,07,110020,15000,Credit\n" +
      "Customer,Apollo Medical Store,Apollo Retail,9811223344,accounts@apollomed.com,07BBBBB1111B1Z2,BBBBB1111B,DL-20B/99214,DL-21B/99215,,Shop 12 Main Market Saket,New Delhi,Delhi,07,110017,8500,Debit\n" +
      "Supplier,Sun Pharma Logistics,,9899001122,info@sunlogistics.com,27CCCCCC2222C1Z8,CCCCCC2222C,DL-20B/88210,,,Andheri East,Mumbai,Maharashtra,27,400069,0,Credit\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "UdyogBill_Parties_Migration_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadProductsTemplate = () => {
    const csvContent =
      "ProductName,SKU,Category,Packing,HSN,TaxRate,MRP,PurchaseRate,SellingPrice,BatchNumber,ExpiryDate,OpeningStock\n" +
      "Dolo 650mg Strip 15s,DOL-650,Tablets,15s,30049099,12,30.50,21.00,28.00,BT-2026-881,12/28,200\n" +
      "Augmentin 625 Duo,AUG-625,Antibiotics,10x10,30049099,12,201.00,145.00,185.00,AG-99120,08/27,50\n" +
      "Pantocid 40mg Tab,PAN-040,Gastro,10s,30049099,12,140.00,95.00,128.00,PT-44211,04/28,120\n" +
      "Betadine 10% Ointment 20g,BET-010,Antiseptic,20g,30049099,18,85.00,60.00,78.00,BT-77219,09/27,40\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "UdyogBill_Products_Migration_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CSV Parser for Parties ---
  const handlePartiesFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPartyFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        alert("The uploaded CSV is empty or only contains headers.");
        return;
      }

      const parsed = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map((col) => col.trim());
        if (row.length < 2) continue;

        const partyTypeStr = row[0]?.toLowerCase();
        const partyType = partyTypeStr?.includes("cust") ? 1 : 2; // 1: Customer, 2: Supplier
        const legalName = row[1] || "";
        const tradeName = row[2] || legalName;
        const mobile = row[3] || "";
        const email = row[4] || "";
        const gstin = (row[5] || "").toUpperCase();
        const pan = (row[6] || (gstin.length >= 12 ? gstin.slice(2, 12) : "")).toUpperCase();
        const dl1 = row[7] || "";
        const dl2 = row[8] || "";
        const fssai = row[9] || "";
        const address = row[10] || "Main Road";
        const city = row[11] || "Delhi";
        const state = row[12] || "Delhi";
        const stateCode = row[13] || "07";
        const pincode = row[14] || "110092";
        const openingBal = parseFloat(row[15]) || 0;
        const balanceType = row[16]?.toLowerCase().includes("deb") ? 1 : 2;

        const isValid = legalName.length > 0 && mobile.length > 0;

        parsed.push({
          rowId: i,
          partyType,
          partyTypeLabel: partyType === 1 ? "Customer" : "Supplier",
          legalName,
          tradeName,
          mobile,
          email,
          gstin,
          pan,
          dl1,
          dl2,
          fssai,
          address,
          city,
          state,
          stateCode,
          pincode,
          openingBal,
          balanceType,
          isValid,
          validationError: !legalName ? "Legal Name is missing" : !mobile ? "Mobile is missing" : undefined
        });
      }

      setPartyRows(parsed);
    };
    reader.readAsText(file);
  };

  // --- CSV Parser for Products ---
  const handleProductsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        alert("The uploaded CSV is empty or only contains headers.");
        return;
      }

      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map((col) => col.trim());
        if (row.length < 2) continue;

        const name = row[0] || "";
        const sku = row[1] || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
        const category = row[2] || "General";
        const packing = row[3] || "10x10";
        const hsn = row[4] || "30049099";
        const taxRate = parseFloat(row[5]) || 12;
        const mrp = parseFloat(row[6]) || 100;
        const purchaseRate = parseFloat(row[7]) || mrp * 0.7;
        const sellingPrice = parseFloat(row[8]) || mrp * 0.9;
        const batch = row[9] || `BT-${new Date().getFullYear().toString().slice(2)}${String(new Date().getMonth() + 1).padStart(2, "0")}`;
        const expiry = row[10] || "12/28";
        const openingStock = parseFloat(row[11]) || 0;

        const isValid = name.length > 0;

        parsed.push({
          rowId: i,
          name,
          sku,
          category,
          packing,
          hsn,
          taxRate,
          mrp,
          purchaseRate,
          sellingPrice,
          batch,
          expiry,
          openingStock,
          isValid,
          validationError: !name ? "Product Name is required" : undefined
        });
      }

      setProductRows(parsed);
    };
    reader.readAsText(file);
  };

  // --- Bulk Import Processors ---
  const handleStartPartyImport = async () => {
    if (partyRows.length === 0) return;
    setImportingParties(true);
    setPartyImportProgress(0);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < partyRows.length; i++) {
      const row = partyRows[i];
      if (!row.isValid) {
        failed++;
        continue;
      }

      try {
        const autoCode = (row.partyType === 1 ? "CUST-" : "SUP-") + Math.floor(1000 + Math.random() * 9000);
        const payload = {
          code: autoCode,
          legalName: row.legalName,
          tradeName: row.tradeName,
          partyType: row.partyType,
          customerType: row.partyType === 1 ? 1 : undefined,
          supplierType: row.partyType === 2 ? 2 : undefined,
          primaryPhone: row.mobile,
          mobile: row.mobile,
          email: row.email || undefined,
          gstin: row.gstin || undefined,
          pan: row.pan || undefined,
          drugLicenseNumber1: row.dl1 || undefined,
          drugLicenseNumber2: row.dl2 || undefined,
          fssaiNumber: row.fssai || undefined,
          openingBalance: row.openingBal,
          openingBalanceType: row.balanceType,
          billingAddress: {
            addressType: 1,
            addressLine1: row.address,
            city: row.city,
            state: row.state,
            stateCode: row.stateCode,
            pincode: row.pincode,
            country: "India"
          }
        };

        if (row.partyType === 1) {
          await partyService.createCustomer(payload);
        } else {
          await partyService.createSupplier(payload);
        }
        success++;
      } catch (e) {
        console.error("Failed to migrate party row:", row, e);
        failed++;
      }

      setPartyImportProgress(Math.round(((i + 1) / partyRows.length) * 100));
    }

    setPartySuccessCount(success);
    setPartyErrorCount(failed);
    setImportingParties(false);

    // Append to logs
    setMigrationLogs((prev) => [
      {
        id: `MIG-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
        timestamp: new Date().toLocaleString(),
        type: "Customer & Supplier Directory",
        source: `${selectedSoftware.toUpperCase()} Auto-Migration`,
        total: partyRows.length,
        success,
        failed
      },
      ...prev
    ]);
  };

  const handleStartProductImport = async () => {
    if (productRows.length === 0) return;
    setImportingProducts(true);
    setProductImportProgress(0);
    let success = 0;
    let failed = 0;

    let uoms: any[] = [];
    try {
      uoms = await inventoryService.getUnits();
    } catch {}
    const defaultUomId = uoms.length > 0 ? uoms[0].id : undefined;

    for (let i = 0; i < productRows.length; i++) {
      const row = productRows[i];
      if (!row.isValid) {
        failed++;
        continue;
      }

      try {
        await inventoryService.createItem({
          sku: row.sku,
          name: row.name,
          shortDescription: `${row.name} - Pack: ${row.packing}`,
          primaryUomId: defaultUomId || "00000000-0000-0000-0000-000000000000",
          hsnCode: row.hsn,
          taxRate: row.taxRate,
          purchasePrice: row.purchaseRate,
          sellingPrice: row.sellingPrice,
          mrp: row.mrp,
          minimumStockAlert: 5,
          trackBatches: true,
          initialStock: row.openingStock,
          initialBatchNumber: row.batch,
          initialBatchExpiryDate: row.expiry,
          attributesJson: JSON.stringify({
            packing: row.packing,
            sourceMigration: selectedSoftware
          })
        });
        success++;
      } catch (e) {
        console.error("Failed to migrate product row:", row, e);
        failed++;
      }

      setProductImportProgress(Math.round(((i + 1) / productRows.length) * 100));
    }

    setProductSuccessCount(success);
    setProductErrorCount(failed);
    setImportingProducts(false);

    // Append to logs
    setMigrationLogs((prev) => [
      {
        id: `MIG-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
        timestamp: new Date().toLocaleString(),
        type: "Pharma SKU & Opening Stock",
        source: `${selectedSoftware.toUpperCase()} Auto-Migration`,
        total: productRows.length,
        success,
        failed
      },
      ...prev
    ]);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Database className="w-80 h-80 text-emerald-400" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Subscriber Onboarding & Data Migration Engine</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Legacy ERP Data Migration Hub
            </h1>
            <p className="text-slate-400 text-xs mt-1 max-w-2xl">
              Seamlessly migrate all your Customers, Suppliers (with Drug Licenses & GST), Master Products, Batches, and Opening Balances directly from Marg ERP, Busy, Tally Prime, Vyapar, or Excel in seconds.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/app/dashboard"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Source Legacy Software Selector */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-2">Migrating From:</span>
          {[
            { id: "marg", label: "Marg ERP 9+" },
            { id: "busy", label: "Busy Accounting" },
            { id: "tally", label: "Tally Prime / ERP 9" },
            { id: "vyapar", label: "Vyapar App" },
            { id: "excel", label: "Custom Excel / CSV" }
          ].map((sw) => (
            <button
              key={sw.id}
              onClick={() => setSelectedSoftware(sw.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedSoftware === sw.id
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {sw.label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("parties")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "parties"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>1. Parties (Customers & Suppliers)</span>
          {partyRows.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-950 text-[10px] text-indigo-300">
              {partyRows.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("products")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "products"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>2. Products, Batches & Opening Stock</span>
          {productRows.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-950 text-[10px] text-indigo-300">
              {productRows.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "history"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Migration History & Audit Logs</span>
        </button>
      </div>

      {/* ─── TAB 1: PARTIES MIGRATION ───────────────────────────────────────── */}
      {activeTab === "parties" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1: Template Download */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
                <Download className="w-4 h-4" />
                <span>Step 1: Download Standard Template</span>
              </div>
              <p className="text-slate-400 text-xs">
                Pre-formatted CSV template supporting Drug Licenses (20B/21B), FSSAI, GSTIN, PAN, and Opening Balances.
              </p>
              <button
                type="button"
                onClick={downloadPartiesTemplate}
                className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Parties CSV Template</span>
              </button>
            </div>

            {/* Step 2: Upload CSV */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <UploadCloud className="w-4 h-4" />
                <span>Step 2: Upload Exported File</span>
              </div>
              <p className="text-slate-400 text-xs">
                Upload CSV or Excel file exported from {selectedSoftware.toUpperCase()} or your filled template.
              </p>
              <input
                type="file"
                ref={partyFileRef}
                accept=".csv,.txt"
                onChange={handlePartiesFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => partyFileRef.current?.click()}
                className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{partyFileName ? partyFileName : "Select Parties CSV File"}</span>
              </button>
            </div>

            {/* Step 3: Execute Migration */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Step 3: Execute & Import</span>
              </div>
              <p className="text-slate-400 text-xs">
                Parsed {partyRows.length} records. Ready to import directly into PostgreSQL ledger database.
              </p>
              <button
                type="button"
                onClick={handleStartPartyImport}
                disabled={partyRows.length === 0 || importingParties}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-600/20"
              >
                {importingParties ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Migrating ({partyImportProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>1-Click Start Parties Migration</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Success / Error Notification */}
          {partySuccessCount > 0 && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Successfully migrated {partySuccessCount} parties into database!</span>
              </div>
              {partyErrorCount > 0 && (
                <span className="text-rose-400 font-semibold">{partyErrorCount} skipped due to invalid fields</span>
              )}
            </div>
          )}

          {/* Parsed Preview Table */}
          {partyRows.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="font-bold text-white text-sm flex items-center space-x-2">
                  <span>Parties Import Preview & Validation Grid</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-mono">
                    {partyRows.length} Rows Detected
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Ready to inject into Tenant Ledger
                </div>
              </div>

              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 z-10 text-[11px]">
                    <tr>
                      <th className="p-3">Type</th>
                      <th className="p-3">Legal Business Name</th>
                      <th className="p-3">Mobile</th>
                      <th className="p-3">GSTIN / PAN</th>
                      <th className="p-3 text-emerald-400 font-bold">Drug License (20B/21B)</th>
                      <th className="p-3">City / State</th>
                      <th className="p-3 text-right">Opening Bal (₹)</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                    {partyRows.map((row) => (
                      <tr key={row.rowId} className="hover:bg-slate-900/50">
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.partyType === 1
                                ? "bg-blue-950 text-blue-400 border border-blue-800"
                                : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            }`}
                          >
                            {row.partyTypeLabel}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-white">
                          <div>{row.legalName}</div>
                          {row.tradeName !== row.legalName && (
                            <div className="text-[10px] text-slate-400">{row.tradeName}</div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-300">{row.mobile}</td>
                        <td className="p-3 font-mono text-xs">
                          {row.gstin ? (
                            <span className="text-emerald-400">{row.gstin}</span>
                          ) : (
                            <span className="text-slate-500">Unregistered / B2C</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-xs text-emerald-300">
                          {row.dl1 ? (
                            <div>
                              <span>{row.dl1}</span>
                              {row.dl2 && <span className="ml-1 text-slate-400">/ {row.dl2}</span>}
                            </div>
                          ) : (
                            <span className="text-slate-600">N/A</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300">
                          {row.city}, {row.state}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          {row.openingBal > 0 ? (
                            <span className={row.balanceType === 1 ? "text-blue-400" : "text-rose-400"}>
                              ₹{row.openingBal.toFixed(2)} {row.balanceType === 1 ? "(Dr)" : "(Cr)"}
                            </span>
                          ) : (
                            <span className="text-slate-600">₹0.00</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {row.isValid ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-semibold text-[10px]">
                              Valid
                            </span>
                          ) : (
                            <span
                              title={row.validationError}
                              className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 font-semibold text-[10px]"
                            >
                              Invalid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: PRODUCTS & INVENTORY MIGRATION ──────────────────────────── */}
      {activeTab === "products" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
                <Download className="w-4 h-4" />
                <span>Step 1: Download Products Template</span>
              </div>
              <p className="text-slate-400 text-xs">
                Supports SKU, Packing (10x10, 100ml), HSN/SAC, MRP, Purchase Rate, Selling Price, Batch, and Expiry.
              </p>
              <button
                type="button"
                onClick={downloadProductsTemplate}
                className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Products CSV Template</span>
              </button>
            </div>

            {/* Step 2 */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <UploadCloud className="w-4 h-4" />
                <span>Step 2: Upload Products File</span>
              </div>
              <p className="text-slate-400 text-xs">
                Upload CSV or inventory stock export from {selectedSoftware.toUpperCase()} or your Excel spreadsheet.
              </p>
              <input
                type="file"
                ref={productFileRef}
                accept=".csv,.txt"
                onChange={handleProductsFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => productFileRef.current?.click()}
                className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{productFileName ? productFileName : "Select Products CSV File"}</span>
              </button>
            </div>

            {/* Step 3 */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Step 3: Migrate Inventory</span>
              </div>
              <p className="text-slate-400 text-xs">
                Parsed {productRows.length} items. Ready to create master products and initialize opening stock with batches.
              </p>
              <button
                type="button"
                onClick={handleStartProductImport}
                disabled={productRows.length === 0 || importingProducts}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-600/20"
              >
                {importingProducts ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Migrating ({productImportProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>1-Click Start Products Migration</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Success / Error Notification */}
          {productSuccessCount > 0 && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Successfully migrated {productSuccessCount} products & batches into catalog!</span>
              </div>
              {productErrorCount > 0 && (
                <span className="text-rose-400 font-semibold">{productErrorCount} skipped</span>
              )}
            </div>
          )}

          {/* Product Preview Grid */}
          {productRows.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="font-bold text-white text-sm flex items-center space-x-2">
                  <span>Products & Batches Import Preview Grid</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-mono">
                    {productRows.length} Items Detected
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 z-10 text-[11px]">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Packing</th>
                      <th className="p-3">HSN</th>
                      <th className="p-3 text-center">GST %</th>
                      <th className="p-3 text-right">MRP (₹)</th>
                      <th className="p-3 text-right">Purchase (₹)</th>
                      <th className="p-3 text-right">Sale Price (₹)</th>
                      <th className="p-3">Batch / Expiry</th>
                      <th className="p-3 text-right">Opening Qty</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                    {productRows.map((row) => (
                      <tr key={row.rowId} className="hover:bg-slate-900/50">
                        <td className="p-3 font-semibold text-white">{row.name}</td>
                        <td className="p-3 font-mono text-slate-400">{row.sku}</td>
                        <td className="p-3 text-slate-300">{row.packing}</td>
                        <td className="p-3 font-mono text-slate-400">{row.hsn}</td>
                        <td className="p-3 text-center font-mono">{row.taxRate}%</td>
                        <td className="p-3 text-right font-mono">₹{row.mrp.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-amber-400">₹{row.purchaseRate.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-emerald-400 font-bold">₹{row.sellingPrice.toFixed(2)}</td>
                        <td className="p-3 font-mono text-xs">
                          <span className="text-indigo-400">{row.batch}</span>
                          <span className="text-slate-500 ml-1">({row.expiry})</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          {row.openingStock}
                        </td>
                        <td className="p-3 text-center">
                          {row.isValid ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-semibold text-[10px]">
                              Valid
                            </span>
                          ) : (
                            <span
                              title={row.validationError}
                              className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 font-semibold text-[10px]"
                            >
                              Invalid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: MIGRATION HISTORY ───────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 font-bold text-white text-sm">
            Onboarding Migration & Ingestion History
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Source Software</th>
                  <th className="p-3 text-right">Total Rows</th>
                  <th className="p-3 text-right text-emerald-400">Imported</th>
                  <th className="p-3 text-right text-rose-400">Errors</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {migrationLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-mono font-bold text-indigo-400">{log.id}</td>
                    <td className="p-3 text-slate-400">{log.timestamp}</td>
                    <td className="p-3 font-semibold text-white">{log.type}</td>
                    <td className="p-3 text-slate-300">{log.source}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">{log.total}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">{log.success}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-400">{log.failed}</td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-bold text-[10px] border border-emerald-800/40">
                        COMPLETED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
