"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Plus,
  Pencil,
  Users,
  Lock,
  Unlock,
  Trash2,
  Search,
} from "lucide-react";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  selectCls,
  cancelBtnCls,
  submitBtnCls,
  primaryBtnCls,
  dangerSoftBtnCls,
  editBtnCls,
  ghostBtnCls,
} from "@/components/shared/FormComponents";
import PermissionGate from "@/components/shared/PermissionGate";
import dynamic from "next/dynamic";

const ServicePointMapPlacer = dynamic(
  () => import("@/components/service-points/ServicePointMapPlacer"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] bg-neutral-900 rounded-lg animate-pulse" />
    ),
  },
);

/* ── Types ── */

interface StaffAssignment {
  id: string;
  staffId: string;
  role: string;
  shift: string | null;
  date: string;
  staff: { id: string; name: string; position: string };
}

interface ServicePoint {
  id: string;
  name: string;
  description: string | null;
  type: string;
  coordX: number | null;
  coordY: number | null;
  rotation: number;
  scale: number;
  isLocked: boolean;
  requiredStaffCount: number;
  staffRoles: string[] | null;
  isActive: boolean;
  staffAssignments: StaffAssignment[];
}

interface StaffOption {
  id: string;
  name: string;
  position: string;
}

/* ── Constants ── */

const SERVICE_TYPES = [
  { value: "BAR", label: "Bar" },
  { value: "RESTAURANT", label: "Restoran" },
  { value: "POOL_BAR", label: "Havuz Bar" },
  { value: "BEACH_BAR", label: "Plaj Bar" },
  { value: "SPA", label: "Spa" },
  { value: "RECEPTION", label: "Resepsiyon" },
  { value: "SHOP", label: "Mağaza" },
  { value: "OTHER", label: "Diğer" },
];

const SHIFT_OPTIONS = [
  { value: "MORNING", label: "Sabah" },
  { value: "AFTERNOON", label: "Öğleden Sonra" },
  { value: "FULL_DAY", label: "Tam Gün" },
];

const TYPE_COLORS: Record<string, string> = {
  BAR: "bg-amber-900/50 text-amber-400 border-amber-800/40",
  RESTAURANT: "bg-red-900/50 text-red-400 border-red-800/40",
  POOL_BAR: "bg-blue-900/50 text-blue-400 border-blue-800/40",
  BEACH_BAR: "bg-orange-900/50 text-orange-400 border-orange-800/40",
  SPA: "bg-purple-900/50 text-purple-400 border-purple-800/40",
  RECEPTION: "bg-emerald-900/50 text-emerald-400 border-emerald-800/40",
  SHOP: "bg-pink-900/50 text-pink-400 border-pink-800/40",
  OTHER: "bg-neutral-800 text-neutral-400 border-neutral-700",
};

/* 3D preview icons per service point type */
const TYPE_3D_ICONS: Record<
  string,
  { icon: React.ReactNode; gradient: string }
