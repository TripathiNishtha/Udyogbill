"use client";

import { useEffect, useState } from "react";
import { Keyboard, X, Sparkles } from "lucide-react";

export function KeyboardShortcutsHud() {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { key: "F2", action: "Change Bill / Invoice Date" },
    { key: "F3", action: "Quick Search Product & Add to Cart" },
    { key: "F4", action: "Select / Change Batch & Expiry" },
    { key: "F7", action: "Select Customer / Supplier Party" },
    { key: "Ctrl + A", action: "Fast Save & Direct Print Bill" },
    { key: "Ctrl + H", action: "Hold Current Bill (Switch Customer)" },
    { key: "Ctrl + R", action: "Resume Held Shopping Cart" },
    { key: "Esc", action: "Close Dialogs / Clear Focus" }
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Floating Bottom Right Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-22 z-40 px-3 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white rounded-xl text-xs font-mono font-bold flex items-center space-x-2 shadow-xl backdrop-blur-md transition group"
        title="Press F1 for ERP Keyboard Shortcuts"
      >
        <Keyboard className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
        <span>Shortcuts [F1]</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <Keyboard className="w-5 h-5 text-indigo-400" />
                <span>Enterprise ERP Keyboard Shortcuts</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {shortcuts.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                  <span className="text-slate-300 font-medium">{s.action}</span>
                  <kbd className="px-2.5 py-1 bg-slate-800 text-indigo-300 border border-slate-700 rounded-lg font-mono font-bold text-[11px] shadow-inner">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center text-[11px] text-slate-500 font-mono">
              Tip: Press <kbd className="text-slate-400 font-bold">Esc</kbd> or <kbd className="text-slate-400 font-bold">F1</kbd> anytime to dismiss this HUD.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
