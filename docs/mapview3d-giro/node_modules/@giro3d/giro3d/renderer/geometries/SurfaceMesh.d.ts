/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { BufferGeometry, Material } from 'three';
import { Mesh } from 'three';
import type PolygonMesh from './PolygonMesh';
import { type FeatureElevation, type FeatureExtrusionOffset } from '../../core/FeatureTypes';
import { type DefaultUserData, type SimpleGeometryMeshEventMap } from './SimpleGeometryMesh';
export default class SurfaceMesh<UserData extends DefaultUserData = DefaultUserData> extends Mesh<BufferGeometry, Material, SimpleGeometryMeshEventMap> {
    readonly isSurfaceMesh: true;
    readonly type: "SurfaceMesh";
    private _featureOpacity;
    private _styleOpacity;
    userData: Partial<UserData>;
    parent: PolygonMesh<UserData> | null;
    extrusionOffset: FeatureExtrusionOffset | undefined;
    elevation: FeatureElevation | undefined;
    constructor(params: {
        geometry: BufferGeometry;
        material: Material;
        opacity: number;
    });
    set opacity(opacity: number);
    private updateOpacity;
    update(options: {
        material: Material;
        opacity: number;
        renderOrder: number;
    }): void;
    dispose(): void;
}
export declare function isSurfaceMesh<UserData extends DefaultUserData = DefaultUserData>(obj: unknown): obj is SurfaceMesh<UserData>;
//# sourceMappingURL=SurfaceMesh.d.ts.map