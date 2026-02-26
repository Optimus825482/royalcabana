"use client";

import { useRef, useState, useCallback, Suspense } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import Image from "next/image";
import { CabanaWithStatus, CabanaStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThreeViewProps {
  cabanas: CabanaWithStatus[];
  onCabanaClick?: (cabana: CabanaWithStatus) => void;
  selectedCabanaId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GALLERY_IMAGES = [
  { src: "/gorsel/on.png", label: "Ön" },
  { src: "/gorsel/arka.jpg", label: "Arka" },
  { src: "/gorsel/sag.png", label: "Sağ" },
  { src: "/gorsel/sol.png", label: "Sol" },
  { src: "/gorsel/ust.png", label: "Üst" },
];

// Grid layout: columns per row
const GRID_COLS = 5;
const SPACING_X = 3.5;
const SPACING_Z = 3.5;

// Status colors
function getStatusColor(cabana: CabanaWithStatus): string {
  if (!cabana.isOpenForReservation) return "#6b7280";
  switch (cabana.status) {
    case CabanaStatus.AVAILABLE:
      return "#22c55e";
    case CabanaStatus.RESERVED:
      return "#ef4444";
    case CabanaStatus.CLOSED:
      return "#6b7280";
    default:
      return "#6b7280";
  }
}

// Class-based geometry dimensions [width, height, depth]
function getClassDimensions(className?: string): [number, number, number] {
  const name = (className ?? "").toLowerCase();
  if (name.includes("vip") || name.includes("suite")) return [1.8, 1.4, 1.8];
  if (name.includes("premium") || name.includes("deluxe"))
    return [1.5, 1.2, 1.5];
  if (name.includes("standart") || name.includes("standard"))
    return [1.2, 0.9, 1.2];
  if (name.includes("ekonomi") || name.includes("basic"))
    return [1.0, 0.7, 1.0];
  // Default: vary by index hash
  return [1.2, 1.0, 1.2];
}

// ─── Single Cabana Mesh ───────────────────────────────────────────────────────

interface CabanaMeshProps {
  cabana: CabanaWithStatus;
  position: [number, number, number];
  isSelected: boolean;
  onHover: (cabana: CabanaWithStatus | null) => void;
  onClick: (cabana: CabanaWithStatus) => void;
}

function CabanaMesh({
  cabana,
  position,
  isSelected,
  onHover,
  onClick,
}: CabanaMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = getStatusColor(cabana);
  const [w, h, d] = getClassDimensions(cabana.cabanaClass?.name);

  // Hover: lift up slightly; selected: brighter emissive
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const targetY = position[1] + (hovered ? 0.25 : 0);
    meshRef.current.position.y = THREE.MathUtils.lerp(
      meshRef.current.position.y,
      targetY,
      delta * 8,
    );
  });

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
      onHover(cabana);
      document.body.style.cursor = "pointer";
    },
    [cabana, onHover],
  );

  const handlePointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(false);
      onHover(null);
      document.body.style.cursor = "auto";
    },
    [onHover],
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick(cabana);
    },
    [cabana, onClick],
  );

  return (
    <group position={position}>
      {/* Main box */}
      <mesh
        ref={meshRef}
        position={[0, h / 2, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected ? color : hovered ? color : "#000000"}
          emissiveIntensity={isSelected ? 0.45 : hovered ? 0.2 : 0}
          roughness={0.4}
          metalness={0.15}
        />
      </mesh>

      {/* Roof (slightly darker, pyramid-like via scaled box) */}
      <mesh position={[0, h + 0.18, 0]} castShadow>
        <boxGeometry args={[w + 0.1, 0.18, d + 0.1]} />
        <meshStandardMaterial color="#1c1917" roughness={0.8} />
      </mesh>

      {/* Selected outline ring */}
      {isSelected && (
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w + 0.12, h + 0.12, d + 0.12]} />
          <meshStandardMaterial
            color="#fbbf24"
            wireframe
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Hover tooltip via Html */}
      {hovered && (
        <Html
          position={[0, h + 0.6, 0]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(10,10,10,0.88)",
              border: "1px solid rgba(251,191,36,0.5)",
              borderRadius: 6,
              padding: "4px 10px",
              color: "#fbbf24",
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              backdropFilter: "blur(4px)",
            }}
          >
            {cabana.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Ground Plane ─────────────────────────────────────────────────────────────

function Ground({ size }: { size: number }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      receiveShadow
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#1c1917" roughness={0.9} metalness={0.05} />
    </mesh>
  );
}

// ─── 3D Scene ─────────────────────────────────────────────────────────────────

interface SceneProps {
  cabanas: CabanaWithStatus[];
  selectedCabanaId?: string;
  onHover: (cabana: CabanaWithStatus | null) => void;
  onSelect: (cabana: CabanaWithStatus) => void;
}

function Scene({ cabanas, selectedCabanaId, onHover, onSelect }: SceneProps) {
  const groundSize = Math.max(
    (Math.ceil(cabanas.length / GRID_COLS) + 1) * SPACING_Z,
    GRID_COLS * SPACING_X + 4,
  );

  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 14, 8]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-8, 6, -6]}
        intensity={0.4}
        color="#a78bfa"
      />

      {/* Ground */}
      <Ground size={groundSize} />

      {/* Cabanas */}
      {cabanas.map((cabana, idx) => {
        const col = idx % GRID_COLS;
        const row = Math.floor(idx / GRID_COLS);
        const offsetX = ((GRID_COLS - 1) / 2) * SPACING_X;
        const x = col * SPACING_X - offsetX;
        const z = row * SPACING_Z;
        return (
          <CabanaMesh
            key={cabana.id}
            cabana={cabana}
            position={[x, 0, z]}
            isSelected={cabana.id === selectedCabanaId}
            onHover={onHover}
            onClick={onSelect}
          />
        );
      })}

      <OrbitControls
        makeDefault
        minDistance={3}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.1}
        enablePan
        enableZoom
        enableRotate
      />
    </>
  );
}

