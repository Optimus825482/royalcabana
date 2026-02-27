"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Pencil,
  Ban,
  PlusCircle,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, typeof ClipboardList> = {
  NEW_REQUEST: ClipboardList,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  MODIFICATION_REQUEST: Pencil,
  CANCELLATION_REQUEST: Ban,
  EXTRA_CONCEPT_REQUEST: PlusCircle,
  EXTRA_ADDED: ShoppingBag,
  STATUS_CHANGED: RefreshCw,
};

const TYPE_COLOR: Record<string, string> = {
  NEW_REQUEST: "text-blue-400",
  APPROVED: "text-green-400",
  REJECTED: "text-red-400",
  MODIFICATION_REQUEST: "text-orange-400",
  CANCELLATION_REQUEST: "text-red-400",
  EXTRA_CONCEPT_REQUEST: "text-purple-400",
  EXTRA_ADDED: "text-emerald-400",
  STATUS_CHANGED: "text-cyan-400",
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
    let cancelled = false;

    import("@/lib/socket").then(({ getSocket }) => {
      if (cancelled) return;
      fetch("/api/auth/token")
        .then((r) => r.json())
        .then(({ token }) => {
          if (!token || cancelled) return;
          const socket = getSocket(token);
          socket.on("notification", () => {
            queryClient.invalidateQueries({
              queryKey: ["notifications-unread"],
            });
          });
          cleanup = () => socket.off("notification");
        })
        .catch(() => {
          // Auth token fetch failed — polling fallback active
        });
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
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
        <Bell className="w-5 h-5" />
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
                    {(() => {
                      const IconComp = TYPE_ICON[n.type] ?? Bell;
                      const iconColor =
                        TYPE_COLOR[n.type] ?? "text-neutral-400";
                      return (
                        <IconComp
                          className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`}
                        />
                      );
                    })()}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-100 truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-neutral-600 mt-1">
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
