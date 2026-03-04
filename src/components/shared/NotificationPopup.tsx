"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  LogIn,
  LogOut,
  Calendar,
  UtensilsCrossed,
} from "lucide-react";

export type NotifType =
  | "reservation_created"
  | "reservation_approved"
  | "reservation_rejected"
  | "reservation_cancelled"
  | "reservation_checked_in"
  | "reservation_checked_out"
  | "fnb_order_created"
  | "fnb_order_updated"
  | "notification_new"
  | "calendar_update"
  | "cabana_status_changed";

export interface NotificationItem {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: number;
}

// ─── Theme config per notification type ────────────────────────────────

interface NotifTheme {
  icon: typeof Bell;
  gradient: string;
  border: string;
  iconColor: string;
  pulse: string;
  badge: string;
}

const NOTIF_THEMES: Record<NotifType, NotifTheme> = {
  reservation_created: {
    icon: Calendar,
    gradient: "from-amber-500/20 via-amber-600/10 to-transparent",
    border: "border-amber-500/40",
    iconColor: "text-amber-400",
    pulse: "bg-amber-400",
    badge: "bg-amber-500/20 text-amber-300",
  },
  reservation_approved: {
    icon: CheckCircle2,
    gradient: "from-emerald-500/20 via-emerald-600/10 to-transparent",
    border: "border-emerald-500/40",
    iconColor: "text-emerald-400",
    pulse: "bg-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-300",
  },
  reservation_rejected: {
    icon: XCircle,
    gradient: "from-red-500/20 via-red-600/10 to-transparent",
    border: "border-red-500/40",
    iconColor: "text-red-400",
    pulse: "bg-red-400",
    badge: "bg-red-500/20 text-red-300",
  },
  reservation_cancelled: {
    icon: XCircle,
    gradient: "from-orange-500/20 via-orange-600/10 to-transparent",
    border: "border-orange-500/40",
    iconColor: "text-orange-400",
    pulse: "bg-orange-400",
    badge: "bg-orange-500/20 text-orange-300",
  },
  reservation_checked_in: {
    icon: LogIn,
    gradient: "from-sky-500/20 via-sky-600/10 to-transparent",
    border: "border-sky-500/40",
    iconColor: "text-sky-400",
    pulse: "bg-sky-400",
    badge: "bg-sky-500/20 text-sky-300",
  },
  reservation_checked_out: {
    icon: LogOut,
    gradient: "from-violet-500/20 via-violet-600/10 to-transparent",
    border: "border-violet-500/40",
    iconColor: "text-violet-400",
    pulse: "bg-violet-400",
    badge: "bg-violet-500/20 text-violet-300",
  },
  fnb_order_created: {
    icon: UtensilsCrossed,
    gradient: "from-pink-500/20 via-pink-600/10 to-transparent",
    border: "border-pink-500/40",
    iconColor: "text-pink-400",
    pulse: "bg-pink-400",
    badge: "bg-pink-500/20 text-pink-300",
  },
  fnb_order_updated: {
    icon: UtensilsCrossed,
    gradient: "from-fuchsia-500/20 via-fuchsia-600/10 to-transparent",
    border: "border-fuchsia-500/40",
    iconColor: "text-fuchsia-400",
    pulse: "bg-fuchsia-400",
    badge: "bg-fuchsia-500/20 text-fuchsia-300",
  },
  notification_new: {
    icon: Bell,
    gradient: "from-cyan-500/20 via-cyan-600/10 to-transparent",
    border: "border-cyan-500/40",
    iconColor: "text-cyan-400",
    pulse: "bg-cyan-400",
    badge: "bg-cyan-500/20 text-cyan-300",
  },
  calendar_update: {
    icon: Calendar,
    gradient: "from-teal-500/20 via-teal-600/10 to-transparent",
    border: "border-teal-500/40",
    iconColor: "text-teal-400",
    pulse: "bg-teal-400",
    badge: "bg-teal-500/20 text-teal-300",
  },
  cabana_status_changed: {
    icon: AlertTriangle,
    gradient: "from-yellow-500/20 via-yellow-600/10 to-transparent",
    border: "border-yellow-500/40",
    iconColor: "text-yellow-400",
    pulse: "bg-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300",
  },
};

