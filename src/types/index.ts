export enum Role {
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  ADMIN = "ADMIN",
  CASINO_USER = "CASINO_USER",
  FNB_USER = "FNB_USER",
}

export enum CabanaStatus {
  AVAILABLE = "AVAILABLE",
  RESERVED = "RESERVED",
  OCCUPIED = "OCCUPIED",
  CLOSED = "CLOSED",
}

export enum ReservationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  CHECKED_IN = "CHECKED_IN",
  CHECKED_OUT = "CHECKED_OUT",
  MODIFICATION_PENDING = "MODIFICATION_PENDING",
  EXTRA_PENDING = "EXTRA_PENDING",
}

export enum RequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum NotificationType {
  NEW_REQUEST = "NEW_REQUEST",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  MODIFICATION_REQUEST = "MODIFICATION_REQUEST",
  CANCELLATION_REQUEST = "CANCELLATION_REQUEST",
  EXTRA_CONCEPT_REQUEST = "EXTRA_CONCEPT_REQUEST",
  EXTRA_ADDED = "EXTRA_ADDED",
  STATUS_CHANGED = "STATUS_CHANGED",
  CHECK_IN = "CHECK_IN",
  CHECK_OUT = "CHECK_OUT",
  FNB_ORDER = "FNB_ORDER",
}

export enum VipLevel {
  STANDARD = "STANDARD",
  SILVER = "SILVER",
  GOLD = "GOLD",
  PLATINUM = "PLATINUM",
}

export enum RecurringPattern {
  WEEKLY = "WEEKLY",
  BIWEEKLY = "BIWEEKLY",
  MONTHLY = "MONTHLY",
}

export enum FnbOrderStatus {
  PREPARING = "PREPARING",
  READY = "READY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export enum ReportType {
  OCCUPANCY = "OCCUPANCY",
  REVENUE = "REVENUE",
  PERFORMANCE = "PERFORMANCE",
  FNB = "FNB",
  GUEST = "GUEST",
  COST_ANALYSIS = "COST_ANALYSIS",
  REQUEST_STATS = "REQUEST_STATS",
}

export enum ReportGroupBy {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export interface PriceBreakdown {
  days: number;
  cabanaDaily: number;
  conceptTotal: number;
  extrasTotal: number;
  extraRequestsTotal?: number;
  grandTotal: number;
  priceSource: "GENERAL";
  items: PriceLineItem[];
}

export interface PriceLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  source: "GENERAL";
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}

export interface CabanaWithStatus {
  id: string;
  name: string;
  coordX: number;
  coordY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  color?: string | null;
  isLocked: boolean;
  status: CabanaStatus;
  isOpenForReservation: boolean;
  classId: string;
  conceptId?: string | null;
  cabanaClass?: {
    id: string;
    name: string;
  };
  concept?: {
    id: string;
    name: string;
  } | null;
}

export interface ReservationEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  resourceId: string;
  status: ReservationStatus;
  guestName: string;
  color?: string;
}

export interface CabanaResource {
  id: string;
  title: string;
  classId: string;
}

export interface CalendarComponentProps {
  events: ReservationEvent[];
  resources: CabanaResource[];
  onDateClick?: (date: string, resourceId: string) => void;
  onEventClick?: (event: ReservationEvent) => void;
  onContextMenu?: (
    event: ReservationEvent,
    action: "modify" | "cancel" | "extra-concept",
  ) => void;
  classFilter?: string;
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  classId?: string;
  conceptId?: string;
  status?: ReservationStatus;
}

export const MODULE_ACCESS: Record<Role, string[]> = {
  [Role.SYSTEM_ADMIN]: ["/system-admin", "/reports"],
  [Role.ADMIN]: ["/admin"],
  [Role.CASINO_USER]: ["/casino", "/reports"],
  [Role.FNB_USER]: [
    "/fnb",
    "/casino/map",
    "/casino/calendar",
    "/casino/view",
    "/casino/reservations",
    "/casino/waitlist",
    "/casino/recurring",
  ],
};
