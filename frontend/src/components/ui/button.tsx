"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles =
      "inline-flex items-center justify-center font-semibold tracking-tight rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none active:scale-[0.99]";

    // Size variations
    const sizeStyles = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5",
      md: "text-xs sm:text-sm px-3.5 py-2 gap-2",
      lg: "text-sm sm:text-base px-5 py-2.5 gap-2.5",
    };

    // Semantic variant styles mapped to design tokens
    const variantStyles = {
      primary:
        "bg-primary text-primary-foreground hover:bg-primary-hover shadow-2xs focus:ring-primary border border-transparent",
      secondary:
        "bg-surface text-foreground hover:bg-surface-muted border border-border/40 focus:ring-border",
      outline:
        "bg-transparent text-foreground hover:bg-surface-muted border border-border/40 focus:ring-primary",
      ghost:
        "bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface-muted focus:ring-border",
      danger:
        "bg-danger text-danger-foreground hover:bg-danger/90 shadow-2xs focus:ring-danger border border-transparent",
      success:
        "bg-success text-success-foreground hover:bg-success/90 shadow-2xs focus:ring-success border border-transparent",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
