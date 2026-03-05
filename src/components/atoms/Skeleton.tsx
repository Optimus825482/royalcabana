"use client";

import { cn } from "@/lib/utils";

export interface SkeletonProps {
  className?: string;
  /** Optional variant: default (bar), card (card shape), block (block). */
  variant?: "default" | "card" | "block";
}

/**
 * Base skeleton pulse — token-only background. Use for inline shapes.
 * variant="card" | "block" renders SkeletonCard / SkeletonBlock for consistency.
 */
export function Skeleton({ className, variant = "default" }: SkeletonProps) {
  if (variant === "card") {
    return <SkeletonCard className={className} lines={3} />;
  }
  if (variant === "block") {
    return <SkeletonBlock className={className} />;
  }
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[var(--rc-surface-elevated)]",
        className,
      )}
      aria-hidden
    />
  );
}

/** Full-width line skeleton (e.g. list rows). */
export function SkeletonLine({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}

/** Block skeleton (e.g. card content placeholder). */
export function SkeletonBlock({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-20 w-full", className)} />;
}

/** Card-shaped skeleton: rounded card with optional lines inside. */
export function SkeletonCard({
  className,
  lines = 3,
}: SkeletonProps & { lines?: number }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--rc-border-subtle)] bg-[var(--rc-card)] p-4",
        className,
      )}
      aria-hidden
    >
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine
            key={i}
            className={i === 0 ? "w-3/4" : i === lines - 1 ? "w-1/2" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/** Grid of card skeletons for dashboard KPI loading state. */
export function SkeletonCardGrid({
  count = 8,
  className,
}: SkeletonProps & { count?: number }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 lg:grid-cols-4 gap-4",
        className,
      )}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={3} />
      ))}
    </div>
  );
}
