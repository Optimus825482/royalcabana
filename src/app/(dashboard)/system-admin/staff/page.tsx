"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  UserX,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Users,
  MapPin,
  Trash2,
  Settings2,
} from "lucide-react";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  selectCls,
  cancelBtnCls,
  submitBtnCls,
} from "@/components/shared/FormComponents";
import PermissionGate from "@/components/shared/PermissionGate";

// ── Types ──

interface CabanaOption {
  id: string;
  name: string;
}

interface ServicePointOption {
  id: string;
  name: string;
  type: string;
}

interface StaffAssignment {
  id: string;
  cabanaId: string;
  cabana?: { name: string };
  date: string;
  shift: string | null;
}

interface ServicePointAssignment {
  id: string;
  servicePointId: string;
  servicePoint?: { name: string; type: string };
  role: string;
  date: string;
  shift: string | null;
}

interface StaffRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  position: string;
  isActive: boolean;
  assignments?: StaffAssignment[];
  servicePointAssignments?: ServicePointAssignment[];
}

interface StaffForm {
  name: string;
  position: string;
}

interface AssignmentForm {
  staffId: string;
  cabanaId: string;
}

const defaultStaffForm: StaffForm = {
  name: "",
  position: "",
};
const defaultAssignmentForm: AssignmentForm = {
  staffId: "",
  cabanaId: "",
};
const PAGE_SIZE = 20;

// ── API helpers ──

async function fetchCabanas(): Promise<CabanaOption[]> {
  const res = await fetch("/api/cabanas");
  if (!res.ok) throw new Error("Cabana listesi yüklenemedi.");
  const json = await res.json();
  const resolved = json.data ?? json;
  return Array.isArray(resolved) ? resolved : [];
}

async function fetchServicePoints(): Promise<ServicePointOption[]> {
  const res = await fetch("/api/service-points?lightweight=true");
  if (!res.ok) throw new Error("Hizmet noktaları yüklenemedi.");
  const data = await res.json();
  const resolved = data.data ?? data;
  const items = Array.isArray(resolved) ? resolved : (resolved.items ?? []);
  return items.map((sp: { id: string; name: string; type: string }) => ({
    id: sp.id,
    name: sp.name,
    type: sp.type,
  }));
}

async function fetchStaff(
  search: string,
  activeFilter: string,
): Promise<StaffRow[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (activeFilter !== "ALL") params.set("isActive", activeFilter);
  const url = `/api/staff${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Personel listesi yüklenemedi.");
  const data = await res.json();
  const resolved = data.data ?? data;
  if (Array.isArray(resolved)) return resolved;
  return resolved.items ?? resolved.staff ?? [];
}

function normalizeStaffRows(data: unknown): StaffRow[] {
  if (Array.isArray(data)) return data as StaffRow[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as StaffRow[];
    if (Array.isArray(obj.staff)) return obj.staff as StaffRow[];
  }
  return [];
}

async function fetchStaffDetail(id: string): Promise<StaffRow> {
  const res = await fetch(`/api/staff/${id}`);
  if (!res.ok) throw new Error("Personel detayı yüklenemedi.");
  const json = await res.json();
  return json.data ?? json;
}

async function createStaff(data: StaffForm): Promise<StaffRow> {
  const res = await fetch("/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Personel oluşturulamadı.");
  }
  const json = await res.json();
  return json.data ?? json;
}

async function updateStaff(
  id: string,
  data: Partial<StaffForm>,
): Promise<StaffRow> {
  const res = await fetch(`/api/staff/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Personel güncellenemedi.");
  }
  const json = await res.json();
  return json.data ?? json;
}

async function deactivateStaff(id: string): Promise<void> {
  const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Personel devre dışı bırakılamadı.");
  }
}

async function createAssignment(
  data: AssignmentForm,
): Promise<{ created: number; skipped: number; total: number }> {
  const today = new Date().toISOString().split("T")[0];
  const res = await fetch("/api/staff/assignments/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staffId: data.staffId,
      targetId: data.cabanaId,
      startDate: today,
      endDate: today,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Atama oluşturulamadı.");
  }
  const json = await res.json();
  return json.data;
}

// ── Component ──

