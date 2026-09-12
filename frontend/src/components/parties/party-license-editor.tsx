"use client";

import React from "react";
import { Plus, Trash2, ShieldCheck } from "lucide-react";

export interface PartyLicenseItem {
  id: string;
  type: string; // 'dl' | 'fssai' | 'iso' | 'iec' | 'trade' | 'msme' | 'other'
  customName?: string;
  number: string;
}

export const LICENSE_PRESETS = [
  {
    value: "dl",
    label: "Drug License (DL - 20B/21B)",
    placeholder: "e.g. MH-MZ2-123456 / 21B",
    defaultName: "Drug License",
  },
  {
    value: "fssai",
    label: "FSSAI License (Food Safety)",
    placeholder: "e.g. 14-digit No. 10019022000001",
    defaultName: "FSSAI License",
  },
  {
    value: "iso",
    label: "ISO Certification",
    placeholder: "e.g. ISO 9001:2015 / ISO 22000",
    defaultName: "ISO Certification",
  },
  {
    value: "iec",
    label: "Import Export Code (IEC)",
    placeholder: "e.g. 10-digit IEC Code",
    defaultName: "Import Export Code",
  },
  {
    value: "trade",
    label: "Trade License / Shop Act",
    placeholder: "e.g. Gumasta / Municipal Lic. No.",
    defaultName: "Trade License",
  },
  {
    value: "msme",
    label: "MSME / Udyam Reg.",
    placeholder: "e.g. UDYAM-XX-00-0000000",
    defaultName: "MSME / Udyam",
  },
  {
    value: "other",
    label: "Other / Custom License",
    placeholder: "e.g. Registration / License No.",
    defaultName: "License / Registration",
  },
] as const;

export function parseLicensesFromParty(party: any): PartyLicenseItem[] {
  const list: PartyLicenseItem[] = [];

  // Check attributesJson first
  if (party?.attributesJson) {
    try {
      const parsed = typeof party.attributesJson === "string" 
        ? JSON.parse(party.attributesJson) 
        : party.attributesJson;
      if (Array.isArray(parsed?.licenses) && parsed.licenses.length > 0) {
        return parsed.licenses.map((lic: any, idx: number) => ({
          id: lic.id || `lic-${idx}-${Date.now()}`,
          type: lic.type || "other",
          customName: lic.name || lic.customName || "",
          number: lic.number || "",
        }));
      }
    } catch {}
  }

  // Fallback to direct fields
  if (party?.drugLicenseNumber1 || party?.drugLicenseNumber) {
    list.push({
      id: "lic-dl-init",
      type: "dl",
      number: party.drugLicenseNumber1 || party.drugLicenseNumber || "",
    });
  }
  if (party?.fssaiNumber) {
    list.push({
      id: "lic-fssai-init",
      type: "fssai",
      number: party.fssaiNumber || "",
    });
  }

  return list;
}

export function formatLicensesForPayload(
  licenses: PartyLicenseItem[],
  existingAttributesJson?: string
): {
  drugLicenseNumber1?: string;
  fssaiNumber?: string;
  attributesJson: string;
} {
  const validLicenses = licenses
    .filter((l) => l.number && l.number.trim().length > 0)
    .map((l) => {
      const preset = LICENSE_PRESETS.find((p) => p.value === l.type);
      return {
        type: l.type,
        name:
          l.type === "other" && l.customName?.trim()
            ? l.customName.trim()
            : preset?.defaultName || l.type,
        number: l.number.trim(),
      };
    });

  const dl = validLicenses.find((l) => l.type === "dl")?.number;
  const fssai = validLicenses.find((l) => l.type === "fssai")?.number;

  let attributesObj: any = {};
  if (existingAttributesJson) {
    try {
      attributesObj =
        typeof existingAttributesJson === "string"
          ? JSON.parse(existingAttributesJson)
          : existingAttributesJson;
    } catch {
      attributesObj = {};
    }
  }

  if (validLicenses.length > 0) {
    attributesObj.licenses = validLicenses;
  } else {
    delete attributesObj.licenses;
  }

  return {
    drugLicenseNumber1: dl,
    fssaiNumber: fssai,
    attributesJson: JSON.stringify(attributesObj),
  };
}

interface Props {
  licenses: PartyLicenseItem[];
  onChange: (licenses: PartyLicenseItem[]) => void;
  className?: string;
}

export function PartyLicenseEditor({ licenses, onChange, className = "" }: Props) {
  const addLicense = () => {
    // Pick the first unused preset type if possible
    const usedTypes = new Set(licenses.map((l) => l.type));
    let nextType: string = LICENSE_PRESETS[0].value;
    for (const p of LICENSE_PRESETS) {
      if (!usedTypes.has(p.value) && p.value !== "other") {
        nextType = p.value;
        break;
      }
    }

    const newItem: PartyLicenseItem = {
      id: `lic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: nextType,
      customName: "",
      number: "",
    };
    onChange([...licenses, newItem]);
  };

  const removeLicense = (id: string) => {
    onChange(licenses.filter((l) => l.id !== id));
  };

  const updateLicense = (id: string, updates: Partial<PartyLicenseItem>) => {
    onChange(
      licenses.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  if (licenses.length === 0) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Business Licenses &amp; Registrations</span>
            <span className="text-[10px] text-slate-500 font-normal">(DL, FSSAI, ISO, IEC, etc.)</span>
          </span>
        </div>
        <button
          type="button"
          onClick={addLicense}
          className="w-full py-2 px-3 border border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-xl bg-slate-950/40 hover:bg-slate-900/60 text-xs text-slate-400 hover:text-indigo-300 transition-all flex items-center justify-center space-x-2 cursor-pointer group"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span>+ Add License / Registration No. (DL, FSSAI, ISO, IEC, Trade, MSME)</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Licenses &amp; Certifications</span>
          <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">
            {licenses.length}
          </span>
        </span>
        <button
          type="button"
          onClick={addLicense}
          className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Another</span>
        </button>
      </div>

      <div className="space-y-2">
        {licenses.map((lic) => {
          const currentPreset = LICENSE_PRESETS.find((p) => p.value === lic.type);
          const isOther = lic.type === "other";

          return (
            <div
              key={lic.id}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800"
            >
              {/* License Type Selector */}
              <div className="sm:w-[220px] shrink-0">
                <select
                  value={lic.type}
                  onChange={(e) => updateLicense(lic.id, { type: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {LICENSE_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* If "Other / Custom", show custom label input */}
              {isOther && (
                <div className="sm:w-[150px] shrink-0">
                  <input
                    type="text"
                    placeholder="License Name (e.g. AYUSH)"
                    value={lic.customName || ""}
                    onChange={(e) => updateLicense(lic.id, { customName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* License Number Input */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder={currentPreset?.placeholder || "License / Registration Number"}
                  value={lic.number}
                  onChange={(e) => updateLicense(lic.id, { number: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeLicense(lic.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors self-end sm:self-center cursor-pointer shrink-0"
                title="Remove this license"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
