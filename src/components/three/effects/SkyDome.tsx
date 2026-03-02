"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type TimeOfDay = "morning" | "day" | "sunset" | "night";

interface SkyDomeProps {
  timeOfDay?: TimeOfDay;
  radius?: number;
}

const SKY_PRESETS: Record<
  TimeOfDay,
  {
    top: string;
    bottom: string;
    sunColor: string;
    sunY: number;
    fogColor: string;
  }
> = {
  morning: {
    top: "#4a90d9",
    bottom: "#f0c27f",
    sunColor: "#ffe4b5",
    sunY: 0.3,
    fogColor: "#d4a574",
  },
  day: {
    top: "#1e90ff",
    bottom: "#87ceeb",
    sunColor: "#ffffff",
    sunY: 0.9,
    fogColor: "#87ceeb",
  },
  sunset: {
    top: "#1a1a3e",
    bottom: "#ff6b35",
    sunColor: "#ff8c42",
    sunY: 0.1,
    fogColor: "#c44e2b",
  },
  night: {
    top: "#0a0a1a",
    bottom: "#1a1a3e",
    sunColor: "#c0c0ff",
    sunY: -0.3,
    fogColor: "#0a0a1a",
  },
};

const skyVertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = `
  uniform vec3 uTopColor;
  uniform vec3 uBottomColor;
  uniform vec3 uSunColor;
  uniform float uSunY;
  uniform float uTime;
  varying vec3 vWorldPosition;

  void main() {
    // Normalized height factor
    float h = normalize(vWorldPosition).y;
    h = max(h, 0.0);

    // Base gradient
    vec3 color = mix(uBottomColor, uTopColor, pow(h, 0.6));

    // Sun glow
    vec3 sunDir = normalize(vec3(0.3, uSunY, -0.5));
    float sunDot = max(dot(normalize(vWorldPosition), sunDir), 0.0);
    float sunGlow = pow(sunDot, 32.0) * 0.8;
    float sunHalo = pow(sunDot, 8.0) * 0.3;
    color += uSunColor * (sunGlow + sunHalo);

    // Subtle star twinkle for night
    if (uSunY < 0.0) {
      float star = fract(sin(dot(vWorldPosition.xz * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
      star = step(0.998, star) * (0.5 + 0.5 * sin(uTime * 3.0 + star * 100.0));
      color += vec3(star) * smoothstep(0.3, 0.8, h);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function SkyDome({
  timeOfDay = "day",
  radius = 500,
}: SkyDomeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const preset = SKY_PRESETS[timeOfDay];

  const uniforms = useMemo(
    () => ({
      uTopColor: { value: new THREE.Color(preset.top) },
      uBottomColor: { value: new THREE.Color(preset.bottom) },
      uSunColor: { value: new THREE.Color(preset.sunColor) },
      uSunY: { value: preset.sunY },
      uTime: { value: 0 },
    }),
    [preset],
  );

  // Smoothly lerp colors when timeOfDay changes
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = clock.elapsedTime;

    // Lerp to target colors
    const u = mat.uniforms;
    (u.uTopColor.value as THREE.Color).lerp(new THREE.Color(preset.top), 0.02);
    (u.uBottomColor.value as THREE.Color).lerp(
      new THREE.Color(preset.bottom),
      0.02,
    );
    (u.uSunColor.value as THREE.Color).lerp(
      new THREE.Color(preset.sunColor),
      0.02,
    );
    u.uSunY.value = THREE.MathUtils.lerp(u.uSunY.value, preset.sunY, 0.02);
  });

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[radius, 32, 16]} />
      <shaderMaterial
        vertexShader={skyVertexShader}
        fragmentShader={skyFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
