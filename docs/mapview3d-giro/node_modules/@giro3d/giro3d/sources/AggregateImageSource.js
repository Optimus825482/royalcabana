/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { MathUtils } from 'three';
import Extent from '../core/geographic/Extent';
import { nonEmpty, nonNull } from '../utils/tsutils';
import ImageSource from './ImageSource';
/**
 * An image source that aggregates several sub-sources.
 * The extent of this source is the union of the extent of all sub-sources.
 *
 * Overlapping sources are stacked vertically with the sources toward the end of the array
 * being drawn on top of sources at the beginning of the array.
 *
 * Constraints:
 * - all sub-sources must have the same CRS.
 * - all sub-sources must have the same color space
 * - all sub-sources must have the same flip-Y parameter
 * - all sub-sources must produce textures that have the same datatype (e.g either 8-bit or 32-bit textures, but not both)
 */
export default class AggregateImageSource extends ImageSource {
  isAggregateImageSource = true;
  type = 'AggregateImageSource';
  _sourceProperties = new Map();
  _cachedExtent = null;
  constructor(options) {
    super({
      // Since we are stacking images, they must support transparency
      transparent: true,
      flipY: options.sources[0].flipY,
      colorSpace: options.sources[0].colorSpace,
      synchronous: options.sources.every(s => s.synchronous)
    });
    this._sources = Object.freeze(nonEmpty(options.sources, 'at least one source is expected'));
    let zIndex = 0;
    for (const source of this._sources) {
      // Ensure that we bubble the events from the sub-sources
      source.addEventListener('updated', e => this.update(e.extent));
      this._sourceProperties.set(source, {
        zIndex,
        // We must assign a unique ID to each sub-source to avoid duplicate images,
        id: MathUtils.generateUUID(),
        visible: true
      });
      zIndex++;
    }
  }

  /**
   * The sources in this source.
   */
  get sources() {
    return this._sources;
  }
  async initialize(options) {
    const promises = this._sources.map(source => source.initialize(options));
    await Promise.allSettled(promises);
  }
  getCrs() {
    return this._sources[0].getCrs();
  }

  /**
   * Sets the visibility of a sub-source. This will trigger a repaint of the source.
   * @param source - The source to update.
   * @param visible - The new visibility.
   * @throws if the sub-source is not present in this source.
   */
  setSourceVisibility(source, visible) {
    const props = nonNull(this._sourceProperties.get(source), 'this source is not present');
    if (props.visible !== visible) {
      props.visible = visible;
      this.update(this.getExtent());
    }
  }

  /**
   * Returns the union of the extent of all the sub-sources.
   */
  getExtent() {
    if (this._cachedExtent == null) {
      const extents = [...this._sourceProperties.keys()].map(source => source.getExtent());
      const extent = Extent.unionMany(...extents);
      this._cachedExtent = extent;
    }
    return nonNull(this._cachedExtent);
  }
  getMemoryUsage(context) {
    this._sources.forEach(source => source.getMemoryUsage(context));
  }
  patchRequest(source, request) {
    const {
      zIndex,
      id
    } = nonNull(this._sourceProperties.get(source));
    // @ts-expect-error slightly different typing but it should be ok
    return () => {
      const result = request();
      if (result instanceof Promise) {
        return result.then(img => {
          img.zIndex = zIndex;
          img.id = `${img.id}-${id}`;
          return img;
        });
      } else {
        result.zIndex = zIndex;
        result.id = `${result.id}-${id}`;
        return result;
      }
    };
  }

  /**
   * Returns true if the extent intersects with any sub-source's extent.
   */
  contains(extent) {
    const convertedExtent = extent.clone().as(this.getCrs());
    return this._sources.some(source => source.contains(convertedExtent));
  }

  /**
   * Disposes all sub-sources.
   */
  dispose() {
    this._sources.forEach(source => source.dispose());
  }

  /**
   * Patches the response provided by the sub-source with specific per-source properties.
   */
  patchResponse(source, response) {
    const {
      id
    } = nonNull(this._sourceProperties.get(source));
    const result = {
      // Since each sub-source will possibly return the same ID, we have to deduplicate
      // it so that the layer does not think that those are duplicate responses that should be eliminated.
      id: `${response.id}-${id}`,
      request: this.patchRequest(source, response.request)
    };
    return result;
  }
  getImages(options) {
    const result = [];
    for (const source of this._sources) {
      const {
        visible
      } = nonNull(this._sourceProperties.get(source));
      if (!visible) {
        continue;
      }
      if (source.getExtent().intersectsExtent(options.extent) === true) {
        const images = source.getImages(options).map(response => this.patchResponse(source, response));
        result.push(...images);
      }
    }
    return result;
  }
}