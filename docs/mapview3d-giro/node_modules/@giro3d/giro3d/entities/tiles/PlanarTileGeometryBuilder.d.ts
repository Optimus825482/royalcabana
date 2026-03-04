/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Vector2 } from 'three';
import type Extent from '../../core/geographic/Extent';
import type TileCoordinate from './TileCoordinate';
import type { TileGeometryBuilder } from './TileGeometry';
import PlanarTileGeometry from './PlanarTileGeometry';
export declare function selectBestSubdivisions(extent: Extent, maxAspectRatio: number): Vector2;
/**
 * Builds tile in a planar coordinate system.
 */
export default class PlanarTileGeometryBuilder implements TileGeometryBuilder<PlanarTileGeometry> {
    readonly extent: Extent;
    private readonly _rootTileMatrix;
    private readonly _skirtDepth;
    private _segments;
    constructor(params: {
        extent: Extent;
        maxAspectRatio: number;
        segments: number;
        skirtDepth: number | undefined;
    });
    set segments(v: number);
    get rootTileMatrix(): Vector2;
    build(params: {
        tile: TileCoordinate;
        extent: Extent;
    }): PlanarTileGeometry;
}
//# sourceMappingURL=PlanarTileGeometryBuilder.d.ts.map