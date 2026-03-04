/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import EntityInspector from './EntityInspector';
export default class GlowInspector extends EntityInspector {
  sunLongitude = 0;
  sunLatitude = 0;
  constructor(parentGui, instance, glow) {
    super(parentGui, instance, glow, {
      boundingBoxColor: false,
      boundingBoxes: false,
      opacity: true,
      visibility: true
    });
    this.addColorController(glow, 'color').name('Color').onChange(v => {
      glow.color = v;
      this.notify(glow);
    });
  }
}