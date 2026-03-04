/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import LayeredMaterial from './LayeredMaterial';
import MaterialUtils from './MaterialUtils';
export default class ShadowLayeredMaterial extends LayeredMaterial {
  constructor(opts) {
    super(opts);
    this._source = opts.source;
    this._shadowMode = opts.shadowMode;
    this.isMeshDistanceMaterial = opts.shadowMode === 'distance';
    this.isMeshDepthMaterial = !this.isMeshDistanceMaterial;
    this.transparent = false;
    this.opacity = 1;
    MaterialUtils.setDefine(this, 'COLOR_RENDER', false);
    MaterialUtils.setDefine(this, 'STITCHING', false);
    switch (this._shadowMode) {
      case 'distance':
        MaterialUtils.setDefine(this, 'DISTANCE_RENDER', true);
        break;
      case 'depth':
        MaterialUtils.setDefine(this, 'DEPTH_RENDER', true);
        break;
    }
  }
  copyElevationParameters() {
    const layer = this._source.getElevationLayer();
    if (layer) {
      const texture = this._source.getElevationTexture();
      if (texture) {
        const offsetScale = this._source.getElevationOffsetScale();
        this.setElevationTexture(layer, {
          texture,
          pitch: offsetScale
        });
      }
    } else {
      this.removeElevationLayer();
    }
  }
  onBeforeRender() {
    this.copyElevationParameters();
  }
}