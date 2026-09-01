"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Tag,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  CreditCard,
  Lock,
  Receipt,
  FileText,
  X,
  ExternalLink,
  Check
} from "lucide-react";
import { ALL_ADDONS, AddonManifest } from "@/addons/addon-registry";
import { useAddons } from "@/context/addon-context";
import { tenantAppService } from "@/services/tenant-app-services";
import { platformCouponService, ValidateCouponResponse } from "@/services/coupon-service";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function IndustryAddonsPage() {
  const { isAddonActive, toggleAddon, loading, activeAddons, refreshConfig } = useAddons();
  const [subStatus, setSubStatus] = useState<any | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(true);

  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  // Pre-payment Order Breakdown Modal
  const [pendingCheckoutAddon, setPendingCheckoutAddon] = useState<AddonManifest | null>(null);
  const [checkoutCycle, setCheckoutCycle] = useState<"Monthly" | "Annual">("Monthly");

  // Success Modal with Invoice Link
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);

  // Coupon State for Checkout
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResponse | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const handleApplyCoupon = async (orderAmount: number) => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await platformCouponService.validateCoupon(couponCode.trim(), "ADDON", orderAmount);
      if (res.isValid) {
        setAppliedCoupon(res);
      } else {
        setCouponError(res.message || "Invalid coupon code");
      }
    } catch (err: any) {
      setCouponError(err.message || "Failed to validate coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };


  const loadSubscriptionInfo = async () => {
    try {
      setLoadingPricing(true);
      const data = await tenantAppService.getSubscriptionStatus();
      setSubStatus(data);
    } catch (err: any) {
      console.warn("Could not load subscription pricing", err);
    } finally {
      setLoadingPricing(false);
    }
  };

  useEffect(() => {
    loadSubscriptionInfo();
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

  const getAddonCatalogPrice = (addonId: string, cycle: "Monthly" | "Annual" = "Monthly"): number => {
    const code = `ADDON_${addonId.toUpperCase()}`;
    const item = subStatus?.addons?.find((a: any) => a.code === code);
    const mPrice = Number(item?.price) || (addonId === "manufacturing" ? 599 : addonId === "garments" || addonId === "fmcg" ? 399 : 499);
    if (cycle === "Annual") {
      return item?.annualPrice ? Number(item.annualPrice) : Math.round(mPrice * 10);
    }
    return mPrice;
  };

  const handleBuyAddon = async (addon: AddonManifest, cycle: "Monthly" | "Annual" = "Monthly") => {
    setPurchasingId(addon.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const addonCode = `ADDON_${addon.id.toUpperCase()}`;
      const orderRes = await tenantAppService.createSubscriptionOrder({
        addonCode,
        billingCycle: cycle,
      });

      const isRzpReady = await loadRazorpayScript();

      if (isRzpReady && window.Razorpay && orderRes.keyId.startsWith("rzp_")) {
        const options = {
          key: orderRes.keyId,
          amount: orderRes.amountInPaisa,
          currency: orderRes.currency || "INR",
          name: "UdyogBill Enterprise",
          description: orderRes.description,
          order_id: orderRes.orderId,
          prefill: {
            email: orderRes.customerEmail,
            contact: orderRes.customerPhone,
          },
          theme: {
            color: "#4f46e5",
          },
          handler: async (response: any) => {
            try {
              const confirmRes = await tenantAppService.confirmSubscriptionPayment({
                razorpayOrderId: response.razorpay_order_id || orderRes.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature || "simulated_signature",
                addonCode,
                billingCycle: cycle,
              });

              setCompletedInvoice(confirmRes);
              await refreshConfig();
              await loadSubscriptionInfo();
              setSuccessMsg(`"${addon.name}" सफलतापूर्वक सक्रिय हो गया है! इनवॉइस जनरेट हो गई है।`);
            } catch (confirmErr: any) {
              setErrorMsg(confirmErr.message || "Payment verification failed.");
            } finally {
              setPurchasingId(null);
            }
          },
          modal: {
            ondismiss: () => {
              setPurchasingId(null);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Safe Sandbox Fallback Mode (Test simulation if offline or test mode)
        const confirmRes = await tenantAppService.confirmSubscriptionPayment({
          razorpayOrderId: orderRes.orderId,
          razorpayPaymentId: `pay_sim_${Date.now()}`,
          razorpaySignature: "simulated_test_sig",
          addonCode,
          billingCycle: "Monthly",
        });

        setCompletedInvoice(confirmRes);
        await refreshConfig();
        await loadSubscriptionInfo();
        setSuccessMsg(`"${addon.name}" Test Activation Successful! Invoiced generated.`);
        setPurchasingId(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Order checkout initiation failed.");
      setPurchasingId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-xl shadow-indigo-950/20">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Razorpay Instant Automated Activation</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Industry Add-on Store & Online Billing
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              ऑनलाइन Razorpay से किसी भी ऐड-ऑन का सब्सक्रिप्शन लें। पेमेंट होते ही ऐड-ऑन तुरंत लाइव हो जाएगा और टैक्स इनवॉइस अपने आप बन जाएगी।
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/app/settings/billing"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900/90 hover:bg-slate-850 text-white rounded-xl text-xs font-bold border border-slate-700 shadow-md transition-all"
            >
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>View Invoices & Billing History</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          {completedInvoice && (
            <Link
              href="/app/settings/billing"
              className="text-xs text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Invoice #{completedInvoice.invoiceNumber}</span>
            </Link>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-sm flex items-center space-x-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add-ons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ALL_ADDONS.map((addon) => {
          const isActive = isAddonActive(addon.id);
          const price = getAddonCatalogPrice(addon.id);
          const isBusy = purchasingId === addon.id;
          const Icon = addon.icon;
          const addonCode = `ADDON_${addon.id.toUpperCase()}`;
          const enrolledInfo = subStatus?.addons?.find((a: any) => a.code === addonCode);

          return (
            <div
              key={addon.id}
              className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-lg ${
                isActive
                  ? "bg-slate-900/90 border-indigo-500/30 hover:border-indigo-500/50 shadow-indigo-950/20"
                  : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              {/* Card Body */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${
                        isActive
                          ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30"
                          : "bg-slate-900 text-slate-500 border-slate-800"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{addon.name}</h3>
                      {addon.titleHindi && (
                        <p className="text-xs text-indigo-400/90 font-medium">{addon.titleHindi}</p>
                      )}
                    </div>
                  </div>

                  {/* Price Tag */}
                  <div className="text-right">
                    <div className="text-base font-extrabold text-emerald-400">₹{price}</div>
                    <div className="text-[10px] text-slate-400">/ month (excl. GST)</div>
                    <div className="text-[9px] text-amber-400 font-medium mt-0.5">
                      + 18% GST (₹{(price * 0.18).toFixed(2)})
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {addon.description}
                </p>

                {/* Highlights */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Included Capabilities
                  </span>
                  <ul className="space-y-1">
                    {addon.highlights.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-center space-x-2">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? "text-indigo-400" : "text-slate-600"
                          }`}
                        />
                        <span className="truncate">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button Section */}
              <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-800/60 flex items-center justify-between">
                {isActive ? (
                  <>
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-400">Active &amp; Enrolled</span>
                      </div>
                      {enrolledInfo?.enrolledExpiresAtUtc ? (
                        <p className="text-[10px] text-slate-400 font-mono">
                          Valid till {new Date(enrolledInfo.enrolledExpiresAtUtc).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {enrolledInfo.remainingDays > 0 && ` (${enrolledInfo.remainingDays}d left)`}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-mono">Active Subscription</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      {addon.sidebarNavGroup?.items[0] && (
                        <Link
                          href={addon.sidebarNavGroup.items[0].href}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-slate-400 font-medium">
                      Not Enrolled
                    </div>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setPendingCheckoutAddon(addon)}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{isBusy ? "Opening..." : `Pay ₹${(price * 1.18).toFixed(0)} & Activate`}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pre-payment Checkout Order Breakdown Modal */}
      {pendingCheckoutAddon && (() => {
        const basePrice = getAddonCatalogPrice(pendingCheckoutAddon.id, checkoutCycle);
        const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
        const taxableBase = Math.max(0, basePrice - discountAmount);
        const gstAmount = Number((taxableBase * 0.18).toFixed(2));
        const totalAmount = Number((taxableBase + gstAmount).toFixed(2));
        const isBusy = purchasingId === pendingCheckoutAddon.id;
        const Icon = pendingCheckoutAddon.icon;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
              <button
                onClick={() => {
                  setPendingCheckoutAddon(null);
                  setAppliedCoupon(null);
                  setCouponCode("");
                  setCouponError(null);
                }}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{pendingCheckoutAddon.name}</h3>
                  <p className="text-xs text-slate-400">Choose Cycle &amp; Tax Invoice Summary</p>
                </div>
              </div>

              {/* Billing Cycle Switcher Tabs */}
              <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setCheckoutCycle("Monthly"); setAppliedCoupon(null); }}
                  className={"flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer " + (checkoutCycle === "Monthly" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white")}
                >
                  Monthly (30 Days)
                </button>
                <button
                  type="button"
                  onClick={() => { setCheckoutCycle("Annual"); setAppliedCoupon(null); }}
                  className={"flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer " + (checkoutCycle === "Annual" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white")}
                >
                  <span>Yearly (365 Days)</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black">SAVE 17%</span>
                </button>
              </div>

              {/* 🏷️ Coupon Code Input Box */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    Have a Promo / Coupon Code?
                  </span>
                  {appliedCoupon && (
                    <button
                      type="button"
                      onClick={() => { setAppliedCoupon(null); setCouponCode(""); setCouponError(null); }}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {!appliedCoupon ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. WELCOME50, FLAT500"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold tracking-wider placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      disabled={validatingCoupon || !couponCode.trim()}
                      onClick={() => handleApplyCoupon(basePrice)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {validatingCoupon ? "..." : "Apply"}
                    </button>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-mono font-bold">{appliedCoupon.couponCode}</span>
                        <span className="text-[11px] text-emerald-400/90 ml-2">✓ ₹{appliedCoupon.discountAmount} discount applied</span>
                      </div>
                    </div>
                  </div>
                )}
                {couponError && <p className="text-[11px] text-rose-400">{couponError}</p>}
              </div>

              {/* Price & GST Breakdown Card */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Selected Duration:</span>
                  <span className="font-semibold text-white">
                    {checkoutCycle === "Annual" ? "1 Year (365 Days Validity)" : "1 Month (30 Days Validity)"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span>Base Catalog Price:</span>
                  <span className="font-mono font-bold text-white">₹{basePrice.toFixed(2)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>Coupon Discount:</span>
                    <span className="font-mono font-bold">- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-amber-400">
                  <span>Applicable GST (18%):</span>
                  <span className="font-mono font-bold">+ ₹{gstAmount.toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-white text-sm">Total Payable Amount:</span>
                  <span className="font-mono font-black text-emerald-400 text-lg">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[10px] text-slate-400 space-y-0.5">
                <p>✓ <strong>Instant Activation:</strong> Payment confirm hote hi add-on activate ho jayega.</p>
                <p>✓ <strong>Official GST Invoice:</strong> 18% GST (SAC 998313) Tax Receipt mail ho jayegi.</p>
              </div>

              <div className="flex items-center space-x-3 pt-1">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setPendingCheckoutAddon(null);
                    setAppliedCoupon(null);
                    setCouponCode("");
                    setCouponError(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    const addonToBuy = pendingCheckoutAddon;
                    const cycleToBuy = checkoutCycle;
                    setPendingCheckoutAddon(null);
                    setAppliedCoupon(null);
                    setCouponCode("");
                    if (addonToBuy) {
                      await handlePurchaseAddon(addonToBuy, cycleToBuy);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isBusy ? "Processing..." : ("Pay ₹" + totalAmount.toFixed(2) + " via UPI/Card")}
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
              <h3 className="text-lg font-bold text-white">Payment Confirmed & Add-on Activated!</h3>
              <p className="text-xs text-slate-400">
                आपका ऐड-ऑन तुरंत एक्टिवेट कर दिया गया है और साइडबार में दिखना शुरू हो गया है।
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
              <Link
                href="/app/settings/billing"
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>View Full Invoice & Print</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
