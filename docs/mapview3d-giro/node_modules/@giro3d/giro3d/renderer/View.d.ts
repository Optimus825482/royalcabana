/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Box3, type Camera, EventDispatcher, Frustum, Matrix4, Object3D, type OrthographicCamera, PerspectiveCamera, Sphere } from 'three';
import { type OBB } from 'three/examples/jsm/Addons.js';
import type Disposable from '../core/Disposable';
import type CoordinateSystem from '../core/geographic/CoordinateSystem';
import type HasDefaultPointOfView from '../core/HasDefaultPointOfView';
import type PointOfView from '../core/PointOfView';
import Coordinates from '../core/geographic/Coordinates';
export interface ExternalControls extends EventDispatcher<{
    change: unknown;
}> {
    update(): void;
}
export declare const DEFAULT_MIN_NEAR_PLANE = 2;
export declare const DEFAULT_MAX_FAR_PLANE = 2000000000;
interface ViewEvents {
    change: unknown;
}
/**
 * Returns the distance from the center of the bounding sphere so
 * that the perspective camera's frustum view fits the sphere.
 * @param camera - The perspective camera.
 * @param bounds - The bounds to encompass.
 */
export declare function computeDistanceToFitSphere(camera: PerspectiveCamera, radius: number): number;
/**
 * Computes the zoom value so that the sphere fits in the orthographic camera's frustum.
 * @param camera - The orthographic camera.
 * @param sphere - The sphere to fit.
 */
export declare function computeZoomToFitSphere(camera: OrthographicCamera, radius: number): number;
/**
 * Adds geospatial capabilities to three.js cameras.
 */
declare class View extends EventDispatcher<ViewEvents> implements Disposable {
    private readonly _coordinateSystem;
    private readonly _viewMatrix;
    private _camera;
    private _width;
    private _height;
    private _preSSE;
    private _maxFar;
    private _minNear;
    private _controls;
    private _onControlsUpdated;
    private _frustum;
    /**
     * The width, in pixels, of this view.
     */
    get width(): number;
    /**
     * The height, in pixels, of this view.
     */
    get height(): number;
    /**
     * Gets or sets the current camera.
     */
    get camera(): PerspectiveCamera | OrthographicCamera;
    set camera(c: PerspectiveCamera | OrthographicCamera);
    /**
     * @param crs - the CRS of this camera
     * @param width - the width in pixels of the camera viewport
     * @param height - the height in pixels of the camera viewport
     * @param options - optional values
     */
    constructor(params: {
        crs: CoordinateSystem;
        width: number;
        height: number;
        camera?: PerspectiveCamera | OrthographicCamera;
    });
    get crs(): CoordinateSystem;
    get preSSE(): number;
    set preSSE(value: number);
    get viewMatrix(): Matrix4;
    get near(): number;
    get frustum(): Readonly<Frustum>;
    /**
     * Gets or sets the distance to the near plane. The distance will be clamped to be within
     * the bounds defined by {@link minNearPlane} and {@link maxFarPlane}.
     */
    set near(distance: number);
    get far(): number;
    /**
     * Gets or sets the distance to the far plane. The distance will be clamped to be within
     * the bounds defined by {@link minNearPlane} and {@link maxFarPlane}.
     */
    set far(distance: number);
    /**
     * Gets or sets the maximum distance allowed for the camera far plane.
     */
    get maxFarPlane(): number;
    set maxFarPlane(distance: number);
    /**
     * Gets or sets the minimum distance allowed for the camera near plane.
     */
    get minNearPlane(): number;
    set minNearPlane(distance: number);
    /**
     * Gets the currently registered controls, if any.
     *
     * Note: To register controls, use {@link setControls}.
     */
    get controls(): ExternalControls | null;
    /**
     * Registers external controls that must be udpated periodically.
     *
     * Note: this is the case of simple controls in the  `examples/{js,jsm}/controls` folder
     * of THREE.js (e.g `MapControls`):
     *
     * - they fire `'change'` events when the controls' state has changed and the view must be rendered,
     * - they have an `update()` method to update the controls' state.
     *
     * For more complex controls, such as the package [`camera-controls`](https://www.npmjs.com/package/camera-controls),
     * a more complex logic is required. Please refer to the appropriate examples for a detailed
     * documentation on how to bind Giro3D and those controls.
     *
     * @param controls - The controls to register. If `null`, currently registered controls
     * are unregistered (they are not disabled however).
     */
    setControls(controls: ExternalControls | null): void;
    /**
     * Resets the near and far planes to their default value.
     */
    resetPlanes(): void;
    /**
     * @internal
     */
    update(): void;
    setSize(width?: number, height?: number): void;
    /**
     * Return the position in the requested CRS, or in camera's CRS if undefined.
     *
     * @param crs - if defined (e.g 'EPSG:4236') the camera position will be
     * returned in this CRS
     * @returns Coordinates object holding camera's position
     */
    position(crs?: CoordinateSystem): Coordinates;
    isOBBVisible(worldOBB: OBB): boolean;
    isBox3Visible(box3: Box3, matrixWorld?: Matrix4): boolean;
    isSphereVisible(sphere: Sphere, matrixWorld?: Matrix4): boolean;
    box3SizeOnScreen(box3: Box3, matrixWorld: Matrix4): Box3;
    /**
     * Returns the "up" vector at a given coordinates.
     *
     * The "up" vector is generally used to orient objects and cameras.
     *
     * If a custom function was specified in the constructor of the instance, this will be used.
     *
     * Otherwise, the default implementation is used:
     *
     * - For projected coordinate systems, this is equal to the vertical axis (typically Z).
     * - For the ECEF geocentric coordinate system (EPSG:4878), this is equal to the normal
     * of the WGS84 ellipsoid at this location.
     *
     * @param coordinate - The coordinate of the point for which to compute the vector.
     * @param target - The vector to store the result. If unspecified, a new one is created.
     * @returns The up vector at this location.
     */
    private getUpVector;
    /**
     * Computes a {@link PointOfView} for the given object.
     * @param obj - The object to compute the point of view, or a world space bounding box.
     * @param options - Optional parameters.
     * @returns The readonly point of view if it could be computed, `null` otherwise.
     */
    getDefaultPointOfView(obj: Object3D | Box3, options?: {
        /**
         * The optional camera to compute this point of view.
         * If unspecified, the currently active camera on this view is used.
         */
        camera?: Camera;
    }): Readonly<PointOfView> | null;
    private applyPointOfView;
    /**
     * Setup the camera to match the specified object or point of view.
     *
     * - If the argument is a {@link PointOfView}, this will be used directly.
     * - If the object implements {@link HasDefaultPointOfView}, this will be used to compute the point of view.
     * - Otherwise, a default point of view is computed from the object's bounding box.
     *
     * **Important note:** this method does not update any camera controls that are controlling the camera.
     * Those controls have to be updated manually so they do not override the new camera position. For example,
     * controls that have a target must be updated so that the target position matches the one returned by this method.
     * @param obj - The object to go to.
     * @param options - The options.
     * @returns The immutable {@link PointOfView} that was used to setup the camera, or `null` if it couldn't be computed.
     */
    goTo(obj: Object3D | HasDefaultPointOfView | PointOfView, options?: {
        /**
         * Allow moving the camera. If `false`, the camera is only rotated to look at the object.
         * @defaultValue true
         */
        allowTranslation?: boolean;
    }): Readonly<PointOfView> | null;
    private projectBox3PointsInCameraSpace;
    dispose(): void;
}
export default View;
//# sourceMappingURL=View.d.ts.map