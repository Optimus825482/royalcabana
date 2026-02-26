"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800/40 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-neutral-200">
        Bir hata oluştu
      </h2>
      <p className="text-sm text-neutral-500 max-w-md">
        Sayfa yüklenirken beklenmeyen bir hata meydana geldi. Lütfen tekrar
        deneyin.
      </p>
      <button
        onClick={reset}
        className="px-5 py-2 text-sm font-medium rounded-lg bg-yellow-600 hover:bg-yellow-500 text-neutral-950 transition-colors"
      >
        Tekrar Dene
      </button>
    </div>
  );
}
