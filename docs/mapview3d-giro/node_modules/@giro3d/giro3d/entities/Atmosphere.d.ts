/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Mesh, Vector3 } from 'three';
import type Context from '../core/Context';
import type PickResult from '../core/picking/PickResult';
import type { Entity3DOptions } from './Entity3D';
import Ellipsoid from '../core/geographic/Ellipsoid';
import Entity3D from './Entity3D';
/**
 * Constructor options for the {@link Atmosphere} entity.
 */
export interface AtmosphereOptions extends Entity3DOptions {
    /**
     * The ellipsoid to use.
     * @defaultValue {@link Ellipsoid.WGS84}
     */
    ellipsoid?: Ellipsoid;
    /**
     * The thickness of the atmosphere
     * @defaultValue 300km (earth atmosphere)
     */
    thickness?: number;
    /**
     * Red, green, blue wavelength, in normalized values (i;e in the [0, 1] range)
     * @defaultValue [0.65, 0.57, 0.475]
     */
    wavelengths?: [number, number, number];
}
/**
 * Displays an atmosphere around an ellipsoid.
 *
 * The entity is made of two components:
 * - `.inner`, which represents the atmosphere inside the ring and acts as a "veil",
 * - `.outer`, which represents the visible halo on the edge of the ring
 */
export default class Atmosphere extends Entity3D {
    readonly isAtmosphere: true;
    readonly type: "Atmosphere";
    private readonly _ellipsoid;
    private readonly _sphere;
    private readonly _inner;
    private readonly _outer;
    private readonly _sphereUniforms;
    private readonly _wavelengths;
    private _disposed;
    get ellipsoid(): Ellipsoid;
    get redWavelength(): number;
    set redWavelength(v: number);
    get greenWavelength(): number;
    set greenWavelength(v: number);
    get blueWavelength(): number;
    set blueWavelength(v: number);
    get outer(): Mesh;
    get inner(): Mesh;
    constructor(options?: AtmosphereOptions);
    updateOpacity(): void;
    private updateMinMaxDistance;
    postUpdate(context: Context, _changeSources: Set<unknown>): void;
    pick(): PickResult[];
    /**
     * Sets the position of the sun.
     */
    setSunPosition(position: Vector3): void;
    dispose(): void;
}
//# sourceMappingURL=Atmosphere.d.ts.map