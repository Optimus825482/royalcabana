"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
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

interface TaskDefinition {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  isActive: boolean;
  createdAt: string;
}

interface TaskDefForm {
  title: string;
  description: string;
  category: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
}

const PRIORITY_OPTIONS: { value: TaskDefForm["priority"]; label: string }[] = [
  { value: "LOW", label: "Düşük" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "Yüksek" },
  { value: "URGENT", label: "Acil" },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-blue-950/60 text-blue-400 border-blue-800/40",
  NORMAL: "bg-neutral-800 text-neutral-300 border-neutral-700",
  HIGH: "bg-orange-950/60 text-orange-400 border-orange-800/40",
  URGENT: "bg-red-950/60 text-red-400 border-red-800/40",
};

const CATEGORY_SUGGESTIONS = [
  "Temizlik",
  "Servis",
  "Bakım",
  "Güvenlik",
  "Genel",
];

const defaultForm: TaskDefForm = {
  title: "",
  description: "",
  category: "",
  priority: "NORMAL",
};

const PAGE_SIZE = 20;

// ── API helpers ──

async function fetchTaskDefs(): Promise<TaskDefinition[]> {
  const res = await fetch("/api/task-definitions");
  if (!res.ok) throw new Error("Görev tanımları yüklenemedi.");
  const data = await res.json();
  return data.items ?? data;
}

async function createTaskDef(data: TaskDefForm): Promise<TaskDefinition> {
  const res = await fetch("/api/task-definitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Görev tanımı oluşturulamadı.");
  }
  return res.json();
}

async function updateTaskDef(
  id: string,
  data: Partial<TaskDefForm>,
): Promise<TaskDefinition> {
  const res = await fetch(`/api/task-definitions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Görev tanımı güncellenemedi.");
  }
  return res.json();
}

async function deleteTaskDef(id: string): Promise<void> {
  const res = await fetch(`/api/task-definitions/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Görev tanımı silinemedi.");
  }
}

// ── Component ──

