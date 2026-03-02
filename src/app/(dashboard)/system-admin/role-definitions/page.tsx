"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Role } from "@/types";
import {
    Modal,
    Field,
    ErrorMsg,
    inputCls,
    selectCls,
    cancelBtnCls,
    submitBtnCls,
} from "@/components/shared/FormComponents";

type Permission = {
    id: string;
    key: string;
    name: string;
    module: string;
    action: "view" | "create" | "update" | "delete";
    description?: string | null;
};

type RolePermissionLink = {
    id: string;
    permissionId: string;
    permission: Pick<Permission, "key" | "name" | "module" | "action">;
};

type RoleDefinition = {
    id: string;
    role: Role;
    displayName: string;
    description?: string | null;
    isSystem: boolean;
    isActive: boolean;
    permissions: RolePermissionLink[];
};

type ApiResponse<T> = {
    success: boolean;
    data: T;
    error: string | null;
};

const ROLE_LABELS: Record<Role, string> = {
    [Role.SYSTEM_ADMIN]: "Sistem Yöneticisi",
    [Role.ADMIN]: "Admin",
    [Role.CASINO_USER]: "Casino Kullanıcısı",
    [Role.FNB_USER]: "F&B Kullanıcısı",
};

const ACTION_LABELS: Record<Permission["action"], string> = {
    view: "Görüntüle",
    create: "Oluştur",
    update: "Güncelle",
    delete: "Sil",
};

const defaultCreate = {
    role: Role.CASINO_USER,
    displayName: "",
    description: "",
};

