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
  ClipboardList,
  MapPin,
  CheckCircle2,
  Circle,
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

// ── Types ──

interface CabanaOption {
  id: string;
  name: string;
}

interface StaffAssignment {
  id: string;
  cabanaId: string;
  cabana?: { name: string };
  date: string;
  shift: string | null;
}

interface StaffTask {
  id: string;
  title: string;
  description: string | null;
  date: string;
  isCompleted: boolean;
  completedAt: string | null;
}

interface StaffRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  position: string;
  isActive: boolean;
  assignments?: StaffAssignment[];
  tasks?: StaffTask[];
}

interface StaffForm {
  name: string;
  phone: string;
  email: string;
  position: string;
}

interface AssignmentForm {
  staffId: string;
  cabanaId: string;
  date: string;
  shift: string;
}

interface TaskForm {
  staffId: string;
  taskDefinitionId: string;
  title: string;
  description: string;
  date: string;
}

const SHIFT_OPTIONS = [
  { value: "MORNING", label: "Sabah" },
  { value: "AFTERNOON", label: "Öğleden Sonra" },
  { value: "FULL_DAY", label: "Tam Gün" },
];

const defaultStaffForm: StaffForm = {
  name: "",
  phone: "",
  email: "",
  position: "",
};
const defaultAssignmentForm: AssignmentForm = {
  staffId: "",
  cabanaId: "",
  date: "",
  shift: "FULL_DAY",
};
const defaultTaskForm: TaskForm = {
  staffId: "",
  taskDefinitionId: "",
  title: "",
  description: "",
  date: "",
};

const PAGE_SIZE = 20;

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));

// ── API helpers ──

async function fetchCabanas(): Promise<CabanaOption[]> {
  const res = await fetch("/api/cabanas");
  if (!res.ok) throw new Error("Kabana listesi yüklenemedi.");
  const data = await res.json();
  return data.cabanas ?? data;
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
  return data.items ?? data.staff ?? data;
}

async function fetchStaffDetail(id: string): Promise<StaffRow> {
  const res = await fetch(`/api/staff/${id}`);
  if (!res.ok) throw new Error("Personel detayı yüklenemedi.");
  return res.json();
}

async function createStaff(data: StaffForm): Promise<StaffRow> {
  const res = await fetch("/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Personel oluşturulamadı.");
  }
  return res.json();
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
    throw new Error(err.message || "Personel güncellenemedi.");
  }
  return res.json();
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
): Promise<StaffAssignment> {
  const res = await fetch("/api/staff/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Atama oluşturulamadı.");
  }
  return res.json();
}

async function createTask(data: TaskForm): Promise<StaffTask> {
  const res = await fetch("/api/staff/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      taskDefinitionId: data.taskDefinitionId || undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Görev oluşturulamadı.");
  }
  return res.json();
}

