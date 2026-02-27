"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  Suspense,
  useMemo,
} from "react";
import {
  Canvas,
  useFrame,
  useLoader,
  useThree,
  ThreeEvent,
} from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import Image from "next/image";
import { CabanaWithStatus, CabanaStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThreeViewProps {
  cabanas: CabanaWithStatus[];
  editable?: boolean;
  onCabanaClick?: (cabana: CabanaWithStatus) => void;
  onLocationUpdate?: (
    cabanaId: string,
    coordX: number,
    coordY: number,
    rotation?: number,
  ) => void;
  onMapClick?: (coordY: number, coordX: number) => void;
  selectedCabanaId?: string;
  placementCoords?: { lat: number; lng: number } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const IMG_W = 1472;
const IMG_H = 704;
const PLANE_W = 24;
const PLANE_H = PLANE_W * (IMG_H / IMG_W);

const GALLERY_IMAGES = [
  { src: "/gorsel/ust.webp", label: "Üst" },
  { src: "/gorsel/on.webp", label: "Ön" },
  { src: "/gorsel/sag.webp", label: "Sağ" },
  { src: "/gorsel/sol.webp", label: "Sol" },
  { src: "/gorsel/arka.webp", label: "Arka" },
];

const ROTATE_STEP = Math.PI / 12; // 15 degrees per scroll tick
const ROTATION_EPSILON = 0.001; // dirty flag threshold for useFrame lerp

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pixelToWorld(
  coordX: number,
  coordY: number,
): [number, number, number] {
  const x = (coordX / IMG_W) * PLANE_W - PLANE_W / 2;
  const z = (coordY / IMG_H) * PLANE_H - PLANE_H / 2;
  return [x, 0, z];
}

function worldToPixel(
  wx: number,
  wz: number,
): { coordX: number; coordY: number } {
  const coordX = ((wx + PLANE_W / 2) / PLANE_W) * IMG_W;
  const coordY = ((wz + PLANE_H / 2) / PLANE_H) * IMG_H;
  return { coordX, coordY };
}

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

function getClassDimensions(className?: string): [number, number, number] {
  const name = (className ?? "").toLowerCase();
  if (name.includes("vip") || name.includes("suite")) return [0.7, 0.55, 0.7];
  if (name.includes("premium") || name.includes("deluxe"))
    return [0.6, 0.45, 0.6];
  if (name.includes("standart") || name.includes("standard"))
    return [0.5, 0.35, 0.5];
  if (name.includes("ekonomi") || name.includes("basic"))
    return [0.4, 0.28, 0.4];
  return [0.5, 0.4, 0.5];
}

// ─── Draggable Cabana Mesh ────────────────────────────────────────────────────

interface CabanaMeshProps {
  cabana: CabanaWithStatus;
  position: [number, number, number];
  isSelected: boolean;
  draggable: boolean;
  cameraLocked: boolean;
  hoveredId: string | null;
  onHover: (cabana: CabanaWithStatus | null) => void;
  onClick: (cabana: CabanaWithStatus) => void;
  onDragEnd?: (
    cabana: CabanaWithStatus,
    wx: number,
    wz: number,
    rotation: number,
  ) => void;
}

function CabanaMesh({
  cabana,
  position,
  isSelected,
  draggable,
  cameraLocked,
  hoveredId,
  onHover,
  onClick,
  onDragEnd,
}: CabanaMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [dragging, setDragging] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(
    ((cabana.rotation ?? 0) * Math.PI) / 180,
  );
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  // [FIX C1] Reusable Vector3 refs — no allocation per pointer event
  const dragOffset = useRef(new THREE.Vector3());
  const intersectVec = useRef(new THREE.Vector3());
  const { raycaster, gl } = useThree();

  const hovered = hoveredId === cabana.id;

  // Sync rotation from props
  useEffect(() => {
    setCurrentRotation(((cabana.rotation ?? 0) * Math.PI) / 180);
  }, [cabana.rotation]);

  const color = getStatusColor(cabana);
  const [w, h, d] = getClassDimensions(cabana.cabanaClass?.name);

  // [FIX C1] useFrame with dirty flag — stop lerp when rotation settled
  useFrame(() => {
    if (!groupRef.current) return;
    const diff = Math.abs(groupRef.current.rotation.y - currentRotation);
    if (diff < ROTATION_EPSILON) {
      groupRef.current.rotation.y = currentRotation;
      return; // settled — skip lerp
    }
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      currentRotation,
      0.15,
    );
  });

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHover(cabana);
    },
    [cabana, onHover],
  );

  const handlePointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHover(null);
    },
    [onHover],
  );

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!draggable || !cameraLocked) {
        onClick(cabana);
        return;
      }
      setDragging(true);
      raycaster.ray.intersectPlane(dragPlane.current, intersectVec.current);
      if (groupRef.current) {
        dragOffset.current
          .copy(intersectVec.current)
          .sub(groupRef.current.position);
      }
      (gl.domElement as HTMLElement).setPointerCapture(e.pointerId);
    },
    [cabana, draggable, cameraLocked, onClick, raycaster, gl],
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!dragging || !groupRef.current) return;
      e.stopPropagation();
      raycaster.ray.intersectPlane(dragPlane.current, intersectVec.current);
      const newX = THREE.MathUtils.clamp(
        intersectVec.current.x - dragOffset.current.x,
        -PLANE_W / 2,
        PLANE_W / 2,
      );
      const newZ = THREE.MathUtils.clamp(
        intersectVec.current.z - dragOffset.current.z,
        -PLANE_H / 2,
        PLANE_H / 2,
      );
      groupRef.current.position.x = newX;
      groupRef.current.position.z = newZ;
    },
    [dragging, raycaster],
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!dragging) return;
      e.stopPropagation();
      setDragging(false);
      if (groupRef.current && onDragEnd) {
        const rotDeg = (currentRotation * 180) / Math.PI;
        onDragEnd(
          cabana,
          groupRef.current.position.x,
          groupRef.current.position.z,
          rotDeg,
        );
      }
    },
    [dragging, cabana, onDragEnd, currentRotation],
  );

  // Expose rotation setter for scene-level handlers
  // Store in a ref so Scene can call it
  const rotationSetterRef = useRef(setCurrentRotation);
  rotationSetterRef.current = setCurrentRotation;

  // Attach cabana id to group userData for scene-level event routing
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.cabanaId = cabana.id;
      groupRef.current.userData.setRotation = rotationSetterRef;
    }
  }, [cabana.id]);

  const umbrellaR = w * 0.7;
  const poleH = h * 1.6;

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Platform / Base */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[w + 0.15, 0.04, d + 0.15]} />
        <meshStandardMaterial color="#78716c" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Cabana body (low walls) */}
      <mesh
        position={[0, h * 0.35, 0]}
        castShadow
        receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[w, h * 0.7, d]} />
        <meshStandardMaterial
          color={dragging ? "#fbbf24" : color}
          emissive={isSelected ? color : hovered ? color : "#000000"}
          emissiveIntensity={isSelected ? 0.4 : hovered ? 0.2 : 0}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Umbrella pole */}
      <mesh position={[0, poleH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, poleH, 8]} />
        <meshStandardMaterial color="#a8a29e" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Umbrella canopy (cone) */}
      <mesh position={[0, poleH + 0.02, 0]} castShadow>
        <coneGeometry args={[umbrellaR, 0.18, 16]} />
        <meshStandardMaterial
          color="#fef3c7"
          roughness={0.6}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Lounger 1 (left) */}
      <mesh position={[-w * 0.28, 0.08, d * 0.15]} castShadow>
        <boxGeometry args={[0.12, 0.06, d * 0.55]} />
        <meshStandardMaterial
          color="#d6d3d1"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Lounger 2 (right) */}
      <mesh position={[w * 0.28, 0.08, d * 0.15]} castShadow>
        <boxGeometry args={[0.12, 0.06, d * 0.55]} />
        <meshStandardMaterial
          color="#d6d3d1"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Small table (center) */}
      <mesh position={[0, 0.12, -d * 0.2]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 8]} />
        <meshStandardMaterial color="#292524" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Selection ring */}
      {(isSelected || dragging) && (
        <mesh position={[0, h * 0.35, 0]}>
          <boxGeometry args={[w + 0.14, h * 0.7 + 0.1, d + 0.14]} />
          <meshStandardMaterial
            color="#fbbf24"
            wireframe
            transparent
            opacity={dragging ? 1 : 0.85}
          />
        </mesh>
      )}

      {/* Rotation indicator arrow (visible when editing + hovered) */}
      {draggable && cameraLocked && hovered && !dragging && (
        <mesh position={[0, poleH + 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.06, 0.15, 6]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}

// ─── Placement Preview (yellow pulsing sphere) ───────────────────────────────

function PlacementPreview({
  position,
}: {
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.15;
    meshRef.current.scale.setScalar(s);
  });
  return (
    <mesh ref={meshRef} position={[position[0], 0.25, position[2]]}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial
        color="#eab308"
        emissive="#eab308"
        emissiveIntensity={0.6}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

// ─── Ground Click Handler ─────────────────────────────────────────────────────

function GroundClickHandler({
  onGroundClick,
  cameraLocked,
}: {
  onGroundClick: (wx: number, wz: number) => void;
  cameraLocked: boolean;
}) {
  const groundPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    [],
  );
  const intersectVec = useRef(new THREE.Vector3());
  const { raycaster } = useThree();

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!cameraLocked) return;
      raycaster.ray.intersectPlane(groundPlane, intersectVec.current);
      if (
        Math.abs(intersectVec.current.x) <= PLANE_W / 2 &&
        Math.abs(intersectVec.current.z) <= PLANE_H / 2
      ) {
        onGroundClick(intersectVec.current.x, intersectVec.current.z);
      }
    },
    [cameraLocked, onGroundClick, raycaster, groundPlane],
  );

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.001, 0]}
      onClick={handleClick}
      visible={false}
    >
      <planeGeometry args={[PLANE_W, PLANE_H]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// ─── Ground Plane with Texture ────────────────────────────────────────────────

function GroundPlane() {
  const texture = useLoader(THREE.TextureLoader, "/gorsel/ust.webp");

  // [FIX H5] Set texture colorSpace + anisotropy for color accuracy & sharpness
  useEffect(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
  }, [texture]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      receiveShadow
    >
      <planeGeometry args={[PLANE_W, PLANE_H]} />
      <meshStandardMaterial map={texture} roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

// ─── Scene-Level Tooltip (single DOM mount) ──────────────────────────────────
// [FIX H7] Single tooltip at Scene level instead of per-cabana Html mount/unmount

function SceneTooltip({
  cabana,
  editable,
  cameraLocked,
}: {
  cabana: CabanaWithStatus | null;
  editable: boolean;
  cameraLocked: boolean;
}) {
  if (!cabana) return null;
  const [, , d] = getClassDimensions(cabana.cabanaClass?.name);
  const poleH = d * 1.6;
  const pos = pixelToWorld(cabana.coordX, cabana.coordY);

  return (
    <Html
      position={[pos[0], poleH + 0.5, pos[2]]}
      center
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          background: "rgba(10,10,10,0.9)",
          border: "1px solid rgba(251,191,36,0.5)",
          borderRadius: 6,
          padding: "4px 10px",
          color: "#fbbf24",
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: "nowrap",
          backdropFilter: "blur(4px)",
        }}
      >
        {cabana.name}
        {editable && cameraLocked && (
          <span style={{ color: "#a8a29e", fontWeight: 400, marginLeft: 6 }}>
            Scroll: döndür · Sağ tık: 45°
          </span>
        )}
      </div>
    </Html>
  );
}

