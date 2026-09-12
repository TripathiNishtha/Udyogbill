"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  Printer,
  X,
  FileText,
  Download,
  Building2,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Check,
  Building,
  Users,
  HardDrive,
  Tag,
  AlertCircle,
  Percent,
  Loader2,
} from "lucide-react";
import { tenantAppService } from "@/services/tenant-app-services";
import { subscriptionService } from "@/services/api-services";
import { platformCouponService } from "@/services/coupon-service";
import { printRawHtml } from "@/lib/print-helper";
import { Plan } from "@/types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function TenantBillingPage() {
  const [subStatus, setSubStatus] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Invoice for Viewing / Printing
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);

  // Pre-payment Checkout Modal for Plans
  const [pendingCheckoutPlan, setPendingCheckoutPlan] = useState<Plan | null>(null);
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Coupon State
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalAmount: number;
    message: string;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [statusRes, invoicesRes, plansRes] = await Promise.all([
        tenantAppService.getSubscriptionStatus(),
        tenantAppService.getSubscriptionInvoices(),
        subscriptionService.getPlans().catch(() => []),
      ]);
      setSubStatus(statusRes);
      setInvoices(invoicesRes || []);
      setPlans(plansRes.filter((p: any) => p.isActive !== false));
    } catch (err: any) {
      console.error("Failed to load billing details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleApplyCoupon = async (basePrice: number) => {
    if (!couponInput.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await platformCouponService.validateCoupon(
        couponInput.trim().toUpperCase(),
        "Plan",
        basePrice
      );
      if (res && res.isValid) {
        setAppliedCoupon({
          code: res.couponCode || couponInput.trim().toUpperCase(),
          discountAmount: res.discountAmount,
          finalAmount: res.finalAmount,
          message: res.message,
        });
        setCouponError(null);
      } else {
        setCouponError(res?.message || "Invalid or inactive coupon code.");
        setAppliedCoupon(null);
      }
    } catch (err: any) {
      setCouponError(err?.response?.data?.message || err?.message || "Failed to validate coupon code.");
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const handleBuyPlan = async (plan: Plan, couponCode?: string) => {
    setPurchasingPlanId(plan.id);
    setErrorMsg(null);
    try {
      const orderRes = await tenantAppService.createSubscriptionOrder({
        planCode: plan.code,
        billingCycle: "Monthly",
        couponCode: couponCode || undefined,
      });

      const isRzpReady = await loadRazorpayScript();

      if (isRzpReady && window.Razorpay && orderRes.keyId.startsWith("rzp_")) {
        const options = {
          key: orderRes.keyId,
          amount: orderRes.amountInPaisa,
          currency: orderRes.currency || "INR",
          name: "UdyogBill",
          description: orderRes.description,
          order_id: orderRes.orderId,
          prefill: {
            email: orderRes.customerEmail,
            contact: orderRes.customerPhone,
          },
          theme: { color: "#4f46e5" },
          handler: async (response: any) => {
            try {
              const confirmRes = await tenantAppService.confirmSubscriptionPayment({
                razorpayOrderId: response.razorpay_order_id || orderRes.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature || "simulated_signature",
                planCode: plan.code,
                billingCycle: "Monthly",
                couponCode: couponCode || undefined,
              });
              setCompletedInvoice(confirmRes);
              await loadBillingData();
            } catch (cErr: any) {
              setErrorMsg(cErr.message || "Payment confirmation failed.");
            } finally {
              setPurchasingPlanId(null);
            }
          },
          modal: {
            ondismiss: () => setPurchasingPlanId(null),
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fallback simulation
        const confirmRes = await tenantAppService.confirmSubscriptionPayment({
          razorpayOrderId: orderRes.orderId,
          razorpayPaymentId: "pay_simulated_" + Date.now(),
          razorpaySignature: "simulated_sig",
          planCode: plan.code,
          billingCycle: "Monthly",
          couponCode: couponCode || undefined,
        });
        setCompletedInvoice(confirmRes);
        await loadBillingData();
        setPurchasingPlanId(null);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to create subscription order.");
      setPurchasingPlanId(null);
    }
  };

  const getAmountInWords = (num: number): string => {
    const rounded = Math.floor(Math.abs(num));
    if (rounded === 0) return "Zero Only";
    const a = [
      "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
      "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const inWords = (val: number): string => {
      let str = "";
      if (val >= 10000000) { str += inWords(Math.floor(val / 10000000)) + "Crore "; val %= 10000000; }
      if (val >= 100000) { str += inWords(Math.floor(val / 100000)) + "Lakh "; val %= 100000; }
      if (val >= 1000) { str += inWords(Math.floor(val / 1000)) + "Thousand "; val %= 1000; }
      if (val >= 100) { str += inWords(Math.floor(val / 100)) + "Hundred "; val %= 100; }
      if (val > 0) {
        if (val < 20) { str += a[val]; }
        else { str += b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : " "); }
      }
      return str;
    };
    return "INR " + inWords(rounded).trim() + " Only";
  };

  const generateSubscriptionInvoiceHtml = (inv: any): string => {
    const formattedDate = new Date(inv.invoiceDate || Date.now()).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const subTotal = Number(inv.subTotal) || 0;
    const totalAmount = Number(inv.totalAmount) || 0;
    const taxAmount = Number(inv.taxAmount) || 0;
    const isInterState = Boolean(inv.isInterState);
    const cgstAmount = Number(inv.cgstAmount || (taxAmount / 2)).toFixed(2);
    const sgstAmount = Number(inv.sgstAmount || (taxAmount / 2)).toFixed(2);
    const igstAmount = Number(inv.igstAmount || taxAmount).toFixed(2);
    const words = getAmountInWords(totalAmount);

    return `
      <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; max-width: 800px; margin: 0 auto; padding: 24px; background: #ffffff; box-sizing: border-box; font-size: 12px; line-height: 1.4;">
        <!-- Top Bar: Seller & Invoice Info -->
        <table style="width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top; width: 60%;">
              ${inv.supplierLogoUrl ? `<img src="${inv.supplierLogoUrl}" alt="Logo" style="height: 36px; object-fit: contain; margin-bottom: 6px; display: block;" />` : ""}
              <div style="font-size: 16px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px; text-transform: uppercase;">
                ${inv.supplierLegalName || "DIGIOPERA PRIVATE LIMITED"}
              </div>
              <div style="color: #4f46e5; font-weight: 700; font-size: 12px; margin-top: 2px;">
                UdyogBill Cloud Platform
              </div>
              <div style="color: #64748b; font-size: 11px; margin-top: 3px; max-width: 380px;">
                ${inv.supplierAddress || "3rd Floor Landmark Cyber Park, Gurugram, Haryana - 122102"}
              </div>
              <div style="margin-top: 6px; font-size: 11px; color: #334155; font-weight: 600;">
                <span>GSTIN: <strong style="font-family: monospace; color: #0f172a;">${inv.supplierGstin || "06AAMCD2668N1Z2"}</strong></span>
                &nbsp;&bull;&nbsp;
                <span>State Code: <strong style="font-family: monospace; color: #0f172a;">${inv.supplierStateCode || "06"}</strong></span>
              </div>
            </td>
            <td style="vertical-align: top; text-align: right; width: 40%;">
              <div style="display: inline-block; background: #059669; color: #ffffff; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 6px;">
                TAX INVOICE
              </div>
              <div style="font-family: monospace; font-size: 16px; font-weight: 900; color: #0f172a;">
                ${inv.invoiceNumber}
              </div>
              <div style="color: #475569; font-size: 11px; margin-top: 3px;">
                Invoice Date: <strong style="color: #0f172a;">${formattedDate}</strong>
              </div>
              <div style="color: #475569; font-size: 11px; margin-top: 2px;">
                Place of Supply: <strong style="color: #0f172a;">${inv.placeOfSupply || "09 (Uttar Pradesh)"}</strong>
              </div>
              <div style="color: #059669; font-size: 10px; font-weight: 700; margin-top: 4px;">
                ORIGINAL FOR RECIPIENT
              </div>
            </td>
          </tr>
        </table>

        <!-- Bill To & Tax Details Box -->
        <table style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; margin-bottom: 18px; border-collapse: separate; border-spacing: 0;">
          <tr>
            <td style="padding: 12px 14px; width: 55%; vertical-align: top; border-right: 1px solid #cbd5e1;">
              <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
                Billed To (Customer / Subscriber):
              </div>
              <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                ${inv.tenantBusinessName}
              </div>
              <div style="color: #475569; font-size: 11px; margin-top: 3px;">
                ${inv.tenantBillingAddress || "Cloud Registered Subscriber"}
              </div>
              <div style="color: #475569; font-size: 11px; margin-top: 2px;">
                Email: <strong>${inv.tenantEmail || "N/A"}</strong> &bull; Phone: <strong>${inv.tenantPhone || "N/A"}</strong>
              </div>
            </td>
            <td style="padding: 12px 14px; width: 45%; vertical-align: top;">
              <table style="width: 100%; font-size: 11px; color: #334155;">
                <tr>
                  <td style="color: #64748b; padding-bottom: 3px;">Customer GSTIN:</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace; color: #0f172a;">${inv.tenantGstin || "Unregistered"}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding-bottom: 3px;">Customer PAN:</td>
                  <td style="text-align: right; font-weight: 600; font-family: monospace; color: #0f172a;">${inv.tenantPan || "N/A"}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding-bottom: 3px;">Supply Type:</td>
                  <td style="text-align: right; font-weight: 700; color: #4338ca;">
                    ${isInterState ? "Inter-State (IGST 18%)" : "Intra-State (CGST 9% + SGST 9%)"}
                  </td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding-bottom: 3px;">Payment Method:</td>
                  <td style="text-align: right; font-weight: 700; color: #0f172a;">${inv.paymentGateway}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Transaction Ref:</td>
                  <td style="text-align: right; font-family: monospace; font-size: 10px; color: #475569;">${inv.gatewayPaymentId || "N/A"}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 9px 12px; text-align: left; width: 50%;">Item & Service Description</th>
              <th style="padding: 9px 10px; text-align: center; width: 12%;">SAC Code</th>
              <th style="padding: 9px 10px; text-align: right; width: 14%;">Taxable Value</th>
              <th style="padding: 9px 10px; text-align: center; width: 10%;">GST Rate</th>
              <th style="padding: 9px 12px; text-align: right; width: 14%;">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 12px; vertical-align: top;">
                <div style="font-weight: 700; color: #0f172a; font-size: 12px;">${inv.itemDescription}</div>
                <div style="color: #64748b; font-size: 11px; margin-top: 3px;">
                  Validity: ${inv.durationDays} Days &bull; Cloud SaaS Subscription License
                </div>
                <div style="color: #059669; font-size: 10px; font-weight: 600; margin-top: 2px;">
                  ✓ Automated Instant Activation
                </div>
              </td>
              <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-family: monospace; font-size: 11px; color: #334155;">
                998313
              </td>
              <td style="padding: 12px 10px; text-align: right; vertical-align: top; font-weight: 600; font-family: monospace; color: #0f172a;">
                ₹${subTotal.toFixed(2)}
              </td>
              <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-weight: 600; color: #334155;">
                18%
              </td>
              <td style="padding: 12px; text-align: right; vertical-align: top; font-weight: 900; font-family: monospace; font-size: 13px; color: #0f172a;">
                ₹${totalAmount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Bottom Grid: Bank Details & Tax Totals -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
          <tr>
            <!-- Settlement Bank Details & Amount in words -->
            <td style="vertical-align: top; width: 55%; padding-right: 16px;">
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px;">
                <div style="font-size: 9px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 4px;">
                  Settlement & Verification Bank A/C:
                </div>
                <div style="font-size: 11px; color: #334155; line-height: 1.5;">
                  <div>Bank: <strong>${inv.supplierBankName || "State Bank of India"}</strong> ${inv.supplierBankBranch ? `(${inv.supplierBankBranch})` : ""}</div>
                  <div>A/C Number: <strong style="font-family: monospace; color: #0f172a;">${inv.supplierBankAccountNumber || "44777396364"}</strong></div>
                  <div>IFSC: <strong style="font-family: monospace; color: #0f172a;">${inv.supplierBankIfsc || "SBIN0061808"}</strong></div>
                  ${inv.supplierUpiId ? `<div>UPI ID: <strong style="font-family: monospace; color: #4f46e5;">${inv.supplierUpiId}</strong></div>` : ""}
                </div>
              </div>

              <div style="font-size: 11px; color: #334155; padding: 4px 2px;">
                <strong>Amount in Words:</strong><br />
                <span style="font-style: italic; color: #0f172a; font-weight: 600;">${words}</span>
              </div>
            </td>

            <!-- Calculations Summary -->
            <td style="vertical-align: top; width: 45%;">
              <table style="width: 100%; font-size: 11px; color: #334155; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Taxable Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: 600; color: #0f172a;">₹${subTotal.toFixed(2)}</td>
                </tr>
                ${isInterState ? `
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">IGST (18%):</td>
                    <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: 600; color: #0f172a;">₹${igstAmount}</td>
                  </tr>
                ` : `
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">CGST (9%):</td>
                    <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: 600; color: #0f172a;">₹${cgstAmount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">SGST (9%):</td>
                    <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: 600; color: #0f172a;">₹${sgstAmount}</td>
                  </tr>
                `}
                <tr style="border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a;">
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 800; color: #0f172a;">Grand Total Paid:</td>
                  <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 16px; font-weight: 900; color: #047857;">
                    ₹${totalAmount.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 4px 0; text-align: right; font-size: 10px; color: #059669; font-weight: 700;">
                    (Payment Status: COMPLETED / PAID)
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Declarations & Signatory -->
        <table style="width: 100%; border-top: 1px solid #cbd5e1; padding-top: 14px; margin-top: 6px;">
          <tr>
            <td style="vertical-align: bottom; width: 60%;">
              <div style="font-size: 9px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 3px;">
                Terms & Declarations:
              </div>
              <div style="font-size: 9.5px; color: #64748b; line-height: 1.5; max-width: 420px; white-space: pre-line;">
                ${inv.invoiceTermsAndConditions || "1. Computer-generated tax invoice for IT Software SaaS Services (SAC 998313).\n2. Input tax credit is available subject to valid GSTIN under GST law.\n3. Payment Confirmed & Validated via Electronic Funds Transfer."}
              </div>
            </td>
            <td style="vertical-align: bottom; text-align: center; width: 40%;">
              ${inv.supplierSignatoryImageUrl ? `
                <img src="${inv.supplierSignatoryImageUrl}" alt="Signature" style="height: 40px; object-fit: contain; margin: 0 auto 4px; display: block;" />
              ` : `
                <div style="display: inline-block; padding: 4px 12px; border: 1px dashed #94a3b8; border-radius: 4px; font-family: monospace; font-size: 10px; color: #64748b; margin-bottom: 6px;">
                  [ Digitally Signed & Verified ]
                </div>
              `}
              <div style="font-size: 11px; font-weight: 800; color: #0f172a;">
                ${inv.supplierSignatoryName || "Authorized Signatory"}
              </div>
              <div style="font-size: 10px; color: #64748b;">
                ${inv.supplierSignatoryDesignation || "Finance Director"}
              </div>
              <div style="font-size: 9px; color: #94a3b8; font-weight: 600;">
                ${inv.supplierLegalName || "Udyog Software Technologies Pvt Ltd"}
              </div>
            </td>
          </tr>
        </table>

        <!-- Bottom Watermark Footer -->
        <div style="margin-top: 20px; padding-top: 8px; border-top: 1px dashed #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8;">
          This is an official GST invoice generated by UdyogBill Cloud Billing Platform &bull; www.udyogbill.com &bull; support@udyogbill.com
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    if (!activeInvoice) return;
    const html = generateSubscriptionInvoiceHtml(activeInvoice);
    printRawHtml(html, `Tax_Invoice_${activeInvoice.invoiceNumber}`, "A4 portrait", "4mm 5mm");
  };

  const enrolledAddons = subStatus?.addons?.filter((a: any) => a.isEnrolled) || [];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Subscription & Billing History</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage your active plan, apply discount coupons, view capacity add-ons, and download official GST Tax Invoices.
          </p>
        </div>

        <Link
          href="/app/settings/addons"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Explore Add-on Store</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl text-sm flex items-center gap-2.5 border bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Plan Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xs dark:shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
              subStatus?.isTrial
                ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
            }`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              subStatus?.isTrial
                ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
            }`}>
              {subStatus?.isTrial ? "Trial Period" : "Active Plan"}
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {subStatus?.isTrial ? "Free 14-Day Trial" : (subStatus?.currentPlanName || "Professional Tier")}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {subStatus?.isTrial
                ? "You are currently on full free trial. Choose a plan below to activate your permanent subscription."
                : "Auto-renews with unlimited GST invoices"}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>{subStatus?.isTrial ? "Trial Remaining:" : "Remaining Days:"}</span>
            </span>
            <span className={`font-bold ${subStatus?.isTrial ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
              {subStatus?.planRemainingDays ?? 14} Days
            </span>
          </div>
        </div>

        {/* Active Industry Add-ons Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xs dark:shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
              {enrolledAddons.length} Packs Active
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Industry Add-ons</h3>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {enrolledAddons.length > 0 ? (
                enrolledAddons.map((addon: any) => (
                  <span
                    key={addon.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  >
                    {addon.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">No add-ons purchased yet</span>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Add-on Marketplace:</span>
            <Link
              href="/app/settings/addons"
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center space-x-1"
            >
              <span>Add More Packs</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Payment Gateway Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xs dark:shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs">
              UPI
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              Razorpay Secured
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Auto Invoicing</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              GST Tax Invoices with SAC 998313 generated instantly upon each transaction.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Total Invoices:</span>
            <span className="font-bold text-slate-900 dark:text-white">{invoices.length} Issued</span>
          </div>
        </div>
      </div>

      {/* Available Subscription Tiers & Upgrades */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <span>Available Subscription Tiers & Upgrades</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Upgrade your account tier to increase branch quotas, warehouse limits, and invoice capacities.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const basePrice = Number(plan.price) || 0;
            const gstAmount = Number((basePrice * 0.18).toFixed(2));
            const totalWithGst = Number((basePrice + gstAmount).toFixed(2));
            const isCurrentPlan = !subStatus?.isTrial && (
              subStatus?.currentPlanCode === plan.code ||
              (subStatus?.currentPlanName && subStatus.currentPlanName.toLowerCase() === plan.name.toLowerCase())
            );

            return (
              <div
                key={plan.id}
                className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border flex flex-col justify-between relative transition-all shadow-xs dark:shadow-lg ${
                  plan.isPopular
                    ? "border-indigo-300 dark:border-indigo-500/50 shadow-md shadow-indigo-500/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-600 text-white shadow-md">
                    Recommended Tier
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400">
                      {plan.code}
                    </span>
                    {isCurrentPlan && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                        Current Plan
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{plan.description}</p>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">₹{basePrice.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">/ mo (excl. GST)</span>
                    </div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                      + 18% GST (₹{gstAmount}) will be additional
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Total: <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{totalWithGst.toLocaleString("en-IN")} / month</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Users</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">{plan.maxUsers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                        <Building className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Branches & Wh</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">{plan.maxBranches} Br / {plan.maxWarehouses} Wh</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Monthly Invoices</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {plan.maxInvoicesPerMonth >= 100000 ? "Unlimited" : `${plan.maxInvoicesPerMonth} /mo`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isCurrentPlan || purchasingPlanId === plan.id}
                    onClick={() => {
                      setPendingCheckoutPlan(plan);
                      setCouponInput("");
                      setAppliedCoupon(null);
                      setCouponError(null);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      isCurrentPlan
                        ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isCurrentPlan ? "Active Current Tier" : `Select & Pay ₹${totalWithGst.toFixed(0)}`}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription Invoices Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs dark:shadow-xl">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Tax Invoices & Payment Receipts</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Download or print official receipts for your accounting and GST input credit.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/80 text-[11px] uppercase font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Transaction ID</th>
                <th className="py-3.5 px-4">Amount (₹)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 dark:text-slate-200 font-semibold">{inv.itemDescription}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {inv.billingCycle} • {inv.durationDays} Days validity
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                        {inv.paymentGateway}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                      {inv.gatewayPaymentId || "N/A"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{inv.totalAmount}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        (Sub: ₹{inv.subTotal} + 18% GST: ₹{inv.taxAmount})
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveInvoice(inv)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/10 dark:hover:bg-indigo-600/20 dark:text-indigo-400 dark:border-indigo-500/20 font-semibold transition-colors text-xs cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>View / Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-sm">
                    No payment invoices recorded yet. When you purchase an add-on or subscription, tax receipts will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Invoice Modal */}
      {activeInvoice && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl relative my-auto max-h-[96vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Controls (Sticky Top Bar - Hidden during print) */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-slate-900 text-white shrink-0 print:hidden border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs sm:text-sm text-white">Official GST Subscription Invoice</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {activeInvoice.invoiceNumber}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInvoice(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                  title="Close Invoice"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Tax Invoice Document (Clean, crisp, fits in single screen) */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-3 text-slate-700 bg-white" id="printable-invoice">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-2.5">
                <div className="space-y-0.5 max-w-md">
                  {activeInvoice.supplierLogoUrl && (
                    <img src={activeInvoice.supplierLogoUrl} alt="Company Logo" className="h-7 object-contain mb-1" />
                  )}
                  <h2 className="text-sm font-black text-slate-950 tracking-tight uppercase leading-tight">
                    {activeInvoice.supplierLegalName || "DIGIOPERA PRIVATE LIMITED"}
                  </h2>
                  <p className="text-indigo-600 font-bold text-[11px]">UdyogBill Cloud Platform</p>
                  <p className="text-slate-500 text-[10px] leading-tight">
                    {activeInvoice.supplierAddress || "3rd Floor Landmark Cyber Park, Gurugram, Haryana - 122102"}
                  </p>
                  <div className="flex gap-3 text-slate-700 font-semibold text-[10px] pt-0.5">
                    <span>GSTIN: <span className="font-mono font-bold text-slate-900">{activeInvoice.supplierGstin || "06AAMCD2668N1Z2"}</span></span>
                    <span>State Code: <span className="font-mono font-bold text-slate-900">{activeInvoice.supplierStateCode || "06"}</span></span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="inline-block bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider mb-0.5">
                    TAX INVOICE
                  </div>
                  <div className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                    {activeInvoice.invoiceNumber}
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    Date: {new Date(activeInvoice.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    Place of Supply: <span className="font-semibold text-slate-900">{activeInvoice.placeOfSupply || "09 (Default)"}</span>
                  </div>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px]">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Billed To (Subscriber / Customer):</span>
                  <div className="font-bold text-slate-950 text-xs mt-0.5">{activeInvoice.tenantBusinessName}</div>
                  <div className="text-slate-600 text-[10px] truncate">{activeInvoice.tenantBillingAddress}</div>
                  <div className="text-slate-600 text-[10px]">Email: {activeInvoice.tenantEmail || "N/A"}</div>
                  <div className="text-slate-600 text-[10px]">Phone: {activeInvoice.tenantPhone || "N/A"}</div>
                </div>
                <div className="text-right space-y-0.5 text-[10px]">
                  <div>
                    <span className="text-slate-500">Customer GSTIN: </span>
                    <span className="font-mono font-bold text-slate-900">{activeInvoice.tenantGstin || "Unregistered"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Customer PAN: </span>
                    <span className="font-mono font-semibold text-slate-900">{activeInvoice.tenantPan || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Supply Type: </span>
                    <span className="font-bold text-indigo-700">
                      {activeInvoice.isInterState ? "Inter-State (IGST 18%)" : "Intra-State (CGST 9% + SGST 9%)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Payment Gateway: </span>
                    <span className="font-bold text-slate-900">{activeInvoice.paymentGateway}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Payment Ref: </span>
                    <span className="font-mono text-slate-900">{activeInvoice.gatewayPaymentId || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden text-[11px]">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[9px] font-bold">
                  <tr>
                    <th className="py-1.5 px-3">Item &amp; Service Description</th>
                    <th className="py-1.5 px-2 text-center">SAC Code</th>
                    <th className="py-1.5 px-2 text-right">Taxable Subtotal</th>
                    <th className="py-1.5 px-2 text-center">GST Rate</th>
                    <th className="py-1.5 px-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  <tr>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">{activeInvoice.itemDescription}</div>
                      <div className="text-[10px] text-slate-500">
                        Duration: {activeInvoice.durationDays} Days • Instant Automated Activation
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-[10px]">998313</td>
                    <td className="py-2 px-2 text-right font-semibold">₹{activeInvoice.subTotal}</td>
                    <td className="py-2 px-2 text-center font-semibold">18%</td>
                    <td className="py-2 px-3 text-right font-black text-slate-950">₹{activeInvoice.totalAmount}</td>
                  </tr>
                </tbody>
              </table>

              {/* Total Calculation & Settlement Bank Details */}
              <div className="flex justify-between items-start pt-1 gap-3">
                <div className="text-[10px] text-slate-600 max-w-sm space-y-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex-1">
                  <div className="font-bold text-slate-800 uppercase text-[9px]">Settlement &amp; Verification Bank A/C:</div>
                  <div>Bank: <strong className="text-slate-800">{activeInvoice.supplierBankName || "State Bank of India"}</strong> {activeInvoice.supplierBankBranch ? `(${activeInvoice.supplierBankBranch})` : ""}</div>
                  <div>A/C No: <strong className="font-mono text-slate-900">{activeInvoice.supplierBankAccountNumber || "44777396364"}</strong></div>
                  <div>IFSC: <strong className="font-mono text-slate-900">{activeInvoice.supplierBankIfsc || "SBIN0061808"}</strong></div>
                  {activeInvoice.supplierUpiId && <div>UPI ID: <strong className="font-mono text-indigo-700">{activeInvoice.supplierUpiId}</strong></div>}
                </div>

                <div className="w-60 space-y-1 text-right text-[11px] shrink-0">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <span className="font-mono">₹{activeInvoice.subTotal}</span>
                  </div>

                  {activeInvoice.isInterState ? (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST (18%):</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        ₹{activeInvoice.igstAmount || activeInvoice.taxAmount}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST (9%):</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          ₹{activeInvoice.cgstAmount || (activeInvoice.taxAmount / 2).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST (9%):</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          ₹{activeInvoice.sgstAmount || (activeInvoice.taxAmount / 2).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="border-t border-slate-300 pt-1 flex justify-between font-bold text-slate-950 text-xs">
                    <span>Grand Total Paid:</span>
                    <span className="text-emerald-700 font-mono font-black text-sm">₹{activeInvoice.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Signatory & Declarations Footer */}
              <div className="border-t border-slate-200 pt-2 flex justify-between items-end text-[10px] gap-4">
                <div className="max-w-md text-[9px] text-slate-500 whitespace-pre-line leading-snug">
                  <div className="font-bold text-slate-700 uppercase text-[9px] mb-0.5">Terms &amp; Declarations:</div>
                  {activeInvoice.invoiceTermsAndConditions || "1. Computer-generated tax invoice for IT Software SaaS Services (SAC 998313).\n2. Input tax credit is available subject to valid GSTIN.\n3. Payment Confirmed & Validated via Electronic Funds Transfer."}
                </div>

                <div className="text-center space-y-0.5 min-w-[140px] shrink-0">
                  {activeInvoice.supplierSignatoryImageUrl ? (
                    <img src={activeInvoice.supplierSignatoryImageUrl} alt="Signature Stamp" className="h-8 object-contain mx-auto" />
                  ) : (
                    <div className="h-7 border-b border-slate-400 flex items-center justify-center text-[9px] text-slate-400 font-mono">
                      [ Digitally Signed ]
                    </div>
                  )}
                  <div className="font-bold text-slate-900 text-[10px] leading-tight">{activeInvoice.supplierSignatoryName || "Authorized Signatory"}</div>
                  <div className="text-[9px] text-slate-500">{activeInvoice.supplierSignatoryDesignation || "Managing Director"}</div>
                  <div className="text-[8px] text-slate-400 font-semibold truncate max-w-[150px]">{activeInvoice.supplierLegalName || "Udyog Software Technologies Pvt Ltd"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-payment Checkout Order Breakdown Modal for Plans with Discount Coupon Support */}
      {pendingCheckoutPlan && (() => {
        const rawBase = Number(pendingCheckoutPlan.price) || 0;
        const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
        const effectiveBase = Math.max(0, rawBase - discount);
        const gstAmount = Number((effectiveBase * 0.18).toFixed(2));
        const totalAmount = Number((effectiveBase + gstAmount).toFixed(2));
        const isBusy = purchasingPlanId === pendingCheckoutPlan.id;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setPendingCheckoutPlan(null);
                  setCouponInput("");
                  setAppliedCoupon(null);
                  setCouponError(null);
                }}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{pendingCheckoutPlan.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Subscription & Tax Invoice Summary</p>
                </div>
              </div>

              {/* Coupon Code Input / Applied Badge */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Have a Discount Coupon?
                  </span>
                  {appliedCoupon && (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>

                {!appliedCoupon ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyCoupon(rawBase);
                          }
                        }}
                        placeholder="ENTER COUPON CODE"
                        className="w-full px-3.5 py-2 text-xs font-mono font-bold uppercase rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={validatingCoupon || !couponInput.trim()}
                      onClick={() => handleApplyCoupon(rawBase)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      {validatingCoupon ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <span>Apply</span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 mr-1.5">
                          {appliedCoupon.code}
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                          ({appliedCoupon.message})
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                      -₹{discount.toFixed(2)}
                    </span>
                  </div>
                )}

                {couponError && (
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{couponError}</span>
                  </div>
                )}
              </div>

              {/* Price & GST Breakdown Card */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Billing Cycle:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Monthly (30 Days Validity)</span>
                </div>

                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Base Price (Before Discount):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">₹{rawBase.toFixed(2)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Coupon Discount ({appliedCoupon.code}):
                    </span>
                    <span className="font-mono font-bold">- ₹{discount.toFixed(2)}</span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Discounted Taxable Amount:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">₹{effectiveBase.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                  <span>Applicable GST (18%):</span>
                  <span className="font-mono font-bold">+ ₹{gstAmount.toFixed(2)}</span>
                </div>

                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Total Payable Amount:</span>
                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-lg">₹{totalAmount.toFixed(2)}</span>
                    {appliedCoupon && (
                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        You save ₹{discount.toFixed(2)}!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 dark:bg-slate-950/60 rounded-xl border border-emerald-200/60 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <p>✓ <strong>Instant Activation:</strong> Tier upgrade turant active ho jayega.</p>
                <p>✓ <strong>Official GST Invoice:</strong> 18% GST (SAC 998313) Tax Receipt generate aur download hogi.</p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setPendingCheckoutPlan(null);
                    setCouponInput("");
                    setAppliedCoupon(null);
                    setCouponError(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    const planToBuy = pendingCheckoutPlan;
                    const code = appliedCoupon?.code || (couponInput.trim() ? couponInput.trim().toUpperCase() : undefined);
                    setPendingCheckoutPlan(null);
                    await handleBuyPlan(planToBuy, code);
                  }}
                  className="flex-[2] inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isBusy ? "Processing..." : `Pay ₹${totalAmount.toFixed(2)} with Razorpay`}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Invoice Celebration Modal */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payment Confirmed & Subscription Active!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Aapka plan upgrade ho chuka hai aur official GST Tax invoice generate ho gayi hai.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{completedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Item Description:</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{completedInvoice.itemDescription}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Paid (incl. 18% GST):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{completedInvoice.totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Payment ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{completedInvoice.gatewayPaymentId}</span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setCompletedInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const inv = completedInvoice;
                  setCompletedInvoice(null);
                  setActiveInvoice(inv);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>View & Print Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
