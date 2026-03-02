import React from "react";

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
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-neutral-900 border border-neutral-800 rounded-t-xl sm:rounded-xl shadow-2xl w-full ${maxWidth} sm:mx-4 max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
          <h2 className="text-sm font-semibold text-yellow-400">{title}</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center text-neutral-500 hover:text-neutral-300 text-lg leading-none transition-colors"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-5 overflow-y-auto flex-1 min-h-0 rc-scrollbar">
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
  "min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 transition-colors";
