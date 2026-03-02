"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import NotificationPanel from "./NotificationPanel";
import { usePermissions } from "@/hooks/usePermissions";
import {
  LayoutDashboard,
  Users,
  Layers,
  Package,
  Map,
  Settings,
  BarChart3,
  ClipboardList,
  DollarSign,
  CalendarDays,
  Cuboid,
  BookOpen,
  UtensilsCrossed,
  Lightbulb,
  User as UserIcon,
  ScrollText,
  Shield,
  CalendarOff,
  UserCog,
  QrCode,
  FileCode,
  ListOrdered,
  Repeat,
  Star,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon?: LucideIcon;
  color?: string;
  requiredPermission?: string;
};

export type NavGroup = {
  label: string;
  icon?: LucideIcon;
  color?: string;
  requiredPermission?: string;
  children: NavLink[];
};

export type NavItem = NavLink | NavGroup;

export function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

// ─── Grouped Navigation Config ──────────────────────────────────────────────

export const SYSTEM_ADMIN_NAV: NavItem[] = [
  {
    href: "/system-admin",
    label: "Panel",
    icon: LayoutDashboard,
    color: "text-sky-400",
  },
  {
    label: "Tanımlar",
    icon: Layers,
    color: "text-violet-400",
    children: [
      {
        href: "/system-admin/classes",
        label: "Kabana Sınıfları",
        icon: Layers,
        color: "text-violet-400",
        requiredPermission: "cabana.class.view",
      },
      {
        href: "/system-admin/concepts",
        label: "Konseptler",
        icon: Lightbulb,
        color: "text-yellow-400",
        requiredPermission: "concept.view",
      },
      {
        href: "/system-admin/products",
        label: "Ürünler",
        icon: Package,
        color: "text-orange-400",
        requiredPermission: "product.view",
      },
      {
        href: "/system-admin/task-definitions",
        label: "Görev Tanımları",
        icon: ClipboardList,
        color: "text-pink-400",
        requiredPermission: "task.definition.view",
      },
      {
        href: "/system-admin/role-definitions",
        label: "Rol Tanımları",
        icon: Shield,
        color: "text-indigo-400",
        requiredPermission: "role.definition.view",
      },
    ],
  },
  {
    label: "Fiyatlandırma",
    icon: DollarSign,
    color: "text-emerald-400",
    children: [
      {
        href: "/system-admin/pricing",
        label: "Fiyat Görünümü",
        icon: DollarSign,
        color: "text-amber-400",
        requiredPermission: "pricing.view",
      },
      {
        href: "/system-admin/products/pricing",
        label: "Fiyat İşlemleri",
        icon: DollarSign,
        color: "text-emerald-400",
        requiredPermission: "pricing.view",
      },
      {
        href: "/system-admin/cancellation-policy",
        label: "İptal Politikası",
        icon: Shield,
        color: "text-red-400",
        requiredPermission: "system.config.view",
      },
    ],
  },
  {
    label: "Kullanıcılar",
    icon: Users,
    color: "text-blue-400",
    children: [
      {
        href: "/system-admin/users",
        label: "Kullanıcı Yönetimi",
        icon: Users,
        color: "text-blue-400",
        requiredPermission: "user.view",
      },
      {
        href: "/system-admin/guests",
        label: "Misafirler",
        icon: UserIcon,
        color: "text-cyan-400",
        requiredPermission: "guest.view",
      },
      {
        href: "/system-admin/staff",
        label: "Personel",
        icon: UserCog,
        color: "text-indigo-400",
        requiredPermission: "staff.view",
      },
    ],
  },
  {
    href: "/system-admin/calendar",
    label: "Takvim",
    icon: CalendarDays,
    color: "text-emerald-400",
    requiredPermission: "reservation.view",
  },
  {
    href: "/system-admin/map",
    label: "Harita",
    icon: Map,
    color: "text-teal-400",
    requiredPermission: "map.view",
  },
  {
    href: "/system-admin/reservations",
    label: "Rezervasyonlar",
    icon: BookOpen,
    color: "text-amber-400",
    requiredPermission: "reservation.view",
  },
  {
    label: "Sistem",
    icon: Settings,
    color: "text-slate-400",
    children: [
      {
        href: "/system-admin/system-control",
        label: "Sistem Kontrolü",
        icon: Settings,
        color: "text-slate-400",
        requiredPermission: "system.config.view",
      },
      {
        href: "/system-admin/blackout-dates",
        label: "Kapalı Tarihler",
        icon: CalendarOff,
        color: "text-rose-400",
        requiredPermission: "blackout.view",
      },
      {
        href: "/system-admin/qr-codes",
        label: "QR Kodlar",
        icon: QrCode,
        color: "text-fuchsia-400",
        requiredPermission: "system.config.view",
      },
      {
        href: "/system-admin/audit-trail",
        label: "Audit Log",
        icon: ScrollText,
        color: "text-amber-400",
        requiredPermission: "audit.view",
      },
      {
        href: "/system-admin/api-docs",
        label: "API Docs",
        icon: FileCode,
        color: "text-lime-400",
      },
    ],
  },
  {
    href: "/reports",
    label: "Raporlar",
    icon: BarChart3,
    color: "text-purple-400",
    requiredPermission: "report.view",
  },
];

