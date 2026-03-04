/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { BufferGeometry, Vector3 } from 'three';
import type Extent from '../../core/geographic/Extent';
import type HeightMap from '../../core/HeightMap';
import type MemoryUsage from '../../core/MemoryUsage';
import type { GetMemoryUsageContext } from '../../core/MemoryUsage';
import type TileGeometry from './TileGeometry';
export declare function toCartesian(lat: number, lon: number, radius: number, target: Vector3): Vector3;
export default class PanoramaTileGeometry extends BufferGeometry implements MemoryUsage, TileGeometry {
    readonly isMemoryUsage: true;
    private readonly _extent;
    private readonly _origin;
    private readonly _radius;
    private _segments;
    get vertexCount(): number;
    get segments(): number;
    set segments(v: number);
    get origin(): Vector3;
    get raycastGeometry(): this;
    constructor(params: {
        extent: Extent;
        segments: number;
        radius: number;
    });
    resetHeights(): void;
    applyHeightMap(_heightMap: HeightMap): {
        min: number;
        max: number;
    };
    getMemoryUsage(context: GetMemoryUsageContext): void;
    private buildBuffers;
}
//# sourceMappingURL=PanoramaTileGeometry.d.ts.map