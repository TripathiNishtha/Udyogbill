"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError] Unhandled root application exception:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 flex min-h-screen items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full rounded-2xl bg-slate-800 border border-slate-700/80 p-8 shadow-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 mb-6">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Application Error Encountered
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            An unexpected error occurred while rendering the workspace. Our diagnostic telemetry has recorded this incident.
          </p>
          {error?.digest && (
            <div className="mb-6 rounded-lg bg-slate-900/60 p-2.5 text-xs font-mono text-slate-400 border border-slate-700/50 break-all">
              Reference Code: {error.digest}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => reset()}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
            >
              Reload & Retry
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="flex-1 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-600 focus:outline-none transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