export const ADMIN_NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "text-sky-400",
  },
  {
    label: "Operasyon",
    icon: ClipboardList,
    color: "text-orange-400",
    children: [
      {
        href: "/admin/calendar",
        label: "Takvim",
        icon: CalendarDays,
        color: "text-amber-400",
        requiredPermission: "reservation.view",
      },
      {
        href: "/admin/requests",
        label: "Talepler",
        icon: ClipboardList,
        color: "text-orange-400",
        requiredPermission: "reservation.view",
      },
      {
        href: "/admin/reservations",
        label: "Rezervasyonlar",
        icon: BookOpen,
        color: "text-amber-400",
        requiredPermission: "reservation.view",
      },
    ],
  },
  {
    label: "Tanımlar",
    icon: Layers,
    color: "text-violet-400",
    children: [
      {
        href: "/admin/users",
        label: "Kullanıcılar",
        icon: Users,
        color: "text-blue-400",
        requiredPermission: "user.view",
      },
    ],
  },
  {
    label: "Fiyatlandırma",
    icon: DollarSign,
    color: "text-emerald-400",
    children: [
      {
        href: "/admin/pricing",
        label: "Fiyat Yönetimi",
        icon: DollarSign,
        color: "text-emerald-400",
        requiredPermission: "pricing.view",
      },
      {
        href: "/admin/pricing/seasons",
        label: "Sezonluk Fiyatlar",
        icon: CalendarDays,
        color: "text-teal-400",
        requiredPermission: "pricing.view",
      },
    ],
  },
];

export const CASINO_NAV: NavItem[] = [
  {
    href: "/casino",
    label: "Panel",
    icon: LayoutDashboard,
    color: "text-sky-400",
  },
  {
    label: "Keşfet",
    icon: Map,
    color: "text-teal-400",
    children: [
      {
        href: "/casino/map",
        label: "Harita",
        icon: Map,
        color: "text-teal-400",
        requiredPermission: "map.view",
      },
      {
        href: "/casino/view",
        label: "3D Görünüm",
        icon: Cuboid,
        color: "text-violet-400",
        requiredPermission: "map.view",
      },
      {
        href: "/casino/calendar",
        label: "Takvim",
        icon: CalendarDays,
        color: "text-cyan-400",
        requiredPermission: "reservation.view",
      },
    ],
  },
  {
    label: "Rezervasyonlar",
    icon: BookOpen,
    color: "text-amber-400",
    children: [
      {
        href: "/casino/reservations",
        label: "Rezervasyonlarım",
        icon: BookOpen,
        color: "text-amber-400",
        requiredPermission: "reservation.view",
      },
      {
        href: "/casino/waitlist",
        label: "Bekleme Listesi",
        icon: ListOrdered,
        color: "text-orange-400",
        requiredPermission: "reservation.view",
      },
      {
        href: "/casino/recurring",
        label: "Tekrarlayan",
        icon: Repeat,
        color: "text-pink-400",
        requiredPermission: "reservation.view",
      },
    ],
  },
  {
    label: "Deneyim",
    icon: Star,
    color: "text-yellow-400",
    children: [
      {
        href: "/casino/reviews",
        label: "Değerlendirmeler",
        icon: Star,
        color: "text-yellow-400",
        requiredPermission: "reservation.view",
      },
    ],
  },
  {
    href: "/reports",
    label: "Raporlar",
    icon: BarChart3,
    color: "text-purple-400",
    requiredPermission: "report.view",
  },
];

