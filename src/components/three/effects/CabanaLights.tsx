"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TimeOfDay } from "./SkyDome";

interface CabanaLightsProps {
  /** World position of the cabana */
  position: [number, number, number];
  /** Current time of day */
  timeOfDay: TimeOfDay;
  /** Light color */
  color?: string;
}

/**
 * Warm point light that appears on cabanas during sunset/night.
 * Includes a subtle flicker animation for realism.
 */
export default function CabanaLight({
  position,
  timeOfDay,
  color = "#ffb347",
}: CabanaLightsProps) {
  const lightRef = useRef<THREE.PointLight>(null);

  const isLit = timeOfDay === "sunset" || timeOfDay === "night";

  useFrame(({ clock }) => {
    if (!lightRef.current || !isLit) return;
    // Subtle flicker
    const flicker =
      0.8 +
      Math.sin(clock.elapsedTime * 3 + position[0] * 10) * 0.1 +
      Math.sin(clock.elapsedTime * 7 + position[2] * 5) * 0.1;
    lightRef.current.intensity = flicker;
  });

  if (!isLit) return null;

  return (
    <>
      <pointLight
        ref={lightRef}
        position={[position[0], 0.8, position[2]]}
        color={color}
        intensity={0.8}
        distance={3}
        decay={2}
      />
      {/* Small glowing sphere to visualize the light source */}
      <mesh position={[position[0], 0.6, position[2]]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}
