"use client";

import { useEffect, useState } from "react";
import { SuperAdminSidebar } from "@/components/layout/super-admin-sidebar";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // If returning from an impersonated store, automatically restore Super Admin session
    try {
      const backupToken = localStorage.getItem("udyogbill_superadmin_token_backup");
      const backupUser = localStorage.getItem("udyogbill_superadmin_user_backup");
      if (backupToken && backupUser) {
        localStorage.setItem("udyogbill_token", backupToken);
        localStorage.setItem("udyogbill_user", backupUser);
        localStorage.removeItem("udyogbill_superadmin_token_backup");
        localStorage.removeItem("udyogbill_superadmin_user_backup");
        localStorage.removeItem("udyogbill_impersonating");
      }
    } catch {}
  }, []);

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-slate-900 text-slate-100 font-sans antialiased">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-y-auto bg-slate-900 h-full min-w-0">
        {children}
      </main>
    </div>
  );
}
