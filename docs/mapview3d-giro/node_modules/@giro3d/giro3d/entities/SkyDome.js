/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { MathUtils } from 'three';
import SkyDomeObject from '../renderer/SkyDome';
import Entity3D from './Entity3D';

/**
 * Displays a sky dome with atmospheric scattering and sun disc.
 */
export default class SkyDome extends Entity3D {
  isSkyDome = true;
  type = 'SkyDome';
  _solarDiscDiameter = 2;
  set(key, value) {
    this._skyDome[key] = value;
    this.notifyChange();
  }
  get solarDiscDiameter() {
    return this._solarDiscDiameter;
  }

  /**
   * The apparent diameter of the solar disc, in degrees.
   */
  set solarDiscDiameter(v) {
    this._solarDiscDiameter = v;
    const cos = Math.cos(MathUtils.degToRad(v));
    this.set('sunAngularDiameterCos', cos);
  }

  /**
   * The turbidity of the atmosphere. A low turbidity makes the atmosphere appear clearer.
   */
  get turbidity() {
    return this._skyDome.turbidity;
  }
  set turbidity(v) {
    this.set('turbidity', v);
  }
  get luminance() {
    return this._skyDome.luminance;
  }
  set luminance(v) {
    this.set('luminance', v);
  }
  get rayleighCoefficient() {
    return this._skyDome.rayleighCoefficient;
  }
  set rayleighCoefficient(v) {
    this.set('rayleighCoefficient', v);
  }
  get mieCoefficient() {
    return this._skyDome.mieCoefficient;
  }
  set mieCoefficient(v) {
    this.set('mieCoefficient', v);
  }
  get mieDirectionalG() {
    return this._skyDome.mieDirectionalG;
  }
  set mieDirectionalG(v) {
    this.set('mieDirectionalG', v);
  }
  constructor(params) {
    super({
      object3d: new SkyDomeObject({
        atmosphereThickness: params?.atmosphereThickness
      })
    });
    this._skyDome = this.object3d;
    this.renderOrder = -9999;
  }

  /**
   * Sets the direction of the sun rays.
   */
  setSunPosition(position) {
    this._skyDome.uniforms.sunPosition.value.copy(position);
    this.notifyChange(this);
  }
  dispose() {
    this._skyDome.geometry.dispose();
    this._skyDome.material.dispose();
    this.object3d.clear();
  }
  pick() {
    return [];
  }
}