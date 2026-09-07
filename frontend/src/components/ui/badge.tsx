"use client";

import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "primary" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className = "",
  variant = "neutral",
  size = "md",
  dot = false,
  children,
  ...props
}) => {
  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-0.5 gap-1.5",
  };

  const variantStyles = {
    success:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    warning:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
    danger:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20",
    info:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
    primary:
      "bg-primary/10 text-primary border border-primary/20",
    neutral:
      "bg-surface-muted text-muted-foreground border border-border/40",
    outline:
      "bg-transparent text-foreground border border-border/50",
  };

  const dotColorStyles = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-blue-500",
    primary: "bg-primary",
    neutral: "bg-muted-foreground",
    outline: "bg-foreground",
  };

  return (
    <span
      className={`inline-flex items-center font-medium tracking-tight rounded-full select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColorStyles[variant]}`}
        />
      )}
      {children}
    </span>
  );
};