export default function StaffPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<StaffForm>(defaultStaffForm);

  const [editStaff, setEditStaff] = useState<StaffRow | null>(null);
  const [editForm, setEditForm] = useState<StaffForm | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<StaffRow | null>(
    null,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showAssignment, setShowAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(
    defaultAssignmentForm,
  );

  const [showTaskDefManager, setShowTaskDefManager] = useState(false);
  const [newTaskDefTitle, setNewTaskDefTitle] = useState("");

  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const { data: cabanas = [] } = useQuery({
    queryKey: ["cabanas"],
    queryFn: fetchCabanas,
  });

  const { data: servicePoints = [] } = useQuery({
    queryKey: ["service-points"],
    queryFn: fetchServicePoints,
  });

  const { data: taskDefs = [] } = useQuery<
    {
      id: string;
      title: string;
      description: string | null;
      category: string | null;
    }[]
  >({
    queryKey: ["task-definitions"],
    queryFn: async () => {
      const res = await fetch("/api/task-definitions");
      if (!res.ok) return [];
      const data = await res.json();
      const resolved = data.data ?? data;
      if (Array.isArray(resolved)) return resolved;
      return resolved.items ?? [];
    },
  });

  const { data: allStaff = [], isLoading } = useQuery<unknown, Error, StaffRow[]>({
    queryKey: ["staff", debouncedSearch, activeFilter],
    queryFn: () => fetchStaff(debouncedSearch, activeFilter),
    select: normalizeStaffRows,
  });

  const { data: staffDetail } = useQuery({
    queryKey: ["staff-detail", expandedId],
    queryFn: () => fetchStaffDetail(expandedId!),
    enabled: !!expandedId,
  });

  const totalPages = Math.max(1, Math.ceil(allStaff.length / PAGE_SIZE));
  const staffList = allStaff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowCreate(false);
      setCreateForm(defaultStaffForm);
      showToast("success", "Personel başarıyla oluşturuldu.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffForm> }) =>
      updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setEditStaff(null);
      setEditForm(null);
      showToast("success", "Personel başarıyla güncellendi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setDeactivateTarget(null);
      showToast("success", "Personel devre dışı bırakıldı.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const assignmentMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-detail"] });
      setShowAssignment(false);
      setAssignmentForm(defaultAssignmentForm);
      showToast("success", "Atama başarıyla oluşturuldu.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const createTaskDefMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/task-definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Görev tanımı oluşturulamadı.");
      }
      const json = await res.json();
      return json.data ?? json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-definitions"] });
      setNewTaskDefTitle("");
      showToast("success", "Görev tanımı eklendi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const deleteTaskDefMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/task-definitions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Görev tanımı silinemedi.");
      }
      const json = await res.json();
      return json.data ?? json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-definitions"] });
      showToast("success", "Görev tanımı kaldırıldı.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  function openEdit(s: StaffRow) {
    setEditStaff(s);
    setEditForm({ name: s.name, position: s.position });
  }

  function openAssignment(staffId: string) {
    setAssignmentForm({ ...defaultAssignmentForm, staffId });
    setShowAssignment(true);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // ── Expanded Detail Section ──
  function StaffDetail({ staff }: { staff: StaffRow }) {
    return (
      <div className="bg-neutral-800/40 border-t border-neutral-800 px-4 py-4">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-neutral-300">
            Görev Noktası:
          </span>
          {(() => {
            const cabanaName = staff.assignments?.[0]?.cabana?.name;
            const sp = staff.servicePointAssignments?.[0];
            const spLabel = sp
              ? `${sp.servicePoint?.name ?? "—"} (${sp.servicePoint?.type ?? sp.role})`
              : null;
            const assigned = cabanaName || spLabel;
            return assigned ? (
              <span className="text-sm text-amber-400/90">{assigned}</span>
            ) : (
              <span className="text-xs text-neutral-500">Henüz atama yok</span>
            );
          })()}
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Personel Yönetimi
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Personel, atama ve görevleri yönetin
          </p>
        </div>
        <PermissionGate permission="staff.create">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 min-h-[44px] rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Personel
          </button>
        </PermissionGate>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 px-4 py-2.5 text-sm rounded-lg border ${
            toast.type === "success"
              ? "bg-green-950/50 border-green-700/40 text-green-400"
              : "bg-red-950/40 border-red-800/40 text-red-400"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad veya görev ile ara..."
            className={`${inputCls} pl-10`}
          />
        </div>
        <button
          onClick={() => {
            setActiveFilter((f) => (f === "true" ? "false" : "true"));
            setPage(1);
          }}
          className={`min-h-[44px] px-4 py-2 text-sm rounded-lg border transition-colors whitespace-nowrap ${
            activeFilter === "false"
              ? "bg-red-950/50 border-red-800/40 text-red-400"
              : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <UserX className="w-4 h-4 inline mr-1.5" />
          {activeFilter === "false" ? "Pasif Göster" : "Aktif Göster"}
        </button>
      </div>

      {/* Staff List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : staffList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Users className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm">Personel bulunamadı.</p>
          </div>
        ) : (
          staffList.map((s) => {
            const isExpanded = expandedId === s.id;
            const detail =
              isExpanded && staffDetail?.id === s.id ? staffDetail : null;

            return (
              <div
                key={s.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
              >
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-neutral-800/40 transition-colors"
                  onClick={() => toggleExpand(s.id)}
                >
                  {/* Expand toggle */}
                  <span className="shrink-0 p-1 text-neutral-500">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-neutral-100">
                        {s.name}
                      </p>
                      {!s.isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-950/60 text-red-400 border border-red-800/40">
                          Pasif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {s.position}
                      {(() => {
                        const cabanaName = s.assignments?.[0]?.cabana?.name;
                        const spName =
                          s.servicePointAssignments?.[0]?.servicePoint?.name;
                        const assignedTo = cabanaName || spName;
                        return assignedTo ? (
                          <span className="text-amber-400/80">
                            {" "}
                            · {assignedTo}
                          </span>
                        ) : null;
                      })()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PermissionGate permission="staff.update">
                      <button
                        onClick={() => openEdit(s)}
                        title="Düzenle"
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="staff.update">
                      <button
                        onClick={() => openAssignment(s.id)}
                        title="Görev Noktası Ata"
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-amber-950/50 hover:bg-amber-900/50 text-amber-400 border border-amber-800/30 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                    </PermissionGate>
                    {s.isActive && (
                      <PermissionGate permission="staff.delete">
                        <button
                          onClick={() => setDeactivateTarget(s)}
                          title="Devre dışı bırak"
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </PermissionGate>
                    )}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && detail && <StaffDetail staff={detail} />}
                {isExpanded && !detail && (
                  <div className="bg-neutral-800/40 border-t border-neutral-800 px-4 py-6 text-center text-neutral-500 text-sm">
                    Yükleniyor...
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-neutral-500">
            Toplam {allStaff.length} personel · Sayfa {page}/{totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {showCreate && (
        <Modal title="Yeni Personel" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(createForm);
            }}
            className="space-y-4"
          >
            <Field label="Ad Soyad">
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
                placeholder="Personel adı"
              />
            </Field>
            <Field label="Görev">
              <div className="flex gap-2">
                <select
                  required
                  value={createForm.position}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, position: e.target.value }))
                  }
                  className={`${selectCls} flex-1`}
                >
                  <option value="">Görev seçin</option>
                  {taskDefs.map((d) => (
                    <option key={d.id} value={d.title}>
                      {d.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowTaskDefManager(true)}
                  className="shrink-0 min-h-[44px] px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
                  title="Görevleri Yönet"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </Field>
            {createMutation.isError && (
              <ErrorMsg msg={(createMutation.error as Error).message} />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className={submitBtnCls}
              >
                {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Staff Modal */}
      {editStaff && editForm && (
        <Modal
          title="Personel Düzenle"
          onClose={() => {
            setEditStaff(null);
            setEditForm(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editStaff || !editForm) return;
              updateMutation.mutate({ id: editStaff.id, data: editForm });
            }}
            className="space-y-4"
          >
            <Field label="Ad Soyad">
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, name: e.target.value } : f))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Görev">
              <div className="flex gap-2">
                <select
                  required
                  value={editForm.position}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, position: e.target.value } : f,
                    )
                  }
                  className={`${selectCls} flex-1`}
                >
                  <option value="">Görev seçin</option>
                  {taskDefs.map((d) => (
                    <option key={d.id} value={d.title}>
                      {d.title}
                    </option>
                  ))}
                  {/* Mevcut pozisyon listede yoksa göster */}
                  {editForm.position &&
                    !taskDefs.some((d) => d.title === editForm.position) && (
                      <option value={editForm.position}>
                        {editForm.position}
                      </option>
                    )}
                </select>
                <button
                  type="button"
                  onClick={() => setShowTaskDefManager(true)}
                  className="shrink-0 min-h-[44px] px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
                  title="Görevleri Yönet"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </Field>
            {updateMutation.isError && (
              <ErrorMsg msg={(updateMutation.error as Error).message} />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditStaff(null);
                  setEditForm(null);
                }}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className={submitBtnCls}
              >
                {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Deactivate Confirm */}
      {deactivateTarget && (
        <Modal
          title="Personeli Devre Dışı Bırak"
          onClose={() => setDeactivateTarget(null)}
        >
          <p className="text-neutral-300 text-sm mb-6">
            <span className="text-yellow-400 font-medium">
              {deactivateTarget.name}
            </span>{" "}
            adlı personeli devre dışı bırakmak istediğinizden emin misiniz?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeactivateTarget(null)}
              className={cancelBtnCls}
            >
              İptal
            </button>
            <button
              onClick={() => deactivateMutation.mutate(deactivateTarget.id)}
              disabled={deactivateMutation.isPending}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white transition-colors"
            >
              {deactivateMutation.isPending
                ? "İşleniyor..."
                : "Devre Dışı Bırak"}
            </button>
          </div>
        </Modal>
      )}

      {/* Assignment Modal */}
      {showAssignment && (
        <Modal
          title="Görev Noktası Ataması"
          onClose={() => setShowAssignment(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              assignmentMutation.mutate(assignmentForm);
            }}
            className="space-y-4"
          >
            <Field label="Görev Noktası">
              <select
                required
                value={assignmentForm.cabanaId}
                onChange={(e) =>
                  setAssignmentForm((f) => ({ ...f, cabanaId: e.target.value }))
                }
                className={selectCls}
                size={5}
              >
                <option value="">Görev noktası seçin</option>
                <optgroup label="Hizmet Noktaları">
                  {servicePoints.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} ({sp.type})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Cabanalar">
                  {cabanas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </Field>
            {assignmentMutation.isError && (
              <ErrorMsg msg={(assignmentMutation.error as Error).message} />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAssignment(false)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={assignmentMutation.isPending}
                className={submitBtnCls}
              >
                {assignmentMutation.isPending ? "Atanıyor..." : "Ata"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Task Definition Manager Modal */}
      {showTaskDefManager && (
        <Modal
          title="Görev Tanımları Yönetimi"
          onClose={() => setShowTaskDefManager(false)}
        >
          <div className="space-y-4">
            {/* Add new task definition */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newTaskDefTitle.trim()) {
                  createTaskDefMutation.mutate(newTaskDefTitle.trim());
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newTaskDefTitle}
                onChange={(e) => setNewTaskDefTitle(e.target.value)}
                className={`${inputCls} flex-1`}
                placeholder="Yeni görev adı..."
              />
              <button
                type="submit"
                disabled={
                  createTaskDefMutation.isPending || !newTaskDefTitle.trim()
                }
                className="shrink-0 min-h-[44px] px-4 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-neutral-950 font-semibold text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Existing task definitions list */}
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {taskDefs.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">
                  Henüz görev tanımı yok.
                </p>
              ) : (
                taskDefs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between bg-neutral-900/60 rounded-lg px-3 py-2.5 border border-neutral-800/60"
                  >
                    <span className="text-sm text-neutral-200">{d.title}</span>
                    <button
                      onClick={() => deleteTaskDefMutation.mutate(d.id)}
                      disabled={deleteTaskDefMutation.isPending}
                      className="shrink-0 p-1.5 rounded-md text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowTaskDefManager(false)}
                className={cancelBtnCls}
              >
                Kapat
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
