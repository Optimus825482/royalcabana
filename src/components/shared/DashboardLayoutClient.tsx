"use client";

import { DashboardTemplate } from "@/components/templates";

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardTemplate>{children}</DashboardTemplate>;
}
