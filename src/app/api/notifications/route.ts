import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { notificationService } from "@/services/notification.service";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  if (unreadOnly) {
    const notifications = await notificationService.getUnread(session.user.id);
    return NextResponse.json({ notifications, total: notifications.length });
  }

  const result = await notificationService.getAll(session.user.id, page);
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Mark all as read
  await notificationService.markAllAsRead(session.user.id);
  return NextResponse.json({ success: true });
}