// ─── 3D Scene ─────────────────────────────────────────────────────────────────

interface SceneProps {
  cabanas: CabanaWithStatus[];
  editable: boolean;
  cameraLocked: boolean;
  selectedCabanaId?: string;
  placementWorldPos: [number, number, number] | null;
  hoveredCabana: CabanaWithStatus | null;
  onHover: (cabana: CabanaWithStatus | null) => void;
  onSelect: (cabana: CabanaWithStatus) => void;
  onDragEnd?: (
    cabana: CabanaWithStatus,
    wx: number,
    wz: number,
    rotation: number,
  ) => void;
  onGroundClick?: (wx: number, wz: number) => void;
}

function Scene({
  cabanas,
  editable,
  cameraLocked,
  selectedCabanaId,
  placementWorldPos,
  hoveredCabana,
  onHover,
  onSelect,
  onDragEnd,
  onGroundClick,
}: SceneProps) {
  const { gl } = useThree();
  const hoveredRef = useRef<string | null>(null);

  // [FIX L15] Cache pixelToWorld calculations — only recalculate when cabana coords change
  const positionMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const c of cabanas) {
      map.set(c.id, pixelToWorld(c.coordX, c.coordY));
    }
    return map;
  }, [cabanas]);

  // Keep ref in sync for event handlers
  useEffect(() => {
    hoveredRef.current = hoveredCabana?.id ?? null;
  }, [hoveredCabana]);

  // [FIX H4] Single global wheel handler for rotation (instead of per-cabana)
  useEffect(() => {
    if (!editable || !cameraLocked) return;
    const handler = (e: WheelEvent) => {
      if (!hoveredRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      // Find the cabana's rotation setter via scene traversal
      const scene = gl.domElement.parentElement;
      if (!scene) return;
      // We stored setRotation ref in userData — find it
      const canvas = gl.domElement;
      // Access R3F scene through __r3f
      const r3fState = (canvas as unknown as Record<string, unknown>).__r3f as
        | { scene?: THREE.Scene }
        | undefined;
      if (!r3fState?.scene) return;
      r3fState.scene.traverse((obj: THREE.Object3D) => {
        if (
          obj.userData.cabanaId === hoveredRef.current &&
          obj.userData.setRotation
        ) {
          const setterRef = obj.userData.setRotation as React.RefObject<
            React.Dispatch<React.SetStateAction<number>>
          >;
          setterRef.current(
            (prev: number) =>
              prev + (e.deltaY > 0 ? ROTATE_STEP : -ROTATE_STEP),
          );
        }
      });
    };
    const el = gl.domElement;
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [editable, cameraLocked, gl]);

  // [FIX H4] Single global contextmenu handler for 45° rotation
  useEffect(() => {
    if (!editable || !cameraLocked) return;
    const handler = (e: MouseEvent) => {
      if (!hoveredRef.current) return;
      e.preventDefault();
      const r3fState = (gl.domElement as unknown as Record<string, unknown>)
        .__r3f as { scene?: THREE.Scene } | undefined;
      if (!r3fState?.scene) return;
      r3fState.scene.traverse((obj: THREE.Object3D) => {
        if (
          obj.userData.cabanaId === hoveredRef.current &&
          obj.userData.setRotation
        ) {
          const setterRef = obj.userData.setRotation as React.RefObject<
            React.Dispatch<React.SetStateAction<number>>
          >;
          setterRef.current((prev: number) => prev + Math.PI / 4);
        }
      });
    };
    const el = gl.domElement;
    el.addEventListener("contextmenu", handler);
    return () => el.removeEventListener("contextmenu", handler);
  }, [editable, cameraLocked, gl]);

  // [FIX H6] Cursor management at scene level (no race conditions)
  useEffect(() => {
    if (hoveredCabana) {
      document.body.style.cursor =
        editable && cameraLocked ? "grab" : "pointer";
    } else {
      document.body.style.cursor = "auto";
    }
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hoveredCabana, editable, cameraLocked]);

  // [FIX L14] Mobile touch: two-finger twist to rotate hovered cabana
  useEffect(() => {
    if (!editable || !cameraLocked) return;
    let lastAngle: number | null = null;
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !hoveredRef.current) return;
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const angle = Math.atan2(dy, dx);
      if (lastAngle !== null) {
        const delta = angle - lastAngle;
        const r3fState = (gl.domElement as unknown as Record<string, unknown>)
          .__r3f as { scene?: THREE.Scene } | undefined;
        if (r3fState?.scene) {
          r3fState.scene.traverse((obj: THREE.Object3D) => {
            if (
              obj.userData.cabanaId === hoveredRef.current &&
              obj.userData.setRotation
            ) {
              const setterRef = obj.userData.setRotation as React.RefObject<
                React.Dispatch<React.SetStateAction<number>>
              >;
              setterRef.current((prev: number) => prev + delta);
            }
          });
        }
      }
      lastAngle = angle;
    };
    const handleTouchEnd = () => {
      lastAngle = null;
    };
    const el = gl.domElement;
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);
    return () => {
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [editable, cameraLocked, gl]);

  return (
    <>
      <ambientLight intensity={0.55} />
      {/* [FIX C3] Shadow map 2048 + frustum bounds matching PLANE_W/PLANE_H */}
      <directionalLight
        position={[12, 16, 8]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-PLANE_W / 2}
        shadow-camera-right={PLANE_W / 2}
        shadow-camera-top={PLANE_H / 2}
        shadow-camera-bottom={-PLANE_H / 2}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.001}
      />
      <directionalLight
        position={[-8, 8, -6]}
        intensity={0.35}
        color="#93c5fd"
      />
      {/* [FIX M11] Hemisphere light for more natural ambient */}
      <hemisphereLight args={["#b0d4f1", "#8b7355", 0.3]} />
      {/* [FIX M11] Subtle fog for depth perception */}
      <fog attach="fog" args={["#0a0a0a", 20, 45]} />

      <GroundPlane />

      {editable && onGroundClick && (
        <GroundClickHandler
          onGroundClick={onGroundClick}
          cameraLocked={cameraLocked}
        />
      )}

      {placementWorldPos && <PlacementPreview position={placementWorldPos} />}

      {/* [FIX L15] Memoized position map — avoid recalculating pixelToWorld every render */}
      {cabanas.map((cabana) => {
        return (
          <CabanaMesh
            key={cabana.id}
            cabana={cabana}
            position={
              positionMap.get(cabana.id) ??
              pixelToWorld(cabana.coordX, cabana.coordY)
            }
            isSelected={cabana.id === selectedCabanaId}
            draggable={editable}
            cameraLocked={cameraLocked}
            hoveredId={hoveredCabana?.id ?? null}
            onHover={onHover}
            onClick={onSelect}
            onDragEnd={onDragEnd}
          />
        );
      })}

      {/* [FIX H7] Single tooltip at scene level */}
      <SceneTooltip
        cabana={hoveredCabana}
        editable={editable}
        cameraLocked={cameraLocked}
      />

      {/* [FIX M10] Conditional mount — unmount when locked to free resources */}
      {!cameraLocked && (
        <OrbitControls
          makeDefault
          minDistance={3}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.15}
        />
      )}
    </>
  );
}

