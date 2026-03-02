"use client";

import { useCallback, useState } from "react";
import { useSSE } from "@/hooks/useSSE";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { SSE_EVENTS } from "@/lib/sse-events";
import NotificationPopup, {
    type NotificationItem,
    type NotifType,
} from "./NotificationPopup";

// ─── SSE event → notification mapping ──────────────────────────────────

type SoundType = "info" | "success" | "warning" | "error";

interface EventMapping {
    notifType: NotifType;
    sound: SoundType;
    title: (data: Record<string, unknown>) => string;
    message: (data: Record<string, unknown>) => string;
}

const EVENT_MAP: Record<string, EventMapping> = {
    [SSE_EVENTS.RESERVATION_CREATED]: {
        notifType: "reservation_created",
        sound: "info",
        title: (d) =>
            `Yeni Rezervasyon Talebi${d.cabanaName ? ` — ${d.cabanaName}` : ""}`,
        message: (d) =>
            d.guestName
                ? `${d.guestName} yeni bir rezervasyon talebi oluşturdu.`
                : "Yeni bir rezervasyon talebi alındı.",
    },
    [SSE_EVENTS.RESERVATION_APPROVED]: {
        notifType: "reservation_approved",
        sound: "success",
        title: (d) =>
            `Rezervasyon Onaylandı${d.cabanaName ? ` — ${d.cabanaName}` : ""}`,
        message: (d) =>
            d.guestName
                ? `${d.guestName} adına rezervasyon onaylandı.`
                : "Bir rezervasyon onaylandı.",
    },
    [SSE_EVENTS.RESERVATION_REJECTED]: {
        notifType: "reservation_rejected",
        sound: "error",
        title: (d) =>
            `Rezervasyon Reddedildi${d.cabanaName ? ` — ${d.cabanaName}` : ""}`,
        message: (d) =>
            d.guestName
                ? `${d.guestName} adına rezervasyon reddedildi.`
                : "Bir rezervasyon reddedildi.",
    },
    [SSE_EVENTS.RESERVATION_CANCELLED]: {
        notifType: "reservation_cancelled",
        sound: "warning",
        title: (d) =>
            `Rezervasyon İptal Edildi${d.cabanaName ? ` — ${d.cabanaName}` : ""}`,
        message: (d) =>
            d.guestName
                ? `${d.guestName} adına rezervasyon iptal edildi.`
                : "Bir rezervasyon iptal edildi.",
    },
    [SSE_EVENTS.RESERVATION_CHECKED_IN]: {
        notifType: "reservation_checked_in",
        sound: "success",
        title: (d) =>
            `Check-in Yapıldı${d.cabanaName ? ` — ${d.cabanaName}` : ""}`,
        message: (d) =>
            d.guestName
                ? `${d.guestName} check-in yaptı.`
                : "Misafir check-in yaptı.",
    },
    [SSE_EVENTS.RESERVATION_CHECKED_OUT]: {
        notifType: "reservation_checked_out",
        sound: "info",
        title: (d) =>
            `Check-out Yapıldı${d.cabanaName ? ` — ${d.cabanaName}` : ""}`,
        message: (d) =>
            d.guestName
                ? `${d.guestName} check-out yaptı.`
                : "Misafir check-out yaptı.",
    },
    [SSE_EVENTS.FNB_ORDER_CREATED]: {
        notifType: "fnb_order_created",
        sound: "info",
        title: (d) =>
            `Yeni F&B Siparişi${d.cabanaName ? ` — ${d.cabanaName}` : ""}`,
        message: (d) =>
            d.guestName
                ? `${d.guestName} için yeni sipariş oluşturuldu.`
                : "Yeni bir F&B siparişi alındı.",
    },
    [SSE_EVENTS.FNB_ORDER_UPDATED]: {
        notifType: "fnb_order_updated",
        sound: "info",
        title: (d) =>
            `Sipariş Güncellendi${d.cabanaName ? ` — ${d.cabanaName}` : ""}`,
        message: (d) =>
            d.status
                ? `Sipariş durumu: ${d.status}`
                : "Bir F&B siparişi güncellendi.",
    },
    [SSE_EVENTS.NOTIFICATION_NEW]: {
        notifType: "notification_new",
        sound: "info",
        title: () => "Yeni Bildirim",
        message: (d) => (d.message as string) || "Yeni bir bildirim alındı.",
    },
    [SSE_EVENTS.CALENDAR_UPDATE]: {
        notifType: "calendar_update",
        sound: "info",
        title: () => "Takvim Güncellendi",
        message: () => "Rezervasyon takvimi güncellendi.",
    },
    [SSE_EVENTS.CABANA_STATUS_CHANGED]: {
        notifType: "cabana_status_changed",
        sound: "warning",
        title: (d) =>
            `Kabana Durumu Değişti${d.cabanaName ? ` — ${d.cabanaName}` : ""}`,
        message: (d) =>
            d.status
                ? `Kabana durumu: ${d.status}`
                : "Bir kabanenin durumu güncellendi.",
    },
};

// ─── Provider ──────────────────────────────────────────────────────────

let notifCounter = 0;

export default function NotificationProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const { play } = useNotificationSound();

    const handleSSEEvent = useCallback(
        (event: string, data: unknown) => {
            const mapping = EVENT_MAP[event];
            if (!mapping) return;

            // calendar:update events are silent — just data refresh, no popup
            if (event === SSE_EVENTS.CALENDAR_UPDATE) return;

            const payload = (data && typeof data === "object" ? data : {}) as Record<
                string,
                unknown
            >;

            const notification: NotificationItem = {
                id: `notif-${Date.now()}-${++notifCounter}`,
                type: mapping.notifType,
                title: mapping.title(payload),
                message: mapping.message(payload),
                timestamp: Date.now(),
            };

            // Play sound
            play(mapping.sound);

            // Add notification (keep max 5)
            setNotifications((prev) => [...prev.slice(-4), notification]);
        },
        [play],
    );

    // Connect SSE and route events to handler
    useSSE({ onEvent: handleSSEEvent });

    const handleDismiss = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    return (
        <>
            {children}
            <NotificationPopup
                notifications={notifications}
                onDismiss={handleDismiss}
            />
        </>
    );
}
