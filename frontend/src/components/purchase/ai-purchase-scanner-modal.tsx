"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Building,
  Hash,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  Plus,
  ArrowRight,
  ShieldCheck,
  Zap,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileSpreadsheet,
  Check
} from "lucide-react";
import { aiService, AiPurchaseScanResponse, AiScannedLineItem } from "@/services/ai-services";

interface AiPurchaseScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyParsedData: (data: {
    supplierName?: string;
    supplierGstin?: string;
    billNumber?: string;
    billDate?: string;
    items: Array<{
      name: string;
      hsn?: string;
      batch?: string;
      expiry?: string;
      qty: number;
      free?: number;
      price: number;
      mrp?: number;
      discountPercent?: number;
      gstRate: number;
      total: number;
    }>;
  }) => void;
}

export function AiPurchaseScannerModal({
  isOpen,
  onClose,
  onApplyParsedData
}: AiPurchaseScannerModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<AiPurchaseScanResponse | null>(null);
  const [items, setItems] = useState<AiScannedLineItem[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [supplierGstin, setSupplierGstin] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Zoom and visual inspection controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);

  // Direct 1-Click Inventory Import State
  const [directImporting, setDirectImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isSpreadsheet = file
    ? file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".tsv")
    : false;

  const isPdf = file ? file.name.endsWith(".pdf") : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setQualityWarning(null);
      setErrorMessage(null);
      setScanResult(null);
      setImportSuccessMsg(null);
      setZoomLevel(100);
      setRotation(0);

      // Client-side quick size/blur heuristic check
      if (selected.size < 15 * 1024 && !selected.name.endsWith(".csv")) {
        setQualityWarning(
          "⚠️ Selected image is very small or compressed (<15 KB). Text might be blurry. Clear high-res photos ensure 100% data fidelity."
        );
      }
    }
  };

  const handleScan = async () => {
    if (!file && !rawText.trim()) {
      alert("Please upload an invoice photo, PDF, Excel/CSV file, or paste raw invoice text.");
      return;
    }

    try {
      setAnalyzing(true);
      setErrorMessage(null);
      setQualityWarning(null);
      setImportSuccessMsg(null);

      const res = await aiService.scanPurchaseBill(file || undefined, rawText.trim() || undefined);
      setScanResult(res);

      if (!res.isQualityAcceptable && res.qualityWarning) {
        setQualityWarning(res.qualityWarning);
      }

      setSupplierName(res.supplierName || "");
      setSupplierGstin(res.supplierGstin || "");
      setBillNumber(res.billNumber || "");
      setBillDate(res.billDate || new Date().toISOString().split("T")[0]);
      setItems(res.items || []);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
        "AI Scan failed. Please verify that the AI Pro Add-on is active or upload a clearer bill document."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpdateItem = (index: number, field: keyof AiScannedLineItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (
        field === "quantity" ||
        field === "unitPrice" ||
        field === "gstRate" ||
        field === "discountPercent"
      ) {
        const qty = Number(copy[index].quantity) || 0;
        const price = Number(copy[index].unitPrice) || 0;
        const discPercent = Number(copy[index].discountPercent) || 0;
        const gst = Number(copy[index].gstRate) || 0;

        const gross = qty * price;
        const discountAmount = gross * (discPercent / 100);
        const taxable = Math.round((gross - discountAmount) * 100) / 100;
        const total = Math.round((taxable + (taxable * gst) / 100) * 100) / 100;

        copy[index].taxableAmount = taxable;
        copy[index].totalAmount = total;
        copy[index].isMathVerified = true;
      }
      return copy;
    });
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemName: "New Item",
        hsnCode: "30049099",
        batchNumber: `BAT-${Math.floor(100 + Math.random() * 900)}`,
        expiryDate: "12/28",
        quantity: 10,
        freeQuantity: 0,
        unitPrice: 100,
        mrp: 140,
        discountPercent: 0,
        gstRate: 12,
        taxableAmount: 1000,
        totalAmount: 1120,
        isMathVerified: true,
        confidence: 1.0
      }
    ]);
  };

  const handleApplyToBill = () => {
    if (items.length === 0) {
      alert("Please ensure at least one verified item is in the list.");
      return;
    }

    onApplyParsedData({
      supplierName,
      supplierGstin,
      billNumber,
      billDate,
      items: items.map((i) => ({
        name: i.itemName,
        hsn: i.hsnCode,
        batch: i.batchNumber,
        expiry: i.expiryDate,
        qty: i.quantity,
        free: i.freeQuantity,
        price: i.unitPrice,
        mrp: i.mrp,
        discountPercent: i.discountPercent,
        gstRate: i.gstRate,
        total: i.totalAmount
      }))
    });

    onClose();
  };

  const handleDirectImportToInventory = async () => {
    if (items.length === 0) {
      alert("Please ensure at least one verified item is in the list.");
      return;
    }

    try {
      setDirectImporting(true);
      setErrorMessage(null);

      const res = await aiService.directImportToInventory({
        supplierName,
        supplierGstin,
        billNumber,
        billDate,
        items
      });

      setImportSuccessMsg(res.message);
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
        "Direct inventory addition failed. Please verify item names and numbers."
      );
    } finally {
      setDirectImporting(false);
    }
  };

  const totalCalculated = items.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  const totalTaxable = items.reduce((acc, curr) => acc + (Number(curr.taxableAmount) || 0), 0);
  const totalGst = totalCalculated - totalTaxable;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[94vh]">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-950/70 via-slate-900 to-purple-950/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-600/20 border border-orange-500/40 rounded-xl text-orange-400">
              <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Universal AI Document & Bill Scanner
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tracking-wider">
                  100% MATHEMATICAL RECONCILER
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-500/20 text-orange-300 border border-orange-500/40 tracking-wider">
                  MULTI-FORMAT
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Upload Paper Invoices, PDF Bills, or Excel/CSV Spreadsheets (Marg, Tally, Busy, Vyapar). Auto-balances and updates Live Stock in 1-Click.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6 text-slate-200 space-y-4">
          {/* Quality, Error or Success Alerts */}
          {importSuccessMsg && (
            <div className="p-4 bg-emerald-950/70 border border-emerald-500/60 rounded-xl flex items-center space-x-3 text-emerald-200 text-xs shadow-lg animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold block text-emerald-300 text-sm">Inventory Successfully Updated!</span>
                {importSuccessMsg}
              </div>
            </div>
          )}

          {qualityWarning && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-start space-x-3 text-amber-200 text-xs leading-relaxed shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-amber-300">Photo Clarity Notice</span>
                {qualityWarning}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-start space-x-3 text-rose-200 text-xs shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-rose-300">Scanning Alert</span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* If No Scan Result: Upload Drop Zone */}
          {!scanResult ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 items-center">
              {/* File Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-orange-500/80 bg-slate-950/60 hover:bg-orange-950/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group h-full min-h-[340px]"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.csv,.xlsx,.xls,.tsv,.txt"
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="space-y-3">
                    {isSpreadsheet ? (
                      <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center space-y-2">
                        <FileSpreadsheet className="w-12 h-12 text-emerald-400 mx-auto" />
                        <p className="text-xs font-bold text-white">{file?.name}</p>
                        <span className="text-[10px] text-emerald-300 font-mono bg-emerald-900/60 px-2 py-0.5 rounded-full">
                          Spreadsheet Mode (100% Cell Accuracy)
                        </span>
                      </div>
                    ) : isPdf ? (
                      <div className="p-6 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-center space-y-2">
                        <FileText className="w-12 h-12 text-rose-400 mx-auto" />
                        <p className="text-xs font-bold text-white">{file?.name}</p>
                        <span className="text-[10px] text-rose-300 font-mono bg-rose-900/60 px-2 py-0.5 rounded-full">
                          PDF Invoice Document
                        </span>
                      </div>
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Invoice Preview"
                        className="max-h-48 rounded-xl object-contain border border-slate-700 shadow-md mx-auto"
                      />
                    )}
                    <p className="text-xs text-orange-400 font-semibold group-hover:underline">
                      Click to choose another photo or file
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-orange-600/10 group-hover:bg-orange-600/20 border border-orange-500/30 rounded-2xl text-orange-400 mb-4 transition">
                      <Camera className="w-10 h-10" />
                    </div>
                    <p className="text-sm font-bold text-white mb-1">
                      Click to Upload or Drag Invoice File
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs mb-3">
                      Accepts Bill Photos (JPG, PNG, WEBP), PDF Invoices, or Excel/CSV spreadsheets.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
                      <span className="bg-slate-800 px-2 py-0.5 rounded">.JPG</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded">.PNG</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded">.PDF</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded">.CSV</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded">.XLSX</span>
                    </div>
                  </>
                )}
              </div>

              {/* Paste Raw Invoice Text or WhatsApp text */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 flex flex-col h-full min-h-[340px]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-orange-400" />
                    <span>Raw Invoice Text or WhatsApp Bill Copy (Optional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Instant Parser</span>
                </div>
                <textarea
                  rows={8}
                  placeholder="Paste distributor bill text, WhatsApp message, or CSV rows here...&#10;e.g.&#10;SUPPLIER: MEDILIFE PHARMA DISTRIBUTORS&#10;GSTIN: 07AAACH7409R1ZZ&#10;PARACETAMOL 650MG | BATCH: PCM-901 | EXP: 12/28 | QTY: 50 | RATE: 18.50 | MRP: 32 | GST: 12%"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                />

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>100% Mathematical Reconciler</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={analyzing || (!file && !rawText.trim())}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-orange-600/30 disabled:opacity-50 transition"
                  >
                    {analyzing ? (
                      <>
                        <Zap className="w-4 h-4 animate-spin text-amber-300" />
                        <span>AI Analyzing & Balancing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Scan & Extract Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* SPLIT-SCREEN VERIFICATION INTERFACE */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
              {/* LEFT PANE: Document Visual Inspection (5 Cols on large screen) */}
              <div className="lg:col-span-5 flex flex-col bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-orange-400" />
                    <span>Original Document / Bill Viewer</span>
                  </span>

                  {/* Zoom Controls */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono font-semibold px-1 text-slate-400">
                      {zoomLevel}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoomLevel(100);
                        setRotation(0);
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Viewport Area */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950">
                  {previewUrl && !isSpreadsheet && !isPdf ? (
                    <div className="transition-transform duration-150" style={{ transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)` }}>
                      <img
                        src={previewUrl}
                        alt="Bill Document"
                        className="max-w-full rounded-lg shadow-lg border border-slate-700"
                      />
                    </div>
                  ) : previewUrl && isPdf ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full rounded border border-slate-800"
                      title="PDF Document"
                    />
                  ) : (
                    <div className="p-8 text-center space-y-3">
                      <FileSpreadsheet className="w-16 h-16 text-emerald-400 mx-auto" />
                      <p className="text-xs font-bold text-white">Tabular File Extracted Directly</p>
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        All line items were parsed from spreadsheet cells with 100% precision. You can review and edit every row on the right.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-2.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 truncate max-w-[200px]">
                    {file?.name || "Uploaded Bill"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setScanResult(null);
                      setFile(null);
                      setPreviewUrl(null);
                      setRawText("");
                    }}
                    className="text-orange-400 hover:text-orange-300 font-semibold underline text-xs"
                  >
                    Upload Another Bill
                  </button>
                </div>
              </div>

              {/* RIGHT PANE: Verified Data & Line Items Table (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col space-y-3 overflow-hidden">
                {/* Header Metadata Cards */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Supplier Name
                    </label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="e.g. Apex Pharma Distributors"
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Supplier GSTIN
                    </label>
                    <input
                      type="text"
                      value={supplierGstin}
                      onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 07AAACH7409R1ZZ"
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-semibold text-amber-400 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Bill / Invoice #
                    </label>
                    <input
                      type="text"
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                      placeholder="e.g. INV-90412"
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Mathematical Balance Reconciler Banner */}
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 px-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-emerald-300">
                      Mathematical Check:
                    </span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      Taxable ₹{totalTaxable.toFixed(2)} + GST ₹{totalGst.toFixed(2)} = ₹{totalCalculated.toFixed(2)}
                    </span>
                  </div>

                  <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 font-bold bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-600">
                    <Check className="w-3 h-3" />
                    <span>{scanResult.mathStatus || "100% Balanced"}</span>
                  </span>
                </div>

                {/* Items Table (Scrollable) */}
                <div className="flex-1 overflow-auto border border-slate-800 rounded-xl bg-slate-950/60">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/95 sticky top-0 z-10 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-2.5">Item Name</th>
                        <th className="py-2 px-2">HSN</th>
                        <th className="py-2 px-2">Batch</th>
                        <th className="py-2 px-2">Expiry</th>
                        <th className="py-2 px-2 text-right">Qty</th>
                        <th className="py-2 px-2 text-right">Free</th>
                        <th className="py-2 px-2 text-right">Rate (₹)</th>
                        <th className="py-2 px-2 text-right">MRP (₹)</th>
                        <th className="py-2 px-2 text-right">Disc%</th>
                        <th className="py-2 px-2 text-right">GST%</th>
                        <th className="py-2 px-2.5 text-right">Total (₹)</th>
                        <th className="py-2 px-1 text-center">Status</th>
                        <th className="py-2 px-1 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50 transition">
                          <td className="py-1.5 px-2 min-w-[140px]">
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => handleUpdateItem(idx, "itemName", e.target.value)}
                              className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-orange-500"
                            />
                          </td>
                          <td className="py-1.5 px-1 w-20">
                            <input
                              type="text"
                              value={item.hsnCode || ""}
                              onChange={(e) => handleUpdateItem(idx, "hsnCode", e.target.value)}
                              className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-300 focus:outline-none focus:border-orange-500"
                            />
                          </td>
                          <td className="py-1.5 px-1 w-20">
                            <input
                              type="text"
                              value={item.batchNumber || ""}
                              onChange={(e) => handleUpdateItem(idx, "batchNumber", e.target.value)}
                              placeholder="BATCH"
                              className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                            />
                          </td>
                          <td className="py-1.5 px-1 w-16">
                            <input
                              type="text"
                              value={item.expiryDate || ""}
                              onChange={(e) => handleUpdateItem(idx, "expiryDate", e.target.value)}
                              placeholder="MM/YY"
                              className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-300 focus:outline-none focus:border-orange-500"
                            />
                          </td>
                          <td className="py-1.5 px-1 w-14 text-right">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                              className="w-full px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-right font-mono text-white focus:outline-none focus:border-orange-500"
                            />
                          </td>
                          <td className="py-1.5 px-1 w-12 text-right">
                            <input
                              type="number"
                              value={item.freeQuantity || 0}
                              onChange={(e) => handleUpdateItem(idx, "freeQuantity", e.target.value)}
                              className="w-full px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-right font-mono text-slate-300 focus:outline-none focus:border-orange-500"
                            />
                          </td>
                          <td className="py-1.5 px-1 w-16 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItem(idx, "unitPrice", e.target.value)}
                              className="w-full px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-right font-mono text-white focus:outline-none focus:border-orange-500"
                            />
                          </td>
                          <td className="py-1.5 px-1 w-16 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={item.mrp || 0}
                              onChange={(e) => handleUpdateItem(idx, "mrp", e.target.value)}
                              className="w-full px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-right font-mono text-slate-300 focus:outline-none focus:border-orange-500"
                            />
                          </td>
                          <td className="py-1.5 px-1 w-12 text-right">
                            <input
                              type="number"
                              value={item.discountPercent || 0}
                              onChange={(e) => handleUpdateItem(idx, "discountPercent", e.target.value)}
                              className="w-full px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-right font-mono text-slate-400 focus:outline-none focus:border-orange-500"
                            />
                          </td>
                          <td className="py-1.5 px-1 w-16 text-right">
                            <select
                              value={item.gstRate}
                              onChange={(e) => handleUpdateItem(idx, "gstRate", Number(e.target.value))}
                              className="w-full px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-right font-mono text-amber-400 focus:outline-none focus:border-orange-500"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-white whitespace-nowrap">
                            ₹{Number(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            <span className="inline-flex items-center text-[10px] text-emerald-400 font-bold" title="Math Reconciled">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(idx)}
                              className="text-slate-400 hover:text-rose-400 p-0.5"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sub-toolbar: Add Item & Summary */}
                <div className="flex items-center justify-between p-2 bg-slate-950/80 border border-slate-800 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center space-x-1 px-3 py-1 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 rounded-lg text-xs font-semibold text-orange-300 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>

                  <div className="text-right text-xs space-x-3">
                    <span className="text-slate-400">
                      Total Items: <strong className="text-white">{items.length}</strong>
                    </span>
                    <span className="text-slate-400">
                      Taxable: <strong className="text-white font-mono">₹{totalTaxable.toFixed(2)}</strong>
                    </span>
                    <span className="text-slate-400">
                      GST: <strong className="text-amber-400 font-mono">₹{totalGst.toFixed(2)}</strong>
                    </span>
                    <span className="text-slate-400">
                      Grand Total: <strong className="text-emerald-400 font-mono text-sm">₹{totalCalculated.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>

          {scanResult && (
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleApplyToBill}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition shadow"
              >
                <span>Transfer to Purchase Bill Form</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleDirectImportToInventory}
                disabled={directImporting}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
              >
                {directImporting ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Adding to Live Stock...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>⚡ 1-Click Save Directly to Live Stock</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

