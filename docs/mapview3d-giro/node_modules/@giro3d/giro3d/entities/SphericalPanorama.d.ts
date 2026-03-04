/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { Vector2 } from 'three';
import type HasDefaultPointOfView from '../core/HasDefaultPointOfView';
import type { HeadingPitchRollLike } from '../core/HeadingPitchRoll';
import type Layer from '../core/layer/Layer';
import type { MapOptions } from './Map';
import type { TileGeometryBuilder } from './tiles/TileGeometry';
import type TileVolume from './tiles/TileVolume';
import CoordinateSystem from '../core/geographic/CoordinateSystem';
import Extent from '../core/geographic/Extent';
import Map from './Map';
/**
 * Constructor options for the {@link SphericalPanorama} entity.
 */
export interface SphericalPanoramaOptions extends Omit<MapOptions, 'extent'> {
    /**
     * The radius of the sphere, in scene units.
     * @defaultValue 5
     */
    radius?: number;
}
/**
 * An entity that can display spherical panoramas in an equirectangular projection.
 *
 * ## The equirectangular projection
 *
 * The panoramic image is mapped into a sphere using in the [equirectangular projection](https://en.wikipedia.org/wiki/Equirectangular_projection).
 *
 * The units are the degrees. This is the same projection that is used for the EPSG:4326 coordinate system.
 *
 * In this projection:
 * - the center of the image is at [0, 0]
 * - the top left corner is at [-180, +90],
 * - the top right corner is at [+180, +90],
 * - the bottom right corner is at [+180, -90],
 * - the bottom left corner is at [-180, -90],
 *
 * ### The `'equirectangular'` coordinate system
 *
 * This special coordinate system is used for layers that are added to this entity. It is technically equivalent
 * to the EPSG:4326 system, but since the images projected into the sphere are not georeferenced in an actual
 * cartographic coordinate system, we use this special CRS.
 *
 * All image sources must express extents in this coordinate system.
 *
 * ## How to load panoramic images
 *
 * This entity is a subclass of {@link Map}. To load a panoramic images, you must add it as a {@link core.layer.ColorLayer | ColorLayer} with {@link addLayer}.
 *
 * - For simple images, such as JPG, PNG and WebP, use a {@link sources.StaticImageSource | StaticImageSource}.
 * Note that the image dimensions **cannot exceed WebGL's `MAX_TEXTURE_SIZE`** (4096 pixels),
 * and that the extent of this source must be expressed in the `'equirectangular'`CRS (see note below).
 *
 * - For images that exceed WebGL's `MAX_TEXTURE_SIZE`, you can convert them to
 * GeoTIFF / COG with [GDAL](https://gdal.org/en/stable/programs/gdal_translate.html),
 * in the EPSG:4326 coordinate system and appropriate georeferencing parameters (i.e if the image
 * uses the entire equirectangular projection, its extent would be -180, -90, +180, +90),
 * then load it through a {@link sources.GeoTIFFSource | GeoTIFFSource}.
 * It will be streamed efficiently to save memory and HTTP bandwidth. Again, the CRS of this source must
 * be `'equirectangular'`.
 *
 * - You can also load arbitrary vector features in the `'equirectangular'` coordinate system
 * using a {@link sources.VectorSource | VectorSource}, and they will be positioned accordingly
 * on the surface of the sphere. This can be used for example to digitize geometries from features
 * visible in the panoramic image. If the features are already expressed in the equirectangular projection,
 * no need to mention it in the constructor of the source.
 *
 * ## Orientation of the panorama
 *
 * Panoramic images generally have an orientation expressed in _heading_, _pitch_ and _roll_ (typically in degrees).
 *
 * Use the {@link setOrientation} method to set the orientation of the image for a given coordinate system.
 *
 * ```js
 * panorama.setOrientation({ heading: 56, pitch: -3, roll: 1 });
 * ```
 *
 * In planar coordinate systems, the rotation angles are applied to the local XYZ axes of the entity.
 *
 * In the EPSG:4978 coordinate system, the sphere is first rotated to match the local reference [East, North, Up (ENU) reference frame](https://en.wikipedia.org/wiki/Local_tangent_plane_coordinates)
 * at the coordinate of the center of the sphere, then the angles are applied.
 */
export default class SphericalPanorama extends Map {
    readonly isSphericalPanorama: true;
    readonly type: "SphericalPanorama";
    private readonly _sphere;
    private readonly _radius;
    constructor(params?: SphericalPanoramaOptions);
    protected getGeometryBuilder(): TileGeometryBuilder;
    protected get isEllipsoidal(): boolean;
    protected getComposerProjection(): CoordinateSystem;
    protected getTextureSize(extent: Extent): Vector2;
    protected createTileVolume(extent: Extent): TileVolume;
    addLayer<TLayer extends Layer>(layer: TLayer): Promise<TLayer>;
    /**
     * Returns a point of view that is located at the center of the sphere, and looking at the center of the image.
     *
     * Note: only perspective cameras are supported. Any other camera type will return `null`.
     */
    getDefaultPointOfView(params: Parameters<HasDefaultPointOfView['getDefaultPointOfView']>[0]): ReturnType<HasDefaultPointOfView['getDefaultPointOfView']>;
    /**
     * Sets the orientation of the sphere.
     *
     * Note: this overrides the current orientation of the root object.
     *
     * @param params - The parameters. If undefined, the orientation is reset to the default orientation.
     */
    setOrientation(params?: HeadingPitchRollLike): void;
}
//# sourceMappingURL=SphericalPanorama.d.ts.map