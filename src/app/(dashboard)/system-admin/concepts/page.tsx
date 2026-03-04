"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  selectCls,
  cancelBtnCls,
  submitBtnCls,
  primaryBtnCls,
  dangerBtnCls,
  dangerSoftBtnCls,
  editBtnCls,
  ghostBtnCls,
} from "@/components/shared/FormComponents";
import PermissionGate from "@/components/shared/PermissionGate";
import {
  formatPrice,
  currencySymbol,
  fetchSystemCurrency,
  type CurrencyCode,
  DEFAULT_CURRENCY,
} from "@/lib/currency";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Product {
  id: string;
  name: string;
  salePrice: number;
  isActive: boolean;
  groupId: string | null;
  group: { id: string; name: string; sortOrder: number } | null;
}

interface ConceptProduct {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
}

interface CabanaClass {
  id: string;
  name: string;
}

interface Concept {
  id: string;
  name: string;
  description: string;
  serviceFee: number;
  classId: string | null;
  cabanaClass: CabanaClass | null;
  products: ConceptProduct[];
  extraServices: ConceptExtraService[];
  _count: { cabanas: number };
}

interface SelectedProduct {
  id: string;
  name: string;
  salePrice: number;
  quantity: number;
}

interface ExtraServiceItem {
  id: string;
  name: string;
  category: string | null;
  prices: { id: string; price: string; effectiveFrom: string }[];
}

interface ConceptExtraService {
  id: string;
  extraServiceId: string;
  quantity: number;
  extraService: ExtraServiceItem;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function conceptTotalValue(concept: Concept): number {
  const productsTotal = concept.products.reduce(
    (sum, cp) => sum + parseFloat(String(cp.product.salePrice)) * cp.quantity,
    0,
  );
  const extraServicesTotal = (concept.extraServices ?? []).reduce(
    (sum, ces) => {
      const price = ces.extraService?.prices?.[0]?.price;
      return sum + (price ? parseFloat(String(price)) : 0) * ces.quantity;
    },
    0,
  );
  return (
    productsTotal +
    extraServicesTotal +
    parseFloat(String(concept.serviceFee ?? 0))
  );
}

const SERVICE_GROUP_NAMES = [
  "Hizmetler",
  "Eğlence & Aktivite",
  "Spa & Wellness",
];

const defaultCreateForm = {
  name: "",
  description: "",
  classId: "",
  serviceFee: "",
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ConceptsPage() {
  const queryClient = useQueryClient();

  /* ---- Data fetching ---- */
  const { data: currency = DEFAULT_CURRENCY } = useQuery<CurrencyCode>({
    queryKey: ["system-currency"],
    queryFn: fetchSystemCurrency,
  });

  const {
    data: conceptsData,
    isLoading: loading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ["concepts-admin"],
    queryFn: async () => {
      const [cRes, clRes, pRes, esRes] = await Promise.all([
        fetch("/api/concepts"),
        fetch("/api/classes"),
        fetch("/api/products"),
        fetch("/api/extra-services?activeOnly=true"),
      ]);
      if (!cRes.ok) throw new Error("Konseptler yüklenemedi.");
      const cJson = await cRes.json();
      const clJson = clRes.ok ? await clRes.json() : [];
      const pJson = pRes.ok ? await pRes.json() : [];
      const esData = esRes.ok ? await esRes.json() : { data: [] };
      const cResolved = cJson.data ?? cJson;
      const clResolved = clJson.data ?? clJson;
      const pResolved = pJson.data ?? pJson;
      const esResolved = esData.data ?? esData;
      return {
        concepts: Array.isArray(cResolved) ? cResolved as Concept[] : [],
        classes: Array.isArray(clResolved) ? clResolved as CabanaClass[] : [],
        products: Array.isArray(pResolved) ? pResolved as Product[] : [],
        extraServices: Array.isArray(esResolved) ? esResolved as ExtraServiceItem[] : [],
      };
    },
  });

  const concepts = conceptsData?.concepts ?? [];
  const classes = conceptsData?.classes ?? [];
  const products = useMemo(
    () => conceptsData?.products ?? [],
    [conceptsData?.products],
  );
  const extraServices = useMemo(
    () => conceptsData?.extraServices ?? [],
    [conceptsData?.extraServices],
  );

  /* ---- UI state ---- */
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [contentConcept, setContentConcept] = useState<Concept | null>(null);
  const [contentTab, setContentTab] = useState<"products" | "extraServices">(
    "products",
  );

  /* ---- Create modal ---- */
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    [],
  );

  /* ---- Edit modal ---- */
  const [editConcept, setEditConcept] = useState<Concept | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    classId: "",
    serviceFee: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  /* ---- Delete confirm ---- */
  const [deleteConcept, setDeleteConcept] = useState<Concept | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  /* ---- Add product per concept (inline) ---- */
  const [addProductForms, setAddProductForms] = useState<
    Record<string, string>
  >({});
  const [addProductLoading, setAddProductLoading] = useState<
    Record<string, boolean>
  >({});
  const [addProductError, setAddProductError] = useState<
    Record<string, string>
  >({});

  /* ---- Quantity update loading indicator ---- */
  const [qtyUpdating, setQtyUpdating] = useState<Record<string, boolean>>({});

  /* ---- Product search in create modal ---- */
  const [productSearch, setProductSearch] = useState("");

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  /* ---- Create modal: product picker helpers ---- */
  const createRunningTotal = useMemo(() => {
    const productsTotal = selectedProducts.reduce(
      (sum, sp) => sum + parseFloat(String(sp.salePrice)) * sp.quantity,
      0,
    );
    const fee = parseFloat(createForm.serviceFee) || 0;
    return productsTotal + fee;
  }, [selectedProducts, createForm.serviceFee]);

