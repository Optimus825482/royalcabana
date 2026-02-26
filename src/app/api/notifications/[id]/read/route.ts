import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";
import { notificationService } from "@/services/notification.service";

const allRoles = [
  Role.ADMIN,
  Role.SYSTEM_ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

export const PATCH = withAuth(allRoles, async (_req, { session, params }) => {
  const id = params!.id;
  await notificationService.markAsRead(id, session.user.id);
  return NextResponse.json({ success: true });
});
