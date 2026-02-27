"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ScrollText,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  User,
  Activity,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  MapPin,
  Wifi,
  WifiOff,
} from "lucide-react";

// ===== TYPES =====

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; username: string; role: string };
}

interface LoginSession {
  id: string;
  userId: string;
  loginAt: string;
  logoutAt: string | null;
  duration: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string;
  browser: string | null;
  os: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  isActive: boolean;
  lastSeenAt: string;
  user: { id: string; username: string; role: string };
}

type TabType = "audit" | "sessions";

// ===== CONSTANTS =====

const ENTITIES = [
  "User",
  "Cabana",
  "CabanaClass",
  "Concept",
  "Product",
  "ProductGroup",
  "Reservation",
  "CabanaPrice",
  "ConceptPrice",
  "SystemConfig",
  "Profile",
  "ExtraItem",
  "Session",
];

const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "LOGIN",
  "LOGOUT",
  "PROFILE_UPDATE",
  "CONFIG_CHANGE",
  "PRICE_UPDATE",
  "CANCEL_REQUEST",
  "MODIFY_REQUEST",
  "EXTRA_REQUEST",
  "EXTRA_ADD",
];

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-500/20 text-emerald-400",
  UPDATE: "bg-blue-500/20 text-blue-400",
  DELETE: "bg-red-500/20 text-red-400",
  APPROVE: "bg-green-500/20 text-green-400",
  REJECT: "bg-orange-500/20 text-orange-400",
  LOGIN: "bg-violet-500/20 text-violet-400",
  LOGOUT: "bg-fuchsia-500/20 text-fuchsia-400",
  PROFILE_UPDATE: "bg-cyan-500/20 text-cyan-400",
  CONFIG_CHANGE: "bg-amber-500/20 text-amber-400",
  PRICE_UPDATE: "bg-yellow-500/20 text-yellow-400",
  CANCEL_REQUEST: "bg-rose-500/20 text-rose-400",
  MODIFY_REQUEST: "bg-indigo-500/20 text-indigo-400",
  EXTRA_REQUEST: "bg-teal-500/20 text-teal-400",
  EXTRA_ADD: "bg-lime-500/20 text-lime-400",
};

const ENTITY_LABELS: Record<string, string> = {
  User: "Kullanıcı",
  Cabana: "Kabana",
  CabanaClass: "Sınıf",
  Concept: "Konsept",
  Product: "Ürün",
  ProductGroup: "Ürün Grubu",
  Reservation: "Rezervasyon",
  CabanaPrice: "Kabana Fiyat",
  ConceptPrice: "Konsept Fiyat",
  SystemConfig: "Sistem Ayarı",
  Profile: "Profil",
  ExtraItem: "Ekstra Ürün",
  Session: "Oturum",
};

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  DESKTOP: Monitor,
  MOBILE: Smartphone,
  TABLET: Tablet,
  UNKNOWN: Globe,
};

// ===== HELPERS =====

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}s ${m}dk`;
  if (m > 0) return `${m}dk ${s}sn`;
  return `${s}sn`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeSince(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}s önce`;
  return `${Math.floor(diff / 86400)}g önce`;
}

// ===== SUB-COMPONENTS =====

