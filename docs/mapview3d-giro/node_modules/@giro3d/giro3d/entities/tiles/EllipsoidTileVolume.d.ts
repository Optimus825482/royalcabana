/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Box3, Matrix4, type Sphere, Vector3 } from 'three';
import { OBB } from 'three/examples/jsm/Addons.js';
import type ElevationRange from '../../core/ElevationRange';
import type Ellipsoid from '../../core/geographic/Ellipsoid';
import type Extent from '../../core/geographic/Extent';
import TileVolume from './TileVolume';
export default class EllipsoidTileVolume extends TileVolume {
    private readonly _ellipsoid;
    private readonly _extent;
    private _range;
    private _obb;
    private _corners;
    private _max;
    private _min;
    private _origin;
    get extent(): Readonly<Extent>;
    get ellipsoid(): Readonly<Ellipsoid>;
    get origin(): Vector3;
    constructor(options: {
        extent: Extent;
        range: ElevationRange;
        ellipsoid: Ellipsoid;
    });
    getWorldSpaceCorners(matrix?: Matrix4): Vector3[];
    getOBB(): OBB;
    protected computeLocalBox(): Box3;
    setElevationRange(range: ElevationRange): void;
    getWorldSpaceBoundingSphere(target: Sphere): Sphere;
}
//# sourceMappingURL=EllipsoidTileVolume.d.ts.map