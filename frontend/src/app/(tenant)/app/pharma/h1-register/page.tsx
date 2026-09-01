"use client";

import { useState, useEffect } from "react";
import {
  FileCheck,
  Search,
  Printer,
  Download,
  Plus,
  ShieldCheck,
  Calendar,
  User,
  Stethoscope,
  Pill,
  CheckCircle2,
  X
} from "lucide-react";
import { pharmaDeepService, ScheduleH1Record } from "@/services/pharma-deep-services";

export default function PharmaH1RegisterPage() {
  const [records, setRecords] = useState<ScheduleH1Record[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Manual H1 Audit Log
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    patientName: "",
    patientAddressPhone: "",
    prescriberDoctorName: "",
    prescriberRegNumber: "",
    drugName: "",
    batchNumber: "",
    quantitySupplied: "",
    manufacturerName: ""
  });

  useEffect(() => {
    loadRegister();
  }, []);

  const loadRegister = async () => {
    setLoading(true);
    const data = await pharmaDeepService.getScheduleH1Register();
    setRecords(data);
    setLoading(false);
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.prescriberDoctorName || !formData.drugName) {
      alert("Please fill all required patient, prescriber, and drug details.");
      return;
    }

    await pharmaDeepService.recordScheduleH1Entry({
      invoiceId: "inv-" + Date.now(),
      invoiceNumber: formData.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      supplyDate: new Date().toISOString(),
      patientName: formData.patientName,
      patientAddressPhone: formData.patientAddressPhone,
      prescriberDoctorName: formData.prescriberDoctorName,
      prescriberRegNumber: formData.prescriberRegNumber,
      drugName: formData.drugName,
      batchNumber: formData.batchNumber,
      quantitySupplied: Number(formData.quantitySupplied) || 1,
      manufacturerName: formData.manufacturerName || "Standard Pharma"
    });

    setShowModal(false);
    showNotification("Schedule H1 audit entry recorded in compliance ledger!");
    loadRegister();
    setFormData({
      invoiceNumber: "",
      patientName: "",
      patientAddressPhone: "",
      prescriberDoctorName: "",
      prescriberRegNumber: "",
      drugName: "",
      batchNumber: "",
      quantitySupplied: "",
      manufacturerName: ""
    });
  };

  const filteredRecords = records.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.patientName.toLowerCase().includes(term) ||
      r.prescriberDoctorName.toLowerCase().includes(term) ||
      r.prescriberRegNumber.toLowerCase().includes(term) ||
      r.drugName.toLowerCase().includes(term) ||
      r.batchNumber.toLowerCase().includes(term) ||
      r.invoiceNumber.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-transparent p-6 rounded-2xl border border-emerald-800/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> CDSCO Statutory Compliance
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
              Drugs & Cosmetics Act
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Schedule H1 & Controlled Drugs Register
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Mandatory Drug Inspector inspection ledger. Tracks supply date, patient KYC, registered medical practitioner details, and batch numbers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" /> Print Register
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Record Entry
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400 z-50 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Patient, Doctor Reg No, Drug, Batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Total Audited Transactions: <strong className="text-emerald-400">{filteredRecords.length}</strong>
        </div>
      </div>

      {/* Official Schedule H1 Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold">
                <th className="p-3.5">Date & Invoice</th>
                <th className="p-3.5">Patient Name & Address / Mobile</th>
                <th className="p-3.5">Prescriber Doctor & Reg. No.</th>
                <th className="p-3.5">Drug Name</th>
                <th className="p-3.5">Batch No.</th>
                <th className="p-3.5 text-right">Qty</th>
                <th className="p-3.5">Manufacturer</th>
                <th className="p-3.5 text-center">Pharmacist Sign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 animate-pulse">
                    Loading statutory Schedule H1 ledger...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No Schedule H1 drug dispensations recorded yet.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5">
                      <div className="font-medium text-slate-300">
                        {new Date(r.supplyDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{r.invoiceNumber}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-200 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {r.patientName}
                      </div>
                      <div className="text-[11px] text-slate-400">{r.patientAddressPhone}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-teal-300 flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-teal-400" />
                        {r.prescriberDoctorName}
                      </div>
                      <span className="px-1.5 py-0.2 bg-teal-950/60 border border-teal-800 text-[10px] font-mono text-teal-400 rounded">
                        Reg: {r.prescriberRegNumber}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-white flex items-center gap-1">
                        <Pill className="w-3 h-3 text-emerald-400" />
                        {r.drugName}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-800 text-cyan-400 font-mono font-semibold rounded border border-slate-700">
                        {r.batchNumber}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-400">
                      {r.quantitySupplied}
                    </td>
                    <td className="p-3.5 text-slate-400">{r.manufacturerName}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Signed
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Schedule H1 Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Record Schedule H1 Dispensation
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Invoice Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-8812"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Patient Full Name"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Address / Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Mobile / City Address"
                    value={formData.patientAddressPhone}
                    onChange={(e) => setFormData({ ...formData, patientAddressPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Prescriber Doctor Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Full Name"
                    value={formData.prescriberDoctorName}
                    onChange={(e) => setFormData({ ...formData, prescriberDoctorName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Doctor Council Reg. No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DMC-44910"
                    value={formData.prescriberRegNumber}
                    onChange={(e) => setFormData({ ...formData, prescriberRegNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Drug Name (Schedule H1) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alprazolam 0.5mg"
                    value={formData.drugName}
                    onChange={(e) => setFormData({ ...formData, drugName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="10"
                    value={formData.quantitySupplied}
                    onChange={(e) => setFormData({ ...formData, quantitySupplied: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    placeholder="BAT-2026-XX"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Torrent Pharma"
                    value={formData.manufacturerName}
                    onChange={(e) => setFormData({ ...formData, manufacturerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg"
                >
                  Confirm & Sign Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
