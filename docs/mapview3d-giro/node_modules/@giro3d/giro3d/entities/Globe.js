/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Box3, Sphere, Vector2, Vector3 } from 'three';
import Coordinates from '../core/geographic/Coordinates';
import CoordinateSystem from '../core/geographic/CoordinateSystem';
import Ellipsoid from '../core/geographic/Ellipsoid';
import Extent from '../core/geographic/Extent';
import { isColorLayer } from '../core/layer/ColorLayer';
import { isElevationLayer } from '../core/layer/ElevationLayer';
import ScreenSpaceError from '../core/ScreenSpaceError';
import { computeDistanceToFitSphere, computeZoomToFitSphere } from '../renderer/View';
import { isOrthographicCamera, isPerspectiveCamera } from '../utils/predicates';
import Map, { defaultMapSubdivisionStrategy } from './Map';
import { MapLightingMode } from './MapLightingOptions';
import EllipsoidTileGeometryBuilder from './tiles/EllipsoidTileGeometryBuilder';
import EllipsoidTileVolume from './tiles/EllipsoidTileVolume';
const tempDims = new Vector2();
const tempWorldPosition = new Vector3();
const tempCameraPosition = new Vector3();
const tmpWGS84Coordinates = new Coordinates(CoordinateSystem.epsg4326, 0, 0);
const horizonSphere = new Sphere();
const boundingSphere = new Sphere();
const tempBox = new Box3();

/**
 * Always allow subdivision up to LOD 4, then use the default map strategy for subsequent LODs.
 */
export const defaultGlobeSubdivisionStrategy = (tile, context) => {
  if (context.entity.extent.equals(Extent.WGS84) && tile.lod < 5) {
    return context.layers.every(layer => !layer.visible ||
    // Terrain is negligible at low LODs.
    isElevationLayer(layer) || isColorLayer(layer) && layer.isLoaded(tile.id));
  }

  // After LOD 5, we have to be much stricter than the Map implementation.
  // We have zero tolerance here because of extreme recursion levels when
  // zooming in close to mountainous areas, due to the fact that we need to
  // have the strictest bounding volumes.
  return defaultMapSubdivisionStrategy(tile, context);
};

/**
 * Options for Globe terrains.
 */

export function computeEllipsoidalImageSize(extent, ellipsoid) {
  const dims = extent.dimensions(tempDims);
  const meridianLength = ellipsoid.getMeridianArcLength(extent.north, extent.south);
  const centerLatitude = extent.center(tmpWGS84Coordinates).latitude;

  // Since the northern edge of the extent has a different size
  // than the southern edge (due to polar distortion), let's select the biggest edge.
  // For south hemisphere extent, the biggest edge is the northern one, and vice-versa.
  const biggestEdgeLatitude = centerLatitude < 0 ? extent.north : extent.south;

  // Let's compute the radius of the parallel at this latitude
  const parallelLength = ellipsoid.getParallelArcLength(biggestEdgeLatitude, dims.width);

  // Contrary to the version in computeImageSize(), we don't need to swap width and height
  // because the meridian length will always be greater or equal to the parallel length.

  const baseSize = 512;
  return new Vector2(Math.round(baseSize * (parallelLength / meridianLength)), baseSize);
}

// Note: we disable the extent because it would not make a lot of sense to have
// sections of globes. However, this would be relatively simple to enable in the future
// if someone asks for this feature.
/**
 * Constructor options for the {@link Globe} entity.
 */

/**
 * Displays a Globe.
 *
 * The API is mostly identical to the {@link Map} entity.
 *
 * The globe uses the [ECEF reference frame](https://en.wikipedia.org/wiki/Earth-centered,_Earth-fixed_coordinate_system),
 * and the WGS84 spheroid ({@link Ellipsoid.WGS84}) by default.
 *
 * The 3 axes of the 3D scene are the following:
 * - X-axis: the axis that crosses the earth at the (0, 0) geographic position (the intersection
 * between the greenwich meridian and the equator)
 * - Y-axis: the axis that crosses the earth at the (90, 0) geographic position (the intersection
 * between the 90° meridian and the equator).
 * - Z-axis: The rotation axis of the earth (south/north axis).
 */
export default class Globe extends Map {
  isGlobe = true;
  type = 'Globe';
  _enableHorizonCulling = true;
  _horizonDistance = null;

  /**
   * The ellipsoid used to draw this globe.
   */
  get ellipsoid() {
    return this._ellipsoid;
  }

