"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import React, { useState, useEffect, useRef } from "react";
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

const MemoizedDigitalClock = React.memo(function DigitalClock() {
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
    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--rc-card)] rounded-xl border border-[var(--rc-border-subtle)]">
      {/* Calendar */}
      <div className="flex items-center gap-1.5 text-[var(--rc-gold)]">
        <span className="text-lg font-semibold tabular-nums">{date.day}</span>
        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-medium">{date.month}</span>
          <span className="text-[9px] text-[var(--rc-text-muted)]">{date.weekday}</span>
        </div>
      </div>
      <div className="w-px h-6 bg-[var(--rc-border-subtle)]" />
      {/* Clock */}
      <div className="font-mono text-xl font-semibold tracking-wider text-[var(--rc-text-primary)] tabular-nums">
        {time}
      </div>
    </div>
  );
});

export default function StickyHeader({
  onToggleSidebar,
  sidebarOpen,
}: {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}) {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 bg-[var(--rc-sidebar)] border-b border-[var(--rc-border-subtle)] shrink-0">
      {/* Main header bar */}
      <div className="h-14 px-4 flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden flex items-center justify-center w-11 h-11 rounded-lg hover:bg-[var(--rc-card-hover)] transition-colors"
          aria-label={sidebarOpen ? "Menüyü kapat" : "Menüyü aç"}
        >
          {sidebarOpen ? (
            <X className="w-5 h-5 text-[var(--rc-text-secondary)]" />
          ) : (
            <Menu className="w-5 h-5 text-[var(--rc-text-secondary)]" />
          )}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Digital Clock & Calendar - desktop only */}
        <div className="hidden md:block">
          <MemoizedDigitalClock />
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
        className="flex items-center gap-1.5 text-sm text-[var(--rc-text-muted)] hover:text-[var(--rc-gold)] transition-colors rounded-md px-2 py-1.5 hover:bg-[var(--rc-card-hover)]"
      >
        <UserIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[120px]">{userName}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-[var(--rc-card)] border border-[var(--rc-border-subtle)] rounded-lg shadow-xl py-1 z-50">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--rc-text-secondary)] hover:text-[var(--rc-gold)] hover:bg-[var(--rc-card-hover)] transition-colors"
          >
            <UserIcon className="w-4 h-4" />
            Profil
          </Link>
          <div className="border-t border-[var(--rc-border-subtle)] my-1" />
          <button
            onClick={async () => {
              setOpen(false);
              try {
                await fetch("/api/auth/logout-track", { method: "POST" });
              } catch {}
              signOut({ callbackUrl: "/login" });
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--rc-text-muted)] hover:text-[var(--rc-danger)] hover:bg-[var(--rc-card-hover)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Çıkış
          </button>
        </div>
      )}
    </div>
  );
}
