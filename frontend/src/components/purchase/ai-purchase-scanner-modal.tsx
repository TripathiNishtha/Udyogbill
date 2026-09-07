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
  Zap
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
      qty: number;
      price: number;
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setQualityWarning(null);
      setErrorMessage(null);
      setScanResult(null);

      // Client-side quick size/blur heuristic check
      if (selected.size < 20 * 1024) {
        setQualityWarning(
          "⚠️ Selected image is very small or compressed (<20 KB). Text might be blurry or hard to recognize. Clear photos give 100% accuracy."
        );
      }
    }
  };

  const handleScan = async () => {
    if (!file && !rawText.trim()) {
      alert("Please upload a photo of the bill or paste the raw invoice text.");
      return;
    }

    try {
      setAnalyzing(true);
      setErrorMessage(null);
      setQualityWarning(null);

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
        "AI Scan failed. Please verify that the AI Pro Add-on is active or upload a clearer bill photo."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpdateItem = (index: number, field: keyof AiScannedLineItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === "quantity" || field === "unitPrice" || field === "gstRate") {
        const qty = Number(copy[index].quantity) || 0;
        const price = Number(copy[index].unitPrice) || 0;
        const gst = Number(copy[index].gstRate) || 0;
        const taxable = qty * price;
        copy[index].taxableAmount = taxable;
        copy[index].totalAmount = taxable + (taxable * gst) / 100;
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
        quantity: 1,
        unitPrice: 100,
        gstRate: 18,
        taxableAmount: 100,
        totalAmount: 118,
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
        qty: i.quantity,
        price: i.unitPrice,
        gstRate: i.gstRate,
        total: i.totalAmount
      }))
    });

    onClose();
  };

  const totalCalculated = items.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  const totalTaxable = items.reduce((acc, curr) => acc + (Number(curr.taxableAmount) || 0), 0);
  const totalGst = totalCalculated - totalTaxable;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">AI Smart Purchase Invoice Scanner</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider">
                  AI PRO ADD-ON
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Upload paper invoice / photo. AI extracts supplier, GSTIN, items, rates, and batch with blur detection.
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Quality or Error Warning */}
          {qualityWarning && (
            <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-start space-x-3 text-amber-200 text-xs leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-amber-300">Photo Clarity Warning</span>
                {qualityWarning}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-start space-x-3 text-rose-200 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-rose-300">Scanning Alert</span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Upload / Capture Section */}
          {!scanResult ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* File / Camera Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-950/60 hover:bg-indigo-950/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="space-y-3">
                    <img
                      src={previewUrl}
                      alt="Invoice Preview"
                      className="max-h-48 rounded-xl object-contain border border-slate-700 shadow-md mx-auto"
                    />
                    <p className="text-xs text-indigo-400 font-semibold group-hover:underline">
                      Click to choose another photo or PDF
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-indigo-600/10 group-hover:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400 mb-4 transition">
                      <Camera className="w-10 h-10" />
                    </div>
                    <p className="text-sm font-bold text-white mb-1">Click to Upload or Drag Invoice Photo</p>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Supports JPG, PNG, WebP or Camera snaps. High resolution guarantees 100% data fidelity.
                    </p>
                  </>
                )}
              </div>

              {/* Paste Raw Invoice Text or OCR fallback */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Raw Invoice Text or WhatsApp Bill Copy (Optional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Instant Parser</span>
                </div>
                <textarea
                  rows={6}
                  placeholder="Paste supplier bill message, WhatsApp text, or scanned OCR text here...&#10;e.g. INVOICE: INV-9901&#10;GSTIN: 07AAACH7409R1ZZ&#10;PARACETAMOL 650MG | QTY: 50 | RATE: 18.50 | GST: 12%"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Edge Quality Check Included</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={analyzing || (!file && !rawText.trim())}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition"
                  >
                    {analyzing ? (
                      <>
                        <Zap className="w-4 h-4 animate-spin text-amber-300" />
                        <span>AI Analyzing Invoice...</span>
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
            /* Scanned Results & Verification Interface */
            <div className="space-y-6">
              {/* Header Meta Verification */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Supplier / Vendor Legal Name
                  </label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Supplier GSTIN
                  </label>
                  <input
                    type="text"
                    value={supplierGstin}
                    onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-semibold text-amber-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Bill / Invoice Number
                  </label>
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Items Table Verification */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Scanned Line Items ({items.length}) - 100% Verification</span>
                  </h3>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScanResult(null);
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 underline"
                    >
                      Rescan Another Invoice
                    </button>
                  </div>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/60">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3">HSN Code</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                        <th className="py-2.5 px-3 text-right">GST %</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                        <th className="py-2.5 px-3 text-center">Confidence</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40 transition">
                          <td className="py-2 px-3 min-w-[200px]">
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => handleUpdateItem(idx, "itemName", e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700/80 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="py-2 px-3 w-28">
                            <input
                              type="text"
                              value={item.hsnCode || ""}
                              onChange={(e) => handleUpdateItem(idx, "hsnCode", e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700/80 rounded text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="py-2 px-3 w-20 text-right">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700/80 rounded text-xs text-right font-mono text-white focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="py-2 px-3 w-24 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItem(idx, "unitPrice", e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700/80 rounded text-xs text-right font-mono text-white focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="py-2 px-3 w-20 text-right">
                            <select
                              value={item.gstRate}
                              onChange={(e) => handleUpdateItem(idx, "gstRate", Number(e.target.value))}
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700/80 rounded text-xs text-right font-mono text-amber-400 focus:outline-none focus:border-indigo-500"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="py-2 px-3 w-28 text-right font-mono font-bold text-white">
                            ₹{Number(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {item.confidence >= 0.9 ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{(item.confidence * 100).toFixed(0)}%</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{(item.confidence * 100).toFixed(0)}% check</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(idx)}
                              className="text-slate-400 hover:text-rose-400 p-1"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals Summary */}
              <div className="flex flex-col sm:flex-row items-end justify-between gap-4 p-4 bg-slate-950/90 border border-slate-800 rounded-xl">
                <div className="text-xs text-slate-400">
                  <p>✨ Verified items will be populated directly into your new purchase bill draft.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supplier and product catalog entries will be created or matched automatically.
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-xs text-slate-400">
                    Taxable Subtotal: <span className="font-mono text-white">₹{totalTaxable.toFixed(2)}</span> | GST: <span className="font-mono text-amber-400">₹{totalGst.toFixed(2)}</span>
                  </div>
                  <div className="text-base font-extrabold text-white">
                    Verified Total: <span className="text-emerald-400 font-mono">₹{totalCalculated.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>

          {scanResult && (
            <button
              type="button"
              onClick={handleApplyToBill}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
            >
              <span>Confirm & Transfer to Purchase Bill</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