> = {
  BAR: {
    gradient: "from-amber-600 to-orange-700",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect x="8" y="28" width="32" height="4" rx="1" fill="#8b4513" />
        <rect x="6" y="26" width="36" height="3" rx="1" fill="#a0522d" />
        <rect x="10" y="10" width="28" height="2" rx="1" fill="#ff6b35" />
        <rect x="12" y="12" width="2" height="16" fill="#4a4a4a" />
        <rect x="34" y="12" width="2" height="16" fill="#4a4a4a" />
        <circle cx="18" cy="8" r="1.5" fill="#ffdd44" />
        <circle cx="24" cy="8" r="1.5" fill="#ffdd44" />
        <circle cx="30" cy="8" r="1.5" fill="#ffdd44" />
        <rect x="4" y="32" width="40" height="3" rx="1" fill="#5a5a5a" />
      </svg>
    ),
  },
  BEACH_BAR: {
    gradient: "from-orange-500 to-amber-600",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect x="6" y="30" width="36" height="3" rx="1" fill="#8b6f47" />
        <rect x="10" y="24" width="28" height="3" rx="1" fill="#a0522d" />
        <path d="M8 14 L24 6 L40 14 Z" fill="#ff6b35" />
        <rect x="12" y="14" width="2" height="12" fill="#4a4a4a" />
        <rect x="34" y="14" width="2" height="12" fill="#4a4a4a" />
        <ellipse cx="24" cy="40" rx="16" ry="3" fill="#c2b280" opacity="0.4" />
        <path
          d="M2 38 Q6 36 10 38 Q14 40 18 38"
          stroke="#3498db"
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
        />
      </svg>
    ),
  },
  RESTAURANT: {
    gradient: "from-red-600 to-rose-700",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect x="8" y="26" width="32" height="10" rx="2" fill="#5c3a1e" />
        <rect x="6" y="8" width="36" height="3" rx="1" fill="#c0392b" />
        <rect x="10" y="11" width="2" height="15" fill="#5c3a1e" />
        <rect x="36" y="11" width="2" height="15" fill="#5c3a1e" />
        <circle cx="18" cy="30" r="3" fill="#f39c12" opacity="0.6" />
        <circle cx="30" cy="30" r="3" fill="#f39c12" opacity="0.6" />
        <rect x="16" y="28" width="4" height="0.5" fill="#ddd" />
        <rect x="28" y="28" width="4" height="0.5" fill="#ddd" />
        <rect x="4" y="36" width="40" height="3" rx="1" fill="#5a5a5a" />
      </svg>
    ),
  },
  POOL_BAR: {
    gradient: "from-blue-500 to-cyan-600",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <ellipse cx="24" cy="34" rx="18" ry="8" fill="#3498db" opacity="0.3" />
        <rect x="14" y="18" width="20" height="12" rx="2" fill="#2c3e50" />
        <rect x="12" y="12" width="24" height="3" rx="1" fill="#1e90ff" />
        <rect x="16" y="15" width="2" height="5" fill="#2c3e50" />
        <rect x="30" y="15" width="2" height="5" fill="#2c3e50" />
        <ellipse cx="24" cy="24" rx="6" ry="3" fill="#5dade2" opacity="0.5" />
        <path
          d="M6 38 Q10 36 14 38 Q18 40 22 38 Q26 36 30 38 Q34 40 38 38 Q42 36 46 38"
          stroke="#00e5ff"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
      </svg>
    ),
  },
  SPA: {
    gradient: "from-purple-500 to-violet-600",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="14" fill="#6c3483" opacity="0.3" />
        <circle cx="24" cy="24" r="10" fill="#8e44ad" opacity="0.4" />
        <path
          d="M24 8 C20 14 16 18 16 24 C16 28.4 19.6 32 24 32 C28.4 32 32 28.4 32 24 C32 18 28 14 24 8Z"
          fill="#a569bd"
          opacity="0.6"
        />
        <circle cx="24" cy="22" r="3" fill="#f1c40f" opacity="0.5" />
        <path
          d="M18 36 Q20 34 22 36"
          stroke="#8e44ad"
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M26 36 Q28 34 30 36"
          stroke="#8e44ad"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    ),
  },
  RECEPTION: {
    gradient: "from-emerald-500 to-teal-600",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect x="8" y="20" width="32" height="14" rx="2" fill="#1a5276" />
        <rect x="6" y="8" width="36" height="4" rx="1" fill="#2980b9" />
        <rect x="10" y="12" width="2" height="8" fill="#1a5276" />
        <rect x="36" y="12" width="2" height="8" fill="#1a5276" />
        <rect
          x="14"
          y="24"
          width="20"
          height="6"
          rx="1"
          fill="#2980b9"
          opacity="0.5"
        />
        <rect x="20" y="22" width="8" height="2" rx="0.5" fill="#ecf0f1" />
        <rect x="4" y="34" width="40" height="3" rx="1" fill="#5a5a5a" />
        <circle cx="38" cy="16" r="2" fill="#2ecc71" opacity="0.6" />
      </svg>
    ),
  },
  SHOP: {
    gradient: "from-pink-500 to-rose-600",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect x="10" y="16" width="28" height="18" rx="2" fill="#7d6608" />
        <rect x="8" y="8" width="32" height="4" rx="1" fill="#f1c40f" />
        <path
          d="M8 12 L12 16 L16 12 L20 16 L24 12 L28 16 L32 12 L36 16 L40 12"
          stroke="#f1c40f"
          strokeWidth="2"
          fill="none"
        />
        <rect
          x="14"
          y="20"
          width="8"
          height="10"
          rx="1"
          fill="#85c1e9"
          opacity="0.4"
        />
        <rect
          x="26"
          y="20"
          width="8"
          height="10"
          rx="1"
          fill="#85c1e9"
          opacity="0.4"
        />
        <rect x="4" y="34" width="40" height="3" rx="1" fill="#5a5a5a" />
      </svg>
    ),
  },
  OTHER: {
    gradient: "from-neutral-500 to-neutral-600",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <rect x="10" y="18" width="28" height="14" rx="2" fill="#555" />
        <rect x="8" y="10" width="32" height="3" rx="1" fill="#888" />
        <rect x="12" y="13" width="2" height="5" fill="#555" />
        <rect x="34" y="13" width="2" height="5" fill="#555" />
        <rect x="4" y="32" width="40" height="3" rx="1" fill="#5a5a5a" />
      </svg>
    ),
  },
};

