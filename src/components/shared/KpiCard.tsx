"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/molecules/Card";

export type KpiAccent =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gold"
  | "purple";

const accentCardClass: Record<KpiAccent, string> = {
  success: "rc-kpi-card-success",
  warning: "rc-kpi-card-warning",
  danger: "rc-kpi-card-danger",
  info: "rc-kpi-card-info",
  gold: "rc-kpi-card-gold",
  purple: "rc-kpi-card-purple",
};

export interface KpiCardProps {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub: string;
  accent: KpiAccent;
}

export function KpiCard({
  href,
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: KpiCardProps) {
  return (
    <Link href={href} className="block group">
      <Card
        className={cn(
          "p-5 h-full transition-all duration-200 hover:scale-[1.02] border",
          accentCardClass[accent],
        )}
      >
        <CardContent className="p-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="rc-kpi-icon-box w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <span className="rc-kpi-label text-xs font-semibold uppercase tracking-wider">
              {label}
            </span>
            <ArrowRight className="w-4 h-4 ml-auto text-[var(--rc-text-muted)] group-hover:text-[var(--rc-gold)] group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="rc-kpi-value text-3xl font-bold tabular-nums">
            {value}
          </p>
          <p className="rc-kpi-sub text-xs mt-1.5">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
