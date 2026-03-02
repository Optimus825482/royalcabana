import { NextResponse, after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { createReservationSchema, parseBody } from "@/lib/validators";
import { Role } from "@/types";
import { logAudit } from "@/lib/audit";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";
import { notificationService } from "@/services/notification.service";
import { NotificationType } from "@/types";

export const GET = withAuth(
  [Role.ADMIN, Role.SYSTEM_ADMIN, Role.CASINO_USER, Role.FNB_USER],
  async (req, { session }) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const cabanaId = searchParams.get("cabanaId");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "20", 10),
      100,
    );
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;
    if (cabanaId) where.cabanaId = cabanaId;

    // Arama desteği — misafir adı veya kabana adı ile arama
    const search = searchParams.get("search");
    if (search) {
      where.OR = [
        { guestName: { contains: search, mode: "insensitive" } },
        { cabana: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // CASINO_USER sadece kendi rezervasyonlarını görebilir
    if (session.user.role === Role.CASINO_USER) {
      where.userId = session.user.id;
    }

    const isFnB = session.user.role === Role.FNB_USER;

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          cabana: { select: { id: true, name: true } },
          user: { select: { id: true, username: true, email: true } },
          statusHistory: { orderBy: { createdAt: "asc" } },
          ...(isFnB && {
            modifications: {
              select: {
                id: true,
                status: true,
                newStartDate: true,
                newEndDate: true,
                newGuestName: true,
              },
            },
            cancellations: {
              select: { id: true, status: true, reason: true },
            },
            extraConcepts: {
              select: { id: true, status: true, items: true },
            },
            extraItems: {
              include: { product: { select: { name: true } } },
            },
          }),
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.reservation.count({ where }),
    ]);

    // Misafir gizliliği: isGuestPrivate=true ise sadece CASINO_USER (sahibi) görebilir
    // Diğer roller için misafir bilgileri maskelenir
    const isCasino = session.user.role === Role.CASINO_USER;
    const sanitized = reservations.map((r: Record<string, unknown>) => {
      if ((r as { isGuestPrivate?: boolean }).isGuestPrivate && !isCasino) {
        return {
          ...r,
          guestName: "Gizli Misafir",
          guestId: null,
          notes: null,
        };
      }
      return r;
    });

    return NextResponse.json({ reservations: sanitized, total });
  },
  { requiredPermissions: ["reservation.view"] },
);

export const POST = withAuth(
  [Role.CASINO_USER],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createReservationSchema, body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { cabanaId, guestName, startDate, endDate, notes } = parsed.data;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return NextResponse.json(
        { error: "Başlangıç tarihi bitiş tarihinden önce olmalıdır." },
        { status: 400 },
      );
    }

    if (start < new Date()) {
      return NextResponse.json(
        { error: "Geçmiş tarihler için talep oluşturulamaz." },
        { status: 400 },
      );
    }

    // Atomik çakışma kontrolü + kayıt oluşturma (race condition önleme)
    // Boundary rule: startDate < end AND endDate > start (strict inequality)
    // Bu sayede aynı gün check-out (endDate) ve check-in (startDate) çakışma sayılmaz
    try {
      const reservation = await prisma.$transaction(
        async (tx) => {
          const conflicts = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM reservations
            WHERE "cabanaId" = ${cabanaId}
              AND status = 'APPROVED'
              AND "startDate" < ${end}
              AND "endDate" > ${start}
            FOR UPDATE
          `;

          if (conflicts.length > 0) {
            throw new Error("CONFLICT");
          }

          const reservationData: Record<string, unknown> = {
            cabanaId,
            userId: session.user.id,
            guestName,
            startDate: start,
            endDate: end,
            notes: notes ?? null,
            status: "PENDING",
          };

          return tx.reservation.create({
            data: reservationData as never,
            include: {
              cabana: { select: { id: true, name: true } },
              user: { select: { id: true, username: true } },
            },
          });
        },
        { isolationLevel: "Serializable", timeout: 10000 },
      );

      logAudit({
        userId: session.user.id,
        action: "CREATE",
        entity: "Reservation",
        entityId: reservation.id,
        newValue: { cabanaId, guestName, startDate, endDate, notes },
      });

      // SSE broadcast — non-blocking
      after(async () => {
        sseManager.broadcast(SSE_EVENTS.RESERVATION_CREATED, {
          reservationId: reservation.id,
          cabanaName: reservation.cabana?.name ?? "",
          guestName,
          startDate,
          endDate,
        });

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
            type: NotificationType.NEW_REQUEST,
            title: "Yeni Rezervasyon Talebi",
            message: `${guestName} için yeni rezervasyon talebi oluşturuldu.`,
            metadata: {
              reservationId: reservation.id,
              cabanaName: reservation.cabana?.name ?? "",
              startDate,
              endDate,
            },
          })),
        );
      });

      return NextResponse.json(reservation, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message === "CONFLICT") {
        return NextResponse.json(
          { error: "Seçilen tarih aralığında bu kabana müsait değildir." },
          { status: 409 },
        );
      }
      throw err;
    }
  },
  { requiredPermissions: ["reservation.create"] },
);
