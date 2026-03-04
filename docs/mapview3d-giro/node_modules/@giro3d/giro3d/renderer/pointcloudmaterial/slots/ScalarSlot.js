/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import MaterialUtils from '../../MaterialUtils';
import { buildColorMapUniform, createDefaultColorMap } from '../ColorMapUniform';
import { AttributeSlot } from './AttributeSlot';
const slotNames = {
  0: 'scalar',
  1: 'scalar_1',
  2: 'scalar_2'
};
export class ScalarSlot extends AttributeSlot {
  static getAttributeName(index) {
    return slotNames[index];
  }
  colorMap = createDefaultColorMap();
  constructor(material, index) {
    super(ScalarSlot.getAttributeName(index));
    this.uniform = {
      weight: 0,
      colorMap: buildColorMapUniform(this.colorMap)
    };
    this._material = material;
    this._flagDefine = `SCALAR_${index}`;
    this._typeDefine = `SCALAR_${index}_TYPE`;
    this.attributeType = 'uint';
  }
  get hasAttribute() {
    return typeof this._material.defines[this._flagDefine] !== 'undefined';
  }
  set hasAttribute(value) {
    MaterialUtils.setDefine(this._material, this._flagDefine, value);
  }
  set attributeType(attributeType) {
    MaterialUtils.setDefineValue(this._material, this._typeDefine, attributeType);
  }
  update() {
    this.uniform.colorMap = buildColorMapUniform(this.colorMap);
  }
  get state() {
    return {
      weight: this.weight,
      colorMap: this.colorMap
    };
  }
  set state(state) {
    if (typeof state.weight !== 'undefined') {
      this.weight = state.weight;
    }
    if (typeof state.colorMap !== 'undefined') {
      this.colorMap = state.colorMap;
    }
  }
}