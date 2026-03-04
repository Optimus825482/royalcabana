import type { CabanaWithStatus } from "@/types";

// ─── API Response Unwrap Utilities ───────────────────────────────────────────

/**
 * Unwrap `{ success, data }` envelope from API responses.
 * Returns `data` if present, otherwise the raw value.
 */
export function unwrapResponse<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in json) {
    return (json as Record<string, unknown>).data as T;
  }
  return json as T;
}

/**
 * Unwrap API response and ensure result is an array.
 * Handles: `{ success, data: [...] }`, `{ success, data: { items, total } }`, plain arrays.
 */
export function unwrapArray<T>(json: unknown): T[] {
  const resolved = unwrapResponse<unknown>(json);
  if (Array.isArray(resolved)) return resolved;
  if (resolved && typeof resolved === "object") {
    const obj = resolved as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.rows)) return obj.rows;
  }
  return [];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReservationListResponse {
  reservations: Array<{
    id: string;
    cabanaId: string;
    guestName: string;
    startDate: string;
    endDate: string;
    status: string;
    notes?: string;
    totalPrice?: number;
    conceptId?: string | null;
    concept?: { id: string; name: string } | null;
    cabana: {
      id: string;
      name: string;
      cabanaClass?: { id: string; name: string } | null;
    };
    user?: { id: string; username: string };
    statusHistory: Array<{
      toStatus: string;
      changedBy: string;
      createdAt: string;
      reason?: string;
    }>;
    [key: string]: unknown;
  }>;
  total: number;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchReservations(): Promise<ReservationListResponse> {
  const res = await fetch("/api/reservations");
  if (!res.ok) throw new Error("Rezervasyonlar yüklenemedi.");
  const json = await res.json();
  return unwrapResponse<ReservationListResponse>(json);
}

export async function fetchCabanas(): Promise<CabanaWithStatus[]> {
  const res = await fetch("/api/cabanas");
  if (!res.ok) throw new Error("Cabanalar yüklenemedi.");
  const json = await res.json();
  const resolved = json.data ?? json;
  return Array.isArray(resolved) ? resolved : [];
}

export async function fetchSystemConfig(): Promise<{
  system_open_for_reservation: boolean;
}> {
  const res = await fetch("/api/system/config");
  if (!res.ok) {
    console.warn("System config fetch failed, defaulting to open");
    return { system_open_for_reservation: true };
  }

  const raw = await res.json();
  const data = unwrapResponse<unknown>(raw);

  if (Array.isArray(data)) {
    const entry = data.find(
      (d: unknown) =>
        !!d &&
        typeof d === "object" &&
        (d as { key?: string }).key === "system_open_for_reservation",
    ) as { value?: string | boolean } | undefined;

    return {
      system_open_for_reservation:
        entry?.value === true || entry?.value === "true",
    };
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    if (typeof obj.isOpen !== "undefined") {
      return {
        system_open_for_reservation:
          obj.isOpen === true || obj.isOpen === "true",
      };
    }

    return {
      system_open_for_reservation:
        obj.system_open_for_reservation === true ||
        obj.system_open_for_reservation === "true",
    };
  }

  return { system_open_for_reservation: true };
}
