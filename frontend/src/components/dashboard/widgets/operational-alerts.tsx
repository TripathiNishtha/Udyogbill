"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Boxes,
  CheckCircle2,
  Calendar,
  WifiOff,
  Receipt,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export interface OperationalAlertsData {
  lowStockCount: number;
  negativeStockCount: number;
  expiringBatchesCount: number;
  overdueReceivableAmount: number;
  overdueReceivableCount: number;
  overduePayableAmount: number;
  overduePayableCount: number;
  unpaidInvoicesCount: number;
  offlinePendingCount: number;
}

interface Props {
  data: OperationalAlertsData;
  isHi?: boolean;
}

export function OperationalAlertsWidget({ data, isHi = false }: Props) {
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const activeAlerts: {
    id: string;
    title: string;
    description: string;
    badge: string;
    href: string;
    severity: "danger" | "warning" | "info";
    icon: any;
  }[] = [];

  // 1. Critical / Low Stock Alert
  if (data.lowStockCount > 0) {
    activeAlerts.push({
      id: "low-stock",
      title: isHi ? "कम स्टॉक चेतावनी" : "Low Stock Alert",
      description: isHi
        ? `${data.lowStockCount} उत्पाद न्यूनतम अलर्ट स्तर से नीचे हैं। तुरंत खरीद ऑर्डर बनाएं।`
        : `${data.lowStockCount} products are at or below reorder threshold. Generate purchase orders.`,
      badge: `${data.lowStockCount} SKUs`,
      href: "/app/inventory/items",
      severity: "warning",
      icon: Boxes,
    });
  }

  // 2. Negative Stock Alert
  if (data.negativeStockCount > 0) {
    activeAlerts.push({
      id: "negative-stock",
      title: isHi ? "नकारात्मक स्टॉक विसंगति" : "Negative Stock Discrepancy",
      description: isHi
        ? `${data.negativeStockCount} आइटम्स का स्टॉक शून्य से नीचे चला गया है। स्टॉक समायोजन या GRN दर्ज करें।`
        : `${data.negativeStockCount} items have negative stock balance. Immediate physical audit required.`,
      badge: `${data.negativeStockCount} Critical`,
      href: "/app/reports/stock?tab=balance",
      severity: "danger",
      icon: ShieldAlert,
    });
  }

  // 3. Expiring Batches Alert
  if (data.expiringBatchesCount > 0) {
    activeAlerts.push({
      id: "expiring-batches",
      title: isHi ? "दवा/उत्पाद समाप्ति चेतावनी" : "Near-Expiry Batches Alert",
      description: isHi
        ? `${data.expiringBatchesCount} बैच अगले 60 दिनों में समाप्त (Expire) हो रहे हैं। पहले निकालें (FEFO).`
        : `${data.expiringBatchesCount} batches expire within 60 days. Prioritize FEFO liquidation.`,
      badge: `${data.expiringBatchesCount} Batches`,
      href: "/app/reports/stock?tab=balance",
      severity: "danger",
      icon: Calendar,
    });
  }

  // 4. Overdue Receivables Alert
  if (data.overdueReceivableAmount > 0) {
    activeAlerts.push({
      id: "overdue-receivables",
      title: isHi ? "अतिदेय ग्राहक उधारी" : "Overdue Receivables Alert",
      description: isHi
        ? `${formatCurrency(data.overdueReceivableAmount)} की उधारी निर्धारित क्रेडिट अवधि पार कर चुकी है (${data.overdueReceivableCount} बिल)।`
        : `${formatCurrency(data.overdueReceivableAmount)} overdue past agreed credit terms (${data.overdueReceivableCount} overdue invoices).`,
      badge: formatCurrency(data.overdueReceivableAmount),
      href: "/app/reports/ageing?tab=debtors",
      severity: "danger",
      icon: Clock,
    });
  }

  // 5. Overdue Payables Alert
  if (data.overduePayableAmount > 0) {
    activeAlerts.push({
      id: "overdue-payables",
      title: isHi ? "अतिदेय सप्लायर भुगतान" : "Overdue Vendor Payables",
      description: isHi
        ? `${formatCurrency(data.overduePayableAmount)} का सप्लायर भुगतान देय तारीख पार कर चुका है (${data.overduePayableCount} बिल)।`
        : `${formatCurrency(data.overduePayableAmount)} overdue to suppliers past due date (${data.overduePayableCount} vendor bills).`,
      badge: formatCurrency(data.overduePayableAmount),
      href: "/app/reports/ageing?tab=creditors",
      severity: "warning",
      icon: AlertTriangle,
    });
  }

  // 6. Unpaid Invoices
  if (data.unpaidInvoicesCount > 5) {
    activeAlerts.push({
      id: "unpaid-invoices",
      title: isHi ? "लंबित अवैतनिक बिल" : "Uncollected Customer Invoices",
      description: isHi
        ? `${data.unpaidInvoicesCount} इनवॉइस पर भुगतान लंबित है। पेमेंट लिंक या तगादा भेजें।`
        : `${data.unpaidInvoicesCount} invoices remain pending for collection. Send reminder or payment link.`,
      badge: `${data.unpaidInvoicesCount} Invoices`,
      href: "/app/sales/invoices",
      severity: "info",
      icon: Receipt,
    });
  }

  // 7. Offline Sync Pending Queue
  if (data.offlinePendingCount > 0) {
    activeAlerts.push({
      id: "offline-sync",
      title: isHi ? "ऑफलाइन सिंक लंबित" : "Local Transactions Pending Sync",
      description: isHi
        ? `${data.offlinePendingCount} बिल स्थानीय रूप से सुरक्षित हैं। इंटरनेट उपलब्ध होने पर सर्वर पर सिंक करें।`
        : `${data.offlinePendingCount} transactions queued locally in browser storage awaiting cloud sync.`,
      badge: `${data.offlinePendingCount} Local`,
      href: "/app/settings/offline-sync",
      severity: "warning",
      icon: WifiOff,
    });
  }

  if (activeAlerts.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">
              {isHi ? "सभी परिचालन मानक सामान्य स्तर पर हैं" : "All Operational Safeguards Healthy"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {isHi
                ? "कोई अतिदेय उधारी, शून्य स्टॉक या समाप्ति जोखिम सक्रिय नहीं है (0 सक्रिय अलर्ट)।"
                : "No critical stockouts, negative balances, overdue credit, or batch expiry risks detected (0 active alerts)."}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 rounded-full uppercase tracking-wider">
          {isHi ? "सुरक्षित" : "Optimal"}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
        <span className="flex items-center space-x-1.5 text-foreground">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-bold text-xs">{isHi ? "सक्रिय परिचालन अलर्ट" : "Actionable Operational Alerts"} ({activeAlerts.length})</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          {isHi ? "प्राथमिकता के अनुसार हल करें" : "Requires business attention"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {activeAlerts.map((alert) => {
          const Icon = alert.icon;
          const severityColors =
            alert.severity === "danger"
              ? "bg-rose-50/40 border-rose-200 hover:border-rose-400/80 dark:bg-rose-950/20 dark:border-rose-900/40"
              : alert.severity === "warning"
              ? "bg-amber-50/40 border-amber-200 hover:border-amber-400/80 dark:bg-amber-950/20 dark:border-amber-900/40"
              : "bg-blue-50/40 border-blue-200 hover:border-blue-400/80 dark:bg-blue-950/20 dark:border-blue-900/40";

          const iconContainerColors =
            alert.severity === "danger"
              ? "bg-rose-100/70 border-rose-300/60 text-rose-600 dark:bg-rose-950/40 dark:border-rose-800/40 dark:text-rose-400"
              : alert.severity === "warning"
              ? "bg-amber-100/70 border-amber-300/60 text-amber-600 dark:bg-amber-950/40 dark:border-amber-800/40 dark:text-amber-400"
              : "bg-blue-100/70 border-blue-300/60 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800/40 dark:text-blue-400";

          const badgeColors =
            alert.severity === "danger"
              ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300"
              : alert.severity === "warning"
              ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
              : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300";

          return (
            <Link
              key={alert.id}
              href={alert.href}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between space-x-2.5 group shadow-2xs ${severityColors}`}
            >
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className={`p-1.5 rounded-lg border shrink-0 ${iconContainerColors}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-foreground truncate">{alert.title}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md border shrink-0 ${badgeColors}`}>
                      {alert.badge}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground truncate">
                    {alert.description}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
