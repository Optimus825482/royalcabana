"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface CameraAnimatorProps {
  target: [number, number, number] | null;
  zoomDistance?: number;
  speed?: number;
  onArrive?: () => void;
}

const ARRIVE_THRESHOLD = 0.05;

export default function CameraAnimator({
  target,
  zoomDistance = 5,
  speed = 0.04,
  onArrive,
}: CameraAnimatorProps) {
  const { camera } = useThree();
  const arrivedRef = useRef(false);
  const prevTarget = useRef<[number, number, number] | null>(null);
  // Store camera ref to mutate outside of hook rules
  const cameraRef = useRef(camera);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  // Reset arrived flag when target changes
  useEffect(() => {
    arrivedRef.current = false;
    prevTarget.current = target;
  }, [target]);

  useFrame(() => {
    if (!target || arrivedRef.current) return;
    const cam = cameraRef.current;

    const goalX = target[0];
    const goalY = zoomDistance;
    const goalZ = target[2] + zoomDistance * 0.6;

    cam.position.x = THREE.MathUtils.lerp(cam.position.x, goalX, speed);
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, goalY, speed);
    cam.position.z = THREE.MathUtils.lerp(cam.position.z, goalZ, speed);

    const lookTarget = new THREE.Vector3(target[0], 0, target[2]);
    cam.lookAt(lookTarget);

    const dist = cam.position.distanceTo(
      new THREE.Vector3(goalX, goalY, goalZ),
    );
    if (dist < ARRIVE_THRESHOLD) {
      arrivedRef.current = true;
      onArrive?.();
    }
  });

  return null;
}
