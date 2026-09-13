"use client";

import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Calendar,
  CreditCard,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  X,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Share2,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Package,
  Layers,
  Receipt,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Eye,
  Building2,
  Clock,
  AlertTriangle,
  FileCheck2,
  Send
} from "lucide-react";
import * as XLSX from "xlsx";
import { partyService, RecordPaymentInput } from "@/services/party-services";
import { salesService } from "@/services/sales-services";
import { tenantAppService } from "@/services/tenant-app-services";
import {
  PartyStatement,
  PartyDetails,
  SalesInvoiceList,
  SalesInvoiceDetails,
  TenantDetails
} from "@/types";
import { parseLicensesFromParty, LICENSE_PRESETS } from "@/components/parties/party-license-editor";
import { generateInvoicePdfBlob, downloadBlob } from "@/lib/invoice-pdf-helper";
import { printRawHtml } from "@/lib/print-helper";

type LedgerViewMode = "standard" | "invoices" | "detailed";

export default function PartyLedgerStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;

  const [statement, setStatement] = useState<PartyStatement | null>(null);
  const [party, setParty] = useState<PartyDetails | null>(null);
  const [profile, setProfile] = useState<TenantDetails | null>(null);
  const [invoices, setInvoices] = useState<SalesInvoiceList[]>([]);
  const [detailedInvoices, setDetailedInvoices] = useState<Record<string, SalesInvoiceDetails>>({});
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  const [viewMode, setViewMode] = useState<LedgerViewMode>("standard");
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Sharing Modals
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sharePhone, setSharePhone] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareCustomNotes, setShareCustomNotes] = useState("");

  // Date filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payForm, setPayForm] = useState<RecordPaymentInput>({
    partyId: partyId,
    transactionDate: new Date().toISOString().split("T")[0],
    amount: 0,
    paymentMode: "UPI",
    referenceNumber: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Hidden / Printable Container Ref
  const printableRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stmt, pty, prof] = await Promise.all([
        partyService.getStatement(partyId, fromDate, toDate),
        partyService.getCustomerById(partyId).catch(() => partyService.getSupplierById(partyId)),
        tenantAppService.getBusinessProfile().catch(() => null),
      ]);
      setStatement(stmt);
      setParty(pty);
      setProfile(prof);

      if (pty?.mobile) setSharePhone(pty.mobile);
      if (pty?.email) setShareEmail(pty.email);

      // If customer, fetch their invoices for the period
      const isCust = pty?.partyType === 1 || pty?.partyType === 3;
      if (isCust) {
        try {
          const invRes = await salesService.getInvoices({
            partyId,
            fromDate,
            toDate,
            pageSize: 150,
          });
          setInvoices(invRes.items || []);
        } catch (e) {
          console.error("Failed to load customer invoices", e);
        }
      }
    } catch (err) {
      console.error("Failed to load party statement", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [partyId]);

  const isCustomer = party?.partyType === 1 || party?.partyType === 3;

  // Fetch invoice details when expanding
  const fetchSingleInvoiceDetails = async (invoiceId: string) => {
    if (detailedInvoices[invoiceId]) return;
    try {
      const details = await salesService.getInvoiceById(invoiceId);
      setDetailedInvoices((prev) => ({ ...prev, [invoiceId]: details }));
    } catch (err) {
      console.error(`Failed to fetch details for invoice ${invoiceId}`, err);
    }
  };

  const toggleInvoiceExpand = async (invoiceId: string) => {
    const next = new Set(expandedInvoices);
    if (next.has(invoiceId)) {
      next.delete(invoiceId);
      setExpandedInvoices(next);
    } else {
      next.add(invoiceId);
      setExpandedInvoices(next);
      if (!detailedInvoices[invoiceId]) {
        await fetchSingleInvoiceDetails(invoiceId);
      }
    }
  };

  const handleExpandAll = async () => {
    const allIds = invoices.map((i) => i.id);
    setExpandedInvoices(new Set(allIds));
    const missing = allIds.filter((id) => !detailedInvoices[id]);
    if (missing.length > 0) {
      setLoadingDetails(true);
      try {
        const results = await Promise.all(
          missing.map((id) => salesService.getInvoiceById(id).catch(() => null))
        );
        setDetailedInvoices((prev) => {
          const updated = { ...prev };
          results.forEach((res) => {
            if (res) updated[res.id] = res;
          });
          return updated;
        });
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  const handleCollapseAll = () => {
    setExpandedInvoices(new Set());
  };

  // Load details when switching to detailed mode if needed
  const handleViewModeChange = async (mode: LedgerViewMode) => {
    setViewMode(mode);
    if (mode === "detailed" && invoices.length > 0) {
      const allIds = invoices.map((i) => i.id);
      setExpandedInvoices(new Set(allIds));
      const missing = allIds.filter((id) => !detailedInvoices[id]);
      if (missing.length > 0) {
        setLoadingDetails(true);
        try {
          const results = await Promise.all(
            missing.map((id) => salesService.getInvoiceById(id).catch(() => null))
          );
          setDetailedInvoices((prev) => {
            const updated = { ...prev };
            results.forEach((res) => {
              if (res) updated[res.id] = res;
            });
            return updated;
          });
        } finally {
          setLoadingDetails(false);
        }
      }
    }
  };

  // Quick Date Range Presets
  const applyPreset = (preset: "30days" | "thisMonth" | "3months" | "fy" | "all") => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (preset === "30days") {
      from.setDate(now.getDate() - 30);
    } else if (preset === "thisMonth") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === "3months") {
      from.setMonth(now.getMonth() - 3);
    } else if (preset === "fy") {
      const currentYear = now.getFullYear();
      const fyStart = now.getMonth() >= 3 ? currentYear : currentYear - 1;
      from = new Date(fyStart, 3, 1);
      to = new Date(fyStart + 1, 2, 31);
    } else if (preset === "all") {
      from = new Date(2020, 0, 1);
    }

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];
    setFromDate(fromStr);
    setToDate(toStr);

    setTimeout(() => {
      loadData();
    }, 50);
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payForm.amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    try {
      setSubmitting(true);
      await partyService.recordPayment({
        ...payForm,
        partyId,
        amount: Number(payForm.amount),
      });
      setIsPayModalOpen(false);
      setPayForm({
        partyId,
        transactionDate: new Date().toISOString().split("T")[0],
        amount: 0,
        paymentMode: "UPI",
        referenceNumber: "",
        notes: "",
      });
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT 1: EXCEL (.xlsx) GENERATOR
  // ═══════════════════════════════════════════════════════════════════════════
  const handleExportExcel = async (exportAllSheets: boolean = false) => {
    if (!party) return;

    const wb = XLSX.utils.book_new();
    const partyCleanName = party.legalName.replace(/[^a-zA-Z0-9]/g, "_");

    // 1. General Ledger Sheet
    if (viewMode === "standard" || exportAllSheets) {
      const ledgerRows = [
        {
          Date: "Period Information",
          "Entry Type": `From: ${fromDate} To: ${toDate}`,
          "Reference No": `Party: ${party.legalName} (${party.code || ""})`,
          "Doc Type": "",
          "Payment Mode": "",
          Description: `Opening Balance: ₹${statement?.openingBalance.toFixed(2) || "0.00"} (${statement && statement.openingBalance >= 0 ? "Dr" : "Cr"})`,
          "Debit (₹)": statement?.totalDebit || 0,
          "Credit (₹)": statement?.totalCredit || 0,
          "Running Balance (₹)": party.currentOutstandingBalance,
          "Dr / Cr": party.currentOutstandingBalance >= 0 ? "Dr (Receivable)" : "Cr (Payable)",
        },
        {},
        ...(statement?.entries || []).map((e) => ({
          Date: new Date(e.transactionDate).toLocaleDateString("en-IN"),
          "Entry Type": e.entryTypeName,
          "Reference No": e.referenceDocumentNumber || "",
          "Doc Type": e.referenceDocumentType || "",
          "Payment Mode": e.paymentMode || "",
          Description: e.description || "",
          "Debit (₹)": e.debitAmount > 0 ? e.debitAmount : 0,
          "Credit (₹)": e.creditAmount > 0 ? e.creditAmount : 0,
          "Running Balance (₹)": Math.abs(e.runningBalance),
          "Dr / Cr": e.runningBalance >= 0 ? "Dr" : "Cr",
        })),
      ];

      const wsLedger = XLSX.utils.json_to_sheet(ledgerRows);
      XLSX.utils.book_append_sheet(wb, wsLedger, "Account_Ledger");
    }

    // 2. Invoice Summary Sheet
    if (viewMode === "invoices" || exportAllSheets) {
      const invRows = invoices.map((inv) => ({
        "Invoice No": inv.invoiceNumber,
        "Invoice Date": new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
        "Due Date": inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "",
        Status:
          inv.status === 3
            ? "Paid"
            : inv.status === 4
            ? "Partially Paid"
            : inv.status === 6
            ? "Cancelled"
            : inv.balanceAmount > 0
            ? "Due"
            : "Issued",
        "Taxable Amount (₹)": inv.taxableAmount,
        "CGST (₹)": inv.cgstAmount,
        "SGST (₹)": inv.sgstAmount,
        "IGST (₹)": inv.igstAmount,
        "Total Tax (₹)": (inv.cgstAmount || 0) + (inv.sgstAmount || 0) + (inv.igstAmount || 0),
        "Invoice Total (₹)": inv.totalAmount,
        "Paid Amount (₹)": inv.paidAmount,
        "Balance Due (₹)": inv.balanceAmount,
      }));

      const wsInvoices = XLSX.utils.json_to_sheet(invRows);
      XLSX.utils.book_append_sheet(wb, wsInvoices, "Invoices_Summary");
    }

    // 3. Detailed Product/Item Sheet
    if (viewMode === "detailed" || exportAllSheets) {
      const missing = invoices.map((i) => i.id).filter((id) => !detailedInvoices[id]);
      let currentDetails = { ...detailedInvoices };
      if (missing.length > 0) {
        const results = await Promise.all(
          missing.map((id) => salesService.getInvoiceById(id).catch(() => null))
        );
        results.forEach((res) => {
          if (res) currentDetails[res.id] = res;
        });
        setDetailedInvoices(currentDetails);
      }

      const itemRows: any[] = [];
      invoices.forEach((inv) => {
        const det = currentDetails[inv.id];
        if (det && det.items && det.items.length > 0) {
          det.items.forEach((it, idx) => {
            itemRows.push({
              "Invoice No": inv.invoiceNumber,
              "Invoice Date": new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
              "Item #": idx + 1,
              "Product Name": it.itemName,
              "SKU / Code": it.itemSku || "",
              "Batch No": it.batchNumber || "—",
              "Expiry Date": it.expiryDate ? new Date(it.expiryDate).toLocaleDateString("en-IN") : "—",
              Quantity: it.quantity,
              Unit: it.uomCode || "PCS",
              "Unit Rate (₹)": it.unitPrice,
              "Discount (₹)": it.discountAmount || 0,
              "Taxable (₹)": it.taxableAmount,
              "GST Rate (%)": `${it.gstRate}%`,
              "Tax Amount (₹)": (it.cgstAmount || 0) + (it.sgstAmount || 0) + (it.igstAmount || 0),
              "Line Total (₹)": it.totalAmount,
              "Invoice Total (₹)": inv.totalAmount,
              "Invoice Paid (₹)": inv.paidAmount,
              "Invoice Due (₹)": inv.balanceAmount,
            });
          });
        } else {
          itemRows.push({
            "Invoice No": inv.invoiceNumber,
            "Invoice Date": new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
            "Item #": 1,
            "Product Name": "General Goods / Services",
            "SKU / Code": "",
            "Batch No": "—",
            "Expiry Date": "—",
            Quantity: 1,
            Unit: "PCS",
            "Unit Rate (₹)": inv.totalAmount,
            "Discount (₹)": 0,
            "Taxable (₹)": inv.taxableAmount,
            "GST Rate (%)": "—",
            "Tax Amount (₹)": (inv.cgstAmount || 0) + (inv.sgstAmount || 0) + (inv.igstAmount || 0),
            "Line Total (₹)": inv.totalAmount,
            "Invoice Total (₹)": inv.totalAmount,
            "Invoice Paid (₹)": inv.paidAmount,
            "Invoice Due (₹)": inv.balanceAmount,
          });
        }
      });

      const wsItems = XLSX.utils.json_to_sheet(itemRows);
      XLSX.utils.book_append_sheet(wb, wsItems, "Product_Wise_Ledger");
    }

    const fileName = `${partyCleanName}_Ledger_${viewMode.toUpperCase()}_${fromDate}_to_${toDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT 2: PDF GENERATION
  // ═══════════════════════════════════════════════════════════════════════════
  const handleDownloadPdf = async () => {
    if (!party) return;
    try {
      setExportingPdf(true);

      if (viewMode === "detailed") {
        const missing = invoices.map((i) => i.id).filter((id) => !detailedInvoices[id]);
        if (missing.length > 0) {
          const results = await Promise.all(
            missing.map((id) => salesService.getInvoiceById(id).catch(() => null))
          );
          setDetailedInvoices((prev) => {
            const next = { ...prev };
            results.forEach((res) => {
              if (res) next[res.id] = res;
            });
            return next;
          });
        }
      }

      await new Promise((r) => setTimeout(r, 200));

      const element = printableRef.current;
      if (!element) {
        alert("Printable container not ready. Please try again.");
        return;
      }

      const blob = await generateInvoicePdfBlob(element);
      const partyCleanName = party.legalName.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `${partyCleanName}_Ledger_Statement_${fromDate}_to_${toDate}.pdf`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("PDF generation encountered an error. You can also use the 'Print' button to save as PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT 3: BROWSER / RAW HTML PRINT
  // ═══════════════════════════════════════════════════════════════════════════
  const handlePrint = () => {
    if (!printableRef.current) {
      window.print();
      return;
    }
    const html = printableRef.current.innerHTML;
    printRawHtml(html, `Statement - ${party?.legalName || "Customer"}`, "A4 portrait");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT 4: WHATSAPP SHARE
  // ═══════════════════════════════════════════════════════════════════════════
  const buildWhatsAppMessage = () => {
    if (!party) return "";

    const businessTitle = profile?.businessName || "UdyogBill Accounting";
    const netBalance = party.currentOutstandingBalance;
    const balanceSign = netBalance >= 0 ? "Dr (Receivable / देय)" : "Cr (Advance / Payable)";

    let msg = `*STATEMENT OF ACCOUNT / खाता विवरण*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Customer / ग्राहक:* ${party.legalName}\n`;
    if (party.code) msg += `🔖 *Code:* ${party.code}\n`;
    msg += `📅 *Period / अवधि:* ${fromDate} to ${toDate}\n`;
    msg += `🏢 *From / जारीकर्ता:* ${businessTitle}\n`;
    if (profile?.primaryPhone) msg += `📞 *Contact:* ${profile.primaryPhone}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 *FINANCIAL SUMMARY:*\n`;
    msg += `• Opening Balance (शुरुआती शेष): ₹${statement ? Math.abs(statement.openingBalance).toFixed(2) : "0.00"} (${statement && statement.openingBalance >= 0 ? "Dr" : "Cr"})\n`;
    msg += `• Total Bills / Debits: ₹${statement ? statement.totalDebit.toFixed(2) : "0.00"}\n`;
    msg += `• Total Payments Received: ₹${statement ? statement.totalCredit.toFixed(2) : "0.00"}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *NET OUTSTANDING DUE: ₹${Math.abs(netBalance).toFixed(2)} (${balanceSign})*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;

    if (invoices.length > 0) {
      msg += `🧾 *Recent Invoices (${invoices.length}):*\n`;
      invoices.slice(0, 5).forEach((inv) => {
        msg += `• #${inv.invoiceNumber} (${new Date(inv.invoiceDate).toLocaleDateString("en-IN")}): Total ₹${inv.totalAmount.toFixed(2)} | Due ₹${inv.balanceAmount.toFixed(2)}\n`;
      });
      if (invoices.length > 5) {
        msg += `...and ${invoices.length - 5} more invoices in this period.\n`;
      }
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    if (shareCustomNotes) {
      msg += `📝 *Note:* ${shareCustomNotes}\n━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    if (profile?.bankAccountNumber && profile?.bankIfsc) {
      msg += `🏦 *Bank Details for Payment:*\n`;
      msg += `A/C: ${profile.bankAccountNumber} | IFSC: ${profile.bankIfsc}\n`;
      if (profile.bankName) msg += `Bank: ${profile.bankName}\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    msg += `Please verify this statement and arrange settlement for pending dues.\n`;
    msg += `Thank you for your valued partnership!`;

    return msg;
  };

  const handleSendWhatsApp = () => {
    const rawDigits = (sharePhone || party?.mobile || "").replace(/\D/g, "");
    let phone = rawDigits;
    if (phone.length === 10) {
      phone = "91" + phone;
    }
    const message = buildWhatsAppMessage();
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    setWhatsappModalOpen(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT 5: EMAIL DISPATCH
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSendEmail = () => {
    if (!party) return;
    const recipient = shareEmail || party.email || "";
    const subject = `Statement of Account — ${party.legalName} (${fromDate} to ${toDate})`;
    const body = buildWhatsAppMessage().replace(/\*/g, "");
    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setEmailModalOpen(false);
  };

  // Calculations for Invoices
  const totalInvoicedAmount = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const totalPaidInvoicesAmount = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const totalBalanceDueAmount = invoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      {/* ─── Back & Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={isCustomer ? "/app/parties/customers" : "/app/parties/suppliers"}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {isCustomer ? "Customers" : "Suppliers"} Directory</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Customer Statement & Multi-Type Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View financial ledger, invoice breakdown, or complete item-wise billing history with 1-click PDF, Excel, WhatsApp & Email export.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPayModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <CreditCard className="w-4 h-4" />
            <span>{isCustomer ? "Receive Payment" : "Record Payment"}</span>
          </button>
        </div>
      </div>

      {/* ─── Party Profile Banner ────────────────────────────────────────────── */}
      {party && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <span className="text-xl font-bold text-slate-900 dark:text-white">{party.legalName}</span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 font-semibold">
                {party.code || "PARTY"}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                {isCustomer ? "Customer" : "Supplier"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
              {party.gstin && (
                <span className="font-mono">
                  GSTIN: <strong className="text-slate-800 dark:text-slate-200">{party.gstin}</strong> ({party.stateCode})
                </span>
              )}
              {party.mobile && (
                <span className="flex items-center space-x-1 font-mono">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{party.mobile}</span>
                </span>
              )}
              {party.email && (
                <span className="flex items-center space-x-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{party.email}</span>
                </span>
              )}
              {party.creditLimit > 0 && (
                <span>
                  Credit Limit: <strong>₹{party.creditLimit.toLocaleString("en-IN")}</strong> ({party.creditPeriodDays} Days)
                </span>
              )}
            </div>

            {/* Business Licenses */}
            {(() => {
              const licList = parseLicensesFromParty(party);
              if (licList.length === 0) return null;
              return (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {licList.map((lic, i) => {
                    const preset = LICENSE_PRESETS.find((p) => p.value === lic.type);
                    const label = lic.customName || preset?.defaultName || lic.type.toUpperCase();
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300"
                      >
                        <ShieldCheck className="w-3 h-3 text-indigo-500" />
                        <span className="font-medium text-slate-500">{label}:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold">{lic.number}</span>
                      </span>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="text-right font-mono bg-slate-50 dark:bg-slate-900/60 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-sans font-semibold">Net Outstanding Balance</div>
            <div
              className={`text-2xl font-black ${
                party.currentOutstandingBalance > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : party.currentOutstandingBalance < 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500"
              }`}
            >
              ₹{Math.abs(party.currentOutstandingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              <span className="text-xs ml-1.5 font-normal">
                {party.currentOutstandingBalance >= 0 ? "Dr (Receivable)" : "Cr (Advance)"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Date Presets & Filter Bar ────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Quick Range:
            </span>
            <button
              type="button"
              onClick={() => applyPreset("30days")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-800 transition font-medium"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset("thisMonth")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-800 transition font-medium"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => applyPreset("3months")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-800 transition font-medium"
            >
              Last Quarter (3 Mo)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("fy")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-800 transition font-medium"
            >
              Financial Year (FY)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("all")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-800 transition font-medium"
            >
              All Time
            </button>
          </div>

          {/* Date inputs form */}
          <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
            >
              Apply Filter
            </button>
          </form>
        </div>
      </div>

      {/* ─── Metric Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Opening Balance */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Opening Balance (As of {fromDate})</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            ₹{statement ? Math.abs(statement.openingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
            <span className="text-xs font-normal text-slate-500 ml-1">
              {statement && statement.openingBalance >= 0 ? "Dr" : "Cr"}
            </span>
          </div>
        </div>

        {/* Metric 2: Debits */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Invoiced / Debits (+)</div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ₹{statement ? statement.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </div>
        </div>

        {/* Metric 3: Credits */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Paid / Credits (-)</div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
            ₹{statement ? statement.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
          </div>
        </div>

        {/* Metric 4: Closing Balance */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Period Closing Net Position</div>
          <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            ₹{statement ? Math.abs(statement.closingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
            <span className="text-xs font-normal text-slate-500 ml-1">
              {statement && statement.closingBalance >= 0 ? "Dr (Due)" : "Cr (Advance)"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Multi-Type Ledger View Mode Selector & Export Controls ─────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* View Mode Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => handleViewModeChange("standard")}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "standard"
                ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Standard Ledger (खाता लेजर)</span>
          </button>

          <button
            onClick={() => handleViewModeChange("invoices")}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "invoices"
                ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>2. Invoice Wise (बिल अनुसार)</span>
            {invoices.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                {invoices.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleViewModeChange("detailed")}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "detailed"
                ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>3. Invoice + Products Detailed (आइटम सहित)</span>
          </button>
        </div>

        {/* Export & Dispatch Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={exportingPdf}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 text-xs font-semibold transition disabled:opacity-50"
            title="Download formatted Statement of Account PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportingPdf ? "Generating PDF..." : "Download PDF"}</span>
          </button>

          {/* Download Excel */}
          <div className="relative group">
            <button
              onClick={() => handleExportExcel(false)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 text-xs font-semibold transition"
              title="Download Excel Spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel (.xlsx)</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 w-56 z-20">
              <button
                onClick={() => handleExportExcel(false)}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                📊 Current View Sheet Only
              </button>
              <button
                onClick={() => handleExportExcel(true)}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition border-t border-slate-100 dark:border-slate-800"
              >
                📑 Complete Workbook (Ledger + Invoices + Items)
              </button>
            </div>
          </div>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-semibold transition"
            title="Print Statement"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {/* WhatsApp Share */}
          <button
            onClick={() => setWhatsappModalOpen(true)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-950/40 dark:hover:bg-green-900/60 dark:text-green-300 border border-green-200 dark:border-green-900/40 text-xs font-semibold transition"
            title="Send statement directly on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          {/* Email Share */}
          <button
            onClick={() => setEmailModalOpen(true)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 text-xs font-semibold transition"
            title="Send statement via Email"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          VIEW 1: STANDARD GENERAL LEDGER
          ═══════════════════════════════════════════════════════════════════════════ */}
      {viewMode === "standard" && (
        <div className="rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Financial Running Ledger Statement</span>
              </h3>
              <p className="text-xs text-slate-500">
                Chronological debits, credits, and continuous running balance for the period.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500">
              Total Transactions: <strong>{statement?.entries.length || 0}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Date & Type</th>
                  <th className="px-5 py-3.5 font-semibold">Reference / Document</th>
                  <th className="px-5 py-3.5 font-semibold">Payment Mode & Description</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Debit (₹)</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Credit (₹)</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                      Loading ledger statement...
                    </td>
                  </tr>
                ) : statement && statement.entries.length > 0 ? (
                  statement.entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {new Date(entry.transactionDate).toLocaleDateString("en-IN")}
                        </div>
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{entry.entryTypeName}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                        <div>{entry.referenceDocumentNumber || "—"}</div>
                        <div className="text-[10px] text-slate-400">{entry.referenceDocumentType || "Manual"}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                        <div>{entry.description || "—"}</div>
                        {entry.paymentMode && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                            {entry.paymentMode}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {entry.debitAmount > 0 ? `₹${entry.debitAmount.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                        {entry.creditAmount > 0 ? `₹${entry.creditAmount.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹{Math.abs(entry.runningBalance).toFixed(2)}
                        <span className="text-[10px] text-slate-400 ml-1">
                          {entry.runningBalance >= 0 ? "Dr" : "Cr"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No ledger transactions recorded in this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          VIEW 2: INVOICE-WISE SUMMARY
          ═══════════════════════════════════════════════════════════════════════════ */}
      {viewMode === "invoices" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Total Invoiced (Period)</div>
                <div className="text-lg font-bold font-mono text-indigo-900 dark:text-indigo-200">
                  ₹{totalInvoicedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                {invoices.length} Invoices
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Amount Received</div>
                <div className="text-lg font-bold font-mono text-emerald-900 dark:text-emerald-200">
                  ₹{totalPaidInvoicesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-70" />
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Balance Pending on Invoices</div>
                <div className="text-lg font-bold font-mono text-amber-900 dark:text-amber-200">
                  ₹{totalBalanceDueAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <Clock className="w-5 h-5 text-amber-500 opacity-70" />
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-500" />
                  <span>Invoice-Wise Ledger</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Every sales invoice issued to this customer with tax breakdown, payment status, and due balances.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Invoice No & Date</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Taxable (₹)</th>
                    <th className="px-5 py-3.5 font-semibold text-right">GST (₹)</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Total Bill (₹)</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Paid (₹)</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Balance Due (₹)</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices.length > 0 ? (
                    invoices.map((inv) => {
                      const totalGst = (inv.cgstAmount || 0) + (inv.sgstAmount || 0) + (inv.igstAmount || 0);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              #{inv.invoiceNumber}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>Date: {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</span>
                              {inv.dueDate && (
                                <span className="text-slate-400">| Due: {new Date(inv.dueDate).toLocaleDateString("en-IN")}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {inv.status === 3 || inv.balanceAmount <= 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                Fully Paid
                              </span>
                            ) : inv.status === 4 || inv.paidAmount > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                                Partial Paid
                              </span>
                            ) : inv.isCancelled ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
                                Cancelled
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                                Unpaid / Due
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                            ₹{inv.taxableAmount.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                            ₹{totalGst.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ₹{inv.totalAmount.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            ₹{inv.paidAmount.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            ₹{inv.balanceAmount.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Link
                              href={`/app/sales/invoices/${inv.id}`}
                              target="_blank"
                              className="inline-flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No sales invoices recorded for this customer in the selected date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          VIEW 3: INVOICE + PRODUCTS DETAILED BREAKDOWN
          ═══════════════════════════════════════════════════════════════════════════ */}
      {viewMode === "detailed" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-500" />
              <span>
                Showing <strong>{invoices.length}</strong> invoices with full product-level itemized breakdown (SKU, Qty, Rate, GST, Total).
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-medium"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-medium"
              >
                Collapse All
              </button>
            </div>
          </div>

          {loadingDetails && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Fetching product line items for detailed view...</span>
            </div>
          )}

          {invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map((inv) => {
                const isExpanded = expandedInvoices.has(inv.id);
                const details = detailedInvoices[inv.id];
                const items = details?.items || [];

                return (
                  <div
                    key={inv.id}
                    className="rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
                  >
                    {/* Invoice Collapsible Header */}
                    <div
                      onClick={() => toggleInvoiceExpand(inv.id)}
                      className="p-4 cursor-pointer flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors select-none"
                    >
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                              #{inv.invoiceNumber}
                            </span>
                            <span className="text-xs text-slate-400">|</span>
                            <span className="text-xs text-slate-600 dark:text-slate-300">
                              {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                            </span>
                            <span className="text-xs text-slate-400">|</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {inv.status === 3 ? "Paid" : inv.status === 4 ? "Partial" : "Due"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Click to {isExpanded ? "collapse" : "view"} {items.length ? `${items.length} items` : "items breakdown"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-right font-mono text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Total Bill</span>
                          <span className="font-bold text-slate-900 dark:text-white">₹{inv.totalAmount.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Paid</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{inv.paidAmount.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Balance Due</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">₹{inv.balanceAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Products Table */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4">
                        {details ? (
                          items.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                              <table className="w-full text-left text-xs">
                                <thead className="text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                                  <tr>
                                    <th className="px-4 py-2.5 font-semibold">#</th>
                                    <th className="px-4 py-2.5 font-semibold">Product Name & SKU</th>
                                    <th className="px-4 py-2.5 font-semibold">Batch & Expiry</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">Qty</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">Rate (₹)</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">Disc (₹)</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">GST %</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">Total (₹)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {items.map((it, idx) => (
                                    <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                      <td className="px-4 py-2 text-slate-400 font-mono">{idx + 1}</td>
                                      <td className="px-4 py-2">
                                        <div className="font-semibold text-slate-900 dark:text-white">{it.itemName}</div>
                                        {it.itemSku && (
                                          <div className="text-[10px] font-mono text-slate-400">SKU: {it.itemSku}</div>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                        {it.batchNumber ? (
                                          <div>
                                            <span>B: {it.batchNumber}</span>
                                            {it.expiryDate && (
                                              <span className="block text-[10px] text-slate-400">
                                                Exp: {new Date(it.expiryDate).toLocaleDateString("en-IN")}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          "—"
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-right font-mono font-semibold text-slate-900 dark:text-white">
                                        {it.quantity} {it.uomCode || "PCS"}
                                      </td>
                                      <td className="px-4 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                        ₹{it.unitPrice.toFixed(2)}
                                      </td>
                                      <td className="px-4 py-2 text-right font-mono text-slate-500">
                                        {it.discountAmount > 0 ? `₹${it.discountAmount.toFixed(2)}` : "—"}
                                      </td>
                                      <td className="px-4 py-2 text-right font-mono text-indigo-600 dark:text-indigo-400">
                                        {it.gstRate}%
                                      </td>
                                      <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                                        ₹{it.totalAmount.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-xs text-slate-400">
                              No product item rows recorded on this bill.
                            </div>
                          )
                        ) : (
                          <div className="text-center py-4 text-xs text-slate-400 flex items-center justify-center space-x-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                            <span>Loading item details...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-400">
              No sales invoices found in the selected date range.
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          PRINTABLE & PDF HIDDEN RENDER CONTAINER
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="overflow-hidden h-0 opacity-0 pointer-events-none">
        <div
          ref={printableRef}
          id="party-ledger-printable"
          style={{
            width: "210mm",
            padding: "12mm",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            fontFamily: "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: "2px solid #4f46e5", paddingBottom: "10px", marginBottom: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 4px 0", color: "#1e1b4b" }}>
                  {profile?.businessName || "UdyogBill Enterprise"}
                </h1>
                <p style={{ fontSize: "11px", color: "#475569", margin: "0" }}>
                  {profile?.addressLine1 || ""}, {profile?.city || ""} {profile?.state || ""} {profile?.pincode || ""}
                </p>
                <p style={{ fontSize: "11px", color: "#475569", margin: "2px 0 0 0" }}>
                  {profile?.gstin ? `GSTIN: ${profile.gstin} | ` : ""}
                  {profile?.primaryPhone ? `Phone: ${profile.primaryPhone} | ` : ""}
                  {profile?.email ? `Email: ${profile.email}` : ""}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "16px", fontWeight: "bold", color: "#4f46e5", letterSpacing: "1px" }}>
                  STATEMENT OF ACCOUNT
                </span>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 0" }}>
                  Date Range: <strong>{fromDate}</strong> to <strong>{toDate}</strong>
                </p>
                <p style={{ fontSize: "10px", color: "#94a3b8", margin: "2px 0 0 0" }}>
                  Generated: {new Date().toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          {/* Customer / Party Details */}
          <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "6px", marginBottom: "15px", border: "1px solid #e2e8f0" }}>
            <div>
              <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>STATEMENT ISSUED TO:</span>
              <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: "2px 0", color: "#0f172a" }}>
                {party?.legalName}
              </h3>
              <p style={{ fontSize: "11px", color: "#475569", margin: "0" }}>
                Party Code: <strong>{party?.code || "—"}</strong>
                {party?.gstin ? ` | GSTIN: ${party.gstin} (${party.stateCode})` : ""}
                {party?.mobile ? ` | Phone: ${party.mobile}` : ""}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>NET BALANCE DUE</span>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: party && party.currentOutstandingBalance >= 0 ? "#b45309" : "#047857" }}>
                ₹{party ? Math.abs(party.currentOutstandingBalance).toFixed(2) : "0.00"}
                <span style={{ fontSize: "11px", marginLeft: "4px" }}>
                  {party && party.currentOutstandingBalance >= 0 ? "Dr (Receivable)" : "Cr (Advance)"}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Totals */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", gap: "10px" }}>
            <div style={{ flex: 1, padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Opening Balance</div>
              <div style={{ fontSize: "13px", fontWeight: "bold" }}>₹{statement?.openingBalance.toFixed(2) || "0.00"}</div>
            </div>
            <div style={{ flex: 1, padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Total Debits (+)</div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#047857" }}>₹{statement?.totalDebit.toFixed(2) || "0.00"}</div>
            </div>
            <div style={{ flex: 1, padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Total Credits (-)</div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#be123c" }}>₹{statement?.totalCredit.toFixed(2) || "0.00"}</div>
            </div>
            <div style={{ flex: 1, padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Closing Balance</div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#4338ca" }}>₹{statement?.closingBalance.toFixed(2) || "0.00"}</div>
            </div>
          </div>

          {/* Printable Table Content based on active viewMode */}
          {viewMode === "standard" && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr style={{ backgroundColor: "#4f46e5", color: "#ffffff" }}>
                  <th style={{ padding: "6px", textAlign: "left", border: "1px solid #cbd5e1" }}>Date</th>
                  <th style={{ padding: "6px", textAlign: "left", border: "1px solid #cbd5e1" }}>Type</th>
                  <th style={{ padding: "6px", textAlign: "left", border: "1px solid #cbd5e1" }}>Ref No</th>
                  <th style={{ padding: "6px", textAlign: "left", border: "1px solid #cbd5e1" }}>Description</th>
                  <th style={{ padding: "6px", textAlign: "right", border: "1px solid #cbd5e1" }}>Debit (₹)</th>
                  <th style={{ padding: "6px", textAlign: "right", border: "1px solid #cbd5e1" }}>Credit (₹)</th>
                  <th style={{ padding: "6px", textAlign: "right", border: "1px solid #cbd5e1" }}>Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(statement?.entries || []).map((e, idx) => (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                    <td style={{ padding: "5px 6px", border: "1px solid #e2e8f0" }}>
                      {new Date(e.transactionDate).toLocaleDateString("en-IN")}
                    </td>
                    <td style={{ padding: "5px 6px", border: "1px solid #e2e8f0" }}>{e.entryTypeName}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #e2e8f0" }}>{e.referenceDocumentNumber || "—"}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #e2e8f0" }}>{e.description || "—"}</td>
                    <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #e2e8f0", color: "#047857" }}>
                      {e.debitAmount > 0 ? e.debitAmount.toFixed(2) : "—"}
                    </td>
                    <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #e2e8f0", color: "#be123c" }}>
                      {e.creditAmount > 0 ? e.creditAmount.toFixed(2) : "—"}
                    </td>
                    <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #e2e8f0", fontWeight: "bold" }}>
                      {Math.abs(e.runningBalance).toFixed(2)} {e.runningBalance >= 0 ? "Dr" : "Cr"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {viewMode === "invoices" && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr style={{ backgroundColor: "#4f46e5", color: "#ffffff" }}>
                  <th style={{ padding: "6px", textAlign: "left", border: "1px solid #cbd5e1" }}>Invoice #</th>
                  <th style={{ padding: "6px", textAlign: "left", border: "1px solid #cbd5e1" }}>Date</th>
                  <th style={{ padding: "6px", textAlign: "left", border: "1px solid #cbd5e1" }}>Status</th>
                  <th style={{ padding: "6px", textAlign: "right", border: "1px solid #cbd5e1" }}>Taxable (₹)</th>
                  <th style={{ padding: "6px", textAlign: "right", border: "1px solid #cbd5e1" }}>GST (₹)</th>
                  <th style={{ padding: "6px", textAlign: "right", border: "1px solid #cbd5e1" }}>Total (₹)</th>
                  <th style={{ padding: "6px", textAlign: "right", border: "1px solid #cbd5e1" }}>Paid (₹)</th>
                  <th style={{ padding: "6px", textAlign: "right", border: "1px solid #cbd5e1" }}>Due (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => {
                  const gst = (inv.cgstAmount || 0) + (inv.sgstAmount || 0) + (inv.igstAmount || 0);
                  return (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                      <td style={{ padding: "5px 6px", border: "1px solid #e2e8f0", fontWeight: "bold" }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: "5px 6px", border: "1px solid #e2e8f0" }}>
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                      </td>
                      <td style={{ padding: "5px 6px", border: "1px solid #e2e8f0" }}>
                        {inv.status === 3 ? "Paid" : inv.status === 4 ? "Partial" : "Due"}
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #e2e8f0" }}>{inv.taxableAmount.toFixed(2)}</td>
                      <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #e2e8f0" }}>{gst.toFixed(2)}</td>
                      <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #e2e8f0", fontWeight: "bold" }}>
                        {inv.totalAmount.toFixed(2)}
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #e2e8f0", color: "#047857" }}>
                        {inv.paidAmount.toFixed(2)}
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "right", border: "1px solid #e2e8f0", color: "#be123c", fontWeight: "bold" }}>
                        {inv.balanceAmount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {viewMode === "detailed" && (
            <div>
              {invoices.map((inv, iIdx) => {
                const det = detailedInvoices[inv.id];
                const items = det?.items || [];
                return (
                  <div key={iIdx} style={{ marginBottom: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
                    <div style={{ backgroundColor: "#f1f5f9", padding: "6px 8px", display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: "bold" }}>
                      <span>Invoice: #{inv.invoiceNumber} ({new Date(inv.invoiceDate).toLocaleDateString("en-IN")})</span>
                      <span>Total: ₹{inv.totalAmount.toFixed(2)} | Paid: ₹{inv.paidAmount.toFixed(2)} | Due: ₹{inv.balanceAmount.toFixed(2)}</span>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#e2e8f0" }}>
                          <th style={{ padding: "4px", textAlign: "left" }}>Product</th>
                          <th style={{ padding: "4px", textAlign: "left" }}>Batch</th>
                          <th style={{ padding: "4px", textAlign: "right" }}>Qty</th>
                          <th style={{ padding: "4px", textAlign: "right" }}>Rate (₹)</th>
                          <th style={{ padding: "4px", textAlign: "right" }}>GST %</th>
                          <th style={{ padding: "4px", textAlign: "right" }}>Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, pIdx) => (
                          <tr key={pIdx} style={{ borderTop: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "4px" }}>{it.itemName}</td>
                            <td style={{ padding: "4px" }}>{it.batchNumber || "—"}</td>
                            <td style={{ padding: "4px", textAlign: "right" }}>{it.quantity} {it.uomCode || "PCS"}</td>
                            <td style={{ padding: "4px", textAlign: "right" }}>{it.unitPrice.toFixed(2)}</td>
                            <td style={{ padding: "4px", textAlign: "right" }}>{it.gstRate}%</td>
                            <td style={{ padding: "4px", textAlign: "right", fontWeight: "bold" }}>{it.totalAmount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer note */}
          <div style={{ marginTop: "20px", borderTop: "1px dashed #cbd5e1", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#64748b" }}>
            <div>
              <p style={{ margin: "0" }}>This is a computer generated statement of account and does not require a physical signature.</p>
              {profile?.bankAccountNumber && (
                <p style={{ margin: "2px 0 0 0" }}>
                  Bank Details: A/C No: <strong>{profile.bankAccountNumber}</strong> | IFSC: <strong>{profile.bankIfsc}</strong> | Bank: <strong>{profile.bankName || "—"}</strong>
                </p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0", fontWeight: "bold" }}>For {profile?.businessName || "UdyogBill"}</p>
              <p style={{ margin: "15px 0 0 0" }}>Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL 1: WHATSAPP SHARE MODAL
          ═══════════════════════════════════════════════════════════════════════════ */}
      {whatsappModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setWhatsappModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Send Statement via WhatsApp</h3>
                <p className="text-xs text-slate-500">
                  Instant account summary and dues reminder directly to customer's WhatsApp.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Customer Mobile (10 Digits)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={sharePhone}
                    onChange={(e) => setSharePhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Remarks / Note (Optional)</label>
                <input
                  type="text"
                  value={shareCustomNotes}
                  onChange={(e) => setShareCustomNotes(e.target.value)}
                  placeholder="e.g. Please clear overdue balance by Friday."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Message preview */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Message Preview</label>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {buildWhatsAppMessage()}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWhatsappModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-green-600 hover:bg-green-500 shadow-md shadow-green-600/20 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open WhatsApp & Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL 2: EMAIL SHARE MODAL
          ═══════════════════════════════════════════════════════════════════════════ */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setEmailModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Email Statement of Account</h3>
                <p className="text-xs text-slate-500">
                  Compose an email statement draft for {party?.legalName}.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recipient Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                <input
                  type="text"
                  readOnly
                  value={`Statement of Account — ${party?.legalName} (${fromDate} to ${toDate})`}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Statement Content</label>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {buildWhatsAppMessage().replace(/\*/g, "")}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open Email Client</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL 3: RECORD PAYMENT MODAL (EXISTING)
          ═══════════════════════════════════════════════════════════════════════════ */}
      {isPayModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsPayModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-indigo-500" />
                <span>{isCustomer ? "Receive Customer Payment" : "Record Supplier Payment"}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Party: <strong className="text-slate-800 dark:text-white">{party?.legalName}</strong>
              </p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Date</label>
                <input
                  type="date"
                  required
                  value={payForm.transactionDate}
                  onChange={(e) => setPayForm({ ...payForm, transactionDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={payForm.amount || ""}
                  onChange={(e) => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Mode</label>
                <select
                  value={payForm.paymentMode}
                  onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BankTransfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque / Demand Draft</option>
                  <option value="CreditCard">Credit / Debit Card</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Transaction Reference No</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-9988771122 or Cheque No"
                  value={payForm.referenceNumber || ""}
                  onChange={(e) => setPayForm({ ...payForm, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Part payment against monthly invoices"
                  value={payForm.notes || ""}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {submitting ? "Processing..." : "Record Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
