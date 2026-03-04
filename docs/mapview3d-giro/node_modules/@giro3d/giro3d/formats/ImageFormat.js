/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

/**
 * Base class for image decoders. To implement your own image decoder, subclass this class.
 *
 */
class ImageFormat {
  isImageFormat = true;
  constructor(flipY, dataType) {
    this.isImageFormat = true;
    this.type = 'ImageFormat';
    this.flipY = flipY;
    this.dataType = dataType;
  }

  /**
   * Decodes the blob into a texture.
   *
   * @param blob - The blob to decode.
   * @param options - The decoder options.
   * @returns The decoded texture.
   */
}
export default ImageFormat;