"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-neutral-100 mb-2">
          Bir hata oluştu
        </h1>

        <p className="text-neutral-400 text-sm mb-6">
          {error.message || "Beklenmeyen bir hata meydana geldi."}
        </p>

        {error.digest && (
          <p className="text-neutral-600 text-xs mb-4 font-mono">
            Hata kodu: {error.digest}
          </p>
        )}

        <button
          onClick={reset}
          className="bg-amber-400 hover:bg-amber-300 text-neutral-950 font-medium px-6 py-2 rounded-lg transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
