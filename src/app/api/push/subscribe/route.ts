import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

const ALL_ROLES = [
  Role.SYSTEM_ADMIN,
  Role.ADMIN,
  Role.CASINO_ADMIN,
  Role.CASINO_USER,
  Role.FNB_ADMIN,
  Role.FNB_USER,
];

export const POST = withAuth(
  ALL_ROLES,
  async (req: NextRequest, { session }) => {
    try {
      const subscription = await req.json();

      if (!subscription?.endpoint || !subscription?.keys) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Geçersiz subscription formatı.",
          },
          { status: 400 },
        );
      }

      await prisma.pushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        update: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userId: session.user.id,
          updatedAt: new Date(),
        },
        create: {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userId: session.user.id,
        },
      });

      return NextResponse.json({
        success: true,
        data: { subscribed: true },
        error: null,
      });
    } catch (error) {
      console.error("[Push Subscribe]", error);
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Subscription kaydedilemedi.",
        },
        { status: 500 },
      );
    }
  },
  { rateLimit: { limit: 5, windowMs: 60_000 } },
);

export const DELETE = withAuth(
  ALL_ROLES,
  async (req: NextRequest, { session }) => {
    try {
      const { endpoint } = await req.json();

      if (!endpoint) {
        return NextResponse.json(
          { success: false, data: null, error: "Endpoint gerekli." },
          { status: 400 },
        );
      }

      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: session.user.id },
      });

      return NextResponse.json({
        success: true,
        data: { unsubscribed: true },
        error: null,
      });
    } catch (error) {
      console.error("[Push Unsubscribe]", error);
      return NextResponse.json(
        { success: false, data: null, error: "Subscription silinemedi." },
        { status: 500 },
      );
    }
  },
  { rateLimit: { limit: 5, windowMs: 60_000 } },
);
