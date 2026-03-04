/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Texture } from 'three';
export default class EmptyTexture extends Texture {
    readonly isEmptyTexture = true;
    constructor();
}
export declare function isEmptyTexture(obj: unknown): obj is EmptyTexture;
//# sourceMappingURL=EmptyTexture.d.ts.map