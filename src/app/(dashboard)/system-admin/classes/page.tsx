"use client";

import { useState, useEffect, useCallback } from "react";

interface ClassAttribute {
  id: string;
  key: string;
  value: string;
}

interface CabanaClass {
  id: string;
  name: string;
  description: string;
  attributes: ClassAttribute[];
  _count: { cabanas: number };
}

const defaultCreateForm = { name: "", description: "" };

export default function ClassesPage() {
  const [classes, setClasses] = useState<CabanaClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Expanded rows for attribute management
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit modal
  const [editClass, setEditClass] = useState<CabanaClass | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm
  const [deleteClass, setDeleteClass] = useState<CabanaClass | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Add attribute
  const [attrForms, setAttrForms] = useState<
    Record<string, { key: string; value: string }>
  >({});
  const [attrLoading, setAttrLoading] = useState<Record<string, boolean>>({});
  const [attrError, setAttrError] = useState<Record<string, string>>({});

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/classes");
      if (!res.ok) throw new Error("Sınıflar yüklenemedi.");
      const data = await res.json();
      setClasses(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  // --- Create ---
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Sınıf oluşturulamadı.");
      }
      setShowCreate(false);
      setCreateForm(defaultCreateForm);
      showSuccess("Sınıf başarıyla oluşturuldu.");
      fetchClasses();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setCreateLoading(false);
    }
  }

  // --- Edit ---
  function openEdit(cls: CabanaClass) {
    setEditClass(cls);
    setEditForm({ name: cls.name, description: cls.description });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editClass) return;
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/classes/${editClass.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Sınıf güncellenemedi.");
      }
      setEditClass(null);
      showSuccess("Sınıf başarıyla güncellendi.");
      fetchClasses();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setEditLoading(false);
    }
  }

  // --- Delete ---
  async function handleDelete() {
    if (!deleteClass) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/classes/${deleteClass.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Sınıf silinemedi.");
      }
      setDeleteClass(null);
      showSuccess("Sınıf silindi.");
      fetchClasses();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setDeleteLoading(false);
    }
  }

  // --- Add Attribute ---
  async function handleAddAttr(classId: string) {
    const form = attrForms[classId];
    if (!form?.key || !form?.value) return;
    setAttrLoading((p) => ({ ...p, [classId]: true }));
    setAttrError((p) => ({ ...p, [classId]: "" }));
    try {
      const res = await fetch(`/api/classes/${classId}/attributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: form.key, value: form.value }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Özellik eklenemedi.");
      }
      setAttrForms((p) => ({ ...p, [classId]: { key: "", value: "" } }));
      fetchClasses();
    } catch (e: unknown) {
      setAttrError((p) => ({
        ...p,
        [classId]: e instanceof Error ? e.message : "Bir hata oluştu.",
      }));
    } finally {
      setAttrLoading((p) => ({ ...p, [classId]: false }));
    }
  }

  // --- Delete Attribute ---
  async function handleDeleteAttr(classId: string, attrId: string) {
    try {
      const res = await fetch(`/api/classes/${classId}/attributes/${attrId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Özellik silinemedi.");
      }
      fetchClasses();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Kabana Sınıfları
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Kabana sınıflarını ve özelliklerini yönetin
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setCreateError("");
            setCreateForm(defaultCreateForm);
          }}
          className="bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Yeni Sınıf
        </button>
      </div>

      {/* Toast messages */}
      {success && (
        <div className="mb-4 px-4 py-2.5 bg-green-950/50 border border-green-700/40 text-green-400 text-sm rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-2.5 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Classes list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Yükleniyor...
        </div>
      ) : classes.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Henüz sınıf yok.
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
            >
              {/* Class row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-100 truncate">
                      {cls.name}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">
                      {cls.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                      {cls._count.cabanas} kabana
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                      {cls.attributes.length} özellik
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === cls.id ? null : cls.id)
                    }
                    className="text-xs px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors"
                  >
                    {expandedId === cls.id ? "Kapat" : "Özellikler"}
                  </button>
                  <button
                    onClick={() => openEdit(cls)}
                    className="text-xs px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => {
                      setDeleteClass(cls);
                      setDeleteError("");
                    }}
                    className="text-xs px-3 py-1.5 rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                  >
                    Sil
                  </button>
                </div>
              </div>

              {/* Attributes panel */}
              {expandedId === cls.id && (
                <div className="border-t border-neutral-800 px-5 py-4 bg-neutral-950/40">
                  <p className="text-xs font-medium text-neutral-400 mb-3">
                    Özellikler
                  </p>

                  {cls.attributes.length === 0 ? (
                    <p className="text-xs text-neutral-600 mb-3">
                      Henüz özellik yok.
                    </p>
                  ) : (
                    <div className="space-y-1.5 mb-4">
                      {cls.attributes.map((attr) => (
                        <div
                          key={attr.id}
                          className="flex items-center justify-between bg-neutral-800/60 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-yellow-400 font-medium">
                              {attr.key}
                            </span>
                            <span className="text-neutral-600">:</span>
                            <span className="text-neutral-300">
                              {attr.value}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteAttr(cls.id, attr.id)}
                            className="text-xs text-red-500 hover:text-red-400 transition-colors ml-4"
                          >
                            Sil
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add attribute form */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Anahtar"
                      value={attrForms[cls.id]?.key ?? ""}
                      onChange={(e) =>
                        setAttrForms((p) => ({
                          ...p,
                          [cls.id]: {
                            key: e.target.value,
                            value: p[cls.id]?.value ?? "",
                          },
                        }))
                      }
                      className={inputCls + " flex-1"}
                    />
                    <input
                      type="text"
                      placeholder="Değer"
                      value={attrForms[cls.id]?.value ?? ""}
                      onChange={(e) =>
                        setAttrForms((p) => ({
                          ...p,
                          [cls.id]: {
                            key: p[cls.id]?.key ?? "",
                            value: e.target.value,
                          },
                        }))
                      }
                      className={inputCls + " flex-1"}
                    />
                    <button
                      onClick={() => handleAddAttr(cls.id)}
                      disabled={attrLoading[cls.id]}
                      className="text-xs px-3 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-neutral-950 font-semibold transition-colors shrink-0"
                    >
                      {attrLoading[cls.id] ? "..." : "Ekle"}
                    </button>
                  </div>
                  {attrError[cls.id] && (
                    <p className="text-red-400 text-xs mt-2">
                      {attrError[cls.id]}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Yeni Sınıf" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Sınıf Adı">
              <input
                type="text"
                required
                minLength={2}
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
                placeholder="Örn: VIP, Standart"
              />
            </Field>
            <Field label="Açıklama">
              <textarea
                required
                minLength={1}
                rows={3}
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
                className={inputCls + " resize-none"}
                placeholder="Sınıf açıklaması..."
              />
            </Field>
            {createError && <ErrorMsg msg={createError} />}
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
                disabled={createLoading}
                className={submitBtnCls}
              >
                {createLoading ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editClass && (
        <Modal title="Sınıf Düzenle" onClose={() => setEditClass(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Sınıf Adı">
              <input
                type="text"
                required
                minLength={2}
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Açıklama">
              <textarea
                required
                minLength={1}
                rows={3}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                className={inputCls + " resize-none"}
              />
            </Field>
            {editError && <ErrorMsg msg={editError} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditClass(null)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className={submitBtnCls}
              >
                {editLoading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteClass && (
        <Modal title="Sınıfı Sil" onClose={() => setDeleteClass(null)}>
          {deleteError ? (
            <>
              <div className="px-4 py-3 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg mb-4">
                {deleteError}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setDeleteClass(null)}
                  className={cancelBtnCls}
                >
                  Kapat
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-neutral-300 text-sm mb-6">
                <span className="text-yellow-400 font-medium">
                  {deleteClass.name}
                </span>{" "}
                sınıfını silmek istediğinizden emin misiniz?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteClass(null)}
                  className={cancelBtnCls}
                >
                  İptal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white transition-colors"
                >
                  {deleteLoading ? "Siliniyor..." : "Sil"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

// --- Shared sub-components ---

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="text-sm font-semibold text-yellow-400">{title}</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-red-400 text-xs bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
      {msg}
    </p>
  );
}

const inputCls =
  "w-full bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded-lg px-3 py-2 text-sm outline-none transition-colors placeholder:text-neutral-600";

const cancelBtnCls =
  "px-4 py-2 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors";

const submitBtnCls =
  "px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 transition-colors";