  const filteredProducts = useMemo(() => {
    const active = products.filter((p) => p.isActive);
    if (!productSearch.trim()) return active;
    const q = productSearch.toLowerCase();
    return active.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const toggleProduct = useCallback((product: Product) => {
    setSelectedProducts((prev) => {
      const exists = prev.find((sp) => sp.id === product.id);
      if (exists) return prev.filter((sp) => sp.id !== product.id);
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          salePrice: parseFloat(String(product.salePrice)),
          quantity: 1,
        },
      ];
    });
  }, []);

  const updateSelectedQuantity = useCallback(
    (productId: string, quantity: number) => {
      setSelectedProducts((prev) =>
        prev.map((sp) =>
          sp.id === productId ? { ...sp, quantity: Math.max(1, quantity) } : sp,
        ),
      );
    },
    [],
  );

  /* ---- Clone: open create modal pre-filled ---- */
  function openClone(concept: Concept) {
    setCreateForm({
      name: `Kopya - ${concept.name}`,
      description: concept.description,
      classId: concept.classId ?? "",
      serviceFee: String(parseFloat(String(concept.serviceFee)) || 0),
    });
    setSelectedProducts(
      concept.products.map((cp) => ({
        id: cp.productId,
        name: cp.product.name,
        salePrice: parseFloat(String(cp.product.salePrice)),
        quantity: cp.quantity,
      })),
    );
    setCreateError("");
    setProductSearch("");
    setShowCreate(true);
  }

  /* ================================================================ */
  /*  CRUD Handlers                                                    */
  /* ================================================================ */