function JsonDiff({
  label,
  data,
}: {
  label: string;
  data: Record<string, unknown> | null;
}) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs text-neutral-500 mb-1 font-medium">{label}</p>
      <div className="bg-neutral-950 rounded-lg p-3 text-xs font-mono overflow-x-auto">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex gap-2 py-0.5">
            <span className="text-neutral-500 shrink-0">{key}:</span>
            <span className="text-neutral-300 break-all">
              {value === null
                ? "null"
                : typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-neutral-500">
        Sayfa {page} / {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) pageNum = i + 1;
          else if (page <= 3) pageNum = i + 1;
          else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
          else pageNum = page - 2 + i;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                page === pageNum
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ===== AUDIT TAB =====

function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (entity) params.set("entity", entity);
      if (action) params.set("action", action);
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/audit-logs?${params}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, entity, action, search, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const clearFilters = () => {
    setEntity("");
    setAction("");
    setSearch("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };
  const hasFilters = entity || action || search || startDate || endDate;

  return (
    <>
      {/* Filter toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">{total} kayıt</span>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            showFilters || hasFilters
              ? "bg-amber-500/20 text-amber-400"
              : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Filter className="w-3.5 h-3.5" /> Filtre
        </button>
      </div>

      {showFilters && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Ara..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <select
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">Tüm Varlıklar</option>
              {ENTITIES.map((e) => (
                <option key={e} value={e}>
                  {ENTITY_LABELS[e] || e}
                </option>
              ))}
            </select>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">Tüm İşlemler</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <Activity className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Kayıt bulunamadı</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;
              const hasDetails =
                (log.oldValue && Object.keys(log.oldValue).length > 0) ||
                (log.newValue && Object.keys(log.newValue).length > 0);
              return (
                <div key={log.id}>
                  <button
                    onClick={() =>
                      hasDetails && setExpandedId(isExpanded ? null : log.id)
                    }
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      hasDetails
                        ? "hover:bg-neutral-800/50 cursor-pointer"
                        : "cursor-default"
                    } ${isExpanded ? "bg-neutral-800/30" : ""}`}
                  >
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500 w-36 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {formatDate(log.createdAt)}
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 text-xs text-neutral-400 w-28 shrink-0">
                      <User className="w-3 h-3" />
                      <span className="truncate">{log.user.username}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${ACTION_COLORS[log.action] || "bg-neutral-700 text-neutral-300"}`}
                    >
                      {log.action}
                    </span>
                    <span className="text-sm text-neutral-300 shrink-0">
                      {ENTITY_LABELS[log.entity] || log.entity}
                    </span>
                    <span className="text-xs text-neutral-600 font-mono truncate flex-1 min-w-0">
                      {log.entityId}
                    </span>
                    <span className="sm:hidden text-xs text-neutral-600">
                      {new Date(log.createdAt).toLocaleString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {hasDetails &&
                      (isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-neutral-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                      ))}
                  </button>
                  {isExpanded && hasDetails && (
                    <div className="px-4 pb-4 pt-1">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <JsonDiff label="Önceki Değer" data={log.oldValue} />
                        <JsonDiff label="Yeni Değer" data={log.newValue} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  );
}

// ===== SESSIONS TAB =====

function SessionsTab() {
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deviceType, setDeviceType] = useState("");
  const [isActive, setIsActive] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (deviceType) params.set("deviceType", deviceType);
      if (isActive) params.set("isActive", isActive);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/auth/sessions?${params}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setSessions(data.sessions);
      setTotal(data.total);
    } catch {
      setSessions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, deviceType, isActive, startDate, endDate]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const clearFilters = () => {
    setDeviceType("");
    setIsActive("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };
  const hasFilters = deviceType || isActive || startDate || endDate;

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">{total} oturum</span>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            showFilters || hasFilters
              ? "bg-amber-500/20 text-amber-400"
              : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Filter className="w-3.5 h-3.5" /> Filtre
        </button>
      </div>

      {showFilters && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={deviceType}
              onChange={(e) => {
                setDeviceType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">Tüm Cihazlar</option>
              <option value="DESKTOP">Masaüstü</option>
              <option value="MOBILE">Mobil</option>
              <option value="TABLET">Tablet</option>
            </select>
            <select
              value={isActive}
              onChange={(e) => {
                setIsActive(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">Tüm Durumlar</option>
              <option value="true">Aktif</option>
              <option value="false">Kapalı</option>
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      )}

      {/* Sessions list */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <Globe className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Oturum kaydı bulunamadı</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {sessions.map((s) => {
              const DevIcon = DEVICE_ICONS[s.deviceType] || Globe;
              const liveDuration = s.isActive
                ? Math.floor(
                    (Date.now() - new Date(s.loginAt).getTime()) / 1000,
                  )
                : s.duration;
              return (
                <div
                  key={s.id}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                >
                  {/* Status indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    {s.isActive ? (
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <WifiOff className="w-3.5 h-3.5 text-neutral-600" />
                    )}
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        s.isActive
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-neutral-700/50 text-neutral-500"
                      }`}
                    >
                      {s.isActive ? "Aktif" : "Kapalı"}
                    </span>
                  </div>

                  {/* User */}
                  <div className="flex items-center gap-1.5 text-sm text-neutral-300 w-28 shrink-0">
                    <User className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="truncate">{s.user.username}</span>
                  </div>

                  {/* Device */}
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 w-40 shrink-0">
                    <DevIcon className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {s.browser || "?"} / {s.os || "?"}
                    </span>
                  </div>

                  {/* IP */}
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-mono w-32 shrink-0">
                    <Globe className="w-3 h-3" />
                    <span className="truncate">{s.ipAddress || "-"}</span>
                  </div>

                  {/* Location */}
                  {(s.city || s.country) && (
                    <div className="flex items-center gap-1 text-xs text-neutral-500 shrink-0">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {[s.city, s.country].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}

                  {/* Duration */}
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(liveDuration)}</span>
                  </div>

                  {/* Time */}
                  <div className="flex-1 text-right">
                    <span className="text-xs text-neutral-600">
                      {formatDate(s.loginAt)}
                    </span>
                    {s.isActive && (
                      <span className="ml-2 text-xs text-emerald-500/70">
                        Son: {timeSince(s.lastSeenAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  );
}

// ===== MAIN PAGE =====

export default function AuditTrailPage() {
  const [tab, setTab] = useState<TabType>("audit");

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <ScrollText className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-100">
              Audit Trail
            </h1>
            <p className="text-xs text-neutral-500">
              Sistem aktivite ve oturum kayıtları
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("audit")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-colors ${
            tab === "audit"
              ? "bg-amber-500/20 text-amber-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Aktiviteler
        </button>
        <button
          onClick={() => setTab("sessions")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-colors ${
            tab === "sessions"
              ? "bg-amber-500/20 text-amber-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Monitor className="w-3.5 h-3.5" /> Oturumlar
        </button>
      </div>

      {/* Tab content */}
      {tab === "audit" ? <AuditTab /> : <SessionsTab />}
    </div>
  );
}
