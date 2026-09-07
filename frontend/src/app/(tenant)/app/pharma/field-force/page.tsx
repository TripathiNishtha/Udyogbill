"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Building2,
  MapPin,
  Briefcase,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Filter,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  UserCheck,
  Award
} from "lucide-react";
import {
  pharmaSfaService,
  SfaEmployeeProfile,
  SfaDivision,
  SfaTerritory,
  SfaPatch,
  SeatQuotaStatus
} from "@/services/pharma-sfa-services";

export default function FieldForceManagementPage() {
  const [employees, setEmployees] = useState<SfaEmployeeProfile[]>([]);
  const [divisions, setDivisions] = useState<SfaDivision[]>([]);
  const [territories, setTerritories] = useState<SfaTerritory[]>([]);
  const [patches, setPatches] = useState<SfaPatch[]>([]);
  const [quota, setQuota] = useState<SeatQuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form fields
  const [empCode, setEmpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("UdyogBill@123");
  const [mobile, setMobile] = useState("");
  const [gender, setGender] = useState("Male");
  const [designationRole, setDesignationRole] = useState<number>(1); // 1=MR
  const [designationTitle, setDesignationTitle] = useState("Medical Representative");
  const [divisionId, setDivisionId] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const [patchId, setPatchId] = useState("");
  const [reportingToUserId, setReportingToUserId] = useState("");
  const [hqCity, setHqCity] = useState("");
  const [dailyAllowanceRate, setDailyAllowanceRate] = useState<number>(350);
  const [monthlyExpenseLimit, setMonthlyExpenseLimit] = useState<number>(15000);
  const [monthlyTargetAmount, setMonthlyTargetAmount] = useState<number>(250000);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empList, divList, terList, patList, quotaRes] = await Promise.allSettled([
        pharmaSfaService.getEmployees(selectedDivision || undefined, selectedRole ? parseInt(selectedRole) : undefined),
        pharmaSfaService.getDivisions(),
        pharmaSfaService.getTerritories(),
        pharmaSfaService.getPatches(),
        pharmaSfaService.getQuotaStatus()
      ]);

      if (empList.status === "fulfilled") setEmployees(empList.value);
      if (divList.status === "fulfilled") setDivisions(divList.value);
      if (terList.status === "fulfilled") setTerritories(terList.value);
      if (patList.status === "fulfilled") setPatches(patList.value);
      if (quotaRes.status === "fulfilled") setQuota(quotaRes.value);
    } catch (err) {
      console.error("Failed to load field force data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDivision, selectedRole]);

  const handleRoleChange = (roleVal: number) => {
    setDesignationRole(roleVal);
    switch (roleVal) {
      case 1:
        setDesignationTitle("Medical Representative");
        setDailyAllowanceRate(350);
        setMonthlyTargetAmount(250000);
        break;
      case 2:
        setDesignationTitle("Area Business Manager (ABM)");
        setDailyAllowanceRate(600);
        setMonthlyTargetAmount(1000000);
        break;
      case 3:
        setDesignationTitle("Regional Sales Manager (RSM)");
        setDailyAllowanceRate(900);
        setMonthlyTargetAmount(3000000);
        break;
      case 4:
        setDesignationTitle("Zonal Sales Manager (ZSM)");
        setDailyAllowanceRate(1200);
        setMonthlyTargetAmount(10000000);
        break;
      case 5:
        setDesignationTitle("National Sales Manager (NSM)");
        setDailyAllowanceRate(1500);
        setMonthlyTargetAmount(50000000);
        break;
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!fullName.trim() || !email.trim() || !empCode.trim()) {
      setErrorMsg("Employee Code, Full Name, and Email are required.");
      return;
    }

    try {
      setSaving(true);
      await pharmaSfaService.createOrUpdateEmployee({
        employeeCode: empCode,
        fullName,
        email,
        password,
        mobile,
        gender,
        designationRole,
        designationTitle,
        divisionId: divisionId || undefined,
        territoryId: territoryId || undefined,
        patchId: patchId || undefined,
        reportingToUserId: reportingToUserId || undefined,
        headquarterCity: hqCity,
        dailyAllowanceRate,
        monthlyExpenseLimit,
        monthlyTargetAmount,
        isActive: true
      });

      setSuccessMsg("Medical Representative onboarded successfully!");
      setIsModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to onboard employee.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEmpCode("");
    setFullName("");
    setEmail("");
    setPassword("UdyogBill@123");
    setMobile("");
    setGender("Male");
    setDesignationRole(1);
    setDesignationTitle("Medical Representative");
    setDivisionId("");
    setTerritoryId("");
    setPatchId("");
    setReportingToUserId("");
    setHqCity("");
    setDailyAllowanceRate(350);
    setMonthlyExpenseLimit(15000);
    setMonthlyTargetAmount(250000);
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      emp.fullName.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      (emp.mobile && emp.mobile.includes(q)) ||
      emp.headquarterCity.toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (role: number) => {
    switch (role) {
      case 1:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">MR</span>;
      case 2:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">ABM (1st Line)</span>;
      case 3:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">RSM (2nd Line)</span>;
      case 4:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">ZSM (3rd Line)</span>;
      case 5:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">NSM</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Field</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            CBO Pharma SFA • Field Force Staffing Hub
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Medical Representatives & Field Force</h1>
          <p className="text-sm text-gray-500">
            Enterprise staffing hierarchy: Divisions, Managers, MRs, Patch Allocations, Daily Allowances, and Monthly Targets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/pharma/territory-hierarchy"
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            <MapPin className="w-4 h-4 text-gray-500" />
            Divisions & Patches
          </Link>
          <button
            onClick={() => {
              resetForm();
              setEmpCode(`MR-${Math.floor(1000 + Math.random() * 9000)}`);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Medical Representative (MR)
          </button>
        </div>
      </div>

      {/* Quota & Capacity Status Bar */}
      {quota && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">MR Seats Allocated</p>
              <h3 className="text-lg font-bold text-gray-900">
                {quota.currentActiveMrUsers} / {quota.maxAllowedMrUsers}
              </h3>
              <span className={`text-[10px] font-semibold ${quota.canAddMoreMr ? "text-emerald-600" : "text-rose-600"}`}>
                {quota.canAddMoreMr ? "Available to Add" : "Seat Quota Full"}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Manager Seats</p>
              <h3 className="text-lg font-bold text-gray-900">
                {quota.currentActiveManagerUsers} / {quota.maxAllowedManagerUsers}
              </h3>
              <span className={`text-[10px] font-semibold ${quota.canAddMoreManager ? "text-emerald-600" : "text-rose-600"}`}>
                {quota.canAddMoreManager ? "Available to Add" : "Seat Quota Full"}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Active Divisions</p>
              <h3 className="text-lg font-bold text-gray-900">{divisions.length}</h3>
              <span className="text-[10px] text-gray-400 font-medium">Cardio, Derma, etc.</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Micro Patches</p>
              <h3 className="text-lg font-bold text-gray-900">{patches.length}</h3>
              <span className="text-[10px] text-gray-400 font-medium">Field Calling Zones</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search MR by name, code, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Divisions</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Designations</option>
            <option value="1">Medical Representative (MR)</option>
            <option value="2">Area Business Manager (ABM)</option>
            <option value="3">Regional Sales Manager (RSM)</option>
            <option value="4">Zonal Sales Manager (ZSM)</option>
            <option value="5">National Sales Manager (NSM)</option>
          </select>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-600 font-bold">&times;</button>
        </div>
      )}

      {/* Field Force Roster Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-base">Field Force Roster ({filteredEmployees.length})</h2>
          <span className="text-xs text-gray-500">Includes active MRs, ABMs, and Regional Heads</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading field force roster...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No field staff registered yet.</p>
            <p className="text-xs text-gray-400 mt-1">Click &quot;Add Medical Representative&quot; above to onboard your first field executive.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Role & Level</th>
                  <th className="px-6 py-3">Division</th>
                  <th className="px-6 py-3">HQ & Territory</th>
                  <th className="px-6 py-3">Reporting Manager</th>
                  <th className="px-6 py-3 text-right">Daily Allowance</th>
                  <th className="px-6 py-3 text-right">Monthly Target</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{emp.fullName}</div>
                      <div className="text-xs text-gray-500 font-mono">{emp.employeeCode}</div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        {emp.mobile && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {emp.mobile}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {emp.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(emp.designationRole)}
                      <div className="text-xs text-gray-500 mt-1">{emp.designationTitle}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {emp.divisionName ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                          <Building2 className="w-3 h-3" /> {emp.divisionName}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">All Divisions</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{emp.headquarterCity || "Field HQ"}</div>
                      <div className="text-xs text-gray-500">{emp.territoryName || "Area Unassigned"}</div>
                      {emp.patchName && <div className="text-[11px] text-blue-600 font-medium mt-0.5">Patch: {emp.patchName}</div>}
                    </td>
                    <td className="px-6 py-4">
                      {emp.reportingToName ? (
                        <span className="font-medium text-gray-800">{emp.reportingToName}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Direct to HQ</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-800">
                      ₹{emp.dailyAllowanceRate.toLocaleString("en-IN")}/day
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      ₹{emp.monthlyTargetAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {emp.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add MR / Field Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Onboard Medical Representative / Field Staff</h3>
                <p className="text-xs text-gray-500">Creates user login credentials, sets managerial hierarchy, and assigns calling patch.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveEmployee} className="mt-4 space-y-4">
              {/* Step 1: Identity & Credentials */}
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-blue-700">
                  <UserCheck className="w-3.5 h-3.5" /> 1. Identity & Credentials
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Employee Code *</label>
                    <input
                      type="text"
                      required
                      value={empCode}
                      onChange={(e) => setEmpCode(e.target.value)}
                      placeholder="e.g. MR-1042"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Login Email / Username *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rahul@pharma.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Default: UdyogBill@123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile (10 Digits)</label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Organizational Hierarchy */}
              <div className="pt-2 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-purple-700">
                  <Briefcase className="w-3.5 h-3.5" /> 2. Designation & Hierarchy
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Designation Role</label>
                    <select
                      value={designationRole}
                      onChange={(e) => handleRoleChange(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="1">Medical Representative (MR)</option>
                      <option value="2">Area Business Manager (ABM)</option>
                      <option value="3">Regional Sales Manager (RSM)</option>
                      <option value="4">Zonal Sales Manager (ZSM)</option>
                      <option value="5">National Sales Manager (NSM)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Pharma Division</label>
                    <select
                      value={divisionId}
                      onChange={(e) => setDivisionId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select Division</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Reporting Manager</label>
                    <select
                      value={reportingToUserId}
                      onChange={(e) => setReportingToUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Direct to HQ / Super Admin</option>
                      {employees
                        .filter((e) => e.designationRole > designationRole)
                        .map((mgr) => (
                          <option key={mgr.userId} value={mgr.userId}>
                            {mgr.fullName} ({mgr.designationTitle})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">HQ City</label>
                    <input
                      type="text"
                      value={hqCity}
                      onChange={(e) => setHqCity(e.target.value)}
                      placeholder="e.g. Lucknow, Varanasi"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Territory / Area</label>
                    <select
                      value={territoryId}
                      onChange={(e) => setTerritoryId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select Area / Territory</option>
                      {territories.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.city || t.state})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Patch</label>
                    <select
                      value={patchId}
                      onChange={(e) => setPatchId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select Patch</option>
                      {patches.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Commercial Allowances & Monthly Target */}
              <div className="pt-2 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-emerald-700">
                  <DollarSign className="w-3.5 h-3.5" /> 3. Allowances & Target
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Daily Allowance (DA / Day)</label>
                    <input
                      type="number"
                      value={dailyAllowanceRate}
                      onChange={(e) => setDailyAllowanceRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly Target (₹)</label>
                    <input
                      type="number"
                      value={monthlyTargetAmount}
                      onChange={(e) => setMonthlyTargetAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Expense Limit / Month (₹)</label>
                    <input
                      type="number"
                      value={monthlyExpenseLimit}
                      onChange={(e) => setMonthlyExpenseLimit(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? "Creating MR..." : "Confirm & Onboard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
