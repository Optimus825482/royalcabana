"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare, Pencil, Trash2, Send } from "lucide-react";
import {
  Modal,
  Field,
  ErrorMsg,
  inputCls,
  cancelBtnCls,
  submitBtnCls,
} from "@/components/shared/FormComponents";

// ── Types ──

interface ReviewReservation {
  id: string;
  cabana: { id: string; name: string };
  startDate: string;
  endDate: string;
  guestName: string;
}

interface Review {
  id: string;
  reservationId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reservation: ReviewReservation;
}

interface ReviewsResponse {
  data: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CheckedOutReservation {
  id: string;
  cabanaId: string;
  guestName: string;
  startDate: string;
  endDate: string;
  cabana: { id: string; name: string };
}

// ── Helpers ──

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`w-8 h-8 flex items-center justify-center transition-colors ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          }`}
          aria-label={`${star} yıldız`}
        >
          <Star
            className={`w-5 h-5 ${
              star <= value
                ? "text-amber-400 fill-amber-400"
                : "text-neutral-600"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ── Component ──

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState("");
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  // Fetch reviews
  const { data: reviewsData, isLoading: reviewsLoading } =
    useQuery<ReviewsResponse>({
      queryKey: ["my-reviews"],
      queryFn: async () => {
        const res = await fetch("/api/reviews");
        if (!res.ok) throw new Error("Fetch failed");
        return res.json();
      },
    });

  // Fetch checked-out reservations (for creating new reviews)
  const { data: reservations = [] } = useQuery<CheckedOutReservation[]>({
    queryKey: ["checked-out-reservations"],
    queryFn: async () => {
      const res = await fetch("/api/reservations?status=CHECKED_OUT&limit=100");
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      return json.reservations || json.items || json.data || json;
    },
  });

  const reviews = reviewsData?.data || [];
  const reviewedIds = new Set(reviews.map((r) => r.reservationId));
  const unreviewedReservations = reservations.filter(
    (r) => !reviewedIds.has(r.id),
  );

  // Create review
  const createMutation = useMutation({
    mutationFn: async (data: {
      reservationId: string;
      rating: number;
      comment: string | null;
    }) => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Hata oluştu.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["checked-out-reservations"] });
      closeModal();
    },
    onError: (err: Error) => setError(err.message),
  });

  // Update review
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      rating: number;
      comment: string | null;
    }) => {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Hata oluştu.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      closeModal();
    },
    onError: (err: Error) => setError(err.message),
  });

  // Delete review
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Hata oluştu.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["checked-out-reservations"] });
    },
  });

  const openCreate = (reservationId: string) => {
    setModalMode("create");
    setSelectedReservationId(reservationId);
    setRating(0);
    setComment("");
    setError("");
  };

  const openEdit = (review: Review) => {
    setModalMode("edit");
    setEditingReview(review);
    setRating(review.rating);
    setComment(review.comment || "");
    setError("");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingReview(null);
    setSelectedReservationId("");
    setRating(0);
    setComment("");
    setError("");
  };

  const handleSubmit = () => {
    if (rating < 1 || rating > 5) {
      setError("Lütfen 1-5 arası puan verin.");
      return;
    }

    if (modalMode === "create") {
      createMutation.mutate({
        reservationId: selectedReservationId,
        rating,
        comment: comment.trim() || null,
      });
    } else if (modalMode === "edit" && editingReview) {
      updateMutation.mutate({
        id: editingReview.id,
        rating,
        comment: comment.trim() || null,
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <MessageSquare className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-semibold text-amber-400">
              Değerlendirmelerim
            </h1>
          </div>
          <p className="text-sm text-neutral-400">
            Tamamlanan rezervasyonlarınızı değerlendirin
          </p>
        </div>

        {/* Unreviewed Reservations */}
        {unreviewedReservations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">
              Değerlendirilmemiş Rezervasyonlar
            </h2>
            <div className="space-y-2">
              {unreviewedReservations.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-neutral-900 border border-neutral-800"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-100">
                      {r.cabana.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {r.guestName} · {formatDate(r.startDate)} –{" "}
                      {formatDate(r.endDate)}
                    </p>
                  </div>
                  <button
                    onClick={() => openCreate(r.id)}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-neutral-950 transition-colors shrink-0"
                  >
                    Değerlendir
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Reviews */}
        <h2 className="text-sm font-medium text-neutral-300 mb-3">
          Değerlendirmelerim ({reviews.length})
        </h2>

        {reviewsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-lg bg-neutral-900 border border-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 text-sm">
            Henüz değerlendirme yapmadınız.
          </div>
        ) : (
          <div className="space-y-2">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-4 rounded-lg bg-neutral-900 border border-neutral-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-neutral-100">
                        {review.reservation.cabana.name}
                      </p>
                      <StarRating value={review.rating} readonly />
                    </div>
                    <p className="text-xs text-neutral-500 mb-2">
                      {review.reservation.guestName} ·{" "}
                      {formatDate(review.reservation.startDate)} –{" "}
                      {formatDate(review.reservation.endDate)}
                    </p>
                    {review.comment && (
                      <p className="text-sm text-neutral-300">
                        {review.comment}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(review)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-neutral-500 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                      aria-label="Düzenle"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Bu değerlendirmeyi silmek istediğinize emin misiniz?",
                          )
                        ) {
                          deleteMutation.mutate(review.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors disabled:opacity-40"
                      aria-label="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {modalMode && (
          <Modal
            title={
              modalMode === "create"
                ? "Değerlendirme Yaz"
                : "Değerlendirme Düzenle"
            }
            onClose={closeModal}
          >
            <div className="space-y-4">
              {error && <ErrorMsg msg={error} />}

              <Field label="Puan">
                <StarRating value={rating} onChange={setRating} />
              </Field>

              <Field label="Yorum (opsiyonel)">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="Deneyiminizi paylaşın..."
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={closeModal} className={cancelBtnCls}>
                  İptal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSaving || rating < 1}
                  className={submitBtnCls}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      Kaydediliyor...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      {modalMode === "create" ? "Gönder" : "Güncelle"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
