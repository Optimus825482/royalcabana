/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { Texture, TextureDataType } from 'three';
export interface DecodeOptions {
    /** The texture width. */
    width: number;
    /** The texture height */
    height: number;
    /** The no-data value */
    noDataValue?: number;
}
export interface DecodeResult {
    texture: Texture;
    min?: number;
    max?: number;
}
/**
 * Base class for image decoders. To implement your own image decoder, subclass this class.
 *
 */
declare abstract class ImageFormat {
    readonly isImageFormat: true;
    type: string;
    readonly flipY: boolean;
    readonly dataType: TextureDataType;
    constructor(flipY: boolean, dataType: TextureDataType);
    /**
     * Decodes the blob into a texture.
     *
     * @param blob - The blob to decode.
     * @param options - The decoder options.
     * @returns The decoded texture.
     */
    abstract decode(blob: Blob, options: DecodeOptions): Promise<DecodeResult>;
}
export default ImageFormat;
//# sourceMappingURL=ImageFormat.d.ts.map