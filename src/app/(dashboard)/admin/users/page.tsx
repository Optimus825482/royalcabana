"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Role } from "@/types";

interface UserRow {
  id: string;
  username: string;
  email: string;
  role: Role.CASINO_USER | Role.FNB_USER;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  [Role.CASINO_USER]: "Casino Kullanıcısı",
  [Role.FNB_USER]: "F&B Kullanıcısı",
};

const ALLOWED_ROLES = [Role.CASINO_USER, Role.FNB_USER] as const;

interface CreateForm {
  username: string;
  email: string;
  password: string;
  role: Role.CASINO_USER | Role.FNB_USER;
}

interface EditForm {
  username: string;
  email: string;
  role: Role.CASINO_USER | Role.FNB_USER;
  isActive: boolean;
}

const defaultCreateForm: CreateForm = {
  username: "",
  email: "",
  password: "",
  role: Role.CASINO_USER,
};

async function fetchUsers(roleFilter?: string): Promise<UserRow[]> {
  const url = roleFilter ? `/api/users?role=${roleFilter}` : "/api/users";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Kullanıcılar yüklenemedi.");
  return res.json();
}

async function createUser(data: CreateForm): Promise<UserRow> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Kullanıcı oluşturulamadı.");
  }
  return res.json();
}

async function updateUser(
  id: string,
  data: Partial<EditForm>,
): Promise<UserRow> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Kullanıcı güncellenemedi.");
  }
  return res.json();
}

async function deactivateUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Kullanıcı devre dışı bırakılamadı.");
  }
}

export default function AdminUsersPage() {
  useSession({ required: true });
  const queryClient = useQueryClient();

  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(defaultCreateForm);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(
    null,
  );
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const queryKey = ["admin-users", roleFilter];

  const { data: users = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchUsers(roleFilter !== "ALL" ? roleFilter : undefined),
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreate(false);
      setCreateForm(defaultCreateForm);
      showToast("success", "Kullanıcı başarıyla oluşturuldu.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EditForm> }) =>
      updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditUser(null);
      setEditForm(null);
      showToast("success", "Kullanıcı başarıyla güncellendi.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeactivateTarget(null);
      showToast("success", "Kullanıcı devre dışı bırakıldı.");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  function openEdit(user: UserRow) {
    setEditUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Kullanıcı Yönetimi
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Casino ve F&B kullanıcılarını yönetin
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
          }}
          className="bg-yellow-600 hover:bg-yellow-500 text-neutral-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Yeni Kullanıcı
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

      {/* Role filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { value: "ALL", label: "Tümü" },
          { value: Role.CASINO_USER, label: "Casino Kullanıcıları" },
          { value: Role.FNB_USER, label: "F&B Kullanıcıları" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setRoleFilter(tab.value)}
            className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
              roleFilter === tab.value
                ? "bg-yellow-600 text-neutral-950 font-semibold"
                : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
            Yükleniyor...
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
            Kullanıcı bulunamadı.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-left">
                <th className="px-4 py-3 font-medium">Kullanıcı Adı</th>
                <th className="px-4 py-3 font-medium">E-posta</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-neutral-100">
                    {user.username}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        user.role === Role.CASINO_USER
                          ? "bg-blue-950/50 text-blue-400 border-blue-800/40"
                          : "bg-purple-950/50 text-purple-400 border-purple-800/40"
                      }`}
                    >
                      {ROLE_LABELS[user.role]}
                    </span>
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
                        className="text-xs px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                      >
                        Düzenle
                      </button>
                      {user.isActive && (
                        <button
                          onClick={() => setDeactivateTarget(user)}
                          className="text-xs px-3 py-1.5 rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors"
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
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Yeni Kullanıcı" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(createForm);
            }}
            className="space-y-4"
          >
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
                  setCreateForm((f) => ({
                    ...f,
                    role: e.target.value as Role.CASINO_USER | Role.FNB_USER,
                  }))
                }
                className={inputCls}
              >
                {ALLOWED_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
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
      {editUser && editForm && (
        <Modal
          title="Kullanıcı Düzenle"
          onClose={() => {
            setEditUser(null);
            setEditForm(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editUser || !editForm) return;
              updateMutation.mutate({ id: editUser.id, data: editForm });
            }}
            className="space-y-4"
          >
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
                    f
                      ? {
                          ...f,
                          role: e.target.value as
                            | Role.CASINO_USER
                            | Role.FNB_USER,
                        }
                      : f,
                  )
                }
                className={inputCls}
              >
                {ALLOWED_ROLES.map((r) => (
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
            {updateMutation.isError && (
              <ErrorMsg msg={(updateMutation.error as Error).message} />
            )}
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
          title="Kullanıcıyı Devre Dışı Bırak"
          onClose={() => setDeactivateTarget(null)}
        >
          <p className="text-neutral-300 text-sm mb-6">
            <span className="text-yellow-400 font-medium">
              {deactivateTarget.username}
            </span>{" "}
            kullanıcısını devre dışı bırakmak istediğinizden emin misiniz?
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
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white transition-colors"
            >
              {deactivateMutation.isPending
                ? "İşleniyor..."
                : "Devre Dışı Bırak"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

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
