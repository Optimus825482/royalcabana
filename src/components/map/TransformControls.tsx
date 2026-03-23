"use client";

import { useState, useEffect } from "react";
import { CabanaWithStatus } from "@/types";

// ─── Preset colors for cabana color picker ───────────────────────────────────

const PRESET_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
  "#22c55e",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#8b5cf6",
  "#14b8a6",
];

function getDefaultCabanaColor(cabana: CabanaWithStatus): string {
  if (cabana.color) return cabana.color;
  const className = cabana.cabanaClass?.name?.toLowerCase() ?? "";
  if (className.includes("vip")) return "#f59e0b";
  if (className.includes("premium")) return "#a855f7";
  if (className.includes("deluxe")) return "#ec4899";
  return "#3b82f6";
}

// ─── Transform Controls (rotation, scaleX, scaleY, color, lock, save) ───────

export interface TransformControlsProps {
  cabana: CabanaWithStatus;
  onSave: (updates: {
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    color?: string;
    isLocked?: boolean;
  }) => void;
}

export default function TransformControls({
  cabana,
  onSave,
}: TransformControlsProps) {
  const [localRotation, setLocalRotation] = useState(cabana.rotation ?? 0);
  const [localScaleX, setLocalScaleX] = useState(cabana.scaleX ?? 1);
  const [localScaleY, setLocalScaleY] = useState(cabana.scaleY ?? 1);
  const [localColor, setLocalColor] = useState(getDefaultCabanaColor(cabana));
  const [localLocked, setLocalLocked] = useState(cabana.isLocked ?? false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setLocalRotation(cabana.rotation ?? 0);
      setLocalScaleX(cabana.scaleX ?? 1);
      setLocalScaleY(cabana.scaleY ?? 1);
      setLocalColor(getDefaultCabanaColor(cabana));
      setLocalLocked(cabana.isLocked ?? false);
      setDirty(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [cabana]);

  function markDirty() {
    setDirty(true);
  }

  function handleSave() {
    onSave({
      rotation: localRotation,
      scaleX: localScaleX,
      scaleY: localScaleY,
      color: localColor,
      isLocked: localLocked,
    });
    setDirty(false);
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Rotation */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] text-neutral-500">Döndürme</label>
          <span className="text-[10px] text-neutral-600 tabular-nums">
            {Math.round(localRotation)}°
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={360}
            step={5}
            value={localRotation}
            onChange={(e) => {
              setLocalRotation(Number(e.target.value));
              markDirty();
            }}
            className="flex-1 accent-yellow-500 h-1.5"
          />
          <button
            onClick={() => {
              setLocalRotation(0);
              markDirty();
            }}
            className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
            title="Sıfırla"
          >
            ↺
          </button>
        </div>
      </div>

      {/* Scale X (En) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] text-neutral-500">En (Genişlik)</label>
          <span className="text-[10px] text-neutral-600 tabular-nums">
            {localScaleX.toFixed(1)}x
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0.3}
            max={3}
            step={0.1}
            value={localScaleX}
            onChange={(e) => {
              setLocalScaleX(Number(e.target.value));
              markDirty();
            }}
            className="flex-1 accent-yellow-500 h-1.5"
          />
          <button
            onClick={() => {
              setLocalScaleX(1);
              markDirty();
            }}
            className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
            title="Sıfırla"
          >
            ↺
          </button>
        </div>
      </div>

      {/* Scale Y (Boy) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] text-neutral-500">
            Boy (Yükseklik)
          </label>
          <span className="text-[10px] text-neutral-600 tabular-nums">
            {localScaleY.toFixed(1)}x
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0.3}
            max={3}
            step={0.1}
            value={localScaleY}
            onChange={(e) => {
              setLocalScaleY(Number(e.target.value));
              markDirty();
            }}
            className="flex-1 accent-yellow-500 h-1.5"
          />
          <button
            onClick={() => {
              setLocalScaleY(1);
              markDirty();
            }}
            className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
            title="Sıfırla"
          >
            ↺
          </button>
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="text-[11px] text-neutral-500 block mb-1.5">
          Renk
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setLocalColor(c);
                markDirty();
              }}
              className={`w-6 h-6 rounded-md border-2 transition-all ${localColor === c ? "border-white scale-110" : "border-transparent hover:border-neutral-600"}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <label
            className="w-6 h-6 rounded-md border-2 border-dashed border-neutral-600 hover:border-neutral-400 cursor-pointer flex items-center justify-center transition-colors"
            title="Özel renk"
          >
            <span className="text-[8px] text-neutral-500">+</span>
            <input
              type="color"
              value={localColor}
              onChange={(e) => {
                setLocalColor(e.target.value);
                markDirty();
              }}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {/* Lock toggle */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-neutral-500">Konumu Sabitle</label>
        <button
          onClick={() => {
            setLocalLocked(!localLocked);
            markDirty();
          }}
          className={`relative w-10 h-5 rounded-full transition-colors ${localLocked ? "bg-yellow-600" : "bg-neutral-700"}`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${localLocked ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </div>
      {localLocked && (
        <p className="text-[10px] text-yellow-600/80">
          🔒 Konum sabitlendi — sürükleme devre dışı
        </p>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!dirty}
        className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${dirty ? "bg-yellow-600 hover:bg-yellow-500 text-neutral-950" : "bg-neutral-800 text-neutral-600 cursor-not-allowed"}`}
      >
        {dirty ? "💾 Kaydet" : "Değişiklik yok"}
      </button>
    </div>
  );
}
