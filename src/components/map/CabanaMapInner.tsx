"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  ImageOverlay,
  Marker,
  CircleMarker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { CabanaWithStatus, CabanaStatus } from "@/types";

// ─── Görsel tanımları ────────────────────────────────────────────────────────

interface ViewDef {
  label: string;
  icon: string;
  src: string;
  width: number;
  height: number;
}

const VIEWS: Record<string, ViewDef> = {
  ust: {
    label: "Üst",
    icon: "🔝",
    src: "/gorsel/ust.webp",
    width: 1472,
    height: 704,
  },
  on: {
    label: "Ön",
    icon: "🏖️",
    src: "/gorsel/on.webp",
    width: 1920,
    height: 544,
  },
  sag: {
    label: "Sağ",
    icon: "➡️",
    src: "/gorsel/sag.webp",
    width: 1056,
    height: 992,
  },
  sol: {
    label: "Sol",
    icon: "⬅️",
    src: "/gorsel/sol.webp",
    width: 1600,
    height: 1098,
  },
  arka: {
    label: "Arka",
    icon: "🔙",
    src: "/gorsel/arka.webp",
    width: 951,
    height: 587,
  },
};

type ViewKey = keyof typeof VIEWS;
const VIEW_KEYS = Object.keys(VIEWS) as ViewKey[];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCabanaColor(cabana: CabanaWithStatus): string {
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

function createCabanaIcon(color: string, selected: boolean): L.DivIcon {
  const size = selected ? 36 : 26;
  const glow = selected ? `0 0 14px ${color}88` : `0 2px 8px rgba(0,0,0,0.5)`;
  const border = selected
    ? "3px solid #fff"
    : `2px solid rgba(255,255,255,0.7)`;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px; height:${size}px;
      border-radius:50%;
      background: radial-gradient(circle at 35% 35%, ${color}ee, ${color}99);
      border:${border};
      box-shadow:${glow};
      cursor:pointer;
      transition: all 0.2s ease;
      display:flex; align-items:center; justify-content:center;
    ">
      <div style="width:${size * 0.3}px; height:${size * 0.3}px; border-radius:50%; background:rgba(255,255,255,0.5);"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createPlacementIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:30px; height:30px;
      border-radius:50%;
      background:rgba(234,179,8,0.6);
      border:3px dashed #eab308;
      box-shadow:0 0 16px rgba(234,179,8,0.4);
      animation: cabana-pulse 1.5s ease-in-out infinite;
    "></div>
    <style>@keyframes cabana-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:0.7}}</style>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// ─── Popup ───────────────────────────────────────────────────────────────────

function CabanaPopupContent({ cabana }: { cabana: CabanaWithStatus }) {
  const color = getCabanaColor(cabana);
  return (
    <div className="min-w-[180px]">
      <h3 className="font-semibold text-base mb-1">{cabana.name}</h3>
      <div className="space-y-1 text-sm">
        {cabana.cabanaClass && (
          <p>
            <span className="text-gray-500">Sınıf:</span>{" "}
            {cabana.cabanaClass.name}
          </p>
        )}
        {cabana.concept && (
          <p>
            <span className="text-gray-500">Konsept:</span>{" "}
            {cabana.concept.name}
          </p>
        )}
        <p>
          <span className="text-gray-500">Durum:</span>{" "}
          <span style={{ color }} className="font-medium">
            {getStatusLabel(cabana)}
          </span>
        </p>
        <p>
          <span className="text-gray-500">Rezervasyon:</span>{" "}
          {cabana.isOpenForReservation ? "Açık" : "Kapalı"}
        </p>
      </div>
    </div>
  );
}

// ─── Draggable Marker ────────────────────────────────────────────────────────

interface DraggableMarkerProps {
  cabana: CabanaWithStatus;
  onLocationUpdate: (cabanaId: string, coordX: number, coordY: number) => void;
  onClick?: (cabana: CabanaWithStatus) => void;
  isSelected: boolean;
}

function DraggableMarker({
  cabana,
  onLocationUpdate,
  onClick,
  isSelected,
}: DraggableMarkerProps) {
  const markerRef = useRef<L.Marker>(null);
  const color = getCabanaColor(cabana);
  const icon = useMemo(
    () => createCabanaIcon(color, isSelected),
    [color, isSelected],
  );

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const pos = marker.getLatLng();
          // CRS.Simple: lat = y, lng = x
          onLocationUpdate(cabana.id, pos.lng, pos.lat);
        }
      },
      click() {
        onClick?.(cabana);
      },
    }),
    [cabana, onLocationUpdate, onClick],
  );

  return (
    <Marker
      ref={markerRef}
      position={[cabana.coordY, cabana.coordX]}
      icon={icon}
      draggable
      eventHandlers={eventHandlers}
    >
      <Popup>
        <CabanaPopupContent cabana={cabana} />
      </Popup>
    </Marker>
  );
}

