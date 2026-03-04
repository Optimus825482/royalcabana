/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Box3, MathUtils, Sphere, Vector2, Vector3 } from 'three';
import Coordinates from '../../core/geographic/Coordinates';
import CoordinateSystem from '../../core/geographic/CoordinateSystem';
import { toCartesian } from './PanoramaTileGeometry';
import TileVolume from './TileVolume';
const vec3 = new Vector3();
const vec2 = new Vector2();
const coord = new Coordinates(CoordinateSystem.epsg4326, 0, 0);
const tmpCorners = [];
export default class PanoramaTileVolume extends TileVolume {
  _corners = null;
  get extent() {
    return this._extent;
  }
  get radius() {
    return this._radius;
  }
  constructor(options) {
    super();
    this._extent = options.extent;
    this._radius = options.radius;
  }
  getWorldSpaceCorners(matrix, target) {
    if (this._corners == null) {
      const dims = this._extent.dimensions(vec2);
      const xCount = MathUtils.clamp(Math.round(dims.width / 5) + 1, 2, 6);
      const yCount = MathUtils.clamp(Math.round(dims.height / 5) + 1, 2, 6);
      this._corners = new Array(xCount * yCount);
      let index = 0;
      for (let i = 0; i < xCount; i++) {
        for (let j = 0; j < yCount; j++) {
          const u = i * (1 / (xCount - 1));
          const v = j * (1 / (yCount - 1));
          const {
            latitude,
            longitude
          } = this._extent.sampleUV(u, v, coord);
          const p0 = toCartesian(latitude, longitude, this._radius, new Vector3());
          this._corners[index++] = p0;
        }
      }
    }
    target = target ?? [];
    target.length = this._corners.length;
    for (let i = 0; i < target.length; i++) {
      target[i] = this._corners[i].clone().applyMatrix4(matrix);
    }
    return target;
  }
  computeLocalBox() {
    const extent = this._extent;
    const radius = this._radius;
    const nw = toCartesian(extent.north, extent.west, radius, new Vector3());
    const sw = toCartesian(extent.south, extent.west, radius, new Vector3());
    const se = toCartesian(extent.south, extent.east, radius, new Vector3());
    const ne = toCartesian(extent.north, extent.east, radius, new Vector3());
    const center = extent.center(coord);
    const c = toCartesian(center.latitude, center.longitude, radius, new Vector3());
    const nc = toCartesian(extent.north, center.longitude, radius, new Vector3());
    const cw = toCartesian(center.latitude, extent.west, radius, new Vector3());
    const ce = toCartesian(center.latitude, extent.east, radius, new Vector3());
    const sc = toCartesian(extent.south, center.longitude, radius, new Vector3());
    const worldBox = new Box3().setFromPoints([nw, sw, se, ne, c, nc, cw, ce, sc]);
    return worldBox.setFromCenterAndSize(worldBox.getCenter(vec3).sub(nw), worldBox.getSize(new Vector3()));
  }
  setElevationRange() {
    // Nothing to do
  }
  getWorldSpaceBoundingSphere(target, matrix) {
    target = target ?? new Sphere();
    return target.setFromPoints(this.getWorldSpaceCorners(matrix, tmpCorners));
  }
}