export default function RoleDefinitionsPage() {
    const queryClient = useQueryClient();

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showCreate, setShowCreate] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createForm, setCreateForm] = useState(defaultCreate);
    const [createError, setCreateError] = useState("");

    const [editTarget, setEditTarget] = useState<RoleDefinition | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");
    const [editForm, setEditForm] = useState({
        displayName: "",
        description: "",
        isActive: true,
    });

    const [permissionTarget, setPermissionTarget] = useState<RoleDefinition | null>(null);
    const [permissionSaving, setPermissionSaving] = useState(false);
    const [permissionError, setPermissionError] = useState("");
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);

    const [deleteTarget, setDeleteTarget] = useState<RoleDefinition | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const { data: roleDefinitions = [], isLoading } = useQuery<RoleDefinition[]>({
        queryKey: ["role-definitions"],
        queryFn: async () => {
            const res = await fetch("/api/system-admin/role-definitions");
            const payload: ApiResponse<RoleDefinition[]> = await res.json();
            if (!res.ok || !payload.success) {
                throw new Error(payload.error || "Rol tanımları yüklenemedi.");
            }
            return payload.data;
        },
    });

    const { data: permissions = [] } = useQuery<Permission[]>({
        queryKey: ["permissions"],
        queryFn: async () => {
            const res = await fetch("/api/system-admin/permissions");
            const payload: ApiResponse<Permission[]> = await res.json();
            if (!res.ok || !payload.success) {
                throw new Error(payload.error || "Yetkiler yüklenemedi.");
            }
            return payload.data;
        },
    });

    const groupedPermissions = useMemo(() => {
        const grouped = new Map<string, Permission[]>();
        for (const permission of permissions) {
            if (!grouped.has(permission.module)) {
                grouped.set(permission.module, []);
            }
            grouped.get(permission.module)?.push(permission);
        }

        for (const values of grouped.values()) {
            values.sort((a, b) => a.action.localeCompare(b.action));
        }

        return Array.from(grouped.entries());
    }, [permissions]);

    const existingRoles = useMemo(
        () => new Set(roleDefinitions.map((roleDefinition) => roleDefinition.role)),
        [roleDefinitions],
    );

    const creatableRoles = useMemo(
        () => Object.values(Role).filter((role) => !existingRoles.has(role)),
        [existingRoles],
    );

    function showSuccess(message: string) {
        setSuccess(message);
        setTimeout(() => setSuccess(""), 3000);
    }

    function openEdit(roleDefinition: RoleDefinition) {
        setEditTarget(roleDefinition);
        setEditError("");
        setEditForm({
            displayName: roleDefinition.displayName,
            description: roleDefinition.description ?? "",
            isActive: roleDefinition.isActive,
        });
    }

    function openPermissions(roleDefinition: RoleDefinition) {
        setPermissionTarget(roleDefinition);
        setPermissionError("");
        setSelectedPermissionIds(
            roleDefinition.permissions.map((permissionLink) => permissionLink.permissionId),
        );
    }

    async function refreshRoles() {
        await queryClient.invalidateQueries({ queryKey: ["role-definitions"] });
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError("");

        try {
            const res = await fetch("/api/system-admin/role-definitions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role: createForm.role,
                    displayName: createForm.displayName,
                    description: createForm.description || null,
                    isActive: true,
                }),
            });
            const payload: ApiResponse<RoleDefinition> = await res.json();

            if (!res.ok || !payload.success) {
                throw new Error(payload.error || "Rol tanımı oluşturulamadı.");
            }

            await refreshRoles();
            setShowCreate(false);
            setCreateForm(defaultCreate);
            showSuccess("Rol tanımı oluşturuldu.");
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Bir hata oluştu.");
        } finally {
            setCreateLoading(false);
        }
    }

    async function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editTarget) return;

        setEditLoading(true);
        setEditError("");

        try {
            const res = await fetch(`/api/system-admin/role-definitions/${editTarget.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    displayName: editForm.displayName,
                    description: editForm.description || null,
                    isActive: editForm.isActive,
                }),
            });

            const payload: ApiResponse<RoleDefinition> = await res.json();
            if (!res.ok || !payload.success) {
                throw new Error(payload.error || "Rol tanımı güncellenemedi.");
            }

            await refreshRoles();
            setEditTarget(null);
            showSuccess("Rol tanımı güncellendi.");
        } catch (err) {
            setEditError(err instanceof Error ? err.message : "Bir hata oluştu.");
        } finally {
            setEditLoading(false);
        }
    }

    async function handleSavePermissions() {
        if (!permissionTarget) return;

        setPermissionSaving(true);
        setPermissionError("");

        try {
            const res = await fetch(
                `/api/system-admin/role-definitions/${permissionTarget.id}/permissions`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ permissionIds: selectedPermissionIds }),
                },
            );

            const payload: ApiResponse<RolePermissionLink[]> = await res.json();
            if (!res.ok || !payload.success) {
                throw new Error(payload.error || "Rol yetkileri güncellenemedi.");
            }

            await refreshRoles();
            setPermissionTarget(null);
            showSuccess("Rol yetkileri güncellendi.");
        } catch (err) {
            setPermissionError(err instanceof Error ? err.message : "Bir hata oluştu.");
        } finally {
            setPermissionSaving(false);
        }
    }

    async function handleDeleteRole() {
        if (!deleteTarget) return;

        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/system-admin/role-definitions/${deleteTarget.id}`, {
                method: "DELETE",
            });

            const payload: ApiResponse<{ id: string }> = await res.json();
            if (!res.ok || !payload.success) {
                throw new Error(payload.error || "Rol tanımı silinemedi.");
            }

            await refreshRoles();
            setDeleteTarget(null);
            showSuccess("Rol tanımı silindi.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Bir hata oluştu.");
        } finally {
            setDeleteLoading(false);
        }
    }

    return (
        <div className="text-neutral-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-yellow-400">Rol Tanımları</h1>
                    <p className="text-sm text-neutral-500 mt-0.5">
                        Rolleri ve yetki atamalarını yönet
                    </p>
                </div>
                <button
                    onClick={() => {
                        setCreateError("");
                        setShowCreate(true);
                    }}
                    disabled={creatableRoles.length === 0}
                    className="min-h-11 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                >
                    + Rol Tanımı Ekle
                </button>
            </div>

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

            {isLoading ? (
                <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">Yükleniyor...</div>
            ) : roleDefinitions.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">Rol tanımı bulunamadı.</div>
            ) : (
                <div className="space-y-3">
                    {roleDefinitions.map((roleDefinition) => (
                        <div key={roleDefinition.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-neutral-100">{roleDefinition.displayName}</p>
                                    <p className="text-xs text-neutral-500 mt-0.5">
                                        {ROLE_LABELS[roleDefinition.role]} · {roleDefinition.isActive ? "Aktif" : "Pasif"}
                                        {roleDefinition.isSystem ? " · Sistem" : ""}
                                    </p>
                                    {roleDefinition.description && (
                                        <p className="text-xs text-neutral-400 mt-1">{roleDefinition.description}</p>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => openPermissions(roleDefinition)}
                                        className="px-3 py-2 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                                    >
                                        Yetki Ata
                                    </button>
                                    <button
                                        onClick={() => openEdit(roleDefinition)}
                                        className="px-3 py-2 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                                    >
                                        Düzenle
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(roleDefinition)}
                                        disabled={roleDefinition.isSystem}
                                        className="px-3 py-2 text-xs rounded-lg bg-red-950/40 hover:bg-red-900/40 border border-red-800/40 text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Sil
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {roleDefinition.permissions.length === 0 ? (
                                    <span className="text-xs text-neutral-500">Henüz yetki atanmamış.</span>
                                ) : (
                                    roleDefinition.permissions.slice(0, 8).map((permissionLink) => (
                                        <span
                                            key={permissionLink.id}
                                            className="inline-flex items-center px-2 py-1 text-[11px] rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700"
                                        >
                                            {permissionLink.permission.module} · {ACTION_LABELS[permissionLink.permission.action]}
                                        </span>
                                    ))
                                )}
                                {roleDefinition.permissions.length > 8 && (
                                    <span className="text-xs text-neutral-500">
                                        +{roleDefinition.permissions.length - 8} yetki daha
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && (
                <Modal title="Yeni Rol Tanımı" onClose={() => setShowCreate(false)}>
                    <form className="space-y-4" onSubmit={handleCreate}>
                        <Field label="Rol">
                            <select
                                value={createForm.role}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value as Role }))}
                                className={selectCls}
                                title="Rol"
                            >
                                {creatableRoles.map((role) => (
                                    <option key={role} value={role}>
                                        {ROLE_LABELS[role]}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Görünen Ad">
                            <input
                                className={inputCls}
                                value={createForm.displayName}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, displayName: e.target.value }))}
                                placeholder="Örn: Operasyon Admin"
                                title="Görünen Ad"
                                required
                            />
                        </Field>

                        <Field label="Açıklama">
                            <textarea
                                className={`${inputCls} min-h-22`}
                                value={createForm.description}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder="Rol açıklaması"
                                title="Açıklama"
                            />
                        </Field>

                        {createError && <ErrorMsg msg={createError} />}

                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" className={cancelBtnCls} onClick={() => setShowCreate(false)}>
                                Vazgeç
                            </button>
                            <button type="submit" className={submitBtnCls} disabled={createLoading}>
                                {createLoading ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {editTarget && (
                <Modal title="Rol Tanımı Düzenle" onClose={() => setEditTarget(null)}>
                    <form className="space-y-4" onSubmit={handleEdit}>
                        <Field label="Rol">
                            <input className={inputCls} value={ROLE_LABELS[editTarget.role]} readOnly title="Rol" />
                        </Field>

                        <Field label="Görünen Ad">
                            <input
                                className={inputCls}
                                value={editForm.displayName}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))}
                                title="Görünen Ad"
                                required
                            />
                        </Field>

                        <Field label="Açıklama">
                            <textarea
                                className={`${inputCls} min-h-22`}
                                value={editForm.description}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                                title="Açıklama"
                            />
                        </Field>

                        <label className="flex items-center gap-2 text-sm text-neutral-300">
                            <input
                                type="checkbox"
                                checked={editForm.isActive}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                                title="Rol aktif"
                            />
                            Rol aktif
                        </label>

                        {editError && <ErrorMsg msg={editError} />}

                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" className={cancelBtnCls} onClick={() => setEditTarget(null)}>
                                Vazgeç
                            </button>
                            <button type="submit" className={submitBtnCls} disabled={editLoading}>
                                {editLoading ? "Kaydediliyor..." : "Güncelle"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {permissionTarget && (
                <Modal title={`Yetki Ata · ${permissionTarget.displayName}`} onClose={() => setPermissionTarget(null)}>
                    <div className="space-y-4">
                        <div className="max-h-[55vh] overflow-y-auto space-y-3 pr-1">
                            {groupedPermissions.map(([module, modulePermissions]) => (
                                <div key={module} className="border border-neutral-800 rounded-lg p-3">
                                    <p className="text-xs text-neutral-400 mb-2">{module}</p>
                                    <div className="space-y-2">
                                        {modulePermissions.map((permission) => {
                                            const checked = selectedPermissionIds.includes(permission.id);
                                            return (
                                                <label key={permission.id} className="flex items-start gap-2 text-sm text-neutral-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(e) => {
                                                            setSelectedPermissionIds((prev) => {
                                                                if (e.target.checked) return [...prev, permission.id];
                                                                return prev.filter((id) => id !== permission.id);
                                                            });
                                                        }}
                                                        className="mt-0.5"
                                                        title={`${module} ${ACTION_LABELS[permission.action]} yetkisi`}
                                                    />
                                                    <span>
                                                        <span className="font-medium">{ACTION_LABELS[permission.action]}</span>
                                                        <span className="text-neutral-400"> · {permission.name}</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {permissionError && <ErrorMsg msg={permissionError} />}

                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" className={cancelBtnCls} onClick={() => setPermissionTarget(null)}>
                                Vazgeç
                            </button>
                            <button type="button" className={submitBtnCls} onClick={handleSavePermissions} disabled={permissionSaving}>
                                {permissionSaving ? "Kaydediliyor..." : "Yetkileri Kaydet"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {deleteTarget && (
                <Modal title="Rol Tanımı Sil" onClose={() => setDeleteTarget(null)}>
                    <div className="space-y-4">
                        <p className="text-sm text-neutral-300">
                            <span className="font-semibold">{deleteTarget.displayName}</span> rol tanımı silinecek.
                            Bu işlemde rol atamaları da kaldırılır.
                        </p>
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" className={cancelBtnCls} onClick={() => setDeleteTarget(null)}>
                                Vazgeç
                            </button>
                            <button
                                type="button"
                                className="min-h-11 px-4 py-2 text-sm rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                                disabled={deleteLoading}
                                onClick={handleDeleteRole}
                            >
                                {deleteLoading ? "Siliniyor..." : "Sil"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