export const FNB_NAV: NavItem[] = [
  {
    href: "/fnb",
    label: "Panel",
    icon: UtensilsCrossed,
    color: "text-rose-400",
  },
];

export const NAV_CONFIG: Record<string, NavItem[]> = {
  SYSTEM_ADMIN: SYSTEM_ADMIN_NAV,
  ADMIN: ADMIN_NAV,
  CASINO_USER: CASINO_NAV,
  FNB_USER: FNB_NAV,
};

export const ROLE_HOME: Record<string, string> = {
  SYSTEM_ADMIN: "/system-admin",
  ADMIN: "/admin",
  CASINO_USER: "/casino",
  FNB_USER: "/fnb",
};

// ─── Dropdown Component ─────────────────────────────────────────────────────

function NavDropdown({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isGroupActive = group.children.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
  );

  const handleEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const IconComp = group.icon;

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm whitespace-nowrap transition-colors rounded-md ${
          isGroupActive
            ? "text-amber-400 bg-amber-400/10"
            : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
        }`}
      >
        {IconComp && <IconComp className="w-4 h-4 shrink-0" />}
        {group.label}
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl py-1 z-50">
          {group.children.map((child) => {
            const isActive =
              pathname === child.href || pathname.startsWith(child.href + "/");
            const ChildIcon = child.icon;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "text-amber-400 bg-amber-400/10"
                    : "text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800"
                }`}
              >
                {ChildIcon && <ChildIcon className="w-4 h-4 shrink-0" />}
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Mobile Accordion Group ─────────────────────────────────────────────────

function MobileNavGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isGroupActive = group.children.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
  );
  const IconComp = group.icon;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors border-l-2 ${
          isGroupActive
            ? "text-amber-400 bg-amber-400/10 border-amber-400"
            : "text-neutral-300 hover:bg-neutral-800 border-transparent"
        }`}
      >
        {IconComp && <IconComp className="w-4 h-4 shrink-0" />}
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="bg-neutral-950/50">
          {group.children.map((child) => {
            const isActive =
              pathname === child.href || pathname.startsWith(child.href + "/");
            const ChildIcon = child.icon;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 pl-10 pr-4 py-2.5 text-sm transition-colors border-l-2 ${
                  isActive
                    ? "text-amber-400 bg-amber-400/10 border-amber-400"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border-transparent"
                }`}
              >
                {ChildIcon && <ChildIcon className="w-3.5 h-3.5 shrink-0" />}
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Logo ───────────────────────────────────────────────────────────────────

function Logo() {
  const [imgError, setImgError] = useState(false);
  if (imgError) {
    return (
      <span className="text-amber-400 font-semibold text-sm tracking-wide">
        Royal Cabana
      </span>
    );
  }
  return (
    <div className="rounded-lg ring-1 ring-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)] overflow-hidden">
      <Image
        src="/logo.png"
        alt="Royal Cabana"
        width={40}
        height={40}
        className="rounded-lg w-auto h-auto"
        onError={() => setImgError(true)}
        priority
      />
    </div>
  );
}