async function toggleTaskCompletion(
  id: string,
  isCompleted: boolean,
): Promise<StaffTask> {
  const res = await fetch(`/api/staff/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isCompleted }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Görev durumu güncellenemedi.");
  }
  return res.json();
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

  const [showTask, setShowTask] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskForm>(defaultTaskForm);

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
      return data.items ?? data;
    },
  });

  const { data: allStaff = [], isLoading } = useQuery({
    queryKey: ["staff", debouncedSearch, activeFilter],
    queryFn: () => fetchStaff(debouncedSearch, activeFilter),
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
      queryClient.invalidateQueries({ queryKey: ["staff-detail"] });
      setShowAssignment(false);
      setAssignmentForm(defaultAssignmentForm);
      showToast("success", "Atama başarıyla oluşturuldu.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const taskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-detail"] });
      setShowTask(false);
      setTaskForm(defaultTaskForm);
      showToast("success", "Görev başarıyla oluşturuldu.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      toggleTaskCompletion(id, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-detail"] });
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  function openEdit(s: StaffRow) {
    setEditStaff(s);
    setEditForm({
      name: s.name,
      phone: s.phone ?? "",
      email: s.email ?? "",
      position: s.position,
    });
  }

  function openAssignment(staffId: string) {
    setAssignmentForm({ ...defaultAssignmentForm, staffId });
    setShowAssignment(true);
  }

  function openTask(staffId: string) {
    setTaskForm({ ...defaultTaskForm, staffId });
    setShowTask(true);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // ── Expanded Detail Section ──
  function StaffDetail({ staff }: { staff: StaffRow }) {
    const assignments = staff.assignments ?? [];
    const tasks = staff.tasks ?? [];

    return (
      <div className="bg-neutral-800/40 border-t border-neutral-800 px-4 py-4 space-y-4">
        {/* Assignments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> Atamalar
            </h4>
            <button
              onClick={() => openAssignment(staff.id)}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              + Atama Ekle
            </button>
          </div>
          {assignments.length === 0 ? (
            <p className="text-xs text-neutral-500">Henüz atama yok.</p>
          ) : (
            <div className="space-y-1.5">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-xs bg-neutral-900/60 rounded-lg px-3 py-2 border border-neutral-800/60"
                >
                  <span className="text-neutral-200">
                    {a.cabana?.name ?? "—"}
                  </span>
                  <span className="text-neutral-400">{formatDate(a.date)}</span>
                  <span className="text-neutral-500">
                    {SHIFT_OPTIONS.find((s) => s.value === a.shift)?.label ??
                      a.shift ??
                      "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-amber-400" /> Görevler
            </h4>
            <button
              onClick={() => openTask(staff.id)}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              + Görev Ekle
            </button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-xs text-neutral-500">Henüz görev yok.</p>
          ) : (
            <div className="space-y-1.5">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 text-xs bg-neutral-900/60 rounded-lg px-3 py-2 border border-neutral-800/60"
                >
                  <button
                    onClick={() =>
                      toggleTaskMutation.mutate({
                        id: t.id,
                        isCompleted: !t.isCompleted,
                      })
                    }
                    className="shrink-0"
                    title={
                      t.isCompleted
                        ? "Tamamlanmadı olarak işaretle"
                        : "Tamamlandı olarak işaretle"
                    }
                  >
                    {t.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-neutral-500 hover:text-neutral-300 transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-neutral-200 ${t.isCompleted ? "line-through text-neutral-500" : ""}`}
                    >
                      {t.title}
                    </p>
                    {t.description && (
                      <p className="text-neutral-500 mt-0.5">{t.description}</p>
                    )}
                  </div>
                  <span className="text-neutral-500 shrink-0">
                    {formatDate(t.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
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
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 min-h-[44px] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Personel
        </button>
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
            placeholder="Ad veya pozisyon ile ara..."
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
                <div className="flex items-center gap-3 p-4">
                  {/* Expand toggle */}
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className="shrink-0 p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
                    title="Detayları göster"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

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
                      {s.position} · {s.phone || "Telefon yok"} ·{" "}
                      {s.email || "E-posta yok"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openEdit(s)}
                      title="Düzenle"
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {s.isActive && (
                      <button
                        onClick={() => setDeactivateTarget(s)}
                        title="Devre dışı bırak"
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
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
            <Field label="Telefon">
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, phone: e.target.value }))
                }
                className={inputCls}
                placeholder="+90 5XX XXX XX XX"
              />
            </Field>
            <Field label="E-posta">
              <input
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                className={inputCls}
                placeholder="ornek@email.com"
              />
            </Field>
            <Field label="Pozisyon">
              <input
                type="text"
                required
                value={createForm.position}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, position: e.target.value }))
                }
                className={inputCls}
                placeholder="Garson, Temizlik, vb."
              />
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
            <Field label="Telefon">
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, phone: e.target.value } : f))
                }
                className={inputCls}
              />
            </Field>
            <Field label="E-posta">
              <input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, email: e.target.value } : f))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Pozisyon">
              <input
                type="text"
                required
                value={editForm.position}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, position: e.target.value } : f,
                  )
                }
                className={inputCls}
              />
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
        <Modal title="Kabana Ataması" onClose={() => setShowAssignment(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              assignmentMutation.mutate(assignmentForm);
            }}
            className="space-y-4"
          >
            <Field label="Kabana">
              <select
                required
                value={assignmentForm.cabanaId}
                onChange={(e) =>
                  setAssignmentForm((f) => ({ ...f, cabanaId: e.target.value }))
                }
                className={selectCls}
              >
                <option value="">Kabana seçin</option>
                {cabanas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tarih">
              <input
                type="date"
                required
                value={assignmentForm.date}
                onChange={(e) =>
                  setAssignmentForm((f) => ({ ...f, date: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Vardiya">
              <select
                value={assignmentForm.shift}
                onChange={(e) =>
                  setAssignmentForm((f) => ({ ...f, shift: e.target.value }))
                }
                className={selectCls}
              >
                {SHIFT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
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

      {/* Task Modal */}
      {showTask && (
        <Modal title="Yeni Görev" onClose={() => setShowTask(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              taskMutation.mutate(taskForm);
            }}
            className="space-y-4"
          >
            <Field label="Görev Tanımından Seç (Opsiyonel)">
              <select
                value={taskForm.taskDefinitionId}
                onChange={(e) => {
                  const defId = e.target.value;
                  const def = taskDefs.find((d) => d.id === defId);
                  setTaskForm((f) => ({
                    ...f,
                    taskDefinitionId: defId,
                    title: def?.title ?? f.title,
                    description: def?.description ?? f.description,
                  }));
                }}
                className={selectCls}
              >
                <option value="">Manuel giriş</option>
                {taskDefs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} {d.category ? `(${d.category})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Görev Başlığı">
              <input
                type="text"
                required
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, title: e.target.value }))
                }
                className={inputCls}
                placeholder="Görev başlığı"
              />
            </Field>
            <Field label="Açıklama">
              <textarea
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, description: e.target.value }))
                }
                className={`${inputCls} min-h-[80px] resize-y`}
                rows={3}
                placeholder="Opsiyonel açıklama..."
              />
            </Field>
            <Field label="Tarih">
              <input
                type="date"
                required
                value={taskForm.date}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, date: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            {taskMutation.isError && (
              <ErrorMsg msg={(taskMutation.error as Error).message} />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTask(false)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={taskMutation.isPending}
                className={submitBtnCls}
              >
                {taskMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
