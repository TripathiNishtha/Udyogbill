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
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  MapPin,
  Route,
  History,
  UserCheck,
  Calendar,
  Briefcase,
  Download,
  UploadCloud,
  FileSpreadsheet,
  Compass
} from "lucide-react";
import {
  pharmaDeepService,
  DoctorPrescriber,
  MedicalRepresentative
} from "@/services/pharma-deep-services";
import {
  pharmaSfaService,
  SfaDivision,
  SfaPatch,
  SfaBeat,
  SfaEmployeeProfile,
  SfaDoctorAllocationHistory,
  BulkDoctorImportItem,
  BulkImportResult
} from "@/services/pharma-sfa-services";
import { useAddons } from "@/context/addon-context";

export default function PharmaPrescribersPage() {
  const { isAddonActive, loading: addonLoading } = useAddons();
  const hasSfa = isAddonActive("pharma-sfa");

  const [activeTab, setActiveTab] = useState<"doctors" | "mrs">("doctors");
  const [doctors, setDoctors] = useState<DoctorPrescriber[]>([]);
  const [mrs, setMrs] = useState<MedicalRepresentative[]>([]);
  const [loading, setLoading] = useState(true);

  // SFA Masters for Dropdowns & Mapping
  const [divisions, setDivisions] = useState<SfaDivision[]>([]);
  const [patches, setPatches] = useState<SfaPatch[]>([]);
  const [beats, setBeats] = useState<SfaBeat[]>([]);
  const [fieldStaff, setFieldStaff] = useState<SfaEmployeeProfile[]>([]);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatchFilter, setSelectedPatchFilter] = useState("");

  // Create Doctor Modal & State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docQual, setDocQual] = useState("MBBS, MD");
  const [docSpec, setDocSpec] = useState("General Physician");
  const [docSubSpec, setDocSubSpec] = useState("");
  const [docPriority, setDocPriority] = useState("High");
  const [docClassification, setDocClassification] = useState("Core");
  const [docReg, setDocReg] = useState("DMC-");
  const [docClinic, setDocClinic] = useState("");
  const [docMobile, setDocMobile] = useState("");
  const [docComm, setDocComm] = useState<number>(5);
  const [docLat, setDocLat] = useState("");
  const [docLng, setDocLng] = useState("");
  const [docGeofence, setDocGeofence] = useState<number>(200);
  const [selectedDivId, setSelectedDivId] = useState("");
  const [selectedPatchId, setSelectedPatchId] = useState("");
  const [selectedBeatId, setSelectedBeatId] = useState("");
  const [selectedMrId, setSelectedMrId] = useState("");
  const [preferredVisitDay, setPreferredVisitDay] = useState("Tuesday");
  const [preferredVisitTime, setPreferredVisitTime] = useState("Evening (5PM - 8PM)");

  // Bulk Import Modal & State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreviewItems, setBulkPreviewItems] = useState<BulkDoctorImportItem[]>([]);
  const [bulkOverwrite, setBulkOverwrite] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<BulkImportResult | null>(null);

  // Doctor Reallocation Modal & State
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);
  const [reallocateDoctorId, setReallocateDoctorId] = useState("");
  const [reallocateDoctorName, setReallocateDoctorName] = useState("");
  const [newMrUserId, setNewMrUserId] = useState("");
  const [reallocationReason, setReallocationReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);

  // Allocation History Modal & State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyDoctorName, setHistoryDoctorName] = useState("");
  const [allocationHistories, setAllocationHistories] = useState<SfaDoctorAllocationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dList, mList, divList, patList, beatList, staffList] = await Promise.allSettled([
        pharmaDeepService.getDoctors(),
        pharmaDeepService.getMedicalReps(),
        pharmaSfaService.getDivisions(),
        pharmaSfaService.getPatches(),
        pharmaSfaService.getBeats(),
        pharmaSfaService.getEmployees()
      ]);

      if (dList.status === "fulfilled") setDoctors(dList.value);
      if (mList.status === "fulfilled") setMrs(mList.value);
      if (divList.status === "fulfilled") setDivisions(divList.value);
      if (patList.status === "fulfilled") setPatches(patList.value);
      if (beatList.status === "fulfilled") setBeats(beatList.value);
      if (staffList.status === "fulfilled") setFieldStaff(staffList.value);
    } catch (err) {
      console.error("Failed to load prescriber data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!addonLoading && hasSfa) {
      loadData();
    }
  }, [addonLoading, hasSfa]);

  const handleDownloadTemplate = () => {
    const headers = [
      "Name*",
      "Mobile*",
      "Specialty",
      "SubSpecialty",
      "Qualification",
      "RegistrationNumber",
      "ClinicHospitalName",
      "Address",
      "City",
      "State",
      "Pincode",
      "Email",
      "Classification",
      "VisitFrequencyPerMonth",
      "PreferredVisitDay",
      "PreferredVisitTime",
      "EstimatedMonthlyPotential",
      "DivisionCodeOrName",
      "PatchCodeOrName",
      "BeatCodeOrName",
      "AssignedMrEmployeeCodeOrName",
      "Latitude",
      "Longitude",
      "GeofenceRadiusMeters"
    ];
    const sampleRows = [
      [
        "Dr. Rakesh Sachan",
        "9811223344",
        "General Physician",
        "Diabetology",
        "MBBS, MD",
        "DMC-787878",
        "Sachan Clinic Care",
        "Civil Lines",
        "Kanpur",
        "Uttar Pradesh",
        "208001",
        "dr.rakesh@example.com",
        "Core",
        "2",
        "Tuesday",
        "Evening (5PM - 8PM)",
        "75000",
        "Pharma Division A",
        "Civil Lines Patch",
        "Beat 1",
        "EMP001",
        "26.4499",
        "80.3319",
        "200"
      ],
      [
        "Dr. Sunita Sharma",
        "9822334455",
        "Cardiologist",
        "Interventional Cardiology",
        "MBBS, MD, DM",
        "UPMC-445522",
        "Heart & Care Super Specialty",
        "Swaroop Nagar",
        "Kanpur",
        "Uttar Pradesh",
        "208002",
        "dr.sunita@heartcare.in",
        "SuperCore",
        "4",
        "Thursday",
        "Morning (10AM - 1PM)",
        "150000",
        "Pharma Division A",
        "Swaroop Nagar Patch",
        "Beat 2",
        "EMP001",
        "26.4712",
        "80.3122",
        "150"
      ]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...sampleRows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Doctor_Prescriber_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCsv = () => {
    if (doctors.length === 0) {
      setErrorMessage("No doctors found to export.");
      return;
    }
    const headers = ["Doctor Code", "Doctor Name", "Specialty", "Qualification", "Registration #", "Clinic/Hospital", "Mobile", "Email", "City", "Commission %", "Assigned MR", "Status"];
    const rows = filteredDoctors.map(d => [
      d.code || "",
      d.name || "",
      d.specialization || "",
      d.qualification || "",
      d.registrationNumber || "",
      d.clinicHospitalName || "",
      d.mobile || "",
      d.email || "",
      d.city || "",
      d.commissionPercent || 0,
      d.assignedMrName || "",
      d.isActive ? "Active" : "Inactive"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Doctors_Prescribers_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setBulkImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) {
        setErrorMessage("CSV file is empty or only contains a header.");
        return;
      }

      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = "";
          } else {
            cur += ch;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const parsedItems: BulkDoctorImportItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (!cols[0] || cols.length < 2) continue;

        parsedItems.push({
          name: cols[0] || "",
          mobile: cols[1] || "",
          specialty: cols[2] || "General Physician",
          subSpecialty: cols[3] || undefined,
          qualification: cols[4] || "MBBS",
          registrationNumber: cols[5] || "",
          clinicHospitalName: cols[6] || "",
          address: cols[7] || "",
          city: cols[8] || "",
          state: cols[9] || "",
          pincode: cols[10] || "",
          email: cols[11] || undefined,
          classification: cols[12] || "Core",
          visitFrequencyPerMonth: Number(cols[13]) || 2,
          preferredVisitDay: cols[14] || undefined,
          preferredVisitTime: cols[15] || undefined,
          estimatedMonthlyPotential: Number(cols[16]) || 50000,
          divisionCodeOrName: cols[17] || undefined,
          patchCodeOrName: cols[18] || undefined,
          beatCodeOrName: cols[19] || undefined,
          assignedMrEmployeeCodeOrName: cols[20] || undefined,
          latitude: cols[21] ? Number(cols[21]) : undefined,
          longitude: cols[22] ? Number(cols[22]) : undefined,
          geofenceRadiusMeters: cols[23] ? Number(cols[23]) : 200
        });
      }

      setBulkPreviewItems(parsedItems);
    };
    reader.readAsText(file);
  };

  const handleBulkImportSubmit = async () => {
    if (bulkPreviewItems.length === 0) {
      setErrorMessage("Please select a valid CSV file with doctor records.");
      return;
    }

    try {
      setIsImporting(true);
      setErrorMessage(null);
      const res = await pharmaSfaService.bulkImportDoctors(bulkPreviewItems, bulkOverwrite);
      setBulkImportResult(res);
      setSuccessMessage(`Bulk Import Complete: ${res.insertedCount} inserted, ${res.updatedCount} updated, ${res.skippedCount} skipped.`);
      await loadData();
    } catch (err: any) {
      console.error("Bulk import failed:", err);
      setErrorMessage(err.response?.data?.message || err.message || "Bulk import failed. Please check file format.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDocLat(pos.coords.latitude.toFixed(6));
        setDocLng(pos.coords.longitude.toFixed(6));
      },
      (err) => {
        console.warn("Could not retrieve GPS coordinates", err);
      }
    );
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) {
      setErrorMessage("Doctor full name is required.");
      return;
    }
    if (!docMobile.trim()) {
      setErrorMessage("Mobile number is required.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const assignedStaff = fieldStaff.find((s) => s.userId === selectedMrId);
      const assignedMrName = assignedStaff?.fullName || mrs[0]?.name || "Local MR";

      await pharmaDeepService.createDoctor({
        name: docName.trim(),
        qualification: docQual.trim() || "MBBS",
        specialization: docSpec.trim() || "General Physician",
        registrationNumber: docReg.trim() || "DMC-REG",
        clinicHospitalName: docClinic.trim() || "Private Clinic",
        address: "Main Road",
        city: "Lucknow",
        mobile: docMobile.trim(),
        commissionPercent: Number(docComm) || 0,
        assignedMrName
      });

      // Also ensure SFA Doctor sync for field force & geofencing
      try {
        await pharmaSfaService.createDoctor({
          name: docName.trim(),
          specialty: docSpec.trim() || "General Physician",
          subSpecialty: docSubSpec.trim() || undefined,
          priority: docPriority,
          qualification: docQual.trim() || "MBBS",
          registrationNumber: docReg.trim() || "DMC-REG",
          clinicHospitalName: docClinic.trim() || "Private Clinic",
          mobile: docMobile.trim(),
          address: "Main Road",
          city: "Lucknow",
          divisionId: selectedDivId || undefined,
          patchId: selectedPatchId || undefined,
          beatId: selectedBeatId || undefined,
          assignedMrUserId: selectedMrId || undefined,
          classification: docClassification || "Core",
          preferredVisitDay,
          preferredVisitTime,
          latitude: docLat ? Number(docLat) : undefined,
          longitude: docLng ? Number(docLng) : undefined,
          geofenceRadiusMeters: docGeofence || 200,
          isActive: true
        });
      } catch (sfaErr) {
        console.warn("SFA doctor sync info:", sfaErr);
      }

      setSuccessMessage(`Doctor "${docName.trim()}" registered successfully!`);
      setIsDocModalOpen(false);
      setDocName("");
      setDocMobile("");
      setDocClinic("");
      setDocReg("DMC-");
      setDocComm(5);
      setDocSubSpec("");
      setDocLat("");
      setDocLng("");
      setSelectedDivId("");
      setSelectedPatchId("");
      setSelectedBeatId("");
      setSelectedMrId("");
      await loadData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("Failed to register doctor:", err);
      const apiErr =
        err.response?.data?.errors?.Code?.[0] ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to register doctor profile. Please try again.";
      setErrorMessage(apiErr);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReallocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMrUserId || !reallocationReason.trim()) {
      setErrorMessage("Please select a new MR and enter the reallocation reason.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      await pharmaSfaService.reallocateDoctor({
        doctorId: reallocateDoctorId,
        newMrUserId,
        effectiveDate,
        reason: reallocationReason.trim()
      });

      setSuccessMessage(`Doctor "${reallocateDoctorName}" successfully reallocated to new MR!`);
      setIsReallocateModalOpen(false);
      setReallocateDoctorId("");
      setNewMrUserId("");
      setReallocationReason("");
      await loadData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || "Failed to reallocate doctor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewHistory = async (docId: string, docName: string) => {
    try {
      setHistoryDoctorName(docName);
      setIsHistoryModalOpen(true);
      setLoadingHistory(true);
      const histories = await pharmaSfaService.getDoctorHistories(docId);
      setAllocationHistories(histories);
    } catch (err) {
      console.error("Failed to load allocation history", err);
      setAllocationHistories([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.code.toLowerCase().includes(q) ||
      (doc.clinicHospitalName && doc.clinicHospitalName.toLowerCase().includes(q)) ||
      (doc.specialization && doc.specialization.toLowerCase().includes(q)) ||
      (doc.mobile && doc.mobile.includes(q))
    );
  });

  if (!addonLoading && !hasSfa) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-900/90 border border-indigo-500/30 rounded-2xl text-center space-y-5 shadow-2xl backdrop-blur-md">
        <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/30">
          <Award className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Pharma SFA &amp; Field Force Add-on Required</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Doctor Prescriber Directory, Medical Representatives (MR) Master, calling beats, and prescriber allocation are part of the dedicated Pharma SFA module.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/app/dashboard"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/app/settings/addons"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            Activate Pharma SFA Add-on
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Top Banner with Navigation to New SFA Modules */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-blue-900/30 to-purple-900/40 border border-emerald-500/30 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Pharma CBO Sales Force Automation Suite Active</h4>
            <p className="text-xs text-slate-300">
              Manage Divisions, Micro Patches, Calling Beats, and MR Roster with real-time attribution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/pharma/field-force"
            className="px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-sm"
          >
            <UserCheck className="w-3.5 h-3.5" /> Field Force (MR Master)
          </Link>
          <Link
            href="/app/pharma/territory-hierarchy"
            className="px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5" /> Divisions &amp; Patches
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between shadow-lg shadow-emerald-900/20 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Prescriber Doctors &amp; Medical Reps Master</h1>
            <p className="text-sm text-slate-400">Manage prescriber doctors, MR assignments, calling patches, and doctor reallocation</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            title="Export full list of doctors to CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setErrorMessage(null);
              setBulkFile(null);
              setBulkPreviewItems([]);
              setBulkImportResult(null);
              setIsBulkModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition cursor-pointer"
            title="Bulk Import Doctors from CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bulk Import (CSV)</span>
          </button>

          <button
            onClick={() => {
              setErrorMessage(null);
              setIsDocModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Register New Doctor</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search doctor by name, clinic, mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-medium">Active Prescribers: {doctors.length}</span>
        </div>
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
          <span>Registered Doctors Directory ({filteredDoctors.length})</span>
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
          {filteredDoctors.length === 0 && !loading ? (
            <div className="text-center py-16 px-4">
              <Users2 className="w-12 h-12 mx-auto mb-3 text-slate-600 opacity-60" />
              <p className="text-base font-semibold text-slate-300">No Prescriber Doctors Found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Register doctors prescribing medicine to track prescriptions, sales volume, and MR visit frequency.
              </p>
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setIsDocModalOpen(true);
                }}
                className="mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>Register First Doctor</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Doctor Code</th>
                    <th className="py-3.5 px-4">Doctor Name</th>
                    <th className="py-3.5 px-4">Specialization</th>
                    <th className="py-3.5 px-4">Clinic / Hospital</th>
                    <th className="py-3.5 px-4">Assigned MR</th>
                    <th className="py-3.5 px-4 text-center">Commission %</th>
                    <th className="py-3.5 px-4 text-right">Prescriptions (₹)</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {filteredDoctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-emerald-400">{doc.code}</td>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-white text-sm">{doc.name}</div>
                        <div className="text-xs text-slate-400 flex items-center space-x-3 mt-0.5">
                          {doc.mobile && (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{doc.mobile}</span>
                            </span>
                          )}
                          {doc.registrationNumber && (
                            <span className="text-indigo-400 font-mono text-[10px]">
                              Reg: {doc.registrationNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        <div className="font-medium text-slate-200">{doc.specialization}</div>
                        <div className="text-[11px] text-slate-400">{doc.qualification}</div>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        <div className="font-medium">{doc.clinicHospitalName}</div>
                        <div className="text-xs text-slate-400">{doc.city}</div>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-semibold text-indigo-300 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{doc.assignedMrName || "Unassigned"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-400">
                        {doc.commissionPercent}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white font-mono">
                        ₹{(doc.totalPrescriptionsValue || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setReallocateDoctorId(doc.id);
                              setReallocateDoctorName(doc.name);
                              setIsReallocateModalOpen(true);
                            }}
                            className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[11px] font-semibold transition"
                            title="Reallocate to another MR"
                          >
                            Reallocate
                          </button>
                          <button
                            onClick={() => handleViewHistory(doc.id, doc.name)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition flex items-center gap-1"
                            title="View Allocation Audit History"
                          >
                            <History className="w-3 h-3" /> History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <Award className="w-5 h-5 text-emerald-400" />
                <span>+ Register New Doctor / Prescriber</span>
              </div>
              <button onClick={() => setIsDocModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateDoctor} className="space-y-4 text-xs">
              {/* Doctor Basic Details */}
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
                    required
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Sub-Specialty</label>
                  <input
                    type="text"
                    placeholder="e.g. Diabetology / Pediatric"
                    value={docSubSpec}
                    onChange={(e) => setDocSubSpec(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Classification</label>
                  <select
                    value={docClassification}
                    onChange={(e) => setDocClassification(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  >
                    <option value="SuperCore">SuperCore (A+)</option>
                    <option value="Core">Core (A)</option>
                    <option value="Standard">Standard (B)</option>
                    <option value="Basic">Basic (C)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Priority</label>
                  <select
                    value={docPriority}
                    onChange={(e) => setDocPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-semibold focus:outline-none text-xs"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">State Council Reg #</label>
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

              {/* SFA Geofence & GPS */}
              <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" /> GPS Geofence Verification (MR App Anti-Fraud)
                  </span>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 border border-blue-500/30 transition flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" /> Auto-Detect GPS
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Latitude</label>
                    <input
                      type="text"
                      placeholder="26.8467"
                      value={docLat}
                      onChange={(e) => setDocLat(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-[11px] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Longitude</label>
                    <input
                      type="text"
                      placeholder="80.9462"
                      value={docLng}
                      onChange={(e) => setDocLng(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-[11px] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Radius (Meters)</label>
                    <input
                      type="number"
                      value={docGeofence}
                      onChange={(e) => setDocGeofence(Number(e.target.value) || 200)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-mono text-[11px] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SFA Hierarchy & MR Assignment */}
              <div className="pt-2 border-t border-slate-800">
                <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> SFA Hierarchy &amp; MR Assignment
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Calling Patch</label>
                    <select
                      value={selectedPatchId}
                      onChange={(e) => setSelectedPatchId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                    >
                      <option value="">Select Patch (e.g. Hazratganj)</option>
                      {patches.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Assigned MR Rep</label>
                    <select
                      value={selectedMrId}
                      onChange={(e) => setSelectedMrId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs font-semibold"
                    >
                      <option value="">Select Field Staff / MR</option>
                      {fieldStaff.map((s) => (
                        <option key={s.userId} value={s.userId}>{s.fullName} ({s.employeeCode})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Preferred Visit Day</label>
                    <select
                      value={preferredVisitDay}
                      onChange={(e) => setPreferredVisitDay(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Preferred Visit Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 1PM - 3PM or Evening"
                      value={preferredVisitTime}
                      onChange={(e) => setPreferredVisitTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSaving ? "Saving Doctor..." : "Save Doctor Profile"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Doctors Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <span>Bulk Import Prescribers / Doctors (CSV)</span>
              </div>
              <button
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkFile(null);
                  setBulkPreviewItems([]);
                  setBulkImportResult(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Prompt */}
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="text-slate-300">
                <span className="font-bold text-white block">Step 1: Download Standard Doctor Import Template</span>
                Use our pre-formatted CSV template with standard SFA columns (Name, Mobile, Specialty, Patch, MR Code, GPS).
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="shrink-0 flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template</span>
              </button>
            </div>

            {/* File Upload Area */}
            <div className="space-y-2 text-xs">
              <label className="text-slate-300 font-semibold block">Step 2: Upload Populated CSV File</label>
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center bg-slate-950/50 transition">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="hidden"
                  id="doctor-bulk-csv-input"
                />
                <label
                  htmlFor="doctor-bulk-csv-input"
                  className="cursor-pointer font-bold text-indigo-400 hover:text-indigo-300 block mb-1"
                >
                  {bulkFile ? bulkFile.name : "Click here to choose CSV file or drag & drop"}
                </label>
                <span className="text-[11px] text-slate-500 block">
                  {bulkFile ? `${(bulkFile.size / 1024).toFixed(1)} KB selected` : "Supports UTF-8 comma separated (.csv) up to 5MB"}
                </span>
              </div>
            </div>

            {/* Preview Section */}
            {bulkPreviewItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">
                    Previewing {bulkPreviewItems.length} records ready for import:
                  </span>
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkOverwrite}
                      onChange={(e) => setBulkOverwrite(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                    />
                    <span className="text-[11px] font-semibold text-amber-300">
                      Update existing doctor if Mobile or Reg # already exists
                    </span>
                  </label>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-900 sticky top-0 text-slate-400">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Doctor Name</th>
                        <th className="p-2">Mobile</th>
                        <th className="p-2">Specialty</th>
                        <th className="p-2">Reg #</th>
                        <th className="p-2">City</th>
                        <th className="p-2">Patch/MR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {bulkPreviewItems.slice(0, 10).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="p-2 text-slate-500">{idx + 1}</td>
                          <td className="p-2 font-bold text-white">{item.name}</td>
                          <td className="p-2 font-mono text-emerald-400">{item.mobile}</td>
                          <td className="p-2">{item.specialty || "-"}</td>
                          <td className="p-2 font-mono text-indigo-300">{item.registrationNumber || "-"}</td>
                          <td className="p-2">{item.city || "-"}</td>
                          <td className="p-2 text-slate-400">{item.patchCodeOrName || item.assignedMrEmployeeCodeOrName || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bulkPreviewItems.length > 10 && (
                    <div className="p-2 text-center text-[10px] text-slate-500 bg-slate-900/40">
                      + and {bulkPreviewItems.length - 10} more rows will be imported...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results Alert */}
            {bulkImportResult && (
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Inserted: {bulkImportResult.insertedCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                    Updated: {bulkImportResult.updatedCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    Skipped: {bulkImportResult.skippedCount}
                  </span>
                </div>
                {bulkImportResult.errors?.length > 0 && (
                  <div className="p-2 bg-red-950/40 border border-red-500/30 rounded-lg text-red-300 space-y-1 text-[11px]">
                    <span className="font-bold">Errors encountered:</span>
                    {bulkImportResult.errors.slice(0, 5).map((e, idx) => (
                      <div key={idx}>• {e}</div>
                    ))}
                  </div>
                )}
                {bulkImportResult.warnings?.length > 0 && (
                  <div className="p-2 bg-amber-950/40 border border-amber-500/30 rounded-lg text-amber-300 space-y-1 text-[11px]">
                    <span className="font-bold">Warnings:</span>
                    {bulkImportResult.warnings.slice(0, 5).map((w, idx) => (
                      <div key={idx}>• {w}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkFile(null);
                  setBulkPreviewItems([]);
                  setBulkImportResult(null);
                }}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isImporting || bulkPreviewItems.length === 0}
                onClick={handleBulkImportSubmit}
                className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isImporting ? "Importing Records..." : `Import ${bulkPreviewItems.length} Doctors Now`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reallocate Doctor */}
      {isReallocateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <span>Reallocate Doctor to New MR</span>
              </div>
              <button onClick={() => setIsReallocateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300">
              Doctor: <span className="font-bold text-white">{reallocateDoctorName}</span>
            </div>

            <form onSubmit={handleReallocate} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">New Assigned MR *</label>
                <select
                  required
                  value={newMrUserId}
                  onChange={(e) => setNewMrUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs font-semibold"
                >
                  <option value="">Select New MR</option>
                  {fieldStaff.map((s) => (
                    <option key={s.userId} value={s.userId}>{s.fullName} ({s.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Effective Date</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Reason for Reallocation *</label>
                <textarea
                  required
                  value={reallocationReason}
                  onChange={(e) => setReallocationReason(e.target.value)}
                  placeholder="e.g. Territory restructuring, MR vacancy handoff, beat optimization"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReallocateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {isSaving ? "Reallocating..." : "Confirm Reallocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Allocation History Audit Log */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <History className="w-5 h-5 text-purple-400" />
                <span>MR Allocation History • {historyDoctorName}</span>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading audit trail...</div>
            ) : allocationHistories.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No past reallocations recorded. Doctor is under initial assignment.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {allocationHistories.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">To: {h.toMrName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(h.effectiveDate).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    {h.fromMrName && <p className="text-slate-400">Previous: {h.fromMrName}</p>}
                    <p className="text-slate-300 italic">&quot;{h.reason}&quot;</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
