"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface WaterPlaneProps {
  position?: [number, number, number];
  width?: number;
  depth?: number;
  color?: string;
  opacity?: number;
  speed?: number;
  waveHeight?: number;
}

// Custom water shader with animated waves
const waterVertexShader = `
  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uSpeed;
  varying vec2 vUv;
  varying float vElevation;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Multi-layered wave animation
    float wave1 = sin(pos.x * 2.0 + uTime * uSpeed) * uWaveHeight;
    float wave2 = sin(pos.z * 3.0 + uTime * uSpeed * 0.7) * uWaveHeight * 0.5;
    float wave3 = sin((pos.x + pos.z) * 1.5 + uTime * uSpeed * 1.3) * uWaveHeight * 0.3;
    float ripple = sin(length(pos.xz) * 4.0 - uTime * uSpeed * 2.0) * uWaveHeight * 0.15;

    pos.y += wave1 + wave2 + wave3 + ripple;
    vElevation = pos.y;

    // Approximate normal for lighting
    float dx = cos(pos.x * 2.0 + uTime * uSpeed) * 2.0 * uWaveHeight;
    float dz = cos(pos.z * 3.0 + uTime * uSpeed * 0.7) * 3.0 * uWaveHeight * 0.5;
    vNormal = normalize(vec3(-dx, 1.0, -dz));

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const waterFragmentShader = `
  uniform vec3 uColor;
  uniform vec3 uDeepColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uSunDirection;
  varying vec2 vUv;
  varying float vElevation;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  // Simple foam pattern
  float foam(vec2 uv, float t) {
    float f = sin(uv.x * 20.0 + t) * sin(uv.y * 15.0 + t * 0.8);
    return smoothstep(0.7, 1.0, f);
  }

  void main() {
    // Blend between deep and surface color based on elevation
    float depthFactor = smoothstep(-0.05, 0.05, vElevation);
    vec3 baseColor = mix(uDeepColor, uColor, depthFactor);

    // Fresnel-like edge brightening
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
    baseColor += vec3(0.15, 0.25, 0.35) * fresnel;

    // Sun specular highlight
    vec3 halfDir = normalize(viewDir + uSunDirection);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 128.0);
    baseColor += vec3(1.0, 0.95, 0.8) * spec * 0.6;

    // Foam on wave peaks
    float foamAmount = foam(vUv, uTime * 0.5) * smoothstep(0.02, 0.06, vElevation);
    baseColor = mix(baseColor, vec3(0.9, 0.95, 1.0), foamAmount * 0.4);

    // Caustic-like pattern on surface
    float caustic = sin(vUv.x * 30.0 + uTime) * sin(vUv.y * 25.0 - uTime * 0.6);
    caustic = smoothstep(0.3, 0.8, caustic) * 0.08;
    baseColor += vec3(0.2, 0.4, 0.5) * caustic;

    gl_FragColor = vec4(baseColor, uOpacity);
  }
`;

export default function WaterPlane({
  position = [0, -0.02, 0],
  width = 24,
  depth = 4,
  color = "#0ea5e9",
  opacity = 0.75,
  speed = 0.8,
  waveHeight = 0.04,
}: WaterPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uDeepColor: { value: new THREE.Color("#0c4a6e") },
      uOpacity: { value: opacity },
      uSpeed: { value: speed },
      uWaveHeight: { value: waveHeight },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    }),
    [color, opacity, speed, waveHeight],
  );

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth, 128, 64]} />
      <shaderMaterial
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
