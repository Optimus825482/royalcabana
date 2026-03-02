"use client";

import { useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import StickyHeader from "./StickyHeader";

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const handleClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen bg-neutral-950 overflow-hidden">
      {/* Left sidebar */}
      <Sidebar open={sidebarOpen} onClose={handleClose} />

      {/* Right content area */}
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
