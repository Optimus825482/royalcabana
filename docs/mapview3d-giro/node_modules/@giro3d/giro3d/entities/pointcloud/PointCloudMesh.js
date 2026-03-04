/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Points } from 'three';
import { enablePointCloudPostProcessing } from '../../renderer/RenderPipeline';
import { nonNull } from '../../utils/tsutils';

/** Options for constructing {@link PointCloudMesh} */

/**
 * A point cloud object with geospatial properties.
 *
 */
class PointCloudMesh extends Points {
  isPointCloud = true;
  type = 'PointCloud';
  static isPointCloud(obj) {
    return obj?.isPointCloud;
  }
  get lod() {
    if (PointCloudMesh.isPointCloud(this.parent)) {
      return this.parent.lod + 1;
    } else {
      return 0;
    }
  }
  constructor(opts) {
    super(opts.geometry, opts.material);
    enablePointCloudPostProcessing(this);
    this.extent = opts.extent ?? undefined;
    this.textureSize = opts.textureSize;
    this.disposed = false;
  }
  canProcessColorLayer() {
    return true;
  }
  getExtent() {
    return nonNull(this.extent);
  }
  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    // @ts-expect-error Points does not transmit proper event map to parent
    this.dispatchEvent({
      type: 'dispose'
    });
    this.geometry.dispose();
    this.material.dispose();
  }
}
export { PointCloudMesh };