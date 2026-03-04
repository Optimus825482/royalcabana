/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { VideoTexture } from 'three';
import type CoordinateSystem from '../core/geographic/CoordinateSystem';
import type Extent from '../core/geographic/Extent';
import type { GetImageOptions, ImageResponse, ImageSourceEvents } from './ImageSource';
import ImageSource from './ImageSource';
/**
 * Options for the {@link VideoSource} constructor.
 */
export interface VideoSourceOptions {
    /**
     * The source of the image. It can be:
     * - a URL to a remote video file,
     * - an `<video>` element,
     * - a THREE.js [`VideoTexture`](https://threejs.org/docs/index.html?q=video#api/en/textures/VideoTexture).
     */
    source: string | HTMLVideoElement | VideoTexture;
    /**
     * The extent of the image.
     */
    extent: Extent;
    /**
     * Should the texture be flipped vertically ? This parameter only applies if
     * {@link VideoSourceOptions.source | source} is a texture.
     */
    flipY?: boolean;
}
export interface VideoSourceEvents extends ImageSourceEvents {
    /**
     * Raised when the remote video has been loaded.
     */
    loaded: unknown;
    /**
     * Raised when the remote video failed to load.
     */
    error: {
        error: Error;
    };
}
/**
 * An {@link ImageSource} that displays a video.
 */
export default class VideoSource extends ImageSource<VideoSourceEvents> {
    readonly isVideoSource: true;
    readonly type: "VideoSource";
    private readonly _extent;
    private readonly _source;
    private readonly _id;
    private _promise;
    private _video;
    private _texture;
    /**
     * Create a {@link VideoSource}.
     * @param options - The options.
     */
    constructor(options: VideoSourceOptions);
    getExtent(): Extent;
    getCrs(): CoordinateSystem;
    /**
     * Gets the `<video>` element that contains the video, or `null` if it is not loaded yet.
     */
    get video(): HTMLVideoElement | null;
    private fetchVideo;
    private loadVideo;
    private loadImage;
    getImages(_options: GetImageOptions): Array<ImageResponse>;
}
//# sourceMappingURL=VideoSource.d.ts.map