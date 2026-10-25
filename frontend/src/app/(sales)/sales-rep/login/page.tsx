"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { salesRepService } from "@/services/sales-rep-service";
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Building2,
} from "lucide-react";

export default function SalesRepLoginPage() {
  const router = useRouter();

  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [osVersion, setOsVersion] = useState("");

  const [deviceStatus, setDeviceStatus] = useState<
    "checking" | "registered_pending" | "ready" | "needs_registration"
  >("checking");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-detect or retrieve device fingerprint
  useEffect(() => {
    try {
      let fp = localStorage.getItem("udyogbill_device_fp");
      if (!fp) {
        // Generate pseudo-unique hardware fingerprint from screen, platform, crypto
        const array = new Uint32Array(4);
        window.crypto.getRandomValues(array);
        fp = "DEV-" + Array.from(array, (dec) => dec.toString(16).padStart(8, "0")).join("");
        localStorage.setItem("udyogbill_device_fp", fp);
      }
      setDeviceFingerprint(fp);

      // Extract device & OS info
      const ua = navigator.userAgent;
      let detectedOs = "Android / Mobile";
      if (ua.includes("Android")) {
        const match = ua.match(/Android\s([0-9\.]*)/);
        detectedOs = match ? `Android ${match[1]}` : "Android";
      } else if (ua.includes("iPhone") || ua.includes("iPad")) {
        detectedOs = "iOS Mobile";
      } else if (ua.includes("Windows")) {
        detectedOs = "Windows Desktop / Tablet";
      }
      setOsVersion(detectedOs);

      let detectedModel = "Field Mobile Handset";
      if (ua.includes("Samsung") || ua.includes("SM-")) {
        detectedModel = "Samsung Galaxy Handset";
        setDeviceBrand("Samsung");
      } else if (ua.includes("Xiaomi") || ua.includes("Redmi")) {
        detectedModel = "Redmi / Xiaomi Handset";
        setDeviceBrand("Xiaomi");
      } else if (ua.includes("OnePlus")) {
        detectedModel = "OnePlus Handset";
        setDeviceBrand("OnePlus");
      } else if (ua.includes("Vivo")) {
        detectedModel = "Vivo Handset";
        setDeviceBrand("Vivo");
      } else if (ua.includes("Realme")) {
        detectedModel = "Realme Handset";
        setDeviceBrand("Realme");
      } else {
        setDeviceBrand("Android Generic");
      }
      setDeviceModel(detectedModel);

      // Check if already logged in
      const currentRep = salesRepService.getCurrentRep();
      if (currentRep?.accessToken) {
        router.push("/sales-rep");
        return;
      }

      setDeviceStatus("ready");
    } catch {
      setDeviceStatus("ready");
    }
  }, [router]);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await salesRepService.registerDevice({
        deviceFingerprint,
        deviceModel: deviceModel || "Android Field Device",
        deviceBrand: deviceBrand || "Android",
        osVersion: osVersion || "Android Mobile",
      });
      setSuccessMsg(
        "Device registration submitted! Super Admin has been notified for IMEI approval."
      );
      setDeviceStatus("registered_pending");
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || "Device registration could not be submitted."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber || !password) {
      setErrorMsg("Mobile number and password are required.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await salesRepService.login({
        mobileNumber: mobileNumber.trim(),
        password,
        deviceFingerprint,
        deviceModel: deviceModel || "Android Field Device",
        deviceBrand: deviceBrand || "Android",
        osVersion: osVersion || "Android Mobile",
        appVersion: "v2.1",
      });
      router.push("/sales-rep");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Login failed. Check credentials or approval status.";
      setErrorMsg(msg);
      if (msg.toLowerCase().includes("pending")) {
        setDeviceStatus("registered_pending");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400 mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            UdyogBill Direct Sales Portal
          </h1>
          <p className="text-xs text-slate-400">
            Field Force Automation • Single-User Device Lock
          </p>
        </div>

        {/* Security / Device Fingerprint Badge */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>Bound Hardware Phone:</span>
            </div>
            <span className="font-mono text-[11px] text-indigo-300 font-bold">
              {deviceFingerprint ? deviceFingerprint.slice(0, 14) + "..." : "Detecting..."}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>{deviceModel}</span>
            <span>{osVersion}</span>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{successMsg}</div>
          </div>
        )}

        {/* Device Pending Approval Screen */}
        {deviceStatus === "registered_pending" && (
          <div className="bg-slate-800/90 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Device Approval Pending</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                This mobile phone is registered with Fingerprint ID{" "}
                <span className="font-mono text-amber-400 font-bold">
                  {deviceFingerprint?.slice(0, 12)}...
                </span>
                . Super Admin must approve and lock this device to your sales account before you can log in.
              </p>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-lg text-slate-400 text-xs">
              Please message your Area Manager or Super Admin to click &quot;Approve &amp; Lock&quot; in the admin panel.
            </div>
            <button
              onClick={() => setDeviceStatus("ready")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline"
            >
              Back to Login Form
            </button>
          </div>
        )}

        {/* Login Form */}
        {deviceStatus === "ready" && (
          <form
            onSubmit={handleLogin}
            className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4 text-xs"
          >
            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold">Registered Mobile Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-indigo-600/30"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Field Cockpit</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleRegisterDevice}
                disabled={loading}
                className="text-xs text-slate-400 hover:text-slate-300 transition"
              >
                Need to register this new device?{" "}
                <span className="text-indigo-400 underline font-semibold">
                  Request Device Approval
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Footer Security Note */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Single-Device Hardware Lock Active • Strict GPS Tracking</span>
        </div>
      </div>
    </div>
  );
}
