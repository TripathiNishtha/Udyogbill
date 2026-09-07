"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PosRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const editInvoiceId = searchParams.get("editInvoiceId") || searchParams.get("editId") || searchParams.get("id");
    if (editInvoiceId) {
      router.replace(`/app/sales/invoices?editId=${editInvoiceId}`);
    } else {
      router.replace("/app/pos");
    }
  }, [router, searchParams]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-medium">Opening Invoice Editor...</p>
      </div>
    </div>
  );
}

export default function SalesPosRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <PosRedirectContent />
    </Suspense>
  );
}
