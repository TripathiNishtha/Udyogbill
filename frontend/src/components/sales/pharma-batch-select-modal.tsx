"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Search,
  Calendar,
  Boxes,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Clock,
  ArrowRight,
  History,
  RotateCcw,
} from "lucide-react";
import { MasterItem } from "@/types";
import { inventoryService } from "@/services/inventory-services";

export interface PharmaSelectedBatch {
  id: string;
  batchNumber: string;
  expiryDate?: string;
  mrp: number;
  saleRate: number;
  currentStock?: number;
  isCustom?: boolean;
}

interface PharmaBatchSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MasterItem | null;
  onSelectBatch: (batch: PharmaSelectedBatch, customQuantity?: number) => void;
}

export function PharmaBatchSelectModal({
  isOpen,
  onClose,
  item,
  onSelectBatch,
}: PharmaBatchSelectModalProps) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showZeroStock, setShowZeroStock] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Custom / Historical batch manual entry state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customBatchNo, setCustomBatchNo] = useState("");
  const [customExpiry, setCustomExpiry] = useState("");
  const [customMrp, setCustomMrp] = useState<string>("");
  const [customRate, setCustomRate] = useState<string>("");
  const [customQty, setCustomQty] = useState<string>("1");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load batches when item changes or modal opens
  useEffect(() => {
    if (!isOpen || !item) {
      setBatches([]);
      setSearchQuery("");
      setShowCustomForm(false);
      setSelectedIndex(0);
      return;
    }

    let isMounted = true;
    setLoading(true);

    inventoryService
      .getBatches(item.id)
      .then((data) => {
        if (!isMounted) return;
        // Sort FEFO (earliest expiry first)
        const sorted = [...(data || [])].sort((a, b) => {
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        });
        setBatches(sorted);
        setSelectedIndex(0);
      })
      .catch((err) => {
        console.error("Failed to fetch batches for item:", err);
        if (isMounted) setBatches([]);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  // Sync custom MRP & Rate from item defaults when item opens
  useEffect(() => {
    if (item) {
      setCustomMrp(item.mrp ? String(item.mrp) : "");
      setCustomRate(item.sellingPrice ? String(item.sellingPrice) : item.mrp ? String(item.mrp) : "");
      // Default expiry 2 years ahead
      const nextDate = new Date();
      nextDate.setFullYear(nextDate.getFullYear() + 2);
      const mm = String(nextDate.getMonth() + 1).padStart(2, "0");
      const yy = String(nextDate.getFullYear()).slice(2);
      setCustomExpiry(`${mm}/${yy}`);
    }
  }, [item]);

  // Filter batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const stock = b.currentStock ?? b.currentQuantity ?? 0;
      if (!showZeroStock && stock <= 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const batchMatch = b.batchNumber?.toLowerCase().includes(q);
        const expMatch = b.expiryDate?.toLowerCase().includes(q);
        return batchMatch || expMatch;
      }
      return true;
    });
  }, [batches, showZeroStock, searchQuery]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredBatches.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && !showCustomForm && filteredBatches.length > 0) {
        e.preventDefault();
        const b = filteredBatches[selectedIndex] || filteredBatches[0];
        if (b) {
          handlePickExistingBatch(b);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredBatches, selectedIndex, showCustomForm]);

  if (!isOpen || !item) return null;

  const handlePickExistingBatch = (b: any) => {
    let expStr = "";
    if (b.expiryDate) {
      const d = new Date(b.expiryDate);
      if (!isNaN(d.getTime())) {
        expStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
      } else {
        expStr = b.expiryDate;
      }
    }

    onSelectBatch({
      id: b.id,
      batchNumber: b.batchNumber,
      expiryDate: expStr,
      mrp: Number(b.mrp || b.MRP || item.mrp || 0),
      saleRate: Number(b.saleRate || item.sellingPrice || b.mrp || 0),
      currentStock: b.currentStock ?? b.currentQuantity ?? 0,
      isCustom: false,
    });
    onClose();
  };

  const handleApplyCustomBatch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customBatchNo.trim()) {
      alert("Kripya Batch Number enter karein.");
      return;
    }

    const mrpNum = parseFloat(customMrp) || item.mrp || 0;
    const rateNum = parseFloat(customRate) || item.sellingPrice || mrpNum;
    const qtyNum = parseFloat(customQty) || 1;

    onSelectBatch(
      {
        id: `custom_${Date.now()}`,
        batchNumber: customBatchNo.trim().toUpperCase(),
        expiryDate: customExpiry.trim() || undefined,
        mrp: mrpNum,
        saleRate: rateNum,
        currentStock: 0,
        isCustom: true,
      },
      qtyNum
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent dark:from-orange-950/40 dark:via-amber-950/20 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-orange-600 text-white text-[11px] font-bold tracking-wide uppercase">
                Pharma Batch Selection
              </span>
              {item.sku && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-semibold border border-slate-200 dark:border-slate-700">
                  {item.sku}
                </span>
              )}
              {item.hsnCode && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  HSN: {item.hsnCode}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 truncate">
              {item.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3">
              <span>Standard MRP: <strong>₹{item.mrp || 0}</strong></span>
              <span>•</span>
              <span>Default Rate: <strong className="text-emerald-600 dark:text-emerald-400">₹{item.sellingPrice || item.mrp || 0}</strong></span>
              <span>•</span>
              <span>Total Stock: <strong>{item.totalStock ?? item.currentStock ?? 0} {item.primaryUomCode || "Units"}</strong></span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search Batch No. (e.g. B2401) or Expiry..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
              <input
                type="checkbox"
                checked={showZeroStock}
                onChange={(e) => setShowZeroStock(e.target.checked)}
                className="rounded text-orange-600 focus:ring-orange-500"
              />
              <History className="w-3 h-3 text-amber-500" />
              <span>Show 0-Stock / Past Batches</span>
            </label>

            <button
              type="button"
              onClick={() => setShowCustomForm(!showCustomForm)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition-all ${
                showCustomForm
                  ? "bg-orange-600 text-white border-orange-600"
                  : "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/40 hover:bg-orange-50 dark:hover:bg-orange-950/40"
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>Custom / Challan Batch</span>
            </button>
          </div>
        </div>

        {/* Custom / Historical Batch Input Drawer */}
        {showCustomForm && (
          <form
            onSubmit={handleApplyCustomBatch}
            className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 flex flex-col gap-2.5 animate-in slide-in-from-top-2"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-300">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Add Historical / Delivered Challan Batch (Not in System)
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">
                (Used when billing delivery made 2-3 months ago)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                  Batch No *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BW-2309"
                  value={customBatchNo}
                  onChange={(e) => setCustomBatchNo(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded text-xs text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-orange-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                  Expiry (MM/YY)
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500 text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                  Batch MRP (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={customMrp}
                  onChange={(e) => setCustomMrp(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500 text-right font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                  Sale Rate (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded text-xs text-emerald-700 dark:text-emerald-400 font-mono focus:outline-none focus:border-orange-500 text-right font-bold"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-1 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bill This Batch</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Batches List Table */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <RotateCcw className="w-5 h-5 animate-spin text-orange-500" />
              <span>Fetching batches & stock from database...</span>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-xs gap-2">
              <Boxes className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Koi batch nahi mila {searchQuery && `for "${searchQuery}"`}
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm">
                Aap upar &quot;Custom / Challan Batch&quot; button par click karke direct physical medicine box ka batch & MRP enter kar sakte hain.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="py-2 px-3">Batch Number</th>
                    <th className="py-2 px-3 text-center">Expiry (MM/YY)</th>
                    <th className="py-2 px-3 text-right">Available Stock</th>
                    <th className="py-2 px-3 text-right">Batch MRP</th>
                    <th className="py-2 px-3 text-right">Rate / PTR</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredBatches.map((b, idx) => {
                    const isSelected = idx === selectedIndex;
                    const stock = b.currentStock ?? b.currentQuantity ?? 0;
                    const isZeroStock = stock <= 0;

                    let expStr = "--/--";
                    let isExpired = Boolean(b.isExpired);
                    let isNearExpiry = Boolean(b.isNearExpiry);

                    if (b.expiryDate) {
                      const d = new Date(b.expiryDate);
                      if (!isNaN(d.getTime())) {
                        expStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
                        const now = new Date();
                        const diffMonths = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
                        if (diffMonths < 0) isExpired = true;
                        else if (diffMonths <= 3) isNearExpiry = true;
                      } else {
                        expStr = b.expiryDate;
                      }
                    }

                    const batchMrp = Number(b.mrp || b.MRP || item.mrp || 0);
                    const batchRate = Number(b.saleRate || item.sellingPrice || batchMrp);

                    return (
                      <tr
                        key={b.id || idx}
                        onClick={() => {
                          setSelectedIndex(idx);
                        }}
                        onDoubleClick={() => handlePickExistingBatch(b)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-orange-50 dark:bg-orange-950/40 border-l-4 border-l-orange-500 font-medium"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        {/* Batch Number */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                              {b.batchNumber}
                            </span>
                            {idx === 0 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                                FEFO Priority
                              </span>
                            )}
                            {isExpired && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Expired
                              </span>
                            )}
                            {isNearExpiry && !isExpired && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                                Near Expiry
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Expiry */}
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                              isExpired
                                ? "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300"
                                : isNearExpiry
                                ? "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {expStr}
                          </span>
                        </td>

                        {/* Stock */}
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span
                            className={`font-bold ${
                              isZeroStock
                                ? "text-slate-400 dark:text-slate-500 line-through"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {stock} {item.primaryUomCode || "Units"}
                          </span>
                          {isZeroStock && (
                            <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-sans">
                              (Past Challan)
                            </span>
                          )}
                        </td>

                        {/* MRP */}
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ₹{batchMrp.toFixed(2)}
                        </td>

                        {/* Rate / PTR */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          ₹{batchRate.toFixed(2)}
                        </td>

                        {/* Action */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePickExistingBatch(b);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold shadow-2xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
                          >
                            <span>Select & Bill</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
              Enter ↵
            </span>
            <span>to select highlighted batch</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-mono text-[11px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
              ↑ / ↓
            </span>
            <span>to navigate</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
            >
              Cancel (Esc)
            </button>
            {filteredBatches.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const b = filteredBatches[selectedIndex] || filteredBatches[0];
                  if (b) handlePickExistingBatch(b);
                }}
                className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Add Selected Batch</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
