import React, { useEffect, useState, useCallback } from "react";

export function Modal({
  title,
  onClose,
  children,
  maxWidth = "max-w-md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // ESC key to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-all duration-200 ${visible ? "bg-black/60 backdrop-blur-sm" : "bg-black/0"}`}
      onClick={onClose}
    >
      <div
        className={`bg-neutral-900 border border-neutral-800 rounded-t-xl sm:rounded-xl shadow-2xl w-full ${maxWidth} sm:mx-4 max-h-[90vh] flex flex-col transition-all duration-200 ease-out ${visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 sm:translate-y-0 sm:scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle for mobile bottom-sheet feel */}
        <div className="flex justify-center pt-2 pb-0 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-700" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
          <h2 className="text-sm font-semibold text-yellow-400">{title}</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center text-neutral-500 hover:text-neutral-300 active:text-neutral-100 text-lg leading-none transition-colors"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-5 overflow-y-auto flex-1 min-h-0 rc-scrollbar overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({
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

export function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-red-400 text-xs bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
      {msg}
    </p>
  );
}

export const inputCls =
  "w-full min-h-[44px] bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded-lg px-4 py-3 text-base sm:text-sm outline-none transition-colors placeholder:text-neutral-600";

export const cancelBtnCls =
  "min-h-[44px] px-4 py-2 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors";

export const selectCls =
  "w-full bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded-lg min-h-[44px] px-4 py-3 text-base sm:text-sm outline-none transition-colors";

export const submitBtnCls =
  "min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 transition-colors";

// --- Button Color Hierarchy ---
// Primary: Ana eylem (Oluştur, Kaydet, Onayla) — amber
export const primaryBtnCls =
  "min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 transition-colors";

// Danger: Tehlikeli eylem (Sil, Devre Dışı Bırak) — red
export const dangerBtnCls =
  "min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors";

// Danger Soft: Tehlikeli ama düşük vurgu (Sil tetikleyici, Devre Dışı tetikleyici) — red ghost
export const dangerSoftBtnCls =
  "min-h-[44px] text-xs px-3 py-2 rounded-md bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition-colors";

// Edit: Düzenleme eylemi — sky
export const editBtnCls =
  "min-h-[44px] text-xs px-3 py-2 rounded-md bg-sky-950/50 hover:bg-sky-900/50 text-sky-400 border border-sky-800/30 transition-colors";

// Success: Olumlu eylem (Onayla, Check-in, Aktifleştir) — emerald
export const successBtnCls =
  "min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors";

// Info: Bilgi/Navigasyon (Detay, Görüntüle, Dışa Aktar) — sky
export const infoBtnCls =
  "min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors";

// Ghost: Minimal eylem (Sayfalama, Toggle, Filtre) — transparent
export const ghostBtnCls =
  "min-h-[44px] text-xs px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors";
