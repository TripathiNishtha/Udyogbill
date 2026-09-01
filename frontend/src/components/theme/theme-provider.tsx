"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun, Palette, Sparkles, Check } from "lucide-react";

export type ThemeType = "dark" | "light" | "vibrant" | "navy" | "emerald" | "amber";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("udyogbill_theme") as ThemeType;
    if (saved && ["dark", "light", "vibrant", "navy", "emerald", "amber"].includes(saved)) {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      applyTheme("dark");
    }
  }, []);

  const applyTheme = (newTheme: ThemeType) => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      const body = document.body;
      root.classList.remove("theme-dark", "theme-light", "theme-vibrant", "theme-navy", "theme-emerald", "theme-amber", "dark");
      body.classList.remove("theme-dark", "theme-light", "theme-vibrant", "theme-navy", "theme-emerald", "theme-amber", "dark");

      if (newTheme === "light") {
        root.classList.add("theme-light");
        body.classList.add("theme-light");
      } else if (newTheme === "vibrant") {
        root.classList.add("theme-vibrant");
        body.classList.add("theme-vibrant");
      } else if (newTheme === "amber") {
        root.classList.add("theme-amber");
        body.classList.add("theme-amber");
      } else {
        root.classList.add("dark");
        root.classList.add(`theme-${newTheme}`);
        body.classList.add(`theme-${newTheme}`);
      }
    }
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem("udyogbill_theme", newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const themeOptions: { id: ThemeType; label: string; icon: any; color: string }[] = [
    { id: "dark", label: "Midnight Dark", icon: Moon, color: "bg-slate-900 border-slate-700 text-slate-100" },
    { id: "amber", label: "Warm Amber (Classic ERP)", icon: Palette, color: "bg-[#fff8f0] border-amber-500 text-amber-900" },
    { id: "light", label: "Daylight Bright (Simple)", icon: Sun, color: "bg-white border-slate-300 text-slate-900" },
    { id: "vibrant", label: "Vibrant Colourful (Light)", icon: Sparkles, color: "bg-gradient-to-r from-indigo-50 via-emerald-50 to-amber-50 border-indigo-300 text-indigo-900" },
    { id: "navy", label: "Royal Navy Blue", icon: Sparkles, color: "bg-blue-950 border-blue-800 text-blue-100" },
    { id: "emerald", label: "Pharma Emerald Green", icon: Palette, color: "bg-emerald-950 border-emerald-800 text-emerald-100" },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        title="Change App Theme"
        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-all shadow-sm"
      >
        {theme === "amber" ? (
          <Palette className="w-3.5 h-3.5 text-amber-500" />
        ) : theme === "light" ? (
          <Sun className="w-3.5 h-3.5 text-amber-400" />
        ) : theme === "vibrant" ? (
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        ) : theme === "emerald" ? (
          <Palette className="w-3.5 h-3.5 text-emerald-400" />
        ) : theme === "navy" ? (
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
        )}
        <span className="capitalize font-medium text-[11px]">{theme} Theme</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 p-1.5 space-y-1 backdrop-blur-xl">
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              Select Appearance Theme
            </div>
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTheme(opt.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-slate-400"}`} />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
