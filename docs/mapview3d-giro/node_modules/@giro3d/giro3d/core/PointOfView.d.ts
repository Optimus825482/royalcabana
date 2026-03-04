/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { Camera } from 'three';
import { Vector3 } from 'three';
/**
 * A point of view generated for a specific camera configuration.
 *
 * Note: this point of view might not be applicable to different camera
 * settings (e.g different field of views, or orthographic sizes).
 */
interface PointOfView {
    /**
     * The location of the point of view.
     */
    origin: Vector3;
    /**
     * The point that this point of view is looking at.
     */
    target: Vector3;
    /**
     * The zoom factor to set to the orthographic camera to fit the object.
     * If the camera is not orthographic, this value is ignored.
     */
    orthographicZoom: number;
}
export declare function isPointOfView(obj: unknown): obj is PointOfView;
/**
 * Creates an immutable point of view from a camera.
 */
export declare function createFromCamera(obj: Camera): Readonly<PointOfView>;
export default PointOfView;
//# sourceMappingURL=PointOfView.d.ts.map