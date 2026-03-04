/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Mesh, Sphere, Vector2, Vector3, type Box3, type ColorRepresentation, type Intersection, type Object3D, type Object3DEventMap, type Raycaster, type Texture, type WebGLRenderer, type WebGLRenderTarget } from 'three';
import { type OBB } from 'three/examples/jsm/Addons.js';
import type Disposable from '../../core/Disposable';
import type Ellipsoid from '../../core/geographic/Ellipsoid';
import type Extent from '../../core/geographic/Extent';
import type GetElevationOptions from '../../core/GetElevationOptions';
import type ElevationLayer from '../../core/layer/ElevationLayer';
import type Layer from '../../core/layer/Layer';
import type MemoryUsage from '../../core/MemoryUsage';
import type { GetMemoryUsageContext } from '../../core/MemoryUsage';
import type LayeredMaterial from '../../renderer/LayeredMaterial';
import type { MaterialOptions } from '../../renderer/LayeredMaterial';
import type RenderingState from '../../renderer/RenderingState';
import type ShadowLayeredMaterial from '../../renderer/ShadowLayeredMaterial';
import type View from '../../renderer/View';
import type TileCoordinate from './TileCoordinate';
import type TileGeometry from './TileGeometry';
import type { TileGeometryBuilder } from './TileGeometry';
import type { NeighbourList } from './TileIndex';
import type TileVolume from './TileVolume';
import OffsetScale from '../../core/OffsetScale';
export interface TileMeshEventMap extends Object3DEventMap {
    'visibility-changed': unknown;
    dispose: unknown;
}
declare class TileMesh extends Mesh<TileGeometry, LayeredMaterial, TileMeshEventMap> implements Disposable, MemoryUsage {
    readonly isTileMesh: true;
    readonly type: "TileMesh";
    readonly isMemoryUsage: true;
    readonly extent: Extent;
    readonly textureSize: Vector2;
    private _verticalScaling;
    customDepthMaterial: ShadowLayeredMaterial;
    customDistanceMaterial: ShadowLayeredMaterial;
    readonly coordinate: TileCoordinate;
    private readonly _extentDimensions;
    private readonly _geometryBuilder;
    private readonly _volume;
    private readonly _renderer;
    private readonly _onElevationChanged;
    private _heightMap;
    private _enableTerrainDeformation;
    private _tileGeometry;
    private _segments;
    private _skirtDepth;
    private _minmax;
    private _shouldUpdateHeightMap;
    private readonly _helpers;
    private _elevationLayerInfo;
    disposed: boolean;
    isLeaf: boolean;
    getMemoryUsage(context: GetMemoryUsageContext): void;
    get boundingBox(): Box3;
    /**
     * The LOD. Root nodes have LOD 0.
     */
    get lod(): number;
    getOBB(): OBB;
    getWorldSpaceBoundingBox(target: Box3): Box3;
    getWorldSpaceBoundingSphere(target: Sphere): Sphere;
    getBoundingBoxCorners(): Vector3[];
    /**
     * Creates an instance of TileMesh.
     *
     * @param options - Constructor options.
     */
    constructor(params: {
        geometryBuilder: TileGeometryBuilder<TileGeometry>;
        volume: TileVolume;
        /** The tile material. */
        material: LayeredMaterial;
        depthMaterial: ShadowLayeredMaterial;
        distanceMaterial: ShadowLayeredMaterial;
        /** The tile extent. */
        extent: Extent;
        /** The subdivisions. */
        segments: number;
        skirtDepth?: number;
        /** The tile coordinate. */
        coord: TileCoordinate;
        /** The texture size. */
        textureSize: Vector2;
        ellipsoid?: Ellipsoid;
        renderer: WebGLRenderer;
        enableTerrainDeformation: boolean;
        onElevationChanged: (tile: TileMesh) => void;
    });
    onBeforeShadow(): void;
    private updateSkirtParameters;
    setVerticalScaling(scaling: number): void;
    get absolutePosition(): Vector3;
    get showColliderMesh(): boolean;
    set showColliderMesh(visible: boolean);
    private deleteBoundingBoxHelper;
    private deleteBoundingSphereHelper;
    private recreateBoundingBoxHelper;
    private recreateBoundingSphereHelper;
    get showBoundingBox(): boolean;
    set showBoundingBox(show: boolean);
    get showBoundingSphere(): boolean;
    set showBoundingSphere(show: boolean);
    get helperColor(): ColorRepresentation;
    set helperColor(color: ColorRepresentation);
    get segments(): number;
    set segments(v: number);
    private createHelperRootIfNecessary;
    private createGeometry;
    onLayerVisibilityChanged(layer: Layer): void;
    addChildTile(tile: TileMesh): void;
    reorderLayers(): void;
    /**
     * Checks that the given raycaster intersects with this tile's volume.
     */
    private checkRayVolumeIntersection;
    raycast(raycaster: Raycaster, intersects: Intersection[]): void;
    private updateHeightMapIfNecessary;
    /**
     * @param neighbour - The neighbour.
     * @param location - Its location in the neighbour array.
     */
    private processNeighbour;
    /**
     * @param neighbours - The neighbours.
     */
    processNeighbours(neighbours: NeighbourList<TileMesh>): void;
    update(materialOptions: MaterialOptions): void;
    isVisible(): boolean;
    setDisplayed(show: boolean): void;
    /**
     * @param v - The new opacity.
     */
    set opacity(v: number);
    setVisibility(show: boolean): void;
    isDisplayed(): boolean;
    /**
     * Updates the rendering state of the tile's material.
     *
     * @param state - The new rendering state.
     */
    changeState(state: RenderingState): void;
    static applyChangeState(o: Object3D, s: RenderingState): void;
    pushRenderState(state: RenderingState): () => void;
    canProcessColorLayer(): boolean;
    removeElevationTexture(): void;
    setElevationTexture(layer: ElevationLayer, elevation: {
        texture: Texture;
        pitch: OffsetScale;
        min?: number;
        max?: number;
        renderTarget: WebGLRenderTarget;
    }): void;
    getScreenPixelSize(view: View, target?: Vector2): Vector2;
    private createHeightMap;
    private inheritHeightMap;
    private resetHeights;
    private applyHeightMap;
    setBBoxZ(min: number | undefined, max: number | undefined): void;
    traverseTiles(callback: (descendant: TileMesh) => void): void;
    /**
     * Removes the child tiles and returns the detached tiles.
     */
    detachChildren(): TileMesh[];
    private updateVolume;
    get minmax(): {
        min: number;
        max: number;
    };
    getExtent(): Extent;
    getElevation(params: GetElevationOptions): {
        elevation: number;
        resolution: number;
    } | null;
    /**
     * Search for a common ancestor between this tile and another one. It goes
     * through parents on each side until one is found.
     *
     * @param tile - the tile to evaluate
     * @returns the resulting common ancestor
     */
    findCommonAncestor(tile: TileMesh): TileMesh | null;
    isAncestorOf(tile: TileMesh): boolean;
    private forEachMaterial;
    dispose(): void;
}
export declare function isTileMesh(o: unknown): o is TileMesh;
export default TileMesh;
//# sourceMappingURL=TileMesh.d.ts.map