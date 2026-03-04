/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { Object3D, OrthographicCamera, PerspectiveCamera } from 'three';
import { EventDispatcher } from 'three';
import Ellipsoid from '../core/geographic/Ellipsoid';
export interface GlobeControlsEvents {
    start: unknown;
    end: unknown;
    change: unknown;
}
export interface GlobeControlsOptions {
    /**
     * The scene to navigate around.
     * Can be the root object of the Giro3D instance, or a particular globe's root object.
     */
    scene: Object3D;
    /**
     * The camera to control.
     */
    camera: PerspectiveCamera | OrthographicCamera;
    /**
     * The DOM element to listen to.
     */
    domElement: HTMLElement;
    /**
     * The ellipsoid to navigate around.
     * @defaultValue {@link Ellipsoid.WGS84}
     */
    ellipsoid?: Ellipsoid;
    /**
     * The zoom speed
     * @defaultValue 1
     */
    zoomSpeed?: number;
    /**
     * Enables damping
     * @defaultValue false
     */
    enableDamping?: boolean;
    /**
     * The damping factor.
     * @defaultValue 0.15
     */
    dampingFactor?: number;
    /**
     * The minimum distance to the ellipsoid.
     * @defaultValue 10
     */
    minDistance?: number;
    /**
     * The maximum distance to the ellipsoid.
     * @defaultValue infinity
     */
    maxDistance?: number;
}
/**
 * Camera controls for a {@link Globe}. Internally, this wraps `3d-tiles-renderer`'s own `GlobeControls`.
 */
export default class GlobeControls extends EventDispatcher<GlobeControlsEvents> {
    private readonly _controls;
    private readonly _camera;
    private readonly _domElement;
    private readonly _eventListeners;
    constructor(params: GlobeControlsOptions);
    get enabled(): boolean;
    set enabled(v: boolean);
    get enableDamping(): boolean;
    set enableDamping(v: boolean);
    get dampingFactor(): number;
    set dampingFactor(v: number);
    get minAltitude(): number;
    set minAltitude(v: number);
    /**
     * The zoom speed.
     * @defaultValue 1
     */
    get zoomSpeed(): number;
    set zoomSpeed(v: number);
    /**
     * The minimal distance to the ellipsoid surface allowed for the controls.
     * @defaultValue 0 (the ellipsoid surface)
     */
    get minDistance(): number;
    set minDistance(v: number);
    /**
     * The maximal distance to the ellipsoid surface allowed for the controls.
     * @defaultValue infinity
     */
    get maxDistance(): number;
    set maxDistance(v: number);
    /**
     * The maximum zoom value (orthographic cameras only).
     */
    get maxZoom(): number;
    set maxZoom(v: number);
    /**
     * The minimum zoom value (orthographic cameras only).
     */
    get minZoom(): number;
    set minZoom(v: number);
    update(deltaTime?: number): void;
    /**
     * Attaches event listeners to the DOM element.
     * If the event listeners are already attached, this will throw an error.
     */
    attach(): void;
    /**
     * Detaches event listeners from the DOM element.
     */
    detach(): void;
    dispose(): void;
    resetState(): void;
}
//# sourceMappingURL=GlobeControls.d.ts.map