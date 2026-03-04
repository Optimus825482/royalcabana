/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Color } from 'three';
import ColorMap from '../../core/ColorMap';
export function createDefaultColorMap() {
  const colors = [new Color('black'), new Color('white')];
  return new ColorMap({
    colors,
    min: 0,
    max: 1000
  });
}
export function buildColorMapUniform(colorMap) {
  return {
    min: colorMap.min,
    max: colorMap.max,
    lut: colorMap.getTexture()
  };
}