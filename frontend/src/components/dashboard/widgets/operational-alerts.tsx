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
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              {isHi ? "सभी परिचालन मानक सामान्य स्तर पर हैं" : "All Operational Safeguards Healthy"}
            </div>
            <div className="text-[11px] text-slate-400">
              {isHi
                ? "कोई अतिदेय उधारी, शून्य स्टॉक या समाप्ति जोखिम सक्रिय नहीं है (0 सक्रिय अलर्ट)।"
                : "No critical stockouts, negative balances, overdue credit, or batch expiry risks detected (0 active alerts)."}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
          {isHi ? "सुरक्षित" : "Optimal"}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
        <span className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-black text-xs">{isHi ? "सक्रिय परिचालन अलर्ट" : "Actionable Operational Alerts"} ({activeAlerts.length})</span>
        </span>
        <span className="text-[10px] text-slate-500">
          {isHi ? "प्राथमिकता के अनुसार हल करें" : "Requires business attention"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {activeAlerts.map((alert) => {
          const Icon = alert.icon;
          const severityColors =
            alert.severity === "danger"
              ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 hover:border-rose-500"
              : alert.severity === "warning"
              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30 hover:border-amber-500"
              : "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-500";

          const iconContainerColors =
            alert.severity === "danger"
              ? "bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400"
              : alert.severity === "warning"
              ? "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400"
              : "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400";

          const badgeColors =
            alert.severity === "danger"
              ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30"
              : alert.severity === "warning"
              ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/30"
              : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/30";

          return (
            <Link
              key={alert.id}
              href={alert.href}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between space-x-2.5 group shadow-xs ${severityColors}`}
            >
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className={`p-1.5 rounded-lg border shrink-0 ${iconContainerColors}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">{alert.title}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md border shrink-0 ${badgeColors}`}>
                      {alert.badge}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate">
                    {alert.description}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
