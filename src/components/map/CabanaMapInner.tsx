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
} from "react-leaflet";
import { useRef, useState, useCallback, useMemo } from "react";
import { CabanaWithStatus, CabanaStatus } from "@/types";

const MAP_BOUNDS: L.LatLngBoundsExpression = [
  [0, 0],
  [1000, 1000],
];

const KROKI_TABS = [
  { label: "Ana Kroki", src: "/gorsel/kroki.png" },
  { label: "Görünüm 1", src: "/gorsel/kroki1.png" },
  { label: "Görünüm 2", src: "/gorsel/kroki2.png" },
  { label: "Görünüm 3", src: "/gorsel/kroki3.png" },
];

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

function createCircleIcon(color: string, selected: boolean): L.DivIcon {
  const size = selected ? 28 : 20;
  const border = selected ? `3px solid #ffffff` : `2px solid ${color}`;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${color};
      border:${border};
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      cursor:pointer;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

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
    () => createCircleIcon(color, isSelected),
    [color, isSelected],
  );

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const latlng = marker.getLatLng();
          // CRS.Simple: lat=Y, lng=X
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
      radius={isSelected ? 14 : 10}
      pathOptions={{
        color: isSelected ? "#ffffff" : color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: isSelected ? 3 : 2,
      }}
      eventHandlers={{
        click: () => onClick?.(cabana),
      }}
    >
      <Popup>
        <CabanaPopupContent cabana={cabana} />
      </Popup>
    </CircleMarker>
  );
}

function MapEventHandler() {
  useMapEvents({});
  return null;
}

export interface MapComponentProps {
  cabanas: CabanaWithStatus[];
  editable?: boolean;
  onCabanaClick?: (cabana: CabanaWithStatus) => void;
  onLocationUpdate?: (cabanaId: string, coordX: number, coordY: number) => void;
  selectedCabanaId?: string;
}

export default function CabanaMapInner({
  cabanas,
  editable = false,
  onCabanaClick,
  onLocationUpdate,
  selectedCabanaId,
}: MapComponentProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [krokiErrorTabs, setKrokiErrorTabs] = useState<Set<number>>(new Set());

  const handleKrokiError = useCallback(() => {
    setKrokiErrorTabs((prev) => new Set(prev).add(activeTab));
  }, [activeTab]);

  const handleLocationUpdate = useCallback(
    (cabanaId: string, coordX: number, coordY: number) => {
      onLocationUpdate?.(cabanaId, coordX, coordY);
    },
    [onLocationUpdate],
  );

  const isMainKrokiError = krokiErrorTabs.has(0) && activeTab === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Kroki sekmeleri */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {KROKI_TABS.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === idx
                ? "bg-amber-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.label}
            {krokiErrorTabs.has(idx) && (
              <span className="ml-1 text-red-400">⚠</span>
            )}
          </button>
        ))}
      </div>

      {/* Ana kroki hata mesajı */}
      {isMainKrokiError && (
        <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          Kroki yüklenemedi
        </div>
      )}

      {/* Harita */}
      <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 min-h-[280px] md:min-h-[400px]">
        <MapContainer
          crs={L.CRS.Simple}
          bounds={MAP_BOUNDS}
          style={{ height: "100%", width: "100%", background: "#f3f4f6" }}
          maxBounds={MAP_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={-2}
          maxZoom={4}
        >
          {!krokiErrorTabs.has(activeTab) && (
            <ImageOverlay
              url={KROKI_TABS[activeTab].src}
              bounds={MAP_BOUNDS}
              eventHandlers={{ error: handleKrokiError }}
            />
          )}

          <MapEventHandler />

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

      {/* Renk açıklaması */}
      <div className="flex gap-4 mt-2 text-xs text-gray-600">
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
      </div>
    </div>
  );
}
