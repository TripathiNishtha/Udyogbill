"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  compact?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className = "",
      label,
      error,
      helperText,
      leftIcon,
      compact = false,
      disabled = false,
      id,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1 text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold text-foreground tracking-tight"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={`w-full bg-input text-input-foreground border transition-all duration-150 rounded-xl font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed pr-9 ${
              compact ? "h-8 text-xs pl-2.5" : "h-10 text-xs sm:text-sm pl-3"
            } ${leftIcon ? "pl-9" : ""} ${
              error
                ? "border-danger ring-1 ring-danger text-danger focus:ring-danger focus:border-danger"
                : "border-border hover:border-border-strong"
            } ${className}`}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-3 pointer-events-none text-muted-foreground">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <p className="text-[11px] font-semibold text-danger flex items-center gap-1 mt-0.5">
            <span>⚠</span>
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-muted-foreground mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
