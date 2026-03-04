/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { ImageResponse } from './ImageSource';
import CoordinateSystem from '../core/geographic/CoordinateSystem';
import Extent from '../core/geographic/Extent';
import ImageSource from './ImageSource';
/**
 * An image source that produces nothing. Mainly for debugging/testing purposes.
 */
declare class NullSource extends ImageSource {
    readonly isNullSource: true;
    readonly type: "NullSource";
    private readonly _extent;
    constructor(options?: {
        extent?: Extent;
    });
    getCrs(): CoordinateSystem;
    getImages(): ImageResponse[];
    getExtent(): Extent;
}
export default NullSource;
//# sourceMappingURL=NullSource.d.ts.map