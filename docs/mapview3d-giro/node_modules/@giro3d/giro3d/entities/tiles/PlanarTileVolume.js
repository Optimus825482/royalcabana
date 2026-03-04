/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Box3, Vector2, Vector3 } from 'three';
import TileVolume from './TileVolume';
const vec2 = new Vector2();
const box = new Box3();
export default class PlanarTileVolume extends TileVolume {
  _range = {
    min: -1,
    max: +1
  };
  get extent() {
    return this._extent;
  }
  constructor(options) {
    super();
    this._extent = options.extent;
    this._range = options.range;
  }
  computeLocalBox() {
    const dims = this._extent.dimensions(vec2);
    const width = dims.x;
    const height = dims.y;
    const min = new Vector3(-width / 2, -height / 2, this._range.min);
    const max = new Vector3(+width / 2, +height / 2, this._range.max);
    return new Box3(min, max);
  }
  getWorldSpaceCorners(matrix) {
    const bbox = this.getWorldSpaceBoundingBox(box, matrix);
    const c0 = new Vector3(bbox.min.x, bbox.min.y, bbox.min.z);
    const c1 = new Vector3(bbox.min.x, bbox.min.y, bbox.max.z);
    const c2 = new Vector3(bbox.max.x, bbox.min.y, bbox.min.z);
    const c3 = new Vector3(bbox.max.x, bbox.min.y, bbox.max.z);
    const c4 = new Vector3(bbox.max.x, bbox.max.y, bbox.min.z);
    const c5 = new Vector3(bbox.max.x, bbox.max.y, bbox.max.z);
    const c6 = new Vector3(bbox.min.x, bbox.max.y, bbox.min.z);
    const c7 = new Vector3(bbox.min.x, bbox.max.y, bbox.max.z);
    return [c0, c1, c2, c3, c4, c5, c6, c7];
  }
  setElevationRange(range) {
    this._range = range;
    this.localBox.min.setZ(range.min);
    this.localBox.max.setZ(range.max);
  }
}