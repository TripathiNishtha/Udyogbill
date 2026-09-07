"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  FileCheck,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Pill,
  UserCheck,
} from "lucide-react";
import { ExpiryAlertBatch, ScheduleH1RegisterRow } from "@/services/industry-services";

interface ExpiryProps {
  batches: ExpiryAlertBatch[];
  isHi?: boolean;
}

export function PharmaExpiryAlertsWidget({ batches, isHi = false }: ExpiryProps) {
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val);
  };

  const totalValueAtRisk = batches.reduce((sum, b) => sum + (b.totalValueAtRisk || 0), 0);

  return (
    <div className="bg-surface border border-border rounded-xl p-3.5 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-foreground tracking-tight flex items-center space-x-1.5">
            <Pill className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{isHi ? "दवा समाप्ति चेतावनी (Near-Expiry Stock)" : "Pharma Near-Expiry & Risk Valuation"}</span>
          </h3>
          <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
            {isHi ? "अगले 60 दिनों में समाप्त होने वाले दवा बैच" : "Batches expiring within 60 days requiring immediate FEFO liquidation"}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {batches.length > 0 && (
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              {formatCurrency(totalValueAtRisk)} at risk
            </span>
          )}
          <Link
            href="/app/reports/stock?tab=balance"
            className="text-muted-foreground hover:text-primary p-1 rounded"
            title="View Stock Report"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="p-6 text-center text-xs font-semibold text-muted-foreground bg-surface-muted/60 rounded-lg border border-border">
          {isHi
            ? "अगले 60 दिनों में कोई बैच समाप्त नहीं हो रहा है। दवा स्टॉक सुरक्षित है ✅"
            : "Zero pharmaceutical batches expiring within 60 days. FEFO stock status is healthy ✅"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-table-header text-table-header-foreground uppercase text-[10px] tracking-wider border-b border-table-border">
              <tr>
                <th className="p-2.5">Batch #</th>
                <th className="p-2.5">Medicine / Item</th>
                <th className="p-2.5">Expiry Date</th>
                <th className="p-2.5 text-right">Qty</th>
                <th className="p-2.5 text-right">MRP</th>
                <th className="p-2.5 text-right">Value at Risk</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-table-border font-mono text-[11px]">
              {batches.slice(0, 5).map((b) => (
                <tr key={b.batchId} className="hover:bg-table-row-hover transition-colors">
                  <td className="p-2.5 font-bold text-foreground">{b.batchNumber}</td>
                  <td className="p-2.5 font-sans font-medium text-foreground max-w-[140px] truncate" title={b.itemName}>
                    {b.itemName}
                  </td>
                  <td className="p-2.5 text-muted-foreground">{b.expiryDate?.slice(0, 10)}</td>
                  <td className="p-2.5 text-right font-bold text-foreground">
                    {b.currentStock} {b.uomName}
                  </td>
                  <td className="p-2.5 text-right text-muted-foreground">{formatCurrency(b.mrp)}</td>
                  <td className="p-2.5 text-right text-rose-600 dark:text-rose-400 font-bold">{formatCurrency(b.totalValueAtRisk)}</td>
                  <td className="p-2.5 font-sans">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        b.isExpired
                          ? "bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40"
                          : b.daysUntilExpiry <= 30
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {b.isExpired ? "Expired" : `${b.daysUntilExpiry}d left`}
                    </span>
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

interface H1Props {
  records: ScheduleH1RegisterRow[];
  isHi?: boolean;
}

export function PharmaScheduleH1Widget({ records, isHi = false }: H1Props) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-primary" />
            <span>{isHi ? "शेड्यूल H1 पर्चा अनुपालन रजिस्टर" : "Schedule H1 Prescription Compliance"}</span>
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isHi ? "प्रतिबंधित दवाओं के विक्रय का वैधानिक रिकॉर्ड (डॉक्टर और मरीज विवरण)" : "Statutory regulatory register: Controlled antibiotic & narcotic dispensations"}
          </p>
        </div>
        <Link
          href="/app/sales/invoices"
          className="text-muted-foreground hover:text-primary p-1 rounded"
          title="View All Sales Invoices"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground bg-surface-muted/60 rounded-lg border border-border">
          {isHi
            ? "इस अवधि में कोई शेड्यूल H1 दवा बिल नहीं बनाया गया है।"
            : "No Schedule H1 controlled substances dispensed in the current period."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-table-header text-table-header-foreground uppercase text-[10px] tracking-wider border-b border-table-border">
              <tr>
                <th className="p-2.5">Invoice #</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Doctor & Reg #</th>
                <th className="p-2.5">Patient Name</th>
                <th className="p-2.5">Prescribed Drug</th>
                <th className="p-2.5">Batch</th>
                <th className="p-2.5 text-right">Dispensed Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-table-border font-mono text-[11px]">
              {records.slice(0, 5).map((r, idx) => (
                <tr key={idx} className="hover:bg-table-row-hover transition-colors">
                  <td className="p-2.5 font-bold text-foreground">{r.invoiceNumber}</td>
                  <td className="p-2.5 text-muted-foreground">{r.invoiceDate?.slice(0, 10)}</td>
                  <td className="p-2.5 font-sans">
                    <div className="font-semibold text-foreground max-w-[130px] truncate" title={r.doctorName}>
                      {r.doctorName || "Registered Medical Practitioner"}
                    </div>
                    {r.doctorRegistrationNumber && (
                      <div className="text-[10px] text-muted-foreground font-mono">Reg: {r.doctorRegistrationNumber}</div>
                    )}
                  </td>
                  <td className="p-2.5 font-sans text-muted-foreground max-w-[120px] truncate" title={r.patientName}>
                    {r.patientName}
                  </td>
                  <td className="p-2.5 font-sans font-medium text-primary max-w-[140px] truncate" title={r.drugName}>
                    {r.drugName}
                  </td>
                  <td className="p-2.5 text-muted-foreground">{r.batchNumber}</td>
                  <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {r.quantity} {r.uomName}
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
