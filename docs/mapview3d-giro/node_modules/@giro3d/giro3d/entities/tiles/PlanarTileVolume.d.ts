/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { Matrix4 } from 'three';
import { Box3, Vector3 } from 'three';
import type ElevationRange from '../../core/ElevationRange';
import type Extent from '../../core/geographic/Extent';
import TileVolume from './TileVolume';
export default class PlanarTileVolume extends TileVolume {
    private readonly _extent;
    private _range;
    get extent(): Readonly<Extent>;
    constructor(options: {
        extent: Extent;
        range: ElevationRange;
    });
    protected computeLocalBox(): Box3;
    getWorldSpaceCorners(matrix: Matrix4): Vector3[];
    setElevationRange(range: ElevationRange): void;
}
//# sourceMappingURL=PlanarTileVolume.d.ts.map