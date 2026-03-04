"use client";

/**
 * CabanaMapInner — EXACT GiroCanvas Three.js engine + cabana management overlay.
 * Engine copied 1:1 from mapview3d-giro/src/components/GiroCanvas.tsx
 * Added: cabana meshes, lasso tool, context menu, drag, selection.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";
import { CabanaWithStatus, CabanaStatus } from "@/types";

// ─── ServicePoint type for dynamic building rendering ────────────────────────

interface ServicePointData {
  id: string;
  name: string;
  type: string;
  coordX: number | null;
  coordY: number | null;
  rotation: number;
  scale: number;
  isLocked: boolean;
  isActive: boolean;
  requiredStaffCount: number;
  staffRoles: string[] | null;
}

interface ServicePointTransform {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  isLocked: boolean;
}

// ─── Image / scene config ────────────────────────────────────────────────────

const IMAGE_SRC = "/gorsel/sonnn.png";
const IMAGE_WIDTH = 1040;
const IMAGE_HEIGHT = 678;
const HW = IMAGE_WIDTH / 2;
const HH = IMAGE_HEIGHT / 2;
const SCENE_SIZE = Math.max(IMAGE_WIDTH, IMAGE_HEIGHT);

// ─── Preset colors ──────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDefaultColor(cabana: CabanaWithStatus): string {
  if (cabana.color) return cabana.color;
  const cn = cabana.cabanaClass?.name?.toLowerCase() ?? "";
  if (cn.includes("vip")) return "#f59e0b";
  if (cn.includes("premium")) return "#a855f7";
  if (cn.includes("deluxe")) return "#ec4899";
  return "#3b82f6";
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

function getStatusLabel(cabana: CabanaWithStatus): string {
  if (!cabana.isOpenForReservation) return "Kapalı";
  switch (cabana.status) {
    case CabanaStatus.AVAILABLE:
      return "Müsait";
    case CabanaStatus.RESERVED:
      return "Rezerve";
    case CabanaStatus.CLOSED:
      return "Kapalı";
    default:
      return "Bilinmiyor";
  }
}

// ─── Pixel ↔ World coordinate conversion ─────────────────────────────────────

function pixelToWorld(px: number, py: number): THREE.Vector3 {
  return new THREE.Vector3(px - HW, -(py - HH), 0);
}

function worldToPixel(
  wx: number,
  wy: number,
): { coordX: number; coordY: number } {
  return { coordX: wx + HW, coordY: -wy + HH };
}

// ─── Sky Dome (EXACT copy from GiroCanvas) ───────────────────────────────────

function createSkyDome(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(50000, 32, 16);
  const vertSrc = [
    "varying vec3 vWorldPos;",
    "void main(){",
    "  vec4 wp = modelMatrix * vec4(position,1.0);",
    "  vWorldPos = wp.xyz;",
    "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);",
    "}",
  ].join("\n");
  const fragSrc = [
    "uniform vec3 topColor;",
    "uniform vec3 bottomColor;",
    "uniform float offset;",
    "uniform float exponent;",
    "varying vec3 vWorldPos;",
    "void main(){",
    "  float h = normalize(vWorldPos + offset).z;",
    "  gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent),0.0)),1.0);",
    "}",
  ].join("\n");
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x0a1628) },
      bottomColor: { value: new THREE.Color(0x2d4a6f) },
      offset: { value: 200 },
      exponent: { value: 0.4 },
    },
    vertexShader: vertSrc,
    fragmentShader: fragSrc,
  });
  return new THREE.Mesh(geo, mat);
}

// ─── Displacement canvas (EXACT copy from GiroCanvas) ────────────────────────

function makeDisplacementCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const gray =
      d.data[i] * 0.299 + d.data[i + 1] * 0.587 + d.data[i + 2] * 0.114;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = gray;
  }
  ctx.putImageData(d, 0, 0);
  return c;
}

// ─── Cabana 3D mesh builder ──────────────────────────────────────────────────

function getCabanaDimensions(cabana: CabanaWithStatus): {
  w: number;
  d: number;
  h: number;
} {
  const cn = cabana.cabanaClass?.name?.toLowerCase() ?? "";
  const sx = cabana.scaleX ?? 1;
  const sy = cabana.scaleY ?? 1;
  let baseW = 18,
    baseD = 18,
    baseH = 12;
  if (cn.includes("vip") || cn.includes("suite")) {
    baseW = 24;
    baseD = 24;
    baseH = 16;
  } else if (cn.includes("premium") || cn.includes("deluxe")) {
    baseW = 20;
    baseD = 20;
    baseH = 14;
  }
  return { w: baseW * sx, d: baseD * sy, h: baseH };
}

// ─── Cabana Label Sprite ─────────────────────────────────────────────────────

function createCabanaLabel(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Background circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 100px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(16, 16, 1);

  return sprite;
}

// ─── Sunbed (Şezlong) pair builder ──────────────────────────────────────────

function buildSunbedPair(cabana: CabanaWithStatus): THREE.Group {
  const group = new THREE.Group();
  const { w, d } = getCabanaDimensions(cabana);
  const rotation = ((cabana.rotation ?? 0) * Math.PI) / 180;

  // Materials
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0,
    roughness: 0.4,
    metalness: 0.6,
  });
  const cushionMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e8,
    roughness: 0.85,
    metalness: 0,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x2196f3,
    roughness: 0.7,
    metalness: 0,
  });

  // Sunbed dimensions
  const bedW = 5;
  const bedD = 10;
  const bedH = 0.6;
  const legH = 2;
  const gap = 3; // gap between two sunbeds
  const frontOffset = d / 2 + bedD / 2 + 6; // distance from cabana center to sunbed center

  // Build one sunbed
  function makeSunbed(offsetX: number): void {
    // Frame (metal legs)
    const legR = 0.2;
    const legPositions = [
      [offsetX - bedW * 0.4, -frontOffset - bedD * 0.4],
      [offsetX + bedW * 0.4, -frontOffset - bedD * 0.4],
      [offsetX - bedW * 0.4, -frontOffset + bedD * 0.4],
      [offsetX + bedW * 0.4, -frontOffset + bedD * 0.4],
    ];
    legPositions.forEach(([lx, ly]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(legR, legR, legH, 6),
        frameMat,
      );
      leg.rotation.x = Math.PI / 2;
      leg.position.set(lx, ly, legH / 2);
      leg.castShadow = true;
      group.add(leg);
    });

    // Bed base (cushion)
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(bedW, bedD, bedH),
      cushionMat,
    );
    bed.position.set(offsetX, -frontOffset, legH + bedH / 2);
    bed.receiveShadow = true;
    bed.castShadow = true;
    group.add(bed);

    // Head rest (raised part)
    const headW = bedW * 0.9;
    const headD = bedD * 0.25;
    const headH = bedH * 1.5;
    const headRest = new THREE.Mesh(
      new THREE.BoxGeometry(headW, headD, headH),
      cushionMat,
    );
    headRest.position.set(
      offsetX,
      -frontOffset + bedD * 0.35,
      legH + bedH + headH * 0.3,
    );
    headRest.rotation.x = -0.3; // slight angle
    headRest.castShadow = true;
    group.add(headRest);

    // Towel accent stripe
    const towel = new THREE.Mesh(
      new THREE.BoxGeometry(bedW * 0.85, bedD * 0.7, 0.15),
      accentMat,
    );
    towel.position.set(offsetX, -frontOffset - bedD * 0.05, legH + bedH + 0.1);
    group.add(towel);
  }

  // Two sunbeds side by side
  makeSunbed(-(bedW / 2 + gap / 2));
  makeSunbed(bedW / 2 + gap / 2);

  // Small table between sunbeds
  const tableR = 1.5;
  const tableH = 0.4;
  const tableLegH = legH + bedH - tableH;
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(tableR, tableR, tableH, 12),
    frameMat,
  );
  tableTop.rotation.x = Math.PI / 2;
  tableTop.position.set(0, -frontOffset, tableLegH + tableH / 2);
  tableTop.castShadow = true;
  group.add(tableTop);

  // Table leg
  const tableLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, tableLegH, 6),
    frameMat,
  );
  tableLeg.rotation.x = Math.PI / 2;
  tableLeg.position.set(0, -frontOffset, tableLegH / 2);
  group.add(tableLeg);

  // === BEACH UMBRELLA (between sunbeds) ===
  const umbrellaPoleMat = new THREE.MeshStandardMaterial({
    color: 0xdec8a0,
    roughness: 0.5,
    metalness: 0.1,
  });
  const umbrellaPoleH = 12;
  const umbrellaPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.25, umbrellaPoleH, 8),
    umbrellaPoleMat,
  );
  umbrellaPole.rotation.x = Math.PI / 2;
  umbrellaPole.position.set(0, -frontOffset, umbrellaPoleH / 2);
  umbrellaPole.castShadow = true;
  group.add(umbrellaPole);

  // Umbrella canopy (cone)
  const umbrellaCanopyMat = new THREE.MeshStandardMaterial({
    color: 0xe8d5b7,
    roughness: 0.8,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const canopyR = 7;
  const canopyH = 3;
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(canopyR, canopyH, 16, 1, true),
    umbrellaCanopyMat,
  );
  canopy.position.set(0, -frontOffset, umbrellaPoleH + 0.5);
  // ConeGeometry is Y-up; scene is Z-up — rotate so canopy opens downward like umbrella
  canopy.rotation.set(0, 0, 0);
  canopy.rotation.x = Math.PI / 2;
  canopy.castShadow = true;
  group.add(canopy);

  // Umbrella finial (top knob)
  const finial = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 8),
    umbrellaPoleMat,
  );
  finial.position.set(0, -frontOffset, umbrellaPoleH + 0.8);
  group.add(finial);

  // === COCKTAIL GLASS on table ===
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xaaddff,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.6,
  });
  // Glass stem
  const glassStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6),
    frameMat,
  );
  glassStem.rotation.x = Math.PI / 2;
  glassStem.position.set(0.5, -frontOffset + 0.3, tableLegH + tableH + 0.6);
  group.add(glassStem);
  // Glass cup
  const glassCup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.2, 1, 8),
    glassMat,
  );
  glassCup.rotation.x = Math.PI / 2;
  glassCup.position.set(0.5, -frontOffset + 0.3, tableLegH + tableH + 1.4);
  group.add(glassCup);

  // === FLIP FLOPS (near sunbed) ===
  const flipFlopMat = new THREE.MeshStandardMaterial({
    color: 0xff6b6b,
    roughness: 0.9,
    metalness: 0,
  });
  [-1, 1].forEach((side) => {
    const flipFlop = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.2, 0.3),
      flipFlopMat,
    );
    flipFlop.position.set(
      -(bedW / 2 + gap / 2) + side * 1.5 - 3,
      -frontOffset - bedD * 0.3,
      0.15,
    );
    flipFlop.rotation.z = 0.1 * side;
    group.add(flipFlop);
  });

  // Position & rotation (same as cabana)
  const worldPos = pixelToWorld(cabana.coordX, cabana.coordY);
  group.position.copy(worldPos);
  group.rotation.z = rotation;

  // Mark as sunbed for raycasting (not cabana)
  group.userData = { cabanaId: cabana.id, isSunbed: true };
  group.traverse((child) => {
    child.userData = { cabanaId: cabana.id, isSunbed: true };
  });

  return group;
}

// ─── Check if cabana has enough front space for sunbeds ─────────────────────

function hasFrontSpace(
  cabana: CabanaWithStatus,
  allCabanas: CabanaWithStatus[],
  minDistance: number = 30,
): boolean {
  const { d } = getCabanaDimensions(cabana);
  const rotation = ((cabana.rotation ?? 0) * Math.PI) / 180;

  // Front direction in world space (cabana faces -Y, rotated by rotation around Z)
  const frontDirX = Math.sin(rotation);
  const frontDirY = -Math.cos(rotation);

  // Front check point: cabana center + front offset
  const checkDist = d / 2 + 12; // sunbed center distance
  const frontX = cabana.coordX + frontDirX * checkDist;
  const frontY = cabana.coordY + frontDirY * checkDist;

  for (const other of allCabanas) {
    if (other.id === cabana.id) continue;
    const dx = other.coordX - frontX;
    const dy = other.coordY - frontY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDistance) return false;
  }
  return true;
}

function buildCabanaMesh(
  cabana: CabanaWithStatus,
  selected: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const accentColor = new THREE.Color(getDefaultColor(cabana));
  const statusColor = new THREE.Color(getStatusColor(cabana));
  const { w, d, h } = getCabanaDimensions(cabana);
  const rotation = ((cabana.rotation ?? 0) * Math.PI) / 180;

  // Check if VIP cabana
  const cn = cabana.cabanaClass?.name?.toLowerCase() ?? "";
  const isVIP = cn.includes("vip") || cn.includes("suite");

  // Materials
  const woodDark = new THREE.MeshStandardMaterial({
    color: isVIP ? 0x5c3d2e : 0x8a5a2f, // Darker wood for VIP
    roughness: 0.8,
    metalness: isVIP ? 0.15 : 0.1,
  });
  const woodLight = new THREE.MeshStandardMaterial({
    color: isVIP ? 0xd4a574 : 0xc89b6d,
    roughness: 0.7,
    metalness: 0.05,
  });
  const fabricWhite = new THREE.MeshStandardMaterial({
    color: isVIP ? 0xfffef5 : 0xf5f1e8, // Slightly whiter for VIP
    roughness: 0.9,
    metalness: 0,
  });
  const fabricCurtain = new THREE.MeshStandardMaterial({
    color: isVIP ? 0xfff8e7 : 0xf4efe6,
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const pillowMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.7,
    metalness: 0,
    emissive: selected ? accentColor : new THREE.Color(0x000000),
    emissiveIntensity: selected ? 0.3 : 0,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: isVIP ? 0xffd700 : 0xe9e4d8, // Golden roof for VIP
    roughness: isVIP ? 0.4 : 0.6,
    metalness: isVIP ? 0.3 : 0.05,
    side: THREE.DoubleSide,
    emissive: isVIP ? new THREE.Color(0xffa500) : new THREE.Color(0x000000),
    emissiveIntensity: isVIP ? 0.15 : 0,
  });

  // === PLATFORM (wooden base) ===
  const platformBase = new THREE.Mesh(
    new THREE.BoxGeometry(w + 2, d + 2, 1.5),
    woodDark,
  );
  platformBase.position.z = 0.75;
  platformBase.receiveShadow = true;
  platformBase.castShadow = true;
  group.add(platformBase);

  const platformTop = new THREE.Mesh(new THREE.BoxGeometry(w, d, 1), woodLight);
  platformTop.position.z = 1.75;
  platformTop.receiveShadow = true;
  group.add(platformTop);

  // === MATTRESS ===
  const mattressH = 2;
  const mattress = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.85, d * 0.85, mattressH),
    fabricWhite,
  );
  mattress.position.z = 2.25 + mattressH / 2;
  mattress.receiveShadow = true;
  mattress.castShadow = true;
  group.add(mattress);

  // === PILLOWS (accent color) ===
  const pillowW = w * 0.15;
  const pillowD = d * 0.2;
  const pillowH = 1.2;
  const pillowZ = 2.25 + mattressH + pillowH / 2;
  const pillowOffsetX = w * 0.28;
  const pillowOffsetY = d * 0.25;

  const pillow1 = new THREE.Mesh(
    new THREE.BoxGeometry(pillowW, pillowD, pillowH),
    pillowMat,
  );
  pillow1.position.set(pillowOffsetX, pillowOffsetY, pillowZ);
  pillow1.castShadow = true;
  group.add(pillow1);

  const pillow2 = new THREE.Mesh(
    new THREE.BoxGeometry(pillowW, pillowD, pillowH),
    pillowMat,
  );
  pillow2.position.set(pillowOffsetX + pillowW * 1.2, pillowOffsetY, pillowZ);
  pillow2.castShadow = true;
  group.add(pillow2);

  // === POSTS (4 corner posts) ===
  const postH = h * 1.2;
  const postR = 0.4;
  const postOffsetX = w * 0.45;
  const postOffsetY = d * 0.45;
  const postPositions = [
    [-postOffsetX, -postOffsetY],
    [-postOffsetX, postOffsetY],
    [postOffsetX, -postOffsetY],
    [postOffsetX, postOffsetY],
  ];

  postPositions.forEach(([px, py]) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(postR, postR, postH, 8),
      woodDark,
    );
    post.rotation.x = Math.PI / 2;
    post.position.set(px, py, 2.25 + postH / 2);
    post.castShadow = true;
    group.add(post);
  });

  // === ROOF FRAME (horizontal beam) ===
  const roofFrameH = 0.8;
  const roofFrame = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.95, d * 0.95, roofFrameH),
    woodDark,
  );
  roofFrame.position.z = 2.25 + postH - roofFrameH / 2;
  roofFrame.castShadow = true;
  group.add(roofFrame);

  // === ROOF (slanted canopy) ===
  const roofZ = 2.25 + postH + 1;
  const roofPeakZ = roofZ + 3;
  const roofHalfW = w * 0.55;
  const roofHalfD = d * 0.55;

  // Create roof as a simple pyramid shape
  const roofGeo = new THREE.BufferGeometry();
  const roofVertices = new Float32Array([
    // Base quad (2 triangles)
    -roofHalfW,
    -roofHalfD,
    roofZ,
    roofHalfW,
    -roofHalfD,
    roofZ,
    roofHalfW,
    roofHalfD,
    roofZ,
    -roofHalfW,
    -roofHalfD,
    roofZ,
    roofHalfW,
    roofHalfD,
    roofZ,
    -roofHalfW,
    roofHalfD,
    roofZ,
    // Front slope
    -roofHalfW,
    -roofHalfD,
    roofZ,
    roofHalfW,
    -roofHalfD,
    roofZ,
    0,
    0,
    roofPeakZ,
    // Back slope
    roofHalfW,
    roofHalfD,
    roofZ,
    -roofHalfW,
    roofHalfD,
    roofZ,
    0,
    0,
    roofPeakZ,
    // Left slope
    -roofHalfW,
    roofHalfD,
    roofZ,
    -roofHalfW,
    -roofHalfD,
    roofZ,
    0,
    0,
    roofPeakZ,
    // Right slope
    roofHalfW,
    -roofHalfD,
    roofZ,
    roofHalfW,
    roofHalfD,
    roofZ,
    0,
    0,
    roofPeakZ,
  ]);
  roofGeo.setAttribute("position", new THREE.BufferAttribute(roofVertices, 3));
  roofGeo.computeVertexNormals();
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // === CURTAINS (flowing fabric on sides) ===
  const curtainH = postH * 0.7;
  const curtainW = 1.5;
  const curtainZ = 2.25 + postH * 0.5;

  // Front curtains (2 on each side)
  [-1, 1].forEach((side) => {
    const curtain = new THREE.Mesh(
      new THREE.PlaneGeometry(curtainW, curtainH),
      fabricCurtain,
    );
    curtain.position.set(
      side * postOffsetX * 0.5,
      -postOffsetY - 0.2,
      curtainZ,
    );
    curtain.rotation.x = Math.PI * 0.05;
    group.add(curtain);
  });

  // Side curtains
  [-1, 1].forEach((side) => {
    const curtain = new THREE.Mesh(
      new THREE.PlaneGeometry(curtainW, curtainH),
      fabricCurtain,
    );
    curtain.position.set(side * (postOffsetX + 0.2), 0, curtainZ);
    curtain.rotation.y = Math.PI / 2;
    curtain.rotation.z = Math.PI * 0.03 * side;
    group.add(curtain);
  });

  // === SMALL SIDE TABLE ===
  const tableW = w * 0.18;
  const tableD = d * 0.12;
  const tableH = 0.4;
  const tableZ = 2.25 + mattressH + tableH / 2;
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(tableW, tableD, tableH),
    woodDark,
  );
  tableTop.position.set(-w * 0.25, 0, tableZ);
  tableTop.castShadow = true;
  group.add(tableTop);

  // Table legs
  const legH = 1.5;
  const legR = 0.15;
  [-1, 1].forEach((lx) => {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(legR, legR, legH, 6),
      woodDark,
    );
    leg.rotation.x = Math.PI / 2;
    leg.position.set(
      -w * 0.25 + lx * tableW * 0.35,
      0,
      2.25 + mattressH - legH / 2,
    );
    group.add(leg);
  });

  // === PALM TREE (decorative, beside cabana) ===
  const palmTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x8b6914,
    roughness: 0.9,
    metalness: 0,
  });
  const palmLeafMat = new THREE.MeshStandardMaterial({
    color: 0x2d8a4e,
    roughness: 0.8,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  // Trunk (slightly curved via segments)
  const trunkH = postH * 1.1;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.8, trunkH, 8),
    palmTrunkMat,
  );
  trunk.rotation.x = Math.PI / 2;
  trunk.position.set(w / 2 + 5, d / 2 + 3, trunkH / 2);
  trunk.castShadow = true;
  group.add(trunk);

  // Trunk rings (texture detail)
  for (let ri = 0; ri < 5; ri++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.65 - ri * 0.03, 0.08, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x6b5010, roughness: 1 }),
    );
    ring.position.set(w / 2 + 5, d / 2 + 3, 2 + ri * (trunkH / 5));
    group.add(ring);
  }

  // Palm leaves (6 fronds radiating out)
  const leafCount = 6;
  for (let li = 0; li < leafCount; li++) {
    const angle = (li / leafCount) * Math.PI * 2 + 0.3;
    const leafLen = 8;
    const leaf = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, leafLen),
      palmLeafMat,
    );
    leaf.position.set(
      w / 2 + 5 + Math.cos(angle) * leafLen * 0.4,
      d / 2 + 3 + Math.sin(angle) * leafLen * 0.4,
      trunkH + 1,
    );
    // Droop the leaf downward
    leaf.rotation.z = angle;
    leaf.rotation.x = -0.5;
    leaf.castShadow = true;
    group.add(leaf);
  }

  // Coconuts (3 small spheres at top)
  const coconutMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a1e,
    roughness: 0.8,
    metalness: 0,
  });
  for (let ci = 0; ci < 3; ci++) {
    const ca = (ci / 3) * Math.PI * 2;
    const coconut = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 6, 6),
      coconutMat,
    );
    coconut.position.set(
      w / 2 + 5 + Math.cos(ca) * 0.7,
      d / 2 + 3 + Math.sin(ca) * 0.7,
      trunkH - 0.5,
    );
    coconut.castShadow = true;
    group.add(coconut);
  }

  // === TOWEL RACK (wooden stand with hanging towel) ===
  const rackMat = new THREE.MeshStandardMaterial({
    color: 0xa0784c,
    roughness: 0.7,
    metalness: 0.05,
  });
  const rackH = 8;
  const rackX = -w / 2 - 4;
  const rackY = 0;
  // Two vertical posts
  [-1, 1].forEach((side) => {
    const rackPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, rackH, 6),
      rackMat,
    );
    rackPost.rotation.x = Math.PI / 2;
    rackPost.position.set(rackX + side * 2, rackY, rackH / 2);
    rackPost.castShadow = true;
    group.add(rackPost);
  });
  // Horizontal bar
  const rackBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 4.5, 6),
    rackMat,
  );
  rackBar.position.set(rackX, rackY, rackH);
  rackBar.rotation.z = Math.PI / 2;
  rackBar.rotation.x = Math.PI / 2;
  group.add(rackBar);
  // Hanging towel (draped fabric)
  const towelColors = [0x4fc3f7, 0xfff176, 0xef5350];
  const towelColor =
    towelColors[Math.abs(cabana.name.charCodeAt(0)) % towelColors.length];
  const towelMat = new THREE.MeshStandardMaterial({
    color: towelColor,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const towel = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 5), towelMat);
  towel.position.set(rackX, rackY + 0.3, rackH - 2.8);
  towel.rotation.x = 0.15; // slight drape angle
  group.add(towel);

  // === TIKI TORCHES / LANTERNS (2 at front corners) ===
  const torchMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a1e,
    roughness: 0.8,
    metalness: 0.05,
  });
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xff8c00,
    emissive: 0xff6600,
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0,
  });
  [-1, 1].forEach((side) => {
    const torchH = 10;
    // Torch pole
    const torchPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, torchH, 6),
      torchMat,
    );
    torchPole.rotation.x = Math.PI / 2;
    torchPole.position.set(side * (w / 2 + 4), -d / 2 - 3, torchH / 2);
    torchPole.castShadow = true;
    group.add(torchPole);

    // Torch head (basket)
    const torchHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.4, 1.5, 8),
      torchMat,
    );
    torchHead.rotation.x = Math.PI / 2;
    torchHead.position.set(side * (w / 2 + 4), -d / 2 - 3, torchH + 0.5);
    group.add(torchHead);

    // Flame (glowing sphere)
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), flameMat);
    flame.position.set(side * (w / 2 + 4), -d / 2 - 3, torchH + 1.8);
    group.add(flame);
  });

  // === DECORATIVE ROPE LIGHTS (string between front posts) ===
  const ropeLightMat = new THREE.MeshStandardMaterial({
    color: 0xfff4c1,
    emissive: 0xffe082,
    emissiveIntensity: 0.4,
    roughness: 0.5,
    metalness: 0,
  });
  const ropeSegments = 8;
  const ropeStartX = -postOffsetX;
  const ropeEndX = postOffsetX;
  const ropeY = -postOffsetY;
  const ropeBaseZ = 2.25 + postH * 0.75;
  for (let si = 0; si <= ropeSegments; si++) {
    const t = si / ropeSegments;
    const rx = ropeStartX + (ropeEndX - ropeStartX) * t;
    // Catenary sag
    const sag = -2 * Math.sin(t * Math.PI);
    const rz = ropeBaseZ + sag;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 6, 6),
      ropeLightMat,
    );
    bulb.position.set(rx, ropeY, rz);
    group.add(bulb);
  }

  // === STATUS INDICATOR ===
  const statusSphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 12, 12),
    new THREE.MeshStandardMaterial({
      color: statusColor,
      emissive: statusColor,
      emissiveIntensity: 0.6,
    }),
  );
  statusSphere.position.set(w / 2 + 1, -d / 2 - 1, roofPeakZ + 2);
  group.add(statusSphere);

  // === SELECTION RING ===
  if (selected) {
    const ring = new THREE.Mesh(
      new THREE.BoxGeometry(w + 4, d + 4, postH + 6),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      }),
    );
    ring.position.z = 2.25 + postH / 2;
    group.add(ring);
  }

  // === LOCK INDICATOR ===
  if (cabana.isLocked) {
    const lockSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.7,
      }),
    );
    lockSphere.position.set(-w / 2 - 1, d / 2 + 1, roofPeakZ + 2);
    group.add(lockSphere);
  }

  // === VIP CROWN (for VIP cabanas) ===
  if (isVIP) {
    // Crown base (golden ring)
    const crownBaseMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0xffa500,
      emissiveIntensity: 0.3,
    });

    // Crown ring
    const crownRing = new THREE.Mesh(
      new THREE.TorusGeometry(3, 0.6, 8, 16),
      crownBaseMat,
    );
    crownRing.position.set(0, 0, roofPeakZ + 5);
    crownRing.rotation.x = Math.PI / 2;
    group.add(crownRing);

    // Crown spikes (5 points)
    const spikeCount = 5;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2;
      const spikeX = Math.cos(angle) * 3;
      const spikeY = Math.sin(angle) * 3;

      // Main spike
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 3, 6),
        crownBaseMat,
      );
      spike.position.set(spikeX, spikeY, roofPeakZ + 7);
      group.add(spike);

      // Gem on top of spike
      const gemMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0.2,
        metalness: 0.5,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
      });
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), gemMat);
      gem.position.set(spikeX, spikeY, roofPeakZ + 9);
      group.add(gem);
    }

    // Center gem (bigger, diamond)
    const centerGemMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      roughness: 0.1,
      metalness: 0.6,
      emissive: 0x00ffff,
      emissiveIntensity: 0.6,
    });
    const centerGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.2, 0),
      centerGemMat,
    );
    centerGem.position.set(0, 0, roofPeakZ + 8);
    centerGem.rotation.x = Math.PI / 4;
    group.add(centerGem);
  }

  // === CABANA LABEL (number/name on top) ===
  const labelText =
    cabana.name.replace(/[^0-9]/g, "") || cabana.name.slice(0, 3);
  const labelColor = getDefaultColor(cabana);
  const label = createCabanaLabel(labelText, labelColor);
  // VIP cabanas have crown, so label goes higher
  label.position.set(0, 0, isVIP ? roofPeakZ + 14 : roofPeakZ + 8);
  group.add(label);

  // Position & rotation
  const worldPos = pixelToWorld(cabana.coordX, cabana.coordY);
  group.position.copy(worldPos);
  group.rotation.z = rotation;

  // Store cabana id for raycasting
  group.userData = { cabanaId: cabana.id, isCabana: true };
  group.traverse((child) => {
    child.userData = { cabanaId: cabana.id, isCabana: true };
  });

  return group;
}

// ─── Sunset Bar 3D Model ─────────────────────────────────────────────────────

function buildSunsetBarMesh(
  coordX: number,
  coordY: number,
  rotation: number = 0,
): THREE.Group {
  const group = new THREE.Group();

  // Dimensions
  const w = 80; // width
  const d = 50; // depth
  const wallH = 25; // wall height
  const roofH = 8; // roof thickness

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a,
    roughness: 0.7,
    metalness: 0.1,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xff6b35, // Sunset orange
    roughness: 0.5,
    metalness: 0.2,
  });
  const roofEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x3d3d3d,
    roughness: 0.6,
    metalness: 0.15,
  });
  const counterMat = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.6,
    metalness: 0.05,
  });

  // === BASE PLATFORM ===
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(w + 4, d + 4, 2),
    new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.9 }),
  );
  platform.position.z = 1;
  platform.receiveShadow = true;
  platform.castShadow = true;
  group.add(platform);

  // === WALLS (3 sides - open front) ===
  // Back wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, 2, wallH), wallMat);
  backWall.position.set(0, d / 2 - 1, 2 + wallH / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  // Left wall
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(2, d, wallH), wallMat);
  leftWall.position.set(-w / 2 + 1, 0, 2 + wallH / 2);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  group.add(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(2, d, wallH), wallMat);
  rightWall.position.set(w / 2 - 1, 0, 2 + wallH / 2);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  group.add(rightWall);

  // === ROOF (flat with beveled edges - like the reference image) ===
  // Main roof surface
  const roofTop = new THREE.Mesh(
    new THREE.BoxGeometry(w + 8, d + 8, 3),
    roofMat,
  );
  roofTop.position.z = 2 + wallH + roofH / 2 + 2;
  roofTop.castShadow = true;
  roofTop.receiveShadow = true;
  group.add(roofTop);

  // Roof edge/frame (darker border)
  const edgeThickness = 3;
  // Front edge
  const frontEdge = new THREE.Mesh(
    new THREE.BoxGeometry(w + 8, edgeThickness, roofH),
    roofEdgeMat,
  );
  frontEdge.position.set(
    0,
    -d / 2 - 4 + edgeThickness / 2,
    2 + wallH + roofH / 2,
  );
  frontEdge.castShadow = true;
  group.add(frontEdge);

  // Back edge
  const backEdge = new THREE.Mesh(
    new THREE.BoxGeometry(w + 8, edgeThickness, roofH),
    roofEdgeMat,
  );
  backEdge.position.set(
    0,
    d / 2 + 4 - edgeThickness / 2,
    2 + wallH + roofH / 2,
  );
  backEdge.castShadow = true;
  group.add(backEdge);

  // Left edge
  const leftEdge = new THREE.Mesh(
    new THREE.BoxGeometry(edgeThickness, d + 8, roofH),
    roofEdgeMat,
  );
  leftEdge.position.set(
    -w / 2 - 4 + edgeThickness / 2,
    0,
    2 + wallH + roofH / 2,
  );
  leftEdge.castShadow = true;
  group.add(leftEdge);

  // Right edge
  const rightEdge = new THREE.Mesh(
    new THREE.BoxGeometry(edgeThickness, d + 8, roofH),
    roofEdgeMat,
  );
  rightEdge.position.set(
    w / 2 + 4 - edgeThickness / 2,
    0,
    2 + wallH + roofH / 2,
  );
  rightEdge.castShadow = true;
  group.add(rightEdge);

  // === BAR COUNTER (front) ===
  const counterH = 12;
  const counterD = 6;
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.7, counterD, counterH),
    counterMat,
  );
  counter.position.set(0, -d / 2 + counterD / 2 + 2, 2 + counterH / 2);
  counter.castShadow = true;
  counter.receiveShadow = true;
  group.add(counter);

  // Counter top (lighter wood)
  const counterTop = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.72, counterD + 2, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.5 }),
  );
  counterTop.position.set(0, -d / 2 + counterD / 2 + 2, 2 + counterH + 0.75);
  counterTop.castShadow = true;
  group.add(counterTop);

  // === DECORATIVE LIGHTS (string lights under roof) ===
  const lightCount = 8;
  const lightSpacing = (w - 10) / (lightCount - 1);
  for (let i = 0; i < lightCount; i++) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffdd44,
        emissive: 0xffaa00,
        emissiveIntensity: 0.8,
      }),
    );
    bulb.position.set(-w / 2 + 5 + i * lightSpacing, -d / 2 + 5, 2 + wallH - 2);
    group.add(bulb);
  }

  // === LEFT SIDE TERRACE — Pier deck with parasols & seating ===
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x8b6f47,
    roughness: 0.75,
    metalness: 0.05,
  });
  const parasolFabricMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e0,
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const parasolPoleMat = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0,
    roughness: 0.4,
    metalness: 0.5,
  });
  const seatCushionMat = new THREE.MeshStandardMaterial({
    color: 0xf0ebe0,
    roughness: 0.9,
    metalness: 0,
  });
  const seatFrameMat = new THREE.MeshStandardMaterial({
    color: 0x6b5b3e,
    roughness: 0.7,
    metalness: 0.1,
  });

  // Wooden deck platform extending to the left
  const deckW = 90;
  const deckD = d + 4;
  const deckH = 2;
  const deckX = -w / 2 - deckW / 2 - 2;
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(deckW, deckD, deckH),
    deckMat,
  );
  deck.position.set(deckX, 0, 1);
  deck.receiveShadow = true;
  deck.castShadow = true;
  group.add(deck);

  // Deck planks (visual detail — thin lines)
  const plankCount = 12;
  const plankMat = new THREE.MeshStandardMaterial({
    color: 0x7a6040,
    roughness: 0.8,
    metalness: 0,
  });
  for (let pi = 0; pi < plankCount; pi++) {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(deckW, 0.3, 0.2),
      plankMat,
    );
    plank.position.set(
      deckX,
      -deckD / 2 + (pi + 0.5) * (deckD / plankCount),
      deckH + 0.1,
    );
    plank.receiveShadow = true;
    group.add(plank);
  }

  // Parasol + seating groups (3 rows x 2 columns = 6 sets)
  const parasols: { px: number; py: number }[] = [];
  const colCount = 3;
  const rowCount = 2;
  const colSpacing = deckW / (colCount + 1);
  const rowSpacing = deckD / (rowCount + 1);

  for (let col = 0; col < colCount; col++) {
    for (let row = 0; row < rowCount; row++) {
      const px = deckX - deckW / 2 + (col + 1) * colSpacing;
      const py = -deckD / 2 + (row + 1) * rowSpacing;
      parasols.push({ px, py });
    }
  }

  parasols.forEach(({ px, py }) => {
    // Parasol pole
    const poleH = 14;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.3, poleH, 8),
      parasolPoleMat,
    );
    pole.rotation.x = Math.PI / 2;
    pole.position.set(px, py, deckH + poleH / 2);
    pole.castShadow = true;
    group.add(pole);

    // Parasol canopy (octagonal cone — like the white round ones in the image)
    const canopyR = 8;
    const canopyH = 3;
    const parasolCanopy = new THREE.Mesh(
      new THREE.ConeGeometry(canopyR, canopyH, 8, 1, true),
      parasolFabricMat,
    );
    parasolCanopy.position.set(px, py, deckH + poleH + 0.5);
    // ConeGeometry is Y-up by default; scene is Z-up
    // First rotate to Z-up (tip pointing up), then flip so it opens downward like umbrella
    parasolCanopy.rotation.set(0, 0, 0);
    parasolCanopy.rotation.x = Math.PI / 2; // Y-up → Z-up (tip points +Z)
    // No additional flip needed — open cone faces down naturally with open:true
    parasolCanopy.castShadow = true;
    group.add(parasolCanopy);

    // Parasol top finial
    const pFinial = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      parasolPoleMat,
    );
    pFinial.position.set(px, py, deckH + poleH + 1);
    group.add(pFinial);

    // Seating — 2 lounge chairs per parasol (left & right)
    [-1, 1].forEach((side) => {
      const chairX = px + side * 4;
      const chairY = py;

      // Chair frame
      const chairBase = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 7, 0.5),
        seatFrameMat,
      );
      chairBase.position.set(chairX, chairY, deckH + 1.5);
      chairBase.receiveShadow = true;
      chairBase.castShadow = true;
      group.add(chairBase);

      // Chair legs (4)
      const cLegH = 1.2;
      const cLegR = 0.15;
      [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].forEach(([lx, ly]) => {
        const cLeg = new THREE.Mesh(
          new THREE.CylinderGeometry(cLegR, cLegR, cLegH, 6),
          seatFrameMat,
        );
        cLeg.rotation.x = Math.PI / 2;
        cLeg.position.set(
          chairX + lx * 1.4,
          chairY + ly * 2.8,
          deckH + cLegH / 2,
        );
        group.add(cLeg);
      });

      // Cushion
      const cushion = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 6.5, 0.6),
        seatCushionMat,
      );
      cushion.position.set(chairX, chairY, deckH + 2.1);
      cushion.receiveShadow = true;
      group.add(cushion);
    });

    // Small round table between chairs
    const tblR = 1.2;
    const tblH = 0.3;
    const tblLegH = 2;
    const tblTop = new THREE.Mesh(
      new THREE.CylinderGeometry(tblR, tblR, tblH, 10),
      seatFrameMat,
    );
    tblTop.rotation.x = Math.PI / 2;
    tblTop.position.set(px, py, deckH + tblLegH + tblH / 2);
    tblTop.castShadow = true;
    group.add(tblTop);

    const tblLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, tblLegH, 6),
      parasolPoleMat,
    );
    tblLeg.rotation.x = Math.PI / 2;
    tblLeg.position.set(px, py, deckH + tblLegH / 2);
    group.add(tblLeg);
  });

  // Deck railing (rope/bollard style along the edge)
  const bollardMat = new THREE.MeshStandardMaterial({
    color: 0x5a4a30,
    roughness: 0.8,
    metalness: 0.05,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xd4c5a0,
    roughness: 0.9,
    metalness: 0,
  });
  const bollardCount = 10;
  const bollardSpacing = deckW / (bollardCount - 1);
  for (let bi = 0; bi < bollardCount; bi++) {
    const bx = deckX - deckW / 2 + bi * bollardSpacing;
    // Front edge bollard
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 4, 8),
      bollardMat,
    );
    bollard.rotation.x = Math.PI / 2;
    bollard.position.set(bx, -deckD / 2 - 0.5, deckH + 2);
    bollard.castShadow = true;
    group.add(bollard);

    // Bollard cap
    const bCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 8, 8),
      bollardMat,
    );
    bCap.position.set(bx, -deckD / 2 - 0.5, deckH + 4.2);
    group.add(bCap);

    // Rope between bollards
    if (bi < bollardCount - 1) {
      const ropeLen = bollardSpacing;
      const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, ropeLen, 6),
        ropeMat,
      );
      rope.position.set(bx + bollardSpacing / 2, -deckD / 2 - 0.5, deckH + 3.2);
      rope.rotation.z = Math.PI / 2;
      rope.rotation.x = Math.PI / 2;
      group.add(rope);
    }
  }

  // === "SUNSET BAR" TEXT LABEL ===
  const labelCanvas = document.createElement("canvas");
  const labelCtx = labelCanvas.getContext("2d")!;
  labelCanvas.width = 600;
  labelCanvas.height = 128;

  // Background (transparent)
  labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);

  // Text styling
  labelCtx.font = "bold 96px Arial, sans-serif";
  labelCtx.textAlign = "center";
  labelCtx.textBaseline = "middle";

  // Text shadow
  labelCtx.shadowColor = "rgba(0, 0, 0, 0.8)";
  labelCtx.shadowBlur = 8;
  labelCtx.shadowOffsetX = 3;
  labelCtx.shadowOffsetY = 3;

  // Gradient fill (sunset colors)
  const gradient = labelCtx.createLinearGradient(0, 0, labelCanvas.width, 0);
  gradient.addColorStop(0, "#ff6b35");
  gradient.addColorStop(0.5, "#ffdd44");
  gradient.addColorStop(1, "#ff6b35");
  labelCtx.fillStyle = gradient;
  labelCtx.fillText(
    "SUNSET BAR",
    labelCanvas.width / 2,
    labelCanvas.height / 2,
  );

  // Outline
  labelCtx.strokeStyle = "#8b4513";
  labelCtx.lineWidth = 3;
  labelCtx.strokeText(
    "SUNSET BAR",
    labelCanvas.width / 2,
    labelCanvas.height / 2,
  );

  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.needsUpdate = true;

  const labelMaterial = new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true,
    depthTest: false,
  });

  const labelSprite = new THREE.Sprite(labelMaterial);
  labelSprite.scale.set(70, 17.5, 1);
  labelSprite.position.set(0, 0, 2 + wallH + roofH + 15);
  group.add(labelSprite);

  // === POSITION & ROTATION ===
  const worldPos = pixelToWorld(coordX, coordY);
  group.position.copy(worldPos);
  group.rotation.z = (rotation * Math.PI) / 180;

  // Mark as static building (not cabana)
  group.userData = { isBuilding: true, buildingType: "sunset-bar" };
  group.traverse((child) => {
    child.userData = { isBuilding: true, buildingType: "sunset-bar" };
  });

  return group;
}

// ─── Blue Sea Bar 3D Model ───────────────────────────────────────────────────

function buildBlueSeaBarMesh(
  coordX: number,
  coordY: number,
  rotation: number = 0,
): THREE.Group {
  const group = new THREE.Group();

  // Dimensions (vertical/portrait orientation — taller than wide)
  const w = 45; // width (narrow)
  const d = 70; // depth (tall)
  const wallH = 25;
  const roofH = 8;

  // Materials — ocean blue theme
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x2c3e50,
    roughness: 0.7,
    metalness: 0.1,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x1e90ff, // Dodger blue
    roughness: 0.5,
    metalness: 0.25,
  });
  const roofEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x1a3a5c,
    roughness: 0.6,
    metalness: 0.15,
  });
  const counterMat = new THREE.MeshStandardMaterial({
    color: 0x5dade2,
    roughness: 0.5,
    metalness: 0.1,
  });

  // === BASE PLATFORM ===
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(w + 4, d + 4, 2),
    new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.9 }),
  );
  platform.position.z = 1;
  platform.receiveShadow = true;
  platform.castShadow = true;
  group.add(platform);

  // === WALLS (3 sides — open front) ===
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, 2, wallH), wallMat);
  backWall.position.set(0, d / 2 - 1, 2 + wallH / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(2, d, wallH), wallMat);
  leftWall.position.set(-w / 2 + 1, 0, 2 + wallH / 2);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(2, d, wallH), wallMat);
  rightWall.position.set(w / 2 - 1, 0, 2 + wallH / 2);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  group.add(rightWall);

  // === ROOF ===
  const roofTop = new THREE.Mesh(
    new THREE.BoxGeometry(w + 8, d + 8, 3),
    roofMat,
  );
  roofTop.position.z = 2 + wallH + roofH / 2 + 2;
  roofTop.castShadow = true;
  roofTop.receiveShadow = true;
  group.add(roofTop);

  // Roof edges
  const et = 3;
  const edges: [number, number, number, number, number][] = [
    [w + 8, et, 0, -d / 2 - 4 + et / 2, 0], // front
    [w + 8, et, 0, d / 2 + 4 - et / 2, 0], // back
    [et, d + 8, -w / 2 - 4 + et / 2, 0, 0], // left
    [et, d + 8, w / 2 + 4 - et / 2, 0, 0], // right
  ];
  for (const [ew, ed, ex, ey] of edges) {
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(ew, ed, roofH),
      roofEdgeMat,
    );
    edge.position.set(ex, ey, 2 + wallH + roofH / 2);
    edge.castShadow = true;
    group.add(edge);
  }

  // === BAR COUNTER ===
  const counterH = 12;
  const counterD = 6;
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.65, counterD, counterH),
    counterMat,
  );
  counter.position.set(0, -d / 2 + counterD / 2 + 2, 2 + counterH / 2);
  counter.castShadow = true;
  counter.receiveShadow = true;
  group.add(counter);

  // Counter top
  const counterTop = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.67, counterD + 2, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x85c1e9, roughness: 0.4 }),
  );
  counterTop.position.set(0, -d / 2 + counterD / 2 + 2, 2 + counterH + 0.75);
  counterTop.castShadow = true;
  group.add(counterTop);

  // === DECORATIVE LIGHTS (aqua-blue string lights) ===
  const lightCount = 6;
  const lightSpacing = (w - 8) / (lightCount - 1);
  for (let i = 0; i < lightCount; i++) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x0099cc,
        emissiveIntensity: 0.8,
      }),
    );
    bulb.position.set(-w / 2 + 4 + i * lightSpacing, -d / 2 + 5, 2 + wallH - 2);
    group.add(bulb);
  }

  // === "BLUE SEA BAR" TEXT LABEL ===
  const labelCanvas = document.createElement("canvas");
  const labelCtx = labelCanvas.getContext("2d")!;
  labelCanvas.width = 600;
  labelCanvas.height = 128;

  labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);

  labelCtx.font = "bold 80px Arial, sans-serif";
  labelCtx.textAlign = "center";
  labelCtx.textBaseline = "middle";

  labelCtx.shadowColor = "rgba(0, 0, 0, 0.8)";
  labelCtx.shadowBlur = 8;
  labelCtx.shadowOffsetX = 3;
  labelCtx.shadowOffsetY = 3;

  // Ocean-blue gradient
  const gradient = labelCtx.createLinearGradient(0, 0, labelCanvas.width, 0);
  gradient.addColorStop(0, "#1e90ff");
  gradient.addColorStop(0.5, "#00e5ff");
  gradient.addColorStop(1, "#1e90ff");
  labelCtx.fillStyle = gradient;
  labelCtx.fillText(
    "BLUE SEA BAR",
    labelCanvas.width / 2,
    labelCanvas.height / 2,
  );

  labelCtx.strokeStyle = "#0d47a1";
  labelCtx.lineWidth = 2;
  labelCtx.strokeText(
    "BLUE SEA BAR",
    labelCanvas.width / 2,
    labelCanvas.height / 2,
  );

  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.needsUpdate = true;

  const labelMaterial = new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true,
    depthTest: false,
  });

  const labelSprite = new THREE.Sprite(labelMaterial);
  labelSprite.scale.set(70, 15.5, 1);
  labelSprite.position.set(0, 0, 2 + wallH + roofH + 15);
  group.add(labelSprite);

  // === POSITION & ROTATION ===
  const worldPos = pixelToWorld(coordX, coordY);
  group.position.copy(worldPos);
  group.rotation.z = (rotation * Math.PI) / 90;

  group.userData = { isBuilding: true, buildingType: "blue-sea-bar" };
  group.traverse((child) => {
    child.userData = { isBuilding: true, buildingType: "blue-sea-bar" };
  });

  return group;
}

// ─── Generic Service Point 3D Model (for types without custom mesh) ──────────

function buildGenericServicePointMesh(
  coordX: number,
  coordY: number,
  rotation: number = 0,
  name: string = "Service Point",
  type: string = "OTHER",
): THREE.Group {
  const group = new THREE.Group();

  // Color scheme based on type
  const typeColors: Record<
    string,
    { main: number; roof: number; accent: number }
  > = {
    BAR: { main: 0x4a4a4a, roof: 0xff6b35, accent: 0x8b4513 },
    BEACH_BAR: { main: 0x4a4a4a, roof: 0xff6b35, accent: 0x8b4513 },
    RESTAURANT: { main: 0x5c3a1e, roof: 0xc0392b, accent: 0xf39c12 },
    POOL_BAR: { main: 0x2c3e50, roof: 0x3498db, accent: 0x1abc9c },
    SPA: { main: 0x6c3483, roof: 0x8e44ad, accent: 0xf1c40f },
    RECEPTION: { main: 0x1a5276, roof: 0x2980b9, accent: 0xecf0f1 },
    SHOP: { main: 0x7d6608, roof: 0xf1c40f, accent: 0xffffff },
  };
  const colors = typeColors[type.toUpperCase()] ?? {
    main: 0x555555,
    roof: 0x888888,
    accent: 0xcccccc,
  };

  const upperType = type.toUpperCase();

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: colors.main,
    roughness: 0.7,
    metalness: 0.1,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: colors.roof,
    roughness: 0.5,
    metalness: 0.2,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: colors.accent,
    roughness: 0.5,
    metalness: 0.15,
  });
  const platformMat = new THREE.MeshStandardMaterial({
    color: 0x5a5a5a,
    roughness: 0.9,
  });

  // ─── RESTAURANT: Wide building with tables & awning ───────────────────
  if (upperType === "RESTAURANT") {
    const w = 70,
      d = 55,
      wallH = 22;

    // Platform
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(w + 6, d + 6, 2),
      platformMat,
    );
    platform.position.z = 1;
    platform.receiveShadow = true;
    platform.castShadow = true;
    group.add(platform);

    // Walls (L-shape — back + left, open front + right for terrace)
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(w, 2, wallH),
      wallMat,
    );
    backWall.position.set(0, d / 2 - 1, 2 + wallH / 2);
    backWall.castShadow = true;
    group.add(backWall);
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(2, d, wallH),
      wallMat,
    );
    leftWall.position.set(-w / 2 + 1, 0, 2 + wallH / 2);
    leftWall.castShadow = true;
    group.add(leftWall);

    // Awning roof (slanted)
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(w + 10, d + 10, 2),
      roofMat,
    );
    awning.position.set(0, 0, 2 + wallH + 3);
    awning.castShadow = true;
    group.add(awning);

    // Dining tables (2x3 grid)
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0xa0522d,
      roughness: 0.6,
    });
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 2; row++) {
        const tx = -w / 4 + col * (w / 3.5);
        const ty = -d / 4 + row * (d / 2.5);
        // Table top
        const tbl = new THREE.Mesh(
          new THREE.CylinderGeometry(4, 4, 1, 8),
          tableMat,
        );
        tbl.rotation.x = Math.PI / 2;
        tbl.position.set(tx, ty, 8);
        tbl.castShadow = true;
        group.add(tbl);
        // Table leg
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 5, 6),
          accentMat,
        );
        leg.rotation.x = Math.PI / 2;
        leg.position.set(tx, ty, 5);
        group.add(leg);
        // 4 chairs
        [
          [-3.5, 0],
          [3.5, 0],
          [0, -3.5],
          [0, 3.5],
        ].forEach(([cx, cy]) => {
          const chair = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 3),
            accentMat,
          );
          chair.position.set(tx + cx, ty + cy, 4);
          chair.castShadow = true;
          group.add(chair);
        });
      }
    }

    // ─── POOL_BAR: Circular bar with pool edge ────────────────────────────
  } else if (upperType === "POOL_BAR") {
    const radius = 25;

    // Circular platform
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + 3, radius + 3, 2, 24),
      platformMat,
    );
    platform.rotation.x = Math.PI / 2;
    platform.position.z = 1;
    platform.receiveShadow = true;
    platform.castShadow = true;
    group.add(platform);

    // Circular bar counter
    const counter = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.6, 3, 8, 24),
      new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.5 }),
    );
    counter.position.z = 10;
    group.add(counter);

    // Center column
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 20, 12),
      wallMat,
    );
    column.rotation.x = Math.PI / 2;
    column.position.z = 12;
    column.castShadow = true;
    group.add(column);

    // Umbrella roof (cone)
    const umbrella = new THREE.Mesh(
      new THREE.ConeGeometry(radius + 5, 8, 12),
      roofMat,
    );
    umbrella.rotation.x = Math.PI / 2;
    umbrella.position.z = 26;
    umbrella.castShadow = true;
    group.add(umbrella);

    // Pool water ring around
    const poolRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius + 8, 5, 8, 32),
      new THREE.MeshStandardMaterial({
        color: 0x3498db,
        transparent: true,
        opacity: 0.4,
        roughness: 0.2,
      }),
    );
    poolRing.position.z = 1;
    group.add(poolRing);

    // Bar stools (8 around)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const sx = Math.cos(angle) * radius * 0.8;
      const sy = Math.sin(angle) * radius * 0.8;
      const stool = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 6, 8),
        accentMat,
      );
      stool.rotation.x = Math.PI / 2;
      stool.position.set(sx, sy, 5);
      stool.castShadow = true;
      group.add(stool);
      // Stool seat
      const seat = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 1, 8),
        new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.8 }),
      );
      seat.rotation.x = Math.PI / 2;
      seat.position.set(sx, sy, 8.5);
      group.add(seat);
    }

    // ─── SPA: Rounded pavilion with zen elements ──────────────────────────
  } else if (upperType === "SPA") {
    const w = 55,
      d = 45,
      wallH = 18;

    // Rounded platform
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(30, 30, 2, 20),
      new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 }),
    );
    platform.rotation.x = Math.PI / 2;
    platform.position.z = 1;
    platform.receiveShadow = true;
    platform.castShadow = true;
    group.add(platform);

    // Main pavilion (octagonal walls)
    const pavilion = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, wallH, 8),
      new THREE.MeshStandardMaterial({
        color: colors.main,
        roughness: 0.7,
        transparent: true,
        opacity: 0.7,
      }),
    );
    pavilion.rotation.x = Math.PI / 2;
    pavilion.position.z = 2 + wallH / 2;
    pavilion.castShadow = true;
    group.add(pavilion);

    // Dome roof
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      roofMat,
    );
    dome.position.z = 2 + wallH;
    dome.castShadow = true;
    group.add(dome);

    // Zen pool (center)
    const zenPool = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 8, 1, 16),
      new THREE.MeshStandardMaterial({
        color: 0x5dade2,
        transparent: true,
        opacity: 0.5,
        roughness: 0.1,
      }),
    );
    zenPool.rotation.x = Math.PI / 2;
    zenPool.position.z = 2.5;
    group.add(zenPool);

    // Massage beds (4 around pool)
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const bx = Math.cos(angle) * 14;
      const by = Math.sin(angle) * 14;
      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(4, 8, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xf5f0e0, roughness: 0.9 }),
      );
      bed.position.set(bx, by, 4);
      bed.rotation.z = angle;
      bed.castShadow = true;
      group.add(bed);
    }

    // Candle lights
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const lx = Math.cos(angle) * 10;
      const ly = Math.sin(angle) * 10;
      const candle = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xf1c40f,
          emissive: 0xf39c12,
          emissiveIntensity: 0.6,
        }),
      );
      candle.position.set(lx, ly, 4);
      group.add(candle);
    }

    // ─── RECEPTION: Formal desk with signage ──────────────────────────────
  } else if (upperType === "RECEPTION") {
    const w = 60,
      d = 40,
      wallH = 24;

    // Platform
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(w + 4, d + 4, 2),
      platformMat,
    );
    platform.position.z = 1;
    platform.receiveShadow = true;
    platform.castShadow = true;
    group.add(platform);

    // Full walls (4 sides with entrance gap)
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(w, 2, wallH),
      wallMat,
    );
    backWall.position.set(0, d / 2 - 1, 2 + wallH / 2);
    backWall.castShadow = true;
    group.add(backWall);
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(2, d, wallH),
      wallMat,
    );
    leftWall.position.set(-w / 2 + 1, 0, 2 + wallH / 2);
    leftWall.castShadow = true;
    group.add(leftWall);
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(2, d, wallH),
      wallMat,
    );
    rightWall.position.set(w / 2 - 1, 0, 2 + wallH / 2);
    rightWall.castShadow = true;
    group.add(rightWall);

    // Flat roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 8, d + 8, 3),
      roofMat,
    );
    roof.position.z = 2 + wallH + 2;
    roof.castShadow = true;
    group.add(roof);

    // Reception desk (curved front)
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.6, 8, 12),
      new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        roughness: 0.4,
        metalness: 0.2,
      }),
    );
    desk.position.set(0, -d / 4, 2 + 6);
    desk.castShadow = true;
    group.add(desk);

    // Desk top (marble)
    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.62, 9, 1),
      new THREE.MeshStandardMaterial({
        color: 0xecf0f1,
        roughness: 0.2,
        metalness: 0.1,
      }),
    );
    deskTop.position.set(0, -d / 4, 2 + 12.5);
    deskTop.castShadow = true;
    group.add(deskTop);

    // Welcome sign (green light)
    const signLight = new THREE.Mesh(
      new THREE.SphereGeometry(2, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0x2ecc71,
        emissive: 0x27ae60,
        emissiveIntensity: 0.8,
      }),
    );
    signLight.position.set(w / 2 - 5, d / 2 - 5, 2 + wallH - 3);
    group.add(signLight);

    // ─── SHOP: Storefront with display windows ────────────────────────────
  } else if (upperType === "SHOP") {
    const w = 50,
      d = 35,
      wallH = 22;

    // Platform
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(w + 4, d + 4, 2),
      platformMat,
    );
    platform.position.z = 1;
    platform.receiveShadow = true;
    platform.castShadow = true;
    group.add(platform);

    // Walls
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(w, 2, wallH),
      wallMat,
    );
    backWall.position.set(0, d / 2 - 1, 2 + wallH / 2);
    backWall.castShadow = true;
    group.add(backWall);
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(2, d, wallH),
      wallMat,
    );
    leftWall.position.set(-w / 2 + 1, 0, 2 + wallH / 2);
    leftWall.castShadow = true;
    group.add(leftWall);
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(2, d, wallH),
      wallMat,
    );
    rightWall.position.set(w / 2 - 1, 0, 2 + wallH / 2);
    rightWall.castShadow = true;
    group.add(rightWall);

    // Awning (zigzag canopy)
    const awning = new THREE.Mesh(new THREE.BoxGeometry(w + 8, 12, 2), roofMat);
    awning.position.set(0, -d / 2 - 2, 2 + wallH - 2);
    awning.castShadow = true;
    group.add(awning);

    // Flat roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 6, d + 6, 3),
      wallMat,
    );
    roof.position.z = 2 + wallH + 2;
    roof.castShadow = true;
    group.add(roof);

    // Display windows (2 glass panels)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x85c1e9,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.3,
    });
    const win1 = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.35, 1, wallH * 0.6),
      glassMat,
    );
    win1.position.set(-w / 5, -d / 2 + 1, 2 + wallH * 0.4);
    group.add(win1);
    const win2 = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.35, 1, wallH * 0.6),
      glassMat,
    );
    win2.position.set(w / 5, -d / 2 + 1, 2 + wallH * 0.4);
    group.add(win2);

    // Shelves inside (visible through windows)
    for (let i = 0; i < 3; i++) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.8, 2, 0.5),
        accentMat,
      );
      shelf.position.set(0, d / 4, 6 + i * 5);
      shelf.castShadow = true;
      group.add(shelf);
    }

    // ─── DEFAULT: Generic box building ────────────────────────────────────
  } else {
    const w = 50,
      d = 40,
      wallH = 20;

    // Base platform
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(w + 4, d + 4, 2),
      platformMat,
    );
    platform.position.z = 1;
    platform.receiveShadow = true;
    platform.castShadow = true;
    group.add(platform);

    // Walls (3 sides)
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(w, 2, wallH),
      wallMat,
    );
    backWall.position.set(0, d / 2 - 1, 2 + wallH / 2);
    backWall.castShadow = true;
    group.add(backWall);
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(2, d, wallH),
      wallMat,
    );
    leftWall.position.set(-w / 2 + 1, 0, 2 + wallH / 2);
    leftWall.castShadow = true;
    group.add(leftWall);
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(2, d, wallH),
      wallMat,
    );
    rightWall.position.set(w / 2 - 1, 0, 2 + wallH / 2);
    rightWall.castShadow = true;
    group.add(rightWall);

    // Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 6, d + 6, 3),
      roofMat,
    );
    roof.position.z = 2 + wallH + 2;
    roof.castShadow = true;
    group.add(roof);
  }

  // ─── NAME LABEL (all types) ───────────────────────────────────────────
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 80;
  const labelCtx = labelCanvas.getContext("2d")!;
  labelCtx.clearRect(0, 0, 512, 80);
  labelCtx.font = "bold 36px Arial";
  labelCtx.textAlign = "center";
  labelCtx.textBaseline = "middle";
  labelCtx.shadowColor = "rgba(0, 0, 0, 0.8)";
  labelCtx.shadowBlur = 6;
  labelCtx.shadowOffsetX = 2;
  labelCtx.shadowOffsetY = 2;
  labelCtx.fillStyle = "#ffffff";
  labelCtx.strokeStyle = "#333333";
  labelCtx.lineWidth = 2;
  labelCtx.strokeText(name.toUpperCase(), 256, 40);
  labelCtx.fillText(name.toUpperCase(), 256, 40);

  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  const labelSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      depthTest: false,
    }),
  );
  labelSprite.scale.set(60, 12, 1);
  // Position label above the tallest structure
  const labelZ = upperType === "POOL_BAR" ? 38 : upperType === "SPA" ? 35 : 40;
  labelSprite.position.set(0, 0, labelZ);
  group.add(labelSprite);

  // Position & rotation
  const worldPos = pixelToWorld(coordX, coordY);
  group.position.copy(worldPos);
  group.rotation.z = (rotation * Math.PI) / 180;

  return group;
}

// ─── Context Menu State ──────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  cabana: CabanaWithStatus | null;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface MapComponentProps {
  cabanas: CabanaWithStatus[];
  editable?: boolean;
  onCabanaClick?: (cabana: CabanaWithStatus) => void;
  onLocationUpdate?: (
    cabanaId: string,
    coordX: number,
    coordY: number,
    rotation?: number,
    scaleX?: number,
    scaleY?: number,
    color?: string,
    isLocked?: boolean,
  ) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onCabanaDelete?: (cabanaId: string) => void;
  onElevationSave?: (dataUrl: string) => void;
  onElevationReset?: () => void;
  savedElevationData?: string | null;
  selectedCabanaId?: string;
  placementCoords?: { lat: number; lng: number } | null;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CabanaMapInner({
  cabanas,
  editable = false,
  onCabanaClick,
  onLocationUpdate,
  onMapClick,
  onCabanaDelete,
  onElevationSave,
  onElevationReset,
  savedElevationData,
  selectedCabanaId,
  placementCoords,
}: MapComponentProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<MapControls | null>(null);
  const planeRef = useRef<THREE.Mesh | null>(null);
  const cabanaMeshesRef = useRef<THREE.Group[]>([]);
  const sunbedMeshesRef = useRef<THREE.Group[]>([]);
  const placementRef = useRef<THREE.Mesh | null>(null);
  const rafRef = useRef<number>(0);
  const dragStateRef = useRef<{
    active: boolean;
    cabanaId: string;
    offset: THREE.Vector3;
    group: THREE.Group;
  } | null>(null);
  // Displacement / lasso refs
  const dispCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dispTexRef = useRef<THREE.CanvasTexture | null>(null);
  const originalDispDataRef = useRef<Uint8ClampedArray | null>(null);
  const baselineDispDataRef = useRef<Uint8ClampedArray | null>(null);
  // Effects refs (GiroCanvas pattern)
  const fogRef = useRef<THREE.FogExp2 | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [colorPickerCabana, setColorPickerCabana] =
    useState<CabanaWithStatus | null>(null);
  const [pickerColor, setPickerColor] = useState("#3b82f6");
  // Effects state — matching GiroCanvas EffectsPanel
  const [fogEnabled, setFogEnabled] = useState(true);
  const [displacementEnabled, setDisplacementEnabled] = useState(false);
  const [displacementScale, setDisplacementScale] = useState(0);
  const [enhancedLighting, setEnhancedLighting] = useState(true);
  const [gridVisible, setGridVisible] = useState(false);
  // Resize modal
  const [resizeCabana, setResizeCabana] = useState<CabanaWithStatus | null>(
    null,
  );
  const [resizeScaleX, setResizeScaleX] = useState(1);
  const [resizeScaleY, setResizeScaleY] = useState(1);
  const [resizeRotation, setResizeRotation] = useState(0);
  // Rectangle selection tool state
  const [rectActive, setRectActive] = useState(false);
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [rectEnd, setRectEnd] = useState<{ x: number; y: number } | null>(null);
  const [rectDefined, setRectDefined] = useState(false);
  const [rectElevation, setRectElevation] = useState(50);
  const [svgTick, setSvgTick] = useState(0);
  const svgTickRafRef = useRef<number | null>(null);
  const [rectScreenStart, setRectScreenStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [rectScreenEnd, setRectScreenEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // ─── ServicePoint state (dynamic buildings from DB) ─────────────────────────
  const [servicePoints, setServicePoints] = useState<ServicePointTransform[]>(
    [],
  );
  const servicePointRefs = useRef<Map<string, THREE.Group>>(new Map());
  const spDbLoadedRef = useRef(false);

  // ─── Common Parasol defaults (not a ServicePoint — kept as SystemConfig) ──
  const COMMON_PARASOL_DEFAULT = useMemo(
    () => ({ x: 620, y: 400, scale: 1, rotation: 0, isLocked: false }),
    [],
  );

  // ─── Sunset Bar state → now driven by servicePoints ────────────────────────
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [buildingContextMenu, setBuildingContextMenu] = useState<{
    x: number;
    y: number;
    buildingType: string;
  } | null>(null);

  // ─── Common Parasol state (persisted to DB via SystemConfig) ──────────────
  const COMMON_PARASOL_CONFIG_KEY = "common_parasol_transform";
  const [commonParasolTransform, setCommonParasolTransform] = useState(() => ({
    ...COMMON_PARASOL_DEFAULT,
  }));

  // ─── Flag: DB'den yükleme tamamlandı mı? Bu flag true olana kadar save tetiklenmez ─
  const barDbLoadedRef = useRef(false);

  // ─── Fetch ServicePoints + Common Parasol from DB on mount ─────────────────
  const barInitRef = useRef(false);
  useEffect(() => {
    if (barInitRef.current) return;
    barInitRef.current = true;

    const fetchServicePoints = async () => {
      try {
        const res = await fetch(
          "/api/service-points?activeOnly=true&lightweight=true",
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const transforms: ServicePointTransform[] = json.data
              .filter(
                (sp: ServicePointData) =>
                  sp.coordX != null && sp.coordY != null,
              )
              .map((sp: ServicePointData) => ({
                id: sp.id,
                name: sp.name,
                type: sp.type,
                x: sp.coordX!,
                y: sp.coordY!,
                scale: sp.scale ?? 1,
                rotation: sp.rotation ?? 0,
                isLocked: sp.isLocked ?? false,
              }));
            setServicePoints(transforms);
          }
        }
      } catch {
        /* API hatası — sessiz */
      }
    };

    const fetchParasolConfig = async () => {
      try {
        const res = await fetch(
          `/api/system/config/${COMMON_PARASOL_CONFIG_KEY}`,
        );
        if (res.ok) {
          const json = await res.json();
          if (json.data?.value) {
            const parsed = JSON.parse(json.data.value);
            const merged = { ...COMMON_PARASOL_DEFAULT, ...parsed };
            setCommonParasolTransform(merged);
            localStorage.setItem(
              COMMON_PARASOL_CONFIG_KEY,
              JSON.stringify(merged),
            );
            return;
          }
        }
      } catch {
        /* API hatası */
      }
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(COMMON_PARASOL_CONFIG_KEY);
        if (saved) {
          try {
            setCommonParasolTransform({
              ...COMMON_PARASOL_DEFAULT,
              ...JSON.parse(saved),
            });
            return;
          } catch {
            /* parse hatası */
          }
        }
      }
    };

    Promise.all([fetchServicePoints(), fetchParasolConfig()]).finally(() => {
      barDbLoadedRef.current = true;
      spDbLoadedRef.current = true;
    });
  }, [COMMON_PARASOL_DEFAULT]);

  // ─── Save ServicePoint transforms to DB (debounced PATCH) ──────────────────
  const saveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  const saveServicePointTransform = useCallback(
    (
      spId: string,
      value: {
        x: number;
        y: number;
        scale: number;
        rotation: number;
        isLocked: boolean;
      },
    ) => {
      if (!spDbLoadedRef.current) return;
      if (saveTimerRef.current[spId]) clearTimeout(saveTimerRef.current[spId]);
      saveTimerRef.current[spId] = setTimeout(async () => {
        try {
          await fetch(`/api/service-points/${spId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              coordX: value.x,
              coordY: value.y,
              scale: value.scale,
              rotation: value.rotation,
              isLocked: value.isLocked,
            }),
          });
        } catch {
          /* sessiz hata */
        }
      }, 500);
    },
    [],
  );

  // Save Common Parasol to SystemConfig (not a ServicePoint)
  const saveBarConfig = useCallback(
    (
      key: string,
      value: {
        x: number;
        y: number;
        scale: number;
        rotation: number;
        isLocked: boolean;
      },
    ) => {
      if (!barDbLoadedRef.current) return;
      localStorage.setItem(key, JSON.stringify(value));
      if (saveTimerRef.current[key]) clearTimeout(saveTimerRef.current[key]);
      saveTimerRef.current[key] = setTimeout(async () => {
        try {
          await fetch(`/api/system/config/${key}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: JSON.stringify(value) }),
          });
        } catch {
          /* sessiz hata */
        }
      }, 500);
    },
    [],
  );

  useEffect(() => {
    saveBarConfig(COMMON_PARASOL_CONFIG_KEY, commonParasolTransform);
  }, [commonParasolTransform, saveBarConfig]);

  // Building drag state ref
  const buildingDragRef = useRef<{
    active: boolean;
    buildingType: string;
    offset: THREE.Vector3;
    group: THREE.Group;
  } | null>(null);
  const rectDraggingRef = useRef(false);
  // Undo history for displacement commits
  const dispHistoryRef = useRef<Uint8ClampedArray[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  // Map lock state — disables MapControls for cabana placement/drag
  const [mapLocked, setMapLocked] = useState(false);

  // Lights ref for effects sync
  const lightsRef = useRef<{
    sun: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
    amb: THREE.AmbientLight;
    hemi: THREE.HemisphereLight;
  } | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);

  // Sync screen coords from Three.js camera
  useEffect(() => {
    const cam = cameraRef.current;
    const el = mountRef.current;
    if (!cam || !el) return;
    const rect = el.getBoundingClientRect();
    const project = (wp: { x: number; y: number }) => {
      const v = new THREE.Vector3(wp.x, wp.y, 0);
      v.project(cam);
      return {
        x: ((v.x + 1) / 2) * rect.width,
        y: ((-v.y + 1) / 2) * rect.height,
      };
    };
    setRectScreenStart(rectStart ? project(rectStart) : null);
    setRectScreenEnd(rectEnd ? project(rectEnd) : null);
  }, [rectStart, rectEnd, svgTick]);

  // Refs for latest props
  const cabanasRef = useRef(cabanas);
  const selectedIdRef = useRef(selectedCabanaId);
  const editableRef = useRef(editable);
  const onCabanaClickRef = useRef(onCabanaClick);
  const onLocationUpdateRef = useRef(onLocationUpdate);
  const onMapClickRef = useRef(onMapClick);
  const rectActiveRef = useRef(rectActive);
  const rectDefinedRef = useRef(rectDefined);
  const mapLockedRef = useRef(mapLocked);
  const savedElevationDataRef = useRef(savedElevationData);
  const servicePointsRef = useRef(servicePoints);
  const commonParasolTransformRef = useRef(commonParasolTransform);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are intentionally synced every render for imperative three.js handlers
  useEffect(() => {
    cabanasRef.current = cabanas;
    selectedIdRef.current = selectedCabanaId;
    editableRef.current = editable;
    onCabanaClickRef.current = onCabanaClick;
    onLocationUpdateRef.current = onLocationUpdate;
    onMapClickRef.current = onMapClick;
    rectActiveRef.current = rectActive;
    rectDefinedRef.current = rectDefined;
    mapLockedRef.current = mapLocked;
    savedElevationDataRef.current = savedElevationData;
    servicePointsRef.current = servicePoints;
    commonParasolTransformRef.current = commonParasolTransform;
  });

  // ─── Three.js scene setup (EXACT GiroCanvas engine) ─────────────────────────

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // Renderer — EXACT GiroCanvas settings
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.add(createSkyDome());

    // Fog — EXACT GiroCanvas
    const fog = new THREE.FogExp2(0x1a2a3a, 0.00015);
    scene.fog = fog;
    fogRef.current = fog;

    // Camera — EXACT GiroCanvas
    const aspect = el.clientWidth / el.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, aspect, 1, SCENE_SIZE * 20);
    camera.position.set(0, -HH * 0.9, Math.max(HW, HH) * 1.0);
    camera.up.set(0, 0, 1);
    cameraRef.current = camera;

    // Controls — EXACT GiroCanvas
    const controls = new MapControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 20;
    controls.maxDistance = SCENE_SIZE * 3;
    controls.saveState();
    controlsRef.current = controls;

    // Lights — EXACT GiroCanvas (4 lights)
    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362d1b, 0.5);
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sun.position.set(HW * 0.6, -HH * 0.4, HW * 1.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -HW * 1.2;
    sun.shadow.camera.right = HW * 1.2;
    sun.shadow.camera.top = HH * 1.2;
    sun.shadow.camera.bottom = -HH * 1.2;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = HW * 5;
    sun.shadow.bias = -0.0005;
    const fill = new THREE.DirectionalLight(0x8ecae6, 0.4);
    fill.position.set(-HW, HH, HW * 0.5);
    scene.add(amb, hemi, sun, fill);
    lightsRef.current = { sun, fill, amb, hemi };

    // Grid helper (hidden by default, toggle via effects panel)
    const grid = new THREE.GridHelper(SCENE_SIZE * 2, 40, 0x444444, 0x333333);
    grid.rotation.x = Math.PI / 2;
    grid.visible = false;
    scene.add(grid);
    gridRef.current = grid;

    // Load image → ground plane with displacement — EXACT GiroCanvas
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const colorTex = new THREE.Texture(img);
      colorTex.colorSpace = THREE.SRGBColorSpace;
      colorTex.minFilter = THREE.LinearFilter;
      colorTex.magFilter = THREE.LinearFilter;
      colorTex.wrapS = THREE.ClampToEdgeWrapping;
      colorTex.wrapT = THREE.ClampToEdgeWrapping;
      colorTex.needsUpdate = true;

      const dispCanvas = makeDisplacementCanvas(img);
      const dispTex = new THREE.CanvasTexture(dispCanvas);
      dispCanvasRef.current = dispCanvas;
      dispTexRef.current = dispTex;
      // Backup original displacement data, then zero out for flat default
      const origCtx = dispCanvas.getContext("2d", {
        willReadFrequently: true,
      })!;
      const origData = origCtx.getImageData(
        0,
        0,
        dispCanvas.width,
        dispCanvas.height,
      );
      baselineDispDataRef.current = new Uint8ClampedArray(origData.data);
      // If saved elevation data exists, load it; otherwise zero out for flat default
      const savedData = savedElevationDataRef.current;
      if (savedData) {
        // Load saved displacement from base64 PNG
        const savedImg = new Image();
        savedImg.onload = () => {
          const sCtx = dispCanvas.getContext("2d", {
            willReadFrequently: true,
          })!;
          sCtx.drawImage(savedImg, 0, 0, dispCanvas.width, dispCanvas.height);
          const sData = sCtx.getImageData(
            0,
            0,
            dispCanvas.width,
            dispCanvas.height,
          );
          // Convert to grayscale
          for (let i = 0; i < sData.data.length; i += 4) {
            const gray =
              sData.data[i] * 0.299 +
              sData.data[i + 1] * 0.587 +
              sData.data[i + 2] * 0.114;
            sData.data[i] = sData.data[i + 1] = sData.data[i + 2] = gray;
          }
          sCtx.putImageData(sData, 0, 0);
          originalDispDataRef.current = new Uint8ClampedArray(sData.data);
          dispTex.needsUpdate = true;
        };
        savedImg.src = savedData;
      } else {
        // Zero out displacement → flat terrain by default
        const totalPx = dispCanvas.width * dispCanvas.height;
        for (let i = 0; i < totalPx; i++) {
          const idx = i * 4;
          origData.data[idx] = 0;
          origData.data[idx + 1] = 0;
          origData.data[idx + 2] = 0;
        }
        origCtx.putImageData(origData, 0, 0);
        originalDispDataRef.current = new Uint8ClampedArray(origData.data);
        dispTex.needsUpdate = true;
      }
      dispTex.minFilter = THREE.LinearFilter;
      dispTex.magFilter = THREE.LinearFilter;
      dispTex.wrapS = THREE.ClampToEdgeWrapping;
      dispTex.wrapT = THREE.ClampToEdgeWrapping;

      const segsX = Math.min(512, Math.round(IMAGE_WIDTH / 4));
      const segsY = Math.min(512, Math.round(IMAGE_HEIGHT / 4));
      const planeGeo = new THREE.PlaneGeometry(
        IMAGE_WIDTH,
        IMAGE_HEIGHT,
        segsX,
        segsY,
      );
      const planeMat = new THREE.MeshStandardMaterial({
        map: colorTex,
        displacementMap: dispTex,
        displacementScale: 60, // EXACT GiroCanvas default
        side: THREE.DoubleSide,
        roughness: 0.85,
        metalness: 0.05,
      });
      const planeMesh = new THREE.Mesh(planeGeo, planeMat);
      planeMesh.receiveShadow = true;
      planeMesh.castShadow = true;
      scene.add(planeMesh);
      planeRef.current = planeMesh;
    };
    img.src = IMAGE_SRC;

    // Animation loop
    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize
    const onResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // SVG re-render on camera change
    const onControlsChange = () => {
      if (!rectActiveRef.current) return;
      if (svgTickRafRef.current !== null) return;
      svgTickRafRef.current = requestAnimationFrame(() => {
        svgTickRafRef.current = null;
        setSvgTick((t) => t + 1);
      });
    };
    controls.addEventListener("change", onControlsChange);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (svgTickRafRef.current !== null) {
        cancelAnimationFrame(svgTickRafRef.current);
        svgTickRafRef.current = null;
      }
      window.removeEventListener("resize", onResize);
      controls.removeEventListener("change", onControlsChange);
      controls.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      cabanaMeshesRef.current = [];
      planeRef.current = null;
    };
  }, []);

  // ─── Load saved elevation when prop arrives after initial render ──────────

  useEffect(() => {
    if (!savedElevationData) return;
    const dc = dispCanvasRef.current;
    const dt = dispTexRef.current;
    if (!dc || !dt) return;
    // Only apply if canvas is already initialized
    if (!originalDispDataRef.current) return;

    const savedImg = new Image();
    savedImg.onload = () => {
      const ctx = dc.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(savedImg, 0, 0, dc.width, dc.height);
      const imgData = ctx.getImageData(0, 0, dc.width, dc.height);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const gray =
          imgData.data[i] * 0.299 +
          imgData.data[i + 1] * 0.587 +
          imgData.data[i + 2] * 0.114;
        imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);
      originalDispDataRef.current = new Uint8ClampedArray(imgData.data);
      dt.needsUpdate = true;
      // Reset undo history since we loaded fresh data
      dispHistoryRef.current = [];
      setCanUndo(false);
    };
    savedImg.src = savedElevationData;
  }, [savedElevationData]);

  // ─── Effects sync (GiroCanvas EffectsPanel pattern) ─────────────────────────

  useEffect(() => {
    const plane = planeRef.current;
    const fog = fogRef.current;
    const scene = sceneRef.current;
    const grid = gridRef.current;
    const lights = lightsRef.current;
    if (scene) scene.fog = fogEnabled ? (fog ?? null) : null;
    if (plane) {
      const mat = plane.material as THREE.MeshStandardMaterial;
      mat.displacementScale = displacementEnabled ? displacementScale : 0;
      mat.needsUpdate = true;
    }
    if (lights) {
      lights.hemi.intensity = enhancedLighting ? 0.5 : 0;
      lights.sun.intensity = enhancedLighting ? 1.2 : 0.7;
      lights.fill.intensity = enhancedLighting ? 0.4 : 0.15;
    }
    if (grid) grid.visible = gridVisible;
  }, [
    fogEnabled,
    displacementEnabled,
    displacementScale,
    enhancedLighting,
    gridVisible,
  ]);

  // ─── Rectangle region elevation sync ────────────────────────────────────

  useEffect(() => {
    const dc = dispCanvasRef.current;
    const dt = dispTexRef.current;
    const orig = originalDispDataRef.current;
    if (!dc || !dt || !orig || !rectDefined || !rectStart || !rectEnd) return;

    const ctx = dc.getContext("2d", { willReadFrequently: true })!;
    const imgData = ctx.getImageData(0, 0, dc.width, dc.height);

    // Start from committed state
    imgData.data.set(orig);

    if (rectElevation > 0) {
      const s = worldToPixel(rectStart.x, rectStart.y);
      const e = worldToPixel(rectEnd.x, rectEnd.y);
      const minX = Math.max(
        0,
        Math.min(Math.round(s.coordX), Math.round(e.coordX)),
      );
      const maxX = Math.min(
        dc.width - 1,
        Math.max(Math.round(s.coordX), Math.round(e.coordX)),
      );
      const minY = Math.max(
        0,
        Math.min(Math.round(s.coordY), Math.round(e.coordY)),
      );
      const maxY = Math.min(
        dc.height - 1,
        Math.max(Math.round(s.coordY), Math.round(e.coordY)),
      );

      const targetValue = Math.round((rectElevation / 100) * 255);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const idx = (y * dc.width + x) * 4;
          imgData.data[idx] = targetValue;
          imgData.data[idx + 1] = targetValue;
          imgData.data[idx + 2] = targetValue;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    dt.needsUpdate = true;
  }, [rectDefined, rectElevation, rectStart, rectEnd]);

  // ─── Sync cabana meshes ────────────────────────────────────────────────────

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Mesh'ler yeniden oluşturulacak — aktif drag varsa iptal et
    if (dragStateRef.current) {
      dragStateRef.current = null;
      const ctrl = controlsRef.current;
      if (ctrl && !mapLockedRef.current) ctrl.enabled = true;
    }

    cabanaMeshesRef.current.forEach((g) => {
      scene.remove(g);
      g.traverse((child) => {
        if ((child as THREE.Mesh).geometry)
          (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    });
    cabanaMeshesRef.current = [];
    sunbedMeshesRef.current.forEach((g) => {
      scene.remove(g);
      g.traverse((child) => {
        if ((child as THREE.Mesh).geometry)
          (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    });
    sunbedMeshesRef.current = [];
    cabanas.forEach((cabana) => {
      const group = buildCabanaMesh(cabana, cabana.id === selectedCabanaId);
      scene.add(group);
      cabanaMeshesRef.current.push(group);

      // Önünde alan varsa şezlong ekle
      if (hasFrontSpace(cabana, cabanas)) {
        const sunbeds = buildSunbedPair(cabana);
        scene.add(sunbeds);
        sunbedMeshesRef.current.push(sunbeds);
      }
    });
  }, [cabanas, selectedCabanaId]);

  // ─── Dynamic ServicePoint buildings (from DB) ──────────────────────────────

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove all existing service point meshes
    servicePointRefs.current.forEach((group, _id) => {
      scene.remove(group);
      group.traverse((child) => {
        if ((child as THREE.Mesh).geometry)
          (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    });
    servicePointRefs.current.clear();

    // Build mesh for each service point based on type
    for (const sp of servicePoints) {
      let group: THREE.Group;
      const spType = sp.type.toUpperCase();
      const spName = sp.name.toLowerCase();

      // Dispatch to existing mesh builders based on type/name
      if (
        spName.includes("sunset") ||
        (spType === "BEACH_BAR" && spName.includes("sunset"))
      ) {
        group = buildSunsetBarMesh(sp.x, sp.y, sp.rotation);
      } else if (spName.includes("blue sea") || spName.includes("blue_sea")) {
        group = buildBlueSeaBarMesh(sp.x, sp.y, sp.rotation);
      } else {
        // Generic service point — use buildGenericServicePointMesh
        group = buildGenericServicePointMesh(
          sp.x,
          sp.y,
          sp.rotation,
          sp.name,
          sp.type,
        );
      }

      group.scale.setScalar(sp.scale);
      // Tag with service point data for drag/click system
      group.userData = {
        isBuilding: true,
        buildingType: `sp-${sp.id}`,
        servicePointId: sp.id,
      };
      group.traverse((child) => {
        child.userData = {
          isBuilding: true,
          buildingType: `sp-${sp.id}`,
          servicePointId: sp.id,
        };
      });

      scene.add(group);
      servicePointRefs.current.set(sp.id, group);
    }

    return () => {
      servicePointRefs.current.forEach((group) => {
        if (scene) scene.remove(group);
      });
    };
  }, [servicePoints]);

  // ─── Common Parasols (draggable building, persisted to DB) ────────────────

  const commonParasolRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing parasols
    if (commonParasolRef.current) {
      scene.remove(commonParasolRef.current);
      commonParasolRef.current.traverse((child) => {
        if ((child as THREE.Mesh).geometry)
          (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
      commonParasolRef.current = null;
    }

    const worldPos = pixelToWorld(
      commonParasolTransform.x,
      commonParasolTransform.y,
    );
    const wrapper = new THREE.Group();
    wrapper.position.set(worldPos.x, worldPos.y, 0);
    wrapper.rotation.z =
      ((commonParasolTransform.rotation ?? 0) * Math.PI) / 180;
    wrapper.scale.setScalar(commonParasolTransform.scale);

    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xf8f4ec,
      roughness: 0.8,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xb0b0b0,
      roughness: 0.4,
      metalness: 0.5,
    });
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.8,
      metalness: 0.2,
    });

    // Two parasols offset from center
    [
      { ox: -15, oy: 0 },
      { ox: 15, oy: 0 },
    ].forEach(({ ox, oy }) => {
      const pGroup = new THREE.Group();

      // Pole
      const poleH = 16;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, poleH, 8),
        poleMat,
      );
      pole.rotation.x = Math.PI / 2;
      pole.position.set(0, 0, poleH / 2);
      pole.castShadow = true;
      pGroup.add(pole);

      // Canopy
      const cR = 10;
      const cH = 3.5;
      const canopyMesh = new THREE.Mesh(
        new THREE.ConeGeometry(cR, cH, 12, 1, true),
        canopyMat,
      );
      canopyMesh.position.set(0, 0, poleH + 0.5);
      canopyMesh.rotation.x = Math.PI / 2;
      canopyMesh.castShadow = true;
      pGroup.add(canopyMesh);

      // Finial
      const fin = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), poleMat);
      fin.position.set(0, 0, poleH + 1);
      pGroup.add(fin);

      // Base disc
      const baseDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 0.5, 12),
        baseMat,
      );
      baseDisc.rotation.x = Math.PI / 2;
      baseDisc.position.set(0, 0, 0.25);
      pGroup.add(baseDisc);

      pGroup.position.set(ox, oy, 0);
      wrapper.add(pGroup);
    });

    // Mark as building for drag system
    wrapper.userData = { isBuilding: true, buildingType: "common-parasol" };
    wrapper.traverse((child) => {
      child.userData = { isBuilding: true, buildingType: "common-parasol" };
    });

    scene.add(wrapper);
    commonParasolRef.current = wrapper;

    return () => {
      if (commonParasolRef.current && scene) {
        scene.remove(commonParasolRef.current);
      }
    };
  }, [commonParasolTransform]);

  // ─── Placement preview ────────────────────────────────────────────────────

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (placementRef.current) {
      scene.remove(placementRef.current);
      placementRef.current.geometry.dispose();
      (placementRef.current.material as THREE.Material).dispose();
      placementRef.current = null;
    }
    if (placementCoords) {
      const pos = pixelToWorld(placementCoords.lng, placementCoords.lat);
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(8, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xeab308,
          emissive: 0xeab308,
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.7,
        }),
      );
      sphere.position.copy(pos);
      sphere.position.z = 10;
      scene.add(sphere);
      placementRef.current = sphere;
    }
  }, [placementCoords]);

  // ─── Mouse interaction: click, drag, right-click ─────────────────────────

  useEffect(() => {
    const el = mountRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!el || !camera || !controls) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPt = new THREE.Vector3();

    function getMouseNDC(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function getWorldFromEvent(e: MouseEvent): { x: number; y: number } {
      getMouseNDC(e);
      raycaster.setFromCamera(mouse, camera!);
      raycaster.ray.intersectPlane(groundPlane, intersectPt);
      return { x: intersectPt.x, y: intersectPt.y };
    }

    function findCabanaUnderMouse(
      e: MouseEvent,
    ): { cabanaId: string; group: THREE.Group } | null {
      getMouseNDC(e);
      raycaster.setFromCamera(mouse, camera!);
      const meshes: THREE.Object3D[] = [];
      cabanaMeshesRef.current.forEach((g) =>
        g.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) meshes.push(c);
        }),
      );
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const cabanaId = hits[0].object.userData.cabanaId as string;
        const group = cabanaMeshesRef.current.find(
          (g) => g.userData.cabanaId === cabanaId,
        );
        if (group) return { cabanaId, group };
      }
      return null;
    }

    function findBuildingUnderMouse(
      e: MouseEvent,
    ): { buildingType: string; group: THREE.Group } | null {
      getMouseNDC(e);
      raycaster.setFromCamera(mouse, camera!);

      // Collect all building meshes (ServicePoints + Common Parasol)
      const buildings: { ref: THREE.Group | null; type: string }[] = [
        { ref: commonParasolRef.current, type: "common-parasol" },
      ];
      // Add all service point refs
      servicePointRefs.current.forEach((group, spId) => {
        buildings.push({ ref: group, type: `sp-${spId}` });
      });

      const allMeshes: THREE.Object3D[] = [];
      const meshToBuilding = new Map<
        THREE.Object3D,
        { type: string; group: THREE.Group }
      >();

      for (const b of buildings) {
        if (!b.ref) continue;
        b.ref.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            allMeshes.push(c);
            meshToBuilding.set(c, { type: b.type, group: b.ref! });
          }
        });
      }

      const hits = raycaster.intersectObjects(allMeshes, false);
      if (hits.length > 0 && hits[0].object.userData.isBuilding) {
        const info = meshToBuilding.get(hits[0].object);
        if (info) {
          return { buildingType: info.type, group: info.group };
        }
      }
      return null;
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      // Rectangle selection mode
      if (rectActiveRef.current && !rectDefinedRef.current) {
        const wp = getWorldFromEvent(e);
        setRectStart(wp);
        setRectEnd(wp);
        rectDraggingRef.current = true;
        controls!.enabled = false;
        return;
      }
      if (rectActiveRef.current && rectDefinedRef.current) return;

      // Check for building click first (Sunset Bar, Blue Sea Bar, etc.)
      if (editableRef.current) {
        const buildingHit = findBuildingUnderMouse(e);
        if (buildingHit) {
          // Check if building is locked
          let isLocked = false;
          if (buildingHit.buildingType === "common-parasol") {
            isLocked = commonParasolTransformRef.current.isLocked;
          } else if (buildingHit.buildingType.startsWith("sp-")) {
            const spId = buildingHit.buildingType.replace("sp-", "");
            const sp = servicePointsRef.current.find((s) => s.id === spId);
            isLocked = sp?.isLocked ?? false;
          }
          if (isLocked) {
            // Building is locked, just select it but don't allow drag
            setSelectedBuilding(buildingHit.buildingType);
            return;
          }
          setSelectedBuilding(buildingHit.buildingType);
          getMouseNDC(e);
          raycaster.setFromCamera(mouse, camera!);
          raycaster.ray.intersectPlane(groundPlane, intersectPt);
          buildingDragRef.current = {
            active: true,
            buildingType: buildingHit.buildingType,
            offset: intersectPt.clone().sub(buildingHit.group.position),
            group: buildingHit.group,
          };
          controls!.enabled = false;
          return;
        }
      }

      // === DRAG & DROP SİSTEMİ ===
      // Basılı tut → sürükle → bırak
      const hit = findCabanaUnderMouse(e);
      if (hit) {
        const cabana = cabanasRef.current.find((c) => c.id === hit.cabanaId);
        if (cabana) {
          console.log(
            "[CABANA] Tıklandı:",
            cabana.name,
            "editable:",
            editableRef.current,
            "isLocked:",
            cabana.isLocked,
          );
          onCabanaClickRef.current?.(cabana);
          if (!editableRef.current || cabana.isLocked) {
            return;
          }
          // DRAG START: Basılı tut, offset hesapla
          if (editableRef.current && !cabana.isLocked) {
            console.log("[CABANA] Drag başladı:", cabana.name);
            getMouseNDC(e);
            raycaster.setFromCamera(mouse, camera!);
            raycaster.ray.intersectPlane(groundPlane, intersectPt);
            dragStateRef.current = {
              active: true,
              cabanaId: cabana.id,
              offset: intersectPt.clone().sub(hit.group.position),
              group: hit.group,
            };
            controls!.enabled = false;
          }
        }
      }
    };

    const onDblClick = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      // Rectangle drag
      if (rectActiveRef.current && rectDraggingRef.current) {
        const wp = getWorldFromEvent(e);
        setRectEnd(wp);
        return;
      }
      // Building drag (Sunset Bar, etc.)
      const bd = buildingDragRef.current;
      if (bd?.active) {
        getMouseNDC(e);
        raycaster.setFromCamera(mouse, camera!);
        raycaster.ray.intersectPlane(groundPlane, intersectPt);
        bd.group.position.x = intersectPt.x - bd.offset.x;
        bd.group.position.y = intersectPt.y - bd.offset.y;
        return;
      }
      // Cabana drag — klasik drag & drop
      const ds = dragStateRef.current;
      if (!ds?.active) return;

      // Mouse world koordinatını hesapla
      getMouseNDC(e);
      raycaster.setFromCamera(mouse, camera!);
      raycaster.ray.intersectPlane(groundPlane, intersectPt);

      // Cabana'yı offset'li konuma taşı (tıklanan noktadan sapma korunur)
      ds.group.position.x = intersectPt.x - ds.offset.x;
      ds.group.position.y = intersectPt.y - ds.offset.y;
    };

    const onPointerUp = () => {
      // Rectangle drag end
      if (rectActiveRef.current && rectDraggingRef.current) {
        rectDraggingRef.current = false;
        controls!.enabled = true;
        setRectDefined(true);
        return;
      }
      // Building drag end
      const bd = buildingDragRef.current;
      if (bd?.active) {
        bd.active = false;
        if (!mapLockedRef.current) controls!.enabled = true;
        const { coordX, coordY } = worldToPixel(
          bd.group.position.x,
          bd.group.position.y,
        );
        // Update ServicePoint or Common Parasol transform state
        if (bd.buildingType === "common-parasol") {
          setCommonParasolTransform(
            (prev: {
              x: number;
              y: number;
              scale: number;
              rotation: number;
              isLocked: boolean;
            }) => ({
              ...prev,
              x: coordX,
              y: coordY,
            }),
          );
        } else if (bd.buildingType.startsWith("sp-")) {
          const spId = bd.buildingType.replace("sp-", "");
          setServicePoints((prev) => {
            const updated = prev.map((sp) =>
              sp.id === spId ? { ...sp, x: coordX, y: coordY } : sp,
            );
            // Save to DB
            const sp = updated.find((s) => s.id === spId);
            if (sp) saveServicePointTransform(spId, sp);
            return updated;
          });
        }
        buildingDragRef.current = null;
        return;
      }
      // DRAG END: Mouse bırakıldığında cabana'yı düşür ve pozisyonu kaydet
      const ds = dragStateRef.current;
      if (ds?.active) {
        ds.active = false;
        dragStateRef.current = null;
        if (!mapLockedRef.current) controls!.enabled = true;
        const { coordX, coordY } = worldToPixel(
          ds.group.position.x,
          ds.group.position.y,
        );
        console.log("[CABANA] Bırakıldı:", ds.cabanaId, "→", coordX, coordY);
        onLocationUpdateRef.current?.(ds.cabanaId, coordX, coordY);
        return;
      }
      // Hiçbir drag aktif değilse controls'ü garanti aç
      if (!mapLockedRef.current && controls) controls.enabled = true;
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (!editableRef.current) return;
      if (rectActiveRef.current) return;

      // Check for building first
      const buildingHit = findBuildingUnderMouse(e);
      if (buildingHit) {
        setBuildingContextMenu({
          x: e.clientX,
          y: e.clientY,
          buildingType: buildingHit.buildingType,
        });
        return;
      }

      const hit = findCabanaUnderMouse(e);
      const wp = getWorldFromEvent(e);
      const { coordX, coordY } = worldToPixel(wp.x, wp.y);
      if (hit) {
        const cabana =
          cabanasRef.current.find((c) => c.id === hit.cabanaId) ?? null;
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          worldX: coordX,
          worldY: coordY,
          cabana,
        });
      } else {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          worldX: coordX,
          worldY: coordY,
          cabana: null,
        });
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("dblclick", onDblClick);
    el.addEventListener("contextmenu", onContextMenu);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("dblclick", onDblClick);
      el.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  // Close building context menu on outside click
  useEffect(() => {
    if (!buildingContextMenu) return;
    const handler = () => setBuildingContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [buildingContextMenu]);

  // ─── Map lock sync — disable/enable MapControls ──────────────────────────

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.enabled = !mapLocked;
  }, [mapLocked]);

  // ─── Context menu actions ──────────────────────────────────────────────────

  const handleToggleMapLock = useCallback(() => {
    setMapLocked((prev) => !prev);
    setContextMenu(null);
  }, []);

  const handleAddCabana = useCallback(() => {
    if (!contextMenu) return;
    onMapClick?.(contextMenu.worldY, contextMenu.worldX);
    setContextMenu(null);
  }, [contextMenu, onMapClick]);

  const handleToggleLock = useCallback(() => {
    if (!contextMenu?.cabana) return;
    const c = contextMenu.cabana;
    onLocationUpdate?.(
      c.id,
      c.coordX,
      c.coordY,
      c.rotation,
      c.scaleX,
      c.scaleY,
      c.color ?? undefined,
      !c.isLocked,
    );
    setContextMenu(null);
  }, [contextMenu, onLocationUpdate]);

  const handleOpenColorPicker = useCallback(() => {
    if (!contextMenu?.cabana) return;
    setColorPickerCabana(contextMenu.cabana);
    setPickerColor(getDefaultColor(contextMenu.cabana));
    setContextMenu(null);
  }, [contextMenu]);

  const handleColorSave = useCallback(() => {
    if (!colorPickerCabana) return;
    const c = colorPickerCabana;
    onLocationUpdate?.(
      c.id,
      c.coordX,
      c.coordY,
      c.rotation,
      c.scaleX,
      c.scaleY,
      pickerColor,
      c.isLocked,
    );
    setColorPickerCabana(null);
  }, [colorPickerCabana, pickerColor, onLocationUpdate]);

  const handleDeleteCabana = useCallback(() => {
    if (!contextMenu?.cabana) return;
    onCabanaDelete?.(contextMenu.cabana.id);
    setContextMenu(null);
  }, [contextMenu, onCabanaDelete]);

  const handleOpenResize = useCallback(() => {
    if (!contextMenu?.cabana) return;
    const c = contextMenu.cabana;
    setResizeCabana(c);
    setResizeScaleX(c.scaleX ?? 1);
    setResizeScaleY(c.scaleY ?? 1);
    setResizeRotation(c.rotation ?? 0);
    setContextMenu(null);
  }, [contextMenu]);

  const handleResizeSave = useCallback(() => {
    if (!resizeCabana) return;
    const c = resizeCabana;
    onLocationUpdate?.(
      c.id,
      c.coordX,
      c.coordY,
      resizeRotation,
      resizeScaleX,
      resizeScaleY,
      c.color ?? undefined,
      c.isLocked,
    );
    setResizeCabana(null);
  }, [
    resizeCabana,
    resizeScaleX,
    resizeScaleY,
    resizeRotation,
    onLocationUpdate,
  ]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {editable && (
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-neutral-500">
            Sağ tıkla → Cabana Ekle / Sabitle / Renk · Sürükle → Taşı
          </span>
          {mapLocked && (
            <span className="text-xs text-yellow-500 font-medium flex items-center gap-1">
              🔒 Harita Sabit
            </span>
          )}
          {selectedCabanaId && (
            <span className="text-xs text-yellow-500/80">
              Seçili: {cabanas.find((c) => c.id === selectedCabanaId)?.name}
            </span>
          )}
        </div>
      )}

      {/* Top Toolbar - 3D Effects & Elevation Tools (sadece düzenleme modunda) */}
      {editable && (
      <div className="flex items-center gap-1 mb-2 p-1.5 bg-neutral-800/80 backdrop-blur rounded-lg border border-neutral-700">
        {/* 3D Effects Toggle Buttons */}
        <div className="flex items-center gap-1 pr-2 border-r border-neutral-600">
          <button
            onClick={() => setFogEnabled(!fogEnabled)}
            title="Sis (Fog)"
            className={`p-2 rounded-lg transition-all ${
              fogEnabled
                ? "bg-blue-600 text-white"
                : "bg-neutral-700/50 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
            }`}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
              <path d="M16 17H7" />
              <path d="M17 21H9" />
            </svg>
          </button>
          <button
            onClick={() => setDisplacementEnabled(!displacementEnabled)}
            title="Yükseklik (Displacement)"
            className={`p-2 rounded-lg transition-all ${
              displacementEnabled
                ? "bg-blue-600 text-white"
                : "bg-neutral-700/50 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
            }`}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
            </svg>
          </button>
          <button
            onClick={() => setEnhancedLighting(!enhancedLighting)}
            title="Gelişmiş Işık"
            className={`p-2 rounded-lg transition-all ${
              enhancedLighting
                ? "bg-yellow-600 text-white"
                : "bg-neutral-700/50 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
            }`}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          </button>
          <button
            onClick={() => setGridVisible(!gridVisible)}
            title="Grid Çizgileri"
            className={`p-2 rounded-lg transition-all ${
              gridVisible
                ? "bg-purple-600 text-white"
                : "bg-neutral-700/50 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
            }`}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
            </svg>
          </button>
        </div>

        {/* Displacement Scale Slider */}
        {displacementEnabled && (
          <div className="flex items-center gap-2 px-2 border-r border-neutral-600">
            <span className="text-[10px] text-neutral-500">Yükseklik:</span>
            <input
              type="range"
              min={0}
              max={200}
              step={5}
              value={displacementScale}
              onChange={(e) => setDisplacementScale(Number(e.target.value))}
              aria-label="Yükseklik ölçeği"
              className="w-20 accent-blue-500 h-1"
            />
            <span className="text-[10px] text-neutral-400 w-6 tabular-nums">
              {displacementScale}
            </span>
          </div>
        )}

        {/* Elevation Tool */}
        {editable && (
          <>
            <div className="flex items-center gap-1 px-2 border-r border-neutral-600">
              <button
                onClick={() => {
                  const next = !rectActive;
                  setRectActive(next);
                  if (next) {
                    const dc = dispCanvasRef.current;
                    if (dc) {
                      const ctx = dc.getContext("2d", {
                        willReadFrequently: true,
                      })!;
                      const imgData = ctx.getImageData(
                        0,
                        0,
                        dc.width,
                        dc.height,
                      );
                      originalDispDataRef.current = new Uint8ClampedArray(
                        imgData.data,
                      );
                    }
                    if (displacementScale < 30) setDisplacementScale(60);
                    if (!displacementEnabled) setDisplacementEnabled(true);
                  } else {
                    setRectStart(null);
                    setRectEnd(null);
                    setRectDefined(false);
                    setRectElevation(50);
                    const dc = dispCanvasRef.current;
                    const dt = dispTexRef.current;
                    const committed = originalDispDataRef.current;
                    if (dc && dt && committed) {
                      const ctx = dc.getContext("2d", {
                        willReadFrequently: true,
                      })!;
                      const imgData = ctx.getImageData(
                        0,
                        0,
                        dc.width,
                        dc.height,
                      );
                      imgData.data.set(committed);
                      ctx.putImageData(imgData, 0, 0);
                      dt.needsUpdate = true;
                    }
                  }
                }}
                title="Alan Yükselt"
                className={`p-2 rounded-lg transition-all ${
                  rectActive
                    ? "bg-yellow-600 text-white"
                    : "bg-neutral-700/50 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M3 15h18" />
                  <path d="m15 8-3-3-3 3" />
                  <path d="M12 5v7" />
                </svg>
              </button>

              {/* Reset Elevation Button */}
              {onElevationReset && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "Tüm yükseltme verileri sıfırlanacak. Emin misiniz?",
                      )
                    ) {
                      onElevationReset();
                    }
                  }}
                  title="Yükseltmeleri Sıfırla"
                  className="p-2 rounded-lg transition-all bg-red-700/50 text-red-400 hover:bg-red-600 hover:text-white"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
              )}
            </div>

            {/* Elevation Controls - shown when rect tool active */}
            {rectActive && (
              <div className="flex items-center gap-2 px-2">
                {rectDefined ? (
                  <>
                    <span className="text-[10px] text-yellow-400">Alan:</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={rectElevation}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRectElevation(val);
                        if (val > 0 && displacementScale < 30)
                          setDisplacementScale(60);
                      }}
                      aria-label="Seçili alan yüksekliği"
                      className="w-16 accent-yellow-500 h-1"
                    />
                    <span className="text-[10px] text-neutral-400 w-6 tabular-nums">
                      %{rectElevation}
                    </span>
                    <button
                      onClick={() => {
                        const prev = originalDispDataRef.current;
                        if (prev) {
                          dispHistoryRef.current.push(
                            new Uint8ClampedArray(prev),
                          );
                          setCanUndo(true);
                        }
                        const dc = dispCanvasRef.current;
                        if (dc) {
                          const ctx = dc.getContext("2d", {
                            willReadFrequently: true,
                          })!;
                          const imgData = ctx.getImageData(
                            0,
                            0,
                            dc.width,
                            dc.height,
                          );
                          originalDispDataRef.current = new Uint8ClampedArray(
                            imgData.data,
                          );
                        }
                        setRectStart(null);
                        setRectEnd(null);
                        setRectDefined(false);
                        setRectElevation(50);
                      }}
                      title="Uygula"
                      className="p-1.5 rounded bg-yellow-600 hover:bg-yellow-500 text-white transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setRectStart(null);
                        setRectEnd(null);
                        setRectDefined(false);
                        setRectElevation(50);
                        const dc = dispCanvasRef.current;
                        const dt = dispTexRef.current;
                        const orig = originalDispDataRef.current;
                        if (dc && dt && orig) {
                          const ctx = dc.getContext("2d", {
                            willReadFrequently: true,
                          })!;
                          const imgData = ctx.getImageData(
                            0,
                            0,
                            dc.width,
                            dc.height,
                          );
                          imgData.data.set(orig);
                          ctx.putImageData(imgData, 0, 0);
                          dt.needsUpdate = true;
                        }
                      }}
                      title="İptal"
                      className="p-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-neutral-500">
                    Sürükleyerek alan seçin
                  </span>
                )}
                <button
                  disabled={!canUndo}
                  onClick={() => {
                    const history = dispHistoryRef.current;
                    if (history.length === 0) return;
                    const prev = history.pop()!;
                    setCanUndo(history.length > 0);
                    originalDispDataRef.current = prev;
                    const dc = dispCanvasRef.current;
                    const dt = dispTexRef.current;
                    if (dc && dt) {
                      const ctx = dc.getContext("2d", {
                        willReadFrequently: true,
                      })!;
                      const imgData = ctx.getImageData(
                        0,
                        0,
                        dc.width,
                        dc.height,
                      );
                      imgData.data.set(prev);
                      ctx.putImageData(imgData, 0, 0);
                      dt.needsUpdate = true;
                    }
                    setRectStart(null);
                    setRectEnd(null);
                    setRectDefined(false);
                    setRectElevation(50);
                  }}
                  title="Geri Al"
                  className={`p-1.5 rounded transition-colors ${
                    canUndo
                      ? "bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
                      : "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                  }`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const dc = dispCanvasRef.current;
                    if (dc && onElevationSave) {
                      onElevationSave(dc.toDataURL("image/png"));
                    }
                  }}
                  title="Kaydet"
                  className="p-1.5 rounded bg-green-700 hover:bg-green-600 text-white transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}

        {/* Map Lock Indicator */}
        {mapLocked && (
          <div className="flex items-center gap-1 px-2 text-yellow-500">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-[10px] font-medium">Sabit</span>
          </div>
        )}
      </div>
      )}

      {/* Three.js Canvas */}
      <div
        ref={mountRef}
        className="flex-1 rounded-lg overflow-hidden border border-neutral-700 min-h-70 md:min-h-100 relative"
        style={{
          background: "#0a0a0a",
          cursor: rectActive ? "crosshair" : "auto",
        }}
      >
        {/* Rectangle selection SVG overlay */}
        {rectActive && rectScreenStart && rectScreenEnd && (
          <svg
            className="absolute inset-0 z-5 pointer-events-none"
            width="100%"
            height="100%"
          >
            <rect
              x={Math.min(rectScreenStart.x, rectScreenEnd.x)}
              y={Math.min(rectScreenStart.y, rectScreenEnd.y)}
              width={Math.abs(rectScreenEnd.x - rectScreenStart.x)}
              height={Math.abs(rectScreenEnd.y - rectScreenStart.y)}
              fill="rgba(234,179,8,0.12)"
              stroke="#eab308"
              strokeWidth="2"
              strokeDasharray={rectDefined ? "none" : "6 3"}
            />
          </svg>
        )}
      </div>

      {/* Building Context Menu (ServicePoints + Common Parasol) */}
      {buildingContextMenu &&
        (() => {
          const bt = buildingContextMenu.buildingType;
          const isServicePoint = bt.startsWith("sp-");
          const spId = isServicePoint ? bt.replace("sp-", "") : null;
          const sp = spId ? servicePoints.find((s) => s.id === spId) : null;
          const displayName = sp
            ? sp.name
            : bt === "common-parasol"
              ? "Common Parasol"
              : bt;
          const isLocked = sp
            ? sp.isLocked
            : bt === "common-parasol"
              ? commonParasolTransform.isLocked
              : false;
          const coordInfo = sp
            ? { x: Math.round(sp.x), y: Math.round(sp.y) }
            : bt === "common-parasol"
              ? {
                x: Math.round(commonParasolTransform.x),
                y: Math.round(commonParasolTransform.y),
              }
              : null;
          const accentClass = sp?.name.toLowerCase().includes("blue")
            ? "text-blue-400"
            : "text-orange-400";
          const hoverClass = sp?.name.toLowerCase().includes("blue")
            ? "hover:bg-blue-600/20 hover:text-blue-400"
            : "hover:bg-orange-600/20 hover:text-orange-400";

          return (
            <div
              className="fixed z-2000 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl py-1 min-w-50 animate-in fade-in zoom-in-95 duration-150"
              style={{
                left: buildingContextMenu.x,
                top: buildingContextMenu.y,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`px-3 py-1.5 text-[11px] font-semibold border-b border-neutral-800 ${accentClass}`}
              >
                {displayName}
              </div>
              <button
                onClick={() => {
                  if (isServicePoint && spId) {
                    setServicePoints((prev) => {
                      const updated = prev.map((s) =>
                        s.id === spId ? { ...s, isLocked: !s.isLocked } : s,
                      );
                      const updatedSp = updated.find((s) => s.id === spId);
                      if (updatedSp) saveServicePointTransform(spId, updatedSp);
                      return updated;
                    });
                  } else if (bt === "common-parasol") {
                    setCommonParasolTransform((prev) => ({
                      ...prev,
                      isLocked: !prev.isLocked,
                    }));
                  }
                  setBuildingContextMenu(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-200 transition-colors text-left ${hoverClass}`}
              >
                {isLocked ? "🔓 Kilidi Aç" : "🔒 Sabitle"}
              </button>
              <button
                onClick={() => {
                  setSelectedBuilding(bt);
                  setBuildingContextMenu(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-200 transition-colors text-left ${hoverClass}`}
              >
                📐 Boyutlandır
              </button>
              <div className="border-t border-neutral-800 my-1" />
              {coordInfo && (
                <div className="px-3 py-1.5 text-[10px] text-neutral-600">
                  X: {coordInfo.x} · Y: {coordInfo.y}
                  {isLocked && " · 🔒"}
                </div>
              )}
            </div>
          );
        })()}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-2000 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl py-1 min-w-50 animate-in fade-in zoom-in-95 duration-150"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.cabana ? (
            <>
              <div className="px-3 py-1.5 text-[11px] text-yellow-400 font-semibold border-b border-neutral-800">
                {contextMenu.cabana.name}
              </div>
              <button
                onClick={handleToggleMapLock}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-200 hover:bg-yellow-600/20 hover:text-yellow-400 transition-colors text-left"
              >
                {mapLocked
                  ? "🔓 Harita Sabitini Kaldır"
                  : "🔒 Haritayı Sabitle"}
              </button>
              <button
                onClick={handleToggleLock}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-200 hover:bg-yellow-600/20 hover:text-yellow-400 transition-colors text-left"
              >
                {contextMenu.cabana.isLocked ? "🔓 Kilidi Aç" : "🔒 Sabitle"}
              </button>
              <button
                onClick={handleOpenColorPicker}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-200 hover:bg-yellow-600/20 hover:text-yellow-400 transition-colors text-left"
              >
                🎨 Renk Değiştir
              </button>
              <button
                onClick={handleOpenResize}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-200 hover:bg-yellow-600/20 hover:text-yellow-400 transition-colors text-left"
              >
                📐 Boyutlandır
              </button>
              <div className="border-t border-neutral-800 my-1" />
              <button
                onClick={handleDeleteCabana}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-colors text-left"
              >
                🗑️ Sil
              </button>
              <div className="border-t border-neutral-800 my-1" />
              <div className="px-3 py-1.5 text-[10px] text-neutral-600">
                {getStatusLabel(contextMenu.cabana)} · X:
                {Math.round(contextMenu.cabana.coordX)} Y:
                {Math.round(contextMenu.cabana.coordY)}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={handleToggleMapLock}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-200 hover:bg-yellow-600/20 hover:text-yellow-400 transition-colors text-left"
              >
                {mapLocked
                  ? "🔓 Harita Sabitini Kaldır"
                  : "🔒 Haritayı Sabitle"}
              </button>
              <button
                onClick={handleAddCabana}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-200 hover:bg-yellow-600/20 hover:text-yellow-400 transition-colors text-left"
              >
                ➕ Cabana Ekle
              </button>
              <div className="border-t border-neutral-800 my-1" />
              <div className="px-3 py-1.5 text-[10px] text-neutral-600">
                X: {Math.round(contextMenu.worldX)} · Y:{" "}
                {Math.round(contextMenu.worldY)}
              </div>
            </>
          )}
        </div>
      )}

      {/* Color Picker Modal */}
      {colorPickerCabana && (
        <div
          className="fixed inset-0 z-2100 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setColorPickerCabana(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-t-xl sm:rounded-xl shadow-2xl p-5 w-full sm:w-72 max-w-[100vw] sm:max-w-none"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-yellow-400 mb-3">
              {colorPickerCabana.name} — Renk Seç
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPickerColor(c)}
                  aria-label={`Renk seç: ${c}`}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${pickerColor === c ? "border-white scale-110" : "border-transparent hover:border-neutral-600"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="w-8 h-8 rounded-lg border-2 border-dashed border-neutral-600 hover:border-neutral-400 cursor-pointer flex items-center justify-center">
                <span className="text-xs text-neutral-500">+</span>
                <input
                  type="color"
                  value={pickerColor}
                  onChange={(e) => setPickerColor(e.target.value)}
                  aria-label="Özel renk seç"
                  className="sr-only"
                />
              </label>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-6 h-6 rounded-md"
                style={{ backgroundColor: pickerColor }}
              />
              <span className="text-xs text-neutral-400 font-mono">
                {pickerColor}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setColorPickerCabana(null)}
                className="flex-1 py-2 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleColorSave}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 text-neutral-950 transition-colors"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resize Modal */}
      {resizeCabana && (
        <div
          className="fixed inset-0 z-2100 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setResizeCabana(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-t-xl sm:rounded-xl shadow-2xl p-5 w-full sm:w-80 max-w-[100vw] sm:max-w-none"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-yellow-400 mb-4">
              {resizeCabana.name} — Boyutlandır
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-neutral-400">
                    Genişlik (scaleX)
                  </span>
                  <span className="text-[11px] text-neutral-500 tabular-nums">
                    {resizeScaleX.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={3}
                  step={0.1}
                  value={resizeScaleX}
                  onChange={(e) => setResizeScaleX(Number(e.target.value))}
                  aria-label="Cabana genişliği"
                  className="w-full accent-yellow-500 h-1.5 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-neutral-400">
                    Derinlik (scaleY)
                  </span>
                  <span className="text-[11px] text-neutral-500 tabular-nums">
                    {resizeScaleY.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={3}
                  step={0.1}
                  value={resizeScaleY}
                  onChange={(e) => setResizeScaleY(Number(e.target.value))}
                  aria-label="Cabana derinliği"
                  className="w-full accent-yellow-500 h-1.5 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-neutral-400">
                    Döndürme (°)
                  </span>
                  <span className="text-[11px] text-neutral-500 tabular-nums">
                    {resizeRotation}°
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={5}
                  value={resizeRotation}
                  onChange={(e) => setResizeRotation(Number(e.target.value))}
                  aria-label="Cabana döndürme"
                  className="w-full accent-yellow-500 h-1.5 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setResizeCabana(null)}
                className="flex-1 py-2 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleResizeSave}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-500 text-neutral-950 transition-colors"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Service Point Control Panel */}
      {selectedBuilding?.startsWith("sp-") &&
        editable &&
        (() => {
          const spId = selectedBuilding.replace("sp-", "");
          const sp = servicePoints.find((s) => s.id === spId);
          if (!sp) return null;
          const accentColor = sp.name.toLowerCase().includes("blue")
            ? "blue"
            : "orange";
          const accentBg =
            accentColor === "blue" ? "bg-blue-500/20" : "bg-orange-500/20";
          const accentText =
            accentColor === "blue" ? "text-blue-400" : "text-orange-400";
          const accentSlider =
            accentColor === "blue" ? "accent-blue-500" : "accent-orange-500";
          const accentBtn =
            accentColor === "blue"
              ? "bg-blue-600 hover:bg-blue-500 text-white"
              : "bg-orange-600 hover:bg-orange-500 text-neutral-950";
          return (
            <div className="fixed bottom-4 right-4 z-2100">
              <div
                className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl p-5 w-72"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg ${accentBg} flex items-center justify-center`}
                  >
                    <svg
                      className={`w-5 h-5 ${accentText}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 11h1a3 3 0 0 1 0 6h-1" />
                      <path d="M9 12v6" />
                      <path d="M13 12v6" />
                      <path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z" />
                      <path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8" />
                    </svg>
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold ${accentText}`}>
                      {sp.name}
                    </h3>
                    <p className="text-[10px] text-neutral-500">
                      Boyut ve rotasyon ayarları
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-neutral-400">
                        Boyut
                      </span>
                      <span className="text-[11px] text-neutral-500 tabular-nums">
                        {sp.scale.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={2}
                      step={0.05}
                      value={sp.scale}
                      onChange={(e) => {
                        const newScale = Number(e.target.value);
                        setServicePoints((prev) => {
                          const updated = prev.map((s) =>
                            s.id === spId ? { ...s, scale: newScale } : s,
                          );
                          const updatedSp = updated.find((s) => s.id === spId);
                          if (updatedSp)
                            saveServicePointTransform(spId, updatedSp);
                          return updated;
                        });
                      }}
                      aria-label={`${sp.name} boyutu`}
                      className={`w-full ${accentSlider} h-1.5 cursor-pointer`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-neutral-400">
                        Döndürme
                      </span>
                      <span className="text-[11px] text-neutral-500 tabular-nums">
                        {sp.rotation}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={5}
                      value={sp.rotation}
                      onChange={(e) => {
                        const newRotation = Number(e.target.value);
                        setServicePoints((prev) => {
                          const updated = prev.map((s) =>
                            s.id === spId ? { ...s, rotation: newRotation } : s,
                          );
                          const updatedSp = updated.find((s) => s.id === spId);
                          if (updatedSp)
                            saveServicePointTransform(spId, updatedSp);
                          return updated;
                        });
                      }}
                      aria-label={`${sp.name} döndürme`}
                      className={`w-full ${accentSlider} h-1.5 cursor-pointer`}
                    />
                  </div>
                  <div className="pt-2 border-t border-neutral-800">
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span>Konum</span>
                      <span className="tabular-nums">
                        X: {Math.round(sp.x)}, Y: {Math.round(sp.y)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setServicePoints((prev) => {
                        const updated = prev.map((s) =>
                          s.id === spId ? { ...s, scale: 1, rotation: 0 } : s,
                        );
                        const updatedSp = updated.find((s) => s.id === spId);
                        if (updatedSp)
                          saveServicePointTransform(spId, updatedSp);
                        return updated;
                      });
                    }}
                    className="flex-1 py-2 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    Sıfırla
                  </button>
                  <button
                    onClick={() => setSelectedBuilding(null)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg ${accentBtn} transition-colors`}
                  >
                    Tamam
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />{" "}
          Müsait
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />{" "}
          Rezerve
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-500 inline-block" />{" "}
          Kapalı
        </span>
        <span className="border-l border-neutral-800 pl-3 flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />{" "}
          Standard
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> VIP
        </span>
        {editable && (
          <span className="border-l border-neutral-800 pl-3 flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-yellow-500 border border-dashed border-yellow-400 inline-block" />{" "}
            Yeni konum
          </span>
        )}
      </div>
    </div>
  );
}
