"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { useRef, useState, useMemo, useCallback } from "react";
import { CabanaWithStatus, CabanaStatus } from "@/types";

// ─── Tesis merkez koordinatı (değiştirilebilir) ─────────────────────────────
const DEFAULT_CENTER: L.LatLngExpression = [35.355698, 33.210415]; // Merit Royal, Alsancak, Kıbrıs
const DEFAULT_ZOOM = 18;

// ─── Tile Layer kaynakları ───────────────────────────────────────────────────
const TILE_LAYERS = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 22,
  },
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
  },
} as const;

type TileMode = keyof typeof TILE_LAYERS;

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

function createPinIcon(color: string, selected: boolean): L.DivIcon {
  const size = selected ? 32 : 24;
  const shadow = selected
    ? "0 0 12px rgba(255,255,255,0.5)"
    : "0 2px 6px rgba(0,0,0,0.4)";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px; height:${size}px;
      border-radius:50%;
      background:${color};
      border:${selected ? "3px solid #fff" : `2px solid ${color}`};
      box-shadow:${shadow};
      cursor:pointer;
      display:flex; align-items:center; justify-content:center;
    ">
      <div style="width:${size * 0.35}px; height:${size * 0.35}px; border-radius:50%; background:rgba(255,255,255,0.6);"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
    () => createPinIcon(color, isSelected),
    [color, isSelected],
  );

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const latlng = marker.getLatLng();
          // coordX = longitude, coordY = latitude
          onLocationUpdate(cabana.id, latlng.lng, latlng.lat);
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
      draggable={true}
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

// ─── Click-to-Place Handler ──────────────────────────────────────────────────

function MapClickHandler({
  onMapClick,
}: {
  onMapClick?: (lat: number, lng: number) => void;
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
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="
          width:28px; height:28px;
          border-radius:50%;
          background:rgba(234,179,8,0.7);
          border:3px dashed #eab308;
          box-shadow:0 0 12px rgba(234,179,8,0.4);
          animation: pulse 1.5s ease-in-out infinite;
        "></div>
        <style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}</style>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    [],
  );

  return <Marker position={[lat, lng]} icon={icon} />;
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
  const [tileMode, setTileMode] = useState<TileMode>("satellite");
  const tile = TILE_LAYERS[tileMode];

  const handleLocationUpdate = useCallback(
    (cabanaId: string, coordX: number, coordY: number) => {
      onLocationUpdate?.(cabanaId, coordX, coordY);
    },
    [onLocationUpdate],
  );

  // Haritanın merkezi: mevcut cabana'lar varsa ortalarını al, yoksa default
  const center = useMemo<L.LatLngExpression>(() => {
    const valid = cabanas.filter(
      (c) => c.coordY !== 0 && c.coordX !== 0 && Math.abs(c.coordY) <= 90,
    );
    if (valid.length === 0) return DEFAULT_CENTER;
    const avgLat = valid.reduce((s, c) => s + c.coordY, 0) / valid.length;
    const avgLng = valid.reduce((s, c) => s + c.coordX, 0) / valid.length;
    return [avgLat, avgLng];
  }, [cabanas]);

  return (
    <div className="flex flex-col h-full">
      {/* Tile mode toggle */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setTileMode("satellite")}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            tileMode === "satellite"
              ? "bg-amber-600 text-white"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
          }`}
        >
          🛰️ Uydu
        </button>
        <button
          onClick={() => setTileMode("street")}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            tileMode === "street"
              ? "bg-amber-600 text-white"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
          }`}
        >
          🗺️ Harita
        </button>
        {editable && onMapClick && (
          <span className="ml-auto text-xs text-neutral-500 self-center">
            Haritaya tıklayarak konum seçin
          </span>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 rounded-lg overflow-hidden border border-neutral-700 min-h-[280px] md:min-h-[400px]">
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%", background: "#1a1a1a" }}
          minZoom={14}
          maxZoom={22}
        >
          <TileLayer
            key={tileMode}
            url={tile.url}
            attribution={tile.attribution}
            maxZoom={tile.maxZoom}
          />

          {editable && onMapClick && (
            <MapClickHandler onMapClick={onMapClick} />
          )}

          {placementCoords && (
            <PlacementMarker
              lat={placementCoords.lat}
              lng={placementCoords.lng}
            />
          )}

          {cabanas.map((cabana) =>
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
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          Müsait
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          Rezerve
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-500 inline-block" />
          Kapalı
        </span>
        {editable && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500 border border-dashed border-yellow-400 inline-block" />
            Yeni konum
          </span>
        )}
      </div>
    </div>
  );
}
