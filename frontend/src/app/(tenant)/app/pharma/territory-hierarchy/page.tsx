"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Route,
  Plus,
  Search,
  CheckCircle,
  Users,
  ChevronRight,
  Calendar,
  Compass,
  ArrowLeft,
  Edit2,
  Trash2,
  AlertTriangle
} from "lucide-react";
import {
  pharmaSfaService,
  SfaDivision,
  SfaPatch,
  SfaBeat,
  SfaTerritory
} from "@/services/pharma-sfa-services";

export default function TerritoryHierarchyPage() {
  const [activeTab, setActiveTab] = useState<"divisions" | "territories" | "patches" | "beats">("divisions");

  const [divisions, setDivisions] = useState<SfaDivision[]>([]);
  const [territories, setTerritories] = useState<SfaTerritory[]>([]);
  const [patches, setPatches] = useState<SfaPatch[]>([]);
  const [beats, setBeats] = useState<SfaBeat[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [isTerritoryModalOpen, setIsTerritoryModalOpen] = useState(false);
  const [isPatchModalOpen, setIsPatchModalOpen] = useState(false);
  const [isBeatModalOpen, setIsBeatModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [divCode, setDivCode] = useState("");
  const [divName, setDivName] = useState("");
  const [divDesc, setDivDesc] = useState("");

  const [terCode, setTerCode] = useState("");
  const [terName, setTerName] = useState("");
  const [terCity, setTerCity] = useState("");
  const [terState, setTerState] = useState("");
  const [terPincodes, setTerPincodes] = useState("");
  const [editingTerritory, setEditingTerritory] = useState<SfaTerritory | null>(null);
  const [deleteTargetTerritory, setDeleteTargetTerritory] = useState<SfaTerritory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  const [patchCode, setPatchCode] = useState("");
  const [patchName, setPatchName] = useState("");
  const [patchDivId, setPatchDivId] = useState("");
  const [patchAreaId, setPatchAreaId] = useState("");
  const [patchHqCity, setPatchHqCity] = useState("");
  const [patchDesc, setPatchDesc] = useState("");

  const [beatCode, setBeatCode] = useState("");
  const [beatName, setBeatName] = useState("");
  const [beatPatchId, setBeatPatchId] = useState("");
  const [beatDayOfWeek, setBeatDayOfWeek] = useState<number>(1); // Monday
  const [beatRouteDesc, setBeatRouteDesc] = useState("");
  const [beatDistance, setBeatDistance] = useState<number>(12);

  const loadData = async () => {
    try {
      setLoading(true);
      const [divRes, terRes, patRes, beatRes] = await Promise.allSettled([
        pharmaSfaService.getDivisions(),
        pharmaSfaService.getTerritories(),
        pharmaSfaService.getPatches(),
        pharmaSfaService.getBeats()
      ]);

      if (divRes.status === "fulfilled") setDivisions(divRes.value);
      if (terRes.status === "fulfilled") setTerritories(terRes.value);
      if (patRes.status === "fulfilled") setPatches(patRes.value);
      if (beatRes.status === "fulfilled") setBeats(beatRes.value);
    } catch (err) {
      console.error("Failed to load hierarchy data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!divName.trim() || !divCode.trim()) return;
    try {
      setSaving(true);
      await pharmaSfaService.createDivision({
        code: divCode,
        name: divName,
        description: divDesc
      });
      setFeedbackMsg({ type: "success", text: `Division "${divName}" created successfully!` });
      setIsDivModalOpen(false);
      setDivCode("");
      setDivName("");
      setDivDesc("");
      loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Failed to create division" });
    } finally {
      setSaving(false);
    }
  };

  const openAddTerritoryModal = () => {
    setEditingTerritory(null);
    setTerCode(`TER-${Math.floor(100 + Math.random() * 900)}`);
    setTerName("");
    setTerCity("");
    setTerState("");
    setTerPincodes("");
    setIsTerritoryModalOpen(true);
  };

  const openEditTerritoryModal = (t: SfaTerritory) => {
    setEditingTerritory(t);
    setTerCode(t.code);
    setTerName(t.name);
    setTerCity(t.city || "");
    setTerState(t.state || "");
    setTerPincodes(t.coveredPincodes || "");
    setIsTerritoryModalOpen(true);
  };

  const handleSaveTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terName.trim() || !terCode.trim()) return;
    try {
      setSaving(true);
      if (editingTerritory) {
        await pharmaSfaService.updateTerritory(editingTerritory.id, {
          code: terCode,
          name: terName,
          city: terCity,
          state: terState,
          coveredPincodes: terPincodes,
          isActive: true
        });
        setFeedbackMsg({ type: "success", text: `Territory / Area "${terName}" updated successfully!` });
      } else {
        await pharmaSfaService.createTerritory({
          code: terCode,
          name: terName,
          city: terCity,
          state: terState,
          coveredPincodes: terPincodes,
          isActive: true
        });
        setFeedbackMsg({ type: "success", text: `Territory / Area "${terName}" created successfully!` });
      }
      setIsTerritoryModalOpen(false);
      setEditingTerritory(null);
      setTerCode("");
      setTerName("");
      setTerCity("");
      setTerState("");
      setTerPincodes("");
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to save territory / area";
      setFeedbackMsg({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerritory = async () => {
    if (!deleteTargetTerritory) return;
    try {
      setIsDeleting(true);
      await pharmaSfaService.deleteTerritory(deleteTargetTerritory.id);
      setFeedbackMsg({ type: "success", text: `Territory / Area "${deleteTargetTerritory.name}" deleted successfully!` });
      setDeleteTargetTerritory(null);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to delete territory";
      setFeedbackMsg({ type: "error", text: msg });
    } finally {
      setIsDeleting(false);
    }
  };


  const handleCreatePatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patchName.trim() || !patchCode.trim()) return;
    try {
      setSaving(true);
      await pharmaSfaService.createPatch({
        code: patchCode,
        name: patchName,
        divisionId: patchDivId || undefined,
        areaTerritoryId: patchAreaId || undefined,
        headquarterCity: patchHqCity,
        description: patchDesc
      });
      setFeedbackMsg({ type: "success", text: `Patch "${patchName}" created successfully!` });
      setIsPatchModalOpen(false);
      setPatchCode("");
      setPatchName("");
      setPatchDivId("");
      setPatchAreaId("");
      setPatchHqCity("");
      setPatchDesc("");
      loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Failed to create patch" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beatName.trim() || !beatCode.trim() || !beatPatchId) return;
    try {
      setSaving(true);
      await pharmaSfaService.createBeat({
        code: beatCode,
        name: beatName,
        patchId: beatPatchId,
        scheduledDayOfWeek: beatDayOfWeek,
        routeDescription: beatRouteDesc,
        estimatedDistanceKm: beatDistance
      });
      setFeedbackMsg({ type: "success", text: `Beat "${beatName}" scheduled successfully!` });
      setIsBeatModalOpen(false);
      setBeatCode("");
      setBeatName("");
      setBeatPatchId("");
      setBeatRouteDesc("");
      setBeatDistance(12);
      loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Failed to create beat" });
    } finally {
      setSaving(false);
    }
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <Link href="/app/pharma/field-force" className="flex items-center gap-1 hover:underline">
              <ArrowLeft className="w-3 h-3" /> Field Force Hub
            </Link>
            <span>•</span>
            <span>CBO Territory Hierarchy</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Divisions, Patches & Calling Beats</h1>
          <p className="text-sm text-gray-500">
            Define multi-division business units, micro calling patches, and daily recurring chemist/doctor beats.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "divisions" && (
            <button
              onClick={() => {
                setDivCode(`DIV-${Math.floor(100 + Math.random() * 900)}`);
                setIsDivModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Division
            </button>
          )}

          {activeTab === "territories" && (
            <button
              onClick={openAddTerritoryModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Territory / Area
            </button>
          )}

          {activeTab === "patches" && (
            <button
              onClick={() => {
                setPatchCode(`PAT-${Math.floor(100 + Math.random() * 900)}`);
                setIsPatchModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Patch
            </button>
          )}

          {activeTab === "beats" && (
            <button
              onClick={() => {
                setBeatCode(`BEAT-${Math.floor(100 + Math.random() * 900)}`);
                setIsBeatModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Calling Beat
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("divisions")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === "divisions"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Pharma Divisions ({divisions.length})
        </button>

        <button
          onClick={() => setActiveTab("territories")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === "territories"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Compass className="w-4 h-4" />
          Territories / Areas ({territories.length})
        </button>

        <button
          onClick={() => setActiveTab("patches")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === "patches"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <MapPin className="w-4 h-4" />
          Micro Patches ({patches.length})
        </button>

        <button
          onClick={() => setActiveTab("beats")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === "beats"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Route className="w-4 h-4" />
          Daily Beats & Routes ({beats.length})
        </button>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-center justify-between ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="font-bold">&times;</button>
        </div>
      )}

      {/* TAB 1: DIVISIONS */}
      {activeTab === "divisions" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {divisions.map((div) => (
              <div key={div.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-emerald-300 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 font-mono">
                    {div.code}
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Active
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900">{div.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {div.description || "Cardio, diabetic, derma, or specialty therapeutic portfolio."}
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1 font-medium text-gray-700">
                    <Users className="w-3.5 h-3.5 text-blue-500" /> {div.totalEmployeesCount || 0} Staff
                  </span>
                  <span className="flex items-center gap-1 font-medium text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" /> {div.totalPatchesCount || 0} Patches
                  </span>
                </div>
              </div>
            ))}
          </div>

          {divisions.length === 0 && !loading && (
            <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-gray-700">No pharma divisions found</p>
              <p className="text-xs text-gray-400 mt-1">Add your therapeutic divisions (e.g. Cardio, Neuro, Derma) to segment field reps.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TERRITORIES / AREAS */}
      {activeTab === "territories" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Territory / Area Code & Name</th>
                <th className="px-6 py-3">City / HQ</th>
                <th className="px-6 py-3">State</th>
                <th className="px-6 py-3">Covered Pincodes</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {territories.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{t.code}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">{t.city || "—"}</td>
                  <td className="px-6 py-4 text-gray-700">{t.state || "—"}</td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-500">{t.coveredPincodes || "All Pincodes"}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditTerritoryModal(t)}
                        title="Edit Area"
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetTerritory(t)}
                        title="Delete Area"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {territories.length === 0 && !loading && (
            <div className="p-12 text-center text-gray-400">
              <Compass className="w-12 h-12 mx-auto mb-2 opacity-30 text-emerald-600" />
              <p className="text-sm font-semibold text-gray-700">No territories / areas configured yet</p>
              <p className="text-xs text-gray-400 mt-1">Click "+ Add Territory / Area" to define regional sales areas (e.g. Lucknow South, Kanpur Central).</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PATCHES */}
      {activeTab === "patches" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Patch Code & Name</th>
                <th className="px-6 py-3">Division</th>
                <th className="px-6 py-3">HQ / Territory Area</th>
                <th className="px-6 py-3 text-center">Beats</th>
                <th className="px-6 py-3 text-center">Doctors</th>
                <th className="px-6 py-3 text-center">Chemists</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patches.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{p.code}</div>
                    {p.description && <div className="text-xs text-gray-400 mt-0.5">{p.description}</div>}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {p.divisionName ? (
                      <span className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        <Building2 className="w-3 h-3" /> {p.divisionName}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">General / Multi</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800">{p.headquarterCity || "Headquarter"}</div>
                    <div className="text-xs text-gray-500">{p.areaTerritoryName || "Area Unassigned"}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-gray-800">{p.totalBeatsCount || 0}</td>
                  <td className="px-6 py-4 text-center font-bold text-blue-700">{p.totalDoctorsCount || 0}</td>
                  <td className="px-6 py-4 text-center font-bold text-emerald-700">{p.totalChemistsCount || 0}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {patches.length === 0 && !loading && (
            <div className="p-12 text-center text-gray-400">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No patches created yet</p>
              <p className="text-xs text-gray-400 mt-1">Create micro patches (e.g. Hazratganj, Aliganj) to allocate to MRs.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BEATS */}
      {activeTab === "beats" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Beat Code & Route</th>
                <th className="px-6 py-3">Parent Patch</th>
                <th className="px-6 py-3">Scheduled Day</th>
                <th className="px-6 py-3">Est. Distance</th>
                <th className="px-6 py-3 text-center">Doctors</th>
                <th className="px-6 py-3 text-center">Chemists</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {beats.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{b.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{b.code}</div>
                    {b.routeDescription && (
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Compass className="w-3 h-3 text-blue-500" /> {b.routeDescription}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      <MapPin className="w-3 h-3" /> {b.patchName || "Patch"}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {b.scheduledDayOfWeek !== undefined && b.scheduledDayOfWeek !== null ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800">
                        {dayNames[b.scheduledDayOfWeek] || "Weekly"}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Flexible</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-700">{b.estimatedDistanceKm} km</td>
                  <td className="px-6 py-4 text-center font-bold text-blue-700">{b.totalDoctorsCount || 0}</td>
                  <td className="px-6 py-4 text-center font-bold text-emerald-700">{b.totalChemistsCount || 0}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {beats.length === 0 && !loading && (
            <div className="p-12 text-center text-gray-400">
              <Route className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No beats configured yet</p>
              <p className="text-xs text-gray-400 mt-1">Configure daily calling beats for regular doctor and chemist coverage.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Division */}
      {isDivModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Add Pharma Division</h3>
            <p className="text-xs text-gray-500 mb-4">Create a therapeutic business unit for field rep segmentation.</p>

            <form onSubmit={handleCreateDivision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Division Code *</label>
                <input
                  type="text"
                  required
                  value={divCode}
                  onChange={(e) => setDivCode(e.target.value)}
                  placeholder="e.g. DIV-CARDIO"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Division Name *</label>
                <input
                  type="text"
                  required
                  value={divName}
                  onChange={(e) => setDivName(e.target.value)}
                  placeholder="e.g. Cardio-Diabetic Division"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Focus</label>
                <textarea
                  value={divDesc}
                  onChange={(e) => setDivDesc(e.target.value)}
                  placeholder="e.g. Cardiology, Hypertension, Lipid regulators portfolio"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsDivModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Division"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Territory / Area */}
      {isTerritoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {editingTerritory ? "Edit Territory / Area" : "Add Territory / Area"}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {editingTerritory
                ? "Update details for this sales territory or city hub."
                : "Define a regional sales territory or city hub for field MRs."}
            </p>

            <form onSubmit={handleSaveTerritory} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Area Code *</label>
                  <input
                    type="text"
                    required
                    value={terCode}
                    onChange={(e) => setTerCode(e.target.value)}
                    placeholder="e.g. TER-LKO-S"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Territory / Area Name *</label>
                  <input
                    type="text"
                    required
                    value={terName}
                    onChange={(e) => setTerName(e.target.value)}
                    placeholder="e.g. Lucknow South"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">City / HQ</label>
                  <input
                    type="text"
                    value={terCity}
                    onChange={(e) => setTerCity(e.target.value)}
                    placeholder="e.g. Lucknow"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={terState}
                    onChange={(e) => setTerState(e.target.value)}
                    placeholder="e.g. Uttar Pradesh"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Covered Pincodes</label>
                <input
                  type="text"
                  value={terPincodes}
                  onChange={(e) => setTerPincodes(e.target.value)}
                  placeholder="e.g. 226001, 226002, 226010"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsTerritoryModalOpen(false);
                    setEditingTerritory(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingTerritory ? "Update Area" : "Save Territory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteTargetTerritory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">Delete Territory / Area?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-gray-800">"{deleteTargetTerritory.name}"</span> ({deleteTargetTerritory.code})?
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 mt-2.5 text-left border border-amber-200">
                ⚠️ Agar is area se koi Calling Patch ya Chemist linked hoga toh pehle unhe delete ya move karna hoga.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTargetTerritory(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteTerritory}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? "Deleting..." : "Delete Area"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Patch */}
      {isPatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Add Calling Patch</h3>
            <p className="text-xs text-gray-500 mb-4">Define a micro-market calling cluster for an assigned MR.</p>

            <form onSubmit={handleCreatePatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Patch Code *</label>
                  <input
                    type="text"
                    required
                    value={patchCode}
                    onChange={(e) => setPatchCode(e.target.value)}
                    placeholder="e.g. PAT-LKO-01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Patch Name *</label>
                  <input
                    type="text"
                    required
                    value={patchName}
                    onChange={(e) => setPatchName(e.target.value)}
                    placeholder="e.g. Hazratganj Central"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Division</label>
                <select
                  value={patchDivId}
                  onChange={(e) => setPatchDivId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All / Multi-Division</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Territory / Area</label>
                    <button
                      type="button"
                      onClick={() => {
                        setTerCode(`TER-${Math.floor(100 + Math.random() * 900)}`);
                        setIsTerritoryModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800"
                    >
                      + New Area
                    </button>
                  </div>
                  <select
                    value={patchAreaId}
                    onChange={(e) => setPatchAreaId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Area</option>
                    {territories.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">HQ City</label>
                  <input
                    type="text"
                    value={patchHqCity}
                    onChange={(e) => setPatchHqCity(e.target.value)}
                    placeholder="e.g. Lucknow"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={patchDesc}
                  onChange={(e) => setPatchDesc(e.target.value)}
                  placeholder="e.g. Civil hospital road, Mayfair, Cathedral zone"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPatchModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Patch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Beat */}
      {isBeatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Add Calling Beat</h3>
            <p className="text-xs text-gray-500 mb-4">Schedule a day-of-week route for doctor and chemist visits.</p>

            <form onSubmit={handleCreateBeat} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Beat Code *</label>
                  <input
                    type="text"
                    required
                    value={beatCode}
                    onChange={(e) => setBeatCode(e.target.value)}
                    placeholder="e.g. BEAT-MON-01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Beat Name *</label>
                  <input
                    type="text"
                    required
                    value={beatName}
                    onChange={(e) => setBeatName(e.target.value)}
                    placeholder="e.g. Monday Core Beat"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Parent Patch *</label>
                <select
                  required
                  value={beatPatchId}
                  onChange={(e) => setBeatPatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Patch</option>
                  {patches.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Scheduled Day</label>
                  <select
                    value={beatDayOfWeek}
                    onChange={(e) => setBeatDayOfWeek(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Est. Distance (km)</label>
                  <input
                    type="number"
                    value={beatDistance}
                    onChange={(e) => setBeatDistance(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Route Waypoints</label>
                <textarea
                  value={beatRouteDesc}
                  onChange={(e) => setBeatRouteDesc(e.target.value)}
                  placeholder="e.g. Civil Hospital -> Cathedral -> Habibullah Estate"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsBeatModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Beat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
