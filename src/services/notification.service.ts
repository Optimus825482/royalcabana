import { prisma } from "@/lib/prisma";
import { DatabaseError } from "@/lib/errors";
import { NotificationType } from "@/types";
import { Prisma } from "@prisma/client";
import { sendPushToUser, sendPushToUsers } from "@/lib/push-server";

interface SendParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  async send(params: SendParams) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          metadata:
            params.metadata !== undefined
              ? (params.metadata as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });

      sendPushToUser(params.userId, {
        title: params.title,
        body: params.message,
      }).catch(() => {});

      return notification;
    } catch (error) {
      throw new DatabaseError("Bildirim oluşturulamadı", {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async sendMany(notifications: SendParams[]) {
    try {
      const result = await prisma.notification.createMany({
        data: notifications.map((n) => ({
          userId: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          metadata:
            n.metadata !== undefined
              ? (n.metadata as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        })),
      });

      const userIds = [...new Set(notifications.map((n) => n.userId))];
      const title = notifications[0]?.title ?? "Bildirim";
      const body = notifications[0]?.message ?? "";
      sendPushToUsers(userIds, { title, body }).catch(() => {});

      return result;
    } catch (error) {
      throw new DatabaseError("Toplu bildirim oluşturulamadı", {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      return await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true },
      });
    } catch (error) {
      throw new DatabaseError("Bildirim okundu olarak işaretlenemedi", {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async markAllAsRead(userId: string) {
    try {
      return await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    } catch (error) {
      throw new DatabaseError("Bildirimler okundu olarak işaretlenemedi", {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getUnread(userId: string) {
    try {
      return await prisma.notification.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    } catch (error) {
      throw new DatabaseError("Okunmamış bildirimler getirilemedi", {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getAll(userId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where: { userId } }),
      ]);
      return { notifications, total };
    } catch (error) {
      throw new DatabaseError("Bildirimler getirilemedi", {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const notificationService = new NotificationService();
