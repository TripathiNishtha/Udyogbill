"use client";

import React, { useState, useEffect } from "react";
import { X, Boxes, Tag, DollarSign, Layers, Plus, Check, Sparkles, AlertCircle } from "lucide-react";
import { inventoryService, CreateItemInput } from "@/services/inventory-services";
import { ItemList, UnitOfMeasure } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  isPharma?: boolean;
  onProductCreated: (newItem: ItemList) => void;
}

export function QuickAddProductModal({
  isOpen,
  onClose,
  initialName = "",
  isPharma = false,
  onProductCreated,
}: Props) {
  const [name, setName] = useState(initialName);
  const [itemType, setItemType] = useState<number>(1); // 1 = Goods/Product, 2 = Service
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [selectedUomId, setSelectedUomId] = useState("");
  const [hsnCode, setHsnCode] = useState(isPharma ? "300490" : "");
  const [taxRate, setTaxRate] = useState<number>(isPharma ? 12 : 18);
  const [sellingPrice, setSellingPrice] = useState<number | "">("");
  const [mrp, setMrp] = useState<number | "">("");
  const [purchasePrice, setPurchasePrice] = useState<number | "">("");

  // Batch & Stock
  const [enableBatch, setEnableBatch] = useState(isPharma);
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [initialStock, setInitialStock] = useState<number | "">("");
  const [pack, setPack] = useState(isPharma ? "1x10" : "");
  const [salt, setSalt] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto SKU generator helper
  const generateSku = (itemName: string) => {
    const clean = (itemName || "PRD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const prefix = clean.length >= 3 ? clean.substring(0, 3) : clean.length > 0 ? clean : "PRD";
    const rand = Math.floor(100 + Math.random() * 900);
    const dateStr = new Date().toISOString().slice(2, 4) + String(new Date().getMonth() + 1).padStart(2, "0");
    return `${prefix}-${dateStr}-${rand}`;
  };

  // Pre-fill / Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      const initName = initialName.trim();
      setName(initName);
      setSku(generateSku(initName));
      setBarcode("");
      setSellingPrice("");
      setMrp("");
      setPurchasePrice("");
      setInitialStock("");
      setBatchNumber(isPharma ? `BAT-${Math.floor(1000 + Math.random() * 9000)}` : "");
      
      // Default expiry: 2 years from now (MM/YY)
      const now = new Date();
      const expMonth = String(now.getMonth() + 1).padStart(2, "0");
      const expYear = String((now.getFullYear() + 2) % 100).padStart(2, "0");
      setExpiryDate(`${expMonth}/${expYear}`);

      // Load units
      inventoryService.getUnits().then((res) => {
        if (res && res.length > 0) {
          setUnits(res);
          setSelectedUomId(res[0].id);
        } else {
          // If no units in DB, create standard PCS unit
          inventoryService.createUnit({ code: "PCS", name: "Pieces", symbol: "pcs", decimalPlaces: 0 })
            .then((newUomId) => {
              const defaultUnit: UnitOfMeasure = { id: newUomId, tenantId: "", code: "PCS", name: "Pieces", symbol: "pcs", decimalPlaces: 0, isActive: true };
              setUnits([defaultUnit]);
              setSelectedUomId(newUomId);
            })
            .catch(() => {});
        }
      }).catch(() => {});
    }
  }, [isOpen, initialName, isPharma]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg("Product / Item name is required.");
      return;
    }

    if (!selectedUomId && units.length > 0) {
      setSelectedUomId(units[0].id);
    }

    const finalSku = sku.trim() || generateSku(cleanName);
    const numSellingPrice = Number(sellingPrice) || 0;
    const numMrp = Number(mrp) || numSellingPrice;
    const numPurchase = Number(purchasePrice) || 0;
    const numStock = Number(initialStock) || 0;

    // Attributes JSON
    const attributes: Record<string, any> = {};
    if (pack.trim()) attributes.packing = pack.trim();
    if (salt.trim()) attributes.salt = salt.trim();

    try {
      setSubmitting(true);

      const payload: CreateItemInput = {
        name: cleanName,
        sku: finalSku,
        barcode: barcode.trim() || undefined,
        itemType,
        trackInventory: itemType === 1,
        primaryUomId: selectedUomId || (units[0]?.id || ""),
        hsnCode: hsnCode.trim() || undefined,
        taxRate: Number(taxRate) || 0,
        isTaxInclusive: false,
        purchasePrice: numPurchase,
        sellingPrice: numSellingPrice,
        mrp: numMrp,
        minimumSellingPrice: 0,
        minimumStockAlert: 5,
        trackBatches: enableBatch,
        attributesJson: JSON.stringify(attributes),
        initialStock: numStock,
        initialBatchNumber: enableBatch && batchNumber.trim() ? batchNumber.trim() : undefined,
      };

      // Create item in backend
      const newId = await inventoryService.createItem(payload);

      // Create synthetic batch if provided
      const selectedUnit = units.find((u) => u.id === selectedUomId) || units[0] || {
        id: selectedUomId,
        code: "PCS",
        symbol: "pcs",
        name: "Pieces",
        decimalPlaces: 0,
        isActive: true,
      };

      const newItem: ItemList = {
        id: newId,
        tenantId: "",
        sku: finalSku,
        name: cleanName,
        barcode: barcode.trim() || undefined,
        itemType,
        primaryUomId: selectedUnit.id,
        primaryUomCode: selectedUnit.code,
        primaryUomSymbol: selectedUnit.symbol,
        hsnCode: hsnCode.trim() || undefined,
        taxRate: Number(taxRate) || 0,
        purchasePrice: numPurchase,
        sellingPrice: numSellingPrice,
        mrp: numMrp,
        minimumSellingPrice: 0,
        totalStock: numStock,
        currentStock: numStock,
        minimumStockAlert: 5,
        isLowStock: false,
        trackBatches: enableBatch,
        trackSerialNumbers: false,
        trackVariants: false,
        trackInventory: itemType === 1,
        attributesJson: JSON.stringify(attributes),
        isActive: true,
        createdAtUtc: new Date().toISOString(),
      };

      onProductCreated(newItem);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.errorMessage || err?.message || "Failed to create product. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Quick Add New Product</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-medium">
                  Instant Bill Insert
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Naya item turant create hokar invoice row me add ho jayega
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Toggle & Product Name */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Product / Service Name <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setItemType(1)}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    itemType === 1
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Goods (Product)
                </button>
                <button
                  type="button"
                  onClick={() => setItemType(2)}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    itemType === 2
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Service
                </button>
              </div>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="e.g. Paracetamol 500mg, Cotton Shirt, Wireless Mouse..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!sku || sku.startsWith("PRD-")) {
                  setSku(generateSku(e.target.value));
                }
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* SKU, Barcode, UOM */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">SKU / Code</label>
                <button
                  type="button"
                  onClick={() => setSku(generateSku(name))}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Auto</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="SKU Code"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Unit of Measure (UOM)
              </label>
              <select
                value={selectedUomId}
                onChange={(e) => setSelectedUomId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                {units.length > 0 ? (
                  units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))
                ) : (
                  <option value="">Pieces (PCS)</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Barcode / EAN (Opt)
              </label>
              <input
                type="text"
                placeholder="Scan or type barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Pricing Row: Selling Price, MRP, Purchase Price */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Pricing &amp; Tax Structure</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Sale Rate (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={sellingPrice}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : "";
                    setSellingPrice(val);
                    if (!mrp && val) setMrp(val);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-500/40 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  MRP (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value ? parseFloat(e.target.value) : "")}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  GST Rate (%)
                </label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-indigo-700 dark:text-indigo-300 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="0">0% (Exempt)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  HSN / SAC
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3004"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Batch & Opening Stock Quick Entry */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableBatch}
                  onChange={(e) => setEnableBatch(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Track Lot / Batch &amp; Opening Stock
                </span>
              </label>
              {isPharma && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                  Pharma Batch Tracking
                </span>
              )}
            </div>

            {enableBatch && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 animate-in fade-in">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                    Batch / Lot No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BAT-101"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 rounded-lg text-xs font-mono text-amber-800 dark:text-amber-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    maxLength={5}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-center text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                    Opening Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value ? parseFloat(e.target.value) : "")}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-center text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                    Packing (e.g. 1x10)
                  </label>
                  <input
                    type="text"
                    placeholder="1x10"
                    value={pack}
                    onChange={(e) => setPack(e.target.value)}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-center text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Pinned Sticky Footer */}
        <div className="flex items-center justify-end gap-2.5 px-4 sm:px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 transition-all flex items-center space-x-1.5 border border-emerald-400/30 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {submitting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Creating Product...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save &amp; Add to Bill</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