// ─── Photo Gallery ────────────────────────────────────────────────────────────

function PhotoGallery({
  cabana,
  onClose,
}: {
  cabana: CabanaWithStatus;
  onClose: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  return (
    <div className="flex flex-col h-full">
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
      <div className="px-4 pt-3 shrink-0">
        <StatusBadge cabana={cabana} />
      </div>
      <div className="px-4 pt-3 shrink-0">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-neutral-800">
          <Image
            src={GALLERY_IMAGES[activeIdx].src}
            alt={GALLERY_IMAGES[activeIdx].label}
            fill
            className="object-cover"
            sizes="320px"
          />
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
            {GALLERY_IMAGES[activeIdx].label}
          </div>
        </div>
      </div>
      <div className="px-4 pt-2 shrink-0">
        <div className="flex gap-1.5">
          {GALLERY_IMAGES.map((img, idx) => (
            <button
              key={img.src}
              onClick={() => setActiveIdx(idx)}
              className={`relative w-12 h-10 rounded overflow-hidden border-2 transition-colors shrink-0 ${idx === activeIdx ? "border-yellow-500" : "border-neutral-700 hover:border-neutral-500"}`}
            >
              <Image
                src={img.src}
                alt={img.label}
                fill
                className="object-cover"
                sizes="48px"
              />
            </button>
          ))}
        </div>
      </div>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CabanaThreeViewInner({
  cabanas,
  editable = false,
  onCabanaClick,
  onLocationUpdate,
  onMapClick,
  selectedCabanaId,
  placementCoords,
}: ThreeViewProps) {
  const [hoveredCabana, setHoveredCabana] = useState<CabanaWithStatus | null>(
    null,
  );
  // [FIX L17] Derived state — no separate selectedCabana state, derive from cabanas + id
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    selectedCabanaId ?? null,
  );
  const [cameraLocked, setCameraLocked] = useState(false);
  const [webglError, setWebglError] = useState(false);

  const activeSelectedId = selectedCabanaId ?? internalSelectedId;
  const selectedCabana = useMemo(
    () => cabanas.find((c) => c.id === activeSelectedId) ?? null,
    [cabanas, activeSelectedId],
  );

  // Sync external selectedCabanaId
  useEffect(() => {
    if (selectedCabanaId) setInternalSelectedId(selectedCabanaId);
  }, [selectedCabanaId]);

  // Keyboard shortcut: Space to toggle camera lock
  useEffect(() => {
    if (!editable) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        setCameraLocked((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editable]);

  const handleSelect = useCallback(
    (cabana: CabanaWithStatus) => {
      setInternalSelectedId(cabana.id);
      onCabanaClick?.(cabana);
    },
    [onCabanaClick],
  );

  const handleClosePanel = useCallback(() => {
    setInternalSelectedId(null);
  }, []);

  const handleDragEnd = useCallback(
    (cabana: CabanaWithStatus, wx: number, wz: number, rotation: number) => {
      const { coordX, coordY } = worldToPixel(wx, wz);
      onLocationUpdate?.(cabana.id, coordX, coordY, rotation);
    },
    [onLocationUpdate],
  );

  const handleGroundClick = useCallback(
    (wx: number, wz: number) => {
      const { coordX, coordY } = worldToPixel(wx, wz);
      onMapClick?.(coordY, coordX);
    },
    [onMapClick],
  );

  const placementWorldPos = useMemo<[number, number, number] | null>(() => {
    if (!placementCoords) return null;
    return pixelToWorld(placementCoords.lng, placementCoords.lat);
  }, [placementCoords]);

  // [FIX M13] WebGL pre-check before Canvas mount
  useEffect(() => {
    try {
      const testCanvas = document.createElement("canvas");
      const ctx =
        testCanvas.getContext("webgl2") || testCanvas.getContext("webgl");
      if (!ctx) setWebglError(true);
    } catch {
      setWebglError(true);
    }
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
          3D görünüm desteklenmiyor
        </p>
        <p className="text-xs text-neutral-600">
          Tarayıcınız WebGL desteklemiyor veya grafik sürücüsü devre dışı.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-neutral-950 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            {editable && (
              <button
                onClick={() => setCameraLocked((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  cameraLocked
                    ? "bg-amber-600 text-neutral-950 shadow-lg shadow-amber-600/20"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                }`}
              >
                {cameraLocked ? "🔒 Düzenleme Modu" : "🔓 Kamera Serbest"}
              </button>
            )}
            <span className="text-xs text-neutral-500">
              {hoveredCabana ? (
                <span className="text-yellow-400 font-medium">
                  {hoveredCabana.name}
                </span>
              ) : editable && cameraLocked ? (
                "Kabanaları sürükleyin veya zemine tıklayarak yeni ekleyin"
              ) : (
                "Kabana üzerine gelin veya tıklayın"
              )}
            </span>
            {/* [FIX L16] Accessibility — screen reader announcement for hovered cabana */}
            <span className="sr-only" role="status" aria-live="polite">
              {hoveredCabana
                ? `${hoveredCabana.name} seçili — ${hoveredCabana.cabanaClass?.name ?? ""} sınıfı`
                : ""}
            </span>
          </div>
          <Legend />
        </div>

        {/* Canvas */}
        <div
          className="flex-1 relative"
          role="application"
          aria-label="3D Kabana Haritası"
        >
          {/* [FIX M12] Canvas GL config: toneMapping, colorSpace, pixelRatio limit */}
          <Canvas
            shadows
            camera={{ position: [0, 14, 12], fov: 50 }}
            dpr={[1, 2]}
            gl={{
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              outputColorSpace: THREE.SRGBColorSpace,
            }}
            style={{ background: "#0a0a0a" }}
          >
            <Suspense fallback={null}>
              <Scene
                cabanas={cabanas}
                editable={editable}
                cameraLocked={cameraLocked}
                selectedCabanaId={activeSelectedId ?? undefined}
                placementWorldPos={placementWorldPos}
                hoveredCabana={hoveredCabana}
                onHover={setHoveredCabana}
                onSelect={handleSelect}
                onDragEnd={editable ? handleDragEnd : undefined}
                onGroundClick={editable ? handleGroundClick : undefined}
              />
            </Suspense>
          </Canvas>

          {cabanas.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-neutral-600 text-sm">Kabana verisi yok</p>
            </div>
          )}
        </div>

        {/* Controls hint */}
        <div className="px-4 py-2 border-t border-neutral-800 shrink-0">
          <p className="text-xs text-neutral-600">
            {editable
              ? cameraLocked
                ? "🔒 Düzenleme aktif · Sürükle: taşı · Scroll: döndür · Sağ tık: 45° döndür · Tıkla: yeni ekle · Space: kamera serbest · Mobil: iki parmak çevir"
                : "🔓 Kamera serbest · Sol tık: döndür · Sağ tık: kaydır · Tekerlek: zoom · Space: düzenleme modu"
              : "Sol tık + sürükle: döndür · Sağ tık + sürükle: kaydır · Tekerlek: zoom"}
          </p>
        </div>
      </div>

      {/* Detail panel */}
      {selectedCabana && !editable && (
        <div className="w-72 shrink-0 border-l border-neutral-800 bg-neutral-900 overflow-y-auto">
          <PhotoGallery cabana={selectedCabana} onClose={handleClosePanel} />
        </div>
      )}
    </div>
  );
}
