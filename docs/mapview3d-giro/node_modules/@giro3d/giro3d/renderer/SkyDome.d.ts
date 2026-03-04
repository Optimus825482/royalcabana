/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
/**
 * Adapted from original code by https://github.com/zz85
 *
 * Based on "A Practical Analytic Model for Daylight"
 * aka The Preetham Model, the de facto standard analytic skydome model
 * http://www.cs.utah.edu/~shirley/papers/sunsky/sunsky.pdf
 *
 * First implemented by Simon Wallner
 * http://www.simonwallner.at/projects/atmospheric-scattering
 *
 * Improved by Martin Upitis
 * http://blenderartists.org/forum/showthread.php?245954-preethams-sky-impementation-HDR
 *
 * THREE.js integration by zz85 http://twitter.com/blurspline
 */
import type { Camera, IUniform, Scene, WebGLRenderer } from 'three';
import { Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
interface Uniforms extends Record<string, IUniform<unknown>> {
    skyDomeLuminance: IUniform<number>;
    turbidity: IUniform<number>;
    rayleighCoefficient: IUniform<number>;
    mieCoefficient: IUniform<number>;
    mieDirectionalG: IUniform<number>;
    sunPosition: IUniform<Vector3>;
    up: IUniform<Vector3>;
    sunAngularDiameterCos: IUniform<number>;
}
declare class SkyDome extends Mesh<SphereGeometry, ShaderMaterial> {
    readonly isSkyDome: true;
    readonly type: "SkyDome";
    readonly uniforms: Uniforms;
    private set;
    private get;
    /**
     * The cosine of the solar disc's apparent diameter, in degrees.
     */
    get sunAngularDiameterCos(): number;
    set sunAngularDiameterCos(v: number);
    get luminance(): number;
    set luminance(v: number);
    get turbidity(): number;
    set turbidity(v: number);
    get rayleighCoefficient(): number;
    set rayleighCoefficient(v: number);
    get mieCoefficient(): number;
    set mieCoefficient(v: number);
    get mieDirectionalG(): number;
    set mieDirectionalG(v: number);
    constructor(params?: {
        atmosphereThickness?: number;
    });
    onBeforeRender(renderer: WebGLRenderer, scene: Scene, camera: Camera): void;
}
export default SkyDome;
//# sourceMappingURL=SkyDome.d.ts.map