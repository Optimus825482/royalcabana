"use client";

import { cn } from "@/lib/utils";

export interface SpinnerProps {
  /** Size of the spinner ring */
  size?: "sm" | "md" | "lg";
  /** Optional message below spinner */
  message?: string;
  /** Token-based: "gold" (primary) or "muted" */
  variant?: "gold" | "muted";
  className?: string;
}

const sizeMap = {
  sm: { ring: "w-10 h-10", text: "text-xs" },
  md: { ring: "w-16 h-16", text: "text-sm" },
  lg: { ring: "w-20 h-20", text: "text-base" },
};

/**
 * Token-only loading spinner. No hardcoded amber/neutral.
 * Use --rc-gold / --rc-text-muted via variant.
 */
export function Spinner({
  size = "md",
  message,
  variant = "gold",
  className,
}: SpinnerProps) {
  const { ring, text } = sizeMap[size];
  const ringCls =
    variant === "gold"
      ? "border-[var(--rc-surface-elevated)] border-t-[var(--rc-gold)]"
      : "border-[var(--rc-surface-border)] border-t-[var(--rc-text-muted)]";
  const shadowCls =
    variant === "gold"
      ? "shadow-[0_0_8px_color-mix(in_srgb,var(--rc-gold)_25%,transparent)]"
      : "";

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-4", className)}
      role="status"
      aria-live="polite"
      aria-label={message ?? "Yükleniyor"}
    >
      <div
        className={cn(
          "rounded-full border-2 animate-spin",
          ring,
          ringCls,
          shadowCls,
        )}
      />
      {message && (
        <p className={cn(text, "text-[var(--rc-text-muted)]")}>{message}</p>
      )}
    </div>
  );
}
