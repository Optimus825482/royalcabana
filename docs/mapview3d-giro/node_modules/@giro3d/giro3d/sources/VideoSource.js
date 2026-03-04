/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { MathUtils, VideoTexture } from 'three';
import EmptyTexture from '../renderer/EmptyTexture';
import { nonNull } from '../utils/tsutils';
import ImageSource, { ImageResult } from './ImageSource';

/**
 * Options for the {@link VideoSource} constructor.
 */

/**
 * An {@link ImageSource} that displays a video.
 */
export default class VideoSource extends ImageSource {
  isVideoSource = true;
  type = 'VideoSource';
  _id = MathUtils.generateUUID();
  _video = null;
  _texture = null;

  /**
   * Create a {@link VideoSource}.
   * @param options - The options.
   */
  constructor(options) {
    super({
      colorSpace: 'srgb',
      flipY: typeof options.source === 'string' ? false : options.flipY ?? true,
      synchronous: true,
      is8bit: true
    });
    this._extent = nonNull(options.extent, 'missing extent');
    this._source = nonNull(options.source, 'missing source');
  }
  getExtent() {
    return this._extent;
  }
  getCrs() {
    return this._extent.crs;
  }

  /**
   * Gets the `<video>` element that contains the video, or `null` if it is not loaded yet.
   */
  get video() {
    return this._video;
  }
  async fetchVideo(url) {
    return new Promise(resolve => {
      const element = document.createElement('video');
      element.onerror = err => {
        if (typeof err === 'string') {
          console.error(err);
          this.dispatchEvent({
            type: 'error',
            error: new Error(err)
          });
        } else {
          const msg = `error loading VideoSource at ${url}`;
          console.error(msg);
          this.dispatchEvent({
            type: 'error',
            error: new Error(msg)
          });
        }
        resolve(null);
      };
      element.addEventListener('canplaythrough', () => resolve(new VideoTexture(element)));
      element.crossOrigin = 'anonymous';
      element.src = url;
      element.load();
    });
  }
  async loadVideo() {
    if (typeof this._source === 'string') {
      this._texture = await this.fetchVideo(this._source);
      this._video = this._texture?.image;
    } else if (this._source instanceof HTMLVideoElement) {
      this._texture = new VideoTexture(this._source);
      this._video = this._source;
    } else {
      this._texture = this._source;
      this._video = this._texture.image;
    }
    this.dispatchEvent({
      type: 'loaded'
    });
    const callback = () => {
      // We use a microtask to avoid a stack overflow due to an infinite feedback loop
      // between the layer asking for the images and the video callback.
      queueMicrotask(() => this.update(this._extent));
      this.video?.requestVideoFrameCallback(callback);
    };
    callback();
  }
  loadImage() {
    if (this._promise == null) {
      this._promise = this.loadVideo();
    }
    return new ImageResult({
      id: this._id,
      texture: this._texture ?? new EmptyTexture(),
      extent: this._extent
    });
  }
  getImages() {
    const response = {
      id: this._id,
      request: this.loadImage.bind(this)
    };
    return [response];
  }
}