/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { AdditiveBlending, BackSide, Color, FrontSide, Mesh, ShaderMaterial, Sphere, SphereGeometry, Uniform, Vector2, Vector3 } from 'three';
import Ellipsoid from '../core/geographic/Ellipsoid';
/* babel-plugin-inline-import '../renderer/shader/GlowFS.glsl' */
const GlowFS = "#include <logdepthbuf_pars_fragment>\n\nvarying float intensity;\nuniform vec3 glowColor;\nuniform float opacity;\n\nvoid main()\n{\n    #include <logdepthbuf_fragment>\n    vec4 glow = vec4(glowColor.rgb, opacity);\n    gl_FragColor = glow * intensity;\n}\n";
/* babel-plugin-inline-import '../renderer/shader/GlowVS.glsl' */
const GlowVS = "#include <logdepthbuf_pars_vertex>\n#define EPSILON 1e-6\n\nuniform bool atmoIN;\nvarying float intensity;\n\nvoid main()\n{\n    vec3 normalES    = normalize( normalMatrix * normal );\n    vec3 normalCAMES = normalize( normalMatrix * cameraPosition );\n\n    float angle = dot(normalES, normalCAMES);\n\n    if(atmoIN) {\n        intensity = pow(1.0 - angle, 0.8);\n    } else {\n        intensity = pow(0.666 - angle, 4.0);\n    }\n\n    gl_Position = projectionMatrix * modelViewMatrix * vec4( position,  1.0 );\n\n    #include <logdepthbuf_vertex>\n}\n";
import Entity3D from './Entity3D';
const tmpVec2 = new Vector2();
const sphere = new SphereGeometry(1, 64, 64);
class GlowMaterial extends ShaderMaterial {
  constructor(options) {
    super({
      vertexShader: GlowVS,
      fragmentShader: GlowFS,
      blending: AdditiveBlending,
      transparent: true,
      side: options.side,
      depthWrite: options.depthWrite
    });
    const color = options.glowColor != null ? new Color(options.glowColor) : new Color(0.45, 0.74, 1.0);
    this.uniforms = {
      atmoIN: new Uniform(options.atmoIn),
      screenSize: new Uniform(new Vector2(1, 1)),
      glowColor: new Uniform(color),
      opacity: new Uniform(1)
    };
  }
  get color() {
    return this.uniforms.glowColor.value;
  }
  set color(v) {
    this.uniforms.glowColor.value.copy(v);
  }
  set screenSize(v) {
    this.uniforms.screenSize.value.copy(v);
  }
}

/**
 * Constructor options for the {@link Glow} entity.
 */

/**
 * Displays a simple glow around an ellipsoid.
 */
export default class Glow extends Entity3D {
  isGlow = true;
  type = 'Glow';
  get color() {
    return this._outerGlow.material.color;
  }
  set color(v) {
    const color = new Color(v);
    this._innerGlow.material.color = color;
    this._outerGlow.material.color = color;
    this.notifyChange();
  }
  constructor(options) {
    super(options);
    this._ellipsoid = options?.ellipsoid ?? Ellipsoid.WGS84;
    this._sphere = new Sphere(new Vector3(0, 0, 0), this._ellipsoid.semiMajorAxis);
    this._innerGlow = this.createGlow(1.14, BackSide, false, true, options?.color);
    this._innerGlow.name = 'inner glow';
    this._outerGlow = this.createGlow(1.002, FrontSide, true, false, options?.color);
    this._outerGlow.name = 'outer glow';
  }
  createGlow(scale, side, atmoIn, depthWrite, glowColor) {
    const result = new Mesh(sphere, new GlowMaterial({
      side,
      atmoIn,
      depthWrite,
      glowColor
    }));
    result.scale.set(scale * this._ellipsoid.semiMajorAxis, scale * this._ellipsoid.semiMajorAxis, scale * this._ellipsoid.semiMinorAxis);
    this.object3d.add(result);
    result.updateMatrixWorld(true);
    return result;
  }
  updateOpacity() {
    this._outerGlow.material.uniforms.opacity.value = this.opacity;
    this._innerGlow.material.uniforms.opacity.value = this.opacity;
  }
  updateMinMaxDistance(context) {
    const distance = context.distance.plane.distanceToPoint(this.object3d.position);
    const radius = this._sphere.radius * 2;
    this._distance.min = Math.min(this._distance.min, distance - radius);
    this._distance.max = Math.max(this._distance.max, distance + radius);
  }
  postUpdate(context) {
    this.instance.engine.getWindowSize(tmpVec2);
    this._outerGlow.material.screenSize = tmpVec2;
    this._innerGlow.material.screenSize = tmpVec2;
    this.updateMinMaxDistance(context);
  }
  pick() {
    return [];
  }
}