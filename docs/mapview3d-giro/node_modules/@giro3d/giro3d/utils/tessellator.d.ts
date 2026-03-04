/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
/**
 * Triangulate (or tessellate) the given polygon. Triangulation will work in any plane, contrary
 * to the naive Earcut implementation that does not work if all vertices are located on a vertical plane
 * (since the algorithm works on the XY coordinates).
 */
export declare function triangulate(flatCoordinates: ArrayLike<number>, holeIndices?: ArrayLike<number>): number[];
//# sourceMappingURL=tessellator.d.ts.map