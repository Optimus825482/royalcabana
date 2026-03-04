/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { ArrowHelper, AxesHelper, Box3, Box3Helper, Color, GridHelper, Mesh, Vector3 } from 'three';
import { isMaterial, isObject } from '../utils/predicates';
import { nonNull } from '../utils/tsutils';
export class SphereHelper extends Mesh {
  isHelper = true;
}
export class BoundingBoxHelper extends Box3Helper {
  isHelper = true;
  isvolumeHelper = true;
}
function hasBoundingBoxHelper(obj) {
  return isObject(obj) && obj.volumeHelper != null;
}
export function hasBoundingVolumeHelper(obj) {
  return obj?.boundingVolumeHelper !== undefined;
}
const _vector = new Vector3();
let _axisSize = 500;

/**
 * @param colorDesc - A THREE color or hex string.
 * @returns The THREE color.
 */
function getColor(colorDesc) {
  if (typeof colorDesc === 'string' || colorDesc instanceof String) {
    return new Color(colorDesc);
  }
  return colorDesc;
}

/**
 * This function creates a Box3 by matching the object's bounding box,
 * without including its children.
 *
 * @param object - The object to expand.
 * @param precise - If true, the computation uses the vertices from the geometry.
 * @returns The expanded box.
 */
function makeLocalBbox(object, precise = false) {
  // The object provides a specific bounding box
  if (object.boundingBox != null) {
    return object.boundingBox;
  }
  const box = new Box3();
  const geometry = object.geometry;
  if (geometry !== undefined) {
    if (precise && geometry.attributes !== undefined && geometry.attributes.position !== undefined) {
      const position = geometry.attributes.position;
      for (let i = 0, l = position.count; i < l; i++) {
        _vector.fromBufferAttribute(position, i);
        box.expandByPoint(_vector);
      }
    } else {
      if (geometry.boundingBox === null) {
        geometry.computeBoundingBox();
      }
      box.copy(nonNull(geometry.boundingBox));
    }
  }
  return box;
}

/**
 * Provides utility functions to create scene helpers, such as bounding boxes, grids, axes...
 *
 */
class Helpers {
  /**
   * Adds a bounding box helper to the object.
   * If a bounding box is already present, it is updated instead.
   *
   * @param obj - The object to decorate.
   * @param color - The color.
   * @example
   * // add a bounding box to 'obj'
   * Helpers.addBoundingBox(obj, 'green');
   */
  static addBoundingBox(obj, color) {
    // Don't add a bounding box helper to a bounding box helper !
    if (obj.isvolumeHelper) {
      return;
    }
    const helper = Helpers.createBoxHelper(makeLocalBbox(obj), getColor(color));
    obj.add(helper);
    obj.volumeHelper = helper;
    helper.updateMatrixWorld(true);
  }
  static createBoxHelper(box, color) {
    const helper = new BoundingBoxHelper(box, color);
    helper.name = 'bounding box';
    if (isMaterial(helper.material)) {
      helper.material.transparent = true;
      helper.material.needsUpdate = true;
    }
    return helper;
  }
  static set axisSize(v) {
    _axisSize = v;
  }
  static get axisSize() {
    return _axisSize;
  }

  /**
   * Creates a selection bounding box helper around the specified object.
   *
   * @param obj - The object to decorate.
   * @param color - The color.
   * @returns the created box helper.
   * @example
   * // add a bounding box to 'obj'
   * Helpers.createSelectionBox(obj, 'green');
   */
  static createSelectionBox(obj, color) {
    const helper = Helpers.createBoxHelper(makeLocalBbox(obj), getColor(color));
    obj.selectionHelper = helper;
    obj.add(helper);
    obj.updateMatrixWorld(true);
    return helper;
  }

  /**
   * Create a grid on the XZ plane.
   *
   * @param origin - The grid origin.
   * @param size - The size of the grid.
   * @param subdivs - The number of grid subdivisions.
   */
  static createGrid(origin, size, subdivs) {
    const grid = new GridHelper(size, subdivs);
    grid.name = 'grid';

    // Rotate the grid to be in the XZ plane.
    grid.rotateX(Math.PI / 2);
    grid.position.copy(origin);
    grid.updateMatrixWorld();
    return grid;
  }

  /**
   * Create an axis helper.
   *
   * @param size - The size of the helper.
   */
  static createAxes(size) {
    const axes = new AxesHelper(size);
    // We want the axes to be always visible,
    // and rendered on top of any other object in the scene.
    axes.renderOrder = 9999;
    axes.material.depthTest = false;
    return axes;
  }

  /**
   * Creates an arrow between the two points.
   *
   * @param start - The starting point.
   * @param end - The end point.
   */
  static createArrow(start, end) {
    const length = start.distanceTo(end);
    const dir = end.sub(start).normalize();
    const arrow = new ArrowHelper(dir, start, length);
    return arrow;
  }

  /**
   * Removes an existing bounding box from the object, if any.
   *
   * @param obj - The object to update.
   * @example
   * Helpers.removeBoundingBox(obj);
   */
  static removeBoundingBox(obj) {
    if (hasBoundingBoxHelper(obj)) {
      const volumeHelper = obj.volumeHelper;
      obj.remove(volumeHelper);
      if ('dispose' in volumeHelper && typeof volumeHelper.dispose === 'function') {
        volumeHelper.dispose();
      }
      // @ts-expect-error cannot remove "mandatory" property
      delete obj.volumeHelper;
    }
  }
}
export default Helpers;