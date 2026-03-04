/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { DecodeOptions, DecodeResult } from './ImageFormat';
import ImageFormat from './ImageFormat';
/**
 * Decoder for [BIL](https://desktop.arcgis.com/en/arcmap/10.3/manage-data/raster-and-images/bil-bip-and-bsq-raster-files.htm) images.
 *
 * At the moment, only single band BIL files are supported and it is tested only on IGN elevation
 * WMS and WMTS layers.
 *
 * ```js
 *  // Create an elevation source
 * const source = new WmsSource({
 *     url: 'https://data.geopf.fr/wms-r',
 *     projection: 'EPSG:2154',
 *     layer: 'ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES',
 *     imageFormat: 'image/x-bil;bits=32',
 *     format: new BilFormat(),
 * });
 *
 * const elevationLayer = new ElevationLayer({ source });
 *
 * map.addLayer(elevationLayer);
 *
 * ```
 * [See it in action](/examples/ign-data.html).
 *
 */
declare class BilFormat extends ImageFormat {
    readonly isBilFormat: boolean;
    readonly type: "BilFormat";
    private _enableWorkers;
    private _workerConcurrency;
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
     * Decode a Bil blob into a
     * [DataTexture](https://threejs.org/docs/?q=texture#api/en/textures/DataTexture) containing
     * the elevation data. At the moment only one band BIL is supported.
     *
     * @param blob - the data to decode
     * @param options - the decoding options
     */
    decode(blob: Blob, options: DecodeOptions): Promise<DecodeResult>;
}
export default BilFormat;
//# sourceMappingURL=BilFormat.d.ts.map