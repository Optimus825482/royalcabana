/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { Texture } from 'three';
import ColorMap from '../../core/ColorMap';
export interface ColorMapUniform {
    min: number;
    max: number;
    lut: Texture;
}
export declare function createDefaultColorMap(): ColorMap;
export declare function buildColorMapUniform(colorMap: ColorMap): ColorMapUniform;
//# sourceMappingURL=ColorMapUniform.d.ts.map