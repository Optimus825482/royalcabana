/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { type ColorRepresentation, type Vector2, type Vector3Like } from 'three';
import type Context from '../core/Context';
import type HasDefaultPointOfView from '../core/HasDefaultPointOfView';
import type { HeadingPitchRollLike } from '../core/HeadingPitchRoll';
import type PickOptions from '../core/picking/PickOptions';
import type PickResult from '../core/picking/PickResult';
import type PointOfView from '../core/PointOfView';
import type { EntityUserData } from './Entity';
import type { Entity3DOptions, Entity3DEventMap } from './Entity3D';
import { type GetMemoryUsageContext } from '../core/MemoryUsage';
import Entity3D from './Entity3D';
export interface OrientedImageSource {
    /**
     * The position of the camera, in the same coordinate system as the instance.
     */
    position: Vector3Like;
    /**
     * The orientation of the camera.
     */
    orientation: HeadingPitchRollLike;
    /**
     * Vertical field of view in degrees.
     */
    fov: number;
    /**
     * The aspect ratio of the image, which is width divided by height.
     */
    aspectRatio: number;
    /**
     * The distance from the origin at which the image is displayed.
     * @defaultValue 10
     */
    distance?: number;
    /**
     * The URL of the image. If undefined, the image is not displayed (but the frustum and origin point can still be displayed)
     */
    imageUrl?: string;
}
export interface OrientedImageCollectionSource {
    images: OrientedImageSource[];
}
/**
 * Constructor options for the {@link OrientedImageCollection} entity.
 */
export interface OrientedImageCollectionOptions extends Entity3DOptions {
    /**
     * The OrientedImageCollection source.
     */
    source: OrientedImageCollectionSource;
    /**
     * Location spheres show the location of the camera when an image was taken.
     */
    locationSpheres?: {
        /**
         * Display the location spheres at the origin of each image.
         * @defaultValue true
         */
        visible?: boolean;
        /**
         * The radius of the location spheres, in CRS units.
         * @defaultValue 0.5
         */
        radius?: number;
        /**
         * The color of the location spheres.
         * @defaultValue green
         */
        color?: ColorRepresentation;
    };
    /**
     * Frustums represent the field of view of each images as a view cone.
     */
    frustums?: {
        /**
         * Display the frustum of each image.
         * @defaultValue true
         */
        visible?: boolean;
        /**
         * The color of the camera frustums.
         * @defaultValue green
         */
        color?: ColorRepresentation;
    };
    images?: {
        /**
         * Display the actual images.
         * Note, if the `.imageUrl` property is undefined, then a blank rectangle is displayed instead.
         * @defaultValue false
         */
        visible?: boolean;
        /**
         * The opacity of the image object.
         * @defaultValue 1
         */
        opacity?: number;
    };
}
export interface OrientedImageCollectionPickResult extends PickResult {
    imageIndex: number;
}
/**
 * Displays a collection of oriented images coming from a {@link OrientedImageCollectionSource} in the 3D space.
 *
 * Each oriented image is displayed as 3 distinct elements:
 * - a sphere positioned at the location of the camera receptor
 * - a frustum to show the view frustum of the camera receptor (orientation, field of view and aspect ratio)
 * - a texture plane on which the image is projected
 *
 * Each of these 3 elements can be made visible or invisible independently.
 *
 * If the collection contains images that are too spread out geographically, visual issues may occur.
 * This is why we advise to group images that are relatively close together.
 */
export default class OrientedImageCollection<TUserData extends EntityUserData = EntityUserData> extends Entity3D<Entity3DEventMap, TUserData> {
    /** Readonly flag to indicate that this object is a OrientedImageCollection instance. */
    readonly isOrientedImageCollection: true;
    readonly type: "OrientedImageCollection";
    /** The source of this entity. */
    readonly source: OrientedImageCollectionSource;
    private readonly _container;
    private readonly _origin;
    private readonly _images;
    private readonly _spheres;
    private readonly _frustums;
    constructor(options: OrientedImageCollectionOptions);
    getMemoryUsage(context: GetMemoryUsageContext): void;
    /**
     * Gets or sets the spheres visibility.
     *
     * @defaultValue true
     */
    get showLocationSpheres(): boolean;
    set showLocationSpheres(visible: boolean);
    /**
     * Gets or sets the frustums visibility.
     *
     * @defaultValue true
     */
    get showFrustums(): boolean;
    set showFrustums(visible: boolean);
    /**
     * Gets or sets the images opacity.
     *
     * @defaultValue 1
     */
    get imageOpacity(): number;
    set imageOpacity(opacity: number);
    /**
     * Gets or sets the images visibility.
     *
     * @defaultValue false
     */
    get showImages(): boolean;
    set showImages(visible: boolean);
    updateOpacity(): void;
    /**
     * Sets the projection distance of a specific image in the collection.
     */
    setImageProjectionDistance(imageIndex: number, distance: number): void;
    /**
     * Gets the projection distance of a specific image in the collection.
     */
    getImageProjectionDistance(imageIndex: number): number;
    /**
     * Gets the point of view of the first image if there is one.
     */
    getDefaultPointOfView(_params: Parameters<HasDefaultPointOfView['getDefaultPointOfView']>[0]): ReturnType<HasDefaultPointOfView['getDefaultPointOfView']>;
    /**
     * Gets the point of view of a specific image in the collection.
     */
    getImagePointOfView(imageIndex: number): PointOfView;
    /**
     * Disposes this entity and deletes unmanaged graphical resources.
     */
    dispose(): void;
    pick(canvasCoords: Vector2, options?: PickOptions): OrientedImageCollectionPickResult[];
    postUpdate(context: Context, _changeSources: Set<unknown>): void;
    private computeSpheres;
    private computeFrustums;
    private computeFrustumMatrix;
    private computeLocalRotationMatrix;
    private computeLocalTranslationMatrix;
    private computePointOfView;
    private getImageSource;
    private updateMinMaxDistance;
    private createImageObject;
}
//# sourceMappingURL=OrientedImageCollection.d.ts.map