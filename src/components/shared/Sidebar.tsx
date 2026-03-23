"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import {
  NAV_CONFIG,
  ROLE_HOME,
  isGroup,
  type NavItem,
  type NavGroup,
  type NavLink,
} from "./Navbar";
import { usePermissions } from "@/hooks/usePermissions";

/* ── Logo Component with Collapse Toggle ── */

function SidebarHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;
  const homeHref = role ? (ROLE_HOME[role] ?? "/") : "/";
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative px-1 py-2">
      {/* Collapse toggle - top right corner, desktop only */}
      <button
        onClick={onToggle}
        className="hidden lg:flex absolute top-1 right-1 items-center justify-center w-7 h-7 text-[var(--rc-text-muted)] hover:text-[var(--rc-gold)] hover:bg-[var(--rc-card-hover)] rounded-md transition-colors z-10"
        aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
      >
        <ChevronDown
          className={`w-4 h-4 ${collapsed ? "-rotate-90" : "rotate-90"}`}
        />
      </button>

      {/* Logo - centered, larger */}
      <Link href={homeHref} className="flex items-center justify-center">
        {imgError ? (
          <span className="text-[var(--rc-gold)] font-semibold text-lg">RC</span>
        ) : (
          <Image
            src="/logo.png"
            alt="Royal Cabana"
            width={collapsed ? 40 : 140}
            height={collapsed ? 40 : 140}
            className="rounded-lg mix-blend-lighten transition-all duration-200 object-contain"
            onError={() => setImgError(true)}
            priority
          />
        )}
      </Link>
    </div>
  );
}

/* ── Sidebar Group (Accordion) ── */

