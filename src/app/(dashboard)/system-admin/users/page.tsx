"use client";

import { useState, useCallback } from "react";
import { Role } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  cancelBtnCls,
  submitBtnCls,
} from "@/components/shared/FormComponents";

interface UserRow {
  id: string;
  username: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<Role, string> = {
  [Role.SYSTEM_ADMIN]: "Sistem Yöneticisi",
  [Role.ADMIN]: "Admin",
  [Role.CASINO_USER]: "Casino Kullanıcısı",
  [Role.FNB_USER]: "F&B Kullanıcısı",
};

const ROLES = [Role.SYSTEM_ADMIN, Role.ADMIN, Role.CASINO_USER, Role.FNB_USER];

interface CreateForm {
  username: string;
  email: string;
  password: string;
  role: Role;
}

interface EditForm {
  username: string;
  email: string;
  role: Role;
  isActive: boolean;
  newPassword: string;
}

const defaultCreateForm: CreateForm = {
  username: "",
  email: "",
  password: "",
  role: Role.CASINO_USER,
};

export default function UsersPage() {
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading: loading,
    error: queryError,
  } = useQuery<UserRow[]>({
    queryKey: ["system-admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Kullanıcılar yüklenemedi.");
      return res.json();
    },
  });

  const [error, setError] = useState(queryError ? String(queryError) : "");
  const [success, setSuccess] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(defaultCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit modal
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Deactivate confirm
  const [deactivateUser, setDeactivateUser] = useState<UserRow | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

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
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Kullanıcı oluşturulamadı.");
      }
      setShowCreate(false);
      setCreateForm(defaultCreateForm);
      showSuccess("Kullanıcı başarıyla oluşturuldu.");
      queryClient.invalidateQueries({ queryKey: ["system-admin-users"] });
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setCreateLoading(false);
    }
  }

  // --- Edit ---
  function openEdit(user: UserRow) {
    setEditUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      newPassword: "",
    });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser || !editForm) return;
    setEditLoading(true);
    setEditError("");
    try {
      const { newPassword, ...rest } = editForm;
      const body: Record<string, unknown> = { ...rest };
      if (newPassword) body.password = newPassword;
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Kullanıcı güncellenemedi.");
      }
      setEditUser(null);
      setEditForm(null);
      showSuccess("Kullanıcı başarıyla güncellendi.");
      queryClient.invalidateQueries({ queryKey: ["system-admin-users"] });
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setEditLoading(false);
    }
  }

  // --- Deactivate ---
  async function handleDeactivate() {
    if (!deactivateUser) return;
    setDeactivateLoading(true);
    try {
      const res = await fetch(`/api/users/${deactivateUser.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Kullanıcı devre dışı bırakılamadı.");
      }
      setDeactivateUser(null);
      showSuccess("Kullanıcı devre dışı bırakıldı.");
      queryClient.invalidateQueries({ queryKey: ["system-admin-users"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
      setDeactivateUser(null);
    } finally {
      setDeactivateLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Kullanıcı Yönetimi
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Sistem kullanıcılarını yönetin
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setCreateError("");
          }}
          className="bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 min-h-[44px] rounded-lg transition-colors"
        >
          + Yeni Kullanıcı
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

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
            Yükleniyor...
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
            Henüz kullanıcı yok.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-left">
                    <th className="px-4 py-3 font-medium">Kullanıcı Adı</th>
                    <th className="px-4 py-3 font-medium">E-posta</th>
                    <th className="px-4 py-3 font-medium">Rol</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium text-right">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-neutral-100 font-medium">
                        {user.username}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-neutral-300">
                        {ROLE_LABELS[user.role]}
                      </td>
                      <td className="px-4 py-3">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-950/60 text-green-400 border border-green-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-500 border border-neutral-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                            Pasif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(user)}
                            className="text-xs px-3 min-h-[36px] rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                          >
                            Düzenle
                          </button>
                          {user.isActive && (
                            <button
                              onClick={() => setDeactivateUser(user)}
                              className="text-xs px-3 min-h-[36px] rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                            >
                              Devre Dışı
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile card layout */}
            <div className="md:hidden divide-y divide-neutral-800">
              {users.map((user) => (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-neutral-100">
                        {user.username}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {user.email}
                      </p>
                    </div>
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-950/60 text-green-400 border border-green-800/40 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-500 border border-neutral-700 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                        Pasif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {ROLE_LABELS[user.role]}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(user)}
                      className="flex-1 text-sm min-h-[44px] rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    >
                      Düzenle
                    </button>
                    {user.isActive && (
                      <button
                        onClick={() => setDeactivateUser(user)}
                        className="flex-1 text-sm min-h-[44px] rounded-lg bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
                      >
                        Devre Dışı
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Yeni Kullanıcı" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Kullanıcı Adı">
              <input
                type="text"
                required
                minLength={3}
                value={createForm.username}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, username: e.target.value }))
                }
                className={inputCls}
                placeholder="kullanici_adi"
              />
            </Field>
            <Field label="E-posta">
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                className={inputCls}
                placeholder="ornek@email.com"
              />
            </Field>
            <Field label="Şifre">
              <input
                type="password"
                required
                minLength={6}
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, password: e.target.value }))
                }
                className={inputCls}
                placeholder="En az 6 karakter"
              />
            </Field>
            <Field label="Rol">
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, role: e.target.value as Role }))
                }
                className={inputCls}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
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
      {editUser && editForm && (
        <Modal
          title="Kullanıcı Düzenle"
          onClose={() => {
            setEditUser(null);
            setEditForm(null);
          }}
        >
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Kullanıcı Adı">
              <input
                type="text"
                required
                minLength={3}
                value={editForm.username}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, username: e.target.value } : f,
                  )
                }
                className={inputCls}
              />
            </Field>
            <Field label="E-posta">
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, email: e.target.value } : f))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Rol">
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, role: e.target.value as Role } : f,
                  )
                }
                className={inputCls}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Durum">
              <select
                value={editForm.isActive ? "true" : "false"}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, isActive: e.target.value === "true" } : f,
                  )
                }
                className={inputCls}
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </Field>
            <Field label="Yeni Şifre">
              <input
                type="password"
                minLength={6}
                value={editForm.newPassword}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, newPassword: e.target.value } : f,
                  )
                }
                className={inputCls}
                placeholder="Boş bırakılırsa değişmez"
              />
            </Field>
            {editError && <ErrorMsg msg={editError} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditUser(null);
                  setEditForm(null);
                }}
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

      {/* Deactivate Confirm Modal */}
      {deactivateUser && (
        <Modal
          title="Kullanıcıyı Devre Dışı Bırak"
          onClose={() => setDeactivateUser(null)}
        >
          <p className="text-neutral-300 text-sm mb-6">
            <span className="text-yellow-400 font-medium">
              {deactivateUser.username}
            </span>{" "}
            kullanıcısını devre dışı bırakmak istediğinizden emin misiniz?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeactivateUser(null)}
              className={cancelBtnCls}
            >
              İptal
            </button>
            <button
              onClick={handleDeactivate}
              disabled={deactivateLoading}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white transition-colors"
            >
              {deactivateLoading ? "İşleniyor..." : "Devre Dışı Bırak"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- Shared sub-components imported from @/components/shared/FormComponents ---
