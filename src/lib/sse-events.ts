export const SSE_EVENTS = {
  RESERVATION_CREATED: "reservation:created",
  RESERVATION_APPROVED: "reservation:approved",
  RESERVATION_REJECTED: "reservation:rejected",
  RESERVATION_CANCELLED: "reservation:cancelled",
  RESERVATION_CHECKED_IN: "reservation:checked-in",
  RESERVATION_CHECKED_OUT: "reservation:checked-out",
  NOTIFICATION_NEW: "notification:new",
  CABANA_STATUS_CHANGED: "cabana:status-changed",
  CALENDAR_UPDATE: "calendar:update",
  FNB_ORDER_CREATED: "fnb:order-created",
  FNB_ORDER_UPDATED: "fnb:order-updated",
} as const;

export type SSEEventType = (typeof SSE_EVENTS)[keyof typeof SSE_EVENTS];
