/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Vector2 } from 'three';
import EllipsoidTileGeometry from './EllipsoidTileGeometry';
export default class EllipsoidTileGeometryBuilder {
  constructor(ellipsoid, _segments, _skirtDepth) {
    this.ellipsoid = ellipsoid;
    this._segments = _segments;
    this._skirtDepth = _skirtDepth;
  }
  get rootTileMatrix() {
    // Equirectangular projection with 2 tiles on the Y axis
    // and 4 on the X axis, so that tiles are perfect squares.
    return new Vector2(4, 2);
  }
  set segments(v) {
    this._segments = v;
  }
  build(params) {
    return new EllipsoidTileGeometry({
      extent: params.extent,
      ellipsoid: this.ellipsoid,
      segments: this._segments,
      skirtDepth: this._skirtDepth
    });
  }
}