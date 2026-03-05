"use client";

import AdminRequestsPage from "@/app/(dashboard)/admin/requests/page";

/**
 * System admin uses the same Talep Yönetimi (requests) view as admin.
 * API /api/reservations allows both ADMIN and SYSTEM_ADMIN.
 */
export default function SystemAdminRequestsPage() {
  return <AdminRequestsPage />;
}
