"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TenantAppSidebar } from "@/components/layout/tenant-app-sidebar";
import { KeyboardShortcutsHud } from "@/components/common/keyboard-shortcuts-hud";
import { authService } from "@/services/api-services";
import { AddonProvider } from "@/context/addon-context";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function TenantAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [impersonateInfo, setImpersonateInfo] = useState<any>(null);

  useEffect(() => {
    // Check if impersonation session is active
    try {
      const imp = localStorage.getItem("udyogbill_impersonating");
      if (imp) {
        setImpersonateInfo(JSON.parse(imp));
      }
    } catch {}

    const user = authService.getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    // Only redirect to superadmin if not currently impersonating
    if (user.isSuperAdmin && !localStorage.getItem("udyogbill_impersonating")) {
      router.push("/admin/dashboard");
      return;
    }
    setAuthorized(true);
  }, [router]);

  const handleBackToSuperAdmin = () => {
    try {
      const backupToken = localStorage.getItem("udyogbill_superadmin_token_backup");
      const backupUser = localStorage.getItem("udyogbill_superadmin_user_backup");
      if (backupToken) {
        localStorage.setItem("udyogbill_token", backupToken);
      }
      if (backupUser) {
        localStorage.setItem("udyogbill_user", backupUser);
      }
      localStorage.removeItem("udyogbill_impersonating");
      localStorage.removeItem("udyogbill_superadmin_token_backup");
      localStorage.removeItem("udyogbill_superadmin_user_backup");
      window.location.href = "/admin/tenants";
    } catch (err) {
      window.location.href = "/admin/tenants";
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Authenticating subscriber session...
      </div>
    );
  }

  return (
    <AddonProvider>
      <div className="h-screen h-[100dvh] overflow-hidden bg-slate-950 flex flex-col text-slate-100 antialiased font-sans">
        {/* Impersonation Banner for Super Admin */}
        {impersonateInfo && (
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-5 py-2.5 flex items-center justify-between shadow-2xl shrink-0 z-[99999] border-b border-amber-400/30">
            <div className="flex items-center space-x-3">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <div className="text-xs font-semibold tracking-wide flex items-center gap-2">
                <span className="text-amber-200 uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/30 border border-amber-300/30">
                  Super Admin Mode
                </span>
                <span>
                  Logged in as Store:{" "}
                  <strong className="underline text-white ml-0.5">
                    {impersonateInfo.storeName || impersonateInfo.tenantName || "Store"}
                  </strong>
                </span>
                <span className="text-amber-200/80 hidden sm:inline text-[11px]">
                  (Full Store Control)
                </span>
              </div>
            </div>
            <button
              onClick={handleBackToSuperAdmin}
              className="bg-black/60 hover:bg-black/90 text-white hover:text-amber-200 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border border-white/20 hover:border-amber-300 shadow-md cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Super Admin</span>
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden min-h-0">
          <TenantAppSidebar />
          <main className="flex-1 overflow-y-auto bg-slate-950 min-w-0 h-full">
            {children}
          </main>
        </div>
        <KeyboardShortcutsHud />
      </div>
    </AddonProvider>
  );
}