  /* ---- Create ---- */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      // 1) Create concept with productIds
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          classId: createForm.classId || undefined,
          serviceFee: createForm.serviceFee
            ? parseFloat(createForm.serviceFee)
            : 0,
          productIds: selectedProducts.map((p) => p.id),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Konsept oluşturulamadı.");
      }
      const created = await res.json();

      // 2) Update quantities for products that aren't 1
      const qtyUpdates = selectedProducts.filter((sp) => sp.quantity > 1);
      if (qtyUpdates.length > 0) {
        await Promise.all(
          qtyUpdates.map((sp) =>
            fetch(`/api/concepts/${created.id}/products`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId: sp.id, quantity: sp.quantity }),
            }),
          ),
        );
      }

      setShowCreate(false);
      setCreateForm(defaultCreateForm);
      setSelectedProducts([]);
      setProductSearch("");
      showSuccess("Konsept başarıyla oluşturuldu.");
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setCreateLoading(false);
    }
  }

  /* ---- Edit ---- */
  function openEdit(concept: Concept) {
    setEditConcept(concept);
    setEditForm({
      name: concept.name,
      description: concept.description,
      classId: concept.classId ?? "",
      serviceFee: String(parseFloat(String(concept.serviceFee)) || 0),
    });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editConcept) return;
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/concepts/${editConcept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          classId: editForm.classId || null,
          serviceFee: editForm.serviceFee ? parseFloat(editForm.serviceFee) : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Konsept güncellenemedi.");
      }
      setEditConcept(null);
      showSuccess("Konsept başarıyla güncellendi.");
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setEditLoading(false);
    }
  }

  /* ---- Delete ---- */
  async function handleDelete() {
    if (!deleteConcept) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/concepts/${deleteConcept.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Konsept silinemedi.");
      setDeleteConcept(null);
      showSuccess("Konsept silindi.");
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setDeleteLoading(false);
    }
  }

  /* ---- Add product (inline in expanded panel) ---- */
  async function handleAddProduct(conceptId: string) {
    const productId = addProductForms[conceptId];
    if (!productId) return;
    setAddProductLoading((p) => ({ ...p, [conceptId]: true }));
    setAddProductError((p) => ({ ...p, [conceptId]: "" }));
    try {
      const res = await fetch(`/api/concepts/${conceptId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Ürün eklenemedi.");
      }
      setAddProductForms((p) => ({ ...p, [conceptId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setAddProductError((p) => ({
        ...p,
        [conceptId]: e instanceof Error ? e.message : "Bir hata oluştu.",
      }));
    } finally {
      setAddProductLoading((p) => ({ ...p, [conceptId]: false }));
    }
  }

  /* ---- Remove product ---- */
  async function handleRemoveProduct(conceptId: string, productId: string) {
    try {
      const res = await fetch(`/api/concepts/${conceptId}/products`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Ürün kaldırılamadı.");
      }
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    }
  }

  /* ---- Update product quantity (inline) ---- */
  async function updateConceptProductQty(
    conceptId: string,
    productId: string,
    newQty: number,
  ) {
    if (newQty < 1) return;
    const key = `${conceptId}-${productId}`;
    setQtyUpdating((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch(`/api/concepts/${conceptId}/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: newQty }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Miktar güncellenemedi.");
      }
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setTimeout(() => setQtyUpdating((p) => ({ ...p, [key]: false })), 600);
    }
  }

  /* ---- Available products for inline add (exclude service groups) ---- */
  function availableProducts(concept: Concept) {
    const addedIds = new Set(concept.products.map((cp) => cp.productId));
    return products.filter(
      (p) =>
        p.isActive &&
        !addedIds.has(p.id) &&
        !SERVICE_GROUP_NAMES.includes(p.group?.name ?? ""),
    );
  }

  /* ---- Service-type products (from service groups) for extra services tab ---- */
  function availableServiceProducts(concept: Concept) {
    const addedIds = new Set(concept.products.map((cp) => cp.productId));
    return products.filter(
      (p) =>
        p.isActive &&
        !addedIds.has(p.id) &&
        SERVICE_GROUP_NAMES.includes(p.group?.name ?? ""),
    );
  }

  /* ---- Existing service-type products already in concept ---- */
  function existingServiceProducts(concept: Concept) {
    return concept.products.filter((cp) => {
      const fullProduct = products.find((p) => p.id === cp.productId);
      return SERVICE_GROUP_NAMES.includes(fullProduct?.group?.name ?? "");
    });
  }

  /* ---- Existing non-service products (for products tab) ---- */
  function existingNonServiceProducts(concept: Concept) {
    return concept.products.filter((cp) => {
      const fullProduct = products.find((p) => p.id === cp.productId);
      return !SERVICE_GROUP_NAMES.includes(fullProduct?.group?.name ?? "");
    });
  }

  /* ---- Available extra services for inline add ---- */
  function availableExtraServices(concept: Concept) {
    const addedIds = new Set(
      (concept.extraServices ?? []).map((ces) => ces.extraServiceId),
    );
    return extraServices.filter((es) => !addedIds.has(es.id));
  }

  /* ---- Add extra service ---- */
  const [addEsForm, setAddEsForm] = useState<Record<string, string>>({});
  const [addEsLoading, setAddEsLoading] = useState<Record<string, boolean>>({});
  const [addEsError, setAddEsError] = useState<Record<string, string>>({});

  /* ---- Searchable product/service dropdowns ---- */
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productDropdownSearch, setProductDropdownSearch] = useState("");
  const [esDropdownOpen, setEsDropdownOpen] = useState(false);
  const [esDropdownSearch, setEsDropdownSearch] = useState("");

  /* Close dropdowns on outside click */
  useEffect(() => {
    if (!productDropdownOpen && !esDropdownOpen) return;
    const handler = () => {
      setProductDropdownOpen(false);
      setEsDropdownOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [productDropdownOpen, esDropdownOpen]);

  async function handleAddExtraService(conceptId: string) {
    const extraServiceId = addEsForm[conceptId];
    if (!extraServiceId) return;
    setAddEsLoading((p) => ({ ...p, [conceptId]: true }));
    setAddEsError((p) => ({ ...p, [conceptId]: "" }));
    try {
      const res = await fetch(`/api/concepts/${conceptId}/extra-services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraServiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hizmet eklenemedi.");
      setAddEsForm((p) => ({ ...p, [conceptId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setAddEsError((p) => ({
        ...p,
        [conceptId]: e instanceof Error ? e.message : "Bir hata oluştu.",
      }));
    } finally {
      setAddEsLoading((p) => ({ ...p, [conceptId]: false }));
    }
  }

  /* ---- Remove extra service ---- */
  async function handleRemoveExtraService(
    conceptId: string,
    extraServiceId: string,
  ) {
    try {
      const res = await fetch(`/api/concepts/${conceptId}/extra-services`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraServiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hizmet kaldırılamadı.");
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    }
  }

  /* ---- Update extra service quantity ---- */
  const [esQtyUpdating, setEsQtyUpdating] = useState<Record<string, boolean>>(
    {},
  );

  async function updateExtraServiceQty(
    conceptId: string,
    extraServiceId: string,
    newQty: number,
  ) {
    if (newQty < 1) return;
    const key = `${conceptId}-${extraServiceId}`;
    setEsQtyUpdating((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch(`/api/concepts/${conceptId}/extra-services`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraServiceId, quantity: newQty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Miktar güncellenemedi.");
      queryClient.invalidateQueries({ queryKey: ["concepts-admin"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setTimeout(() => setEsQtyUpdating((p) => ({ ...p, [key]: false })), 600);
    }
  }

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */

  return (
    <div className="text-neutral-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-yellow-400">
            Konsept Yönetimi
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Cabana konseptlerini ve ürünlerini yönetin
          </p>
        </div>
        <PermissionGate permission="concept.create">
          <button
            onClick={() => {
              setShowCreate(true);
              setCreateError("");
              setCreateForm(defaultCreateForm);
              setSelectedProducts([]);
              setProductSearch("");
            }}
            className={primaryBtnCls}
          >
            + Yeni Konsept
          </button>
        </PermissionGate>
      </div>

      {/* Toast messages */}
      {success && (
        <div className="mb-4 px-4 py-2.5 bg-green-950/50 border border-green-700/40 text-green-400 text-sm rounded-lg">
          {success}
        </div>
      )}
      {(error || queryError) && (
        <div className="mb-4 px-4 py-2.5 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg">
          {error || String(queryError)}
        </div>
      )}

      {/* Concepts list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Yükleniyor...
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-red-400 text-sm">
            {(queryError as Error)?.message ??
              "Veriler yüklenirken bir hata oluştu."}
          </p>
        </div>
      ) : concepts.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          Henüz konsept yok.
        </div>
      ) : (
        <div className="space-y-3">
          {concepts.map((concept) => {
            const totalValue = conceptTotalValue(concept);
            return (
              <div
                key={concept.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
              >
                {/* Concept row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-100 truncate">
                        {concept.name}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">
                        {concept.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {concept.cabanaClass && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-950/40 text-yellow-500 border border-yellow-800/30">
                          {concept.cabanaClass.name}
                        </span>
                      )}
                      <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                        {concept.products.length} ürün
                      </span>
                      {(concept.extraServices?.length ?? 0) > 0 && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-950/40 text-purple-400 border border-purple-800/30">
                          {concept.extraServices.length} hizmet
                        </span>
                      )}
                      <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                        {concept._count.cabanas} Cabana
                      </span>
                      {Number(concept.serviceFee) > 0 && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-green-950/40 text-green-400 border border-green-800/30">
                          Hizmet:{" "}
                          {formatPrice(Number(concept.serviceFee), currency)}
                        </span>
                      )}
                      {/* Summary: total value badge */}
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-950/40 text-amber-400 border border-amber-800/30 font-semibold">
                        Toplam: {formatPrice(totalValue, currency)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => {
                        setContentConcept(concept);
                        setContentTab("products");
                      }}
                      className={ghostBtnCls}
                    >
                      İçerik
                    </button>
                    <PermissionGate permission="concept.create">
                      <button
                        onClick={() => openClone(concept)}
                        className={ghostBtnCls}
                        title="Kopyala"
                      >
                        Kopyala
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="concept.update">
                      <button
                        onClick={() => openEdit(concept)}
                        className={editBtnCls}
                      >
                        Düzenle
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="concept.delete">
                      <button
                        onClick={() => {
                          setDeleteConcept(concept);
                          setDeleteError("");
                        }}
                        className={dangerSoftBtnCls}
                      >
                        Sil
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/*  Content Modal (Ürünler + Ekstra Hizmetler)                    */}
      {/* ============================================================ */}
      {contentConcept &&
        (() => {
          const concept =
            concepts.find((c) => c.id === contentConcept.id) ?? contentConcept;
          const nonSvcProducts = existingNonServiceProducts(concept);
          const svcProducts = existingServiceProducts(concept);
          const esItems = concept.extraServices ?? [];

          const nonSvcTotal = nonSvcProducts.reduce(
            (s, cp) =>
              s + parseFloat(String(cp.product.salePrice)) * cp.quantity,
            0,
          );
          const svcTotal = svcProducts.reduce(
            (s, cp) =>
              s + parseFloat(String(cp.product.salePrice)) * cp.quantity,
            0,
          );
          const esTotal = esItems.reduce((s, ces) => {
            const p = ces.extraService?.prices?.[0]?.price;
            return s + (p ? parseFloat(String(p)) : 0) * ces.quantity;
          }, 0);
          const totalValue =
            nonSvcTotal +
            svcTotal +
            esTotal +
            parseFloat(String(concept.serviceFee ?? 0));

          return (
            <Modal
              title={`${concept.name} — İçerik`}
              onClose={() => setContentConcept(null)}
              maxWidth="max-w-2xl"
            >
              {/* Summary card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-neutral-800/60 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">
                    Ürün Toplamı
                  </p>
                  <p className="text-sm font-semibold text-neutral-100">
                    {formatPrice(nonSvcTotal, currency)}
                  </p>
                </div>
                <div className="bg-neutral-800/60 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">
                    Ekstra Hizmetler
                  </p>
                  <p className="text-sm font-semibold text-purple-300">
                    {formatPrice(esTotal + svcTotal, currency)}
                  </p>
                </div>
                <div className="bg-neutral-800/60 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">
                    Hizmet Ücreti
                  </p>
                  <p className="text-sm font-semibold text-neutral-100">
                    {formatPrice(Number(concept.serviceFee), currency)}
                  </p>
                </div>
                <div className="bg-amber-950/30 border border-amber-800/20 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-amber-500 mb-0.5">
                    Toplam Değer
                  </p>
                  <p className="text-sm font-bold text-amber-400">
                    {formatPrice(totalValue, currency)}
                  </p>
                </div>
              </div>

              {/* Tab buttons — only change the add-select */}
              <div className="flex items-center gap-1 mb-4">
                <button
                  onClick={() => setContentTab("products")}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${contentTab === "products" ? "bg-amber-600 text-neutral-950 font-semibold" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
                >
                  Ürün Ekle
                </button>
                <button
                  onClick={() => setContentTab("extraServices")}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${contentTab === "extraServices" ? "bg-purple-600 text-white font-semibold" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
                >
                  Hizmet Ekle
                </button>
              </div>

              {/* Add select — changes based on active tab */}
              <PermissionGate permission="concept.update">
                {contentTab === "products" && (
                  <div className="relative mb-4">
                    <div
                      onClick={() => {
                        setProductDropdownOpen(!productDropdownOpen);
                        setProductDropdownSearch("");
                      }}
                      className={
                        selectCls +
                        " cursor-pointer flex items-center justify-between"
                      }
                    >
                      <span className="text-neutral-400 text-sm">
                        Ürün seçin...
                      </span>
                      <span className="text-neutral-500 text-xs">▼</span>
                    </div>
                    {productDropdownOpen &&
                      (() => {
                        const available = availableProducts(concept);
                        const q = productDropdownSearch.toLowerCase();
                        const filtered = q
                          ? available.filter((p) =>
                              p.name.toLowerCase().includes(q),
                            )
                          : available;
                        const grouped = new Map<string, Product[]>();
                        filtered.forEach((p) => {
                          const gName = p.group?.name ?? "Grupsuz";
                          if (!grouped.has(gName)) grouped.set(gName, []);
                          grouped.get(gName)!.push(p);
                        });
                        const sortedGroups = [...grouped.entries()].sort(
                          (a, b) => {
                            const aSort =
                              filtered.find(
                                (pr) => (pr.group?.name ?? "Grupsuz") === a[0],
                              )?.group?.sortOrder ?? 999;
                            const bSort =
                              filtered.find(
                                (pr) => (pr.group?.name ?? "Grupsuz") === b[0],
                              )?.group?.sortOrder ?? 999;
                            return aSort - bSort;
                          },
                        );
                        return (
                          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-h-72 overflow-hidden flex flex-col">
                            <div className="p-2 border-b border-neutral-800">
                              <input
                                type="text"
                                autoFocus
                                value={productDropdownSearch}
                                onChange={(e) =>
                                  setProductDropdownSearch(e.target.value)
                                }
                                placeholder="Ürün ara..."
                                className={inputCls + " text-sm"}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="overflow-y-auto rc-scrollbar flex-1">
                              {sortedGroups.length === 0 ? (
                                <p className="text-xs text-neutral-600 p-3">
                                  Eklenecek ürün kalmadı.
                                </p>
                              ) : (
                                sortedGroups.map(
                                  ([groupName, groupProducts]) => (
                                    <div key={groupName}>
                                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 px-3 pt-2.5 pb-1 font-semibold bg-neutral-950/60 sticky top-0">
                                        {groupName}
                                      </p>
                                      {groupProducts.map((p) => (
                                        <button
                                          key={p.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setAddProductForms((prev) => ({
                                              ...prev,
                                              [concept.id]: p.id,
                                            }));
                                            setProductDropdownOpen(false);
                                            setProductDropdownSearch("");
                                          }}
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-800 transition-colors flex items-center justify-between gap-2"
                                        >
                                          <span className="text-neutral-200 truncate">
                                            {p.name}
                                          </span>
                                          <span className="text-xs text-neutral-500 shrink-0">
                                            {formatPrice(p.salePrice, currency)}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  ),
                                )
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    {addProductForms[concept.id] && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-neutral-300 flex-1 truncate">
                          {
                            products.find(
                              (p) => p.id === addProductForms[concept.id],
                            )?.name
                          }
                        </span>
                        <button
                          onClick={() => handleAddProduct(concept.id)}
                          disabled={addProductLoading[concept.id]}
                          className={primaryBtnCls + " shrink-0 text-xs"}
                        >
                          {addProductLoading[concept.id] ? "..." : "Ekle"}
                        </button>
                        <button
                          onClick={() =>
                            setAddProductForms((p) => ({
                              ...p,
                              [concept.id]: "",
                            }))
                          }
                          className={ghostBtnCls + " shrink-0 text-xs"}
                        >
                          İptal
                        </button>
                      </div>
                    )}
                    {addProductError[concept.id] && (
                      <p className="text-red-400 text-xs mt-2">
                        {addProductError[concept.id]}
                      </p>
                    )}
                  </div>
                )}

                {contentTab === "extraServices" && (
                  <div className="relative mb-4">
                    <div
                      onClick={() => {
                        setEsDropdownOpen(!esDropdownOpen);
                        setEsDropdownSearch("");
                      }}
                      className={
                        selectCls +
                        " cursor-pointer flex items-center justify-between"
                      }
                    >
                      <span className="text-neutral-400 text-sm">
                        Hizmet seçin...
                      </span>
                      <span className="text-neutral-500 text-xs">▼</span>
                    </div>
                    {esDropdownOpen &&
                      (() => {
                        const availableEs = availableExtraServices(concept);
                        const availableSvc = availableServiceProducts(concept);
                        const q = esDropdownSearch.toLowerCase();
                        const filteredEs = q
                          ? availableEs.filter((es) =>
                              es.name.toLowerCase().includes(q),
                            )
                          : availableEs;
                        const filteredSvc = q
                          ? availableSvc.filter((p) =>
                              p.name.toLowerCase().includes(q),
                            )
                          : availableSvc;
                        const hasItems =
                          filteredEs.length > 0 || filteredSvc.length > 0;
                        // Group extra services by category
                        const esCats = new Map<string, ExtraServiceItem[]>();
                        filteredEs.forEach((es) => {
                          const cat = es.category ?? "Genel";
                          if (!esCats.has(cat)) esCats.set(cat, []);
                          esCats.get(cat)!.push(es);
                        });
                        const sortedEsCats = [...esCats.entries()].sort(
                          (a, b) => a[0].localeCompare(b[0], "tr"),
                        );
                        // Group service products by group name
                        const svcGroups = new Map<string, Product[]>();
                        filteredSvc.forEach((p) => {
                          const gName = p.group?.name ?? "Grupsuz";
                          if (!svcGroups.has(gName)) svcGroups.set(gName, []);
                          svcGroups.get(gName)!.push(p);
                        });
                        const sortedSvcGroups = [...svcGroups.entries()].sort(
                          (a, b) => {
                            const aSort =
                              filteredSvc.find(
                                (pr) => (pr.group?.name ?? "Grupsuz") === a[0],
                              )?.group?.sortOrder ?? 999;
                            const bSort =
                              filteredSvc.find(
                                (pr) => (pr.group?.name ?? "Grupsuz") === b[0],
                              )?.group?.sortOrder ?? 999;
                            return aSort - bSort;
                          },
                        );
                        return (
                          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-h-72 overflow-hidden flex flex-col">
                            <div className="p-2 border-b border-neutral-800">
                              <input
                                type="text"
                                autoFocus
                                value={esDropdownSearch}
                                onChange={(e) =>
                                  setEsDropdownSearch(e.target.value)
                                }
                                placeholder="Hizmet ara..."
                                className={inputCls + " text-sm"}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="overflow-y-auto rc-scrollbar flex-1">
                              {!hasItems ? (
                                <p className="text-xs text-neutral-600 p-3">
                                  Eklenecek hizmet kalmadı.
                                </p>
                              ) : (
                                <>
                                  {/* Extra Services */}
                                  {sortedEsCats.map(
                                    ([catName, catServices]) => (
                                      <div key={"es-" + catName}>
                                        <p className="text-[10px] uppercase tracking-wider text-purple-400 px-3 pt-2.5 pb-1 font-semibold bg-purple-950/30 sticky top-0">
                                          {catName}
                                        </p>
                                        {catServices.map((es) => {
                                          const esPrice = es.prices?.[0]?.price;
                                          return (
                                            <button
                                              key={es.id}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setAddEsForm((prev) => ({
                                                  ...prev,
                                                  [concept.id]: es.id,
                                                }));
                                                setAddProductForms((prev) => ({
                                                  ...prev,
                                                  [concept.id]: "",
                                                }));
                                                setEsDropdownOpen(false);
                                                setEsDropdownSearch("");
                                              }}
                                              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-800 transition-colors flex items-center justify-between gap-2"
                                            >
                                              <span className="text-neutral-200 truncate">
                                                {es.name}
                                              </span>
                                              <span className="text-xs text-neutral-500 shrink-0">
                                                {esPrice
                                                  ? formatPrice(
                                                      parseFloat(
                                                        String(esPrice),
                                                      ),
                                                      currency,
                                                    )
                                                  : "—"}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ),
                                  )}
                                  {/* Service Products */}
                                  {sortedSvcGroups.map(
                                    ([groupName, groupProducts]) => (
                                      <div key={"svc-" + groupName}>
                                        <p className="text-[10px] uppercase tracking-wider text-teal-400 px-3 pt-2.5 pb-1 font-semibold bg-teal-950/30 sticky top-0">
                                          {groupName}
                                        </p>
                                        {groupProducts.map((p) => (
                                          <button
                                            key={p.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setAddProductForms((prev) => ({
                                                ...prev,
                                                [concept.id]: p.id,
                                              }));
                                              setAddEsForm((prev) => ({
                                                ...prev,
                                                [concept.id]: "",
                                              }));
                                              setEsDropdownOpen(false);
                                              setEsDropdownSearch("");
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-800 transition-colors flex items-center justify-between gap-2"
                                          >
                                            <span className="text-neutral-200 truncate">
                                              {p.name}
                                            </span>
                                            <span className="text-xs text-neutral-500 shrink-0">
                                              {formatPrice(
                                                p.salePrice,
                                                currency,
                                              )}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    ),
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    {/* Confirm bar for extra service selection */}
                    {addEsForm[concept.id] && !addProductForms[concept.id] && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-purple-300 flex-1 truncate">
                          {
                            extraServices.find(
                              (es) => es.id === addEsForm[concept.id],
                            )?.name
                          }
                        </span>
                        <button
                          onClick={() => handleAddExtraService(concept.id)}
                          disabled={addEsLoading[concept.id]}
                          className={primaryBtnCls + " shrink-0 text-xs"}
                        >
                          {addEsLoading[concept.id] ? "..." : "Ekle"}
                        </button>
                        <button
                          onClick={() =>
                            setAddEsForm((p) => ({ ...p, [concept.id]: "" }))
                          }
                          className={ghostBtnCls + " shrink-0 text-xs"}
                        >
                          İptal
                        </button>
                      </div>
                    )}
                    {/* Confirm bar for service product selection */}
                    {addProductForms[concept.id] && !addEsForm[concept.id] && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-teal-300 flex-1 truncate">
                          {
                            products.find(
                              (p) => p.id === addProductForms[concept.id],
                            )?.name
                          }
                        </span>
                        <button
                          onClick={() => handleAddProduct(concept.id)}
                          disabled={addProductLoading[concept.id]}
                          className={primaryBtnCls + " shrink-0 text-xs"}
                        >
                          {addProductLoading[concept.id] ? "..." : "Ekle"}
                        </button>
                        <button
                          onClick={() =>
                            setAddProductForms((p) => ({
                              ...p,
                              [concept.id]: "",
                            }))
                          }
                          className={ghostBtnCls + " shrink-0 text-xs"}
                        >
                          İptal
                        </button>
                      </div>
                    )}
                    {addEsError[concept.id] && (
                      <p className="text-red-400 text-xs mt-2">
                        {addEsError[concept.id]}
                      </p>
                    )}
                    {addProductError[concept.id] && (
                      <p className="text-red-400 text-xs mt-2">
                        {addProductError[concept.id]}
                      </p>
                    )}
                  </div>
                )}
              </PermissionGate>

              {/* ---- Unified Content Table ---- */}
              {nonSvcProducts.length > 0 ||
              esItems.length > 0 ||
              svcProducts.length > 0 ? (
                <div className="overflow-x-auto rc-scrollbar">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-neutral-700 text-neutral-500 uppercase tracking-wider">
                        <th className="text-left py-2 px-2 font-semibold">
                          Tür
                        </th>
                        <th className="text-left py-2 px-2 font-semibold">
                          Ad
                        </th>
                        <th className="text-right py-2 px-2 font-semibold">
                          Fiyat
                        </th>
                        <th className="text-center py-2 px-2 font-semibold">
                          Adet
                        </th>
                        <th className="text-right py-2 px-2 font-semibold">
                          Toplam
                        </th>
                        <th className="text-right py-2 px-2 font-semibold">
                          İşlem
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Non-service products */}
                      {nonSvcProducts.map((cp) => {
                        const unitPrice = parseFloat(
                          String(cp.product.salePrice),
                        );
                        const lineTotal = unitPrice * cp.quantity;
                        const qtyKey = `${concept.id}-${cp.productId}`;
                        const isUpdating = qtyUpdating[qtyKey];
                        return (
                          <tr
                            key={`p-${cp.id}`}
                            className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
                          >
                            <td className="py-2 px-2">
                              <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 text-[10px]">
                                Ürün
                              </span>
                            </td>
                            <td className="py-2 px-2 text-neutral-200 font-medium">
                              {cp.product.name}
                            </td>
                            <td className="py-2 px-2 text-right text-neutral-400">
                              {formatPrice(unitPrice, currency)}
                            </td>
                            <td className="py-2 px-2">
                              <PermissionGate
                                permission="concept.update"
                                fallback={
                                  <span className="text-neutral-500 text-center block">
                                    {cp.quantity}
                                  </span>
                                }
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() =>
                                      updateConceptProductQty(
                                        concept.id,
                                        cp.productId,
                                        cp.quantity - 1,
                                      )
                                    }
                                    disabled={cp.quantity <= 1 || isUpdating}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 text-neutral-300 text-xs transition-colors"
                                  >
                                    −
                                  </button>
                                  <span className="w-6 text-center text-neutral-200 font-medium tabular-nums">
                                    {cp.quantity}
                                  </span>
                                  <button
                                    onClick={() =>
                                      updateConceptProductQty(
                                        concept.id,
                                        cp.productId,
                                        cp.quantity + 1,
                                      )
                                    }
                                    disabled={isUpdating}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 text-neutral-300 text-xs transition-colors"
                                  >
                                    +
                                  </button>
                                  {isUpdating && (
                                    <span className="text-[10px] text-amber-400 animate-pulse">
                                      ✓
                                    </span>
                                  )}
                                </div>
                              </PermissionGate>
                            </td>
                            <td className="py-2 px-2 text-right text-yellow-500 font-medium">
                              {formatPrice(lineTotal, currency)}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <PermissionGate permission="concept.update">
                                <button
                                  onClick={() =>
                                    handleRemoveProduct(
                                      concept.id,
                                      cp.productId,
                                    )
                                  }
                                  className="text-red-500 hover:text-red-400 transition-colors"
                                >
                                  Kaldır
                                </button>
                              </PermissionGate>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Extra services */}
                      {esItems.map((ces) => {
                        const esPrice = ces.extraService?.prices?.[0]?.price;
                        const unitPrice = esPrice
                          ? parseFloat(String(esPrice))
                          : 0;
                        const lineTotal = unitPrice * ces.quantity;
                        const esQtyKey = `${concept.id}-${ces.extraServiceId}`;
                        const isEsUpdating = esQtyUpdating[esQtyKey];
                        return (
                          <tr
                            key={`es-${ces.id}`}
                            className="border-b border-neutral-800/50 hover:bg-purple-950/10 transition-colors"
                          >
                            <td className="py-2 px-2">
                              <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-400 text-[10px]">
                                Hizmet
                              </span>
                            </td>
                            <td className="py-2 px-2 text-neutral-200 font-medium">
                              {ces.extraService?.name ?? "—"}
                            </td>
                            <td className="py-2 px-2 text-right text-neutral-400">
                              {formatPrice(unitPrice, currency)}
                            </td>
                            <td className="py-2 px-2">
                              <PermissionGate
                                permission="concept.update"
                                fallback={
                                  <span className="text-neutral-500 text-center block">
                                    {ces.quantity}
                                  </span>
                                }
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() =>
                                      updateExtraServiceQty(
                                        concept.id,
                                        ces.extraServiceId,
                                        ces.quantity - 1,
                                      )
                                    }
                                    disabled={ces.quantity <= 1 || isEsUpdating}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 text-neutral-300 text-xs transition-colors"
                                  >
                                    −
                                  </button>
                                  <span className="w-6 text-center text-neutral-200 font-medium tabular-nums">
                                    {ces.quantity}
                                  </span>
                                  <button
                                    onClick={() =>
                                      updateExtraServiceQty(
                                        concept.id,
                                        ces.extraServiceId,
                                        ces.quantity + 1,
                                      )
                                    }
                                    disabled={isEsUpdating}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 text-neutral-300 text-xs transition-colors"
                                  >
                                    +
                                  </button>
                                  {isEsUpdating && (
                                    <span className="text-[10px] text-purple-400 animate-pulse">
                                      ✓
                                    </span>
                                  )}
                                </div>
                              </PermissionGate>
                            </td>
                            <td className="py-2 px-2 text-right text-purple-400 font-medium">
                              {formatPrice(lineTotal, currency)}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <PermissionGate permission="concept.update">
                                <button
                                  onClick={() =>
                                    handleRemoveExtraService(
                                      concept.id,
                                      ces.extraServiceId,
                                    )
                                  }
                                  className="text-red-500 hover:text-red-400 transition-colors"
                                >
                                  Kaldır
                                </button>
                              </PermissionGate>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Service products */}
                      {svcProducts.map((cp) => {
                        const unitPrice = parseFloat(
                          String(cp.product.salePrice),
                        );
                        const lineTotal = unitPrice * cp.quantity;
                        const qtyKey = `${concept.id}-${cp.productId}`;
                        const isUpdating = qtyUpdating[qtyKey];
                        return (
                          <tr
                            key={`sp-${cp.id}`}
                            className="border-b border-neutral-800/50 hover:bg-teal-950/10 transition-colors"
                          >
                            <td className="py-2 px-2">
                              <span className="px-1.5 py-0.5 rounded bg-teal-950/40 text-teal-400 text-[10px]">
                                Hizmet
                              </span>
                            </td>
                            <td className="py-2 px-2 text-neutral-200 font-medium">
                              {cp.product.name}
                            </td>
                            <td className="py-2 px-2 text-right text-neutral-400">
                              {formatPrice(unitPrice, currency)}
                            </td>
                            <td className="py-2 px-2">
                              <PermissionGate
                                permission="concept.update"
                                fallback={
                                  <span className="text-neutral-500 text-center block">
                                    {cp.quantity}
                                  </span>
                                }
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() =>
                                      updateConceptProductQty(
                                        concept.id,
                                        cp.productId,
                                        cp.quantity - 1,
                                      )
                                    }
                                    disabled={cp.quantity <= 1 || isUpdating}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 text-neutral-300 text-xs transition-colors"
                                  >
                                    −
                                  </button>
                                  <span className="w-6 text-center text-neutral-200 font-medium tabular-nums">
                                    {cp.quantity}
                                  </span>
                                  <button
                                    onClick={() =>
                                      updateConceptProductQty(
                                        concept.id,
                                        cp.productId,
                                        cp.quantity + 1,
                                      )
                                    }
                                    disabled={isUpdating}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 text-neutral-300 text-xs transition-colors"
                                  >
                                    +
                                  </button>
                                  {isUpdating && (
                                    <span className="text-[10px] text-teal-400 animate-pulse">
                                      ✓
                                    </span>
                                  )}
                                </div>
                              </PermissionGate>
                            </td>
                            <td className="py-2 px-2 text-right text-teal-400 font-medium">
                              {formatPrice(lineTotal, currency)}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <PermissionGate permission="concept.update">
                                <button
                                  onClick={() =>
                                    handleRemoveProduct(
                                      concept.id,
                                      cp.productId,
                                    )
                                  }
                                  className="text-red-500 hover:text-red-400 transition-colors"
                                >
                                  Kaldır
                                </button>
                              </PermissionGate>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-neutral-600 text-center py-4">
                  Henüz içerik eklenmemiş.
                </p>
              )}
            </Modal>
          );
        })()}

      {/* ============================================================ */}
      {/*  Create Modal                                                 */}
      {/* ============================================================ */}
      {showCreate && (
        <Modal
          title="Yeni Konsept"
          onClose={() => setShowCreate(false)}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Konsept Adı">
              <input
                type="text"
                required
                minLength={2}
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
                placeholder="Örn: VIP Paket, Standart"
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
                placeholder="Konsept açıklaması..."
              />
            </Field>
            <Field label={`Hizmet Ücreti (${currencySymbol(currency)})`}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createForm.serviceFee}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, serviceFee: e.target.value }))
                }
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            <Field label="Sınıf (opsiyonel)">
              <select
                value={createForm.classId}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, classId: e.target.value }))
                }
                className={selectCls}
              >
                <option value="">Sınıf seçin...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </Field>

            {/* Product picker */}
            <Field label="Ürünler">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className={inputCls + " mb-2"}
                placeholder="Ürün ara..."
              />
              <div className="space-y-1.5 max-h-60 overflow-y-auto rc-scrollbar">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-neutral-600 py-2">
                    Ürün bulunamadı.
                  </p>
                ) : (
                  filteredProducts.map((product) => {
                    const selected = selectedProducts.find(
                      (sp) => sp.id === product.id,
                    );
                    return (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                          selected
                            ? "bg-amber-950/30 border border-amber-800/30"
                            : "bg-neutral-800/60 border border-transparent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => toggleProduct(product)}
                          className="accent-amber-500 shrink-0"
                        />
                        <span className="flex-1 text-sm text-neutral-200 truncate">
                          {product.name}
                        </span>
                        <span className="text-xs text-neutral-500 shrink-0">
                          {formatPrice(product.salePrice, currency)}
                        </span>
                        {selected && (
                          <input
                            type="number"
                            min={1}
                            value={selected.quantity}
                            onChange={(e) =>
                              updateSelectedQuantity(
                                product.id,
                                parseInt(e.target.value) || 1,
                              )
                            }
                            className="w-16 bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-sm text-center text-neutral-100 shrink-0"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {selectedProducts.length > 0 && (
                <div className="mt-3 flex items-center justify-between bg-amber-950/20 border border-amber-800/20 rounded-lg px-3 py-2">
                  <span className="text-xs text-amber-400">
                    {selectedProducts.length} ürün seçili
                  </span>
                  <span className="text-xs font-semibold text-amber-300">
                    Toplam: {formatPrice(createRunningTotal, currency)}
                  </span>
                </div>
              )}
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

      {/* ============================================================ */}
      {/*  Edit Modal                                                   */}
      {/* ============================================================ */}
      {editConcept && (
        <Modal title="Konsept Düzenle" onClose={() => setEditConcept(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Konsept Adı">
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
            <Field label={`Hizmet Ücreti (${currencySymbol(currency)})`}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editForm.serviceFee}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, serviceFee: e.target.value }))
                }
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            <Field label="Sınıf (opsiyonel)">
              <select
                value={editForm.classId}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, classId: e.target.value }))
                }
                className={selectCls}
              >
                <option value="">Sınıf seçin...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </Field>
            {editError && <ErrorMsg msg={editError} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditConcept(null)}
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

      {/* ============================================================ */}
      {/*  Delete Confirm Modal                                         */}
      {/* ============================================================ */}
      {deleteConcept && (
        <Modal title="Konsepti Sil" onClose={() => setDeleteConcept(null)}>
          {deleteError ? (
            <>
              <div className="px-4 py-3 bg-red-950/40 border border-red-800/40 text-red-400 text-sm rounded-lg mb-4">
                {deleteError}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setDeleteConcept(null)}
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
                  {deleteConcept.name}
                </span>{" "}
                konseptini silmek istediğinizden emin misiniz?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteConcept(null)}
                  className={cancelBtnCls}
                >
                  İptal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className={dangerBtnCls}
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
