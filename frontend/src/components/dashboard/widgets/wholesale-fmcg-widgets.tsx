"use client";

import React from "react";
import Link from "next/link";
import {
  Users2,
  TrendingUp,
  ArrowUpRight,
  Boxes,
  Phone,
  AlertCircle,
} from "lucide-react";
import { PartyList } from "@/types";

interface DebtorsProps {
  debtors: PartyList[];
  isHi?: boolean;
}

export function TopDebtorsWidget({ debtors, isHi = false }: DebtorsProps) {
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val);
  };

  const topDebtors = [...debtors]
    .filter((d) => (d.currentOutstandingBalance || 0) > 0)
    .sort((a, b) => (b.currentOutstandingBalance || 0) - (a.currentOutstandingBalance || 0))
    .slice(0, 5);

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center space-x-2">
            <Users2 className="w-4 h-4 text-amber-500" />
            <span>{isHi ? "बड़ी उधारी वाले ग्राहक (Top Debtors)" : "Top Receivables & Credit Outstandings"}</span>
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isHi ? "अधिकतम बकाया एवं क्रेडिट सीमा वाले खाते" : "Customers with highest exposure balances awaiting recovery"}
          </p>
        </div>
        <Link
          href="/app/parties/customers"
          className="text-muted-foreground hover:text-primary p-1 rounded"
          title="View All Customers"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {topDebtors.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground bg-surface-muted/60 rounded-lg border border-border">
          {isHi
            ? "कोई ग्राहक उधारी बकाया नहीं है। 100% नकद निपटान पूर्ण 🎉"
            : "Zero customer market outstandings. 100% credit realized 🎉"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-table-header text-table-header-foreground uppercase text-[10px] tracking-wider border-b border-table-border">
              <tr>
                <th className="p-2.5">Customer</th>
                <th className="p-2.5">Contact</th>
                <th className="p-2.5 text-right">Credit Limit</th>
                <th className="p-2.5 text-right">Outstanding Due</th>
                <th className="p-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-table-border font-mono text-[11px]">
              {topDebtors.map((c) => (
                <tr key={c.id} className="hover:bg-table-row-hover transition-colors">
                  <td className="p-2.5 font-sans">
                    <div className="font-bold text-foreground max-w-[150px] truncate" title={c.legalName}>
                      {c.legalName}
                    </div>
                    {c.gstin && <div className="text-[10px] text-muted-foreground font-mono">{c.gstin}</div>}
                  </td>
                  <td className="p-2.5 font-mono text-muted-foreground">
                    {c.primaryPhone ? (
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{c.primaryPhone}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-2.5 text-right text-muted-foreground">
                    {c.creditLimit ? formatCurrency(c.creditLimit) : "No Limit"}
                  </td>
                  <td className="p-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(c.currentOutstandingBalance)}
                  </td>
                  <td className="p-2.5 text-right font-sans">
                    <Link
                      href={`/app/parties/customers/${c.id}`}
                      className="text-primary hover:underline text-[11px] font-semibold"
                    >
                      Ledger &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export interface FastMovingSku {
  sku: string;
  name: string;
  category: string;
  quantitySold: number;
  totalRevenue: number;
  uom: string;
}

interface SkuProps {
  items: FastMovingSku[];
  isHi?: boolean;
}

export function FastMovingSkusWidget({ items, isHi = false }: SkuProps) {
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>{isHi ? "तीव्र गति से बिकने वाले उत्पाद" : "Fast-Moving Products (Velocity)"}</span>
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isHi ? "अधिकतम बिक्री मात्रा और राजस्व देने वाले SKUs" : "Top items by sales quantity and turnover velocity"}
          </p>
        </div>
        <Link
          href="/app/reports/sales?tab=detailed"
          className="text-muted-foreground hover:text-primary p-1 rounded"
          title="View Itemized Sales"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground bg-surface-muted/60 rounded-lg border border-border">
          {isHi ? "अभी तक कोई बिक्री दर्ज नहीं हुई है।" : "No item movements recorded in the selected period."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-table-header text-table-header-foreground uppercase text-[10px] tracking-wider border-b border-table-border">
              <tr>
                <th className="p-2.5">SKU / Item</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5 text-right">Units Sold</th>
                <th className="p-2.5 text-right">Billed Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-table-border font-mono text-[11px]">
              {items.slice(0, 5).map((item, idx) => (
                <tr key={idx} className="hover:bg-table-row-hover transition-colors">
                  <td className="p-2.5 font-sans">
                    <div className="font-bold text-foreground max-w-[150px] truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">{item.sku}</div>
                  </td>
                  <td className="p-2.5 font-sans text-muted-foreground">{item.category || "General"}</td>
                  <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {item.quantitySold} {item.uom}
                  </td>
                  <td className="p-2.5 text-right font-bold text-foreground">{formatCurrency(item.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
