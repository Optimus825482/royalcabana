/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { TypedArray } from 'three';
import type { VectorArray } from '../../core/VectorArray';
import { Vector2Array, Vector3Array } from '../../core/VectorArray';
interface CachedBuffers {
    positionBuffer: Vector3Array;
    normalBuffer: Vector3Array;
    uvBuffer: Vector2Array;
    indexBuffer: TypedArray;
}
export declare enum SkirtSide {
    Top = 0,
    Right = 1,
    Bottom = 2,
    Left = 3
}
export declare function iterateBottomVertices<T extends VectorArray>(array: T, callback: (index: number) => void): void;
export declare function iterateSkirtVertices<T extends VectorArray>(segments: number, array: T, callback: (skirtSide: SkirtSide, topIndex: number, skirtTopIndex: number, skirtBottomIndex: number) => void): void;
export declare function getGridBuffers(segments: number, includeSkirt: boolean): CachedBuffers;
export {};
//# sourceMappingURL=GridBuilder.d.ts.map