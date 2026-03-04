/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import MaterialUtils from '../../MaterialUtils';
import { ClassificationsTexture } from '../Classification';
import { AttributeSlot } from './AttributeSlot';
const slotNames = {
  0: 'classification',
  1: 'classification_1',
  2: 'classification_2'
};
export class ClassificationSlot extends AttributeSlot {
  static getAttributeName(index) {
    return slotNames[index];
  }
  constructor(material, index) {
    super(ClassificationSlot.getAttributeName(index));
    this.texture = new ClassificationsTexture();
    this.uniform = {
      weight: 0,
      lut: this.texture.texture
    };
    this._material = material;
    this._flagDefine = `CLASSIFICATION_${index};`;
  }
  get classifications() {
    return this.texture.classifications;
  }
  set classifications(classifications) {
    this.texture.classifications = classifications;
  }
  get hasAttribute() {
    return typeof this._material.defines[this._flagDefine] !== 'undefined';
  }
  set hasAttribute(value) {
    MaterialUtils.setDefine(this._material, this._flagDefine, value);
    this.updateActualWeight();
  }
  update() {
    if (this.hasAttribute) {
      this.texture.updateUniform();
    }
  }
  dispose() {
    this.texture.dispose();
  }
  get state() {
    return {
      weight: this.weight,
      classifications: this.classifications
    };
  }
  set state(state) {
    if (typeof state.weight !== 'undefined') {
      this.weight = state.weight;
    }
    if (typeof state.classifications !== 'undefined') {
      this.classifications = state.classifications;
    }
  }
}