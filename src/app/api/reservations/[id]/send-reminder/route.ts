import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { Role, NotificationType } from "@/types";
import { notificationService } from "@/services/notification.service";

/**
 * Beklemedeki (PENDING) talep için admin'lere "Hatırlatma" bildirimi gönderir.
 * Sadece rezervasyonu oluşturan Casino kullanıcısı çağırabilir.
 */
export const POST = withAuth(
  [Role.CASINO_USER],
  async (_req, { session, params }) => {
    const id = params!.id;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { cabana: { select: { name: true } } },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: "Rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    if (reservation.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Yalnızca kendi talebiniz için hatırlatma gönderebilirsiniz." },
        { status: 403 },
      );
    }

    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Yalnızca beklemedeki talepler için hatırlatma gönderilebilir." },
        { status: 400 },
      );
    }

    const admins = await prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN, Role.SYSTEM_ADMIN] },
        isActive: true,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (admins.length === 0) {
      return NextResponse.json({
        success: true,
        data: { message: "Hatırlatma gönderildi.", sentCount: 0 },
      });
    }

    const startStr = new Date(reservation.startDate).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const endStr = new Date(reservation.endDate).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const message = `Bekleyen talep: ${reservation.guestName}, ${reservation.cabana?.name ?? "Cabana"} (${startStr} – ${endStr})`;

    await notificationService.sendMany(
      admins.map((admin) => ({
        userId: admin.id,
        type: NotificationType.NEW_REQUEST,
        title: "Hatırlatma",
        message,
        metadata: {
          reservationId: reservation.id,
          cabanaName: reservation.cabana?.name ?? "",
          startDate: reservation.startDate,
          endDate: reservation.endDate,
        },
      })),
    );

    return NextResponse.json({
      success: true,
      data: { message: "Hatırlatma gönderildi.", sentCount: admins.length },
    });
  },
  { requiredPermissions: ["reservation.view"] },
);
