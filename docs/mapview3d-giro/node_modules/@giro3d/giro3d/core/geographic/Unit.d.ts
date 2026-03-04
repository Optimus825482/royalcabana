/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
export type UnitType = 'linear' | 'angular';
export interface Unit {
    type: UnitType;
    name: string;
    getSymbol(): string;
}
/**
 * Measure unit for linear distances.
 */
export declare class LinearUnit implements Unit {
    readonly name: string;
    readonly metersPerUnit: number;
    readonly type: UnitType;
    constructor(name: string, metersPerUnit: number);
    getSymbol(): string;
    static readonly meters: LinearUnit;
    static readonly feet: LinearUnit;
    static readonly usSurveyFeet: LinearUnit;
    equals(other: LinearUnit): boolean;
    static isLinearUnit(unit: Unit | undefined): unit is LinearUnit;
}
/**
 * Measure unit for angles.
 */
export declare class AngularUnit implements Unit {
    readonly name: string;
    readonly degreesPerUnit: number;
    readonly type: UnitType;
    constructor(name: string, degreesPerUnit: number);
    getSymbol(): string;
    static readonly degrees: AngularUnit;
    static readonly radians: AngularUnit;
    equals(other: AngularUnit): boolean;
    static isAngularUnit(unit: Unit | undefined): unit is AngularUnit;
}
export declare function parseUnit(text: string): Unit | undefined;
//# sourceMappingURL=Unit.d.ts.map