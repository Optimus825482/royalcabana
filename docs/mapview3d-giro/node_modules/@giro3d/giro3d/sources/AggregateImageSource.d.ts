/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type CoordinateSystem from '../core/geographic/CoordinateSystem';
import type { GetMemoryUsageContext } from '../core/MemoryUsage';
import type { GetImageOptions, ImageResponse } from './ImageSource';
import Extent from '../core/geographic/Extent';
import ImageSource from './ImageSource';
/**
 * An image source that aggregates several sub-sources.
 * The extent of this source is the union of the extent of all sub-sources.
 *
 * Overlapping sources are stacked vertically with the sources toward the end of the array
 * being drawn on top of sources at the beginning of the array.
 *
 * Constraints:
 * - all sub-sources must have the same CRS.
 * - all sub-sources must have the same color space
 * - all sub-sources must have the same flip-Y parameter
 * - all sub-sources must produce textures that have the same datatype (e.g either 8-bit or 32-bit textures, but not both)
 */
export default class AggregateImageSource extends ImageSource {
    readonly isAggregateImageSource: true;
    readonly type: "AggregateImageSource";
    private readonly _sources;
    private readonly _sourceProperties;
    private _cachedExtent;
    constructor(options: {
        /**
         * The sub-sources. The order in which they appear in the array will set their z-index
         * (i.e sources at the end of the array will be displayed on top).
         */
        sources: ImageSource[];
    });
    /**
     * The sources in this source.
     */
    get sources(): Readonly<ImageSource[]>;
    initialize(options: {
        targetProjection: CoordinateSystem;
    }): Promise<void>;
    getCrs(): CoordinateSystem;
    /**
     * Sets the visibility of a sub-source. This will trigger a repaint of the source.
     * @param source - The source to update.
     * @param visible - The new visibility.
     * @throws if the sub-source is not present in this source.
     */
    setSourceVisibility(source: ImageSource, visible: boolean): void;
    /**
     * Returns the union of the extent of all the sub-sources.
     */
    getExtent(): Extent;
    getMemoryUsage(context: GetMemoryUsageContext): void;
    private patchRequest;
    /**
     * Returns true if the extent intersects with any sub-source's extent.
     */
    contains(extent: Extent): boolean;
    /**
     * Disposes all sub-sources.
     */
    dispose(): void;
    /**
     * Patches the response provided by the sub-source with specific per-source properties.
     */
    private patchResponse;
    getImages(options: GetImageOptions): ImageResponse[];
}
//# sourceMappingURL=AggregateImageSource.d.ts.map