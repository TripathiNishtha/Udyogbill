"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Building2,
  Boxes,
  Receipt,
  Wallet,
  ShieldCheck,
  RefreshCw,
  Layers,
  HelpCircle,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import {
  parseUniversalWorkbook,
  executeUniversalMigration,
  UniversalMigrationPackage,
  AnalyzedSheet
} from "@/lib/universal-multi-sheet-migrator";
import {
  downloadMasterMigrationTemplate,
  MASTER_MIGRATION_SHEETS_INFO
} from "@/lib/master-migration-template";

export default function UniversalMultiSheetMigrationPage() {
  const [selectedSoftware, setSelectedSoftware] = useState<string>("auto");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedPackage, setParsedPackage] = useState<UniversalMigrationPackage | null>(null);
  const [showSheetsInfo, setShowSheetsInfo] = useState(false);
  
  // Execution state
  const [isMigrating, setIsMigrating] = useState(false);
  const [currentStage, setCurrentStage] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [logs, setLogs] = useState<Array<{ text: string; type: "info" | "success" | "warning" | "error" }>>([]);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [finalCounts, setFinalCounts] = useState<{ products: number; parties: number; invoices: number; expenses: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setParsedPackage(null);
    setMigrationComplete(false);
    setLogs([]);

    try {
      const buffer = await file.arrayBuffer();
      const pkg = parseUniversalWorkbook(buffer, file.name);
      setParsedPackage(pkg);
    } catch (err: any) {
      alert("Error reading file: " + (err?.message || "Invalid format"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartMigration = async () => {
    if (!parsedPackage) return;

    setIsMigrating(true);
    setProgressPercent(5);
    setCurrentStage("Initializing safe migration sandbox...");
    setLogs([]);

    const result = await executeUniversalMigration(parsedPackage, {
      onStageChange: (stage, percent) => {
        setCurrentStage(stage);
        setProgressPercent(percent);
      },
      onLog: (text, type) => {
        setLogs((prev) => [...prev, { text, type }]);
      }
    });

    setIsMigrating(false);
    if (result.success) {
      setMigrationComplete(true);
      setFinalCounts(result.importedCounts);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 dark:from-blue-950 dark:via-indigo-950 dark:to-slate-900 border border-blue-200/80 dark:border-blue-900/50 p-6 rounded-2xl shadow-xs text-slate-900 dark:text-white">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-blue-300/80 dark:border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Universal Smart Importer
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            1-Click Multi-Sheet ERP Data Migrator
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-2xl font-medium">
            Apne purane software (<strong className="text-slate-900 dark:text-white">Marg, Tally, Vyapar, Busy ya Custom Excel</strong>) se saara data bina kisi loss ke UdyogBill me transfer karein.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/app/settings/migration"
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 bg-white hover:bg-slate-100 dark:bg-white/10 dark:hover:bg-white/20 rounded-xl transition border border-slate-300 dark:border-white/10 shadow-xs flex items-center gap-1.5"
          >
            <span>Single-Sheet CSV Import</span>
          </Link>
        </div>
      </div>

      {/* 3-Step Quick Guide Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-black text-xs flex items-center justify-center shrink-0">
            1
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Step 1: File Ready Karein</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Purane software ka export ya hamara template
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
            2
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Step 2: Excel File Upload Karein</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Drag & drop .xlsx ya .xls file
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
            3
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Step 3: 1-Click Live Import</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Stock, Customer aur Balances live load
            </div>
          </div>
        </div>
      </div>

      {/* 2 Clear Paths: Direct Upload vs Download Template */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Option A: Already have file from Marg/Tally/Vyapar/Busy */}
        <div className="lg:col-span-6 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-2xs">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
              🚀 Option 1 • Sabse Aasaan
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Purane Software se Export File Ready Hai?
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Agar aapne <strong>Marg, Tally, Vyapar, Busy ya purani Excel</strong> se file export kar li hai, to <span className="text-blue-700 dark:text-blue-400 font-bold">template download karne ki koi zaroorat nahi hai</span>. Aap seedha neeche apni file upload karein — hamara AI system columns khud pehchan lega.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto self-start px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Seedha File Upload Karein</span>
          </button>
        </div>

        {/* Option B: Need Excel Template */}
        <div className="lg:col-span-6 bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-2xs">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
              📥 Option 2 • Naya Format Chahiye
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Naye Sire Se Excel Me Data Bharna Hai?
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              UdyogBill ka official Excel workbook download karein. Isme demo data ke sath <strong>Items, Customers, Suppliers aur Opening Stock</strong> ke bane-banaye columns milenge jisme aap apna data fill kar sakte hain.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadMasterMigrationTemplate({ includeSampleData: true })}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Excel Template (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => downloadMasterMigrationTemplate({ includeSampleData: false })}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 hover:underline cursor-pointer"
              >
                Blank Template (Khaali File)
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowSheetsInfo(!showSheetsInfo)}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{showSheetsInfo ? "Hide Included Sheets" : "Dekhein template me kaun si sheets shamil hain (7 Sheets)"}</span>
                {showSheetsInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Sheets Overview (Only if requested by user) */}
      {showSheetsInfo && (
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Is Workbook Me 7 Specialized Sheets Shamil Hain:
            </span>
            <button
              onClick={() => setShowSheetsInfo(false)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕ Band Karein
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {MASTER_MIGRATION_SHEETS_INFO.map((s, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-left shadow-2xs"
              >
                <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200 block truncate">{s.title}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 font-medium">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Software Presets (Optional) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">
            Select Source Software (Optional)
          </label>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            ✨ Agar aap select nahi bhi karenge, to hamara Smart Importer file dekh kar khud pehchan lega.
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { id: "auto", name: "Auto Detect", icon: "✨", desc: "Sabhi Software ke liye" },
            { id: "marg", name: "Marg ERP 9+", icon: "🟢", desc: "Pharma / FMCG Master" },
            { id: "tally", name: "Tally Prime", icon: "🟡", desc: "Ledger & Inventory" },
            { id: "vyapar", name: "Vyapar App", icon: "🔵", desc: "Company Backup" },
            { id: "busy", name: "Busy Accounting", icon: "🟣", desc: "Excel Register" }
          ].map((sw) => (
            <button
              key={sw.id}
              onClick={() => setSelectedSoftware(sw.id)}
              className={
                selectedSoftware === sw.id
                  ? "flex flex-col text-left p-3.5 rounded-xl border-2 transition-all border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 dark:border-blue-500 shadow-sm ring-2 ring-blue-500/20 cursor-pointer"
                  : "flex flex-col text-left p-3.5 rounded-xl border transition-all border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 shadow-2xs cursor-pointer"
              }
            >
              <span className="text-xl mb-1">{sw.icon}</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{sw.name}</span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">{sw.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Dropzone */}
      <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-8 text-center hover:border-indigo-500 transition-colors shadow-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {parsedPackage ? parsedPackage.fileName : "Apna Excel File Yahan Drag & Drop Karein"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports .xlsx aur .xls workbooks. Columns kisi bhi order me ho, UdyogBill safely map kar lega.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing || isMigrating}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzing ? "File Analyze Ho Rahi Hai..." : parsedPackage ? "Doosri File Select Karein" : "Computer Se Excel File Chunein"}
          </button>
        </div>
      </div>

      {/* Package Analysis Preview */}
      {parsedPackage && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span>Products & Stock</span>
                <Boxes className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {parsedPackage.summary.totalProducts.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">With Batches & MRP</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span>Customers</span>
                <Building2 className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {parsedPackage.summary.totalCustomers.toLocaleString()}
              </div>
              <span className="text-[10px] text-blue-600 font-medium">With GSTIN & Balance</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span>Suppliers</span>
                <Layers className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {parsedPackage.summary.totalSuppliers.toLocaleString()}
              </div>
              <span className="text-[10px] text-purple-600 font-medium">Creditor Accounts</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span>Past Invoices</span>
                <Receipt className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {parsedPackage.summary.totalInvoices.toLocaleString()}
              </div>
              <span className="text-[10px] text-amber-600 font-medium">Historical Ledger</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span>Past Expenses</span>
                <Wallet className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {parsedPackage.summary.totalExpenses.toLocaleString()}
              </div>
              <span className="text-[10px] text-rose-600 font-medium">Voucher Archive</span>
            </div>
          </div>

          {/* Detected Sheets Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                  Detected Sheets ({parsedPackage.sheets.length}) • Origin:{" "}
                  <span className="text-indigo-600 dark:text-indigo-400">{parsedPackage.softwareDetected}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The engine automatically classified each sheet and matched column aliases.
                </p>
              </div>

              {!isMigrating && !migrationComplete && (
                <button
                  onClick={handleStartMigration}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Start 1-Click Zero-Loss Migration
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parsedPackage.sheets.map((sheet, sIdx) => (
                <div
                  key={sIdx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{sheet.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Sheet: {sheet.sheetName}
                        </div>
                        <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                          {sheet.categoryLabel}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300">
                      {sheet.parsedData.length} valid / {sheet.totalRows} rows
                    </span>
                  </div>

                  {/* Mapped Fields Badges */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Auto-Mapped Fields ({Object.keys(sheet.mappedFields).length}):
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {Object.entries(sheet.mappedFields).map(([canon, orig], mIdx) => (
                        <span
                          key={mIdx}
                          className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded text-[10px] text-slate-600 dark:text-slate-400"
                        >
                          <strong className="text-slate-900 dark:text-slate-200">{canon}</strong> &larr;{" "}
                          <span className="italic text-slate-500">{orig}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Migration Progress Panel */}
          {isMigrating && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900/50 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Importing Data Live</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{currentStage}</p>
                  </div>
                </div>
                <span className="text-sm font-black text-blue-600">{progressPercent}%</span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Real-time Logs Console */}
              <div className="bg-slate-950 text-slate-200 rounded-xl p-3 font-mono text-[11px] h-36 overflow-y-auto space-y-1">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={
                      log.type === "success"
                        ? "text-emerald-400"
                        : log.type === "warning"
                        ? "text-amber-400"
                        : log.type === "error"
                        ? "text-rose-400"
                        : "text-slate-300"
                    }
                  >
                    &gt; {log.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {migrationComplete && finalCounts && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                  Migration Successfully Completed!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 max-w-lg mx-auto">
                  All sheets from <strong>{parsedPackage.fileName}</strong> have been parsed and loaded into UdyogBill without data loss.
                </p>
              </div>

              <div className="inline-flex flex-wrap justify-center gap-4 text-xs font-semibold text-emerald-900 dark:text-emerald-200 bg-white dark:bg-slate-900 px-5 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span>✅ {finalCounts.products} Products Live</span>
                <span>•</span>
                <span>✅ {finalCounts.parties} Customers & Suppliers</span>
                <span>•</span>
                <span>✅ {finalCounts.invoices} Past Invoices</span>
                <span>•</span>
                <span>✅ {finalCounts.expenses} Historical Expenses</span>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href="/app/inventory/items"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  View Inventory & Stock
                </Link>
                <Link
                  href="/app/parties/customers"
                  className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-xl transition"
                >
                  View Parties
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
