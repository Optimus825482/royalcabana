/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

function getUnitSymbol(unit) {
  switch (unit.name.toLowerCase()) {
    case 'deg':
    case 'degree':
    case 'degrees':
      return '°';
    case 'rad':
    case 'radian':
    case 'radians':
      return 'rad';
    case 'm':
    case 'meter':
    case 'metre':
    case 'meters':
    case 'metres':
      return 'm';
    case 'ft':
    case 'foot':
    case 'feet':
    case 'us-ft':
    case 'us survey feet':
    case 'us survey foot':
      return 'ft';
    default:
      return '';
  }
}

/**
 * Measure unit for linear distances.
 */
export class LinearUnit {
  type = 'linear';
  constructor(name, metersPerUnit) {
    this.name = name;
    this.metersPerUnit = metersPerUnit;
  }
  getSymbol() {
    return getUnitSymbol(this);
  }
  static meters = new LinearUnit('meters', 1);
  static feet = new LinearUnit('feet', 0.3048);
  static usSurveyFeet = new LinearUnit('US Survey feet', 0.304800609601219);
  equals(other) {
    return other.metersPerUnit === this.metersPerUnit;
  }
  static isLinearUnit(unit) {
    if (!unit) {
      return false;
    }
    return unit.type === 'linear';
  }
}

/**
 * Measure unit for angles.
 */
export class AngularUnit {
  type = 'angular';
  constructor(name, degreesPerUnit) {
    this.name = name;
    this.degreesPerUnit = degreesPerUnit;
  }
  getSymbol() {
    return getUnitSymbol(this);
  }
  static degrees = new AngularUnit('degrees', 1);
  static radians = new AngularUnit('radians', 57.29578);
  equals(other) {
    return other.degreesPerUnit === this.degreesPerUnit;
  }
  static isAngularUnit(unit) {
    if (!unit) {
      return false;
    }
    return unit.type === 'angular';
  }
}
export function parseUnit(text) {
  switch (text.trim().toLowerCase()) {
    case 'deg':
    case 'degree':
    case 'degrees':
      return AngularUnit.degrees;
    case 'rad':
    case 'radian':
    case 'radians':
      return AngularUnit.radians;
    case 'm':
    case 'meter':
    case 'meters':
    case 'metre':
    case 'metres':
      return LinearUnit.meters;
    case 'ft':
    case 'feet':
    case 'foot':
      return LinearUnit.feet;
    case 'us-ft':
    case 'us survey feet':
    case 'us survey foot':
    case 'foot (us survey)':
      return LinearUnit.usSurveyFeet;
    default:
      return undefined;
  }
}