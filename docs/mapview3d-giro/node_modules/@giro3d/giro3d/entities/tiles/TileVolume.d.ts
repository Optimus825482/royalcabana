/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Box3, type Matrix4, type Sphere, type Vector3 } from 'three';
import { OBB } from 'three/examples/jsm/Addons.js';
import type ElevationRange from '../../core/ElevationRange';
/**
 * Provides an approximated volume taken by a {@link TileGeometry}
 * used for culling and LOD computation.
 */
export default abstract class TileVolume {
    protected _localBox: Box3 | null;
    get localBox(): Readonly<Box3>;
    abstract getWorldSpaceCorners(matrix: Matrix4): Vector3[];
    protected abstract computeLocalBox(): Box3;
    abstract setElevationRange(range: ElevationRange): void;
    /**
     * Returns the local size of this volume.
     */
    getLocalSize(target: Vector3): Vector3;
    /**
     * Returns the local bounding box.
     */
    getLocalBoundingBox(target?: Box3): Box3;
    /**
     * Gets the world bounding box, taking into account world transformation.
     */
    getWorldSpaceBoundingBox(target: Box3, matrix: Matrix4): Box3;
    /**
     * Gets the world-space oriented bounding box of this tile volume.
     */
    getOBB(matrix: Matrix4): OBB;
    getWorldSpaceBoundingSphere(target: Sphere, matrix: Matrix4): Sphere;
}
//# sourceMappingURL=TileVolume.d.ts.map