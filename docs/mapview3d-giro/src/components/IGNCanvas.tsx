import { useEffect, useRef } from "react";
import {
  AmbientLight,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  MathUtils,
  Vector3,
} from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";

import CoordinateSystem from "@giro3d/giro3d/core/geographic/CoordinateSystem.js";
import Extent from "@giro3d/giro3d/core/geographic/Extent.js";
import Instance from "@giro3d/giro3d/core/Instance.js";
import ColorLayer from "@giro3d/giro3d/core/layer/ColorLayer.js";
import Giro3dMap from "@giro3d/giro3d/entities/Map.js";
import WmtsSource from "@giro3d/giro3d/sources/WmtsSource.js";
import { useStore } from "../store/useStore";

const SKY_COLOR = new Color(0xf1e9c6);
const DOWN_VECTOR = new Vector3(0, 0, -1);
const EARTH_RADIUS = 6_378_100;

// Target: 35.355789, 33.210447 (Girne, North Cyprus)
// EPSG:3857 Web Mercator coordinates:
const TARGET_X = (33.210447 * 20037508.34) / 180; // ~3,697,420
const TARGET_Y =
  ((Math.log(Math.tan(((90 + 35.355789) * Math.PI) / 360)) / (Math.PI / 180)) *
    20037508.34) /
  180; // ~4,213,000

// Extent around target (~20km radius)
const HALF = 20000;
const EXTENT_XMIN = TARGET_X - HALF;
const EXTENT_XMAX = TARGET_X + HALF;
const EXTENT_YMIN = TARGET_Y - HALF;
const EXTENT_YMAX = TARGET_Y + HALF;

// Esri World Imagery WMTS (global satellite coverage)
const ESRI_WMTS_URL =
  "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/WMTS/1.0.0/WMTSCapabilities.xml";

export default function IGNCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const setViewMode = useStore((s) => s.setViewMode);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const crs = CoordinateSystem.epsg3857;

    const instance = new Instance({
      target: el,
      crs,
      backgroundColor: SKY_COLOR,
    });

    const extent = new Extent(
      crs,
      EXTENT_XMIN,
      EXTENT_XMAX,
      EXTENT_YMIN,
      EXTENT_YMAX,
    );

    const map = new Giro3dMap({
      extent,
      backgroundColor: "gray",
      side: DoubleSide,
    });
    instance.add(map);

    // Satellite imagery from Esri World Imagery (global)
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
      })
      .catch(console.error);

    // Lights
    const sun = new DirectionalLight("#ffffff", 2);
    sun.position.set(1, 0, 1).normalize();
    sun.updateMatrixWorld(true);
    instance.scene.add(sun);

    const sun2 = new DirectionalLight("#ffffff", 0.5);
    sun2.position.set(0, 1, 1);
    sun2.updateMatrixWorld();
    instance.scene.add(sun2);

    instance.scene.add(new AmbientLight(0xffffff, 0.2));

    // Camera — positioned above target looking down at angle
    const camHeight = 5000;
    instance.view.camera.position.set(TARGET_X, TARGET_Y - 3000, camHeight);
    const lookAt = new Vector3(TARGET_X, TARGET_Y, 0);
    instance.view.camera.lookAt(lookAt);

    const controls = new MapControls(instance.view.camera, instance.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.4;
    controls.target.copy(lookAt);
    controls.saveState();
    instance.view.setControls(controls);

    // Fog
    const fog = new Fog(SKY_COLOR, 1, 2);
    instance.scene.fog = fog;
    const tmpVec3 = new Vector3();

    function processFog(camera: any) {
      const tilt = DOWN_VECTOR.angleTo(
        camera.camera.getWorldDirection(tmpVec3),
      );
      const altitude = MathUtils.clamp(camera.camera.position.z, 20, 100000);
      const maxFarPlane = 9_999_999;
      const actualTilt = MathUtils.clamp(tilt, 0, Math.PI / 3);
      const horizon = Math.sqrt(2 * altitude * EARTH_RADIUS) * 0.2;
      camera.maxFarPlane = MathUtils.mapLinear(
        actualTilt,
        0,
        Math.PI / 3,
        maxFarPlane,
        horizon,
      );
      fog.far = camera.far;
      fog.near = MathUtils.lerp(camera.near, camera.far, 0.2);
    }

    instance.addEventListener("after-camera-update", (e: any) =>
      processFog(e.camera),
    );
    processFog(instance.view);

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
        🏙️ 3D Uydu Haritası — 35.355789, 33.210447
      </div>

      <div className="absolute bottom-4 left-4 z-10 bg-neutral-800/90 backdrop-blur text-neutral-400 text-xs px-3 py-2 rounded-lg">
        Esri World Imagery · EPSG:3857
      </div>
    </div>
  );
}