interface CreateForm {
  name: string;
  description: string;
  type: string;
  requiredStaffCount: number;
  staffRoles: string[];
}

const defaultForm: CreateForm = {
  name: "",
  description: "",
  type: "BAR",
  requiredStaffCount: 0,
  staffRoles: [],
};

/* ── Component ── */

export default function ServicePointsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(defaultForm);
  const [roleInput, setRoleInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Edit modal
  const [editItem, setEditItem] = useState<ServicePoint | null>(null);
  const [editForm, setEditForm] = useState<CreateForm>(defaultForm);
  const [editRoleInput, setEditRoleInput] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Map placement modal
  const [mapTarget, setMapTarget] = useState<ServicePoint | null>(null);
  const [mapSaving, setMapSaving] = useState(false);

  // Staff assignment modal
  const [staffTarget, setStaffTarget] = useState<ServicePoint | null>(null);
  const [staffForm, setStaffForm] = useState({
    staffId: "",
    role: "",
    shift: "FULL_DAY",
    date: new Date().toISOString().split("T")[0],
  });
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");

  // Success toast
  const [success, setSuccess] = useState("");
  const showMsg = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }, []);

  // Queries
  const {
    data: points = [],
    isLoading,
    isError: isPointsError,
    error: pointsError,
  } = useQuery<ServicePoint[]>({
    queryKey: ["service-points"],
    queryFn: async () => {
      const res = await fetch("/api/service-points?activeOnly=false");
      if (!res.ok) throw new Error("Hizmet noktaları yüklenemedi.");
      const d = await res.json();
      const resolved = d.data ?? d;
      return Array.isArray(resolved) ? resolved : [];
    },
  });

  const { data: staffList = [] } = useQuery<StaffOption[]>({
    queryKey: ["staff-options"],
    queryFn: async () => {
      const res = await fetch("/api/staff?isActive=true");
      if (!res.ok) return [];
      const d = await res.json();
      const resolved = d.data ?? d;
      const items = Array.isArray(resolved) ? resolved : (resolved.items ?? resolved.staff ?? []);
      return items.map((s: StaffOption) => ({
        id: s.id,
        name: s.name,
        position: s.position,
      }));
    },
    enabled: !!staffTarget,
  });

  const filtered = points.filter(
    (sp) =>
      sp.name.toLowerCase().includes(search.toLowerCase()) ||
      (sp.description ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  /* ── Handlers ── */

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/service-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          requiredStaffCount: Number(form.requiredStaffCount),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Oluşturulamadı");
      }
      setShowCreate(false);
      setForm(defaultForm);
      setRoleInput("");
      showMsg("Hizmet noktası oluşturuldu.");
      qc.invalidateQueries({ queryKey: ["service-points"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/service-points/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          requiredStaffCount: Number(editForm.requiredStaffCount),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Güncellenemedi");
      }
      setEditItem(null);
      setEditRoleInput("");
      showMsg("Hizmet noktası güncellendi.");
      qc.invalidateQueries({ queryKey: ["service-points"] });
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Hata");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleToggle(sp: ServicePoint) {
    await fetch(`/api/service-points/${sp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !sp.isActive }),
    });
    qc.invalidateQueries({ queryKey: ["service-points"] });
  }

  async function handleMapSave(data: {
    coordX: number;
    coordY: number;
    rotation: number;
    scale: number;
    isLocked: boolean;
  }) {
    if (!mapTarget) return;
    setMapSaving(true);
    try {
      await fetch(`/api/service-points/${mapTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setMapTarget(null);
      showMsg("Konum kaydedildi.");
      qc.invalidateQueries({ queryKey: ["service-points"] });
    } catch {
      /* silent */
    } finally {
      setMapSaving(false);
    }
  }

  async function handleStaffAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!staffTarget) return;
    setStaffLoading(true);
    setStaffError("");
    try {
      const res = await fetch(`/api/service-points/${staffTarget.id}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: [staffForm] }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Atama yapılamadı");
      }
      setStaffForm((f) => ({ ...f, staffId: "", role: "" }));
      showMsg("Personel atandı.");
      qc.invalidateQueries({ queryKey: ["service-points"] });
    } catch (e: unknown) {
      setStaffError(e instanceof Error ? e.message : "Hata");
    } finally {
      setStaffLoading(false);
    }
  }

  async function handleRemoveAssignment(spId: string, assignmentId: string) {
    await fetch(
      `/api/service-points/${spId}/staff?assignmentId=${assignmentId}`,
      { method: "DELETE" },
    );
    qc.invalidateQueries({ queryKey: ["service-points"] });
  }

  function addRole(
    list: string[],
    setter: (v: string[]) => void,
    input: string,
    inputSetter: (v: string) => void,
  ) {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setter([...list, trimmed]);
    }
    inputSetter("");
  }

  function removeRole(
    list: string[],
    setter: (v: string[]) => void,
    idx: number,
  ) {
    setter(list.filter((_, i) => i !== idx));
  }

  /* ── Render ── */

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Hizmet Noktaları
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Sistemde kayıtlı hizmet noktalarını yönetin
          </p>
        </div>
        <PermissionGate permission="system.config.create">
          <button
            onClick={() => {
              setShowCreate(true);
              setError("");
              setForm(defaultForm);
              setRoleInput("");
            }}
            className={`${primaryBtnCls} inline-flex items-center gap-1.5`}
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Hizmet Noktası</span>
          </button>
        </PermissionGate>
      </div>

      {success && (
        <div className="mb-4 px-4 py-2.5 bg-green-950/50 border border-green-700/40 text-green-400 text-sm rounded-lg">
          {success}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İsim veya açıklama ile ara..."
          className={`${inputCls} pl-10`}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
            />
          ))}
        </div>
      ) : isPointsError ? (
        <div className="text-center py-12">
          <p className="text-red-400 text-sm">
            {(pointsError as Error)?.message ??
              "Veriler yüklenirken bir hata oluştu."}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
          <MapPin className="w-10 h-10 mb-3 text-neutral-700" />
          <p className="text-sm">Hizmet noktası bulunamadı.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500 border-b border-neutral-800">
                <th className="pb-2 pl-3 font-medium">Ad</th>
                <th className="pb-2 font-medium">Tip</th>
                <th className="pb-2 font-medium">Durum</th>
                <th className="pb-2 font-medium">Personel</th>
                <th className="pb-2 font-medium">Konum</th>
                <th className="pb-2 pr-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sp) => (
                <tr
                  key={sp.id}
                  className="border-b border-neutral-800/50 hover:bg-neutral-900/50 transition-colors"
                >
                  <td className="py-3 pl-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${TYPE_3D_ICONS[sp.type]?.gradient || TYPE_3D_ICONS.OTHER.gradient} p-1.5 flex-shrink-0 shadow-lg ring-1 ring-white/10`}
                      >
                        {TYPE_3D_ICONS[sp.type]?.icon ||
                          TYPE_3D_ICONS.OTHER.icon}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-100">
                          {sp.name}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {sp.description || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border ${TYPE_COLORS[sp.type] || TYPE_COLORS.OTHER}`}
                    >
                      {SERVICE_TYPES.find((t) => t.value === sp.type)?.label ||
                        sp.type}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border ${
                        sp.isActive
                          ? "bg-green-900/50 text-green-400 border-green-800/40"
                          : "bg-red-900/50 text-red-400 border-red-800/40"
                      }`}
                    >
                      {sp.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="text-xs text-neutral-300">
                        {sp.staffAssignments?.length || 0} /{" "}
                        {sp.requiredStaffCount}
                      </span>
                    </div>
                    {sp.staffRoles && sp.staffRoles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sp.staffRoles.map((r, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3">
                    {sp.coordX != null && sp.coordY != null ? (
                      <div className="flex items-center gap-1.5">
                        {sp.isLocked ? (
                          <Lock className="w-3 h-3 text-amber-400" />
                        ) : (
                          <Unlock className="w-3 h-3 text-neutral-500" />
                        )}
                        <span className="text-xs text-neutral-400">
                          {Math.round(sp.coordX)}, {Math.round(sp.coordY)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-600">
                        Belirlenmedi
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <PermissionGate permission="system.config.update">
                        <button
                          onClick={() => setMapTarget(sp)}
                          className={ghostBtnCls}
                          title="Konum Belirle"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setStaffTarget(sp)}
                          className={ghostBtnCls}
                          title="Personel Ata"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditItem(sp);
                            setEditForm({
                              name: sp.name,
                              description: sp.description || "",
                              type: sp.type,
                              requiredStaffCount: sp.requiredStaffCount,
                              staffRoles: sp.staffRoles || [],
                            });
                            setEditRoleInput("");
                            setEditError("");
                          }}
                          className={editBtnCls}
                          title="Düzenle"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggle(sp)}
                          className={dangerSoftBtnCls}
                        >
                          {sp.isActive ? "Pasif" : "Aktif"}
                        </button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <Modal title="Yeni Hizmet Noktası" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Ad">
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Açıklama">
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Tip">
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
                className={selectCls}
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Görevli Personel Sayısı">
              <input
                type="number"
                min={0}
                value={form.requiredStaffCount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    requiredStaffCount: parseInt(e.target.value) || 0,
                  }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Personel Rolleri">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRole(
                        form.staffRoles,
                        (r) => setForm((f) => ({ ...f, staffRoles: r })),
                        roleInput,
                        setRoleInput,
                      );
                    }
                  }}
                  placeholder="Rol adı yazıp Enter'a basın"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() =>
                    addRole(
                      form.staffRoles,
                      (r) => setForm((f) => ({ ...f, staffRoles: r })),
                      roleInput,
                      setRoleInput,
                    )
                  }
                  className={ghostBtnCls}
                >
                  Ekle
                </button>
              </div>
              {form.staffRoles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.staffRoles.map((r, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700"
                    >
                      {r}
                      <button
                        type="button"
                        onClick={() =>
                          removeRole(
                            form.staffRoles,
                            (r2) => setForm((f) => ({ ...f, staffRoles: r2 })),
                            i,
                          )
                        }
                        className="text-neutral-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
            {error && <ErrorMsg msg={error} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button type="submit" disabled={loading} className={submitBtnCls}>
                {loading ? "..." : "Oluştur"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {editItem && (
        <Modal title="Hizmet Noktası Düzenle" onClose={() => setEditItem(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Ad">
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Açıklama">
              <input
                type="text"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Tip">
              <select
                value={editForm.type}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, type: e.target.value }))
                }
                className={selectCls}
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Görevli Personel Sayısı">
              <input
                type="number"
                min={0}
                value={editForm.requiredStaffCount}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    requiredStaffCount: parseInt(e.target.value) || 0,
                  }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Personel Rolleri">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editRoleInput}
                  onChange={(e) => setEditRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRole(
                        editForm.staffRoles,
                        (r) => setEditForm((f) => ({ ...f, staffRoles: r })),
                        editRoleInput,
                        setEditRoleInput,
                      );
                    }
                  }}
                  placeholder="Rol adı yazıp Enter'a basın"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() =>
                    addRole(
                      editForm.staffRoles,
                      (r) => setEditForm((f) => ({ ...f, staffRoles: r })),
                      editRoleInput,
                      setEditRoleInput,
                    )
                  }
                  className={ghostBtnCls}
                >
                  Ekle
                </button>
              </div>
              {editForm.staffRoles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {editForm.staffRoles.map((r, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700"
                    >
                      {r}
                      <button
                        type="button"
                        onClick={() =>
                          removeRole(
                            editForm.staffRoles,
                            (r2) =>
                              setEditForm((f) => ({ ...f, staffRoles: r2 })),
                            i,
                          )
                        }
                        className="text-neutral-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
            {editError && <ErrorMsg msg={editError} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className={cancelBtnCls}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className={submitBtnCls}
              >
                {editLoading ? "..." : "Kaydet"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Map Placement Modal ── */}
      {mapTarget && (
        <Modal
          title={`Konum Belirle — ${mapTarget.name}`}
          onClose={() => setMapTarget(null)}
          maxWidth="max-w-4xl"
        >
          <ServicePointMapPlacer
            initialX={mapTarget.coordX}
            initialY={mapTarget.coordY}
            initialRotation={mapTarget.rotation}
            initialScale={mapTarget.scale}
            initialLocked={mapTarget.isLocked}
            servicePointType={mapTarget.type}
            servicePointName={mapTarget.name}
            onSave={(data) => handleMapSave(data)}
            onCancel={() => setMapTarget(null)}
          />
          {mapSaving && (
            <div className="mt-2 text-xs text-amber-400 text-center">
              Kaydediliyor...
            </div>
          )}
        </Modal>
      )}

      {/* ── Staff Assignment Modal ── */}
      {staffTarget && (
        <Modal
          title={`Personel Ata — ${staffTarget.name}`}
          onClose={() => {
            setStaffTarget(null);
            setStaffError("");
          }}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            {/* Current assignments */}
            {staffTarget.staffAssignments &&
              staffTarget.staffAssignments.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-400 mb-2">
                    Mevcut Atamalar
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {staffTarget.staffAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between bg-neutral-800/60 rounded-lg px-3 py-2 border border-neutral-700/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-neutral-200">
                            {a.staff.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-400">
                            {a.role}
                          </span>
                          {a.shift && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700/50 text-neutral-500">
                              {SHIFT_OPTIONS.find((s) => s.value === a.shift)
                                ?.label || a.shift}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            handleRemoveAssignment(staffTarget.id, a.id)
                          }
                          className="p-1 rounded hover:bg-red-900/50 text-neutral-500 hover:text-red-400 transition-colors"
                          title="Kaldır"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Assign form */}
            <form
              onSubmit={handleStaffAssign}
              className="space-y-3 border-t border-neutral-800 pt-4"
            >
              <p className="text-xs text-neutral-400">Yeni Atama</p>
              <Field label="Personel">
                <select
                  value={staffForm.staffId}
                  onChange={(e) =>
                    setStaffForm((f) => ({ ...f, staffId: e.target.value }))
                  }
                  className={selectCls}
                  required
                >
                  <option value="">Personel seçin...</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.position}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Rol">
                <input
                  type="text"
                  value={staffForm.role}
                  onChange={(e) =>
                    setStaffForm((f) => ({ ...f, role: e.target.value }))
                  }
                  placeholder={
                    staffTarget.staffRoles?.length
                      ? staffTarget.staffRoles.join(", ")
                      : "Barmen, Garson..."
                  }
                  className={inputCls}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vardiya">
                  <select
                    value={staffForm.shift}
                    onChange={(e) =>
                      setStaffForm((f) => ({ ...f, shift: e.target.value }))
                    }
                    className={selectCls}
                  >
                    {SHIFT_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tarih">
                  <input
                    type="date"
                    value={staffForm.date}
                    onChange={(e) =>
                      setStaffForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className={inputCls}
                    required
                  />
                </Field>
              </div>
              {staffError && <ErrorMsg msg={staffError} />}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStaffTarget(null);
                    setStaffError("");
                  }}
                  className={cancelBtnCls}
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  disabled={staffLoading}
                  className={submitBtnCls}
                >
                  {staffLoading ? "..." : "Ata"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