const TYPE_LABELS: Record<NotifType, string> = {
  reservation_created: "Yeni Talep",
  reservation_approved: "Onaylandı",
  reservation_rejected: "Reddedildi",
  reservation_cancelled: "İptal Edildi",
  reservation_checked_in: "Check-in",
  reservation_checked_out: "Check-out",
  fnb_order_created: "Yeni Sipariş",
  fnb_order_updated: "Sipariş Güncellendi",
  notification_new: "Bildirim",
  calendar_update: "Takvim Güncelleme",
  cabana_status_changed: "Cabana Durumu",
};

// ─── Single notification card ──────────────────────────────────────────

function NotificationCard({
  notification,
  onDismiss,
  index,
}: {
  notification: NotificationItem;
  onDismiss: (id: string) => void;
  index: number;
}) {
  const [isEntering, setIsEntering] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);
  const theme = NOTIF_THEMES[notification.type];
  const Icon = theme.icon;
  const autoCloseMs = 6000;

  // Enter animation
  useEffect(() => {
    const t = setTimeout(() => setIsEntering(false), 50);
    return () => clearTimeout(t);
  }, []);

  // Progress bar countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - 100 / (autoCloseMs / 50);
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Auto dismiss
  useEffect(() => {
    const t = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onDismiss(notification.id), 300);
    }, autoCloseMs);
    return () => clearTimeout(t);
  }, [notification.id, onDismiss]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  const timeStr = new Date(notification.timestamp).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`
        relative w-95 overflow-hidden rounded-2xl
        border ${theme.border}
        bg-neutral-950/95 backdrop-blur-xl
        shadow-2xl shadow-black/50
        transition-all duration-300 ease-out
        ${isEntering ? "translate-x-[120%] opacity-0 scale-95" : ""}
        ${isLeaving ? "translate-x-[120%] opacity-0 scale-95" : "translate-x-0 opacity-100 scale-100"}
      `}
      style={{ transitionDelay: isEntering ? `${index * 60}ms` : "0ms" }}
    >
      {/* Gradient background glow */}
      <div
        className={`absolute inset-0 bg-linear-to-r ${theme.gradient} pointer-events-none`}
      />

      {/* Animated pulse dot */}
      <div className="absolute top-4 left-4">
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.pulse} opacity-75`}
          />
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${theme.pulse}`}
          />
        </span>
      </div>

      {/* Main content */}
      <div className="relative p-4 pl-9">
        <div className="flex items-start gap-3">
          {/* Icon container */}
          <div
            className={`
              flex items-center justify-center w-10 h-10 rounded-xl
              bg-neutral-800/60 border border-neutral-700/40
              shrink-0
            `}
          >
            <Icon className={`w-5 h-5 ${theme.iconColor}`} />
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded-md text-[10px]
                  font-bold uppercase tracking-wider ${theme.badge}
                `}
              >
                {TYPE_LABELS[notification.type]}
              </span>
              <span className="text-[10px] text-neutral-600 tabular-nums">
                {timeStr}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-neutral-100 leading-tight mb-0.5 truncate">
              {notification.title}
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
              {notification.message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="
              flex items-center justify-center w-7 h-7 rounded-lg
              bg-neutral-800/40 hover:bg-neutral-700/60
              text-neutral-500 hover:text-neutral-200
              transition-colors shrink-0
            "
            aria-label="Kapat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-neutral-800/50">
        <div
          className={`h-full ${theme.pulse} transition-all duration-50 ease-linear opacity-60`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Notification container ────────────────────────────────────────────

export default function NotificationPopup({
  notifications,
  onDismiss,
}: {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-9999 flex flex-col gap-3 pointer-events-none"
      aria-live="assertive"
      aria-label="Sistem Bildirimleri"
    >
      {notifications.slice(-5).map((n, i) => (
        <div key={n.id} className="pointer-events-auto">
          <NotificationCard notification={n} onDismiss={onDismiss} index={i} />
        </div>
      ))}
    </div>
  );
}
