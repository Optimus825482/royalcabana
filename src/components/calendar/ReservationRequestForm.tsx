"use client";

import { useState } from "react";

interface ReservationRequestFormProps {
  cabanaId: string;
  cabanaName: string;
  initialDate?: string;
  onSuccess: (reservation: unknown) => void;
  onCancel: () => void;
}

export default function ReservationRequestForm({
  cabanaId,
  cabanaName,
  initialDate,
  onSuccess,
  onCancel,
}: ReservationRequestFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const [guestName, setGuestName] = useState("");
  const [startDate, setStartDate] = useState(initialDate ?? today);
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!guestName.trim()) {
      setError("Misafir adı zorunludur.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Başlangıç ve bitiş tarihleri zorunludur.");
      return;
    }
    if (startDate < today) {
      setError("Geçmiş tarihler için talep oluşturulamaz.");
      return;
    }
    if (endDate <= startDate) {
      setError("Bitiş tarihi başlangıç tarihinden sonra olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabanaId,
          guestName,
          startDate,
          endDate,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Talep oluşturulamadı.");
        return;
      }

      onSuccess(data);
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-xs text-neutral-500 mb-1">Kabana</p>
        <p className="text-sm font-semibold text-yellow-400">{cabanaName}</p>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-400">Misafir Adı *</label>
        <input
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Ad Soyad"
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-yellow-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Başlangıç *</label>
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-yellow-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Bitiş *</label>
          <input
            type="date"
            value={endDate}
            min={startDate || today}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-yellow-500"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-400">Notlar</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Özel istekler veya notlar..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-yellow-500 resize-none"
        />
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-950/50 border border-red-800/40 text-red-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 text-sm font-medium rounded-lg border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 transition-colors"
        >
          {loading ? "Gönderiliyor..." : "Talep Oluştur"}
        </button>
      </div>
    </form>
  );
}
