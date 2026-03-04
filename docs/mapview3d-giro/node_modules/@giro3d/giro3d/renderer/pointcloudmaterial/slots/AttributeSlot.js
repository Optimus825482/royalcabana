/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

export class AttributeSlot {
  _wantedWeight = 0;
  constructor(attributeName) {
    this.attributeName = attributeName;
  }
  set weight(value) {
    this._wantedWeight = value;
    this.updateActualWeight();
  }
  get actualWeight() {
    return this.uniform.weight;
  }
  set actualWeight(value) {
    this.uniform.weight = value;
  }
  updateActualWeight() {
    this.uniform.weight = this.hasAttribute ? this._wantedWeight : 0;
  }
}