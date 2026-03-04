import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const rl = await checkRateLimit(`push-sub:${session.user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit aşıldı." },
      { status: 429 },
    );
  }

  try {
    const subscription = await req.json();

    if (!subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json(
        { success: false, error: "Geçersiz subscription formatı." },
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

    return NextResponse.json({ success: true, data: { subscribed: true } });
  } catch (error) {
    console.error("[Push Subscribe]", error);
    return NextResponse.json(
      { success: false, error: "Subscription kaydedilemedi." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Endpoint gerekli." },
        { status: 400 },
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    });

    return NextResponse.json({ success: true, data: { unsubscribed: true } });
  } catch (error) {
    console.error("[Push Unsubscribe]", error);
    return NextResponse.json(
      { success: false, error: "Subscription silinemedi." },
      { status: 500 },
    );
  }
}