// ─── Main Navbar ────────────────────────────────────────────────────────────

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { can, isLoading: permissionsLoading } = usePermissions();

  const role = session?.user?.role as string | undefined;
  const homeHref = role ? (ROLE_HOME[role] ?? "/") : "/";

  // Fetch module config for conditional nav items
  const { data: moduleConfig } = useQuery<{
    reviews: { enabled: boolean };
  }>({
    queryKey: ["module-config"],
    queryFn: async () => {
      const res = await fetch("/api/system/modules");
      if (!res.ok) throw new Error("Module config fetch failed");
      return res.json();
    },
    staleTime: 60_000,
    enabled: !!session,
  });

  // Build nav items with module config + permission filtering
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
              return moduleConfig.reviews.enabled;
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
          // Filter group children by permission
          const filteredChildren = item.children.filter(
            (child) =>
              !child.requiredPermission || can(child.requiredPermission),
          );
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        // Filter top-level links by permission
        if (item.requiredPermission && !can(item.requiredPermission))
          return null;
        return item;
      })
      .filter(Boolean) as NavItem[];
  }, [role, moduleConfig, permissionsLoading, can]);

  return (
    <nav className="bg-neutral-900 border-b border-neutral-800 shrink-0 relative z-40">
      {/* Top bar */}
      <div className="h-14 px-4 flex items-center gap-3">
        {/* Logo */}
        <Link
          href={homeHref}
          className="flex items-center gap-2 shrink-0"
          onClick={() => setMenuOpen(false)}
        >
          <Logo />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 flex-1 flex-wrap overflow-visible">
          {navItems.map((item) => {
            if (isGroup(item)) {
              return (
                <NavDropdown
                  key={item.label}
                  group={item}
                  pathname={pathname}
                />
              );
            }
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const IconComp = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm whitespace-nowrap transition-colors rounded-md ${
                  isActive
                    ? "text-amber-400 bg-amber-400/10"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                }`}
              >
                {IconComp && <IconComp className="w-4 h-4 shrink-0" />}
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 md:hidden" />

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationPanel />
          <Link
            href="/profile"
            className="hidden sm:flex items-center gap-1.5 text-sm text-neutral-400 hover:text-amber-400 transition-colors rounded-md px-2 py-1 hover:bg-neutral-800"
          >
            <UserIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[120px]">
              {session?.user?.name}
            </span>
          </Link>
          <button
            onClick={async () => {
              try {
                await fetch("/api/auth/logout-track", { method: "POST" });
              } catch {}
              signOut({ callbackUrl: "/login" });
            }}
            className="hidden md:block text-sm text-neutral-500 hover:text-neutral-200 transition-colors px-2 py-1 rounded hover:bg-neutral-800"
          >
            Çıkış
          </button>
          {/* Hamburger - mobile */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
            aria-label="Menü"
          >
            <span
              className={`block w-5 h-0.5 bg-neutral-300 transition-transform duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`}
            />
            <span
              className={`block w-5 h-0.5 bg-neutral-300 transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block w-5 h-0.5 bg-neutral-300 transition-transform duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-900 pb-2">
          {navItems.map((item) => {
            if (isGroup(item)) {
              return (
                <MobileNavGroup
                  key={item.label}
                  group={item}
                  pathname={pathname}
                  onNavigate={() => setMenuOpen(false)}
                />
              );
            }
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const IconComp = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? "text-amber-400 bg-amber-400/10 border-l-2 border-amber-400"
                    : "text-neutral-300 hover:bg-neutral-800 border-l-2 border-transparent"
                }`}
              >
                {IconComp && <IconComp className="w-4 h-4 shrink-0" />}
                {item.label}
              </Link>
            );
          })}
          <div className="px-4 pt-2 pb-1 border-t border-neutral-800 mt-1 space-y-1">
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 text-sm text-neutral-300 hover:text-amber-400 transition-colors py-2"
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              Profilim
            </Link>
            <button
              onClick={async () => {
                setMenuOpen(false);
                try {
                  await fetch("/api/auth/logout-track", { method: "POST" });
                } catch {}
                signOut({ callbackUrl: "/login" });
              }}
              className="w-full text-left text-sm text-neutral-500 hover:text-red-400 transition-colors py-2"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
