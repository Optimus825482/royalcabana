/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import TileWMS from 'ol/source/TileWMS';
import TiledImageSource from './TiledImageSource';
/**
 * An image source that is backed by a one or more [WMS](https://en.wikipedia.org/wiki/Web_Map_Service) layer(s).
 * Note: this is a convenient class that simplifies the usage of {@link TiledImageSource}.
 * ```js
 * const source = new WmsSource({
 *      url: 'http://example.com/wms',
 *      projection: 'EPSG:3857',
 *      layer: 'myLayer',
 *      imageFormat: 'image/png',
 * });
 * ```
 */
export default class WmsSource extends TiledImageSource {
  /**
   * Creates a {@link WmsSource} from the specified parameters.
   *
   * @param options - The options.
   */
  constructor(options) {
    super({
      requestPriority: options.requestPriority,
      source: new TileWMS({
        url: options.url,
        projection: options.projection,
        params: {
          ...options.params,
          LAYERS: Array.isArray(options.layer) ? options.layer : [options.layer],
          FORMAT: options.imageFormat
        }
      })
    });
  }

  /**
   * Sets the `TIME` parameter of the tile requests, and refreshes the source.
   * If `date` is undefined, temporal requests are disabled.
   */
  setTime(date) {
    this.source.updateParams({
      TIME: date?.toISOString()
    });
    this.update();
  }
}