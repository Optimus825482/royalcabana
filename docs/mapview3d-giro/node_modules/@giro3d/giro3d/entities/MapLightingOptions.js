/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

export let MapLightingMode = /*#__PURE__*/function (MapLightingMode) {
  /**
   * Use a simplified [hillshade model]((https://earthquake.usgs.gov/education/geologicmaps/hillshades.php)).
   *
   * Note: hillshade model only works for **projected coordinates systems**.
   *
   * Note: hillshading has no effect if the map does not contain an elevation layer.
   */
  MapLightingMode[MapLightingMode["Hillshade"] = 0] = "Hillshade";
  /**
   * Uses THREE.js [lights](https://threejs.org/docs/index.html?q=light#api/en/lights/Light) and [shadows](https://threejs.org/docs/index.html?q=shadow#api/en/lights/shadows/LightShadow) present in the scene.
   */
  MapLightingMode[MapLightingMode["LightBased"] = 1] = "LightBased";
  return MapLightingMode;
}({});

/**
 * Options for map shading.
 */