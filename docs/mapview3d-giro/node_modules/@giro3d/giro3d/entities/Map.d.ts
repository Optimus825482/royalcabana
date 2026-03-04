/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Color, Raycaster, Vector2, type ColorRepresentation, type Intersection, type Object3D, type Side } from 'three';
import type ColorimetryOptions from '../core/ColorimetryOptions';
import type Context from '../core/Context';
import type ContourLineOptions from '../core/ContourLineOptions';
import type ElevationProvider from '../core/ElevationProvider';
import type ElevationRange from '../core/ElevationRange';
import type CoordinateSystem from '../core/geographic/CoordinateSystem';
import type Extent from '../core/geographic/Extent';
import type GetElevationOptions from '../core/GetElevationOptions';
import type GetElevationResult from '../core/GetElevationResult';
import type GraticuleOptions from '../core/GraticuleOptions';
import type HasDefaultPointOfView from '../core/HasDefaultPointOfView';
import type ColorLayer from '../core/layer/ColorLayer';
import type ElevationLayer from '../core/layer/ElevationLayer';
import type HasLayers from '../core/layer/HasLayers';
import type Layer from '../core/layer/Layer';
import type MemoryUsage from '../core/MemoryUsage';
import type Pickable from '../core/picking/Pickable';
import type PickableFeatures from '../core/picking/PickableFeatures';
import type PickOptions from '../core/picking/PickOptions';
import type TerrainOptions from '../core/TerrainOptions';
import type RenderingState from '../renderer/RenderingState';
import type { EntityUserData } from './Entity';
import type { Entity3DOptions } from './Entity3D';
import type MapLightingOptions from './MapLightingOptions';
import type { TileGeometryBuilder } from './tiles/TileGeometry';
import type TileVolume from './tiles/TileVolume';
import { type GetMemoryUsageContext } from '../core/MemoryUsage';
import { type MapPickResult } from '../core/picking/PickTilesAt';
import Entity3D, { type Entity3DEventMap } from './Entity3D';
import TileIndex from './tiles/TileIndex';
import TileMesh from './tiles/TileMesh';
/**
 * A function that allows subdivision of the specified tile.
 * If the function returns `true`, the node can be subdivided.
 */
export type MapSubdivisionStrategy = (
/**
 * The tile to subdivide.
 */
tile: Readonly<Object3D & {
    /**
     * The level of detail (LOD) of the tile. LOD 0 means the tile is a root tile.
     */
    lod: number;
    /**
     * The geographic extent of the tile.
     */
    extent: Extent;
}>, context: {
    entity: Readonly<Map>;
    layers: readonly Readonly<Layer>[];
}) => boolean;
/**
 * Allows subdivision if:
 * - **if elevation layer present and active and terrain deformation is enabled**: wait for all elevation layers to have finished loading the tile,
 * - otherwise allow subdivision without condition
 */
export declare const defaultMapSubdivisionStrategy: MapSubdivisionStrategy;
/**
 * Allows subdivision if all layers have loaded this node, regardless the type of the layer.
 * This strategy has a greater memory, network and CPU consumption than the default strategy,
 * but can be useful to ensure a smooth rendering of tiles without visible flicker or "jumps".
 */
export declare const allLayersLoadedSubdivisionStrategy: MapSubdivisionStrategy;
/**
 * The default background color of maps.
 */
export declare const DEFAULT_MAP_BACKGROUND_COLOR: ColorRepresentation;
/**
 * The default tile subdivision threshold.
 */
export declare const DEFAULT_SUBDIVISION_THRESHOLD = 1.5;
/**
 * Comparison function to order layers.
 */
export type LayerCompareFn = (a: Layer, b: Layer) => number;
export interface MapEventMap extends Entity3DEventMap {
    /** Fires when a the layer ordering changes. */
    'layer-order-changed': unknown;
    /** Fires when a layer is added to the map. */
    'layer-added': {
        layer: Layer;
    };
    /** Fires when a layer is removed from the map. */
    'layer-removed': {
        layer: Layer;
    };
    /** Fires when elevation data has changed on a specific extent of the map. */
    'elevation-changed': {
        extent: Extent;
    };
    /** Fires when all tiles are painted */
    'paint-complete': unknown;
}
/**
 * Constructor options for the {@link Map} entity.
 */