  /**
   * Enables or disable horizon culling.
   * @defaultValue true
   */
  get horizonCulling() {
    return this._enableHorizonCulling;
  }
  set horizonCulling(v) {
    this._enableHorizonCulling = v;
  }
  constructor(options) {
    super({
      subdivisionStrategy: defaultGlobeSubdivisionStrategy,
      ...options,
      extent: Extent.WGS84
    });
    this._ellipsoid = options?.ellipsoid ?? Ellipsoid.WGS84;
  }
  testVisibility(node, context) {
    const frustumVisible = super.testVisibility(node, context);
    let horizonVisible = true;

    // Frustum culling is not sufficient for globe, we also have to cull
    // tiles that are in the frustum but at the other side of the world.
    if (frustumVisible && this.horizonCulling) {
      horizonVisible = this.testHorizonVisibility(node, context);
    }
    return frustumVisible && horizonVisible;
  }
  computeHorizonDistance(camera) {
    if (this._enableHorizonCulling) {
      const cameraPosition = camera.getWorldPosition(tempCameraPosition);
      const horizonDistance = this.ellipsoid.getOpticalHorizon(cameraPosition, this.object3d.getWorldPosition(tempWorldPosition));
      this._horizonDistance = horizonDistance;
    }
  }
  preUpdate(context, changeSources) {
    this.computeHorizonDistance(context.view.camera);
    return super.preUpdate(context, changeSources);
  }
  testHorizonVisibility(node, context) {
    const cameraPosition = context.view.camera.position;
    if (this._horizonDistance != null) {
      horizonSphere.set(cameraPosition, this._horizonDistance);
      if (!horizonSphere.intersectsBox(node.getWorldSpaceBoundingBox(tempBox))) {
        return false;
      }
    }
    return true;
  }
  shouldSubdivide(context, node) {
    if (node.lod >= this.maxSubdivisionLevel) {
      return false;
    }

    // Safety mechanism to avoid subdividing extremely elongated tiles at the poles
    // that would lead to hundred or thousands of tiles displayed simultaneously.
    // Since pixels are extremely stretched in those places, the quality would not be
    // much improved anyway.
    if (node.lod > 3 && (node.extent.north === 90 || node.extent.south === -90)) {
      return false;
    }
    const worldSphere = node.getWorldSpaceBoundingSphere(boundingSphere);
    const geometricError = worldSphere.radius;
    const sse = ScreenSpaceError.computeFromSphere(context.view, worldSphere, geometricError);
    const textureSize = Math.min(node.textureSize.x, node.textureSize.y);
    if (sse / textureSize > this.subdivisionThreshold) {
      return true;
    }
    return false;
  }
  getTextureSize(extent) {
    // Since globe tiles are curved, their extent dimensions is not the same depending
    // on the location of the tile. We must compute a reasonable approximation of
    // the width and height of the extent in meters.
    return computeEllipsoidalImageSize(extent, this._ellipsoid);
  }
  getGeometryBuilder() {
    return new EllipsoidTileGeometryBuilder(this.ellipsoid, this.segments, this.terrain.skirts.enabled ? this.terrain.skirts.depth : null);
  }
  createTileVolume(extent) {
    return new EllipsoidTileVolume({
      extent,
      range: {
        min: -1,
        max: +1
      },
      ellipsoid: this._ellipsoid
    });
  }
  getTileDimensions(extent) {
    // Here again, we have to compute dimensions in meters because degrees
    // are not acceptable for shading purposes: computing derivatives for normal
    // mapping require that all axes have the same units.
    return this._ellipsoid.getExtentDimensions(extent);
  }
  get isEllipsoidal() {
    return true;
  }
  getComposerProjection() {
    return CoordinateSystem.epsg4326;
  }
  getDefaultTerrainOptions() {
    const base = super.getDefaultTerrainOptions();
    return {
      ...base,
      stitching: false
    };
  }
  getDefaultLightingOptions() {
    const base = super.getDefaultLightingOptions();
    return {
      ...base,
      // Hillshade does not work in a non-planar setup
      mode: MapLightingMode.LightBased
    };
  }

  /**
   * Looks at the center of the globe from the [0°, 0°] geographic coordinate.
   */
  getDefaultPointOfView(params) {
    const target = new Vector3(0, 0, 0);
    const radius = Math.max(this._ellipsoid.semiMajorAxis, this._ellipsoid.semiMinorAxis) * 1.4;
    const origin = new Vector3();
    let orthographicZoom = 1;
    if (isPerspectiveCamera(params.camera)) {
      // Let's fit the globe into the camera field of view.
      const distance = computeDistanceToFitSphere(params.camera, radius);
      const up = this.ellipsoid.getNormal(0, 0);
      origin.addScaledVector(up, distance);
    } else if (isOrthographicCamera(params.camera)) {
      origin.set(radius * 2, 0, 0);
      orthographicZoom = computeZoomToFitSphere(params.camera, radius);
    }
    this.object3d.updateMatrixWorld(true);

    // Since the entity could be translated, we have to apply the matrix.
    target.applyMatrix4(this.object3d.matrixWorld);
    origin.applyMatrix4(this.object3d.matrixWorld);
    const result = {
      origin,
      target,
      orthographicZoom
    };
    return Object.freeze(result);
  }
}
export function isGlobe(obj) {
  return obj.isGlobe === true;
}