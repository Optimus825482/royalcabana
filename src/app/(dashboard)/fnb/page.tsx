"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import WeatherWidget from "@/components/shared/WeatherWidget";
import {
  Plus,
  Clock,
  Check,
  X,
  ChefHat,
  Truck,
  Ban,
  Package,
  Filter,
  StickyNote,
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

interface FnbOrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  product: { name: string };
}

interface FnbOrder {
  id: string;
  reservationId: string;
  cabanaId: string;
  status: "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  reservation: {
    guestName: string;
    cabana: { name: string };
  };
  items: FnbOrderItem[];
}

interface Reservation {
  id: string;
  cabanaId: string;
  guestName: string;
  status: string;
  cabana: { id: string; name: string };
}

interface Product {
  id: string;
  name: string;
  salePrice: string;
  isActive: boolean;
  groupId: string | null;
  group: { id: string; name: string } | null;
}

interface OrderLineItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

// ── Constants ──

type StatusKey = FnbOrder["status"];

const STATUS_CONFIG: Record<
  StatusKey,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    Icon: typeof Clock;
  }
> = {
  PREPARING: {
    label: "Hazırlanıyor",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    Icon: ChefHat,
  },
  READY: {
    label: "Hazır",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    Icon: Package,
  },
  DELIVERED: {
    label: "Teslim Edildi",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    Icon: Check,
  },
  CANCELLED: {
    label: "İptal",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    Icon: Ban,
  },
};

const FILTER_TABS: { key: StatusKey | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tümü" },
  { key: "PREPARING", label: "Hazırlanıyor" },
  { key: "READY", label: "Hazır" },
  { key: "DELIVERED", label: "Teslim Edildi" },
  { key: "CANCELLED", label: "İptal" },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

function orderTotal(items: FnbOrderItem[]): number {
  return items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
}

// ── Fetchers ──

async function fetchOrders(
  today: boolean,
  status: string | null,
  cabanaId: string | null,
): Promise<FnbOrder[]> {
  const params = new URLSearchParams({ limit: "200" });
  if (today) params.set("today", "true");
  if (status && status !== "ALL") params.set("status", status);
  if (cabanaId) params.set("cabanaId", cabanaId);
  const res = await fetch(`/api/fnb/orders?${params}`);
  if (!res.ok) throw new Error("Siparişler yüklenemedi");
  const data = await res.json();
  return data.orders ?? data;
}

async function fetchActiveReservations(): Promise<{
  reservations: Reservation[];
}> {
  const params = new URLSearchParams({ limit: "200" });
  // Fetch CHECKED_IN and APPROVED reservations
  const [checkedIn, approved] = await Promise.all([
    fetch(`/api/reservations?status=CHECKED_IN&${params}`).then((r) =>
      r.json(),
    ),
    fetch(`/api/reservations?status=APPROVED&${params}`).then((r) => r.json()),
  ]);
  return {
    reservations: [
      ...(checkedIn.reservations ?? []),
      ...(approved.reservations ?? []),
    ],
  };
}

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products?active=true");
  if (!res.ok) throw new Error("Ürünler yüklenemedi");
  return res.json();
}

// ── Status Badge ──

