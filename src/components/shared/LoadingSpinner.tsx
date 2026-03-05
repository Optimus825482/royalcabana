"use client";

import Image from "next/image";
import { useState } from "react";
import { Spinner } from "@/components/atoms/Spinner";
import { cn } from "@/lib/utils";

/** Full loading state with logo + spinner. Uses design tokens only (--rc-gold, --rc-text-muted). */
interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { logo: 32, logoClass: "w-8 h-8", text: "text-xs" },
  md: { logo: 48, logoClass: "w-12 h-12", text: "text-sm" },
  lg: { logo: 64, logoClass: "w-16 h-16", text: "text-base" },
};

export default function LoadingSpinner({
  message = "Yükleniyor...",
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const [imgError, setImgError] = useState(false);
  const { logo, logoClass, text } = sizeMap[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="relative flex items-center justify-center">
        <Spinner size={size} className="absolute" aria-hidden />
        <div
          className={cn(
            "relative rounded-lg animate-pulse",
            "shadow-[0_0_12px_color-mix(in_srgb,var(--rc-gold)_25%,transparent)]"
          )}
        >
          {imgError ? (
            <div
              className={cn(
                "rounded-lg bg-[var(--rc-surface-elevated)] flex items-center justify-center text-[var(--rc-gold)] font-bold",
                logoClass
              )}
            >
              RC
            </div>
          ) : (
            <Image
              src="/logo.png"
              alt=""
              width={logo}
              height={logo}
              className="rounded-lg"
              onError={() => setImgError(true)}
              priority
            />
          )}
        </div>
      </div>
      {message && (
        <p className={cn(text, "text-[var(--rc-text-muted)]")}>{message}</p>
      )}
    </div>
  );
}
