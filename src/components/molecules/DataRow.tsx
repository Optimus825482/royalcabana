"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Label-value row for lists; token-based text colors. */
export interface DataRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
}

export const DataRow = React.forwardRef<HTMLDivElement, DataRowProps>(
  function DataRow({ className, label, value, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-wrap items-baseline justify-between gap-2 text-sm",
          className
        )}
        {...props}
      >
        <span className="text-[var(--rc-text-secondary)]">{label}</span>
        <span className="text-[var(--rc-text-primary)] font-medium">
          {value}
        </span>
      </div>
    );
  }
);
