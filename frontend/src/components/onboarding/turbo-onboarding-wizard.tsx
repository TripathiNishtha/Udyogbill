"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Building2,
  Receipt,
  QrCode,
  Share2,
  X,
  Package,
  Check,
  Zap,
  HelpCircle
} from "lucide-react";
// Dynamic xlsx loader
import { onboardingService, GstinLookupData } from "@/services/onboarding-service";
import {
  SOFTWARE_PRESETS,
  autoMapColumns,
  transformToStandardProducts,
  parseCsvText,
  StandardProductRow
} from "@/lib/fuzzy-migrator";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
  isHi?: boolean;
}

export function TurboOnboardingWizard({ isOpen, onClose, onCompleted, isHi }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: GST & Store Setup
  const [gstin, setGstin] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("pharma");
  const [gstData, setGstData] = useState<GstinLookupData | null>(null);
  const [loadingGst, setLoadingGst] = useState(false);
  const [gstError, setGstError] = useState("");

  // Step 2: Universal Migrator
  const [selectedSoftware, setSelectedSoftware] = useState<string>("marg");
  const [parsedProducts, setParsedProducts] = useState<StandardProductRow[]>([]);
  const [importingData, setImportingData] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState("");
  const [fileName, setFileName] = useState("");

  // Step 3: First Invoice
  const [customerName, setCustomerName] = useState("Cash Customer (Walk-in)");
  const [selectedItemName, setSelectedItemName] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(100);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);

  // Step 4: UPI & WhatsApp
  const [upiId, setUpiId] = useState("");
  const [finishing, setFinishing] = useState(false);

  if (!isOpen) return null;

  // 1. Live GSTIN Auto-Fill
  const handleGstinLookup = async () => {
    if (!gstin || gstin.trim().length < 15) {
      setGstError(isHi ? "कृपया 15-अंकों का वैध GSTIN डालें" : "Please enter a valid 15-character GSTIN");
      return;
    }
    try {
      setLoadingGst(true);
      setGstError("");
      const res = await onboardingService.lookupGstin(gstin.trim());
      setGstData(res);
      if (!businessName) setBusinessName(res.tradeName || res.legalName || "Apex Pharma Care");
    } catch (err: any) {
      setGstError(err?.response?.data?.errorMessage || "GSTIN lookup failed. Please check format.");
    } finally {
      setLoadingGst(false);
    }
  };

  // 2. Drag & Drop Excel Parser
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        const parsed = parseCsvText(text);
        if (parsed.rows.length > 0) {
          const mapping = autoMapColumns(parsed.headers, "item", selectedSoftware);
          const standardList = transformToStandardProducts(parsed.rows, mapping, 12);
          setParsedProducts(standardList);
          if (standardList.length > 0) {
            setSelectedItemName(standardList[0].name);
            setItemPrice(standardList[0].salePrice || 100);
          }
        }
      } else {
        const XLSX = await import("xlsx");
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: "array" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

        if (rawJson.length > 0) {
          const headers = Object.keys(rawJson[0]);
          const mapping = autoMapColumns(headers, "item", selectedSoftware);
          const standardList = transformToStandardProducts(rawJson, mapping, 12);
          setParsedProducts(standardList);
          if (standardList.length > 0) {
            setSelectedItemName(standardList[0].name);
            setItemPrice(standardList[0].salePrice || 100);
          }
        }
      }
    } catch (err) {
      alert("Failed to parse file. Please ensure it is a valid .xlsx, .xls, or .csv file.");
    }
  };

  // 2B. 1-Click Pre-seeded Catalog Seeder
  const handleSeedCatalog = async () => {
    try {
      setImportingData(true);
      const res = await onboardingService.seedIndustryCatalog(selectedIndustry);
      setImportSuccessMsg(isHi ? `✅ ${res.seededCount} प्रोडक्ट्स लोड हो गए!` : `✅ Loaded ${res.seededCount} standard industry products!`);
      if (res.sampleItemNames?.length > 0) {
        setSelectedItemName(res.sampleItemNames[0]);
      }
      setTimeout(() => setStep(3), 1200);
    } catch (err: any) {
      alert("Failed to load pre-seeded catalog.");
    } finally {
      setImportingData(false);
    }
  };

  // 2C. Confirm Imported Products
  const handleConfirmImport = async () => {
    if (parsedProducts.length === 0) return;
    try {
      setImportingData(true);
      await onboardingService.importMigratedProducts(parsedProducts);
      setImportSuccessMsg(isHi ? `✅ ${parsedProducts.length} प्रोडक्ट्स इम्पोर्ट हो गए!` : `✅ Successfully imported ${parsedProducts.length} items!`);
      setTimeout(() => setStep(3), 1000);
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || err?.message || "Failed to import products.");
    } finally {
      setImportingData(false);
    }
  };

  // 4. Complete Onboarding
  const handleFinishOnboarding = async () => {
    try {
      setFinishing(true);
      await onboardingService.completeOnboarding({
        businessName: businessName || "Apex Pharma Care",
        gstin: gstin || gstData?.gstin || "09AAACH7409R1ZZ",
        state: gstData?.state || "Uttar Pradesh",
        stateCode: gstData?.stateCode || "09",
        upiId: upiId || `${phone || "9876543210"}@upi`,
        primaryPhone: phone || "9876543210"
      });
      onCompleted();
      onClose();
    } catch (err) {
      onCompleted();
      onClose();
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Wizard Header & Progress Bar */}
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>{isHi ? "10-मिनट क्विक ऑनबोर्डिंग" : "10-Minute Turbo Onboarding Wizard"}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {step === 1 && (isHi ? "1. दुकान व GST विवरण सेटअप करें" : "1. Setup Store & GST Identity")}
            {step === 2 && (isHi ? "2. पुराना डेटा UdyogBill में ट्रांसफर करें" : "2. 1-Click Universal Data Migrator")}
            {step === 3 && (isHi ? "3. अपना पहला GST बिल बनाएं" : "3. Generate Your First GST Bill")}
            {step === 4 && (isHi ? "4. WhatsApp शेयर व UPI QR चालू करें" : "4. Activate WhatsApp & UPI QR")}
          </h2>

          {/* Stepper bar */}
          <div className="flex items-center space-x-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  step >= s ? "bg-indigo-500 shadow-xs shadow-indigo-500/50" : "bg-slate-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* ─── STEP 1: GST & Store Setup ────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-start space-x-3">
              <Zap className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-white">{isHi ? "मैजिक ऑटो-फिल:" : "Smart Auto-Fill:"}</span>{" "}
                {isHi
                  ? "सिर्फ अपना 15-अंकों का GSTIN डालें, राज्य व पैन कोड स्वतः भर जाएगा।"
                  : "Enter your 15-digit GSTIN, and your State, PAN, and Tax Rules will be auto-configured in 1 second."}
              </div>
            </div>

            {/* GSTIN Input with lookup */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">{isHi ? "GSTIN नंबर *" : "GSTIN Number *"}</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g. 09AAACH7409R1ZZ"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 uppercase font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleGstinLookup}
                  disabled={loadingGst}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {loadingGst ? (isHi ? "खोज रहे हैं..." : "Verifying...") : (isHi ? "वेरिफाई करें" : "Auto-Fill")}
                </button>
              </div>
              {gstError && <p className="text-[11px] text-rose-400 font-semibold">{gstError}</p>}
            </div>

            {/* GST Parsed Info Badge */}
            {gstData && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs space-y-1 animate-in fade-in">
                <div className="flex items-center space-x-2 text-emerald-400 font-black">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isHi ? "GST विवरण सत्यापित:" : "GSTIN Verified Successfully"}</span>
                </div>
                <div className="text-slate-300 font-medium grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-500">{isHi ? "राज्य:" : "State:"}</span>{" "}
                    <span className="font-bold text-white">{gstData.state} ({gstData.stateCode})</span>
                  </div>
                  <div>
                    <span className="text-slate-500">{isHi ? "पैन नंबर:" : "PAN:"}</span>{" "}
                    <span className="font-bold text-white font-mono">{gstData.pan}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Store Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{isHi ? "दुकान / फ़र्म का नाम *" : "Business / Store Name *"}</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Pharma Care"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{isHi ? "मोबाइल नंबर (WhatsApp) *" : "Mobile (WhatsApp) *"}</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Industry Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">{isHi ? "अपना व्यापार प्रकार चुनें:" : "Select Industry Type:"}</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { id: "pharma", label: "💊 Pharma", desc: "Batch & Exp" },
                  { id: "fmcg", label: "🛒 Grocery", desc: "FMCG / Retail" },
                  { id: "garments", label: "👗 Garments", desc: "Size & Color" },
                  { id: "electronics", label: "📱 Tech", desc: "Serial / IMEI" },
                  { id: "general", label: "🏭 General", desc: "Standard B2B" }
                ].map((ind) => (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => setSelectedIndustry(ind.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedIndustry === ind.id
                        ? "bg-indigo-950/60 border-indigo-500 text-white shadow-md shadow-indigo-500/20"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-xs font-black truncate">{ind.label}</div>
                    <div className="text-[10px] text-slate-500 truncate">{ind.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <span>{isHi ? "आगे बढ़ें (डेटा ट्रांसफर)" : "Continue to Data Migration"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: 1-Click Universal Migrator ──────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
            {/* Software Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isHi ? "पुराना सॉफ्टवेयर चुनें (ऑटो-कॉलम मैपिंग के लिए):" : "Select Your Previous Software:"}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Object.entries(SOFTWARE_PRESETS).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedSoftware(key)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedSoftware === key
                        ? "bg-indigo-950/60 border-indigo-500 text-white shadow-md shadow-indigo-500/20"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-sm mb-0.5">{item.icon}</div>
                    <div className="text-[11px] font-bold truncate">{item.label}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedSoftware("custom")}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedSoftware === "custom"
                      ? "bg-indigo-950/60 border-indigo-500 text-white shadow-md shadow-indigo-500/20"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="text-sm mb-0.5">📄</div>
                  <div className="text-[11px] font-bold truncate">Excel/CSV</div>
                </button>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/70 rounded-2xl p-5 text-center transition-colors bg-slate-900/40 space-y-2">
              <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto" />
              <div>
                <p className="text-xs font-bold text-white">
                  {fileName ? `📄 ${fileName}` : isHi ? "पुराने सॉफ्टवेयर की Excel/CSV फाइल यहाँ डालें" : "Drag & Drop your Excel/CSV export file here"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isHi ? "सिस्टम खुद Name, MRP, Rate, HSN और Stock को पहचान लेगा।" : "Smart fuzzy engine automatically maps Product, MRP, Rate, HSN & Stock."}
                </p>
              </div>
              <label className="inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors shadow-xs">
                <span>{isHi ? "फाइल चुनें (.xlsx, .xls, .csv)" : "Browse File (.xlsx, .xls, .csv)"}</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Parsed Preview Grid */}
            {parsedProducts.length > 0 && (
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-emerald-400 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{parsedProducts.length} {isHi ? "आइटम तैयार हैं" : "Items Ready to Import"}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={importingData}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {importingData ? (isHi ? "इम्पोर्ट हो रहा है..." : "Importing...") : (isHi ? "🚀 1-क्लिक इम्पोर्ट करें" : "🚀 1-Click Import All")}
                  </button>
                </div>
                <div className="max-h-28 overflow-y-auto divide-y divide-slate-800 text-[11px]">
                  {parsedProducts.slice(0, 3).map((p, idx) => (
                    <div key={idx} className="py-1 flex items-center justify-between text-slate-300">
                      <span className="font-semibold truncate max-w-[220px]">{p.name}</span>
                      <span className="font-mono text-emerald-400">₹{p.salePrice} (Qty: {p.openingStock})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Option B: Pre-loaded Catalog Alternative */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isHi ? "एक्सेल फाइल नहीं है?" : "Don't have an Excel file?"}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isHi ? "रेडीमेड 2,000 टॉप बिकने वाले आइटम्स 1-क्लिक में लोड करें।" : "1-click load pre-seeded library of top 2,000 industry products."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSeedCatalog}
                disabled={importingData}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {importingData ? "Loading..." : isHi ? "📦 रेडीमेड कैटलॉग लोड करें" : "📦 Load Ready Catalog"}
              </button>
            </div>

            {importSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center space-x-1 px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isHi ? "पीछे" : "Back"}</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <span>{isHi ? "आगे बढ़ें (पहला बिल बनाएं)" : "Continue to First Invoice"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: First Guided Invoice ────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-start space-x-3">
              <Receipt className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-white">{isHi ? "पहला बिल बनाएं (Aha! Moment):" : "Create Your First Live Bill:"}</span>{" "}
                {isHi
                  ? "नीचे 1 आइटम चुनें और देखें कि आपका बिल आपकी दुकान के नाम के साथ कितना शानदार दिखता है।"
                  : "Pick 1 item below and experience how crisp your GST invoice looks with your company branding."}
              </div>
            </div>

            {/* Mini Invoice Form */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{isHi ? "ग्राहक का नाम" : "Customer Name"}</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{isHi ? "प्रोडक्ट / दवाई का नाम" : "Product / Medicine"}</label>
                  <input
                    type="text"
                    value={selectedItemName || "Dolo 650mg Tablet (Strip of 15)"}
                    onChange={(e) => setSelectedItemName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{isHi ? "मात्रा (Quantity)" : "Quantity"}</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{isHi ? "रेट (₹)" : "Selling Rate (₹)"}</label>
                  <input
                    type="number"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Live Mini Preview Box */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-black text-white">{businessName || "Apex Pharma Care"}</div>
                  <div className="text-[10px] text-slate-400 font-mono">GSTIN: {gstin || "09AAACH7409R1ZZ"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400">{isHi ? "कुल बिल राशि" : "Invoice Total"}</div>
                  <div className="text-base font-black font-mono text-emerald-400">
                    ₹{(itemQty * itemPrice).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center space-x-1 px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isHi ? "पीछे" : "Back"}</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <span>{isHi ? "आगे बढ़ें (UPI व WhatsApp)" : "Continue to WhatsApp & UPI"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: WhatsApp & UPI QR Activation ────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-white">{isHi ? "बधाई हो! आपका सेटअप लगभग तैयार है" : "Almost Done! Final 2 Quick Touches:"}</span>{" "}
                {isHi
                  ? "अपना UPI ID दर्ज करें ताकि आपके इनवॉइस पर पेमेंट QR कोड स्वतः छप सके।"
                  : "Enter your UPI ID so your invoices automatically print your dynamic payment QR code."}
              </div>
            </div>

            {/* UPI ID Setup */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">{isHi ? "दुकान का UPI ID (QR पेमेंट के लिए) *" : "Store UPI ID (For Payment QR) *"}</label>
              <div className="relative">
                <QrCode className="w-4 h-4 text-indigo-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. 9876543210@paytm or apexpharma@icici"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* WhatsApp Test Trigger */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>{isHi ? "WhatsApp पर टेस्ट इनवॉइस भेजें" : "Test Invoice on WhatsApp"}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isHi ? "देखें कि आपके ग्राहक को WhatsApp पर बिल कैसा दिखेगा।" : "Send a live invoice summary to your own WhatsApp."}
                </p>
              </div>
              <a
                href={`https://api.whatsapp.com/send?phone=91${phone.replace(/[^0-9]/g, "")}&text=${encodeURIComponent(
                  `🧾 Tax Invoice from ${businessName || "Apex Pharma Care"}\nInvoice: INV-2026-001\nAmount: ₹${(itemQty * itemPrice).toFixed(2)}\nThank you for your business!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                <span>{isHi ? "📲 टेस्ट शेयर" : "📲 Send Test"}</span>
              </a>
            </div>

            {/* Step 4 Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center space-x-1 px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isHi ? "पीछे" : "Back"}</span>
              </button>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={finishing}
                className="flex items-center space-x-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:opacity-95 text-white text-sm font-black shadow-xl shadow-indigo-600/40 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{finishing ? (isHi ? "सेव हो रहा है..." : "Completing...") : (isHi ? "🚀 UdyogBill शुरू करें!" : "🚀 Launch My UdyogBill!")}</span>
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
