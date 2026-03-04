/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Texture } from 'three';
import type CoordinateSystem from '../core/geographic/CoordinateSystem';
import type Extent from '../core/geographic/Extent';
import type { GridExtent } from '../core/geographic/Extent';
import type { GetImageOptions, ImageResponse, ImageSourceEvents } from './ImageSource';
import ImageSource from './ImageSource';
/**
 * Options for the {@link StaticImageSource} constructor.
 */
export interface StaticImageSourceOptions {
    /**
     * The source of the image. It can be:
     * - a URL to a remote PNG, JPEG or WebP file,
     * - an `<canvas>` or `<image>` element,
     * - a THREE.js [`Texture`](https://threejs.org/docs/index.html?q=texture#api/en/textures/Texture).
     */
    source: string | HTMLImageElement | HTMLCanvasElement | Texture;
    /**
     * The extent of the image.
     */
    extent: Extent;
    /**
     * Should the texture be flipped vertically ? This parameter only applies if
     * {@link StaticImageSourceOptions.source | source} is a texture.
     */
    flipY?: boolean;
}
export interface StaticImageSourceEvents extends ImageSourceEvents {
    /**
     * Raised when the remote image has been loaded.
     */
    loaded: unknown;
    /**
     * Raised when the remote image failed to load.
     */
    error: {
        error: Error;
    };
}
/**
 * An {@link ImageSource} that displays a single, static image.
 *
 * The image must be either a PNG, JPG or WebP file, whose dimensions are not greater
 * than the maximal texture size allowed by WebGL on this browser.
 */
export default class StaticImageSource extends ImageSource<StaticImageSourceEvents> {
    readonly isStaticImageSource: true;
    readonly type: "StaticImageSource";
    private readonly _extent;
    private readonly _source;
    private readonly _id;
    private _promise;
    /**
     * Create a {@link StaticImageSource}.
     * @param options - The options.
     */
    constructor(options: StaticImageSourceOptions);
    getExtent(): Extent;
    getCrs(): CoordinateSystem;
    private fetchTexture;
    private loadImageOnce;
    adjustExtentAndPixelSize(requestExtent: Extent, requestWidth: number, requestHeight: number): GridExtent | null;
    update(): void;
    private loadImage;
    getImages(_options: GetImageOptions): ImageResponse[];
}
//# sourceMappingURL=StaticImageSource.d.ts.map