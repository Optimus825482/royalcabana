/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { ColorRepresentation, Material } from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import { Box3, Color } from 'three';
import type ColorimetryOptions from '../core/ColorimetryOptions';
import type Context from '../core/Context';
import type ColorLayer from '../core/layer/ColorLayer';
import type HasLayers from '../core/layer/HasLayers';
import type Layer from '../core/layer/Layer';
import type { LayerNode } from '../core/layer/Layer';
import type Pickable from '../core/picking/Pickable';
import type { PointsPickResult } from '../core/picking/PickPointsAt';
import type PickResult from '../core/picking/PickResult';
import type { Classification, Mode, Mode as PointCloudMaterialMode } from '../renderer/PointCloudMaterial';
import type { EntityPreprocessOptions, EntityUserData } from './Entity';
import type { Entity3DOptions, Entity3DEventMap } from './Entity3D';
import ColorMap from '../core/ColorMap';
import { type GetMemoryUsageContext } from '../core/MemoryUsage';
import { DEFAULT_TILES3D_POINTCLOUD_ATTRIBUTE_MAPPING, type PointCloudBatchTableAttributeMapping, type WellKnown3DTilesPointCloudAttributes } from './3dtiles/PointCloudParameters';
import Entity3D from './Entity3D';
export { DEFAULT_TILES3D_POINTCLOUD_ATTRIBUTE_MAPPING, type PointCloudBatchTableAttributeMapping, type WellKnown3DTilesPointCloudAttributes, };
/**
 * Constructor options for the {@link Tiles3D} entity.
 */
export interface Tiles3DOptions extends Entity3DOptions {
    /**
     * The URL to the root tileset.
     * Might be `undefined` if the URL is provided externally (for example by the `GoogleCloudAuthPlugin`)
     */
    url?: string;
    /**
     * The path to the DRACO library files.
     * @defaultValue `'https://unpkg.com/three@0.${REVISION}.0/examples/jsm/libs/draco/gltf/'`
     */
    dracoDecoderPath?: string;
    /**
     * The path to the KTX2 library files.
     * @defaultValue `'https://unpkg.com/three@0.${REVISION}.0/examples/jsm/libs/basis/'`
     */
    ktx2DecoderPath?: string;
    /**
     * The display mode for point clouds.
     * Note: only applies to point cloud tiles.
     * @defaultValue color
     */
    pointCloudMode?: Mode;
    /**
     * The mapping between well-known attributes of point cloud geometries and attributes in the batch table.
     * @defaultValue {@link DEFAULT_TILES3D_POINTCLOUD_ATTRIBUTE_MAPPING}
     */
    pointCloudAttributeMapping?: PointCloudBatchTableAttributeMapping;
    /**
     * The point size for point clouds.
     * Note: only applies to point cloud tiles.
     * @defaultValue automatic size computation
     */
    pointSize?: number;
    /**
     * The colormap used for point cloud coloring.
     * Note: only applies to point cloud tiles.
     */
    colorMap?: ColorMap;
    /**
     * The error target that drives tile subdivision.
     * @defaultValue 8
     */
    errorTarget?: number;
    /**
     * The classifications for point clouds.
     * Note: only applies to point cloud tiles.
     *
     * @defaultValue {@link ASPRS_CLASSIFICATIONS}
     */
    classifications?: Classification[];
}
export declare function isLayerNode(obj: object): obj is LayerNode;
/**
 * Types of results for picking on {@link Tiles3D}.
 *
 * If Tiles3D uses {@link PointCloudMaterial}, then results will be of {@link PointsPickResult}.
 * Otherwise, they will be of {@link PickResult}.
 */
export type Tiles3DPickResult = PointsPickResult | PickResult;
export interface Tiles3DEventMap extends Entity3DEventMap {
    /** Fires when a layer is added to the entity. */
    'layer-added': {
        layer: Layer;
    };
    /** Fires when a layer is removed from the entity. */
    'layer-removed': {
        layer: Layer;
    };
}
/**
 * Displays a [3D Tiles Tileset](https://www.ogc.org/publications/standard/3dtiles/). This entity
 * uses the [3d-tiles-renderer](https://github.com/NASA-AMMOS/3DTilesRendererJS) package.
 *
 * Note: shadow maps are supported, but require vertex normals on displayed objects, which
 * depends on the data. Many tilesets do not have vertex normals, as they increase the
 * size of the dataset.
 */
