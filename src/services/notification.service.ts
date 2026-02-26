import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/types";
import { Prisma } from "@prisma/client";

interface SendParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  async send(params: SendParams) {
    return prisma.notification.create({
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
  }

  async sendMany(notifications: SendParams[]) {
    return prisma.notification.createMany({
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
  }

  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnread(userId: string) {
    return prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getAll(userId: string, page = 1, limit = 20) {
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
  }
}

export const notificationService = new NotificationService();
