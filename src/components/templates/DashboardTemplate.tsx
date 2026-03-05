"use client";

import { useState, useCallback } from "react";
import Sidebar from "@/components/shared/Sidebar";
import StickyHeader from "@/components/shared/StickyHeader";
import { cn } from "@/lib/utils";

/**
 * Dashboard shell: sidebar + sticky header + main content.
 * Uses design tokens (bg-background = --rc-background when .dark).
 */
export interface DashboardTemplateProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardTemplate({ children, className }: DashboardTemplateProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const handleClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className={cn("flex h-screen bg-background overflow-hidden", className)}>
      <Sidebar open={sidebarOpen} onClose={handleClose} />
      <div className="flex flex-col flex-1 min-w-0">
        <StickyHeader
          onToggleSidebar={handleToggle}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