export interface MapOptions extends Entity3DOptions {
    /**
     * The geographic extent of the map.
     *
     * Note: It must have the same CRS as the instance this map will be added to.
     */
    extent: Extent;
    /**
     * Maximum tile depth of the map. If `undefined`, there is no limit to the subdivision
     * of the map.
     * @defaultValue undefined
     */
    maxSubdivisionLevel?: number;
    /**
     * Lighting and shading parameters.
     * @defaultValue `undefined` (lighting is disabled)
     */
    lighting?: boolean | MapLightingOptions;
    /**
     * Enables contour lines. If `undefined` or `false`, contour lines
     * are not displayed.
     *
     * Note: this option has no effect if the map does not contain an elevation layer.
     * @defaultValue `undefined` (contour lines are disabled)
     */
    contourLines?: boolean | Partial<ContourLineOptions>;
    /**
     * The graticule options.
     * @defaultValue undefined (graticule is disabled).
     */
    graticule?: boolean | Partial<GraticuleOptions>;
    /**
     * The colorimetry for the whole map.
     * Those are distinct from the individual layers' own colorimetry.
     * @defaultValue undefined
     */
    colorimetry?: ColorimetryOptions;
    /**
     * The sidedness of the map surface:
     * - `FrontSide` will only display the "above ground" side of the map (in cartesian maps),
     * or the outer shell of the map (in globe settings).
     * - `BackSide` will only display the "underground" side of the map (in cartesian maps),
     * or the inner shell of the map (in globe settings).
     * - `DoubleSide` will display both sides of the map.
     * @defaultValue `FrontSide`
     */
    side?: Side;
    /**
     * Enable or disable depth testing on materials.
     * @defaultValue true
     */
    depthTest?: boolean;
    /**
     * Options for geometric terrain rendering.
     */
    terrain?: boolean | Partial<TerrainOptions>;
    /**
     * If `true`, parts of the map that relate to no-data elevation
     * values are not displayed. Note: you should only set this value to `true` if
     * an elevation layer is present, otherwise the map will never be displayed.
     * @defaultValue false
     */
    discardNoData?: boolean;
    /**
     * The color of the map when no color layers are present.
     * @defaultValue {@link DEFAULT_MAP_BACKGROUND_COLOR}
     */
    backgroundColor?: ColorRepresentation;
    /**
     * The opacity of the map background.
     * @defaultValue 1 (opaque)
     */
    backgroundOpacity?: number;
    /**
     * Show the map tiles' borders.
     * @defaultValue false
     */
    showOutline?: boolean;
    /**
     * The color of the tile borders.
     * @defaultValue red
     */
    outlineColor?: ColorRepresentation;
    /**
     * The optional elevation range of the map. The map will not be
     * rendered for elevations outside of this range.
     * Note: this feature is only useful if an elevation layer is added to this map.
     * @defaultValue undefined (elevation range is disabled)
     */
    elevationRange?: ElevationRange;
    /**
     * Force using texture atlases even when not required.
     * @defaultValue false
     */
    forceTextureAtlases?: boolean;
    /**
     * The threshold before which a map tile is subdivided.
     * @defaultValue {@link DEFAULT_SUBDIVISION_THRESHOLD}
     */
    subdivisionThreshold?: number;
    /**
     * If `true`, the map will cast shadow.
     * @defaultValue true
     */
    castShadow?: boolean;
    /**
     * If `true`, the map will receive shadow.
     * Note: only available if {@link lighting.mode} is {@link MapLightingMode.LightBased}
     * @defaultValue true
     */
    receiveShadow?: boolean;
    /**
     * The subdivision strategy used to subdivide map tiles.
     * @defaultValue {@link defaultMapSubdivisionStrategy}
     */
    subdivisionStrategy?: MapSubdivisionStrategy;
}
/**
 * A map is an {@link Entity3D} that represents a flat surface displaying one or more {@link core.layer.Layer | layer(s)}.
 *
 * ## Supported layers
 *
 * Maps support various types of layers.
 *
 * ### Color layers
 *
 * Maps can contain any number of {@link core.layer.ColorLayer | color layers}, as well as any number of {@link core.layer.MaskLayer | mask layers}.
 *
 * Color layers are used to display satellite imagery, vector features or any other dataset.
 * Mask layers are used to mask parts of a map (like an alpha channel).
 *
 * ### Elevation layers
 *
 * Up to one elevation layer can be added to a map, to provide features related to elevation, such
 * as terrain deformation, shading, contour lines, etc. Without an elevation layer, the map
 * will appear like a flat rectangle on the specified extent.
 *
 * Note: to benefit from the features given by elevation layers (shading for instance) while keeping
 * a flat map, disable terrain in the {@link TerrainOptions}.
 *
 * 💡 The elevation data can be sampled by the {@link getElevation} method.
 *
 * ## Picking on maps
 *
 * Maps can be picked like any other 3D entity, using the {@link entities.Entity3D#pick | pick()} method.
 *
 * ### GPU-based picking
 *
 * This is the default method for picking maps. When the user calls {@link entities.Entity3D#pick | pick()},
 * the camera's field of view is rendered into a temporary texture, then the pixel(s) around the picked
 * point are analyzed to determine the location of the picked point.
 *
 * The main advantage of this method is that it ignores transparent pixels of the map (such as
 * no-data elevation pixels, or transparent color layers).
 *
 * ### Raycasting-based picking
 *
 * 💡 This method requires that {@link core.picking.PickOptions.gpuPicking} is disabled.
 *
 * This method casts a ray that is then intersected with the map's meshes. The first intersection is
 * returned.
 *
 * The main advantage of this method is that it's much faster and puts less pressure on the GPU.
 *
 * ## Lighting and shadows
 *
 * The Map currently support two lighting modes:
 * - the simplified, hillshade model
 * - the dynamic, light-based model, that uses three.js lights
 *
 * Both modes support casting shadows from the Map (on other objects), but only the light-based
 * mode enables Maps to _receive_ shadows (from itself or other objects).
 *
 * @typeParam UserData - The type of the {@link entities.Entity#userData} property.
 */
