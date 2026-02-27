import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "LOGIN"
  | "LOGOUT"
  | "PROFILE_UPDATE"
  | "CONFIG_CHANGE"
  | "PRICE_UPDATE"
  | "CANCEL_REQUEST"
  | "MODIFY_REQUEST"
  | "EXTRA_REQUEST"
  | "EXTRA_ADD"
  | "CHECK_IN"
  | "CHECK_OUT";

export type AuditEntity =
  | "User"
  | "Cabana"
  | "CabanaClass"
  | "Concept"
  | "Product"
  | "ProductGroup"
  | "Reservation"
  | "CabanaPrice"
  | "ConceptPrice"
  | "SystemConfig"
  | "Profile"
  | "ExtraItem"
  | "Session"
  | "Guest"
  | "FnbOrder"
  | "BlackoutDate"
  | "WaitlistEntry"
  | "RecurringBooking"
  | "Staff"
  | "StaffAssignment"
  | "StaffTask"
  | "TaskDefinition";

interface AuditParams {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

/**
 * Non-blocking audit log — after() ile response sonrası çalışır (Rule 3.7)
 * Hata durumunda sessizce loglar, kullanıcı akışını bozmaz.
 */
export function logAudit(params: AuditParams): void {
  after(async () => {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          oldValue: params.oldValue
            ? (params.oldValue as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          newValue: params.newValue
            ? (params.newValue as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
    } catch (err) {
      console.error("[AuditLog] Failed to write:", err);
    }
  });
}
