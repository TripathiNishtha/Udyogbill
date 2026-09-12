"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  X,
  FileText
} from "lucide-react";
import { importService, BulkProductImportRow, BulkProductImportResult } from "@/services/import-services";
import { downloadMasterMigrationTemplate } from "@/lib/master-migration-template";

export default function BulkProductImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<BulkProductImportRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkProductImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await importService.downloadProductTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "UdyogBill_Product_Import_Template.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMsg("Failed to download template: " + (err.message || "Unknown error"));
    }
  };

  const parseCsvText = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      setErrorMsg("The CSV file has no data rows.");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
    const rows: BulkProductImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = parseCsvLine(lines[i]);
      if (parts.length === 0 || !parts.some((p) => p.trim())) continue;

      const getVal = (possibleHeaders: string[]): string => {
        for (const ph of possibleHeaders) {
          const idx = headers.indexOf(ph.toLowerCase().replace(/[^a-z0-9]/g, ""));
          if (idx >= 0 && parts[idx]) return parts[idx].trim();
        }
        return "";
      };

      const sku = getVal(["sku", "itemcode", "productcode", "code"]) || `SKU-${Date.now()}-${i}`;
      const name = getVal(["name", "productname", "itemname", "description"]);
      if (!name) continue; // Skip empty row

      const categoryName = getVal(["categoryname", "category", "group"]);
      const brandName = getVal(["brandname", "brand", "manufacturer"]);
      const hsnCode = getVal(["hsncode", "hsn", "sac"]);
      const barcode = getVal(["barcode", "upc", "ean"]);
      const primaryUom = getVal(["primaryuom", "uom", "unit"]) || "PCS";
      const taxRate = parseFloat(getVal(["taxrate", "tax", "gst", "gstpercent"])) || 0;
      const cessRate = parseFloat(getVal(["cessrate", "cess"])) || 0;
      const purchasePrice = parseFloat(getVal(["purchaseprice", "purchaserate", "cost", "buyprice"])) || 0;
      const retailPrice = parseFloat(getVal(["retailprice", "retailrate", "customerrate", "saleprice", "salerate", "sellingprice", "price", "rate"])) || purchasePrice * 1.2;
      const wholesalePrice = parseFloat(getVal(["wholesaleprice", "wholesalerate", "b2brate", "dealerrate", "minimumsellingprice"])) || retailPrice;
      const mrp = parseFloat(getVal(["mrp", "maxretailprice"])) || retailPrice;
      const minimumStockAlert = parseFloat(getVal(["minimumstockalert", "minstock", "minqty"])) || 10;
      const reorderQuantity = parseFloat(getVal(["reorderquantity", "reorderqty", "roq"])) || 20;
      const openingStock = parseFloat(getVal(["openingstock", "stock", "quantity", "qty"])) || 0;
      const batchNumber = getVal(["batchnumber", "batch", "batchno"]);
      const expiryDate = getVal(["expirydate", "expiry", "expdate"]);
      const rackLocation = getVal(["racklocation", "rack", "bin"]);
      const description = getVal(["description", "notes", "detail"]);

      rows.push({
        sku,
        name,
        categoryName,
        brandName,
        hsnCode,
        barcode,
        primaryUom,
        taxRate,
        cessRate,
        purchasePrice,
        salePrice: retailPrice,
        retailPrice,
        wholesalePrice,
        mrp,
        minimumStockAlert,
        reorderQuantity,
        openingStock,
        batchNumber,
        expiryDate: expiryDate ? expiryDate : undefined,
        rackLocation,
        description,
      });
    }

    setParsedRows(rows);
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (c === "," && !insideQuotes) {
        result.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setErrorMsg(null);
    setImportResult(null);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        parseCsvText(text);
      } catch (err: any) {
        setErrorMsg("Failed to read CSV: " + err.message);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(selected);
  };

  const handleStartImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setErrorMsg(null);

    try {
      const res = await importService.importProducts({
        products: parsedRows,
        overwriteExisting,
      });
      setImportResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process bulk import.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 mb-1">
            <Link href="/app/inventory/items" className="hover:underline flex items-center space-x-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Product Catalog</span>
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <Package className="w-8 h-8 text-indigo-400" />
            <span>Product Master & Opening Stock Bulk Migration</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Import hundreds of products, categories, tax slabs, batch numbers, and opening balances directly from Excel/CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => downloadMasterMigrationTemplate({ includeSampleData: true })}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>Download Master Excel Template (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Simple CSV Template</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Upload Box */}
      {!importResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              <span>1. Upload Data File</span>
            </h2>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/80 space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <FileSpreadsheet className="w-12 h-12 text-indigo-400 mx-auto animate-bounce" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">
                  {file ? file.name : "Click to browse or drop CSV"}
                </p>
                <p className="text-[11px] text-slate-500">Supports standard CSV with UTF-8 encoding</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Overwrite matching existing SKUs</span>
              </label>

              <button
                type="button"
                disabled={parsedRows.length === 0 || isImporting || isParsing}
                onClick={handleStartImport}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing into Database...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Start Import ({parsedRows.length} Items)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Data Preview Table */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <span>2. Parsed Data Preview</span>
                </h2>
                <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold">
                  {parsedRows.length} Valid Rows Ready
                </span>
              </div>

              {parsedRows.length === 0 ? (
                <div className="py-20 text-center space-y-2 text-slate-500">
                  <FileText className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-xs">No CSV uploaded yet. Download sample template to begin.</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96 border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">GST%</th>
                        <th className="p-3">Buy Price</th>
                        <th className="p-3">Sale Price</th>
                        <th className="p-3">Opening Qty</th>
                        <th className="p-3">Batch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {parsedRows.slice(0, 50).map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-850/50">
                          <td className="p-3 text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-bold text-indigo-400">{r.sku}</td>
                          <td className="p-3 font-sans text-white font-medium">{r.name}</td>
                          <td className="p-3 font-sans text-slate-400">{r.categoryName || "General"}</td>
                          <td className="p-3">{r.taxRate}%</td>
                          <td className="p-3">₹{r.purchasePrice}</td>
                          <td className="p-3 text-emerald-400 font-bold">₹{r.salePrice}</td>
                          <td className="p-3 text-amber-400 font-bold">{r.openingStock} {r.primaryUom}</td>
                          <td className="p-3 text-slate-400">{r.batchNumber || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 50 && (
                    <div className="p-2 text-center text-xs text-slate-500 bg-slate-950 border-t border-slate-800">
                      Showing first 50 of {parsedRows.length} records.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success / Result View */}
      {importResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Migration Complete</h2>
              <p className="text-xs text-slate-400">All valid rows have been committed to PostgreSQL database.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
              <p className="text-xs text-slate-400">Total Rows</p>
              <p className="text-2xl font-black text-white">{importResult.totalProcessed}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-900/40 text-center">
              <p className="text-xs text-emerald-400">Successfully Imported</p>
              <p className="text-2xl font-black text-emerald-400">{importResult.successCount}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-amber-900/40 text-center">
              <p className="text-xs text-amber-400">Skipped (Duplicates)</p>
              <p className="text-2xl font-black text-amber-400">{importResult.skippedCount}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-rose-900/40 text-center">
              <p className="text-xs text-rose-400">Failed / Errors</p>
              <p className="text-2xl font-black text-rose-400">{importResult.failedCount}</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Error Details</h3>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-60 overflow-y-auto space-y-2 text-xs">
                {importResult.errors.map((e, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-rose-300">
                    <span className="font-mono text-slate-500">Row {e.rowIndex}:</span>
                    <span className="font-bold">{e.skuOrIdentifier}</span>
                    <span>— {e.errorMessage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-4 pt-4 border-t border-slate-800">
            <Link
              href="/app/inventory/items"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
            >
              View Updated Product Catalog
            </Link>
            <button
              type="button"
              onClick={() => {
                setImportResult(null);
                setFile(null);
                setParsedRows([]);
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
