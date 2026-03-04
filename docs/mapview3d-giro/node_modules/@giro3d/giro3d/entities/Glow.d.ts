/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { ColorRepresentation } from 'three';
import { Color } from 'three';
import type Context from '../core/Context';
import type PickResult from '../core/picking/PickResult';
import type { Entity3DOptions } from './Entity3D';
import Ellipsoid from '../core/geographic/Ellipsoid';
import Entity3D from './Entity3D';
/**
 * Constructor options for the {@link Glow} entity.
 */
export interface GlowOptions extends Entity3DOptions {
    /**
     * The color of the glow.
     */
    color?: ColorRepresentation;
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
}
/**
 * Displays a simple glow around an ellipsoid.
 */
export default class Glow extends Entity3D {
    readonly isGlow: true;
    readonly type: "Glow";
    private readonly _ellipsoid;
    private readonly _sphere;
    private readonly _outerGlow;
    private readonly _innerGlow;
    get color(): Color;
    set color(v: ColorRepresentation);
    constructor(options: GlowOptions);
    private createGlow;
    updateOpacity(): void;
    private updateMinMaxDistance;
    postUpdate(context: Context, _changeSources: Set<unknown>): void;
    pick(): PickResult[];
}
//# sourceMappingURL=Glow.d.ts.map