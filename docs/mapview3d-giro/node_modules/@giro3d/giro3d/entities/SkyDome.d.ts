/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { type Vector3 } from 'three';
import type PickResult from '../core/picking/PickResult';
import Entity3D from './Entity3D';
/**
 * Displays a sky dome with atmospheric scattering and sun disc.
 */
export default class SkyDome extends Entity3D {
    readonly isSkyDome: true;
    readonly type: "SkyDome";
    private readonly _skyDome;
    private _solarDiscDiameter;
    private set;
    get solarDiscDiameter(): number;
    /**
     * The apparent diameter of the solar disc, in degrees.
     */
    set solarDiscDiameter(v: number);
    /**
     * The turbidity of the atmosphere. A low turbidity makes the atmosphere appear clearer.
     */
    get turbidity(): number;
    set turbidity(v: number);
    get luminance(): number;
    set luminance(v: number);
    get rayleighCoefficient(): number;
    set rayleighCoefficient(v: number);
    get mieCoefficient(): number;
    set mieCoefficient(v: number);
    get mieDirectionalG(): number;
    set mieDirectionalG(v: number);
    constructor(params?: {
        atmosphereThickness?: number;
    });
    /**
     * Sets the direction of the sun rays.
     */
    setSunPosition(position: Vector3): void;
    dispose(): void;
    pick(): PickResult[];
}
//# sourceMappingURL=SkyDome.d.ts.map