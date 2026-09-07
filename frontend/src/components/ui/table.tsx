"use client";

import React from "react";

export const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { dense?: boolean }
>(({ className = "", dense = false, children, ...props }, ref) => (
  <div className="w-full overflow-x-auto rounded-xl border border-border/40 bg-surface shadow-2xs">
    <table
      ref={ref}
      className={`w-full text-left caption-bottom border-collapse ${
        dense ? "text-xs" : "text-xs sm:text-sm"
      } ${className}`}
      {...props}
    >
      {children}
    </table>
  </div>
));
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", children, ...props }, ref) => (
  <thead
    ref={ref}
    className={`bg-table-header text-muted-foreground font-semibold uppercase tracking-wider text-[10px] sm:text-[11px] border-b border-border/40 select-none ${className}`}
    {...props}
  >
    {children}
  </thead>
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", children, ...props }, ref) => (
  <tbody
    ref={ref}
    className={`divide-y divide-border/30 bg-surface text-foreground font-normal ${className}`}
    {...props}
  >
    {children}
  </tbody>
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }
>(({ className = "", selected = false, children, ...props }, ref) => (
  <tr
    ref={ref}
    className={`transition-colors duration-100 hover:bg-surface-muted/60 ${
      selected ? "bg-primary/5 text-primary font-medium" : ""
    } ${className}`}
    {...props}
  >
    {children}
  </tr>
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { alignRight?: boolean; alignCenter?: boolean }
>(({ className = "", alignRight = false, alignCenter = false, children, ...props }, ref) => (
  <th
    ref={ref}
    className={`py-3 px-3.5 font-bold tracking-wider ${
      alignRight ? "text-right" : alignCenter ? "text-center" : "text-left"
    } ${className}`}
    {...props}
  >
    {children}
  </th>
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & {
    alignRight?: boolean;
    alignCenter?: boolean;
    numeric?: boolean;
  }
>(({ className = "", alignRight = false, alignCenter = false, numeric = false, children, ...props }, ref) => (
  <td
    ref={ref}
    className={`py-3 px-3.5 align-middle ${
      numeric ? "font-mono font-medium" : ""
    } ${alignRight || numeric ? "text-right" : alignCenter ? "text-center" : "text-left"} ${className}`}
    {...props}
  >
    {children}
  </td>
));
TableCell.displayName = "TableCell";

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", children, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={`border-t border-table-border bg-surface-muted/50 font-bold text-foreground ${className}`}
    {...props}
  >
    {children}
  </tfoot>
));
TableFooter.displayName = "TableFooter";
