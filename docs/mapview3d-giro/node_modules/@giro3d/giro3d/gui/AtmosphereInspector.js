/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import EntityInspector from './EntityInspector';
export default class AtmosphereInspector extends EntityInspector {
  constructor(parentGui, instance, atmosphere) {
    super(parentGui, instance, atmosphere, {
      boundingBoxColor: false,
      boundingBoxes: false,
      opacity: true,
      visibility: true
    });
    const notify = () => this.notify();
    this.addController(atmosphere.inner, 'visible').name('Inner').onChange(notify);
    this.addController(atmosphere.outer, 'visible').name('Outer').onChange(notify);
    this.addController(atmosphere, 'redWavelength').min(0).max(1);
    this.addController(atmosphere, 'greenWavelength').min(0).max(1);
    this.addController(atmosphere, 'blueWavelength').min(0).max(1);
  }
}