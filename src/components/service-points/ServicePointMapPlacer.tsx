"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Lock, Unlock, RotateCw, ZoomIn, ZoomOut, Move } from "lucide-react";

const MAP_IMG = "/gorsel/sonnn.png";
const MAP_W = 1040;
const MAP_H = 678;

interface ServicePointMapPlacerProps {
  initialX?: number | null;
  initialY?: number | null;
  initialRotation?: number;
  initialScale?: number;
  initialLocked?: boolean;
  servicePointType: string;
  servicePointName: string;
  onSave: (data: {
    coordX: number;
    coordY: number;
    rotation: number;
    scale: number;
    isLocked: boolean;
  }) => void;
  onCancel: () => void;
}

const TYPE_ICONS: Record<string, { emoji: string; color: string }> = {
  BAR: { emoji: "🍸", color: "#f59e0b" },
  RESTAURANT: { emoji: "🍽️", color: "#ef4444" },
  POOL_BAR: { emoji: "🏊", color: "#3b82f6" },
  BEACH_BAR: { emoji: "🏖️", color: "#f97316" },
  SPA: { emoji: "💆", color: "#8b5cf6" },
  RECEPTION: { emoji: "🏨", color: "#10b981" },
  SHOP: { emoji: "🛍️", color: "#ec4899" },
  OTHER: { emoji: "📍", color: "#6b7280" },
};

export default function ServicePointMapPlacer({
  initialX,
  initialY,
  initialRotation = 0,
  initialScale = 1,
  initialLocked = false,
  servicePointType,
  servicePointName,
  onSave,
  onCancel,
}: ServicePointMapPlacerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({
    x: initialX ?? MAP_W / 2,
    y: initialY ?? MAP_H / 2,
  });
  const [rotation, setRotation] = useState(initialRotation);
  const [scale, setScale] = useState(initialScale);
  const [locked, setLocked] = useState(initialLocked);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const icon = TYPE_ICONS[servicePointType] || TYPE_ICONS.OTHER;

  const getMapCoords = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const x = (clientX - rect.left - pan.x) / zoom;
      const y = (clientY - rect.top - pan.y) / zoom;
      return {
        x: Math.max(0, Math.min(MAP_W, x)),
        y: Math.max(0, Math.min(MAP_H, y)),
      };
    },
    [zoom, pan],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (locked) return;
      e.preventDefault();
      e.stopPropagation();
      const coords = getMapCoords(e.clientX, e.clientY);
      dragOffset.current = { x: coords.x - pos.x, y: coords.y - pos.y };
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [locked, pos, getMapCoords],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isPanning.current) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
        panStart.current = { x: e.clientX, y: e.clientY };
        return;
      }
      if (!dragging) return;
      const coords = getMapCoords(e.clientX, e.clientY);
      setPos({
        x: coords.x - dragOffset.current.x,
        y: coords.y - dragOffset.current.y,
      });
    },
    [dragging, getMapCoords],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    isPanning.current = false;
  }, []);

  const handleBgPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-sp-icon]")) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(3, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (locked) return;
      if (e.key === "ArrowLeft") setRotation((r) => r - 5);
      if (e.key === "ArrowRight") setRotation((r) => r + 5);
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(3, s + 0.1));
      if (e.key === "-") setScale((s) => Math.max(0.3, s - 0.1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [locked]);

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-neutral-800 rounded-lg px-2 py-1.5 border border-neutral-700">
          <label className="text-xs text-neutral-400">Döndür:</label>
          <input
            type="range"
            min={-180}
            max={180}
            step={5}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            disabled={locked}
            className="w-20 accent-amber-500 h-1"
            aria-label="Döndürme açısı"
          />
          <span className="text-xs text-neutral-300 w-8 tabular-nums">
            {rotation}°
          </span>
          <button
            onClick={() => setRotation(0)}
            disabled={locked}
            className="p-1 rounded hover:bg-neutral-700 text-neutral-400 disabled:opacity-40"
            title="Sıfırla"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-800 rounded-lg px-2 py-1.5 border border-neutral-700">
          <label className="text-xs text-neutral-400">Ölçek:</label>
          <input
            type="range"
            min={0.3}
            max={3}
            step={0.1}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            disabled={locked}
            className="w-16 accent-amber-500 h-1"
            aria-label="Ölçek"
          />
          <span className="text-xs text-neutral-300 w-8 tabular-nums">
            {scale.toFixed(1)}x
          </span>
        </div>

        <button
          onClick={() => setLocked((l) => !l)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
            locked
              ? "bg-amber-900/50 border-amber-700/50 text-amber-400"
              : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          {locked ? (
            <Lock className="w-3.5 h-3.5" />
          ) : (
            <Unlock className="w-3.5 h-3.5" />
          )}
          {locked ? "Sabitlendi" : "Sabitle"}
        </button>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700"
            title="Yakınlaştır"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700"
            title="Uzaklaştır"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700"
            title="Sıfırla"
          >
            <Move className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-neutral-500">
        {locked
          ? "🔒 Konum sabitlendi. Kilidi açarak tekrar taşıyabilirsiniz."
          : "İkonu sürükleyerek konumlandırın. Ok tuşları ile döndürün, +/- ile ölçekleyin."}
      </p>

      {/* Map Container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 cursor-grab active:cursor-grabbing"
        style={{ height: 420 }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerDown={handleBgPointerDown}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: MAP_W,
            height: MAP_H,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MAP_IMG}
            alt="Resort haritası"
            width={MAP_W}
            height={MAP_H}
            draggable={false}
            className="select-none pointer-events-none"
            style={{ imageRendering: "auto" }}
          />

          {/* Service Point Icon */}
          <div
            data-sp-icon
            onPointerDown={handlePointerDown}
            className={`absolute select-none ${locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}`}
            style={{
              left: pos.x,
              top: pos.y,
              transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
              zIndex: 10,
            }}
          >
            <div
              className={`flex flex-col items-center ${dragging ? "opacity-80" : ""}`}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-lg border-2 transition-shadow"
                style={{
                  backgroundColor: icon.color + "33",
                  borderColor: locked ? "#eab308" : icon.color,
                  boxShadow: dragging
                    ? `0 0 16px ${icon.color}88`
                    : `0 2px 8px rgba(0,0,0,0.5)`,
                }}
              >
                {icon.emoji}
              </div>
              <span
                className="text-[9px] text-white font-medium mt-0.5 whitespace-nowrap bg-black/60 px-1.5 py-0.5 rounded"
                style={{ transform: `rotate(${-rotation}deg)` }}
              >
                {servicePointName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Coordinates display */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          X: {Math.round(pos.x)} · Y: {Math.round(pos.y)} · {rotation}° ·{" "}
          {scale.toFixed(1)}x
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() =>
              onSave({
                coordX: Math.round(pos.x),
                coordY: Math.round(pos.y),
                rotation,
                scale,
                isLocked: locked,
              })
            }
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-neutral-950 font-semibold transition-colors"
          >
            Konumu Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
