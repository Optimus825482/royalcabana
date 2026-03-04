/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Points, type BufferGeometry, type EventDispatcher, type Material, type Object3DEventMap, type Vector2 } from 'three';
import type Disposable from '../../core/Disposable';
import type Extent from '../../core/geographic/Extent';
import type PointCloudMaterial from '../../renderer/PointCloudMaterial';
export interface PointCloudEventMap extends Object3DEventMap {
    'visibility-changed': unknown;
    dispose: unknown;
}
/** Options for constructing {@link PointCloudMesh} */
export interface PointCloudOptions<M extends Material = Material> {
    /** Geometry */
    geometry: BufferGeometry;
    /** Material */
    material: M;
    /** Texture size */
    textureSize: Vector2;
    extent?: Extent;
}
/**
 * A point cloud object with geospatial properties.
 *
 */
declare class PointCloudMesh<M extends PointCloudMaterial = PointCloudMaterial> extends Points<BufferGeometry, M> implements EventDispatcher<PointCloudEventMap>, Disposable {
    readonly isPointCloud: boolean;
    readonly type = "PointCloud";
    extent?: Extent;
    textureSize: Vector2;
    disposed: boolean;
    static isPointCloud(obj: unknown): obj is PointCloudMesh;
    get lod(): number;
    constructor(opts: PointCloudOptions<M>);
    canProcessColorLayer(): boolean;
    getExtent(): Extent;
    dispose(): void;
}
export { PointCloudMesh };
//# sourceMappingURL=PointCloudMesh.d.ts.map