"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  QrCode,
  Wallet,
  Building2,
  Receipt,
  CreditCard,
  ArrowUpRight,
} from "lucide-react";

export interface DailySalesPoint {
  date: string;
  label: string;
  sales: number;
  collected: number;
  invoicesCount: number;
}

export interface PaymentModeSlice {
  modeKey: string;
  modeLabel: string;
  amount: number;
  percentage: number;
  count: number;
  colorClass: string;
  barColor: string;
}

interface Props {
  trendData: DailySalesPoint[];
  paymentModes: PaymentModeSlice[];
  isHi?: boolean;
}

export function SalesCollectionAnalyticsWidget({ trendData, paymentModes, isHi = false }: Props) {
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const maxVal = Math.max(
    ...trendData.map((d) => Math.max(d.sales, d.collected)),
    100
  );

  const totalPaymentAmount = paymentModes.reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
      {/* Left 2 Cols: Real Daily Sales & Collection Trend */}
      <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-3.5 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xs sm:text-sm font-black text-foreground tracking-tight flex items-center space-x-1.5">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>{isHi ? "बिक्री एवं वसूली रुझान" : "Sales & Collection Revenue Trend"}</span>
            </h2>
            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
              {isHi
                ? "वास्तविक दैनिक बिलिंग और नकद वसूली का तुलनात्मक विवरण"
                : "Actual daily billing volume vs realized cash collection from ledger"}
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span>
              <span className="text-foreground font-bold text-xs">{isHi ? "बिक्री" : "Billed Sales"}</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-600"></span>
              <span className="text-foreground font-bold text-xs">{isHi ? "वसूली" : "Collected"}</span>
            </span>
            <Link
              href="/app/reports/sales?tab=summary"
              className="text-emerald-600 hover:underline text-xs font-bold flex items-center space-x-0.5"
            >
              <span>{isHi ? "विस्तृत" : "Report"}</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {trendData.length === 0 ? (
          <div className="h-36 rounded-lg bg-surface-muted border border-border flex flex-col items-center justify-center text-center p-4 space-y-1">
            <Receipt className="w-5 h-5 text-muted-foreground" />
            <div className="text-xs text-foreground font-bold">
              {isHi ? "चयनित अवधि में कोई इनवॉइस रिकॉर्ड नहीं है" : "No sales invoices recorded for the selected period."}
            </div>
            <p className="text-[10px] text-muted-foreground max-w-sm">
              {isHi
                ? "काउंटर से बिल बनाने के बाद दैनिक रुझान चार्ट यहाँ स्वतः प्रदर्शित होगा।"
                : "As invoices are issued at billing counters, daily revenue volume will populate here dynamically."}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 pt-1">
            <div className="h-32 sm:h-36 flex items-end justify-between gap-2 border-b border-border pb-1.5">
              {trendData.map((pt, idx) => {
                const salesHeight = Math.max(4, Math.round((pt.sales / maxVal) * 100));
                const collectedHeight = Math.max(4, Math.round((pt.collected / maxVal) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col bg-surface border border-border text-foreground p-2 rounded-lg text-[10px] whitespace-nowrap z-20 shadow-xl pointer-events-none font-mono">
                      <div className="font-bold text-foreground font-sans">{pt.date}</div>
                      <div className="text-emerald-600 font-bold">Sales: {formatCurrency(pt.sales)}</div>
                      <div className="text-blue-600 font-bold">Paid: {formatCurrency(pt.collected)}</div>
                      <div className="text-muted-foreground font-sans">{pt.invoicesCount} bills</div>
                    </div>

                    <div className="w-full flex items-end justify-center space-x-1 h-28 sm:h-32">
                      <div
                        style={{ height: `${salesHeight}%` }}
                        className="w-full max-w-[12px] bg-emerald-600 rounded-t group-hover:brightness-110 transition-all"
                        title={`Sales: ${formatCurrency(pt.sales)}`}
                      ></div>
                      <div
                        style={{ height: `${collectedHeight}%` }}
                        className="w-full max-w-[12px] bg-blue-600 rounded-t group-hover:brightness-110 transition-all"
                        title={`Collected: ${formatCurrency(pt.collected)}`}
                      ></div>
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1 truncate w-full text-center font-bold font-mono">
                      {pt.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold pt-0.5">
              <span>{isHi ? "दैनिक डेटा वास्तविक इनवॉइस लेजर से तैयार किया गया है" : "Live data aggregated from verified database sales invoices"}</span>
              <span className="font-mono">{trendData.length} active data points</span>
            </div>
          </div>
        )}
      </div>

      {/* Right 1 Col: Real Payment Mode Distribution */}
      <div className="bg-surface border border-border rounded-xl p-3.5 shadow-xs space-y-2.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black text-foreground tracking-tight flex items-center space-x-1.5">
              <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isHi ? "भुगतान माध्यम वितरण" : "Payment Mode Distribution"}</span>
            </h2>
            <Link
              href="/app/reports/sales?tab=summary"
              className="text-muted-foreground hover:text-primary"
              title="View Payment Breakdown"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
            {isHi ? "वास्तविक लेजर रिकॉर्ड्स के आधार पर चैनल विभाजन" : "Actual distribution across sales invoice settlement modes"}
          </p>
        </div>

        {totalPaymentAmount === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground bg-surface-muted rounded-lg border border-border my-auto">
            {isHi ? "कोई भुगतान डेटा उपलब्ध नहीं है" : "No settlement data available for selected period."}
          </div>
        ) : (
          <div className="space-y-2 my-auto">
            {paymentModes.map((mode) => (
              <div key={mode.modeKey} className="space-y-0.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-foreground flex items-center space-x-1.5">
                    <span className={`w-2 h-2 rounded-full ${mode.colorClass}`}></span>
                    <span>{mode.modeLabel}</span>
                  </span>
                  <span className="text-foreground font-mono">{formatCurrency(mode.amount)}</span>
                </div>
                <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${mode.barColor}`}
                    style={{ width: `${mode.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                  <span>{mode.count} txns</span>
                  <span>{mode.percentage}% share</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs">
          <span className="text-emerald-800 dark:text-emerald-300 font-semibold">{isHi ? "कुल प्राप्त राशि:" : "Total Settlements:"}</span>
          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">{formatCurrency(totalPaymentAmount)}</span>
        </div>
      </div>
    </div>
  );
}
