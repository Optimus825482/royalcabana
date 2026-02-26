"use client";

import dynamic from "next/dynamic";
import { CabanaWithStatus } from "@/types";

export interface MapComponentProps {
  cabanas: CabanaWithStatus[];
  editable?: boolean;
  onCabanaClick?: (cabana: CabanaWithStatus) => void;
  onLocationUpdate?: (cabanaId: string, coordX: number, coordY: number) => void;
  selectedCabanaId?: string;
}

const CabanaMapInner = dynamic(() => import("./CabanaMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex flex-col items-center gap-2 text-gray-500">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Harita yükleniyor...</span>
      </div>
    </div>
  ),
});

export default function CabanaMap(props: MapComponentProps) {
  return <CabanaMapInner {...props} />;
}
