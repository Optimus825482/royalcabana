"use client";

import Image from "next/image";
import { useState } from "react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export default function LoadingSpinner({
  message = "Yükleniyor...",
  size = "md",
}: LoadingSpinnerProps) {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    sm: { logo: 32, logoClass: "w-8 h-8", ring: "w-10 h-10", text: "text-xs" },
    md: { logo: 48, logoClass: "w-12 h-12", ring: "w-16 h-16", text: "text-sm" },
    lg: { logo: 64, logoClass: "w-16 h-16", ring: "w-20 h-20", text: "text-base" },
  };

  const { logo, logoClass, ring, text } = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Spinning ring */}
        <div
          className={`absolute ${ring} rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin`}
        />
        {/* Logo */}
        <div className="rounded-lg shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse">
          {imgError ? (
            <div
              className={`rounded-lg bg-neutral-800 flex items-center justify-center text-amber-400 font-bold ${logoClass}`}
            >
              RC
            </div>
          ) : (
            <Image
              src="/logo.png"
              alt="Royal Cabana"
              width={logo}
              height={logo}
              className="rounded-lg"
              onError={() => setImgError(true)}
              priority
            />
          )}
        </div>
      </div>
      {message && <p className={`${text} text-neutral-500`}>{message}</p>}
    </div>
  );
}
