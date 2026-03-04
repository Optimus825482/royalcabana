/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Vector2 } from 'three';
import PanoramaTileGeometry from './PanoramaTileGeometry';
export default class PanoramaTileGeometryBuilder {
  constructor(_radius, _segments) {
    this._radius = _radius;
    this._segments = _segments;
  }
  get rootTileMatrix() {
    // Equirectangular projection with 2 tiles on the Y axis
    // and 4 on the X axis, so that tiles are perfect squares.
    return new Vector2(4, 2);
  }
  build(params) {
    return new PanoramaTileGeometry({
      extent: params.extent,
      radius: this._radius,
      segments: this._segments
    });
  }
}