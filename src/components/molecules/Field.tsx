"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}

/**
 * Label + slot (input/select) + optional error. Token-only (--rc-text-secondary, --rc-danger).
 */
const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ label, htmlFor, error, children, className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
      <label
        htmlFor={htmlFor}
        className="block text-xs text-[var(--rc-text-secondary)] mb-1.5"
      >
        {label}
      </label>
      {children}
      {error && (
        <p
          className="text-xs text-[var(--rc-danger)] bg-[var(--rc-error-bg)] border border-[var(--rc-error-border)] rounded-lg px-3 py-2"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  ),
);
Field.displayName = "Field";

export { Field };
