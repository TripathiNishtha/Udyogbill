"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperAdminSidebar } from "@/components/layout/super-admin-sidebar";
import { SuperAdminHeader } from "@/components/layout/super-admin-header";
import { authService } from "@/services/api-services";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Only restore Super Admin session if the user was actively impersonating a tenant store
    try {
      const isImpersonating = localStorage.getItem("udyogbill_impersonating");
      if (isImpersonating) {
        const backupToken = localStorage.getItem("udyogbill_superadmin_token_backup");
        const backupUser = localStorage.getItem("udyogbill_superadmin_user_backup");
        if (backupToken && backupUser) {
          localStorage.setItem("udyogbill_token", backupToken);
          localStorage.setItem("udyogbill_user", backupUser);
        }
        localStorage.removeItem("udyogbill_superadmin_token_backup");
        localStorage.removeItem("udyogbill_superadmin_user_backup");
        localStorage.removeItem("udyogbill_impersonating");
      }
    } catch {}

    const user = authService.getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!user.isSuperAdmin) {
      router.push("/app/dashboard");
      return;
    }
  }, [router]);

  return (
    <div className="super-admin-light-scope flex h-screen h-[100dvh] overflow-hidden bg-slate-100 text-slate-900 font-sans antialiased">
      <SuperAdminSidebar
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <SuperAdminHeader onOpenMobile={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-slate-50 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
