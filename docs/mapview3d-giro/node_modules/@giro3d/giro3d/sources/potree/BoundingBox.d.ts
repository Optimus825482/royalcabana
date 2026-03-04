/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Box3 } from 'three';
interface BoundingBox {
    lx: number;
    ly: number;
    lz: number;
    ux: number;
    uy: number;
    uz: number;
}
export declare function toBox3(input: BoundingBox): Box3;
export default BoundingBox;
//# sourceMappingURL=BoundingBox.d.ts.map