// ─── Photo Gallery ────────────────────────────────────────────────────────────

interface PhotoGalleryProps {
  cabana: CabanaWithStatus;
  onClose: () => void;
}

function PhotoGallery({ cabana, onClose }: PhotoGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-yellow-400">
            {cabana.name}
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {cabana.cabanaClass?.name ?? "—"} · {cabana.concept?.name ?? "—"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-500 hover:text-neutral-200 transition-colors p-1"
          aria-label="Kapat"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Status badge */}
      <div className="px-4 pt-3 shrink-0">
        <StatusBadge cabana={cabana} />
      </div>

      {/* Main photo */}
      <div className="px-4 pt-3 shrink-0">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-neutral-800">
          <Image
            src={GALLERY_IMAGES[activeIdx].src}
            alt={GALLERY_IMAGES[activeIdx].label}
            fill
            className="object-cover"
            sizes="320px"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
            {GALLERY_IMAGES[activeIdx].label}
          </div>
        </div>
      </div>

      {/* Thumbnails */}
      <div className="px-4 pt-2 shrink-0">
        <div className="flex gap-1.5">
          {GALLERY_IMAGES.map((img, idx) => (
            <button
              key={img.src}
              onClick={() => setActiveIdx(idx)}
              className={`relative w-12 h-10 rounded overflow-hidden border-2 transition-colors shrink-0 ${
                idx === activeIdx
                  ? "border-yellow-500"
                  : "border-neutral-700 hover:border-neutral-500"
              }`}
            >
              <Image
                src={img.src}
                alt={img.label}
                fill
                className="object-cover"
                sizes="48px"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Info rows */}
      <div className="px-4 pt-4 space-y-1.5 text-xs overflow-y-auto">
        <InfoRow label="Sınıf" value={cabana.cabanaClass?.name ?? "—"} />
        <InfoRow label="Konsept" value={cabana.concept?.name ?? "—"} />
        <InfoRow
          label="Rezervasyona Açık"
          value={cabana.isOpenForReservation ? "Evet" : "Hayır"}
          valueClass={
            cabana.isOpenForReservation ? "text-green-400" : "text-neutral-500"
          }
        />
      </div>
    </div>
  );
}

function StatusBadge({ cabana }: { cabana: CabanaWithStatus }) {
  const map: Record<CabanaStatus, { label: string; cls: string }> = {
    [CabanaStatus.AVAILABLE]: {
      label: "Müsait",
      cls: "bg-green-950/60 border border-green-700/40 text-green-400",
    },
    [CabanaStatus.RESERVED]: {
      label: "Rezerve",
      cls: "bg-red-950/50 border border-red-800/40 text-red-400",
    },
    [CabanaStatus.CLOSED]: {
      label: "Kapalı",
      cls: "bg-neutral-800 border border-neutral-700 text-neutral-500",
    },
  };
  const { label, cls } = map[cabana.status] ?? map[CabanaStatus.CLOSED];
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}
    >
      {label}
    </span>
  );
}

