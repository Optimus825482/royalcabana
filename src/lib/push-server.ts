import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:admin@royalcabana.com";

let configured = false;

function ensureConfig() {
  if (configured) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!ensureConfig()) return 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subs = await (prisma as any).pushSubscription.findMany({
    where: { userId },
  });

  if (subs.length === 0) return 0;

  let sent = 0;
  const stale: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url ?? "/",
          icon: payload.icon ?? "/icons/Icon-192.png",
        }),
      );
      sent++;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) {
        stale.push(sub.id);
      }
    }
  }

  if (stale.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).pushSubscription.deleteMany({
      where: { id: { in: stale } },
    });
  }

  return sent;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<number> {
  if (!ensureConfig()) return 0;
  let total = 0;
  for (const uid of userIds) {
    total += await sendPushToUser(uid, payload);
  }
  return total;
}
