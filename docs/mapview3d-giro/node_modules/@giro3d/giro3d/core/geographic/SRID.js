/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

/**
 * Represents a spatial reference identifier (SRID).
 */
export default class SRID {
  constructor(authority, code) {
    this._authority = authority;
    this._code = code;
  }

  /**
   * Parses an SRID in the form 'auth:code' (e.g EPSG:1234)
   * @param text - The text to parse.
   * @returns The parsed SRID, or throw an error if the SRID could not be parsed.
   */
  static parse(text) {
    const split = text.trim().split(':');
    if (split.length === 2) {
      const code = Number.parseInt(split[1]);
      return new SRID(split[0], code);
    }
    throw new Error('could not parse SRID');
  }
  get authority() {
    return this._authority;
  }
  get code() {
    return this._code;
  }
  toString() {
    return `${this._authority}:${this._code}`;
  }
  isEpsg(code) {
    return this._authority === 'EPSG' && this._code === code;
  }
  tryGetEpsgCode() {
    if (this._authority !== 'EPSG') {
      return null;
    }
    return this._code;
  }
}