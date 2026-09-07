"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeadsPageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/growth/leads");
  }, [router]);

  return (
    <div className="p-8 text-slate-400 text-sm">
      Redirecting to Organic Leads CRM...
    </div>
  );
}
