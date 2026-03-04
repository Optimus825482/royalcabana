import { X } from "lucide-react";
import type { CabanaWithStatus } from "@/types";

function DetailRow({
  label,
  value,
  valueClass = "text-neutral-100",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-neutral-800">
      <span className="text-neutral-400">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

export default function CabanaDetailModal({
  cabana,
  reservationCount,
  systemOpen,
  onClose,
  onCreateRequest,
}: {
  cabana: CabanaWithStatus;
  reservationCount: number;
  systemOpen: boolean;
  onClose: () => void;
  onCreateRequest: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={cabana.name + " detayları"}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-2 pb-0 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-700" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
          <h2 className="text-base font-semibold text-amber-400">
            {cabana.name}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors active:scale-95"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain rc-scrollbar">
          <DetailRow label="Cabana" value={cabana.name} />
          <DetailRow
            label="Durum"
            value={
              cabana.isOpenForReservation
                ? "Rezervasyona Açık"
                : "Rezervasyona Kapalı"
            }
            valueClass={
              cabana.isOpenForReservation ? "text-emerald-400" : "text-red-400"
            }
          />
          {cabana.cabanaClass?.name && (
            <DetailRow label="Sınıf" value={cabana.cabanaClass.name} />
          )}
          {cabana.concept?.name && (
            <DetailRow label="Konsept" value={cabana.concept.name} />
          )}
          <DetailRow
            label="Toplam Rezervasyon"
            value={String(reservationCount)}
          />
        </div>

        <div className="p-5 border-t border-neutral-800 shrink-0">
          <button
            onClick={onCreateRequest}
            disabled={!systemOpen || !cabana.isOpenForReservation}
            className="w-full h-11 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Rezervasyon Talebi Oluştur
          </button>
          {!systemOpen && (
            <p className="text-[11px] text-amber-400 mt-2">
              Sistem rezervasyona kapalı olduğu için talep oluşturulamaz.
            </p>
          )}
          {systemOpen && !cabana.isOpenForReservation && (
            <p className="text-[11px] text-red-400 mt-2">
              Bu Cabana şu anda rezervasyona kapalı.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
