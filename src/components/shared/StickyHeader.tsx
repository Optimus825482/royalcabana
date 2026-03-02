"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { User as UserIcon, LogOut, Menu, X, ChevronDown } from "lucide-react";
import NotificationPanel from "./NotificationPanel";
import Breadcrumb from "./Breadcrumb";

const TURKISH_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const TURKISH_MONTHS = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

function DigitalClock() {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState({ day: 0, weekday: "", month: "" });

  useEffect(() => {
    const update = () => {
      const now = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Europe/Nicosia" }),
      );
      setTime(
        now.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      setDate({
        day: now.getDate(),
        weekday: TURKISH_DAYS[now.getDay()],
        month: TURKISH_MONTHS[now.getMonth()],
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-neutral-800/80 rounded-xl border border-neutral-700/50">
      {/* Calendar */}
      <div className="flex items-center gap-1.5 text-amber-400">
        <span className="text-lg font-semibold tabular-nums">{date.day}</span>
        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-medium">{date.month}</span>
          <span className="text-[9px] text-neutral-500">{date.weekday}</span>
        </div>
      </div>
      <div className="w-px h-6 bg-neutral-700" />
      {/* Clock */}
      <div className="font-mono text-xl font-semibold tracking-wider text-cyan-400 tabular-nums">
        {time}
      </div>
    </div>
  );
}

export default function StickyHeader({
  onToggleSidebar,
  sidebarOpen,
}: {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}) {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 bg-neutral-900 border-b border-neutral-800 shrink-0">
      {/* Main header bar */}
      <div className="h-14 px-4 flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-neutral-800 transition-colors"
          aria-label={sidebarOpen ? "Menüyü kapat" : "Menüyü aç"}
        >
          {sidebarOpen ? (
            <X className="w-5 h-5 text-neutral-300" />
          ) : (
            <Menu className="w-5 h-5 text-neutral-300" />
          )}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Digital Clock & Calendar - desktop only */}
        <div className="hidden md:block">
          <DigitalClock />
        </div>

        {/* Notifications */}
        <NotificationPanel />

        {/* User menu with dropdown */}
        <ProfileDropdown userName={session?.user?.name} />
      </div>

      {/* Breadcrumb bar */}
      <Breadcrumb />
    </header>
  );
}

// ─── Profile Dropdown ───────────────────────────────────────────────────────

function ProfileDropdown({ userName }: { userName?: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-amber-400 transition-colors rounded-md px-2 py-1.5 hover:bg-neutral-800"
      >
        <UserIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[120px]">{userName}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl py-1 z-50">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-300 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
          >
            <UserIcon className="w-4 h-4" />
            Profil
          </Link>
          <div className="border-t border-neutral-800 my-1" />
          <button
            onClick={async () => {
              setOpen(false);
              try {
                await fetch("/api/auth/logout-track", { method: "POST" });
              } catch {}
              signOut({ callbackUrl: "/login" });
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Çıkış
          </button>
        </div>
      )}
    </div>
  );
}
