/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Vector2 } from 'three';
import type Context from '../core/Context';
import type HasDefaultPointOfView from '../core/HasDefaultPointOfView';
import type TerrainOptions from '../core/TerrainOptions';
import type { MapSubdivisionStrategy } from './Map';
import type MapLightingOptions from './MapLightingOptions';
import type { TileGeometryBuilder } from './tiles/TileGeometry';
import type TileMesh from './tiles/TileMesh';
import type TileVolume from './tiles/TileVolume';
import CoordinateSystem from '../core/geographic/CoordinateSystem';
import Ellipsoid from '../core/geographic/Ellipsoid';
import Extent from '../core/geographic/Extent';
import Map, { type MapOptions } from './Map';
/**
 * Always allow subdivision up to LOD 4, then use the default map strategy for subsequent LODs.
 */
export declare const defaultGlobeSubdivisionStrategy: MapSubdivisionStrategy;
/**
 * Options for Globe terrains.
 */
export type GlobeTerrainOptions = Omit<TerrainOptions, 'stitching'>;
export declare function computeEllipsoidalImageSize(extent: Extent, ellipsoid: Ellipsoid): Vector2;
/**
 * Constructor options for the {@link Globe} entity.
 */
export interface GlobeOptions extends Omit<MapOptions, 'extent' | 'terrain'> {
    /**
     * Which ellipsoid to use.
     * @defaultValue {@link Ellipsoid.WGS84}
     */
    ellipsoid?: Ellipsoid;
    /**
     * The terrain options.
     */
    terrain?: boolean | Partial<GlobeTerrainOptions>;
}
/**
 * Displays a Globe.
 *
 * The API is mostly identical to the {@link Map} entity.
 *
 * The globe uses the [ECEF reference frame](https://en.wikipedia.org/wiki/Earth-centered,_Earth-fixed_coordinate_system),
 * and the WGS84 spheroid ({@link Ellipsoid.WGS84}) by default.
 *
 * The 3 axes of the 3D scene are the following:
 * - X-axis: the axis that crosses the earth at the (0, 0) geographic position (the intersection
 * between the greenwich meridian and the equator)
 * - Y-axis: the axis that crosses the earth at the (90, 0) geographic position (the intersection
 * between the 90° meridian and the equator).
 * - Z-axis: The rotation axis of the earth (south/north axis).
 */
export default class Globe extends Map {
    readonly isGlobe: true;
    readonly type: string;
    private readonly _ellipsoid;
    private _enableHorizonCulling;
    private _horizonDistance;
    /**
     * The ellipsoid used to draw this globe.
     */
    get ellipsoid(): Ellipsoid;
    /**
     * Enables or disable horizon culling.
     * @defaultValue true
     */
    get horizonCulling(): boolean;
    set horizonCulling(v: boolean);
    constructor(options?: GlobeOptions);
    protected testVisibility(node: TileMesh, context: Context): boolean;
    private computeHorizonDistance;
    preUpdate(context: Context, changeSources: Set<unknown>): TileMesh[];
    protected testHorizonVisibility(node: TileMesh, context: Context): boolean;
    protected shouldSubdivide(context: Context, node: TileMesh): boolean;
    protected getTextureSize(extent: Extent): Vector2;
    protected getGeometryBuilder(): TileGeometryBuilder;
    protected createTileVolume(extent: Extent): TileVolume;
    protected getTileDimensions(extent: Extent): Vector2;
    protected get isEllipsoidal(): boolean;
    protected getComposerProjection(): CoordinateSystem;
    protected getDefaultTerrainOptions(): Readonly<TerrainOptions>;
    protected getDefaultLightingOptions(): Readonly<Required<MapLightingOptions>>;
    /**
     * Looks at the center of the globe from the [0°, 0°] geographic coordinate.
     */
    getDefaultPointOfView(params: Parameters<HasDefaultPointOfView['getDefaultPointOfView']>[0]): ReturnType<HasDefaultPointOfView['getDefaultPointOfView']>;
}
export declare function isGlobe(obj: unknown): obj is Globe;
//# sourceMappingURL=Globe.d.ts.map