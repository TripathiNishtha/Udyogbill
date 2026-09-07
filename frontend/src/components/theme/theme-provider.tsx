"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun, Palette, Sparkles, Check } from "lucide-react";

export type ThemeType = "light" | "dark";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ALL_THEME_CLASSES = [
  "theme-dark",
  "theme-light",
  "theme-high-contrast",
  "theme-vibrant",
  "theme-navy",
  "theme-emerald",
  "theme-amber",
  "dark",
  "marketing-active",
];

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>("light");

  useEffect(() => {
    const saved = localStorage.getItem("udyogbill_theme");
    if (saved === "dark" || saved === "light") {
      setThemeState(saved as ThemeType);
      applyTheme(saved as ThemeType);
    } else {
      // Default to light theme
      setThemeState("light");
      applyTheme("light");
      localStorage.setItem("udyogbill_theme", "light");
    }
  }, []);

  const applyTheme = (newTheme: ThemeType) => {
    if (typeof document !== "undefined") {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const isMarketing =
          path === "/" ||
          path.startsWith("/features") ||
          path.startsWith("/pricing") ||
          path.startsWith("/industries") ||
          path.startsWith("/about") ||
          path.startsWith("/contact");
        if (isMarketing) {
          const root = document.documentElement;
          const body = document.body;
          root.classList.remove(...ALL_THEME_CLASSES);
          body.classList.remove(...ALL_THEME_CLASSES);
          root.classList.add("marketing-active");
          body.classList.add("marketing-active");
          return;
        }
      }

      const root = document.documentElement;
      const body = document.body;
      root.classList.remove(...ALL_THEME_CLASSES);
      body.classList.remove(...ALL_THEME_CLASSES);

      if (newTheme === "dark") {
        root.classList.add("dark", "theme-dark");
        body.classList.add("dark", "theme-dark");
      } else {
        root.classList.add("theme-light");
        body.classList.add("theme-light");
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

  const isLight = theme === "light";

  const themeOptions: { id: ThemeType; label: string; icon: any }[] = [
    { id: "light", label: "Light Theme", icon: Sun },
    { id: "dark", label: "Dark Theme", icon: Moon },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        title="Toggle Light/Dark Theme"
        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-border/40 text-xs text-foreground transition-all shadow-2xs cursor-pointer"
      >
        {isLight ? (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-primary" />
        )}
        <span className="font-semibold text-[11px]">
          {isLight ? "Light Theme" : "Dark Theme"}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-surface border border-border/40 shadow-xl z-50 p-1.5 space-y-1 backdrop-blur-xl text-foreground">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
              Select Theme
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
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-foreground hover:bg-surface-muted"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-primary-foreground" : opt.id === "light" ? "text-amber-500" : "text-primary"}`} />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
