/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { Matrix4 } from 'three';
import { Box3, Sphere, Vector3 } from 'three';
import type ElevationRange from '../../core/ElevationRange';
import type Extent from '../../core/geographic/Extent';
import TileVolume from './TileVolume';
export default class PanoramaTileVolume extends TileVolume {
    private readonly _radius;
    private readonly _extent;
    private _corners;
    get extent(): Readonly<Extent>;
    get radius(): Readonly<number>;
    constructor(options: {
        extent: Extent;
        radius: number;
    });
    getWorldSpaceCorners(matrix: Matrix4, target?: Vector3[]): Vector3[];
    protected computeLocalBox(): Box3;
    setElevationRange(_range: ElevationRange): void;
    getWorldSpaceBoundingSphere(target: Sphere, matrix: Matrix4): Sphere;
}
//# sourceMappingURL=PanoramaTileVolume.d.ts.map