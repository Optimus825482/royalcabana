/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { PNTSScene, Tile } from '3d-tiles-renderer';
import type PointCloudParameters from './PointCloudParameters';
import PointCloudMaterial from '../../renderer/PointCloudMaterial';
export declare function isPNTSScene(obj: object): obj is PNTSScene;
/**
 * A plugin that applies some post-processing to point-based scenes.
 */
export default class PointCloudPlugin {
    private readonly _parameters;
    constructor(parameters: PointCloudParameters);
    private processBufferAttribute;
    updateMaterial(material: PointCloudMaterial): void;
    processTileModel(scene: PNTSScene, tile: Tile): void;
}
//# sourceMappingURL=PointCloudPlugin.d.ts.map