export default class Tiles3D<UserData extends EntityUserData = EntityUserData> extends Entity3D<Tiles3DEventMap, UserData> implements Pickable<Tiles3DPickResult>, HasLayers {
    readonly isPickable: true;
    readonly hasLayers: true;
    readonly isTiles3D: true;
    readonly type = "Tiles3D";
    private readonly _debugPlugin;
    private readonly _fetchPlugin;
    private readonly _pointCloudPlugin;
    private readonly _tiles;
    private readonly _ktx2Loader;
    private readonly _debugOptions;
    private readonly _pointCloudParameters;
    private readonly _objectOptions;
    private readonly _listeners;
    private _colorLayer;
    constructor(options?: Tiles3DOptions);
    /**
     * Returns the underlying renderer.
     */
    get tiles(): TilesRenderer;
    onRenderingContextRestored(): void;
    getBoundingBox(): Box3 | null;
    getMemoryUsage(context: GetMemoryUsageContext): void;
    get loading(): boolean;
    get progress(): number;
    private updateObjectOption;
    /**
     * Toggles the `.castShadow` property on objects generated by this entity.
     *
     * Note: shadow maps require normal attributes on objects.
     */
    get castShadow(): boolean;
    set castShadow(v: boolean);
    /**
     * Toggles the `.receiveShadow` property on objects generated by this entity.
     *
     * Note: shadow maps require normal attributes on objects.
     */
    get receiveShadow(): boolean;
    set receiveShadow(v: boolean);
    getLayers(predicate?: (arg0: Layer) => boolean): Layer[];
    forEachLayer(callback: (layer: Layer) => void): void;
    removeColorLayer(): void;
    /**
     * Sets the color layer used to colorize tiles.
     * Note: this feature only works with point cloud tiles.
     */
    setColorLayer(layer: ColorLayer): Promise<void>;
    get layerCount(): number;
    updateOpacity(): void;
    protected preprocess(opts: EntityPreprocessOptions): Promise<void>;
    preUpdate(context: Context): unknown[] | null;
    postUpdate(context: Context): void;
    /**
     * Calculate and set the material opacity, taking into account this entity opacity and the
     * original opacity of the object.
     *
     * @param material - a material belonging to an object of this entity
     */
    protected setMaterialOpacity(material: Material): void;
    private onColorMapUpdated;
    get errorTarget(): number;
    set errorTarget(v: number);
    /**
     * Gets or sets the size of points. Only applies to point cloud tiles.
     */
    get pointSize(): number;
    set pointSize(v: number);
    /**
     * Gets or sets display mode of point clouds. Only applies to point cloud tiles.
     */
    get pointCloudMode(): PointCloudMaterialMode;
    set pointCloudMode(v: PointCloudMaterialMode);
    /**
     * Gets or sets the default color of point clouds. Only applies to point cloud tiles.
     */
    get pointCloudColor(): Color | null;
    set pointCloudColor(v: ColorRepresentation | null);
    /**
     * Gets or sets the point cloud brightness, contrast and saturation. Only applies to point cloud tiles.
     */
    get pointCloudColorimetryOptions(): ColorimetryOptions;
    set pointCloudColorimetryOptions(v: ColorimetryOptions);
    /**
     * Gets the classifications for point clouds. Only applies to point cloud tiles.
     */
    get pointCloudClassifications(): Classification[];
    /**
     * Gets the colormap used for point clouds. Only applies to point cloud tiles.
     */
    get colorMap(): ColorMap;
    private traversePointCloudMaterials;
    private setDebugParam;
    private updateDebugPluginState;
    /**
     * Toggles the display of box volumes.
     */
    get displayBoxBounds(): boolean;
    set displayBoxBounds(v: boolean);
    /**
     * Toggles the display of sphere volumes.
     */
    get displaySphereBounds(): boolean;
    set displaySphereBounds(v: boolean);
    /**
     * Toggles the display of region volumes.
     */
    get displayRegionBounds(): boolean;
    set displayRegionBounds(v: boolean);
    /**
     * Prepares the object so that it can receive a color layer.
     */
    private prepareLayerNode;
    private onTileDisposed;
    private onTileVisibilityChanged;
    private updateMaterial;
    private updateObject;
    private onModelLoaded;
    protected setupMaterial(material: Material): void;
    private updateCameraDistances;
    dispose(): void;
}
//# sourceMappingURL=Tiles3D.d.ts.map