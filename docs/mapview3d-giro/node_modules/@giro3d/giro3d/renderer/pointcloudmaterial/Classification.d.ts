/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { ColorRepresentation, Texture } from 'three';
import { Color } from 'three';
/**
 * Parameters for a point cloud classification.
 */
export declare class Classification {
    /**
     * The color of this classification.
     */
    color: Color;
    /**
     * Toggles the visibility of points with this classification.
     */
    visible: boolean;
    constructor(color: ColorRepresentation, visible?: boolean);
    /**
     * Clones this classification.
     * @returns The cloned object.
     */
    clone(): Classification;
}
/**
 * A set of 256 pre-defined classifications following the ASPRS scheme, with pre-defined colors for
 * classifications 0 to 18. The remaining classifications have the default color (#FF8100)
 *
 * See https://www.asprs.org/wp-content/uploads/2010/12/LAS_Specification.pdf
 */
export declare const ASPRS_CLASSIFICATIONS: Classification[];
export declare class ClassificationsTexture {
    static readonly maxCount = 256;
    classifications: Classification[];
    readonly texture: Texture;
    private readonly _array;
    constructor();
    updateUniform(): void;
    dispose(): void;
    private sanitizeClassifications;
}
//# sourceMappingURL=Classification.d.ts.map