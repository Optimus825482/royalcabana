/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Box3, BufferAttribute, BufferGeometry, MathUtils, Vector2, Vector3 } from 'three';
import { getGeometryMemoryUsage } from '../../core/MemoryUsage';
import { getGridBuffers } from './GridBuilder';
const tmpVec2 = new Vector2();
const tmpVec3 = new Vector3();
export function toCartesian(lat, lon, radius, target) {
  const phi = MathUtils.degToRad(lat);
  const theta = MathUtils.degToRad(lon + 90);
  const cosPhiRadius = Math.cos(phi) * radius;
  target.x = -(cosPhiRadius * Math.cos(theta));
  target.y = cosPhiRadius * Math.sin(theta);
  target.z = Math.sin(phi) * radius;
  return target;
}
export default class PanoramaTileGeometry extends BufferGeometry {
  isMemoryUsage = true;
  _segments = 8;
  get vertexCount() {
    return this.getAttribute('position').count;
  }
  get segments() {
    return this._segments;
  }
  set segments(v) {
    if (this._segments !== v) {
      this._segments = v;
      this.buildBuffers(this);
    }
  }
  get origin() {
    return this._origin;
  }
  get raycastGeometry() {
    return this;
  }
  constructor(params) {
    super();
    this._segments = params.segments;
    this._extent = params.extent;
    this._radius = params.radius;
    this._origin = toCartesian(this._extent.north, this._extent.west, this._radius, new Vector3());
    if (!this._extent.crs.isEquirectangular()) {
      throw new Error(`invalid CRS. Expected 'equirectangular', got: ${this._extent.crs.id}`);
    }
    this.buildBuffers(this);
  }
  resetHeights() {
    // Nothing to do
  }
  applyHeightMap() {
    // Nothing to do
    return {
      min: 0,
      max: 0
    };
  }
  getMemoryUsage(context) {
    getGeometryMemoryUsage(context, this);
  }
  buildBuffers(geometry) {
    this.dispose();
    const rowVertices = this._segments + 1;
    const dims = this._extent.dimensions(tmpVec2);
    const width = dims.width;
    const height = dims.height;
    const west = this._extent.west;
    const north = this._extent.north;

    // Positions are relative to the origin of the tile
    const origin = this._origin;

    // A shortcut to get ready to use buffers
    const buffers = getGridBuffers(this.segments, false);
    const boundingBox = new Box3().makeEmpty();

    // Those buffers need to be cloned because they are unique per-tile
    const positionBuffer = buffers.positionBuffer.clone();

    // But these one can be reused as they are never modified
    const uvBuffer = buffers.uvBuffer;
    const indexBuffer = buffers.indexBuffer;
    for (let j = 0; j < rowVertices; j++) {
      for (let i = 0; i < rowVertices; i++) {
        const idx = j * rowVertices + i;
        const u = i / this.segments;
        const v = j / this.segments;
        const cartesian = toCartesian(north - v * height, west + u * width, this._radius, tmpVec3);
        const pos = cartesian.sub(origin);
        boundingBox.expandByPoint(pos);
        positionBuffer.set(idx, pos.x, pos.y, pos.z);
      }
    }

    // Per-tile buffers
    geometry.setAttribute('position', new BufferAttribute(positionBuffer.array, 3));

    // Shared buffers
    geometry.setAttribute('uv', new BufferAttribute(uvBuffer.array, 2));
    geometry.setIndex(new BufferAttribute(indexBuffer, 1));
    this.boundingBox = boundingBox;
    this.computeBoundingBox();
  }
}