// ─── Static Marker ───────────────────────────────────────────────────────────

interface StaticMarkerProps {
  cabana: CabanaWithStatus;
  onClick?: (cabana: CabanaWithStatus) => void;
  isSelected: boolean;
}

function StaticMarker({ cabana, onClick, isSelected }: StaticMarkerProps) {
  const color = getCabanaColor(cabana);
  return (
    <CircleMarker
      center={[cabana.coordY, cabana.coordX]}
      radius={isSelected ? 12 : 8}
      pathOptions={{
        color: isSelected ? "#ffffff" : color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: isSelected ? 3 : 2,
      }}
      eventHandlers={{ click: () => onClick?.(cabana) }}
    >
      <Popup>
        <CabanaPopupContent cabana={cabana} />
      </Popup>
    </CircleMarker>
  );
}

// ─── Map Click Handler ───────────────────────────────────────────────────────

function MapClickHandler({
  onMapClick,
}: {
  onMapClick?: (y: number, x: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ─── Placement Preview Marker ────────────────────────────────────────────────

function PlacementMarker({ lat, lng }: { lat: number; lng: number }) {
  const icon = useMemo(() => createPlacementIcon(), []);
  return <Marker position={[lat, lng]} icon={icon} />;
}

// ─── View Change Handler ─────────────────────────────────────────────────────

function FitBoundsOnChange({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { animate: true, duration: 0.3 });
  }, [map, bounds]);
  return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export interface MapComponentProps {
  cabanas: CabanaWithStatus[];
  editable?: boolean;
  onCabanaClick?: (cabana: CabanaWithStatus) => void;
  onLocationUpdate?: (cabanaId: string, coordX: number, coordY: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  selectedCabanaId?: string;
  placementCoords?: { lat: number; lng: number } | null;
}

export default function CabanaMapInner({
  cabanas,
  editable = false,
  onCabanaClick,
  onLocationUpdate,
  onMapClick,
  selectedCabanaId,
  placementCoords,
}: MapComponentProps) {
  const [activeView, setActiveView] = useState<ViewKey>("ust");
  const view = VIEWS[activeView];

  // CRS.Simple bounds: [[0,0], [height, width]]
  const bounds = useMemo<L.LatLngBoundsExpression>(
    () => [
      [0, 0],
      [view.height, view.width],
    ],
    [view],
  );

  const center = useMemo<L.LatLngExpression>(
    () => [view.height / 2, view.width / 2],
    [view],
  );

  const handleLocationUpdate = useCallback(
    (cabanaId: string, coordX: number, coordY: number) => {
      onLocationUpdate?.(cabanaId, coordX, coordY);
    },
    [onLocationUpdate],
  );

  const isTopView = activeView === "ust";

  return (
    <div className="flex flex-col h-full">
      {/* View tabs */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {VIEW_KEYS.map((key) => {
          const v = VIEWS[key];
          return (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                activeView === key
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
              }`}
            >
              {v.icon} {v.label}
            </button>
          );
        })}
        {editable && isTopView && onMapClick && (
          <span className="ml-auto text-xs text-neutral-500 self-center">
            Görsele tıklayarak konum seçin
          </span>
        )}
        {!isTopView && (
          <span className="ml-auto text-xs text-amber-500/70 self-center">
            Yerleştirme sadece Üst görünümde yapılır
          </span>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 rounded-lg overflow-hidden border border-neutral-700 min-h-[280px] md:min-h-[400px]">
        <MapContainer
          crs={L.CRS.Simple}
          center={center}
          zoom={0}
          minZoom={-2}
          maxZoom={3}
          style={{ height: "100%", width: "100%", background: "#111" }}
          attributionControl={false}
          zoomSnap={0.25}
          zoomDelta={0.5}
        >
          <FitBoundsOnChange bounds={bounds} />
          <ImageOverlay url={view.src} bounds={bounds} />

          {isTopView && editable && onMapClick && (
            <MapClickHandler onMapClick={onMapClick} />
          )}

          {isTopView && placementCoords && (
            <PlacementMarker
              lat={placementCoords.lat}
              lng={placementCoords.lng}
            />
          )}

          {isTopView &&
            cabanas.map((cabana) =>
              editable ? (
                <DraggableMarker
                  key={cabana.id}
                  cabana={cabana}
                  onLocationUpdate={handleLocationUpdate}
                  onClick={onCabanaClick}
                  isSelected={cabana.id === selectedCabanaId}
                />
              ) : (
                <StaticMarker
                  key={cabana.id}
                  cabana={cabana}
                  onClick={onCabanaClick}
                  isSelected={cabana.id === selectedCabanaId}
                />
              ),
            )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />{" "}
          Müsait
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />{" "}
          Rezerve
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-500 inline-block" />{" "}
          Kapalı
        </span>
        {editable && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500 border border-dashed border-yellow-400 inline-block" />{" "}
            Yeni konum
          </span>
        )}
      </div>
    </div>
  );
}
