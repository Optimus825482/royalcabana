/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import MaterialUtils from '../../MaterialUtils';
import { AttributeSlot } from './AttributeSlot';
const slotNames = {
  0: 'color',
  1: 'color_1',
  2: 'color_2'
};
export class ColorSlot extends AttributeSlot {
  static getAttributeName(index) {
    return slotNames[index];
  }
  constructor(material, index) {
    super(ColorSlot.getAttributeName(index));
    this.uniform = {
      weight: 0
    };
    this._material = material;
    if (index === 0) {
      // first color is always present
      this._flagDefine = null;
    } else {
      this._flagDefine = `COLOR_${index}`;
    }
  }
  get hasAttribute() {
    if (this._flagDefine === null) {
      return true;
    }
    return typeof this._material.defines[this._flagDefine] !== 'undefined';
  }
  set hasAttribute(value) {
    if (this._flagDefine === null) {
      throw new Error('Color slot 0 is always present');
    }
    MaterialUtils.setDefine(this._material, this._flagDefine, value);
  }
  get state() {
    return {
      weight: this.weight
    };
  }
  set state(state) {
    if (typeof state.weight !== 'undefined') {
      this.weight = state.weight;
    }
  }
}