export default function TaskDefinitionsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<TaskDefForm>(defaultForm);

  const [editTarget, setEditTarget] = useState<TaskDefinition | null>(null);
  const [editForm, setEditForm] = useState<TaskDefForm | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<TaskDefinition | null>(null);

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

  const { data: allDefs = [], isLoading } = useQuery({
    queryKey: ["task-definitions"],
    queryFn: fetchTaskDefs,
  });

  // Client-side filtering
  const filtered = allDefs.filter((d) => {
    const matchesSearch =
      !debouncedSearch ||
      d.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (d.description ?? "")
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
    const matchesCategory = !categoryFilter || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Unique categories from data
  const categories = [
    ...new Set(allDefs.map((d) => d.category).filter(Boolean)),
  ] as string[];

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: createTaskDef,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-definitions"] });
      setShowCreate(false);
      setCreateForm(defaultForm);
      showToast("success", "Görev tanımı başarıyla oluşturuldu.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskDefForm> }) =>
      updateTaskDef(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-definitions"] });
      setEditTarget(null);
      setEditForm(null);
      showToast("success", "Görev tanımı başarıyla güncellendi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTaskDef,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-definitions"] });
      setDeleteTarget(null);
      showToast("success", "Görev tanımı devre dışı bırakıldı.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  function openEdit(def: TaskDefinition) {
    setEditTarget(def);
    setEditForm({
      title: def.title,
      description: def.description ?? "",
      category: def.category ?? "",
      priority: def.priority,
    });
  }

  function priorityLabel(p: string) {
    return PRIORITY_OPTIONS.find((o) => o.value === p)?.label ?? p;
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Görev Tanımları
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Personele atanabilecek görev şablonlarını yönetin
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 min-h-[44px] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Görev Tanımı
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
            placeholder="Başlık veya açıklama ile ara..."
            className={`${inputCls} pl-10`}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className={`${selectCls} pl-10 min-w-[180px]`}
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task Definition List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <ClipboardList className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm">
              {debouncedSearch || categoryFilter
                ? "Filtreye uygun görev tanımı bulunamadı."
                : "Henüz görev tanımı yok."}
            </p>
          </div>
        ) : (
          pageItems.map((def) => (
            <div
              key={def.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-start gap-4"
            >
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-medium text-neutral-100">
                    {def.title}
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[def.priority]}`}
                  >
                    {priorityLabel(def.priority)}
                  </span>
                  {def.category && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-950/60 text-green-400 border border-green-800/40">
                      {def.category}
                    </span>
                  )}
                  {!def.isActive && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-950/60 text-red-400 border border-red-800/40">
                      Pasif
                    </span>
                  )}
                </div>
                {def.description && (
                  <p className="text-xs text-neutral-500 line-clamp-2">
                    {def.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => openEdit(def)}
                  title="Düzenle"
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {def.isActive && (
                  <button
                    onClick={() => setDeleteTarget(def)}
                    title="Devre dışı bırak"
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-neutral-500">
            Toplam {filtered.length} tanım · Sayfa {page}/{totalPages}
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

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Yeni Görev Tanımı" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(createForm);
            }}
            className="space-y-4"
          >
            <Field label="Başlık">
              <input
                type="text"
                required
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, title: e.target.value }))
                }
                className={inputCls}
                placeholder="Görev tanımı başlığı"
              />
            </Field>
            <Field label="Açıklama">
              <textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
                className={`${inputCls} min-h-[80px] resize-y`}
                rows={3}
                placeholder="Opsiyonel açıklama..."
              />
            </Field>
            <Field label="Kategori">
              <input
                type="text"
                list="category-suggestions"
                value={createForm.category}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, category: e.target.value }))
                }
                className={inputCls}
                placeholder="Kategori seçin veya yazın"
              />
              <datalist id="category-suggestions">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Öncelik">
              <select
                value={createForm.priority}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    priority: e.target.value as TaskDefForm["priority"],
                  }))
                }
                className={selectCls}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
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

      {/* Edit Modal */}
      {editTarget && editForm && (
        <Modal
          title="Görev Tanımı Düzenle"
          onClose={() => {
            setEditTarget(null);
            setEditForm(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editTarget || !editForm) return;
              updateMutation.mutate({ id: editTarget.id, data: editForm });
            }}
            className="space-y-4"
          >
            <Field label="Başlık">
              <input
                type="text"
                required
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, title: e.target.value } : f))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Açıklama">
              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, description: e.target.value } : f,
                  )
                }
                className={`${inputCls} min-h-[80px] resize-y`}
                rows={3}
              />
            </Field>
            <Field label="Kategori">
              <input
                type="text"
                list="category-suggestions-edit"
                value={editForm.category}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, category: e.target.value } : f,
                  )
                }
                className={inputCls}
                placeholder="Kategori seçin veya yazın"
              />
              <datalist id="category-suggestions-edit">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Öncelik">
              <select
                value={editForm.priority}
                onChange={(e) =>
                  setEditForm((f) =>
                    f
                      ? {
                          ...f,
                          priority: e.target.value as TaskDefForm["priority"],
                        }
                      : f,
                  )
                }
                className={selectCls}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            {updateMutation.isError && (
              <ErrorMsg msg={(updateMutation.error as Error).message} />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditTarget(null);
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

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal
          title="Görev Tanımını Devre Dışı Bırak"
          onClose={() => setDeleteTarget(null)}
        >
          <p className="text-neutral-300 text-sm mb-6">
            <span className="text-yellow-400 font-medium">
              {deleteTarget.title}
            </span>{" "}
            görev tanımını devre dışı bırakmak istediğinizden emin misiniz?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className={cancelBtnCls}
            >
              İptal
            </button>
            <button
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white transition-colors"
            >
              {deleteMutation.isPending ? "İşleniyor..." : "Devre Dışı Bırak"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
