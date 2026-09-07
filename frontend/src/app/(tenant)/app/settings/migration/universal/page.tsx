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
  Download
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Universal Smart Importer
          </div>
          <h1 className="text-2xl font-black tracking-tight">1-Click Multi-Sheet ERP Data Migrator</h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Switch from <strong>Marg ERP, Tally Prime, Vyapar, or Busy</strong> seamlessly. Upload an Excel workbook with multiple sheets (Items, Customers, Suppliers, Invoices, Expenses). Our engine automatically detects sheet categories and maps any column sequence without data loss.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => downloadMasterMigrationTemplate({ includeSampleData: true })}
            className="px-3.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Master Template (.xlsx)</span>
          </button>
          <Link
            href="/app/settings/migration"
            className="px-4 py-2 text-xs font-medium text-slate-300 bg-white/10 hover:bg-white/20 rounded-xl transition border border-white/10"
          >
            Classic CSV Import
          </Link>
        </div>
      </div>

      {/* Master Excel Template Hero Card */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold uppercase tracking-wider border border-emerald-400/30">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Official UdyogBill Excel Template
            </div>
            <h2 className="text-base font-bold text-white">
              Download 100% Comprehensive Multi-Sheet Excel Template (.xlsx)
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              Pre-configured workbook containing 7 specialized sheets with column headers, sample data across industries, GST slabs, and multi-batch opening stock. Fill it up and upload here for zero-error migration!
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadMasterMigrationTemplate({ includeSampleData: true })}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download with Sample Data</span>
            </button>
            <button
              onClick={() => downloadMasterMigrationTemplate({ includeSampleData: false })}
              className="px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Blank Template</span>
            </button>
          </div>
        </div>

        {/* 7 Sheets Overview Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 border-t border-slate-800/80">
          {MASTER_MIGRATION_SHEETS_INFO.map((s, idx) => (
            <div
              key={idx}
              className="p-2 bg-slate-950/60 border border-slate-800 rounded-lg text-left"
            >
              <span className="text-[11px] font-bold text-slate-200 block truncate">{s.title}</span>
              <span className="text-[9px] text-slate-400 line-clamp-2 mt-0.5">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Software Presets */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Select Source Software (Optional - Auto Detect Available)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { id: "auto", name: "Auto Detect", icon: "✨", desc: "Universal Multi-Sheet" },
            { id: "marg", name: "Marg ERP 9+", icon: "🟢", desc: "Pharma / FMCG Master" },
            { id: "tally", name: "Tally Prime", icon: "🟡", desc: "Ledger & Inventory XML/XLS" },
            { id: "vyapar", name: "Vyapar App", icon: "🔵", desc: "Full Company Backup" },
            { id: "busy", name: "Busy Accounting", icon: "🟣", desc: "Standard Excel Register" }
          ].map((sw) => (
            <button
              key={sw.id}
              onClick={() => setSelectedSoftware(sw.id)}
              className={
                selectedSoftware === sw.id
                  ? "flex flex-col text-left p-3.5 rounded-xl border transition-all border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 dark:border-blue-500 shadow-sm"
                  : "flex flex-col text-left p-3.5 rounded-xl border transition-all border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
              }
            >
              <span className="text-xl mb-1">{sw.icon}</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{sw.name}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{sw.desc}</span>
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
              {parsedPackage ? parsedPackage.fileName : "Upload Multi-Sheet Excel Workbook"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports .xlsx and .xls workbooks containing 1 to 20 sheets. Columns in any sequence will be matched automatically.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing || isMigrating}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition disabled:opacity-50"
          >
            {isAnalyzing ? "Analyzing All Sheets..." : parsedPackage ? "Replace Excel File" : "Choose Excel File"}
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
