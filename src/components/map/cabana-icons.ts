/**
 * Cabana SVG icon generators for Leaflet map markers.
 * Top-down (bird's eye) view — designed for 2.5D satellite overlay.
 * All icons are inline SVG strings for use with L.DivIcon.
 */

// ─── Main cabana icon (top-down parasol/cabana view) ─────────────────────────

export function createCabanaSvg(opts: {
  color: string;
  statusColor: string;
  rotation: number;
  scaleX: number;
  scaleY: number;
  selected: boolean;
  label?: string;
}): string {
  const { color, statusColor, rotation, scaleX, scaleY, selected, label } =
    opts;
  const baseW = 48;
  const baseH = 48;
  const w = Math.round(baseW * scaleX);
  const h = Math.round(baseH * scaleY);
  const glow = selected
    ? `filter: drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color}88);`
    : `filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));`;
  const border = selected
    ? "stroke:#fff;stroke-width:3;"
    : "stroke:rgba(255,255,255,0.6);stroke-width:1.5;";

  return `<div style="
    width:${w}px; height:${h}px;
    transform: rotate(${rotation}deg);
    transition: transform 0.2s ease, filter 0.2s ease;
    ${glow}
    cursor: pointer;
    position: relative;
  ">
    <svg viewBox="0 0 48 48" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <!-- Cabana base/platform -->
      <rect x="8" y="8" width="32" height="32" rx="4" ry="4"
        fill="${color}" fill-opacity="0.85" ${border} />
      <!-- Parasol/roof pattern (X cross) -->
      <line x1="8" y1="8" x2="40" y2="40" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
      <line x1="40" y1="8" x2="8" y2="40" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
      <!-- Center pole -->
      <circle cx="24" cy="24" r="4" fill="rgba(255,255,255,0.7)" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
      <!-- Status indicator dot -->
      <circle cx="38" cy="10" r="5" fill="${statusColor}" stroke="#111" stroke-width="1.5" />
      <!-- Sunbed indicators (two small rects) -->
      <rect x="14" y="28" width="8" height="3" rx="1" fill="rgba(255,255,255,0.4)" />
      <rect x="26" y="28" width="8" height="3" rx="1" fill="rgba(255,255,255,0.4)" />
    </svg>
    ${
      label
        ? `<div style="
      position:absolute; bottom:-16px; left:50%; transform:translateX(-50%);
      white-space:nowrap; font-size:10px; font-weight:600;
      color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.8);
      pointer-events:none;
    ">${label}</div>`
        : ""
    }
  </div>`;
}

// ─── VIP cabana icon (larger, with canopy detail) ────────────────────────────

export function createVipCabanaSvg(opts: {
  color: string;
  statusColor: string;
  rotation: number;
  scaleX: number;
  scaleY: number;
  selected: boolean;
  label?: string;
}): string {
  const { color, statusColor, rotation, scaleX, scaleY, selected, label } =
    opts;
  const baseW = 56;
  const baseH = 56;
  const w = Math.round(baseW * scaleX);
  const h = Math.round(baseH * scaleY);
  const glow = selected
    ? `filter: drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px ${color}88);`
    : `filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));`;
  const border = selected
    ? "stroke:#fff;stroke-width:3;"
    : "stroke:rgba(255,255,255,0.6);stroke-width:1.5;";

  return `<div style="
    width:${w}px; height:${h}px;
    transform: rotate(${rotation}deg);
    transition: transform 0.2s ease, filter 0.2s ease;
    ${glow}
    cursor: pointer;
    position: relative;
  ">
    <svg viewBox="0 0 56 56" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer canopy -->
      <rect x="4" y="4" width="48" height="48" rx="6" ry="6"
        fill="${color}" fill-opacity="0.9" ${border} />
      <!-- Inner platform -->
      <rect x="10" y="10" width="36" height="36" rx="3" ry="3"
        fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <!-- Parasol pattern (star) -->
      <line x1="28" y1="4" x2="28" y2="52" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <line x1="4" y1="28" x2="52" y2="28" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <line x1="4" y1="4" x2="52" y2="52" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <line x1="52" y1="4" x2="4" y2="52" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <!-- Center pole -->
      <circle cx="28" cy="28" r="5" fill="rgba(255,255,255,0.8)" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
      <!-- VIP star -->
      <text x="28" y="31" text-anchor="middle" font-size="8" fill="${color}" font-weight="bold">★</text>
      <!-- Status indicator -->
      <circle cx="46" cy="10" r="5" fill="${statusColor}" stroke="#111" stroke-width="1.5" />
      <!-- Sunbeds -->
      <rect x="14" y="36" width="10" height="3" rx="1" fill="rgba(255,255,255,0.4)" />
      <rect x="32" y="36" width="10" height="3" rx="1" fill="rgba(255,255,255,0.4)" />
      <!-- Side table -->
      <circle cx="28" cy="40" r="2" fill="rgba(255,255,255,0.3)" />
    </svg>
    ${
      label
        ? `<div style="
      position:absolute; bottom:-18px; left:50%; transform:translateX(-50%);
      white-space:nowrap; font-size:10px; font-weight:700;
      color:#fbbf24; text-shadow:0 1px 3px rgba(0,0,0,0.8);
      pointer-events:none;
    ">${label}</div>`
        : ""
    }
  </div>`;
}

// ─── Placement preview icon (dashed, animated) ──────────────────────────────

export function createPlacementSvg(): string {
  return `<div style="
    width:48px; height:48px;
    animation: cabana-place-pulse 1.5s ease-in-out infinite;
    cursor: crosshair;
  ">
    <svg viewBox="0 0 48 48" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="36" height="36" rx="4" ry="4"
        fill="rgba(234,179,8,0.3)" stroke="#eab308" stroke-width="2" stroke-dasharray="4 3" />
      <line x1="24" y1="6" x2="24" y2="42" stroke="rgba(234,179,8,0.4)" stroke-width="1" stroke-dasharray="2 2" />
      <line x1="6" y1="24" x2="42" y2="24" stroke="rgba(234,179,8,0.4)" stroke-width="1" stroke-dasharray="2 2" />
      <circle cx="24" cy="24" r="3" fill="#eab308" fill-opacity="0.6" />
      <text x="24" y="27" text-anchor="middle" font-size="6" fill="#fff" font-weight="bold">+</text>
    </svg>
  </div>
  <style>
    @keyframes cabana-place-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.15); opacity: 0.7; }
    }
  </style>`;
}
