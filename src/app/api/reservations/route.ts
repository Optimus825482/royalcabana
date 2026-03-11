import { NextResponse, after } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { createReservationSchema, parseBody } from "@/lib/validators";
import { Role, ReservationStatus } from "@/types";
import { logAudit } from "@/lib/audit";
import { sseManager } from "@/lib/sse";
import { SSE_EVENTS } from "@/lib/sse-events";
import { notificationService } from "@/services/notification.service";
import { NotificationType } from "@/types";
import { emailService } from "@/lib/email";

export const GET = withAuth(
  [
    Role.ADMIN,
    Role.SYSTEM_ADMIN,
    Role.CASINO_ADMIN,
    Role.CASINO_USER,
    Role.FNB_USER,
  ],
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
    if (status) {
      const validStatuses: string[] = Object.values(ReservationStatus);
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Geçersiz status değeri: ${status}` },
          { status: 400 },
        );
      }
      where.status = status;
    }
    if (cabanaId) where.cabanaId = cabanaId;

    // Arama desteği — misafir adı veya Cabana adı ile arama
    const search = searchParams.get("search");
    if (search) {
      where.OR = [
        { guestName: { contains: search, mode: "insensitive" } },
        { cabana: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // CASINO_USER sadece kendi rezervasyonlarını görebilir; ADMIN/CASINO_ADMIN tümünü görür
    if (session.user.role === Role.CASINO_USER) {
      where.userId = session.user.id;
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          cabana: {
            select: {
              id: true,
              name: true,
              cabanaClass: { select: { id: true, name: true } },
            },
          },
          concept: { select: { id: true, name: true } },
          minibarType: { select: { id: true, name: true } },
          user: { select: { id: true, username: true, email: true } },
          guest: {
            select: {
              id: true,
              name: true,
              vipLevel: true,
            },
          },
          _count: {
            select: {
              statusHistory: true,
              modifications: true,
              cancellations: true,
              extraConcepts: true,
              extraItems: true,
              extraRequests: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.reservation.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { reservations, total },
    });
  },
  { requiredPermissions: ["reservation.view"] },
);

export const POST = withAuth(
  [Role.CASINO_USER],
  async (req, { session }) => {
    const body = await req.json();
    const parsed = parseBody(createReservationSchema, body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 },
      );
    }

    const {
      cabanaId,
      guestName,
      guestId,
      startDate,
      endDate,
      notes,
      conceptId,
      minibarTypeId,
      extraItems,
      customRequests,
      extraRequests,
    } = parsed.data;

    // Default concept fallback from SystemConfig
    let finalConceptId = conceptId ?? null;
    if (!finalConceptId) {
      const defaultConfig = await prisma.systemConfig.findUnique({
        where: { key: "default_concept_id" },
      });
      if (defaultConfig) finalConceptId = defaultConfig.value;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return NextResponse.json(
        {
          success: false,
          error: "Bitiş tarihi başlangıç tarihinden önce olamaz.",
        },
        { status: 400 },
      );
    }

    if (start < new Date()) {
      return NextResponse.json(
        { success: false, error: "Geçmiş tarihler için talep oluşturulamaz." },
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
            guestId: guestId ?? null,
            startDate: start,
            endDate: end,
            notes: notes ?? null,
            conceptId: finalConceptId,
            minibarTypeId: minibarTypeId ?? null,
            extraItems_json:
              extraItems && extraItems.length > 0 ? extraItems : undefined,
            customRequests: customRequests || null,
            status: "PENDING",
          };

          const created = await tx.reservation.create({
            data: reservationData as never,
            include: {
              cabana: { select: { id: true, name: true } },
              user: { select: { id: true, username: true } },
            },
          });

          // ReservationExtraRequest kayıtları — PRODUCT ve CUSTOM tipi
          const extraRequestRows: Array<{
            reservationId: string;
            type: "PRODUCT" | "CUSTOM";
            productId?: string | null;
            customName?: string | null;
            customDesc?: string | null;
            quantity: number;
          }> = [];

          if (extraItems && extraItems.length > 0) {
            for (const item of extraItems) {
              extraRequestRows.push({
                reservationId: created.id,
                type: "PRODUCT",
                productId: item.productId,
                quantity: item.quantity,
              });
            }
          }

          if (extraRequests && extraRequests.length > 0) {
            for (const er of extraRequests) {
              extraRequestRows.push({
                reservationId: created.id,
                type: er.type as "PRODUCT" | "CUSTOM",
                productId: er.type === "PRODUCT" ? er.productId : null,
                customName: er.type === "CUSTOM" ? er.customName : null,
                customDesc: er.type === "CUSTOM" ? er.customDesc : null,
                quantity: er.quantity,
              });
            }
          }

          if (extraRequestRows.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (tx as any).reservationExtraRequest.createMany({
              data: extraRequestRows,
            });
          }

          return created;
        },
        { isolationLevel: "Serializable", timeout: 10000 },
      );

      logAudit({
        userId: session.user.id,
        action: "CREATE",
        entity: "Reservation",
        entityId: reservation.id,
        newValue: {
          cabanaId,
          guestName,
          startDate,
          endDate,
          notes,
          minibarTypeId,
        },
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
            deletedAt: null,
            role: { in: [Role.ADMIN, Role.SYSTEM_ADMIN, Role.CASINO_ADMIN] },
          },
          select: { id: true, email: true, username: true },
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

        for (const admin of admins) {
          if (admin.email) {
            emailService.sendNewRequestNotification(admin.email, {
              guestName,
              cabanaName: reservation.cabana?.name ?? "",
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              requestedBy: session.user.name ?? "",
            });
          }
        }
      });

      return NextResponse.json(
        { success: true, data: reservation },
        { status: 201 },
      );
    } catch (err) {
      if (err instanceof Error && err.message === "CONFLICT") {
        return NextResponse.json(
          {
            success: false,
            error: "Seçilen tarih aralığında bu Cabana müsait değildir.",
          },
          { status: 409 },
        );
      }
      throw err;
    }
  },
  { requiredPermissions: ["reservation.create"] },
);
