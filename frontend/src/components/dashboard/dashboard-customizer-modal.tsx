"use client";

import React, { useState } from "react";
import {
  X,
  Check,
  RotateCcw,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Sliders,
} from "lucide-react";
import { DashboardWidgetConfig } from "./dashboard-widget-registry";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableWidgets: DashboardWidgetConfig[];
  currentVisibleWidgetIds: string[];
  widgetOrder: string[];
  onSave: (visibleIds: string[], order: string[]) => void;
  onReset: () => void;
  isHi?: boolean;
}

export function DashboardCustomizerModal({
  isOpen,
  onClose,
  availableWidgets,
  currentVisibleWidgetIds,
  widgetOrder,
  onSave,
  onReset,
  isHi = false,
}: Props) {
  const [visibleIds, setVisibleIds] = useState<string[]>(currentVisibleWidgetIds);
  const [order, setOrder] = useState<string[]>(() => {
    // Merge any missing widgets into order
    const existing = [...widgetOrder];
    availableWidgets.forEach((w) => {
      if (!existing.includes(w.id)) {
        existing.push(w.id);
      }
    });
    return existing;
  });

  if (!isOpen) return null;

  const toggleVisibility = (id: string) => {
    setVisibleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newOrder = [...order];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setOrder(newOrder);
  };

  const handleSave = () => {
    onSave(visibleIds, order);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  const orderedWidgets = order
    .map((id) => availableWidgets.find((w) => w.id === id))
    .filter(Boolean) as DashboardWidgetConfig[];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isHi ? "डैशबोर्ड विजेट कस्टमाइज़ करें" : "Customize Dashboard Layout"}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isHi
                  ? "विजेट्स को दिखाएं/छिपाएं और अपनी आवश्यकतानुसार क्रम व्यवस्थित करें"
                  : "Toggle visibility and arrange widget order according to your business workflow"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Widgets List */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1 divide-y divide-slate-800/60">
          {orderedWidgets.map((w, index) => {
            const isVisible = visibleIds.includes(w.id);

            return (
              <div key={w.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <button
                    onClick={() => toggleVisibility(w.id)}
                    className={`p-2 rounded-lg border transition-colors ${
                      isVisible
                        ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30"
                        : "bg-slate-800/40 text-slate-500 border-slate-700/50"
                    }`}
                    title={isVisible ? "Visible (Click to hide)" : "Hidden (Click to show)"}
                  >
                    {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <div className="overflow-hidden">
                    <div className={`text-xs font-bold truncate ${isVisible ? "text-white" : "text-slate-500 line-through"}`}>
                      {isHi ? w.titleHi : w.title}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {isHi ? w.descriptionHi : w.description}
                    </div>
                  </div>
                </div>

                {/* Move Controls */}
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    disabled={index === 0}
                    onClick={() => moveItem(index, "up")}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition-colors"
                    title="Move Up"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={index === orderedWidgets.length - 1}
                    onClick={() => moveItem(index, "down")}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition-colors"
                    title="Move Down"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isHi ? "डिफ़ॉल्ट पर रीसेट करें" : "Reset to Defaults"}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
            >
              {isHi ? "रद्द करें" : "Cancel"}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-md shadow-indigo-600/20 flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isHi ? "लेआउट सुरक्षित करें" : "Save Layout"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
