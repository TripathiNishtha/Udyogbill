"use client";

import { useEffect, useState, useRef } from "react";
import {
  Sparkles,
  Printer,
  Barcode as BarcodeIcon,
  Search,
  CheckCircle2,
  Layers,
  Settings2,
  RefreshCw,
  Eye,
  Check,
  Shirt,
  Tag,
  Copy
} from "lucide-react";
import JsBarcode from "jsbarcode";
import { inventoryService } from "@/services/inventory-services";
import { barcodeService } from "@/services/barcode-services";
import { ItemList, BarcodeItemLabel } from "@/types";

// Standard ISO/IEC Code-128 Scannable Barcode SVG Component
function BarcodeSvg({
  value,
  width = 1.3,
  height = 34,
  displayValue = true,
  fontSize = 9,
  className = ""
}: {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue,
          fontSize,
          margin: 2,
          textMargin: 1,
          font: "monospace",
          fontOptions: "bold",
          lineColor: "#000000",
          background: "#ffffff"
        });
      } catch (err) {
        console.error("Barcode generation error:", err);
      }
    }
  }, [value, width, height, displayValue, fontSize]);

  return <svg ref={svgRef} className={`mx-auto block ${className}`} />;
}

export default function BarcodeStudioPage() {
  const [items, setItems] = useState<ItemList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [labelData, setLabelData] = useState<BarcodeItemLabel | null>(null);
  const [fetchingLabel, setFetchingLabel] = useState(false);

  // Garments Multi-Variant State
  const [printMode, setPrintMode] = useState<"all-variants" | "single-variant" | "standard">("all-variants");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [variantCopies, setVariantCopies] = useState<Record<string, number>>({});
  const [bulkVariantCopies, setBulkVariantCopies] = useState<number | "">(2);

  // Label Customization Settings
  const [labelCopies, setLabelCopies] = useState<number>(24);
  const [sheetLayout, setSheetLayout] = useState<"a4-24" | "a4-40" | "a4-65" | "thermal-single">("a4-24");
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showMrp, setShowMrp] = useState<boolean>(true);
  const [showBatch, setShowBatch] = useState<boolean>(true);
  const [showTenantName, setShowTenantName] = useState<boolean>(true);
  const [showBarcodeText, setShowBarcodeText] = useState<boolean>(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getItems({ pageSize: 100 });
      setItems(res.items || []);
      if (res.items && res.items.length > 0) {
        setSelectedItemId(res.items[0].id);
        fetchItemBarcode(res.items[0].id);
      }
    } catch (err) {
      console.error("Failed to load items:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItemBarcode = async (itemId: string, variantId?: string) => {
    setFetchingLabel(true);
    try {
      const data = await barcodeService.getItemBarcode(itemId, undefined, variantId);
      setLabelData(data);
      if (data.variants && data.variants.length > 0) {
        if (!variantId) {
          setPrintMode("all-variants");
          setSelectedVariantId(data.variants[0].id);
          const initialMap: Record<string, number> = {};
          data.variants.forEach((v) => {
            initialMap[v.id] = initialMap[v.id] || 2;
          });
          setVariantCopies(initialMap);
        }
      } else {
        setPrintMode("standard");
      }
    } catch (err) {
      console.error("Failed to fetch barcode:", err);
    } finally {
      setFetchingLabel(false);
    }
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    setSelectedVariantId("");
    fetchItemBarcode(itemId);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.barcode && i.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalVariantCopies =
    labelData?.variants && labelData.variants.length > 0
      ? labelData.variants.reduce((sum, v) => sum + (variantCopies[v.id] ?? 2), 0)
      : 0;

  const totalEffectiveLabels =
    printMode === "all-variants" && labelData?.variants && labelData.variants.length > 0
      ? totalVariantCopies
      : labelCopies;

  interface RenderTagItem {
    key: string;
    tenantName: string;
    itemName: string;
    barcode: string;
    sku: string;
    size?: string;
    color?: string;
    mrp: number;
    sellingPrice: number;
    batchNumber?: string;
    expiryDate?: string;
  }

  const renderedTags: RenderTagItem[] = [];
  if (labelData) {
    if (printMode === "all-variants" && labelData.variants && labelData.variants.length > 0) {
      labelData.variants.forEach((v) => {
        const count = variantCopies[v.id] ?? 2;
        for (let i = 0; i < count; i++) {
          renderedTags.push({
            key: `${v.id}-${i}`,
            tenantName: labelData.tenantName || "UdyogBill",
            itemName: labelData.itemName,
            barcode: v.barcode || v.sku,
            sku: v.sku,
            size: v.size,
            color: v.color,
            mrp: labelData.mrp + v.priceAdjustment,
            sellingPrice: labelData.sellingPrice + v.priceAdjustment,
            batchNumber: labelData.batchNumber,
            expiryDate: labelData.expiryDate
          });
        }
      });
    } else {
      for (let i = 0; i < labelCopies; i++) {
        renderedTags.push({
          key: `single-${i}`,
          tenantName: labelData.tenantName || "UdyogBill",
          itemName: labelData.itemName,
          barcode: labelData.barcode || labelData.itemSku || "PRD-001",
          sku: labelData.itemSku,
          size: labelData.size,
          color: labelData.color,
          mrp: labelData.mrp,
          sellingPrice: labelData.sellingPrice,
          batchNumber: labelData.batchNumber,
          expiryDate: labelData.expiryDate
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header - Fully visible in both Light and Dark Themes */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl border border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400">
            <BarcodeIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Barcode & Thermal Label Studio
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                Standard Code-128 Scannable
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generate 100% scannable barcode price tags on A4 Sticker Sheets (24/40/65) or Thermal Rolls (50×25mm)
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          disabled={!labelData || renderedTags.length === 0}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print {totalEffectiveLabels} Labels (Ctrl+P)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Picker & Configuration (Hidden on Print) */}
        <div className="print:hidden lg:col-span-1 space-y-5">
          {/* 1. Select Product Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <BarcodeIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span>1. Select Product</span>
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {filteredItems.length} Products
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30"
              />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 p-1">
              {loading ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1.5 text-orange-500" />
                  Loading items...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No products match your search.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemSelect(item.id)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition-all cursor-pointer flex justify-between items-center ${
                        isSelected
                          ? "bg-orange-100 dark:bg-orange-950/60 border border-orange-400 dark:border-orange-600/60 shadow-xs"
                          : "hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className={`font-semibold truncate ${isSelected ? "text-orange-950 dark:text-orange-100" : "text-slate-900 dark:text-slate-100"}`}>
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          SKU: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.sku}</span>
                          {item.barcode && <span className="ml-1.5">• Barcode: {item.barcode}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          ₹{Number(item.sellingPrice).toFixed(0)}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          MRP: ₹{Number(item.mrp).toFixed(0)}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Garments Multi-Variant Studio Card */}
          {labelData?.variants && labelData.variants.length > 0 && (
            <div className="bg-orange-50/70 dark:bg-orange-950/20 rounded-2xl border-2 border-orange-300 dark:border-orange-700/60 p-4 space-y-3.5 shadow-sm text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-orange-950 dark:text-orange-200 uppercase tracking-wider flex items-center space-x-1.5">
                  <Shirt className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span>Garments Variant Studio</span>
                </h3>
                <span className="px-2 py-0.5 bg-orange-200/80 dark:bg-orange-900/60 text-orange-900 dark:text-orange-200 font-bold rounded-full text-[10px]">
                  {labelData.variants.length} Variants Available
                </span>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-orange-100/70 dark:bg-orange-950/50 rounded-xl border border-orange-200 dark:border-orange-800">
                <button
                  type="button"
                  onClick={() => setPrintMode("all-variants")}
                  className={`py-1.5 px-2 rounded-lg font-bold text-center transition cursor-pointer text-[11px] flex items-center justify-center gap-1.5 ${
                    printMode === "all-variants"
                      ? "bg-white dark:bg-orange-600 text-orange-900 dark:text-white shadow-xs font-black"
                      : "text-orange-700 dark:text-orange-300 hover:text-orange-950"
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>1-Click All Variants</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode("single-variant")}
                  className={`py-1.5 px-2 rounded-lg font-bold text-center transition cursor-pointer text-[11px] flex items-center justify-center gap-1.5 ${
                    printMode === "single-variant"
                      ? "bg-white dark:bg-orange-600 text-orange-900 dark:text-white shadow-xs font-black"
                      : "text-orange-700 dark:text-orange-300 hover:text-orange-950"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Single Variant</span>
                </button>
              </div>

              {printMode === "all-variants" ? (
                <div className="space-y-3">
                  {/* Bulk Fill for All Variants */}
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-orange-200 dark:border-orange-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Stickers per Variant:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={bulkVariantCopies}
                          onChange={(e) => setBulkVariantCopies(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-14 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (bulkVariantCopies !== "") {
                              const updated: Record<string, number> = {};
                              labelData.variants?.forEach((v) => {
                                updated[v.id] = Number(bulkVariantCopies) || 1;
                              });
                              setVariantCopies(updated);
                            }
                          }}
                          className="px-2 py-0.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Apply All
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                      <span className="text-slate-500 font-medium">Quick Fill:</span>
                      <div className="flex gap-1">
                        {[1, 2, 4, 6].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => {
                              const updated: Record<string, number> = {};
                              labelData.variants?.forEach((v) => {
                                updated[v.id] = cnt;
                              });
                              setVariantCopies(updated);
                            }}
                            className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-bold cursor-pointer"
                          >
                            {cnt} each
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Variants List with individual copy inputs */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-1">
                      <span>Variant (Size / Color)</span>
                      <span>Stickers</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {labelData.variants.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]"
                        >
                          <div className="truncate pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 rounded font-black font-mono text-[10px] border border-orange-300 dark:border-orange-800">
                                {v.size}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {v.color}
                              </span>
                            </div>
                            <div className="text-[9.5px] font-mono text-slate-500 mt-0.5">
                              {v.barcode || v.sku}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={variantCopies[v.id] ?? 2}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
                                setVariantCopies((prev) => ({ ...prev, [v.id]: val }));
                              }}
                              className="w-12 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono font-bold text-slate-900 dark:text-white"
                            />
                            <span className="text-[10px] text-slate-400">tags</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Choose Specific Variant:
                  </label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => {
                      const vId = e.target.value;
                      setSelectedVariantId(vId);
                      fetchItemBarcode(selectedItemId, vId);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded-xl p-2 text-slate-900 dark:text-white font-medium focus:outline-none"
                  >
                    {labelData.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        Size: {v.size} | Color: {v.color} ({v.barcode || v.sku})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 2. Sheet Format & Count Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm text-xs">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Settings2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>2. Sheet Format & Count</span>
            </h3>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Print Sheet Layout
              </label>
              <select
                value={sheetLayout}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setSheetLayout(val);
                  if (val === "a4-24") setLabelCopies(24);
                  if (val === "a4-40") setLabelCopies(40);
                  if (val === "a4-65") setLabelCopies(65);
                  if (val === "thermal-single") setLabelCopies(1);
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-medium"
              >
                <option value="a4-24">A4 Sheet - 24 Labels (3 × 8, 64mm × 33.8mm)</option>
                <option value="a4-40">A4 Sheet - 40 Labels (4 × 10, 48.5mm × 25.4mm)</option>
                <option value="a4-65">A4 Sheet - 65 Labels (5 × 13, 38.1mm × 21.2mm)</option>
                <option value="thermal-single">Thermal Roll - 50mm × 25mm Single Tag</option>
              </select>
            </div>

            {printMode !== "all-variants" && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                    Number of Label Stickers
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 24, 40, 65].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setLabelCopies(preset)}
                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={labelCopies}
                  onChange={(e) => setLabelCopies(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 text-slate-900 dark:text-white text-right focus:outline-none focus:border-orange-500 font-mono font-bold"
                />
              </div>
            )}

            <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Visible Label Fields
              </div>

              <label className="flex items-center space-x-2.5 text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTenantName}
                  onChange={(e) => setShowTenantName(e.target.checked)}
                  className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-orange-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Store / Brand Name Header</span>
              </label>

              <label className="flex items-center space-x-2.5 text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-orange-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Our Selling Price (₹)</span>
              </label>

              <label className="flex items-center space-x-2.5 text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showMrp}
                  onChange={(e) => setShowMrp(e.target.checked)}
                  className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-orange-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Max Retail Price (MRP ₹)</span>
              </label>

              <label className="flex items-center space-x-2.5 text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showBatch}
                  onChange={(e) => setShowBatch(e.target.checked)}
                  className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-orange-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Batch # & Expiry Date (if applicable)</span>
              </label>

              <label className="flex items-center space-x-2.5 text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showBarcodeText}
                  onChange={(e) => setShowBarcodeText(e.target.checked)}
                  className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-orange-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Barcode Value / Code Below Lines</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Print Preview Canvas */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Live Print Preview ({totalEffectiveLabels} labels • {sheetLayout})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Scanner Ready (Code-128)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">1:1 Print Alignment</span>
              </div>
            </div>

            {/* Printable Canvas */}
            {fetchingLabel ? (
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-16 text-center text-slate-500">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-orange-600" />
                <p className="text-xs font-semibold">Generating scannable barcode label...</p>
              </div>
            ) : labelData ? (
              <div
                className={`bg-white text-black p-4 rounded-xl border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none ${
                  sheetLayout === "thermal-single"
                    ? "max-w-[260px] mx-auto"
                    : "w-full grid " +
                      (sheetLayout === "a4-24"
                        ? "grid-cols-3 gap-2.5"
                        : sheetLayout === "a4-40"
                        ? "grid-cols-4 gap-2"
                        : "grid-cols-5 gap-1.5")
                }`}
              >
                {renderedTags.map((tag) => (
                  <div
                    key={tag.key}
                    className="border border-dashed border-slate-300 print:border-none p-2 rounded-lg flex flex-col items-center justify-between text-center bg-white overflow-hidden"
                    style={{
                      minHeight:
                        sheetLayout === "a4-65"
                          ? "80px"
                          : sheetLayout === "a4-40"
                          ? "95px"
                          : sheetLayout === "thermal-single"
                          ? "140px"
                          : "115px"
                    }}
                  >
                    {/* 1. Store Header */}
                    {showTenantName && (
                      <div className="text-[9px] font-extrabold tracking-tight text-slate-800 uppercase truncate w-full">
                        {tag.tenantName || "UdyogBill"}
                      </div>
                    )}

                    {/* 2. Product Name */}
                    <div className="text-[11px] font-black text-black leading-tight truncate w-full mt-0.5">
                      {tag.itemName}
                    </div>

                    {/* 2B. SIZE & COLOR BADGE (CRITICAL FOR GARMENTS) */}
                    {(tag.size || tag.color) && (
                      <div className="my-0.5 px-2 py-0.5 bg-slate-100 rounded text-[9.5px] font-black tracking-wider text-black border border-slate-300 w-full flex items-center justify-center gap-1.5">
                        {tag.size && <span className="text-orange-700 font-mono">SIZE: {tag.size}</span>}
                        {tag.size && tag.color && <span className="text-slate-400 font-normal">|</span>}
                        {tag.color && <span className="text-slate-900">{tag.color.toUpperCase()}</span>}
                      </div>
                    )}

                    {/* 3. REAL SCANNABLE CODE-128 BARCODE SVG */}
                    <div className="my-1 w-full flex flex-col items-center justify-center">
                      <BarcodeSvg
                        value={tag.barcode || tag.sku || "PRD-001"}
                        width={
                          sheetLayout === "a4-65"
                            ? 1.0
                            : sheetLayout === "a4-40"
                            ? 1.15
                            : sheetLayout === "thermal-single"
                            ? 1.45
                            : 1.3
                        }
                        height={
                          sheetLayout === "a4-65"
                            ? (tag.size || tag.color ? 20 : 24)
                            : sheetLayout === "a4-40"
                            ? (tag.size || tag.color ? 24 : 28)
                            : sheetLayout === "thermal-single"
                            ? 36
                            : (tag.size || tag.color ? 28 : 34)
                        }
                        displayValue={showBarcodeText}
                        fontSize={sheetLayout === "a4-65" ? 8 : 9}
                      />
                    </div>

                    {/* 4. Price and MRP Footer */}
                    <div className="flex items-center justify-between w-full text-[9px] font-semibold border-t border-slate-200 pt-1 mt-0.5 px-0.5">
                      {showMrp && (
                        <div className="text-slate-500 line-through">
                          MRP: ₹{Number(tag.mrp).toFixed(0)}
                        </div>
                      )}
                      {showPrice && (
                        <div className="text-black font-black text-[11px] ml-auto">
                          ₹{Number(tag.sellingPrice).toFixed(0)}
                        </div>
                      )}
                    </div>

                    {/* 5. Batch & Expiry (if enabled and present) */}
                    {showBatch && tag.batchNumber && (
                      <div className="text-[7.5px] text-slate-600 flex justify-between w-full font-mono mt-0.5 border-t border-dashed border-slate-100 pt-0.5">
                        <span className="truncate">B: {tag.batchNumber}</span>
                        {tag.expiryDate && (
                          <span className="shrink-0 ml-1">
                            EXP:{" "}
                            {new Date(tag.expiryDate).toLocaleDateString("en-IN", {
                              month: "2-digit",
                              year: "2-digit"
                            })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-16 text-center text-slate-400">
                <BarcodeIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select a product from the left to view and print barcode labels
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
