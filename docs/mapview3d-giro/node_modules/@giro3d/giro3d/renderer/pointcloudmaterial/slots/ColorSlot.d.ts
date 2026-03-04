/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { HasDefines } from '../../MaterialUtils';
import { AttributeSlot } from './AttributeSlot';
export interface ColorPropertiesUniform {
    weight: number;
}
export interface ColorSlotState {
    weight: number;
}
type SlotIndex = 0 | 1 | 2;
export declare class ColorSlot extends AttributeSlot {
    static getAttributeName(index: SlotIndex): string;
    readonly uniform: ColorPropertiesUniform;
    private readonly _material;
    private readonly _flagDefine;
    constructor(material: HasDefines, index: SlotIndex);
    get hasAttribute(): boolean;
    set hasAttribute(value: boolean);
    get state(): ColorSlotState;
    set state(state: Partial<ColorSlotState>);
}
export {};
//# sourceMappingURL=ColorSlot.d.ts.map