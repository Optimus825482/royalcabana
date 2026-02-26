"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  NEW_REQUEST: "📋",
  APPROVED: "✅",
  REJECTED: "❌",
  MODIFICATION_REQUEST: "✏️",
  CANCELLATION_REQUEST: "🚫",
  EXTRA_CONCEPT_REQUEST: "➕",
  EXTRA_ADDED: "🛍️",
  STATUS_CHANGED: "🔄",
};

async function fetchUnread(): Promise<{
  notifications: Notification[];
  total: number;
}> {
  const res = await fetch("/api/notifications?unread=true");
  if (!res.ok) throw new Error("Bildirimler yüklenemedi.");
  return res.json();
}

export default function NotificationPanel() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: fetchUnread,
    enabled: !!session,
    refetchInterval: 30_000, // polling fallback — 30s
  });

  const unreadCount = data?.notifications.filter((n) => !n.isRead).length ?? 0;

  // Socket.io real-time (lazy import to avoid SSR issues)
  useEffect(() => {
    if (!session?.user) return;

    let cleanup: (() => void) | undefined;

    import("@/lib/socket").then(({ getSocket }) => {
      // NextAuth JWT token — use session token via API
      fetch("/api/auth/token")
        .then((r) => r.json())
        .then(({ token }) => {
          if (!token) return;
          const socket = getSocket(token);
          socket.on("notification", () => {
            queryClient.invalidateQueries({
              queryKey: ["notifications-unread"],
            });
          });
          cleanup = () => socket.off("notification");
        })
        .catch(() => {
          // Socket unavailable — polling fallback active
        });
    });

    return () => cleanup?.();
  }, [session, queryClient]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  }, [queryClient]);

  const markOneRead = useCallback(
    async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
    [queryClient],
  );

  if (!session) return null;

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
        aria-label="Bildirimler"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-yellow-500 text-neutral-950 rounded-full px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <span className="text-sm font-semibold text-neutral-200">
              Bildirimler
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {!data?.notifications.length ? (
              <div className="flex items-center justify-center h-24 text-neutral-600 text-sm">
                Bildirim yok
              </div>
            ) : (
              data.notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markOneRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-neutral-800/60 hover:bg-neutral-800/50 transition-colors ${
                    !n.isRead ? "bg-neutral-800/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base shrink-0 mt-0.5">
                      {TYPE_ICON[n.type] ?? "🔔"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-200 truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-neutral-700 mt-1">
                        {new Date(n.createdAt).toLocaleString("tr-TR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