declare class Map<UserData extends EntityUserData = EntityUserData> extends Entity3D<MapEventMap, UserData> implements Pickable<MapPickResult>, PickableFeatures<unknown, MapPickResult>, ElevationProvider, HasLayers, MemoryUsage {
    readonly isMap: true;
    readonly type: string;
    readonly hasLayers: true;
    readonly isPickableFeatures: true;
    readonly extent: Extent;
    readonly maxSubdivisionLevel: number;
    private readonly _objectOptions;
    private readonly _layers;
    private readonly _onLayerVisibilityChanged;
    private readonly _onTileElevationChanged;
    private readonly _rootTiles;
    private readonly _allTiles;
    private readonly _tileIndex;
    private readonly _layerIndices;
    private readonly _cachedTraversals;
    private readonly _layerIds;
    private readonly _materialOptions;
    private readonly _subdivisionStrategy;
    private readonly _onNodeComplete;
    private _paintCompleteTimeout;
    private _geometryBuilder;
    private _hasElevationLayer;
    private _elevationScaling;
    private _colorAtlasDataType;
    private _wireframe;
    private _subdivisionThreshold;
    getMemoryUsage(context: GetMemoryUsageContext): void;
    /**
     * Constructs a Map object.
     *
     * @param options - Constructor options.
     */
    constructor(options: MapOptions);
    get tileIndex(): Readonly<TileIndex<TileMesh>>;
    /**
     * Gets the tiles at the root of the hierarchy (i.e LOD 0).
     */
    get rootTiles(): Readonly<TileMesh[]>;
    /**
     * Returns `true` if this map is currently processing data.
     */
    get loading(): boolean;
    private onNodeComplete;
    private evaluatePaintComplete;
    /**
     * Gets the loading progress (between 0 and 1) of the map. This is the average progress of all
     * layers in this map.
     * Note: if no layer is present, this will always be 1.
     * Note: This value is only meaningful is {@link loading} is `true`.
     */
    get progress(): number;
    /**
     * Gets or sets depth testing on materials.
     */
    get depthTest(): boolean;
    set depthTest(v: boolean);
    /**
     * Gets or sets the background opacity.
     */
    get backgroundOpacity(): number;
    set backgroundOpacity(opacity: number);
    /**
     * Gets or sets the terrain options.
     */
    get terrain(): Required<TerrainOptions>;
    set terrain(terrain: TerrainOptions);
    /**
     * The global factor that drives SSE (screen space error) computation. The lower this value, the
     * sooner a tile is subdivided. Note: changing this scale to a value less than 1 can drastically
     * increase the number of tiles displayed in the scene, and can even lead to WebGL crashes.
     *
     * @defaultValue {@link DEFAULT_SUBDIVISION_THRESHOLD}
     */
    get subdivisionThreshold(): number;
    set subdivisionThreshold(v: number);
    /**
     * Gets or sets the sidedness of the map surface:
     * - `FrontSide` will only display the "above ground" side of the map (in cartesian maps),
     * or the outer shell of the map (in globe settings).
     * - `BackSide` will only display the "underground" side of the map (in cartesian maps),
     * or the inner shell of the map (in globe settings).
     * - `DoubleSide` will display both sides of the map.
     * @defaultValue `FrontSide`
     */
    get side(): Side;
    set side(newSide: Side);
    /**
     * Toggles discard no-data pixels.
     */
    get discardNoData(): boolean;
    set discardNoData(opacity: boolean);
    /**
     * Gets or sets the background color.
     */
    get backgroundColor(): Color;
    set backgroundColor(c: ColorRepresentation);
    /**
     * Gets or sets graticule options.
     */
    get graticule(): Required<GraticuleOptions>;
    set graticule(opts: GraticuleOptions);
    private updateObject;
    private updateObjectOption;
    /**
     * Toggles the `.castShadow` property on objects generated by this entity.
     */
    get castShadow(): boolean;
    set castShadow(v: boolean);
    /**
     * Toggles the `.receiveShadow` property on objects generated by this entity.
     *
     * Note that map tiles will receive shadows only if {@link lighting} mode is set to {@link MapLightingMode.LightBased}.
     */
    get receiveShadow(): boolean;
    set receiveShadow(v: boolean);
    /**
     * Gets or sets lighting options.
     */
    get lighting(): Required<MapLightingOptions>;
    set lighting(opts: MapLightingOptions);
    /**
     * Gets or sets colorimetry options.
     */
    get colorimetry(): Required<ColorimetryOptions>;
    set colorimetry(opts: ColorimetryOptions);
    /**
     * Gets or sets elevation range.
     */
    get elevationRange(): ElevationRange | null;
    set elevationRange(range: ElevationRange | null);
    /**
     * Shows tile outlines.
     */
    get showTileOutlines(): boolean;
    set showTileOutlines(show: boolean);
    /**
     * Gets or sets tile outline color.
     */
    get tileOutlineColor(): Color;
    set tileOutlineColor(color: ColorRepresentation);
    /**
     * Gets or sets contour line options.
     */
    get contourLines(): Required<ContourLineOptions>;
    set contourLines(opts: ContourLineOptions);
    /**
     * Shows volumes of tiles.
     */
    get showBoundingBoxes(): boolean;
    set showBoundingBoxes(show: boolean);
    /**
     * Shows volumes of tiles.
     */
    get showBoundingSpheres(): boolean;
    set showBoundingSpheres(show: boolean);
    /**
     * Shows volumes of tiles.
     */
    get helperColor(): ColorRepresentation;
    set helperColor(color: ColorRepresentation);
    /**
     * Shows meshes used for raycasting purposes.
     */
    get showColliderMeshes(): boolean;
    set showColliderMeshes(show: boolean);
    get segments(): number;
    set segments(v: number);
    /**
     * Displays the map tiles in wireframe.
     */
    get wireframe(): boolean;
    set wireframe(v: boolean);
    private subdivideNode;
    private updateGeometries;
    /**
     * Gets the number of vertical and horizontal subdivisions for the root tile matrix.
     */
    protected getRootTileMatrix(): {
        x: number;
        y: number;
    };
    preprocess(): Promise<void>;
    /**
     * Compute the best image size for tiles, taking into account the extent ratio.
     * In other words, rectangular tiles will have more pixels in their longest side.
     *
     * @param extent - The tile extent.
     */
    protected getTextureSize(extent: Extent): Vector2;
    protected getTileDimensions(extent: Extent): Vector2;
    protected get isEllipsoidal(): boolean;
    protected getComposerProjection(): CoordinateSystem;
    protected getGeometryBuilder(): TileGeometryBuilder;
    private requestNewTile;
    protected createTileVolume(extent: Extent): TileVolume;
    private onTileElevationChanged;
    /**
     * Sets the render state of the map.
     *
     * @internal
     * @param state - The new state.
     * @returns The function to revert to the previous state.
     */
    setRenderState(state: RenderingState): () => void;
    pick(coordinates: Vector2, options?: PickOptions): MapPickResult[];
    private raycastAtCoordinate;
    protected getDefaultTerrainOptions(): Readonly<TerrainOptions>;
    protected getDefaultLightingOptions(): Readonly<Required<MapLightingOptions>>;
    private pickUsingRaycast;
    /**
     * Perform raycasting on visible tiles.
     * @param raycaster - The THREE raycaster.
     * @param intersects  - The intersections array to populate with intersections.
     */
    raycast(raycaster: Raycaster, intersects: Intersection<TileMesh>[]): void;
    pickFeaturesFrom(pickedResult: MapPickResult, options?: PickOptions): unknown[];
    preUpdate(context: Context, changeSources: Set<unknown>): TileMesh[];
    /**
     * Sort the color layers according to the comparator function.
     *
     * @param compareFn - The comparator function.
     */
    sortColorLayers(compareFn: LayerCompareFn): void;
    /**
     * Moves the layer closer to the foreground.
     *
     * Note: this only applies to color layers.
     *
     * @param layer - The layer to move.
     * @throws If the layer is not present in the map.
     * @example
     * map.addLayer(foo);
     * map.addLayer(bar);
     * map.addLayer(baz);
     * // Layers (back to front) : foo, bar, baz
     *
     * map.moveLayerUp(foo);
     * // Layers (back to front) : bar, foo, baz
     */
    moveLayerUp(layer: ColorLayer): void;
    onRenderingContextRestored(): void;
    /**
     * Moves the specified layer after the other layer in the list.
     *
     * @param layer - The layer to move.
     * @param target - The target layer. If `null`, then the layer is put at the
     * beginning of the layer list.
     * @throws If the layer is not present in the map.
     * @example
     * map.addLayer(foo);
     * map.addLayer(bar);
     * map.addLayer(baz);
     * // Layers (back to front) : foo, bar, baz
     *
     * map.insertLayerAfter(foo, baz);
     * // Layers (back to front) : bar, baz, foo
     */
    insertLayerAfter(layer: ColorLayer, target: ColorLayer | null): void;
    /**
     * Moves the layer closer to the background.
     *
     * Note: this only applies to color layers.
     *
     * @param layer - The layer to move.
     * @throws If the layer is not present in the map.
     * @example
     * map.addLayer(foo);
     * map.addLayer(bar);
     * map.addLayer(baz);
     * // Layers (back to front) : foo, bar, baz
     *
     * map.moveLayerDown(baz);
     * // Layers (back to front) : foo, baz, bar
     */
    moveLayerDown(layer: ColorLayer): void;
    /**
     * Returns the position of the layer in the layer list, or -1 if it is not found.
     *
     * @param layer - The layer to search.
     * @returns The index of the layer.
     */
    getIndex(layer: Layer): number;
    private reorderLayers;
    contains(obj: unknown): boolean;
    update(context: Context, node: TileMesh): TileMesh[] | undefined;
    protected testVisibility(node: TileMesh, context: Context): boolean;
    postUpdate(context: Context): void;
    private registerColorLayer;
    private updateGlobalMinMax;
    private registerColorMap;
    /**
     * Adds a layer, then returns the created layer.
     * Before using this method, make sure that the map is added in an instance.
     * If the extent or the projection of the layer is not provided,
     * those values will be inherited from the map.
     *
     * @param layer - the layer to add
     * @returns a promise resolving when the layer is ready
     */
    addLayer<TLayer extends Layer>(layer: TLayer): Promise<TLayer>;
    private onLayerVisibilityChanged;
    /**
     * Removes a layer from the map.
     *
     * @param layer - the layer to remove
     * @param options - The options.
     * @returns `true` if the layer was present, `false` otherwise.
     */
    removeLayer(layer: Layer, options?: {
        /** If `true`, the layer is also disposed. */
        disposeLayer?: boolean;
    }): boolean;
    get layerCount(): number;
    forEachLayer(callback: (layer: Layer) => void): void;
    /**
     * Gets all layers that satisfy the filter predicate.
     *
     * @param predicate - the optional predicate.
     * @returns the layers that matched the predicate or all layers if no predicate was provided.
     */
    getLayers(predicate?: (arg0: Layer) => boolean): Layer[];
    /**
     * Gets all color layers in this map.
     *
     * @returns the color layers
     */
    getColorLayers(): ColorLayer[];
    /**
     * Gets all elevation layers in this map.
     *
     * @returns the elevation layers
     */
    getElevationLayers(): ElevationLayer[];
    /**
     * Disposes this map and associated unmanaged resources.
     *
     * Note: By default, layers in this map are not automatically disposed, except when
     * `disposeLayers` is `true`.
     *
     * @param options - Options.
     * @param options -.disposeLayers If true, layers are also disposed.
     */
    dispose(options?: {
        disposeLayers?: boolean;
    }): void;
    private disposeTile;
    /**
     * Gets the elevation range of visible tiles, or `null` if no tile is visible.
     *
     * If there are no elevation layers on this map, returns `null` as well.
     */
    getElevationMinMaxForVisibleTiles(): ElevationRange | null;
    /**
     * Returns the minimal and maximal elevation values in this map, in meters.
     *
     * If there is no elevation layer present, returns `{ min: 0, max: 0 }`.
     *
     * @returns The min/max value.
     */
    getElevationMinMax(): ElevationRange;
    /**
     * Sample the elevation at the specified coordinate.
     *
     * Note: this method does nothing if no elevation layer is present on the map, or if the
     * sampling coordinate is not inside the map's extent.
     *
     * Note: sampling might return more than one sample for any given coordinate. You can sort them
     * by {@link entities.ElevationSample.resolution | resolution} to select the best sample for your needs.
     * @param options - The options.
     * @param result - The result object to populate with the samples. If none is provided, a new
     * empty result is created. The existing samples in the array are not removed. Useful to
     * cumulate samples across different maps.
     * @returns The {@link GetElevationResult} containing the updated sample array.
     * If the map has no elevation layer, this array is left untouched.
     */
    getElevation(options: GetElevationOptions, result?: GetElevationResult): GetElevationResult;
    /**
     * Traverses all tiles in the hierarchy of this entity.
     *
     * @param callback - The callback.
     * @param root - The raversal root. If undefined, the traversal starts at the root
     * object of this entity.
     */
    traverseTiles(callback: (arg0: TileMesh) => void, root?: Object3D | undefined): void;
    private testTileSSE;
    protected shouldSubdivide(context: Context, node: TileMesh): boolean;
    private updateMinMaxDistance;
    /**
     * Returns a {@link PointOfView} that looks at the map from the top.
     */
    getDefaultPointOfView(params: Parameters<HasDefaultPointOfView['getDefaultPointOfView']>[0]): ReturnType<HasDefaultPointOfView['getDefaultPointOfView']>;
}
export declare function isMap(o: unknown): o is Map;
export default Map;
//# sourceMappingURL=Map.d.ts.map