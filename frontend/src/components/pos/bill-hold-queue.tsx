"use client";

import { useState } from "react";
import { Clock, Play, Trash2, PauseCircle, ShoppingCart } from "lucide-react";

export interface HeldBill {
  id: string;
  heldAt: string;
  customerName: string;
  itemsCount: number;
  totalAmount: number;
  data: any;
}

export function BillHoldQueue({
  heldBills,
  onResume,
  onDelete
}: {
  heldBills: HeldBill[];
  onResume: (bill: HeldBill) => void;
  onDelete: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (heldBills.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow"
      >
        <PauseCircle className="w-4 h-4" />
        <span>Held Bills ({heldBills.length})</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Parked / Held Customer Bills
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold">{heldBills.length} in Queue</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {heldBills.map((b) => (
              <div key={b.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white truncate max-w-[140px]">{b.customerName || "Walk-in Customer"}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {b.itemsCount} Items • ₹{b.totalAmount.toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      onResume(b);
                      setIsOpen(false);
                    }}
                    className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition"
                    title="Resume Bill"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(b.id)}
                    className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition"
                    title="Delete Held Bill"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
