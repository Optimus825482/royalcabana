/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { DecodeOptions, DecodeResult } from './ImageFormat';
import ImageFormat from './ImageFormat';
/**
 * Decoder for TIFF images.
 *
 */
declare class GeoTIFFFormat extends ImageFormat {
    readonly isGeoTIFFFormat: boolean;
    readonly type = "GeoTIFFFormat";
    private readonly _enableWorkers;
    /**
     * @param options - Decoder options.
     */
    constructor(options?: {
        /**
         * Enables processing raster data in web workers.
         * @defaultValue true
         */
        enableWorkers?: boolean;
    });
    /**
     * Decode a tiff blob into a
     * [DataTexture](https://threejs.org/docs/?q=texture#api/en/textures/DataTexture) containing
     * the elevation data.
     *
     * @param blob - the data to decode
     * @param options - the decoding options
     */
    decode(blob: Blob, options?: DecodeOptions): Promise<DecodeResult>;
}
export default GeoTIFFFormat;
//# sourceMappingURL=GeoTIFFFormat.d.ts.map