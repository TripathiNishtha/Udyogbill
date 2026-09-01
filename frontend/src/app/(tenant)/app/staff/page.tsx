"use client";

import { useEffect, useState } from "react";
import {
  Users2,
  ShieldCheck,
  Plus,
  Search,
  CheckCircle,
  X,
  Mail,
  Phone,
  Briefcase,
  KeyRound,
  Shield,
  Check,
  Sliders,
  Lock,
  Trash2,
  Edit3,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  AlertCircle
} from "lucide-react";
import {
  tenantAppService,
  StaffUser,
  Role,
  PermissionGroup,
  CreateStaffUserInput,
} from "@/services/tenant-app-services";
import { TenantQuotaSummary } from "@/types";

export default function TenantStaffPage() {
  const [activeTab, setActiveTab] = useState<"staff" | "roles">("staff");

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [quotas, setQuotas] = useState<TenantQuotaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState("");

  // Invite Staff Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<CreateStaffUserInput>({
    email: "",
    fullName: "",
    password: "",
    phoneNumber: "",
    designation: "",
    roleIds: [],
  });
  const [submittingStaff, setSubmittingStaff] = useState(false);

  // Role Assignment Modal
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Create / Edit Role Modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState({
    code: "",
    name: "",
    description: "",
    permissionIds: [] as string[],
    isActive: true
  });
  const [submittingRole, setSubmittingRole] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, permsRes, quotaData] = await Promise.all([
        tenantAppService.getStaffUsers({ searchTerm: searchTerm || undefined }),
        tenantAppService.getRoles(),
        tenantAppService.getAvailablePermissions(),
        tenantAppService.getQuotaSummary(),
      ]);
      setUsers(usersRes.items || []);
      setRoles(rolesRes || []);
      setPermissionGroups(permsRes || []);
      setQuotas(quotaData);

      // Expand all modules by default
      const exp: Record<string, boolean> = {};
      (permsRes || []).forEach(g => { exp[g.moduleCode] = true; });
      setExpandedModules(exp);
    } catch (err) {
      console.error("Failed to load staff & role data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchTerm]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  };

  // Staff Handlers
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.fullName || !inviteForm.password) return;

    try {
      setSubmittingStaff(true);
      await tenantAppService.createStaffUser(inviteForm);
      setIsInviteModalOpen(false);
      setInviteForm({
        email: "",
        fullName: "",
        password: "",
        phoneNumber: "",
        designation: "",
        roleIds: [],
      });
      showToast("New staff account created successfully!");
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to invite staff user.");
    } finally {
      setSubmittingStaff(false);
    }
  };

  const openAssignRoles = (user: StaffUser) => {
    setSelectedUser(user);
    setSelectedRoleIds(user.roles.map((r) => r.id));
  };

  const handleAssignRolesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setAssigning(true);
      await tenantAppService.assignUserRoles(selectedUser.id, selectedRoleIds);
      setSelectedUser(null);
      showToast("Roles updated for " + selectedUser.fullName + "!");
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to update roles.");
    } finally {
      setAssigning(false);
    }
  };

  const toggleRoleSelection = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds(selectedRoleIds.filter((id) => id !== roleId));
    } else {
      setSelectedRoleIds([...selectedRoleIds, roleId]);
    }
  };

  const toggleInviteRole = (roleId: string) => {
    const current = inviteForm.roleIds || [];
    if (current.includes(roleId)) {
      setInviteForm({ ...inviteForm, roleIds: current.filter((id) => id !== roleId) });
    } else {
      setInviteForm({ ...inviteForm, roleIds: [...current, roleId] });
    }
  };

  // Role Creation / Editing Handlers
  const openCreateRole = () => {
    setEditingRoleId(null);
    setRoleForm({
      code: "",
      name: "",
      description: "",
      permissionIds: [],
      isActive: true
    });
    setIsRoleModalOpen(true);
  };

  const openEditRole = (r: Role) => {
    setEditingRoleId(r.id);
    
    // Find all permission IDs corresponding to role.permissionCodes
    const matchedPermIds: string[] = [];
    permissionGroups.forEach(g => {
      g.permissions.forEach(p => {
        if (r.permissionCodes?.includes(p.code)) {
          matchedPermIds.push(p.id);
        }
      });
    });

    setRoleForm({
      code: r.code,
      name: r.name,
      description: r.description || "",
      permissionIds: matchedPermIds,
      isActive: r.isActive
    });
    setIsRoleModalOpen(true);
  };

  const togglePermission = (pId: string) => {
    if (roleForm.permissionIds.includes(pId)) {
      setRoleForm({ ...roleForm, permissionIds: roleForm.permissionIds.filter(id => id !== pId) });
    } else {
      setRoleForm({ ...roleForm, permissionIds: [...roleForm.permissionIds, pId] });
    }
  };

  const toggleModulePermissions = (group: PermissionGroup) => {
    const groupPermIds = group.permissions.map(p => p.id);
    const allSelected = groupPermIds.every(id => roleForm.permissionIds.includes(id));

    if (allSelected) {
      // Unselect all in module
      setRoleForm({
        ...roleForm,
        permissionIds: roleForm.permissionIds.filter(id => !groupPermIds.includes(id))
      });
    } else {
      // Select all in module
      const combined = Array.from(new Set([...roleForm.permissionIds, ...groupPermIds]));
      setRoleForm({ ...roleForm, permissionIds: combined });
    }
  };

  const selectAllPermissions = () => {
    const allIds: string[] = [];
    permissionGroups.forEach(g => g.permissions.forEach(p => allIds.push(p.id)));
    setRoleForm({ ...roleForm, permissionIds: allIds });
  };

  const clearAllPermissions = () => {
    setRoleForm({ ...roleForm, permissionIds: [] });
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) return;

    try {
      setSubmittingRole(true);
      if (editingRoleId) {
        await tenantAppService.updateRole(editingRoleId, {
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          permissionIds: roleForm.permissionIds,
          isActive: roleForm.isActive
        });
        showToast("Role \"" + roleForm.name + "\" updated successfully!");
      } else {
        const generatedCode = roleForm.code.trim() 
          ? roleForm.code.trim().toUpperCase().replace(/\s+/g, "_")
          : roleForm.name.trim().toUpperCase().replace(/\s+/g, "_");

        await tenantAppService.createRole({
          code: generatedCode,
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          permissionIds: roleForm.permissionIds
        });
        showToast("New Custom Role \"" + roleForm.name + "\" created successfully!");
      }
      setIsRoleModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to save role.");
    } finally {
      setSubmittingRole(false);
    }
  };

  const handleDeleteRole = async (r: Role) => {
    if (r.isSystemRole) {
      alert("System roles are standard defaults and cannot be deleted.");
      return;
    }
    if (!confirm("Are you sure you want to delete custom role \"" + r.name + "\"? Staff users assigned to this role will lose its permissions.")) {
      return;
    }

    try {
      await tenantAppService.deleteRole(r.id);
      showToast("Role \"" + r.name + "\" deleted successfully.");
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to delete role.");
    }
  };

  const totalAllPermsCount = permissionGroups.reduce((acc, g) => acc + g.permissions.length, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Users2 className="w-6 h-6 text-emerald-400" />
            <span>Staff Management & Granular RBAC</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Create custom roles, configure module-level granular permissions, and enforce access boundaries.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Staff Quota
            </span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {quotas?.currentUsers || users.length} / {quotas?.maxUsers || 1} Allowed
            </span>
          </div>
          {activeTab === "staff" ? (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              disabled={(quotas?.currentUsers || 0) >= (quotas?.maxUsers || 1)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Invite Staff Member</span>
            </button>
          ) : (
            <button
              onClick={openCreateRole}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create New Custom Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab("staff")}
          className={"flex items-center space-x-2 px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer " + (activeTab === "staff" ? "bg-slate-900 border-t border-l border-r border-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200")}
        >
          <Users2 className="w-4 h-4" />
          <span>Staff Directory ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={"flex items-center space-x-2 px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer " + (activeTab === "roles" ? "bg-slate-900 border-t border-l border-r border-slate-800 text-indigo-400" : "text-slate-400 hover:text-slate-200")}
        >
          <Shield className="w-4 h-4" />
          <span>Roles & Permissions Matrix ({roles.length})</span>
        </button>
      </div>

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, email, or designation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-400 hidden sm:block">
              Total Staff: <span className="font-bold text-white">{users.length}</span>
            </span>
          </div>

          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/50 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">User</th>
                    <th className="px-5 py-3.5 font-semibold">Designation</th>
                    <th className="px-5 py-3.5 font-semibold">Assigned Roles</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Loading staff directory...
                      </td>
                    </tr>
                  ) : users.length > 0 ? (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-400 uppercase">
                              {u.fullName.substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center space-x-1.5">
                                <span>{u.fullName}</span>
                                {u.isTenantAdmin && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-300">
                          {u.designation || "Staff Member"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length > 0 ? (
                              u.roles.map((r) => (
                                <span
                                  key={r.id}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-300"
                                >
                                  {r.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-600 text-[11px]">No specific roles</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border " + (u.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}
                          >
                            {u.isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {!u.isTenantAdmin && (
                            <button
                              onClick={() => openAssignRoles(u)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 hover:text-white transition-colors text-[11px] font-bold cursor-pointer"
                            >
                              Assign Roles
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No staff members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS MATRIX */}
      {activeTab === "roles" && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-sm text-indigo-300 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Custom Role Builder & Granular Access Boundaries</span>
              </div>
              <p className="text-slate-400">
                Design custom roles for your cashiers, accountants, store managers, and field staff. Tweak permissions across all 6 core modules.
              </p>
            </div>
            <button
              onClick={openCreateRole}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 shrink-0 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Role</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roles.map((r) => {
              const assignedCount = users.filter(u => u.roles.some(ur => ur.id === r.id)).length;
              return (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{r.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 uppercase">{r.code}</div>
                        </div>
                      </div>
                      {r.isSystemRole ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-amber-400 border border-slate-800">
                          <Lock className="w-3 h-3" />
                          <span>System Default</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                          Custom
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 min-h-[36px] line-clamp-2">
                      {r.description || "Custom operational role with assigned module permissions."}
                    </p>

                    <div className="pt-2 border-t border-slate-900 space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 font-semibold">Granted Permissions:</span>
                        <span className="font-mono font-bold text-indigo-400">
                          {(r.permissionCodes || []).length} / {totalAllPermsCount}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pt-1">
                        {(r.permissionCodes || []).map((code) => (
                          <span
                            key={code}
                            className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9.5px] font-mono text-slate-300"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Assigned to: <strong className="text-white">{assignedCount}</strong> staff
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditRole(r)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Permissions</span>
                      </button>
                      {!r.isSystemRole && (
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/60 border border-rose-800/40 text-rose-400 hover:text-rose-200 cursor-pointer transition-colors"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT CUSTOM ROLE & PERMISSION MATRIX */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">
                  {editingRoleId ? ("Edit Role: " + roleForm.name) : "Create New Custom Role"}
                </h3>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-5 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Role Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. POS Counter Cashier"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Role Code / Identifier</label>
                  <input
                    type="text"
                    disabled={!!editingRoleId}
                    placeholder="e.g. POS_CASHIER_1"
                    value={roleForm.code}
                    onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Short Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Allowed to bill and collect receipts"
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-white">Granular Permission Matrix</span>
                  <span className="text-[11px] text-slate-400 ml-2">
                    {"(" + roleForm.permissionIds.length + " of " + totalAllPermsCount + " selected)"}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={selectAllPermissions}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-[11px] font-bold cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAllPermissions}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {permissionGroups.map((group) => {
                  const isExpanded = !!expandedModules[group.moduleCode];
                  const groupPermIds = group.permissions.map(p => p.id);
                  const selectedCountInGroup = groupPermIds.filter(id => roleForm.permissionIds.includes(id)).length;
                  const allGroupSelected = groupPermIds.length > 0 && selectedCountInGroup === groupPermIds.length;

                  return (
                    <div
                      key={group.moduleCode}
                      className="rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden"
                    >
                      <div className="p-3 bg-slate-900/80 flex items-center justify-between border-b border-slate-800/80">
                        <div
                          onClick={() => setExpandedModules({ ...expandedModules, [group.moduleCode]: !isExpanded })}
                          className="flex items-center space-x-2 cursor-pointer flex-1"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="font-bold text-xs text-white">{group.moduleName}</span>
                          <span className="text-[10px] font-mono text-slate-500">{"(" + group.moduleCode + ")"}</span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-indigo-300">
                            {selectedCountInGroup} / {group.permissions.length}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleModulePermissions(group)}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded hover:bg-indigo-950/40 cursor-pointer"
                        >
                          {allGroupSelected ? "Deselect Module" : "Select All in Module"}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/40 animate-in fade-in">
                          {group.permissions.map((p) => {
                            const isChecked = roleForm.permissionIds.includes(p.id);
                            return (
                              <div
                                key={p.id}
                                onClick={() => togglePermission(p.id)}
                                className={"p-2.5 rounded-lg border cursor-pointer flex items-start space-x-2.5 transition-all " + (isChecked ? "bg-indigo-950/30 border-indigo-500/40 text-white" : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700")}
                              >
                                <div className="pt-0.5 shrink-0">
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-xs text-slate-200">{p.name}</div>
                                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                    {p.description}
                                  </div>
                                  <div className="text-[9px] font-mono text-slate-600 mt-1">{p.code}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRole}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingRole ? "Saving Role..." : (editingRoleId ? "Update Role Permissions" : "Create Custom Role")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INVITE STAFF MEMBER */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Users2 className="w-5 h-5 text-emerald-400" />
                <span>Invite New Staff Member</span>
              </h3>
              <p className="text-xs text-slate-400">
                Create login credentials and assign operational roles for your staff.
              </p>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={inviteForm.fullName}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, fullName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Work Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. priya@apexpharma.com"
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={inviteForm.password}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, password: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Accountant"
                    value={inviteForm.designation || ""}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, designation: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  Assign Initial Roles
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {roles.map((r) => {
                    const isChecked = (inviteForm.roleIds || []).includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleInviteRole(r.id)}
                        className={"p-2.5 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-colors " + (isChecked ? "bg-emerald-950/40 border-emerald-500/50 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700")}
                      >
                        <span className="font-medium">{r.name}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStaff}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingStaff ? "Inviting..." : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN ROLES TO EXISTING STAFF */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span>Assign Roles: {selectedUser.fullName}</span>
              </h3>
              <p className="text-xs text-slate-400">{selectedUser.email}</p>
            </div>

            <form onSubmit={handleAssignRolesSubmit} className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {roles.map((r) => {
                  const isChecked = selectedRoleIds.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleRoleSelection(r.id)}
                      className={"p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-colors " + (isChecked ? "bg-indigo-950/40 border-indigo-500/50 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700")}
                    >
                      <div>
                        <div className="font-bold text-xs text-white">{r.name}</div>
                        <div className="text-[11px] text-slate-400">{r.description}</div>
                      </div>
                      {isChecked && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {assigning ? "Saving..." : "Save Roles"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
