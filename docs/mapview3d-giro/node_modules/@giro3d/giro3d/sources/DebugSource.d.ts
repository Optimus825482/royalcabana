/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Color } from 'three';
import type CoordinateSystem from '../core/geographic/CoordinateSystem';
import type Extent from '../core/geographic/Extent';
import type { GridExtent } from '../core/geographic/Extent';
import type { CustomContainsFn, GetImageOptions, ImageResponse } from './ImageSource';
import ImageSource from './ImageSource';
export default class DebugSource extends ImageSource {
    readonly isDebugSource: boolean;
    readonly type: "DebugSource";
    private readonly _delay;
    private readonly _extent;
    private readonly _opacity;
    private readonly _subdivisions;
    private readonly _color;
    /**
     * @param options - options
     */
    constructor(options: {
        /** The extent. */
        extent: Extent;
        /** The delay before loading the images, in milliseconds. */
        delay?: number | (() => number);
        /** The opacity of the images. */
        opacity?: number;
        /** The color of the images. */
        color?: Color | ((options: GetImageOptions) => Color);
        /** How many images per tile are served. */
        subdivisions?: number;
        /** The custom function to test if a given extent is contained in this source. */
        containsFn?: CustomContainsFn;
    });
    adjustExtentAndPixelSize(requestExtent: Extent, requestWidth: number, requestHeight: number): GridExtent | null;
    private getImage;
    getCrs(): CoordinateSystem;
    getExtent(): Extent;
    getImages(options: GetImageOptions): ImageResponse[];
}
//# sourceMappingURL=DebugSource.d.ts.map