function InfoRow({
  label,
  value,
  valueClass = "text-neutral-200",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800">
      <span className="text-neutral-500">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex gap-4 text-xs text-neutral-400">
      {[
        { color: "bg-green-500", label: "Müsait" },
        { color: "bg-red-500", label: "Rezerve" },
        { color: "bg-gray-500", label: "Kapalı" },
      ].map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-sm ${color} inline-block`} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Main Inner Component ─────────────────────────────────────────────────────

export default function CabanaThreeViewInner({
  cabanas,
  onCabanaClick,
  selectedCabanaId,
}: ThreeViewProps) {
  const [hoveredCabana, setHoveredCabana] = useState<CabanaWithStatus | null>(
    null,
  );
  const [selectedCabana, setSelectedCabana] = useState<CabanaWithStatus | null>(
    () => cabanas.find((c) => c.id === selectedCabanaId) ?? null,
  );
  const [webglError, setWebglError] = useState(false);

  const handleSelect = useCallback(
    (cabana: CabanaWithStatus) => {
      setSelectedCabana(cabana);
      onCabanaClick?.(cabana);
    },
    [onCabanaClick],
  );

  const handleClosePanel = useCallback(() => {
    setSelectedCabana(null);
  }, []);

  if (webglError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-neutral-950 text-neutral-400 gap-3 p-8 text-center">
        <svg
          className="w-12 h-12 text-neutral-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <p className="text-sm font-medium text-neutral-300">
          3D görünüm desteklenmiyor, 2D haritaya geçin
        </p>
        <p className="text-xs text-neutral-600">
          Tarayıcınız WebGL desteklemiyor veya grafik sürücüsü devre dışı.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-neutral-950 overflow-hidden">
      {/* Canvas area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">
              {hoveredCabana ? (
                <span className="text-yellow-400 font-medium">
                  {hoveredCabana.name}
                </span>
              ) : (
                "Kabana üzerine gelin veya tıklayın"
              )}
            </span>
          </div>
          <Legend />
        </div>

        {/* Three.js Canvas */}
        <div className="flex-1 relative">
          <Canvas
            shadows
            camera={{ position: [0, 8, 14], fov: 50 }}
            gl={{ antialias: true }}
            onCreated={({ gl }) => {
              // Check WebGL support
              if (!gl.getContext()) {
                setWebglError(true);
              }
            }}
            style={{ background: "#0a0a0a" }}
          >
            <Suspense fallback={null}>
              <Scene
                cabanas={cabanas}
                selectedCabanaId={selectedCabana?.id ?? selectedCabanaId}
                onHover={setHoveredCabana}
                onSelect={handleSelect}
              />
            </Suspense>
          </Canvas>

          {/* Loading overlay */}
          {cabanas.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-neutral-600 text-sm">Kabana verisi yok</p>
            </div>
          )}
        </div>

        {/* Controls hint */}
        <div className="px-4 py-2 border-t border-neutral-800 shrink-0">
          <p className="text-xs text-neutral-600">
            Sol tık + sürükle: döndür · Sağ tık + sürükle: kaydır · Tekerlek:
            zoom
          </p>
        </div>
      </div>

      {/* Detail panel */}
      {selectedCabana && (
        <div className="w-72 shrink-0 border-l border-neutral-800 bg-neutral-900 overflow-y-auto">
          <PhotoGallery cabana={selectedCabana} onClose={handleClosePanel} />
        </div>
      )}
    </div>
  );
}
