/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { DecodeOptions, DecodeResult } from './ImageFormat';
import ImageFormat from './ImageFormat';
/**
 * Decoder for [Mapbox Terrain](https://docs.mapbox.com/data/tilesets/reference/mapbox-terrain-dem-v1/) images.
 */
declare class MapboxTerrainFormat extends ImageFormat {
    readonly isMapboxTerrainFormat: boolean;
    readonly type: "MapboxTerrainFormat";
    private readonly _enableWorkers;
    private readonly _workerConcurrency;
    /**
     * @param options - Decoder options.
     */
    constructor(options?: {
        /**
         * Enables processing raster data in web workers.
         * @defaultValue true
         */
        enableWorkers?: boolean;
        /**
         * The maximum number of workers created by the worker pool.
         * If `undefined`, the maximum number of workers will be allowed.
         * @defaultValue undefined
         */
        workerConcurrency?: number;
    });
    /**
     * Decode a Mapbox Terrain blob into a
     * [DataTexture](https://threejs.org/docs/?q=texture#api/en/textures/DataTexture) containing
     * the elevation data.
     *
     * @param blob - the data to decode
     * @param options - the decoding options
     */
    decode(blob: Blob, options?: DecodeOptions): Promise<DecodeResult>;
    private getHeightValuesUsingWorker;
}
export default MapboxTerrainFormat;
//# sourceMappingURL=MapboxTerrainFormat.d.ts.map