function SidebarGroup({
  group,
  pathname,
  collapsed,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const isGroupActive = group.children.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
  );
  const [manualOpen, setManualOpen] = useState(isGroupActive);
  const open = isGroupActive || manualOpen;

  const IconComp = group.icon;

  const iconColor = group.color ?? "text-[var(--rc-text-muted)]";

  if (collapsed) {
    return (
      <div className="relative group/tip">
        <div
          className={`flex items-center justify-center w-11 h-11 mx-auto rounded-lg transition-colors ${
            isGroupActive ? "bg-[var(--rc-card-hover)]" : "hover:bg-[var(--rc-card-hover)]"
          }`}
        >
          {IconComp && (
            <IconComp
              className={`w-5 h-5 ${iconColor} ${isGroupActive ? "brightness-125" : "opacity-70 group-hover/tip:opacity-100"}`}
            />
          )}
        </div>
        {/* Tooltip */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-[var(--rc-card)] text-[var(--rc-text-primary)] text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity z-50 border border-[var(--rc-border-subtle)]">
          {group.label}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setManualOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${
          isGroupActive ? "bg-[var(--rc-card-hover)]/80" : "hover:bg-[var(--rc-card-hover)]/50"
        }`}
      >
        {IconComp && (
          <IconComp
            className={`w-4 h-4 shrink-0 ${iconColor} ${isGroupActive ? "brightness-125" : ""}`}
          />
        )}
        <span
          className={`flex-1 text-left truncate ${isGroupActive ? "text-[var(--rc-text-primary)]" : "text-[var(--rc-text-muted)] group-hover:text-[var(--rc-text-secondary)]"}`}
        >
          {group.label}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-[var(--rc-text-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="ml-3 pl-3 border-l border-[var(--rc-border-subtle)] space-y-0.5 mt-0.5">
          {group.children.map((child) => {
            const isActive =
              pathname === child.href || pathname.startsWith(child.href + "/");
            const ChildIcon = child.icon;
            const childColor = child.color ?? "text-[var(--rc-text-muted)]";
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={`flex items-center gap-2 px-3 min-h-[44px] py-2.5 text-sm rounded-md transition-colors ${
                  isActive ? "bg-[var(--rc-card-hover)]" : "hover:bg-[var(--rc-card-hover)]/50"
                }`}
              >
                {ChildIcon && (
                  <ChildIcon
                    className={`w-3.5 h-3.5 shrink-0 ${childColor} ${isActive ? "brightness-125" : "opacity-80"}`}
                  />
                )}
                <span
                  className={`truncate ${isActive ? "text-[var(--rc-text-primary)]" : "text-[var(--rc-text-muted)] hover:text-[var(--rc-text-secondary)]"}`}
                >
                  {child.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Sidebar Link ── */

function SidebarLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavLink;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");
  const IconComp = item.icon;
  const iconColor = item.color ?? "text-[var(--rc-text-muted)]";

  if (collapsed) {
    return (
      <div className="relative group/tip">
        <Link
          href={item.href}
          onClick={onNavigate}
          className={`flex items-center justify-center w-11 h-11 mx-auto rounded-lg transition-colors ${
            isActive ? "bg-[var(--rc-card-hover)]" : "hover:bg-[var(--rc-card-hover)]"
          }`}
        >
          {IconComp && (
            <IconComp
              className={`w-5 h-5 ${iconColor} ${isActive ? "brightness-125" : "opacity-70 group-hover/tip:opacity-100"}`}
            />
          )}
        </Link>
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-[var(--rc-card)] text-[var(--rc-text-primary)] text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity z-50 border border-[var(--rc-border-subtle)]">
          {item.label}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${
        isActive ? "bg-[var(--rc-card-hover)]/80" : "hover:bg-[var(--rc-card-hover)]/50"
      }`}
    >
      {IconComp && (
        <IconComp
          className={`w-4 h-4 shrink-0 ${iconColor} ${isActive ? "brightness-125" : ""}`}
        />
      )}
      <span
        className={`truncate ${isActive ? "text-[var(--rc-text-primary)]" : "text-[var(--rc-text-muted)] hover:text-[var(--rc-text-secondary)]"}`}
      >
        {item.label}
      </span>
    </Link>
  );
}

/* ── Main Sidebar ── */

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { can, isLoading: permissionsLoading } = usePermissions();

  const role = session?.user?.role as string | undefined;

  // Module config for conditional nav items (casino reviews)
  const { data: moduleConfig } = useQuery<{
    reviews: { enabled: boolean };
  }>({
    queryKey: ["module-config"],
    queryFn: async () => {
      const res = await fetch("/api/system/modules");
      if (!res.ok) throw new Error("Module config fetch failed");
      const json = await res.json();
      return json.data ?? json;
    },
    staleTime: 60_000,
    enabled: !!session,
  });

  const navItems = useMemo(() => {
    const baseItems = role ? (NAV_CONFIG[role] ?? []) : [];

    // Apply module config filtering for casino
    let items = baseItems;
    if (role === "CASINO_USER" && moduleConfig) {
      items = baseItems
        .map((item) => {
          if (!isGroup(item) || item.label !== "Deneyim") return item;
          const filtered = item.children.filter((c) => {
            if (c.href === "/casino/reviews")
              return moduleConfig?.reviews?.enabled ?? true;
            return true;
          });
          if (filtered.length === 0) return null;
          return { ...item, children: filtered };
        })
        .filter(Boolean) as NavItem[];
    }

    // Skip permission filtering while loading (prevent flash)
    if (permissionsLoading) return items;

    // Apply permission-based filtering
    return items
      .map((item) => {
        if (isGroup(item)) {
          const filteredChildren = item.children.filter(
            (child) =>
              !child.requiredPermission || can(child.requiredPermission),
          );
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        if (item.requiredPermission && !can(item.requiredPermission))
          return null;
        return item;
      })
      .filter(Boolean) as NavItem[];
  }, [role, moduleConfig, permissionsLoading, can]);

  // Close mobile sidebar on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const handleMobileNavigate = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex flex-col
          bg-[var(--rc-sidebar)] border-r border-[var(--rc-border-subtle)]
          transition-all duration-300 ease-in-out
          ${collapsed ? "lg:w-16" : "lg:w-60"}
          ${open ? "w-60 translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo + Collapse Toggle */}
        <SidebarHeader
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1 rc-scrollbar">
          {!session ? (
            /* Skeleton — prevents hydration mismatch (server has no session) */
            <div className="space-y-2 px-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 rounded-lg bg-[var(--rc-surface-elevated)] animate-pulse"
                />
              ))}
            </div>
          ) : (
            navItems.map((item) => {
              if (isGroup(item)) {
                return (
                  <SidebarGroup
                    key={item.label}
                    group={item}
                    pathname={pathname}
                    collapsed={collapsed}
                    onNavigate={handleMobileNavigate}
                  />
                );
              }
              return (
                <SidebarLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                  onNavigate={handleMobileNavigate}
                />
              );
            })
          )}
        </nav>

        {/* Bottom section - mobile only (profile + logout) */}
        <div className="lg:hidden border-t border-[var(--rc-border-subtle)] p-3 space-y-1">
          <Link
            href="/profile"
            onClick={handleMobileNavigate}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--rc-text-secondary)] hover:text-[var(--rc-gold)] rounded-lg hover:bg-[var(--rc-card-hover)]/50 transition-colors"
          >
            <UserIcon className="w-4 h-4 shrink-0" />
            Profilim
          </Link>
          <button
            onClick={async () => {
              onClose();
              try {
                await fetch("/api/auth/logout-track", { method: "POST" });
              } catch {}
              signOut({ callbackUrl: "/login" });
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--rc-text-muted)] hover:text-[var(--rc-danger)] rounded-lg hover:bg-[var(--rc-card-hover)]/50 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Çıkış Yap
          </button>
        </div>
      </aside>
    </>
  );
}
