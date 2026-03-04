/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { Feature } from 'ol';
import type { Color as OLColor } from 'ol/color';
import type { ColorLike } from 'ol/colorlike';
import type { Extent as OLExtent } from 'ol/extent';
import { Color } from 'three';
import type CoordinateSystem from '../core/geographic/CoordinateSystem';
import Extent from '../core/geographic/Extent';
declare function fromOLExtent(extent: OLExtent, coordinateSystem: CoordinateSystem): Extent;
declare function toOLExtent(extent: Extent, margin?: number): OLExtent;
declare function fromOLColor(input: OLColor | ColorLike): {
    color: Color;
    opacity: number;
};
declare function getFeatureExtent(feature: Feature, crs: CoordinateSystem): Extent | undefined;
declare const _default: {
    fromOLExtent: typeof fromOLExtent;
    toOLExtent: typeof toOLExtent;
    fromOLColor: typeof fromOLColor;
    getFeatureExtent: typeof getFeatureExtent;
};
export default _default;
//# sourceMappingURL=OpenLayersUtils.d.ts.map