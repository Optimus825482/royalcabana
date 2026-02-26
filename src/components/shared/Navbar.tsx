"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import NotificationPanel from "./NotificationPanel";

type NavLink = { href: string; label: string };

const NAV_LINKS: Record<string, NavLink[]> = {
  SYSTEM_ADMIN: [
    { href: "/system-admin", label: "Panel" },
    { href: "/system-admin/users", label: "Kullanıcılar" },
    { href: "/system-admin/classes", label: "Sınıflar" },
    { href: "/system-admin/concepts", label: "Konseptler" },
    { href: "/system-admin/products", label: "Ürünler" },
    { href: "/system-admin/map", label: "Harita" },
    { href: "/system-admin/system-control", label: "Sistem" },
    { href: "/reports", label: "Raporlar" },
  ],
  ADMIN: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/requests", label: "Talepler" },
    { href: "/admin/pricing", label: "Fiyatlandırma" },
    { href: "/admin/users", label: "Kullanıcılar" },
  ],
  CASINO_USER: [
    { href: "/casino", label: "Panel" },
    { href: "/casino/map", label: "Harita" },
    { href: "/casino/view", label: "3D Görünüm" },
    { href: "/casino/calendar", label: "Takvim" },
  ],
  FNB_USER: [{ href: "/fnb", label: "Panel" }],
};

const ROLE_HOME: Record<string, string> = {
  SYSTEM_ADMIN: "/system-admin",
  ADMIN: "/admin",
  CASINO_USER: "/casino",
  FNB_USER: "/fnb",
};

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
        className="rounded-lg"
        onError={() => setImgError(true)}
        priority
      />
    </div>
  );
}

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = session?.user?.role as string | undefined;
  const links = role ? (NAV_LINKS[role] ?? []) : [];
  const homeHref = role ? (ROLE_HOME[role] ?? "/") : "/";

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

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
          {links.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-sm whitespace-nowrap transition-colors rounded-md ${
                  isActive
                    ? "text-amber-400 bg-amber-400/10"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 md:hidden" />

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationPanel />
          <span className="text-sm text-neutral-400 hidden sm:block truncate max-w-[120px]">
            {session?.user?.name}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="hidden md:block text-sm text-neutral-500 hover:text-neutral-200 transition-colors px-2 py-1 rounded hover:bg-neutral-800"
          >
            Çıkış
          </button>
          {/* Hamburger - mobile only */}
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

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-900 pb-2">
          {links.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? "text-amber-400 bg-amber-400/10 border-l-2 border-amber-400"
                    : "text-neutral-300 hover:bg-neutral-800 border-l-2 border-transparent"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="px-4 pt-2 pb-1 border-t border-neutral-800 mt-1">
            <button
              onClick={() => {
                setMenuOpen(false);
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
