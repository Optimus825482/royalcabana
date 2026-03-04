import { useEffect, useRef } from "react";
import { CubeTextureLoader, Vector3 } from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";

import CoordinateSystem from "@giro3d/giro3d/core/geographic/CoordinateSystem";
import Extent from "@giro3d/giro3d/core/geographic/Extent";
import Instance from "@giro3d/giro3d/core/Instance";
import ColorLayer from "@giro3d/giro3d/core/layer/ColorLayer";
import Tiles3D from "@giro3d/giro3d/entities/Tiles3D";
import { MODE } from "@giro3d/giro3d/renderer/PointCloudMaterial";
import WmtsSource from "@giro3d/giro3d/sources/WmtsSource";

const crs = CoordinateSystem.register(
  "EPSG:2154",
  "+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
);

export default function LidarView() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const instance = new Instance({ target: el, crs });
    const tmpVec3 = new Vector3();

    const controls = new MapControls(instance.view.camera, instance.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.2;
    instance.view.setControls(controls);

    const pointcloud = new Tiles3D({
      url: "https://3d.oslandia.com/lidar_hd/tileset.json",
      errorTarget: 15,
      pointCloudMode: MODE.TEXTURE,
    });

    function initCamera(entity: any) {
      const bbox = entity.getBoundingBox();
      instance.view.camera.far = 2.0 * bbox.getSize(tmpVec3).length();

      const ratio = bbox.getSize(tmpVec3).x / bbox.getSize(tmpVec3).z;
      const position = bbox.min
        .clone()
        .add(bbox.getSize(tmpVec3).multiply(new Vector3(0, 0, ratio * 0.5)));
      const lookAt = bbox.getCenter(tmpVec3);
      lookAt.z = bbox.min.z;

      instance.view.camera.position.set(position.x, position.y, position.z);
      instance.view.camera.lookAt(lookAt);
      controls.target.copy(lookAt);
      controls.saveState();

      // WMTS colorization
      const wmtsUrl =
        "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities";
      WmtsSource.fromCapabilities(wmtsUrl, {
        layer: "HR.ORTHOIMAGERY.ORTHOPHOTOS",
      })
        .then((src) => {
          pointcloud.setColorLayer(
            new ColorLayer({
              name: "color",
              extent: Extent.fromBox3(crs, bbox),
              source: src,
            }),
          );
        })
        .catch(console.error);

      instance.renderingOptions.enableEDL = true;
      instance.renderingOptions.enableInpainting = true;
      instance.renderingOptions.enablePointCloudOcclusion = true;

      instance.notifyChange(instance.view.camera);
    }

    instance.add(pointcloud).then(initCamera);

    // Skybox
    const loader = new CubeTextureLoader();
    loader.setPath(
      "https://giro3d.org/latest/examples/image/skyboxsun25deg_zup/",
    );
    instance.scene.background = loader.load([
      "px.jpg",
      "nx.jpg",
      "py.jpg",
      "ny.jpg",
      "pz.jpg",
      "nz.jpg",
    ]);

    return () => {
      instance.dispose();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
}
