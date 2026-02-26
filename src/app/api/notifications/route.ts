import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { notificationService } from "@/services/notification.service";
import { Role } from "@/types";

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

export const GET = withAuth(allRoles, async (req, { session }) => {
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  if (unreadOnly) {
    const notifications = await notificationService.getUnread(session.user.id);
    return NextResponse.json({ notifications, total: notifications.length });
  }

  const result = await notificationService.getAll(session.user.id, page);
  return NextResponse.json(result);
});

export const PATCH = withAuth(allRoles, async (_req, { session }) => {
  await notificationService.markAllAsRead(session.user.id);
  return NextResponse.json({ success: true });
});
