/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { BufferGeometry, LineBasicMaterial, LineSegments, MeshBasicMaterial, Object3D } from 'three';
import type { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { ArrowHelper, AxesHelper, Box3, Box3Helper, Color, GridHelper, Mesh, Vector3 } from 'three';
export declare class SphereHelper extends Mesh<BufferGeometry, MeshBasicMaterial> {
    readonly isHelper = true;
}
export declare class BoundingBoxHelper extends Box3Helper {
    readonly isHelper = true;
    readonly isvolumeHelper = true;
}
interface HasBoundingVolumeHelper extends Object3D {
    boundingVolumeHelper: {
        object3d: SphereHelper | LineSegments<LineSegmentsGeometry | BufferGeometry, LineBasicMaterial> | Mesh<BufferGeometry, MeshBasicMaterial>;
        absolute: boolean;
    };
}
export declare function hasBoundingVolumeHelper(obj: unknown): obj is HasBoundingVolumeHelper;
/**
 * Provides utility functions to create scene helpers, such as bounding boxes, grids, axes...
 *
 */
declare class Helpers {
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
    static addBoundingBox(obj: Object3D, color: Color | string): void;
    static createBoxHelper(box: Box3, color: Color): BoundingBoxHelper;
    static set axisSize(v: number);
    static get axisSize(): number;
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
    static createSelectionBox(obj: Object3D, color: Color): BoundingBoxHelper;
    /**
     * Create a grid on the XZ plane.
     *
     * @param origin - The grid origin.
     * @param size - The size of the grid.
     * @param subdivs - The number of grid subdivisions.
     */
    static createGrid(origin: Vector3, size: number, subdivs: number): GridHelper;
    /**
     * Create an axis helper.
     *
     * @param size - The size of the helper.
     */
    static createAxes(size: number): AxesHelper;
    /**
     * Creates an arrow between the two points.
     *
     * @param start - The starting point.
     * @param end - The end point.
     */
    static createArrow(start: Vector3, end: Vector3): ArrowHelper;
    /**
     * Removes an existing bounding box from the object, if any.
     *
     * @param obj - The object to update.
     * @example
     * Helpers.removeBoundingBox(obj);
     */
    static removeBoundingBox(obj: Object3D): void;
}
export default Helpers;
//# sourceMappingURL=Helpers.d.ts.map