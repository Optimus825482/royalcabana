/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { BufferGeometry, Vector3 } from 'three';
import type Ellipsoid from '../../core/geographic/Ellipsoid';
import type Extent from '../../core/geographic/Extent';
import type HeightMap from '../../core/HeightMap';
import type MemoryUsage from '../../core/MemoryUsage';
import type { GetMemoryUsageContext } from '../../core/MemoryUsage';
import type TileGeometry from './TileGeometry';
export default class EllipsoidTileGeometry extends BufferGeometry implements MemoryUsage, TileGeometry {
    readonly isMemoryUsage: true;
    private readonly _extent;
    private readonly _origin;
    private readonly _ellipsoid;
    private readonly _raycastGeometry;
    private _segments;
    private _heightMap;
    private _skirtDepth;
    get vertexCount(): number;
    get segments(): number;
    set segments(v: number);
    get origin(): Vector3;
    get raycastGeometry(): BufferGeometry;
    constructor(params: {
        extent: Extent;
        segments: number;
        ellipsoid: Ellipsoid;
        skirtDepth: number | null;
    });
    resetHeights(): void;
    applyHeightMap(heightMap: HeightMap): {
        min: number;
        max: number;
    };
    getMemoryUsage(context: GetMemoryUsageContext): void;
    private buildBuffers;
}
//# sourceMappingURL=EllipsoidTileGeometry.d.ts.map