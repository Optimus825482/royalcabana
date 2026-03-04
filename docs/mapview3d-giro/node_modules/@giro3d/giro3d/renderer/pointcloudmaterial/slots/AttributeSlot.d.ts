/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
export interface AttributePropertiesUniform {
    weight: number;
}
export declare abstract class AttributeSlot {
    readonly attributeName: string;
    abstract uniform: AttributePropertiesUniform;
    protected abstract get hasAttribute(): boolean;
    private _wantedWeight;
    protected constructor(attributeName: string);
    set weight(value: number);
    get actualWeight(): number;
    set actualWeight(value: number);
    protected updateActualWeight(): void;
}
//# sourceMappingURL=AttributeSlot.d.ts.map