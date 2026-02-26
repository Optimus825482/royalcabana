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
        width={48}
        height={48}
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

  const role = session?.user?.role as string | undefined;
  const links = role ? (NAV_LINKS[role] ?? []) : [];
  const homeHref = role ? (ROLE_HOME[role] ?? "/") : "/";

  return (
    <nav className="bg-neutral-900 border-b border-neutral-800 h-14 px-4 flex items-center gap-6 shrink-0">
      {/* Logo */}
      <Link href={homeHref} className="flex items-center gap-2 shrink-0">
        <Logo />
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
        {links.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? "text-amber-400 border-b-2 border-amber-400"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        <NotificationPanel />
        {session?.user?.name && (
          <span className="text-sm text-neutral-400 hidden sm:block">
            {session.user.name}
          </span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-neutral-500 hover:text-neutral-200 transition-colors px-2 py-1 rounded hover:bg-neutral-800"
        >
          Çıkış
        </button>
      </div>
    </nav>
  );
}
