/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import Panel from './Panel';
const modes = ['Hillshade', 'LightBased'];
class MapLightingPanel extends Panel {
  mode = 'Hillshade';

  /**
   * @param options - The options.
   * @param parentGui - Parent GUI
   * @param instance - The instance
   */
  constructor(options, parentGui, instance) {
    super(parentGui, instance, 'Lighting');
    this.mode = modes[options.mode];
    this.addController(options, 'enabled').name('Enabled').onChange(() => this.notify());
    this.addController(this, 'mode', modes).name('Mode').onChange(() => {
      options.mode = modes.indexOf(this.mode);
      this.notify();
    });
    this.addController(options, 'hillshadeIntensity', 0, 10).onChange(() => this.notify());
    this.addController(options, 'zFactor', 0, 10).onChange(() => this.notify());
    this.addController(options, 'hillshadeZenith', 0, 90).onChange(() => this.notify());
    this.addController(options, 'hillshadeAzimuth', 0, 360).onChange(() => this.notify());
    this.addController(options, 'elevationLayersOnly').onChange(() => this.notify());
  }
}
export default MapLightingPanel;