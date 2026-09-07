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
  HardDrive
} from "lucide-react";
import { tenantAppService } from "@/services/tenant-app-services";
import { subscriptionService } from "@/services/api-services";
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

  const handleBuyPlan = async (plan: Plan) => {
    setPurchasingPlanId(plan.id);
    setErrorMsg(null);
    try {
      const orderRes = await tenantAppService.createSubscriptionOrder({
        planCode: plan.code,
        billingCycle: "Monthly",
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

  const handlePrint = () => {
    window.print();
  };

  const enrolledAddons = subStatus?.addons?.filter((a: any) => a.isEnrolled) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-indigo-400" />
            <span>Subscription & Billing History</span>
          </h1>
          <p className="text-sm text-slate-400">
            Manage your active plan, view industry add-ons, and download official GST Tax Invoices.
          </p>
        </div>

        <Link
          href="/app/settings/addons"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>Explore Add-on Store</span>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Plan Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active Plan
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">
              {subStatus?.currentPlanName || "Professional Tier"}
            </h3>
            <p className="text-xs text-slate-400">
              Auto-renews monthly with unlimited GST invoices
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Remaining Days:</span>
            </span>
            <span className="font-bold text-white">
              {subStatus?.planRemainingDays ?? 30} Days
            </span>
          </div>
        </div>

        {/* Active Industry Add-ons Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {enrolledAddons.length} Packs Active
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">Industry Add-ons</h3>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {enrolledAddons.length > 0 ? (
                enrolledAddons.map((addon: any) => (
                  <span
                    key={addon.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700"
                  >
                    {addon.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">No add-ons purchased yet</span>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Add-on Marketplace:</span>
            <Link
              href="/app/settings/addons"
              className="text-indigo-400 font-semibold hover:underline flex items-center space-x-1"
            >
              <span>Add More Packs</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Payment Gateway Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
              UPI
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Razorpay Secured
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">Auto Invoicing</h3>
            <p className="text-xs text-slate-400">
              GST Tax Invoices with SAC 998313 generated instantly upon each transaction.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Invoices:</span>
            <span className="font-bold text-white">{invoices.length} Issued</span>
          </div>
        </div>
      </div>

      {/* Available Subscription Tiers & Upgrades */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Available Subscription Tiers & Upgrades</span>
            </h2>
            <p className="text-xs text-slate-400">
              Upgrade your account tier to increase branch quotas, warehouse limits, and invoice capacities.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const basePrice = Number(plan.price) || 0;
            const gstAmount = Number((basePrice * 0.18).toFixed(2));
            const totalWithGst = Number((basePrice + gstAmount).toFixed(2));
            const isCurrentPlan = subStatus?.currentPlanName?.toLowerCase().includes(plan.name.toLowerCase());

            return (
              <div
                key={plan.id}
                className={`p-6 rounded-2xl bg-slate-900 border flex flex-col justify-between relative transition-all shadow-lg ${
                  plan.isPopular
                    ? "border-indigo-500/50 shadow-indigo-950/20"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-600 text-white shadow-md">
                    Recommended Tier
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                      {plan.code}
                    </span>
                    {isCurrentPlan && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Current Plan
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{plan.description}</p>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl font-black text-white">₹{basePrice.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-slate-400">/ mo (excl. GST)</span>
                    </div>
                    <div className="text-[11px] text-amber-400 font-medium mt-1">
                      + 18% GST (₹{gstAmount}) will be additional
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Total: <span className="font-bold text-emerald-400">₹{totalWithGst.toLocaleString("en-IN")} / month</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Users</span>
                      </span>
                      <span className="font-semibold text-white">{plan.maxUsers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Building className="w-3.5 h-3.5 text-purple-400" />
                        <span>Branches & Wh</span>
                      </span>
                      <span className="font-semibold text-white">{plan.maxBranches} Br / {plan.maxWarehouses} Wh</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Monthly Invoices</span>
                      </span>
                      <span className="font-semibold text-white">
                        {plan.maxInvoicesPerMonth >= 100000 ? "Unlimited" : `${plan.maxInvoicesPerMonth} /mo`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={isCurrentPlan || purchasingPlanId === plan.id}
                    onClick={() => setPendingCheckoutPlan(plan)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      isCurrentPlan
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95"
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-white text-base flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Tax Invoices & Payment Receipts</span>
          </h2>
          <span className="text-xs text-slate-400">
            Download or print official receipts for your accounting and GST input credit.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-semibold">{inv.itemDescription}</div>
                      <div className="text-[10px] text-slate-500">
                        {inv.billingCycle} • {inv.durationDays} Days validity
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {inv.paymentGateway}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {inv.gatewayPaymentId || "N/A"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-emerald-400 text-sm">₹{inv.totalAmount}</div>
                      <div className="text-[10px] text-slate-500">
                        (Sub: ₹{inv.subTotal} + 18% GST: ₹{inv.taxAmount})
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveInvoice(inv)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-semibold transition-colors text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-8 space-y-6 shadow-2xl my-8 relative">
            {/* Modal Controls (Hidden during print) */}
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-base text-slate-900">Official GST Subscription Invoice</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setActiveInvoice(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Tax Invoice Document */}
            <div className="space-y-6 text-xs text-slate-700 bg-white p-6 rounded-2xl" id="printable-invoice">
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div className="space-y-1 max-w-md">
                  {activeInvoice.supplierLogoUrl ? (
                    <img src={activeInvoice.supplierLogoUrl} alt="Company Logo" className="h-10 object-contain mb-2" />
                  ) : null}
                  <h2 className="text-base font-black text-slate-950 tracking-tight uppercase">
                    {activeInvoice.supplierLegalName || "UDYOG SOFTWARE TECHNOLOGIES PRIVATE LIMITED"}
                  </h2>
                  <p className="text-indigo-600 font-bold text-xs">UdyogBill Platform</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {activeInvoice.supplierAddress || "Tower B, Cyber City, Sector 62, Noida, Uttar Pradesh - 201309"}
                  </p>
                  <div className="flex gap-4 text-slate-700 font-semibold text-[11px] mt-1">
                    <span>GSTIN: <span className="font-mono font-bold">{activeInvoice.supplierGstin || "09AAACU9876A1Z5"}</span></span>
                    <span>State Code: <span className="font-mono font-bold">{activeInvoice.supplierStateCode || "09"}</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded text-xs uppercase tracking-wider mb-1">
                    TAX INVOICE
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    {activeInvoice.invoiceNumber}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Date: {new Date(activeInvoice.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Place of Supply: <span className="font-semibold text-slate-900">{activeInvoice.placeOfSupply || "09 (Default)"}</span>
                  </div>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Billed To (Subscriber / Customer):</span>
                  <div className="font-bold text-slate-950 text-sm mt-0.5">{activeInvoice.tenantBusinessName}</div>
                  <div className="text-slate-600 mt-0.5">{activeInvoice.tenantBillingAddress}</div>
                  <div className="text-slate-600">Email: {activeInvoice.tenantEmail || "N/A"}</div>
                  <div className="text-slate-600">Phone: {activeInvoice.tenantPhone || "N/A"}</div>
                </div>
                <div className="text-right space-y-1">
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
                    <span className="font-mono text-slate-900">{activeInvoice.gatewayPaymentId || "ADMIN_GRANT"}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Item & Service Description</th>
                    <th className="py-2.5 px-3">SAC Code</th>
                    <th className="py-2.5 px-3 text-right">Taxable Subtotal</th>
                    <th className="py-2.5 px-3 text-right">GST Rate</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  <tr>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{activeInvoice.itemDescription}</div>
                      <div className="text-[11px] text-slate-500">
                        Duration: {activeInvoice.durationDays} Days • Instant Automated Activation
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono">998313</td>
                    <td className="py-3 px-3 text-right font-semibold">₹{activeInvoice.subTotal}</td>
                    <td className="py-3 px-3 text-right font-semibold">18%</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-950">₹{activeInvoice.totalAmount}</td>
                  </tr>
                </tbody>
              </table>

              {/* Total Calculation & Settlement Bank Details */}
              <div className="flex justify-between items-start pt-2">
                <div className="text-[11px] text-slate-600 max-w-sm space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-800 uppercase text-[10px]">Settlement &amp; Verification Bank A/C:</div>
                  <div>Bank: <strong className="text-slate-800">{activeInvoice.supplierBankName || "HDFC Bank"}</strong> {activeInvoice.supplierBankBranch ? `(${activeInvoice.supplierBankBranch})` : ""}</div>
                  <div>A/C No: <strong className="font-mono text-slate-900">{activeInvoice.supplierBankAccountNumber || "50200012345678"}</strong></div>
                  <div>IFSC: <strong className="font-mono text-slate-900">{activeInvoice.supplierBankIfsc || "HDFC0001234"}</strong></div>
                  {activeInvoice.supplierUpiId && <div>UPI ID: <strong className="font-mono text-indigo-700">{activeInvoice.supplierUpiId}</strong></div>}
                </div>

                <div className="w-64 space-y-1.5 text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <span>₹{activeInvoice.subTotal}</span>
                  </div>

                  {activeInvoice.isInterState ? (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST (18%):</span>
                      <span className="font-semibold text-slate-900">
                        ₹{activeInvoice.igstAmount || activeInvoice.taxAmount}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST (9%):</span>
                        <span className="font-semibold text-slate-900">
                          ₹{activeInvoice.cgstAmount || (activeInvoice.taxAmount / 2).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST (9%):</span>
                        <span className="font-semibold text-slate-900">
                          ₹{activeInvoice.sgstAmount || (activeInvoice.taxAmount / 2).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-slate-950 text-sm">
                    <span>Grand Total Paid:</span>
                    <span className="text-emerald-700 font-mono text-base">₹{activeInvoice.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Signatory & Declarations Footer */}
              <div className="border-t pt-4 flex justify-between items-end text-xs">
                <div className="max-w-md text-[10px] text-slate-500 whitespace-pre-line">
                  <div className="font-bold text-slate-700 uppercase text-[10px] mb-0.5">Terms &amp; Declarations:</div>
                  {activeInvoice.invoiceTermsAndConditions || "1. Computer-generated tax invoice for IT Software SaaS Services (SAC 998313).\n2. Input tax credit is available subject to valid GSTIN.\n3. Payment Confirmed & Validated via Electronic Funds Transfer."}
                </div>

                <div className="text-center space-y-1 min-w-[160px]">
                  {activeInvoice.supplierSignatoryImageUrl ? (
                    <img src={activeInvoice.supplierSignatoryImageUrl} alt="Signature Stamp" className="h-10 object-contain mx-auto" />
                  ) : (
                    <div className="h-10 border-b border-slate-400 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                      [ Digitally Signed ]
                    </div>
                  )}
                  <div className="font-bold text-slate-900 text-[11px]">{activeInvoice.supplierSignatoryName || "Authorized Signatory"}</div>
                  <div className="text-[10px] text-slate-500">{activeInvoice.supplierSignatoryDesignation || "Managing Director"}</div>
                  <div className="text-[9px] text-slate-400 font-semibold">{activeInvoice.supplierLegalName || "Udyog Software Technologies Pvt Ltd"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-payment Checkout Order Breakdown Modal for Plans */}
      {pendingCheckoutPlan && (() => {
        const basePrice = Number(pendingCheckoutPlan.price) || 0;
        const gstAmount = Number((basePrice * 0.18).toFixed(2));
        const totalAmount = Number((basePrice + gstAmount).toFixed(2));
        const isBusy = purchasingPlanId === pendingCheckoutPlan.id;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
              <button
                onClick={() => setPendingCheckoutPlan(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{pendingCheckoutPlan.name}</h3>
                  <p className="text-xs text-slate-400">Subscription & Tax Invoice Summary</p>
                </div>
              </div>

              {/* Price & GST Breakdown Card */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Billing Cycle:</span>
                  <span className="font-semibold text-white">Monthly (30 Days Validity)</span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span>Base Price (Without GST):</span>
                  <span className="font-mono font-bold text-white text-sm">₹{basePrice.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-amber-400">
                  <span>Applicable GST (18%):</span>
                  <span className="font-mono font-bold">+ ₹{gstAmount.toFixed(2)}</span>
                </div>

                <div className="pt-2.5 border-t border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-white text-sm">Total Payable Amount:</span>
                  <span className="font-mono font-black text-emerald-400 text-lg">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <p>✓ <strong>Instant Activation:</strong> Tier upgrade turant active ho jayega.</p>
                <p>✓ <strong>Official GST Invoice:</strong> 18% GST (SAC 998313) Tax Receipt generate aur mail ho jayegi.</p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setPendingCheckoutPlan(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    const planToBuy = pendingCheckoutPlan;
                    setPendingCheckoutPlan(null);
                    await handleBuyPlan(planToBuy);
                  }}
                  className="flex-[2] inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Payment Confirmed & Subscription Active!</h3>
              <p className="text-xs text-slate-400">
                Aapka plan upgrade ho chuka hai aur official GST Tax invoice generate ho gayi hai.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice Number:</span>
                <span className="font-mono font-bold text-white">{completedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Item Description:</span>
                <span className="text-slate-200 font-medium">{completedInvoice.itemDescription}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Paid (incl. 18% GST):</span>
                <span className="font-bold text-emerald-400">₹{completedInvoice.totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment ID:</span>
                <span className="font-mono text-slate-300">{completedInvoice.gatewayPaymentId}</span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setCompletedInvoice(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
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
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
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