function StatusBadge({ status }: { status: StatusKey }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${cfg.bg} ${cfg.color} ${cfg.border} border`}
    >
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Order Card ──

function OrderCard({
  order,
  onStatusChange,
  isUpdating,
}: {
  order: FnbOrder;
  onStatusChange: (id: string, status: StatusKey) => void;
  isUpdating: boolean;
}) {
  const total = orderTotal(order.items);
  const cfg = STATUS_CONFIG[order.status];

  return (
    <div
      className={`bg-neutral-900 border rounded-lg overflow-hidden transition-colors ${cfg.border}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-100 truncate">
            {order.reservation.cabana.name}
          </p>
          <p className="text-xs text-neutral-500 truncate">
            {order.reservation.guestName}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Items */}
      <div className="px-4 pb-3">
        <ul className="space-y-1">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-neutral-300 truncate">
                {item.product.name}
                <span className="text-neutral-500"> × {item.quantity}</span>
              </span>
              <span className="text-neutral-400 shrink-0 ml-2">
                {formatCurrency(Number(item.unitPrice) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800">
          <span className="text-xs text-neutral-500">Toplam</span>
          <span className="text-sm font-semibold text-yellow-400">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="px-4 pb-3">
          <div className="flex items-start gap-1.5 text-xs text-neutral-500 bg-neutral-800/50 rounded-md px-2.5 py-1.5">
            <StickyNote className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{order.notes}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-950/40 border-t border-neutral-800">
        <span className="text-xs text-neutral-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {relativeTime(order.createdAt)}
        </span>

        <div className="flex items-center gap-2">
          {order.status === "PREPARING" && (
            <>
              <button
                onClick={() => onStatusChange(order.id, "READY")}
                disabled={isUpdating}
                className="min-h-[32px] px-3 py-1 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors"
              >
                Hazır
              </button>
              <button
                onClick={() => onStatusChange(order.id, "CANCELLED")}
                disabled={isUpdating}
                className="min-h-[32px] px-3 py-1 text-xs font-medium rounded-md bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 border border-red-500/30 transition-colors"
              >
                İptal
              </button>
            </>
          )}
          {order.status === "READY" && (
            <button
              onClick={() => onStatusChange(order.id, "DELIVERED")}
              disabled={isUpdating}
              className="min-h-[32px] px-3 py-1 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors"
            >
              <Truck className="w-3 h-3 inline mr-1" />
              Teslim Et
            </button>
          )}
          {order.status === "DELIVERED" && (
            <span className="text-emerald-400">
              <Check className="w-4 h-4" />
            </span>
          )}
          {order.status === "CANCELLED" && (
            <span className="text-red-400">
              <X className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Order Modal ──

function NewOrderModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reservationId, setReservationId] = useState("");
  const [cabanaId, setCabanaId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<OrderLineItem[]>([]);
  const [error, setError] = useState("");

  const { data: reservationData, isLoading: resLoading } = useQuery({
    queryKey: ["reservations-active"],
    queryFn: fetchActiveReservations,
  });

  const { data: products, isLoading: prodLoading } = useQuery({
    queryKey: ["products-and-groups"],
    queryFn: fetchProducts,
  });

  const reservations = reservationData?.reservations ?? [];

  const handleReservationChange = useCallback(
    (id: string) => {
      setReservationId(id);
      const rez = reservations.find((r) => r.id === id);
      if (rez) setCabanaId(rez.cabanaId);
    },
    [reservations],
  );

  const handleQuantityChange = useCallback(
    (productId: string, qty: number) => {
      setLines((prev) => {
        if (qty <= 0) return prev.filter((l) => l.productId !== productId);
        const existing = prev.find((l) => l.productId === productId);
        if (existing) {
          return prev.map((l) =>
            l.productId === productId ? { ...l, quantity: qty } : l,
          );
        }
        const product = products?.find((p) => p.id === productId);
        if (!product) return prev;
        return [
          ...prev,
          {
            productId,
            name: product.name,
            unitPrice: Number(product.salePrice),
            quantity: qty,
          },
        ];
      });
    },
    [products],
  );

  const grandTotal = lines.reduce(
    (sum, l) => sum + l.unitPrice * l.quantity,
    0,
  );

  const activeLines = lines.filter((l) => l.quantity > 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/fnb/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId,
          cabanaId,
          notes: notes.trim() || undefined,
          items: activeLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Sipariş oluşturulamadı");
      }
      return res.json();
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const canSubmit =
    reservationId && cabanaId && activeLines.length > 0 && !mutation.isPending;

  // Group products by their group
  const groupedProducts = useMemo(() => {
    if (!products) return [];
    const groups = new Map<string, { name: string; products: Product[] }>();
    for (const p of products) {
      const gKey = p.group?.id ?? "__ungrouped";
      const gName = p.group?.name ?? "Diğer";
      if (!groups.has(gKey)) groups.set(gKey, { name: gName, products: [] });
      groups.get(gKey)!.products.push(p);
    }
    return Array.from(groups.values());
  }, [products]);

  return (
    <Modal title="Yeni Sipariş" onClose={onClose}>
      <div className="space-y-4">
        {error && <ErrorMsg msg={error} />}

        {/* Reservation Select */}
        <Field label="Rezervasyon">
          <select
            className={selectCls}
            value={reservationId}
            onChange={(e) => handleReservationChange(e.target.value)}
            disabled={resLoading}
          >
            <option value="">
              {resLoading ? "Yükleniyor..." : "Rezervasyon seçin"}
            </option>
            {reservations.map((r) => (
              <option key={r.id} value={r.id}>
                {r.cabana.name} — {r.guestName}
              </option>
            ))}
          </select>
        </Field>

        {/* Product List */}
        <Field label="Ürünler">
          {prodLoading ? (
            <p className="text-xs text-neutral-500">Ürünler yükleniyor...</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
              {groupedProducts.map((group) => (
                <div key={group.name}>
                  <p className="text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">
                    {group.name}
                  </p>
                  <div className="space-y-1">
                    {group.products.map((product) => {
                      const line = lines.find(
                        (l) => l.productId === product.id,
                      );
                      const qty = line?.quantity ?? 0;
                      const lineTotal = qty * Number(product.salePrice);
                      return (
                        <div
                          key={product.id}
                          className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-neutral-800/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-neutral-200 truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {formatCurrency(Number(product.salePrice))}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(
                                  product.id,
                                  Math.max(0, qty - 1),
                                )
                              }
                              className="w-7 h-7 flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm transition-colors"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={qty}
                              onChange={(e) =>
                                handleQuantityChange(
                                  product.id,
                                  Math.max(0, parseInt(e.target.value) || 0),
                                )
                              }
                              className="w-10 h-7 text-center text-sm bg-neutral-800 border border-neutral-700 rounded text-neutral-100 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(product.id, qty + 1)
                              }
                              className="w-7 h-7 flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm transition-colors"
                            >
                              +
                            </button>
                          </div>
                          {qty > 0 && (
                            <span className="text-xs text-yellow-400 w-16 text-right shrink-0">
                              {formatCurrency(lineTotal)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Field>

        {/* Order Total */}
        {activeLines.length > 0 && (
          <div className="flex items-center justify-between py-3 px-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
            <span className="text-sm text-neutral-300">
              Sipariş Toplamı ({activeLines.length} kalem)
            </span>
            <span className="text-lg font-bold text-yellow-400">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        )}

        {/* Notes */}
        <Field label="Notlar (opsiyonel)">
          <textarea
            className={`${inputCls} min-h-[60px] resize-none`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Sipariş notu..."
            rows={2}
          />
        </Field>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={cancelBtnCls}>
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className={submitBtnCls}
          >
            {mutation.isPending ? "Oluşturuluyor..." : "Sipariş Oluştur"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Daily Summary ──

function DailySummary({ orders }: { orders: FnbOrder[] }) {
  const stats = useMemo(() => {
    const byStatus: Record<StatusKey, number> = {
      PREPARING: 0,
      READY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    let totalRevenue = 0;

    for (const order of orders) {
      byStatus[order.status]++;
      if (order.status === "DELIVERED") {
        totalRevenue += orderTotal(order.items);
      }
    }

    return { total: orders.length, totalRevenue, byStatus };
  }, [orders]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <h2 className="text-sm font-medium text-neutral-300 mb-3">Günlük Özet</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Orders */}
        <div className="bg-neutral-800/50 rounded-lg px-3 py-2.5">
          <p className="text-xs text-neutral-500">Toplam Sipariş</p>
          <p className="text-lg font-bold text-neutral-100">{stats.total}</p>
        </div>
        {/* Revenue */}
        <div className="bg-neutral-800/50 rounded-lg px-3 py-2.5">
          <p className="text-xs text-neutral-500">Gelir (Teslim)</p>
          <p className="text-lg font-bold text-yellow-400">
            {formatCurrency(stats.totalRevenue)}
          </p>
        </div>
        {/* By Status */}
        {(Object.keys(stats.byStatus) as StatusKey[]).map((key) => {
          const cfg = STATUS_CONFIG[key];
          return (
            <div key={key} className="bg-neutral-800/50 rounded-lg px-3 py-2.5">
              <p className="text-xs text-neutral-500">{cfg.label}</p>
              <p className={`text-lg font-bold ${cfg.color}`}>
                {stats.byStatus[key]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Skeleton ──

function OrdersSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-48 rounded-lg bg-neutral-900 border border-neutral-800 animate-pulse"
        />
      ))}
    </div>
  );
}

// ── Main Page ──

export default function FnbPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusKey | "ALL">("ALL");
  const [todayOnly, setTodayOnly] = useState(true);
  const [cabanaFilter, setCabanaFilter] = useState("");

  // Fetch orders with auto-refresh
  const {
    data: orders = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["fnb-orders", todayOnly, statusFilter, cabanaFilter],
    queryFn: () =>
      fetchOrders(
        todayOnly,
        statusFilter !== "ALL" ? statusFilter : null,
        cabanaFilter || null,
      ),
    refetchInterval: 30_000,
  });

  // Unique cabanas from orders for filter dropdown
  const cabanaOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) {
      map.set(o.cabanaId, o.reservation.cabana.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, "tr"),
    );
  }, [orders]);

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusKey }) => {
      const res = await fetch(`/api/fnb/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Durum güncellenemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fnb-orders"] });
    },
  });

  const handleStatusChange = useCallback(
    (id: string, status: StatusKey) => {
      statusMutation.mutate({ id, status });
    },
    [statusMutation],
  );

  const handleOrderSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["fnb-orders"] });
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-yellow-400">
            F&B Sipariş Yönetimi
          </h1>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <WeatherWidget />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 text-neutral-950 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Sipariş
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 flex-wrap flex-1">
            {FILTER_TABS.map((tab) => {
              const isActive = statusFilter === tab.key;
              const cfg = tab.key !== "ALL" ? STATUS_CONFIG[tab.key] : null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? cfg
                        ? `${cfg.bg} ${cfg.color} ${cfg.border} border`
                        : "bg-yellow-600/20 text-yellow-400 border border-yellow-500/30"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Today Toggle */}
          <button
            onClick={() => setTodayOnly((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors shrink-0 ${
              todayOnly
                ? "bg-yellow-600/20 text-yellow-400 border-yellow-500/30"
                : "text-neutral-400 border-neutral-700 hover:text-neutral-200"
            }`}
          >
            <Clock className="w-3 h-3" />
            Sadece Bugün
          </button>

          {/* Cabana Filter */}
          {cabanaOptions.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Filter className="w-3 h-3 text-neutral-500" />
              <select
                value={cabanaFilter}
                onChange={(e) => setCabanaFilter(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-md text-xs px-2 py-1.5 outline-none min-h-[32px]"
              >
                <option value="">Tüm Kabanalar</option>
                {cabanaOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Orders Grid */}
        {isLoading && <OrdersSkeleton />}

        {isError && (
          <ErrorMsg msg="Siparişler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin." />
        )}

        {!isLoading && !isError && orders.length === 0 && (
          <div className="text-center py-16">
            <ChefHat className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">
              {statusFilter !== "ALL"
                ? `"${STATUS_CONFIG[statusFilter].label}" durumunda sipariş bulunamadı.`
                : "Henüz sipariş bulunmuyor."}
            </p>
          </div>
        )}

        {!isLoading && !isError && orders.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                isUpdating={statusMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Daily Summary */}
        {!isLoading && !isError && orders.length > 0 && todayOnly && (
          <DailySummary orders={orders} />
        )}

        {/* New Order Modal */}
        {showModal && (
          <NewOrderModal
            onClose={() => setShowModal(false)}
            onSuccess={handleOrderSuccess}
          />
        )}
      </div>
    </div>
  );
}
