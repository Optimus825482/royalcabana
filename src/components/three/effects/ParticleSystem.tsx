"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleSystemProps {
  count?: number;
  areaWidth?: number;
  areaDepth?: number;
  maxHeight?: number;
  color?: string;
  size?: number;
  speed?: number;
  visible?: boolean;
}

/** Generate particle data outside of render */
function generateParticles(
  count: number,
  areaWidth: number,
  areaDepth: number,
  maxHeight: number,
  speed: number,
) {
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const ph = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    pos[i3] = (Math.random() - 0.5) * areaWidth;
    pos[i3 + 1] = Math.random() * maxHeight;
    pos[i3 + 2] = (Math.random() - 0.5) * areaDepth;

    vel[i3] = (Math.random() - 0.5) * 0.02 * speed;
    vel[i3 + 1] = (Math.random() * 0.005 + 0.002) * speed;
    vel[i3 + 2] = (Math.random() - 0.5) * 0.015 * speed;

    ph[i] = Math.random() * Math.PI * 2;
  }

  return { positions: pos, velocities: vel, phases: ph };
}

export default function ParticleSystem({
  count = 200,
  areaWidth = 24,
  areaDepth = 12,
  maxHeight = 3,
  color = "#fef3c7",
  size = 0.03,
  speed = 1,
  visible = true,
}: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const velRef = useRef<Float32Array | null>(null);
  const phRef = useRef<Float32Array | null>(null);
  const readyRef = useRef(false);

  // Generate particle data in an effect (not during render)
  useEffect(() => {
    const data = generateParticles(
      count,
      areaWidth,
      areaDepth,
      maxHeight,
      speed,
    );
    velRef.current = data.velocities;
    phRef.current = data.phases;

    // Defer geometry update to next frame to ensure ref is mounted
    requestAnimationFrame(() => {
      if (pointsRef.current) {
        const geo = pointsRef.current.geometry;
        geo.setAttribute(
          "position",
          new THREE.BufferAttribute(data.positions, 3),
        );
        readyRef.current = true;
      }
    });
  }, [count, areaWidth, areaDepth, maxHeight, speed]);

  useFrame(({ clock }) => {
    if (
      !pointsRef.current ||
      !visible ||
      !velRef.current ||
      !phRef.current ||
      !readyRef.current
    )
      return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;
    const velocities = velRef.current;
    const phases = phRef.current;
    const t = clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      arr[i3] += velocities[i3] + Math.sin(t * 0.5 + phases[i]) * 0.003;
      arr[i3 + 1] += velocities[i3 + 1];
      arr[i3 + 2] += velocities[i3 + 2] + Math.cos(t * 0.3 + phases[i]) * 0.002;

      if (arr[i3 + 1] > maxHeight) {
        arr[i3 + 1] = 0;
        arr[i3] = (Math.random() - 0.5) * areaWidth;
        arr[i3 + 2] = (Math.random() - 0.5) * areaDepth;
      }

      if (arr[i3] > areaWidth / 2) arr[i3] = -areaWidth / 2;
      if (arr[i3] < -areaWidth / 2) arr[i3] = areaWidth / 2;
      if (arr[i3 + 2] > areaDepth / 2) arr[i3 + 2] = -areaDepth / 2;
      if (arr[i3 + 2] < -areaDepth / 2) arr[i3 + 2] = areaDepth / 2;
    }

    posAttr.needsUpdate = true;
  });

  if (!visible) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
