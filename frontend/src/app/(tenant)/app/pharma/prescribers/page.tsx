"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users2,
  Plus,
  ArrowLeft,
  Search,
  CheckCircle,
  Building2,
  Phone,
  Mail,
  Award,
  TrendingUp,
  X
} from "lucide-react";
import {
  pharmaDeepService,
  DoctorPrescriber,
  MedicalRepresentative
} from "@/services/pharma-deep-services";

export default function PharmaPrescribersPage() {
  const [activeTab, setActiveTab] = useState<"doctors" | "mrs">("doctors");
  const [doctors, setDoctors] = useState<DoctorPrescriber[]>([]);
  const [mrs, setMrs] = useState<MedicalRepresentative[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Doctor Modal
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docQual, setDocQual] = useState("MBBS, MD");
  const [docSpec, setDocSpec] = useState("General Physician");
  const [docReg, setDocReg] = useState("DMC-");
  const [docClinic, setDocClinic] = useState("");
  const [docMobile, setDocMobile] = useState("");
  const [docComm, setDocComm] = useState<number>(5);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dList, mList] = await Promise.all([
        pharmaDeepService.getDoctors(),
        pharmaDeepService.getMedicalReps()
      ]);
      setDoctors(dList);
      setMrs(mList);
    } catch (err) {
      console.error("Failed to load doctors", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    await pharmaDeepService.createDoctor({
      name: docName.trim(),
      qualification: docQual.trim(),
      specialization: docSpec.trim(),
      registrationNumber: docReg.trim(),
      clinicHospitalName: docClinic.trim() || "Private Clinic",
      address: "Main Road",
      city: "Delhi",
      mobile: docMobile.trim() || "9811000000",
      commissionPercent: Number(docComm) || 5,
      assignedMrName: mrs[0]?.name || "Local MR"
    });

    setIsDocModalOpen(false);
    setDocName("");
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Doctors &amp; Medical Reps (MR) Master</h1>
            <p className="text-sm text-slate-400">Manage prescriber doctors, MR territories, and prescription commission analytics</p>
          </div>
        </div>

        <button
          onClick={() => setIsDocModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Doctor / Prescriber</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6">
        <button
          onClick={() => setActiveTab("doctors")}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === "doctors"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Registered Doctors Directory ({doctors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("mrs")}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === "mrs"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Medical Representatives (MR) ({mrs.length})</span>
        </button>
      </div>

      {/* Doctors Tab */}
      {activeTab === "doctors" && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Doctor Code</th>
                  <th className="py-3.5 px-4">Doctor Name</th>
                  <th className="py-3.5 px-4">Qualification / Specialization</th>
                  <th className="py-3.5 px-4">Council Reg #</th>
                  <th className="py-3.5 px-4">Clinic / Hospital</th>
                  <th className="py-3.5 px-4 text-center">Commission %</th>
                  <th className="py-3.5 px-4 text-right">Prescriptions (₹)</th>
                  <th className="py-3.5 px-4 text-right">Commission Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-emerald-400">{doc.code}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-white text-sm">{doc.name}</div>
                      <div className="text-slate-400 text-xs font-mono">{doc.mobile}</div>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">
                      {doc.qualification} ({doc.specialization})
                    </td>
                    <td className="py-3.5 px-4 text-indigo-400 font-bold">{doc.registrationNumber}</td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">{doc.clinicHospitalName}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-400">{doc.commissionPercent}%</td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">
                      ₹{doc.totalPrescriptionsValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      ₹{doc.balanceCommission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MRs Tab */}
      {activeTab === "mrs" && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">MR Code</th>
                  <th className="py-3.5 px-4">Representative Name</th>
                  <th className="py-3.5 px-4">Assigned Territory</th>
                  <th className="py-3.5 px-4 text-center">Linked Doctors</th>
                  <th className="py-3.5 px-4 text-right">Monthly Target</th>
                  <th className="py-3.5 px-4 text-right">Achievement</th>
                  <th className="py-3.5 px-4 text-center">Progress %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {mrs.map((mr) => (
                  <tr key={mr.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-indigo-400">{mr.empCode}</td>
                    <td className="py-3.5 px-4 font-sans font-bold text-white text-sm">{mr.name}</td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">{mr.territory}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-white">{mr.linkedDoctorsCount} Doctors</td>
                    <td className="py-3.5 px-4 text-right">₹{mr.monthlyTarget.toLocaleString("en-IN")}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      ₹{mr.monthlyAchievement.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {mr.achievementPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Doctor Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <Award className="w-5 h-5 text-emerald-400" />
                <span>+ Register New Doctor / Prescriber</span>
              </div>
              <button onClick={() => setIsDocModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Doctor Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Rakesh Gupta"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    placeholder="9811223344"
                    value={docMobile}
                    onChange={(e) => setDocMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Qualification</label>
                  <input
                    type="text"
                    placeholder="MBBS, MD"
                    value={docQual}
                    onChange={(e) => setDocQual(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Specialization</label>
                  <input
                    type="text"
                    placeholder="Cardiologist / Physician"
                    value={docSpec}
                    onChange={(e) => setDocSpec(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">State Council Reg # *</label>
                  <input
                    type="text"
                    placeholder="DMC-55910"
                    value={docReg}
                    onChange={(e) => setDocReg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-indigo-300 font-mono focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Commission %</label>
                  <input
                    type="number"
                    value={docComm}
                    onChange={(e) => setDocComm(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-mono font-bold text-center focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Clinic / Hospital Name</label>
                <input
                  type="text"
                  placeholder="e.g. City Heart & Diabetes Care Clinic"
                  value={docClinic}
                  onChange={(e) => setDocClinic(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  Save Doctor Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
