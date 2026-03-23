import React, { useEffect, useState } from "react";

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
        className={`bg-[var(--rc-surface)] border border-[var(--rc-surface-border)] rounded-t-xl sm:rounded-xl shadow-2xl w-full ${maxWidth} sm:mx-4 max-h-[90vh] flex flex-col transition-all duration-200 ease-out ${visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 sm:translate-y-0 sm:scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle for mobile bottom-sheet feel */}
        <div className="flex justify-center pt-2 pb-0 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--rc-drag-handle)]" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--rc-surface-border)] shrink-0">
          <h2 className="text-sm font-semibold text-[var(--rc-gold)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center text-[var(--rc-text-muted)] hover:text-[var(--rc-text-secondary)] active:text-[var(--rc-text-primary)] text-lg leading-none transition-colors"
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
      <label className="block text-xs text-[var(--rc-text-secondary)] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

export function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-[var(--rc-danger)] text-xs bg-[var(--rc-error-bg)] border border-[var(--rc-error-border)] rounded-lg px-3 py-2">
      {msg}
    </p>
  );
}

export const inputCls =
  "w-full min-h-[44px] bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] focus:border-[var(--rc-input-focus)] text-[var(--rc-text-primary)] rounded-lg px-4 py-3 text-base sm:text-sm outline-none transition-colors placeholder:text-[var(--rc-placeholder)]";

export const cancelBtnCls =
  "min-h-[44px] px-4 py-2 text-sm rounded-lg bg-[var(--rc-input-bg)] hover:bg-[var(--rc-input-hover)] text-[var(--rc-text-secondary)] transition-colors";

export const selectCls =
  "w-full bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] focus:border-[var(--rc-input-focus)] text-[var(--rc-text-primary)] rounded-lg min-h-[44px] px-4 py-3 text-base sm:text-sm outline-none transition-colors";

export const submitBtnCls =
  "min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--rc-btn-primary-bg)] hover:bg-[var(--rc-btn-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--rc-btn-primary-text)] transition-colors";

// --- Button Color Hierarchy ---
// Primary: Ana eylem (Oluştur, Kaydet, Onayla) — amber
export const primaryBtnCls =
  "min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--rc-btn-primary-bg)] hover:bg-[var(--rc-btn-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--rc-btn-primary-text)] transition-colors";

// Danger: Tehlikeli eylem (Sil, Devre Dışı Bırak) — red
export const dangerBtnCls =
  "min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--rc-btn-danger-bg)] hover:bg-[var(--rc-btn-danger-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors";

// Danger Soft: Tehlikeli ama düşük vurgu (Sil tetikleyici, Devre Dışı tetikleyici) — red ghost
export const dangerSoftBtnCls =
  "min-h-[44px] text-xs px-3 py-2 rounded-md bg-[var(--rc-danger-soft-bg)] hover:bg-[var(--rc-danger-soft-hover)] text-[var(--rc-danger)] border border-[var(--rc-danger-soft-border)] transition-colors";

// Edit: Düzenleme eylemi — sky
export const editBtnCls =
  "min-h-[44px] text-xs px-3 py-2 rounded-md bg-[var(--rc-info-soft-bg)] hover:bg-[var(--rc-info-soft-hover)] text-[var(--rc-info-accent)] border border-[var(--rc-info-soft-border)] transition-colors";

// Success: Olumlu eylem (Onayla, Check-in, Aktifleştir) — emerald
export const successBtnCls =
  "min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--rc-btn-success-bg)] hover:bg-[var(--rc-btn-success-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors";

// Info: Bilgi/Navigasyon (Detay, Görüntüle, Dışa Aktar) — sky
export const infoBtnCls =
  "min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--rc-btn-info-bg)] hover:bg-[var(--rc-btn-info-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors";

// Ghost: Minimal eylem (Sayfalama, Toggle, Filtre) — transparent
export const ghostBtnCls =
  "min-h-[44px] text-xs px-3 py-2 rounded-md bg-[var(--rc-input-bg)] hover:bg-[var(--rc-input-hover)] text-[var(--rc-text-secondary)] transition-colors";
