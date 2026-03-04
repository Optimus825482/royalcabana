/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { ShaderMaterial, type AnyPixelFormat, type IUniform, type Texture, type TextureDataType } from 'three';
import Interpretation, { type InterpretationUniform } from '../../core/layer/Interpretation';
interface NoDataOptions {
    replacementAlpha: number;
    radius: number;
    enabled: boolean;
}
export interface Options {
    texture: Texture;
    interpretation: Interpretation;
    flipY: boolean;
    noDataOptions: NoDataOptions;
    showImageOutlines: boolean;
    showEmptyTexture: boolean;
    transparent: boolean;
    expandRGB: boolean;
    convertRGFloatToRGBAUnsignedByte: {
        precision: number;
        offset: number;
    } | null;
}
type Uniforms = {
    tex: IUniform<Texture | null>;
    gridTexture: IUniform<Texture | null>;
    flipY: IUniform<boolean>;
    showImageOutlines: IUniform<boolean>;
    expandRGB: IUniform<boolean>;
    opacity: IUniform<number>;
    channelCount: IUniform<number>;
    showEmptyTexture: IUniform<boolean>;
    isEmptyTexture: IUniform<boolean>;
    noDataOptions: IUniform<NoDataOptions>;
    interpretation: IUniform<InterpretationUniform>;
    convertRGFloatToRGBAUnsignedByte: IUniform<boolean>;
    heightPrecision: IUniform<number>;
    heightOffset: IUniform<number>;
} & Record<string, IUniform>;
declare class ComposerTileMaterial extends ShaderMaterial {
    readonly isComposerTileMaterial: true;
    dataType?: TextureDataType;
    pixelFormat?: AnyPixelFormat;
    get type(): string;
    readonly uniforms: Uniforms;
    /**
     * Creates an instance of ComposerTileMaterial.
     *
     * @param options - The options
     */
    constructor(options: Options);
    private init;
    private reset;
    /**
     * Acquires a pooled material.
     *
     * @param opts - The options.
     */
    static acquire(opts: Options): ComposerTileMaterial;
    /**
     * Releases the material back into the pool.
     *
     * @param material - The material.
     */
    static release(material: ComposerTileMaterial): void;
}
export declare function isComposerTileMaterial(obj: unknown): obj is ComposerTileMaterial;
export default ComposerTileMaterial;
//# sourceMappingURL=ComposerTileMaterial.d.ts.map