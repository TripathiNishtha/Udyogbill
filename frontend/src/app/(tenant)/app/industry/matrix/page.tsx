"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Shirt,
  Plus,
  Trash2,
  Barcode,
  CheckCircle2,
  Boxes,
  Layers,
  ArrowRight,
} from "lucide-react";
import { inventoryService } from "@/services/inventory-services";
import { industryService, GeneratedVariant } from "@/services/industry-services";
import { MasterItem } from "@/types";

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];
const DEFAULT_COLORS = ["Black", "White", "Navy Blue", "Olive Green", "Crimson Red", "Charcoal Gray"];
const DEFAULT_FITS = ["Regular", "Slim Fit", "Relaxed Fit"];

export default function ApparelMatrixPage() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [sizes, setSizes] = useState<string[]>(["M", "L", "XL"]);
  const [colors, setColors] = useState<string[]>(["Navy Blue", "White"]);
  const [fits, setFits] = useState<string[]>(["Regular"]);
  const [customSize, setCustomSize] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [priceAdjustment, setPriceAdjustment] = useState<number>(0);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    inventoryService
      .getItems({ pageSize: 100 })
      .then((res) => {
        setItems(res.items || []);
        if (res.items && res.items.length > 0) {
          setSelectedItemId(res.items[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const toggleSize = (s: string) => {
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const toggleColor = (c: string) => {
    setColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const toggleFit = (f: string) => {
    setFits((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const addCustomSize = () => {
    if (customSize.trim() && !sizes.includes(customSize.trim())) {
      setSizes([...sizes, customSize.trim().toUpperCase()]);
      setCustomSize("");
    }
  };

  const addCustomColor = () => {
    if (customColor.trim() && !colors.includes(customColor.trim())) {
      setColors([...colors, customColor.trim()]);
      setCustomColor("");
    }
  };

  const handleGenerate = async () => {
    if (!selectedItemId) {
      alert("Please select a base catalog item.");
      return;
    }
    if (sizes.length === 0 || colors.length === 0) {
      alert("Please select at least one Size and one Color.");
      return;
    }

    try {
      setGenerating(true);
      setSuccessMsg("");
      const res = await industryService.generateMatrixVariants({
        baseItemId: selectedItemId,
        sizes,
        colors,
        fits: fits.length > 0 ? fits : undefined,
        basePriceAdjustment: priceAdjustment,
      });

      setGeneratedVariants(res || []);
      setSuccessMsg(`Successfully generated ${res.length} matrix variant SKUs!`);
    } catch (err) {
      alert("Failed to generate matrix variants.");
    } finally {
      setGenerating(false);
    }
  };

  const totalCalculated = sizes.length * colors.length * Math.max(1, fits.length);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
          <Shirt className="w-7 h-7 text-indigo-400" />
          <span>Garments & Apparel Matrix Generator</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Auto-generate multi-dimensional Size, Color, and Fit variants with EAN-13 barcodes and price modifiers.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Generator Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Base Item Selection */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">
              Step 1: Select Base Garment Style / Item
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.sku} — {i.name} (Base MRP: ₹{i.mrp || i.sellingPrice})
                </option>
              ))}
            </select>
          </div>

          {/* Sizes Selection */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Step 2: Choose Sizes ({sizes.length} selected)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Custom size (e.g. 42R)..."
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                />
                <button
                  type="button"
                  onClick={addCustomSize}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {DEFAULT_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSize(s)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                    sizes.includes(s)
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
              {sizes
                .filter((s) => !DEFAULT_SIZES.includes(s))
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className="px-4 py-2 rounded-xl text-xs font-bold font-mono bg-indigo-600 text-white border border-indigo-400"
                  >
                    {s}
                  </button>
                ))}
            </div>
          </div>

          {/* Colors Selection */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Step 3: Choose Color Variants ({colors.length} selected)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Custom color..."
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                />
                <button
                  type="button"
                  onClick={addCustomColor}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleColor(c)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    colors.includes(c)
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {c}
                </button>
              ))}
              {colors
                .filter((c) => !DEFAULT_COLORS.includes(c))
                .map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleColor(c)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white border border-indigo-400"
                  >
                    {c}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Action & Preview Card */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Matrix Generator Preview</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Sizes Selected:</span>
                <span className="font-mono text-white font-semibold">{sizes.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Colors Selected:</span>
                <span className="font-mono text-white font-semibold">{colors.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Fits Selected:</span>
                <span className="font-mono text-white font-semibold">{fits.length}</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-3 border-t border-slate-800 text-sm">
                <span>Total Variant SKUs:</span>
                <span className="font-mono text-emerald-400 text-base">{totalCalculated} SKUs</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || totalCalculated === 0}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{generating ? "Generating Matrix..." : `Generate ${totalCalculated} Variants`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generated Results Table */}
      {generatedVariants.length > 0 && (
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-xl space-y-2">
          <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
            <span className="font-bold text-xs text-white">
              Generated Matrix Variants ({generatedVariants.length})
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">
              Ready for Barcode Label Studio & POS scanning
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
              <thead className="bg-slate-900/40 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Variant SKU</th>
                  <th className="py-3 px-4">Variant Name</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Color</th>
                  <th className="py-3 px-4">EAN-13 Barcode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {generatedVariants.map((v) => (
                  <tr key={v.variantId} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                      {v.variantSku}
                    </td>
                    <td className="py-3 px-4 text-white font-semibold">
                      {v.variantName}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {v.size}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {v.color}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 flex items-center space-x-1.5">
                      <Barcode className="w-4 h-4 text-slate-500" />
                      <span>{v.barcode}</span>
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
