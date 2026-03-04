import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";

import CoordinateSystem from "@giro3d/giro3d/core/geographic/CoordinateSystem";
import Extent from "@giro3d/giro3d/core/geographic/Extent";
import Instance from "@giro3d/giro3d/core/Instance";
import ColorLayer from "@giro3d/giro3d/core/layer/ColorLayer";
import Giro3dMap from "@giro3d/giro3d/entities/Map";
import WmtsSource from "@giro3d/giro3d/sources/WmtsSource";
import { useStore } from "../store/useStore";

// Target: 35.355789, 33.210447 (Girne, North Cyprus)
const TARGET_X = (33.210447 * 20037508.34) / 180;
const TARGET_Y =
  ((Math.log(Math.tan(((90 + 35.355789) * Math.PI) / 360)) / (Math.PI / 180)) *
    20037508.34) /
  180;

const HALF = 10000; // ~10km radius

// Esri World Imagery WMTS (global satellite coverage)
const ESRI_WMTS_URL =
  "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/WMTS/1.0.0/WMTSCapabilities.xml";

export default function LidarCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const setViewMode = useStore((s) => s.setViewMode);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const crs = CoordinateSystem.epsg3857;

    const instance = new Instance({
      target: el,
      crs,
    });

    const extent = new Extent(
      crs,
      TARGET_X - HALF,
      TARGET_X + HALF,
      TARGET_Y - HALF,
      TARGET_Y + HALF,
    );

    const map = new Giro3dMap({
      extent,
      backgroundColor: "gray",
    });
    instance.add(map);

    // Satellite imagery
    WmtsSource.fromCapabilities(ESRI_WMTS_URL, {
      layer: "World_Imagery",
    })
      .then((src) => {
        map.addLayer(
          new ColorLayer({
            name: "satellite",
            extent: map.extent,
            source: src,
          }),
        );
        if (statusRef.current) {
          statusRef.current.textContent = "Uydu görüntüsü yüklendi ✓";
        }
      })
      .catch(console.error);

    // Enable rendering options (will apply when point cloud data is available)
    instance.renderingOptions.enableEDL = true;
    instance.renderingOptions.enableInpainting = true;

    // Camera
    const camHeight = 3000;
    instance.view.camera.position.set(TARGET_X, TARGET_Y - 2000, camHeight);
    const lookAt = new Vector3(TARGET_X, TARGET_Y, 0);
    instance.view.camera.lookAt(lookAt);

    const controls = new MapControls(instance.view.camera, instance.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.2;
    controls.target.copy(lookAt);
    controls.saveState();
    instance.view.setControls(controls);

    if (statusRef.current) {
      statusRef.current.textContent = "Harita yükleniyor...";
    }

    instance.notifyChange();

    return () => {
      instance.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />

      <button
        onClick={() => setViewMode("home")}
        className="absolute top-4 left-4 z-10 bg-neutral-800/90 backdrop-blur text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors"
      >
        ← Ana Menü
      </button>

      <div className="absolute top-4 right-4 z-10 bg-neutral-800/90 backdrop-blur text-white text-xs px-3 py-2 rounded-lg">
        🌐 3D Harita — 35.355789, 33.210447
      </div>

      <div
        ref={statusRef}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-neutral-800/90 backdrop-blur text-neutral-400 text-xs px-4 py-2 rounded-lg"
      />
    </div>
  );
}
