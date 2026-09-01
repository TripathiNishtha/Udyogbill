"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Printer,
  Barcode as BarcodeIcon,
  Search,
  CheckSquare,
  Square,
  Layers,
  Settings2,
  RefreshCw
} from "lucide-react";
import { inventoryService } from "@/services/inventory-services";
import { barcodeService } from "@/services/barcode-services";
import { ItemList, BarcodeItemLabel } from "@/types";

export default function BarcodeStudioPage() {
  const [items, setItems] = useState<ItemList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [labelData, setLabelData] = useState<BarcodeItemLabel | null>(null);
  const [fetchingLabel, setFetchingLabel] = useState(false);

  // Label Customization Settings
  const [labelCopies, setLabelCopies] = useState<number>(24);
  const [sheetLayout, setSheetLayout] = useState<"a4-24" | "a4-40" | "a4-65" | "thermal-single">("a4-24");
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showMrp, setShowMrp] = useState<boolean>(true);
  const [showBatch, setShowBatch] = useState<boolean>(true);
  const [showTenantName, setShowTenantName] = useState<boolean>(true);

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

  const fetchItemBarcode = async (itemId: string) => {
    setFetchingLabel(true);
    try {
      const data = await barcodeService.getItemBarcode(itemId);
      setLabelData(data);
    } catch (err) {
      console.error("Failed to fetch barcode:", err);
    } finally {
      setFetchingLabel(false);
    }
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Barcode & Thermal Label Studio</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Design, customize, and print retail price tags and batch barcode labels on A4 sticker sheets or Thermal rolls
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          disabled={!labelData}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print {labelCopies} Labels</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Picker & Configuration (Hidden on Print) */}
        <div className="print:hidden lg:col-span-1 space-y-5">
          {/* Select Product Card */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <BarcodeIcon className="w-4 h-4 text-indigo-400" />
              <span>1. Select Product</span>
            </h3>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 rounded-xl border border-slate-800 bg-slate-950/60">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemSelect(item.id)}
                  className={`w-full text-left p-2.5 text-xs transition-colors cursor-pointer flex justify-between items-center ${
                    selectedItemId === item.id ? "bg-indigo-600/20 text-indigo-300 font-semibold" : "text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-white">₹{item.sellingPrice}</div>
                    <div className="text-[10px] text-slate-500">MRP: ₹{item.mrp}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Label Layout & Options Card */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl text-xs">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Settings2 className="w-4 h-4 text-indigo-400" />
              <span>2. Sheet Format & Count</span>
            </h3>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Print Sheet Layout</label>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-indigo-500"
              >
                <option value="a4-24">A4 Sheet - 24 Labels (3 x 8, 64mm x 33.8mm)</option>
                <option value="a4-40">A4 Sheet - 40 Labels (4 x 10, 48.5mm x 25.4mm)</option>
                <option value="a4-65">A4 Sheet - 65 Labels (5 x 13, 38.1mm x 21.2mm)</option>
                <option value="thermal-single">Thermal Roll - 50mm x 25mm Single Label</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Number of Label Stickers</label>
              <input
                type="number"
                min="1"
                max="500"
                value={labelCopies}
                onChange={(e) => setLabelCopies(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-right focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Visible Label Fields</div>
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTenantName}
                  onChange={(e) => setShowTenantName(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Store / Brand Name Header</span>
              </label>
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Our Selling Price (₹)</span>
              </label>
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMrp}
                  onChange={(e) => setShowMrp(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Max Retail Price (MRP ₹)</span>
              </label>
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBatch}
                  onChange={(e) => setShowBatch(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Batch # & Expiry Date (if applicable)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Print Preview Canvas */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
            <div className="print:hidden flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Print Preview ({labelCopies} labels on {sheetLayout})
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Exact 1:1 Print Alignment Ready</span>
            </div>

            {/* Printable Canvas */}
            {fetchingLabel ? (
              <div className="bg-white rounded-xl p-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-xs">Generating barcode label...</p>
              </div>
            ) : labelData ? (
              <div
                className={`bg-white text-black p-4 rounded-xl shadow-lg ${
                  sheetLayout === "thermal-single"
                    ? "w-[200px] mx-auto"
                    : "w-full grid " +
                      (sheetLayout === "a4-24"
                        ? "grid-cols-3 gap-2"
                        : sheetLayout === "a4-40"
                        ? "grid-cols-4 gap-1.5"
                        : "grid-cols-5 gap-1")
                }`}
              >
                {Array.from({ length: labelCopies }).map((_, idx) => (
                  <div
                    key={idx}
                    className="border border-dashed border-slate-300 p-2 rounded flex flex-col items-center justify-between text-center bg-white overflow-hidden"
                    style={{ minHeight: sheetLayout === "a4-65" ? "75px" : "90px" }}
                  >
                    {showTenantName && (
                      <div className="text-[9px] font-bold tracking-tight text-slate-800 uppercase truncate w-full">
                        {labelData.tenantName}
                      </div>
                    )}
                    <div className="text-[10px] font-extrabold text-black leading-tight truncate w-full mt-0.5">
                      {labelData.itemName}
                    </div>

                    {/* Barcode Graphic Representation */}
                    <div className="my-1 flex flex-col items-center">
                      <div className="font-mono tracking-widest text-[16px] font-black scale-y-125 select-none">
                        ||| | |||| | ||| || |||
                      </div>
                      <div className="text-[8px] font-mono font-bold text-slate-700 tracking-wider">
                        {labelData.barcode}
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full text-[9px] font-semibold border-t border-slate-200 pt-0.5 mt-0.5">
                      {showMrp && (
                        <div className="text-slate-500 line-through">
                          MRP: ₹{labelData.mrp.toFixed(0)}
                        </div>
                      )}
                      {showPrice && (
                        <div className="text-black font-extrabold text-[10px]">
                          ₹{labelData.sellingPrice.toFixed(0)}
                        </div>
                      )}
                    </div>

                    {showBatch && labelData.batchNumber && (
                      <div className="text-[7px] text-slate-600 flex justify-between w-full font-mono mt-0.5">
                        <span>B: {labelData.batchNumber}</span>
                        {labelData.expiryDate && (
                          <span>
                            EXP:{" "}
                            {new Date(labelData.expiryDate).toLocaleDateString("en-IN", {
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
              <div className="bg-white rounded-xl p-12 text-center text-slate-400">
                <BarcodeIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">Select an item from the left to generate barcode</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
