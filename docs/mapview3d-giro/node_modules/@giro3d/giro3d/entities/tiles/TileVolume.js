/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Box3 } from 'three';
import { OBB } from 'three/examples/jsm/Addons.js';
const tmpBox = new Box3();

/**
 * Provides an approximated volume taken by a {@link TileGeometry}
 * used for culling and LOD computation.
 */
export default class TileVolume {
  _localBox = null;
  get localBox() {
    if (!this._localBox) {
      this._localBox = this.computeLocalBox();
    }
    return this._localBox;
  }
  /**
   * Returns the local size of this volume.
   */
  getLocalSize(target) {
    return this.localBox.getSize(target);
  }

  /**
   * Returns the local bounding box.
   */
  getLocalBoundingBox(target) {
    const result = target ?? new Box3();
    result.copy(this.localBox);
    return result;
  }

  /**
   * Gets the world bounding box, taking into account world transformation.
   */
  getWorldSpaceBoundingBox(target, matrix) {
    const result = target ?? new Box3();
    result.copy(this.localBox);
    result.applyMatrix4(matrix);
    return result;
  }

  /**
   * Gets the world-space oriented bounding box of this tile volume.
   */
  getOBB(matrix) {
    return new OBB().fromBox3(this.getWorldSpaceBoundingBox(new Box3(), matrix));
  }
  getWorldSpaceBoundingSphere(target, matrix) {
    return this.getWorldSpaceBoundingBox(tmpBox, matrix).getBoundingSphere(target);
  }
}