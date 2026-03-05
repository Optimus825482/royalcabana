"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusVariant = "success" | "warning" | "danger" | "info";

export interface StatusBadgeProps {
  status: StatusVariant;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Icon + Badge for status only. Does not color the card — use for list/table status.
 */
export function StatusBadge({ status, label, icon, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={status}
      className={cn("gap-1.5", className)}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </Badge>
  );
}
