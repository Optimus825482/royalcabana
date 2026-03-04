/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { BufferGeometry, Vector3 } from 'three';
import type Extent from '../../core/geographic/Extent';
import type HeightMap from '../../core/HeightMap';
import type MemoryUsage from '../../core/MemoryUsage';
import type TileGeometry from './TileGeometry';
import { type GetMemoryUsageContext } from '../../core/MemoryUsage';
export interface TileGeometryOptions {
    extent: Extent;
    segments: number;
    skirtDepth?: number;
}
/**
 * Geometry for map tiles in a planar coordinate system (where the up axis is the same everywhere).
 */
declare class PlanarTileGeometry extends BufferGeometry implements MemoryUsage, TileGeometry {
    readonly isMemoryUsage: true;
    private readonly _dimensions;
    private _segments;
    private _extent;
    private _heightMap;
    private _origin;
    private _skirtDepth;
    getMemoryUsage(context: GetMemoryUsageContext): void;
    get vertexCount(): number;
    get origin(): Vector3;
    get raycastGeometry(): this;
    /**
     * @param params - Parameters to construct the grid. Should contain an extent
     *  and a size, either a number of segment or a width and an height in pixels.
     */
    constructor(params: TileGeometryOptions);
    get segments(): number;
    set segments(v: number);
    resetHeights(): void;
    applyHeightMap(heightMap: HeightMap): {
        min: number;
        max: number;
    };
    private buildBuffers;
}
export default PlanarTileGeometry;
//# sourceMappingURL=PlanarTileGeometry.d.ts.map