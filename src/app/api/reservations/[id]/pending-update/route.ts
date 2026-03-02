import { NextResponse, after } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { NotificationType, Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";
import { notificationService } from "@/services/notification.service";

const updatePendingReservationSchema = z
  .object({
    guestName: z.string().min(2).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      data.guestName !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.notes !== undefined,
    { message: "En az bir alan güncellenmelidir." },
  );

export const PATCH = withAuth(
  [Role.CASINO_USER],
  async (req, { session, params }) => {
    const reservationId = params!.id;

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { cabana: { select: { id: true, name: true } } },
    });

    if (!reservation || reservation.deletedAt) {
      return NextResponse.json(
        { error: "Rezervasyon bulunamadı." },
        { status: 404 },
      );
    }

    if (reservation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Yalnızca bekleyen rezervasyon talepleri güncellenebilir." },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = updatePendingReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Geçersiz veri." },
        { status: 400 },
      );
    }

    const nextGuestName =
      parsed.data.guestName !== undefined
        ? parsed.data.guestName.trim()
        : reservation.guestName;

    const nextStartDate =
      parsed.data.startDate !== undefined
        ? new Date(parsed.data.startDate)
        : reservation.startDate;

    const nextEndDate =
      parsed.data.endDate !== undefined
        ? new Date(parsed.data.endDate)
        : reservation.endDate;

    const nextNotes =
      parsed.data.notes !== undefined ? parsed.data.notes : reservation.notes;

    if (!nextGuestName || nextGuestName.length < 2) {
      return NextResponse.json(
        { error: "Misafir adı en az 2 karakter olmalıdır." },
        { status: 400 },
      );
    }

    if (isNaN(nextStartDate.getTime()) || isNaN(nextEndDate.getTime())) {
      return NextResponse.json(
        { error: "Geçersiz tarih formatı." },
        { status: 400 },
      );
    }

    if (nextStartDate >= nextEndDate) {
      return NextResponse.json(
        { error: "Başlangıç tarihi bitiş tarihinden önce olmalıdır." },
        { status: 400 },
      );
    }

    if (nextStartDate < new Date()) {
      return NextResponse.json(
        { error: "Geçmiş tarihler için güncelleme yapılamaz." },
        { status: 400 },
      );
    }

    const conflicts = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM reservations
    WHERE "cabanaId" = ${reservation.cabanaId}
      AND status = 'APPROVED'
      AND "deletedAt" IS NULL
      AND id != ${reservation.id}
      AND "startDate" < ${nextEndDate}
      AND "endDate" > ${nextStartDate}
  `;

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: "Seçilen tarih aralığında bu kabana müsait değildir." },
        { status: 409 },
      );
    }

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        guestName: nextGuestName,
        startDate: nextStartDate,
        endDate: nextEndDate,
        notes: nextNotes ?? null,
      },
      include: { cabana: { select: { id: true, name: true } } },
    });

    logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Reservation",
      entityId: reservation.id,
      oldValue: {
        guestName: reservation.guestName,
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        notes: reservation.notes,
        status: reservation.status,
      },
      newValue: {
        guestName: updated.guestName,
        startDate: updated.startDate,
        endDate: updated.endDate,
        notes: updated.notes,
        status: updated.status,
      },
    });

    after(() => {
      sseManager.broadcast(SSE_EVENTS.CALENDAR_UPDATE, {
        reservationId: updated.id,
        cabanaName: updated.cabana.name,
        guestName: updated.guestName,
        startDate: updated.startDate,
        endDate: updated.endDate,
      });
    });

    after(async () => {
      const admins = await prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: [Role.ADMIN, Role.SYSTEM_ADMIN] },
        },
        select: { id: true },
      });

      if (admins.length === 0) return;

      await notificationService.sendMany(
        admins.map((admin) => ({
          userId: admin.id,
          type: NotificationType.MODIFICATION_REQUEST,
          title: "Bekleyen Talep Güncellendi",
          message: `${updated.guestName} için bekleyen rezervasyon talebi güncellendi.`,
          metadata: {
            reservationId: updated.id,
            cabanaName: updated.cabana.name,
            startDate: updated.startDate,
            endDate: updated.endDate,
          },
        })),
      );
    });

    return NextResponse.json(updated);
  },
);
